/**
 * @file melodic-renderers.js
 * @module melodic-renderers
 *
 * (The SING station imports pure pitch-grading math from core/pitch.js — no
 * WebAudio/DOM there; the live microphone stream comes through ctx.services.)
 *
 * Exercise-mode RENDERERS (MELODIC_RENDERER_SPEC.md §1, §3). Each renderer is a
 * factory `createXxxRenderer(host, ctx) -> { destroy() }` that mounts into a host
 * element the shell provides. Renderers NEVER import VexFlow/Tone/DOM color
 * directly — everything notation/audio/label/UI goes through `ctx.services`
 * (melodic-shell-services.js). No cross-round state, no mastery knowledge; each
 * renderer calls `ctx.onResult(...)` exactly once per round.
 */

import { detectPitch, medianPitch, gradeSungPitch, midiToHz } from './core/pitch.js';
import { gradeProtonotation } from './core/protonotation.js';
import { classifyDictation } from './core/feedback.js';
import { durationsToFigures, figureIdSequence } from './core/rhythm-figures.js';

/* Stage-isolated feedback (MELODIC_LADDER_EXPANSION_PLAN NEW-F): after a graded
 * dictation, name the dominant failing STAGE + a plain-language tip so the student
 * knows WHAT to practise (Klonoski's "which stage failed?"). Appends one line
 * under the status; silent on a clean answer. Callers pass the per-note truth +
 * answer degrees they already computed (and optional rhythm/pitch accuracy). */
function appendStageFeedback(host, o) {
  const fb = classifyDictation(o);
  if (fb.stage === 'clean') return;
  const el = document.createElement('div');
  el.className = 'melodic-feedback';
  el.textContent = 'Work on: ' + fb.headline + '. ' + fb.tip;
  host.appendChild(el);
}
/** Map a level's label palette back to scale degrees (labels are degree-indexed). */
function labelDegreeMap(services) {
  const palette = services.labelPalette();
  const m = new Map();
  palette.forEach((lab, i) => m.set(lab, i + 1));
  return m;
}

/* M0 stage-0 test tones (owner: the round kept repeating the same degrees). A
   deliberately BALANCED, VARIED set — about half HOME (degree 1̂, and sometimes an
   OCTAVE away, which is still home: octave-equivalent tonic) and half clearly
   NOT-home (2̂/3̂/5̂, occasionally octave-shifted for ear variety). Deterministic
   from the round seed; never three identical tones in a row. M0 is major by
   curriculum, so the major offsets are safe to inline. */
const M0_MAJOR_OFFSET = { 1: 0, 2: 2, 3: 4, 5: 7 };
function buildTonicTestNotes(tonicMidi, seed) {
  let s = (Number.isFinite(seed) ? seed : 1) >>> 0 || 1;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const homeOffsets = [0, 0, 0, 12, -12];    // mostly the root, sometimes an octave
  const notDegrees = [2, 3, 5, 2, 3, 5];     // varied non-home
  const plan = [1, 0, 1, 0, 1, 0, 1, 0];     // ~half home, half not
  for (let k = plan.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); const t = plan[k]; plan[k] = plan[j]; plan[j] = t; }
  const out = plan.map((isHome) => {
    if (isHome) { const off = homeOffsets[Math.floor(rnd() * homeOffsets.length)]; return { degree: 1, oct: off / 12, midi: tonicMidi + off }; }
    const d = notDegrees[Math.floor(rnd() * notDegrees.length)];
    const off = M0_MAJOR_OFFSET[d] + (rnd() < 0.18 ? 12 : 0);
    return { degree: d, oct: 0, midi: tonicMidi + off };
  });
  // Break any three-in-a-row identical tones (the repetition the owner flagged).
  for (let i = 2; i < out.length; i++) {
    if (out[i].midi === out[i - 1].midi && out[i - 1].midi === out[i - 2].midi) {
      out[i] = out[i].degree === 1
        ? { degree: 1, oct: 1, midi: tonicMidi + 12 }
        : { degree: out[i].degree === 2 ? 5 : 2, oct: 0, midi: tonicMidi + M0_MAJOR_OFFSET[out[i].degree === 2 ? 5 : 2] };
    }
  }
  return out;
}

/* A tap-the-target STREAM of `len` in-key notes (M0 stages 2-4). Generated
   deterministically with a controlled TARGET density (~1/3, at least one, never
   all) so a short RAMP-UP stream is as pedagogically sound as a long one — the
   owner's "ramp from a single note up to 10" between yes/no and the full stream.
   Home (1̂) targets are sometimes an octave away (still home). M0 is major. */
function buildTonicStream(tonicMidi, targetDegree, len, seed) {
  const pool = [1, 2, 3, 5];
  let s = (Number.isFinite(seed) ? seed : 1) >>> 0 || 1;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const nTargets = Math.max(1, Math.min(len - 1 || 1, Math.round(len / 3)));
  const positions = Array.from({ length: len }, (_, i) => i);
  for (let k = positions.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); const t = positions[k]; positions[k] = positions[j]; positions[j] = t; }
  const targetPos = new Set(positions.slice(0, nTargets));
  const others = pool.filter((d) => d !== targetDegree);
  const notes = [];
  for (let i = 0; i < len; i++) {
    const deg = targetPos.has(i) ? targetDegree : others[Math.floor(rnd() * others.length)];
    const midi = tonicMidi + M0_MAJOR_OFFSET[deg]; // SINGLE octave — octave equivalence is the live octave stage's job
    notes.push({ degree: deg, midi, oct: 0 });
  }
  return notes;
}

/** Small deterministic shuffle (Fisher-Yates keyed by a seed) — same discipline as
 *  the rest of this codebase: no ambient Math.random for anything that affects what
 *  the student sees, so a round is reproducible from its seed. */
function seededShuffle(arr, seed) {
  const out = arr.slice();
  let s = (Number.isFinite(seed) ? seed : 1) >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* "Hear home" — sounds the tonic so the student has a tonal anchor BEFORE (and
   any time during) the melody. RCM gives the tonic before every playback task;
   without it the first note arrives with no context at all (owner-reported on M5).
   Added beside every Play button. */
/* HEARING ECONOMY (research: "2-3 hearings"): dictation Play buttons carry a
   per-round budget (default 3). ctx.practice = unlimited (the anxiety slack the
   research prescribes for kids); Hear-home is always free. */
// Every Play button is IDENTICAL: just the green play triangle (matches M0's icon-only Play),
// no word. When there's a hearing limit, the remaining-hearings pips sit in their OWN row
// BELOW the button (never inside it), so the button itself never changes shape. Returns the
// node to append (a wrapper when pips exist, else the bare button).
export function wireHearings(playBtn, ctx, playFn) {
  const unlimited = !!ctx.practice;
  let left = 3;
  playBtn.textContent = '';
  playBtn.classList.add('melodic-btn--icon');
  playBtn.setAttribute('aria-label', 'Play');
  playBtn.appendChild(ctx.services.icon('play'));
  const wrap = document.createElement('div');
  wrap.className = 'melodic-play-wrap';
  const col = document.createElement('div');
  col.className = 'melodic-play-wrap__col';   // Play stacked over its hearing pips
  col.appendChild(playBtn);
  wrap.appendChild(col);
  let pipsEl = null;
  if (!unlimited) {
    pipsEl = document.createElement('span');
    pipsEl.className = 'melodic-hearpips';
    col.appendChild(pipsEl);
  }
  // Per-example playback speed wheel. Local + fresh on EVERY render, so every new example STARTS at
  // Medium; a quick flick to Slow lets the student re-hear it slower. Affects only THIS level's plays
  // (bpm = this level's base tempo x the wheel factor) — not global, not persisted.
  const SPEED_FACTORS = { slow: 0.7, med: 1.0, fast: 1.3 };
  let speedKey = 'med';
  const baseBpm = ctx.services.tempoBPM ? ctx.services.tempoBPM() : 92;
  const curBpm = () => Math.round(baseBpm * (SPEED_FACTORS[speedKey] || 1));
  // The wheel is created here but appended inside the play-wrap only as a fallback; addHomeButton
  // moves it to sit AFTER Home so the transport row reads Play -> HOME -> Speed (owner).
  const speedWheel = makeSpeedWheel(speedKey, (k) => { speedKey = k; });
  wrap.appendChild(speedWheel);
  wrap.__speedWheel = speedWheel;
  const paint = () => {
    if (pipsEl) {
      pipsEl.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const d = document.createElement('span');
        d.className = 'melodic-hearpip' + (i < left ? '' : ' is-spent');
        pipsEl.appendChild(d);
      }
    }
    playBtn.disabled = !unlimited && left <= 0;
  };
  playBtn.onclick = async () => {
    if (!unlimited) { if (left <= 0) return; left--; }
    paint();
    // Home ALWAYS sounds first as an orientation reference, then the example (owner).
    const tonic = ctx.melody && ctx.melody.tonicMidi;
    if (Number.isFinite(tonic)) {
      if (ctx.onHomeStart) ctx.onHomeStart();            // optional: light a HOME indicator while it sounds
      await ctx.services.playNote(tonic, 0.9);
      if (ctx.onHomeEnd) ctx.onHomeEnd();
      await new Promise((r) => setTimeout(r, 300));
    }
    playFn(curBpm());
  };
  paint();
  wrap.mqGetBpm = curBpm;   // so a renderer's own play controls (e.g. measure-focus) match the wheel
  return wrap;
}

// The per-example speed wheel: a compact vertical scroll picker showing ONE mode at a time
// (Slow / Medium / Fast). Flick or scroll to change; click cycles; arrow keys step. The bordered
// window + inset edge-shadow hint that it scrolls; the active mode is the bright one. currentColor
// throughout, so it themes itself. Starts on `initialKey` (always 'med' at the start of an example).
function makeSpeedWheel(initialKey, onChange) {
  const KEYS = ['slow', 'med', 'fast'];
  const LABELS = { slow: 'Slow', med: 'Medium', fast: 'Fast' };
  let cur = KEYS.includes(initialKey) ? initialKey : 'med';
  const root = document.createElement('div');
  root.className = 'melodic-speedwheel';
  root.tabIndex = 0;
  root.setAttribute('role', 'slider');
  root.setAttribute('aria-label', 'Playback speed');
  const cap = document.createElement('div'); cap.className = 'melodic-speedwheel__cap'; cap.textContent = 'Speed';
  const view = document.createElement('div'); view.className = 'melodic-speedwheel__view';
  const track = document.createElement('div'); track.className = 'melodic-speedwheel__track';
  KEYS.forEach((k) => { const o = document.createElement('div'); o.className = 'melodic-speedwheel__opt'; o.dataset.key = k; o.textContent = LABELS[k]; track.appendChild(o); });
  view.appendChild(track); root.append(cap, view);
  const idxOf = (k) => Math.max(0, KEYS.indexOf(k));
  const itemH = () => { const c = track.children[0]; return (c && c.getBoundingClientRect().height) || 30; };
  const mark = () => { [...track.children].forEach((o) => o.classList.toggle('is-active', o.dataset.key === cur)); root.setAttribute('aria-valuetext', LABELS[cur]); };
  const scrollTo = (smooth) => view.scrollTo({ top: idxOf(cur) * itemH(), behavior: smooth ? 'smooth' : 'auto' });
  const set = (k, smooth) => { if (!KEYS.includes(k)) return; if (k !== cur) { cur = k; onChange(k); } mark(); scrollTo(smooth); };
  let settle = null; // after a flick/scroll settles, snap the value to the option nearest the window
  view.addEventListener('scroll', () => {
    if (settle) clearTimeout(settle);
    settle = setTimeout(() => {
      const i = Math.min(KEYS.length - 1, Math.max(0, Math.round(view.scrollTop / itemH())));
      if (KEYS[i] && KEYS[i] !== cur) { cur = KEYS[i]; onChange(cur); mark(); }
    }, 80);
  }, { passive: true });
  root.addEventListener('wheel', (e) => { e.preventDefault(); set(KEYS[Math.min(KEYS.length - 1, Math.max(0, idxOf(cur) + (e.deltaY > 0 ? 1 : -1)))], true); }, { passive: false });
  root.addEventListener('click', () => set(KEYS[(idxOf(cur) + 1) % KEYS.length], true));
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    set(KEYS[Math.min(KEYS.length - 1, Math.max(0, idxOf(cur) + (e.key === 'ArrowDown' ? 1 : -1)))], true);
  });
  mark();
  requestAnimationFrame(() => scrollTo(false));
  return root;
}

// The game's ONE Play-button look: just the green play triangle, icon-only, no word
// (matches M0). Every "Play"/"Hear it" transport button uses this.
export function makePlayButton(services, aria) {
  const btn = services.button('', 'play');
  btn.classList.add('melodic-btn--icon');
  btn.appendChild(services.icon('play'));
  btn.setAttribute('aria-label', aria || 'Play');
  return btn;
}

// "Hear home" matches Level 1's HOME reference exactly: a NEUTRAL "[play] HOME" button
// (M0's HOME tile is neutral, not green) so the one prominent green Play never has a
// second green button competing beside it. Green = the primary transport; the home
// reference is neutral.
function addHomeButton(row, ctx) {
  const { services, melody } = ctx;
  const btn = services.button('HOME', 'choice'); // neutral, like the M0 HOME tile
  btn.prepend(services.icon('play'));            // "[play] HOME" — same glyph M0 uses
  btn.setAttribute('aria-label', 'Hear home');
  btn.title = 'Hear home';
  btn.onclick = () => services.playNote(melody.tonicMidi, 2);
  row.appendChild(btn);
  // Transport order is Play -> HOME -> Speed: pull the speed wheel (created inside the play-wrap by
  // wireHearings) out to sit AFTER Home. appendChild MOVES it, so it lands last in the row.
  const pw = row.querySelector('.melodic-play-wrap');
  if (pw && pw.__speedWheel) row.appendChild(pw.__speedWheel);
  return btn;
}

/* Levels whose melodies are anchored to START on the tonic tell the student so —
   knowing note #1 is 1̂ turns the whole exercise from guessing into anchored work. */
function startsOnHomeText(ctx) {
  return ctx.level && ctx.level.pitch && ctx.level.pitch.startOn === 'tonic'
    ? ' The melody STARTS on 1\u0302 \u2014 home.'
    : '';
}

/**
 * §3 `exerciseMode: 'recognition'` — hear it, pick the matching staff from options.
 * Uses distractors. `onResult.accuracy` is 100 or 0 (a single right/wrong choice).
 *
 * @param {HTMLElement} host empty container the shell provides (already themed)
 * @param {Object} ctx
 * @param {Object} ctx.level          the melodic-curriculum level object
 * @param {import('./core/melodic.js').Melody} ctx.melody       the correct melody
 * @param {import('./core/melodic.js').Melody[]} ctx.distractors near-miss options
 * @param {Object} ctx.labelCtx       { key, mode, system, minorSolfege }
 * @param {Object} ctx.services       shell-provided services (see melodic-shell-services.js)
 * @param {(result:{correct:boolean, clean:boolean, accuracy:number, meta:Object}) => void} ctx.onResult
 * @returns {{ destroy: () => void }}
 */
export function createRecognitionRenderer(host, ctx) {
  const { melody, distractors, labelCtx, services } = ctx;
  let answered = false;
  let destroyed = false;

  host.innerHTML = '';
  host.classList.add('melodic-recognition');

  const howTo = document.createElement('div');
  howTo.className = 'melodic-howto';
  howTo.textContent = 'Which staff did you hear?';
  host.appendChild(howTo);

  // --- the "hear it" row: a Play button + the degree/label readout (no pitches shown —
  //     this is a LISTENING exercise; seeing the correct notation up front would trivialize it) ---
  const playRow = document.createElement('div');
  playRow.className = 'melodic-recognition__play-row';
  const playBtn = services.button('Play', 'play');
  playRow.appendChild(wireHearings(playBtn, ctx, (bpm) => services.play(melody, { bpm })));
  addHomeButton(playRow, ctx);
  host.appendChild(playRow);

  // --- the option grid: correct melody + distractors, shuffled, each its own rendered staff ---
  const seed = (melody.meta && Number.isFinite(melody.meta.seed)) ? melody.meta.seed : 1;
  const options = seededShuffle([melody, ...distractors], seed);
  const correctIndex = options.indexOf(melody);

  const grid = document.createElement('div');
  grid.className = 'melodic-recognition__grid';
  host.appendChild(grid);

  const optionEls = options.map((opt, i) => {
    const cell = document.createElement('div');
    cell.className = 'melodic-recognition__option';
    cell.dataset.index = String(i);
    grid.appendChild(cell);
    services.renderStaff(cell, opt);
    cell.addEventListener('click', () => handleChoice(i, cell));
    return cell;
  });

  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-recognition__status';
  host.appendChild(statusEl);

  function handleChoice(i, cell) {
    if (answered || destroyed) return;
    answered = true;
    const isCorrect = i === correctIndex;

    optionEls.forEach((el, k) => {
      el.classList.remove('is-selectable');
      if (k === correctIndex) el.classList.add('is-correct');
      else if (k === i) el.classList.add('is-wrong');
    });
    statusEl.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
    statusEl.textContent = isCorrect ? 'Correct' : 'Not quite — the highlighted staff was playing';

    ctx.onResult({
      correct: isCorrect,
      clean: isCorrect, // a single-choice exercise: correct-on-first-try IS clean
      accuracy: isCorrect ? 100 : 0,
      meta: { chosenIndex: i, correctIndex, optionCount: options.length },
    });
  }

  optionEls.forEach((el) => el.classList.add('is-selectable'));

  return {
    destroy() {
      destroyed = true;
      services.stopAudio();
      host.innerHTML = '';
    },
  };
}

/* ============================================================================
 * labeling — assign a degree/solfège label per note, NO staff shown (notation
 * is deliberately withheld until M9; this renderer is what M3-M8 actually use).
 * ========================================================================== */

/** Duration-code vocabulary (public, shared with core/melodic.js's MelodicNote.duration —
 *  not a VexFlow/Tone dependency, just interpreting the note data the renderer already
 *  received directly) used ONLY to size rhythm slots proportionally to their length. */
const DUR_BEATS = { w: 4, h: 2, hd: 3, q: 1, qd: 1.5, '8': 0.5, '8d': 0.75, '16': 0.25 };
function beatsOf(duration) { return DUR_BEATS[String(duration).replace('r', '')] || 1; }

/**
 * §3 `exerciseMode: 'labeling'` — tap the degree/syllable under each note in rhythm
 * order (no staff, no distractors). `onResult.accuracy` is per-note % correct.
 *
 * @param {HTMLElement} host
 * @param {Object} ctx { level, melody, labelCtx, services, onResult } (no distractors)
 * @returns {{ destroy: () => void }}
 */
export function createLabelingRenderer(host, ctx) {
  const { level, melody, labelCtx, services } = ctx;
  let destroyed = false;
  let submitted = false;
  let hadMistake = false;

  host.innerHTML = '';
  host.classList.add('melodic-labeling');

  const howTo = document.createElement('div');
  howTo.className = 'melodic-howto';
  howTo.textContent = 'Name each note.';
  host.appendChild(howTo);

  const playRow = document.createElement('div');
  playRow.className = 'melodic-labeling__play-row';
  const playBtn = services.button('Play', 'play');
  playRow.appendChild(wireHearings(playBtn, ctx, (bpm) => services.play(melody, { bpm })));
  addHomeButton(playRow, ctx);
  host.appendChild(playRow);

  // --- the RHYTHM, as real notation (owner-requested; matches the curriculum's
  //     "the rhythm appears as notes... the student taps the degree under each
  //     note"): a single-line rhythm staff via services.renderRhythmLine, with
  //     the student's answers drawn UNDER the actual notes. No pitch is shown —
  //     naming the pitches IS the exercise. ---
  const staffHost = document.createElement('div');
  staffHost.className = 'melodic-labeling__staff';
  host.appendChild(staffHost);

  const answers = new Array(melody.notes.length).fill(null);
  let activeSlot = 0;

  function drawRhythm() {
    services.renderRhythmLine(staffHost, melody, {
      labels: answers.map((a) => a || ''),
      activeIdx: submitted ? -1 : activeSlot,
      onNoteClick: (i) => {
        if (submitted || destroyed) return;
        activeSlot = i; // jump to any note to revise before checking
        drawRhythm();
      },
    });
  }

  // --- the label palette, filtered to the degrees THIS level actually teaches (a
  //     level like M3's 1-2-3 shouldn't offer 4..7 as live choices). ---
  const paletteRow = document.createElement('div');
  paletteRow.className = 'melodic-labeling__palette';
  host.appendChild(paletteRow);

  const fullPalette = services.labelPalette();
  const allowedDegrees = (level && level.pitch && level.pitch.degrees) || [1, 2, 3, 4, 5, 6, 7];

  const paletteBtns = fullPalette.map((label, i) => {
    const degree = i + 1;
    if (!allowedDegrees.includes(degree)) return null;
    const btn = services.button(label, 'choice');
    btn.onclick = () => assign(label);
    paletteRow.appendChild(btn);
    return btn;
  });

  const checkRow = document.createElement('div');
  checkRow.className = 'melodic-labeling__check-row';
  host.appendChild(checkRow);
  const hearMineBtn = services.button('Hear MY answer', 'choice');
  hearMineBtn.disabled = true;
  hearMineBtn.onclick = () => { if (!answers.some((a) => a == null)) services.playDegrees(degreesFromAnswers(), melody); };
  checkRow.appendChild(hearMineBtn);
  const checkBtn = services.button('Check', 'primary');
  checkBtn.disabled = true;
  checkBtn.onclick = grade;
  checkRow.appendChild(checkBtn);

  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-labeling__status';
  host.appendChild(statusEl);

  function nextEmptySlot() {
    return answers.findIndex((a) => a == null);
  }

  function assign(label) {
    if (submitted || destroyed) return;
    const i = activeSlot >= 0 && activeSlot < answers.length ? activeSlot : nextEmptySlot();
    if (i < 0) return; // all filled and nothing selected
    const wasEmpty = answers[i] == null;
    answers[i] = label;
    if (!wasEmpty) hadMistake = true; // revising an answer counts against "clean"
    const next = nextEmptySlot();
    activeSlot = next >= 0 ? next : -1;
    checkBtn.disabled = next !== -1;
    hearMineBtn.disabled = next !== -1;
    drawRhythm();
  }

  // A/B self-compare (research: strong error-detection lever): once every note has
  // an answer, hear YOUR line back-to-back with the original — unlimited, free.
  function degreesFromAnswers() {
    const palette = services.labelPalette();
    return answers.map((a) => palette.indexOf(a) + 1);
  }

  function grade() {
    if (submitted || destroyed || nextEmptySlot() !== -1) return;
    submitted = true;

    let numCorrect = 0;
    const marks = [];
    melody.notes.forEach((note, i) => {
      const truth = services.label(note);
      const isRight = answers[i] === truth;
      if (isRight) numCorrect++;
      // graded read-back: show right answers plainly, wrong ones as "yours->truth"
      marks.push(isRight ? answers[i] : answers[i] + '->' + truth);
    });
    services.renderRhythmLine(staffHost, melody, { labels: marks });
    paletteBtns.forEach((b) => { if (b) b.disabled = true; });
    checkBtn.disabled = true;

    const accuracy = Math.round((numCorrect / melody.notes.length) * 100);
    const correct = accuracy === 100;
    statusEl.classList.add(correct ? 'is-correct' : 'is-wrong');
    statusEl.textContent = correct ? 'Correct' : numCorrect + ' / ' + melody.notes.length + ' correct — corrections shown under the notes';

    if (!correct) {
      const dmap = labelDegreeMap(services);
      appendStageFeedback(statusEl, {
        trueDegrees: melody.notes.map((n) => n.degree),
        answerDegrees: answers.map((a) => (dmap.has(a) ? dmap.get(a) : null)),
      });
    }

    ctx.onResult({
      correct,
      clean: correct && !hadMistake,
      accuracy,
      meta: { numCorrect, total: melody.notes.length, answers: answers.slice() },
    });
  }

  drawRhythm();

  return {
    destroy() {
      destroyed = true;
      services.stopAudio();
      host.innerHTML = '';
    },
  };
}

/* ============================================================================
 * tonic-contour — the M0-M1 aural pre-foundation. M0 ("is this the tonic?") vs
 * M1 ("up/down/same?") are distinguished by which teaching LAYER the level uses
 * (layers includes '0a' -> M0; '0b' -> M1) — same renderer, different prompt.
 * No distractors, no staff at all (this predates even the labeling exercise).
 * ========================================================================== */

/**
 * §3 `exerciseMode: 'tonic-contour'` — the true beginner's first exercise.
 *
 * @param {HTMLElement} host
 * @param {Object} ctx { level, melody, labelCtx, services, onResult } (no distractors)
 * @returns {{ destroy: () => void }}
 */
/* M0 STAGE 0 — "Find Home, live" (owner redesign): no more Next-click Q&A. Home is
 * established, then a stream of notes goes by ~1.5s apart; the student taps the single
 * HOME button whenever the CURRENT note is home, and does nothing otherwise. Five clean
 * hits clears a key, then a NEW home note is set and it repeats — a few keys deep, so we
 * know the student can find home regardless of the tonic. A false tap COSTS a hit (so
 * guessing can't farm it); a miss just doesn't count (kept encouraging). The single HOME
 * button also starts the round on its first tap (which unlocks audio). */
/* The two speed tiers of the live find-home (owner): a comfortable pace first, then a
 * QUICK pace across more keys as the automaticity proof. Config-driven so both reuse the
 * same engine — only keys / hits-per-key / spacing / heading differ. */
const M0_LIVE_TIERS = {
  // Early tiers establish EXACT home in a SINGLE octave (octave equivalence is a separate,
  // harder skill and is NOT mixed in here — owner). The octave tier introduces it explicitly.
  comfortable: { keys: 3, hits: 5, stepMs: 1500, heading: 'Find HOME — live',
    howTo: 'HOME plays first. Then notes come one at a time — tap HOME every time the note you hear IS home. Do nothing otherwise.' },
  quick: { keys: 5, hits: 3, stepMs: 900, heading: 'Find HOME — quick!',
    howTo: 'Same game, faster and across more keys. Tap HOME on every home note.' },
  octave: { keys: 3, hits: 4, stepMs: 1300, octaveHome: true, heading: 'HOME in any octave',
    howTo: 'HOME is still HOME an octave higher or lower. It plays in BOTH octaves first — then tap HOME whenever you hear it, high or low.' },
};
function createLiveHomeRenderer(host, ctx, tier) {
  const cfg = tier || M0_LIVE_TIERS.comfortable;
  const { services } = ctx;
  const T = (typeof window !== 'undefined' && window.__mqTest) || null;
  const fast = !!(T && T.fastLive); // test seam: run the cadence fast so CI isn't real-time
  const STEP_MS = fast ? 70 : cfg.stepMs;
  const TONE = fast ? 0.05 : 0.7;
  const HITS_NEEDED = cfg.hits;
  const MISS_CAP = cfg.missCap || 6; // stop the stream after this many mistakes on a key (owner: don't run forever)
  // Non-home scale-degree offsets (semitones above the tonic) the stream draws
  // from. Defaults to the MAJOR scale degrees 2..7 (unchanged M0 behavior); a
  // minor level passes its own set via cfg.scale (natural minor = 2 flat-3 4 5
  // flat-6 flat-7 => [2,3,5,7,8,10]).
  const SCALE_NONHOME = (cfg.scale && cfg.scale.length) ? cfg.scale : [2, 4, 5, 7, 9, 11];
  // Optional override of what counts as HOME (semitone offsets from the tonic that
  // the student should tap). Defaults to the tonic + its octave. The minor-third
  // landmark phase sets this to the flat-3 so "home" becomes the note that DEFINES
  // minor (owner: hear the minor third).
  const HOME_OFFSETS = (cfg.homeOffsets && cfg.homeOffsets.length) ? cfg.homeOffsets : (cfg.octaveHome ? [0, 12, -12] : [0]);
  // When the target is NOT the tonic (the flat-3 landmark), the reference note the
  // 3-2-1 count sounds is the target itself, and any non-home offset that collides
  // with a target offset (mod-octave) is dropped so a "wrong" note is never actually
  // the target. Home phases keep the tonic reference + the full non-home pool.
  const targetPcs = new Set(HOME_OFFSETS.map((o) => ((o % 12) + 12) % 12));
  const refOffset = (cfg.homeOffsets && cfg.homeOffsets.length) ? HOME_OFFSETS[0] : 0;
  const nonHomePool = (cfg.homeOffsets && cfg.homeOffsets.length)
    ? SCALE_NONHOME.filter((o) => !targetPcs.has(((o % 12) + 12) % 12))
    : SCALE_NONHOME;
  let destroyed = false;

  host.innerHTML = '';
  host.classList.add('melodic-live-home');

  // cfg.keys DISTINCT tonics, starting near the round's own key.
  const POOL = [60, 62, 64, 65, 67, 69];
  const basePc = ((((ctx.melody && ctx.melody.tonicMidi) || 60) % 12) + 12) % 12;
  const baseInPool = POOL.reduce((a, b) => (Math.abs((b % 12) - basePc) < Math.abs((a % 12) - basePc) ? b : a), POOL[0]);
  const rest = POOL.filter((t) => t !== baseInPool);
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  const tonics = [baseInPool, ...rest].slice(0, cfg.keys);
  const KEYS = tonics.length;

  // The tappable-target's display name (for the button + prompts). Home phases keep
  // "HOME"; the minor-third landmark passes cfg.targetLabel so the button/prompts
  // name the note that defines minor instead.
  const TARGET_LABEL = cfg.targetLabel || 'HOME';
  // The button is dual-purpose: a clear "Start" call-to-action while WAITING (a first-timer
  // wouldn't know to press "HOME" to begin), then it becomes the TARGET once notes stream.
  const START_LABEL = 'Start';

  // No on-card heading/how-to here (owner: too many overlapping instructions) — the
  // level's intro MODAL explains the controls; the big button + the dynamic status line
  // below carry it on screen. Keeps the play area to just what matters.
  const prog = document.createElement('div');
  prog.className = 'melodic-live-home__progress';
  host.appendChild(prog);
  const btn = document.createElement('button');
  btn.type = 'button';
  // The button changes ROLE, so it changes colour: while it says "Start" it is a green
  // transport/go button (consistent with every other Play button); once tapping begins it
  // becomes a NEUTRAL grey target that only flashes green on a correct hit (is-hit) or red
  // on a wrong tap (is-false) — it must NOT sit permanently coloured during play.
  btn.className = 'melodic-btn melodic-btn--go melodic-live-home__btn';
  const setBtnStart = () => { btn.classList.add('melodic-btn--go'); btn.classList.remove('melodic-btn--primary'); };
  const setBtnTarget = () => { btn.classList.remove('melodic-btn--go', 'melodic-btn--primary'); }; // neutral grey while tapping
  btn.textContent = START_LABEL;
  btn.setAttribute('aria-label', 'Tap to start; then tap when you hear the target');
  host.appendChild(btn);
  const status = document.createElement('div');
  status.className = 'melodic-tonic-contour__status';
  host.appendChild(status);
  // Start-over button (owner: a way out if the student doesn't get the gist) — re-hears
  // home and restarts the current key from the top without losing overall progress.
  const restartBtn = document.createElement('button');
  restartBtn.type = 'button';
  restartBtn.className = 'melodic-btn melodic-live-home__restart';
  restartBtn.appendChild(services.icon('restart')); // owner: just a repeat SVG, no "Start over" text
  restartBtn.setAttribute('aria-label', 'Start over');
  restartBtn.title = 'Start over';
  restartBtn.onclick = () => restartKey('Start over — tap Start to begin.');
  host.appendChild(restartBtn);

  let awaitingStart = true, countingDown = false, keyMistakes = 0;
  let keyIdx = 0, hits = 0, totHits = 0, totFalse = 0, totMiss = 0;
  let curNote = null, curResolved = true, sinceHome = 0, homeStreak = 0;
  let noteTO = 0, demoTO = 0, gapTO = 0;
  const tonic = () => tonics[keyIdx];

  function updateHud() {
    // A visual pip-meter that fills as you hit each home note (owner: fewer words, more
    // visual), plus a small dot per key showing which key you're on.
    prog.innerHTML = '';
    const hitRow = document.createElement('span'); hitRow.className = 'melodic-live-home__hits';
    for (let i = 0; i < HITS_NEEDED; i++) { const d = document.createElement('span'); d.className = 'melodic-live-home__hit' + (i < hits ? ' is-filled' : ''); hitRow.appendChild(d); }
    prog.appendChild(hitRow);
    const keyRow = document.createElement('span'); keyRow.className = 'melodic-live-home__keys';
    for (let k = 0; k < KEYS; k++) { const d = document.createElement('span'); d.className = 'melodic-live-home__key' + (k < keyIdx ? ' is-done' : k === keyIdx ? ' is-active' : ''); keyRow.appendChild(d); }
    prog.appendChild(keyRow);
  }
  function setStatus(t) { status.textContent = t; }
  function flash(cls) {
    btn.classList.remove('is-hit', 'is-false', 'is-miss');
    void btn.offsetWidth;
    btn.classList.add(cls);
    setTimeout(() => { if (!destroyed) btn.classList.remove(cls); }, fast ? 15 : 450);
  }
  function nextNote() {
    let home;
    if (sinceHome >= 3) home = true;          // a home at least every 4 notes (attainable)
    else if (homeStreak >= 2) home = false;   // never 3 homes in a row
    else home = Math.random() < 0.42;
    let midi;
    if (home) {
      // Default (M0 major) behavior preserved EXACTLY: mostly the root, sometimes an
      // octave up (both are "home"). A landmark phase supplies cfg.homeOffsets so the
      // tapped note is e.g. the flat-3 (and its octave) instead.
      // Single-octave tiers keep home at the tonic (off=0). Only the octave tier (or a
      // homeOffsets landmark) mixes octaves — so octave equivalence is taught, not sprung.
      const off = (cfg.homeOffsets && cfg.homeOffsets.length) || cfg.octaveHome
        ? HOME_OFFSETS[Math.floor(Math.random() * HOME_OFFSETS.length)]
        : 0;
      midi = tonic() + off; sinceHome = 0; homeStreak++;
    } else {
      homeStreak = 0; sinceHome++; midi = tonic() + nonHomePool[Math.floor(Math.random() * nonHomePool.length)];
    }
    return { midi, home };
  }
  function bumpMistake() {
    keyMistakes++;
    if (keyMistakes >= MISS_CAP) restartKey('That one’s tricky — tap Start to hear it again.');
  }
  function restartKey(msg) {
    clearTimeout(noteTO); clearTimeout(demoTO); clearTimeout(gapTO); noteTO = 0;
    hits = 0; keyMistakes = 0; sinceHome = 0; homeStreak = 0; curNote = null; curResolved = true;
    countingDown = false; btn.classList.remove('is-demo', 'is-hit', 'is-false', 'is-miss');
    awaitingStart = true; btn.textContent = START_LABEL; btn.classList.add('is-await'); setBtnStart();
    setStatus(msg); updateHud();
  }
  function autoResolve() {
    if (!curNote || curResolved) return;
    curResolved = true;
    if (curNote.home) { totMiss++; flash('is-miss'); setStatus('that one was ' + TARGET_LABEL); bumpMistake(); }
  }
  function tick() {
    if (destroyed) return;
    autoResolve();                               // grade the note that just ended
    if (awaitingStart) return;                   // stopped mid-stream (miss cap / start-over)
    if (hits >= HITS_NEEDED) { onKeyDone(); return; }
    curNote = nextNote();
    curResolved = false;
    try { services.playNote(curNote.midi, TONE); } catch (e) {}
    updateHud();
    noteTO = setTimeout(tick, STEP_MS);
  }
  function press() {
    if (destroyed) return;
    // A press is what STARTS every key (owner: don't auto-jump into the next home) —
    // it also serves as the audio-unlock gesture on the very first tap.
    if (awaitingStart) { awaitingStart = false; btn.classList.remove('is-await'); setBtnTarget(); establishHome(startStream); return; }
    if (countingDown) return; // ignore taps during the 3-2-1 home reference
    if (!curNote || curResolved) return;
    curResolved = true;
    if (curNote.home) {
      hits++; totHits++; flash('is-hit'); setStatus('');
      try { services.playNote(88, fast ? 0.03 : 0.16); } catch (e) {} // soft confirming tick
      updateHud();
      if (hits >= HITS_NEEDED) { clearTimeout(noteTO); onKeyDone(); }
    } else {
      totFalse++; hits = Math.max(0, hits - 1); flash('is-false'); setStatus('not that one');
      updateHud(); bumpMistake();
    }
  }
  btn.onclick = press;
  function onKeyDone() {
    clearTimeout(noteTO);
    keyIdx++;
    if (keyIdx >= KEYS) { finishAll(); return; }
    hits = 0; keyMistakes = 0; sinceHome = 0; homeStreak = 0; curNote = null; curResolved = true;
    // Wait for an explicit press before the next home — no surprise auto-start.
    awaitingStart = true;
    btn.textContent = START_LABEL; btn.classList.add('is-await'); setBtnStart();
    setStatus('Great! Tap Start for the next one');
    updateHud();
  }
  function establishHome(then) {
    if (destroyed) return;
    countingDown = true;
    setStatus('Listen — this is ' + TARGET_LABEL);
    btn.classList.add('is-demo');
    const step = fast ? 45 : 800;
    // Count 3-2-1 IN THE BUTTON as the three reference notes play, so the start
    // is never a surprise (owner idea). The reference is the TARGET note (the tonic
    // on home phases; the flat-3 on the minor-third landmark).
    // Octave stage: the reference sounds home LOW-HIGH-LOW so the student anchors "home is
    // home in either octave" before the stream (fixes the old mismatch where a displaced home
    // was tested but the reference only ever played the base octave).
    const refSeq = cfg.octaveHome ? [0, 12, 0] : [refOffset, refOffset, refOffset];
    [3, 2, 1].forEach((n, i) => setTimeout(() => {
      if (destroyed) return;
      try { services.playNote(tonic() + refSeq[i], fast ? 0.05 : 0.7); } catch (e) {}
      btn.textContent = String(n);
    }, i * step));
    demoTO = setTimeout(() => {
      if (destroyed) return;
      countingDown = false;
      btn.classList.remove('is-demo');
      btn.textContent = TARGET_LABEL;
      setStatus('Tap ' + TARGET_LABEL + ' when you hear it');
      then();
    }, step * 3 + (fast ? 20 : 350));
  }
  function startStream() { curNote = null; curResolved = true; keyMistakes = 0; tick(); }
  function finishAll() {
    if (destroyed) return;
    const total = totHits + totFalse + totMiss;
    const accuracy = total ? Math.round(100 * totHits / total) : 100;
    setStatus(cfg.doneText || ('You found ' + TARGET_LABEL + ' in every key!'));
    const meta = { stage: 0, mode: 'live-home', keys: KEYS, falseTaps: totFalse, misses: totMiss };
    // Composed sessions (the minor level runs several phases back-to-back) hand the
    // per-phase outcome back to a wrapper via cfg.onPhaseDone; a phase never reports
    // the ROUND result itself. Standalone M0 stages keep calling ctx.onResult directly.
    if (typeof cfg.onPhaseDone === 'function') cfg.onPhaseDone({ accuracy, falseTaps: totFalse, misses: totMiss, hits: totHits });
    else ctx.onResult({ correct: true, clean: true, accuracy, meta });
  }

  if (T) T.liveHome = { press, homeOffsets: HOME_OFFSETS.slice(), octaveHome: !!cfg.octaveHome, getState: () => ({ awaitingStart, countingDown, keyIdx, hits, totHits, totFalse, totMiss, curHome: !!(curNote && curNote.home), curResolved, done: keyIdx >= KEYS }) };

  updateHud();
  setStatus('Ready? Tap Start to begin.');
  btn.classList.add('is-await');

  return {
    destroy() {
      destroyed = true;
      clearTimeout(noteTO); clearTimeout(demoTO); clearTimeout(gapTO);
      try { services.stopAudio(); } catch (e) {}
      host.innerHTML = '';
      if (T && T.liveHome) T.liveHome = null;
    },
  };
}

/* ============================================================================
 * live-home-minor (M5.5 "Find home — minor") — the M0 live find-home engine, run
 * in MINOR. Minor home does NOT transfer automatically from major (a distinct
 * aural skill), so this rung re-proves it against natural-minor keys. It COMPOSES
 * createLiveHomeRenderer across three phases in sequence, feeding it the minor
 * non-home scale so every non-tonic note the student rejects is a genuine minor
 * scale degree:
 *   1. comfortable — find HOME (the tonic) in minor, a few keys, roomy pace.
 *   2. quick       — find HOME in minor across more keys, faster (automaticity).
 *   3. flat-3      — the minor-third LANDMARK: tap the note that DEFINES minor
 *                    (flat-3 above the tonic). Reuses the same live engine with a
 *                    target override, so no tile/tap-target path (which assumes
 *                    major) is touched. See the report's follow-up note.
 * The whole session reports ONE clean ctx.onResult when all phases complete, so it
 * plugs into the NORMAL mastery/coverage/advancement gate like any graded level.
 * ========================================================================== */
const MINOR_NONHOME = [2, 3, 5, 7, 8, 10]; // natural-minor degrees 2, flat-3, 4, 5, flat-6, flat-7 (semitones above tonic)
const LIVE_MINOR_PHASES = [
  { keys: 3, hits: 5, stepMs: 1500, scale: MINOR_NONHOME,
    heading: 'Find HOME — minor', targetLabel: 'HOME',
    howTo: 'This key is MINOR. Home plays first, then notes go by — tap HOME whenever you hear the home note.',
    doneText: 'You found home in every minor key!' },
  { keys: 4, hits: 3, stepMs: 900, scale: MINOR_NONHOME,
    heading: 'Find HOME — minor, quick!', targetLabel: 'HOME',
    howTo: 'Same, but faster and across more minor keys. Tap HOME on every home note.',
    doneText: 'Quick minor home — nailed it!' },
  // The minor-third landmark: HOME becomes the flat-3 (offset 3). No tile path is
  // used — the live engine's target is simply overridden (correctness over reusing
  // the major-only tap-target stream). "flat-3" is written in WORDS in comments so
  // the no-emoji guard (which bans the flat glyph) stays green; the on-screen label
  // uses the combining caret U+0302, which the guard explicitly allows.
  { keys: 3, hits: 4, stepMs: 1300, scale: MINOR_NONHOME,
    homeOffsets: [3, 15], // the flat-3 and its octave (semitones above the tonic)
    heading: 'Hear the minor third',
    howTo: 'The flat third is the note that makes a key sound MINOR. Listen for it — tap the button whenever you hear it.',
    doneText: 'You can hear the minor third!' },
];

/**
 * §3 `exerciseMode: 'live-home-minor'` (M5.5). Runs the live find-home engine in
 * MINOR across the phases above, reporting one clean round when they all finish.
 *
 * @param {HTMLElement} host
 * @param {Object} ctx { level, melody, services, onResult }
 * @returns {{ destroy: () => void }}
 */
export function createLiveHomeMinorRenderer(host, ctx) {
  const { services } = ctx;
  const T = (typeof window !== 'undefined' && window.__mqTest) || null;
  let destroyed = false;
  let phaseIdx = 0;
  let child = null;
  // Aggregate the per-phase accuracies so the final result reflects the whole session.
  let sumAcc = 0, nAcc = 0, totFalse = 0, totMiss = 0;

  // The on-screen label for the flat-3 landmark. Built from the label system's own
  // flat sign via a service so it follows the notation conventions — NOT a literal
  // glyph in source (which the no-emoji guard would reject). Falls back to the
  // degree caret form if the service is unavailable.
  const flat3Label = (() => {
    try {
      const pal = services.labelPalette && services.labelPalette();
      // In la-based minor solfège the flat-3 reads as "do"; if a palette is present
      // and long enough use its degree-3 entry, else a plain worded label.
      if (Array.isArray(pal) && pal.length >= 3 && pal[2]) return pal[2];
    } catch (e) {}
    return 'the note';
  })();

  function startPhase() {
    if (destroyed) return;
    if (phaseIdx >= LIVE_MINOR_PHASES.length) { finishSession(); return; }
    const base = LIVE_MINOR_PHASES[phaseIdx];
    const isLandmark = !!base.homeOffsets;
    const cfg = {
      ...base,
      targetLabel: isLandmark ? flat3Label : (base.targetLabel || 'HOME'),
      onPhaseDone(r) {
        sumAcc += r.accuracy; nAcc++; totFalse += r.falseTaps; totMiss += r.misses;
        if (child) { child.destroy(); child = null; }
        phaseIdx++;
        // A brief beat between phases so the "done" line is readable, then the next
        // phase mounts fresh (its own 3-2-1 reference re-establishes the ear).
        gap = setTimeout(startPhase, (T && T.fastLive) ? 20 : 700);
      },
    };
    child = createLiveHomeRenderer(host, ctx, cfg);
  }

  let gap = 0;
  function finishSession() {
    if (destroyed) return;
    const total = sumAcc || 0;
    const accuracy = nAcc ? Math.round(sumAcc / nAcc) : 100;
    ctx.onResult({
      correct: true, clean: true, accuracy,
      meta: { mode: 'live-home-minor', phases: LIVE_MINOR_PHASES.length, falseTaps: totFalse, misses: totMiss },
    });
  }

  // Test seam mirroring window.__mqTest.liveHome: liveHomeMinor.getState() reports
  // the session phase plus the CURRENT phase's live state (via the child's hook), so
  // automation can press to start, tap on target notes, and roll through every phase.
  if (T) {
    T.liveHomeMinor = {
      press: () => { if (T.liveHome) T.liveHome.press(); },
      getState: () => {
        const inner = T.liveHome ? T.liveHome.getState() : null;
        return {
          phaseIdx,
          totalPhases: LIVE_MINOR_PHASES.length,
          sessionDone: phaseIdx >= LIVE_MINOR_PHASES.length,
          inner,
        };
      },
    };
  }

  startPhase();

  return {
    destroy() {
      destroyed = true;
      clearTimeout(gap);
      if (child) { try { child.destroy(); } catch (e) {} child = null; }
      try { services.stopAudio(); } catch (e) {}
      host.innerHTML = '';
      if (T && T.liveHomeMinor) T.liveHomeMinor = null;
    },
  };
}

/* ============================================================================
 * M1 CONTOUR — staged like M0 (owner): 0 direction (up/down/same) · 1 direction +
 * DISTANCE (step vs skip) · 2 whole-SHAPE picker. All custom-SVG controls.
 * ==========================================================================*/

const M1_MAJOR = [0, 2, 4, 5, 7, 9, 11]; // diatonic semitones for degrees 1..7 (M1 keys are major)
function m1MidiForDeg(tonicMidi, deg) { // deg 1-based, may exceed 7 -> octave up/down
  const idx = ((deg - 1) % 7 + 7) % 7, oct = Math.floor((deg - 1) / 7);
  return tonicMidi + M1_MAJOR[idx] + 12 * oct;
}

/* Controlled degree-walk for the Level 3 memory-span ladder: `span` notes inside the
   level's allowed degrees, each moving at most rule.maxStep scale-steps from the last
   (1 = steps only, 2 = allow a skip/3rd, 3 = allow a 4th), optionally starting on home.
   Deterministic per seed so a round replays identically. Returns [{degree, midi}]. */
function buildSpanSeq(tonicMidi, span, rule, allowedDeg, seed) {
  const set = new Set(allowedDeg);          // respect the ACTUAL degrees, not a min..max range
  let s = (seed >>> 0) || 1;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  // legal moves = diatonic intervals up to maxStep that land on a degree ACTUALLY in the set
  // (so with vocabulary 1-2-3-5 a "step" from 3 is only 3->2; 3->4 doesn't exist).
  const movesFrom = (d) => {
    const out = [];
    for (let m = -rule.maxStep; m <= rule.maxStep; m++) if (m !== 0 && set.has(d + m)) out.push(d + m);
    return out;
  };
  // Start on a degree that HAS somewhere to go under this stage's interval limit — this also
  // keeps steps-only stages inside the connected step-run (e.g. {1,2,3}), leaving the isolated
  // triad 5 for the skip stages. (Forcing every run to start on home left one legal walk — 1-2-3
  // — every time; the owner caught that.)
  const starts = allowedDeg.filter((d) => movesFrom(d).length);
  const degs = [(starts.length ? starts : allowedDeg)[Math.floor(rnd() * (starts.length || allowedDeg.length))]];
  for (let i = 1; i < span; i++) {
    const moves = movesFrom(degs[i - 1]);
    if (!moves.length) break;                            // dead end (shouldn't happen once connected)
    const fresh = span > 3 ? moves.filter((d) => !(i >= 2 && d === degs[i - 2] && degs[i - 1] === degs[i - 3])) : moves;
    const pool = fresh.length ? fresh : moves;
    degs.push(pool[Math.floor(rnd() * pool.length)]);
  }
  return degs.map((d) => ({ degree: d, midi: m1MidiForDeg(tonicMidi, d) }));
}

/* A move icon: two noteheads whose vertical offset shows direction, with a faded
   skipped note in the gap for a SKIP (so step vs skip reads at a glance). */
export function contourMoveIcon(kind) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 44 40');
  svg.setAttribute('fill', 'currentColor');
  const dir = kind.slice(0, 4) === 'down' ? -1 : kind.slice(0, 2) === 'up' ? 1 : 0;
  const skip = kind.indexOf('skip') >= 0;
  const span = dir === 0 ? 0 : (skip ? 20 : 10);
  const y1 = 20 + dir * span / 2, y2 = 20 - dir * span / 2;
  const circ = (cx, cy, r, op) => {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
    if (op) c.setAttribute('opacity', op);
    svg.appendChild(c);
  };
  if (skip) circ(22, 20, 3, '0.28'); // the note that got skipped over
  circ(12, y1, 4.6); circ(32, y2, 4.6);
  return svg;
}

/* A contour SHAPE as an SVG line through the melody's pitch heights + a dot per note. */
function contourShapeSvg(heights) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const W = 132, H = 66, pad = 14;
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
  const min = Math.min.apply(null, heights), max = Math.max.apply(null, heights);
  const range = (max - min) || 1;
  const n = heights.length;
  const pts = heights.map((h, i) => {
    const x = pad + (W - 2 * pad) * (n === 1 ? 0.5 : i / (n - 1));
    const y = H - pad - (H - 2 * pad) * (h - min) / range;
    return [Math.round(x), Math.round(y)];
  });
  const poly = document.createElementNS(ns, 'polyline');
  poly.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
  poly.setAttribute('fill', 'none'); poly.setAttribute('stroke', 'currentColor');
  poly.setAttribute('stroke-width', '3'); poly.setAttribute('stroke-linecap', 'round'); poly.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(poly);
  pts.forEach(([x, y]) => {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', '4.2'); c.setAttribute('fill', 'currentColor');
    svg.appendChild(c);
  });
  return svg;
}

function contourSig(heights) { // up/down/same signature between consecutive notes
  const s = [];
  for (let i = 1; i < heights.length; i++) s.push(Math.sign(heights[i] - heights[i - 1]));
  return s.join(',');
}

/* STAGE 1 — direction + step/skip (owner: include "same" too). A round is a handful
   of two-note moves; the student picks which of 5 moves it was. */
function createStepSkipRenderer(host, ctx) {
  const { services, melody } = ctx;
  const T = (typeof window !== 'undefined' && window.__mqTest) || null;
  let destroyed = false, submitted = false, mistake = false;
  const tonic = melody.tonicMidi;
  const seed = (melody.meta && Number.isFinite(melody.meta.seed)) ? melody.meta.seed : 1;
  let s = (seed >>> 0) || 1;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;

  // Balanced bag of moves (same is rarer), turned into diatonic note pairs in a
  // comfortable degree range so nothing runs off the top/bottom.
  const KINDS = ['up-step', 'up-skip', 'down-step', 'down-skip', 'up-step', 'down-step', 'same'];
  const DELTA = { 'up-step': 1, 'up-skip': 2, 'down-step': -1, 'down-skip': -2, 'same': 0 };
  // Each prompt's REFERENCE (starting pitch) comes from the shell's progressive schedule
  // (ctx.m1Refs) — stable early, shifting later. Any pitch; diatonic step/skip from it.
  const refs = Array.isArray(ctx.m1Refs) ? ctx.m1Refs : [];
  const prompts = [];
  for (let i = 0; i < 6; i++) {
    const kind = KINDS[Math.floor(rnd() * KINDS.length)];
    let d = 3 + Math.floor(rnd() * 4); // start degree 3..6
    let d2 = d + DELTA[kind];
    if (d2 < 1) { d += (1 - d2); d2 = d + DELTA[kind]; }
    if (d2 > 8) { d -= (d2 - 8); d2 = d + DELTA[kind]; }
    const t = Number.isFinite(refs[i]) ? refs[i] : tonic;
    prompts.push({ from: m1MidiForDeg(t, d), to: m1MidiForDeg(t, d2), truth: kind });
  }
  if (T) T.lastStepSkip = { truths: prompts.map((p) => p.truth), refs: (ctx.m1Refs || []).slice() };

  host.innerHTML = '';
  host.classList.add('melodic-tonic-contour');
  const heading = document.createElement('div');
  heading.className = 'melodic-tonic-contour__heading';
  heading.textContent = 'Step or skip?';
  host.appendChild(heading);
  const howTo = document.createElement('div');
  howTo.className = 'melodic-tonic-contour__howto';
  howTo.textContent = 'Two notes play. A small move to the next note is a STEP; a bigger jump is a SKIP. Tap which you heard — up or down (or the same note).';
  host.appendChild(howTo);
  const cardHost = document.createElement('div');
  cardHost.className = 'melodic-tonic-contour__card';
  host.appendChild(cardHost);
  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-tonic-contour__status';
  host.appendChild(statusEl);

  const answers = new Array(prompts.length).fill(null);
  const promptRT = []; // {correct, rt} per prompt — feeds the fluency gate
  let answerableAt = null; // when the student could first judge THIS move (2nd note onset)
  let current = 0;

  function renderCard(autoPlay) {
    answerableAt = null;
    cardHost.innerHTML = '';
    if (current >= prompts.length) { grade(); return; }
    const prompt = prompts[current];
    const playBtn = makePlayButton(services, 'Hear it');
    playBtn.onclick = async () => {
      playBtn.disabled = true;
      setTimeout(() => { if (!destroyed) playBtn.disabled = false; }, 1600);
      await services.playNote(prompt.from, 0.9);
      await new Promise((r) => setTimeout(r, 380));
      if (answerableAt == null) answerableAt = performance.now(); // reaction clock starts at the 2nd note
      if (!destroyed) await services.playNote(prompt.to, 0.9);
    };
    cardHost.appendChild(playBtn);
    // Owner: once they're going, auto-play each next move so they don't re-click Hear it.
    if (autoPlay) setTimeout(() => { if (!destroyed && !submitted) playBtn.onclick(); }, 480);

    const grid = document.createElement('div');
    grid.className = 'melodic-move-grid';
    const OPTS = [['up-step', 'up a step'], ['up-skip', 'up a skip'], ['down-step', 'down a step'], ['down-skip', 'down a skip'], ['same', 'same note']];
    const btns = [];
    OPTS.forEach(([value, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'melodic-move-btn' + (value === 'same' ? ' melodic-move-btn--same' : '');
      b.appendChild(contourMoveIcon(value));
      b.setAttribute('aria-label', label); b.title = label;
      b.onclick = () => {
        if (submitted || destroyed) return;
        btns.forEach((x) => { x.disabled = true; });
        b.classList.add(value === prompt.truth ? 'is-correct' : 'is-wrong');
        setTimeout(() => { if (!destroyed) answer(value); }, 620);
      };
      grid.appendChild(b); btns.push(b);
    });
    cardHost.appendChild(grid);

    const progress = document.createElement('div');
    progress.className = 'melodic-tonic-contour__progress';
    progress.textContent = (current + 1) + ' / ' + prompts.length;
    cardHost.appendChild(progress);
  }
  function answer(value) {
    if (submitted || destroyed) return;
    answers[current] = value;
    const rt = answerableAt != null ? (performance.now() - answerableAt) : 99999;
    promptRT.push({ correct: value === prompts[current].truth, rt });
    if (value !== prompts[current].truth) mistake = true;
    current++; renderCard(true);
  }
  function grade() {
    if (submitted || destroyed) return;
    submitted = true;
    let n = 0; prompts.forEach((p, i) => { if (answers[i] === p.truth) n++; });
    const accuracy = Math.round((n / prompts.length) * 100);
    const correct = accuracy === 100;
    statusEl.classList.add(correct ? 'is-correct' : 'is-wrong');
    statusEl.textContent = correct ? 'Perfect' : n + ' / ' + prompts.length + ' correct';
    ctx.onResult({ correct, clean: correct && !mistake, accuracy, meta: { stage: 1, numCorrect: n, total: prompts.length, prompts: promptRT } });
  }
  renderCard(true); // auto-play the FIRST move too, so the fluent-in-a-row chain isn't broken at each round start
  return { destroy() { destroyed = true; services.stopAudio(); host.innerHTML = ''; } };
}

/* STAGE 2 — whole-shape picker. Hear a short melody, pick the contour LINE that
   matches (the recognition precursor to protonotation's drawing). */
function createShapePickerRenderer(host, ctx) {
  const { services, melody } = ctx;
  const T = (typeof window !== 'undefined' && window.__mqTest) || null;
  let destroyed = false, submitted = false;
  const tonic = melody.tonicMidi;
  const seed = (melody.meta && Number.isFinite(melody.meta.seed)) ? melody.meta.seed : 1;
  let s = (seed >>> 0) || 1;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;

  const N = Math.max(3, Math.min(6, ctx.shapeLen || 3)); // grows 3->6 across the stage's rounds
  // TRUE shape = the round's REAL generated melody (idiomatic/tonal via buildRound),
  // NOT a random walk (owner: longer melodies must mimic classical structure).
  const trueHeights = (melody.notes || []).slice(0, N).map((n) => n.midi);
  while (trueHeights.length < 3) trueHeights.push(tonic); // defensive; buildRound gives plenty
  const NN = trueHeights.length;
  // DECOY shapes (visual only, never played), each a DIFFERENT up/down signature. Their
  // count grows with the fluent streak (owner: shape stage must be robust) — more lines
  // to tell apart = harder discrimination.
  const OPT = Math.max(3, Math.min(6, ctx.shapeOptions || 3));
  const sig = contourSig(trueHeights);
  const distractors = [];
  let guard = 0;
  while (distractors.length < OPT - 1 && guard++ < 160) {
    const alt = [3];
    for (let i = 1; i < NN; i++) {
      const step = [1, 2, -1, -2][Math.floor(rnd() * 4)];
      let d = alt[i - 1] + step;
      if (d < 1) d = alt[i - 1] + Math.abs(step);
      if (d > 8) d = alt[i - 1] - Math.abs(step);
      alt.push(d);
    }
    const asig = contourSig(alt);
    if (asig !== sig && !distractors.some((x) => contourSig(x) === asig)) distractors.push(alt);
  }
  const options = [trueHeights, ...distractors];
  for (let i = options.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = options[i]; options[i] = options[j]; options[j] = t; }
  const trueIdx = options.indexOf(trueHeights);
  if (T) T.lastShape = { trueIdx, sig };

  host.innerHTML = '';
  host.classList.add('melodic-tonic-contour');
  const heading = document.createElement('div');
  heading.className = 'melodic-tonic-contour__heading';
  heading.textContent = 'Match the shape';
  host.appendChild(heading);
  const howTo = document.createElement('div');
  howTo.className = 'melodic-tonic-contour__howto';
  howTo.textContent = 'Hear the short melody, then tap the line whose ups and downs match what you heard.';
  host.appendChild(howTo);

  let answerableAt = null; // reaction clock starts when the melody finishes
  const playBtn = makePlayButton(services, 'Hear it');
  const playMelody = async () => {
    playBtn.disabled = true;
    setTimeout(() => { if (!destroyed) playBtn.disabled = false; }, trueHeights.length * 620 + 200);
    for (let i = 0; i < trueHeights.length; i++) {
      if (destroyed) return;
      await services.playNote(trueHeights[i], 0.55); // real generated melody pitches
      await new Promise((r) => setTimeout(r, 200));
    }
    if (answerableAt == null) answerableAt = performance.now();
  };
  playBtn.onclick = playMelody;
  host.appendChild(playBtn);

  const shapeRow = document.createElement('div');
  shapeRow.className = 'melodic-shape-row';
  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-tonic-contour__status';

  const btns = options.map((heights, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'melodic-shape-btn';
    b.appendChild(contourShapeSvg(heights));
    b.setAttribute('aria-label', 'shape ' + (idx + 1));
    b.onclick = () => {
      if (submitted || destroyed) return;
      submitted = true;
      const correct = idx === trueIdx;
      btns.forEach((x, i) => { x.disabled = true; if (i === trueIdx) x.classList.add('is-correct'); });
      if (!correct) b.classList.add('is-wrong');
      statusEl.classList.add(correct ? 'is-correct' : 'is-wrong');
      statusEl.textContent = correct ? 'That is the shape' : 'That was the outlined one';
      const rt = answerableAt != null ? (performance.now() - answerableAt) : 99999;
      ctx.onResult({ correct, clean: correct, accuracy: correct ? 100 : 0, meta: { stage: 2, trueIdx, picked: idx, prompts: [{ correct, rt }] } });
    };
    shapeRow.appendChild(b);
    return b;
  });
  host.appendChild(shapeRow);
  host.appendChild(statusEl);
  // Auto-play once so the ear leads (a beat after mount).
  setTimeout(() => { if (!destroyed) playMelody(); }, 250);
  return { destroy() { destroyed = true; services.stopAudio(); host.innerHTML = ''; } };
}

export function createTonicContourRenderer(host, ctx) {
  const { level, melody, services } = ctx;
  const isTonicMode = (level.layers || []).includes('0a'); // M0; else M1 ('0b')
  let destroyed = false;
  let submitted = false;
  let hadMistake = false;

  host.innerHTML = '';
  host.classList.add('melodic-tonic-contour');

  // M0's FOUR EXPLICIT STAGES (owner design): 0 = yes/no floor, then tap-the-
  // target streams for 1̂ / 3̂ / 5̂. The stage is EXPLICIT state passed by the
  // shell (ctx.stage), advanced one clean round at a time — never inferred from
  // the mastery score (score-band staging let students graduate past the later
  // stages without ever seeing them; owner-caught).
  const stage = Number.isInteger(ctx.stage) ? ctx.stage : 0;
  // M0's five stages (owner redesign): 0 live find-home (comfortable) · 1 live find-home
  // (quick) · then the TILE mechanic introduced on the easy/known target and worked up:
  // 2 tap HOME · 3 tap 3̂ · 4 tap 5̂. The two live stages own home-finding; the tiles are
  // the low-pressure "mark it after" format for the subtler targets.
  // ctx.liveTier lets the Skills Gym run a shorter/faster find-home than the ladder tiers.
  if (isTonicMode && stage === 0) return createLiveHomeRenderer(host, ctx, ctx.liveTier || M0_LIVE_TIERS.comfortable);
  if (isTonicMode && stage === 1) return createLiveHomeRenderer(host, ctx, ctx.liveTier || M0_LIVE_TIERS.quick);
  // Stage 5 (added after exact home + degrees are solid): octave equivalence — home is home
  // in any octave, taught with an octave-matched reference. A LIVE stage, so checked before
  // the tile branch below.
  if (isTonicMode && stage === 5) return createLiveHomeRenderer(host, ctx, M0_LIVE_TIERS.octave);
  if (isTonicMode && stage >= 2) {
    const target = stage === 2 ? 1 : stage === 3 ? 3 : 5; // stage 2 = HOME (tile mechanic intro)
    return createTapTargetGame(host, ctx, target, stage, 10);
  }
  // M1 (contour) staged like M0: 0 up/down/same · 1 step/skip · 2 shape-picker.
  if (!isTonicMode && stage === 1) return createStepSkipRenderer(host, ctx);
  if (!isTonicMode && stage === 2) return createShapePickerRenderer(host, ctx);

  const heading = document.createElement('div');
  heading.className = 'melodic-tonic-contour__heading';
  heading.textContent = isTonicMode ? 'Find home — did the note come home?' : 'Up, down, or the same?';
  host.appendChild(heading);

  // Plain-language how-to, always visible — a brand-new student must never face
  // buttons with no explanation of what will happen or what to listen for. M0 is
  // framed around the "home" feeling (the note the music rests on) so a true
  // beginner has a metaphor, not jargon.
  const howTo = document.createElement('div');
  howTo.className = 'melodic-tonic-contour__howto';
  howTo.textContent = isTonicMode
    ? 'Hear the long home note, then a test note. Is the test note home too?'
    : 'Two notes play. Did the second go UP, DOWN, or stay the SAME? Tap the matching shape.';
  host.appendChild(howTo);

  // M0 (isTonicMode): a BALANCED, varied set of test tones (see buildTonicTestNotes)
  // instead of the generated melody's adjacent pairs, which repeated the same few
  // degrees. M1 keeps adjacent pairs (it asks about MOTION, so real melody is right).
  const prompts = [];
  const seed = (melody.meta && Number.isFinite(melody.meta.seed)) ? melody.meta.seed : 1;
  if (isTonicMode) {
    buildTonicTestNotes(melody.tonicMidi, seed).forEach((tn) => prompts.push({ kind: 'pair', from: null, to: tn }));
  } else if (Array.isArray(ctx.m1Refs) && ctx.m1Refs.length) {
    // M1 direction items: two diatonic notes from the shell's progressive REFERENCE
    // schedule (starting pitch stable early, shifting as fluency builds).
    const MOVES = [1, 2, -1, -2, 1, -1, 0]; // favour up/down over same
    ctx.m1Refs.forEach((ref) => {
      const mv = MOVES[Math.floor(Math.random() * MOVES.length)];
      const d = 3 + Math.floor(Math.random() * 3); // start degree 3..5
      let d2 = d + mv;
      if (d2 < 1) d2 = d + Math.abs(mv);
      if (d2 > 8) d2 = d - Math.abs(mv);
      prompts.push({ kind: 'pair', from: { midi: m1MidiForDeg(ref, d) }, to: { midi: m1MidiForDeg(ref, d2) } });
    });
  } else {
    for (let i = 0; i < melody.notes.length - 1; i++) {
      prompts.push({ kind: 'pair', from: melody.notes[i], to: melody.notes[i + 1] });
    }
  }
  // M0's SECOND variant (curriculum: "yes/no, then WHICH-OF-TWO-IS-HOME"): two
  // rounds of "two notes play — which one is home?", built from the varied test
  // tones above (one home tone + one non-home tone, order alternating).
  if (isTonicMode) {
    const homeTn = { degree: 1, midi: melody.tonicMidi };
    const nonHome = prompts.filter((p) => p.to && p.to.degree !== 1).map((p) => p.to);
    for (let k = 0; k < Math.min(2, nonHome.length); k++) {
      const other = nonHome[k];
      prompts.push(k % 2 === 0
        ? { kind: 'which', a: homeTn, b: other, truthChoice: 'first' }
        : { kind: 'which', a: other, b: homeTn, truthChoice: 'second' });
    }
  }
  const answers = new Array(prompts.length).fill(null);
  const promptRT = []; // {correct, rt} per contour prompt — feeds the M1 fluency gate
  let answerableAt = null;
  let current = 0;

  const cardHost = document.createElement('div');
  cardHost.className = 'melodic-tonic-contour__card';
  host.appendChild(cardHost);

  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-tonic-contour__status';
  host.appendChild(statusEl);

  function truthFor(prompt) {
    if (prompt.kind === 'which') return prompt.truthChoice;
    if (isTonicMode) return prompt.to.degree === 1 ? 'home' : 'not-home';
    const cmp = prompt.to.midi - prompt.from.midi;
    return cmp > 0 ? 'up' : cmp < 0 ? 'down' : 'same';
  }

  function renderCard(autoPlay) {
    cardHost.innerHTML = '';
    answerableAt = null;
    if (current >= prompts.length) { grade(); return; }
    const prompt = prompts[current];

    // For the "which was home" prompt, two tiles light in sync with the two
    // candidate notes (owner: same tile layout as the streams). Populated below.
    let whichTiles = null;
    let whichRaf = 0;
    const clearWhichCursor = () => {
      if (whichRaf) { cancelAnimationFrame(whichRaf); whichRaf = 0; }
      if (whichTiles) whichTiles.forEach((t) => t.classList.remove('is-playing'));
    };

    const playBtn = makePlayButton(services, 'Hear it');
    playBtn.onclick = async () => {
      playBtn.disabled = true;
      const restore = () => { if (!destroyed) playBtn.disabled = false; };
      setTimeout(restore, prompt.kind === 'which' ? 4200 : (isTonicMode ? 3600 : 1600));
      if (prompt.kind === 'which') {
        // Home drone, then the two candidates — each candidate's TILE lights in
        // sync by reading the audio clock (same fix as the stream cursor).
        clearWhichCursor();
        await services.playNote(ctx.melody.tonicMidi, 2);
        await new Promise((r) => setTimeout(r, 1400));
        if (destroyed) return;
        const GAP = 0.9; // seconds between the two candidate notes
        const t0 = services.audioNow() + 0.12;
        services.playNoteAt(prompt.a.midi, t0, 0.7);
        services.playNoteAt(prompt.b.midi, t0 + GAP, 0.7);
        let last = -1;
        const tick = () => {
          if (destroyed || submitted) { whichRaf = 0; return; }
          const el = services.audioNow() - t0;
          const idx = el < 0 ? -1 : el < GAP ? 0 : el < GAP * 2 ? 1 : -1;
          if (idx !== last && whichTiles) {
            whichTiles.forEach((t) => t.classList.remove('is-playing'));
            if (idx >= 0) whichTiles[idx].classList.add('is-playing');
            last = idx;
          }
          if (el < GAP * 2 + 0.2) whichRaf = requestAnimationFrame(tick);
          else { whichRaf = 0; if (whichTiles) whichTiles.forEach((t) => t.classList.remove('is-playing')); }
        };
        whichRaf = requestAnimationFrame(tick);
      } else if (isTonicMode) {
        // M0's whole design (MELODIC_CURRICULUM.md §3): a sustained tonic DRONE
        // establishes "home" FIRST, then the single test pitch. Without the
        // drone the question "is this home?" is unanswerable — the student has
        // been given no home to compare against (owner-reported, live).
        await services.playNote(ctx.melody.tonicMidi, 3);
        await new Promise((r) => setTimeout(r, 2100));
        await services.playNote(prompt.to.midi, 1);
      } else {
        await services.playNote(prompt.from.midi, 1);
        await new Promise((r) => setTimeout(r, 350));
        if (answerableAt == null) answerableAt = performance.now(); // reaction clock @ 2nd note
        await services.playNote(prompt.to.midi, 1);
      }
    };
    cardHost.appendChild(playBtn);
    // Owner: on the up/down/same questions, auto-play each next move once they're
    // going, so they don't re-click Hear it every time (contrast M0's deliberate press).
    if (autoPlay && prompt.kind === 'pair' && !isTonicMode) {
      setTimeout(() => { if (!destroyed && !submitted) playBtn.onclick(); }, 480);
    }

    const choiceRow = document.createElement('div');
    choiceRow.className = 'melodic-tonic-contour__choices';
    cardHost.appendChild(choiceRow);

    if (prompt.kind === 'which') {
      heading.textContent = 'Which note was HOME?';
      howTo.textContent = 'Hear home, then two notes. Click the tile that was home.';
      // Two tiles, lit in sync during play; click the one that was home.
      whichTiles = [['first', '1st note'], ['second', '2nd note']].map(([value, label]) => {
        const t = document.createElement('button');
        t.className = 'melodic-tap-tile melodic-tap-tile--wide';
        t.type = 'button';
        t.textContent = label;
        t.onclick = () => {
          if (submitted || destroyed) return;
          clearWhichCursor();
          // Visibly confirm the click, then show right/wrong before advancing
          // (owner: clicking a box gave no feedback).
          const truth = prompt.truthChoice;
          whichTiles.forEach((x, i) => {
            const v = i === 0 ? 'first' : 'second';
            x.disabled = true;
            x.classList.remove('is-playing');
            if (v === truth) x.classList.add('is-correct');
            else if (v === value) x.classList.add('is-wrong');
          });
          setTimeout(() => { if (!destroyed) answer(value); }, 800);
        };
        choiceRow.appendChild(t);
        return t;
      });
    } else {
      const choices = isTonicMode
        ? [['home', 'Home'], ['not-home', 'Not home']]
        : [['up', 'Up'], ['down', 'Down'], ['same', 'Same']];
      const btns = [];
      choices.forEach(([value, label]) => {
        const btn = services.button(label, 'choice');
        // M1 direction is shown as the two-notehead SHAPE (rising / falling / level),
        // not words or abstract arrows — the whole level is about seeing/hearing shape,
        // and it keeps one visual language with the step/skip stage.
        if (!isTonicMode) {
          btn.textContent = ''; btn.appendChild(contourMoveIcon(value));
          btn.classList.add('melodic-contour-btn'); btn.setAttribute('aria-label', label); btn.title = label;
        }
        btn.onclick = () => {
          if (submitted || destroyed) return;
          // Confirm the pick + show right/wrong before moving on (click feedback).
          const truth = truthFor(prompt);
          btns.forEach((b) => { b.disabled = true; });
          btn.classList.add(value === truth ? 'is-correct' : 'is-wrong');
          setTimeout(() => { if (!destroyed) answer(value); }, 620);
        };
        choiceRow.appendChild(btn);
        btns.push(btn);
      });
    }

    const progress = document.createElement('div');
    progress.className = 'melodic-tonic-contour__progress';
    progress.textContent = (current + 1) + ' / ' + prompts.length;
    cardHost.appendChild(progress);
  }

  function answer(value) {
    if (submitted || destroyed) return;
    const truth = truthFor(prompts[current]);
    answers[current] = value;
    if (!isTonicMode && prompts[current].kind === 'pair') {
      const rt = answerableAt != null ? (performance.now() - answerableAt) : 99999;
      promptRT.push({ correct: value === truth, rt });
    }
    if (value !== truth) hadMistake = true;
    current++;
    renderCard(!isTonicMode); // auto-play the next move on M1 (contour) rounds
  }

  function grade() {
    if (submitted || destroyed) return;
    submitted = true;
    let numCorrect = 0;
    prompts.forEach((p, i) => { if (answers[i] === truthFor(p)) numCorrect++; });
    const accuracy = prompts.length ? Math.round((numCorrect / prompts.length) * 100) : 100;
    const correct = accuracy === 100;
    statusEl.classList.add(correct ? 'is-correct' : 'is-wrong');
    statusEl.textContent = correct ? 'Correct' : numCorrect + ' / ' + prompts.length + ' correct';

    ctx.onResult({
      correct,
      clean: correct && !hadMistake,
      accuracy,
      meta: { numCorrect, total: prompts.length, answers: answers.slice(), prompts: promptRT, stage: 0 },
    });
  }

  renderCard(!isTonicMode); // M1: auto-play the first move too (unbroken fluent-in-a-row chain)

  return {
    destroy() {
      destroyed = true;
      services.stopAudio();
      host.innerHTML = '';
    },
  };
}

/* Tap-the-target stream — SHARED CORE (INTERVAL_GYM_SPEC §5.2). TILE + BEAT-CURSOR
   design (owner UX request): a row of tiles, one per note; on Play, "home" sounds
   then the notes go by while a moving cursor lights the tile that is CURRENTLY
   sounding. The student CLICKS the tiles that are the target (no real-time reflex
   timing), can replay and revise, then presses Check. Serves BOTH M0's degree hunt
   (createTapTargetGame) and the Gym FIND station. Graded on hits minus false marks
   (o.passRatio relaxes to ≥5/6 for FIND; absent = perfect for M0). */
function createTapStreamGame(host, ctx, o) {
  const { services } = ctx;
  let destroyed = false, submitted = false, playing = false;
  const STEP_MS = Number.isFinite(o.stepMs) ? o.stepMs : 720; // faster on M0 "speed" bonus rounds
  const notes = o.notes;
  const marked = new Set();
  let cursorTimers = [];

  const heading = document.createElement('div');
  heading.className = 'melodic-tonic-contour__heading';
  heading.textContent = o.heading;
  if (!o.heading) heading.style.display = 'none';
  host.appendChild(heading);

  // Round progress as a dot-meter (owner: visual, not a jammed "Round 1 of 3" line).
  if (o.roundMeter) {
    const rm = document.createElement('div');
    rm.className = 'melodic-round-meter';
    for (let i = 0; i < o.roundMeter.total; i++) {
      const d = document.createElement('span');
      d.className = 'melodic-round-meter__dot' + (i < o.roundMeter.done ? ' is-done' : '');
      rm.appendChild(d);
    }
    if (o.roundMeter.speed) { const s = document.createElement('span'); s.className = 'melodic-round-meter__fast'; s.textContent = 'faster!'; rm.appendChild(s); }
    host.appendChild(rm);
  }

  // Big, unmistakable TARGET so the student always knows which note to hunt for
  // (owner: "which note to listen out for is not SUPER clear"). Only for single-tone
  // targets (M0): the chip is also a button — click it to hear the target in isolation.
  // The Gym FIND targets an interval PAIR, so it keeps its descriptive heading instead.
  const hasChip = Number.isFinite(o.targetMidi);
  if (hasChip) {
    const targetBar = document.createElement('div');
    targetBar.className = 'melodic-tap-target';
    const lead = document.createElement('span');
    lead.className = 'melodic-tap-target__lead';
    lead.textContent = 'Click every';
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'melodic-tap-target__chip';
    const playBadge = document.createElement('span');
    playBadge.className = 'melodic-tap-target__play';
    playBadge.appendChild(services.icon('play'));
    const deg = document.createElement('span');
    deg.className = 'melodic-tap-target__deg';
    deg.textContent = o.targetName || 'target';
    chip.append(playBadge, deg);
    chip.title = 'Hear ' + (o.targetName || 'the target');
    chip.setAttribute('aria-label', 'Hear ' + (o.targetName || 'the target'));
    chip.onclick = () => { if (!destroyed) services.playNote(o.targetMidi, 1.4); };
    const tail = document.createElement('span');
    tail.className = 'melodic-tap-target__lead';
    tail.textContent = 'you hear' + (o.lenNote && o.lenNote < 10 ? ' · ' + o.lenNote + ' notes' : '');
    targetBar.append(lead, chip, tail);
    host.appendChild(targetBar);
  }

  // When the chip is present it already states the task; only the gym needs a
  // separate how-to line (owner: fewer lines / less text).
  if (!hasChip) {
    const howTo = document.createElement('div');
    howTo.className = 'melodic-tonic-contour__howto';
    howTo.textContent = 'Play, then tap every tile you hear ' + (o.targetName || 'the target') + '. Then Check.';
    host.appendChild(howTo);
  }

  // Test seam (?mqtest=1): expose the target indices so automation can mark a
  // genuinely clean round (streams are generated, not the round melody).
  if (typeof window !== 'undefined' && window.__mqTest) {
    window.__mqTest.lastTapStream = { targets: notes.map((n, i) => (o.isTarget(i) ? i : -1)).filter((i) => i >= 0) };
  }
  const tilesWrap = document.createElement('div');
  tilesWrap.className = 'melodic-tap-tiles';
  // HOME reference tile (owner idea): sits before the numbered tiles, lights while
  // home plays, and re-plays home on click so the student can reorient in any key.
  // It is NOT a markable/target tile — just the anchor. Fewer buttons this way.
  const homeTile = document.createElement('button');
  homeTile.className = 'melodic-tap-tile melodic-tap-tile--home';
  homeTile.type = 'button';
  homeTile.append(services.icon('play'), document.createTextNode('HOME')); // reads as a "play home" button
  homeTile.setAttribute('aria-label', 'Play home');
  homeTile.title = 'Click anytime to hear home';
  homeTile.onclick = () => { if (!destroyed) services.playNote(o.tonicMidi, 2); };
  tilesWrap.appendChild(homeTile);
  const tiles = notes.map((n, i) => {
    const t = document.createElement('button');
    t.className = 'melodic-tap-tile';
    t.type = 'button';
    t.textContent = String(i + 1);
    t.setAttribute('aria-label', 'Note ' + (i + 1));
    t.onclick = () => {
      if (submitted || destroyed) return;
      if (marked.has(i)) { marked.delete(i); t.classList.remove('is-marked'); }
      else { marked.add(i); t.classList.add('is-marked'); }
      checkBtn.disabled = marked.size === 0; // nothing to check until at least one mark
      checkBtn.classList.toggle('melodic-btn--primary', marked.size > 0); // Check lights up once there's an answer
    };
    tilesWrap.appendChild(t);
    return t;
  });
  host.appendChild(tilesWrap);

  // ONE control row: Play and Check side by side (owner: "why couldn't a Check
  // button show up right next to the Play button" — saves a whole line).
  const row = document.createElement('div');
  row.className = 'melodic-tonic-contour__choices';
  // Play is a NEUTRAL icon-only button (no word) — hearing the melody is a utility,
  // not the goal. Check is the ONE accent CTA and carries the only word, and it
  // stays disabled until the student has actually marked a tile (nothing to check
  // otherwise) — so the flow reads: Play -> mark tiles -> Check.
  // Play is a GREEN transport button — the universal "play/go" colour (and in a music
  // app red would read as RECORD, not play). It is a persistent transport control, so
  // it does NOT borrow the theme accent; the accent is reserved for the Check CTA,
  // which stays neutral+disabled until there's an answer, then lights up.
  const playBtn = services.button('', 'icon');
  playBtn.classList.add('melodic-btn--go'); // green transport, always
  playBtn.appendChild(services.icon('play'));
  playBtn.setAttribute('aria-label', 'Play');
  playBtn.title = 'Hear the melody';
  const checkBtn = services.button('Check'); // neutral until there is something to check
  checkBtn.disabled = true;
  checkBtn.onclick = grade;
  row.append(playBtn, checkBtn);
  host.appendChild(row);

  let rafId = 0;
  function clearCursor() {
    cursorTimers.forEach((t) => clearTimeout(t));
    cursorTimers = [];
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    tiles.forEach((t) => t.classList.remove('is-playing'));
    homeTile.classList.remove('is-playing');
  }

  playBtn.onclick = async () => {
    if (destroyed || playing) return; // replay allowed after grading (listen back)
    playing = true; playBtn.disabled = true; clearCursor();
    homeTile.classList.add('is-playing');             // the HOME tile lights while home sounds
    await services.playNote(o.tonicMidi, 2);          // home, established
    await new Promise((r) => setTimeout(r, 1400));
    homeTile.classList.remove('is-playing');
    if (destroyed) { playing = false; return; }

    // Lay the whole stream on the AUDIO clock (sample-accurate), and light each
    // tile by READING that same clock every animation frame — so the beat cursor
    // and the sound stay locked together instead of drifting (setTimeout vs the
    // Web Audio clock was the desync the owner heard).
    const STEP = STEP_MS / 1000;
    const t0 = services.audioNow() + 0.12;            // small lead-in
    notes.forEach((n, i) => services.playNoteAt(n.midi, t0 + i * STEP, STEP * 0.78));

    let lastLit = -1;
    const tick = () => {
      if (destroyed) { rafId = 0; return; }
      const elapsed = services.audioNow() - t0;
      const idx = Math.floor(elapsed / STEP);
      if (idx !== lastLit) {
        tiles.forEach((t) => t.classList.remove('is-playing'));
        if (idx >= 0 && idx < notes.length) tiles[idx].classList.add('is-playing');
        lastLit = idx;
      }
      if (elapsed < notes.length * STEP + 0.15) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
        tiles.forEach((t) => t.classList.remove('is-playing'));
        playing = false; playBtn.disabled = false;
        playBtn.setAttribute('aria-label', 'Play again'); // stays green; a second press just replays
      }
    };
    rafId = requestAnimationFrame(tick);
  };

  function grade() {
    if (submitted || destroyed) return;
    submitted = true;
    clearCursor();
    checkBtn.disabled = true; // Play stays live so a student can listen back after a miss
    const targets = notes.map((n, i) => (o.isTarget(i) ? i : -1)).filter((i) => i >= 0);
    const hits = targets.filter((i) => marked.has(i)).length;
    const falseMarks = [...marked].filter((i) => !o.isTarget(i)).length;
    const ratio = (hits - falseMarks) / Math.max(1, targets.length);
    const accuracy = Math.max(0, Math.round(ratio * 100));
    const correct = Number.isFinite(o.passRatio)
      ? (ratio >= o.passRatio && falseMarks === 0)
      : (hits === targets.length && falseMarks === 0);
    // Reveal on the tiles with THREE distinct states so the student can tell a wrong
    // mark from a missed one at a glance:
    //   correct  = it was the note AND you marked it        (green, check)
    //   wrong    = you marked it but it was NOT the note     (red, cross)
    //   missed   = it WAS the note but you left it unmarked  (amber, dot)
    let missed = 0;
    tiles.forEach((t, i) => {
      const isT = o.isTarget(i), wasMarked = marked.has(i);
      t.classList.remove('is-marked', 'is-playing');
      t.textContent = services.label(notes[i]);
      let markIcon = null;
      if (isT && wasMarked) { t.classList.add('is-correct'); markIcon = 'check'; }
      else if (!isT && wasMarked) { t.classList.add('is-wrong'); markIcon = 'cross'; }
      else if (isT && !wasMarked) { t.classList.add('is-missed'); markIcon = 'dot'; missed++; }
      if (markIcon) {
        const badge = document.createElement('span');
        badge.className = 'melodic-tap-tile__mark';
        badge.appendChild(services.icon(markIcon));
        t.appendChild(badge);
      }
    });
    // No in-card status line: the tiles carry the detail (check / cross / dot) and the
    // HUD toast + celebration carry the verdict — no need for a third, redundant line.
    ctx.onResult({ correct, clean: correct, accuracy, meta: { ...(o.meta || {}), targets: targets.length, hits, falseTaps: falseMarks } });
  }

  return {
    destroy() { destroyed = true; clearCursor(); services.stopAudio(); host.innerHTML = ''; },
  };
}

/* M0 stages 2-4 wrapper: target = a scale degree. Same behavior as the
   pre-refactor createTapTargetGame (M0 regression re-verified after the
   extraction). */
function createTapTargetGame(host, ctx, targetDegree, stage, streamLen) {
  const len = Number.isInteger(streamLen) ? streamLen : 10;
  const seed = (ctx.melody.meta && Number.isFinite(ctx.melody.meta.seed)) ? ctx.melody.meta.seed : 1;
  const notes = buildTonicStream(ctx.melody.tonicMidi, targetDegree, len, seed);
  // Name the target through the CURRENT label system (numbers / moveable-do / fixed-do)
  // so the on-screen text follows the Labels toggle \u2014 e.g. "3\u0302" becomes "mi" or "sol".
  const degName = ctx.services.labelPalette()[targetDegree - 1];
  const label = targetDegree === 1 ? 'HOME (' + degName + ')' : degName;
  const firstTarget = notes.find((n) => n.degree === targetDegree);
  // Per-round pacing + label come from the shell's stage plan (normal rounds vs the
  // faster "speed" bonus rounds). Absent (e.g. Gym) => default cadence, no label.
  const stepMs = Number.isFinite(ctx.tileStepMs) ? ctx.tileStepMs : undefined;
  return createTapStreamGame(host, ctx, {
    notes,
    tonicMidi: ctx.melody.tonicMidi,
    targetMidi: firstTarget ? firstTarget.midi : ctx.melody.tonicMidi,
    lenNote: len,
    stepMs,
    isTarget: (i) => notes[i].degree === targetDegree,
    // No "Stage N of 5" (the journey pips already show that); the round shows as a
    // dot-meter (owner: the jammed "Stage 3 of 5 Round 1 of 3" was confusing).
    heading: '',
    roundMeter: (Number.isFinite(ctx.tileRoundDone) && Number.isFinite(ctx.tileRoundTotal))
      ? { done: ctx.tileRoundDone, total: ctx.tileRoundTotal, speed: !!ctx.tileSpeed } : null,
    targetName: label,
    perfectText: 'Perfect — you found every ' + label,
    meta: { targetDegree, streamLen: len, stepMs: stepMs || 720 },
  });
}

/* ============================================================================
 * missing-note — melody shown with ONE note blanked, student supplies its
 * degree. Uses services.renderStaffPartial (a READING task like recognition's
 * early staff use, not PRODUCTION — so this is fine before M9's notation-entry
 * gate: the student never writes pitch+rhythm from scratch, just reasons out
 * one blank from the given context).
 * ========================================================================== */

/** Deterministic (seed-based, not Math.random) choice of which note to hide — never
 *  the very first note (no context to reason from) or, for melodies of length>=3,
 *  the very last (keep some resolution visible after the blank). */
function pickHideIndex(n, seed) {
  if (n <= 1) return 0;
  const lo = 1, hi = n >= 3 ? n - 2 : n - 1;
  const span = Math.max(1, hi - lo + 1);
  const s = (Number.isFinite(seed) ? seed : 1) >>> 0 || 1;
  return lo + (s % span);
}

/**
 * §3 `exerciseMode: 'missing-note'` — supply the hidden pitch's degree.
 * `onResult.accuracy` is per-blank % (100/0 for the single-blank case built here).
 *
 * @param {HTMLElement} host
 * @param {Object} ctx { level, melody, labelCtx, services, onResult }
 * @returns {{ destroy: () => void }}
 */
export function createMissingNoteRenderer(host, ctx) {
  const { level, melody, services } = ctx;
  let destroyed = false;
  let submitted = false;
  let hadMistake = false;

  host.innerHTML = '';
  host.classList.add('melodic-missing-note');

  const howTo = document.createElement('div');
  howTo.className = 'melodic-howto';
  howTo.textContent = 'Name the hidden (?) note.';
  host.appendChild(howTo);

  const seed = (melody.meta && Number.isFinite(melody.meta.seed)) ? melody.meta.seed : 1;
  // ctx.forceHideIdx (INTERVAL_GYM_SPEC §5.5): the Gym's USE station hides a
  // SPECIFIC note (the target interval's second note); absent = normal pick.
  const hideIdx = Number.isInteger(ctx.forceHideIdx)
    ? ctx.forceHideIdx : pickHideIndex(melody.notes.length, seed);
  const truth = services.label(melody.notes[hideIdx]);

  const playRow = document.createElement('div');
  playRow.className = 'melodic-missing-note__play-row';
  const playBtn = services.button('Play', 'play');
  playRow.appendChild(wireHearings(playBtn, ctx, (bpm) => services.play(melody, { bpm })));
  addHomeButton(playRow, ctx);
  host.appendChild(playRow);

  const staffHost = document.createElement('div');
  staffHost.className = 'melodic-missing-note__staff';
  host.appendChild(staffHost);
  services.renderStaffPartial(staffHost, melody, [hideIdx]);

  const paletteRow = document.createElement('div');
  paletteRow.className = 'melodic-missing-note__palette';
  host.appendChild(paletteRow);

  const fullPalette = services.labelPalette();
  const allowedDegrees = (level && level.pitch && level.pitch.degrees) || [1, 2, 3, 4, 5, 6, 7];
  let chosen = null;
  const paletteBtns = fullPalette.map((label, i) => {
    const degree = i + 1;
    if (!allowedDegrees.includes(degree)) return null;
    const btn = services.button(label, 'choice');
    btn.onclick = () => select(label, btn);
    paletteRow.appendChild(btn);
    return btn;
  }).filter(Boolean);

  function select(label, btn) {
    if (submitted || destroyed) return;
    if (chosen != null && chosen !== label) hadMistake = true;
    chosen = label;
    paletteBtns.forEach((b) => b.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    checkBtn.disabled = false;
  }

  const checkRow = document.createElement('div');
  checkRow.className = 'melodic-missing-note__check-row';
  host.appendChild(checkRow);
  const checkBtn = services.button('Check', 'primary');
  checkBtn.disabled = true;
  checkBtn.onclick = grade;
  checkRow.appendChild(checkBtn);

  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-missing-note__status';
  host.appendChild(statusEl);

  function grade() {
    if (submitted || destroyed || chosen == null) return;
    submitted = true;
    const correct = chosen === truth;
    paletteBtns.forEach((b) => { b.disabled = true; });
    checkBtn.disabled = true;
    statusEl.classList.add(correct ? 'is-correct' : 'is-wrong');
    statusEl.textContent = correct ? 'Correct' : 'Not quite — the missing note was ' + truth;

    ctx.onResult({
      correct,
      clean: correct && !hadMistake,
      accuracy: correct ? 100 : 0,
      meta: { hideIdx, chosen, truth },
    });
  }

  return {
    destroy() {
      destroyed = true;
      services.stopAudio();
      host.innerHTML = '';
    },
  };
}

/* ============================================================================
 * error-detect — a staff is shown with ONE note deliberately wrong; click it.
 * The "wrong" version is `ctx.distractors[0]` (the spec's own table: error-detect
 * "uses distractors — one altered melody") — the SHELL is expected to have picked
 * a single-note-edit distractor (via core/melodic.js's own distractors+editDistance,
 * already proven/tested) rather than this renderer inventing new mutation logic.
 * ========================================================================== */

/**
 * §3 `exerciseMode: 'error-detect'` — click the wrong note in a shown staff.
 * `onResult.accuracy` is 100/0 + which note was chosen.
 *
 * @param {HTMLElement} host
 * @param {Object} ctx { level, melody, distractors, labelCtx, services, onResult }
 *   ctx.distractors[0] is the melody AS SHOWN (containing the error); ctx.melody is
 *   the correct reference used only to find which index differs.
 * @returns {{ destroy: () => void }}
 */
export function createErrorDetectRenderer(host, ctx) {
  const { level, melody, distractors, services } = ctx;
  let destroyed = false;
  let submitted = false;
  let found = false; // phase 1 (find the wrong note) passed; phase 2 = correct it

  host.innerHTML = '';
  host.classList.add('melodic-error-detect');

  const shown = (distractors && distractors[0]) || melody;
  let wrongIdx = shown.notes.findIndex((n, i) => n.degree !== melody.notes[i].degree);
  if (wrongIdx < 0) wrongIdx = 0; // shown === melody (degenerate/no distractor available) — nothing to find

  const playRow = document.createElement('div');
  playRow.className = 'melodic-error-detect__play-row';
  const playBtn = services.button('Play', 'play');
  playRow.appendChild(wireHearings(playBtn, ctx, (bpm) => services.play(shown, { bpm })));
  addHomeButton(playRow, ctx);
  host.appendChild(playRow);

  const hint = document.createElement('div');
  hint.className = 'melodic-error-detect__hint melodic-howto';
  hint.textContent = 'Press Play to hear the CORRECT melody, then compare it with this staff — one printed note is wrong. Click that note.';
  host.appendChild(hint);

  const staffHost = document.createElement('div');
  staffHost.className = 'melodic-error-detect__staff';
  host.appendChild(staffHost);

  // Phase 2 host ("…and correct it", per the M10 mastery goal: find + CORRECT
  // the single wrong pitch — finding alone is only half the assessed skill).
  const fixHost = document.createElement('div');
  fixHost.className = 'melodic-error-detect__fix';
  host.appendChild(fixHost);

  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-error-detect__status';
  host.appendChild(statusEl);

  function finish(correct, meta) {
    submitted = true;
    statusEl.classList.add(correct ? 'is-correct' : 'is-wrong');
    ctx.onResult({ correct, clean: correct, accuracy: meta.accuracy, meta });
  }

  function startFixPhase() {
    found = true;
    hint.textContent = 'Found it. Now CORRECT it: what should that note be?';
    const paletteRow = document.createElement('div');
    paletteRow.className = 'melodic-error-detect__palette melodic-labeling__palette';
    fixHost.appendChild(paletteRow);
    const truthLabel = services.label(melody.notes[wrongIdx]);
    const fullPalette = services.labelPalette();
    const allowedDegrees = (level && level.pitch && level.pitch.degrees) || [1, 2, 3, 4, 5, 6, 7];
    fullPalette.forEach((label, i) => {
      if (!allowedDegrees.includes(i + 1)) return;
      const btn = services.button(label, 'choice');
      btn.onclick = () => {
        if (submitted || destroyed) return;
        const fixedRight = label === truthLabel;
        statusEl.textContent = fixedRight
          ? 'Correct — found it and fixed it'
          : 'You found the wrong note, but the fix should be ' + truthLabel;
        // show the TRUE melody so the student sees/hears the corrected line
        services.renderStaff(staffHost, melody);
        finish(fixedRight, { accuracy: fixedRight ? 100 : 50, chosenIdx: wrongIdx, wrongIdx, fix: label, truth: truthLabel });
      };
      paletteRow.appendChild(btn);
    });
  }

  services.renderStaff(staffHost, shown, {
    onNoteClick(i) {
      if (submitted || destroyed || found) return;
      if (i === wrongIdx) {
        startFixPhase();
      } else {
        statusEl.textContent = 'Not quite — try listening for which note breaks the pattern';
        finish(false, { accuracy: 0, chosenIdx: i, wrongIdx });
      }
    },
  });

  return {
    destroy() {
      destroyed = true;
      services.stopAudio();
      host.innerHTML = '';
    },
  };
}

/* ============================================================================
 * notation-entry — the biggest renderer: full staff PRODUCTION (M9+). TWO
 * PHASES per spec: (1) dictate the rhythm alone (a duration palette, tap to
 * build the sequence), (2) once the rhythm is locked in, place a degree on
 * each of the (correct) rhythm's note-slots. Graded independently: rhythm%
 * from phase 1, pitch% from phase 2, overall accuracy = their average.
 * ========================================================================== */

const DUR_LABELS = { w: 'whole', h: 'half', hd: 'dotted half', q: 'quarter', qd: 'dotted quarter', '8': 'eighth', '8d': 'dotted eighth', '16': '16th' };
const NE_DUR_BEATS = { w: 4, h: 2, hd: 3, q: 1, qd: 1.5, '8': 0.5, '8d': 0.75, '16': 0.25 };
function neBeats(d) { return NE_DUR_BEATS[String(d).replace('r', '')] || 1; }

/**
 * §3 `exerciseMode: 'notation-entry'` — full staff production, two phases.
 *
 * @param {HTMLElement} host
 * @param {Object} ctx { level, melody, labelCtx, services, onResult }
 * @returns {{ destroy: () => void }}
 */
export function createNotationEntryRenderer(host, ctx) {
  const { level, melody, services } = ctx;
  let destroyed = false;
  let phase = 'rhythm'; // 'rhythm' | 'pitch' | 'done'
  let rhythmHadMistake = false, pitchHadMistake = false;

  const truthDurations = melody.notes.map((n) => n.duration);
  const targetBeats = truthDurations.reduce((s, d) => s + neBeats(d), 0);
  // the duration vocabulary offered is whatever this melody actually uses (plus a
  // sensible minimum) — so a beginner rung doesn't get offered durations it never sees.
  const paletteDurations = Array.from(new Set(['q', '8', ...truthDurations]));

  host.innerHTML = '';
  host.classList.add('melodic-notation-entry');

  const heading = document.createElement('div');
  heading.className = 'melodic-notation-entry__heading';
  host.appendChild(heading);

  const playRow = document.createElement('div');
  playRow.className = 'melodic-notation-entry__play-row';
  const playBtn = services.button('Play', 'play');
  playRow.appendChild(wireHearings(playBtn, ctx, (bpm) => services.play(melody, { bpm })));
  addHomeButton(playRow, ctx);
  host.appendChild(playRow);

  const bodyHost = document.createElement('div');
  host.appendChild(bodyHost);

  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-notation-entry__status';
  host.appendChild(statusEl);

  // ---------- Phase 1: rhythm ----------
  const rhythmEntry = [];
  // When the REAL rhythm game grades phase 1 (see tryGamePhase), its accuracy
  // lands here and the palette path below is skipped entirely.
  let gameRhythmAccuracy = null;
  let rhythmMount = null;

  /* Phase 1, preferred path: embed the ACTUAL rhythm dictation game (solo-mode.js
     external-target seam via services.mountRhythmEntry) playing THIS melody's
     rhythm — the spec's "delegate to the existing rhythm game", not a rebuild.
     Falls back to the duration-palette below when the game can't express the
     rhythm (compound/irregular meter) or isn't available (onResult(null)). */
  function tryGamePhase() {
    heading.textContent = 'Phase 1 — dictate the RHYTHM';
    bodyHost.innerHTML = '';
    rhythmMount = services.mountRhythmEntry(bodyHost, {
      durations: truthDurations,
      meter: melody.meter,
      onResult(r) {
        rhythmMount = null;
        if (destroyed) return;
        if (!r) { renderRhythmPhase(); return; } // unsupported -> palette fallback
        gameRhythmAccuracy = r.rhythmAccuracy;
        rhythmHadMistake = !r.allCorrect;
        phase = 'pitch';
        renderPitchPhase();
      },
    });
  }

  function renderRhythmPhase() {
    heading.textContent = 'Phase 1 — dictate the RHYTHM';
    bodyHost.innerHTML = '';

    const strip = document.createElement('div');
    strip.className = 'melodic-notation-entry__strip';
    bodyHost.appendChild(strip);
    rhythmEntry.forEach((d) => {
      const slot = document.createElement('div');
      slot.className = 'melodic-notation-entry__slot is-filled';
      slot.style.flexGrow = String(neBeats(d));
      slot.textContent = DUR_LABELS[d] || d;
      strip.appendChild(slot);
    });

    const enteredBeats = rhythmEntry.reduce((s, d) => s + neBeats(d), 0);
    const remaining = Math.max(0, targetBeats - enteredBeats);
    const progress = document.createElement('div');
    progress.className = 'melodic-notation-entry__progress';
    progress.textContent = remaining > 1e-6 ? remaining + ' beat(s) left to fill' : 'Bar complete';
    bodyHost.appendChild(progress);

    const paletteRow = document.createElement('div');
    paletteRow.className = 'melodic-notation-entry__palette';
    bodyHost.appendChild(paletteRow);
    paletteDurations.forEach((d) => {
      const btn = services.button(DUR_LABELS[d] || d, 'choice');
      btn.disabled = neBeats(d) > remaining + 1e-6;
      btn.onclick = () => { rhythmEntry.push(d); renderRhythmPhase(); };
      paletteRow.appendChild(btn);
    });

    const actionRow = document.createElement('div');
    actionRow.className = 'melodic-notation-entry__actions';
    bodyHost.appendChild(actionRow);
    const undoBtn = services.button('Undo', 'choice');
    undoBtn.disabled = rhythmEntry.length === 0;
    undoBtn.onclick = () => { rhythmEntry.pop(); rhythmHadMistake = true; renderRhythmPhase(); };
    actionRow.appendChild(undoBtn);
    const nextBtn = services.button('Next: pitches', 'primary');
    nextBtn.disabled = remaining > 1e-6;
    nextBtn.onclick = finishRhythmPhase;
    actionRow.appendChild(nextBtn);
  }

  function finishRhythmPhase() {
    if (phase !== 'rhythm' || destroyed) return;
    phase = 'pitch';
    renderPitchPhase();
  }

  // ---------- Phase 2: pitch ----------
  const pitchAnswers = new Array(melody.notes.length).fill(null);

  let pitchActive = 0;

  function renderPitchPhase() {
    heading.textContent = 'Phase 2 — place the DEGREES';
    bodyHost.innerHTML = '';

    const howTo = document.createElement('div');
    howTo.className = 'melodic-howto';
    howTo.textContent = 'The rhythm you dictated is written below. Now name each note\'s degree — tap a degree for the highlighted note; click any note to change its answer.';
    bodyHost.appendChild(howTo);

    // The dictated rhythm as REAL notation, degrees under the notes (same
    // single-line rhythm staff the labeling exercise uses — one visual language).
    const staffHost = document.createElement('div');
    staffHost.className = 'melodic-notation-entry__rhythm';
    bodyHost.appendChild(staffHost);
    services.renderRhythmLine(staffHost, melody, {
      labels: pitchAnswers.map((a) => a || ''),
      activeIdx: pitchActive,
      onNoteClick: (i) => { pitchActive = i; renderPitchPhase(); },
    });

    const paletteRow = document.createElement('div');
    paletteRow.className = 'melodic-notation-entry__palette';
    bodyHost.appendChild(paletteRow);
    const fullPalette = services.labelPalette();
    const allowedDegrees = (level && level.pitch && level.pitch.degrees) || [1, 2, 3, 4, 5, 6, 7];
    if (pitchActive < 0 || pitchActive >= pitchAnswers.length) {
      const firstEmpty = pitchAnswers.findIndex((a) => a == null);
      pitchActive = firstEmpty >= 0 ? firstEmpty : melody.notes.length - 1;
    }

    fullPalette.forEach((label, i) => {
      const degree = i + 1;
      if (!allowedDegrees.includes(degree)) return;
      const btn = services.button(label, 'choice');
      btn.onclick = () => {
        if (pitchAnswers[pitchActive] != null && pitchAnswers[pitchActive] !== label) pitchHadMistake = true;
        pitchAnswers[pitchActive] = label;
        const next = pitchAnswers.findIndex((a) => a == null);
        pitchActive = next >= 0 ? next : pitchActive;
        renderPitchPhase();
      };
      paletteRow.appendChild(btn);
    });

    const checkRow = document.createElement('div');
    checkRow.className = 'melodic-notation-entry__actions';
    bodyHost.appendChild(checkRow);
    const hearMineBtn = services.button('Hear MY answer', 'choice');
    hearMineBtn.disabled = pitchAnswers.some((a) => a == null);
    hearMineBtn.onclick = () => {
      const palette = services.labelPalette();
      services.playDegrees(pitchAnswers.map((a) => palette.indexOf(a) + 1), melody);
    };
    checkRow.appendChild(hearMineBtn);
    const checkBtn = services.button('Check', 'primary');
    checkBtn.disabled = pitchAnswers.some((a) => a == null);
    checkBtn.onclick = grade;
    checkRow.appendChild(checkBtn);
  }

  function grade() {
    if (phase !== 'pitch' || destroyed) return;
    phase = 'done';

    // Rhythm %: the real rhythm game's grade when it ran phase 1; else the
    // palette entry compared note-for-note against the truth.
    let rhythmAccuracy;
    if (gameRhythmAccuracy != null) {
      rhythmAccuracy = gameRhythmAccuracy;
    } else {
      let rhythmCorrect = 0;
      for (let i = 0; i < truthDurations.length; i++) if (rhythmEntry[i] === truthDurations[i]) rhythmCorrect++;
      rhythmAccuracy = truthDurations.length ? Math.round((rhythmCorrect / truthDurations.length) * 100) : 100;
    }

    let pitchCorrect = 0;
    melody.notes.forEach((note, i) => { if (pitchAnswers[i] === services.label(note)) pitchCorrect++; });
    const pitchAccuracy = melody.notes.length ? Math.round((pitchCorrect / melody.notes.length) * 100) : 100;

    const accuracy = Math.round((rhythmAccuracy + pitchAccuracy) / 2);
    const correct = rhythmAccuracy === 100 && pitchAccuracy === 100;

    statusEl.classList.add(correct ? 'is-correct' : 'is-wrong');
    statusEl.textContent = correct
      ? 'Correct'
      : 'Rhythm ' + rhythmAccuracy + '% · Pitch ' + pitchAccuracy + '%';

    if (!correct) {
      const dmap = labelDegreeMap(services);
      appendStageFeedback(statusEl, {
        trueDegrees: melody.notes.map((n) => n.degree),
        answerDegrees: pitchAnswers.map((a) => (dmap.has(a) ? dmap.get(a) : null)),
        rhythmAccuracy: rhythmAccuracy / 100,
        pitchAccuracy: pitchAccuracy / 100,
      });
    }

    ctx.onResult({
      correct,
      clean: correct && !rhythmHadMistake && !pitchHadMistake,
      accuracy,
      meta: { rhythmAccuracy, pitchAccuracy, rhythmEntry: rhythmEntry.slice(), pitchAnswers: pitchAnswers.slice() },
    });
  }

  // Prefer the real rhythm game for phase 1 when the services layer provides it
  // (it self-falls-back to the palette when the rhythm can't be expressed there).
  // Changing-meter melodies skip the embed outright: the ext seam grades against
  // ONE time signature, so a mid-piece change would silently mis-grade.
  if (typeof services.mountRhythmEntry === 'function' && !melody.meterSequence) tryGamePhase();
  else renderRhythmPhase();

  return {
    destroy() {
      destroyed = true;
      if (rhythmMount) rhythmMount.destroy();
      services.stopAudio();
      host.innerHTML = '';
    },
  };
}

/* ============================================================================
 * rhythm-first (M2) — "the rhythm IS the melody": the entire round IS the real
 * rhythm dictation game playing this melody's (monotone) rhythm, embedded via
 * the external-target seam. MELODIC_CURRICULUM.md marks M2 `ready` precisely
 * because it "literally reuses solo-mode.js" — this renderer is that wiring,
 * not a rebuild. Falls back to the notation-entry palette style ONLY if the
 * game is unavailable (offline lab without the game files).
 * ========================================================================== */

/**
 * §3 `exerciseMode: 'rhythm-first'` — the embedded real rhythm game as the round.
 * @param {HTMLElement} host
 * @param {Object} ctx { level, melody, services, onResult }
 * @returns {{ destroy: () => void }}
 */
export function createRhythmFirstRenderer(host, ctx) {
  const { melody, services } = ctx;
  let destroyed = false;
  let mount = null;

  host.innerHTML = '';
  host.classList.add('melodic-rhythm-first');

  const heading = document.createElement('div');
  heading.className = 'melodic-rhythm-first__heading';
  heading.textContent = 'Dictate the rhythm';
  host.appendChild(heading);

  const bodyHost = document.createElement('div');
  host.appendChild(bodyHost);

  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-rhythm-first__status';
  host.appendChild(statusEl);

  mount = services.mountRhythmEntry(bodyHost, {
    durations: melody.notes.map((n) => n.duration),
    meter: melody.meter,
    onResult(r) {
      mount = null;
      if (destroyed) return;
      if (!r) {
        statusEl.classList.add('is-wrong');
        statusEl.textContent = 'Rhythm game unavailable here — this level needs the full app.';
        ctx.onResult({ correct: false, clean: false, accuracy: 0, meta: { unavailable: true } });
        return;
      }
      statusEl.classList.add(r.allCorrect ? 'is-correct' : 'is-wrong');
      statusEl.textContent = r.allCorrect ? 'Correct' : 'Rhythm ' + r.rhythmAccuracy + '%';
      ctx.onResult({
        correct: r.allCorrect,
        clean: r.allCorrect,
        accuracy: r.rhythmAccuracy,
        meta: { rhythmAccuracy: r.rhythmAccuracy },
      });
    },
  });

  return {
    destroy() {
      destroyed = true;
      if (mount) mount.destroy();
      services.stopAudio();
      host.innerHTML = '';
    },
  };
}

/* ============================================================================
 * rhythm-identity (Level 4 stacking stage, MELODIC_CURRICULUM.md §1a) — "the layers
 * merge": Step 1 dictate the RHYTHM (the L4 skill, real rhythm game or palette
 * fallback); Step 2, for each note, NAME it if it is a 1/3/5 anchor (the L1 skill) or
 * SHAPE it up/down if it is the passing 2 the student cannot name yet (the L2 skill).
 * One item requires rhythm + anchor-ID + contour at once — nothing taught is in vain.
 * ========================================================================== */
export function createRhythmIdentityRenderer(host, ctx) {
  const { melody, services } = ctx;
  const T = (typeof window !== 'undefined' && window.__mqTest) || null;
  let destroyed = false;
  let phase = 'rhythm';
  const notes = melody.notes;
  const ANCHORS = new Set([1, 3, 5]);
  const truthDurations = notes.map((n) => n.duration);
  const identityPhase = !!ctx.identityPhase; // the stacking stage adds the name/shape step
  // per-note truth: an anchor is NAMED (its degree label); the passing note is SHAPED
  // (direction vs the previous note). The first note starts on the tonic, so it is always
  // an anchor — every passing note therefore has a previous note to move from.
  const noteTruth = notes.map((n, i) =>
    ANCHORS.has(n.degree)
      ? { kind: 'name', value: services.label(n) }
      : { kind: 'shape', value: (i > 0 && n.midi < notes[i - 1].midi) ? 'down' : 'up' });
  const dirMark = (v) => (v === 'up' ? '/' : '\\'); // non-glyph rising/falling stroke for the staff label
  if (T) T.rhythmIdTruth = noteTruth.map((t, i) => ({ kind: t.kind, value: t.value, degree: notes[i].degree }));

  host.innerHTML = '';
  host.classList.add('melodic-notation-entry');
  // Minimal on-screen chrome (the level modal explains): the two-step stages show a 2-dot step
  // meter (Rhythm -> Notes) instead of worded "Step 1/Step 2" headings; single-task stages show
  // nothing. Matches BUTTON_DESIGN.md / the dots-not-words progress language.
  const stepEl = document.createElement('div');
  stepEl.className = 'melodic-rhythm-steps';
  host.appendChild(stepEl);
  function renderSteps() {
    stepEl.innerHTML = '';
    if (!identityPhase) return;
    const states = phase === 'rhythm' ? ['is-active', 'is-upcoming']
      : phase === 'id' ? ['is-done', 'is-active'] : ['is-done', 'is-done'];
    ['Rhythm', 'Notes'].forEach((label, i) => {
      const d = document.createElement('span');
      d.className = 'melodic-motivation__pip ' + states[i];
      d.title = label; d.setAttribute('aria-label', label);
      stepEl.appendChild(d);
    });
  }
  const playRow = document.createElement('div');
  playRow.className = 'melodic-notation-entry__play-row';
  const playBtn = services.button('Play', 'play');
  // The Slow/Medium/Fast speed wheel is provided by wireHearings (shared across all dictation
  // levels); it starts on Medium each example and feeds the chosen bpm into this play call. Keep a
  // ref so the measure-focus buttons play back at the SAME chosen speed (playWrap.mqGetBpm()).
  const playWrap = wireHearings(playBtn, ctx, (bpm) => services.play(melody, { bpm }));
  playRow.appendChild(playWrap);
  addHomeButton(playRow, ctx);
  host.appendChild(playRow);
  const bodyHost = document.createElement('div');
  host.appendChild(bodyHost);
  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-notation-entry__status';
  host.appendChild(statusEl);

  // ---------- Step 1: dictate the RHYTHM by placing FIGURE TILES onto the staff — the RhythmQuest
  // figure bank, ported NATIVE (no iframe, no hints/quiet/metronome/tap-back). The bank is
  // filtered to the figures this melody actually uses (+ a couple of decoys). ----------
  let rhythmHadMistake = false;
  const conv = durationsToFigures(truthDurations, melody.meter);   // null on an unsupported meter
  const truthFigs = conv ? figureIdSequence(conv) : null;
  if (T) T.rhythmFigTruth = truthFigs; // test seam: the correct figure-tile sequence

  // ---- RhythmStudent (rhythm-student.js -> window.rhythmStudent) is used here ONLY as a figure +
  // grading lookup: rsFindPattern reads its rhythmPatterns for the onset grader's durations, and
  // RS.userAnswer holds the answer the grader reads. The interactive BOARD + tile bank is MqRhythmBoard
  // (mq-rhythm-board.js), NOT RhythmStudent's board (TapQuest shares that) — see renderNativeGridPhase. ----
  // The engine singleton. Read fresh (it may be constructed a beat after first paint on a cold
  // load), and re-pointed when the wait below resolves — so this NEVER falls back to word buttons.
  let RS = (typeof window !== 'undefined') ? window.rhythmStudent : null;
  // Target as engine items: measure index (0-based), 1-based start beat, figure id, beat span.
  const targetItems = conv ? conv.measures.flatMap((meas, mi) =>
    meas.map((it) => ({ mi, startBeat: it.startBeat, patternId: it.figureId, beats: it.beats }))) : [];
  // Look up a placed/target figure's duration ratios in the engine's OWN pattern bank so the
  // onset-grid grader uses the same figure definitions the tiles were built from.
  function rsFindPattern(id) {
    if (!RS || !RS.rhythmPatterns) return null;
    for (const fam in RS.rhythmPatterns) { const p = RS.rhythmPatterns[fam].find((x) => x.id === id); if (p) return p; }
    return null;
  }
  // RhythmQuest grades by rhythmic ONSETS, not tile choice (a half and quarter+rest sound the same).
  // RES=840 = LCM(2..8) so every figure's attacks land on integer grid indices. (ported: solo-mode.js)
  const RES = 840;
  const DUR_BEATS = { w: 4, h: 2, hd: 3, q: 1, qd: 1.5, '8': 0.5, '8d': 0.75, '16': 0.25, '32': 0.125, wr: 4, hr: 2, qr: 1, '8r': 0.5, '16r': 0.25 };
  const noteBeatsOf = (d) => (DUR_BEATS[d] != null ? DUR_BEATS[d] : 1);
  // Melody notes grouped by measure (for the "hear a bar" focus aid). No note crosses a bar line in
  // these rhythms, so a cumulative-beats walk assigns each note to exactly one measure.
  const measureNotes = [];
  if (conv) { let cum = 0; const bpb0 = conv.beatsPerBar; notes.forEach((n) => { const m = Math.floor(cum / bpb0 + 1e-9); (measureNotes[m] = measureNotes[m] || []).push(n); cum += noteBeatsOf(n.duration); }); }
  function onsetGrid(items) {
    const bpb = conv.beatsPerBar;
    const grid = new Array(conv.measures.length * bpb * RES).fill(0);
    items.forEach((it) => {
      const pat = rsFindPattern(it.patternId); if (!pat || !pat.vexflow) return;
      const raw = pat.vexflow.map((n) => noteBeatsOf(n.duration) * RES);
      const sum = raw.reduce((a, x) => a + x, 0) || 1;
      const scale = ((it.beats || pat.beats || 1) * RES) / sum;    // figure occupies exactly its beats
      let pos = (it.mi * bpb + (it.startBeat - 1)) * RES;
      pat.vexflow.forEach((n, k) => {
        const idx = Math.round(pos);
        if (n.duration.indexOf('r') === -1 && idx >= 0 && idx < grid.length) grid[idx] = 1;
        pos += raw[k] * scale;
      });
    });
    return grid;
  }
  function readAnswerItems() {
    const a = []; if (!RS || !RS.userAnswer) return a;
    for (let mi = 0; mi < RS.userAnswer.length; mi++) {
      const row = RS.userAnswer[mi]; if (!row) continue;
      for (let bi = 0; bi < row.length; bi++) {
        const v = row[bi];
        if (v && v.indexOf('_continuation') === -1) { const p = rsFindPattern(v); a.push({ mi, startBeat: bi + 1, patternId: v, beats: p ? p.beats : 1 }); }
      }
    }
    return a;
  }
  function gradeRhythmNative() {
    const bpb = conv.beatsPerBar, tg = onsetGrid(targetItems), ag = onsetGrid(readAnswerItems());
    let wrong = 0; const total = conv.measures.length * bpb;
    for (let mi = 0; mi < conv.measures.length; mi++) for (let bi = 0; bi < bpb; bi++) {
      const start = (mi * bpb + bi) * RES; let diff = false;
      for (let k = 0; k < RES; k++) if (tg[start + k] !== ag[start + k]) { diff = true; break; }
      if (diff) wrong++;
    }
    return { correct: wrong === 0, accuracy: total ? Math.round(100 * (total - wrong) / total) : 100 };
  }

  let rhythmBoardInstance = null;  // active-round MqRhythmBoard; destroyed on re-render + teardown
  function renderNativeGridPhase() {
    renderSteps();
    // Tear down the previous board FIRST (it holds window resize/orientation listeners); innerHTML
    // alone would leak them. renderNativeGridPhase re-runs on the cold-load engine wait.
    if (rhythmBoardInstance) { rhythmBoardInstance.destroy(); rhythmBoardInstance = null; }
    bodyHost.innerHTML = '';
    // Re-read the engine each render; if it isn't up yet (cold first paint / cache), WAIT for it and
    // re-render — we never show the old word-button palette. (There is no word-button path anymore.)
    RS = (typeof window !== 'undefined') ? window.rhythmStudent : null;
    if (!RS || !conv) {
      const msg = document.createElement('div');
      msg.className = 'melodic-notation-entry__progress';
      msg.textContent = 'Loading the rhythm board…';
      bodyHost.appendChild(msg);
      if (!conv) return;                              // unsupported meter (never happens on Level 4)
      let tries = 0;
      const iv = setInterval(() => {
        if (destroyed) { clearInterval(iv); return; }
        if (window.rhythmStudent) { clearInterval(iv); RS = window.rhythmStudent; renderNativeGridPhase(); }
        else if (++tries > 60) { clearInterval(iv); msg.textContent = 'Rhythm board could not load — please refresh.'; }
      }, 100);
      return;
    }
    const wrap = document.createElement('div'); wrap.className = 'mq-rhythm-native'; bodyHost.appendChild(wrap);
    const tip = document.createElement('div'); tip.className = 'melodic-notation-entry__progress';
    tip.textContent = 'Play the melody, then drag the figures onto the staff to build its rhythm'; wrap.appendChild(tip);
    // Containers the engine writes into (the exact ids rhythm-student.js queries).
    const answerArea = document.createElement('div'); answerArea.className = 'answer-area';
    const measureC = document.createElement('div'); measureC.id = 'measureContainer'; answerArea.appendChild(measureC);
    wrap.appendChild(answerArea);
    // Measure-focus aid: play back ONE bar (at the wheel's speed) with that bar highlighted on the
    // staff — a listening hint for isolating a tricky measure. Shown only when there's >1 bar.
    function hearMeasure(m) {
      if (destroyed) return;
      const cells = [...wrap.querySelectorAll('.beat-drop-zone[data-measure="' + (m + 1) + '"]')];
      cells.forEach((c) => c.classList.add('mq-hear'));
      const bpm = (playWrap && playWrap.mqGetBpm) ? playWrap.mqGetBpm() : (services.tempoBPM ? services.tempoBPM() : 92);
      services.play({ meter: melody.meter, notes: measureNotes[m] || [], tonicMidi: melody.tonicMidi }, { bpm, countOff: false });
      const beats = (measureNotes[m] || []).reduce((s, n) => s + noteBeatsOf(n.duration), 0) || conv.beatsPerBar;
      const durMs = Math.round(beats * (60 / bpm) * 1000) + 300;
      setTimeout(() => { if (!destroyed) cells.forEach((c) => c.classList.remove('mq-hear')); }, durMs);
    }
    if (measureNotes.length > 1) {
      const hearRow = document.createElement('div'); hearRow.className = 'melodic-measurehear';
      const cap = document.createElement('span'); cap.className = 'melodic-measurehear__cap'; cap.textContent = 'Hear a bar'; hearRow.appendChild(cap);
      measureNotes.forEach((_, m) => {
        const b = services.button(String(m + 1), 'choice'); b.classList.add('melodic-measurehear__btn');
        b.setAttribute('aria-label', 'Hear bar ' + (m + 1)); b.prepend(services.icon('play'));
        b.onclick = () => hearMeasure(m);
        hearRow.appendChild(b);
      });
      wrap.appendChild(hearRow);
    }
    const bank = document.createElement('div'); bank.className = 'rhythm-bank';
    const tiles = document.createElement('div'); tiles.id = 'rhythmTiles'; tiles.className = 'rhythm-tiles'; bank.appendChild(tiles);
    wrap.appendChild(bank);
    // Filtered figure family: the figures actually heard (+ up to 2 plausible decoys). rsFindPattern
    // confirms the engine knows each id — its vexflow durations drive the onset grader.
    const heard = [...new Set(truthFigs)];
    const decoyPool = ['four-sixteenths', 'quarter-rest', 'dotted-quarter-eighth', 'half', 'two-eighths'];
    const decoys = decoyPool.filter((id) => !heard.includes(id) && rsFindPattern(id)).slice(0, 2);
    const figureIds = [...heard, ...decoys].filter((id) => rsFindPattern(id));
    RS.rhythmPatterns.__mq = figureIds.map((id) => rsFindPattern(id)).filter(Boolean); // kept for grading-lookup parity
    // Action row (Clear / Next) lives in MelodyQuest chrome.
    const actionRow = document.createElement('div'); actionRow.className = 'melodic-notation-entry__actions'; wrap.appendChild(actionRow);
    const undoBtn = services.button('', 'choice'); undoBtn.classList.add('melodic-btn--icon');
    undoBtn.appendChild(services.icon('restart')); undoBtn.setAttribute('aria-label', 'Clear');
    actionRow.appendChild(undoBtn);
    const doneBtn = services.button(identityPhase ? 'Next: notes' : 'Check', 'primary');
    doneBtn.onclick = () => { if (destroyed) return; if (identityPhase) { phase = 'id'; renderIdPhase(); } else grade(); };
    actionRow.appendChild(doneBtn);
    // The interactive board is MelodyQuest's OWN (matches RhythmQuest's LOOK via the shared
    // answer-board.css; interaction re-implemented), NOT rhythm-student.js's board (TapQuest shares that
    // and must stay untouched). It reports its answer as
    // RhythmStudent-shaped userAnswer rows, so MelodyQuest's onset grader (readAnswerItems -> RS.userAnswer)
    // is reused unchanged; RhythmStudent stays loaded only for its pattern bank (rsFindPattern durations).
    let lastCells = 0;
    let mqBoard = null;
    function syncDone() { doneBtn.disabled = !(mqBoard && mqBoard.isComplete()); }
    function syncFromBoard() {
      if (destroyed || !mqBoard) return;
      RS.userAnswer = mqBoard.userAnswerRows();
      const cells = RS.userAnswer.reduce((s, row) => s + row.filter((v) => v && v.indexOf('_continuation') === -1).length, 0);
      if (cells < lastCells) rhythmHadMistake = true;
      lastCells = cells; syncDone();
    }
    mqBoard = window.MqRhythmBoard.create({
      boardHost: measureC, bankHost: tiles,
      measures: conv.measures.length, beatsPerMeasure: conv.beatsPerBar, timeSignature: melody.meter,
      figures: figureIds.map((id) => ({ id })), onChange: syncFromBoard,
      // authoritative beats from RhythmStudent's bank (the same figures grading uses), not the catalog
      beatsOf: (id) => { const p = rsFindPattern(id); return p ? p.beats : 0; },
    });
    rhythmBoardInstance = mqBoard;             // so destroy()/re-render can tear its listeners down
    RS.userAnswer = mqBoard.userAnswerRows();  // initialise (empty) so the grader can read it
    undoBtn.onclick = () => { if (destroyed) return; rhythmHadMistake = true; mqBoard.clear(); };
    syncDone();
    // Test seam: place the correct tiles + read state (headless harness / reveal).
    if (T) T.rhythmNative = {
      targetItems, bankTiles: () => tiles.querySelectorAll('.mqb-tile').length,
      complete: () => mqBoard.isComplete(), done: doneBtn,
      placeAll: () => targetItems.forEach((it) => {
        mqBoard.placeFigure(it.patternId, it.mi * conv.beatsPerBar + (it.startBeat - 1));
      }),
    };
  }

  // ---------- Step 2: name (1/3/5) or shape (up/down) each note ----------
  const answers = new Array(notes.length).fill(null);
  let active = 0;

  function renderIdPhase() {
    renderSteps();
    // Leaving the rhythm board for the note-naming phase: destroy it so its window resize/orientation
    // listeners don't outlive its DOM (innerHTML alone would leak them).
    if (rhythmBoardInstance) { rhythmBoardInstance.destroy(); rhythmBoardInstance = null; }
    bodyHost.innerHTML = '';
    const staffHost = document.createElement('div'); staffHost.className = 'melodic-notation-entry__rhythm'; bodyHost.appendChild(staffHost);
    services.renderRhythmLine(staffHost, melody, {
      labels: answers.map((a) => a ? (a.kind === 'name' ? a.value : dirMark(a.value)) : ''),
      activeIdx: phase === 'done' ? -1 : active,
      onNoteClick: (i) => { if (phase === 'id') { active = i; renderIdPhase(); } },
    });
    if (active < 0 || active >= answers.length) { const fe = answers.findIndex((a) => a == null); active = fe >= 0 ? fe : notes.length - 1; }
    const setAns = (a) => { answers[active] = a; const next = answers.findIndex((x) => x == null); active = next >= 0 ? next : active; renderIdPhase(); };
    const paletteRow = document.createElement('div'); paletteRow.className = 'melodic-notation-entry__palette'; bodyHost.appendChild(paletteRow);
    const palette = services.labelPalette();
    [1, 3, 5].forEach((deg) => { const btn = services.button(palette[deg - 1], 'choice'); btn.onclick = () => setAns({ kind: 'name', value: palette[deg - 1] }); paletteRow.appendChild(btn); });
    ['up', 'down'].forEach((dir) => { const btn = services.button('', 'choice'); btn.classList.add('melodic-btn--icon'); btn.appendChild(services.icon(dir)); btn.setAttribute('aria-label', dir); btn.onclick = () => setAns({ kind: 'shape', value: dir }); paletteRow.appendChild(btn); });
    const actionRow = document.createElement('div'); actionRow.className = 'melodic-notation-entry__actions'; bodyHost.appendChild(actionRow);
    const checkBtn = services.button('Check', 'primary'); checkBtn.disabled = answers.some((a) => a == null); checkBtn.onclick = grade; actionRow.appendChild(checkBtn);
  }

  function grade() {
    if (destroyed || phase === 'done') return;
    phase = 'done';
    // Graded by rhythmic ONSET — the RhythmQuest engine's own semantics (a half and a quarter+rest
    // sound identical, so either grades correct). The native grid is the ONLY rhythm-entry path.
    const rhythmAccuracy = gradeRhythmNative().accuracy;
    let idAccuracy = 100, correct, text;
    if (identityPhase) {
      let idCorrect = 0;
      notes.forEach((n, i) => { const t = noteTruth[i], a = answers[i]; if (a && a.kind === t.kind && a.value === t.value) idCorrect++; });
      idAccuracy = notes.length ? Math.round(100 * idCorrect / notes.length) : 100;
      correct = rhythmAccuracy === 100 && idAccuracy === 100;
      text = correct ? 'Correct' : 'Rhythm ' + rhythmAccuracy + '% · Notes ' + idAccuracy + '%';
      renderIdPhase(); // freeze the staff with the marks
    } else {
      correct = rhythmAccuracy === 100;
      text = correct ? 'Correct' : 'Rhythm ' + rhythmAccuracy + '%';
    }
    statusEl.className = 'melodic-notation-entry__status ' + (correct ? 'is-correct' : 'is-wrong');
    statusEl.textContent = text;
    if (T) T.lastRhythmId = { rhythmAccuracy, idAccuracy };
    ctx.onResult({ correct, clean: correct && !rhythmHadMistake, accuracy: identityPhase ? Math.round((rhythmAccuracy + idAccuracy) / 2) : rhythmAccuracy, meta: { rhythmAccuracy, idAccuracy } });
  }

  // The native RhythmQuest drag-and-drop grid is the ONLY rhythm-entry path. If the engine isn't up
  // yet on a cold load, renderNativeGridPhase shows "Loading…" and waits for it — never word buttons.
  renderNativeGridPhase();

  return { destroy() {
    destroyed = true;
    if (rhythmBoardInstance) { rhythmBoardInstance.destroy(); rhythmBoardInstance = null; }  // drop its window listeners
    if (RS) { RS.onAnswerChanged = null; }  // unhook the engine from this (now dead) round
    services.stopAudio(); host.innerHTML = '';
  } };
}

/* ============================================================================
 * two-part (M20 — see VISION.md §9) — rung 1 "voice attention":
 * both voices play; the student answers selective-listening questions about a
 * NAMED voice ("which voice ended higher?" / "which voice moved by leap?").
 * Rung 2 (one-voice dictation) reuses the labeling renderer fed voices[i] and
 * is selected by the round builder; THIS renderer is rung 1.
 * ========================================================================== */

/**
 * §3 `exerciseMode: 'two-part'` — voice-attention questions over a duet.
 * ctx.melody here is the TWO-PART object { voices: [top, bottom] }.
 * @param {HTMLElement} host
 * @param {Object} ctx
 * @returns {{ destroy: () => void }}
 */
export function createTwoPartRenderer(host, ctx) {
  const { services } = ctx;
  const twoPart = ctx.melody;
  const [top, bottom] = twoPart.voices;
  let destroyed = false;
  let submitted = false;

  host.innerHTML = '';
  host.classList.add('melodic-two-part');

  const howTo = document.createElement('div');
  howTo.className = 'melodic-howto';
  howTo.textContent = 'TWO melodies play at once — the top voice is brighter, the bottom rounder. Listen to each alone if you need to, then answer the questions.';
  host.appendChild(howTo);

  const playRow = document.createElement('div');
  playRow.className = 'melodic-two-part__play-row';
  const both = services.button('Play both', 'play');
  both.prepend(services.icon('play'));
  both.onclick = () => services.playTwoPart(twoPart);
  const topBtn = services.button('Top alone', 'choice');
  topBtn.onclick = () => services.playTwoPart(twoPart, { mute: [false, true] });
  const botBtn = services.button('Bottom alone', 'choice');
  botBtn.onclick = () => services.playTwoPart(twoPart, { mute: [true, false] });
  playRow.appendChild(both); playRow.appendChild(topBtn); playRow.appendChild(botBtn);
  addHomeButton(playRow, { services, melody: top });
  host.appendChild(playRow);

  // Two selective-listening questions, graded together.
  const topEnd = top.notes[top.notes.length - 1].midi;
  const botEnd = bottom.notes[bottom.notes.length - 1].midi;
  const spanOf = (mel) => Math.max(...mel.notes.map((n) => n.midi)) - Math.min(...mel.notes.map((n) => n.midi));
  const questions = [
    {
      text: 'Which voice ENDED higher?',
      choices: [['top', 'The top voice'], ['bottom', 'The bottom voice']],
      truth: topEnd >= botEnd ? 'top' : 'bottom',
    },
    {
      text: 'Which voice covered the WIDER range?',
      choices: [['top', 'The top voice'], ['bottom', 'The bottom voice'], ['same', 'About the same']],
      truth: Math.abs(spanOf(top) - spanOf(bottom)) <= 2 ? 'same' : (spanOf(top) > spanOf(bottom) ? 'top' : 'bottom'),
    },
  ];
  const answers = new Array(questions.length).fill(null);
  let current = 0;

  const cardHost = document.createElement('div');
  cardHost.className = 'melodic-two-part__card';
  host.appendChild(cardHost);
  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-two-part__status';
  host.appendChild(statusEl);

  function renderCard() {
    cardHost.innerHTML = '';
    if (current >= questions.length) { grade(); return; }
    const q = questions[current];
    const t = document.createElement('div');
    t.className = 'melodic-two-part__question melodic-notation-entry__heading';
    t.textContent = (current + 1) + ' / ' + questions.length + ' — ' + q.text;
    cardHost.appendChild(t);
    const row = document.createElement('div');
    row.className = 'melodic-tonic-contour__choices';
    q.choices.forEach(([value, label]) => {
      const b = services.button(label, 'choice');
      b.onclick = () => {
        if (submitted || destroyed) return;
        answers[current] = value;
        current++;
        renderCard();
      };
      row.appendChild(b);
    });
    cardHost.appendChild(row);
  }

  function grade() {
    if (submitted || destroyed) return;
    submitted = true;
    let numCorrect = 0;
    questions.forEach((q, i) => { if (answers[i] === q.truth) numCorrect++; });
    const accuracy = Math.round((numCorrect / questions.length) * 100);
    const correct = accuracy === 100;
    statusEl.classList.add(correct ? 'is-correct' : 'is-wrong');
    statusEl.textContent = correct ? 'Correct' : numCorrect + ' / ' + questions.length + ' correct';
    // reveal the duet notation after grading — see what you heard
    const staffHost = document.createElement('div');
    staffHost.className = 'melodic-two-part__staves melodic-missing-note__staff';
    host.appendChild(staffHost);
    services.renderTwoStaves(staffHost, twoPart);
    ctx.onResult({ correct, clean: correct, accuracy, meta: { answers: answers.slice(), truths: questions.map((q) => q.truth) } });
  }

  renderCard();

  return {
    destroy() {
      destroyed = true;
      services.stopAudio();
      host.innerHTML = '';
    },
  };
}

/* ============================================================================
 * two-part rung 3 (M20 — see VISION.md §9) — FULL two-voice
 * dictation: notate BOTH voices, one at a time, with per-voice isolation
 * playback throughout. Composes the proven labeling renderer per voice (reuse,
 * not rebuild): voice 1 = top line, then voice 2 = bottom line; per-voice
 * accuracy, overall = mean, correct = both perfect.
 * ========================================================================== */

/**
 * @param {HTMLElement} host
 * @param {Object} ctx ctx.melody is the two-part object { voices: [top, bottom] }
 * @returns {{ destroy: () => void }}
 */
export function createTwoPartNotateRenderer(host, ctx) {
  const { services } = ctx;
  const twoPart = ctx.melody;
  let destroyed = false;
  let inner = null;
  const results = [];

  host.innerHTML = '';
  host.classList.add('melodic-two-part-notate');

  const banner = document.createElement('div');
  banner.className = 'melodic-notation-entry__heading';
  host.appendChild(banner);

  const isoRow = document.createElement('div');
  isoRow.className = 'melodic-two-part__play-row melodic-controls';
  const both = services.button('Play both', 'play'); // transport -> green (matches the duet screen)
  both.onclick = () => services.playTwoPart(twoPart);
  isoRow.appendChild(both);
  host.appendChild(isoRow);

  const innerHost = document.createElement('div');
  host.appendChild(innerHost);

  function mountVoice(vi) {
    banner.textContent = 'Voice ' + (vi + 1) + ' of 2 — dictate the ' + (vi === 0 ? 'TOP' : 'BOTTOM') + ' line';
    if (inner) inner.destroy();
    inner = createLabelingRenderer(innerHost, {
      ...ctx,
      melody: twoPart.voices[vi],
      distractors: [],
      onResult(r) {
        results.push(r);
        if (vi === 0 && !destroyed) {
          setTimeout(() => { if (!destroyed) mountVoice(1); }, 1400);
        } else if (!destroyed) {
          const accuracy = Math.round((results[0].accuracy + results[1].accuracy) / 2);
          const correct = results[0].correct && results[1].correct;
          ctx.onResult({
            correct,
            clean: correct && results[0].clean !== false && results[1].clean !== false,
            accuracy,
            meta: { topAccuracy: results[0].accuracy, bottomAccuracy: results[1].accuracy },
          });
        }
      },
    });
  }

  mountVoice(0);

  return {
    destroy() {
      destroyed = true;
      if (inner) inner.destroy();
      services.stopAudio();
      host.innerHTML = '';
    },
  };
}

/* ============================================================================
 * INTERVAL GYM STATIONS (INTERVAL_GYM_SPEC.md §5). Standard renderer contract:
 * create*(host, ctx) -> {destroy()}, onResult exactly once. ctx.gymItems is an
 * array of items from core/gym.js (built by the shell); ctx.services as ever.
 * ========================================================================== */

/**
 * §5.1 FEEL — pre-verbal sensory judgments in key context. For each pair:
 * "does the second note feel settled or leaning?" (settled = lands on 1̂/3̂/5̂ —
 * the stability vocabulary M0 already taught). 6 pairs; accuracy = % correct.
 */
export function createGymFeelRenderer(host, ctx) {
  const { services } = ctx;
  const items = ctx.gymItems;
  let destroyed = false, submitted = false, current = 0, numCorrect = 0;

  host.innerHTML = '';
  host.classList.add('melodic-gym-feel');
  const heading = document.createElement('div');
  heading.className = 'melodic-tonic-contour__heading';
  heading.textContent = 'FEEL — settled or leaning?';
  host.appendChild(heading);
  const howTo = document.createElement('div');
  howTo.className = 'melodic-howto';
  howTo.textContent = 'Home plays first, then two notes. Does the SECOND note feel settled (at rest) or leaning (wanting to move)? No names needed — just the feeling.';
  host.appendChild(howTo);
  const cardHost = document.createElement('div');
  host.appendChild(cardHost);
  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-tonic-contour__status';
  host.appendChild(statusEl);

  function renderCard() {
    cardHost.innerHTML = '';
    if (current >= items.length) { grade(); return; }
    const it = items[current];
    const playBtn = makePlayButton(services, 'Hear it');
    playBtn.onclick = async () => {
      await services.playNote(ctx.tonicMidi, 2.2);
      await new Promise((r) => setTimeout(r, 1600));
      await services.playNote(it.midiFrom, 1);
      await new Promise((r) => setTimeout(r, 700));
      await services.playNote(it.midiTo, 1);
    };
    cardHost.appendChild(playBtn);
    const row = document.createElement('div');
    row.className = 'melodic-tonic-contour__choices';
    [['settled', 'Settled'], ['leaning', 'Leaning']].forEach(([v, label]) => {
      const b = services.button(label, 'choice');
      b.onclick = () => {
        if (submitted || destroyed) return;
        const truth = [1, 3, 5].includes(it.toDegree) ? 'settled' : 'leaning';
        if (v === truth) numCorrect++;
        current++;
        renderCard();
      };
      row.appendChild(b);
    });
    cardHost.appendChild(row);
    const prog = document.createElement('div');
    prog.className = 'melodic-tonic-contour__progress';
    prog.textContent = (current + 1) + ' / ' + items.length;
    cardHost.appendChild(prog);
  }

  function grade() {
    if (submitted || destroyed) return;
    submitted = true;
    const accuracy = Math.round((numCorrect / items.length) * 100);
    const correct = numCorrect >= (ctx.capstone ? items.length : items.length - 1); // 5/6 (capstone: all)
    statusEl.classList.add(correct ? 'is-correct' : 'is-wrong');
    statusEl.textContent = numCorrect + ' / ' + items.length;
    ctx.onResult({ correct, clean: numCorrect === items.length, accuracy, meta: { station: 'feel', numCorrect } });
  }

  renderCard();
  return { destroy() { destroyed = true; services.stopAudio(); host.innerHTML = ''; } };
}

/**
 * §5.3 NAME — cadence context, then the pair (timbre/register roulette); answer
 * BOTH the degree pair and the interval quality. 6 items; both-correct = item
 * correct; per-part partial accuracy.
 */
export function createGymNameRenderer(host, ctx) {
  const { services } = ctx;
  const items = ctx.gymItems;
  let destroyed = false, submitted = false, current = 0;
  let fullCorrect = 0, parts = 0, partsCorrect = 0;

  host.innerHTML = '';
  host.classList.add('melodic-gym-name');
  const heading = document.createElement('div');
  heading.className = 'melodic-tonic-contour__heading';
  heading.textContent = 'NAME — which degrees, which interval?';
  host.appendChild(heading);
  const howTo = document.createElement('div');
  howTo.className = 'melodic-howto';
  howTo.textContent = 'A cadence sets the key, then two notes play (different instruments and registers each time). Name the DEGREE PAIR and the INTERVAL.';
  host.appendChild(howTo);
  const cardHost = document.createElement('div');
  host.appendChild(cardHost);
  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-tonic-contour__status';
  host.appendChild(statusEl);

  function renderCard() {
    cardHost.innerHTML = '';
    if (current >= items.length) { grade(); return; }
    const it = items[current];
    let degreeAnswer = null, qualityAnswer = null;

    const playBtn = makePlayButton(services, 'Hear it');
    playBtn.onclick = async () => {
      await services.playCadence(ctx.key, ctx.mode);
      await services.playPairTimbred({ midiFrom: it.midiFrom, midiTo: it.midiTo, seed: it.seed || current + 1 });
    };
    cardHost.appendChild(playBtn);

    const degreeRow = document.createElement('div');
    degreeRow.className = 'melodic-tonic-contour__choices';
    ctx.degreeChoices(it).forEach((choice) => {
      const b = services.button(choice.label, 'choice');
      b.onclick = () => { degreeAnswer = choice.value; b.classList.add('is-selected'); maybeGradeItem(); };
      degreeRow.appendChild(b);
    });
    cardHost.appendChild(degreeRow);

    const qualityRow = document.createElement('div');
    qualityRow.className = 'melodic-tonic-contour__choices';
    ctx.qualityChoices(it).forEach((q) => {
      const b = services.button(q, 'choice');
      b.onclick = () => { qualityAnswer = q; b.classList.add('is-selected'); maybeGradeItem(); };
      qualityRow.appendChild(b);
    });
    cardHost.appendChild(qualityRow);

    const prog = document.createElement('div');
    prog.className = 'melodic-tonic-contour__progress';
    prog.textContent = (current + 1) + ' / ' + items.length;
    cardHost.appendChild(prog);

    function maybeGradeItem() {
      if (degreeAnswer == null || qualityAnswer == null) return;
      const degreeRight = degreeAnswer === it.degreePair.join('-');
      const qualityRight = qualityAnswer === it.intervalLabel;
      parts += 2;
      if (degreeRight) partsCorrect++;
      if (qualityRight) partsCorrect++;
      if (degreeRight && qualityRight) fullCorrect++;
      current++;
      renderCard();
    }
  }

  function grade() {
    if (submitted || destroyed) return;
    submitted = true;
    const accuracy = parts ? Math.round((partsCorrect / parts) * 100) : 0;
    const correct = fullCorrect >= (ctx.capstone ? items.length : items.length - 1); // 5/6 (capstone: all)
    statusEl.classList.add(correct ? 'is-correct' : 'is-wrong');
    statusEl.textContent = fullCorrect + ' / ' + items.length + ' fully named';
    ctx.onResult({ correct, clean: fullCorrect === items.length, accuracy, meta: { station: 'name', fullCorrect } });
  }

  renderCard();
  return { destroy() { destroyed = true; services.stopAudio(); host.innerHTML = ''; } };
}

/**
 * §5.2 FIND — the tap-stream generalized to interval detection inside moving
 * music. ctx.gymStream = {melody, targetPairs} from core/gym gymFindStream; a
 * tap counts in the window of a target pair's SECOND note (the moment the
 * interval becomes audible).
 */
export function createGymFindRenderer(host, ctx) {
  host.innerHTML = '';
  host.classList.add('melodic-gym-find');
  const { melody, targetPairs } = ctx.gymStream;
  const notes = melody.notes.slice(0, 10);
  const targetIdx = new Set(targetPairs.map((p) => p[1]).filter((i) => i < notes.length));
  const what = ctx.circuitNoun || ctx.circuitLabel;
  return createTapStreamGame(host, ctx, {
    notes,
    tonicMidi: melody.tonicMidi,
    isTarget: (i) => targetIdx.has(i),
    // Station mastery threshold is ≥ 5/6 (spec §6); the capstone demands a clean
    // (perfect) FIND like every other capstone station.
    passRatio: ctx.capstone ? 1 : 5 / 6,
    heading: 'FIND — mark every ' + what + ' you hear',
    targetName: 'a ' + what + ' with the note right before it',
    perfectText: 'Perfect — caught every one',
    meta: { station: 'find', pairs: targetPairs.length },
  });
}

/**
 * §5.5 USE — the transfer measurement. Thin wrapper: the EXISTING missing-note
 * renderer does all the work; the Gym only supplies gymUseRound's micro-melody
 * and forces WHICH note is hidden (the target interval's second note).
 */
export function createGymUseRenderer(host, ctx) {
  const { melody, hideIdx } = ctx.gymUse;
  return createMissingNoteRenderer(host, {
    ...ctx,
    melody,
    forceHideIdx: hideIdx,
    level: { pitch: { degrees: [1, 2, 3, 4, 5, 6, 7] } },
  });
}

/**
 * §5.4 SING — the production leg. Play a reference (drone + FROM note), ask the
 * student to sing the interval in the named direction, then GRADE their voice.
 * Mic path (gated on consent) -> core/pitch.js autocorrelation in cents; fallback
 * (mic denied/blocked) -> sing-then-compare self-report. Short-span, opt-in — the
 * research is explicit that forced sing-back on LONG material hurts; a single
 * interval is exactly the short, masterable span where production training helps.
 */
export function createGymSingRenderer(host, ctx) {
  const { services } = ctx;
  const items = ctx.gymItems;
  let destroyed = false, submitted = false, current = 0;
  let score = 0; // hit = 1, near/octave = 0.5
  let usedFallback = false, anySelfGraded = false;
  let consent = ctx.micConsent; // LOCAL mutable copy — ctx.micConsent is a snapshot

  host.innerHTML = '';
  host.classList.add('melodic-gym-sing');
  const heading = document.createElement('div');
  heading.className = 'melodic-tonic-contour__heading';
  heading.textContent = 'SING — produce the interval';
  host.appendChild(heading);
  const howTo = document.createElement('div');
  howTo.className = 'melodic-howto';
  howTo.textContent = 'Hear home and a starting note, then SING the named interval from it. Short and low-pressure — one interval at a time.';
  host.appendChild(howTo);

  const cardHost = document.createElement('div');
  host.appendChild(cardHost);
  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-tonic-contour__status';
  host.appendChild(statusEl);

  // Consent gate (INTERVAL_GYM_SPEC §5.4): ask ONCE, persist via the shell.
  function needsConsentPrompt() { return consent == null && !usedFallback; }

  function dirWord(it) { return it.direction === 'desc' ? 'DOWN' : 'UP'; }

  async function playReference(it) {
    await services.playNote(ctx.tonicMidi, 2);        // home
    await new Promise((r) => setTimeout(r, 1400));
    await services.playNote(it.midiFrom, 1.4);        // the starting note to sing FROM
  }

  function renderCard() {
    cardHost.innerHTML = '';
    if (current >= items.length) { grade(); return; }
    const it = items[current];

    if (needsConsentPrompt()) { renderConsent(it); return; }

    const prompt = document.createElement('div');
    prompt.className = 'melodic-overlay__sub';
    prompt.textContent = 'Sing ' + dirWord(it) + ' a ' + it.intervalLabel + ' from the starting note.';
    cardHost.appendChild(prompt);

    const row = document.createElement('div');
    row.className = 'melodic-tonic-contour__choices';
    const hearBtn = services.button('Hear reference', 'play');
    hearBtn.prepend(services.icon('play'));
    hearBtn.onclick = () => playReference(it);
    row.appendChild(hearBtn);
    cardHost.appendChild(row);

    if (usedFallback || consent === false) renderFallback(it);
    else renderMic(it);

    const prog = document.createElement('div');
    prog.className = 'melodic-tonic-contour__progress';
    prog.textContent = (current + 1) + ' / ' + items.length;
    cardHost.appendChild(prog);
  }

  function renderConsent(it) {
    const box = document.createElement('div');
    box.className = 'melodic-overlay__goal';
    box.textContent = 'This station grades your singing with the microphone. Nothing is recorded or uploaded — audio is analysed live in your browser and discarded. Prefer not to? Use the self-check instead.';
    cardHost.appendChild(box);
    const row = document.createElement('div');
    row.className = 'melodic-tonic-contour__choices';
    const yes = services.button('Use microphone', 'primary');
    yes.onclick = () => { consent = true; if (ctx.onMicConsent) ctx.onMicConsent(true); renderCard(); };
    const no = services.button('No mic — self-check', 'choice');
    no.onclick = () => { consent = false; usedFallback = true; if (ctx.onMicConsent) ctx.onMicConsent(false); renderCard(); };
    row.append(yes, no);
    cardHost.appendChild(row);
  }

  function renderMic(it) {
    const recRow = document.createElement('div');
    recRow.className = 'melodic-tonic-contour__choices';
    const recBtn = services.button('Sing now (2.5s)', 'primary');
    recRow.appendChild(recBtn);
    cardHost.appendChild(recRow);
    const meter = document.createElement('div');
    meter.className = 'melodic-sing__meter';
    const bar = document.createElement('span');
    meter.appendChild(bar);
    cardHost.appendChild(meter);

    recBtn.onclick = async () => {
      if (destroyed || submitted) return;
      recBtn.disabled = true; recBtn.textContent = 'Listening…';
      const frames = [];
      let sampleRate = 44100;
      try {
        const cap = await services.captureSungFrames({
          captureMs: 2500, frameMs: 40,
          onFrame: (f) => frames.push(f),
          onLevel: (peak) => { bar.style.width = Math.min(100, Math.round(peak * 240)) + '%'; },
        });
        sampleRate = cap.sampleRate;
      } catch (e) {
        // Mic denied / unavailable / Safari-blocked -> switch this and the rest of
        // the round to the self-compare fallback with an explanation (never fail
        // silently — the project's hard-won audio lesson).
        usedFallback = true;
        statusEl.className = 'melodic-tonic-contour__status';
        statusEl.textContent = 'Microphone unavailable — switching to self-check.';
        renderCard();
        return;
      }
      const detections = frames.map((f) => detectPitch(f, sampleRate, { minHz: 80, maxHz: 1000 }));
      const med = medianPitch(detections);
      if (!med) {
        recBtn.disabled = false; recBtn.textContent = 'Sing again (2.5s)';
        bar.style.width = '0%';
        statusEl.className = 'melodic-tonic-contour__status is-wrong';
        statusEl.textContent = 'Didn’t catch a clear pitch — sing a steady tone a little louder.';
        return;
      }
      const verdict = gradeSungPitch(it.midiTo, med.hz);
      // Test seam (?mqtest=1): expose what the mic pipeline actually detected so
      // the fake-media browser test can assert the real capture->detect->grade path.
      if (typeof window !== 'undefined' && window.__mqTest) {
        window.__mqTest.lastSing = { targetMidi: it.midiTo, medHz: med.hz, voiced: med.voiced, verdict };
      }
      applyVerdict(it, verdict, false);
    };
  }

  function renderFallback(it) {
    const box = document.createElement('div');
    box.className = 'melodic-tonic-contour__howto';
    box.textContent = 'Self-check: sing the interval out loud, then play the true note and judge yourself honestly.';
    cardHost.appendChild(box);
    const row = document.createElement('div');
    row.className = 'melodic-tonic-contour__choices';
    const hearTrue = services.button('Play the true note', 'play');
    hearTrue.prepend(services.icon('play'));
    hearTrue.onclick = () => services.playNote(it.midiTo, 1.4);
    row.appendChild(hearTrue);
    cardHost.appendChild(row);
    const judgeRow = document.createElement('div');
    judgeRow.className = 'melodic-tonic-contour__choices';
    [['match', 'I matched it'], ['near', 'Close'], ['miss', 'Missed']].forEach(([v, label]) => {
      const b = services.button(label, 'choice');
      b.onclick = () => {
        anySelfGraded = true;
        // Self-graded: only a confident hit or miss moves the score (spec — never
        // credit "near" on self-report, which is the least reliable band).
        if (v === 'match') score += 1;
        current++;
        renderCard();
      };
      judgeRow.appendChild(b);
    });
    cardHost.appendChild(judgeRow);
  }

  function applyVerdict(it, verdict, selfGraded) {
    const centsTxt = ' (' + (verdict.cents >= 0 ? '+' : '') + Math.round(verdict.cents) + '¢)';
    if (verdict.verdict === 'hit') { score += 1; showLine('is-correct', 'On pitch' + centsTxt); }
    else if (verdict.verdict === 'octave') { score += 0.5; showLine('is-correct', 'Right note, different octave' + centsTxt); }
    else if (verdict.verdict === 'near') { score += 0.5; showLine('is-correct', 'Close' + centsTxt); }
    else showLine('is-wrong', 'Off this time' + centsTxt);
    if (selfGraded) anySelfGraded = true;
    setTimeout(() => { current++; renderCard(); }, 900);
  }
  function showLine(cls, txt) {
    statusEl.className = 'melodic-tonic-contour__status ' + cls;
    statusEl.textContent = txt;
  }

  function grade() {
    if (submitted || destroyed) return;
    submitted = true;
    services.releaseMic();
    const passed = ctx.capstone ? score >= items.length : score >= 4; // SING ≥ 4/6 (capstone: all)
    const accuracy = Math.round((score / items.length) * 100);
    statusEl.className = 'melodic-tonic-contour__status ' + (passed ? 'is-correct' : 'is-wrong');
    statusEl.textContent = score + ' / ' + items.length + (usedFallback || anySelfGraded ? ' (self-checked)' : '');
    ctx.onResult({
      correct: passed, clean: score === items.length, accuracy,
      meta: { station: 'sing', score, selfGraded: usedFallback || anySelfGraded },
    });
  }

  renderCard();
  return { destroy() { destroyed = true; services.releaseMic(); services.stopAudio(); host.innerHTML = ''; } };
}

/* ============================================================================
 * M1.5 MEMORY SPAN — "Hold the tune" (MELODIC_LADDER_EXPANSION_PLAN NEW-A).
 * Play a short run of in-key notes, then echo it back in order on a degree
 * palette. Span GROWS with the level's mastery (3->4->5). Trains the tonal
 * working memory the research names as dictation's dominant bottleneck. Kept
 * tonal (structure is what transfers — random-note span training does not).
 * ========================================================================== */
export function createMemorySpanRenderer(host, ctx) {
  const { services, melody, level } = ctx;
  let destroyed = false, submitted = false;

  // Stage-driven (Level 3 ladder): the shell passes span + tempo + content rule + reverse
  // per stage; the run is a controlled degree-walk (buildSpanSeq), not the round melody.
  // Fallback to a score-based span for any non-staged caller (e.g. the gym).
  const score = (ctx.progress && Number.isFinite(ctx.progress.score)) ? ctx.progress.score : 0;
  const span = Number.isInteger(ctx.spanCount) ? ctx.spanCount : (score >= 80 ? 5 : score >= 40 ? 4 : 3);
  const reverse = !!ctx.spanReverse;
  const gapMs = Number.isFinite(ctx.spanGapMs) ? ctx.spanGapMs : 620;
  const rule = ctx.spanRule || { maxStep: 3, homeStart: true };
  const allowedDeg = (level && level.pitch && level.pitch.degrees) || [1, 2, 3, 5];
  // Fresh seed every round so runs genuinely vary; built ONCE here, so replays stay identical.
  const seq = buildSpanSeq(melody.tonicMidi, span, rule, allowedDeg, Math.floor(Math.random() * 1e6) + 1);
  const target = reverse ? seq.slice().reverse() : seq; // what the taps are graded against
  if (typeof window !== 'undefined' && window.__mqTest) { window.__mqTest.spanTarget = target.map((n) => n.degree); window.__mqTest.spanGapMs = gapMs; }

  host.innerHTML = '';
  host.classList.add('melodic-memory-span');
  const heading = document.createElement('div');
  heading.className = 'melodic-tonic-contour__heading';
  heading.textContent = reverse
    ? 'Reverse it — echo ' + span + ' notes BACKWARD'
    : 'Hold the tune — echo back ' + span + ' notes';
  host.appendChild(heading);
  const howTo = document.createElement('div');
  howTo.className = 'melodic-howto';
  // One short cue only — the heading names the task and the level modal carries the rest.
  howTo.textContent = reverse ? 'Tap it back — last note first.' : 'Tap it back in order.';
  host.appendChild(howTo);

  // Slot row carries a HOME block first (Level 1 style), then the answer boxes. The Play
  // handler glows the WHOLE row while the tune plays — NOT per box (owner: hold the shape,
  // not single notes); the HOME block lights whenever home sounds (auto-first or on tap).
  const slotRow = document.createElement('div');
  slotRow.className = 'melodic-memory-span__slots';
  const homeBlock = document.createElement('button');
  homeBlock.type = 'button';
  homeBlock.className = 'melodic-memory-span__home';
  homeBlock.append(services.icon('play'), document.createTextNode('HOME'));
  homeBlock.setAttribute('aria-label', 'Hear home');
  homeBlock.title = 'Hear home';
  let homeTO = 0;
  const lightHome = (ms) => { homeBlock.classList.add('is-playing'); clearTimeout(homeTO); if (ms) homeTO = setTimeout(() => { if (!destroyed) homeBlock.classList.remove('is-playing'); }, ms); };
  homeBlock.onclick = () => { if (destroyed) return; services.playNote(melody.tonicMidi, 1.2); lightHome(1200); };
  slotRow.appendChild(homeBlock);
  ctx.onHomeStart = () => lightHome();
  ctx.onHomeEnd = () => lightHome(220);

  const playRow = document.createElement('div');
  playRow.className = 'melodic-tonic-contour__choices';
  const playBtn = services.button('Play', 'play');
  playRow.appendChild(wireHearings(playBtn, ctx, (bpm) => {
    slotRow.classList.add('is-listening');           // whole-row "listening" glow (no per-note map)
    const base = services.tempoBPM ? services.tempoBPM() : 92;
    const g = Math.round(gapMs * (bpm ? base / bpm : 1)); // speed wheel widens (slow) / narrows (fast) the gap
    let t = 0;
    seq.forEach((n) => { setTimeout(() => { if (!destroyed) services.playNote(n.midi, 0.7); }, t); t += g; });
    setTimeout(() => { if (!destroyed) slotRow.classList.remove('is-listening'); }, seq.length * g + 250);
  }));
  host.appendChild(playRow);
  host.appendChild(slotRow);

  const entered = [];
  const slots = seq.map(() => {
    const s = document.createElement('span');
    s.className = 'melodic-memory-span__slot';
    s.textContent = '·';
    slotRow.appendChild(s);
    return s;
  });

  const paletteRow = document.createElement('div');
  paletteRow.className = 'melodic-tonic-contour__choices';
  host.appendChild(paletteRow);
  const fullPalette = services.labelPalette();
  const allowed = (level && level.pitch && level.pitch.degrees) || [1, 2, 3, 4, 5, 6, 7];
  fullPalette.forEach((label, i) => {
    const degree = i + 1;
    if (!allowed.includes(degree)) return;
    const b = services.button(label, 'choice');
    b.onclick = () => {
      if (submitted || destroyed || entered.length >= seq.length) return;
      entered.push(degree);
      slots[entered.length - 1].textContent = label;
      slots[entered.length - 1].classList.add('is-filled');
      if (entered.length === seq.length) grade();
    };
    paletteRow.appendChild(b);
  });

  const undo = services.button('Undo', 'choice');
  undo.onclick = () => {
    if (submitted || destroyed || !entered.length) return;
    entered.pop();
    slots[entered.length].textContent = '·';
    slots[entered.length].classList.remove('is-filled');
  };
  paletteRow.appendChild(undo);

  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-tonic-contour__status';
  host.appendChild(statusEl);

  function grade() {
    if (submitted || destroyed) return;
    submitted = true;
    let right = 0;
    target.forEach((n, i) => {
      const ok = entered[i] === n.degree;
      if (ok) right++;
      slots[i].classList.add(ok ? 'is-correct' : 'is-wrong');
    });
    const accuracy = Math.round((right / target.length) * 100);
    const correct = right === target.length;
    statusEl.className = 'melodic-tonic-contour__status ' + (correct ? 'is-correct' : 'is-wrong');
    statusEl.textContent = correct
      ? (reverse ? 'Perfect — all ' + span + ' backward!' : 'Perfect — held all ' + span)
      : right + ' of ' + span + (reverse ? ' in reverse' : ' in order');
    if (!correct) {
      appendStageFeedback(statusEl, {
        trueDegrees: target.map((n) => n.degree),
        answerDegrees: entered.map((d) => (Number.isFinite(d) ? d : null)),
      });
      // Chunking coaching — the real skill is hearing GROUPS, not single notes.
      const tip = document.createElement('div');
      tip.className = 'melodic-howto';
      tip.textContent = span >= 4
        ? 'Tip: chunk it — hear the first 2-3 notes as ONE shape, then the rest, instead of note-by-note.'
        : 'Tip: hum the whole run once as a single shape before you tap.';
      statusEl.appendChild(tip);
    }
    ctx.onResult({ correct, clean: correct, accuracy, meta: { span, right, reverse } });
  }

  return { destroy() { destroyed = true; services.stopAudio(); host.innerHTML = ''; } };
}

/* ============================================================================
 * M8.5 PROTONOTATION — "Sketch it" (MELODIC_LADDER_EXPANSION_PLAN NEW-C). The
 * bridge between last-no-staff (M8) and first-staff (M9): capture only what's
 * HEARD — scale-degree numbers + up/down/same contour — before staff fluency.
 * Grades UNDERSTANDING (degree + contour) separately from NOTATION, via the
 * pure core/protonotation.js grader. No shipped product has this stage.
 * ========================================================================== */
export function createProtonotationRenderer(host, ctx) {
  const { services, melody, level } = ctx;
  let destroyed = false, submitted = false;
  const n = melody.notes.length;

  host.innerHTML = '';
  host.classList.add('melodic-protonotation');
  const heading = document.createElement('div');
  heading.className = 'melodic-notation-entry__heading';
  heading.textContent = 'Sketch it — degrees + contour, no staff yet';
  host.appendChild(heading);
  const howTo = document.createElement('div');
  howTo.className = 'melodic-howto';
  howTo.textContent = 'Each note: its degree + up / down / same.';
  host.appendChild(howTo);

  const playRow = document.createElement('div');
  playRow.className = 'melodic-tonic-contour__choices';
  const playBtn = services.button('Play', 'play');
  playRow.appendChild(wireHearings(playBtn, ctx, (bpm) => services.play(melody, { bpm })));
  addHomeButton(playRow, ctx);
  host.appendChild(playRow);

  const allowed = (level && level.pitch && level.pitch.degrees) || [1, 2, 3, 4, 5, 6, 7];
  const fullPalette = services.labelPalette();
  const entries = melody.notes.map(() => ({ degree: null, contour: null }));

  const grid = document.createElement('div');
  grid.className = 'melodic-protonotation__grid';
  host.appendChild(grid);

  melody.notes.forEach((note, i) => {
    const col = document.createElement('div');
    col.className = 'melodic-protonotation__col';

    // contour picker (moves 1..n-1; first note has no incoming move)
    if (i > 0) {
      const con = document.createElement('div');
      con.className = 'melodic-protonotation__contour';
      ['up', 'same', 'down'].forEach((v) => {
        const cb = document.createElement('button');
        cb.className = 'melodic-btn melodic-protonotation__arrow';
        cb.appendChild(services.icon(v)); // SVG only (no glyphs)
        cb.setAttribute('aria-label', v);
        cb.onclick = () => {
          if (submitted || destroyed) return;
          entries[i].contour = v;
          [...con.children].forEach((c) => c.classList.remove('is-selected'));
          cb.classList.add('is-selected');
          refreshCheck();
        };
        con.appendChild(cb);
      });
      col.appendChild(con);
    } else {
      const spacer = document.createElement('div');
      spacer.className = 'melodic-protonotation__contour';
      spacer.appendChild(services.icon('dot')); // anchor: first note, no incoming move
      col.appendChild(spacer);
    }

    // degree picker (a compact select filtered to the level's degrees)
    const sel = document.createElement('select');
    sel.className = 'melodic-protonotation__degree';
    const blank = document.createElement('option');
    blank.value = ''; blank.textContent = '?';
    sel.appendChild(blank);
    fullPalette.forEach((label, di) => {
      const degree = di + 1;
      if (!allowed.includes(degree)) return;
      const o = document.createElement('option');
      o.value = String(degree); o.textContent = label;
      sel.appendChild(o);
    });
    sel.onchange = () => { entries[i].degree = sel.value ? Number(sel.value) : null; refreshCheck(); };
    col.appendChild(sel);

    grid.appendChild(col);
  });

  const checkRow = document.createElement('div');
  checkRow.className = 'melodic-tonic-contour__choices';
  const checkBtn = services.button('Check my sketch', 'primary');
  checkBtn.disabled = true; // stays disabled until the sketch is complete (matches every other Check)
  checkBtn.onclick = grade;
  checkRow.appendChild(checkBtn);
  host.appendChild(checkRow);
  // complete = every note has a degree, and every move (note 2+) has a contour
  function refreshCheck() {
    checkBtn.disabled = !entries.every((e, i) => e.degree != null && (i === 0 || e.contour));
  }

  const statusEl = document.createElement('div');
  statusEl.className = 'melodic-notation-entry__status';
  host.appendChild(statusEl);

  function grade() {
    if (submitted || destroyed) return;
    submitted = true;
    const res = gradeProtonotation({ entries }, melody);
    statusEl.className = 'melodic-notation-entry__status ' + (res.correct ? 'is-correct' : 'is-wrong');
    // Stage-isolated feedback — the whole point (Klonoski's "which stage failed?").
    statusEl.textContent = (res.correct ? 'Sketch matches! ' : 'Not yet. ') +
      'Degrees ' + Math.round(res.degreeAccuracy * 100) + '% · ' +
      'Contour ' + Math.round(res.contourAccuracy * 100) + '% · ' +
      'Count ' + (res.countAccuracy === 1 ? 'right' : 'off');
    ctx.onResult({
      correct: res.correct, clean: res.correct && res.overall === 1,
      accuracy: Math.round(res.overall * 100),
      meta: { station: 'protonotation', degreeAccuracy: res.degreeAccuracy, contourAccuracy: res.contourAccuracy },
    });
  }

  return { destroy() { destroyed = true; services.stopAudio(); host.innerHTML = ''; } };
}
