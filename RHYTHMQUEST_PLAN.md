# Music Dictation Suite — restructure plan

> **This is the SEQUENCED WORK. `VISION.md` is the SOURCE OF TRUTH.**
> Where they disagree about a *fact*, `VISION.md` wins. Where they disagree about *what to do next*,
> this file wins. Sections here that predate `VISION.md` may carry claims corrected since.
>
> **CURRENT STEP: 2 — the RhythmQuest UI.** `VISION.md` §8 was amended (owner, 2026-07-09) so the
> redesign ships before the classroom; §8 now carries the five observable criteria. Step 1c (archive
> everything that is not a Quest game) landed as `d2f926e`; its record is `archive/README.md`.
>
> Bring the UI to the engine, never the engine to the UI. The prototype has no engine. The owner
> keeps his five themes: the redesign is the LAYOUT, and mpc/manuscript/arcade/brutalist/kids re-skin
> it. Measured: `suite-theme.css` is 266 theme-scoped rules of 289.
>
> The old teacher tool went too. A **new** teacher interface will be built against the Quest games.
>
> Step 1b (the BeatQuest→RhythmQuest rename) landed as `cade60e`.
>
> **NO localStorage KEY IS RENAMED, AND NONE WILL BE.** Owner's decision, 2026-07-09, after Codex
> found a progress-loss bug in the migration this plan originally specified: migrate a student at
> level 6, roll back the deploy, let the old build advance the legacy key to level 9, roll forward —
> and the new build loads the stale new key at level 6. Their data is on disk; they cannot see it.
> Mirroring every write does not fix it (the old build writes only the legacy key). Preferring
> "whichever profile is further along" does, at the cost of a merge rule, two writes per save, and a
> special case for a student who restarts on purpose — none of which buys anything a user can see.
> So `beatquest-guided-<mode>` and `beatquest-placed-<mode>` stay, alongside `beatquest-solo` and
> `beatquest-theme`, which were never going to be renamed. A localStorage key is an internal
> identifier, like `window.BeatQuestSolo`.
>
> Any change that does not serve the current step is scope creep and should be rejected in review.

## Context

The repo at `~/Desktop/Music Dictation APP` contains a genuinely substantial engine —
a 1,894-line constraint-driven melody generator, a 4,951-line rhythm game, and a `core/`
directory of pure, unit-tested modules — wrapped in a product whose shape doesn't match
its own pedagogy.

Three problems prompted this plan:

1. **A missing ladder, not a missing app.** MelodyQuest is one continuous ladder (M0–M26)
   whose first nine rungs withhold notation entirely — the teaching *is* the early levels.
   RhythmQuest is that same ladder with those rungs missing: it opens at drag-to-notate on
   Hall chapter 1 and assumes you already know how to take rhythmic dictation. Its
   `teach-content.js` is a text screen before each level, not a curriculum.

2. **Reward chrome bolted onto a quiz.** MelodyQuest has XP, 11 ranks, gems, dailies,
   stars, and confetti. None of that is game feel. Game feel is in the verb, and for ten
   of twelve renderers the verb is "click the correct button." Meanwhile four working
   Web Audio games (`game-invaders.html`, `game-simon.html`, `game-jump.html`,
   `game-runner.html`) sit in the repo wired to nothing.

3. **Naming that hides the structure.** Five home-screen tiles for two-and-a-half things,
   and "Beat" is not the counterpart of "Melody" and "Harmony" — it's one rung of rhythm.

Two source documents (`Melodic DcitationGerneration Analysis.rtf`,
`melody_quest_implementation_spec.pdf`) were reviewed and are addressed in §8. The McHose
*Teachers Dictation Manual* (`teachersdictatio00mcho.pdf`) turned out to be the most
useful of the three and drives §2.

## Corrections to earlier assumptions (verified against source)

These were wrong in the conversation that produced this plan. They are corrected here so
nobody re-plans against them.

- **The two-voice engine is BUILT, and m20 is PLAYABLE.** `generateTwoPartMelody`
  (`core/melodic.js`) is note-against-note two-voice writing — **not** strict first species, as an
  earlier draft of this plan claimed: voice-crossing ban, parallel-fifth/octave detection,
  strong-beat-only consonance, hard-placed cadence, and a three-stage widening search whose stage 3
  drops the parallel-perfect ban. See `VISION.md` §9, which supersedes this paragraph. `RENDERERS['two-part']` exists (`melodic-game.html:707`),
  m20 has `exerciseMode: 'two-part'` and `buildStatus: 'ready'`
  (`core/melodic-curriculum.js:658-665`), so the `PLAYABLE` filter at
  `melodic-game.html:721` admits it. The comment at `melodic-game.html:716-718` claiming
  m20 is "excluded" is stale, and `archive/TWO_VOICE_ENGINE_PLAN.md` still says "NOT yet built."
  Both are wrong. Remaining m20 work is test coverage (`core/melodic.test.js` has 7
  two-part references; the plan doc demanded ≥40) and deleting the false comments.

- **HarmonyQuest's real blocker is the Roman-numeral model, not the two-voice engine.**
  `grep -i roman` across the melodic files returns zero hits. `makeHarmonicPlan`
  (`core/melodic.js:616`) computes a per-bar scale-degree triad array, uses it to bias note
  choice, and then **throws it away** — it is a local `const` inside `generateMelody`
  (`:989`), never attached to the returned melody object. No chord quality, no inversion,
  no figured bass, no `structuralTone` flags.

- **`core/grading.js` is written, tested, and unused.** `gradeDictation` (`:429`) is a fully pure
  dictation grader over `{measures:[beats:[onset offsets]]}` with a meter hard-gate
  (`checkMeterGate:271`), per-beat all-or-nothing comparison (`beatsEqual:187`), and
  uniform-shift forgiveness (`detectUniformShift:357`). Its only caller is its own test.
  `core-bridge.js:28-34` does expose the module on `window.LevelCore` — so it is *reachable*, just
  never invoked; `solo-mode.js` uses its own DOM-coupled `checkAnswer()` (`:2617`). It is waiting
  for exactly the use described in §3.

- **RhythmQuest and Tapping are one page.** `tapping.html` is `rhythm-student.html` booted
  with `?mode=tapping`; `core/ladder.js`'s `ladderForMode` returns "the same 31 levels" for
  both. They are presented as two products and persist to two blobs
  (`beatquest-guided-dictation` / `beatquest-guided-tapping`).

- **`index.html` is the deployed front door, not `home.html`.** Netlify publishes the repo
  root. `home.html` is only the local dev-server root (`dev-server.js:35`).

- **The two classrooms were different, and both are archived.** `archive/app.js` +
  `archive/student.html` spoke `rooms/${code}` with `/votes/` and `currentQuestion` — the
  multiple-choice voting feature of that dead multiple-choice app. `archive/rhythm-teacher.js` +
  `archive/projection.js` spoke `rhythm-rooms/${code}` and had no student client at all. Neither is
  a protocol to salvage; the teacher tool even carried its own `rhythmPatterns` table rather than
  reusing the curriculum. A new teacher interface will be built against the Quest games.

- **`~/Developer/music-dictation`, branch `tapping`, checkpoint `e9f1dcd`.** The repo was moved out
  of the iCloud-synced Desktop on 2026-07-09; 129 files — including all of MelodyQuest, SingQuest
  and 24 `core/` modules — had never been committed. `git push` needs
  `-c http.postBuffer=524288000 --no-thin` on this remote.

## 1. Naming and information architecture (DECIDED)

The suite has two verbs, and they are different skills.

**Write what you hear (dictation):**

| App | Was | Skill |
|---|---|---|
| **RhythmQuest** | BeatQuest | hear rhythm → write rhythm |
| **MelodyQuest** | — | hear melody → write melody |
| **HarmonyQuest** | — (unbuilt) | hear progression → write bass + Roman numerals |

**Other:**

| App | Status |
|---|---|
| **Tapping** | stays a separate tile — rhythmic *performance*, not dictation |
| **SingQuest** | **deferred** as a standalone app (§7). Its mic layer (`core/pitch.js`, `core/singquest.js`) gets harvested into the dictation trio's optional sing-back step. |
| **BeatQuest Casual** | keeps its name — belongs to the Staff Commander suite. Only its `<title>`/`<h1>`, which carried the old PRO name "BeatQuest — Rhythm Dictation", become "BeatQuest Casual — Rhythm Dictation". |

Rationale: McHose's manual has exactly three parts — Rhythmic Dictation, Melodic Dictation,
Harmonic Dictation. That is the spine. "Beat" is one rung of rhythm, and we are about to
build a rung literally called *find the pulse*.

**Rename scope.** `BeatQuest` → `RhythmQuest` in UI text and in prose comments.

*Identifiers do NOT change:* `window.BeatQuestSolo`, `window.BeatQuestTheme`, `'BeatQuestProjection'`,
the npm name `@beatquest/core`, `beatquest-theme`, `beatquest-solo`, `beatquest-guided-*`,
`beatquest-placed-*`, and the filenames `beatquest-casual.html` and `beatquest.html`.

*Prose the rename deliberately leaves alone (not an exhaustive list — the rule is what matters:
never rename a statement about the past, or a sentence that must name the old product to mean
anything):*
- **BeatQuest Casual** keeps its name — it belongs to the owner's Staff Commander suite. Its
  `<title>` and `<h1>` carried the old PRO name "BeatQuest — Rhythm Dictation"; they become
  **"BeatQuest Casual — Rhythm Dictation"**.
- `beatquest.html:16` reads *"BeatQuest is now RhythmQuest."* — a redirect for old bookmarks. It has
  to name the old product or it says nothing. Renaming it yields "RhythmQuest is now RhythmQuest."
- `beatquest.html:7` and `home.html:7` are HTML comments recording what those two URLs used to
  serve — a "Join Beat Quest" room-code login, and the second hub. Statements about the past.
- `VISION.md` and this file's own old→new mapping table EXPLAIN the rename; they must name both
  products. `VISION.md:395` names an `archive/` filename.
- `history/` and `archive/` record what was true when written (README.md:60). Renaming a changelog
  falsifies it. Filenames are identifiers and never change.

**No localStorage key is renamed** — see the CURRENT STEP block for why.

**The reading gate.** McHose: *"Only after the student has thoroughly mastered a particular
rhythmic problem through rhythmic reading should dictation be presented."* Tapping stays its
own app, but RhythmQuest chapter N reads the Tapping progress blob and, if chapter N is
unmastered there, offers a one-tap jump to it. Advisory, not blocking. Cheap: both blobs are
already `{items: {levelId: ItemState}}` from the same `core/mastery.js`.

**Skipping.** No optional/advanced toggle. A student who already knows the material takes
the **placement test** and is dropped at the right rung. `core/placement.js` exists;
MelodyQuest already runs a 16-item placement (`melodic-game.html:734`), and
`solo-mode.js` has a placement seam (`GUIDE.place`, `:668`) plus a `beatquest-placed-<mode>`
flag. McHose's memory gate only works as a gate — making it opt-out destroys it.

## 2. The rhythmic dictation ladder — what McHose actually specifies

The manual (pp. 3–4) gives a scaffold-removal ladder that nothing in the code implements.

**Type A** — meter signature given. Play twice → student conducts and sings back on a
neutral syllable → sings again on *rhythmic syllables* → writes barlines and notation on a
**one-line staff** → played once more to self-check.

**Type B** — only the beat's note value is given. The student must deduce and write the meter
signature.

**Type C** — either the meter *or* the beat value; three hearings; no singing scaffold.
*"All tests should use Type C."*

Two rules he treats as non-negotiable:

- **Memory gate:** *"The student should not be allowed to write the notation until he can
  sing back the exercise on a neutral syllable."*
- **Reading gate:** rhythmic reading precedes rhythmic dictation (→ the Tapping link, §1).

**Implement the memory gate as a motor echo, not a scored sing-back.** Buonviri & Paney's
companion studies (*Silence, Sound, and Singing on Dictation Accuracy*; *Preparatory Singing
Pattern*) complicate McHose here: **inaccurate pre-singing, and forced solfège patterns, can
*hurt* dictation accuracy.** So do not gate on mic-scored vocal pitch. Gate on **tap-back**
(R5) and **echo/memory-span**, which are motor and unambiguous; offer sing-back as an
untimed, unscored, optional step whose *completion* is tracked as process metadata. This is
the one place where copying the 1948 manual literally would make the product worse.

Two design gifts buried in the preface:

- **The conductor's beat is a dual-task mechanic.** The student keeps the pulse with one
  channel while singing/answering with another. That is both the actual skill and a real
  game mechanic. Nothing on the market makes you hold the beat while you answer.
- **Motivic repetition rate is a difficulty axis.** McHose groups exercises so the same
  figure lands in the same position in consecutive bars — *"This aids the time span of the
  memory"* — then strips repetition out at the end of each section. `genMeasure()`
  (`solo-mode.js:923`) draws every bar by independent random pick, so bar two never rhymes
  with bar one. Adding a repetition knob makes the early game both easier and more musical,
  and turning it down is the endgame.

**The rungs.** Each is a distinct verb, which is to say each is a distinct game — this is not
a ladder with games bolted on.

| Rung | Skill | Verb |
|---|---|---|
| R0 | Find the pulse | tap the beat under a rhythm trying to knock you off it |
| R1 | Duple or triple | feel which beat is strong |
| R2 | Simple or compound | does the beat split in 2 or 3 |
| R3 | Find the downbeat | locate beat 1; anacrusis |
| R4 | Count the attacks | how many sounds landed in this beat (0–4) |
| R5 | Tap it back | echo from memory — **the memory gate** |
| R6 | Locate the onsets | mark where sounds fell on a beat grid |
| R7 | Name the cell | match a heard beat to one of ~10 one-beat figures — *chunking* |
| R8 | On or off the beat | syncopation feel, before syncopation notation |
| R9 | Sketch it | protonotation: slashes on a beat grid — **the bridge** |
| R10/R11 | Rests, ties | see §3 risk 6 — these are post-bridge, not pre-notation |
| → | Hall ch1 | the existing drag-to-notate drill |

Type A/B/C is not a fourth axis to invent — it is the **difficulty setting** of every rung
from R9 on: A gives you the meter, B hides it, C is ranked mode.

## 3. RhythmQuest — engineering

**Build a new page, do not operate on `solo-mode.js`.** Its round lifecycle assumes the
target is notation-shaped from birth: `generateTarget()` (`:935`) emits measures of
`{patternId, startBeat, beats}` tiles and every downstream consumer walks `pat.vexflow`.
There is no renderer seam; mode is a binary `S.mode ∈ {dictation, tapping}` branched inline
at ~12 sites (`:1012, 2344, 2671, 3483, 4382`). Its advance gate rejects any level with zero
figures (`GUIDE.playable()`, `:394`) and gates on a 2→4→8 **bar ramp** (`RAMP`, `:306`) that
is meaningless for a pulse probe.

MelodyQuest already solved this the right way, on a separate page. Copy that.

New files, mirroring the melodic trio one-for-one:

- `rhythm-quest.html` ← template: `melodic-game.html` (dispatch `:699`, round mount `:1944`,
  own Proficient+streak gate `:723-727`)
- `rhythm-renderers.js` ← template: `melodic-renderers.js` (factory contract `:9-13`:
  `create*(host, ctx) -> {destroy()}`, calls `ctx.onResult(result)` exactly once)
- `rhythm-quest-services.js` ← template: `melodic-shell-services.js` (`createServices`, `:888`)

New pure `core/` modules (house style: no DOM, no audio, no IO, unit-tested):

```
core/rhythm-curriculum.js   R_LEVELS[] — id, rung, exerciseMode, passGate, meters, params, prereqs
core/rhythm-probes.js       buildProbe(rung, seed, params) / gradeProbe(rung, probe, response)   [R1-R4, R8]
core/rhythm-taps.js         gradeTapBack(taps, onsets, opts)                                     [R5]
core/rhythm-chunks.js       RHYTHM_CELL_BANK, cellsForTier(tier), cellToOnsets(cell)             [R7]
core/rhythm-sketch.js       gradeRhythmSketch(sketch, target)                                    [R9]
```

**Reuse, not rebuild:**

- `core/rhythm-figures.js:16` `RHYTHM_FIGURES` — pure, DOM-free, ported out of `solo-mode.js` for
  MelodyQuest Level 4. **Not a one-beat bank**: it also holds whole (4 beats), dotted-half (3),
  half (2), dotted-quarter+eighth (2), half-rest (2). `core/rhythm-chunks.js` must *filter* the
  `beats === 1` subset for R7, not wrap the table.
- `core/grading.js:429` `gradeDictation` — grades R6/R9/R10/R11 directly. The marked-grid
  answer *is* the `{measures:[beats:[offsets]]}` shape it already takes. This finally wires
  the dead grader.
- `core/mastery.js` `recordAnswer` — called directly, exactly as `melodic-game.html:1999`
  does. None of `solo-mode.js`'s GUIDE machinery is touched.
- `core/placement.js` — the placement test (§1).
- `core/feedback.js` `classifyDictation` — route grader output through it so a meter-gate
  failure explains itself instead of showing 0%. `melodic-renderers.js:26
  appendStageFeedback` is the pattern.
- `melodic-shell-services.js` `renderRhythmLine` — literally McHose's one-line staff.
- `scoreTapBack` (`solo-mode.js:2211`) — **port**, don't share. The math is pure-shaped but
  tangled with `TB.captureStart` / `TB.rhythmTaps` / `TB.beatTimes` / `measureOfAbs`.

**The one genuinely new component**, and the whole risk of the project:

```js
// rhythm-quest-services.js — WebAudio-bearing, NOT core/
playOnsets(onsets, { meter, tempo, countIn, accentBeat1 }) -> { stop() }
playPulse(nBeats, { meter, tempo })                        -> { stop() }
tapCapture(host)                                           -> { taps: number[], stop() }
```

`playTarget()` (`solo-mode.js:1309`) is the only "play a rhythm" function and it is welded to
`S.target` tiles, the count-flash DOM (`:1238`), and the tap-along overlay (`:1264`). The
count-in scheduling at `:1233-1252` should be ported here. Audio-clock scheduling against
`ctx.currentTime` is fiddly; get it right first or every rung inherits the jitter.

**Pass gates.** Replace the bar-ramp with a per-level `passGate` descriptor the page
interprets — a small closed enum: `pulse-lock` (R0), `probe-streak` (R1–R4, R8),
`tap-back` (R5), `proficient` (R7, R9; the MelodyQuest gate: Proficient band + 3-clean
streak).

**Persistence.** New key `rhythm-quest-guided-v1`, shape mirroring `melodic-guided-v1`:
`{idx, items:{levelId: ItemState}, mastered:[], stages:{}, sessionStart}`. Fully additive.
The R-band never writes into `beatquest-guided-*`. Two cursors coexist; resist merging early.

**Build order — walking skeleton first.**

- **Phase 0 — R0 "Find the pulse" alone.** Thinnest slice that exercises *every* new seam:
  page → curriculum → dispatch → `playPulse` + `tapCapture` → grader → `mastery.recordAnswer`
  → `passGate` → persist. Forces the riskiest component (the scheduler) to be built in
  isolation, needs no new `core/` grader and no iframe.
- **Phase 1 — R5 "Tap it back."** Validates the highest-value reuse: extract
  `core/rhythm-taps.js` from `scoreTapBack`. If a real tapped rhythm grades correctly, the
  `gradeDictation`-backed rungs become low-risk.
- **Phase 2 — R1, R2, R3, R4, R8.** All share `playOnsets` + `core/rhythm-probes.js`.
- **Phase 3 — R6, R10, R11 (on `gradeDictation`), then R7 (`rhythm-chunks.js`), then R9.**
- **Phase 4 — handoff to Hall ch1; end-to-end walkthrough.**

**Known risks.**

1. The scheduler is the whole risk. It is new code, not reuse.
2. `scoreTapBack` extraction is not copy-paste; the capture-window arithmetic is entangled
   with beat-bucketing.
3. `meterBeats` (`core/rhythm-figures.js:50`) and the exttarget converter only handle simple
   x/4 and the 6/8 family. Do not promise 5/8/7/8 discrimination the audio layer can't express.
4. R9's optional iframe bridge (`tapping.html?exttarget=1` via
   `melodic-shell-services.js:760 mountRhythmEntry`) drags in the whole drag-tile UI and its
   chrome-hiding hacks (`solo-mode.js:4877-4887`). Prefer a native slash-on-grid sketch;
   use the iframe only as the literal handoff to real notation.
5. `gradeDictation`'s meter hard-gate (`:271`) returns a flat rejection on wrong bar/beat
   count. For a *teaching* rung, surface `meterGate.reason` / `firstBadMeasure` through
   `core/feedback.js` or beginners see "0%" with no explanation.
6. **R10 (rests) and R11 (ties) are notational concepts**, not pre-notation probes — grading
   them needs the marked grid, which *is* protonotation. They fight the withhold-notation
   principle. Fold them into R9's grid renderer as staged variants, or explicitly reposition
   them as the first *post-bridge* rungs.

## 4. MelodyQuest — the harmonic axis

McHose orders melodic dictation by **implied harmony** — tonic chord only → tonic and
dominant → subdominant and supertonic → V7 → modulation → modes → pentatonic — and states
flatly that melodic dictation *"is not a horizontal drill in abstract intervals."*

MelodyQuest's ladder is ordered by pitch-set width and leap size (`pitch.degrees`,
`pitch.leaps`). That is the interval drill he is warning against.

McHose is not alone, and this is not a 1948 opinion. Buonviri & Paney's interview study of AP
Theory teachers (*JRME* 2015) and Paney & Buonviri's national survey of 398 college instructors
(*Update* 2017) both find that instructors favour **pitch systems emphasising scale-degree
function over interval width**, rhythm systems emphasising **meter**, "targeting melodic
bookends," and big-picture-before-detail. The 1948 manual and the 2017 survey agree, and the
shipped ladder disagrees with both.

The engine already computes the right thing and discards it. Proposed, non-destructive:

1. Attach the harmonic plan to the returned melody object (`makeHarmonicPlan`'s output is
   currently a local `const` at `core/melodic.js:989`). Add `harmonyPlan` and per-note
   `structuralTone` / `harmony` fields. This is a small change.
2. Add an allowed-harmony field to each level in `core/melodic-curriculum.js` alongside
   `pitch.degrees` / `pitch.leaps`, and let it constrain generation.
3. Keep M0–M26 intact. No reordering, no save invalidation.

This is also HarmonyQuest's data model, obtained for free.

## 5. HarmonyQuest — bass-line first, Roman numerals last

**The research says the standard product design is wrong, and this is HarmonyQuest's
differentiator.** Chenette, *"What Are the Truly Aural Skills?"* (*Music Theory Online* 27.2,
2021, peer-reviewed, N=74):

- **Bass lines were the strategy chosen by 88% of listeners** — "more than 10 percentage
  points ahead of any other element or strategy." Of the sixteen "nearly correct" respondents,
  all but one listened for the bass or outer voices first.
- Roman-numeral and inversion-symbol labels "are **not** those most directly available to
  perception" — scale-degree 4 in the bass defines ii⁶, yet no "4" appears in the label.
- Traditional harmonic dictation "requires both perceptual skills **and** logic/knowledge,"
  which makes theory knowledge "a barrier"; high scorers were significantly more likely to
  report absolute pitch and piano as their primary instrument. The task measures the wrong
  thing.

So: **HarmonyQuest's early rungs dictate the bass line as scale degrees. Roman numerals arrive
late, as a labelling layer over a bass the student can already hear** — not as the answer
format. This is the same withhold-the-notation shape as M0–M8 and R0–R8, applied to harmony,
and no incumbent does it.

## 5b. HarmonyQuest — honest scope

**Reusable (~30–40%):** `playCadence` (`melodic-shell-services.js:685`) already plays I–IV–V–I
block triads and generalizes to any progression; the two-part bottom-voice walk
(`core/melodic.js:1458-1550`) is a harmony-constrained bass generator; `createNotationEntryRenderer`
(`melodic-renderers.js:2036`) does staff entry + per-note grading; `dominantKeyOf` (`:1595`)
gives the key math.

**Net-new (~60–70%), no precedent anywhere in the repo:** a Roman-numeral data model with
quality and inversion; RN generation attached to the exercise object; an RN input widget; and
a harmony-aware grader scoring a bass line + RN string against an expected progression.

**Do the cross-key grading spine once.** `melodic-round.js:309-313` currently force-downgrades
every modulating and symmetric-collection level to multiple-choice because "a modulation-aware
notation grader does not exist yet." That grader — split the answer at
`modulation.atNote`, grade each region against its own tonic, respell accidentals per region —
is the *same* capability HarmonyQuest needs for tonicizations. Build it once; it unlocks m19,
m26, and HarmonyQuest.

## 6. The arcade layer

**Diagnosis.** XP, ranks, gems, dailies, stars, confetti are reward chrome on a quiz. Game
feel lives in the verb. Ear Arcade (`melodic-ear-arcade.js`) is the only renderer with a real
verb — react in time — and it is buried behind a Practice menu. Four working Web Audio games
sit unwired.

**The unit is the exercise MODE, not the level.** One game per mode; levels reparameterize it
(degrees, meter, tempo, key), the way real games do difficulty. Five already exist as
prototypes and map onto modes that already exist:

| Mode | Game | Status |
|---|---|---|
| contour | `game-runner.html` "Contour Runner" | prototype, unwired |
| pitch height | `game-jump.html` "Sky Hop" | prototype, unwired |
| memory-span | `game-simon.html` "Simon" | prototype, unwired |
| degree ID / recognition | `game-invaders.html` "Note Invaders" | prototype, unwired |
| degree ID (live) | `melodic-ear-arcade.js` | **wired**, in Practice menu |
| R0–R8 | — | new, and they *are* the rungs |

**Where the arcade sits.** For the pre-notation rungs the game **is** the rung — you play
Pulse Lock to pass R0. For the notation rungs (M9+, R9+) the ladder stays calm and the arcade
lives beside it as the Gym. Dictation is a working-memory task; timing pressure and motion
consume exactly the attentional resources the exercise trains. The tension of silence is what
makes the writing moment feel like it matters. `melodic-skills-gym.js` already has the right
instinct — it auto-tunes and never advances the ladder. Make that the organizing principle
rather than a side menu.

Constraint from the owner's standing rules: every icon is a custom in-house SVG. No emoji, no
clipart. `core/no-emoji.test.js` enforces it.

## 7. Competitive position — where the opening actually is

Five-angle research, 21 sources fetched, 25 claims put through 3-vote adversarial verification
(20 confirmed, 5 refuted). Refuted claims are listed at the end so nobody rebuilds on them.

**The market is crowded and the pedagogy is empty.** The peer-reviewed survey of exactly these
products — Chenette, Davis & Kleppinger, *"A Critical Review of Current Aural Skill Materials
and Pedagogical Practices,"* JMTP Vol. 36 (2022) — treats five packages as the robust
incumbents: **Auralia, Artusi/MacGAMUT** (MacGAMUT was absorbed into Artusi in 2022),
**Picardy, EarMaster, Practica Musica**. Consumer/web tools (uTheory, Teoria, ToneSavvy,
Tenuto, Theta, Ella) fill out the field. Every one of them is drill-and-grade.

### The moat you already have and haven't noticed

From that same 2022 review, verified 3-0:

> *"Every piece of software reviewed here that asks users to click or drag the pitches they
> hear onto a staff … requires them to do so **in sequence** — from the first note of the
> dictation to the last… Working from beginning to end, one note at a time, is both
> inefficient and disconnected from typical musical experience. It is also, maddeningly, a
> habit that generations of aural-skills teachers have worked to excise."*

No product found between 2022 and 2026 permits non-sequential or sketch-first entry.

**You already broke this, three times over, and buried all three:**

- `createNotationEntryRenderer` (`melodic-renderers.js:2036`) is **two-phase**: dictate the
  rhythm, then place degrees onto it. Not front-to-back.
- `core/protonotation.js` is a working **sketch-first** grader — Karpinski/Brown protonotation,
  scoring understanding separately from notation fluency. It ships as M8.5.
- `melodic-bookend-ui.js` places the **first and last notes, then fills inward** — and
  "targeting melodic bookends" is verbatim what Buonviri & Paney's AP-teacher interviews
  identify as an expert strategy. It sits in a Practice submenu.

That is the product. It is not the XP bar.

### Verdict per category

| Category | Incumbents | Verdict |
|---|---|---|
| Rhythmic dictation | EarMaster, Artusi/MacGAMUT, Auralia, ToneSavvy | **Crowded on drills, wide open on teaching.** Nothing teaches the procedure. RhythmQuest's R0–R11 has no competitor. |
| Melodic dictation | Artusi/MacGAMUT (college standard), Auralia, EarMaster, Teoria, Picardy | **Crowded, contested on pedagogy.** Sequential entry is universal; function-over-interval ordering is what instructors want and nobody ships. |
| Harmonic dictation | Artusi/MacGAMUT, Auralia | **Crowded, and the incumbents are solving the wrong problem** (RN-first). Bass-first (§5) is a real, research-backed differentiator. ToneSavvy's "harmonic" mode is identification-only. |
| Sight-singing teaching | **Ella** (gamified, mic, learning path), **Troubadour**, SmartMusic, Sight Reading Factory | **Contested — and it's where we're weakest.** Defer. See below. |

### Arcade dictation is genuinely empty — but arcade *ear training* is not

- **Theta Music Trainer** already ships arcade HTML5 ear-training games — *Parrot Phrases* is
  melodic call-and-response with graduated speed, chunking pedagogy ("start with three or four
  notes"), freemium. **But the answer is played on a virtual instrument, never notated.**
- **Troubadour** (University of Ljubljana, 2024, open-source, SCITEPRESS) is the one academic
  system that reframes dictation as a game: *inverse dictation* — show the notation, sing or
  play it back, with real pitch detection, across melodic, rhythmic and harmonic games. A
  controlled trial at the Conservatory of Ljubljana found measurable exam-score gains. It is a
  research prototype, not a product.
- **Ella** gamifies sight-singing with mic pitch detection and a guided path.

So: **arcade ear training exists. Arcade dictation — where the answer is notation — does not.**
That is the precise, narrow, defensible opening, and it is exactly where our code already sits.

### One honest correction to my earlier claim

I said error diagnosis was open. It is not entirely: **MacGAMUT already "identifies the type of
error and shares the information with the student,"** where Practica Musica "simply counts the
pitches wrong." Our `core/feedback.js` goes further — Klonoski-style *stage isolation*, naming
which sub-skill failed (meter, contour, degree precision, tonic anchoring, note count) rather
than which note was wrong — but it is a difference of degree, not a blank field. Don't market
it as unprecedented.

### SingQuest — defer, and harvest it

Sight-singing teaching is the category where we have the least (`singquest.html:459` ships
`FLOW = ['probe','s1']` — a probe and one level) and the competition has the most: Ella is
gamified with mic and a guided path; Troubadour has a controlled efficacy trial; SmartMusic and
Sight Reading Factory own the school market (though, per practitioner review, "neither teaches
*how* to sight-sing — both assume prerequisite skills").

But the hard part of SingQuest is built and tested: `core/pitch.js` is a pure autocorrelation
f0 detector with cents math, and `core/singquest.js` has level-dependent tolerance bands.

**Harvest it rather than ship it.** Move the mic layer into MelodyQuest and RhythmQuest as the
*optional, unscored* sing-back step of the memory gate (§2) — the thing McHose demands, that
Buonviri & Paney warn against scoring, and that no incumbent implements at all. Revisit
SingQuest as a standalone product only after the dictation trio is coherent.

## 7b. Build order

0. **Stop the classroom from lying.** DONE (`8df8da2`), and overtaken: the classroom stack is
   archived. `rhythm-student.js` no longer fakes a connection; it says there is no teacher tool.
1. **Repo hygiene + doc hygiene + rename** (§9). **DONE, and superseded.** `1a` was the doc pass
   (`b684a32`), `1a+` the hub fix (`db9b5a2`), `1b` the rename (`cade60e`), then `1c` archived
   everything that is not a Quest game. The record is `archive/README.md`; it is not repeated here.
   Everything here is now safely reversible: checkpoint commit `e9f1dcd`, pushed to
   `origin/tapping`.

2. **Build a NEW teacher interface** for the Quest games. Nothing survives from the old one; do not
   read it. Schema first, then a teacher → student → projector harness over fixtures, then a real
   transport with auth, room TTL and a written retention stance. Meter comes from
   `core/curriculum.js`, never 4/4 — the old tool hard-coded 4/4 and that alone made it unusable.
3. **Surface the moat** (small, high-leverage). Promote protonotation and the bookend drill out of
   the Practice submenu onto the ladder where they belong, and say plainly in the UI that you do
   not have to write left-to-right. This is the one differentiator the peer-reviewed literature
   explicitly names as missing from every competitor, and it is already written.

4. **RhythmQuest Phase 0** — the walking skeleton (§3): R0 "Find the pulse," end to end, proving
   the page, the dispatch, the scheduler, mastery, the pass gate, and persistence. Designed for
   `core/room.js` from the start.

5. **RhythmQuest Phases 1–4** — R5 tap-back, then the probe rungs, then the grid rungs.

6. **MelodyQuest harmonic axis** (§4) — surface `makeHarmonicPlan` onto the melody object. Small
   change, and it is simultaneously HarmonyQuest's data model.

7. **MelodyQuest classroom** — a transport plus a renderer, once `core/room.js` exists.
   `archive/MELODIC_CLASSROOM_PLAN.md` becomes buildable.

8. **The cross-key grader** (§5b) — unlocks m19, m26, and HarmonyQuest at once.

9. **HarmonyQuest, bass-first** (§5).

10. **Arcade layer** (§6) — wire the four orphan prototypes, build the missing mode-games.

11. **Accounts, roster, assignments.** Deliberately last, and deliberately
    separate. It is a product with a signup flow, a student-data privacy posture, and a support
    burden — not a refactor. Decide the backend after Track A ships.

**Deferred, explicitly:** the public-domain melody corpus proposed in the RTF's second half
(OpenScore Lieder, Florence Price dataset, Mutopia, PDMX). Good idea, wrong quarter. The
generator is not the weak part of this product. And SingQuest as a standalone app.

### Research caveats — do not build on these

Five plausible claims were **refuted** in verification and must not be treated as established:
the per-product procedural-generation-vs-fixed-bank breakdown (EarMaster/Practica Musica
"random-generate," Picardy "several hundred fixed melodies," Auralia "25 fixed levels") was
refuted 0-3 and is **unresolved**; the claim that only EarMaster and Auralia use mic/pitch
detection was refuted 0-3 (only EarMaster is confirmed); EarMaster's "4000+ exercises" bank size
was refuted 0-3; uTheory's market-adoption scale was refuted. Auralia, Practica Musica and
Picardy were named as incumbents but never investigated in depth — **coverage of categories 3
and 4 is thin.** The MacGAMUT review data is from ~1995–2002 and predates the Artusi merger; its
vendor pages returned 403. If any go/no-go decision turns on one of these, verify it directly.

## 8. Verdict on the two source documents

**`Melodic DcitationGerneration Analysis.rtf` — ignore the generator.** It proposes an
architecture the repo already has, and its reference implementation is worse:
`degreeToMidi` accepts `key` and `mode` and ignores both (hard-coded C major); `generateRhythm`
tests `cell.notes[i] === false` for rests but no cell in the file ever contains `false`;
`scoreMelody` treats scale-degree subtraction as interval size, so `7→1` (leading tone
resolving to tonic) scores as a leap of −6 and is penalized — broken precisely at the cadence
it means to reward; and 80 attempts kept by argmax over a function that pays +8 per stepwise
motion converges on a scale. It has no harmonic plan at all. `core/melodic.js` already does
seeded generation, per-bar harmonic planning, ×3 chord-tone-on-strong-beat, ×2.2 leap recovery,
a hard tritone ban, contour bias, and a cadence funnel; `melodic-round.js:127` picks by
difficulty *percentile* from k=7 candidates, which is the right answer to the argmax problem.

**`melody_quest_implementation_spec.pdf` — take §8, reject the numbers.** The document was
generated from `MELODIC_CURRICULUM.md` (it says so on p. 3) and its central engineering claim
("one melody object should feed many renderers") is already implemented as 12 renderers. What
is genuinely new and worth building: **spaced retention, transfer checks across keys,
anti-farming rules, and an error taxonomy reporting component scores separately.**
`core/feedback.js` and `core/review.js` (Leitner) already exist and are half of it;
`core/review.js` is wired into MelodyQuest but **not** into RhythmQuest.

Reject the pass gates as written. They sum to roughly 2,000 scored exercises across a mandated
multi-week calendar before a student sees an eight-bar period (48 probes for M0, 72 for M2,
rising to 160 for M17, each with "across at least N calendar days"). There is no evidence
behind those numbers. Take the mechanisms, set volumes at ~¼, and instrument them so real data
moves them later.

## 9. Documentation hygiene — DONE (step 1a, 2026-07-09)

Executed. What actually happened, so nobody re-plans it:

- `VISION.md` written as the single source of truth (this section originally called for a
  `CLAUDE.md` only). `CLAUDE.md` and `AGENTS.md` are thin pointers to it, so Claude Code and Codex
  judge against one document. `README.md` rewritten from scratch.
- 44 top-level markdown docs classified independently by Claude and Codex, then reconciled.
  19 → `archive/` (stale, false, or about deleted code, with `archive/README.md` tracing two
  propagation chains). 9 → `research/`. 5 → `history/`. 12 remain at top level.
- Four specs repaired rather than archived, on the owner's call: `MELODIC_ENGINE_SPEC.md`,
  `MELODIC_RENDERER_SPEC.md`, `INTERVAL_GYM_SPEC.md`, `CURRICULUM_PLAN.md`.
- The `first species` / `m20 excluded` claims deleted from all six sites they had reached,
  including a code comment and a test comment. A characterization test now pins the real behaviour.
- References to moved documents repointed across 31 live files; citations of archived documents in
  live code replaced with `VISION.md` sections. 10 stale git worktrees pruned.

**Anything below this line in this plan predates `VISION.md`. Where they disagree about a fact,
`VISION.md` wins — several claims here were later falsified.**

## 10. Codex as a critic (setup)

The binary is already on disk — the VS Code ChatGPT extension bundles it at
`~/.vscode/extensions/openai.chatgpt-<version>-darwin-arm64/bin/macos-aarch64/codex`
(`codex-cli 0.144.0-alpha.4`), and `~/.codex/auth.json` + `config.toml` (model `gpt-5.5`,
`model_reasoning_effort = "xhigh"`) are configured. It is not on `PATH`. Because the extension
path is version-pinned and moves on update, install it properly rather than symlinking:
`npm i -g @openai/codex` (or `brew install codex`), which will share the existing `~/.codex`
auth.

`codex exec` runs non-interactively and `codex exec review` runs a repo code review.

**The bottleneck on this project is taste and curriculum design, not code throughput.** Do not
use Codex as a second implementer in a 63-file repo mid-refactor; that buys merge conflicts.
Use it as an *independent critic*, on jobs where our own code grades its own homework:

1. **Blind musical QA of generated melodies.** Dump 200 melodies from `core/melodic.js` as
   ABC, with no level metadata and no access to `scoreMelodyQuality`. Ask Codex to rate
   singability, cadence strength, and level-appropriateness, and to flag the worst 20. Today
   `scoreMelodyQuality` (`core/melodic-quality.js:189`) and `chooseNextHarmonic`
   (`core/melodic.js:650`) share assumptions — the generator is scoring itself.
2. **The same, for generated rhythms** against the Hall chapter they claim to come from.
3. **Independent reimplementation of `gradeDictation`** from its docstring alone, then diff
   against `core/grading.js` on a shared fixture set.
4. **Adversarial review of each new `core/` module against its spec doc** before it ships.

Jobs 1 and 2 are the ones that actually matter, because there is no other way to find out
whether the melodies are any good.

## Verification

- `cd core && npm test` — `node --test` over the existing `core/*.test.js`. Every new pure
  module ships with its own `.test.js` in the same style.
- `npm run dev` (`node dev-server.js`, no-cache local server), then walk R0 end-to-end in a
  browser: hear the pulse, tap it, see the grade, watch mastery advance, reload and confirm
  `rhythm-quest-guided-v1` persisted.
- Per the owner's standing rule: **visual and audio work is verified live in the browser, not
  headless.** No headless screenshot verification for anything with a timing or rendering
  surface. Timing especially — the scheduler must be heard.
- `core/no-emoji.test.js` must stay green.
