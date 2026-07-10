#!/bin/sh
# Install the Codex-review commit hooks (a guard against forgetting, not a boundary).
#
#   ./scripts/install-hooks.sh            install (refuses to clobber a foreign hook)
#   ./scripts/install-hooks.sh --force    install, backing up any existing REGULAR hook
#   ./scripts/install-hooks.sh --remove   uninstall (only hooks identical to ours)
#
# The body lives in scripts/pre-commit (tracked, reviewable) and is installed under two names:
#   pre-commit         git commit, git commit --amend
#   pre-merge-commit   git merge, when it auto-creates the merge commit
# Installing only pre-commit left `git merge` free to create an unreviewed commit. These are not
# every hook Git runs on a commit-creating path: `git am` runs pre-applypatch, which we do not
# install, so `git am` is ungated by choice, not by a Git limitation.
#
# An automatic merge builds a tree nobody reviewed in advance, so the gate normally blocks it —
# though not necessarily: if the merged tree already has a SHIP receipt at this HEAD, it passes,
# and that is correct. The merge workflow:
#     git merge --no-commit <branch>
#     ./scripts/critic.sh "merge <branch>"
#     git commit
#
# SYMLINKED HOOKS ARE REFUSED, always, even with --force: `cp` follows a symlink and writes through
# it, so a symlinked hook would have had its target overwritten (measured, outside the hooks
# directory) while --force's "backup" saved the target's contents. A dangling symlink slips past
# `[ -e ]`, so `-L` is tested first. Installation writes a temp file and uses rename(2) — atomic,
# and it never resolves the destination's final component. It is NOT `mv`: `mv -f file symlink-to-dir`
# follows the link and buries the file inside the directory. Symlinked PARENT directories are not
# audited: anyone who can create files in the hooks dir can replace the hook anyway.
#
# READ scripts/pre-commit before installing — it runs on the commits you make here, and its header
# holds the one copy of what bypasses this. That list is not claimed to be complete.
set -eu
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

# link(2) + unlink: a rename that REFUSES to replace anything. os.rename would silently destroy an
# existing $bak — the backup name is predictable, and "backed up existing hook -> $bak" would then be
# a lie about a file it had just overwritten. Measured: link() onto an existing regular file, symlink
# or directory all raise FileExistsError, and the symlink's target is untouched. Same directory, so
# the two operations cannot straddle a filesystem.
move_aside_no_clobber() {
  python3 -c 'import os,sys; os.link(sys.argv[1], sys.argv[2]); os.unlink(sys.argv[1])' "$1" "$2"
}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/scripts/pre-commit"
HOOK_NAMES="pre-commit pre-merge-commit"

# Respect core.hooksPath and linked worktrees rather than assuming .git/hooks.
# `--path` so Git expands a leading `~`, exactly as Git itself does when it looks for the hook.
# Without it, core.hooksPath=~/.review-hooks installs into "$ROOT/~/.review-hooks" — a literal
# directory named "~" — and the gate silently is not where Git runs it. Codex caught this.
HOOKS=$(git -C "$ROOT" config --path --get core.hooksPath || true)
if [ -n "$HOOKS" ]; then
  case "$HOOKS" in /*) : ;; *) HOOKS="$ROOT/$HOOKS" ;; esac
  echo "note: core.hooksPath is set — installing into $HOOKS"
else
  HOOKS="$(git -C "$ROOT" rev-parse --git-path hooks)"
  case "$HOOKS" in /*) : ;; *) HOOKS="$ROOT/$HOOKS" ;; esac
fi

if [ "${1:-}" = "--remove" ]; then
  # Only remove OUR hooks. Deleting someone else's would be a nasty surprise.
  # `-e` is false for a dangling symlink, so test `-L` as well or we would report "nothing here".
  for name in $HOOK_NAMES; do
    dest="$HOOKS/$name"
    if [ -L "$dest" ]; then
      echo "REFUSING: $dest is a symlink, not the hook this script installs. Remove it yourself." >&2
      exit 1
    fi
    if [ ! -e "$dest" ]; then echo "nothing to remove at $dest"; continue; fi
    if cmp -s "$SRC" "$dest"; then rm -f "$dest"; echo "removed $dest"; continue; fi
    echo "REFUSING: $dest is not the hook this script installs. Remove it yourself." >&2
    exit 1
  done
  exit 0
fi

mkdir -p "$HOOKS"
for name in $HOOK_NAMES; do
  dest="$HOOKS/$name"

  # A symlink here is refused outright, --force or not. See the header: cp would write through it.
  # Check -L BEFORE -e: a dangling symlink is -L true, -e false.
  if [ -L "$dest" ]; then
    echo "REFUSING: $dest is a symlink." >&2
    echo "  Copying onto it would overwrite its target, not the hook. Remove it and re-run." >&2
    exit 1
  fi

  if [ -e "$dest" ] && ! cmp -s "$SRC" "$dest"; then
    if [ "${1:-}" = "--force" ]; then
      # Move the old hook aside without clobbering anything at $bak. Not `cp` (writes through a
      # symlink — measured, it destroyed a file outside the hooks directory). Not `mv` (follows a
      # symlink-to-directory and buries the file inside it). Not `rename` either: the backup name is
      # predictable, and rename would silently replace whatever sits there.
      bak="$dest.bak.$(date +%Y%m%d%H%M%S).$$"
      move_aside_no_clobber "$dest" "$bak" || {
        # Any nonzero exit lands here: EEXIST (something is already at $bak), EACCES (the hooks dir
        # is not writable), or a link() that succeeded and an unlink() that did not. Do not name a
        # cause we did not observe. In every one of those, $dest still exists and $bak was not
        # overwritten — link() refuses an existing destination outright.
        echo "REFUSING: could not move $dest aside to $bak." >&2
        echo "  Nothing at $bak was overwritten and $dest still exists. Investigate, then re-run." >&2
        exit 1
      }
      echo "backed up existing hook -> $bak"
    else
      echo "REFUSING: a different $name hook already exists at $dest" >&2
      echo "  inspect it, then re-run with --force to back it up and replace it." >&2
      exit 1
    fi
  fi

  # Write a temp file in the SAME directory (mktemp creates it O_EXCL, so it is not a symlink),
  # chmod it, then rename(2) it into place. `rm -f` then `cp` had a window in which another process
  # could plant a symlink for cp to write through. This has no such window: rename(2) does not
  # resolve the destination's final component.
  # It does NOT audit symlinked parent directories — anyone who can create files in the hooks dir
  # can replace the hook anyway, so that is not a boundary this can hold.
  tmp="$(mktemp "$HOOKS/.hook.XXXXXXXX")" || { echo "mktemp failed in $HOOKS" >&2; exit 1; }
  # `set -e` would exit on a failed cat or chmod and leave $tmp behind. Clean up on either.
  { cat "$SRC" > "$tmp" && chmod +x "$tmp"; } || {
    rm -f "$tmp"
    echo "REFUSING: could not stage the hook into $HOOKS" >&2
    exit 1
  }
  rename_into_place "$tmp" "$dest" || {
    rm -f "$tmp"
    echo "REFUSING: cannot install to $dest (does it exist as a directory?)" >&2
    exit 1
  }
  echo "installed $dest"
done

echo
echo "  Where Git runs it (git commit, git merge's auto-commit) AND no bypass is used, it refuses"
echo "  unless Codex returned SHIP on a review bound to that tree object."
echo "    - it does not run on every path that creates a commit"
echo "    - --no-verify skips it; CRITIC_OVERRIDE=1 makes it pass without a verdict"
echo "    - Codex is shown a TEXT DIFF of the tree, not the tree. Binary blobs are not reviewed."
echo "  NOT a security boundary. What bypasses it is listed in ONE place — the header of"
echo "  scripts/pre-commit. Read it there. It is not claimed to be complete."
echo
echo "  An automatic 'git merge' blocks unless its merged tree already has a SHIP receipt at"
echo "  this HEAD — normally it does not. Instead:"
echo "    git merge --no-commit <branch> && ./scripts/critic.sh 'merge <branch>' && git commit"
echo
echo "  override:  CRITIC_OVERRIDE=1 git commit ...   (loud, must be disclosed)"
echo "  uninstall: ./scripts/install-hooks.sh --remove"
