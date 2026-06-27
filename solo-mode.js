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
    correctionMode: true, metronome: false, beatGuide: false,
    mode: 'levels', level: 1,
    meter: 'simple', beatsPerMeasure: 4, compoundLevel: 1, speed: 'medium',
    hintsThisRound: 0, wrongThisRound: false, solved: false
  };
  var GROOVE_PER_WRONG = 12, GROOVE_HINT_MISTAKES = 8, GROOVE_HINT_COUNT = 5, GROOVE_GAIN_CLEAN = 15;
  var SPEEDS = { slow: 72, medium: 100, fast: 132 };   // beat BPM (dotted-quarter in compound)

  /* Level ladder — figures unlocked in the order Hall's "Studying Rhythm"
     introduces them (simple-meter arc). Cumulative. "Classic" = all figures
     (the original gameplay), always available as a fallback. */
  var L_STEPS = [
    ['quarter', 'two-eighths'],                                                           // L1  Ch1-3
    ['quarter-rest', 'half'],                                                              // L2  + rests & half
    ['dotted-quarter-eighth'],                                                             // L3  Ch4 dotted/tie
    ['four-sixteenths', 'eighth-two-sixteenths', 'two-sixteenths-eighth', 'sixteenth-eighth-sixteenth'], // L4 Ch6 sixteenths
    ['dotted-eighth-sixteenth', 'sixteenth-dotted-eighth'],                                // L5  Ch7 dotted eighths
    ['eighth-rest-eighth', 'eighth-eighth-rest', 'eighth-quarter-eighth', 'eighth-rest-two-sixteenths', 'sixteenth-rest-three-sixteenths'], // L6 Ch9 rests & syncopation
    ['triplet-eighths', 'triplet-quarters']                                                // L7  Ch12 triplets
  ];
  var LEVEL_LABELS = { 1: 'Quarters & eighths', 2: '+ rests & half notes', 3: '+ dotted quarter', 4: '+ sixteenths', 5: '+ dotted eighths', 6: '+ rests & syncopation', 7: '+ triplets' };
  var LEVELS = {};
  (function () { var acc = []; for (var i = 0; i < L_STEPS.length; i++) { acc = acc.concat(L_STEPS[i]); LEVELS[i + 1] = acc.slice(); } })();
  function bpm() { return S.beatsPerMeasure || 4; }

  /* Compound (6/8) figures — one dotted-quarter BEAT each. The vexflow ratios
     are normalized to the beat by gridFromItems, so they just need correct
     RATIOS (durations), not absolute values. Bank art = rhythm-assets/bank/cd-*.png;
     placement art = rhythm-assets/compound/cd-*.svg. */
  var K = ['b/4'];
  var COMPOUND_FIGS = [
    { id: 'cd-dotted-quarter', name: 'Dotted quarter', beats: 1, vexflow: [{ keys: K, duration: 'q', dots: 1 }] },
    { id: 'cd-three-eighths', name: 'Three eighths', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
    { id: 'cd-quarter-eighth', name: 'Quarter + eighth', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '8' }] },
    { id: 'cd-eighth-quarter', name: 'Eighth + quarter', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: 'q' }] },
    { id: 'cd-duplet', name: 'Duplet', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }] },
    { id: 'cd-dotted-quarter-rest', name: 'Dotted-quarter rest', beats: 1, vexflow: [{ keys: K, duration: 'qr', dots: 1 }] },
    { id: 'cd-8rest-8-8', name: '8r 8 8', beats: 1, vexflow: [{ keys: K, duration: '8r' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
    { id: 'cd-8-8rest-8', name: '8 8r 8', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8r' }, { keys: K, duration: '8' }] },
    { id: 'cd-8-8-8rest', name: '8 8 8r', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8r' }] },
    { id: 'cd-quarter-8rest', name: 'Quarter 8r', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '8r' }] },
    { id: 'cd-8rest-quarter', name: '8r quarter', beats: 1, vexflow: [{ keys: K, duration: '8r' }, { keys: K, duration: 'q' }] },
    { id: 'cd-six-sixteenths', name: 'Six sixteenths', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'cd-two16-8-8', name: '2-16 8 8', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
    { id: 'cd-8-two16-8', name: '8 2-16 8', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '8' }] },
    { id: 'cd-8-8-two16', name: '8 8 2-16', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'cd-four16-8', name: '4-16 8', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '8' }] },
    { id: 'cd-8-four16', name: '8 4-16', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'cd-quarter-two16', name: 'Quarter 2-16', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'cd-two16-quarter', name: '2-16 quarter', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: 'q' }] }
  ];
  var CMP_STEPS = [
    ['cd-dotted-quarter', 'cd-three-eighths', 'cd-quarter-eighth', 'cd-eighth-quarter', 'cd-duplet'],
    ['cd-dotted-quarter-rest', 'cd-8rest-8-8', 'cd-8-8rest-8', 'cd-8-8-8rest', 'cd-quarter-8rest', 'cd-8rest-quarter'],
    ['cd-six-sixteenths', 'cd-two16-8-8', 'cd-8-two16-8', 'cd-8-8-two16', 'cd-four16-8', 'cd-8-four16', 'cd-quarter-two16', 'cd-two16-quarter']
  ];
  var CMP_LABELS = { 1: '6/8 · eighths', 2: '6/8 · + rests', 3: '6/8 · + sixteenths' };
  var COMPOUND_LEVELS = {};
  (function () { var acc = []; for (var i = 0; i < CMP_STEPS.length; i++) { acc = acc.concat(CMP_STEPS[i]); COMPOUND_LEVELS[i + 1] = acc.slice(); } })();

  function levelIds() {
    if (S.meter === 'compound') return COMPOUND_LEVELS[S.compoundLevel] || COMPOUND_LEVELS[3];
    return S.mode === 'classic' ? null : (LEVELS[S.level] || LEVELS[7]);
  }

  /* Inline SVG icons — stroke/fill use currentColor so they inherit each
     theme's text color automatically (no emojis, ever). */
  var IC = {
    play:  '<svg viewBox="0 0 20 20" class="ic ic-fill"><path d="M6 4l11 6-11 6z"/></svg>',
    metro: '<svg viewBox="0 0 20 20" class="ic"><path d="M7.2 17h5.6l-1.3-12H8.5z"/><path d="M10 14l3.6-7.4"/><path d="M6 17h8"/></svg>',
    guide: '<svg viewBox="0 0 20 20" class="ic"><path d="M2 11h3l2-5 3 9 2-6 1.4 2H18"/></svg>',
    search:'<svg viewBox="0 0 20 20" class="ic"><circle cx="9" cy="9" r="5"/><path d="M13 13l4.5 4.5"/></svg>',
    count: '<svg viewBox="0 0 20 20" class="ic"><path d="M5 15V8M10 15V5M15 15v-4"/></svg>',
    eye:   '<svg viewBox="0 0 20 20" class="ic"><path d="M1.5 10S5 4.5 10 4.5 18.5 10 18.5 10 15 15.5 10 15.5 1.5 10 1.5 10z"/><circle cx="10" cy="10" r="2.4"/></svg>',
    check: '<svg viewBox="0 0 20 20" class="ic"><path d="M4 10.5l4 4 8-9"/></svg>',
    next:  '<svg viewBox="0 0 20 20" class="ic ic-fill"><path d="M5 4l8 6-8 6z"/><path d="M14.5 4v12" class="ic-stroke"/></svg>',
    flame: '<svg viewBox="0 0 20 20" class="ic ic-fill ic-sm"><path d="M10 2c1.1 3 4 4.2 4 8a4 4 0 11-8 0c0-2.2 1.1-3.2 2-4.2.2 1.2 1 2 2 2.2.3-2.4-2-3.6-2-8z"/></svg>'
  };

  /* --------------------------------------------------------- persistence */
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem('beatquest-solo') || '{}');
      if (typeof d.score === 'number') S.score = d.score;
      if (typeof d.streak === 'number') S.streak = d.streak;
      if (typeof d.correctionMode === 'boolean') S.correctionMode = d.correctionMode;
      if (typeof d.metronome === 'boolean') S.metronome = d.metronome;
      if (typeof d.beatGuide === 'boolean') S.beatGuide = d.beatGuide;
      if (d.mode === 'levels' || d.mode === 'classic') S.mode = d.mode;
      if (typeof d.level === 'number' && d.level >= 1 && d.level <= 7) S.level = d.level;
      if (d.meter === 'simple' || d.meter === 'compound') S.meter = d.meter;
      if (typeof d.compoundLevel === 'number' && d.compoundLevel >= 1 && d.compoundLevel <= 3) S.compoundLevel = d.compoundLevel;
      if (SPEEDS[d.speed]) S.speed = d.speed;
      if (d.measures === 2 || d.measures === 4 || d.measures === 8 || d.measures === 16) S.measures = d.measures;
      S.beatsPerMeasure = (S.meter === 'compound') ? 2 : 4;
      S.tempo = SPEEDS[S.speed] || 100;
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem('beatquest-solo', JSON.stringify({ score: S.score, streak: S.streak, correctionMode: S.correctionMode, metronome: S.metronome, beatGuide: S.beatGuide, mode: S.mode, level: S.level, meter: S.meter, compoundLevel: S.compoundLevel, speed: S.speed, measures: S.measures })); } catch (e) {}
  }

  /* ----------------------------------------------------- target generation */
  function fullSet() { return (rs.rhythmPatterns && rs.rhythmPatterns[S.meter === 'compound' ? 'compound' : 'medium']) || []; }
  function patternsFor() {
    var ids = levelIds(), base = fullSet();
    return ids ? base.filter(function (p) { return ids.indexOf(p.id) !== -1; }) : base;
  }
  function genMeasure(pats) {
    var res = [], beat = 1, guard = 0, B = bpm();
    while (beat <= B && guard++ < 20) {
      var remaining = B - (beat - 1);
      var choices = pats.filter(function (p) { return (p.beats || 1) <= remaining; });
      var pick = choices[Math.floor(Math.random() * choices.length)];
      if (!pick) break;
      res.push({ patternId: pick.id, startBeat: beat, beats: pick.beats || 1 });
      beat += pick.beats || 1;
    }
    return res;
  }
  function generateTarget() {
    var pats = patternsFor(), t = [];
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
    // search both simple + compound sets so any placed/target id resolves
    var b = ((rs.rhythmPatterns && rs.rhythmPatterns.medium) || []).concat((rs.rhythmPatterns && rs.rhythmPatterns.compound) || []);
    for (var i = 0; i < b.length; i++) if (b[i].id === id) return b[i];
    return null;
  }
  // Hide bank tiles that aren't in the current level's vocabulary (the bank is
  // rebuilt each round by the engine; we filter it cosmetically afterwards).
  function filterBank() {
    var ids = levelIds();
    document.querySelectorAll('.rhythm-tile').forEach(function (t) {
      t.style.display = (!ids || ids.indexOf(t.dataset.patternId) !== -1) ? '' : 'none';
    });
  }

  /* ----------------------------------------------------------------- audio
     Distinct timbres: metronome = short high SINE "tick" (beat 1 accented);
     the rhythm example = lower TRIANGLE "thump". A lookahead scheduler runs the
     count-in (always) and an optional steady metronome + beat-highlight. */
  var actx = null;
  function ctx() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }
  function tone(freq, when, dur, type, gain) {
    var c = ctx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(c.destination);
    o.start(when); o.stop(when + dur + 0.03);
  }
  function metroTick(when, accent) { tone(accent ? 2300 : 1550, when, 0.035, 'sine', accent ? 0.32 : 0.2); }
  function subTick(when) { tone(1500, when, 0.022, 'sine', 0.08); }  // soft compound subdivision
  function rhythmHit(when) { tone(320, when, 0.12, 'triangle', 0.5); }

  var pulse = { running: false, timer: null, nextTime: 0, beat: 0, lastHl: null };
  function stopPulse() {
    pulse.running = false;
    if (pulse.timer) { clearTimeout(pulse.timer); pulse.timer = null; }
    if (pulse.lastHl) { pulse.lastHl.classList.remove('solo-beat-on'); pulse.lastHl = null; }
  }
  function lightBeat(answerBeatIndex, when) {
    var c = ctx(); if (!c) return;
    var m = Math.floor(answerBeatIndex / bpm()) + 1, b = (answerBeatIndex % bpm()) + 1;
    setTimeout(function () {
      if (!pulse.running) return;
      if (pulse.lastHl) pulse.lastHl.classList.remove('solo-beat-on');
      var z = document.querySelector('.beat-drop-zone[data-measure="' + m + '"][data-beat="' + b + '"]');
      if (z) { z.classList.add('solo-beat-on'); pulse.lastHl = z; }
    }, Math.max(0, (when - c.currentTime) * 1000));
  }
  function startPulse(startTime) {
    var c = ctx(); if (!c) return;
    stopPulse();
    pulse.running = true; pulse.beat = 0; pulse.nextTime = startTime;
    var endBeat = bpm() + S.measures * bpm();   // count-in (4) + one pass of the example
    (function sched() {
      if (!pulse.running) return;
      var cc = ctx(); if (!cc) return;
      while (pulse.nextTime < cc.currentTime + 0.12) {
        var bt = pulse.beat;
        if (bt >= endBeat) {            // example finished — stop after the last beat
          setTimeout(stopPulse, Math.max(0, (pulse.nextTime - cc.currentTime) * 1000));
          return;
        }
        var countIn = bt < bpm();
        if (countIn || S.metronome) {
          // count-in: every beat loud; example metronome: accent measure starts
          metroTick(pulse.nextTime, countIn || (bt % bpm()) === 0);
          // compound: soft clicks on the 3 eighth-pulses so you feel the beat subdivide
          if (S.meter === 'compound') {
            var bd = 60 / S.tempo;
            subTick(pulse.nextTime + bd / 3);
            subTick(pulse.nextTime + 2 * bd / 3);
          }
        }
        if (!countIn && S.beatGuide) lightBeat(bt - bpm(), pulse.nextTime);
        pulse.beat++; pulse.nextTime += 60 / S.tempo;
      }
      pulse.timer = setTimeout(sched, 25);
    })();
  }
  function ensurePulse() {
    if (S.metronome || S.beatGuide) { if (!pulse.running) startPulse(ctx() ? ctx().currentTime + 0.1 : 0); }
    else stopPulse();
  }
  function noteBeats(n) {
    var d = 0.25; try { d = rs.getNoteDuration(n.duration); } catch (e) {}
    if (n.dots === 1) d *= 1.5; else if (n.dots === 2) d *= 1.75;
    return d || 0.25;
  }

  function playTarget() {
    if (!S.target) return;
    var c = ctx(); if (!c) { msg('Tap a button to enable sound.'); return; }
    stopPulse();
    var beatDur = 60 / S.tempo;
    var t0 = c.currentTime + 0.2;          // count-in start
    var t = t0 + bpm() * beatDur;              // rhythm starts after the 4-beat count-in
    S.target.forEach(function (meas) {
      meas.forEach(function (it) {
        var pat = findPattern(it.patternId);
        if (!pat || !pat.vexflow) { t += (it.beats || 1) * beatDur; return; }
        var raw = pat.vexflow.map(noteBeats);
        var sum = raw.reduce(function (a, x) { return a + x; }, 0) || 1;
        var scale = (it.beats || 1) / sum;  // make the figure occupy exactly its beats
        pat.vexflow.forEach(function (nn, i) {
          if (nn.duration.indexOf('r') === -1) rhythmHit(t);
          t += raw[i] * scale * beatDur;
        });
      });
    });
    startPulse(t0);   // count-in always ticks; metronome/guide continue per toggles
    msg('Count-in… then the rhythm' + (S.metronome ? ' · metronome on' : '') + (S.beatGuide ? ' · beat guide on' : '') + '. Build your answer.');
  }

  /* --------------------------------------------------------------- checking
     Compare by RHYTHMIC ONSETS, not exact tile choice. With percussive clicks a
     half note and a quarter+rest sound identical, a bar can be tiled several
     ways, and rests can be left empty — any answer with the same attacks on the
     grid is correct. */
  var RES = 12; // grid units per beat (divisible by 16ths=3 and triplets=4)
  function gridFromItems(items) {
    var grid = [], i; for (i = 0; i < S.measures * bpm() * RES; i++) grid[i] = 0;
    items.forEach(function (it) {
      var pat = findPattern(it.patternId); if (!pat || !pat.vexflow) return;
      var raw = pat.vexflow.map(function (n) { return noteBeats(n) * RES; });
      var sum = raw.reduce(function (a, x) { return a + x; }, 0) || 1;
      var scale = ((it.beats || pat.beats || 1) * RES) / sum; // figure occupies exactly its beats
      var pos = (it.mi * bpm() + (it.startBeat - 1)) * RES;
      pat.vexflow.forEach(function (n, k) {
        var idx = Math.round(pos);
        if (n.duration.indexOf('r') === -1 && idx >= 0 && idx < grid.length) grid[idx] = 1;
        pos += raw[k] * scale;
      });
    });
    return grid;
  }
  function targetItems() {
    var a = []; S.target.forEach(function (meas, mi) { meas.forEach(function (it) { a.push({ mi: mi, startBeat: it.startBeat, patternId: it.patternId, beats: it.beats }); }); }); return a;
  }
  function answerItems() {
    var a = [], mi, bi;
    for (mi = 0; mi < S.measures; mi++) {
      if (!rs.userAnswer[mi]) continue;
      for (bi = 0; bi < bpm(); bi++) {
        var v = rs.userAnswer[mi][bi];
        if (v && v.indexOf('_continuation') === -1) { var p = findPattern(v); a.push({ mi: mi, startBeat: bi + 1, patternId: v, beats: p ? p.beats : 1 }); }
      }
    }
    return a;
  }
  function checkAnswer() {
    var tg = gridFromItems(targetItems()), ag = gridFromItems(answerItems());
    var wrong = [], allCorrect = true, mi, bi, k;
    for (mi = 0; mi < S.measures; mi++) for (bi = 0; bi < bpm(); bi++) {
      var start = (mi * bpm() + bi) * RES, diff = false;
      for (k = 0; k < RES; k++) if (tg[start + k] !== ag[start + k]) { diff = true; break; }
      if (diff) { allCorrect = false; wrong.push({ m: mi + 1, b: bi + 1 }); }
    }
    return { allCorrect: allCorrect, wrong: wrong };
  }
  function beatSoundCount(mi, bi) {
    var tg = gridFromItems(targetItems()), n = 0, start = (mi * bpm() + bi) * RES, k;
    for (k = 0; k < RES; k++) if (tg[start + k]) n++;
    return n;
  }
  function markZone(m, b, cls) { var z = document.querySelector('.beat-drop-zone[data-measure="' + m + '"][data-beat="' + b + '"]'); if (z) z.classList.add(cls); }
  function clearMarks() { document.querySelectorAll('.beat-drop-zone.solo-wrong,.beat-drop-zone.solo-right').forEach(function (z) { z.classList.remove('solo-wrong', 'solo-right'); }); }

  /* ----------------------------------------------------------------- rounds */
  function newRound() {
    stopPulse();
    S.target = generateTarget();
    S.hintsThisRound = 0; S.wrongThisRound = false; S.solved = false;
    if (rs.updateGameSettings) rs.updateGameSettings({
      measureCount: S.measures,
      difficulty: (S.meter === 'compound') ? 'compound' : S.difficulty,
      tempo: S.tempo,
      timeSignature: (S.meter === 'compound') ? '6/8' : '4/4',
      beatsPerMeasure: bpm()
    });
    var fb = document.getElementById('feedback'); if (fb) { fb.style.display = 'none'; fb.textContent = ''; } // solo uses #soloMsg
    filterBank();
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
      msg(clean ? 'Nailed it first try! +' + pts + '  ·  Groove +' + GROOVE_GAIN_CLEAN + '  ·  streak ×' + S.streak
                : 'Correct! +' + pts);
      document.getElementById('soloSubmit').style.display = 'none';
      document.getElementById('soloNext').style.display = '';
      save(); render(); return;
    }
    S.wrongThisRound = true;
    S.groove = Math.max(0, S.groove - GROOVE_PER_WRONG * r.wrong.length);
    if (S.correctionMode) {
      r.wrong.forEach(function (w) { markZone(w.m, w.b, 'solo-wrong'); });
      msg(r.wrong.length + ' beat(s) off — fix the red beats, then submit again.');
    } else {
      S.streak = 0; revealCorrect();
      msg('Not quite — here’s the correct rhythm.');
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
  function grooveBroken() { msg('You lost the groove! Score ' + S.score + '. Restarting the set…'); S.groove = 100; S.streak = 0; setTimeout(newRound, 1600); }

  /* ------------------------------------------------------------------ hints */
  function hintMistakes() {
    if (S.solved) return;
    S.hintsThisRound++; S.groove = Math.max(0, S.groove - GROOVE_HINT_MISTAKES);
    clearMarks();
    var r = checkAnswer();
    var filledWrong = r.wrong.filter(function (w) { return rs.userAnswer[w.m - 1][w.b - 1]; });
    filledWrong.forEach(function (w) { markZone(w.m, w.b, 'solo-wrong'); });
    msg(filledWrong.length ? filledWrong.length + ' placed beat(s) are wrong (red).' : 'Nothing placed is wrong — you’re just missing beats.');
    if (S.groove <= 0) grooveBroken();
    save(); render();
  }
  function hintCount() {
    if (S.solved) return;
    var r = checkAnswer();
    if (!r.wrong.length) { msg('Every beat already matches — hit Submit!'); return; }
    var w = r.wrong[0], n = beatSoundCount(w.m - 1, w.b - 1);
    S.hintsThisRound++; S.groove = Math.max(0, S.groove - GROOVE_HINT_COUNT);
    clearMarks(); markZone(w.m, w.b, 'solo-right');
    msg('Measure ' + w.m + ', beat ' + w.b + ' has ' + n + ' sound(s) — narrows your options.');
    if (S.groove <= 0) grooveBroken();
    save(); render();
  }

  /* -------------------------------------------------------------------- UI */
  function msg(t) { var el = document.getElementById('soloMsg'); if (el) el.textContent = t; }
  function render() {
    var f = document.getElementById('soloGrooveFill');
    if (f) { f.style.width = S.groove + '%'; f.style.background = S.groove > 50 ? 'var(--groove-ok,#19e07a)' : S.groove > 25 ? 'var(--groove-warn,#ffd24a)' : 'var(--groove-low,#ff5a4d)'; }
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
      // ALL solo buttons are one uniform size — hierarchy is by COLOR, not size
      // (Play = theme accent + raised, Submit = red, hints = muted). Per-theme
      // CSS supplies the colors.
      '.solo-ctl button{display:inline-flex;align-items:center;justify-content:center;font-family:inherit;font-weight:700;font-size:.85rem;border:none;border-radius:10px;padding:11px 16px;min-height:42px;cursor:pointer;background:rgba(255,255,255,.12);color:#fff;transition:.12s}' +
      '.solo-ctl button:hover{transform:translateY(-1px);background:rgba(255,255,255,.2)}' +
      '.solo-ctl button.go{background:#2196f3}' +
      '#soloHud button.play:active,#soloActions button:active{transform:translateY(2px)}' +
      // bottom Submit bar gets a top divider since it is under the bank
      '#soloActions{border-top:1px solid rgba(255,255,255,.12);padding-top:14px}' +
      // hints: muted color (same size as everything), grouped behind a divider
      '.solo-ctl button.hint{background:rgba(255,255,255,.06);color:#cfd3e0;font-weight:600}' +
      '#soloHud .solo-hints{display:inline-flex;align-items:center;gap:6px;padding-left:12px;margin-left:2px;border-left:1px solid rgba(255,255,255,.18)}' +
      '#soloHud .solo-hints .hints-label{font-size:.6rem;letter-spacing:.14em;opacity:.5;font-weight:800}' +
      // icons inherit the button text color so they restyle per theme
      '.solo-ctl .ic{width:1.05em;height:1.05em;margin-right:7px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}' +
      '.solo-ctl .ic-sm{width:.95em;height:.95em;margin:0 0 0 5px}' +
      '.solo-ctl .ic-fill{fill:currentColor;stroke:none}' +
      '.solo-ctl .ic-fill .ic-stroke{fill:none;stroke:currentColor;stroke-width:1.7}' +
      // bottom action bar (Submit / Next) directly under the staff
      '#soloActions{display:flex;justify-content:center;gap:12px;margin-top:14px}' +
      '#soloHud select{font-family:inherit;font-size:.82rem;background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:6px 8px}' +
      '#soloHud select option{color:#111}' +
      '.solo-ctl button.toggle.on{background:#19e07a;color:#06210f;box-shadow:0 0 0 2px rgba(25,224,122,.4)}' +
      '#soloHud .solo-toggle{display:flex;align-items:center;gap:6px;font-size:.8rem;opacity:.85;margin-left:auto;cursor:pointer}' +
      '#soloHud #soloMsg{margin-top:10px;font-size:.95rem;min-height:1.3em;font-weight:600}' +
      '.beat-drop-zone.solo-wrong{outline:2px solid #ff5a4d;outline-offset:-2px;background:rgba(255,90,77,.13)!important}' +
      '.beat-drop-zone.solo-right{background:rgba(25,224,122,.16)!important}' +
      '.beat-drop-zone.solo-beat-on{background:rgba(33,150,243,.22)!important;box-shadow:inset 0 0 0 2px rgba(33,150,243,.7)}';
    document.head.appendChild(st);
  }

  function buildHud() {
    if (document.getElementById('soloHud')) return;
    injectStyle();
    var lvOpts = '';
    for (var L = 1; L <= 7; L++) lvOpts += '<option value="' + L + '">Lvl ' + L + ' · ' + LEVEL_LABELS[L] + '</option>';
    lvOpts += '<option value="classic">Classic (all figures)</option>';
    for (var C = 1; C <= 3; C++) lvOpts += '<option value="c' + C + '">' + CMP_LABELS[C] + '</option>';
    var hud = document.createElement('div'); hud.id = 'soloHud'; hud.className = 'solo-ctl';
    hud.innerHTML =
      '<div class="solo-stats">' +
        '<div class="solo-stat"><span>LEVEL</span><select id="soloLevel">' + lvOpts + '</select></div>' +
        '<div class="solo-stat"><span>SPEED</span><select id="soloSpeed"><option value="slow">Slow</option><option value="medium">Medium</option><option value="fast">Fast</option></select></div>' +
        '<div class="solo-stat"><span>BARS</span><select id="soloBars"><option value="2">2</option><option value="4">4</option><option value="8">8</option><option value="16">16</option></select></div>' +
        '<div class="solo-stat groove"><span>GROOVE</span><div class="solo-bar"><i id="soloGrooveFill"></i></div><b id="soloGroovePct">100%</b></div>' +
        '<div class="solo-stat"><span>SCORE</span><b id="soloScore">0</b></div>' +
        '<div class="solo-stat"><span>STREAK</span><b id="soloStreak">0</b>' + IC.flame + '</div>' +
      '</div>' +
      '<div class="solo-actions">' +
        '<button id="soloPlay" class="primary play">' + IC.play + 'Play rhythm</button>' +
        '<button id="soloMetro" class="toggle">' + IC.metro + 'Metronome</button>' +
        '<button id="soloGuide" class="toggle">' + IC.guide + 'Beat guide</button>' +
        '<span class="solo-hints"><span class="hints-label">HINTS</span>' +
          '<button id="soloHintBeats" class="hint">' + IC.search + 'Find mistakes</button>' +
          '<button id="soloHintCount" class="hint">' + IC.count + 'Count a beat</button>' +
          '<button id="soloReveal" class="hint">' + IC.eye + 'Show answer</button>' +
        '</span>' +
        '<label class="solo-toggle"><input type="checkbox" id="soloCorrect"> Fix-it mode</label>' +
      '</div>' +
      '<div id="soloMsg"></div>';
    var ga = document.getElementById('gameArea');
    var sb = ga ? ga.querySelector('.status-bar') : null;
    if (sb) sb.insertAdjacentElement('afterend', hud); else if (ga) ga.insertBefore(hud, ga.firstChild);

    // Submit / Next live in their own bar at the very bottom, under the bank.
    var actions = document.createElement('div'); actions.id = 'soloActions'; actions.className = 'solo-ctl';
    actions.innerHTML =
      '<button id="soloSubmit" class="primary go">' + IC.check + 'Submit answer</button>' +
      '<button id="soloNext" class="go" style="display:none">' + IC.next + 'Next</button>';
    if (ga) ga.appendChild(actions);

    document.getElementById('soloPlay').onclick = playTarget;
    document.getElementById('soloHintBeats').onclick = hintMistakes;
    document.getElementById('soloHintCount').onclick = hintCount;
    document.getElementById('soloSubmit').onclick = submit;
    document.getElementById('soloNext').onclick = newRound;
    document.getElementById('soloReveal').onclick = function () {
      if (S.solved) return;
      S.solved = true; S.streak = 0; S.wrongThisRound = true;
      stopPulse(); clearMarks(); revealCorrect();
      msg('Here’s the correct rhythm. (No points — hit Next for a new one.)');
      document.getElementById('soloSubmit').style.display = 'none';
      document.getElementById('soloNext').style.display = '';
      save(); render();
    };
    var lv = document.getElementById('soloLevel');
    lv.value = (S.meter === 'compound') ? ('c' + S.compoundLevel) : ((S.mode === 'classic') ? 'classic' : String(S.level));
    lv.onchange = function () {
      var v = lv.value;
      if (v.charAt(0) === 'c' && v.length === 2) {            // compound: c1/c2/c3
        S.meter = 'compound'; S.compoundLevel = parseInt(v.slice(1), 10); S.beatsPerMeasure = 2;
      } else {
        S.meter = 'simple'; S.beatsPerMeasure = 4;
        if (v === 'classic') { S.mode = 'classic'; }
        else { S.mode = 'levels'; S.level = parseInt(v, 10); }
      }
      save(); newRound();
    };
    var sp = document.getElementById('soloSpeed');
    sp.value = S.speed;
    sp.onchange = function () { S.speed = sp.value; S.tempo = SPEEDS[S.speed] || 100; save(); playTarget(); };
    var br = document.getElementById('soloBars');
    br.value = String(S.measures);
    br.onchange = function () { S.measures = parseInt(br.value, 10); save(); newRound(); };
    var cb = document.getElementById('soloCorrect');
    cb.checked = S.correctionMode;
    cb.onchange = function () { S.correctionMode = cb.checked; save(); };
    // Metronome / Beat-guide are PLAYBACK aids: toggling just sets the flag;
    // they only sound/animate during the count-in + example (startPulse stops after).
    var mb = document.getElementById('soloMetro');
    mb.classList.toggle('on', S.metronome);
    mb.onclick = function () { S.metronome = !S.metronome; mb.classList.toggle('on', S.metronome); save(); };
    var gb = document.getElementById('soloGuide');
    gb.classList.toggle('on', S.beatGuide);
    gb.onclick = function () {
      S.beatGuide = !S.beatGuide; gb.classList.toggle('on', S.beatGuide); save();
      if (!S.beatGuide && pulse.lastHl) { pulse.lastHl.classList.remove('solo-beat-on'); pulse.lastHl = null; }
    };
  }

  function start() {
    rs = window.rhythmStudent;
    if (!rs) { setTimeout(start, 150); return; }
    if (rs.rhythmPatterns && !rs.rhythmPatterns.compound) rs.rhythmPatterns.compound = COMPOUND_FIGS;
    load();
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('gameArea').classList.add('active');
    document.body.classList.remove('login-mode');
    // Solo has no classroom — hide the "Connected to Room / Status" bar entirely.
    var statusBar = document.querySelector('.status-bar'); if (statusBar) statusBar.style.display = 'none';
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
