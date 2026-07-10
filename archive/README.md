# archive/ — DO NOT READ THESE AS DESCRIPTIONS OF THIS CODEBASE

Every document in this directory is **stale, false, or about code that no longer exists.**
They are kept for provenance, not for reference. If you are looking for how something works,
`VISION.md` is the source of truth; if you are looking for what to do next,
`RHYTHMQUEST_PLAN.md` is.

Archived 2026-07-09, after Claude and Codex independently classified all 44 top-level markdown
documents from the code and reconciled their answers. Codex was the harsher of the two, and where
it called a document false that Claude called current, it was right every time.

## 2026-07-10 — the great cut: 89 files, 43,430 lines

The owner: *"the ONLY games that will be part of this going forward are the QUEST games"* —
RhythmQuest, MelodyQuest, SingQuest, BeatQuest Casual, and the unbuilt HarmonyQuest and
CounterQuest. *"Everything else is old and trash."* Archived, not deleted, so the record survives.

**The multiple-choice app (2025-09).** `app.js` (7,952 lines), `app.js.backup`
(14,352 lines), `app_modular.js`, `student.html`, `index_modular.html`, `question_templates.js`,
`rhythm-patterns-complete.js`. A teacher played an excerpt; students picked which of six notations
they heard, voting over a `rooms/*` Firebase schema. It **did** have a student client —
`student.html` registers and writes answers there **[source]** — it was simply never observed
working **[inferred]**. Do not confuse it with the RHYTHM teacher below, which had none. **Its question bank was NOT archived** — 40 hand-authored questions,
each a set of six near-identical melodies, now at `content/melody-multiple-choice/`. The near-misses
are the expensive part. There is no fixed answer key: `archive/app.js:6808` picks one of the six at
random, plays it, and asks the student which. `// Option 0: CORRECT ANSWER` is an authoring label
nothing reads. That README explains it; read it before reusing them;
`VISION.md` §2 is clear that recognition is not dictation. Archived here instead: the two empty
question stubs (`questions_4-4_4m_C-major_simple.js`, `questions_6-8_2m_C-major_simple.js`, headers
promising material never written) and `questions_4-4_2m_C-major_complex_fixed.js`, a variant nothing
loaded.

**The old rhythm site (2025-09-18).** `rhythm.html` (a landing page), `rhythm-practice.html`, and
`rhythm-practice.js` — **a fifth rhythm engine** with its own hard-coded pattern table. It is where
the split-brain came from: `rhythm-teacher.js:4` says, in as many words, *"Copy rhythm patterns
from rhythm-practice.js."*

**The classroom.** `rhythm-teacher.html`, `rhythm-teacher.js`, `projection.html`, `projection.js`.
Real code, and it never worked as a system: it broadcast on a `rhythm-rooms/*` schema **no student
client has ever spoken**, it was reachable only from `rhythm.html` (itself unlinked), and it was
hard-coded to 4/4 while the curriculum spans ten meters. The owner wants a new teacher interface
built against the Quest games. Do not mine this for a protocol. Mine it for a warning.

**Scratch and duplicates.** 26 one-off Puppeteer/validation scripts (`_s3.js`, `*_tmp.js`,
`validate_*.js`, `extract_*.js`, `test_*.js`, `crop-*.js`), and `PRESERVED_WORK/`, whose two
question files were **byte-identical** to the top-level copies despite claiming to hold "the G#
leading-tone fixes".

**Mockups, concepts, prototypes.** `design/`, `prototypes/melody-lands/`, the seven `arcade-*.html`
concepts, `header-mockups.html`, `groove-mockups.html`, `melodic-lab.html`, `melodic-demo.html`,
`melodic-ladder-demo.html`, `melodic.html` (the hand-authored MelodyQuest prototype), the four
`singquest-*.html` variants, `compound-preview.html`, `png-generator.html`, `svg-generator.html`.
Several are cited in live code comments as the source a feature was ported from; those comments now
name the `archive/` path (`index.html`, `singquest.html`, `melodic-shell-services.js`,
`melodic-round.js`, `solo-mode.js`, `rhythm-student.js`).

**Dead assets.** `vendor/Tone.js` (nothing imports it; `melodic-shell-services.js:480` already said
so) and four `rhythm-assets/*/…-assets.js` manifests nothing loads.

**NOT archived, though they are not games:** the six `generate-*.js` scripts, which produce the
`rhythm-assets/` art RhythmQuest renders, and the four `game-*.html` arcade titles (Simon, Contour
Runner, Sky Hop, Note Invaders) — opened in an iframe from MelodyQuest's Arcade Drawer at
`melodic-game.html:2743`. Both are live product.

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
