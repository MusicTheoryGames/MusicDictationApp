#!/bin/sh
# parse-verdict.sh <final-message.json> — print SHIP | FIX-FIRST | REJECT, or exit 1.
# One implementation, used by scripts/critic.sh and scripts/pre-commit.
#
# WHY JSON AND NOT PROSE. Earlier versions scraped the verdict from Codex's prose, and the last was
# defeated by Codex in the reply announcing the defeat: it planted a bare `codex` line inside a
# fenced block, moving the parser's idea of "the final message" into attacker-controlled text, and a
# genuine FIX-FIRST was recorded as SHIP. Five patches to that idea were five smaller holes in the
# same mistake. A gate must not parse prose. `codex exec` is invoked with --output-schema and
# --output-last-message, so the final message is a JSON object with a `verdict` enum.
#
# WHY THE WHOLE OBJECT IS VALIDATED. Reading one key is not validation: {"verdict":"SHIP"} with every
# other field missing passed, as did NaN, Infinity, duplicate keys, and unexpected properties. We
# enforce the schema here, in code, with no third-party import:
#   - a JSON object, not an array or scalar
#   - exactly the eight required keys, no more, no fewer
#   - no duplicate keys (json silently keeps the last); no NaN/Infinity (json accepts them)
#   - correct types per field; verdict in {SHIP, FIX-FIRST, REJECT}
#   - a REGULAR file, at most 2 MB, unchanged across the read. Reading only the first 2 MB was a
#     hole: a valid object padded to the boundary then megabytes of garbage printed SHIP. Reading
#     CAP+1 closed that. O_NONBLOCK closed another: a plain open() of a writer-less FIFO blocks
#     forever, before any check runs (measured: still hung after 3 s).
# Anything else fails closed.
#
# HONEST LIMIT: on a coarse-timestamp filesystem a same-size in-place rewrite within one tick evades
# the (dev, ino, size, mtime_ns) check. We parse exactly the buffer we read, so the worst case is a
# torn buffer, which will almost certainly fail to parse — "almost certainly", not "cannot". Path and
# hardlink swaps are harmless: the descriptor stays bound to the opened inode.
#
# It cannot defend against a wholly forged JSON file. Nothing here is a security boundary.
set -eu
F="${1:?usage: parse-verdict.sh <final-message.json>}"
[ -r "$F" ] || exit 1

python3 - "$F" <<'PY'
import json, os, stat, sys

REQUIRED = {
    "verdict": str, "scope": str, "vision_conflict": str, "reuse": str, "reasoning": str,
    "correctness": list, "lies": list, "missed_call_sites": list,
}
VERDICTS = ("SHIP", "FIX-FIRST", "REJECT")

def fail():
    sys.exit(1)

def no_dupes(pairs):
    keys = [k for k, _ in pairs]
    if len(keys) != len(set(keys)):
        raise ValueError("duplicate keys")
    return dict(pairs)

def no_constants(_):
    raise ValueError("NaN/Infinity")

CAP = 2_000_000                           # a verdict is small

def stat_key(st):
    return (st.st_dev, st.st_ino, st.st_size, st.st_mtime_ns)

try:
    # O_NONBLOCK so a writer-less FIFO returns instead of blocking forever. O_NOCTTY so a tty
    # cannot become our controlling terminal. Both are no-ops for a regular file.
    fd = os.open(sys.argv[1], os.O_RDONLY | os.O_NONBLOCK | os.O_NOCTTY)
    with os.fdopen(fd, "rb") as fh:
        st = os.fstat(fh.fileno())        # fstat the DESCRIPTOR, not the path: no TOCTOU on reopen
        if not stat.S_ISREG(st.st_mode):  # rejects FIFO, /dev/stdin, directories, devices
            fail()
        if st.st_size > CAP:
            fail()
        before = stat_key(st)
        raw = fh.read(CAP + 1)            # one past the cap: if it is there, the file is too big
        if len(raw) > CAP:
            fail()
        if stat_key(os.fstat(fh.fileno())) != before:   # grew, shrank, or was swapped mid-read
            fail()
    obj = json.loads(raw.decode("utf-8"), object_pairs_hook=no_dupes, parse_constant=no_constants)
except SystemExit:
    raise
except Exception:
    fail()

if not isinstance(obj, dict):
    fail()
if set(obj.keys()) != set(REQUIRED.keys()):   # no missing, no extra
    fail()
for key, typ in REQUIRED.items():
    if not isinstance(obj[key], typ):
        fail()
    if typ is list and any(not isinstance(x, str) for x in obj[key]):
        fail()
if obj["verdict"] not in VERDICTS:
    fail()

print(obj["verdict"])
PY
