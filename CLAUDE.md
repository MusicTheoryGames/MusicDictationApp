# CLAUDE.md

## Read `VISION.md` before doing anything. It is the single source of truth.

This file exists only because the harness auto-loads it. It deliberately carries **no volatile facts
about the state of the code** — those live in `VISION.md` §9, where they are dated and evidence-
tagged, and would rot if copied here. What remains below is durable: failure *shapes*, house rules,
and environment hazards. `AGENTS.md` points Codex at the same file.

If any document in this repository disagrees with `VISION.md`, `VISION.md` wins. Several do.

## How to be right in this repository

Four failure modes have each already cost a full working session. They are shapes, not facts —
`VISION.md` §9 has the current specifics.

1. **The prose lies.** Plans in this repo describe shipped features as unbuilt, and dead features
   as live. Verify against `core/` and the running app. Never against markdown. `VISION.md` §10
   ranks which documents are safe.
2. **Tested ≠ wired.** Pure, unit-tested `core/` modules exist that nothing calls. Check call sites
   before believing a module is in use.
3. **Unreferenced ≠ dead.** Pages unreachable from `index.html` include core product features.
   Conversely, some reachable-looking code belongs to a deleted product. Ask what a file *is* before
   deciding what it's *for*.
4. **Respect the evidence tags.** `VISION.md` §9 marks every claim **[source]**, **[observed]**, or
   **[inferred]**, and defines them. Reading code proves a thing exists; it does not prove it runs.
   Never promote a claim to [observed] without watching it in a browser, and never resolve an
   [inferred] by reading harder.

## House rules

- `core/` is the functional core: no DOM, audio, network, clock, or I/O. Time is injected. Every
  module **must** ship with a `.test.js` beside it (one does not; see `VISION.md` §9). Tests:
  `cd core && npm test` (`node --test`).
- **No emoji, no clipart.** Custom in-house SVG icons only. (`core/no-emoji.test.js` enforces this
  over part of the tree; widening it is an open task.)
- Run the app with `node dev-server.js`, then verify **in a real browser**. Never verify timing,
  audio, or rendering headlessly.
- Only state what you have actually observed. If you did not watch it work, say so.
- Do not relax a non-negotiable in `VISION.md` §6 to make a feature easier. Change the feature.

## Environment

Keep this repo out of iCloud-synced folders — on this machine both `~/Desktop` and `~/Documents`
are synced, and iCloud eviction corrupts `.git`.

`git push` to this remote fails with `RPC failed; HTTP 400 / send-pack: unexpected disconnect`.
Remedy verified, cause not established:

```
git -c http.postBuffer=524288000 push --no-thin
```
