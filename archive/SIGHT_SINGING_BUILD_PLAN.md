# SingQuest — build + implementation plan (mic-verified sight-singing)

Written 2026-07-06. Companion to `SIGHT_SINGING_RESEARCH.md` (the APPROVED research —
read it first; section references below are to it unless noted). Structured like
`MELODIC_LADDER_EXPANSION_PLAN.md`. **This is a plan for owner review — no code yet.**
Nothing ships until §7 decisions are made and Phase 0 clears its gate.

Working name: **SingQuest** (naming open — research §8.5). The suite already ships
MelodyQuest (melodic dictation) and BeatQuest (rhythm). SingQuest is the *production*
leg: it listens to the student's voice and verifies pitch.

---

## 1. Differentiation + GO / NO-GO (honest)

### 1.1 The owner's two hard gates, stated up front
The owner greenlights **only if** SingQuest is (a) **genuinely new and exciting** to the
space, AND (b) a **truly guided teacher** that actually teaches sight-singing — **not a
tuner with a pitch line, and not a drill mill of endless decontextualized reps.** Those
are the two ways to fail. This section pressure-tests both honestly.

**Design test the whole plan must pass — "Guided teacher, not a drill mill?"** Every
feature below is checked against three questions:
1. **Payoff:** does this exercise visibly move the student toward singing a REAL
   melody/phrase, or is it a rep for its own sake?
2. **Coaching:** when the student misses, does the app *actively teach the fix*
   (replay → sing-with-me → break it down → "you fixed it!") or just score pass/fail?
3. **Journey:** is there a felt arc/progression/narrative (the "Quest"), variety, and
   visible skill growth — or a static quota to grind?
If any core feature answers "rep for its own sake / pass-fail / static quota," it is
redesigned or cut. If the *whole app* can only answer that way, the verdict is **NO-GO.**

### 1.2 Competitor teardown — what they do, and specifically what they DON'T
Sources: research §1, §7 and the app-review literature cited there (SingTrue, Vanido,
Sing Sharp, Vocal Pitch Monitor, Perfect Ear, Functional Ear Trainer, EarMaster,
Yousician/Simply Sing, Tonestro).

| App | What it actually does | What it does NOT do |
|---|---|---|
| **SingTrue** (Musical U) | Mic pitch-matching games for self-described "tone-deaf"; closest in spirit to us — match/hold/simple intervals with mic feedback. | No staff **sight-reading**; no functional drone-degree method; no stacking curriculum into real notated melodies; standalone, not in a theory suite. Stops well short of "confident sight-singing." |
| **Vanido / Sing Sharp** | AI "vocal coach" — daily vocal exercises, real-time pitch line, range warm-ups. Production-focused (good) but **performance/warm-up** framed. | No music-reading progression; no scale-degree-over-drone functional method; exercises are warm-ups, not a path to reading a score. |
| **Vocal Pitch Monitor** | Displays your pitch contour vs. a piano roll. A **tuner**, literally. | Zero teaching, zero curriculum, zero remediation. This is the "just a pitch line" failure mode the owner names. |
| **Perfect Ear / Functional Ear Trainer** | **Perception** drills — hear an interval/degree, **click** the answer. Functional Ear Trainer does use a key context (good idea). | **No voice / no production.** Cannot train the vocal-motor bottleneck that makes most people "tone-deaf" (research §1.1). Click-the-answer never verifies you can *produce* the pitch. |
| **EarMaster** | The gold-standard aural-skills suite; DOES have mic-based sight-singing modules and solfège. Real curriculum. | Desktop-heavy, assessment/institution framed; **perception-first**; not a from-zero "I think I'm tone-deaf" on-ramp; grades more than it *coaches* (replay/sing-with-me remediation is thin); not integrated with our theory games; feels like a course, not a guided quest. |
| **Yousician / Simply Sing** | Polished mic-graded singing to real **songs**, gamified. Strong on payoff (real songs) and game feel. | **Song-karaoke, not sight-singing pedagogy** — you follow a moving line, you don't learn to read notation functionally; no drone-anchored scale-degree method; no from-zero vocal-motor remediation for non-singers; no octave-forgiving "find your voice." |
| **Tonestro** | Mic-graded practice for instruments/voice with tempo/pitch feedback and gamification. | Sheet-following practice tool, not a **teach-you-to-sight-sing-from-zero** guided course; no functional method; no tone-deaf on-ramp. |

**The pattern:** the market splits into (a) **perception clickers** that never touch the
voice (Perfect Ear, FET), (b) **bare tuners** with no teaching (Vocal Pitch Monitor),
(c) **song-followers** that grade real songs but don't teach reading (Yousician, Tonestro),
and (d) **one serious sight-singing course** (EarMaster) that is institutional,
perception-first, grades-more-than-coaches, and not a from-zero on-ramp. SingTrue/Vanido
get closest to production-from-zero but stop before real music-reading.

### 1.3 The NEW thing we offer (and why it's exciting)
No competitor combines all six of these end-to-end — and the combination is the product:

1. **Production-verified from zero, built on the actual science.** The research's core
   finding (§1.1): ~10–15% sing poorly from a **perception-to-action mapping** problem
   with *intact* perception; only ~1.5% are truly amusic. The entire "click the answer"
   category cannot fix this. SingQuest trains the **failing motor system** with immediate,
   objective, mic-verified feedback — the thing the evidence says actually works.
2. **Functional drone-anchored method** (§1.3): you sing **function over a sounding
   tonic** (do→mi over home), not intervals in a vacuum. Only Functional Ear Trainer even
   uses key context, and it never asks you to *sing*.
3. **Octave-forgiveness + "Find your voice"** (§1.4, §1.5): octave matches are credited as
   correct, and every target is generated inside the student's *probed* comfortable range.
   This directly disarms the "I'm tone-deaf" shame spiral (§1.6) — no competitor does the
   range probe + octave credit as an anti-shame design.
4. **Stacking, one-skill-at-a-time ladder into REAL notated melodies** (§2): S1–S14 ends
   at reading multi-phrase melodies with modulation — a genuine sight-singing curriculum,
   not warm-ups or karaoke.
5. **A guided coaching voice, not a grader** (§2 below): replay → sing-with-me → break-it-
   down → return-to-home remediation. This is the anti-drill-mill spine.
6. **Integrated into a broader theory suite** — shares the melodic curriculum, XP,
   accounts, and Quest identity with MelodyQuest/BeatQuest. A student's pitch skill is one
   coherent thing across dictation, rhythm, and singing.

### 1.4 Pressure-testing the gap (not just repeating the research)
- *"Isn't this just SingTrue + a curriculum?"* Partly — SingTrue proves the mic-match loop
  is viable and loved. Our defensible delta is items 2/4/5/6: the **functional method, the
  reading ladder into real melodies, the coaching remediation, and suite integration.**
  SingTrue stops at "match and simple intervals" and never gets you reading music. That is
  a real, buildable gap, not a repaint.
- *"EarMaster already does mic sight-singing."* True, and it's the one honest competitor.
  Our delta: **from-zero tone-deaf on-ramp + production-first (not perception-first) +
  active coaching remediation + game-feel/Quest motivation + it lives inside a suite the
  student already uses.** EarMaster is a course you buy; SingQuest is a guided quest inside
  a game the student is already playing. Different product, real gap — but this is the
  competitor to watch, and Phase 0 must feel *more coached and more fun* than EarMaster's
  singing module or the differentiation is thin.
- *"Could this collapse into another tuner / drill mill?"* Yes — that is the live risk, and
  it's why §1.1's design test is a gate, not a footnote. If we ship S1–S8 as a bare list of
  "match this note" reps with a needle and a pass/fail, we ARE Vocal Pitch Monitor with a
  score. The plan defends against that structurally in §2 (every drill is framed as a step
  toward a song; coaching remediation is mandatory, not optional; the Quest arc supplies
  narrative/variety/visible growth).

### 1.5 The anti-drill-mill commitment (owner's hard requirement)
Baked into the build, not aspirational:
- **Every exercise names its payoff.** S1–S8 screens carry a "why" line and a visible
  progress-toward-a-song ("2 more skills until you sing your first melody"). Each level
  ends by using the new skill **in a mini-musical phrase**, not a bare rep. The product is
  *the songs you can now sing*, and the drills are framed as steps toward them.
- **Coaching remediation is mandatory** (§2.2 hint ladder). A miss never ends in "wrong" —
  it triggers replay → sing-with-me → break-it-down → "you fixed it!" A level that only
  grades is a bug.
- **The Quest arc supplies narrative + variety + visible growth.** Named milestones ("Find
  your voice," "First melody," "You found minor"), a moving map, mixed exercise types per
  session, and a visible skill-tree — not a quota counter.
- **Short, purposeful sessions** (§1.6): 5–10 min guided sessions with a musical win at the
  end; never "do 50 reps." Groove/streak reward *engagement quality*, not volume (XP is
  novelty-decayed per §3 so grinding pays nothing).

### 1.6 VERDICT: **GO** — conditional on Phase 0.
**Justification (one paragraph):** The gap is real and defensible. The market has
perception clickers that never touch the voice, bare tuners with no teaching, song-
followers that don't teach reading, and one institutional course that grades more than it
coaches — **none** combines production-verified-from-zero + functional drone method +
octave-forgiving "find your voice" + a stacking ladder into real notated melodies + active
coaching remediation + suite integration. That combination is genuinely new and directly
targets the science-identified bottleneck (vocal-motor mapping) the entire click-the-answer
category ignores. Critically, ~95% of the hard machinery already exists and is unit-tested
in this repo (`core/pitch.js`, the Safari-hardened mic pipeline, octave-aware grading, the
consent/fallback SING renderer, the drone, movable-do labels, melody generation, mastery/
review), so the build is a **re-composition around a new curriculum + coaching layer**, not
a from-scratch app — low technical risk, high pedagogical upside. **GO, gated:** Phase 0
(the S1+S5+range-probe slice, styled in the suite game skin) must, with real singers
including a self-described "tone-deaf" one and a deep male voice, (1) feel **coached, not
graded**, (2) pass the "guided teacher, not drill mill" test, and (3) validate the
tolerance bands as fair-and-motivating. If Phase 0 reads as a tuner or a drill list even
after tuning, **stop and pivot** — do not build the full ladder.

---

## 2. The teaching spine — guided mechanics, not grading

This is the differentiator. SingQuest coaches; it does not merely score. Below are the
concrete teaching mechanics.

### 2.1 The functional drone anchor (the core teaching device) — research §1.3
Every degree/interval is sung **over a sounding tonic**, so the student sings *function*
(do→mi *over home*), never interval math. The drone is the teacher: it lets the ear *feel*
tension/resolution, which the research says transfers to real music far better than
context-free hear-and-copy. Even when the prompt NAMES an interval (owner's "sing a M3
up," S5), a tonic is anchored under it. Reuse `playCadence(key,mode)` to establish home,
then `playNote(tonicMidi)` as the drone. **Capture choreography for grading:
sound-then-sing** — the reference/drone stops before the graded capture window opens (§4.2,
G5); the sustained-under-voice drone is reserved for free/practice reps.

### 2.2 The hint ladder (scaffolded remediation — the anti-drill-mill heart)
A miss NEVER ends in a bare "wrong." It escalates through coaching rungs, each a real
teaching move. The student climbs down the ladder only as far as they need, and the moment
they succeed they get **"You fixed it!"** — the growth-mindset payoff (§1.6):

1. **Direction nudge (live, during the sing).** The needle/ribbon shows *direction not
   numbers*: "a bit flat — slide up ↑". This is corrective guidance in real time, not a
   post-hoc grade.
2. **Replay the target.** "Here it is again" — replay the reference note/phrase (own
   octave), then sing again.
3. **Sing WITH me (unison guide tone).** The target sustains *with* the student as a
   unison guide; they lock onto a sounding model (research §1.2 — a live vocal-like model
   beats a static tone). Grade leniently; goal is the felt match.
4. **Break it down.** For a missed **interval/leap**: fill the gap stepwise (1̂→2̂→3̂ before
   1̂→3̂), or approach the leap target through a stable triad tone. For a **melody note
   (S9+):** isolate the single missed beat-window, sing just that note, then re-run the bar.
5. **Return to home.** "Lost? Sing home." Re-sound the drone/tonic and have the student sing
   1̂ to re-anchor, then resume. Home is always the safe base to return to (S4 exists so this
   rung always has something to stand on).
6. **"You fixed it!"** On success after any rung, celebrate the *repair*, log it as a
   coached success (mastery discounts it slightly vs. a clean first-try, but it is a WIN,
   not a failure). The felt story is "I was stuck, the app taught me, I got it."

The hint ladder is **mandatory infrastructure**, shared across all S-levels (one module),
so remediation is uniform and no level can ship as pass/fail-only.

### 2.3 The vocal-motor repetition loop (research §1.1 — the actual bottleneck)
The failing system for most "non-singers" is the **auditory-to-motor mapping**, not
perception. SingQuest trains it directly: hear target → attempt vocal gesture → **immediate
objective feedback on whether the gesture landed** → adjust → repeat, with the hint ladder
catching misses. The loop is tight (sub-second needle) and *purposeful* (each rep is framed
as a step toward a phrase, §1.5). This is why production-with-feedback is the spine and
perception drills are only a supplement (research §7).

### 2.4 "Find your voice" + octave-forgiveness (anti-shame — research §1.5, §1.6)
Onboarding is framed as **"let's find where your voice is comfy,"** not a test: match a mid
tone → infer octave from detected f0 → probe a couple steps up/down → store
`{lowMidi, highMidi, tonicOctave}`. Every subsequent target is generated **inside that
band**, so we never ask for an unreachable note (guaranteed shame, research §7). Octave
matches are **credited as correct** with "right note, a different octave" — never a failure
(research §1.4; already in `gradeSungPitch`). Nothing is recorded or uploaded; analysis is
live and discarded. Copy is encouraging ("close — slide up"), the feedback is a needle not
a verdict, early bands are generous. This is what lets a self-described "tone-deaf" beginner
get a **first win** in the first 60 seconds instead of confirming their fear.

### 2.5 Musical payoff at every level (anti-drill-mill, owner's hard requirement)
- **S1–S3** (pure production) end each session by using the matched/stepped notes to sing a
  **2–3 note motif** — the first "that was music" moment, not just "you matched 5 notes."
- **S4–S8** (functional ear over drone) culminate in singing a short **tonal phrase** built
  from the degrees just learned — the skill is immediately *spent on music*.
- **S9–S14** ARE real melodies — the payoff is explicit: you are now reading and singing
  actual notated music, with named milestones ("First melody," "You found minor,"
  "Modulation!").
- A persistent **"songs you can now sing"** shelf grows as levels clear — the product the
  student is working toward, made visible.

---

## 3. Gamification & suite-consistency integration (Gap G3)

SingQuest must feel like a member of the Quest family and wire into the shared game system.
Studied for exact feel: `beatquest-casual.html` (casual skin + HUD injection), `solo-mode.js`
(groove/mastery/streak/capstone engine), `rhythm-student.js`, and `MUSIC_SUITE_XP_SPEC.md`.

### 3.1 House style (project memory + `STYLE_GUIDELINES.md`)
- **No emoji anywhere** — inline `currentColor` SVG icons that adapt per theme (memory:
  *no emoji in UI*).
- **Per-theme palettes** — every color is per-theme; only the pitch needle/ribbon geometry
  is universal. Transport green, ONE accent CTA per screen, disabled until actionable
  (memory: *one accent CTA per screen*, *per-theme color consistency*).
- **Constant HUD, lean layout** — the HUD is identical on every level; only the middle
  gameplay changes; no coverage/goal/daily chrome on the play screen (memory).
- **Settings behind a top-right cog drawer** — Level/Practice/Labels(solfège fork)/Theme
  /Mic consent live in the cog, off the gameplay screen (memory: *settings-cog-drawer*).
- **"Quest" visual identity** — SingQuest matches the BeatQuest casual frame: rounded card,
  the groove-ring around the answer area, Level+pips tab (top-left), Score/Streak tab
  (top-right), disc-labelled groove badge. Reuse the casual-skin CSS pattern from
  `beatquest-casual.html` (lines ~1219–1373) so the two apps are visually siblings.

### 3.2 Mirror BeatQuest's game feel (from `solo-mode.js`)
- **Groove meter** — the sung-accuracy analog: starts 100, drains on misses, refilled by
  hits/coached-fixes; drives the `--groove-col`/`--groove-glow` ring around the sing area
  (same mechanic BeatQuest uses per-beat, here per sung note). **Groove 0 = Game Over**
  (return-to-menu, encouraging retry — reuse the engine's Game Over screen path,
  `beatquest-casual.html` ~line 1709).
- **Mastery pips** — the per-level mastery band (from `core/mastery.js`
  `viewItemAsOf`, Proficient=80 bands) shown as pips on the Level tab, identical to
  `solo-mode.js masteryView()`.
- **Streaks** — clean-answer streak in the Score/Streak tab (flame icon, per-theme), same
  as casual; a slow/wrong answer resets it.
- **Level-Complete celebration** — on a capstone pass (Proficient + clean streak + the
  level's mic criterion met), the celebration screen fires (mirror the BeatQuest
  Level-Complete screen). For SingQuest the celebration plays back the **phrase the student
  just sang in tune** — the musical payoff, not confetti.
- **Advancement gating** — matches the suite's locked model (memory: *mastery progression
  model*): coverage/Proficient-band + capstone + streak, spaced review on return, decay-
  driven back-up. Reuse `solo-mode.js`'s `recordRound`/capstone logic conceptually with a
  SingQuest progress store; **do not** gate accuracy-singing levels on speed (rushing pitch
  accuracy is a bug — the deliberate levels stay accuracy-only, per the melodic app's
  fluency-gate carve-out).

### 3.3 XP integration (`MUSIC_SUITE_XP_SPEC.md`)
- Award XP via the shared contract `XP = BASE × difficulty × quality × novelty` (§3 of the
  XP spec), tagged **skill domain `pitch`** (so it feeds the same pool as MelodyQuest pitch
  work and the UMK meta-score).
- **difficulty D (1–10):** map the S-ladder onto the shared rubric (XP spec §4) — S1–S3 ≈
  D1–2, S4–S8 ≈ D3–5, S9–S12 ≈ D5–7, S13–S14 ≈ D8. (Author this mapping in the plan's task
  list; the owner ratifies.)
- **quality Q:** clean first-try = 1.0; each hint-ladder rung used scales Q down toward the
  ~0.4 floor (a coached fix still earns, just less) — this is how the anti-drill-mill
  coaching stays honest without punishing.
- **novelty N:** fresh target = 1.0, repeated item decays toward 0.3 — **grinding the same
  rep pays almost nothing**, structurally enforcing "not a drill mill."
- Use the shared `awardXP({game:'singquest', skill:'pitch', difficulty, quality, novelty,
  itemKey})` helper (XP spec §7) once it exists; if not yet built, SingQuest can be the
  reference consumer.

### 3.4 Accounts / cloud sync (StaffCommander Supabase — memory + XP spec §1)
- Namespace SingQuest progress under its **own key** in the `players.data` jsonb:
  `data.singquest = { ladderIndex, items:{'sing:<level>':<masteryState>}, voice:{lowMidi,
  highMidi,tonicOctave}, review:{…} }`, and feed `data.skills.pitch.xp`.
- **`player_save` OVERWRITES the whole blob** — SingQuest MUST read the full `data`, update
  only `data.singquest` (+ `data.skills.pitch`/`data.umk` via the shared helper), and write
  the whole blob back (read-merge-write). Getting this wrong wipes MelodyQuest/BeatQuest/
  StaffCommander progress (memory: *StaffCommander Supabase model*). This is a **blocking
  invariant**, tested in Phase 3.
- Same-origin hosting so the handle+PIN `localStorage['gsp3d.cloudauth']` sign-in carries
  over (XP spec §1).

---

## 4. Technical architecture

### 4.1 Pitch detection — reuse `core/pitch.js` as-is for v1 (research §4.1, verified)
Confirmed present and unit-tested (`core/pitch.js`, read this build): `detectPitch`
(normalized autocorrelation, RMS gate −44 dBFS, shortest-lag peak = octave-error guard,
parabolic interp), `medianPitch`, `gradeSungPitch` (hit ±50¢ / near ±51–100¢ / **octave**
±1200±50¢ / miss), `centsBetween`, `hzToMidi`, `midiToHz`, `A4_HZ`. **Reuse verbatim.**
- **New (small):** make the grading bands **per-level** — S1–S8 accept `near` as a pass and
  credit `octave` fully; S9+ require `hit` and correct octave. Implement as a thin
  `gradeForLevel(targetMidi, sungHz, levelBands)` wrapper over `gradeSungPitch` (do NOT edit
  the tested core function). File: new `core/singquest.js` (pure, unit-tested).
- **Deferred:** MPM/pYIN via WASM only if field data shows low-male octave errors (research
  §4.1) — not v1. `core/pitch.js` already passes ±15¢-accuracy and harmonic-lock tests; do
  not replace without evidence (memory: *reuse verified code*).

### 4.2 Capture choreography — the reference-bleed problem (Gap G5, research §6, spec §10)
`echoCancellation` is **OFF** (correct — it distorts pitch; verified in
`melodic-shell-services.js:815`). So any reference tone/drone through the speakers **bleeds
into the mic** and corrupts detection. Capture choreography for **graded reps**:
1. **Sound-then-sing.** Establish home (`playCadence`) and/or sound the target/drone, then
   **STOP the reference before opening the capture window.** The student sings into silence;
   only their voice reaches `captureSungFrames`. This is the research §6 lean and resolves
   spec §10's open question in favor of clean detection for grading.
2. **Duck/stop during the capture window.** If any tone must persist (free-practice drone),
   duck it hard or drop it a couple octaves clear of the sung f0 and rely on the median-
   over-frames + clarity gate.
3. **Headphone nudge.** A one-line, dismissible "headphones make this sharper" tip
   (never a hard requirement — keep the on-ramp frictionless).
4. **Optional bandpass.** If field data still shows bleed, add a gentle band-pass around the
   expected sung f0 range (and a high-pass to kill rumble) before analysis — an
   `AudioNode` in the mic graph, additive, not replacing the detector.
- **Sustained-under-voice drone** stays a **free-practice-only** nicety (nicer pedagogy,
  §2.1), never used for graded capture. This is the decision spec §10 / research §6 flagged.
Reuse `ensureMic`/`captureSungFrames`/`releaseMic` (`melodic-shell-services.js:809–876`)
**verbatim** — mono, DSP off, gesture-scoped, awaited `resume()`, watchdog→fallback.

### 4.3 Melodic-line note segmentation for S9–S14 (Gap G2)
The research grades a **single sustained note** (S1–S8). Sight-singing a melody is a
**sequence over time**, which needs segmentation. Options considered:

| Approach | How | Verdict |
|---|---|---|
| **Freeform onset detection** | Detect note onsets from the audio (energy/pitch-change), segment, grade each. | **Rejected v1** — onset detection on a breathy/legato beginner voice is unreliable and is exactly the fragile signal-processing the research avoids; high false-segmentation risk. |
| **Metronome-locked windows (RECOMMENDED)** | Student sings **in tempo** to a count-off/click (reuse BeatQuest's metronome). Each notated note occupies a known **beat window**; grade the **median sung pitch within each window** against that note's target. | **Chosen.** Reuses proven BeatQuest metronome timing; no fragile onset detection; timing is *supplied* by the click, so pitch grading per note is just `medianPitch` over that window's frames + `gradeForLevel`. |
| **Tap-gated windows** | Student taps each note; tap marks the window. | Deferred — usable later as a "sing + tap" mode; adds a motor task that can distract a beginner. |

**Grading per note (metronome-locked):** for each beat window, `medianPitch(frames in
window)` → `gradeForLevel(noteMidi, hz, band)`. **Pitch score** = % of notes `hit` (octave-
credited early). **Timing/rhythm score** — see §4.5. A note with too few voiced frames in
its window = "no note sung there" (a rhythm/omission error), fed to the hint ladder
(isolate that bar). The staff is rendered with `renderStaff`/`renderStaffPartial`
(`melodic-shell-services.js`, VexFlow) so the student reads real notation.

### 4.4 Real-time pitch visualization (Gap G4)
Two modes, both per-theme, both *direction-not-numbers* for beginners (research §4.3):
- **Single-note (S1–S8): needle + target zone.** A live needle over a target zone (band =
  the level's hit tolerance, e.g. ±50¢). Green in-zone, "slide up ↑ / down ↓" outside;
  a distinct **octave-band marker** so an octave match lights up "right note, other octave"
  rather than reading as far-off. EMA-smoothed with a small dead-zone so it doesn't flicker
  (research §4.3). This is the "getting warmer" live coach, not a numeric tuner.
- **Melodic (S9–S14): scrolling contour ribbon vs. the target line.** The notated melody's
  target pitches draw a **target line**; the student's live sung pitch draws a **scrolling
  contour ribbon** beside/over it, colored per frame by verdict — **hit / near / octave /
  miss** (per-theme palette). The ribbon scrolls in tempo with the metronome windows so the
  student sees their contour tracking (or diverging from) the melody in real time. This is
  the "beyond a needle" visualization the gap asks for — a felt, musical picture of the line
  they're singing, not a number.

### 4.5 Rhythm/timing grade onset level for S9+ (Gap #5, memory: *rhythm graded progressively*)
Confirmed against memory and research §2 note: **pitch-only through S8**; timing grading
turns on at **S9** but **gently** — S9–S11 grade pitch primarily with a *loose* timing
tolerance (note simply lands in roughly the right beat window; large drift flagged, not
failed). **S12+** tightens timing to a real onset-accuracy grade (reusing BeatQuest's
groove/onset scoring against the metronome). **Separate pitch and rhythm scores** are shown
(memory) so the student sees which dimension needs work — never a single blended pass/fail.
Owner confirms the exact S-level where tight timing turns on (§7).

### 4.6 File-level reuse map (verified this build)

| SingQuest piece | Disposition | File(s) |
|---|---|---|
| f0 detection, median, cents, hz↔midi | **reuse as-is** | `core/pitch.js` (verified: all functions present + `core/pitch.test.js`) |
| per-level grading bands | **new (thin wrapper)** | new `core/singquest.js` `gradeForLevel()` over `gradeSungPitch` |
| mic capture (Safari-hardened, DSP off) | **reuse as-is** | `ensureMic`/`captureSungFrames`/`releaseMic` in `melodic-shell-services.js:809–876` |
| consent gate + self-check fallback + live meter + "octave" copy | **generalize** into a reusable SING renderer parameterized by target(s) + hint ladder | from `createGymSingRenderer` (`melodic-renderers.js:3042`) → new `singquest-renderers.js` |
| drone / cadence anchor | **reuse; add duck/stop-for-capture choreography** | `playNote`/`playCadence` in `melodic-shell-services.js` |
| solfège labels (movable-do, minor LA/DO fork, fixed-do, numbers) | **reuse as-is** | `core/melodic.js` `labelNote:1127`/`labelPalette:1173`, `MINOR_SOLFEGE_LA/DO:1090` |
| melody generation for S9–S14 | **reuse; feed each level its degree/leap/color set** | `core/melodic.js` `generateMelody:864` |
| staff rendering (reading) | **reuse as-is** | `renderStaff`/`renderStaffPartial` in `melodic-shell-services.js` (VexFlow) |
| metronome for note segmentation (G2) | **reuse (generalize)** | BeatQuest metronome in `rhythm-student.js`/`solo-mode.js` |
| mastery / coverage / spaced review | **reuse; new item keys `sing:<level>`** | `core/mastery.js`, `core/review.js` |
| placement seed (3-bucket → staircase) | **reuse; wire vocal-range probe as the seed** | `core/placement.js` |
| groove / streak / capstone / Game-Over / Level-Complete engine | **reuse pattern; SingQuest progress store** | `solo-mode.js` (groove, `masteryView`, `recordRound`, capstone), `beatquest-casual.html` (skin, HUD inject, Game-Over/celebration) |
| XP award (BASE×D×Q×N, skill `pitch`) | **reuse shared helper** | per `MUSIC_SUITE_XP_SPEC.md` §7 `awardXP` |
| account blob (namespaced, read-merge-write) | **new key `data.singquest`; merge-preserve** | StaffCommander Supabase RPCs (memory) |
| fake-media headless test harness | **reuse** | `--use-fake-device-for-media-stream` per `INTERVAL_GYM_SPEC.md` §7.3 |
| house style (no emoji, per-theme, cog drawer, one CTA, constant HUD) | **apply** | `STYLE_GUIDELINES.md` + project memory |

**Bottom line (verified):** the mic → detect → cents-grade → octave-credit → consent/
fallback loop is production-verified in this repo. SingQuest's genuinely new code is: the
**vocal-range onboarding probe**, the **hint-ladder coaching module** (§2.2), the S1–S8
production/ear renderers (thin wrappers on a generalized SING renderer + drone + degree
palette), the **metronome-locked note segmentation** for S9–S14 (G2), the **contour-ribbon
visualization** (G4), the S-level curriculum data, the game-feel skin, and the account
namespacing. Everything else is reuse.

---

## 5. Phased build order (small, independently verifiable chunks)

Each phase is a shippable, gated slice with a **headless fake-media test** (§6). Owner wants
careful, methodical, professional builds with checks (memory: *build carefully with checks*).

### Phase 0 — Prove the mic-verified loop end-to-end (the first slice)
The smallest thing that proves the vision AND passes the "guided teacher, not drill mill"
test. Scope: **Find-your-voice probe + S1 Match + S5 Named-interval**, styled in the suite
game skin, with the hint ladder present.
- Find-your-voice probe (research §1.5): match a mid tone → infer octave → bracket range →
  store `{lowMidi,highMidi,tonicOctave}`. Reuse `captureSungFrames`+`detectPitch`+
  `medianPitch`.
- S1 Match: reference in own octave; live **needle + target zone** (G4); grade ±50¢ octave-
  agnostic; "held it!" on ≥0.8 s stable; **hint ladder** on miss (replay → sing-with-me →
  return-to-home).
- S5 Named interval over a drone: establish home, sound the start note, "sing a major 3rd
  up," **sound-then-sing capture** (§4.2), grade the landing; hint ladder (break-it-down).
- Consent + self-check fallback (reuse `createGymSingRenderer` path) + Quest game skin
  (groove ring, Level/Score tabs, cog drawer, no emoji).
- **Gate:** fake-media headless test asserts the detector against a known synthetic tone
  through `getUserMedia` and the consent-denied fallback path; then **real-singer validation**
  (incl. a self-described "tone-deaf" singer + a deep male voice) confirms (a) it feels
  coached not graded, (b) passes the drill-mill design test, (c) the ±50/±100¢ bands are
  fair and motivating. **If it reads as a tuner/drill even after tuning → STOP, revisit §1.**

### Phase 1 — S1–S3 production + the coaching spine
S1 Match, S2 Hold-it-steady, S3 Step up/down. Build the **hint-ladder module** as shared
infrastructure here (all rungs), the needle/target-zone visualization, and the S1–S3
musical-payoff motif ending (§2.5). Per-level bands via `gradeForLevel`.
**Gate:** fake-media tests per level (synthetic tones for match/hold/step, direction
correctness); screenshots in ≥2 themes; hint ladder fires on injected misses.

### Phase 2 — S4–S8 functional ear over the drone
S4 Sing-home, S5 Named-interval (promote from Phase 0), S6 Scale-degrees, S7 Pentascale/
scale run, S8 Echo-a-short-tonal-phrase (short-span, opt-in — research §6). Wire the drone
anchor + sound-then-sing choreography; degree palette from `labelPalette`; phrase payoffs.
**Gate:** fake-media multi-tone sequences for S7/S8; drone-bleed check (assert clean capture
with reference stopped); short-span cap enforced.

### Phase 3 — Progress store, XP, accounts (suite integration, G3)
Groove/streak/mastery-pips/Game-Over/Level-Complete wired to a SingQuest progress store
(reuse `solo-mode.js` pattern); `awardXP` skill=`pitch`; **namespaced read-merge-write into
`data.singquest`** with a test proving other apps' keys survive a save.
**Gate:** a save/reload test asserting MelodyQuest/BeatQuest/StaffCommander keys are
preserved (the blob-overwrite invariant); XP formula unit test; Level-Complete celebration
plays back the sung phrase.

### Phase 4 — S9–S12 sight-singing (reading real melodies, G2 + G4)
Staff rendering + `generateMelody` per level; **metronome-locked note segmentation** (G2);
**scrolling contour-ribbon visualization** (G4); pitch score + gentle timing (S9–S11) →
tighter timing (S12); separate pitch/rhythm scores. S9 First-stepwise-melody, S10 small-
leaps, S11 minor (orient-first per memory), S12 wider-leaps.
**Gate:** fake-media melody test — feed a synthetic in-tune melody in tempo, assert per-note
window grading ≥ threshold; feed a deliberately-flat note, assert it's caught + hint-ladder
isolates that bar; contour ribbon colors match verdicts.

### Phase 5 — S13–S14 capstone
S13 chromatic color (resolving passing/leading tones), S14 longer phrases + key change /
modulation (re-find the new tonic). Full timing grade.
**Gate:** fake-media modulating-melody test; capstone advancement gate (Proficient + streak
+ criterion) fires the celebration; full ladder regression sweep.

### Phase 6 — Polish, real-singer tolerance validation, deploy
Tune per-level bands from real-singer data; accessibility of the fallback path; live cold-
start Safari mic check on the deployed domain (per-domain trust lesson, spec §7.3.5);
"songs you can now sing" shelf; onboarding narrative polish.
**Gate:** owner real-Safari mic check on the live domain; drill-mill design test re-run on
the full arc.

---

## 6. Test strategy

- **Pure-core unit tests** (`node --test core/*`): `core/singquest.js` `gradeForLevel`
  band-tightening per level; join the existing suite (must stay green alongside
  `core/pitch.test.js` and the melodic suite). Reuse `core/pitch.js`'s ±15¢-accuracy and
  harmonic-lock tests as regression gates (do not modify).
- **Fake-media headless** (per phase, `INTERVAL_GYM_SPEC.md` §7.3 pattern): Chromium
  `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` feeds a **synthetic
  tone of known frequency** into `getUserMedia`; assert the detector/grader verdict. Extend
  it to **multi-tone sequences in tempo** for S7/S8 (echo) and S9–S14 (melody segmentation).
  Test the **consent-denied fallback** with permissions revoked. Test the **drone-bleed
  fix**: with the reference playing then stopped, assert the graded capture window sees only
  the sung tone.
- **Truth seam** (like `lastGymRound`/`melodic` studio seam): expose `lastSingRound` so
  headless drivers can read the target, the graded verdict, and which hint-ladder rung
  fired, without a human mic.
- **Per-phase gates**: each phase's "Gate" (§5) is a merge blocker — sweeps green +
  screenshots in ≥2 themes + the phase's fake-media assertions.
- **Tolerance validation with real singers** (Phase 0 and Phase 6): a handful of real
  voices including a self-described "tone-deaf" singer and a deep male voice; confirm the
  ±50/±100¢ bands and the range probe are fair-and-motivating; tune per level. This is the
  one thing headless tests **cannot** prove (research §5, §6 — the bands are a reasoned
  default, not measured for our users).
- **Blob-overwrite regression** (Phase 3): a save/reload test asserting namespaced
  read-merge-write preserves every other app's `data` key.
- **Live cold-start** (Phase 6): owner-verified real-Safari mic on the deployed domain
  (per-domain trust lesson).

---

## 7. Risks + open decisions for the owner

**Risks (with mitigations):**
| Risk | Mitigation |
|---|---|
| **Collapses into a tuner / drill mill** | §1.1 design test is a gate; hint-ladder coaching mandatory; musical payoff per level; Quest arc; novelty-decayed XP; Phase 0 real-singer "coached not graded" check can trigger a pivot. |
| **Reference bleed corrupts detection** (G5) | Sound-then-sing for graded reps; duck/stop reference in capture window; headphone nudge; optional bandpass (§4.2). |
| **Melody segmentation fragile** (G2) | Metronome-locked windows (no onset detection); too-few-voiced-frames = omission → hint ladder (§4.3). |
| **Cheap mics / low-male octave errors** | median-over-frames + clarity gate + RMS floor already handle most; MPM/pYIN upgrade only if field data demands (research §4.1). |
| **Tolerance bands wrong for our users** | Instrumented + validated with real singers in Phase 0/6; per-level tunable (research §6). |
| **True amusics (~1.5%)** | Fail gracefully — never trap; perception-only supplement + generous self-check; do not diagnose (research §7). |
| **Account blob overwrite wipes other apps** | Namespaced `data.singquest` + read-merge-write + a regression test (Phase 3 gate). |
| **Motivation under exposure** | Nothing recorded/uploaded; needle not verdict; generous early bands; octave credit; short purposeful sessions (research §1.6). |

**Open decisions for the owner:**
1. **GO/NO-GO ratification** — plan recommends **GO conditional on Phase 0** (§1.6).
2. **Ladder shape** — approve S1–S14 + "Find your voice" onboarding as the spine (research §8.1)?
3. **Drone-under-voice vs sound-then-sing** for graded reps — plan leans **sound-then-sing
   for grading, sustained drone for free practice** (§4.2; resolves research §6 / spec §10).
4. **Defaults** — movable-do + LA-based minor as ship defaults, fork exposed in the cog?
5. **Name** ("SingQuest" vs alternatives) and **where it launches** in the suite UI.
6. **Rhythm/timing gate onset level for S9+** — plan proposes pitch-only ≤ S8, gentle timing
   S9–S11, tight timing **S12+** (§4.5). Confirm the exact turn-on level.
7. **XP difficulty mapping** (S-ladder → 1–10 rubric, §3.3) — ratify the numbers.
8. **Phase 0 scope** — build S1+S5+range-probe slice and validate with real singers before
   the full ladder (recommended)?

---

## 8. Autoloop-ready task breakdown

Ordered checklist of chunks small enough to execute one-per-iteration in a self-paced loop.
Each has a **done-criterion**. (Phase 0 must clear before any post-Phase-0 chunk.)

**Phase 0 — prove the loop**
1. `core/singquest.js` skeleton + `gradeForLevel(targetMidi, sungHz, bands)` wrapper over
   `gradeSungPitch`. **Done:** unit tests pass for hit/near/octave/miss and per-level band
   tightening; joins `node --test core/*` green.
2. Generalize `createGymSingRenderer` into `singquest-renderers.js` SING renderer
   parameterized by target(s), keeping consent + fallback + live meter. **Done:** mounts
   headless; consent + fallback paths reachable; `lastSingRound` truth seam exposed.
3. Find-your-voice probe (match mid tone → infer octave → bracket range → store
   `{lowMidi,highMidi,tonicOctave}`). **Done:** fake-media tone yields a plausible range;
   stored to the (local, then namespaced) progress object.
4. S1 Match renderer + needle/target-zone visualization + "held it!" (≥0.8 s stable) +
   hint-ladder rungs 1–2 & 5 (direction, replay, return-to-home). **Done:** fake-media
   in-tune tone = hit; flat tone triggers direction nudge + replay.
5. S5 Named-interval-over-drone + sound-then-sing capture choreography + hint-ladder
   break-it-down. **Done:** fake-media landing on target = hit; drone stopped before
   capture (bleed test passes); wrong landing triggers break-it-down.
6. Quest game skin on Phase 0 screens (groove ring, Level/Score tabs, cog drawer, no emoji,
   ≥2 themes). **Done:** screenshots in 2 themes match the BeatQuest sibling look; no emoji.
7. **Phase 0 GATE:** real-singer validation (tone-deaf + deep-male voices) + drill-mill
   design test + band fairness. **Done:** owner sign-off that it feels coached-not-graded;
   bands ratified or tuned.

**Phase 1 — S1–S3 + coaching spine**
8. Hint-ladder module (all 6 rungs) as shared infra. **Done:** each rung unit/headless-
   testable in isolation; used by S1.
9. S2 Hold-it-steady (low-variance ≥1.5 s). **Done:** fake-media steady tone passes;
   wobbling tone fails with steadiness coaching.
10. S3 Step up/down (direction + landing). **Done:** fake-media correct-direction step =
    pass; wrong direction caught.
11. S1–S3 musical-payoff motif ending. **Done:** each level closes on a 2–3 note motif, not
    a bare rep.

**Phase 2 — S4–S8 functional ear**
12. S4 Sing-home over drone. **Done:** fake-media 1̂ over drone = pass (bleed-safe).
13. S6 Scale-degrees (1̂ 2̂ 3̂ 5̂) over drone. **Done:** each degree gradeable via fake-media.
14. S7 Pentascale/scale run (ascending+descending, contour). **Done:** fake-media 5-tone
    sequence graded per note + contour check.
15. S8 Echo short tonal phrase (3–4 notes, opt-in, short-span cap). **Done:** fake-media
    sequence graded; >4 notes refused.

**Phase 3 — suite integration**
16. SingQuest progress store + groove/streak/mastery-pips wired (reuse `solo-mode.js`
    pattern). **Done:** groove drains/refills; pips reflect mastery band; Game-Over at 0.
17. Level-Complete celebration playing back the sung phrase. **Done:** capstone pass fires
    celebration with phrase playback.
18. `awardXP` skill=`pitch` with D/Q/N mapping. **Done:** XP unit test (clean-fresh vs
    coached vs looped) matches the rubric.
19. Namespaced `data.singquest` read-merge-write. **Done:** save/reload regression test
    proves other apps' `data` keys survive.

**Phase 4 — S9–S12 sight-singing**
20. Staff render + `generateMelody` wiring per level + metronome-locked windows (G2).
    **Done:** a rendered melody segments into beat windows in tempo.
21. Per-note window grading (pitch) + omission handling → hint ladder isolates a bar.
    **Done:** fake-media in-tune melody scores high; injected flat note caught + bar
    isolated.
22. Scrolling contour-ribbon visualization vs target line (G4), verdict-colored, per-theme.
    **Done:** ribbon colors match per-note verdicts in ≥2 themes.
23. S9–S11 (stepwise, small leaps, minor orient-first) with gentle timing. **Done:** each
    level's fake-media melody test green; minor orientation runs before minor drilling.
24. S12 wider leaps + tight timing turns on. **Done:** timing grade separated from pitch;
    both shown.

**Phase 5 — capstone**
25. S13 chromatic color (resolving alt tones). **Done:** fake-media altered-then-resolved
    note graded correctly.
26. S14 longer phrases + modulation (re-find new tonic) + capstone gate. **Done:** fake-
    media modulating melody; capstone advancement fires; full-ladder regression sweep green.

**Phase 6 — polish + ship**
27. Real-singer tolerance re-validation + per-level band tuning. **Done:** bands finalized
    from real data.
28. "Songs you can now sing" shelf + onboarding narrative polish. **Done:** shelf grows per
    cleared level.
29. Live-domain Safari mic cold-start + full drill-mill design-test re-run. **Done:** owner
    real-Safari sign-off; arc reads as a guided teacher.

---

*Cross-references: research §1 (evidence/tone-deafness), §1.3 (functional method), §1.4
(octave credit), §1.5 (range probe), §1.6 (motivation/shame), §2 (S1–S14 ladder), §3 (reuse
map), §4 (pitch tech + tolerances), §5 (first slice), §6 (risks), §7 (do-not-build), §8
(decisions). In-repo: `core/pitch.js`, `melodic-shell-services.js`, `melodic-renderers.js`,
`core/melodic.js`, `core/mastery.js`, `core/review.js`, `core/placement.js`,
`INTERVAL_GYM_SPEC.md` §5.4/§7.3/§10, `MUSIC_SUITE_XP_SPEC.md`, `solo-mode.js`,
`beatquest-casual.html`, `STYLE_GUIDELINES.md`.*
