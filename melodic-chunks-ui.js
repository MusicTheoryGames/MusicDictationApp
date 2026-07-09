/**
 * @file melodic-chunks-ui.js
 * @module melodic-chunks-ui
 *
 * CHUNK VOCABULARY drill — the third piece of MELODIC_LADDER_EXPANSION_PLAN's
 * first slice (NEW-B). A side-mode (like the Interval Gym), not a ladder rung:
 * play a frequency-common TONAL CELL (scalar run, triad outline, cadence
 * formula) and echo it back on the degree palette. Research basis: expert
 * dictation relies on CHUNKING, not raw memory span (Karpinski/Chenette) — so we
 * drill the recurring vocabulary that makes chunking possible. Cells are
 * INTERLEAVED by kind (interleaving > blocking for music-skill retention).
 *
 * Pure engine (core/chunks.js) + app-layer UI here; own save `melodic-chunks-v1`.
 */

import { chunksForTier, chunkToMidis } from './core/chunks.js';
import { makePlayButton } from './melodic-renderers.js';
import { SCALE_SEMITONES, tonicMidiFor } from './core/melodic.js';
import * as mastery from './core/mastery.js';

const CHUNK_KEY = 'melodic-chunks-v1';
const SESSION_LEN = 6;

function loadChunks() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(CHUNK_KEY) || 'null'); } catch (e) { s = null; }
  if (!s || typeof s !== 'object') s = {};
  if (!s.tiers || typeof s.tiers !== 'object') s.tiers = {}; // tier -> mastery item
  s.version = 1;
  return s;
}
function saveChunks(s) { try { localStorage.setItem(CHUNK_KEY, JSON.stringify(s)); } catch (e) {} }

/** Cap the tier by how far up the ladder the student is (plan: unlocks at M3). */
function tierForMIndex(mIndex) {
  if (mIndex < 5) return 1;
  if (mIndex < 9) return 2;
  if (mIndex < 14) return 3;
  return 4;
}

/** Keep a cell sounding like itself: register each note to the octave nearest the
 *  previous (so a 7̂->1̂ cadence resolves UP, not down an octave). */
function smoothOctaves(midis) {
  const out = [midis[0]];
  for (let i = 1; i < midis.length; i++) {
    let m = midis[i];
    while (m - out[i - 1] > 6) m -= 12;
    while (out[i - 1] - m > 6) m += 12;
    out.push(m);
  }
  return out;
}

/** Deterministic interleave: draw SESSION_LEN cells rotating through kinds so no
 *  two same-kind cells sit adjacent when avoidable. */
function pickSession(pool, seed) {
  const byKind = {};
  pool.forEach((c) => { (byKind[c.kind] = byKind[c.kind] || []).push(c); });
  const kinds = Object.keys(byKind);
  let s = (seed >>> 0) || 1;
  const rng = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  kinds.forEach((k) => byKind[k].sort(() => rng() - 0.5));
  const out = [];
  let ki = 0;
  while (out.length < SESSION_LEN && pool.length) {
    for (let g = 0; g < kinds.length && out.length < SESSION_LEN; g++) {
      const arr = byKind[kinds[(ki + g) % kinds.length]];
      if (arr && arr.length) out.push(arr.shift());
    }
    ki++;
    if (kinds.every((k) => !byKind[k].length)) break;
  }
  // top up if a session is short (small pools) by cycling the original pool
  let pi = 0;
  while (out.length < SESSION_LEN && pool.length) { out.push(pool[pi % pool.length]); pi++; }
  return out.slice(0, SESSION_LEN);
}

/**
 * Mount the chunk drill into `host`.
 * @param {HTMLElement} host
 * @param {Object} deps { services, key, mode, mIndex, onExit }
 * @returns {{destroy():void}}
 */
export function mountChunkDrill(host, deps) {
  const store = loadChunks();
  const { services } = deps;
  const tonicMidi = tonicMidiFor(deps.key, 4);
  const scale = SCALE_SEMITONES[deps.mode] || SCALE_SEMITONES.major;
  const tier = tierForMIndex(deps.mIndex);
  let destroyed = false;

  function itemFor(t) { return store.tiers[t] || (store.tiers[t] = mastery.createItemState()); }

  function runSession() {
    const seed = Math.floor(Math.random() * 1e6);
    const session = pickSession(chunksForTier(tier).slice(), seed);
    let idx = 0, correctCount = 0;

    host.innerHTML = '';
    host.classList.add('melodic-chunks');
    const heading = document.createElement('div');
    heading.className = 'melodic-tonic-contour__heading';
    heading.textContent = 'Pattern drill — hear the shape, echo it back';
    host.appendChild(heading);
    const howTo = document.createElement('div');
    howTo.className = 'melodic-howto';
    howTo.textContent = 'Common melodic patterns, one at a time. Hear the cell as ONE shape, then tap its scale-degrees in order. These are the building blocks your ear reuses in every dictation.';
    host.appendChild(howTo);
    const band = document.createElement('div');
    band.className = 'melodic-hud__coverage';
    band.textContent = 'Tier ' + tier + ' · ' + mastery.levelFor(mastery.viewItemAsOf(itemFor(tier), Date.now()));
    host.appendChild(band);
    const cardHost = document.createElement('div');
    host.appendChild(cardHost);
    const statusEl = document.createElement('div');
    statusEl.className = 'melodic-tonic-contour__status';
    host.appendChild(statusEl);
    const exit = document.createElement('button');
    exit.className = 'melodic-btn';
    exit.textContent = 'Back to the ladder';
    exit.onclick = deps.onExit;
    host.appendChild(exit);

    function renderCell() {
      cardHost.innerHTML = '';
      if (idx >= session.length) { finish(); return; }
      const chunk = session[idx];
      const midis = smoothOctaves(chunkToMidis(chunk, tonicMidi, scale));

      const prog = document.createElement('div');
      prog.className = 'melodic-overlay__sub';
      prog.textContent = 'Pattern ' + (idx + 1) + ' of ' + session.length;
      cardHost.appendChild(prog);

      const playRow = document.createElement('div');
      playRow.className = 'melodic-tonic-contour__choices';
      const playBtn = makePlayButton(services, 'Play pattern'); // icon-only green triangle (no hearing limit here)
      playBtn.onclick = () => {
        let t = 0;
        midis.forEach((m) => { setTimeout(() => { if (!destroyed) services.playNote(m, 0.55); }, t); t += 520; });
      };
      const homeBtn = services.button('HOME', 'choice'); homeBtn.prepend(services.icon('play')); // neutral HOME reference (matches Level 1)
      homeBtn.onclick = () => services.playNote(tonicMidi, 1.6);
      playRow.append(playBtn, homeBtn);
      cardHost.appendChild(playRow);

      const slotRow = document.createElement('div');
      slotRow.className = 'melodic-memory-span__slots';
      const slots = chunk.degrees.map(() => {
        const s = document.createElement('span');
        s.className = 'melodic-memory-span__slot';
        s.textContent = '·';
        slotRow.appendChild(s);
        return s;
      });
      cardHost.appendChild(slotRow);

      const entered = [];
      const palRow = document.createElement('div');
      palRow.className = 'melodic-tonic-contour__choices';
      const palette = services.labelPalette();
      const allowed = [...new Set(chunk.degrees)];
      // Offer the cell's own degrees plus their diatonic neighbours as foils, so
      // it's a real recall, not a 3-button giveaway.
      const offer = [...new Set([...allowed, ...allowed.map((d) => (d % 7) + 1), ...allowed.map((d) => ((d + 5) % 7) + 1)])]
        .filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
      offer.forEach((degree) => {
        const b = services.button(palette[degree - 1], 'choice');
        b.onclick = () => {
          if (destroyed || entered.length >= chunk.degrees.length) return;
          entered.push(degree);
          slots[entered.length - 1].textContent = palette[degree - 1];
          slots[entered.length - 1].classList.add('is-filled');
          if (entered.length === chunk.degrees.length) gradeCell(chunk, entered, slots);
        };
        palRow.appendChild(b);
      });
      const undo = services.button('Undo', 'choice');
      undo.onclick = () => {
        if (!entered.length) return;
        entered.pop();
        slots[entered.length].textContent = '·';
        slots[entered.length].classList.remove('is-filled');
      };
      palRow.appendChild(undo);
      cardHost.appendChild(palRow);
    }

    function gradeCell(chunk, entered, slots) {
      const ok = entered.every((d, i) => d === chunk.degrees[i]);
      slots.forEach((s, i) => s.classList.add(entered[i] === chunk.degrees[i] ? 'is-correct' : 'is-wrong'));
      if (ok) correctCount++;
      statusEl.className = 'melodic-tonic-contour__status ' + (ok ? 'is-correct' : 'is-wrong');
      statusEl.textContent = ok ? 'Yes — ' + chunk.label : 'That one was ' + chunk.label;
      setTimeout(() => { idx++; statusEl.textContent = ''; statusEl.className = 'melodic-tonic-contour__status'; renderCell(); }, 1000);
    }

    function finish() {
      const passed = correctCount >= SESSION_LEN - 1; // 5/6
      store.tiers[tier] = mastery.recordAnswer(itemFor(tier), passed, { now: Date.now(), sessionStart: Date.now() });
      saveChunks(store);
      cardHost.innerHTML = '';
      statusEl.className = 'melodic-tonic-contour__status ' + (passed ? 'is-correct' : 'is-wrong');
      statusEl.textContent = correctCount + ' / ' + session.length + ' patterns — Tier ' + tier + ' now ' +
        mastery.levelFor(mastery.viewItemAsOf(itemFor(tier), Date.now()));
      const again = services.button('Drill again', 'primary');
      again.onclick = runSession;
      cardHost.appendChild(again);
    }

    renderCell();
  }

  runSession();
  return { destroy() { destroyed = true; services.stopAudio(); host.innerHTML = ''; } };
}
