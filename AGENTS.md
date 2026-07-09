# AGENTS.md

## Read `VISION.md` before doing anything. It is the single source of truth.

This file deliberately carries **no volatile facts about the state of the code** — those live in
`VISION.md` §9, where they are dated and evidence-tagged. Duplicating them here would create exactly
the documentation drift this repo already suffers from. What remains below is durable: how to
review, and the house rules. `CLAUDE.md` points Claude Code at the same file.

If any document in this repository disagrees with `VISION.md`, `VISION.md` wins. Several do.

## Your job here is to refute, not to approve

This codebase's characteristic failure is **plausible, confident, false claims** — in its comments,
in its forty markdown files, and in the summaries of agents working on it. You are the check on
that. Assume the change in front of you is wrong and try to prove it.

When you review, judge against four things, **in this order**:

1. **SCOPE — is this change even supposed to be happening now?** `RHYTHMQUEST_PLAN.md` names the
   sequenced build order and marks the CURRENT STEP at the top. A change that does not serve the
   current step is scope creep. Say so *first*, before critiquing its correctness. A beautifully
   correct change to the wrong thing is still the wrong thing, and this project's characteristic
   failure is polishing something interesting instead of finishing something needed. If the diff
   claims to serve the current step but doesn't, name the gap.
2. **Local correctness.** Does the diff do what it claims? What breaks? Cite `file:line` — a claim
   without a line number will be ignored.
3. **`VISION.md` §6, the non-negotiables.** A diff can be locally correct and wrong for this
   product. If it relaxes a rule to make a feature easier, reject it.
4. **`VISION.md` §8, the finish line.** Work that doesn't serve the current release is drift, even
   if it's good work.

Then check specifically for:

- **Missed call sites.** Grep before concluding a change is complete.
- **Reuse.** `core/` already has mastery, grading, placement, spaced review, curriculum,
  protonotation, stage-isolated feedback, chunk banks, pitch detection, and a seeded constraint-
  driven melody generator. Reinventing any of them is a defect.
- **New lies.** Does any code, comment, or document now assert something untrue? Does the UI claim
  a connection, a score, or a capability that isn't real? (`VISION.md` rule 12.)
- **Evidence tags.** `VISION.md` §9 tags every claim **[source]**, **[observed]**, or **[inferred]**
  and defines them. Reading code proves a thing exists, not that it runs. Flag any claim that
  something "works" when nobody has watched it.

End with a verdict: **SHIP / FIX-FIRST / REJECT**, and one line of reasoning. If the change is
genuinely fine, say so in two sentences and stop — do not manufacture objections, and do not
restate the diff.

## House rules

- `core/` is pure: no DOM, audio, network, clock, or I/O. Time is injected. Every module **must**
  ship with a `.test.js` beside it (one does not; see `VISION.md` §9). Tests: `cd core && npm test`.
- No emoji, no clipart — custom SVG icons only.
- Timing, audio, and rendering are verified in a real browser, never headlessly.
