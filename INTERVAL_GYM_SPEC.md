# INTERVAL GYM — implementation & integration specification (v1)

Companion to `INTERVAL_TRAINING_RESEARCH.md` (the evidence and market case) and
`MELODIC_RENDERER_SPEC.md` / `MELODIC_ENGINE_SPEC.md` (the contracts this reuses).
Status: **specification for owner review — no code ships until approved.** Every
API named below either exists today (marked ✓, with its real location) or is
declared as NEW with its full contract.

Design principles carried over unchanged: renderers touch only `ctx.services`;
no colors/emoji in JS; deterministic under seeds; accuracy-graded and untimed;
no leaderboards; mastery is sticky, score is volatile; every phase ships only
with tests green, screenshots examined, and a production deploy.

---

## 1. Product placement — how the Gym ties into the game

**Entry point.** A `Gym` button in melodic-game.html's controls row (beside
"About this level" / "Placement test"). Hidden until the guided ladder reaches
**M7** — the level where 3rds arrive (`melodicLevel('m7')` ✓) — because the Gym
drills the ladder's own leap vocabulary and must never introduce material the
student hasn't met. Under the kids theme (`kidsActive()` ✓ in melodic-game.html)
the Gym stays visible but opens in guided order only (no free interval pick),
mirroring the kids-mode rule for the level picker.

**Relationship to the ladder.** The Gym is a PRACTICE SIDE-MODE. It never gates
ladder advancement and ladder progress never depends on it (the locked
degree-jump curriculum decision stands). The coupling is one-directional:
- the ladder's current level determines which interval circuits are UNLOCKED;
- Gym mastery feeds the shared spaced-review queue and the shared game economy.

**Unlock map** (interval circuit → unlocking ladder level, from each level's own
`pitch.leaps` in core/melodic-curriculum.js ✓):

| Circuit | Leap vocab id (✓ LEAP_DEGREE_SPAN) | Unlocks at |
|---|---|---|
| 3rds | `'3rd'` (span 2) | m7 |
| 4ths & 5ths | `'P4'`, `'P5'` (spans 3, 4) | m8 |
| Octaves & 6ths | `'P8'`, `'6th'` (spans 7, 5) | m12 |
| 2nds (as a named object) | `'step'` (span 1) | m14 |
| 7ths | `'7th'` (span 6) | m16 |
| Tritone & chromatic color | (not a leap — trained as the m18 passing-tone percept) | m18 |

**Screen flow.** Gym button → CIRCUIT BOARD overlay (one card per circuit:
mastery ring, lock state, "Enter") → circuit screen: five station chips
(FEEL/FIND/NAME/SING/USE) with per-station completion, the active station's
exercise mounted below via the standard renderer contract. Back exits to the
ladder exactly where the student left it (`startRound()` ✓).

---

## 2. Data model & persistence

**Own storage key: `melodic-gym-v1`** (not inside `melodic-guided-v1`) so Gym
saves can never corrupt ladder saves and either can be reset independently.
Loaded/guarded exactly like the game's `load()` (✓ pattern in melodic-game.html):

```js
gym = {
  items: {                    // per (circuit × station) mastery, core/mastery.js items ✓
    '3rd:feel':  ItemState,   // createItemState()/recordAnswer()/viewItemAsOf() ✓
    '3rd:find':  ItemState,
    // … '<circuitId>:<stationId>'
  },
  circuitsCompleted: [],      // circuit ids whose capstone passed (see §6)
  micConsent: null,           // null=unasked · true · false (SING fallback selector)
  version: 1,
}
```

**Spaced review integration.** On circuit completion, ONE review entry per
circuit — `review.createEntry('gym:3rd', now)` (✓ core/review.js) — scheduled a
box-1 interval out (the same first-review rule the ladder uses ✓). Due gym
reviews surface in the game's existing review-first flow: `newRound()`'s due
check (✓) gains a branch — a due `gym:*` skill mounts that circuit's NAME
station as the review round (one station, not the whole circuit; retention
probe, not a re-grind).

**Determinism.** Every station item derives from a seed
(`Math.floor(Math.random()*1e6)` at round start, then pure) so any reported
round is reproducible; the test seam exposes `lastGymRound` alongside
`lastRound` (✓ pattern).

---

## 3. Engine additions — `core/gym.js` (NEW, pure, tested)

A small pure module in the core/ style (no DOM/audio):

```js
// Which circuits are unlocked at a ladder index (data above, encoded once).
gymCircuitsFor(levelIdx) -> [{id:'3rd', label:'3rds', leapIds:['3rd'], unlockLevel:'m7'}, …]

// One FEEL/NAME item: a degree pair in key context forming the target interval.
// PURE selection from the in-range degree-pair table; deterministic under seed.
gymPairItem({circuitId, key, mode, range, seed, direction:'asc'|'desc'|'either'})
  -> { fromDegree, fromOct, toDegree, toOct, midiFrom, midiTo,
       intervalLabel,          // 'major 3rd' | 'minor 3rd' | 'perfect 4th' …
       degreeLabel }           // '1̂ → 3̂' (built via labelNote ctx by the caller)
// Interval QUALITY math: semitones = midiTo - midiFrom mapped through the
// standard table {1:'minor 2nd', 2:'major 2nd', 3:'minor 3rd', 4:'major 3rd',
// 5:'perfect 4th', 6:'tritone', 7:'perfect 5th', 8:'minor 6th', 9:'major 6th',
// 10:'minor 7th', 11:'major 7th', 12:'perfect octave'} — the ladder's leap ids
// name degree SPANS (✓ LEAP_DEGREE_SPAN); the Gym is precisely where span
// meets QUALITY, so both labels are always shown together.

// Stream for FIND: a generated melody whose adjacent pairs contain >= minTargets
// occurrences of the circuit's interval; built by calling generateMelody ✓ with
// leaps constrained to ['step', <circuit leaps>] and retrying seeds (bounded,
// deterministic: seed, seed+1, … seed+k) until the count is met.
gymFindStream({circuitId, key, mode, range, hallRhythmRef, seed, minTargets:2})
  -> { melody, targetPairs: [ [i, i+1], … ] }   // index pairs forming the interval

// Micro-melody for USE: 3–5 notes containing the target interval once, with the
// SECOND note of that interval as the hidden index (feeds missing-note ✓).
gymUseRound({circuitId, key, mode, range, seed})
  -> { melody, hideIdx, targetPair: [a, b] }
```

`core/gym.test.js` gates (same discipline as every core module ✓): sweep 15+
seeds per circuit — pair items always in range/in key and truly the target
interval; find-streams contain ≥ minTargets and every listed pair really forms
the interval; use-rounds hide exactly the interval's second note; determinism;
unlock map matches the curriculum's own `pitch.leaps` (lockstep test, like the
hallRhythmRef lockstep test ✓).

---

## 4. Services additions (melodic-shell-services.js)

Two NEW members, following the existing raw-WebAudio house style
(`rawTone(freq, when, dur, type, gain)` ✓, `unlockAudio()` ✓ awaited-resume):

```js
// Key-establishing cadence: I – IV – V – I as block triads (three rawTones per
// chord at the same `when`), ~0.65s per chord, tonic octave from melody/key ctx.
// This is the Benbassat context-setter; the drone (playNote(tonicMidi, 3) ✓)
// remains available for the gentler FEEL station.
playCadence(key, mode, opts?) -> Promise

// Timbre roulette for NAME-station generalization: the existing voices the
// engine already produces (triangle+octave-partial ✓, plain sine, square at
// low gain) plus ±1 octave register shifts, selected by item seed.
playPairTimbred({midiFrom, midiTo, seed, gapMs=650}) -> Promise
```

No other services change. Every station renders through the existing surface
(`button`/`icon`/`label`/`renderStaffPartial`/`playNote`/`playDegrees` ✓).

---

## 5. The five stations — renderer contracts

All five are standard renderers (`create*(host, ctx) -> {destroy()}`,
`ctx.onResult` exactly once ✓ MELODIC_RENDERER_SPEC §1) mounted by the circuit
shell, with `ctx.gymItem` carrying the §3 item. Per-station specifics:

**5.1 FEEL — `createGymFeelRenderer`.** Drone (✓) establishes home; the pair
plays; the student answers TWO sensory prompts (no terminology): "closer or
farther apart than the last pair?" and "does the second note feel settled or
leaning?" (truth: settled = lands on 1̂/3̂/5̂ — the stability the ladder already
teaches at M0). Card flow copies the tonic-contour prompt loop (✓). 6 pairs per
round; accuracy = % correct.

**5.2 FIND — `createGymFindRenderer`.** Generalization of the existing
tap-stream (`createTapTargetGame` ✓, currently degree-targeted). REFACTOR NOTE
(reuse rule): extract its scheduling/tap-window/grading core into a shared
`createTapStreamGame(host, ctx, {isTarget(iPair), streamLabel})` used by BOTH
M0's degree hunt and the Gym's interval hunt — one implementation, two
predicates. Target predicate here: `targetPairs` from `gymFindStream` (§3); a
tap counts inside the window of the PAIR'S SECOND note (the moment the interval
becomes audible). Grading identical to M0's (hits − false taps) ✓.

**5.3 NAME — `createGymNameRenderer`.** `playCadence` (NEW §4) → pair via
`playPairTimbred` (NEW §4) → student answers BOTH: the degree pair (palette of
the circuit's candidate pairs, labels via `services.label`-style ctx ✓) and the
interval quality (two-button minor/major where applicable, single-button for
perfects). Both-correct = correct; per-part partial accuracy. 6 items per round,
timbre/register rotating per item.

**5.4 SING — `createGymSingRenderer`.** The production leg.
- Reference plays: tonic drone, then the FROM note; prompt: "sing UP a
  perfect 5th" (direction explicit).
- **Mic path** (gated on `gym.micConsent`): `getUserMedia({audio: {…mono}})` →
  `AnalyserNode.getFloatTimeDomainData` frames (2048 samples) → normalized
  autocorrelation f0 estimate per frame, 80–1000 Hz search band, per-frame
  confidence = peak clarity; sung pitch = median f0 over voiced frames in a
  2.5 s capture window; graded in CENTS against the target midi:
  within ±50¢ = hit, ±51–100¢ = near (half credit), else miss. Octave errors
  (±1200¢ ± 50¢) are scored as near WITH a dedicated message ("right note,
  different octave") — they are the most common honest error and must not read
  as total failure.
- **Fallback path** (mic denied/unavailable/Safari-blocked): sing-then-compare —
  the student sings unaccompanied on a visible 2.5 s meter, then the true target
  note plays, then the student self-reports match/near/miss. Still production;
  logged as `selfGraded: true` in meta so mastery weighting can discount it
  (recordAnswer already takes plain correct/incorrect ✓ — self-graded rounds
  record only on self-reported miss or hit, never "near").
- Safari note (hard-won this project ✓): request the mic INSIDE the button
  gesture; `audioContext.resume()` awaited before analysis; the silence
  watchdog pattern (✓) reused to detect a dead input stream and route to the
  fallback with an explanatory line rather than failing silently.

**5.5 USE — `createGymUseRenderer`.** Thin wrapper mounting the EXISTING
missing-note renderer (`createMissingNoteRenderer` ✓) with `gymUseRound`'s
melody + forced `hideIdx` (small change: missing-note accepts
`ctx.forceHideIdx`, defaulting to current `pickHideIndex` ✓ when absent). The
transfer measurement is its normal grading, unchanged.

---

## 6. Circuit shell, mastery, and economy

**Shell** (`melodic-gym.js`, app-layer, imported by melodic-game.html): renders
the circuit board + station chips; mounts stations; owns gym persistence.
Station order is fixed (FEEL→FIND→NAME→SING→USE) but completed stations stay
re-enterable.

**Mastery per station.** Each station round records into its
`'<circuit>:<station>'` item via `recordAnswer` ✓ (correct = station-specific
threshold: FEEL/NAME/FIND ≥ 5/6; SING ≥ 4/6 mic-graded; USE = its own correct).
Station chip shows its band via `levelFor(viewItemAsOf(item))` ✓.

**Circuit capstone & completion.** When all five stations reach the Proficient
band (80 ✓), a CAPSTONE lights: one mixed round (2 items from each station,
fresh seeds) that must be passed clean — the same band+capstone shape as the
ladder's own gate (✓ P1). Passing: circuit added to `circuitsCompleted`,
**+50 XP and gems per the standard mastery-event formula** (✓ LEVEL_SYSTEM
formulas in melodic-game.html), fanfare (✓ `playFanfare`), review entry (§2),
and a new achievement family (`gym-first`, `gym-3-circuits`, `gym-singer` =
first mic-graded perfect SING round — added to the declarative ACHIEVEMENTS
table ✓).

**Dailies.** The daily generator (✓ `dailyChallenges()`/fnv1a) gains a third
challenge TYPE once ≥1 circuit is unlocked: one date-seeded Gym station round.
No change to the streak/freeze rules.

---

## 7. Verification plan (gates per phase, all pre-existing harness patterns)

1. `core/gym.test.js` sweeps (§3) — added to the standard `node --test core/*`
   gate (must stay green alongside the existing 382).
2. Browser (puppeteer, ✓ harness): station-by-station drives using the truth
   seam (`lastGymRound`), screenshots of every station in MPC + Kids themes,
   examined — including the FIND stream mid-flight and the SING meter.
3. **Mic testing without a human**: Chromium's
   `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` flags
   feed a synthetic tone into getUserMedia — the pitch detector is asserted
   against the fake stream's known frequency, and the consent-denied path is
   tested with permissions revoked. Real-Safari mic behavior is owner-verified
   once on the established domain (the per-domain trust lesson ✓).
4. Regression: ladder flows untouched (level sweep ✓ pattern), ext-seam suite,
   M0 tap-stream still green after the §5.2 refactor (its M0 behavior is
   re-verified with the same timed-tap test used when it shipped ✓).
5. Production deploy + live cold-start check per the verify-as-the-user-meets-it
   rule (✓ memory).

## 8. Phased rollout (each phase independently shippable)

- **G1** core/gym.js + tests; circuit board UI behind the M7 unlock; FEEL + NAME
  stations (cadence + timbre services land here). Accept: both stations playable
  end-to-end, sweeps green, screenshots, deploy.
- **G2** FIND (tap-stream refactor shared with M0) + USE (missing-note reuse).
  Accept: M0 regression + both new stations verified.
- **G3** SING with full mic pipeline + fallback + fake-media tests. Accept:
  fake-stream pitch assertions, denied-path fallback, Safari owner check.
- **G4 — DONE** (build AG; brought to LITERAL spec in build AH). Capstone +
  economy + review + dailies + achievements, all production-verified:
  all-station-Proficient gate → clean mixed chain (2 items from EACH station —
  FEEL/NAME/SING 2 items, FIND stream carrying ≥2 target detections, USE runs
  TWO rounds; 6 steps for a 5-station circuit) → circuitsCompleted + **+50 XP and
  gems via the IDENTICAL mastery-event formula the ladder uses** (`masteryEventGems(capstoneScore, 1)`;
  capstoneScore = 100/clean step) + fanfare + gym-first/gym-3-circuits/gym-singer
  achievements. FIND station threshold is **≥ 5/6** (createTapStreamGame passRatio;
  the capstone demands a clean/perfect FIND). SPACED REVIEW (§2): completion adds
  one `gym:<circuit>` review entry a box-1 interval out; `newRound()`'s due check
  surfaces it as that circuit's NAME station (mountGymStation) and grading advances
  the Leitner box. DAILIES (§6): once ≥1 circuit is unlocked the third daily is a
  date-seeded Gym NAME-station round (same +10 gems/+5 XP/+150/streak reward).
- **G5 — DONE** (build AG). Theme sweep (Ink/Kids/MPC + mobile 390px screenshots
  EXAMINED — gym board single-columns, stations + protonotation + chunk drill
  legible on white cards with themed buttons, zero page errors); docs synced
  (this spec's G-status, EXECUTION_PLAN §D G1-G5, MELODIC_ENGINE_SPEC enum);
  memory closed. Kids stays guided-parity as the shipped Gym/Studio already do;
  the free side-mode buttons remain visible in kids theme (revisit if the owner
  wants kids fully guided-only).

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Mic privacy discomfort | consent asked in-context with a plain sentence, never at boot; `micConsent:false` is a first-class, permanent, fully-featured path (fallback ≠ punishment) |
| Autocorrelation octave errors | dedicated near-scoring + message (§5.4); median-over-frames; confidence gating |
| Safari mic quirks | gesture-scoped request, awaited resume, watchdog reroute (all patterns already proven here) |
| FIND stream too hard at unlock | minTargets=2 and stream length ≤ 10 at first; difficulty scales with station mastery band like M0's stages (✓ pattern) |
| Scope creep | the five stations and §8 phases are the whole of v1; anything else goes to this doc first (EXECUTION_PLAN rule 1 applies) |

## 10. Open items for the owner
1. Approve/adjust the unlock map (§1) and station thresholds (§6).
2. SING voice: is unaccompanied singing acceptable for v1, or must the drone
   sustain under the student's voice (harder detection, nicer pedagogy)?
3. Naming: "Interval Gym" as the student-facing name, or something in the
   BeatQuest/MelodyQuest family (e.g. "IntervalQuest")?
