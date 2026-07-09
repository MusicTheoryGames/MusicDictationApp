#!/bin/zsh
# scripts/critic.sh — MANDATORY adversarial review. Nothing lands without a verdict.
#
#   scripts/critic.sh "<what I changed and why>"
#
# Codex reads AGENTS.md, RHYTHMQUEST_PLAN.md (CURRENT STEP) and VISION.md from the repo
# itself. Do NOT paste them in: doing so once starved its budget and it returned no verdict.
#
# THE GUARD AT THE BOTTOM IS THE POINT. `codex exec` can exit 0 having produced nothing.
# An empty output file is NOT an approving review. If this script says CRITIC_FAILED,
# the review did not happen: stop, say so, do not commit.
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
SCRATCH="${TMPDIR:-/tmp}/critic-$$"; mkdir -p "$SCRATCH"
OUT="$SCRATCH/critic-$(date +%H%M%S).md"

INTENT="$1"

{
  echo "## Intent of this change"
  echo "$INTENT"
  echo
  echo "## REQUIRED READING (open these from the repo yourself; they are NOT pasted here):"
  echo "##   RHYTHMQUEST_PLAN.md  — sequenced work. CURRENT STEP is marked at the very top."
  echo "##   VISION.md            — source of truth for facts and non-negotiables."
  echo "## Read the CURRENT STEP line and VISION.md sections 6, 8, 9 before judging anything."
  echo
  echo "## Working diff vs HEAD (tracked files)"
  git -C "$REPO" --no-pager diff HEAD
  echo
  echo "## New untracked files"
  for f in $(git -C "$REPO" ls-files --others --exclude-standard); do
    case "$f" in *.png|*.jpg|*.gz) continue;; esac
    echo "--- $f"
    sed -n '1,500p' "$REPO/$f"
  done
} > "$OUT.input"

codex exec -C "$REPO" --sandbox read-only --ephemeral \
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
sentences and stop. Do not restate the diff. Do not write files.' < "$OUT.input" > "$OUT" 2>&1
rc=$?

# A quota/rate-limit/auth failure must be LOUD. An empty or error-only file must never be
# mistaken for "the critic had no objections."
# NB: look for the verdict only in codex's FINAL message (after the last "^codex$" marker).
# The word VERDICT also appears in the prompt we echo into the transcript.
last=$(grep -n '^codex$' "$OUT" | tail -1 | cut -d: -f1)
if [ $rc -ne 0 ] || [ -z "$last" ] || ! sed -n "${last},\$p" "$OUT" | grep -q "VERDICT"; then
  echo "CRITIC_FAILED rc=$rc — no verdict produced. Review did NOT happen."
  echo "--- last 15 lines ---"
  tail -15 "$OUT"
  exit 1
fi

echo "$OUT"
