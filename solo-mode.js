/* ============================================================================
   BeatQuest — STANDALONE (solo) practice mode · v1
   A self-study loop built ON TOP of the existing engine. It only READS/CALLS
   public pieces of window.rhythmStudent (rhythmPatterns, userAnswer, placeTile,
   clearAnswers, updateGameSettings, playWithWebAudio). It never alters note
   placement, the 16th-grid, the time signature or bar lines.

   Meter = "GROOVE": mistakes & hints break it; a clean first-try restores it.
   ============================================================================ */
(function () {
  var rs = null;
  var S = {
    target: null, measures: 2, difficulty: 'medium', tempo: 100,
    groove: 100, score: 0, streak: 0,
    correctionMode: true, hintsThisRound: 0, wrongThisRound: false, solved: false
  };
  var GROOVE_PER_WRONG = 12, GROOVE_HINT_MISTAKES = 8, GROOVE_HINT_COUNT = 5, GROOVE_GAIN_CLEAN = 15;

  /* --------------------------------------------------------- persistence */
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem('beatquest-solo') || '{}');
      if (typeof d.score === 'number') S.score = d.score;
      if (typeof d.streak === 'number') S.streak = d.streak;
      if (typeof d.correctionMode === 'boolean') S.correctionMode = d.correctionMode;
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem('beatquest-solo', JSON.stringify({ score: S.score, streak: S.streak, correctionMode: S.correctionMode })); } catch (e) {}
  }

  /* ----------------------------------------------------- target generation */
  function patternsFor(diff) { return (rs.rhythmPatterns && rs.rhythmPatterns[diff]) || rs.rhythmPatterns.medium; }
  function genMeasure(pats) {
    var res = [], beat = 1, guard = 0;
    while (beat <= 4 && guard++ < 20) {
      var remaining = 4 - (beat - 1);
      var choices = pats.filter(function (p) { return (p.beats || 1) <= remaining; });
      var pick = choices[Math.floor(Math.random() * choices.length)];
      res.push({ patternId: pick.id, startBeat: beat, beats: pick.beats || 1 });
      beat += pick.beats || 1;
    }
    return res;
  }
  function generateTarget() {
    var pats = patternsFor(S.difficulty), t = [];
    for (var m = 0; m < S.measures; m++) t.push(genMeasure(pats));
    return t;
  }
  function expectedGrid(target) {
    var exp = [];
    target.forEach(function (meas, mi) {
      exp[mi] = [null, null, null, null];
      meas.forEach(function (it) {
        for (var b = it.startBeat; b < it.startBeat + it.beats; b++) {
          exp[mi][b - 1] = (b === it.startBeat) ? it.patternId : it.patternId + '_continuation';
        }
      });
    });
    return exp;
  }
  function findPattern(id) {
    var pats = patternsFor(S.difficulty);
    for (var i = 0; i < pats.length; i++) if (pats[i].id === id) return pats[i];
    return null;
  }

  /* ----------------------------------------------------------------- audio */
  function playTarget() {
    if (!S.target) return;
    var notes = [];
    for (var c = 0; c < 4; c++) notes.push({ duration: 'q' }); // count-in
    S.target.forEach(function (meas) {
      meas.forEach(function (it) {
        var pat = findPattern(it.patternId);
        if (pat && pat.vexflow) pat.vexflow.forEach(function (n) { notes.push({ duration: n.duration }); });
      });
    });
    msg('🎧 Count-in… then the rhythm. Build your answer below.');
    try { rs.playWithWebAudio(notes, S.tempo); } catch (e) {}
  }

  /* --------------------------------------------------------------- checking */
  function checkAnswer() {
    var exp = expectedGrid(S.target), wrong = [], allCorrect = true;
    for (var mi = 0; mi < S.measures; mi++) {
      for (var bi = 0; bi < 4; bi++) {
        var want = exp[mi][bi], got = rs.userAnswer[mi] ? rs.userAnswer[mi][bi] : null;
        if (want !== got) {
          allCorrect = false;
          if (want && want.indexOf('_continuation') === -1) wrong.push({ m: mi + 1, b: bi + 1 });
          else if (got && got.indexOf('_continuation') === -1) wrong.push({ m: mi + 1, b: bi + 1 });
        }
      }
    }
    return { allCorrect: allCorrect, wrong: wrong };
  }
  function markZone(m, b, cls) { var z = document.querySelector('.beat-drop-zone[data-measure="' + m + '"][data-beat="' + b + '"]'); if (z) z.classList.add(cls); }
  function clearMarks() { document.querySelectorAll('.beat-drop-zone.solo-wrong,.beat-drop-zone.solo-right').forEach(function (z) { z.classList.remove('solo-wrong', 'solo-right'); }); }

  /* ----------------------------------------------------------------- rounds */
  function newRound() {
    S.target = generateTarget();
    S.hintsThisRound = 0; S.wrongThisRound = false; S.solved = false;
    if (rs.updateGameSettings) rs.updateGameSettings({ measureCount: S.measures, difficulty: S.difficulty, tempo: S.tempo });
    clearMarks();
    document.getElementById('soloNext').style.display = 'none';
    document.getElementById('soloSubmit').style.display = '';
    render();
    setTimeout(playTarget, 350);
  }

  function submit() {
    if (S.solved) return;
    clearMarks();
    var r = checkAnswer();
    if (r.allCorrect) {
      S.solved = true;
      var clean = !S.wrongThisRound && S.hintsThisRound === 0;
      if (clean) { S.streak++; S.groove = Math.min(100, S.groove + GROOVE_GAIN_CLEAN); }
      else { S.streak = 0; }
      var pts = 100 + (clean ? S.streak * 20 : 0);
      S.score += pts;
      msg(clean ? '✓ Nailed it first try! +' + pts + '  ·  Groove +' + GROOVE_GAIN_CLEAN + '  ·  streak ×' + S.streak
                : '✓ Correct! +' + pts);
      document.getElementById('soloSubmit').style.display = 'none';
      document.getElementById('soloNext').style.display = '';
      save(); render(); return;
    }
    S.wrongThisRound = true;
    S.groove = Math.max(0, S.groove - GROOVE_PER_WRONG * r.wrong.length);
    if (S.correctionMode) {
      r.wrong.forEach(function (w) { markZone(w.m, w.b, 'solo-wrong'); });
      msg('✗ ' + r.wrong.length + ' beat(s) off — fix the red beats, then submit again.');
    } else {
      S.streak = 0; revealCorrect();
      msg('✗ Not quite — here’s the correct rhythm.');
      document.getElementById('soloSubmit').style.display = 'none';
      document.getElementById('soloNext').style.display = '';
    }
    if (S.groove <= 0) grooveBroken();
    save(); render();
  }

  function revealCorrect() {
    if (rs.clearAnswers) rs.clearAnswers();
    S.target.forEach(function (meas, mi) {
      meas.forEach(function (it) {
        var z = document.querySelector('.beat-drop-zone[data-measure="' + (mi + 1) + '"][data-beat="' + it.startBeat + '"]');
        if (z && rs.placeTile) { try { rs.placeTile(z, it.patternId, mi + 1, it.startBeat); } catch (e) {} }
      });
    });
  }
  function grooveBroken() { msg('💔 You lost the groove! Score ' + S.score + '. Restarting the set…'); S.groove = 100; S.streak = 0; setTimeout(newRound, 1600); }

  /* ------------------------------------------------------------------ hints */
  function hintMistakes() {
    if (S.solved) return;
    S.hintsThisRound++; S.groove = Math.max(0, S.groove - GROOVE_HINT_MISTAKES);
    clearMarks();
    var r = checkAnswer();
    var filledWrong = r.wrong.filter(function (w) { return rs.userAnswer[w.m - 1][w.b - 1]; });
    filledWrong.forEach(function (w) { markZone(w.m, w.b, 'solo-wrong'); });
    msg(filledWrong.length ? '💡 ' + filledWrong.length + ' placed beat(s) are wrong (red).' : '💡 Nothing placed is wrong — you’re just missing beats.');
    if (S.groove <= 0) grooveBroken();
    save(); render();
  }
  function hintCount() {
    if (S.solved) return;
    var exp = expectedGrid(S.target);
    for (var mi = 0; mi < S.measures; mi++) {
      for (var bi = 0; bi < 4; bi++) {
        var want = exp[mi][bi];
        if (want && want.indexOf('_continuation') === -1) {
          var got = rs.userAnswer[mi] ? rs.userAnswer[mi][bi] : null;
          if (got !== want) {
            var pat = findPattern(want);
            var sounds = pat && pat.vexflow ? pat.vexflow.filter(function (n) { return n.duration.indexOf('r') === -1; }).length : '?';
            S.hintsThisRound++; S.groove = Math.max(0, S.groove - GROOVE_HINT_COUNT);
            markZone(mi + 1, bi + 1, 'solo-right');
            msg('💡 Measure ' + (mi + 1) + ', beat ' + (bi + 1) + ' has ' + sounds + ' sound(s) — narrows your options.');
            if (S.groove <= 0) grooveBroken();
            save(); render(); return;
          }
        }
      }
    }
    msg('💡 Every beat is already correct — hit Submit!');
  }

  /* -------------------------------------------------------------------- UI */
  function msg(t) { var el = document.getElementById('soloMsg'); if (el) el.textContent = t; }
  function render() {
    var f = document.getElementById('soloGrooveFill');
    if (f) { f.style.width = S.groove + '%'; f.style.background = S.groove > 50 ? '#19e07a' : S.groove > 25 ? '#ffd24a' : '#ff5a4d'; }
    var p = document.getElementById('soloGroovePct'); if (p) p.textContent = S.groove + '%';
    var sc = document.getElementById('soloScore'); if (sc) sc.textContent = S.score;
    var st = document.getElementById('soloStreak'); if (st) st.textContent = S.streak;
  }

  function injectStyle() {
    if (document.getElementById('soloStyle')) return;
    var st = document.createElement('style'); st.id = 'soloStyle';
    st.textContent =
      '#soloHud{background:rgba(15,15,22,.55);border:1px solid rgba(255,255,255,.16);border-radius:14px;padding:12px 16px;margin-bottom:14px;color:#eef1fb;font-family:system-ui,sans-serif}' +
      '#soloHud .solo-stats{display:flex;gap:24px;align-items:center;flex-wrap:wrap;margin-bottom:10px}' +
      '#soloHud .solo-stat{display:flex;align-items:center;gap:8px;font-size:.78rem;letter-spacing:.05em}' +
      '#soloHud .solo-stat>span{opacity:.7;font-weight:700}' +
      '#soloHud .solo-stat b{font-size:1.05rem}' +
      '#soloHud .solo-stat.groove{flex:1;min-width:200px}' +
      '#soloHud .solo-bar{flex:1;max-width:240px;height:10px;border-radius:6px;background:rgba(255,255,255,.15);overflow:hidden}' +
      '#soloHud .solo-bar i{display:block;height:100%;width:100%;background:#19e07a;transition:width .35s,background .35s}' +
      '#soloHud .solo-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
      '#soloHud button{font-family:inherit;font-weight:700;font-size:.85rem;border:none;border-radius:10px;padding:10px 15px;cursor:pointer;background:rgba(255,255,255,.12);color:#fff;transition:.12s}' +
      '#soloHud button:hover{transform:translateY(-1px);background:rgba(255,255,255,.2)}' +
      '#soloHud button.go{background:#2196f3}#soloHud button.hint{background:rgba(255,210,74,.2);color:#ffe1a0}' +
      '#soloHud .solo-toggle{display:flex;align-items:center;gap:6px;font-size:.8rem;opacity:.85;margin-left:auto;cursor:pointer}' +
      '#soloHud #soloMsg{margin-top:10px;font-size:.95rem;min-height:1.3em;font-weight:600}' +
      '.beat-drop-zone.solo-wrong{outline:2px solid #ff5a4d;outline-offset:-2px;background:rgba(255,90,77,.13)!important}' +
      '.beat-drop-zone.solo-right{background:rgba(25,224,122,.16)!important}';
    document.head.appendChild(st);
  }

  function buildHud() {
    if (document.getElementById('soloHud')) return;
    injectStyle();
    var hud = document.createElement('div'); hud.id = 'soloHud';
    hud.innerHTML =
      '<div class="solo-stats">' +
        '<div class="solo-stat groove"><span>GROOVE</span><div class="solo-bar"><i id="soloGrooveFill"></i></div><b id="soloGroovePct">100%</b></div>' +
        '<div class="solo-stat"><span>SCORE</span><b id="soloScore">0</b></div>' +
        '<div class="solo-stat"><span>STREAK</span><b id="soloStreak">0</b> 🔥</div>' +
      '</div>' +
      '<div class="solo-actions">' +
        '<button id="soloPlay">▶ Play rhythm</button>' +
        '<button id="soloHintBeats" class="hint">💡 Find mistakes</button>' +
        '<button id="soloHintCount" class="hint">💡 Count a beat</button>' +
        '<button id="soloSubmit" class="go">✓ Submit</button>' +
        '<button id="soloNext" class="go" style="display:none">⏭ Next</button>' +
        '<label class="solo-toggle"><input type="checkbox" id="soloCorrect"> Fix-it mode</label>' +
      '</div>' +
      '<div id="soloMsg"></div>';
    var ga = document.getElementById('gameArea');
    var sb = ga ? ga.querySelector('.status-bar') : null;
    if (sb) sb.insertAdjacentElement('afterend', hud); else if (ga) ga.insertBefore(hud, ga.firstChild);

    document.getElementById('soloPlay').onclick = playTarget;
    document.getElementById('soloHintBeats').onclick = hintMistakes;
    document.getElementById('soloHintCount').onclick = hintCount;
    document.getElementById('soloSubmit').onclick = submit;
    document.getElementById('soloNext').onclick = newRound;
    var cb = document.getElementById('soloCorrect');
    cb.checked = S.correctionMode;
    cb.onchange = function () { S.correctionMode = cb.checked; save(); };
  }

  function start() {
    rs = window.rhythmStudent;
    if (!rs) { setTimeout(start, 150); return; }
    load();
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('gameArea').classList.add('active');
    document.body.classList.remove('login-mode');
    var room = document.getElementById('connectedRoom'); if (room) room.textContent = 'Solo Practice';
    var stat = document.getElementById('connectionStatus'); if (stat) stat.textContent = 'Self-study';
    rs.connected = true;
    buildHud();
    S.groove = 100;
    newRound();
  }

  function wireEntry() {
    var solo = document.getElementById('soloBtn');
    if (solo) solo.addEventListener('click', start);
    if (/[?&]mode=solo/.test(location.search)) setTimeout(start, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireEntry); else wireEntry();
  window.BeatQuestSolo = { start: start, state: S };
})();
