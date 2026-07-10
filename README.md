# Music Dictation Suite

Browser apps that teach **music dictation** — hearing music and writing it down — and the reading
and singing skills dictation depends on.

Not an ear-training quiz. Quizzes exist. This teaches the *procedure*: find the tonic, hear the
contour, hold it in memory, solve rhythm before pitch, sketch before you notate.

## Read this first

**[`VISION.md`](VISION.md) is the single source of truth** — the product, the pedagogy and its
evidence, the non-negotiables, and an evidence-tagged account of what the code actually does today.
If any other document disagrees with it, it wins.

**[`RHYTHMQUEST_PLAN.md`](RHYTHMQUEST_PLAN.md)** is the sequenced work, with the current step marked
at the top.

Agents: [`CLAUDE.md`](CLAUDE.md) and [`AGENTS.md`](AGENTS.md) both point at `VISION.md`, so Claude
Code and Codex judge against one document.

## Run it

```bash
node dev-server.js        # local no-cache dev server
cd core && npm test       # unit tests over the pure functional core
```

Then open the printed URL. **Verify timing, audio and rendering in a real browser** — never
headlessly.

## The apps

| App | Entry point | Skill |
|---|---|---|
| **RhythmQuest** | `rhythm-student.html?mode=solo` | hear rhythm → write rhythm |
| **MelodyQuest** | `melodic-game.html` | hear melody → write melody |
| **Tapping** | `tapping.html?mode=tapping` | see rhythm → perform rhythm |
| **SingQuest** | `singquest.html` | see notation → sing it (probe + one level so far) |
| **HarmonyQuest** | — | hear progression → write bass, then Roman numerals (unbuilt) |

`index.html` is the hub. **BeatQuest Casual** keeps its old name deliberately — it belongs to the
Staff Commander suite and is still under test. `rhythm-teacher.html` and `projection.html` are the classroom surface —
real, and **not yet reachable from the hub, because the student half of the room protocol does not
exist.** See `VISION.md` §7 and §9.

## Layout

```
core/          pure functional core — no DOM, audio, network, or clock. Time is injected.
               Every module MUST ship a .test.js beside it. One (curriculum.js) does not yet.
scripts/       critic.sh — the adversarial Codex review. Once ./scripts/install-hooks.sh is run:
               where Git runs the hook (`git commit`, `git merge`'s auto-commit) AND no bypass is
               used (`--no-verify` skips it; `CRITIC_OVERRIDE=1` makes it pass), a commit is
               refused unless Codex returned SHIP on a review BOUND to that tree object. Many
               paths create commits without running it at all, and Codex is shown a text diff,
               not the tree, so binary blobs are not reviewed. A guard against forgetting, NOT a
               security boundary. What bypasses it is listed in ONE place — the header of
               scripts/pre-commit — and is not claimed to be complete. Read it before installing.
research/      the literature this product is built on, plus reference tables. Timeless.
history/       accurate records of past work (changelog, audits). Not descriptions of the present.
archive/       stale, false, or about deleted code. DO NOT READ. See archive/README.md.
```

## Two rules that are not negotiable

**The app never lies to the user, or to the next developer.** No "Connected" over a simulated
socket. No comment claiming a capability the code lacks. No document calling something "working"
that nobody watched work.

**Verify against `core/` and the running app, never against prose.** The 44 markdown files present
in this repo on 2026-07-09 were classified by two independent reviewers. **Nineteen were stale, false, or
about deleted code** and are in `archive/`; the rest moved to `research/` and `history/` for
organisation, or stayed here. Two false claims had propagated from a document into code comments,
into a unit test, and into a new plan. `archive/README.md` traces both chains. Assume any prose you
find is older than the code.

