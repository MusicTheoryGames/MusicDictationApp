/**
 * @file melodic-bookend-ui.js
 * @module melodic-bookend-ui
 *
 * BOOKEND ANCHORING drill (MELODIC_LADDER_EXPANSION_PLAN NEW-D). A named expert
 * dictation strategy (Paney & Buonviri 2014): nail the FIRST and LAST notes — the
 * phrase's "bookends", usually tonic-triad tones — then fill inward. This
 * side-mode teaches it as an explicit two-phase drill: Phase 1 places only the
 * two bookends; Phase 2 fills the interior with the bookends now anchored.
 *
 * App-layer UI over the shell services (rhythm line + degree palette). The host
 * game supplies a fresh melody per round (via its own buildRound); this module
 * owns only the drill flow + its light `melodic-bookend-v1` save.
 */

import * as mastery from './core/mastery.js';
import { classifyDictation } from './core/feedback.js';
import { wireHearings } from './melodic-renderers.js';

const BOOKEND_KEY = 'melodic-bookend-v1';

function loadBookend() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(BOOKEND_KEY) || 'null'); } catch (e) { s = null; }
  if (!s || typeof s !== 'object') s = {};
  if (!s.items || typeof s.items !== 'object') s.items = {}; // per-level mastery item
  s.version = 1;
  return s;
}
function saveBookend(s) { try { localStorage.setItem(BOOKEND_KEY, JSON.stringify(s)); } catch (e) {} }

/**
 * Mount the bookend drill.
 * @param {HTMLElement} host
 * @param {Object} deps { levelId, level, services, buildMelody(), onExit() }
 *   buildMelody() -> a fresh generated melody for the current level.
 */
export function mountBookendDrill(host, deps) {
  const store = loadBookend();
  const { services, level } = deps;
  let destroyed = false;

  function itemFor() { return store.items[deps.levelId] || (store.items[deps.levelId] = mastery.createItemState()); }

  function round() {
    const melody = deps.buildMelody();
    const n = melody.notes.length;
    const truthDegrees = melody.notes.map((x) => x.degree);
    const answers = new Array(n).fill(null);
    let phase = 'ends'; // 'ends' -> 'middle' -> 'done'
    let activeSlot = 0;
    let submitted = false;
    let hadMistake = false;

    host.innerHTML = '';
    host.classList.add('melodic-bookend');
    const heading = document.createElement('div');
    heading.className = 'melodic-tonic-contour__heading';
    heading.textContent = 'Bookends — anchor the ends, then fill inward';
    host.appendChild(heading);
    const howTo = document.createElement('div');
    howTo.className = 'melodic-howto';
    howTo.textContent = 'Real transcribers place the FIRST and LAST notes first (usually home or a tonic-triad tone), then work inward. Step 1: the two ends. Step 2: everything between.';
    host.appendChild(howTo);

    const band = document.createElement('div');
    band.className = 'melodic-hud__coverage';
    band.textContent = deps.level.id.toUpperCase().replace('_', '.') + ' · ' + mastery.levelFor(mastery.viewItemAsOf(itemFor(), Date.now()));
    host.appendChild(band);

    // Phase progress as DOTS, not a worded "Step 1/2" pill (matches the game's dot language):
    // ends -> [amber, hollow] · middle -> [green, amber] · done -> [green, green].
    // The two-phase instruction already lives in the how-to above.
    const stepLine = document.createElement('div');
    stepLine.className = 'melodic-motivation__journey';
    host.appendChild(stepLine);
    const STEP_TITLES = ['Ends', 'Middle'];
    function drawSteps() {
      const states = phase === 'ends' ? ['is-active', 'is-upcoming']
        : phase === 'middle' ? ['is-done', 'is-active'] : ['is-done', 'is-done'];
      stepLine.innerHTML = '';
      states.forEach((st, i) => {
        const d = document.createElement('span');
        d.className = 'melodic-motivation__pip ' + st;
        d.title = STEP_TITLES[i];
        d.setAttribute('aria-label', STEP_TITLES[i] + (st === 'is-done' ? ' (done)' : st === 'is-active' ? ' (current)' : ' (upcoming)'));
        stepLine.appendChild(d);
      });
    }

    const playRow = document.createElement('div');
    playRow.className = 'melodic-tonic-contour__choices';
    const playBtn = services.button('Play', 'play'); // icon-only green triangle + pips below (shared helper)
    playRow.appendChild(wireHearings(playBtn, { services, practice: false }, () => services.play(melody)));
    const homeBtn = services.button('HOME', 'choice'); homeBtn.prepend(services.icon('play')); // neutral HOME reference (matches Level 1)
    homeBtn.onclick = () => services.playNote(melody.tonicMidi, 2);
    playRow.appendChild(homeBtn);
    host.appendChild(playRow);

    const staffHost = document.createElement('div');
    staffHost.className = 'melodic-labeling__staff';
    host.appendChild(staffHost);

    const paletteRow = document.createElement('div');
    paletteRow.className = 'melodic-labeling__palette';
    host.appendChild(paletteRow);
    const fullPalette = services.labelPalette();
    const allowed = (level && level.pitch && level.pitch.degrees) || [1, 2, 3, 4, 5, 6, 7];

    const statusEl = document.createElement('div');
    statusEl.className = 'melodic-labeling__status';
    host.appendChild(statusEl);

    const exit = document.createElement('button');
    exit.className = 'melodic-btn';
    exit.textContent = 'Back to the ladder';
    exit.onclick = deps.onExit;
    host.appendChild(exit);

    const isEnd = (i) => i === 0 || i === n - 1;
    const slotActiveInPhase = (i) => (phase === 'ends' ? isEnd(i) : !isEnd(i));

    function nextOpenSlot() {
      for (let i = 0; i < n; i++) if (slotActiveInPhase(i) && answers[i] == null) return i;
      return -1;
    }

    function draw() {
      // Show placed answers; the active slot is highlighted; only phase-relevant
      // notes are clickable to revise.
      services.renderRhythmLine(staffHost, melody, {
        labels: answers.map((a) => a || ''),
        activeIdx: submitted ? -1 : activeSlot,
        onNoteClick: (i) => { if (!submitted && !destroyed && slotActiveInPhase(i)) { activeSlot = i; draw(); } },
      });
      drawSteps();
    }

    function assign(label) {
      if (submitted || destroyed || !slotActiveInPhase(activeSlot)) return;
      if (answers[activeSlot] != null && answers[activeSlot] !== label) hadMistake = true;
      answers[activeSlot] = label;
      const nxt = nextOpenSlot();
      if (nxt !== -1) { activeSlot = nxt; draw(); return; }
      // phase complete
      if (phase === 'ends') { phase = 'middle'; activeSlot = nextOpenSlot(); draw(); checkBtn.disabled = nextOpenSlot() !== -1 ? true : false; }
      draw();
      checkBtn.disabled = answers.some((a) => a == null);
    }

    fullPalette.forEach((label, i) => {
      const degree = i + 1;
      if (!allowed.includes(degree)) return;
      const b = services.button(label, 'choice');
      b.onclick = () => assign(label);
      paletteRow.appendChild(b);
    });

    const checkRow = document.createElement('div');
    checkRow.className = 'melodic-labeling__check-row';
    host.appendChild(checkRow);
    const checkBtn = services.button('Check', 'primary');
    checkBtn.disabled = true;
    checkBtn.onclick = grade;
    checkRow.appendChild(checkBtn);

    function grade() {
      if (submitted || destroyed || answers.some((a) => a == null)) return;
      submitted = true;
      phase = 'done';
      let numCorrect = 0;
      const marks = [];
      melody.notes.forEach((note, i) => {
        const truth = services.label(note);
        const ok = answers[i] === truth;
        if (ok) numCorrect++;
        marks.push(ok ? answers[i] : answers[i] + '->' + truth);
      });
      services.renderRhythmLine(staffHost, melody, { labels: marks });
      const accuracy = Math.round((numCorrect / n) * 100);
      const correct = accuracy === 100;
      statusEl.className = 'melodic-labeling__status ' + (correct ? 'is-correct' : 'is-wrong');
      statusEl.textContent = correct ? 'Both ends and middle — clean!' : numCorrect + ' / ' + n + ' correct — corrections under the notes';
      if (!correct) {
        const dmap = new Map(fullPalette.map((lab, i) => [lab, i + 1]));
        const fb = classifyDictation({ trueDegrees: truthDegrees, answerDegrees: answers.map((a) => (dmap.has(a) ? dmap.get(a) : null)) });
        if (fb.stage !== 'clean') {
          const line = document.createElement('div');
          line.className = 'melodic-feedback';
          line.textContent = 'Work on: ' + fb.headline + '. ' + fb.tip;
          statusEl.appendChild(line);
        }
      }
      store.items[deps.levelId] = mastery.recordAnswer(itemFor(), correct, { now: Date.now(), sessionStart: Date.now() });
      saveBookend(store);
      band.textContent = deps.level.id.toUpperCase().replace('_', '.') + ' · ' + mastery.levelFor(mastery.viewItemAsOf(itemFor(), Date.now()));
      const again = services.button('Drill again', 'primary');
      again.onclick = round;
      checkRow.appendChild(again);
      if (window.__mqTest) window.__mqTest.lastBookend = { truthDegrees, answers: answers.slice(), correct };
    }

    if (window.__mqTest) window.__mqTest.lastBookend = { truthDegrees, answers: answers.slice(), correct: null };
    activeSlot = nextOpenSlot();
    draw();
  }

  round();
  return { destroy() { destroyed = true; services.stopAudio(); host.innerHTML = ''; host.classList.remove('melodic-bookend'); } };
}
