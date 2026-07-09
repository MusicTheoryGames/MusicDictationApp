# BeatQuest Casual — Tapping build plan

Short plan (do NOT build yet). Goal: give BeatQuest Casual a **base one-hand rhythm-in-time
mode** and a **higher-level two-hand rung** (steady beat + rhythm), reusing the existing
tap-back engine — not reinventing it.

Owner design being incorporated:
- Base/default: ONE hand, tap the rhythm, graded on timing vs the metronome.
- Higher levels: TWO hands, dead-simple quarter pulse in one hand + rhythm in the other; beat-hand
  graded leniently → strict (encouraged → required) on the heavy-early/strict-late curve; the jump
  is a TAUGHT moment; touchscreen needs a real two-zone ergonomic layout.

---

## 1. Current state (what's built vs not)

### The tap engine already exists and is strong (`solo-mode.js`)
- **Two-zone tap-back is fully built and graded.** `TB` state machine (`solo-mode.js:1378–1416`):
  count-off → `capture` on the final downbeat, single audio-clock metronome as the one timing
  reference, `TAP_TOLERANCE = 0.12s` (`:1365`), `TAP_LATENCY` tunable (`:1373`).
- **Both hands are graded today.** `scoreTapBack()` (`solo-mode.js:2212–2330`): rhythm zone is
  per-beat all-or-nothing; **beat zone is already graded LENIENTLY — "one slip allowed per measure"**
  (`:2210`, beat-hand block `:2279`, `beatOk = beatHits >= beatBeats - 1` at `:2303`). This is exactly
  the owner's "grade the beat-hand leniently at first" — the leniency knob exists.
- **Two tap zones + hand-swap already built.** `#tbBeat` "Beat / left hand" + `#tbRhythm`
  "Rhythm / right hand" (`:1440–1441`); `applyTapOrient()` (`:2708–2731`) flips which SCREEN SIDE
  each zone sits on (`S.tapOrient` `BL`/`BR`, `:16`) — presentation only, scoring untouched.
- **Hand-swap is wired into the mastery/capstone gate** (`:497–530`, `:631–632`): a single-line
  tapping level requires clearing the capstone in BOTH orientations; the gate forces the other hand.
- **Bonus scoring:** `TB_BONUS_PER_MEASURE = 25` (`:1415`) per clean-and-steady measure.
- **Tap-along (first-listen) is built** (`tapAlongApplies()` `:1262`, `showTapAlong()`/`scoreTapAlong()`
  `:1264–1310`): dots under each beat on the FREE first listen, soft-scored (5 pts/beat, never blocks).
  Gated to guided **Levels 1–3** (`TAPALONG_MAX_IDX = 2`, `:1261`). Owner's belief here is correct.

### `tapping.html` is the standalone two-hand tapping game — REUSE THIS ENGINE
- `?mode=tapping` boots `startTapping()` → `S.mode='tapping'` (`solo-mode.js:4655`, `:4684–4686`).
- Runs the inline two-zone perform panel every round (`newTappingRound` → `openTapBack(true)`),
  drives the `tapping` ladder (`ladderForMode('tapping')`), and uses the hand-swap + mastery gate above.
- **So a working two-hand tapping engine already ships.** The two-hand rung must REUSE this, not rebuild.

### What is NOT built
- **There is NO one-hand mode.** The tap-back panel ALWAYS renders both Beat + Rhythm zones
  (`#tbBeat` is never hidden — grep shows no hide/one-hand path). The owner's "base = one hand" does
  not exist yet as a mode; it needs a **beat-zone-off** variant of the existing engine.
- **Beat-hand grade does not RAMP.** Leniency is a single fixed rule (one slip/measure); there's no
  encouraged→required progression by level.
- **BeatQuest Casual does not use tapping at all.** `beatquest-casual.html` loads the same three files
  but only ever runs **dictation**: it reads `ladderForMode('dictation')` and `beatquest-guided-dictation`
  (`:1690`, `:1731`, `:1645`) and never sets `S.mode='tapping'`. Free-play sets figures/meter but not
  the tapping mode (`solo-mode.js:4588–4596`). Tap-back is available only as the optional post-answer
  bonus, not as the play mode.
- **Tap-back GATE (must tap it back to advance)** — not built (matches owner's belief). Tapping is a
  bonus/standalone-mode, never an advancement gate inside Casual.

---

## 2. Gap analysis (reuse-first)

To deliver base = one-hand-rhythm-in-time and two-hand = higher rung in Casual:

1. **Add a one-hand ("Rhythm only") variant to the shared tap-back engine** (`solo-mode.js`).
   Reuse the entire `TB` machine + `scoreTapBack()`; add a flag (e.g. `TB.beatHand = false`) that
   (a) hides `#tbBeat` and widens `#tbRhythm` to a single full-width pad, (b) skips the beat-hand
   grading block (`:2279–2303`) so a measure passes on rhythm alone. The metronome still runs as the
   timing reference — the student taps the rhythm against it (this IS the owner's timing-vs-metronome
   grading; it already exists on the rhythm zone). No new grader.

2. **Turn tapping ON in BeatQuest Casual.** Mirror `tapping.html`'s boot: run Casual rounds in
   `S.mode='tapping'` with the inline perform panel, driving a Casual tapping ladder. Default the new
   `TB.beatHand=false` (one-hand) for early/most levels.

3. **Two-hand rung = the EXISTING two-zone engine, gated to later Casual levels.** Flip
   `TB.beatHand=true` at the chosen level threshold — this re-enables the already-built Beat zone,
   hand-swap, and lenient beat grading. No new engine code; it's a per-level switch on what already ships.

4. **Beat-hand grade ramp (encouraged → required).** Parameterize the existing beat-hand block: add a
   level-driven mode — `off` (one-hand) → `encouraged` (beat tracked, shown as feedback, does NOT block
   the measure pass) → `required` (current `beatHits >= beatBeats-1` rule blocks the pass). One small
   change to the pass condition at `:2302–2303`, reading a per-level setting.

5. **Taught-moment intro for the two-hand jump.** Reuse the existing teach/warm-up modal
   (`maybeTeachThisRound`, teach-content) to show a one-time "now keep the pulse going too" screen at
   the threshold level — same pattern as the tap-along intro. Content only, no engine.

6. **Touchscreen two-zone ergonomics.** The landscape two-pad layout already exists in the tap-back
   CSS (`.tb-zones` side-by-side, landscape media queries `:3955–3988`). One-hand mode reuses it as a
   single centered pad. Verify pad sizes/hold in Casual's skin; this is CSS/skin work, not new logic.

**Reuse verdict:** everything the owner wants is a thin configuration layer over the shipped engine —
one new one-hand flag, a beat-grade ramp parameter, a per-level threshold, and a teach screen. No new
tap engine, no new grader, no reinvented two-hand mode.

---

## 3. Phased build order (small verifiable chunks)

- **P0 — Confirm & wire.** Boot Casual rounds through the tapping engine (mode='tapping') behind a
  flag; verify the existing two-zone panel renders and grades in the Casual skin. [verify: a Casual
  round performs + scores]
- **P1 — One-hand mode.** Add `TB.beatHand=false`: hide Beat zone, full-width Rhythm pad, skip
  beat-grading; make it the Casual default. [verify: one-pad round, rhythm-vs-metronome score correct]
- **P2 — Beat-grade ramp param.** Add `off/encouraged/required` to the beat-hand pass condition,
  driven by a per-level setting (default `off`). [verify: encouraged shows beat feedback but never
  fails the bar; required behaves like today]
- **P3 — Two-hand rung on later levels.** Set the level threshold that flips `beatHand=true` +
  `encouraged`→`required` progression. [verify: early levels one-hand, capstone/late levels two-hand]
- **P4 — Taught moment.** One-time teach screen at the two-hand threshold. [verify: intro fires once]
- **P5 — Ergonomics/skin polish.** One-hand pad + two-pad landscape sizing in the Casual skin;
  device-hold guidance. [verify on a phone in landscape]

Each phase: build → re-run + adversarial review → deploy to roadtest → log. One phase at a time.

---

## 4. Open decisions for the owner (do not decide alone)

1. **Which Casual levels turn on the two-hand rung.** Casual skews easy — likely only the later
   levels / capstone. Owner to name the threshold level(s) (and whether it maps to specific Hall
   chapters or a fixed Casual level index).

2. **Touchscreen two-zone layout.** Confirm the two-pad ergonomic answer: two large left/right pads,
   two-thumb landscape hold? Where does the one-hand pad sit (centered vs dominant-hand side)? Any
   device-orientation lock/prompt for the two-hand rung?

3. **Beat-hand grade ramp shape.** Where does it go `encouraged → required` — at the same level the
   beat-hand turns on, or a level or two later? What lenient tolerance at `encouraged` (keep one
   slip/measure, or looser), and does `required` tighten beyond the current one-slip rule?
