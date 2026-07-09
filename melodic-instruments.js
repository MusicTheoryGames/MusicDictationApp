/* ============================================================================
 * REALISTIC INSTRUMENT VOICES — multisampled instruments via `smplr`, lazy-loaded
 * from a CDN. Lets the student switch the example playback to a real piano / violin
 * / flute / etc. instead of the built-in oscillator synth.
 *
 * - Shares the app's ONE AudioContext so scheduled note times line up with the
 *   existing scheduler (melodic-shell-services.js).
 * - LAZY: nothing loads until the user actually picks an instrument, so startup and
 *   the default synth stay instant.
 * - SAFE fallback: any load/playback failure silently falls back to the synth, so the
 *   app never goes quiet if a CDN hiccups.
 * - Licensing: `smplr` streams free/redistributable soundfonts (MusyngKite/FluidR3) +
 *   a CC-licensed grand piano — safe to ship, unlike a commercial VST's samples.
 * ========================================================================== */

const CDN = 'https://esm.sh/smplr@0.16.1';
// Display name -> General-MIDI soundfont instrument id (piano uses smplr's dedicated sampled grand).
const GM = {
  violin: 'violin', cello: 'cello', flute: 'flute', clarinet: 'clarinet',
  oboe: 'oboe', trumpet: 'trumpet', guitar: 'acoustic_guitar_nylon',
};
export const INSTRUMENTS = ['synth', 'piano', 'violin', 'cello', 'flute', 'clarinet', 'oboe', 'trumpet', 'guitar'];
export const INSTRUMENT_LABELS = {
  synth: 'Synth (instant)', piano: 'Grand piano', violin: 'Violin', cello: 'Cello',
  flute: 'Flute', clarinet: 'Clarinet', oboe: 'Oboe', trumpet: 'Trumpet', guitar: 'Guitar',
};

let smplrMod = null;      // dynamically-imported smplr module
let audioCtx = null;      // the shared AudioContext
let currentName = 'synth';
const insts = {};         // name -> { inst, ready }

export function currentInstrument() { return currentName; }

/** Select (and lazily load) an instrument on the given shared AudioContext. Returns true if the
 *  requested sampled instrument is ready; falls back to 'synth' (and returns false) on any failure. */
export async function setInstrument(name, ctx) {
  if (ctx) audioCtx = ctx;
  if (!name || name === 'synth') { currentName = 'synth'; return true; }
  try {
    if (!audioCtx) { currentName = 'synth'; return false; }
    if (!smplrMod) smplrMod = await import(/* @vite-ignore */ CDN);
    if (!insts[name]) {
      const inst = name === 'piano'
        ? new smplrMod.SplendidGrandPiano(audioCtx)
        : new smplrMod.Soundfont(audioCtx, { instrument: GM[name] || name });
      insts[name] = { inst, ready: false };
      await inst.load;
      insts[name].ready = true;
    }
    currentName = insts[name].ready ? name : 'synth';
    return currentName === name;
  } catch (e) {
    currentName = 'synth';
    return false;
  }
}

/** Play a note through the current sampled instrument at an absolute AudioContext time. Returns false
 *  (so the caller uses the synth) when the synth is selected or the instrument isn't ready. */
export function voiceSampled(midi, whenSec, durSec, gain) {
  const rec = insts[currentName];
  if (currentName === 'synth' || !rec || !rec.ready) return false;
  try {
    rec.inst.start({
      note: Math.round(midi),
      time: whenSec,
      duration: Math.max(0.2, durSec),
      velocity: Math.max(30, Math.min(112, Math.round((gain || 0.35) * 230))),
    });
    return true;
  } catch (e) {
    return false;
  }
}
