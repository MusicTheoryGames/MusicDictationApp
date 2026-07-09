/**
 * @file melodic-skills-gym.js
 * @module melodic-skills-gym
 *
 * SKILLS GYM (VISION.md §6) — endless, auto-tuning, hands-off reinforcement for the
 * M0/M1 foundation. Leads with "Smart Practice" (auto-picks your weakest skill, interleaves,
 * auto-tunes difficulty); also offers grouped M0/M1 practice. Reuses the LADDER renderers —
 * createTonicContourRenderer dispatches to the right drill by level.layers + stage.
 *
 * RULES (plan §8): the gym REFRESHES retention (updates the level's mastery + satisfies due
 * spaced-reviews) but NEVER advances the ladder. No fail-gate; difficulty floats to the edge.
 * Own save slice — cannot corrupt ladder state.
 */

import { buildRound } from './melodic-round.js';
import { createServices } from './melodic-shell-services.js';
import { createTonicContourRenderer } from './melodic-renderers.js';
import { labelNote, labelPalette } from './core/melodic.js';
import { melodicLevel } from './core/melodic-curriculum.js';
import * as mastery from './core/mastery.js';
import * as review from './core/review.js';

const GYM_KEY = 'melodic-skills-gym-v1';

// A drill = a (ladder level, stage) reachable through createTonicContourRenderer, plus a
// difficulty->params mapper. D is an integer 0..maxD, nudged in the flow zone (§5).
const SKILLS = {
  home:     { levelId: 'm0', group: 'm0', name: 'Find home', maxD: 4 },
  mi:       { levelId: 'm0', group: 'm0', name: 'Find 3̂', maxD: 4 },
  sol:      { levelId: 'm0', group: 'm0', name: 'Find 5̂', maxD: 4 },
  updown:   { levelId: 'm1', group: 'm1', name: 'Up / down', maxD: 2 },
  stepskip: { levelId: 'm1', group: 'm1', name: 'Step / skip', maxD: 2 },
  shape:    { levelId: 'm1', group: 'm1', name: 'Match the shape', maxD: 5 },
};
const GROUP_SKILLS = {
  m0: ['home', 'mi', 'sol'],
  m1: ['updown', 'stepskip', 'shape'],
};

function loadGym() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(GYM_KEY) || 'null'); } catch (e) { s = null; }
  if (!s || typeof s !== 'object') s = {};
  if (typeof s.bestStreak !== 'number') s.bestStreak = 0;
  if (typeof s.sessions !== 'number') s.sessions = 0;
  if (!s.diff || typeof s.diff !== 'object') s.diff = {}; // per-skill difficulty, persisted
  if (!s.ex || typeof s.ex !== 'object') s.ex = {}; // per-exercise rolling stats {n,correct,fast}
  if (!s.mastery || typeof s.mastery !== 'object') s.mastery = {}; // per-skill master-then-retain state
  return s;
}
function saveGym(s) { try { localStorage.setItem(GYM_KEY, JSON.stringify(s)); } catch (e) {} }

const M1_REF_POOL = [55, 57, 58, 60, 62, 63, 65, 67, 69, 70, 72];
const rand = (n) => Math.floor(Math.random() * n);
function refsArr(n) { return Array.from({ length: n }, () => M1_REF_POOL[rand(M1_REF_POOL.length)]); }

/**
 * Mount the Skills Gym.
 * @param {HTMLElement} host
 * @param {Object} deps { S, save, reachedLevelId(id):boolean, onExit }
 */
export function mountSkillsGym(host, deps) {
  const gym = loadGym();
  const { S, save } = deps;
  const reached = (id) => (typeof deps.reachedLevelId === 'function' ? deps.reachedLevelId(id) : true);
  let destroyed = false;
  let current = null; // active drill renderer

  const unlockedGroups = ['m0', 'm1'].filter((g) => reached(g === 'm0' ? 'm0' : 'm1'));
  const unlockedSkills = () => unlockedGroups.flatMap((g) => GROUP_SKILLS[g]);

  function cleanup() { if (current) { try { current.destroy(); } catch (e) {} current = null; } }

  // ---- gym home: just "which level do you want to train?" — one button per level, each
  // AUTO-RUNS all that level's exercises, weighted to your weak spots. No exercise menu. ----
  const GROUP_LABEL = { m0: 'Home & degrees', m1: 'Contour (up/down · shapes)' };
  function renderHome() {
    cleanup();
    host.innerHTML = '';
    host.classList.add('melodic-skillsgym');
    const h = document.createElement('div');
    h.className = 'melodic-tonic-contour__heading';
    h.textContent = 'Skills Gym';
    host.appendChild(h);
    const sub = document.createElement('div');
    sub.className = 'melodic-tonic-contour__howto';
    sub.textContent = 'Pick a level to train — the gym runs its exercises for you and gives you more of whatever you find hard. Best streak: ' + gym.bestStreak + '.';
    host.appendChild(sub);

    // A menu of level choices is NOT "one primary action" — keep them neutral so no wall
    // of competing accent CTAs (one-accent-per-screen). The accent is earned by the single
    // action that commits, not by a list of options.
    unlockedGroups.forEach((g) => {
      const b = document.createElement('button');
      b.className = 'melodic-btn melodic-skillsgym__level';
      b.textContent = GROUP_LABEL[g] || ('Train ' + g.toUpperCase());
      b.onclick = () => startSession(g);
      host.appendChild(b);
    });

    // Free play (opt-in): pick ONE exercise and drill it as much as you want — no steering.
    const free = document.createElement('button');
    free.className = 'melodic-btn melodic-skillsgym__free';
    free.textContent = 'Free play — pick one to drill';
    free.onclick = renderFreePlay;
    host.appendChild(free);

    const exit = document.createElement('button');
    exit.className = 'melodic-btn';
    exit.textContent = 'Back to the ladder';
    exit.onclick = () => { if (deps.onExit) deps.onExit(); };
    host.appendChild(exit);
  }

  // ---- free-play picker: one tile per unlocked exercise (only shown on demand) ----
  function renderFreePlay() {
    cleanup();
    host.innerHTML = '';
    const h = document.createElement('div');
    h.className = 'melodic-tonic-contour__heading';
    h.textContent = 'Free play — drill one exercise';
    host.appendChild(h);
    const sub = document.createElement('div');
    sub.className = 'melodic-tonic-contour__howto';
    sub.textContent = 'Pick exactly what you want to practise. It repeats until you stop.';
    host.appendChild(sub);
    const grid = document.createElement('div');
    grid.className = 'melodic-tonic-contour__choices melodic-skillsgym__freegrid';
    unlockedSkills().forEach((sk) => {
      const b = document.createElement('button');
      b.className = 'melodic-btn';
      b.textContent = SKILLS[sk].name;
      b.onclick = () => startSession({ single: sk });
      grid.appendChild(b);
    });
    host.appendChild(grid);
    const back = document.createElement('button');
    back.className = 'melodic-btn';
    back.textContent = 'Back';
    back.onclick = renderHome;
    host.appendChild(back);
  }

  // ---- difficulty (auto-tune, flow zone) ----
  function diffOf(skill) { const d = gym.diff[skill]; return Number.isInteger(d) ? d : 1; }
  function tune(skill, correct, clean, fast) {
    let d = diffOf(skill);
    const win = (session.recent[skill] = session.recent[skill] || []);
    win.push(correct && clean ? (fast ? 2 : 1) : 0);
    if (win.length > 4) win.shift();
    const sum = win.reduce((a, b) => a + b, 0);
    if (win.length >= 3 && sum >= win.length * 2 - 1) d = Math.min(SKILLS[skill].maxD, d + 1); // cruising -> up
    else if (win.filter((x) => x === 0).length >= 2) d = Math.max(0, d - 1);                    // struggling -> down
    gym.diff[skill] = d; saveGym(gym);
  }

  // ---- build the ctx for one drill, difficulty-mapped ----
  function buildCtx(skill, onResult) {
    const meta = SKILLS[skill];
    const L = melodicLevel(meta.levelId);
    const D = diffOf(skill);
    const keyPool = L.keys || [{ key: 'C', mode: 'major' }];
    const kp = keyPool[rand(keyPool.length)];
    const round = buildRound(L, kp.key, rand(1e6));
    const labelCtx = { key: round.key, mode: round.mode, system: document.getElementById('sysSel') ? document.getElementById('sysSel').value : 'numbers', minorSolfege: 'la' };
    const services = createServices({ labelNoteFn: labelNote, labelPaletteFn: labelPalette, labelCtx, tempoBPM: 92 });
    const ctx = { level: L, melody: round.melody, services, onResult, practice: true };
    if (skill === 'home') {
      ctx.stage = 0;
      ctx.liveTier = { keys: 1 + Math.min(2, Math.floor(D / 2)), hits: 3 + Math.min(1, Math.floor(D / 3)),
        stepMs: 1500 - D * 170, heading: 'Find HOME', howTo: 'Tap HOME on every home note.' };
    } else if (skill === 'mi' || skill === 'sol') {
      ctx.stage = skill === 'mi' ? 3 : 4;
      ctx.tileStepMs = 720 - D * 80;
      ctx.tileRoundLabel = '';
    } else if (skill === 'updown') {
      ctx.stage = 0; ctx.m1Refs = refsArr(6);
    } else if (skill === 'stepskip') {
      ctx.stage = 1; ctx.m1Refs = refsArr(6);
    } else if (skill === 'shape') {
      ctx.stage = 2;
      ctx.shapeLen = Math.min(7, 3 + D);
      ctx.shapeOptions = Math.min(6, 3 + Math.floor(D / 1.2));
    }
    return { ctx, services };
  }

  // ---- adaptive per-EXERCISE selection: serve MORE of what the student struggles with,
  // LESS of what they've nailed (owner). Weight rises as an exercise's rolling accuracy
  // falls; under-sampled exercises are sampled so we get data. Weighted-random, no repeat. ----
  function exWeight(sk) {
    const e = gym.ex[sk];
    let w = (!e || e.n < 3) ? 3 : 0.5 + (1 - e.correct / e.n) * 4; // struggle-weighted
    const m = gym.mastery[sk];
    if (m && m.rusty) w += 5;          // rusty (regressed) -> top priority (retention)
    if (!m || !m.mastered) w += 2;     // not yet mastered -> priority
    return w;
  }

  // ---- MASTER-then-RETAIN economy (SKILLS_GYM_PLAN §6). Master a skill via a fast+correct
  // run (records a speed baseline); if speed/accuracy later regresses, it goes "rusty" and
  // re-surfaces; re-mastering pays a medium reward; sharp grinding pays a small trickle. ----
  const MASTER_K = 8, REMASTER_K = 5;
  function medianRT(result) {
    const ps = (result.meta && Array.isArray(result.meta.prompts)) ? result.meta.prompts.map((p) => p.rt).filter((x) => Number.isFinite(x) && x < 90000) : [];
    if (!ps.length) return null;
    ps.sort((a, b) => a - b); return ps[Math.floor(ps.length / 2)];
  }
  function updateMastery(skill, correct, clean, fast, medRT) {
    const m = gym.mastery[skill] = gym.mastery[skill] || { mastered: false, rusty: false, baseRT: 0, streak: 0, slips: 0, maint: 0 };
    const good = correct && clean && fast;
    if (good) { m.streak++; m.slips = Math.max(0, m.slips - 1); } else { m.streak = 0; if (m.mastered) m.slips++; }
    if (!m.mastered && m.streak >= MASTER_K) {
      m.mastered = true; m.rusty = false; m.baseRT = medRT || 1500; m.slips = 0; gymReward('big', skill);
    } else if (m.mastered && m.rusty && m.streak >= REMASTER_K) {
      m.rusty = false; m.slips = 0; if (medRT) m.baseRT = Math.min(m.baseRT || medRT, medRT); gymReward('medium', skill);
    } else if (m.mastered && !m.rusty) {
      const slow = medRT != null && m.baseRT && medRT > m.baseRT * 1.6;
      if (m.slips >= 2 || slow) m.rusty = true;                 // regressed -> re-surface
      else if (good) { m.maint++; if (m.maint >= 5) { m.maint = 0; gymReward('small', skill); } }
    }
    saveGym(gym);
  }
  function gymReward(tier, skill) {
    const gems = tier === 'big' ? 30 : tier === 'medium' ? 10 : 1;
    S.gems = (S.gems || 0) + gems;
    if (tier !== 'small') S.xp = (S.xp || 0) + (tier === 'big' ? 20 : 8);
    if (deps.save) deps.save(S);
    showReward(tier, skill, gems);
  }
  function showReward(tier, skill, gems) {
    if (!hudEls) return;
    const el = document.createElement('div');
    el.className = 'melodic-skillsgym__reward is-' + tier;
    el.textContent = (tier === 'big' ? 'MASTERED · ' + SKILLS[skill].name : tier === 'medium' ? 'Back to sharp · ' + SKILLS[skill].name : 'Keeping sharp') + '  +' + gems + ' gems';
    host.appendChild(el);
    setTimeout(() => { try { el.remove(); } catch (e) {} }, tier === 'small' ? 1100 : 2600);
  }
  function pickSkill(levelId) {
    let pool = (GROUP_SKILLS[levelId] || []).filter((s) => unlockedSkills().includes(s));
    if (pool.length > 1 && session.lastSkill) pool = pool.filter((s) => s !== session.lastSkill) || pool;
    if (!pool.length) pool = GROUP_SKILLS[levelId] || ['updown'];
    const weights = pool.map(exWeight);
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  // ---- session ----
  let session = null;
  function startSession(mode) {
    session = { mode, score: 0, streak: 0, count: 0, correct: 0, clean: 0, lastSkill: null, recent: {} };
    renderSessionChrome();
    nextItem();
  }
  let hudEls = null;
  function renderSessionChrome() {
    cleanup();
    host.innerHTML = '';
    const bar = document.createElement('div');
    bar.className = 'melodic-skillsgym__bar';
    const skillEl = document.createElement('span'); skillEl.className = 'melodic-skillsgym__skill';
    const scoreEl = document.createElement('span'); scoreEl.className = 'melodic-skillsgym__score';
    const streakEl = document.createElement('span'); streakEl.className = 'melodic-skillsgym__streak';
    const end = document.createElement('button'); end.className = 'melodic-btn melodic-skillsgym__end'; end.textContent = 'End session';
    end.onclick = endSession;
    bar.append(skillEl, streakEl, scoreEl, end);
    host.appendChild(bar);
    const drillHost = document.createElement('div');
    drillHost.className = 'melodic-skillsgym__drill answer-area';
    host.appendChild(drillHost);
    hudEls = { skillEl, scoreEl, streakEl, drillHost };
    updateHud();
  }
  function updateHud() {
    if (!hudEls || !session) return;
    hudEls.skillEl.textContent = session.lastSkill ? SKILLS[session.lastSkill].name : (GROUP_LABEL[session.mode] || 'Practice');
    hudEls.scoreEl.textContent = session.score + ' pts';
    hudEls.streakEl.textContent = 'streak ' + session.streak + (gym.bestStreak ? ' · best ' + gym.bestStreak : '');
  }
  function nextItem() {
    if (destroyed || !session) return;
    const skill = (session.mode && session.mode.single) ? session.mode.single : pickSkill(session.mode);
    session.lastSkill = skill;
    updateHud();
    const { ctx } = buildCtx(skill, (result) => onDrillResult(skill, result));
    cleanup();
    current = createTonicContourRenderer(hudEls.drillHost, ctx);
  }
  function onDrillResult(skill, result) {
    if (destroyed || !session) return;
    const correct = !!result.correct;
    const clean = correct && result.clean !== false;
    const fast = !result.meta || !Array.isArray(result.meta.prompts) || result.meta.prompts.every((p) => p.rt == null || p.rt < 2600);
    session.count++;
    if (correct) { session.correct++; session.streak++; session.score += 20 + (clean ? 10 : 0); }
    else session.streak = 0;
    if (clean) session.clean++;
    if (session.streak > gym.bestStreak) { gym.bestStreak = session.streak; saveGym(gym); }
    tune(skill, correct, clean, fast);
    // Rolling per-exercise stats (decayed toward recent): drives adaptive selection.
    const e = (gym.ex[skill] = gym.ex[skill] || { n: 0, correct: 0, fast: 0 });
    if (e.n >= 12) { e.n = Math.round(e.n * 0.7); e.correct = Math.round(e.correct * 0.7); e.fast = Math.round(e.fast * 0.7); }
    e.n++; if (correct) e.correct++; if (correct && clean && fast) e.fast++;
    saveGym(gym);
    updateMastery(skill, correct, clean, fast, medianRT(result)); // master-then-retain economy
    refreshRetention(SKILLS[skill].levelId, correct);
    updateHud();
    setTimeout(() => { if (!destroyed && session) nextItem(); }, 850);
  }

  // Gym practice REFRESHES retention: nudge the level's mastery + satisfy any due review
  // for it. NEVER touches advancement (levelIdx / capstone / streak).
  function refreshRetention(levelId, correct) {
    const now = Date.now();
    try {
      S.items = S.items || {};
      S.items[levelId] = mastery.recordAnswer(S.items[levelId] || mastery.createItemState(), correct, { now, sessionStart: S.sessionStart || now });
      if (S.review && Array.isArray(S.review.entries)) {
        S.review.entries = S.review.entries.map((e) => (e.skillId === levelId ? review.applyResult(e, correct, now) : e));
      }
      if (deps.save) deps.save(S);
    } catch (e) {}
  }

  function endSession() {
    if (!session) { renderHome(); return; }
    const mode = session.mode;                 // capture BEFORE nulling (the "again" button reads it)
    const count = session.count, correct = session.correct, clean = session.clean;
    session = null;
    gym.sessions++; saveGym(gym);
    const gems = Math.floor(clean / 5);        // small trickle at the END (plan §6)
    if (gems > 0) { S.gems = (S.gems || 0) + gems; if (deps.save) deps.save(S); }
    cleanup();
    host.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'melodic-skillsgym__summary';
    const acc = count ? Math.round((correct / count) * 100) : 0;
    const h = document.createElement('div'); h.className = 'melodic-tonic-contour__heading'; h.textContent = 'Nice work!';
    const line = document.createElement('div'); line.className = 'melodic-tonic-contour__howto';
    line.textContent = count + ' answered · ' + acc + '% · best streak ' + gym.bestStreak + (gems ? ' · +' + gems + ' gems' : '');
    card.append(h, line);
    const again = document.createElement('button'); again.className = 'melodic-btn melodic-btn--primary'; again.textContent = 'Practice again';
    again.onclick = () => startSession(mode);
    const home = document.createElement('button'); home.className = 'melodic-btn'; home.textContent = 'Gym menu';
    home.onclick = renderHome;
    card.append(again, home);
    host.appendChild(card);
  }

  renderHome();
  return { destroy() { destroyed = true; cleanup(); host.innerHTML = ''; } };
}
