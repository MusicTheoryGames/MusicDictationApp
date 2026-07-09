# Sight-singing trainer — research + build plan (mic-verified, zero → confident)

A research + planning document for a NEW app in the suite (alongside MelodyQuest
melodic dictation and BeatQuest rhythm dictation): a **sight-singing + ear-training
trainer that listens to the student's voice through the microphone and verifies they
are singing the correct pitch.** Working name in this doc: **SingQuest** (naming is an
open question, §8).

Written 2026-07-06. Structured like `MELODIC_LADDER_EXPANSION_PLAN.md` and mirrors the
evidence rigor of `MELODIC_DICTATION_RESEARCH.md`. **This is a plan for owner review,
not built work.** Confidence flags per claim: **[strong]** = multiple peer-reviewed
sources · **[moderate]** = one good study or clear practitioner consensus ·
**[contested]** = literature disagrees · **[gap]** = plausible but untested.

Owner's vision, verbatim: *"the app gives you a note and asks you first just to match
it, and it makes sure you do that [via mic], then it asks you to sing a M3 (or whatever)
above and tells you if you did it correctly. We want a robust pedagogical method of
helping people go from tone-deaf to confidently sight-singing."*

---

## 0. The one-sentence finding

**Almost nobody who calls themselves "tone-deaf" actually is** — true congenital amusia
is only ~1.5% of the population [strong], while ~10–15% sing poorly because of a *vocal-motor
/ perception-to-action mapping* problem with **intact perception** [strong] — so a
production-focused, mic-verified trainer that (a) finds the student's own comfortable
octave, (b) credits octave-equivalent matches, (c) anchors every pitch to a sounding
tonal center (drone/scale-degree function, not abstract intervals), and (d) advances one
sub-skill at a time can take the large majority of self-described non-singers to
confident sight-singing — and **no existing app does this end-to-end**, which is exactly
the gap we fill. The core machinery to build it (a pure, tested pitch detector; a
Safari-hardened mic pipeline; octave-aware cents grading; movable-do labeling; a
cadence/drone service; mastery/coverage gating) **already exists in this codebase** from
the melodic app's Interval-Gym SING station.

---

## 1. Evidence summary

### 1.1 Is "tone-deafness" real? Perception vs. production. **[strong]**
- **Congenital amusia (true "tone deafness") ≈ 1.5% of the population** in the largest
  objective survey (>15,000 participants, three auditory tests + questionnaire; Peretz &
  Vuvan 2017). Older figures (~4%, Kalmus & Fry 1980) rested on a single test and are
  now considered high. https://pmc.ncbi.nlm.nih.gov/articles/PMC5437896/ ·
  https://peretzlab.ca/wp-content/uploads/2020/12/peretz_i-_2016_tics.pdf
- **~10–15% of people are inaccurate *singers*** — but the deficit is usually **not**
  perceptual. Pfordresher & Brown showed poor-pitch singing occurs *in the absence of
  "tone deafness"*: most poor singers hear pitch fine and fail at **vocal-motor control /
  the auditory-motor mapping** that turns a heard target into the right vocal gesture.
  http://www.acsu.buffalo.edu/~pqp/pdfs/Pfordresher&Brown_2007_MP.pdf ·
  https://link.springer.com/article/10.3758/s13414-014-0732-1 ·
  https://pmc.ncbi.nlm.nih.gov/articles/PMC3140645/
- **Implication (the app's whole thesis):** a *production*-focused trainer — repeated,
  immediate, objective feedback on whether the vocal gesture landed on target — addresses
  the actual bottleneck for the large majority. Perception drills alone (the entire
  category of "click the right answer" ear-trainers) do **not** train the failing system.

### 1.2 Pitch-matching in adults is trainable, and *how* you train it matters. **[strong/moderate]**
- Measurable improvement within ~2–3 weeks of consistent practice; substantial gains over
  ~8–12 weeks (practitioner/consensus + training studies). Start with **intensive unison
  (single-note) matching** before scales or songs. https://vocalrangetester.com/how-to-improve-pitch-accuracy/
- **Wide-range training beats narrow-range** training for remediating accuracy
  (Pfordresher & Greenspon 2025 — *Effects of pitch range on singing accuracy training*).
  Do not trap a beginner in a 5-note box forever; widen deliberately.
  https://journals.sagepub.com/doi/10.1177/10298649241289542
- **The reference model should resemble the singer's own voice.** For male adolescents,
  best pitch-matching came from matching a **baritone** model, not a female/organ tone —
  it's voice-type similarity, not timbre glamour, that helps. Directly motivates
  own-octave references and octave-agnostic scoring (§1.4).
  https://www.sciencedirect.com/science/article/abs/pii/S0892199713000027
- A **live/again-and-again voice model** improved matching over a static tone
  (Price et al.). Our synthesized reference should be a clear, vocal-like sustained tone
  in the student's octave.

### 1.3 Method: functional / scale-degree-over-a-drone beats abstract intervals. **[strong for dictation; moderate for singing]**
- The suite's own dictation research already establishes **scale-degree function first,
  intervals deferred** as the #1-ranked intervention (Buonviri & Paney 2015, 398 teachers;
  interval-ID explains only ~29% of dictation variance — Nichols & Springer 2022). See
  `MELODIC_DICTATION_RESEARCH.md`. The same principle governs singing: anchor every note
  to a **sounding tonic** so the student sings **function**, not interval arithmetic.
- **Drone-based practice** lets the singer *feel* tension/resolution of each degree
  against a constant tonal foundation, which "sticks better than abstract interval
  memorization" and transfers faster to real music than context-free "hear-and-copy."
  https://tonedear.com/ear-training/functional-solfege-scale-degrees ·
  https://www.demomentor.com/reviews/sonofield-ear-trainer
- **Nuance for THIS app:** the owner's example ("sing a M3 above") *names an interval*.
  That's fine and correct as a **production target** — the student still produces it best
  when a tonic is sounding so 1̂→3̂ is *do→mi over home*, not "a major third in a vacuum."
  Design rule: name the interval in the prompt, but keep a drone/anchor under it.

### 1.4 Octave errors are a NORMAL, correct response — credit them. **[strong]**
- Beginners (especially men matching a female/high reference) reproduce the correct
  **pitch class an octave away**; this is a well-documented, essentially *correct* octave
  transposition, not an error. Voice-type-matched models reduce it (§1.2). The app must
  **detect the pitch class mod 12** and credit an octave match (with a gentle "right note,
  a different octave" message), never score it as total failure.
  https://www.sciencedirect.com/science/article/abs/pii/S0892199713000027
- This is *already implemented* in `core/pitch.js::gradeSungPitch` (octave-band verdict).

### 1.5 Vocal-range / "find your voice" onboarding. **[moderate]**
- Untrained adults have a comfortable *tessitura* far narrower than the textbook range;
  asking for notes outside it guarantees failure that reads (wrongly) as "can't sing."
  Typical comfortable speaking→singing zones: adult **male** roughly ~A2–C4 (fundamental
  ~110–262 Hz) and **female** roughly ~G3–C5 (~196–523 Hz), individual and wide-varying.
- Practitioner method: a short **ascending/descending sirening or note probe** to find the
  lowest and highest comfortable pitches, then set exercises inside that band and choose
  the reference octave to match. https://vocalrangetester.com/how-to-improve-pitch-accuracy/
- **Buildable onboarding:** play a mid tone, ask the student to match; from the detected
  f0, infer their octave; then probe a couple of steps up and down to bracket a comfortable
  range; store `{lowMidi, highMidi, tonicOctave}` and generate every subsequent target
  inside it. This is the singing analog of the melodic app's adaptive placement seed
  (see memory: *onboarding = seeded adaptive audition*).

### 1.6 Motivation & the shame spiral. **[moderate]**
- The **"I'm tone-deaf" self-label is itself a barrier**: a fixed-mindset belief that the
  trait is unchangeable predicts giving up. Growth-mindset framing + self-acceptance of
  mistakes are part of effective interventions for singers, and adolescence/first-attempts
  are a high-leverage window to instill them.
  https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1386559/full
- **Music-performance anxiety** drives people to quit; Acceptance-and-Commitment
  approaches (accept the wobble, act anyway) reduce it with lasting effect.
  https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7272702/
- Singing alone into a mic is an *exposing* task. Design implications: **private practice**
  (nothing recorded or uploaded — analysis is live in-browser and discarded), **immediate
  non-judgmental feedback** (a needle, not a verdict), **octave-forgiving and
  cents-generous early** (small wins), **encouraging failure copy** ("close — you're a bit
  flat, slide up" not "wrong"), and **streaks/daily micro-sessions** (15–30 min daily beats
  infrequent long sessions per the app-review literature).

### 1.7 Pedagogical methods, cross-walked. **[strong consensus on sound-before-symbol]**
- **Kodály / movable-do solfège / tonic sol-fa:** relative pitch via movable-do syllables +
  hand signs; sing function in *any* key. Widely evidenced for building inner hearing;
  the suite already implements movable-do (`core/melodic.js`). https://www.allianceamm.org/resources/gordon/
- **Gordon Music Learning Theory (audiation):** *audiate before you sing/read* — immerse
  in **tonal patterns** long before notation, exactly "sound before symbol." Gordon's own
  system is **movable-do, LA-based minor** (and modal tonic syllables) — which matches the
  labeling fork already in `core/melodic.js`. https://en.wikipedia.org/wiki/Gordon_music_learning_theory
- **Karpinski (*Aural Skills Acquisition*, OUP 2000):** the field's spine — listening
  skills (meter perception, **short-term musical memory**, **tonic inference**) precede
  reading/performing (**vocal production**, eye movements, sight-singing transposition/
  modulation). Tonic inference + memory before notation is the same ordering the melodic
  app uses. https://global.oup.com/academic/product/aural-skills-acquisition-9780195117851 ·
  https://digitalcollections.lipscomb.edu/jmtp/vol14/iss1/9/
- **Fixed-do vs movable-do [contested]:** fixed-do (do=C always) trains note-name fluency
  but gives *no functional syllable* for accidentals/keys and is weaker for beginners
  learning to *feel* function; movable-do is the evidence-favored default for
  **beginners/relative pitch**. Ship **movable-do as default**, expose fixed-do and
  numbers as options (all three already exist in `labelNote`).
- **Minor-mode syllables [moderate]:** **LA-based minor** (la ti do re mi fa sol) keeps
  the movable-do relationship to the relative major and is Gordon/Kodály standard; do-based
  minor (do re me fa sol le te) names chromatic alterations more explicitly. Both are
  already implemented (`MINOR_SOLFEGE_LA` / `MINOR_SOLFEGE_DO`). Default **LA-based**,
  offer the fork (mirrors the melodic app's decision).

### 1.8 Pitch-detection technology. **[strong]** (detail in §4)
- For a **sung voice** in real time client-side, the practical winners are **time-domain
  periodicity methods**: normalized autocorrelation (NSDF), **YIN/pYIN**, and the
  **McLeod Pitch Method (MPM)**. MPM/YIN "perform best on real musical instruments and
  voice." FFT/HPS is cheaper but coarser at low male-voice fundamentals; CREPE (neural) is
  most accurate but heavy for always-on browser use.
  https://github.com/sevagh/pitch-detection · https://ryukau.github.io/filter_notes/pitch_estimation/pitch_estimation.html
- The classic failure mode is **octave (sub-harmonic) error**, which our existing detector
  already mitigates by shortest-lag peak selection; median-over-frames + clarity gating
  removes jitter.

---

## 2. The pedagogical ladder — zero to confident sight-singing

Same stacking law as the melodic ladder: **each level adds exactly ONE new skill and
re-integrates all prior skills; nothing taught is dropped** (see memory: *stacking
principle*). Every level below has a **mic-verified success criterion** and a
**keep-it-motivating** note. Grading bands (from `gradeSungPitch`, tunable per level):
`hit` ±50¢, `near` ±51–100¢, `octave` (right pitch class, wrong octave), `miss`. Early
levels are **octave-agnostic and generous** (credit `octave` fully, `near` as a pass);
later levels tighten the window and require the correct octave.

**Onboarding (before S1): "Find your voice."** Vocal-range probe (§1.5): match a mid
tone, infer the student's octave from detected f0, bracket a comfortable low/high, store
`{lowMidi, highMidi, tonicOctave}`. Also the 3-bucket experience question
(beginner/intermediate/advanced) that *seeds* a starting level rather than self-reporting
skill (memory: *onboarding = seeded adaptive audition*). **Motivating:** frames the first
interaction as "let's find where your voice is comfy," not a test; guarantees we never ask
for an unreachable note.

| Lvl | New skill (stacks all prior) | Mic-verified success criterion | Keep-it-motivating |
|---|---|---|---|
| **S1 Match one note** | Match a single sustained reference pitch **in your own octave**. (Owner's step 1: "asks you first just to match it, and makes sure you do.") | Sing within **±50¢** of the target pitch class, held **≥0.8 s** stable; **octave-agnostic**. 4/5 targets. | The very first win. Live needle shows "getting warmer"; octave match cheered, not corrected. Private, discardable audio. |
| **S2 Hold it steady** | Sustain a matched tone without drifting. | Hold within ±50¢ for **≥1.5 s** (low frame-to-frame variance). | "You held it!" — rewards steadiness, the core vocal-motor skill (§1.1). |
| **S3 Step up / step down** | From a matched note, move **one whole/half step** in the named direction. | Second note within ±60¢ of the step target, correct **direction**. | Direction first, precision second — early credit for "you went the right way." |
| **S4 Sing home (tonic over a drone)** | With a **drone** sounding, find and sing **1̂ (do)** from a nearby given note. | Sing 1̂ within ±60¢ over the drone. | Introduces the anchor that makes everything else easier (§1.3); "home" is the safe base to return to. |
| **S5 Named interval from a reference** | Given a note (drone under it), **sing a NAMED interval above/below** — M3, P5, etc. (Owner's step 2 exactly.) | Target note within ±50¢, correct octave-or-octave-credited; interval named in the prompt. Start with M3/P5 (consonant, easy), add P4/M2. | Name it plainly ("sing a major 3rd up"); the drone makes it *do→mi over home*, not math. |
| **S6 Scale degrees over a drone** | Sing any of **1̂ 2̂ 3̂ 5̂** on request over the drone (pentatonic-safe subset first). | Correct degree within ±50¢, 5/6. | This is the functional-ear core (§1.3); degrees, not intervals — the skill that transfers. |
| **S7 Sing the pentascale / scale** | Sing **1̂–2̂–3̂–4̂–5̂** ascending and descending in tune. | Each note ±50¢, contour correct, no gross octave break. | Wide-range practice starts here (§1.2 — wide beats narrow); celebrates a whole run. |
| **S8 Echo a short tonal phrase** | Hear 3–4 in-key notes, **sing them back** (short-span, tonal — audiation, Gordon). | Each note within ±60¢, correct order/contour. | Short spans only (working-memory-safe; see melodic research §2.4 — sing-back is fine on SHORT material). "Sing what you heard." |
| **S9 Sing stepwise notated melodies** | **Read** a short stepwise diatonic melody on the staff and **sing it** (movable-do). First real sight-singing. | ≥80% of notes ±50¢, correct octave, steady tempo (rhythm from BeatQuest lockstep). | The "I'm actually reading music" milestone — keep melodies tiny and diatonic. |
| **S10 Melodies with small leaps** | Sight-sing melodies containing **3rds and tonic-triad skips**. | ≥80% notes ±50¢; leap landings within ±60¢. | Leaps land on stable triad tones first (1̂/3̂/5̂) — the anchors from S4/S6 pay off. |
| **S11 Minor mode** | Find home in **minor** (♭3̂ color) and sing degrees/melodies in minor (LA-based). | Sing 1̂ and ♭3̂ in minor ±50¢; short minor melody ≥80%. | Orient the ear to minor *before* drilling it (memory: *minor orient-first*); "hear the darker third." |
| **S12 Wider leaps** | P4, P5, 6ths, octave in melodies. | Leap landings ±60¢; ≥80% overall. | Bigger jumps, still anchored to function; octave leap is a crowd-pleaser. |
| **S13 Chromatic color** | Sing a resolving **chromatic passing tone / leading tone**; raised 6̂/7̂ in minor. | Altered note ±50¢, resolves correctly. | One color note at a time; "lean into it, then resolve home." |
| **S14 Longer phrases / key changes** | Sight-sing multi-phrase melodies; re-establish home after a modulation to V/relative. | ≥80% across the phrase; correctly re-find the new tonic. | The capstone of confident sight-singing — periods, then modulation, mirroring melodic M17/M19. |

**Notes on the ladder shape**
- S1–S3 are **pure production** (no notation, no reading) — building the vocal-motor
  mapping that §1.1 identifies as the real bottleneck.
- S4–S8 are **functional ear + audiation** over a drone — the evidence-favored core.
- S9–S14 are **true sight-singing**, reusing the melodic curriculum's own degree/leap/
  minor/chromatic/modulation progression so the two apps stay curricularly aligned.
- **Advancement gating** matches the suite's locked model: coverage-gated (not "3 in a
  row"), Proficient-band + capstone, spaced review on return, decay-driven back-up
  (memory: *mastery progression model*). Rushing pure-accuracy singing levels is a bug, so
  gate on accuracy/consistency, not speed.

---

## 3. Reuse map — what SingQuest borrows (it is NOT a from-scratch app)

The melodic app's **Interval-Gym SING station** already built and shipped most of the hard
parts (`INTERVAL_GYM_SPEC.md` §5.4, phases G3–G5 marked DONE). SingQuest is largely a
**re-composition of existing, tested modules** around a new ladder.

| Need | Reuse (exists today) | Location | New work |
|---|---|---|---|
| Fundamental-frequency detection | `detectPitch` (normalized autocorrelation, octave-error mitigation, RMS gate, parabolic interp), `medianPitch`, `hzToMidi`/`midiToHz`/`centsBetween` — **pure + unit-tested** | `core/pitch.js`, `core/pitch.test.js` | none for v1 (optionally add MPM/pYIN later, §4) |
| Cents grading w/ octave credit | `gradeSungPitch` → hit/near/**octave**/miss bands | `core/pitch.js` | make bands **per-level** (generous early, tight late) |
| Mic capture (Safari-hardened) | `ensureMic`/`captureSungFrames`/`releaseMic` — getUserMedia w/ echoCancellation+noiseSuppression+autoGainControl **OFF**, gesture-scoped, awaited `resume()`, live level meter | `melodic-shell-services.js` | reuse verbatim |
| Consent + self-check fallback | full consent gate + mic-denied "sing-then-self-judge" fallback, live meter, "right note different octave" copy | `createGymSingRenderer` in `melodic-renderers.js` | generalize into a reusable SING renderer parameterized by target |
| Drone / tonal anchor | `playNote(tonicMidi, dur)` drone; `playCadence(key,mode)` I–IV–V–I context-setter | `melodic-shell-services.js` | reuse; add a *sustained* drone under the voice (see §6 risk) |
| Scale-degree / solfège labels | movable-do (major do-based, minor LA/DO fork), fixed-do, numbers | `core/melodic.js` `labelNote`/`labelPalette` | reuse as-is |
| Melody generation for S9–S14 | `generateMelody` (degrees/leaps/range/meter/color-tone flags, deterministic under seed) | `core/melodic.js` | reuse; feed each SingQuest level its degree/leap set |
| Staff rendering for reading | `renderStaff` / `renderStaffPartial` | `melodic-shell-services.js` (VexFlow) | reuse for S9+ |
| Rhythm lockstep | Hall `hallRhythmRef` ids; BeatQuest rhythm vocabulary | `core/curriculum.js` | cite refs; rhythm graded progressively later (memory) |
| Mastery / coverage / review | `createItemState`/`recordAnswer`/`viewItemAsOf`, coverage gating, `review.createEntry` Leitner | `core/mastery.js`, `core/review.js` | new item keys `sing:<level>:<skill>` |
| Placement seed | 3-bucket experience → adaptive staircase | `core/placement.js` | wire the vocal-range probe as the seed |
| Accounts / cloud sync | StaffCommander Supabase model: handle+PIN, RLS deny-all + SECURITY DEFINER RPCs, ONE `data` jsonb per player | (per memory: *StaffCommander Supabase model*) | **namespace SingQuest progress** in the blob — `player_save` OVERWRITES, so merge or you wipe other apps' progress |
| Fake-media test harness | Chromium `--use-fake-device-for-media-stream` synthetic-tone assertions against the detector; consent-denied path | `INTERVAL_GYM_SPEC.md` §7.3 | reuse to test SING levels headlessly |
| House style | no emoji (inline SVG icons), per-theme color, one accent CTA, cog drawer for settings, constant HUD | project memory + `STYLE_GUIDELINES.md` | apply |

**Bottom line:** the mic → detect → cents-grade → octave-credit → consent/fallback loop is
**already production-verified** in this repo. SingQuest's genuinely new code is: the
vocal-range onboarding probe, the S1–S8 production/ear renderers (mostly thin wrappers on
the SING renderer + drone + degree palette), the S-level curriculum data, and the account
namespacing.

---

## 4. Pitch-detection tech recommendation

### 4.1 Algorithm — recommendation: **keep the existing normalized-autocorrelation detector for v1; add MPM/pYIN via WASM only if field data demands it.** **[strong]**

| Algorithm | Voice suitability | Latency/cost | Verdict |
|---|---|---|---|
| **Normalized autocorrelation / NSDF** *(what we have)* | Good on sung vowels; octave errors mitigable by shortest-lag peak selection (already done) | Cheap, real-time in JS | **Ship it for v1** — already pure + tested |
| **McLeod Pitch Method (MPM)** | "Best on real instruments and voice"; NSDF + clarity metric, robust octaves | Real-time; WASM available (Pitchlite) | Strong **v2** upgrade if octave/low-male errors surface |
| **YIN / pYIN** | Excellent voice tracking; pYIN gives smooth, confident tracks + voiced/unvoiced | Real-time (YIN); pYIN heavier | Good alt; `pitchfinder` (JS) or `aubio.js` (WASM) |
| **FFT / HPS** | Coarser; struggles at low male fundamentals & short frames | Very cheap | Not recommended as primary |
| **CREPE (neural)** | Most accurate, most robust to noise/breathiness | Heavy (model load, per-frame inference) | Overkill for always-on browser; consider only for an offline "assessment" mode |

Libraries if we ever replace ours: **Pitchy** (MPM, tiny), **pitchfinder** (YIN/AMDF/etc),
**aubio.js**/**Pitchlite** (WASM YIN/MPM). But our `core/pitch.js` already passes
±15¢-accuracy and harmonic-lock tests — **do not replace without evidence.**
https://github.com/sevagh/pitch-detection · https://ryukau.github.io/filter_notes/pitch_estimation/pitch_estimation.html

### 4.2 Capture & browser plumbing. **[strong]**
- **`getUserMedia({audio:{channelCount:1, echoCancellation:false, noiseSuppression:false,
  autoGainControl:false}})`** — all three DSP features **OFF**: they distort or gate the
  very pitch/level information we measure (AGC pumps amplitude; noise-suppression can chew
  sustained tones; note Chrome couples AGC to echoCancellation). Already done in
  `ensureMic`. https://blog.addpipe.com/getusermedia-audio-constraints/
- **`AnalyserNode.getFloatTimeDomainData`, fftSize 2048** (already used). This is adequate
  and simplest; **AudioWorklet** is the upgrade path for tighter latency/off-main-thread
  analysis if the UI thread ever stalls the needle — not needed for v1.
- **iOS/Safari:** create/resume `AudioContext` **inside a user gesture**; request the mic
  inside the button tap; watchdog a dead stream and route to fallback. All already handled
  (project's hard-won audio lessons). https://developer.mozilla.org (AudioContext resume)

### 4.3 Tolerances, octave handling, stability. **[moderate → engineering]**
- **Tolerance:** human pitch **JND** is ~5–25¢, but *singers naturally deviate more*, so a
  studio-tuner window would be cruel to a beginner. Recommendation: **±50¢ = "on pitch"
  (hit)**, **±51–100¢ = "close" (near)** — this is what `gradeSungPitch` already does and
  is a fair, meaningful learner window. **Tighten per level:** S1–S8 accept `near` as a
  pass and credit `octave` fully; S9+ require `hit` and correct octave. (Confidence:
  moderate — validate the exact numbers with real users in the first slice.)
- **Octave-agnostic matching:** compare **pitch class (cents mod 1200)**; an `octave`
  verdict (±1200¢ ± band) is credited with "right note, different octave." Essential for
  beginners and men (§1.4); already implemented.
- **Sustained vs transient:** require a **held** tone — a valid detection needs enough
  voiced frames (e.g. ≥8 voiced frames over a ~0.8–1.5 s window) before grading; ignore the
  attack transient.
- **Stability / debounce (no jitter):** **RMS silence gate** (already: ~−44 dBFS floor) →
  per-frame **clarity/confidence gate** (already: peak-clarity threshold) → **median f0
  over voiced frames** in the capture window (already: `medianPitch`). For a **live needle**,
  additionally smooth with a short moving median/EMA and a small dead-zone so the needle
  doesn't flicker ±a few cents. Show *direction* ("a bit flat ↑") not raw numbers to a
  beginner.
- **Octave-error guard:** the shortest-lag-peak rule in `detectPitch` prevents the classic
  autocorrelation half-frequency lock; keep the harmonic-lock unit test as a regression gate.

**Concrete v1 numbers:** mono, DSP off; fftSize 2048; ~40 ms frames; 0.8–2.5 s capture per
sung note; 80–1000 Hz search band (covers low male ~C2≈65 Hz? → widen `minHz` to ~65 for
deep basses; default 80 is fine for most); ±50¢/±100¢ grading bands, per-level tightening;
median-of-voiced-frames + EMA-smoothed needle.

---

## 5. First-slice build recommendation (prove the loop before building the ladder)

Build the **smallest thing that proves mic-verified singing works end to end** — the
owner's exact two-step flow — reusing the existing SING machinery:

**Slice 1 — "Match & interval" prototype (S1 + S5):**
1. **Find-your-voice probe** (onboarding §1.5): match one mid tone → infer octave →
   bracket comfortable range. Reuse `captureSungFrames` + `detectPitch` + `medianPitch`.
2. **S1 Match one note:** play a reference in the student's octave; live needle; grade
   ±50¢ octave-agnostic; "held it!" on ≥0.8 s stable. Reuse `gradeSungPitch`.
3. **S5 Named interval over a drone:** sustain the tonic drone, give the start note, prompt
   "sing a major 3rd up," grade the landing. Reuse `playNote` drone + the SING renderer.
4. **Consent + self-check fallback** and the **fake-media headless test** — reuse verbatim
   from the Interval Gym so the loop is CI-verified without a human mic.

This slice reuses ~everything and directly demonstrates the vision sentence. **Validate the
tolerance bands and the range probe with a handful of real singers** (including a
self-described "tone-deaf" one and a deep male voice) before committing the full S1–S14
ladder. Only after the loop feels fair and motivating do we build out the curriculum data
and the remaining renderers.

---

## 6. Risks & open questions

| Risk / question | Note / mitigation |
|---|---|
| **Drone under the voice hurts detection** | A tonic drone playing *while* the student sings adds a competing periodicity. Mitigations: drop the drone an octave away from the sung range; duck/stop it during the graded capture (play → student sings in the gap); or bandpass around the expected sung f0. `INTERVAL_GYM_SPEC.md` §10 flags this exact open question — **decision needed**: sustained-under-voice (nicer pedagogy) vs sound-then-sing-in-silence (easier detection). Lean: **sound-then-sing** for graded reps, sustained drone for free practice. |
| **Cheap/laptop mics, room noise, breathiness** | Median-over-frames + clarity gate + RMS floor already handle most; if field data shows low-male octave errors, upgrade to MPM/pYIN (§4.1). Keep noiseSuppression OFF but consider a gentle high-pass to kill rumble. |
| **Tolerance calibration** | ±50/±100¢ is a reasoned default, not measured for *our* users — **instrument it** in the first slice and tune. [gap] |
| **Range probe failure for true amusics (~1.5%)** | A tiny minority genuinely can't perceive/produce; the app must **fail gracefully** — never trap them; offer perception-only games and generous self-check; frame as "voices vary." Do not diagnose. |
| **Sing-back memory harm** | The melodic research warns forced sing-back can overwrite memory on LONG material — so S8 echo stays **short-span (3–4 notes)**, opt-in (memory + `MELODIC_DICTATION_RESEARCH.md` §2.4). |
| **Account blob overwrite** | StaffCommander `player_save` OVERWRITES the whole `data` jsonb — SingQuest progress **must be namespaced/merged** or it wipes MelodyQuest/BeatQuest saves (memory). |
| **Motivation under exposure** | Enforce: nothing recorded/uploaded (live, discarded); needle not verdict; generous early bands; growth-mindset copy; short daily sessions; octave credit. (§1.6) |
| **Naming** | "SingQuest" fits the family; owner to confirm (vs "VoiceQuest", etc.). |
| **Fixed-do vs movable-do default / minor syllables** | Recommend movable-do + LA-based minor as defaults (both implemented); expose the fork. Owner to confirm. |
| **Rhythm grading at S9+** | Per memory (*rhythm graded progressively*): pitch-only early, timing added at higher sight-singing levels. Confirm where the timing gate turns on. |

---

## 7. What NOT to build (or the app gets worse)

- **Don't punish octave matches** — they're correct responses (§1.4).
- **Don't use a studio-tuner tolerance** for beginners — ±50¢ hit, generous early (§4.3).
- **Don't force long sing-back** — short-span, opt-in only (§6).
- **Don't ship perception-only "click the answer" as the core** — it doesn't train the
  production bottleneck that makes most people "tone-deaf" (§1.1). Perception drills are a
  *supplement*, not the spine.
- **Don't ask for notes outside the student's probed range** — guaranteed shame (§1.5).
- **Don't diagnose "tone-deafness"** — 1.5% real vs ~10–15% untrained; assume trainable.

---

## 8. Decisions needed from the owner

1. **Ladder shape:** approve S1–S14 (and the "Find your voice" onboarding), or adjust the
   number/order of rungs? (I lean: approve as the spine — it stacks cleanly on the melodic
   curriculum and hits the vision sentence at S1+S5.)
2. **Drone-under-voice vs sound-then-sing** for graded reps (§6). (I lean: sound-then-sing
   for grading, sustained drone for free practice.)
3. **First slice scope:** build the S1+S5+range-probe prototype and validate tolerances
   with real singers before the full ladder? (Recommended.)
4. **Defaults:** movable-do + LA-based minor as ship defaults, fork exposed? Confirm.
5. **Name** (§8 table) and **where in the suite UI** it launches from.
6. **Rhythm/timing gate** onset level for S9+ (pitch-only vs timing-graded).

---

## Addendum (2026-07-06) — deep competitor survey, confirmations + two honest caveats

A follow-up survey of the mic-graded field (SingTrue, Sing Sharp, Vanido, Singing Carrots,
EarMaster, Auralia, Sight Reading Factory, Yousician, Sight Singing Pro, Perfect Ear;
perception-only: Tenuto, Functional Ear Trainer, Teoria, Complete Ear Trainer; tuners:
Vocal Pitch Monitor, Pano Tuner) **confirms the wedge** and sharpens it:

- **Confirmed ownable gap = GENTLE FAILURE / coaching-on-miss.** *Essentially no one* does it.
  SingTrue actively punishes (a "3 lives" limit), Perfect Ear marks brittle/vibrato attempts
  wrong, Vanido gives no instruction when you miss, and the strong trainers (EarMaster,
  Auralia, Sight Reading Factory) assume you can already read+sing. **This directly validates
  our hint-ladder coaching spine as THE differentiator** (build plan §2.2), not a nice-to-have.
- **Caveat 1 — octave-agnostic is NOT unique.** **EarMaster already auto-transposes the sung
  octave to the question's octave.** So octave-forgiveness (§1.4) is table stakes vs. the
  serious incumbent, not a moat. It's still essential for our beginners; just not a bragging point.
- **Caveat 2 — two apps overlap our "functional + mic sight-singing" niche.** *Sight Singing
  Pro: Solfège* (green/red mic grading, movable/fixed-do, all 12 keys) and *Sight Reading
  Factory* (green/red/orange auto-assessment + endless generator) both grade sung notation.
  Neither has a **from-zero "tone-deaf" on-ramp, functional drone-degree method for beginners,
  or gentle coaching remediation** — but they narrow the "nobody does functional + mic" claim.
  Also note *Singing Carrots* is the closest "meet the voice where it is" (single notes before
  sequences) besides SingTrue; both are thin.
- **Net:** the defensible combination stands — **from-zero + mic-verified at every rung +
  functional/scale-degree + octave-forgiving + GENTLE/coaching failure + suite-integrated** —
  but the honest headline differentiators are the **from-zero tone-deaf on-ramp** and the
  **coaching remediation**, NOT octave-credit alone. Phase 0 must *feel* more coached than
  EarMaster's singing module or the wedge is thin (build plan §1.4).

## Sources

Peretz & Vuvan 2017 (amusia prevalence ~1.5%) https://pmc.ncbi.nlm.nih.gov/articles/PMC5437896/ ·
Peretz 2016 neurobiology review https://peretzlab.ca/wp-content/uploads/2020/12/peretz_i-_2016_tics.pdf ·
Pfordresher & Brown 2007 *Poor-pitch singing in the absence of "tone deafness"*
http://www.acsu.buffalo.edu/~pqp/pdfs/Pfordresher&Brown_2007_MP.pdf ·
Pfordresher et al. — vocal-motor control of pitch https://link.springer.com/article/10.3758/s13414-014-0732-1 ·
Disorders of pitch production (review) https://pmc.ncbi.nlm.nih.gov/articles/PMC3140645/ ·
Pfordresher & Greenspon 2025 — pitch range in accuracy training
https://journals.sagepub.com/doi/10.1177/10298649241289542 ·
Live/baritone voice model improves matching https://www.sciencedirect.com/science/article/abs/pii/S0892199713000027 ·
Karpinski *Aural Skills Acquisition* (OUP 2000)
https://global.oup.com/academic/product/aural-skills-acquisition-9780195117851 · Butler review
https://digitalcollections.lipscomb.edu/jmtp/vol14/iss1/9/ ·
Gordon Music Learning Theory / audiation, LA-based minor https://en.wikipedia.org/wiki/Gordon_music_learning_theory ·
https://www.allianceamm.org/resources/gordon/ ·
Functional/drone scale-degree training https://tonedear.com/ear-training/functional-solfege-scale-degrees ·
https://www.demomentor.com/reviews/sonofield-ear-trainer ·
SingTrue (mic pitch feedback for "tone-deaf") https://www.musical-u.com/apps/singtrue/ ·
Vanido / Sing Sharp comparison https://singingcarrots.com/blog/top-7-ai-vocal-coaches/ ·
Pitch-detection algorithms (MPM/YIN/pYIN, voice) https://github.com/sevagh/pitch-detection ·
https://ryukau.github.io/filter_notes/pitch_estimation/pitch_estimation.html ·
getUserMedia audio constraints (DSP off for pitch) https://blog.addpipe.com/getusermedia-audio-constraints/ ·
Growth-mindset / MPA for singers https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2024.1386559/full ·
ACT for music-performance anxiety https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7272702/ ·
Companion in-repo: `MELODIC_DICTATION_RESEARCH.md`, `MELODIC_LADDER_EXPANSION_PLAN.md`,
`INTERVAL_GYM_SPEC.md` (§5.4 SING station), `MELODIC_ENGINE_SPEC.md`, `core/pitch.js`.
