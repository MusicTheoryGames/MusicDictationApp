/**
 * @file core/rhythm-figures.js
 * @module rhythm-figures
 *
 * NATIVE MelodyQuest rhythm-figure engine — the reusable pieces of BeatQuest's rhythm bank,
 * ported OUT of the iframe/solo-mode so Level 4 can present the same beautiful figure-tile
 * drag-and-drop WITHOUT any of the BeatQuest chrome (hints, quiet mode, metronome, tap-back).
 *
 * A FIGURE is one draggable tile = a per-beat (or multi-beat) rhythm cell the bank offers.
 * `durationsToFigures()` is the port of solo-mode.js `extConvert()`: it decomposes a melody's
 * flat duration sequence into per-measure figures the student places. Pure + unit-tested.
 */

// Duration CODES are melodic-generator strings: w h q 8 16, dotted = +'d' (qd hd 8d), rest = +'r'.
// Each figure's `codes` are compared directly against the melody's note durations.
export const RHYTHM_FIGURES = Object.freeze([
  { id: 'whole', name: 'Whole', beats: 4, codes: ['w'] },
  { id: 'dotted-half', name: 'Dotted half', beats: 3, codes: ['hd'] },
  { id: 'half', name: 'Half', beats: 2, codes: ['h'] },
  { id: 'dotted-quarter-eighth', name: 'Dotted quarter + eighth', beats: 2, codes: ['qd', '8'] },
  { id: 'quarter', name: 'Quarter', beats: 1, codes: ['q'] },
  { id: 'two-eighths', name: 'Two eighths', beats: 1, codes: ['8', '8'] },
  { id: 'four-sixteenths', name: 'Four sixteenths', beats: 1, codes: ['16', '16', '16', '16'] },
  { id: 'eighth-two-sixteenths', name: 'Eighth + two sixteenths', beats: 1, codes: ['8', '16', '16'] },
  { id: 'two-sixteenths-eighth', name: 'Two sixteenths + eighth', beats: 1, codes: ['16', '16', '8'] },
  { id: 'half-rest', name: 'Half rest', beats: 2, codes: ['hr'] },
  { id: 'quarter-rest', name: 'Quarter rest', beats: 1, codes: ['qr'] },
  { id: 'eighth-rest-eighth', name: 'Eighth rest + eighth', beats: 1, codes: ['8r', '8'] },
  { id: 'eighth-eighth-rest', name: 'Eighth + eighth rest', beats: 1, codes: ['8', '8r'] },
]);

const FIG_BY_ID = new Map(RHYTHM_FIGURES.map((f) => [f.id, f]));
/** Look up a figure by id. */
export function figureById(id) { return FIG_BY_ID.get(id); }

// How many quarter-notes a duration code occupies (ports solo-mode extQuartersOf). 'r'/'d'
// are stripped for the base value; a dot adds half.
const BASE_Q = { w: 4, h: 2, q: 1, 8: 0.5, 16: 0.25 };
function quartersOf(code) {
  const bare = String(code).replace('r', '').replace('d', '');
  const base = BASE_Q[bare] || 1;
  return String(code).includes('d') ? base * 1.5 : base;
}

/**
 * Beats-per-bar + quarters-per-beat for a meter (the game-beat mapping). Simple quarter-beat
 * meters (x/4) = one quarter per beat; compound (6/8-family) = the dotted quarter is the beat.
 * @returns {{beatsPerBar:number, quartersPerBeat:number}|null} null for irregular meters.
 */
export function meterBeats(meter) {
  const [top, bottom] = String(meter).split('/').map((n) => parseInt(n, 10));
  if (!(top > 0)) return null;
  if (bottom === 4) return { beatsPerBar: top, quartersPerBeat: 1 };
  if (bottom === 8 && top % 3 === 0 && top > 3) return { beatsPerBar: top / 3, quartersPerBeat: 1.5 };
  return null;
}

/**
 * Decompose a flat duration sequence into per-measure FIGURES (port of solo-mode `extConvert`).
 * Greedy, longest-figure-first, per beat; every bar must come out exactly full.
 * @param {string[]} durations e.g. ['q','8','8','h']
 * @param {string} meter e.g. '4/4'
 * @returns {{measures:{figureId:string,startBeat:number,beats:number}[][], beatsPerBar:number}|null}
 */
export function durationsToFigures(durations, meter) {
  if (!Array.isArray(durations) || !durations.length) return null;
  const mb = meterBeats(meter);
  if (!mb) return null;
  const { beatsPerBar, quartersPerBeat } = mb;
  // only figures whose NOTATED length matches their GRID length (rejects tuplets vs plain)
  const pats = RHYTHM_FIGURES
    .filter((p) => Math.abs(p.codes.reduce((s, c) => s + quartersOf(c), 0) - p.beats * quartersPerBeat) < 1e-9)
    .slice().sort((a, b) => b.codes.length - a.codes.length); // longest first
  const measures = [];
  let i = 0, ok = true;
  while (ok && i < durations.length) {
    const meas = [];
    let beat = 1;
    while (beat <= beatsPerBar && i < durations.length) {
      let matched = null;
      for (const p of pats) {
        if (p.beats > beatsPerBar - beat + 1) continue;
        if (p.codes.length > durations.length - i) continue;
        let hit = true;
        for (let k = 0; k < p.codes.length; k++) if (p.codes[k] !== String(durations[i + k])) { hit = false; break; }
        if (hit) { matched = p; break; }
      }
      if (!matched) { ok = false; break; }
      meas.push({ figureId: matched.id, startBeat: beat, beats: matched.beats });
      beat += matched.beats;
      i += matched.codes.length;
    }
    if (ok && beat !== beatsPerBar + 1) ok = false; // bar didn't come out exactly full
    if (ok) measures.push(meas);
    if (measures.length > 32) ok = false;
  }
  if (ok && i >= durations.length) return { measures, beatsPerBar };
  return null;
}

/** The flat list of figure ids in order (for the bank + grading). */
export function figureIdSequence(conv) {
  return conv.measures.flat().map((m) => m.figureId);
}
