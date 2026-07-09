/**
 * @file core/singquest.js
 * @module core/singquest
 *
 * Pure per-level grading for SingQuest — the mic-verified sight-singing app
 * (SIGHT_SINGING_BUILD_PLAN.md §4.1). A thin, tested wrapper over the cents math
 * in core/pitch.js that adds LEVEL-DEPENDENT tolerance:
 *   - early production/ear levels (S1–S8) are generous and OCTAVE-FORGIVING —
 *     a right-pitch-class/wrong-octave match is credited as a pass, and a "near"
 *     just outside the hit window still passes (anti-shame, research §1.4/§1.6);
 *   - sight-singing levels (S9+) tighten the window and REQUIRE the correct
 *     octave (research §2, ladder notes).
 *
 * No DOM, no WebAudio, no mutation of core/pitch.js's tested functions — this is
 * unit-testable with plain numbers. The raw detector + median live in core/pitch.js.
 */

import { midiToHz, centsBetween } from './pitch.js';

/**
 * Level band presets. `hit`/`near` are cents half-windows (absolute); an
 * `octave` verdict is a right-pitch-class match within `hit` cents of an
 * octave-equivalent. `octaveCredit` = treat that octave match as a PASS;
 * `nearIsPass` = treat a `near` (just outside `hit`) as a PASS (generous early).
 * @typedef {{hit:number, near:number, octaveCredit:boolean, nearIsPass:boolean}} SingBand
 */

/** @type {Record<string, SingBand>} */
export const SING_BANDS = {
  // S1–S8: pure production + functional ear. GENEROUS + octave-forgiving.
  // Early first-lesson levels are deliberately forgiving (anti-shame, research
  // §1.4/§1.6): the `hit` window is WIDE (±90¢ — nearly a semitone) so anyone
  // "somewhat close" is credited as ON the note, `near` extends to ±180¢, and a
  // `near` still auto-passes. This is the "anywhere near the note = matched"
  // coarse rule the owner requires — see coarseVerdict().
  generous: { hit: 90, near: 180, octaveCredit: true, nearIsPass: true },
  // Transition: still octave-forgiving, but `near` no longer auto-passes.
  standard: { hit: 50, near: 100, octaveCredit: true, nearIsPass: false },
  // S9+: real sight-singing. Tight, correct octave required.
  strict: { hit: 50, near: 100, octaveCredit: false, nearIsPass: false },
};

/**
 * Map an S-level (number `1`, or id like `'S9'`/`'s9'`) to its band preset.
 * S1–S8 → generous; S9+ → strict. Unknown/naN → generous (safe, forgiving).
 * @param {number|string} level
 * @returns {SingBand}
 */
export function bandsForLevel(level) {
  const n =
    typeof level === 'number'
      ? level
      : parseInt(String(level).replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(n)) return SING_BANDS.generous;
  return n <= 8 ? SING_BANDS.generous : SING_BANDS.strict;
}

/**
 * Grade a sung frequency against a target MIDI with LEVEL-dependent bands.
 * Mirrors core/pitch.js `gradeSungPitch` (same cents/octave math) but the
 * hit/near thresholds and what counts as a PASS come from `bands`.
 *
 * @param {number} targetMidi   the target note (MIDI number)
 * @param {number} sungHz       the detected sung fundamental (Hz)
 * @param {SingBand} [bands=SING_BANDS.generous]
 * @returns {{verdict:'hit'|'near'|'octave'|'miss', cents:number, octaveCents:number, pass:boolean}}
 *   `cents` = signed distance to the target (+ = sharp); `octaveCents` =
 *   distance to the nearest octave-equivalent (0 = same pitch class);
 *   `pass` = whether this counts as a success at this level.
 */
export function gradeForLevel(targetMidi, sungHz, bands = SING_BANDS.generous) {
  const targetHz = midiToHz(targetMidi);
  const cents = centsBetween(targetHz, sungHz);
  const abs = Math.abs(cents);
  // Distance to the nearest octave-equivalent of the target (mod 1200).
  const mod = abs % 1200;
  const octaveCents = mod > 600 ? 1200 - mod : mod;

  let verdict;
  if (abs <= bands.hit) verdict = 'hit';
  else if (abs <= bands.near) verdict = 'near';
  else if (octaveCents <= bands.hit) verdict = 'octave';
  else verdict = 'miss';

  let pass;
  if (verdict === 'hit') pass = true;
  else if (verdict === 'near') pass = !!bands.nearIsPass;
  else if (verdict === 'octave') pass = !!bands.octaveCredit;
  else pass = false;

  return { verdict, cents, octaveCents, pass };
}

/* ==========================================================================
 * COARSE feedback (owner-mandated) — collapse the fine cents/verdict into the
 * ONLY three states the UI is ever allowed to show:
 *   'matched'   — you've got it. GENEROUS: a hit, a near, OR an octave match
 *                 (in an octave-crediting band) all read as matched. Anywhere
 *                 near the note is a match.
 *   'close'     — almost; a small nudge (up/down) gets you there.
 *   'way-off'   — truly off; listen again, then come closer.
 * NEVER surfaces cents, needle position, or any numeric pitch readout — the
 * renderer must render only these three words/colors. The `dir` field carries
 * ONLY a coarse direction ('up'|'down'|null) for the "a little higher/lower"
 * phrase, derived from sign, never a magnitude.
 * ======================================================================== */

/** @typedef {'matched'|'close'|'way-off'} CoarseState */

/**
 * Collapse a graded reading into a coarse three-state verdict for the UI.
 * @param {number} targetMidi
 * @param {number} sungHz
 * @param {SingBand} [bands=SING_BANDS.generous]
 * @returns {{ state:CoarseState, dir:('up'|'down'|null) }}
 *   `state` is the only thing the UI shows; `dir` is a coarse up/down for
 *   the "close" nudge phrase (null when matched or when direction is moot).
 */
export function coarseVerdict(targetMidi, sungHz, bands = SING_BANDS.generous) {
  const g = gradeForLevel(targetMidi, sungHz, bands);
  // Anywhere near the note counts as matched: a passing verdict (hit/near/octave
  // per the band) is 'matched'. Octave matches are matched WITHOUT a direction
  // (the pitch class is right).
  if (g.pass) return { state: 'matched', dir: null };
  // Not a pass. If we're within the wider `near` window (or an octave-equivalent
  // is), it's 'close' with a coarse nudge; otherwise 'way-off'.
  const absCents = Math.abs(g.cents);
  const closeWindow = Math.max(bands.near, bands.hit) + 120; // a forgiving "almost" ring
  const isClose = absCents <= closeWindow || g.octaveCents <= closeWindow;
  if (isClose) {
    // +cents = sharp -> nudge DOWN; -cents = flat -> nudge UP. Direction only.
    const dir = g.cents > 0 ? 'down' : 'up';
    return { state: 'close', dir };
  }
  return { state: 'way-off', dir: null };
}

/** Human, cents-free phrase for a coarse state (the ONLY judgment copy shown). */
export function coarsePhrase(state, dir) {
  switch (state) {
    case 'matched': return "you've got it";
    case 'close':
      return dir === 'down' ? 'almost — a little lower' : 'almost — a little higher';
    case 'way-off': return 'way off — listen again';
    default: return '';
  }
}

/* ==========================================================================
 * Hint-ladder rung sequence (pure) — SIGHT_SINGING_BUILD_PLAN.md §2.2.
 * The renderer (singquest-renderers.js) drives audio/DOM; the ESCALATION order
 * and the direction copy are pure and unit-tested here so the coaching contract
 * can't silently regress. Rungs are 1-based to match the plan's enumeration.
 * ======================================================================== */

/** @type {ReadonlyArray<{id:string,n:number,label:string}>} */
export const HINT_RUNGS = Object.freeze([
  { id: 'direction',     n: 1, label: 'Direction nudge' },
  { id: 'replay',        n: 2, label: 'Replay the target' },
  { id: 'sing-with-me',  n: 3, label: 'Sing with me' },
  { id: 'break-it-down', n: 4, label: 'Break it down' },
  { id: 'return-home',   n: 5, label: 'Return to home' },
  { id: 'fixed',         n: 6, label: 'You fixed it!' },
]);

/**
 * Given how many consecutive misses have occurred (1 = first miss), return the
 * escalating rung. Escalates direction(1) -> replay(2) -> sing-with-me(3) ->
 * break-it-down(4) -> return-home(5), then STAYS at return-home. Rung 6 ("fixed")
 * is only reached via a success and is NOT returned here.
 * @param {number} missCount  1-based count of consecutive misses.
 * @returns {{id:string,n:number,label:string}}
 */
export function nextHintRung(missCount) {
  const i = Math.min(Math.max(1, Math.floor(missCount)), 5) - 1;
  return HINT_RUNGS[i];
}

/** Rung-1 direction copy: DIRECTION not numbers (research §4.3). +cents = sharp. */
export function directionCopy(cents) {
  if (cents == null || !Number.isFinite(cents)) return 'steady';
  const abs = Math.abs(cents);
  if (abs <= 50) return 'in-zone';
  return cents > 0 ? 'sharp-down' : 'flat-up';
}

/* ==========================================================================
 * Find-your-voice range inference (pure) — SIGHT_SINGING_BUILD_PLAN.md §3, §5.
 * From a detected sung fundamental (Hz) and the mid reference we asked them to
 * match, infer the singer's octave and a comfortable {lowMidi, highMidi,
 * tonicOctave}. Octave-forgiving: we snap to the OCTAVE of the sung pitch class
 * nearest the reference so a man matching a high reference isn't pushed too high.
 * ======================================================================== */

/**
 * @param {number} refMidi   the mid reference note we asked them to match.
 * @param {number} sungHz    their detected fundamental (Hz).
 * @param {object} [opts]
 * @param {number} [opts.spanSemitones=9]  half-range around the matched centre.
 * @returns {{ matchedMidi:number, tonicOctave:number, lowMidi:number, highMidi:number, centsOff:number }}
 */
export function inferVoiceRange(refMidi, sungHz, opts = {}) {
  const span = opts.spanSemitones ?? 9;
  const sungMidiFloat = hzToMidiLocal(sungHz);
  const matchedMidi = Math.round(sungMidiFloat);
  const refHz = midiToHz(refMidi);
  const centsOff = centsBetween(refHz, sungHz);
  // The tonic octave is the octave the singer actually produced (their comfy centre).
  const tonicOctave = Math.floor(matchedMidi / 12) - 1; // MIDI octave number (C4 = 60 -> 4)
  const lowMidi = matchedMidi - span;
  const highMidi = matchedMidi + span;
  return { matchedMidi, tonicOctave, lowMidi, highMidi, centsOff };
}

/** Local hz->midi (avoids importing the whole detector; matches core/pitch.js). */
function hzToMidiLocal(hz) {
  return 69 + 12 * Math.log2(hz / 440);
}

/* ==========================================================================
 * 3-point vocal-range intake (pure) — replaces the fragile one-note probe.
 * The student sings their LOWEST comfortable note, a comfortable MIDDLE note,
 * and their HIGHEST comfortable note; we build a range tailored to them. Any
 * single point may be null (skipped/unclear) — we derive it from the others.
 * A single octave-slip on ONE reading can't wreck the whole range because we
 * clamp every point into a sung band and re-sort low<=mid<=high.
 * ======================================================================== */

/** Sane sung band for an intake reading: ~E2..E5. Low voices reach ~E2. */
const SUNG_LO = 40; // E2
const SUNG_HI = 76; // E5

/** Clamp a raw MIDI reading into the sung band and round; null stays null. */
function clampSung(m) {
  if (m == null || !Number.isFinite(m)) return null;
  return Math.max(SUNG_LO, Math.min(SUNG_HI, Math.round(m)));
}

/**
 * Build a comfortable vocal range from up to three sung readings.
 *
 * Each input is a detected MIDI number or null (skipped/unclear). We clamp every
 * reading into a sane sung band (~40..76 = E2..E5), derive any missing point
 * from the others, sort so low<=mid<=high, enforce a minimum usable span, and
 * place a comfortable tonic ~40% up the range (guaranteed within [low,high]).
 *
 * @param {object} pts
 * @param {number|null} [pts.lowMidi]   detected lowest comfortable note (MIDI) or null.
 * @param {number|null} [pts.midMidi]   detected comfortable middle note (MIDI) or null.
 * @param {number|null} [pts.highMidi]  detected highest comfortable note (MIDI) or null.
 * @returns {{ lowMidi:number, highMidi:number, tonicMidi:number, tonicOctave:number, matchedMidi:number }}
 */
export function buildVoiceRange({ lowMidi = null, midMidi = null, highMidi = null } = {}) {
  let lo = clampSung(lowMidi);
  let mid = clampSung(midMidi);
  let hi = clampSung(highMidi);

  // All null -> a safe, comfortable default centre (lo=55/G3, mid=60/C4, hi=67/G4).
  if (lo == null && mid == null && hi == null) { lo = 55; mid = 60; hi = 67; }

  // Derive any missing point from what we DO have (octave-forgiving defaults).
  if (mid == null) {
    if (lo != null && hi != null) mid = Math.round((lo + hi) / 2);
    else if (lo != null) mid = lo + 5;
    else mid = hi - 5; // hi != null here
  }
  if (lo == null) lo = (hi != null) ? Math.min(mid, hi - 5) : mid - 5;
  if (hi == null) hi = Math.max(mid, lo + 5);

  // Re-clamp derived points, then sort so a single octave-slip can't invert the
  // range: low<=mid<=high regardless of which reading was the outlier.
  lo = clampSung(lo); mid = clampSung(mid); hi = clampSung(hi);
  [lo, mid, hi] = [lo, mid, hi].sort((a, b) => a - b);

  // Enforce a minimum usable span: if the outer span is too tight to sing in,
  // widen symmetrically around the (comfortable) middle reading.
  if (hi - lo < 5) {
    lo = clampSung(mid - 3);
    hi = clampSung(mid + 3);
    // Clamping at a band edge can still leave <5 (e.g. mid at SUNG_HI); push off
    // the opposite edge to guarantee a usable span.
    if (hi - lo < 5) {
      if (hi >= SUNG_HI) lo = SUNG_HI - 6; else hi = lo + 6;
    }
  }

  // Comfortable tonic ~40% up the range — never the strained top, never the
  // floor. Guaranteed within [low, high] by construction.
  const tonicMidi = Math.round(lo + (hi - lo) * 0.4);
  const tonicOctave = Math.floor(tonicMidi / 12) - 1; // MIDI octave (C4=60 -> 4)

  return { lowMidi: lo, highMidi: hi, tonicMidi, tonicOctave, matchedMidi: tonicMidi };
}
