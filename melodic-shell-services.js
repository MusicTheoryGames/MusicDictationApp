/**
 * @file melodic-shell-services.js
 * @module melodic-shell-services
 *
 * The SHELL's `services` object (MELODIC_RENDERER_SPEC.md §2) — the ONLY door a
 * renderer has to notation rendering, audio, labeling, and themed UI atoms.
 * Renderers NEVER import VexFlow/Tone/DOM color directly; this module is where
 * those imports actually live, extracted from archive/melodic-lab.html's inline
 * VexFlow-render + Tone-playback logic so a renderer can reuse it through the
 * `services` contract instead of duplicating it.
 *
 * App-layer (DOM/VexFlow/Tone), NOT a core/*.js pure module — this owns exactly
 * the side effects core/melodic.js is deliberately kept free of.
 */

import * as instruments from './melodic-instruments.js';

const VF = Vex.Flow;

// Route a melodic note through the selected REAL instrument (sampled) if one is loaded, else the synth
// oscillator. `when` is an absolute AudioContext time; `gain` is the synth gain (0..1), reused as velocity.
function emitNote(midi, when, dur, gain) {
  if (instruments.voiceSampled(midi, when, dur, gain)) return;
  rawTone(midiHz(midi), when, dur, 'triangle', gain);
}

const DUR_Q = { w: 4, h: 2, hd: 3, q: 1, qd: 1.5, '8': 0.5, '8d': 0.75, '16': 0.25 };
function durQ(d) { return DUR_Q[String(d).replace('r', '')] || 1; }

/** Map a melody's key+mode to a VexFlow key-signature spec + its accidental count. */
const KEY_ACC = {
  C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
  F: 1, Bb: 2, Eb: 3, Ab: 4, Db: 5, Gb: 6, Cb: 7,
  Am: 0, Em: 1, Bm: 2, 'F#m': 3, 'C#m': 4, 'G#m': 5, 'D#m': 6, 'A#m': 7,
  Dm: 1, Gm: 2, Cm: 3, Fm: 4, Bbm: 5, Ebm: 6, Abm: 7,
};
/* Church modes (M23) have no direct VexFlow key-signature spec — VexFlow only knows
 * major/minor. A mode's correct signature is its RELATIVE MAJOR's signature (the major
 * scale sharing the exact same accidentals) — e.g. D dorian's signature is 0 sharps/
 * flats, same as C major (dorian = major's 2nd degree), NOT D major's 2 sharps.
 * `major[d]` = semitone offset of scale-degree d in a plain major scale (mirrors
 * core/melodic.js's SCALE_SEMITONES.major, duplicated locally per this file's existing
 * DUR_Q-vs-DURATION_QUARTERS pattern — the services layer intentionally doesn't import
 * core/melodic.js's internals). */
const MODE_DEGREE_IN_MAJOR = { major: 1, dorian: 2, phrygian: 3, lydian: 4, mixolydian: 5, locrian: 7 };
const MAJOR_DEGREE_SEMIS = [0, 0, 2, 4, 5, 7, 9, 11];
const LETTER_PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const PC_TO_MAJOR_KEY = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
function tonicPc(key) {
  let acc = 0;
  for (let i = 1; i < key.length; i++) acc += key[i] === '#' ? 1 : -1;
  return ((LETTER_PC[key[0].toLowerCase()] + acc) % 12 + 12) % 12;
}
function keySigSpec(melody) {
  // Symmetric collections (whole-tone/octatonic, M24) conventionally use NO key
  // signature — every accidental is drawn inline (applyAccidentals handles that).
  if (melody.collection) return 'C';
  if (/minor/.test(melody.mode)) return melody.key + 'm'; // VexFlow's 'Xm' already draws the correct (relative-major) signature
  const deg = MODE_DEGREE_IN_MAJOR[melody.mode];
  if (!deg || deg === 1) return melody.key; // major (or unknown — fall back to the old behavior)
  const relMajorPc = ((tonicPc(melody.key) - MAJOR_DEGREE_SEMIS[deg]) % 12 + 12) % 12;
  return PC_TO_MAJOR_KEY[relMajorPc];
}

function toStaveNote(n, hideKeys) {
  if (String(n.duration).includes('r')) return new VF.StaveNote({ keys: ['b/4'], duration: n.duration });
  const dotted = /d$/.test(n.duration);
  const dur = dotted ? n.duration.replace(/d$/, '') : n.duration;
  const beamed = (dur === '8' || dur === '16');
  const keys = hideKeys ? ['b/4'] : [n.pitch];
  const sn = new VF.StaveNote({ keys, duration: dur, auto_stem: !beamed });
  if (dotted) sn.addModifier(new VF.Dot(), 0);
  if (hideKeys) {
    // The mystery note must show NO pitch information at all — a notehead sitting
    // on a real line reads as a real pitch (owner: "you actually have a note
    // listed — it is confusing"). Render it fully transparent: it keeps its
    // rhythmic slot (formatting/spacing stay correct) but the student sees only
    // the HTML "?" chip renderStaff places over the gap.
    const invisible = { fillStyle: 'rgba(0,0,0,0)', strokeStyle: 'rgba(0,0,0,0)' };
    sn.setStyle(invisible);
    if (sn.setStemStyle) sn.setStemStyle(invisible);
    if (sn.setFlagStyle) sn.setFlagStyle(invisible);
    if (sn.setLedgerLineStyle) sn.setLedgerLineStyle(invisible);
  }
  return sn;
}

// Per-beat length in quarter-note units, per meter — an ARRAY, not a flat number, since
// irregular meters (5/8=2+3, 7/8=2+2+3) have beats of different lengths within one bar.
// Compound 6/8-family meters group by the dotted quarter (1.5). Deliberately NOT
// VF.Beam.generateBeams()/getDefaultBeamGroups(): proven (melodic-ladder-demo.js, earlier
// this session) to mis-beam a bar that opens with a note exactly filling the first beat
// group followed by eighths — it strands the first eighth instead of beaming all three,
// which visually reads as the wrong meter. Bucketing notes by which beat they START in and
// beaming only the beamable run WITHIN each bucket sidesteps that bug entirely.
const BEAT_PATTERNS = {
  '2/4': [1, 1], '3/4': [1, 1, 1], '4/4': [1, 1, 1, 1],
  '6/8': [1.5, 1.5], '9/8': [1.5, 1.5, 1.5], '12/8': [1.5, 1.5, 1.5, 1.5],
  '5/8': [1, 1.5], '7/8': [1, 1, 1.5],
};
function computeBeams(measureNotes, noteObjs, meter, hiddenLocal = null) {
  const pattern = BEAT_PATTERNS[meter] || [1];
  const boundaries = [0];
  pattern.forEach((len) => boundaries.push(boundaries[boundaries.length - 1] + len));
  const beamable = (d) => d === '8' || d === '16' || d === '32';
  let cum = 0; const buckets = [];
  measureNotes.forEach((n, i) => {
    let idx = pattern.length - 1;
    for (let b = 0; b < pattern.length; b++) { if (cum + 1e-6 < boundaries[b + 1]) { idx = b; break; } }
    (buckets[idx] || (buckets[idx] = [])).push({ i, beamable: beamable(String(n.duration).replace(/d+$/, '')) && !(hiddenLocal && hiddenLocal.has(i)) });
    cum += durQ(n.duration);
  });
  const beams = [];
  buckets.forEach((bucket) => {
    if (!bucket) return;
    let run = [];
    const flush = () => {
      if (run.length >= 2) {
        const groupNotes = run.map((r) => noteObjs[r.i]);
        // VexFlow's auto_stem decides EACH note's stem direction independently — a plain
        // new VF.Beam(...) call does NOT unify them, so beaming two notes that guessed
        // opposite directions (one just below the middle line, one just above/on it)
        // renders as a broken diagonal stub instead of a flat connecting bar. Force one
        // shared direction for the whole beamed group first (standard convention: average
        // notehead at/above the middle line -> stems down; below -> stems up).
        const avgLine = groupNotes.reduce((s, n) => s + n.getKeyProps()[0].line, 0) / groupNotes.length;
        const dir = avgLine < 2 ? VF.Stem.UP : VF.Stem.DOWN;
        groupNotes.forEach((n) => n.setStemDirection(dir));
        beams.push(new VF.Beam(groupNotes));
      }
      run = [];
    };
    bucket.forEach((item) => { if (item.beamable) run.push(item); else flush(); });
    flush();
  });
  return beams;
}

/**
 * Render a Melody as real notation into `host`, measures + barlines + beamed eighths,
 * notes fit the staff. `opts.hideIdx` (used by renderStaffPartial) blanks specific note
 * positions (missing-note exercise) — rendered as an empty notehead placeholder, not the
 * real pitch. `opts.onNoteClick(globalIndex)` (used by error-detect) makes every notehead
 * clickable and reports which note (by position in `melody.notes`) was clicked.
 * @param {HTMLElement} host
 * @param {import('./core/melodic.js').Melody} melody
 * @param {{hideIdx?: number[], onNoteClick?: (i:number)=>void}} [opts]
 */
/* Per-measure meter strings for a melody: meterSequence when present (changing
 * meter, M25 — Hall: the time signature is RESTATED at every change), else null
 * (uniform meter, existing behavior). */
/* Metric-equivalence marking text (Hall Ch21/22): division-constant = the eighth
   carries over (marked at the change); beat-constant = the beat carries over.
   Unicode musical symbols (not emoji): U+266A eighth, U+2669 quarter. */
function equivalenceMark(melody) {
  if (!melody.equivalence) return null;
  return melody.equivalence === 'division' ? '\u266A = \u266A' : '\u2669 = \u2669.';
}
function meterClass(mtr) {
  const [t] = String(mtr).split('/').map(Number);
  return (t % 3 === 0 && t > 3) ? 'compound' : 'simple';
}
function measureMeters(melody) {
  return Array.isArray(melody.meterSequence) && melody.meterSequence.length
    ? melody.meterSequence : null;
}

function renderStaff(host, melody, opts = {}) {
  host.innerHTML = '';
  const hideSet = new Set(opts.hideIdx || []);
  // Relative wrapper so mystery-note "?" chips can sit at exact note coordinates.
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  wrap.style.display = 'inline-block';
  host.appendChild(wrap);
  const chipAt = (x, y) => {
    const chip = document.createElement('span');
    chip.className = 'melodic-mystery-chip';
    chip.textContent = '?';
    chip.style.position = 'absolute';
    // PERCENT of the staff box (not px) so the chip stays on its note when the SVG scales to fit its
    // container (the staff is responsive — see the viewBox/width:100% at the end of renderStaff).
    chip.style.left = (x / W * 100) + '%';
    chip.style.top = (y / H * 100) + '%';
    chip.style.transform = 'translate(-50%, -50%)';
    wrap.appendChild(chip);
  };
  const mm = measureMeters(melody);
  const barQFor = (i) => {
    const mtr = mm ? mm[Math.min(i, mm.length - 1)] : melody.meter;
    const [b, v] = mtr.split('/').map(Number);
    return b * (4 / v);
  };
  const [beats, val] = melody.meter.split('/').map(Number);
  const measures = []; let cur = [], acc = 0, idx = 0;
  const idxByNote = [];
  melody.notes.forEach((n) => {
    cur.push(n); idxByNote.push(idx++);
    acc += durQ(n.duration);
    if (acc >= barQFor(measures.length) - 1e-6) { measures.push(cur); cur = []; acc = 0; }
  });
  if (cur.length) measures.push(cur);
  const nBars = measures.length;
  const ksSpec = keySigSpec(melody);
  const nAcc = KEY_ACC[ksSpec] || 0;
  const perNote = 42, clefAllow = 58 + nAcc * 11, leftPad = 4;
  const barWidths = measures.map((m, i) => (i === 0 ? clefAllow : 8) + Math.max(70, m.length * perNote));
  const W = leftPad + barWidths.reduce((a, b) => a + b, 0) + 8;
  const H = 132;
  const renderer = new VF.Renderer(wrap, VF.Renderer.Backends.SVG);
  renderer.resize(W, H);
  const ctx = renderer.getContext();
  let x = leftPad, noteCounter = 0;
  measures.forEach((mNotes, i) => {
    const bw = barWidths[i];
    const stave = new VF.Stave(x, 14, bw);
    const mtr = mm ? mm[i] : melody.meter;
    if (i === 0) stave.addClef('treble').addKeySignature(ksSpec).addTimeSignature(mtr);
    // Changing meter: restate the signature at every bar whose meter differs
    // from the previous bar's (Hall's convention; unchanged bars show none).
    else if (mm && mm[i] !== mm[i - 1]) {
      stave.addTimeSignature(mtr);
      // Simple<->compound change: the metric-equivalence marking sits above the
      // change point (Hall Ch21/22 — the notation MUST declare which unit carries).
      const mark = equivalenceMark(melody);
      if (mark && meterClass(mm[i]) !== meterClass(mm[i - 1])) {
        ctx.save();
        ctx.setFont('serif', 12, 'italic');
        ctx.fillText(mark, x + 2, 10);
        ctx.restore();
      }
    }
    if (i === nBars - 1) stave.setEndBarType(VF.Barline.type.END);
    stave.setContext(ctx).draw();
    const globalIdxOfNote = [];
    const notes = mNotes.map((n) => {
      const gIdx = noteCounter++;
      globalIdxOfNote.push(gIdx);
      const hidden = hideSet.has(gIdx);
      return toStaveNote(n, hidden);
    });
    const [vb, vv] = (mm ? mm[i] : melody.meter).split('/').map(Number);
    const voice = new VF.Voice({ num_beats: vb, beat_value: vv }).setStrict(false);
    voice.addTickables(notes);
    VF.Accidental.applyAccidentals([voice], ksSpec);
    new VF.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    // Beams MUST be constructed AFTER formatToStave — building them earlier locks in each
    // note's independently-guessed stem direction before computeBeams gets a chance to
    // unify it, which is what caused the broken-diagonal-beam bug found earlier.
    const hiddenLocal = new Set();
    globalIdxOfNote.forEach((g2, j2) => { if (hideSet.has(g2)) hiddenLocal.add(j2); });
    const beams = computeBeams(mNotes, notes, mm ? mm[i] : melody.meter, hiddenLocal);
    voice.draw(ctx, stave);
    beams.forEach((b) => b.setContext(ctx).draw());
    // Mystery chips: centered on the invisible note's NOTEHEAD, at the staff's middle line.
    // NB: getAbsoluteX() is the note's left attachment point (accidental/tick x) — centering the
    // chip there pulled it LEFT into the previous note ("crammed"). Center on the notehead SPAN so
    // the "?" sits exactly where the missing note's head would be.
    notes.forEach((sn, j2) => {
      if (!hiddenLocal.has(j2)) return;
      const cx = (typeof sn.getNoteHeadBeginX === 'function' && typeof sn.getNoteHeadEndX === 'function')
        ? (sn.getNoteHeadBeginX() + sn.getNoteHeadEndX()) / 2
        : sn.getAbsoluteX();
      chipAt(cx, stave.getYForLine(2));
    });
    if (opts.onNoteClick) {
      notes.forEach((sn, j) => {
        const el = sn.getSVGElement ? sn.getSVGElement() : (sn.attrs && sn.attrs.el);
        if (!el) return;
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => opts.onNoteClick(globalIdxOfNote[j]));
      });
    }
    x += bw;
  });
  // Make the staff RESPONSIVE: scale to fit its container (down to fit, never up past natural size) via a
  // viewBox, so the WHOLE melody — clef included — always shows, even in a narrow option tile. (Fixes the
  // recognition tiles clipping the clef.) Mystery "?" chips are positioned in % (above), so they scale too.
  const svgEl = wrap.querySelector('svg');
  if (svgEl) {
    svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svgEl.removeAttribute('width'); svgEl.removeAttribute('height');
    svgEl.style.display = 'block'; svgEl.style.width = '100%'; svgEl.style.height = 'auto'; svgEl.style.maxWidth = W + 'px';
  }
  wrap.style.display = 'block'; wrap.style.width = '100%'; wrap.style.maxWidth = W + 'px'; wrap.style.margin = '0 auto';
}

/**
 * Render a melody's RHYTHM as real notation on a single-line rhythm staff —
 * stems, flags, beams, barlines, time signature — with NO pitch information
 * (every notehead sits on the one line). This is what the labeling exercises
 * (M3-M8) and notation-entry's degree phase show: the curriculum's "the rhythm
 * appears as notes; the student taps the degree under each note", as REAL
 * notation, not abstract boxes (owner-requested).
 *
 * `opts.labels[i]` (string) is drawn UNDER note i (the student's assigned
 * degree/syllable). `opts.activeIdx` marks the note awaiting an answer — the
 * note's SVG group gets class `is-active` (+ every group gets `is-labelable`),
 * so the page/theme CSS owns the highlight color (no colors in JS).
 * `opts.onNoteClick(i)` makes noteheads clickable (revise an earlier answer).
 *
 * @param {HTMLElement} host
 * @param {import('./core/melodic.js').Melody} melody
 * @param {{labels?: string[], activeIdx?: number, onNoteClick?: (i:number)=>void}} [opts]
 */
function renderRhythmLine(host, melody, opts = {}) {
  host.innerHTML = '';
  const labels = opts.labels || [];
  const mm = measureMeters(melody);
  const barQFor = (i) => {
    const mtr = mm ? mm[Math.min(i, mm.length - 1)] : melody.meter;
    const [b, v] = mtr.split('/').map(Number);
    return b * (4 / v);
  };
  const measures = []; let cur = [], acc = 0;
  melody.notes.forEach((n) => {
    cur.push(n);
    acc += durQ(n.duration);
    if (acc >= barQFor(measures.length) - 1e-6) { measures.push(cur); cur = []; acc = 0; }
  });
  if (cur.length) measures.push(cur);
  const nBars = measures.length;
  // Wider per-note room than the pitched staff: the label text below each note
  // needs horizontal space to stay readable.
  const perNote = 56, headAllow = 44, leftPad = 4;
  const barWidths = measures.map((m, i) => (i === 0 && !opts.bare ? headAllow : 10) + Math.max(80, m.length * perNote));
  const W = leftPad + barWidths.reduce((a, b) => a + b, 0) + 8;

  // Wrapper: the staff SVG plus an HTML label row. Labels are HTML (not
  // VF.Annotation) deliberately: annotations attached to BEAMED notes collapse/
  // drop in VexFlow 4 (found by screenshot — beamed eighths lost their labels),
  // and HTML labels inherit the active theme's font/colors for free.
  const wrap = document.createElement('div');
  wrap.className = 'melodic-rhythmline';
  wrap.style.position = 'relative';
  wrap.style.width = W + 'px';
  host.appendChild(wrap);

  const svgHost = document.createElement('div');
  wrap.appendChild(svgHost);
  const renderer = new VF.Renderer(svgHost, VF.Renderer.Backends.SVG);
  renderer.resize(W, 126);
  const ctx = renderer.getContext();
  let x = leftPad, noteCounter = 0;
  // Hide all staff lines except the middle one: notes keep normal 5-line
  // geometry (b/4 = middle line) so stems/beams/flags all render correctly,
  // but the READ is a clean single rhythm line.
  const LINE_CONFIG = [
    { visible: false }, { visible: false }, { visible: true }, { visible: false }, { visible: false },
  ];
  const labelRow = document.createElement('div');
  labelRow.className = 'melodic-rhythmline__labels';
  labelRow.style.position = 'relative';
  labelRow.style.height = '26px';
  wrap.appendChild(labelRow);

  measures.forEach((mNotes, i) => {
    const bw = barWidths[i];
    const stave = new VF.Stave(x, 22, bw);
    stave.setConfigForLines(LINE_CONFIG);
    const mtr = mm ? mm[i] : melody.meter;
    if (i === 0 && !opts.bare) stave.addTimeSignature(mtr); // bare = figure tiles (no clef/time-sig)
    else if (mm && mm[i] !== mm[i - 1]) {
      stave.addTimeSignature(mtr); // Hall: sig at every change
      const mark = equivalenceMark(melody);
      if (mark && meterClass(mm[i]) !== meterClass(mm[i - 1])) {
        ctx.save();
        ctx.setFont('serif', 12, 'italic');
        ctx.fillText(mark, x + 2, 14);
        ctx.restore();
      }
    }
    if (i === nBars - 1) stave.setEndBarType(VF.Barline.type.END);
    stave.setContext(ctx).draw();
    const globalIdxOfNote = [];
    const notes = mNotes.map((n) => {
      const gIdx = noteCounter++;
      globalIdxOfNote.push(gIdx);
      const dotted = /d$/.test(n.duration);
      const dur = dotted ? String(n.duration).replace(/d$/, '') : String(n.duration);
      // All noteheads on the single line, ALL stems DOWN (owner's call): unbeamed
      // notes were up while computeBeams' middle-line rule turned beamed groups
      // down — a random-looking mix. One direction everywhere on the rhythm line;
      // the PITCHED staff keeps standard position-based stem practice.
      const sn = new VF.StaveNote({ keys: ['b/4'], duration: dur, stem_direction: VF.Stem.DOWN });
      if (dotted) sn.addModifier(new VF.Dot(), 0);
      return sn;
    });
    const [vb, vv] = (mm ? mm[i] : melody.meter).split('/').map(Number);
    const voice = new VF.Voice({ num_beats: vb, beat_value: vv }).setStrict(false);
    voice.addTickables(notes);
    new VF.Formatter().joinVoices([voice]).formatToStave([voice], stave);
    // Beams AFTER formatToStave — same discipline as renderStaff (see its comment).
    const beams = computeBeams(mNotes, notes, mm ? mm[i] : melody.meter);
    voice.draw(ctx, stave);
    beams.forEach((b) => b.setContext(ctx).draw());
    notes.forEach((sn, j) => {
      const gIdx = globalIdxOfNote[j];
      const el = sn.getSVGElement ? sn.getSVGElement() : (sn.attrs && sn.attrs.el);
      if (el) {
        el.classList.add('is-labelable');
        if (gIdx === opts.activeIdx) el.classList.add('is-active');
        if (opts.onNoteClick) {
          el.style.cursor = 'pointer';
          el.addEventListener('click', () => opts.onNoteClick(gIdx));
        }
      }
      // HTML label under the note, centered on the notehead's actual X.
      const span = document.createElement('span');
      span.className = 'melodic-rhythmline__label'
        + (gIdx === opts.activeIdx ? ' is-active' : '')
        + (labels[gIdx] ? ' is-filled' : '');
      span.textContent = labels[gIdx] || (opts.onNoteClick ? '·' : '');
      span.style.position = 'absolute';
      span.style.left = sn.getAbsoluteX() + 'px';
      span.style.transform = 'translateX(-50%)';
      if (opts.onNoteClick) {
        span.style.cursor = 'pointer';
        span.addEventListener('click', () => opts.onNoteClick(gIdx));
      }
      labelRow.appendChild(span);
    });
    x += bw;
  });
}

/**
 * Render a TWO-PART piece as two aligned staves (top voice above, bottom below),
 * bar-aligned, each voice through the same proven measure-split + beam logic the
 * single staff uses. M20 (see VISION.md §9).
 * @param {HTMLElement} host
 * @param {{voices:[Object,Object]}} twoPart
 */
function renderTwoStaves(host, twoPart) {
  host.innerHTML = '';
  const [top, bottom] = twoPart.voices;
  const wrapTop = document.createElement('div');
  const wrapBot = document.createElement('div');
  host.appendChild(wrapTop);
  host.appendChild(wrapBot);
  renderStaff(wrapTop, top);
  renderStaff(wrapBot, bottom);
}

/** Two-part playback with per-voice mute (VISION.md §9: the pedagogy
 *  needs "hear the top voice alone"). mute = [muteTop, muteBottom]. */
async function playTwoPart(twoPart, opts = {}) {
  const c = await unlockAudio(); if (!c) return;
  const mute = opts.mute || [false, false];
  const bpm = opts.bpm || 92, spb = 60 / bpm;
  // shared count-off from the top voice's meter
  const [topN, bottomN] = [twoPart.voices[0], twoPart.voices[1]];
  let t0 = c.currentTime + 0.12;
  const [tops, botsv] = [String(topN.meter || '4/4').split('/').map(Number), null];
  const compound = tops[0] % 3 === 0 && tops[0] > 3;
  const beats = compound ? tops[0] / 3 : tops[0];
  const beatLen = (compound ? 1.5 : (4 / tops[1])) * spb;
  for (let b = 0; b < beats; b++) rawTone(b === 0 ? 2300 : 1550, t0 + b * beatLen, 0.035, 'sine', b === 0 ? 0.3 : 0.18);
  t0 += beats * beatLen;
  [topN, bottomN].forEach((voiceMel, vi) => {
    if (mute[vi]) return;
    let t = t0;
    voiceMel.notes.forEach((n) => {
      const nb = DUR_BEATS[String(n.duration).replace('r', '')] || 1;
      if (!String(n.duration).includes('r')) {
        // top brighter, bottom rounder — separable by ear
        emitNote(n.midi, t, Math.max(0.12, nb * spb * 0.9), vi === 0 ? 0.32 : 0.38);
      }
      t += nb * spb;
    });
  });
}

function clearStaff(host) { host.innerHTML = ''; }

/* ============================================================================
 * AUDIO — RAW WebAudio, ported VERBATIM-in-structure from solo-mode.js's proven
 * ctx()/unlockAudio()/tone()/stopAllAudio() (the rhythm game's sound path, which
 * demonstrably produces sound on the owner's machine). Tone.js is GONE: it
 * reported a running context while producing silence in the owner's browser —
 * an undebuggable stack when a proven in-repo alternative exists
 * (reuse-verified-code-dont-rederive).
 * ========================================================================== */
let actx = null;
function actxGet() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
/* Unlock/resume inside a user gesture (mobile Safari starts suspended) — same
   silent one-sample buffer trick the rhythm game uses. ASYNC variant: Safari
   (unlike Chrome) silently drops oscillators scheduled while resume() is still
   in flight — the context clock hasn't started, so the note's start time is
   already in the past when it finally runs (owner-observed: Chrome sounded,
   Safari stayed silent on the very same build). Await the resume, THEN schedule. */
async function unlockAudio() {
  const c = actxGet(); if (!c) return null;
  if (c.state !== 'running') { try { await c.resume(); } catch (e) {} }
  try { const s2 = c.createBufferSource(); s2.buffer = c.createBuffer(1, 1, 22050); s2.connect(c.destination); s2.start(0); } catch (e) {}
  return c;
}
/* Pre-warm on the FIRST user gesture anywhere on the page (RhythmQuest gets this
   for free from its big Start-button flow; MelodyQuest's first gesture may be
   the Hear-it click itself, so warm the context as early as possible). */
if (typeof document !== 'undefined') {
  const warm = () => { unlockAudio(); document.removeEventListener('pointerdown', warm, true); };
  document.addEventListener('pointerdown', warm, true);
}
let scheduledOscs = [];
/* SILENT-AUDIO WATCHDOG: everything routes through an analyser tap; ~600ms after
   sound is scheduled, if the context claims to be running but the output is all
   zeros (Safari's per-site Auto-Play policy gates WebAudio while speech/video
   still play — cost a full day to diagnose blind), fire ONE window event so the
   page can tell the player exactly which Safari setting to flip. */
let masterTap = null;
function tapFor(c) {
  if (!masterTap) {
    masterTap = c.createAnalyser();
    masterTap.fftSize = 2048;
    masterTap.connect(c.destination);
  }
  return masterTap;
}
let silentNotified = false;
function watchForSilence(c) {
  if (silentNotified || !masterTap) return;
  setTimeout(() => {
    if (silentNotified || c.state !== 'running') return;
    const buf = new Float32Array(masterTap.fftSize);
    masterTap.getFloatTimeDomainData(buf);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
    if (peak < 0.001) {
      silentNotified = true;
      try { window.dispatchEvent(new CustomEvent('melodic-audio-silent')); } catch (e) {}
    }
  }, 600);
}
function rawTone(freq, when, dur, type, gain) {
  const c = actxGet(); if (!c) return;
  // Shared OUTPUT gain carries the WebKit-safe envelope. Safari streamed
  // ZERO-valued samples with an attack RAMP (setValueAtTime 0.0001 ->
  // linearRamp): the automation never raised the gain off its floor while the
  // tab's speaker icon lit. Fix (kept): set the audible gain DIRECTLY (a plain
  // assignment cannot fail) and only RELEASE via setTargetAtTime — the most
  // reliable WebKit automation; worst case the note still SOUNDS. A slightly
  // longer release time-constant (0.04) gives a smoother, less clicky tail.
  const out = c.createGain();
  out.gain.value = gain;
  out.gain.setTargetAtTime(0.0001, when + Math.max(0.02, dur - 0.02), 0.04);
  out.connect(tapFor(c));

  // PITCHED voice (ticks stay a pure single sine): a gentle lowpass softens the
  // triangle's harsh upper edge (warmth + a rounder attack), and the mix adds a
  // detuned twin (analog-style chorus body) + a soft octave partial so the voice
  // reads "instrument", not "test tone". All passive/additive — no attack ramps.
  let sink = out;
  const enrich = type === 'triangle' && dur > 0.08;
  if (enrich) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(6500, Math.max(1600, freq * 5));
    lp.Q.value = 0.7;
    lp.connect(out);
    sink = lp;
  }
  let main = null;
  const addOsc = (t, f, mix, detuneCents) => {
    const o = c.createOscillator(), mg = c.createGain();
    o.type = t; o.frequency.value = f; if (detuneCents) o.detune.value = detuneCents;
    mg.gain.value = mix;
    o.connect(mg); mg.connect(sink);
    o.start(when); o.stop(when + dur + 0.08);
    scheduledOscs.push(o);
    return o;
  };
  main = addOsc(type, freq, enrich ? 0.72 : 1);
  if (enrich) {
    addOsc('triangle', freq, 0.3, 7);  // detuned twin -> chorus warmth
    addOsc('sine', freq * 2, 0.14);    // octave partial -> body
  }
  watchForSilence(c);
  main.onended = () => { const i = scheduledOscs.indexOf(main); if (i !== -1) scheduledOscs.splice(i, 1); };
}
const midiHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

const DUR_BEATS = DUR_Q;
async function play(melody, opts = {}) {
  const c = await unlockAudio(); if (!c) return;
  const bpm = opts.bpm || 92, spb = 60 / bpm;
  let t = c.currentTime + 0.12;
  // COUNT-OFF (research/LEVEL_SYSTEM_RESEARCH.md §2: "always give meter + count-off up
  // front"): one bar of metronome ticks in the melody's meter before the melody —
  // beat 1 accented, same tick voice family as RhythmQuest's metronome.
  if (opts.countOff !== false) {
    const [top, bottom] = String(melody.meter || '4/4').split('/').map(Number);
    const compound = top % 3 === 0 && top > 3;
    const beats = compound ? top / 3 : top;
    const beatLen = (compound ? 1.5 : (4 / bottom)) * spb;
    for (let b = 0; b < beats; b++) {
      rawTone(b === 0 ? 2300 : 1550, t + b * beatLen, 0.035, 'sine', b === 0 ? 0.3 : 0.18);
    }
    t += beats * beatLen;
  }
  // BEAT-CONSTANT equivalence (Hall Ch22): the beat carries across a simple<->
  // compound change, so notes in COMPOUND bars are scaled 2/3 (dotted quarter =
  // the old quarter). Division-constant needs no scaling — equal quarters/eighths
  // is already how this scheduler walks durations.
  const mmSeq = Array.isArray(melody.meterSequence) ? melody.meterSequence : null;
  let barIdx = 0, cumQ = 0, barQ = mmSeq ? (() => { const [t2, b2] = mmSeq[0].split('/').map(Number); return t2 * (4 / b2); })() : Infinity;
  melody.notes.forEach((n) => {
    const beats = DUR_BEATS[String(n.duration).replace('r', '')] || 1;
    let scale = 1;
    if (mmSeq && melody.equivalence === 'beat') {
      const [t2] = mmSeq[Math.min(barIdx, mmSeq.length - 1)].split('/').map(Number);
      if (t2 % 3 === 0 && t2 > 3) scale = 2 / 3;
    }
    if (!String(n.duration).includes('r')) {
      emitNote(n.midi, t, Math.max(0.12, beats * scale * spb * 0.9), 0.35);
    }
    t += beats * scale * spb;
    if (mmSeq) {
      cumQ += beats;
      if (cumQ >= barQ - 1e-6 && barIdx < mmSeq.length - 1) {
        barIdx++; cumQ = 0;
        const [t3, b3] = mmSeq[barIdx].split('/').map(Number);
        barQ = t3 * (4 / b3);
      }
    }
  });
}

async function playNote(midi, durBeats = 1, opts = {}) {
  const c = await unlockAudio(); if (!c) return;
  const bpm = opts.bpm || 92, spb = 60 / bpm;
  emitNote(midi, c.currentTime + 0.03, Math.max(0.12, durBeats * spb * 0.9), 0.35);
}
/* AUDIO-CLOCK helpers for tightly-synced visuals (the tap-stream beat cursor).
   audioNow() reads the SAME clock the notes are scheduled on; playNoteAt()
   schedules a note at an ABSOLUTE context time (seconds), so a caller can lay a
   whole stream on the audio clock and light each tile by reading audioNow() —
   no setTimeout drift between sound and highlight. */
function audioNow() { const c = actxGet(); return c ? c.currentTime : 0; }
function playNoteAt(midi, whenSec, durSec) {
  const c = actxGet(); if (!c) return;
  emitNote(midi, Math.max(whenSec, c.currentTime + 0.005), Math.max(0.12, durSec), 0.35);
}

/* A/B SELF-COMPARE (research/LEVEL_SYSTEM_RESEARCH.md §2: hearing YOUR entered answer vs
   the original before submitting is "a strong built-in error-detection mode").
   Renders a degree-sequence answer to audio under the round's key/mode. */
const SCALE_SEMIS_LOCAL = {
  major: [0, 0, 2, 4, 5, 7, 9, 11],
  'natural-minor': [0, 0, 2, 3, 5, 7, 8, 10],
  'harmonic-minor': [0, 0, 2, 3, 5, 7, 8, 11],
  'melodic-minor': [0, 0, 2, 3, 5, 7, 9, 11],
  dorian: [0, 0, 2, 3, 5, 7, 9, 10], phrygian: [0, 0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 0, 1, 3, 5, 6, 8, 10],
};
async function playDegrees(degreesSeq, melody, opts = {}) {
  const c = await unlockAudio(); if (!c) return;
  const bpm = opts.bpm || 92, spb = 60 / bpm;
  const table = SCALE_SEMIS_LOCAL[melody.mode] || SCALE_SEMIS_LOCAL.major;
  let t = c.currentTime + 0.12;
  degreesSeq.forEach((deg, i) => {
    const note = melody.notes[i];
    const beats = DUR_BEATS[String(note.duration).replace('r', '')] || 1;
    if (Number.isInteger(deg) && deg >= 1 && deg <= 7) {
      // octave: follow the TRUE melody's register so the comparison isolates
      // DEGREE choices (the thing being answered), not octave placement.
      const trueRel = note.midi - melody.tonicMidi;
      const oct = Math.round((trueRel - table[note.degree]) / 12);
      emitNote(melody.tonicMidi + table[deg] + 12 * oct, t, Math.max(0.12, beats * spb * 0.9), 0.35);
    }
    t += beats * spb;
  });
}

/* ============================================================================
 * INTERVAL GYM audio (INTERVAL_GYM_SPEC.md §4)
 * ========================================================================== */

/** Key-establishing cadence: I – IV – V – I block triads, ~0.65s per chord —
 *  the Benbassat context-setter. Triads voiced from the tonic octave; three
 *  rawTones per chord at the same start time. */
async function playCadence(key, mode, opts = {}) {
  const c = await unlockAudio(); if (!c) return;
  const SEMIS = {
    major: [0, 0, 2, 4, 5, 7, 9, 11],
    'natural-minor': [0, 0, 2, 3, 5, 7, 8, 10],
    'harmonic-minor': [0, 0, 2, 3, 5, 7, 8, 11],
    'melodic-minor': [0, 0, 2, 3, 5, 7, 9, 11],
  };
  const table = SEMIS[mode] || SEMIS.major;
  const LETTER_PC2 = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  let pc = LETTER_PC2[key[0].toLowerCase()] || 0;
  for (let i = 1; i < key.length; i++) pc += key[i] === '#' ? 1 : -1;
  const tonic = 48 + ((pc % 12) + 12) % 12; // low register so the pair sits above
  // chord roots as scale degrees: I, IV, V, I
  const roots = [1, 4, 5, 1];
  const chordDur = opts.chordDur || 0.62;
  let t = c.currentTime + 0.08;
  roots.forEach((deg) => {
    const third = ((deg - 1 + 2) % 7) + 1;
    const fifth = ((deg - 1 + 4) % 7) + 1;
    [deg, third, fifth].forEach((d, vi) => {
      const off = table[d] + (d < deg ? 12 : 0); // keep voices stacked upward
      rawTone(midiHz(tonic + off), t, chordDur * 0.95, 'triangle', vi === 0 ? 0.3 : 0.2);
    });
    t += chordDur;
  });
  return new Promise((r) => setTimeout(r, Math.round((roots.length * chordDur + 0.15) * 1000)));
}

/** Timbre/register roulette for NAME-station generalization: voice + octave
 *  chosen deterministically from the item seed. */
async function playPairTimbred({ midiFrom, midiTo, seed = 1, gapMs = 650 }) {
  const c = await unlockAudio(); if (!c) return;
  const voices = ['triangle', 'sine', 'square'];
  const voice = voices[seed % voices.length];
  const shift = [0, 12, -12][Math.floor(seed / 3) % 3];
  const gain = voice === 'square' ? 0.16 : 0.32;
  rawTone(midiHz(midiFrom + shift), c.currentTime + 0.05, 0.55, voice, gain);
  rawTone(midiHz(midiTo + shift), c.currentTime + 0.05 + gapMs / 1000, 0.55, voice, gain);
  return new Promise((r) => setTimeout(r, gapMs + 700));
}

function stopAudio() {
  scheduledOscs.forEach((o) => { try { o.stop(); } catch (e) {} try { o.disconnect(); } catch (e) {} });
  scheduledOscs = [];
}

/**
 * Build a `services` object bound to a specific round's labeling context, per
 * MELODIC_RENDERER_SPEC.md §2. Renderers get exactly this surface — nothing more.
 * @param {Object} opts
 * @param {(note:any, ctx:any) => string} opts.labelNoteFn  from core/melodic.js
 * @param {(ctx:any) => string[]} opts.labelPaletteFn        from core/melodic.js
 * @param {Object} opts.labelCtx                             { key, mode, system, minorSolfege }
 * @param {number} [opts.tempoBPM=92]
 * @returns {Object} services
 */
/**
 * Mount the REAL rhythm dictation game (solo-mode.js, whole bank/drag/grade UI)
 * as an embedded round playing an exact externally-supplied rhythm — the
 * external-target seam (?exttarget=1) added to solo-mode.js for melodic reuse
 * (M2 rhythm-first + notation-entry's rhythm phase).
 *
 * Calls `onResult(null)` when the rhythm can't be expressed in the game's
 * pattern bank (compound/irregular meters, exotic figures) or the game fails
 * to boot in time — the CALLER falls back to its own entry UI. Otherwise calls
 * `onResult({allCorrect, rhythmAccuracy})` after the student submits.
 *
 * @param {HTMLElement} host
 * @param {{durations:string[], meter:string, onResult:Function}} opts
 * @returns {{destroy:()=>void}}
 */
function mountRhythmEntry(host, { durations, meter, onResult }) {
  let settled = false;
  const settle = (v) => { if (!settled) { settled = true; onResult(v); } };

  const iframe = document.createElement('iframe');
  iframe.className = 'melodic-rhythm-entry__frame';
  iframe.style.cssText = 'width:100%;min-height:560px;border:0;border-radius:12px;';
  iframe.src = 'tapping.html?mode=solo&exttarget=1';
  host.appendChild(iframe);

  function onMsg(ev) {
    if (ev.source !== iframe.contentWindow || !ev.data) return;
    if (ev.data.type === 'melodic-ext-ready') {
      clearTimeout(bootTimer); // booted — from here the student sets the pace
      iframe.contentWindow.postMessage({ type: 'melodic-ext-target', durations, meter }, '*');
    } else if (ev.data.type === 'melodic-ext-unsupported') {
      cleanup(); settle(null);
    } else if (ev.data.type === 'melodic-ext-result') {
      // Round over: drop the listener/timer but LEAVE the iframe visible — the
      // student should see the game's own solved staff; the caller decides when
      // the DOM goes (notation-entry clears it moving to phase 2).
      clearTimeout(bootTimer);
      window.removeEventListener('message', onMsg);
      const total = ev.data.totalBeats || 1;
      const acc = Math.round(((total - (ev.data.wrongBeats || 0)) / total) * 100);
      settle({ allCorrect: !!ev.data.allCorrect, rhythmAccuracy: acc });
    }
  }
  window.addEventListener('message', onMsg);
  // If the game never reports ready (offline lab, missing files), fall back.
  const bootTimer = setTimeout(() => { cleanup(); settle(null); }, 8000);
  function cleanup() {
    clearTimeout(bootTimer);
    window.removeEventListener('message', onMsg);
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }
  return { destroy() { cleanup(); settled = true; } };
}

/* MIC CAPTURE for the Interval Gym SING station (INTERVAL_GYM_SPEC §5.4). Reuses
   the shared AudioContext (actx) so it inherits the project's hard-won Safari
   audio handling. getUserMedia is requested INSIDE the caller's button gesture
   (Safari requires it); resume() is awaited before analysis. Returns per-frame
   normalized-time-domain buffers to the pure detector in core/pitch.js — this
   file never does the pitch math itself (that stays testable in core/). */
let micStream = null;
let micSource = null;
let micAnalyser = null;
let micGain = null;

// Mic capture config. Default = the Interval Gym's fine-pitch setting (all DSP
// OFF, unity gain) so the Gym is unchanged. Coarse consumers (SingQuest) call
// configureMic() to trade fine accuracy for SENSITIVITY on quiet mobile mics:
// auto-gain ON + a boost GainNode so a phone/tablet actually hears the singer.
let micConfig = { echoCancellation: false, noiseSuppression: false, autoGainControl: false, gain: 1 };

/** Set mic capture options before the mic is opened. Releases any open mic so the
 *  next ensureMic() rebuilds the graph with the new settings. */
export function configureMic(cfg) {
  micConfig = { ...micConfig, ...(cfg || {}) };
  releaseMic();
}

async function ensureMic() {
  if (micAnalyser) return micAnalyser;
  const c = await unlockAudio();
  if (!c) throw new Error('no-audio-context');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no-getusermedia');
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: micConfig.echoCancellation,
      noiseSuppression: micConfig.noiseSuppression,
      autoGainControl: micConfig.autoGainControl,
    },
  });
  micSource = c.createMediaStreamSource(micStream);
  micAnalyser = c.createAnalyser();
  micAnalyser.fftSize = 2048;
  // Optional software boost for quiet inputs (SingQuest). Frequency is unchanged,
  // so pitch detection is unaffected; only the amplitude the analyser sees goes up.
  if (micConfig.gain && micConfig.gain !== 1) {
    micGain = c.createGain();
    micGain.gain.value = micConfig.gain;
    micSource.connect(micGain);
    micGain.connect(micAnalyser);
  } else {
    micSource.connect(micAnalyser);
  }
  return micAnalyser;
}

function releaseMic() {
  try { if (micSource) micSource.disconnect(); } catch (e) {}
  try { if (micGain) micGain.disconnect(); } catch (e) {}
  try { if (micStream) micStream.getTracks().forEach((t) => t.stop()); } catch (e) {}
  micStream = null; micSource = null; micAnalyser = null; micGain = null;
}

/**
 * Capture ~captureMs of microphone audio, sampling one time-domain frame every
 * ~frameMs, and hand each frame to the caller's per-frame detector. Returns the
 * raw frames + sampleRate so the caller (using core/pitch.js) can compute the
 * median voiced f0. Rejects if the mic is unavailable/denied (caller falls back
 * to self-compare). onLevel(peak) lets the UI draw a live "I hear you" meter.
 */
async function captureSungFrames({ captureMs = 2500, frameMs = 40, onFrame = null, onLevel = null } = {}) {
  const analyser = await ensureMic();
  const c = actxGet();
  const sampleRate = c.sampleRate;
  const buf = new Float32Array(analyser.fftSize);
  const frames = [];
  const frameCount = Math.max(1, Math.floor(captureMs / frameMs));
  for (let k = 0; k < frameCount; k++) {
    analyser.getFloatTimeDomainData(buf);
    const frame = Float32Array.from(buf);
    frames.push(frame);
    if (onFrame) onFrame(frame, sampleRate);
    if (onLevel) {
      let peak = 0;
      for (let i = 0; i < frame.length; i++) peak = Math.max(peak, Math.abs(frame[i]));
      onLevel(peak);
    }
    await new Promise((r) => setTimeout(r, frameMs));
  }
  return { frames, sampleRate };
}

export function createServices({ labelNoteFn, labelPaletteFn, labelCtx, tempoBPM = 92 }) {
  return Object.freeze({
    renderStaff,
    renderStaffPartial: (host, melody, hideIdx) => renderStaff(host, melody, { hideIdx }),
    renderRhythmLine,
    renderTwoStaves,
    clearStaff,
    mountRhythmEntry,
    playTwoPart: (tp, opts) => playTwoPart(tp, { bpm: tempoBPM, ...opts }),
    play: (melody, opts) => play(melody, { bpm: tempoBPM, ...opts }),
    playDegrees: (degreesSeq, melody, opts) => playDegrees(degreesSeq, melody, { bpm: tempoBPM, ...opts }),
    playCadence,
    playPairTimbred,
    playNote: (midi, durBeats, opts) => playNote(midi, durBeats, { bpm: tempoBPM, ...opts }),
    playNoteAt,
    audioNow,
    captureSungFrames,
    configureMic,
    releaseMic,
    stopAudio,
    label: (note) => labelNoteFn(note, labelCtx),
    labelPalette: () => labelPaletteFn(labelCtx),
    button: (text, kind) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.className = 'melodic-btn' + (kind ? ' melodic-btn--' + kind : '');
      return b;
    },
    icon: (name) => {
      // Minimal inline-SVG icon set (currentColor, no emoji — matches the no-emoji-in-UI rule).
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      svg.setAttribute('fill', 'currentColor');
      const path = document.createElementNS(svgNS, 'path');
      const PATHS = {
        play: 'M8 5v14l11-7z',
        check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
        cross: 'M18.3 5.71 12 12l6.3 6.29-1.41 1.42L12 13.41l-6.29 6.3-1.42-1.42L10.59 12 4.29 5.71 5.71 4.29 12 10.59l6.29-6.3z',
        up: 'M12 4l7 8h-4v8h-6v-8H5z',
        down: 'M12 20l-7-8h4V4h6v8h4z',
        same: 'M4 11h12.2l-3.6-3.6L14 6l6 6-6 6-1.4-1.4 3.6-3.6H4z',
        dot: 'M12 8a4 4 0 100 8 4 4 0 000-8z',
        restart: 'M17.65 6.35A7.96 7.96 0 0012 4a8 8 0 108 8h-2a6 6 0 11-6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z',
        home: 'M12 3 2 12h3v8h6v-6h2v6h6v-8h3z', // house glyph — the "hear home" reference button
      };
      path.setAttribute('d', PATHS[name] || PATHS.play);
      svg.appendChild(path);
      return svg;
    },
    tempoBPM: () => tempoBPM,
    // Switch example playback to a REAL sampled instrument (or 'synth'); loads lazily on the shared
    // AudioContext. Returns a promise -> true if the sampled instrument is ready.
    setInstrument: (name) => instruments.setInstrument(name, actxGet()),
    currentInstrument: () => instruments.currentInstrument(),
  });
}
