#!/bin/zsh
# scripts/critic.sh — adversarial Codex review. Writes .git/critic/receipt on success.
#
#   scripts/critic.sh "<what I changed and why>"
#
# With the hook installed: where Git runs it (git commit, git merge's auto-commit) AND no bypass is
# used (--no-verify skips it; CRITIC_OVERRIDE=1 makes it pass), a commit is refused unless the
# verdict bound to that tree is SHIP. Many other paths create commits without running it. The bypass
# list is in scripts/pre-commit's header; it is not repeated here, and is not claimed to be complete.
#
# Codex reads AGENTS.md, RHYTHMQUEST_PLAN.md (CURRENT STEP) and VISION.md from the repo itself.
# Do NOT paste them in: doing so once starved its budget and it returned no verdict.
#
# THE GUARD AT THE BOTTOM IS THE POINT. `codex exec` can exit 0 having produced nothing. An empty
# output file is NOT an approving review. If this script says CRITIC_FAILED, the review did not
# happen: stop, say so, do not commit.
#
# `set -e` for setup, hashing and receipt writes. The one place we must NOT abort is the `codex exec`
# call: a failure there has to reach that loud no-verdict guard.
set -eu

# Replacement refs redirect object reads. `refs/replace/<sha>` makes `read-tree <sha>` and
# `diff <sha>` resolve a DIFFERENT commit while HEAD never moves, and deleting the ref before the
# endpoint checks hides it. Measured: `git cat-file -p $HEAD` returned a different tree than
# `GIT_NO_REPLACE_OBJECTS=1 git cat-file -p $HEAD`. Pinning the id is not enough; pin the objects.
# Exported, so every git invocation below inherits it.
export GIT_NO_REPLACE_OBJECTS=1

REPO="$(cd "$(dirname "$0")/.." && pwd)"

# FIRST ACT, before anything that can fail. A review that aborts — missing argument under `set -u`,
# bad schema, quota, a killed process — must never leave a previous SHIP receipt on disk for the hook
# to honour. That happened once: an HTTP 400 aborted a run and the poisoned SHIP receipt from the
# prior run survived. So the receipt is unlinked here, before the argument is even read.
#
# UNLINK ONLY. There is no truncate fallback: truncation writes through an inode we did not create,
# and if the receipt is hard-linked to another file, it empties that file too (measured). If the
# unlink fails, we refuse to run at all.
_gd="$(git -C "$REPO" rev-parse --absolute-git-dir 2>/dev/null || true)"
if [ -n "$_gd" ]; then
  # -L before -e: a DANGLING symlink is -L true, -e false, and would survive invalidation, after
  # which the receipt writer would follow it and write outside .git/critic.
  if [ -L "$_gd/critic" ] || [ -L "$_gd/critic/receipt" ]; then
    echo "FATAL: $_gd/critic or its receipt is a symlink. Remove it by hand." >&2
    exit 1
  fi
  if [ -e "$_gd/critic/receipt" ]; then
    # UNLINK ONLY. An earlier version fell back to truncating (`: > receipt`) when the directory was
    # unwritable. Measured: if the receipt is HARD-LINKED to another file, truncation empties that
    # file too. Never write through an existing inode you did not create. If we cannot unlink, we
    # refuse to review at all — which is safe: no new verdict is issued, and the surviving receipt
    # still describes the tree it was issued for, which the hook re-checks anyway.
    rm -f "$_gd/critic/receipt" 2>/dev/null || :
    if [ -e "$_gd/critic/receipt" ]; then
      echo "FATAL: cannot unlink the stale receipt at $_gd/critic/receipt" >&2
      echo "  It may say SHIP. Delete it by hand before reviewing anything." >&2
      exit 1
    fi
  fi
fi
unset _gd
# mktemp -d, not "critic-$$": a PID repeats, and a reused path could still hold a previous run's
# valid SHIP verdict JSON. Codex can exit 0 without writing its last-message file, and we would then
# parse the OLD file and believe it. Unpredictable dir + unlink the target before the call.
SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/critic-XXXXXXXX")"
OUT="$SCRATCH/critic-$(date +%H%M%S).md"

INTENT="$1"

# rename(2), not `mv`. Measured, all four cases:
#   mv -f f symlink-to-dir  -> FOLLOWS it; the file lands INSIDE the directory, link intact
#   os.rename f symlink-to-dir -> replaces the symlink with the file
#   os.rename f symlink-to-file -> replaces the symlink; the target is untouched
#   os.rename f real-directory  -> IsADirectoryError, refused
# rename(2) never resolves the final component of the destination, and it is atomic. That is exactly
# what publishing a file into a possibly-hostile directory requires. `mv` is a program with opinions.
rename_into_place() {
  python3 -c 'import os,sys; os.rename(sys.argv[1], sys.argv[2])' "$1" "$2"
}

is_sha() { printf '%s' "$1" | grep -Eq '^[0-9a-f]{40,64}$'; }

# TREE IDENTITY, not a patch. `git diff HEAD` is lossy: two different binaries both render as
# "Binary files ... differ" and hash identically; textconv/external diff drivers are worse.
# A Git tree object id covers every path, blob and file mode exactly. Built in a THROWAWAY index
# so the real index is untouched.
# Takes the PINNED commit id, never the symbolic ref. Every resolution of `HEAD` between the
# snapshot and the receipt is a chance for HEAD to have moved underneath us.
tree_id() {
  # mktemp CREATES the file. Git accepts an empty GIT_INDEX_FILE as a new index (verified), but a
  # reviewer objected three times that some Git rejects it, so remove it and hand read-tree a path
  # that does not exist. Costs one syscall; ends the argument.
  _base="$1"
  _idx=$(mktemp) || return 1
  rm -f "$_idx"
  GIT_INDEX_FILE="$_idx" git -C "$REPO" read-tree "$_base" >/dev/null 2>&1 || { rm -f "$_idx"; return 1; }
  GIT_INDEX_FILE="$_idx" git -C "$REPO" add -A >/dev/null 2>&1 || { rm -f "$_idx"; return 1; }
  _id=$(GIT_INDEX_FILE="$_idx" git -C "$REPO" write-tree) || { rm -f "$_idx"; return 1; }
  rm -f "$_idx"; printf '%s' "$_id"
}
GITDIR="$(git -C "$REPO" rev-parse --absolute-git-dir)"   # absolute; works from any cwd

# Snapshot the tree BEFORE we build the review input. We re-snapshot after codex and refuse a
# receipt if they differ. HONEST LIMIT: identical endpoints do not prove the tree never moved —
# a file changed and restored mid-review would pass. Review on a quiet tree.
# Resolve HEAD to a COMMIT ID exactly once, before anything reads it, and use that id everywhere
# after. The review input is a diff against a parent, so the verdict is only meaningful relative to
# a specific commit.
#
# Two holes, both found by Codex, both closed by pinning:
#   - Recording HEAD *after* the review: `git reset --soft <other>` moves HEAD without touching the
#     working tree, so the tree endpoints still matched while the receipt bound the verdict to a
#     parent Codex never saw.
#   - Capturing HEAD but still diffing the symbolic ref: HEAD could move away, be diffed against,
#     and be moved back before the endpoint check, defeating it entirely.
# After this line the only resolution of `HEAD` is the endpoint comparison near the receipt, which
# reads the ref on purpose. Every OBJECT read uses $HEAD_BEFORE. An unborn branch fails here, closed.
HEAD_BEFORE=$(git -C "$REPO" rev-parse HEAD) || { echo "FATAL: could not read HEAD" >&2; exit 1; }
is_sha "$HEAD_BEFORE" || { echo "FATAL: bad HEAD: $HEAD_BEFORE" >&2; exit 1; }

TREE_BEFORE=$(tree_id "$HEAD_BEFORE") || { echo "FATAL: could not compute the tree id" >&2; exit 1; }
is_sha "$TREE_BEFORE" || { echo "FATAL: bad tree id: $TREE_BEFORE" >&2; exit 1; }

# The pre-commit hook forbids untracked files (they would be reviewed but not committed).
# Require the same here, so the hash Codex signs is the hash the hook will recompute.
UNTRACKED=$(git -C "$REPO" ls-files --others --exclude-standard)
if [ -n "$UNTRACKED" ]; then
  echo "REFUSING TO REVIEW: untracked files present. git add them first, so the reviewed" >&2
  echo "tree is the tree that will be committed:" >&2
  printf '%s\n' "$UNTRACKED" | sed 's/^/  /' >&2
  exit 1
fi

{
  echo "## Intent of this change"
  echo "$INTENT"
  echo
  echo "## REQUIRED READING (open these from the repo yourself; they are NOT pasted here):"
  echo "##   RHYTHMQUEST_PLAN.md  — sequenced work. CURRENT STEP is marked at the very top."
  echo "##   VISION.md            — source of truth for facts and non-negotiables."
  echo "## Read the CURRENT STEP line and VISION.md sections 6, 8, 9 before judging anything."
  echo
  echo "## Working diff vs HEAD (tracked files)."
  echo "## NOTE: this is a TEXT diff. Binary blobs are shown only as \"Binary files ... differ\","
  echo "## and textconv/external diff drivers can transform content. The receipt binds the TREE ID,"
  echo "## which covers every blob and mode exactly — but a binary change is NOT reviewable here."
  echo "## Review binary changes by other means before relying on a SHIP."
  git -C "$REPO" --no-pager diff "$HEAD_BEFORE"
  echo
} > "$OUT.input"

LASTMSG="$OUT.verdict.json"
# A stale verdict file is a stale verdict. If codex exits 0 having written nothing, parse-verdict.sh
# must find NOTHING, not a previous SHIP.
rm -f "$LASTMSG"
codex exec -C "$REPO" --sandbox read-only --ephemeral \
  --output-schema "$REPO/scripts/verdict.schema.json" \
  --output-last-message "$LASTMSG" \
  -c model_reasoning_effort='"medium"' \
  'You are an adversarial reviewer. The <stdin> block holds the INTENT of a change and the working
diff. FIRST, open RHYTHMQUEST_PLAN.md (read the CURRENT STEP at the top) and VISION.md (sections 6,
8, 9) from the repo. Budget your exploration: read those two, then the files the diff touches. Do
NOT wander into solo-mode.js or other large files unless the diff touches them.

Read the surrounding source before judging any hunk. Then answer tersely, citing file:line:

0. SCOPE — does this diff serve the CURRENT STEP named at the top of RHYTHMQUEST_PLAN.md? If not,
   say so FIRST and say what should have been worked on instead. A correct change to the wrong
   thing is still wrong. Scope creep is this project`s characteristic failure; call it out even
   when the work is good.
1. CORRECTNESS — does the diff do what the intent claims? What behaviour does it break?
2. VISION CONFLICT — does it violate any non-negotiable in VISION.md §6, or drift from the §8
   finish line? A diff can be locally correct and wrong for this product. Say so if it is.
3. LIES — does any code or comment now assert something untrue? (See VISION.md rule 12.)
4. MISSED CALL SITES — grep. What else needed the same edit and did not get it?
5. REUSE — is there an existing core/ function that should have been used instead?
6. VERDICT — SHIP / FIX-FIRST / REJECT, with one line of reasoning.

Be specific and harsh. Prefer refuting to approving. If it is genuinely fine, say so in two
sentences and stop. Do not restate the diff. Do not write files.' < "$OUT.input" > "$OUT" 2>&1 && rc=0 || rc=$?

# A quota/rate-limit/auth failure must be LOUD. An empty or error-only file must never be
# mistaken for "the critic had no objections."
# We do NOT scrape the transcript. `codex exec --output-last-message` writes the final message to
# its own file, and parse-verdict.sh validates it as a schema-shaped JSON object (all eight keys, no
# extras, no duplicates, no NaN) with a typed `verdict` enum. Never a line of prose: an earlier
# version searched the transcript after the last "^codex$" marker, and Codex defeated it by planting
# that marker inside a fenced block — recording SHIP over a genuine FIX-FIRST.
VERDICT=$("$(dirname "$0")/parse-verdict.sh" "$LASTMSG" 2>/dev/null) || VERDICT=""
if [ $rc -ne 0 ] || [ -z "$VERDICT" ]; then
  echo "CRITIC_FAILED rc=$rc — no machine-readable verdict. Review did NOT happen."
  echo "--- last 15 lines of transcript ---"
  tail -15 "$OUT" 2>/dev/null || true
  echo "--- final message (${LASTMSG}) ---"
  head -40 "$LASTMSG" 2>/dev/null || echo "(absent)"
  exit 1
fi

# RECEIPT — bind this verdict to the tree id we computed. What that does and does not prove:
#   IT DOES bind the verdict to a tree id, so the hook can refuse a commit of any other tree.
#   IT DOES NOT prove Codex read those exact bytes. Codex is handed a TEXT DIFF, which is lossy for
#     binaries; and the snapshot, diff, review, and re-snapshot are separate operations, so a file
#     changed and restored mid-review leaves both endpoints equal. Review on a quiet tree.
TREE_AFTER=$(tree_id "$HEAD_BEFORE") || { echo "FATAL: could not compute the tree id" >&2; exit 1; }
is_sha "$TREE_AFTER" || { echo "FATAL: bad tree id: $TREE_AFTER" >&2; exit 1; }
if [ "$TREE_AFTER" != "$TREE_BEFORE" ]; then
  echo "NO RECEIPT ISSUED: the working tree changed while Codex was reviewing it." >&2
  echo "  before: $TREE_BEFORE" >&2
  echo "  after:  $TREE_AFTER"  >&2
  echo "  The verdict at $OUT describes the BEFORE tree. Re-run on a quiet tree." >&2
  exit 1
fi
# The diff and both tree ids were pinned to $HEAD_BEFORE with GIT_NO_REPLACE_OBJECTS=1, so a
# mid-review move-and-restore OF HEAD cannot corrupt what Codex read, nor can a replacement ref.
# This says nothing about FILES: a tracked file changed and restored during the review leaves both
# tree endpoints equal and is not detected. Review on a quiet tree. This check exists because a
# receipt for a HEAD you have since left is useless. It deliberately resolves the ref.
HEAD_AFTER=$(git -C "$REPO" rev-parse HEAD) || { echo "FATAL: could not read HEAD" >&2; exit 1; }
if [ "$HEAD_AFTER" != "$HEAD_BEFORE" ]; then
  echo "NO RECEIPT ISSUED: HEAD is not where it was when the review started." >&2
  echo "  before: $HEAD_BEFORE" >&2
  echo "  after:  $HEAD_AFTER"  >&2
  echo "  Codex reviewed a diff against the BEFORE commit. Re-run on a quiet repository." >&2
  exit 1
fi

mkdir -p "$GITDIR/critic"
# The symlink check on .git/critic ran before the (long) Codex call. Re-check it here, immediately
# before we write, so the window is microseconds rather than minutes. It is not zero, and it is not
# a boundary: anyone who can swap .git/critic can also replace .git/hooks/pre-commit outright.
if [ -L "$GITDIR/critic" ]; then
  echo "FATAL: $GITDIR/critic became a symlink during the review. No receipt written." >&2
  exit 1
fi
# Write to a temp file in the SAME directory, then rename(2) it into place. See rename_into_place:
# `mv` would follow a symlink-to-directory; rename(2) does not, and refuses a real directory.
_rcpt="$GITDIR/critic/receipt"
_tmp="$(mktemp "$GITDIR/critic/.receipt.XXXXXXXX")" || { echo "FATAL: mktemp failed" >&2; exit 1; }
{
  printf 'tree=%s\n' "$TREE_AFTER"
  printf 'head=%s\n' "$HEAD_BEFORE"
  printf 'verdict_file=%s\n' "$LASTMSG"
  printf 'transcript=%s\n' "$OUT"
  printf 'verdict=%s\n' "$VERDICT"
  printf 'at=%s\n' "$(date -u +%FT%TZ)"
} > "$_tmp"
rename_into_place "$_tmp" "$_rcpt" || {
  rm -f "$_tmp"
  echo "FATAL: could not publish the receipt to $_rcpt (is it a directory?)" >&2
  exit 1
}

echo "VERDICT: $VERDICT"
[ "$VERDICT" = "SHIP" ] || echo "NOTE: pre-commit will refuse this receipt — only SHIP permits a commit." >&2
echo "$OUT"
