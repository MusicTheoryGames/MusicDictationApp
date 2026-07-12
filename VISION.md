# VISION — the single source of truth

**If any other document in this repository disagrees with this one, this one wins.**
Several of them do disagree, and several are simply false. See §10.

Last verified against the working tree on 2026-07-09 (baseline commit `e9f1dcd` plus the
step-0/1a changes landing alongside this file). Facts here describe the tree, not that commit.

---

## 1. What this is

A suite of browser apps that teach **music dictation** — the skill of hearing music and
writing it down — and the reading and singing skills that dictation depends on.

It is not an ear-training quiz. Quizzes exist. This teaches the *procedure*.

## 2. The thesis, and the evidence for it

Every serious competitor drills. None of them teaches.

The peer-reviewed survey of this exact market — Chenette, Davis & Kleppinger, *"A Critical
Review of Current Aural Skill Materials and Pedagogical Practices,"* **Journal of Music Theory
Pedagogy Vol. 36 (2022)** — examines the five robust incumbents (Auralia, Artusi/MacGAMUT,
Picardy, EarMaster, Practica Musica) and finds:

> *"Every piece of software reviewed here that asks users to click or drag the pitches they hear
> onto a staff … requires them to do so **in sequence** — from the first note of the dictation to
> the last… Working from beginning to end, one note at a time, is both inefficient and
> disconnected from typical musical experience. It is also, maddeningly, a habit that generations
> of aural-skills teachers have worked to excise."*

No shipping product between 2022 and 2026 permits non-sequential or sketch-first entry. No
shipping product implements the research-backed procedure. That is the entire opportunity.

**The four claims we are betting on, each with a source:**

1. **Dictation has a procedure, and it can be taught.** Karpinski's four-stage model — hearing,
   short-term memory, understanding, notation (*A Model for Music Perception and its Implications
   in Melodic Dictation*, JMTP 4, 1990; *Aural Skills Acquisition*, OUP 2000).
2. **Memory comes before notation.** McHose, *Teachers Dictation Manual* (Eastman, 1948): *"The
   student should not be allowed to write the notation until he can sing back the exercise on a
   neutral syllable."*
3. **Function beats intervals.** Buonviri & Paney's interviews with AP Theory teachers (*JRME*,
   2015) and Paney & Buonviri's survey of 398 college instructors (*Update*, 2017): instructors
   favour scale-degree **function** over interval width, meter-based rhythm systems, "targeting
   melodic bookends," and big-picture-before-detail. McHose agrees: melodic dictation *"is not a
   horizontal drill in abstract intervals."*
4. **Harmony is heard from the bass.** Chenette, *"What Are the Truly Aural Skills?"* (*Music
   Theory Online* 27.2, 2021, N=74): bass lines were the strategy of **88% of listeners**, more
   than ten points ahead of anything else. Roman-numeral labels "are not those most directly
   available to perception."

**And one caution that keeps us from copying McHose blindly.** Buonviri & Paney's companion
studies (*Silence, Sound, and Singing on Dictation Accuracy*; *Preparatory Singing Pattern*) find
that **inaccurate pre-singing and forced solfège patterns can *hurt* accuracy.** The memory gate
is therefore a **motor echo** — tap it back — never a mic-scored vocal performance.

## 3. Who it is for

All four of these, deliberately, and the tension is real:

| Audience | What they need |
|---|---|
| College aural-skills students | Semester ladders, rigour, instructor-assigned work, transfer across keys |
| AP Music Theory / high school | An exam to pass, assignable work, progress reports |
| Aaron's own piano & theory students | Short sessions, no semester structure, a teacher in the room |
| Self-directed adult learners | No teacher, no classroom — retention depends entirely on the app being *fun* |

**The tension, stated honestly:** a tool rigorous enough for a college theory sequence is usually
too dry for a ten-year-old, and a tool fun enough for a ten-year-old is usually too thin for a
conservatory. We resolve this in exactly one way, and nowhere else:

> **The curriculum is identical for everyone. Only the skin, the pacing, and the arcade layer
> differ.** A level never gets easier because a younger student is playing it. The placement test
> decides where you start; nothing decides how hard the material is.

## 4. Business model

**Paid consumer subscription.** This is decided, not open.

- **The arcade layer is therefore load-bearing, not garnish.** Retention is the business. If it
  isn't fun, there is no subscription. See §6.
- **School site licensing is not being built**, even though the classroom is a core feature and
  every incumbent sells that way. Whether to *add* it later is the open question (§11) — but no
  one designs a school-billing flow into the engine before that decision is made.

Nothing in `core/` may ever know about payment, entitlement, or tiers.

## 5. The suite

Two verbs, and they are different skills.

**Write what you hear — dictation:**

| App | Skill |
|---|---|
| **RhythmQuest** (was BeatQuest) | hear rhythm → write rhythm |
| **MelodyQuest** | hear melody → write melody |
| **HarmonyQuest** | hear progression → write bass line, then Roman numerals |

**Perform what you see — reading:**

| App | Skill |
|---|---|
| **Tapping** | see rhythm → perform rhythm |
| **SingQuest** | see notation → sing it (teaching *how* to sight-sing) |

Rhythmic / melodic / harmonic is McHose's spine — Parts I, II, and III of the manual. It is why
"BeatQuest" is being renamed: a beat is one *rung* of rhythm, not the counterpart of melody.

**Proposed, not in scope: a third verb — write it yourself.**

| App | Skill | Status |
|---|---|---|
| **CounterQuest** | given a cantus firmus → write a correct counterpoint | proposed |

Counterpoint is neither dictation nor reading; the student *composes* and the app judges. McHose's
manual has a Part IV — two- and three-voice harmonic counterpoint — so it belongs to the same
lineage. Two honest warnings before anyone starts it:

1. **The existing two-voice generator cannot be its engine.** `generateTwoPartMelody` permits
   weak-beat vertical dissonance and abandons the parallel-perfect ban in its fallback stage (§9).
   That is acceptable for producing a duet to *dictate*. It is disqualifying for a tool that
   *teaches* counterpoint, which must never generate an example that breaks its own rules.
   CounterQuest needs a species engine and a rule-checker: two new pure `core/` modules.
2. **The rule-checker is the product, not the generator.** The value is in telling a student
   *which* rule they broke and why — the same stage-isolated diagnosis principle as rule 7. Building
   a generator first would be building the easy half.

Out of scope until the dictation trio is coherent (§8).

**The suite has no name yet.** Working proposals, in order of preference:
`EarQuest` (friendly across the whole age range, names the organ not the jargon) ·
`AuralQuest` (names the academic field; collegiate, drier) ·
`Audiate` (Gordon's term for hearing music in the mind; strongest concept, highest jargon cost).
**OPEN DECISION.** Until it is made, the repo is "the music dictation suite."

## 6. Non-negotiables

These are the rules an implementer may not quietly relax. If one of them makes a feature hard,
the feature changes, not the rule.

### Pedagogy

1. **Teaching is not a mode. It is the early rungs of the ladder.** MelodyQuest's M0–M8 withhold
   notation **production** — the student never writes a note until M9. Notation is *shown* earlier
   (M4 is recognition; M7 hides one note on a printed staff), because reading and producing are
   different skills and reading comes first. That progression *is* the teaching. There is no
   "learn" toggle and no "skip the basics" button. Every quest has this shape.
   *(A teach **screen** — the intro card before a level — is skippable, and should be; that is a
   modal, not a rung. What may never be skipped is a LEVEL, or the memory gate.)*
2. **Notation is withheld until memory is demonstrated.** The gate is a **motor echo** — tap it
   back, echo it — never scored singing. Sing-back is offered, tracked as process metadata, and
   never graded. (§2, claim 2 and the caution.)
3. **Reading precedes dictation.** McHose: *"Only after the student has thoroughly mastered a
   particular rhythmic problem through rhythmic reading should dictation be presented."* Tapping
   chapter N is advisory-gated before RhythmQuest chapter N.
4. **Order by function, not by interval width.** Melodic material advances by implied harmony —
   tonic, then tonic and dominant, then subdominant and supertonic, then V7, then modulation.
5. **Harmony is dictated from the bass.** Roman numerals arrive late, as a labelling layer over a
   bass the student can already hear. Never as the answer format for a beginner.
6. **The student never has to write left to right.** Sketch first, bookends first, structural
   tones first. This is the one thing no competitor does. It is the product.
7. **Errors are diagnosed by stage, not by note.** Tell the student *which sub-skill failed* —
   meter, contour, degree precision, tonic anchoring, note count — not merely which note was
   wrong. (`core/feedback.js`, after Klonoski.)
8. **You test in, you do not opt out.** A student who already knows the material takes the
   placement test. There is no toggle that skips the memory gate, because a gate you can skip is
   not a gate.

### Design

9. **Game feel lives in the verb, not the chrome.** XP, ranks, gems, stars and confetti are not
   game feel. What your hands do is. Each exercise *mode* is its own game; levels reparameterize
   it. One game per mode — not per level, or we will ship a hundred half-games.
10. **The arcade belongs to the drills. The ladder gets quieter as it gets harder.** Dictation is
    a working-memory task; timing pressure and motion consume exactly the resources the exercise
    trains. Notation levels have no timer and no particles. The silence is the point.
11. **No emoji. No clipart.** Every icon is a custom in-house SVG.
    *Enforcement, rebuilt 2026-07-10 [observed: `cd core && npm test`, 501 pass].*
    `core/no-emoji.test.js` has three tests. **STRICT** bans emoji and icon/arrow/geometric glyphs.
    **EMOJI-ONLY** bans everything STRICT does except arrows (`U+2190`–`U+21FF`) and geometric shapes
    (`U+25A0`–`U+25FF`), which those files use in prose comments and in one level title
    ("Simple ↔ compound"). `U+2669`–`U+266F` (`♩ ♪ ♫ ♬ ♭ ♮ ♯`) are music notation, allowed by both.
    The third test **re-derives the shipped UI surface from the served entry points** and fails if any
    file it reaches is in neither list, or if any reference it sees cannot be read. `core/` modules are
    covered — `core/melodic-curriculum.js`'s level titles are rendered to students at
    `melodic-game.html:1218` — and so is `suite-theme.css`, because CSS `content:` renders text.
    One exemption remains, `NOT_UI`: three files — one third-party bundle and two generated data
    maps — each with its reason written beside it. It is the same mechanism that once hid four drum emoji, so keep it small. That test is the
    point: the old whitelist named eight files by hand and **excluded every offender**, passing green
    while four shipped pages carried 🥁 in an `<h1>`.
    **What it does not do**, stated because a guard that overstates itself is the bug it exists to
    prevent: it is a static crawler, not a loader. It reads `src`/`href`, static `import … from`, and
    `melodic-game.html`'s `ARCADE_GAMES` literals. It cannot see a dynamic `import()`, a `src`
    assembled at runtime, or a bare specifier. It cannot tell a comment from markup, or an icon from
    typography — a reviewer must. EMOJI-ONLY files still render arrow glyphs as text ("Continue →").
12. **The app never lies to the user — or to the next developer.** No "Connected" over a simulated
    socket. No comment claiming a capability the code lacks. No document calling something
    "working" that nobody has watched work. If a feature is unavailable, it says so.

### Engineering

13. **`core/` is pure.** No DOM, no audio, no network, no clock, no I/O. Time is injected. Every
    module **must** ship with a `.test.js` beside it. One module violates this today —
    `core/curriculum.js` — and that is a defect, not a precedent. This is the functional core; the
    HTML pages are the imperative shell.
14. **One exercise object feeds many renderers.** The generator produces a melody or rhythm; a
    renderer decides how much of it is visible and how the student answers.
    (`melodic-game.html:699` is the reference implementation.)
15. **Generation is seeded and deterministic.** Same seed, same exercise. Candidates are generated
    and *scored*, then selected by difficulty percentile — never argmax, which converges on the
    blandest legal answer.
16. **A level's constraints are data, not code.** Degrees, leaps, meters, rhythm vocabulary,
    allowed harmony, pass gate — all declared in a curriculum module.
17. **Tested does not mean wired.** Check the call sites before believing a module is in use.

## 7. The classroom

**Teacher use is a core feature, not an add-on.** Two modes, both required:

- **Live room.** Teacher creates a room, students join, teacher drives the round, the projector
  shows the answer revealed beat by beat. Identity is a room code and a display name — no
  accounts, which is also the right posture for minors.
- **Assigned practice.** Teacher assigns levels, students work on their own time, teacher sees a
  roster of mastery per student per skill. This *requires accounts*, which the suite has never
  had, and it carries a student-data privacy obligation.

Even the anonymous live room stores display names and answers. Security rules, room TTL and
cleanup, room-code abuse handling, and a written retention policy ship **with the live room**, not
later with accounts.

## 8. The finish line for the next release

> **Amended four times by the owner.**
> **2026-07-09:** the RhythmQuest UI redesign ships **before** the classroom. §4 makes the arcade/UI
> layer load-bearing rather than garnish — this is a paid consumer subscription, so retention is the
> business — and the owner has seen the redesign run and prefers it.
> **2026-07-10:** the old teacher tool and projector were archived. A classroom release now means
> building a **new** teacher interface against the Quest games, not repairing the old one.
> **2026-07-10 (later):** the classroom's **back-end foundation** is authorized to be built **in
> parallel** with the UI finish. The owner is completing the RhythmQuest UI separately (with Codex);
> concurrently the live room's pure, no-network core is started — `core/room.js`, this section's room
> schema made meter-aware, teacher-`uid`-bearing, and roster/answer-preserving. This does **not**
> re-order what *ships*: the UI redesign is still the next release and the live room's own release
> still follows it. What changed is only that foundation work is authorized now, not deferred.
> **2026-07-10 (later still):** the chosen backend is **Supabase — one project for the whole suite**
> (a decision, not yet built). Every Quest game is to read and write that one project, because a
> student is one identity across the suite and the teacher dashboard + cross-game data (and later
> leaderboards) require shared storage; the data is not to be split per game, and it is a new project
> dedicated to this suite rather than a reused sibling one (minor-student PII). The live room will
> therefore use **Supabase anonymous sign-in + Realtime + row-level security** instead of Firebase.
> This closes §11's Firebase-vs-Supabase question. `core/room.js` stays backend-agnostic — only its
> module doc is retargeted from Firebase to Supabase.

**The next release is the RhythmQuest UI.** It is done when items 1–5 are **[observed]** — by a
person, in a browser, on the hardware in item 4.

1. The redesign's visual language is on the live engine: layout viewport-locked on both axes, Submit
   and Check in reserved action rows, bank tiles and answer cells sharing sizing variables.
2. **The bank is always PNG; the answer is VexFlow, drawn by the ONE shared renderer.** That is the
   redesign's split — the bank art is PNG in every mode (`renderBeatBank` never draws VexFlow, and
   `bankDir()` only chooses `bank/` vs `bank-tight/` PNG art), while the ANSWER is drawn by the shared
   `shared/rhythm-notation/*` renderer (extracted verbatim from the migrated redesign). `?renderer=png|
   hybrid|vexflow` switches the ANSWER renderer only — never a VexFlow bank; the migrated redesign's
   default is `hybrid` [source: quest-redesign.js normalizeBeatRendererMode].
   **Standard notation flow (migrated redesign): the answer renders VexFlow for EVERY figure family**,
   the meter families (compound `cd-*`, and `hb dh de tpl`) INCLUDED — stems down, no five-line staff,
   noteheads centred on their beat onsets. RhythmQuest routes every family to VexFlow in hybrid mode:
   `shouldRenderPlacedVex` marks the meter families `renderAssetOnly`, but they all reach VexFlow via
   its custom-beaming exception (`usesBeatUnitCustomBeaming`) and tuplets via the tuplet exception
   [source: quest-redesign.js shouldRenderPlacedVex + renderer.js usesBeatUnitCustomBeaming].
   *Evidence:* the shared answer board draws all these families — a 6/8 compound example included — and
   the owner confirmed it on-device (2026-07-11); TapQuest's perform target, which reuses the same
   shared board, is owner-verified on iPad/iPhone Safari [observed]. Whether the LIVE RhythmQuest page
   itself paints compound VexFlow has not been separately watched in a browser — that routing is
   [inferred] from the shared code path. There is no automated regression test for SVG positioning yet
   — a known gap, not a claim of coverage.
   **Migration status (the shared flow is not yet universal).** RhythmQuest (the migrated redesign) is
   on this shared flow. The standalone TapQuest / BeatQuest Casual student path (`rhythm-student.js`
   `renderPatternArt`, gated by `!meterFigDir` at `rhythm-student.js:1015`) STILL keeps the meter
   families PNG; those games are being moved onto the shared renderer / answer board so their notation
   matches RhythmQuest exactly — TapQuest's perform target is the FIRST surface moved [observed]. Until a
   given game/surface is moved, its meter families stay PNG on that surface.
3. Tap-back is re-skinned, and **its behaviour is unchanged**: the `TB` state machine
   (`idle → ready → metro → countoff → capture → done`), the lock-in phase, per-bar results, "Try
   again", and the BL/BR hand-swap forced at the capstone. The prototype's tap-back is a demo — its
   beat pad is never wired, so the dual-task mechanic is absent. Do not port it.
4. **Hardware/browser targets:** Safari on iPad (the students' device), plus current Chrome and
   Safari on macOS. Nothing else is promised.
5. Nothing in the UI claims a connection, a score, or a capability that isn't real (rule 12).
   "Show answer" is gone from the hint menu: it is a forfeit, not a hint, and the code said so —
   `msg("Here's the correct rhythm. (No points — hit Next for a new one.)")`.

**Then the classroom.** A teacher must be able to run a real lesson, with real students, on real
hardware. On 2026-07-10 the owner decided to build a **new** teacher interface rather than continue
the old one. (That is a decision, not a claim about the code, so it carries no evidence tag.)
Two facts about the old one **[source]**: it hard-coded 4/4 while the curriculum spans ten meters,
and this repo contains no student client for the schema it broadcast on. Whether it could have been
repaired is **[inferred]**; nobody tried.
What the replacement must satisfy, restated from the release this section used to describe — as a
target, not a plan:

- A teacher lands on `index.html` and can reach the teacher tool.
- **Teacher → student → projector works end to end**, with an automated integration harness over the
  room schema, *and* one observed run on real hardware. Neither alone counts.
- **Meter matrix.** A round is correctly created, played, answered and revealed in each of `2/4`,
  `3/4`, `4/4`, `2/2`, `3/2`, `6/8`, `9/8`, `12/8`. Irregular (`5/8`, `7/8`), `6/4`, `6/16` and
  changing meter are out of scope. Testable non-preclusion criterion: the room schema carries
  `{ beatsPerMeasure: number[], beatUnit: string }` and no code path computes beats as
  `measureCount * 4`; a schema test asserts a `5/8` room round-trips through create/play/reveal
  without loss, even though no UI exposes it.
- The student's landing screen is the game, not a login.
- **Live-room safety.** "Anonymous" does not mean "no identity" — row-level security cannot distinguish
  two students without one. Each clause needs a passing test or a written note:
  - **Identity:** every participant signs in with **Supabase anonymous sign-in** and gets a `uid`. A
    student's answer is a row keyed by `(room, uid)` in an `answers` table; the teacher's `uid` is
    stored on the room row at creation. *RLS test:* a student `uid` cannot write another `uid`'s
    answer, cannot write the room's rhythm or revealed beats, and cannot read a room it has not joined.
  - **Room codes:** 6 characters from Crockford base32 (no `I`, `L`, `O`, `U`), ~2³⁰ possibilities.
    Joins rate-limited to 5 failed attempts per `uid` per minute; a room rejects joins beyond a
    teacher-set cap. *Test:* the generator never emits an excluded character; the 6th failed join is
    rejected.
  - **Expiry:** a room with no teacher heartbeat for **2 hours** becomes unreadable; its data is
    deleted within **24 hours**. *Test:* a scheduled cleanup (pg_cron or an Edge Function) against a
    local Supabase instance with an injected clock.
  - **Retention:** a note in this repo states what is stored (display name, answers, timings), for
    how long, and how a teacher deletes a room immediately.

Assigned practice, rosters and accounts are explicitly NOT in either release.

Everything else in the restructure plan — the R0–R11 teaching ladder, the harmonic axis,
HarmonyQuest, CounterQuest, the arcade layer — is downstream of both and waits.

## 9. What is actually true about the code today

This section exists because the other docs cannot be trusted. **Every sentence here was checked
against source on 2026-07-09 at `e9f1dcd`, and then adversarially re-checked by a second model
that found four errors in the first draft.** Hold it to that standard or delete it.

Three tags, and they do not promote into one another:

- **[source]** — readable in, *or exhaustively absent from*, the code at this commit. A repo-wide
  grep is a source fact about this repo. Proves a thing exists (or doesn't); never that it *runs*.
- **[observed]** — a person watched it happen in a browser, on stated hardware.
- **[inferred]** — everything else: deployment, what history happened, what an author intended,
  what people have or haven't done. Weakest. Never upgrade an [inferred] by reading harder.

*(A reviewer argued absence claims must all be [inferred]. Rejected: an exhaustive grep at a known
commit is evidence, and downgrading twenty true statements to "maybe" makes the document useless.
The line is drawn at claims about the world outside the repo.)*

**Pages.** `index.html`, `rhythm-student.html` + `solo-mode.js` (RhythmQuest), `tapping.html`,
`melodic-game.html` (MelodyQuest), `singquest.html` exist and reference their script stacks
**[source]**. `tapping.html`
is a *separate* 1,280-line page that loads the identical engine stack (`rhythm-student.js`,
`core-bridge.js`, `teach-content.js`, `solo-mode.js`) and switches behaviour on `?mode=tapping`
**[source]**. `dev-server.js:35` serves `home.html` at `/`, and the in-game Exit button navigates
to `home.html` (`solo-mode.js:2456`, `:2481`), while `index.html` never links it **[source]** —
that inconsistency is a bug, not a design **[inferred]**. Run everything with `node dev-server.js`.

**What is actually deployed is not knowable from this repo [inferred].** There is no root
`netlify.toml`; the only build config is the gitignored CLI cache `.netlify/netlify.toml:9`, whose
`publish` is an absolute path to `/Users/aaronpike/Desktop/Music Dictation APP` **[source]** — a
directory the repo was moved out of on 2026-07-09 **[inferred]**. The site's real build settings
live on Netlify. **Re-run `netlify link`, then record the true publish directory and production
branch here.** Until then, no document may claim which page is "the deployed front door."

**Present in the repo and wired into the game, contrary to what some docs say.** `generateTwoPartMelody`
(`core/melodic.js`) generates two-voice, note-against-note writing, and m20 is admitted by
`PLAYABLE` with `RENDERERS['two-part']` defined **[source]**. `archive/TWO_VOICE_ENGINE_PLAN.md` says it is
unbuilt and is **wrong**.

**It is not strict first species — do not describe it as such.** Inside `generateTwoPartMelody`,
the `counterpoint` filter bans voice crossing, bans similar-motion perfects (a parallel-fifth/octave
test, not a hidden-octave test), and requires consonance **only on strong beats**. Weak-beat vertical
dissonance is never checked — an absent rule, not a relaxed one. Its `stages` array escalates
`[declared leaps, counterpoint] → [widened leaps, counterpoint] → [widened leaps, noParallel]`, so
stage 2 relaxes the level's **declared leap set** and stage 3 additionally drops the
**parallel-perfect ban**; the cadence placer drops it too when every in-range tonic would be
parallel. Exactly one *counterpoint* rule is relaxed; a *curriculum* constraint (leaps) is relaxed
first. All **[source]**, pinned by the characterization test
`core/melodic.test.js` → "a narrow spec starves the search into stage 3".

*(Cite symbols, not line numbers, for internals of this function — editing it has invalidated these
citations three times.)*

Reachability: `melodic-round.js:238` is the only production caller, for m20, with degrees 1-7 and a
key-shifted range around 48-79 **[source]**. No shipping level has been shown to starve the search.
That is *not* a proof of unreachability — do not claim one **[inferred]**.

**Written, tested, and never called.** `core/grading.js`'s `gradeDictation` — pure, tested, exposed
on `window.LevelCore` (`core-bridge.js:34`), invoked by nothing but its own test **[source]**.

**Computed, used, and then hidden.** `makeHarmonicPlan` (`core/melodic.js:616`) builds a per-bar
chord plan, and it *is* used — it feeds `chordDegs` into `chooseNextHarmonic` in both the solo and
two-voice walks. But it is a local `const` (`:989`) and is **never attached to the returned melody
object**, so no renderer, grader, or teacher surface can see the harmony the melody was built from
**[source]**. There is no Roman-numeral data model anywhere.

**Registered gaps.** The **tapping rhythm duet** — two rhythm lines, one per hand, graded per onset
per hand — is genuinely unbuilt. `core/curriculum.js` already models it (`forms.*.voices: 2`). This
is the only surviving requirement from the archived two-voice plan.

`melodic-round.js:309` force-downgrades every modulating or
symmetric-collection level (M19, M24, M26) to multiple-choice, because no cross-key notation
grader exists. Its own comment calls this "an honest registered gap, not a substitution
(audit §A5)" **[source]**.

**There is no classroom, and no teacher tool.** The stack — `rhythm-teacher.*`, `projection.*` — is
in `archive/` **[source]**, moved 2026-07-10 at the owner's instruction: *"we will want a new teacher
interface to link to our current games."* It hard-coded 4/4 while the curriculum spans ten meters
**[source]**. This repo contains no student client for its `rhythm-rooms/*` schema **[source]**; that
none ever existed, and that the loop never ran, are **[inferred]** — no record shows either way.
The pure room state model — `core/room.js` (room schema, message reducer, per-onset reveal-unlock,
TTL; no DOM/network/clock) — was added 2026-07-10 as the classroom foundation authorized by §8, and a
Supabase backend now sits under it: anonymous-auth connectivity (`supabase-*.js`), the room schema +
row-level security (`supabase/migrations/0001_live_room.sql`, checked by the automated
`supabase/rls-check.mjs`), and much of the transport in `room-transport.js` — the teacher's lifecycle
(`createRoom`, `assignRhythm`, `heartbeat`, `closeRoom`), students `joinRoom`/`leaveRoom`/`submitAnswer`,
and the `fetchRoom` read (through the `get_room` single-snapshot function) plus the pure `assembleRoom`
that folds rows into a core Room. `assignRhythm` is validated in the shell via `reduce()` and persisted
atomically by `assign_round` (which locks the room row, re-checks teacher ownership, and clears the old
answers while setting the new rhythm in ONE transaction); `heartbeat` refreshes the TTL with the
database clock; `closeRoom` sets the terminal state; `joinRoom`/`leaveRoom` go through guarded SQL
functions (`join_room` rejects a missing/closed room, `leave_room` is a no-op on a closed room);
`submitAnswer` is shell-`reduce()`-validated (ACTIVE, joined, onset, in-vocabulary) then upserts the
caller's own answer; `reveal`/`revealAll` (0002_reveal.sql: `reveal_beat`/`reveal_all`, SECURITY DEFINER,
teacher-checked) append onsets and enter REVEALING atomically. Three triggers, each taking a row lock so it
is race-safe against a concurrent state change and covers a direct write (not only the transport verb): the
closed rooms ROW is terminal (no UPDATE may change it, which also blocks a reveal on a closed room), a JOIN
into a closed room is rejected, and an ANSWER is accepted only while the round is ACTIVE (so no answering
after a reveal) **[source]**. That is the full message set (VISION §8). Its automated checks against the
real Supabase project live in `supabase/room-transport.integration.mjs`, `supabase/room-student.integration.mjs`,
`supabase/room-answer.integration.mjs`, and `supabase/room-reveal.integration.mjs` — plus
`supabase/room-meter-matrix.integration.mjs`, which drives every §8 meter (2/4…12/8 and 5/8 non-preclusion)
through create→assign→join→answer→reveal. The live change-feed
also exists: `subscribeRoom` (a Realtime `postgres_changes` subscription on the three tables, filtered by
room code) re-reads via `fetchRoom` as the room changes and calls back with the assembled Room — coalescing bursts,
surfacing read failures via `onError`, and doing a catch-up re-read to cover the brief window while the
feed registers. A subscription re-reads through `fetchRoom`, so RLS scopes it exactly as the read path.
`supabase/room-realtime.integration.mjs` exercises a full live round on the teacher's subscription against
the real project, asserting the live feed's delivered view reflects the room's state after each step
end-to-end; the
event-triggers-a-read mechanism and the catch-up, read-failure, subscription-status (all three),
coalescing, throwing-callback, and timer-cancellation paths are covered by
`room-transport.subscribe.test.mjs` (a mock client, no network; the catch-up/timer cases use short
real timers) **[source]**. Still missing: any student/teacher/projector client — it is not yet a *usable*
live room **[source]**.

**Also true [source].** `solo-mode.js` has no renderer dispatch — mode is a binary `S.mode` branch;
`GUIDE.playable()` (`:394`) silently skips any level with zero figures. `RHYTHM_FIGURES`
(`core/rhythm-figures.js:16`) is pure but is *not* a one-beat bank; it contains whole, half,
dotted-half and half-rest figures too. `core/no-emoji.test.js` derives the shipped UI surface
from the entry points by static crawl; it cannot see dynamic imports (see §6). `core/curriculum.js` is the only `core/` module with no test.
`archive/MUSIC_SUITE_XP_SPEC.md` describes a different product (Staff Commander); nothing in it is built
here.

## 10. Which documents to trust

- **This file** for facts; **`RHYTHMQUEST_PLAN.md`** for what to do next and in what order.
  Then `history/CONFORMANCE_AUDIT.md` and `history/MELODYQUEST_CHANGELOG.md`.
- **Repaired 2026-07-09, now reliable:** `history/EXECUTION_PLAN.md`, `MELODIC_CURRICULUM.md`,
  `MELODIC_RENDERER_SPEC.md`, `history/CONFORMANCE_AUDIT.md`. All four had called the two-voice engine
  "first species" and/or described shipped M20 rungs as future. Corrected. If you find another
  copy of that claim, it is a bug — the engine is note-against-note (§9).
- **Specs, repaired 2026-07-09 — their build-status lines had rotted, their architecture had not:**
  `MELODIC_ENGINE_SPEC.md`, `MELODIC_RENDERER_SPEC.md`, `INTERVAL_GYM_SPEC.md`, `CURRICULUM_PLAN.md`,
  `BUTTON_DESIGN.md`, `TEACH_SCREENS_PLAN.md`. Reference: `research/VEXFLOW_LESSONS.md`, `research/HALL_CATALOG.md`,
  `research/HALL_CURRICULUM.md`.
- **Research, still valid:** the `*_RESEARCH.md` set, `research/LEVEL_SYSTEM_RESEARCH.md`,
  `history/LEVELS_4_10_ROBUSTNESS.md`.
- **Actively false — do not act on** (all now in `archive/`, and `README.md` was rewritten
  2026-07-09):
  `archive/TWO_VOICE_ENGINE_PLAN.md` (says shipped work is unbuilt), `archive/MELODIC_GENERATOR_LADDER.md` (its
  M-numbers contradict the shipped ladder), `archive/INFRASTRUCTURE_SUMMARY.md`, `archive/SOLUTION_SUMMARY.md`,
  `archive/RHYTHM_RULES_SUMMARY.md`, `archive/SUBAGENT_INSTRUCTIONS.md`, `archive/MASTER_SUBAGENT_DEPLOYMENT_GUIDE.md`.
- **Stale but harmless:** `archive/SKILLS_GYM_PLAN.md`, `archive/SIGHT_SINGING_BUILD_PLAN.md`,
  `archive/MELODIC_LADDER_EXPANSION_PLAN.md`, `archive/STRATEGY_AND_ROADMAP.md`, `archive/ARCHITECTURE_RESEARCH.md`,
  `archive/SUITE_DESIGN_SPEC.md`, `archive/BEATQUEST_CASUAL_TAPPING_PLAN.md`.

**Verify against `core/` and the running app. Never against prose.**

## 11. Non-goals and open questions

**Explicit non-goals.**
- A notation editor. Answer entry is purpose-built per exercise mode; we are not building Finale.
- A performance-assessment tool. SingQuest teaches sight-singing; it does not grade a recital.
- A corpus of real repertoire. Melodies are generated under curriculum constraints. Mining
  public-domain scores is a good idea for a later quarter; the generator is not the weak part.
- Absolute pitch, interval-name drilling as an end in itself, or anything that rewards piano
  background over hearing. (Chenette, MTO 27.2.)

**Recently resolved.** The **backend** is decided — Supabase, one project for the whole suite (the
live room and, later, accounts/assigned-practice all in it); a new project dedicated to this suite,
not a reused sibling one (minor-student PII), and never split per game (§8, owner 2026-07-10).

**Open decisions, recorded so nobody resolves them by accident.**
- The suite name (§5).
- Whether to *add* school site licensing alongside the consumer subscription (§4). The subscription
  itself is decided.
- Whether SingQuest is a standalone product at all, or whether its mic layer (`core/pitch.js`) is
  simply the optional sing-back step inside the dictation trio.
- Whether `home.html` becomes the real front door, or is deleted and `solo-mode.js:2456,2481`
  repointed at `index.html`.

---

*Change this document when the product changes. Do not let the code drift from it silently —
that is how the other forty documents got here.*
