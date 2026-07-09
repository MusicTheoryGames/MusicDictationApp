/* ============================================================================
 * EAR ARCADE — a whack-a-degree aural-recognition GAME (Practice mode).
 *
 * Notes stream by in a key; the student taps the button for the scale degree they
 * HEAR, in time (like whack-a-mole — react as notes fly past). It progresses:
 *   1̂ only -> 3̂ only -> 5̂ only -> 1̂ vs 3̂ -> the triad 1̂·3̂·5̂ -> +2̂ -> up to 5̂ -> full scale.
 * This is the "game" layer that trains FAST degree recognition (the aural foundation
 * the dictation ladder rests on), generalising M0's "tap HOME on 1̂" to every degree.
 *
 * Standalone: it uses only `services` (playNote / labelPalette / stopAudio / icon) and
 * touches nothing on the main ladder. Mounted from the Practice menu.
 *   mountEarArcade(host, { services, onExit }) -> { destroy() }
 * ========================================================================== */

const MAJOR_SEMIS = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };

// The progression. Each stage names the target degrees the student must catch; the buttons shown ARE
// those targets. Non-target scale tones also stream by (distractors you must NOT tap).
const ARCADE_STAGES = [
  { name: 'Home — 1̂', targets: [1] },
  { name: 'The 3rd — 3̂', targets: [3] },
  { name: 'The 5th — 5̂', targets: [5] },
  { name: '1̂ or 3̂', targets: [1, 3] },
  { name: 'The triad — 1̂ 3̂ 5̂', targets: [1, 3, 5] },
  { name: 'Add the 2̂', targets: [1, 2, 3] },
  { name: 'Up to 5̂', targets: [1, 2, 3, 4, 5] },
  { name: 'Full scale', targets: [1, 2, 3, 4, 5, 6, 7] },
];

const WAVE_LEN = 14; // notes per wave

export function mountEarArcade(host, opts) {
  const { services, onExit } = opts;
  const T = (typeof window !== 'undefined' && window.__mqTest) || null;
  const tonic = 60; // C4 — a fixed key for the arcade (fine-tuning later can rotate keys)
  const palette = services.labelPalette(); // palette[deg-1] = the degree's label (1̂, 2̂, … or do, re, …)
  const degLabel = (d) => palette[d - 1] || String(d);

  let stageIdx = 0, waveNum = 0, score = 0, combo = 0, bestCombo = 0;
  let running = false, destroyed = false;
  let timers = [];
  let active = null; // the currently-sounding note: { degree, isTarget, tapped }
  let waveTargets = 0, waveHits = 0, waveFalse = 0, waveMiss = 0;

  const clearTimers = () => { timers.forEach((t) => clearTimeout(t)); timers = []; };

  // ---- DOM ----
  host.innerHTML = '';
  host.classList.add('melodic-arcade');
  const head = el('div', 'melodic-arcade__head');
  const title = el('div', 'melodic-arcade__title'); head.appendChild(title);
  const pips = el('div', 'melodic-arcade__pips'); head.appendChild(pips);
  host.appendChild(head);

  const scoreRow = el('div', 'melodic-arcade__scorerow');
  const scoreEl = el('div', 'melodic-arcade__score');
  const comboEl = el('div', 'melodic-arcade__combo');
  scoreRow.append(scoreEl, comboEl);
  host.appendChild(scoreRow);

  const stage = el('div', 'melodic-arcade__stage');       // the "mole" pulse area
  const pulse = el('div', 'melodic-arcade__pulse'); stage.appendChild(pulse);
  const status = el('div', 'melodic-arcade__status'); stage.appendChild(status);
  host.appendChild(stage);

  const pad = el('div', 'melodic-arcade__pad');           // the degree buttons
  host.appendChild(pad);

  const actions = el('div', 'melodic-arcade__actions');
  const goBtn = document.createElement('button'); goBtn.className = 'melodic-btn melodic-btn--play melodic-arcade__go';
  goBtn.textContent = 'Start';
  goBtn.onclick = () => startWave();
  const backBtn = document.createElement('button'); backBtn.className = 'melodic-btn'; backBtn.textContent = 'Back';
  backBtn.onclick = () => { if (onExit) onExit(); };
  actions.append(goBtn, backBtn);
  host.appendChild(actions);

  renderStageChrome();
  renderScore();
  setStatus('Listen for ' + targetPhrase() + ', then tap it.');

  // ---- helpers ----
  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function setStatus(t) { status.textContent = t; }
  function targetPhrase() {
    const ts = ARCADE_STAGES[stageIdx].targets;
    return ts.map(degLabel).join(ts.length === 2 ? ' or ' : ' · ');
  }
  function renderStageChrome() {
    title.textContent = 'Ear Arcade — ' + ARCADE_STAGES[stageIdx].name;
    pips.innerHTML = '';
    ARCADE_STAGES.forEach((_, i) => {
      const d = el('span', 'melodic-arcade__pip' + (i < stageIdx ? ' is-done' : i === stageIdx ? ' is-active' : ''));
      pips.appendChild(d);
    });
    // buttons for this stage's target degrees
    pad.innerHTML = '';
    ARCADE_STAGES[stageIdx].targets.forEach((deg) => {
      const b = document.createElement('button');
      b.className = 'melodic-btn melodic-arcade__key'; b.dataset.deg = String(deg);
      b.textContent = degLabel(deg);
      b.onclick = () => onTap(deg);
      pad.appendChild(b);
    });
  }
  function renderScore() {
    scoreEl.textContent = score.toLocaleString() + ' pts';
    comboEl.textContent = combo > 1 ? '×' + combo + ' combo' : '';
    comboEl.classList.toggle('is-hot', combo >= 4);
  }
  function flash(deg, cls) {
    const b = pad.querySelector('.melodic-arcade__key[data-deg="' + deg + '"]');
    if (!b) return;
    b.classList.remove('is-hit', 'is-false'); void b.offsetWidth; b.classList.add(cls);
    setTimeout(() => { if (!destroyed) b.classList.remove(cls); }, 300);
  }
  function popPulse() {
    pulse.classList.remove('is-on'); void pulse.offsetWidth; pulse.classList.add('is-on');
  }

  // ---- gameplay ----
  function degreePool(stg) {
    const nonPool = (Math.max(...stg.targets) <= 5 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7])
      .filter((d) => !stg.targets.includes(d));
    // ~55% targets so there's plenty to catch, but real distractors to reject.
    return [...stg.targets, ...stg.targets, ...nonPool];
  }
  function stepMs() {
    // ramps a touch faster as stages and waves build (reaction pressure = the "game").
    const base = T && T.fastArcade ? 90 : 950;
    return Math.max(T && T.fastArcade ? 90 : 520, base - stageIdx * 26 - waveNum * 18);
  }
  function startWave() {
    if (running || destroyed) return;
    running = true; goBtn.disabled = true; goBtn.textContent = 'Listen…';
    waveTargets = waveHits = waveFalse = waveMiss = 0; active = null;
    const stg = ARCADE_STAGES[stageIdx], pool = degreePool(stg), step = stepMs();
    // brief tonic reference so the ear is oriented, then the stream.
    services.playNote(tonic, 0.5);
    for (let i = 0; i < WAVE_LEN; i++) {
      timers.push(setTimeout(() => streamNote(pool, stg), 700 + i * step));
    }
    timers.push(setTimeout(() => endWave(), 700 + WAVE_LEN * step + 700));
  }
  function finalizeActive() {
    if (active && active.isTarget && !active.tapped) { waveMiss++; combo = 0; renderScore(); }
    active = null;
  }
  function streamNote(pool, stg) {
    if (destroyed) return;
    finalizeActive();
    const deg = pool[Math.floor(Math.random() * pool.length)];
    const isTarget = stg.targets.includes(deg);
    if (isTarget) waveTargets++;
    active = { degree: deg, isTarget, tapped: false };
    services.playNote(tonic + MAJOR_SEMIS[deg], 0.5);
    popPulse();
  }
  function onTap(deg) {
    if (!running || destroyed) return;
    if (active && active.isTarget && active.degree === deg && !active.tapped) {
      active.tapped = true; waveHits++; combo++; bestCombo = Math.max(bestCombo, combo);
      score += 10 + (combo - 1) * 3; flash(deg, 'is-hit'); renderScore();
    } else {
      waveFalse++; combo = 0; flash(deg, 'is-false'); renderScore();
    }
  }
  function endWave() {
    if (destroyed) return;
    finalizeActive(); running = false; clearTimers();
    const acc = waveTargets ? waveHits / waveTargets : 1;
    const clean = acc >= 0.8 && waveFalse <= 2;
    waveNum++;
    if (T) T.arcade = { stageIdx, waveHits, waveTargets, waveFalse, waveMiss, clean, score };
    if (clean && stageIdx < ARCADE_STAGES.length - 1) {
      stageIdx++; waveNum = 0; renderStageChrome();
      setStatus('Nice — ' + waveHits + '/' + waveTargets + ' caught! New round: ' + targetPhrase() + '.');
    } else if (clean) {
      setStatus('Cleared the whole scale — ' + waveHits + '/' + waveTargets + '! Keep your combo going.');
    } else {
      setStatus(waveHits + '/' + waveTargets + ' caught' + (waveFalse ? ' · ' + waveFalse + ' wrong taps' : '') + '. Tap Start to try again.');
    }
    goBtn.disabled = false; goBtn.textContent = 'Start';
  }

  return {
    destroy() {
      destroyed = true; running = false; clearTimers();
      if (services.stopAudio) services.stopAudio();
      host.classList.remove('melodic-arcade'); host.innerHTML = '';
    },
  };
}
