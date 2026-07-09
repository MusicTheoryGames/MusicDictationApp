/**
 * @file singquest-renderers.js
 * @module singquest-renderers
 *
 * SingQuest Phase 0 renderers — the REBUILT "first lesson" (owner rejected the
 * previous bare microtuner; see SIGHT_SINGING_BUILD_PLAN.md §2 teaching spine,
 * §3 gamification, and the three mockups singquest-{mockup,coarse,adult}.html).
 *
 * NON-NEGOTIABLES enforced here:
 *   - COARSE feedback ONLY. The single judgment shown is one of three states
 *     ('matched' | 'close' | 'way-off') via core/singquest.js coarseVerdict().
 *     There is NO needle, NO target-zone gauge, NO cents number, NO numeric
 *     pitch readout anywhere. `coarseVerdict()` never returns cents; this module
 *     never renders a digit-bearing pitch value.
 *   - OFF THE STAFF. No music notation — pure hear-and-sing-back.
 *   - TEACH-THEN-DO every exercise: a three-step guide Listen -> Sing-with-me ->
 *     Your turn. "Sing-with-me" SUSTAINS the target tone WITH the student (unison
 *     guide) before they solo. A "way off" runs coaching (replay -> sing-with-me
 *     -> return-to-home), never a bare fail.
 *   - House style: no emoji (currentColor SVG via services.icon only), one accent
 *     CTA per screen, every color per-theme (colors live in the host page CSS —
 *     this module only emits class names + coarse-state classes).
 *
 * Reuse rules honoured (project memory: reuse verified code, do NOT re-derive):
 *   - pitch math: core/pitch.js detectPitch / medianPitch (NOT edited here).
 *   - grading:    core/singquest.js gradeForLevel / bandsForLevel / coarseVerdict.
 *   - mic + audio: services.captureSungFrames / releaseMic / playNote / playCadence
 *                  / stopAudio / button / icon (from melodic-shell-services.js),
 *                  passed in verbatim by the host page.
 *
 * Truth seam window.__sqTest.lastSingRound is preserved so headless fake-media
 * drivers can assert capture -> detect -> coarse-grade -> coach without a mic.
 */

import { detectPitch, medianPitch } from './core/pitch.js';
import {
  bandsForLevel, coarseVerdict, coarsePhrase, HINT_RUNGS, nextHintRung, buildVoiceRange,
} from './core/singquest.js';

/* --------------------------------------------------------------------------
 * Test seam. Headless drivers read window.__sqTest.lastSingRound to assert the
 * full capture->detect->coarse-grade->coach path. We only ever WRITE it.
 * ------------------------------------------------------------------------ */
function publishRound(round) {
  if (typeof window !== 'undefined' && window.__sqTest) {
    window.__sqTest.lastSingRound = round;
  }
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
}

/* Re-export so hosts/tests can pull the pure coarse helpers without a 2nd import. */
export { HINT_RUNGS };

/* ==========================================================================
 * The three-step teach-then-do guide (Listen -> Sing-with-me -> Your turn).
 * Rendered as a labelled step rail; the host CSS themes it (.sq-step.on/.done).
 * ======================================================================== */
const STEPS = Object.freeze([
  { id: 'listen', label: 'Listen' },
  { id: 'with-me', label: 'Sing with me' },
  { id: 'your-turn', label: 'Your turn' },
]);

function renderSteps(activeId) {
  const rail = el('div', 'sq-steps');
  const activeIdx = STEPS.findIndex((s) => s.id === activeId);
  STEPS.forEach((s, i) => {
    const done = i < activeIdx;
    const on = i === activeIdx;
    const step = el('div', 'sq-step' + (done ? ' done' : on ? ' on' : ''));
    const n = el('span', 'sq-step__n');
    if (done) {
      // no emoji: a check via SVG
      n.innerHTML = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L19 6"/></svg>';
    } else {
      n.textContent = String(i + 1);
    }
    step.append(n, document.createTextNode(s.label));
    rail.append(step);
  });
  return rail;
}

/* ==========================================================================
 * createSingLesson — one COARSE teach-then-do sung-note exercise.
 *
 * Drives: consent gate -> Listen -> Sing-with-me (unison guide) -> Your turn
 * (graded, sound-then-sing). The graded attempt is judged ONLY as matched /
 * close / way-off; a "way off" runs the coaching ladder (replay -> sing-with-me
 * -> return-to-home) and lets the student try again — never a bare fail.
 *
 * The host owns the theme skin (colors, the field/lane/ring markup is styled by
 * class); this owns the mic -> detect -> coarse-grade -> coach loop + the seam.
 *
 * @param {HTMLElement} host
 * @param {object} opts
 * @param {object} opts.services           shell services (createServices()).
 * @param {number|string} [opts.level=1]   S-level (for bandsForLevel).
 * @param {number} opts.targetMidi         the note to sing (in the student's octave).
 * @param {number} [opts.tonicMidi]        home (for return-to-home coaching).
 * @param {string} [opts.noteLabel='do']   the solfège/degree label shown in the field.
 * @param {string} [opts.prompt]           the "your turn" instruction.
 * @param {string} [opts.listenPrompt]     the "listen" instruction.
 * @param {boolean|null} [opts.consent=null]  known mic consent (null = ask once).
 * @param {(v:boolean)=>void} [opts.onConsent]
 * @param {(res:object)=>void} [opts.onResult]   called once when the exercise is won.
 * @param {(state:string, dir:(string|null))=>void} [opts.onState]  live coarse-state feedback.
 * @param {number} [opts.captureMs=2600]
 * @returns {{ destroy:Function }}
 */
export function createSingLesson(host, opts) {
  const {
    services, level = 1,
    noteLabel = 'do',
    prompt = 'Your turn — sing the note on your own.',
    listenPrompt = "Here's the note. Have a listen.",
    onConsent = null, onResult = () => {}, onState = () => {}, onShift = null, captureMs = 2600,
  } = opts;
  const bands = bandsForLevel(level);

  // Safety net: even if detection erred, the student is NEVER stuck on an
  // unhittable note. "Too low / Too high for me" shifts the target by ONE step,
  // then by an OCTAVE if tapped again in the same direction. `shift` is a signed
  // semitone offset applied to both the sung target and its home.
  const baseTargetMidi = opts.targetMidi;
  const baseTonicMidi = opts.tonicMidi != null ? opts.tonicMidi : baseTargetMidi;
  let shift = Number.isFinite(opts.initialShift) ? opts.initialShift : 0;
  let lastShiftDir = 0;   // -1 = last nudged down, +1 = up, 0 = none yet
  function targetMidi() { return baseTargetMidi + shift; }
  function tonicMidiVal() { return baseTonicMidi + shift; }

  let consent = opts.consent != null ? opts.consent : null;
  let destroyed = false, done = false, usedFallback = false;
  let missStreak = 0;          // consecutive way-offs -> hint-ladder escalation
  let attempt = 0;
  let phase = 'listen';        // listen -> with-me -> your-turn

  host.innerHTML = '';
  host.classList.add('sq-lesson');

  // Scaffold: step rail, prompt, subtitle, the coarse FIELD, verdict line, actions.
  const stepsHost = el('div', 'sq-steps-host');
  const promptEl = el('div', 'sq-prompt');
  const subEl = el('div', 'sq-sub');
  const field = el('div', 'sq-field-wrap');   // host CSS draws the ring/buddy/field here
  const verdictEl = el('div', 'sq-verdict');
  const actions = el('div', 'sq-actions');
  // Safety-net shift bar: unobtrusive "Too low / Too high for me" — always
  // present so a student is never stuck on an unhittable note (coarse, no numbers).
  const shiftBar = el('div', 'sq-shiftbar');
  host.append(stepsHost, promptEl, subEl, field, verdictEl, actions, shiftBar);

  /* Shift the target by one step, or by an OCTAVE if tapped AGAIN in the same
     direction (a big correction when detection was an octave out). `dir` = -1
     (too high -> go lower) or +1 (too low -> go higher). Stores the shift and
     notifies the host so it can persist it for this level's future notes. */
  function applyShift(dir) {
    // Second consecutive tap the same way -> jump an octave (minus the semitone
    // already applied) so total travel is a clean octave in that direction.
    const stepAmount = (dir === lastShiftDir) ? (12 - 1) * dir : 1 * dir;
    shift += stepAmount;
    lastShiftDir = dir;
    if (typeof onShift === 'function') { try { onShift(shift); } catch (e) {} }
    // Reflect the new note audibly and reset the current attempt gently.
    try { services.stopAudio(); } catch (e) {}
    setCoach(dir > 0 ? "Bumped it up — try this one." : "Brought it down — try this one.");
    services.playNote(targetMidi(), 1.4);
  }

  function renderShiftBar() {
    shiftBar.innerHTML = '';
    const low = services.button('Too low for me', 'ghost');
    low.classList.add('sq-shiftbtn');
    low.onclick = () => applyShift(+1);   // too low -> raise the note
    const high = services.button('Too high for me', 'ghost');
    high.classList.add('sq-shiftbtn');
    high.onclick = () => applyShift(-1);  // too high -> lower the note
    shiftBar.append(low, high);
  }

  function needsConsent() { return consent == null && !usedFallback; }

  function setSteps(active) { stepsHost.innerHTML = ''; stepsHost.append(renderSteps(active)); }

  /* The coarse FIELD: a target ring/marker + a "voice" marker whose coarse-state
     class the host themes (buddy in Playful; lock-on ring in Studio/Minimal).
     NO ticks, NO scale, NO numbers — just the note label + a state color. */
  function paintField(state /* 'idle'|'matched'|'close'|'way-off' */) {
    field.className = 'sq-field-wrap is-' + (state || 'idle');
    field.innerHTML =
      '<div class="sq-target"><span class="sq-note">' + escapeText(noteLabel) + '</span></div>' +
      '<div class="sq-voice"></div>' +
      '<div class="sq-burst" aria-hidden="true"></div>';
  }

  function setVerdict(state, dir) {
    if (!state) { verdictEl.textContent = ''; verdictEl.className = 'sq-verdict'; return; }
    verdictEl.className = 'sq-verdict is-' + state;
    verdictEl.textContent = coarsePhrase(state, dir);
  }

  function setCoach(msg) {
    verdictEl.className = 'sq-verdict is-coach';
    verdictEl.textContent = msg;
  }

  function hearButton(label) {
    const b = services.button(label || 'Hear it', 'ghost');
    try { b.prepend(services.icon('play')); } catch (e) {}
    b.onclick = () => services.playNote(targetMidi(), 1.5);
    return b;
  }

  /* ---------------- consent gate ---------------- */
  function renderConsent() {
    setSteps('listen');
    promptEl.textContent = 'Ready to sing?';
    subEl.textContent =
      'SingQuest listens with your microphone to hear your pitch. Nothing is recorded or uploaded — your voice is analysed live in your browser and discarded. Prefer not to? Use the self-check.';
    paintField('idle');
    setVerdict(null);
    shiftBar.innerHTML = '';   // no safety-net control at the consent gate
    actions.innerHTML = '';
    const yes = services.button('Use microphone', 'primary');
    yes.onclick = () => { consent = true; if (onConsent) onConsent(true); renderPhase(); };
    const no = services.button('No mic — self-check', 'ghost');
    no.onclick = () => { consent = false; usedFallback = true; if (onConsent) onConsent(false); renderPhase(); };
    actions.append(no, yes);
  }

  /* ---------------- LISTEN phase ---------------- */
  function renderListen() {
    phase = 'listen';
    setSteps('listen');
    promptEl.textContent = 'Listen to the note';
    subEl.textContent = listenPrompt;
    paintField('idle');
    setVerdict(null);
    renderShiftBar();
    // Play it once automatically so "listen" actually teaches.
    services.playNote(targetMidi(), 1.6);
    actions.innerHTML = '';
    actions.append(hearButton('Hear it again'));
    const next = services.button('Sing with me', 'primary');
    try { next.append(services.icon('play')); } catch (e) {}
    next.onclick = () => renderWithMe();
    actions.append(next);
  }

  /* ---------------- SING-WITH-ME phase (unison guide) ----------------
     The target SUSTAINS while the student sings along. We open a live capture
     UNDER the sustained tone (this is the pedagogical "sing with me" rep, not a
     graded one — graded reps are bleed-safe sound-then-sing in Your Turn). */
  function renderWithMe() {
    if (usedFallback || consent === false) { renderYourTurn(); return; }
    phase = 'with-me';
    setSteps('with-me');
    promptEl.textContent = 'Sing with me';
    subEl.textContent = "I'll hold the note with you — slide your voice onto it.";
    paintField('idle');
    setVerdict(null);
    renderShiftBar();
    actions.innerHTML = '';
    actions.append(hearButton('Hear it'));
    const go = services.button('Sing together', 'primary');
    go.onclick = () => runWithMe(go);
    actions.append(go);
  }

  async function runWithMe(go) {
    if (destroyed || done) return;
    go.disabled = true; go.textContent = 'Singing together…';
    // Sustain the target UNDER the capture (unison guide tone).
    const holdSec = Math.max(2.2, captureMs / 1000 + 0.4);
    services.playNote(targetMidi(), holdSec / 0.5); // playNote takes beats; ~0.5s/beat default
    let best = { state: 'way-off', dir: null };
    try {
      await services.captureSungFrames({
        captureMs, frameMs: 40,
        onFrame: (f, sr) => {
          if (destroyed || done) return;
          const d = detectPitch(f, sr, { minHz: 65, maxHz: 1000, rmsFloor: 0.0016 });
          if (!d) return;
          const cv = coarseVerdict(targetMidi(), d.hz, bands);
          onState(cv.state, cv.dir);
          paintField(cv.state);
          setVerdict(cv.state, cv.dir);
          if (rank(cv.state) >= rank(best.state)) best = cv;
        },
      });
    } catch (e) {
      usedFallback = true; renderYourTurn(); return;
    } finally {
      try { services.stopAudio(); } catch (e) {}
    }
    // Sing-with-me is generous and non-blocking. Guard against a stale completion
    // clobbering a later phase (only act if we're still in with-me).
    if (destroyed || done || phase !== 'with-me') return;
    setCoach(best.state === 'matched'
      ? "Nice — you locked on. Now it's your turn, solo."
      : "Good — you felt the note. Now your turn, solo.");
    // Brief beat so the student reads the coach line, then auto-advance to solo.
    await wait(900);
    if (destroyed || done || phase !== 'with-me') return;
    renderYourTurn();
  }

  /* ---------------- YOUR TURN phase (graded, sound-then-sing) ---------------- */
  function renderYourTurn() {
    phase = 'your-turn';
    setSteps('your-turn');
    promptEl.textContent = missStreak > 0 ? 'Try it again' : 'Your turn';
    subEl.textContent = prompt;
    paintField('idle');
    if (missStreak === 0) setVerdict(null);
    renderShiftBar();
    actions.innerHTML = '';
    if (usedFallback || consent === false) { renderFallback(); return; }
    actions.append(hearButton('Hear it'));
    const rec = services.button('Sing now', 'primary');
    rec.onclick = () => recordGraded(rec);
    actions.append(rec);
    // live meter (I-hear-you) — a bar, NOT a pitch readout
    const meter = el('div', 'sq-meter'); meter.append(document.createElement('span'));
    field.appendChild(meter);
  }

  async function recordGraded(rec) {
    if (destroyed || done) return;
    attempt++;
    rec.disabled = true; rec.textContent = 'Listening…';
    setVerdict(null);
    const bar = field.querySelector('.sq-meter span');

    // Bleed-safe sound-then-sing: sound the note, STOP it, THEN open the capture.
    await services.playNote(targetMidi(), 1.2);
    services.stopAudio();
    let referenceStoppedBeforeCapture = true;
    await wait(160);

    const frames = [];
    let sampleRate = 44100;
    try {
      const cap = await services.captureSungFrames({
        captureMs, frameMs: 40,
        onFrame: (f) => frames.push(f),
        onLevel: (peak) => { if (bar) bar.style.width = Math.min(100, Math.round(peak * 240)) + '%'; },
      });
      sampleRate = cap.sampleRate;
    } catch (e) {
      usedFallback = true; renderYourTurn(); return;
    }

    const med = medianPitch(frames.map((f) => detectPitch(f, sampleRate, { minHz: 65, maxHz: 1000, rmsFloor: 0.0016 })));
    if (!med) {
      // No clear pitch: treat as "listen again" coaching, not a fail.
      missStreak += 1;
      const rung = nextHintRung(missStreak);
      publishGraded(null, { state: 'way-off', dir: null }, referenceStoppedBeforeCapture, rung);
      paintField('idle');
      await runCoaching(rung);
      rec.disabled = false; rec.textContent = 'Sing again';
      if (bar) bar.style.width = '0%';
      return;
    }

    const cv = coarseVerdict(targetMidi(), med.hz, bands);
    paintField(cv.state);
    setVerdict(cv.state, cv.dir);

    if (cv.state === 'matched') {
      const coached = missStreak > 0;
      publishGraded(med, cv, referenceStoppedBeforeCapture, coached ? HINT_RUNGS[5] : null);
      finishWin(cv, coached);
      return;
    }

    // Not matched. 'close' -> encouraging retry (no full ladder yet). 'way-off' ->
    // run the coaching ladder (replay -> sing-with-me -> return-to-home).
    missStreak += 1;
    if (cv.state === 'close') {
      publishGraded(med, cv, referenceStoppedBeforeCapture, HINT_RUNGS[0]);
      setVerdict('close', cv.dir);
      rec.disabled = false; rec.textContent = 'Try again';
      if (bar) bar.style.width = '0%';
      return;
    }
    const rung = nextHintRung(missStreak);
    publishGraded(med, cv, referenceStoppedBeforeCapture, rung);
    await runCoaching(rung);
    rec.disabled = false; rec.textContent = 'Try again';
    if (bar) bar.style.width = '0%';
  }

  /* The coaching moves for a "way off": replay -> sing-with-me -> return-to-home.
     A miss NEVER ends in a bare fail — we actively teach the fix. */
  async function runCoaching(rung) {
    switch (rung.id) {
      case 'direction':
      case 'replay':
        setCoach("Here it is again — listen, then sing.");
        await services.playNote(targetMidi(), 1.5);
        break;
      case 'sing-with-me':
        setCoach("Let's sing it together — I'll hold it with you.");
        // sustain the guide tone so the student can lock on
        services.playNote(targetMidi(), 5);
        await wait(900);
        break;
      case 'break-it-down':
        setCoach("Take a breath, hum it low, then slide up to the note.");
        await services.playNote(targetMidi(), 1.4);
        break;
      case 'return-home':
      default:
        setCoach("Lost it? Sing home first, then come back to the note.");
        await services.playNote(tonicMidiVal(), 1.8);
        await wait(300);
        await services.playNote(targetMidi(), 1.4);
        break;
    }
    try { services.stopAudio(); } catch (e) {}
  }

  /* ---------------- self-check fallback (no mic) ---------------- */
  function renderFallback() {
    phase = 'your-turn';
    setSteps('your-turn');
    promptEl.textContent = 'Your turn';
    subEl.textContent = 'Self-check: sing it out loud, then play the note and judge honestly.';
    paintField('idle');
    setVerdict(null);
    actions.innerHTML = '';
    actions.append(hearButton('Play the note'));
    const judge = el('div', 'sq-actions sq-actions--judge');
    [['matched', 'I matched it'], ['close', 'Close'], ['way-off', 'Missed']].forEach(([state, label]) => {
      const b = services.button(label, 'ghost');
      b.onclick = () => {
        paintField(state);
        setVerdict(state, null);
        publishGraded(null, { state, dir: null, selfGraded: true }, false, null);
        if (state === 'matched') finishWin({ state, dir: null, selfGraded: true }, false, true);
      };
      judge.append(b);
    });
    host.append(judge);
  }

  function finishWin(cv, coached, selfGraded) {
    if (done || destroyed) return;
    done = true;
    try { services.releaseMic(); } catch (e) {}
    shiftBar.innerHTML = '';   // hide the safety-net control on the win
    setVerdict('matched', null);
    onResult({
      pass: true, state: 'matched', coachedFix: !!coached, selfGraded: !!selfGraded,
      attempts: attempt, missStreak, shift,
    });
  }

  function publishGraded(med, cv, referenceStoppedBeforeCapture, rung) {
    publishRound({
      level, targetMidi: targetMidi(), shift,
      medHz: med ? med.hz : null,
      voiced: med && med.voiced ? med.voiced : 0,
      // COARSE only — the seam exposes the three-state verdict, NEVER cents.
      state: cv ? cv.state : null,
      dir: cv ? (cv.dir || null) : null,
      pass: cv ? cv.state === 'matched' : false,
      hintRung: rung ? rung.n : missStreak,
      hintRungId: rung ? rung.id : null,
      soundThenSing: true,
      referenceStoppedBeforeCapture: !!referenceStoppedBeforeCapture,
      selfGraded: cv ? !!cv.selfGraded : false,
      phase,
    });
  }

  function renderPhase() {
    if (destroyed || done) return;
    if (needsConsent()) { renderConsent(); return; }
    renderListen();
  }

  renderPhase();
  return {
    destroy() {
      destroyed = true;
      try { services.releaseMic(); } catch (e) {}
      try { services.stopAudio(); } catch (e) {}
      host.innerHTML = '';
    },
  };
}

function rank(state) { return state === 'matched' ? 2 : state === 'close' ? 1 : 0; }
function escapeText(s) { return String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); }

/* ==========================================================================
 * Find-your-voice probe (§2.4) — a proper 3-POINT vocal-range intake. Framed as
 * "let's find where your voice is comfy," NOT a test. The student sings their
 * LOWEST comfortable note -> a comfortable MIDDLE note -> their HIGHEST
 * comfortable note; we capture each, take the median detected pitch, and build a
 * range tailored to them via buildVoiceRange(). This replaces the fragile
 * single-"match C4" probe, whose ONE octave-detection error (common for low/male
 * voices) gave students target notes they could not sing. Coarse copy only — no
 * cents, no numbers, no score. Any step may be skipped/unclear; buildVoiceRange
 * derives the missing point.
 * ======================================================================== */

/** The three intake points, in order. minHz 55 so LOW notes aren't cut off. */
const PROBE_STEPS = Object.freeze([
  { key: 'lowMidi',  prompt: 'Sing your LOWEST comfortable note — go as low as feels easy (no strain).' },
  { key: 'midMidi',  prompt: 'Now a note that feels right in the middle — relaxed.' },
  { key: 'highMidi', prompt: 'Now your HIGHEST comfortable note — easy, no pushing.' },
]);

/**
 * @param {HTMLElement} host
 * @param {object} opts
 * @param {object} opts.services
 * @param {boolean|null} [opts.consent=null]
 * @param {(v:boolean)=>void} [opts.onConsent]
 * @param {(voice:{lowMidi,highMidi,tonicMidi,tonicOctave,matchedMidi})=>void} opts.onResult
 * @returns {{destroy:Function}}
 */
export function createVoiceProbe(host, opts) {
  const { services, onConsent = null, onResult = () => {} } = opts;
  let consent = opts.consent != null ? opts.consent : null;
  let destroyed = false, done = false, usedFallback = false;
  let stepIdx = 0;                              // which of the 3 intake points
  const readings = { lowMidi: null, midMidi: null, highMidi: null };

  host.innerHTML = '';
  host.classList.add('sq-lesson', 'sq-probe');
  const promptEl = el('div', 'sq-prompt', "Let's find your voice");
  const subEl = el('div', 'sq-sub',
    "No test, no score. We'll find your comfy range in three quick notes — low, middle, high.");
  const field = el('div', 'sq-field-wrap is-idle');
  const verdictEl = el('div', 'sq-verdict');
  const actions = el('div', 'sq-actions');
  host.append(promptEl, subEl, field, verdictEl, actions);

  function paintIdle(labelTxt) {
    field.className = 'sq-field-wrap is-idle';
    field.innerHTML = '<div class="sq-target"><span class="sq-note">' + escapeText(labelTxt || 'voice') + '</span></div><div class="sq-voice"></div>';
  }
  paintIdle('low');

  function needsConsent() { return consent == null && !usedFallback; }

  function publishProbe(voice) {
    if (typeof window !== 'undefined' && window.__sqTest) {
      window.__sqTest.lastProbe = {
        lowMidi: readings.lowMidi, midMidi: readings.midMidi, highMidi: readings.highMidi,
        voice,
      };
    }
  }

  const STEP_LABEL = { lowMidi: 'low', midMidi: 'middle', highMidi: 'high' };

  function render() {
    if (destroyed || done) return;
    if (needsConsent()) { renderConsent(); return; }
    if (usedFallback || consent === false) { renderFallback(); return; }
    renderStep();
  }

  function renderConsent() {
    actions.innerHTML = '';
    verdictEl.textContent = ''; verdictEl.className = 'sq-verdict';
    subEl.textContent =
      "SingQuest listens with your microphone to find your comfy range. Nothing is recorded or uploaded — it's analysed live and discarded. Prefer not to? Skip the mic.";
    const yes = services.button('Use microphone', 'primary');
    yes.onclick = () => { consent = true; if (onConsent) onConsent(true); render(); };
    const no = services.button('Skip — no mic', 'ghost');
    no.onclick = () => { consent = false; usedFallback = true; if (onConsent) onConsent(false); render(); };
    actions.append(no, yes);
  }

  /* ---------------- one intake step (low / middle / high) ---------------- */
  function renderStep() {
    if (stepIdx >= PROBE_STEPS.length) { buildAndFinish(); return; }
    const stepDef = PROBE_STEPS[stepIdx];
    promptEl.textContent = 'Find your voice — note ' + (stepIdx + 1) + ' of 3';
    subEl.textContent = stepDef.prompt;
    paintIdle(STEP_LABEL[stepDef.key]);
    verdictEl.textContent = ''; verdictEl.className = 'sq-verdict';
    actions.innerHTML = '';
    const rec = services.button('Sing', 'primary');
    rec.onclick = () => captureStep(rec, stepDef);
    actions.append(rec);
    const meter = el('div', 'sq-meter'); meter.append(document.createElement('span'));
    field.appendChild(meter);
  }

  async function captureStep(rec, stepDef) {
    if (destroyed || done) return;
    rec.disabled = true; rec.textContent = 'Listening…';
    verdictEl.textContent = ''; verdictEl.className = 'sq-verdict';
    const bar = field.querySelector('.sq-meter span');
    const frames = []; let sampleRate = 44100;
    try {
      const cap = await services.captureSungFrames({
        captureMs: 2200, frameMs: 40,
        onFrame: (f) => frames.push(f),
        onLevel: (peak) => { if (bar) bar.style.width = Math.min(100, Math.round(peak * 240)) + '%'; },
      });
      sampleRate = cap.sampleRate;
    } catch (e) { usedFallback = true; render(); return; }
    // minHz 55 so a genuinely low note isn't cut off as "no tone".
    const med = medianPitch(frames.map((f) => detectPitch(f, sampleRate, { minHz: 55, maxHz: 1000, rmsFloor: 0.0016 })));
    if (bar) bar.style.width = '0%';
    if (!med) {
      // No clear tone: let them RETRY this step (never a hard fail).
      rec.disabled = false; rec.textContent = 'Try again';
      verdictEl.className = 'sq-verdict is-coach';
      verdictEl.textContent = "Didn't catch a clear tone — hum a steady note a little louder.";
      return;
    }
    readings[stepDef.key] = Math.round(hzToMidi(med.hz));
    // Friendly, cents-free confirmation, then advance.
    field.className = 'sq-field-wrap is-matched';
    verdictEl.className = 'sq-verdict is-matched';
    verdictEl.textContent = 'got it';
    stepIdx += 1;
    await wait(700);
    if (destroyed || done) return;
    render();
  }

  /* ---------------- self-check fallback (no mic) ---------------- */
  function renderFallback() {
    promptEl.textContent = "Let's find your voice";
    subEl.textContent = "No mic — we'll start you in a comfortable middle range and you can adjust anytime.";
    paintIdle('voice');
    verdictEl.textContent = ''; verdictEl.className = 'sq-verdict';
    actions.innerHTML = '';
    const cont = services.button('Sounds good', 'primary');
    cont.onclick = () => buildAndFinish();
    actions.append(cont);
  }

  function buildAndFinish() {
    const voice = buildVoiceRange({
      lowMidi: readings.lowMidi, midMidi: readings.midMidi, highMidi: readings.highMidi,
    });
    publishProbe(voice);
    finish(voice);
  }

  function finish(voice) {
    if (done || destroyed) return; done = true;
    try { services.releaseMic(); } catch (e) {}
    field.className = 'sq-field-wrap is-matched';
    verdictEl.className = 'sq-verdict is-matched';
    verdictEl.textContent = 'Found it — that range feels good for your voice.';
    onResult({
      lowMidi: voice.lowMidi, highMidi: voice.highMidi,
      tonicMidi: voice.tonicMidi, tonicOctave: voice.tonicOctave, matchedMidi: voice.matchedMidi,
    });
  }

  render();
  return { destroy() { destroyed = true; try { services.releaseMic(); } catch (e) {} try { services.stopAudio(); } catch (e) {} host.innerHTML = ''; } };
}

/** Local hz->midi (matches core/pitch.js A4=440); used to convert intake tones. */
function hzToMidi(hz) { return 69 + 12 * Math.log2(hz / 440); }

/* ==========================================================================
 * createSingBack — the 2–3 note "sing it back" payoff (§2.5): the first
 * "that was music" moment. Play a short motif, then the student sings it back;
 * each note is coarse-graded (matched/close/way-off), the phrase is a WIN when
 * most notes land. Teach-then-do: Listen (hear the motif) -> Sing-with-me (motif
 * plays UNDER the capture) -> Your turn (sound-then-sing the whole motif).
 * ======================================================================== */

/**
 * @param {HTMLElement} host
 * @param {object} opts
 * @param {object} opts.services
 * @param {number[]} opts.notes        the motif (MIDI), e.g. [do, re, mi].
 * @param {string[]} [opts.labels]     per-note labels shown as chips.
 * @param {number} [opts.tonicMidi]
 * @param {number|string} [opts.level=3]
 * @param {boolean|null} [opts.consent=null]
 * @param {(v:boolean)=>void} [opts.onConsent]
 * @param {(res:object)=>void} [opts.onResult]
 * @returns {{destroy:Function}}
 */
export function createSingBack(host, opts) {
  const {
    services, notes, labels = null, tonicMidi = notes[0], level = 3,
    onConsent = null, onResult = () => {},
  } = opts;
  const bands = bandsForLevel(level);
  let consent = opts.consent != null ? opts.consent : null;
  let destroyed = false, done = false, usedFallback = false, phase = 'listen';

  host.innerHTML = '';
  host.classList.add('sq-lesson', 'sq-singback');
  const stepsHost = el('div', 'sq-steps-host');
  const promptEl = el('div', 'sq-prompt', 'Sing it back');
  const subEl = el('div', 'sq-sub');
  const field = el('div', 'sq-field-wrap is-idle sq-motif');
  const verdictEl = el('div', 'sq-verdict');
  const actions = el('div', 'sq-actions');
  host.append(stepsHost, promptEl, subEl, field, verdictEl, actions);

  function setSteps(a) { stepsHost.innerHTML = ''; stepsHost.append(renderSteps(a)); }
  function needsConsent() { return consent == null && !usedFallback; }

  function paintChips(states /* array or null */) {
    field.innerHTML = '';
    const row = el('div', 'sq-chips');
    notes.forEach((m, i) => {
      const st = states ? states[i] : null;
      const chip = el('div', 'sq-chip' + (st ? ' is-' + st : ''));
      chip.textContent = labels && labels[i] != null ? labels[i] : services.label({ midi: m });
      row.append(chip);
    });
    field.append(row);
  }

  async function playMotif(gapMs = 120) {
    for (const m of notes) { await services.playNote(m, 1); await wait(gapMs); }
  }

  function render() {
    if (destroyed || done) return;
    if (needsConsent()) { renderConsent(); return; }
    renderListen();
  }

  function renderConsent() {
    setSteps('listen');
    subEl.textContent =
      'SingQuest listens with your microphone to hear your little tune. Nothing is recorded or uploaded — analysed live and discarded. Prefer not to? Use the self-check.';
    paintChips(null);
    actions.innerHTML = '';
    const yes = services.button('Use microphone', 'primary');
    yes.onclick = () => { consent = true; if (onConsent) onConsent(true); render(); };
    const no = services.button('No mic — self-check', 'ghost');
    no.onclick = () => { consent = false; usedFallback = true; if (onConsent) onConsent(false); render(); };
    actions.append(no, yes);
  }

  function renderListen() {
    phase = 'listen'; setSteps('listen');
    promptEl.textContent = 'Here comes your first tune';
    subEl.textContent = 'A few notes in a row. Listen to how they go.';
    paintChips(null);
    verdictEl.textContent = ''; verdictEl.className = 'sq-verdict';
    playMotif();
    actions.innerHTML = '';
    const again = services.button('Hear it again', 'ghost');
    try { again.prepend(services.icon('play')); } catch (e) {}
    again.onclick = () => playMotif();
    const next = services.button('Sing with me', 'primary');
    next.onclick = () => renderWithMe();
    actions.append(again, next);
  }

  function renderWithMe() {
    if (usedFallback || consent === false) { renderYourTurn(); return; }
    phase = 'with-me'; setSteps('with-me');
    promptEl.textContent = 'Sing it with me';
    subEl.textContent = "We'll sing the tune together, then you solo.";
    paintChips(null);
    actions.innerHTML = '';
    const go = services.button('Sing together', 'primary');
    go.onclick = async () => {
      go.disabled = true; go.textContent = 'Singing…';
      // motif plays under a capture; non-graded, just felt
      const cap = services.captureSungFrames({ captureMs: notes.length * 900 + 400, frameMs: 40, onFrame: () => {} }).catch(() => {});
      await playMotif(260);
      await cap;
      try { services.stopAudio(); services.releaseMic(); } catch (e) {}
      renderYourTurn();
    };
    actions.append(go);
  }

  function renderYourTurn() {
    phase = 'your-turn'; setSteps('your-turn');
    promptEl.textContent = 'Your turn — sing the tune';
    subEl.textContent = 'Sing the notes in order after the beep.';
    paintChips(null);
    actions.innerHTML = '';
    if (usedFallback || consent === false) { renderFallback(); return; }
    const rec = services.button('Sing now', 'primary');
    rec.onclick = () => recordBack(rec);
    actions.append(rec);
    const meter = el('div', 'sq-meter'); meter.append(document.createElement('span'));
    field.appendChild(meter);
  }

  async function recordBack(rec) {
    if (destroyed || done) return;
    rec.disabled = true; rec.textContent = 'Listening…';
    // sound-then-sing the whole motif (bleed-safe), then one capture window split
    // evenly across the notes (metronome-locked windows, simplified for Phase 0).
    await playMotif(160);
    try { services.stopAudio(); } catch (e) {}
    await wait(160);
    const perNoteMs = 900;
    const total = notes.length * perNoteMs;
    const bar = field.querySelector('.sq-meter span');
    const framesByNote = notes.map(() => []);
    let sampleRate = 44100;
    const t0 = performance.now();
    try {
      const cap = await services.captureSungFrames({
        captureMs: total, frameMs: 40,
        onFrame: (f) => {
          const idx = Math.min(notes.length - 1, Math.floor((performance.now() - t0) / perNoteMs));
          framesByNote[idx].push(f);
        },
        onLevel: (peak) => { if (bar) bar.style.width = Math.min(100, Math.round(peak * 240)) + '%'; },
      });
      sampleRate = cap.sampleRate;
    } catch (e) { usedFallback = true; renderYourTurn(); return; }

    const states = notes.map((m, i) => {
      const med = medianPitch(framesByNote[i].map((f) => detectPitch(f, sampleRate, { minHz: 65, maxHz: 1000, rmsFloor: 0.0016 })));
      if (!med) return 'way-off';
      return coarseVerdict(m, med.hz, bands).state;
    });
    paintChips(states);
    const matched = states.filter((s) => s === 'matched').length;
    const pass = matched >= Math.ceil(notes.length * 0.6);
    if (typeof window !== 'undefined' && window.__sqTest) {
      window.__sqTest.lastSingRound = { level, phrase: true, states, matched, pass, notes: notes.slice() };
    }
    if (pass) {
      verdictEl.className = 'sq-verdict is-matched';
      verdictEl.textContent = matched === notes.length ? "you sang the whole tune!" : "that was music — nicely done";
      done = true;
      try { services.releaseMic(); } catch (e) {}
      onResult({ pass: true, states, matched });
    } else {
      verdictEl.className = 'sq-verdict is-coach';
      verdictEl.textContent = "Almost — let's hear it once more, then try again.";
      await playMotif(240);
      try { services.stopAudio(); } catch (e) {}
      rec.disabled = false; rec.textContent = 'Try again';
      if (bar) bar.style.width = '0%';
    }
  }

  function renderFallback() {
    subEl.textContent = 'Self-check: sing the tune, then hear it and judge honestly.';
    const hear = services.button('Play the tune', 'ghost');
    try { hear.prepend(services.icon('play')); } catch (e) {}
    hear.onclick = () => playMotif(240);
    const got = services.button('I sang it', 'primary');
    got.onclick = () => {
      done = true;
      const states = notes.map(() => 'matched');
      paintChips(states);
      verdictEl.className = 'sq-verdict is-matched';
      verdictEl.textContent = 'that was music — nicely done';
      if (typeof window !== 'undefined' && window.__sqTest) window.__sqTest.lastSingRound = { level, phrase: true, states, matched: notes.length, pass: true, selfGraded: true, notes: notes.slice() };
      onResult({ pass: true, states, matched: notes.length, selfGraded: true });
    };
    actions.append(hear, got);
  }

  render();
  return { destroy() { destroyed = true; try { services.releaseMic(); } catch (e) {} try { services.stopAudio(); } catch (e) {} host.innerHTML = ''; } };
}
