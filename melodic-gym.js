/**
 * @file melodic-gym.js
 * @module melodic-gym
 *
 * INTERVAL GYM shell (INTERVAL_GYM_SPEC.md §6): circuit board, station chips,
 * station mounting, and gym persistence. App-layer; owns the `melodic-gym-v1`
 * save (deliberately separate from the ladder's save). The host page provides
 * a container plus the services/label plumbing; stations are standard renderers.
 */

import { GYM_CIRCUITS, gymCircuitsFor, gymPairItem, gymFindStream, gymUseRound } from './core/gym.js';
import { tonicMidiFor } from './core/melodic.js';
import * as mastery from './core/mastery.js';
import {
  createGymFeelRenderer, createGymNameRenderer,
  createGymFindRenderer, createGymUseRenderer, createGymSingRenderer,
} from './melodic-renderers.js';

const GYM_KEY = 'melodic-gym-v1';

export function loadGym() {
  let g = null;
  try { g = JSON.parse(localStorage.getItem(GYM_KEY) || 'null'); } catch (e) { g = null; }
  if (!g || typeof g !== 'object') g = {};
  if (!g.items || typeof g.items !== 'object') g.items = {};
  if (!Array.isArray(g.circuitsCompleted)) g.circuitsCompleted = [];
  if (g.micConsent !== true && g.micConsent !== false) g.micConsent = null;
  g.version = 1;
  return g;
}
export function saveGym(g) { try { localStorage.setItem(GYM_KEY, JSON.stringify(g)); } catch (e) {} }

const STATION_LABELS = { feel: 'FEEL', find: 'FIND', name: 'NAME', sing: 'SING', use: 'USE' };
// G-phase availability: stations ship across G1-G3 (INTERVAL_GYM_SPEC §8).
const STATION_BUILT = { feel: true, name: true, find: true, use: true, sing: true };
const PROFICIENT = 80;

const STATION_RENDERER = {
  feel: createGymFeelRenderer, name: createGymNameRenderer,
  find: createGymFindRenderer, use: createGymUseRenderer, sing: createGymSingRenderer,
};
const STATION_CLASSES = ['melodic-gym-feel', 'melodic-gym-name', 'melodic-gym-find', 'melodic-gym-sing', 'melodic-missing-note'];
function clearStationClasses(el) { STATION_CLASSES.forEach((c) => el.classList.remove(c)); }
function circuitById(id) { return GYM_CIRCUITS.find((c) => c.id === id); }

const CIRCUIT_NOUN = {
  '3rd': '3rd', '4th5th': '4th or 5th', '6th8ve': '6th or octave',
  '2nd': '2nd', '7th': '7th', tritone: 'tritone',
};

/** Circuits unlocked at a ladder position, as ids (for dailies/review targeting). */
export function unlockedCircuitIds(mIndex) {
  return gymCircuitsFor(mIndex).filter((x) => x.unlocked).map((x) => x.circuit.id);
}

/**
 * Build the renderer ctx + round material for ONE station (core/gym.js is the
 * single source of round truth). Module-scope + parameterized so the board,
 * the capstone chain, the spaced-review probe, and the daily challenge can all
 * mount stations identically.
 * @param {Object} o {circuit, stationId, services, key, mode, seed?, itemCount?,
 *                    capstone?, micConsent, onMicConsent, onResult}
 */
function buildStationCtx(o) {
  const { circuit, stationId } = o;
  const itemCount = o.itemCount || 6;
  const seedBase = Number.isFinite(o.seed) ? o.seed : Math.floor(Math.random() * 1e6);
  const items = (stationId === 'feel' || stationId === 'name' || stationId === 'sing')
    ? Array.from({ length: itemCount }, (_, i) => ({
        ...gymPairItem({ circuitId: circuit.id, key: o.key, mode: o.mode, seed: seedBase + i * 7919 }),
        seed: seedBase + i,
      }))
    : [];
  const gymStream = stationId === 'find'
    ? gymFindStream({ circuitId: circuit.id, key: o.key, mode: o.mode, seed: seedBase, minTargets: 2 })
    : null;
  const gymUse = stationId === 'use'
    ? gymUseRound({ circuitId: circuit.id, key: o.key, mode: o.mode, seed: seedBase })
    : null;
  if (window.__mqTest) window.__mqTest.lastGymStation = { circuitId: circuit.id, stationId, items, gymStream, gymUse, capstone: !!o.capstone };
  return {
    services: o.services,
    gymItems: items,
    gymStream,
    gymUse,
    capstone: !!o.capstone,
    circuitLabel: circuit.label,
    micConsent: o.micConsent,
    onMicConsent: o.onMicConsent,
    circuitNoun: CIRCUIT_NOUN[circuit.id] || circuit.label,
    practice: false,
    key: o.key,
    mode: o.mode,
    tonicMidi: tonicMidiFor(o.key, 4),
    degreeChoices(it) {
      const seen = new Set();
      const optsOut = [];
      const push = (pair) => {
        const v = pair.join('-');
        if (seen.has(v)) return;
        seen.add(v);
        optsOut.push({ value: v, label: pair[0] + '̂ to ' + pair[1] + '̂' });
      };
      push(it.degreePair);
      items.forEach((other) => push(other.degreePair));
      return optsOut.slice(0, 4).sort((a, b) => a.value.localeCompare(b.value));
    },
    qualityChoices(it) {
      const all = new Set(items.map((x) => x.intervalLabel));
      all.add(it.intervalLabel);
      return [...all].sort();
    },
    onResult: o.onResult,
  };
}

/**
 * Mount ONE gym station standalone (spaced-review probe §2 + daily challenge §6).
 * Records the round into the station's `melodic-gym-v1` mastery item (unless
 * recordMastery:false) and calls opts.onResult(result) exactly once.
 * @param {HTMLElement} host
 * @param {Object} opts {circuitId, stationId, services, key, mode, seed?, onResult, recordMastery?}
 */
export function mountGymStation(host, opts) {
  const gym = loadGym();
  const circuit = circuitById(opts.circuitId);
  host.classList.add('melodic-gym');
  clearStationClasses(host);
  const ctx = buildStationCtx({
    circuit, stationId: opts.stationId, services: opts.services, key: opts.key, mode: opts.mode,
    seed: opts.seed, itemCount: opts.itemCount || 6, capstone: false,
    micConsent: gym.micConsent,
    onMicConsent(v) { gym.micConsent = v; saveGym(gym); },
    onResult(result) {
      if (opts.recordMastery !== false) {
        const id = opts.circuitId + ':' + opts.stationId;
        gym.items[id] = mastery.recordAnswer(
          gym.items[id] || mastery.createItemState(), !!result.correct,
          { now: Date.now(), sessionStart: Date.now() },
        );
        saveGym(gym);
      }
      if (opts.onResult) opts.onResult(result);
    },
  });
  const inner = STATION_RENDERER[opts.stationId](host, ctx);
  return { destroy() { inner.destroy(); host.innerHTML = ''; host.classList.remove('melodic-gym'); clearStationClasses(host); } };
}

/**
 * Mount the full Gym UI (circuit board) into `host`.
 * @param {HTMLElement} host
 * @param {Object} deps { mIndex, services, key, mode,
 *   onStationStart(), onStationResult(circuitId, stationId, result),
 *   onCircuitComplete(circuitId, capstoneScore), onExit() }
 * @returns {{destroy():void}}
 */
export function mountGym(host, deps) {
  const gym = loadGym();
  let inner = null;
  host.innerHTML = '';
  host.classList.add('melodic-gym');

  function itemBand(circuitId, stationId) {
    const item = gym.items[circuitId + ':' + stationId];
    if (!item) return 'new';
    return mastery.levelFor(mastery.viewItemAsOf(item, Date.now()));
  }
  function stationProficient(circuitId, stationId) {
    const item = gym.items[circuitId + ':' + stationId];
    return !!item && mastery.viewItemAsOf(item, Date.now()).score >= PROFICIENT;
  }
  function circuitReadyForCapstone(circuit) {
    return !gym.circuitsCompleted.includes(circuit.id)
      && circuit.stations.every((st) => STATION_BUILT[st] && stationProficient(circuit.id, st));
  }

  function circuitBoard() {
    if (inner) { inner.destroy(); inner = null; }
    host.innerHTML = '';
    const heading = document.createElement('div');
    heading.className = 'melodic-gym__heading melodic-notation-entry__heading';
    heading.textContent = 'Interval Gym — pick a circuit';
    host.appendChild(heading);
    const board = document.createElement('div');
    board.className = 'melodic-gym__board';
    host.appendChild(board);
    gymCircuitsFor(deps.mIndex).forEach(({ circuit, unlocked }) => {
      const card = document.createElement('button');
      card.className = 'melodic-btn melodic-gym__circuit' + (unlocked ? '' : ' is-locked');
      card.disabled = !unlocked;
      const done = gym.circuitsCompleted.includes(circuit.id);
      card.innerHTML = '<strong>' + circuit.label + (done ? ' — complete' : '') + '</strong>' +
        '<span>' + (unlocked
          ? circuit.stations.map((st) => STATION_LABELS[st] + ' ' + itemBand(circuit.id, st)).join(' · ')
          : 'Unlocks at ' + circuit.unlockLevel.toUpperCase()) + '</span>';
      if (unlocked) card.onclick = () => circuitScreen(circuit);
      board.appendChild(card);
    });
    const exit = document.createElement('button');
    exit.className = 'melodic-btn';
    exit.textContent = 'Back to the ladder';
    exit.onclick = deps.onExit;
    host.appendChild(exit);
  }

  function circuitScreen(circuit) {
    if (inner) { inner.destroy(); inner = null; }
    host.innerHTML = '';
    const heading = document.createElement('div');
    heading.className = 'melodic-gym__heading melodic-notation-entry__heading';
    heading.textContent = 'Circuit: ' + circuit.label;
    host.appendChild(heading);

    const chips = document.createElement('div');
    chips.className = 'melodic-gym__chips';
    host.appendChild(chips);
    const capstoneHost = document.createElement('div');
    host.appendChild(capstoneHost);
    const stationHost = document.createElement('div');
    host.appendChild(stationHost);
    const back = document.createElement('button');
    back.className = 'melodic-btn';
    back.textContent = 'All circuits';
    back.onclick = circuitBoard;
    host.appendChild(back);

    const refreshChips = () => {
      chips.innerHTML = '';
      circuit.stations.forEach((stationId) => {
        const chip = document.createElement('button');
        chip.className = 'melodic-btn melodic-gym__chip';
        chip.textContent = STATION_LABELS[stationId] + ' · ' + itemBand(circuit.id, stationId);
        chip.disabled = !STATION_BUILT[stationId];
        if (!STATION_BUILT[stationId]) chip.title = 'Coming in the next build phase';
        chip.onclick = () => mountStation(circuit, stationId, stationHost, refreshChips);
        chips.appendChild(chip);
      });
      capstoneHost.innerHTML = '';
      if (gym.circuitsCompleted.includes(circuit.id)) {
        const done = document.createElement('div');
        done.className = 'melodic-gym__capstone-done melodic-tonic-contour__status is-correct';
        done.append(deps.services.icon('check'), document.createTextNode(' Circuit complete'));
        capstoneHost.appendChild(done);
      } else if (circuitReadyForCapstone(circuit)) {
        const cap = document.createElement('button');
        cap.className = 'melodic-btn melodic-btn--primary melodic-gym__capstone';
        cap.textContent = 'CIRCUIT CAPSTONE — one clean mixed round to complete';
        cap.onclick = () => runCapstone(circuit, stationHost, refreshChips);
        capstoneHost.appendChild(cap);
      }
    };
    refreshChips();

    const first = circuit.stations.find((st) => STATION_BUILT[st]);
    if (first) mountStation(circuit, first, stationHost, refreshChips);
  }

  function mountStation(circuit, stationId, stationHost, refreshChips) {
    if (inner) { inner.destroy(); inner = null; }
    clearStationClasses(stationHost);
    if (deps.onStationStart) deps.onStationStart();
    const ctx = buildStationCtx({
      circuit, stationId, services: deps.services, key: deps.key, mode: deps.mode,
      itemCount: 6, capstone: false,
      micConsent: gym.micConsent,
      onMicConsent(v) { gym.micConsent = v; saveGym(gym); },
      onResult(result) {
        const id = circuit.id + ':' + stationId;
        gym.items[id] = mastery.recordAnswer(
          gym.items[id] || mastery.createItemState(), !!result.correct,
          { now: Date.now(), sessionStart: Date.now() },
        );
        saveGym(gym);
        if (refreshChips) refreshChips();
        deps.onStationResult(circuit.id, stationId, result);
      },
    });
    inner = STATION_RENDERER[stationId](stationHost, ctx);
  }

  // CAPSTONE (INTERVAL_GYM_SPEC §6): a mixed round — 2 items from EACH station,
  // fresh seeds — passed CLEAN in one sitting. FEEL/NAME/SING run 2 items in one
  // round; the FIND stream carries ≥2 target detections (its "2 items"); USE runs
  // TWO missing-note rounds. Any not-clean station aborts (retry). All clean ->
  // complete + mastery-event rewards (the host game applies the standard economy
  // formula to the accumulated capstone score).
  function runCapstone(circuit, stationHost, refreshChips) {
    if (deps.onStationStart) deps.onStationStart();
    const steps = circuit.stations
      .filter((st) => STATION_BUILT[st])
      .flatMap((st) => (st === 'use' ? ['use', 'use'] : [st]));
    let i = 0;
    let capstoneScore = 0;
    function step() {
      if (inner) { inner.destroy(); inner = null; }
      if (i >= steps.length) {
        gym.circuitsCompleted.push(circuit.id);
        saveGym(gym);
        if (deps.onCircuitComplete) deps.onCircuitComplete(circuit.id, capstoneScore);
        refreshChips();
        stationHost.innerHTML = '';
        return;
      }
      const stationId = steps[i];
      stationHost.innerHTML = '';
      clearStationClasses(stationHost);
      const label = document.createElement('div');
      label.className = 'melodic-tonic-contour__howto';
      label.textContent = 'Capstone ' + (i + 1) + ' of ' + steps.length + ' — ' + STATION_LABELS[stationId] + ' (clean to continue)';
      stationHost.appendChild(label);
      const holder = document.createElement('div');
      stationHost.appendChild(holder);
      const ctx = buildStationCtx({
        circuit, stationId, services: deps.services, key: deps.key, mode: deps.mode,
        itemCount: 2, capstone: true,
        micConsent: gym.micConsent,
        onMicConsent(v) { gym.micConsent = v; saveGym(gym); },
        onResult(result) {
          if (result.correct && result.clean !== false) {
            capstoneScore += 100; // one clean station step (feeds the gem/score formula)
            i++;
            step();
          } else {
            if (inner) { inner.destroy(); inner = null; }
            stationHost.innerHTML = '';
            const msg = document.createElement('div');
            msg.className = 'melodic-tonic-contour__status is-wrong';
            msg.textContent = 'Capstone missed at ' + STATION_LABELS[stationId] + ' — every station must be clean. Try again when ready.';
            stationHost.appendChild(msg);
            const retry = deps.services.button('Retry capstone', 'primary');
            retry.onclick = () => runCapstone(circuit, stationHost, refreshChips);
            stationHost.appendChild(retry);
          }
        },
      });
      inner = STATION_RENDERER[stationId](holder, ctx);
    }
    step();
  }

  circuitBoard();
  return {
    destroy() { if (inner) inner.destroy(); host.innerHTML = ''; },
  };
}
