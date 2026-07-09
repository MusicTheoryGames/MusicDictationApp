# archive/ — DO NOT READ THESE AS DESCRIPTIONS OF THIS CODEBASE

Every document in this directory is **stale, false, or about code that no longer exists.**
They are kept for provenance, not for reference. If you are looking for how something works,
`VISION.md` is the source of truth; if you are looking for what to do next,
`RHYTHMQUEST_PLAN.md` is.

Archived 2026-07-09, after Claude and Codex independently classified all 44 top-level markdown
documents from the code and reconciled their answers. Codex was the harsher of the two, and where
it called a document false that Claude called current, it was right every time.

## Why archived rather than annotated

Because **an annotated lie is still the first thing a grep finds.** Two false claims in these
files were traced, with citations, from one document into another, then into code comments, then
into a test, and finally into an engineer's mouth:

**Chain 1 — "the two-voice engine is unbuilt / it's first species."**
`TWO_VOICE_ENGINE_PLAN.md` ("NOT yet built") → a comment in `core/melodic.js` asserting the
counterpoint rules were "hard requirements" that the code demonstrably relaxes → a comment in
`core/melodic.test.js` claiming an invariant its own fixture could never reach → `MELODIC_CURRICULUM.md`,
`EXECUTION_PLAN.md`, `MELODIC_RENDERER_SPEC.md`, `CONFORMANCE_AUDIT.md` → a new plan document →
an engineer telling the owner that the two-voice engine blocked HarmonyQuest. It had shipped a week
earlier (2026-07-02). It is also not first species: `generateTwoPartMelody` drops the parallel-perfect ban under
a starved search and never checks weak-beat dissonance.

**Chain 2 — "the classroom works."**
`RHYTHM_DICTATION_SUMMARY.md` declared the classroom system complete → `SUITE_DESIGN_SPEC.md`
repeated "completed / wired" → `EXECUTION_PLAN.md:49` used that as the premise for a whole phase →
`MELODIC_CLASSROOM_PLAN.md` turned a nonexistent transport into a *parity checklist* for MelodyQuest.
In fact **no student client for `rhythm-rooms/*` has ever existed** in this repo, and until
2026-07-09 the student page faked a connection outright.

Chain 2's textual sequence is directly citable. Chain 1's *arrows* — which document caused which —
are inference from content and dates, not proof of authorship. What is certain in both cases: the
claims are false, they appear in several files, and later work relied on them.

Both chains were plausible at every hop. Nobody lied. The documents simply outlived the code, and
each new document trusted the last one.

## What is in here

**About deleted code** — the `app.js` / `questions_*.js` hand-authored question-bank product:
`INFRASTRUCTURE_SUMMARY.md`, `SOLUTION_SUMMARY.md`, `RHYTHM_RULES_SUMMARY.md`,
`SUBAGENT_INSTRUCTIONS.md`, `MASTER_SUBAGENT_DEPLOYMENT_GUIDE.md`, `STYLE_GUIDELINES.md`.

**Describe shipped work as unbuilt:** `TWO_VOICE_ENGINE_PLAN.md`, `SKILLS_GYM_PLAN.md`,
`MELODIC_LADDER_EXPANSION_PLAN.md`, `SIGHT_SINGING_BUILD_PLAN.md`, `TAPPING_PLAN.md`.

**Describe unbuilt work as shipped:** `RHYTHM_DICTATION_SUMMARY.md`, `SUITE_DESIGN_SPEC.md`,
`MELODIC_CLASSROOM_PLAN.md`, `STRATEGY_AND_ROADMAP.md`.

**Contradict the shipped curriculum:** `MELODIC_GENERATOR_LADDER.md` (its M-numbers assign the
wrong skill to the wrong rung — M20 is two-part, not modal mixture).

**Architecture never adopted:** `ARCHITECTURE_RESEARCH.md`, `SUITE_DESIGN_SPEC.md` (monorepo, Lit,
GamePlugin registry, Firebase hybrid). Only the mastery/placement numbers were implemented.

**About a different product:** `MUSIC_SUITE_XP_SPEC.md` targets Staff Commander. Nothing in it is
built here.

**Contains one thing still needed:** `TWO_VOICE_ENGINE_PLAN.md` §3 scopes the **rhythm duet** (one
line per hand), which remains genuinely unbuilt. That requirement is now recorded in `VISION.md` §9
so nobody has to open this file. Do not treat anything else in it as true.

**Superseded by a decision:** `BEATQUEST_CASUAL_TAPPING_PLAN.md` wires tapping into BeatQuest Casual;
Tapping is now a separate app (`VISION.md` §5). Codex judged this one still-current on its technical
diagnosis — the disagreement is recorded here rather than silently resolved.

## Rule

If you find a claim from one of these files repeated anywhere outside `archive/`, that is a bug.
Delete the claim, don't propagate it. And do not resurrect a file from here without re-verifying
every assertion in it against the code.
