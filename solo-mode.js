/* ============================================================================
   RhythmQuest — STANDALONE (solo) practice mode · v1
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
    groove: 100, score: 0, streak: 0, bonus: 0,
    bonusBoost: false,   // armed by the "one more" exit nudge; DOUBLES the next earned bonus (session-only, not persisted)
    tapOrient: 'BL',     // tapping hand orientation: 'BL' = Beat-Left/Rhythm-Right (default), 'BR' = swapped. Set per round.
    correctionMode: true, metronome: false, beatGuide: false, quiet: false,
    keyBeat: 'z', keyRhythm: '/',   // keyboard shortcut keys for tapping (far-side defaults)
    level: 1,                                  // tier number within the family, or 'all'
    ts: '4/4', family: 'quarter',              // selected meter -> beat-unit family
    meter: 'simple', beatsPerMeasure: 4, speed: 'medium',
    changing: false, changePool: null, curMeters: null,  // changing-meter mode
    hintsThisRound: 0, wrongThisRound: false, solved: false, listensThisRound: 0, bonusRound: false, tapAlongDone: false,
    /* mode: 'dictation' (build-the-answer, the original solo loop) or 'tapping'
       (the standalone TAPPING / performance game). Tapping reuses EVERYTHING in
       this file — the same level ladder (L_STEPS / FAMILIES / generateTarget),
       the same staff + note glyphs, and the same tap-back performance engine —
       but skips the dictation step: the rhythm is shown on the staff straight
       away and the player performs it with the tap-back mechanic. Set from the
       URL (?mode=tapping) in wireEntry. */
    mode: 'dictation',
    /* ---- GUIDED-LEVEL SPINE (wired to the core/ engine via window.LevelCore) ----
       guided: are we walking the matched 31-level ladder (default) vs free play.
       guidedIdx: 0-based position in ladderForMode(mode) (same ladder both games).
       guidedFigures: the active ladder level's figure-bank ids (Level.figures) —
         the figure allowlist levelIds() returns in guided mode.
       capstone: within a level the student ramps 2->4->8 measures; a clean
         8-measure example at the groove threshold passes the level. ramp is the
         current required bar count for the *next* pass step. */
    guided: true, guidedIdx: 0, guidedFigures: null, ramp: 2
  };
  var GROOVE_PER_WRONG = 12, GROOVE_HINT_MISTAKES = 8, GROOVE_HINT_COUNT = 5, GROOVE_HINT_NARROW = 10, GROOVE_HINT_PLAY = 6, GROOVE_GAIN_CLEAN = 15;
  // LISTEN CAP — how many times a student may press Play and still have the round count
  // as "clean" (over the cap = same effect as using a hint: the answer can still be
  // correct, but it won't advance the ramp/level). This turns "how many hearings" into a
  // real difficulty lever, the way graded dictation limits playings. Levels 1-2 are
  // UNCAPPED (beginners need as many hearings as it takes to hold a rhythm); after that it
  // tightens with the example length. A SINGLE listen (<=1) is the fast-track signal that
  // accelerates the 2->4->8 ramp (see recordRound). Tune here only.
  function listenCapFor(bars) {
    if ((S.guidedIdx || 0) <= 1) return Infinity;   // Levels 1-2: unlimited hearings
    return bars <= 2 ? 3 : bars <= 4 ? 4 : 5;
  }
  var SPEEDS = { slow: 72, medium: 100, fast: 132 };   // beat BPM (dotted-quarter in compound)
  // TEMPO -> POINTS ONLY (never groove). Faster playback = less time to process each beat =
  // harder, so it earns more; slowing it down (a listening aid) earns fewer points. Groove
  // is deliberately left untouched so slowing down never LOOKS like a penalty — it just
  // lowers your point ceiling for that round. Levels 1-2 are lenient (slow is free while
  // you're still learning to hold a rhythm). Tune here only.
  function tempoMult() {
    var m = S.speed === 'fast' ? 1.3 : S.speed === 'slow' ? 0.75 : 1.0;
    if ((S.guidedIdx || 0) <= 1 && m < 1) m = 1;
    return m;
  }

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
  // Per-measure beat counts. In changing-meter mode each measure has its own beat
  // count (from its time sig); otherwise every measure has bpm() beats. These
  // helpers let the grid/checking/audio work for both without branching everywhere.
  function beatsForTs(ts) { var p = String(ts || '4/4').split('/'); var t = +p[0] || 4; return (t === 6 || t === 9 || t === 12) ? t / 3 : t; }
  function mBeats() {
    if (S.changing && S.curMeters && S.curMeters.length) return S.curMeters.map(beatsForTs);
    var a = [], b = bpm(); for (var i = 0; i < S.measures; i++) a.push(b); return a;
  }
  function beatBase(mi) { var mb = mBeats(), s = 0; for (var i = 0; i < mi; i++) s += mb[i]; return s; }
  function totalBeats() { var mb = mBeats(), s = 0; for (var i = 0; i < mb.length; i++) s += mb[i]; return s; }
  function measureOfAbs(absBeat) { var mb = mBeats(), acc = 0; for (var i = 0; i < mb.length; i++) { if (absBeat < acc + mb[i]) return { m: i + 1, b: absBeat - acc + 1 }; acc += mb[i]; } return { m: mb.length || 1, b: 1 }; }

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

  /* ---- New beat-unit families (art generated; see CURRICULUM_PLAN.md) ----
     Each fig is one BEAT cell; onset math normalizes by total duration so only
     the duration RATIOS matter. */
  // Simple HALF-NOTE beat (2/2 · 3/2) — Hall Ch14
  var HALF_FIGS = [
    { id: 'hb-half', name: 'Half', beats: 1, vexflow: [{ keys: K, duration: 'h' }] },
    { id: 'hb-two-quarters', name: 'Two quarters', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'q' }] },
    { id: 'hb-quarter-two8', name: 'Quarter + 2 eighths', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
    { id: 'hb-two8-quarter', name: '2 eighths + quarter', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: 'q' }] },
    { id: 'hb-four-eighths', name: 'Four eighths', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
    { id: 'hb-half-rest', name: 'Half rest', beats: 1, vexflow: [{ keys: K, duration: 'hr' }] },
    { id: 'hb-quarter-qrest', name: 'Quarter + q-rest', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'qr' }] },
    { id: 'hb-qrest-quarter', name: 'q-rest + quarter', beats: 1, vexflow: [{ keys: K, duration: 'qr' }, { keys: K, duration: 'q' }] },
    { id: 'hb-8rest-8-quarter', name: '8r 8 quarter', beats: 1, vexflow: [{ keys: K, duration: '8r' }, { keys: K, duration: '8' }, { keys: K, duration: 'q' }] },
    { id: 'hb-quarter-8rest-8', name: 'Quarter 8r 8', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '8r' }, { keys: K, duration: '8' }] },
    { id: 'hb-eight-16ths', name: 'Eight 16ths', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'hb-two16-q', name: '2-16 + quarter', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: 'q' }] },
    { id: 'hb-q-two16', name: 'Quarter + 2-16', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'hb-two8-four16', name: '2-8 + 4-16', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'hb-four16-two8', name: '4-16 + 2-8', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
    { id: 'hb-8-two16-8', name: '8 2-16 8', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '8' }] },
    { id: 'hb-two16-8-8', name: '2-16 8 8', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
    { id: 'hb-8-8-two16', name: '8 8 2-16', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] }
  ];
  var HALF_STEPS = [
    ['hb-half', 'hb-two-quarters', 'hb-quarter-two8', 'hb-two8-quarter', 'hb-four-eighths'],
    ['hb-half-rest', 'hb-quarter-qrest', 'hb-qrest-quarter', 'hb-8rest-8-quarter', 'hb-quarter-8rest-8'],
    ['hb-eight-16ths', 'hb-two16-q', 'hb-q-two16', 'hb-two8-four16', 'hb-four16-two8', 'hb-8-two16-8', 'hb-two16-8-8', 'hb-8-8-two16']
  ];
  var HALF_LABELS = { 1: 'Quarters & eighths', 2: '+ rests', 3: '+ sixteenths' };
  // Compound DOTTED-HALF beat (6/4 · 9/4 · 12/4) — Hall Ch15
  var DOTTEDHALF_FIGS = [
    { id: 'dh-dotted-half', name: 'Dotted half', beats: 1, vexflow: [{ keys: K, duration: 'h', dots: 1 }] },
    { id: 'dh-three-quarters', name: 'Three quarters', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'q' }, { keys: K, duration: 'q' }] },
    { id: 'dh-half-quarter', name: 'Half + quarter', beats: 1, vexflow: [{ keys: K, duration: 'h' }, { keys: K, duration: 'q' }] },
    { id: 'dh-quarter-half', name: 'Quarter + half', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'h' }] },
    { id: 'dh-duplet', name: 'Duplet', beats: 1, tuplet: { num_notes: 2, notes_occupied: 3 }, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'q' }] },
    { id: 'dh-dotted-half-rest', name: 'Dotted-half rest', beats: 1, vexflow: [{ keys: K, duration: 'hr', dots: 1 }] },
    { id: 'dh-qrest-q-q', name: 'qr q q', beats: 1, vexflow: [{ keys: K, duration: 'qr' }, { keys: K, duration: 'q' }, { keys: K, duration: 'q' }] },
    { id: 'dh-q-qrest-q', name: 'q qr q', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'qr' }, { keys: K, duration: 'q' }] },
    { id: 'dh-q-q-qrest', name: 'q q qr', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'q' }, { keys: K, duration: 'qr' }] },
    { id: 'dh-half-qrest', name: 'Half + q-rest', beats: 1, vexflow: [{ keys: K, duration: 'h' }, { keys: K, duration: 'qr' }] },
    { id: 'dh-qrest-half', name: 'q-rest + half', beats: 1, vexflow: [{ keys: K, duration: 'qr' }, { keys: K, duration: 'h' }] },
    { id: 'dh-six-eighths', name: 'Six eighths', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
    { id: 'dh-two8-q-q', name: '2-8 q q', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: 'q' }, { keys: K, duration: 'q' }] },
    { id: 'dh-q-two8-q', name: 'q 2-8 q', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: 'q' }] },
    { id: 'dh-q-q-two8', name: 'q q 2-8', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'q' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
    { id: 'dh-four8-q', name: '4-8 q', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: 'q' }] },
    { id: 'dh-q-four8', name: 'q 4-8', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
    { id: 'dh-half-two8', name: 'Half + 2-8', beats: 1, vexflow: [{ keys: K, duration: 'h' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
    { id: 'dh-two8-half', name: '2-8 + half', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: 'h' }] }
  ];
  var DOTTEDHALF_STEPS = [
    ['dh-dotted-half', 'dh-three-quarters', 'dh-half-quarter', 'dh-quarter-half', 'dh-duplet', 'dh-six-eighths'],
    ['dh-dotted-half-rest', 'dh-qrest-q-q', 'dh-q-qrest-q', 'dh-q-q-qrest', 'dh-half-qrest', 'dh-qrest-half'],
    ['dh-two8-q-q', 'dh-q-two8-q', 'dh-q-q-two8', 'dh-four8-q', 'dh-q-four8', 'dh-half-two8', 'dh-two8-half']
  ];
  var DOTTEDHALF_LABELS = { 1: 'Quarters', 2: '+ rests', 3: '+ eighths' };
  // Compound DOTTED-EIGHTH beat (6/16) — Hall Ch17
  var DOTTED16_FIGS = [
    { id: 'de-dotted-eighth', name: 'Dotted eighth', beats: 1, vexflow: [{ keys: K, duration: '8', dots: 1 }] },
    { id: 'de-three-16ths', name: 'Three 16ths', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'de-eighth-16th', name: 'Eighth + 16th', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '16' }] },
    { id: 'de-16th-eighth', name: '16th + eighth', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '8' }] },
    { id: 'de-duplet', name: 'Duplet', beats: 1, tuplet: { num_notes: 2, notes_occupied: 3 }, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'de-dotted-eighth-rest', name: 'Dotted-8th rest', beats: 1, vexflow: [{ keys: K, duration: '8r', dots: 1 }] },
    { id: 'de-16rest-16-16', name: '16r 16 16', beats: 1, vexflow: [{ keys: K, duration: '16r' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'de-16-16rest-16', name: '16 16r 16', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16r' }, { keys: K, duration: '16' }] },
    { id: 'de-16-16-16rest', name: '16 16 16r', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16r' }] },
    { id: 'de-eighth-16rest', name: 'Eighth + 16r', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '16r' }] },
    { id: 'de-16rest-eighth', name: '16r + eighth', beats: 1, vexflow: [{ keys: K, duration: '16r' }, { keys: K, duration: '8' }] },
    { id: 'de-six-32nds', name: 'Six 32nds', beats: 1, vexflow: [{ keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }] },
    { id: 'de-two32-16-16', name: '2-32 16 16', beats: 1, vexflow: [{ keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'de-16-two32-16', name: '16 2-32 16', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '16' }] },
    { id: 'de-16-16-two32', name: '16 16 2-32', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }] },
    { id: 'de-four32-16', name: '4-32 16', beats: 1, vexflow: [{ keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '16' }] },
    { id: 'de-16-four32', name: '16 4-32', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }] },
    { id: 'de-eighth-two32', name: 'Eighth + 2-32', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }] },
    { id: 'de-two32-eighth', name: '2-32 + eighth', beats: 1, vexflow: [{ keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '8' }] }
  ];
  var DOTTED16_STEPS = [
    ['de-dotted-eighth', 'de-three-16ths', 'de-eighth-16th', 'de-16th-eighth', 'de-duplet'],
    ['de-dotted-eighth-rest', 'de-16rest-16-16', 'de-16-16rest-16', 'de-16-16-16rest', 'de-eighth-16rest', 'de-16rest-eighth'],
    ['de-six-32nds', 'de-two32-16-16', 'de-16-two32-16', 'de-16-16-two32', 'de-four32-16', 'de-16-four32', 'de-eighth-two32', 'de-two32-eighth']
  ];
  var DOTTED16_LABELS = { 1: 'Sixteenths', 2: '+ rests', 3: '+ 32nds' };
  // Simple quarter-beat TUPLETS (5/6/7 in a beat) — Hall Ch26. Equal notes fill
  // the beat; the bracket is baked into the art. Live in the simple 'medium' set.
  var TUPLET_FIGS = [
    { id: 'tpl-quintuplet', name: 'Quintuplet', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'tpl-sextuplet', name: 'Sextuplet', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
    { id: 'tpl-septuplet', name: 'Septuplet', beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] }
  ];
  // Tuplets become the simple family's top tier (Hall Ch26).
  L_STEPS.push(['tpl-quintuplet', 'tpl-sextuplet', 'tpl-septuplet']);
  LEVEL_LABELS[8] = '+ tuplets (5/6/7)';
  LEVELS[8] = LEVELS[7].concat(['tpl-quintuplet', 'tpl-sextuplet', 'tpl-septuplet']);

  /* Beat-unit FAMILIES: figure array to register, cumulative tiers, tier labels,
     the rhythmPatterns key the engine looks them up under, and the "all" label. */
  var FAMILIES = {
    'quarter':        { key: 'medium',     figs: null,             steps: L_STEPS,          labels: LEVEL_LABELS,     classic: 'Classic (all figures)' },
    'half':           { key: 'halfbeat',   figs: HALF_FIGS,        steps: HALF_STEPS,       labels: HALF_LABELS,      classic: 'All figures' },
    'dotted-quarter': { key: 'compound',   figs: COMPOUND_FIGS,    steps: CMP_STEPS,        labels: CMP_LABELS,       classic: 'All figures' },
    'dotted-half':    { key: 'dottedhalf', figs: DOTTEDHALF_FIGS,  steps: DOTTEDHALF_STEPS, labels: DOTTEDHALF_LABELS, classic: 'All figures' },
    'dotted-eighth':  { key: 'dotted16',   figs: DOTTED16_FIGS,    steps: DOTTED16_STEPS,   labels: DOTTED16_LABELS,  classic: 'All figures' }
  };
  // CMP_LABELS were "6/8 · …"; make them meter-neutral now they serve 6/8·9/8·12/8.
  CMP_LABELS[1] = 'Eighths'; CMP_LABELS[2] = '+ rests'; CMP_LABELS[3] = '+ sixteenths';
  /* Selectable METERS — time signature -> family + beat count + simple/compound.
     Rule: 6/9/12 on top = compound (beat = dotted note, count = top/3). */
  var METERS = [
    { ts: '2/4', meter: 'simple', beats: 2, family: 'quarter', desc: '2 quarter beats' },
    { ts: '3/4', meter: 'simple', beats: 3, family: 'quarter', desc: '3 quarter beats' },
    { ts: '4/4', meter: 'simple', beats: 4, family: 'quarter', desc: '4 quarter beats' },
    { ts: '2/2', meter: 'simple', beats: 2, family: 'half', desc: '2 half-note beats' },
    { ts: '3/2', meter: 'simple', beats: 3, family: 'half', desc: '3 half-note beats' },
    { ts: '6/8', meter: 'compound', beats: 2, family: 'dotted-quarter', desc: '2 dotted-quarter beats' },
    { ts: '9/8', meter: 'compound', beats: 3, family: 'dotted-quarter', desc: '3 dotted-quarter beats' },
    { ts: '12/8', meter: 'compound', beats: 4, family: 'dotted-quarter', desc: '4 dotted-quarter beats' },
    { ts: '6/4', meter: 'compound', beats: 2, family: 'dotted-half', desc: '2 dotted-half beats' },
    { ts: '6/16', meter: 'compound', beats: 2, family: 'dotted-eighth', desc: '2 dotted-eighth beats' }
  ];
  var METER_BY_TS = {}; METERS.forEach(function (m) { METER_BY_TS[m.ts] = m; });
  function curFamily() { return FAMILIES[S.family] || FAMILIES.quarter; }
  function setMeter(ts) {
    var m = METER_BY_TS[ts]; if (!m) return;
    var familyChanged = (S.family !== m.family);
    S.ts = ts; S.meter = m.meter; S.beatsPerMeasure = m.beats; S.family = m.family;
    if (familyChanged) S.level = 'all';                       // new beat unit -> full vocabulary
    else if (S.level !== 'all' && S.level > curFamily().steps.length) S.level = 'all';
  }

  function levelIds() {
    // GUIDED mode: the figure vocabulary comes from the ladder level (core/curriculum
    // Level.figures), NOT the free-play tier system. This is the one seam where the
    // guided spine overrides the figure pool; everything downstream (patternsFor,
    // filterBank) reads levelIds() so it flows through unchanged.
    if (S.guided && S.guidedFigures) return S.guidedFigures.slice();
    // FREE-PLAY custom set (casual menu): use exactly the figures the student selected.
    if (!S.guided && S.freeFigures && S.freeFigures.length) return S.freeFigures.slice();
    if (S.level === 'all') return null;                       // every figure in the family
    var steps = curFamily().steps, acc = [], i;
    for (i = 0; i < S.level && i < steps.length; i++) acc = acc.concat(steps[i]);
    return acc;
  }

  /* ==========================================================================
     GUIDED-LEVEL SPINE
     --------------------------------------------------------------------------
     Wires the tested core/ engine (window.LevelCore) into the live game:
       - PROGRESSION is the matched 31-level ladder (ladderForMode), one position
         per Hall chapter, the SAME ladder for dictation and tapping.
       - Within a level the student ramps 2 -> 4 -> 8 measures; passing a level is
         ONE clean 8-measure example at the groove threshold (the per-beat groove
         the game already computes). core/grading.js is the all-or-nothing
         reference; here the live game's own beat-accurate check IS that grade.
       - MASTERY uses core/mastery.js (recordAnswer +20/-30, 50/80/95 bands, the
         Mastered gate). Per level + per game, persisted in localStorage.
       - On pass -> advance to the next ladder level.
     This block owns NONE of the gameplay (generateTarget, scoring, the staff) —
     it only chooses WHICH level's vocabulary/meter to play and records mastery.

     CLEAN SEAMS deliberately left for sibling agents (NOT built here):
       - TEACH/DEMO screen before a new level: GUIDE.maybeTeach() is the single
         hook; it reads window.TEACH_CONTENT (authored elsewhere) and is a no-op
         until that exists. Wire a teach overlay there.
       - PLACEMENT quiz (core/placement.js): GUIDE could seed guidedIdx from a
         placement result instead of always starting at ch1 — call site noted in
         GUIDE.load().
       - SPACED REVIEW (core/review.js): the mastery items persisted here are the
         exact inputs core/review.js consumes; a review session would schedule
         across levels. Not scheduled now.
     ========================================================================== */
  var GUIDE = (function () {
    var GROOVE_PASS = 80;          // groove threshold for a capstone pass (matches mastery ADVANCE_CAPSTONE_PASS 0.8)
    var CAPSTONE_BARS = 8;         // a clean 8-measure example passes the level
    var RAMP = [2, 4, 8];          // the within-level measure ramp
    // ADVANCEMENT GATE (replaces the old one-clean-capstone shortcut): to master a
    // level you must (1) reach the PROFICIENT mastery band, (2) turn in a clean
    // capstone, (3) hold a short clean STREAK (so one lucky capstone can't pass you),
    // and — for single-line TAPPING — (4) clear the capstone in BOTH hand orientations.
    // Reps emerge naturally from needing band-80 (+20 clean / -30 miss). True MASTERED
    // (95 + multi-session spacing) stays a retention badge, not an advancement gate.
    var PROFICIENT_FLOOR = 80;     // mastery score needed to advance (core/mastery Proficient band)
    var STREAK_TO_PASS = 2;        // consecutive clean rounds required at the moment of the capstone pass
    // Per-game persisted progress: ladder index, per-level mastery item state, the
    // set of mastered level ids, and the current session start (for the Mastered
    // spacing gate). Keyed by mode so dictation and tapping progress independently
    // while walking the SAME matched ladder.
    var data = null;               // { idx, items:{levelId:ItemState}, mastered:[], sessionStart, teach:{levelId:TeachState} }
    /* Per-level TEACH state (drives the warm-up / escalation screens). Persisted so a
       remembered skip survives a reload; the struggle counters are session-runtime but
       harmlessly persisted too (they only ever escalate help, never gate play).
         seenQuick   — the quick warm-up has been shown (or skipped) for this level once.
         skipped     — the student skipped this level's warm-up (don't re-show it unless
                       escalation fires).
         escalated   — the fuller escalation lesson has fired for this level (back off:
                       don't nag it again).
         rampFails   — consecutive WRONG rounds at the current ramp bar-count (resets on
                       any correct round or a ramp change). 2 in a row at the same step
                       is one escalation trigger.
         rampAt      — the ramp bar-count rampFails is counting at (detect a step change).
         figMiss     — { figureId: consecutiveMisses } for the level's NEW figures; a new
                       figure missed twice running is one escalation trigger. */
    function freshTeach() { return { seenQuick: false, skipped: false, escalated: false, rampFails: 0, rampAt: 0, figMiss: {}, cleanStreak: 0 }; }
    function key() { return 'beatquest-guided-' + (S.mode || 'dictation'); }
    function core() { return window.LevelCore || null; }
    function avail() { return !!(core() && core().ladder && core().mastery); }
    function ladder() { return core().ladder.ladderForMode(S.mode === 'tapping' ? 'tapping' : 'dictation'); }

    function load() {
      var d = null;
      try { d = JSON.parse(localStorage.getItem(key()) || 'null'); } catch (e) { d = null; }
      if (!d || typeof d !== 'object') d = {};
      data = {
        idx: (typeof d.idx === 'number' && d.idx >= 0) ? d.idx : 0,
        items: (d.items && typeof d.items === 'object') ? d.items : {},
        mastered: Array.isArray(d.mastered) ? d.mastered : [],
        teach: (d.teach && typeof d.teach === 'object') ? d.teach : {},
        // { levelId: ['BL','BR'] } — which hand orientations have cleared a clean
        // capstone for a level (tapping hand-swap gate). Cleared when the level is mastered.
        capstoneOrients: (d.capstoneOrients && typeof d.capstoneOrients === 'object') ? d.capstoneOrients : {},
        // One stable session start per browser session for the Mastered spacing gate.
        sessionStart: Date.now()
      };
      // SEAM (placement): a placement-quiz result would set data.idx here instead of
      // defaulting to 0. core/placement.js produces exactly the profile this reads.
      var lad = ladder();
      if (data.idx >= lad.length) data.idx = lad.length - 1;
      S.guidedIdx = data.idx;
    }
    function persist() {
      try {
        localStorage.setItem(key(), JSON.stringify({
          idx: data.idx, items: data.items, mastered: data.mastered, teach: data.teach,
          capstoneOrients: data.capstoneOrients
        }));
      } catch (e) {}
    }

    function curLevel() { return ladder()[data.idx]; }
    function levelCount() { return ladder().length; }
    function itemFor(levelId) {
      if (!data.items[levelId]) data.items[levelId] = core().mastery.createItemState();
      return data.items[levelId];
    }
    function teachFor(levelId) {
      if (!data.teach[levelId]) data.teach[levelId] = freshTeach();
      var t = data.teach[levelId];
      // Back-compat / shape guard for older persisted blobs.
      if (typeof t.seenQuick !== 'boolean') t.seenQuick = false;
      if (typeof t.skipped !== 'boolean') t.skipped = false;
      if (typeof t.escalated !== 'boolean') t.escalated = false;
      if (typeof t.rampFails !== 'number') t.rampFails = 0;
      if (typeof t.rampAt !== 'number') t.rampAt = 0;
      if (!t.figMiss || typeof t.figMiss !== 'object') t.figMiss = {};
      return t;
    }

    // Is a ladder level playable with TODAY's generator+bank? (buildStatus 'ready'
    // AND it has generatable figures). Non-playable chapters still occupy the matched
    // spine (so both ladders stay 31 long, in lock-step) but can't be generated yet —
    // they are the teach/engine seams for sibling agents.
    function playable(level) {
      return level && level.buildStatus === 'ready' && level.figures && level.figures.length > 0;
    }

    // Map a ladder Level's beat unit -> the app's FAMILIES key + a representative
    // time signature its generator/bank understand.
    function familyForBeatUnit(bu) {
      switch (bu) {
        case 'quarter': return 'quarter';
        case 'half': return 'half';
        case 'dotted-quarter': return 'dotted-quarter';
        case 'dotted-half': return 'dotted-half';
        case 'dotted-eighth': return 'dotted-eighth';
        default: return null;   // eighth / mixed / none -> not yet playable here
      }
    }

    // Apply the current ladder level to the live game state: meter, family, the
    // figure allowlist, and reset the ramp. Returns false if the level isn't
    // playable today (caller shows the teach/locked state instead).
    function applyLevel() {
      var level = curLevel();
      if (!playable(level)) return false;
      var fam = familyForBeatUnit(level.beatUnit);
      if (!fam || !FAMILIES[fam]) return false;
      // Pick a representative time signature the app supports for this family.
      var ts = (level.meter.timeSignatures || []).filter(function (t) { return METER_BY_TS[t]; })[0];
      if (!ts) {
        // Fall back to the family's first registered meter (e.g. 9/8/12/8 -> 6/8 bank).
        var fm = METERS.filter(function (m) { return m.family === fam; })[0];
        ts = fm ? fm.ts : '4/4';
      }
      S.changing = false;
      setMeter(ts);                          // sets S.ts / S.family / S.meter / beats
      S.family = fam; S.ts = ts;
      var mt = METER_BY_TS[ts];
      if (mt) { S.meter = mt.meter; S.beatsPerMeasure = mt.beats; }
      // The ladder level's figure-bank ids are the active vocabulary. Intersect with
      // what the family's bank actually registers, so a stray id can't empty the pool.
      var bankIds = ((rs && rs.rhythmPatterns && rs.rhythmPatterns[FAMILIES[fam].key]) || []).map(function (p) { return p.id; });
      var figs = level.figures.filter(function (id) { return bankIds.indexOf(id) !== -1; });
      S.guidedFigures = figs.length ? figs : null;   // null -> family's full set (safety)
      S.level = 'all';                        // free-play tier is bypassed in guided mode
      // Ramp restart for this level: start at 2 bars.
      S.ramp = RAMP[0]; S.measures = RAMP[0];
      return true;
    }

    // The current ramp step's measure count for this level. Once the student is at
    // the capstone bar count (8), they stay there until they pass.
    function rampBars() { return S.ramp; }
    function advanceRamp() {
      var i = RAMP.indexOf(S.ramp);
      if (i >= 0 && i < RAMP.length - 1) { S.ramp = RAMP[i + 1]; }
      S.measures = S.ramp;
    }
    function atCapstone() { return S.ramp >= CAPSTONE_BARS; }

    // Record one graded answer against the current level's mastery item, then
    // decide ramp/advance. `correct` = the round was answered correctly at all;
    // `clean` = correct with no mistakes/hints (a first-try clean run). `groovePct`
    // = the per-beat groove/accuracy (0..100) the game computed for this answer.
    // `meta` (optional) = { wrongFigures:[figureId,…] } — the NEW-figure ids the
    // student got wrong this round, used to detect a repeatedly-missed new figure.
    // Returns { advanced, leveledUp, mastery } for the caller to surface.
    function recordRound(correct, clean, groovePct, meta) {
      if (!avail()) return { advanced: false, leveledUp: false };
      var level = curLevel();
      var now = Date.now();
      var item = itemFor(level.id);
      // Mastery: a round counts "correct" for the meter when it was answered correctly.
      data.items[level.id] = core().mastery.recordAnswer(item, !!correct, { now: now, sessionStart: data.sessionStart });

      // ---- STRUGGLE BOOKKEEPING (feeds the escalation trigger; never gates play) ----
      var tch = teachFor(level.id);
      // 1) Consecutive wrong rounds at the SAME ramp bar-count. A ramp change (or any
      //    correct round) resets the streak; two running fails at one step escalates.
      if (tch.rampAt !== S.ramp) { tch.rampAt = S.ramp; tch.rampFails = 0; tch.rampCleans = 0; tch.rampSingles = 0; }
      if (correct) { tch.rampFails = 0; }
      else { tch.rampFails += 1; }
      // 2) Per-NEW-figure consecutive misses. Only the figures THIS level introduces
      //    matter (the new principle); a new figure missed twice running escalates.
      var newFigs = (level.newSkills || []).filter(function (id) { return (level.figures || []).indexOf(id) !== -1; });
      var wrongFigs = (meta && Array.isArray(meta.wrongFigures)) ? meta.wrongFigures : [];
      newFigs.forEach(function (id) {
        if (correct) { tch.figMiss[id] = 0; }
        else if (wrongFigs.indexOf(id) !== -1) { tch.figMiss[id] = (tch.figMiss[id] || 0) + 1; }
      });

      // Clean STREAK for the gate: consecutive clean+correct rounds (a miss breaks it).
      if (clean && correct) tch.cleanStreak = (tch.cleanStreak || 0) + 1;
      else tch.cleanStreak = 0;

      // RAMP EFFICIENCY counters (reset above when the ramp bar-count changes). A clean
      // round accrues one clean; a SINGLE-LISTEN clean also accrues a "single". These drive
      // the fast-track ramp below: 2-bar needs 2 single-listen cleans (or 3 normal cleans)
      // to climb; 4-bar needs 1 single-listen (or 2 normal). Efficiency = fewer rounds up.
      if (clean && correct) {
        tch.rampCleans = (tch.rampCleans || 0) + 1;
        if (meta && meta.singleListen) tch.rampSingles = (tch.rampSingles || 0) + 1;
      }

      var leveledUp = false, advanced = false, rampedFrom = S.ramp, rampedTo = S.ramp;
      var capstonePassed = false;   // did the FULL advancement gate open this round?
      var needOtherHand = false;    // tapping: cleared ONE orientation, the other still owed
      // A clean capstone ATTEMPT this round: at capstone bars, correct, clean, groove ok.
      var capstoneClean = correct && clean && atCapstone() && S.measures >= CAPSTONE_BARS && groovePct >= GROOVE_PASS;
      if (capstoneClean) {
        // Hand-swap gate (single-line TAPPING only): record this round's orientation;
        // both 'BL' and 'BR' must have cleared a clean capstone before the level passes.
        var bothHands = true;
        if (S.mode === 'tapping') {
          var set = data.capstoneOrients[level.id] || (data.capstoneOrients[level.id] = []);
          var o = (S.tapOrient === 'BR') ? 'BR' : 'BL';
          if (set.indexOf(o) === -1) set.push(o);
          bothHands = set.indexOf('BL') !== -1 && set.indexOf('BR') !== -1;
          needOtherHand = !bothHands;
        }
        var score = (data.items[level.id] && data.items[level.id].score) || 0;
        // -0.5 epsilon: time-decay nudges an exact 4×(+20) to 79.9999, which would
        // otherwise cost a needless 5th clean round. The band is still ~Proficient.
        var proficient = score >= PROFICIENT_FLOOR - 0.5;   // reached the Proficient band
        var streakOk = (tch.cleanStreak || 0) >= STREAK_TO_PASS;
        if (proficient && streakOk && bothHands) {
          capstonePassed = true; needOtherHand = false;
          if (data.mastered.indexOf(level.id) === -1) data.mastered.push(level.id);
          delete data.capstoneOrients[level.id];            // reset (in case of replay)
          // Advance to the next PLAYABLE level (skip not-yet-built chapters but keep the
          // matched index so dictation/tapping stay on the same chapter sequence).
          var lad = ladder();
          var next = data.idx;
          for (var n = data.idx + 1; n < lad.length; n++) { next = n; if (playable(lad[n])) break; }
          if (next !== data.idx) { data.idx = next; S.guidedIdx = next; leveledUp = true; }
          advanced = true;
          applyLevel();   // re-point vocabulary/meter at the (new) current level, ramp->2
          rampedTo = S.ramp;
        }
        // else: gate not fully open yet -> stay at capstone, keep accruing band/streak/hands.
      } else if (clean && correct && !atCapstone()) {
        // Clean but not yet at capstone bars -> climb the 2->4->8 ramp. Efficiency decides
        // HOW FAST: a run of SINGLE-LISTEN cleans promotes in the fewest rounds (2-bar needs
        // 2, 4-bar needs 1); otherwise the student climbs at the normal, more-thorough pace
        // (2-bar needs 3 cleans, 4-bar needs 2). Owner design: no 2->8 skip — every length
        // gets touched; nailing it in one listen just means fewer reps at that length.
        var singles = tch.rampSingles || 0, cleans = tch.rampCleans || 0;
        var fastOk = (S.ramp <= 2) ? (singles >= 2) : (singles >= 1);
        var normOk = (S.ramp <= 2) ? (cleans >= 3) : (cleans >= 2);
        if (fastOk || normOk) { advanceRamp(); rampedTo = S.ramp; }
      }
      persist();
      return { advanced: advanced, leveledUp: leveledUp, capstonePassed: capstonePassed,
               rampedUp: rampedTo > rampedFrom && !capstonePassed, rampBars: rampedTo,
               needOtherHand: needOtherHand,
               masteryScore: (data.items[level.id] && data.items[level.id].score) || 0 };
    }

    /* TEACH DECISION (functional core of the adaptive teach system) — decides what,
       if anything, to show before the current level's next round. Returns
         { mode: 'quick' | 'escalation' | null, level, content, struggle }
       Rule (per TEACH_SCREENS_PLAN.md):
         - QUICK warm-up is the DEFAULT the FIRST time at a new level (not yet seen,
           not skipped). ~10–15s, always skippable.
         - ESCALATION (the fuller I-do/we-do/you-do lesson) fires ONLY when the student
           is struggling with the principle AND it has not already fired for this level
           (back off after firing — no nagging). Struggle = ANY of:
             • two consecutive WRONG rounds at the same ramp step, OR
             • mastery still below the Attempted band (score < 50) after ≥3 attempts, OR
             • a NEW figure missed twice in a row.
         - Otherwise: nothing (replays / already-seen levels just play).
       Escalation OUTRANKS the quick warm-up (a struggling student gets the fuller help
       even if they skipped the quick one). PURE w.r.t. the DOM — the overlay shell reads
       this and renders; it never decides policy itself. */
    function ATTEMPTED() { return core().mastery.LEVELS.ATTEMPTED; }
    function teachContentFor(levelId) {
      return (window.TEACH_CONTENT && window.TEACH_CONTENT[levelId]) || null;
    }
    function isStruggling(level, tch) {
      if (tch.rampFails >= 2) return 'ramp';   // failed the same ramp step twice running
      var view = core().mastery.viewItemAsOf(itemFor(level.id), Date.now());
      if (view.attempts >= 3 && view.level === ATTEMPTED()) return 'mastery';  // stuck below Attempted
      for (var id in tch.figMiss) { if (tch.figMiss[id] >= 2) return 'figure'; }  // a new figure missed repeatedly
      return null;
    }
    function teachDecision() {
      if (!avail() || !window.TEACH_CONTENT) return { mode: null };
      var level = curLevel();
      if (!level || !playable(level)) return { mode: null };
      var content = teachContentFor(level.id);
      if (!content) return { mode: null };
      var tch = teachFor(level.id);
      var struggle = isStruggling(level, tch);
      if (struggle && !tch.escalated) {
        return { mode: 'escalation', level: level, content: content, struggle: struggle };
      }
      if (!tch.seenQuick && !tch.skipped) {
        return { mode: 'quick', level: level, content: content, struggle: null };
      }
      return { mode: null, level: level, content: content };
    }
    // ---- teach-state mutators the overlay shell calls ----
    function markQuickShown() { var t = teachFor(curLevel().id); t.seenQuick = true; persist(); }
    function markSkipped() { var t = teachFor(curLevel().id); t.seenQuick = true; t.skipped = true; persist(); }
    function markEscalated() {
      // The fuller lesson has fired — back off. Also clear the struggle counters so the
      // SAME level doesn't immediately re-trigger on the next round (no nagging).
      var t = teachFor(curLevel().id);
      t.escalated = true; t.rampFails = 0; t.figMiss = {};
      persist();
    }

    /* maybeTeach() — the single seam newRound() calls. The OVERLAY (imperative shell)
       registers a renderer via GUIDE.registerTeacher(fn); maybeTeach hands it the
       decision and returns true iff a screen was shown (so the caller can defer the
       round behind the overlay's Start/Skip). No renderer registered (or nothing to
       show) -> returns false and the round proceeds immediately. */
    var teacher = null;
    function registerTeacher(fn) { teacher = fn; }
    function maybeTeach() {
      var d = teachDecision();
      if (!d || !d.mode || !teacher) return false;
      return teacher(d) === true;
    }

    // ---- mastery-meter VIEW (per-theme, NO emoji) ----
    // A small labelled bar showing the current level's mastery band + score. Colors
    // are per-theme via CSS vars with neutral fallbacks (see injectStyle additions).
    function masteryView() {
      if (!avail()) return null;
      var level = curLevel();
      var item = data.items[level.id] || core().mastery.createItemState();
      var view = core().mastery.viewItemAsOf(item, Date.now());   // decay-applied snapshot
      var band = view.level;                                       // attempted|familiar|proficient|mastered
      var score = Math.round(view.score);
      return { levelId: level.id, hallChapter: level.hallChapter, title: level.title,
               band: band, score: score, idx: data.idx, count: levelCount(),
               mastered: data.mastered.indexOf(level.id) !== -1 };
    }

    // Hand-swap forcing: at the capstone, once ONE orientation has cleared, force the
    // OTHER one on the next round so the student can't finish a level one-handed.
    // Returns 'BL'/'BR' to force, or null to let the caller alternate freely.
    function neededOrient() {
      if (!avail() || S.mode !== 'tapping') return null;
      if (!atCapstone()) return null;
      var level = curLevel();
      var set = (data.capstoneOrients && data.capstoneOrients[level.id]) || [];
      if (set.length === 1) return set[0] === 'BL' ? 'BR' : 'BL';
      return null;
    }

    return {
      avail: avail, load: load, persist: persist,
      curLevel: curLevel, levelCount: levelCount, ladder: ladder,
      applyLevel: applyLevel, playable: playable,
      rampBars: rampBars, atCapstone: atCapstone, neededOrient: neededOrient,
      recordRound: recordRound, masteryView: masteryView, maybeTeach: maybeTeach,
      // teach system
      teachDecision: teachDecision, registerTeacher: registerTeacher,
      markQuickShown: markQuickShown, markSkipped: markSkipped, markEscalated: markEscalated,
      // for the picker UI
      data: function () { return data; },
      gotoIndex: function (i) {
        var lad = ladder();
        if (i < 0 || i >= lad.length) return false;
        if (!playable(lad[i])) return false;
        // Replay/review is allowed for any PASSED (mastered) level, plus the current
        // frontier. Don't let the player skip ahead past unmastered levels.
        var frontier = data.idx;
        var isMastered = data.mastered.indexOf(lad[i].id) !== -1;
        if (i > frontier && !isMastered) return false;
        data.idx = i; S.guidedIdx = i; applyLevel(); persist(); return true;
      },
      /* PLACEMENT result (the seam noted in load()): set the working level with
         no frontier guard and mark everything below proficient-equivalent —
         idempotent, never lowers an existing item. */
      place: function (i, markBelow) {
        if (!avail()) return false;
        var lad = ladder();
        i = Math.max(0, Math.min(i, lad.length - 1));
        if (markBelow) {
          for (var k = 0; k < i; k++) {
            var id = lad[k].id;
            var item = data.items[id] || core().mastery.createItemState();
            if ((item.score || 0) < 85) {
              item = JSON.parse(JSON.stringify(item));
              item.score = 85; item.level = 'proficient';
              data.items[id] = item;
            }
          }
        }
          data.idx = i; S.guidedIdx = i; applyLevel(); persist(); return true;
      }
    };
  })();

  /* ========================================================================
     PLACEMENT TEST (owner spec, both games): a new player self-selects an
     experience tier, takes a QUICK test at that tier's chapter (8 normal
     2-measure dictation rounds, no-fail), and: pass (>=85%) -> the guided
     path STARTS AT that chapter with everything below marked proficient;
     fail -> back up one tier and test again, until the fit is found.
     Mirrors MelodyQuest's flow; grounded in research/LEVEL_SYSTEM_RESEARCH.md §1.
     Entirely additive: nothing here runs unless PLACE.active or the fresh-
     boot offer fires (suppressed under all test seams).
     ======================================================================== */
  var PLACE = {
    active: false, tierIdx: 0, item: 0, correct: 0,
    ITEMS: 8, PASS: 0.85,
    /* Human label for one chapter row: its NEW figures + NEW time signatures —
       generated from the curriculum data itself, never hand-maintained. */
    rowLabel: function (lvl, prevSigs) {
      var human = function (id) { return String(id).replace('concept:', '').replace(/-/g, ' '); };
      var bits = (lvl.newSkills || []).map(human);
      var sigs = (lvl.meters && lvl.meters.timeSignatures) || [];
      var newSigs = sigs.filter(function (ts) { return prevSigs.indexOf(ts) === -1; });
      if (newSigs.length) bits.push(newSigs.join(' · '));
      return lvl.title + (bits.length ? ' — ' + bits.join(', ') : '');
    },
    offer: function () {
      if (document.getElementById('placeOv') || !GUIDE.avail()) return;
      var lad = window.LevelCore.ladder.ladderForMode(S.mode === 'tapping' ? 'tapping' : 'dictation');
      var ov = document.createElement('div');
      ov.id = 'placeOv';
      ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:960;display:flex;align-items:center;justify-content:center;';
      var card = document.createElement('div');
      card.style.cssText = 'max-width:560px;width:calc(100% - 40px);max-height:82vh;overflow:auto;background:#fff;color:#1f2430;border-radius:14px;padding:22px 24px;font-family:inherit;';
      card.innerHTML = '<div style="font-weight:800;font-size:1.2rem;margin-bottom:6px;">What do you already know?</div>' +
        '<div style="opacity:.8;margin-bottom:12px;">Check every rhythm and time signature you can already read and count. A quick 8-question check at that level confirms your fit — you cannot fail; a miss just checks one level down.</div>';
      var prevSigs = [];
      var boxes = [];
      lad.forEach(function (lvl, i) {
        var row = document.createElement('label');
        row.style.cssText = 'display:flex;gap:9px;align-items:flex-start;margin:5px 0;font-size:.92rem;cursor:pointer;';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.style.marginTop = '3px';
        // checking a row checks everything before it; unchecking clears everything after
        cb.onchange = function () {
          boxes.forEach(function (b, k) { if (cb.checked && k <= i) b.checked = true; if (!cb.checked && k >= i) b.checked = false; });
        };
        boxes.push(cb);
        var span = document.createElement('span');
        span.textContent = PLACE.rowLabel(lvl, prevSigs);
        prevSigs = prevSigs.concat(((lvl.meters && lvl.meters.timeSignatures) || []).filter(function (ts) { return prevSigs.indexOf(ts) === -1; }));
        row.appendChild(cb); row.appendChild(span);
        card.appendChild(row);
      });
      var go = document.createElement('button');
      go.textContent = 'Check my level';
      go.style.cssText = 'display:block;width:100%;margin-top:12px;padding:11px 14px;border:2px solid #1f2430;border-radius:9px;background:#1f2430;color:#fff;font-weight:800;cursor:pointer;';
      go.onclick = function () {
        document.body.removeChild(ov);
        // contiguous known-prefix: the last checked row from the start is the fit
        var target = -1;
        for (var k = 0; k < boxes.length; k++) { if (boxes[k].checked) target = k; else break; }
        try { localStorage.setItem(PLACE.flagKey(), '1'); } catch (e) {}
        if (target <= 0) { msg('Starting at the beginning — the early chapters go fast.'); return; }
        PLACE.begin(target);
      };
      card.appendChild(go);
      ov.appendChild(card);
      document.body.appendChild(ov);
    },
    flagKey: function () { return 'beatquest-placed-' + (S.mode || 'dictation'); },
    begin: function (ladderIdx) {
      try { localStorage.setItem(PLACE.flagKey(), '1'); } catch (e) {}
      PLACE.active = true; PLACE.targetIdx = ladderIdx; PLACE.item = 0; PLACE.correct = 0;
      GUIDE.place(ladderIdx, false);
      S.ramp = 2; S.measures = 2;
      newRound();
      msg('Placement check 1 / ' + PLACE.ITEMS + ' — dictate the rhythm as usual.');
    },
    record: function (correct) {
      if (correct) PLACE.correct++;
      PLACE.item++;
      if (PLACE.item < PLACE.ITEMS) {
        msg('Placement check ' + (PLACE.item + 1) + ' / ' + PLACE.ITEMS + (correct ? ' — got it!' : ''));
        setTimeout(function () { S.measures = 2; newRound(); }, 1200);
        return;
      }
      var rate = PLACE.correct / PLACE.ITEMS;
      PLACE.active = false;
      var lad = window.LevelCore.ladder.ladderForMode(S.mode === 'tapping' ? 'tapping' : 'dictation');
      if (rate >= PLACE.PASS) {
        GUIDE.place(PLACE.targetIdx, true);
        msg('Placed! You start at "' + lad[PLACE.targetIdx].title + '" (' + Math.round(rate * 100) + '%). Everything below is unlocked.');
        setTimeout(function () { newRound(); }, 1500);
      } else {
        // back up one tier (3 chapters) and test again — the owner's exact rule.
        var down = Math.max(0, PLACE.targetIdx - 3);
        if (down === 0 || PLACE.targetIdx === 0) {
          GUIDE.place(0, false);
          msg('Starting from the beginning — the early chapters will go fast.');
          setTimeout(function () { newRound(); }, 1500);
        } else {
          msg('Close (' + Math.round(rate * 100) + '%) — checking one level down.');
          setTimeout(function () { PLACE.begin(down); PLACE.active = true; }, 1500);
        }
      }
    }
  };

  /* Inline SVG icons — stroke/fill use currentColor so they inherit each
     theme's text color automatically (no emojis, ever). */
  var IC = {
    play:  '<svg viewBox="0 0 20 20" class="ic ic-fill"><path d="M6 4l11 6-11 6z"/></svg>',
    metro: '<svg viewBox="0 0 20 20" class="ic"><path d="M7.2 17h5.6l-1.3-12H8.5z"/><path d="M10 14l3.6-7.4"/><path d="M6 17h8"/></svg>',
    guide: '<svg viewBox="0 0 20 20" class="ic"><path d="M2 11h3l2-5 3 9 2-6 1.4 2H18"/></svg>',
    search:'<svg viewBox="0 0 20 20" class="ic"><circle cx="9" cy="9" r="5"/><path d="M13 13l4.5 4.5"/></svg>',
    count: '<svg viewBox="0 0 20 20" class="ic"><path d="M5 15V8M10 15V5M15 15v-4"/></svg>',
    filter: '<svg viewBox="0 0 20 20" class="ic"><path d="M2.5 4h15l-6 7.2v4.6l-3 1.6v-6.2z"/></svg>',
    hear: '<svg viewBox="0 0 20 20" class="ic"><path d="M3 8v4h3l4 3V5L6 8z"/><path d="M13.5 7c1.6 1.4 1.6 5.6 0 7"/></svg>',
    check: '<svg viewBox="0 0 20 20" class="ic"><path d="M4 10.5l4 4 8-9"/></svg>',
    next:  '<svg viewBox="0 0 20 20" class="ic ic-fill"><path d="M5 4l8 6-8 6z"/><path d="M14.5 4v12" class="ic-stroke"/></svg>',
    flame: '<svg viewBox="0 0 20 20" class="ic ic-fill ic-sm"><path d="M10 2c1.1 3 4 4.2 4 8a4 4 0 11-8 0c0-2.2 1.1-3.2 2-4.2.2 1.2 1 2 2 2.2.3-2.4-2-3.6-2-8z"/></svg>',
    gear:  '<svg viewBox="0 0 20 20" class="ic"><circle cx="10" cy="10" r="2.6"/><path d="M10 2.5v2.2M10 15.3v2.2M2.5 10h2.2M15.3 10h2.2M4.8 4.8l1.6 1.6M13.6 13.6l1.6 1.6M15.2 4.8l-1.6 1.6M6.4 13.6l-1.6 1.6"/></svg>',
    bulb:  '<svg viewBox="0 0 20 20" class="ic"><path d="M7 13.5a5 5 0 1 1 6 0c-.7.5-1 1.2-1 2H8c0-.8-.3-1.5-1-2z"/><path d="M8 17.5h4"/></svg>',
    palette: '<svg viewBox="0 0 20 20" class="ic"><path d="M10 2.6a7.4 7.4 0 1 0 0 14.8c1.3 0 1.7-1.6.8-2.5-.7-.7-.2-1.8.8-1.8H14a3.4 3.4 0 0 0 3.4-3.5C17.4 5.6 14.1 2.6 10 2.6z"/><circle cx="6.6" cy="9.2" r="1"/><circle cx="9" cy="6.2" r="1"/><circle cx="12.8" cy="7.4" r="1"/></svg>',
    // hand/finger tapping a surface — the "Tap it back" performance mode
    tap:   '<svg viewBox="0 0 20 20" class="ic"><path d="M9 9V4.4a1.3 1.3 0 0 1 2.6 0V9"/><path d="M11.6 9V7.6a1.2 1.2 0 0 1 2.4 0V9"/><path d="M14 9V8a1.2 1.2 0 0 1 2.4 0v3.2a4.6 4.6 0 0 1-4.6 4.6h-1.2a4 4 0 0 1-3-1.4l-2.3-2.7a1.3 1.3 0 0 1 1.9-1.7L9 11.4V9"/></svg>',
    close: '<svg viewBox="0 0 20 20" class="ic"><path d="M5 5l10 10M15 5L5 15"/></svg>',
    redo:  '<svg viewBox="0 0 20 20" class="ic"><path d="M15 6a6 6 0 1 0 1.5 4"/><path d="M16 3v3.5h-3.5"/></svg>',
    mute:  '<svg viewBox="0 0 20 20" class="ic"><path d="M3 8v4h3l4 3V5L6 8z"/><path d="M14 8l4 4M18 8l-4 4"/></svg>',
    sound: '<svg viewBox="0 0 20 20" class="ic"><path d="M3 8v4h3l4 3V5L6 8z"/><path d="M13.5 7c1.6 1.4 1.6 5.6 0 7"/><path d="M16 5c2.7 2.4 2.7 8.6 0 11"/></svg>',
    home:  '<svg viewBox="0 0 20 20" class="ic"><path d="M3 9l7-6 7 6"/><path d="M5 8v8h10V8"/><path d="M8 16v-4h4v4"/></svg>',
    bolt:  '<svg viewBox="0 0 20 20" class="ic ic-fill"><path d="M11 2L4 11h4l-1 7 7-9h-4z"/></svg>',
    // vinyl record = "groove" (literal + recognizable); used to label the groove meter
    disc:  '<svg viewBox="0 0 20 20" class="ic"><circle cx="10" cy="10" r="7.6"/><circle cx="10" cy="10" r="2"/></svg>'
  };

  /* TOCK — the KIDS-mode mascot: a metronome-pendulum creature (pendulum "antenna"
     ticks with the beat). Kids theme ONLY (never shown in the mature themes). Two
     poses: `celebrate` (arms up, big laugh, pendulum kicked wide — clean pass) and
     `idle` (calm, gentle). Hand-built inline SVG, NO emoji, per the locked design. */
  var TOCK = {
    celebrate:
      '<svg class="tock" viewBox="0 0 200 220" aria-hidden="true">' +
        '<defs><linearGradient id="tockG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffc98a"/><stop offset="100%" stop-color="#ff9a3f"/></linearGradient></defs>' +
        '<ellipse cx="75" cy="201" rx="14" ry="8" fill="#ffb26b" stroke="#8a4a2b" stroke-width="4"/>' +
        '<ellipse cx="125" cy="201" rx="14" ry="8" fill="#ffb26b" stroke="#8a4a2b" stroke-width="4"/>' +
        '<path d="M100,20 C60,20 35,55 35,95 C35,140 55,175 100,190 C145,175 165,140 165,95 C165,55 140,20 100,20 Z" fill="url(#tockG)" stroke="#8a4a2b" stroke-width="6"/>' +
        '<ellipse cx="30" cy="70" rx="15" ry="22" fill="#ff8c42" stroke="#8a4a2b" stroke-width="5" transform="rotate(-55 30 70)"/>' +
        '<ellipse cx="170" cy="70" rx="15" ry="22" fill="#ff8c42" stroke="#8a4a2b" stroke-width="5" transform="rotate(55 170 70)"/>' +
        '<g class="tock-pend" transform="rotate(22 100 46)"><line x1="100" y1="46" x2="100" y2="4" stroke="#8a4a2b" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="0" r="11" fill="#ffd166" stroke="#8a4a2b" stroke-width="5"/></g>' +
        '<path d="M62,92 Q76,76 90,92" fill="none" stroke="#3a2418" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M100,90 Q116,72 132,90" fill="none" stroke="#3a2418" stroke-width="7" stroke-linecap="round"/>' +
        '<ellipse cx="68" cy="118" rx="9" ry="6" fill="#ff6f6f" opacity=".6"/>' +
        '<ellipse cx="128" cy="115" rx="9" ry="6" fill="#ff6f6f" opacity=".6"/>' +
        '<path d="M78,128 Q100,155 122,128 Q100,148 78,128 Z" fill="#8a4a2b"/>' +
        '<path d="M82,130 Q100,144 118,130 Z" fill="#ffdede"/>' +
      '</svg>',
    idle:
      '<svg class="tock" viewBox="0 0 200 220" aria-hidden="true">' +
        '<defs><linearGradient id="tockGi" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffb26b"/><stop offset="100%" stop-color="#ff8c42"/></linearGradient></defs>' +
        '<ellipse cx="75" cy="201" rx="14" ry="8" fill="#ffb26b" stroke="#8a4a2b" stroke-width="4"/>' +
        '<ellipse cx="125" cy="201" rx="14" ry="8" fill="#ffb26b" stroke="#8a4a2b" stroke-width="4"/>' +
        '<path d="M100,20 C60,20 35,55 35,95 C35,140 55,175 100,190 C145,175 165,140 165,95 C165,55 140,20 100,20 Z" fill="url(#tockGi)" stroke="#8a4a2b" stroke-width="6"/>' +
        '<g class="tock-pend" transform="rotate(0 100 46)"><line x1="100" y1="46" x2="100" y2="4" stroke="#8a4a2b" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="0" r="11" fill="#ffd166" stroke="#8a4a2b" stroke-width="5"/></g>' +
        '<ellipse cx="78" cy="93" rx="15" ry="18" fill="#fff"/><ellipse cx="114" cy="90" rx="17" ry="20" fill="#fff"/>' +
        '<circle cx="81" cy="97" r="7" fill="#3a2418"/><circle cx="118" cy="93" r="8" fill="#3a2418"/>' +
        '<ellipse cx="70" cy="118" rx="8" ry="5" fill="#ff6f6f" opacity=".5"/><ellipse cx="128" cy="115" rx="8" ry="5" fill="#ff6f6f" opacity=".5"/>' +
        '<path d="M86,132 Q100,142 116,130" fill="none" stroke="#8a4a2b" stroke-width="5" stroke-linecap="round"/>' +
      '</svg>'
  };

  /* --------------------------------------------------------- persistence */
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem('beatquest-solo') || '{}');
      if (typeof d.score === 'number') S.score = d.score;
      if (typeof d.streak === 'number') S.streak = d.streak;
      if (typeof d.bonus === 'number') S.bonus = d.bonus;
      if (typeof d.correctionMode === 'boolean') S.correctionMode = d.correctionMode;
      if (typeof d.metronome === 'boolean') S.metronome = d.metronome;
      if (typeof d.beatGuide === 'boolean') S.beatGuide = d.beatGuide;
      if (typeof d.quiet === 'boolean') S.quiet = d.quiet;
      if (typeof d.keyBeat === 'string' && d.keyBeat) S.keyBeat = d.keyBeat;
      if (typeof d.keyRhythm === 'string' && d.keyRhythm) S.keyRhythm = d.keyRhythm;
      if (SPEEDS[d.speed]) S.speed = d.speed;
      if (d.measures === 2 || d.measures === 4 || d.measures === 8 || d.measures === 16) S.measures = d.measures;
      // Meter first (sets family/beats), then restore the level within that family.
      if (d.ts && METER_BY_TS[d.ts]) setMeter(d.ts);
      if (d.changing) { S.changing = true; S.changeKind = d.changeKind || 'simple'; S.changePool = CHANGE_POOLS[S.changeKind] || CHANGE_POOLS.simple; S.family = 'quarter'; S.meter = 'simple'; }
      if (d.level === 'all') S.level = 'all';
      else if (typeof d.level === 'number' && d.level >= 1 && d.level <= curFamily().steps.length) S.level = d.level;
      S.tempo = SPEEDS[S.speed] || 100;
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem('beatquest-solo', JSON.stringify({ score: S.score, streak: S.streak, bonus: S.bonus, correctionMode: S.correctionMode, metronome: S.metronome, beatGuide: S.beatGuide, quiet: S.quiet, keyBeat: S.keyBeat, keyRhythm: S.keyRhythm, level: S.level, ts: S.ts, speed: S.speed, measures: S.measures, changing: S.changing, changeKind: S.changeKind })); } catch (e) {}
  }

  /* ----------------------------------------------------- target generation */
  function fullSet() { return (rs.rhythmPatterns && rs.rhythmPatterns[curFamily().key]) || []; }
  function patternsFor() {
    var ids = levelIds(), base = fullSet();
    return ids ? base.filter(function (p) { return ids.indexOf(p.id) !== -1; }) : base;
  }
  // For changing meters: each measure draws from the family its OWN meter implies
  // (simple -> quarter beat, compound -> dotted-quarter beat), so a beat-constant
  // simple<->compound exercise mixes both vocabularies measure by measure.
  function familyForTs(ts) { return isCompoundTs(ts) ? 'dotted-quarter' : 'quarter'; }
  function idsForFamilyLevel(famKey) {
    if (S.level === 'all') return null;
    var steps = (FAMILIES[famKey] || FAMILIES.quarter).steps, acc = [], i, n = Math.min(S.level, steps.length);
    for (i = 0; i < n; i++) acc = acc.concat(steps[i]);
    return acc;
  }
  function patternsForTs(ts) {
    var fk = familyForTs(ts), base = (rs.rhythmPatterns && rs.rhythmPatterns[FAMILIES[fk].key]) || [];
    var ids = (S.changeKind === 'simple') ? idsForFamilyLevel(fk) : null;  // mixing -> full vocab
    var list = ids ? base.filter(function (p) { return ids.indexOf(p.id) !== -1; }) : base;
    // Changing meters are hard enough — the challenge IS reading the meter change.
    // Drop the 5/6/7-tuplets for normal play (they belong in a future super-
    // advanced option).
    return list.filter(function (p) { return String(p.id).indexOf('tpl-') !== 0; });
  }
  // Active families across the current change pool (which vocabularies the bank needs).
  function changeFamilies() {
    var pool = S.changePool || [], set = {}, out = [];
    pool.forEach(function (ts) { set[familyForTs(ts)] = 1; });
    for (var k in set) out.push(k);
    return out;
  }
  // Meter pools for each changing-meter kind.
  var CHANGE_POOLS = {
    simple: ['2/4', '3/4', '4/4'],
    beatconst: ['2/4', '3/4', '4/4', '6/8', '9/8', '12/8']   // simple<->compound, beat constant
  };
  function genMeasure(pats, beats) {
    var res = [], beat = 1, guard = 0, B = beats || bpm();
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
    if (S.changing) {
      // Fresh meter sequence: NEVER repeat the previous measure's meter, so every
      // measure shows its own time sig (genuinely "changing", and unambiguous to
      // count). Each measure is then filled from the family ITS meter implies.
      var pool = (S.changePool && S.changePool.length) ? S.changePool : ['2/4', '3/4', '4/4'];
      S.curMeters = []; var prev = null;
      for (var c = 0; c < S.measures; c++) {
        // Hold the same meter most of the time (~60%) so it changes only every
        // 2-3 bars, closer to how Hall paces it. Measure numbers keep the count
        // clear when a meter spans several bars.
        if (prev && Math.random() < 0.6) { S.curMeters.push(prev); continue; }
        var opts = pool.filter(function (x) { return x !== prev; });
        if (!opts.length) opts = pool;
        prev = opts[Math.floor(Math.random() * opts.length)];
        S.curMeters.push(prev);
      }
      for (var m = 0; m < S.measures; m++) t.push(genMeasure(patternsForTs(S.curMeters[m]), beatsForTs(S.curMeters[m])));
    } else {
      S.curMeters = null;
      for (var m2 = 0; m2 < S.measures; m2++) t.push(genMeasure(pats));
    }
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
  var ALL_SET_KEYS = ['medium', 'compound', 'halfbeat', 'dottedhalf', 'dotted16'];
  function findPattern(id) {
    // search every meter family so any placed/target id resolves (tuplets live in medium)
    var rp = rs.rhythmPatterns || {}, i, j;
    for (i = 0; i < ALL_SET_KEYS.length; i++) {
      var set = rp[ALL_SET_KEYS[i]] || [];
      for (j = 0; j < set.length; j++) if (set[j].id === id) return set[j];
    }
    return null;
  }
  // Hide bank tiles that aren't in the current level's vocabulary (the bank is
  // rebuilt each round by the engine; we filter it cosmetically afterwards).
  // The engine's bank reads rhythmPatterns[difficulty]: a single family normally,
  // 'medium' for changing-simple, the combined 'mixedSC' set for simple<->compound.
  function bankKey() {
    // EXTERNAL-TARGET seam: the bank family is whatever family the converted
    // external target's patterns came from (the student must see draggable tiles
    // that can actually build that target).
    if (EXT.active && (EXT.current || EXT.pending)) return (EXT.current || EXT.pending).bank;
    if (S.changing) return (S.changeKind === 'simple') ? 'medium' : 'mixedSC';
    return curFamily().key;
  }
  function filterBank() {
    // changing-simple keeps the quarter level tier; mixing shows the full combined bank.
    var ids = (S.changing && S.changeKind !== 'simple') ? null : levelIds();
    document.querySelectorAll('.rhythm-tile').forEach(function (t) {
      t.style.display = (!ids || ids.indexOf(t.dataset.patternId) !== -1) ? '' : 'none';
    });
    syncBankPad();
  }
  // The mobile bank is pinned + wraps, so its height grows with the visible tile
  // count. Keep the staff's bottom padding equal to that height so the last row
  // never hides behind it. No-op on desktop.
  function syncBankPad() {
    var mobile = false; try { mobile = window.matchMedia('(pointer: coarse) and (max-width: 1400px)').matches; } catch (e) {}
    var ga = document.getElementById('gameArea'); var bank = document.querySelector('.rhythm-bank');
    var actions = document.getElementById('soloActions');
    if (!ga || !bank) return;
    // Tapping mode hides the bank entirely (no palette), so there is nothing to
    // reserve space for — just clear any padding the dictation layout left behind.
    if (S.mode === 'tapping' || (bank.style.display === 'none')) {
      ga.style.paddingBottom = ''; if (actions) actions.style.bottom = ''; return;
    }
    if (!mobile) {
      ga.style.paddingBottom = '';
      if (actions) actions.style.bottom = '';   // clear the phone-only floating offset
      return;
    }
    var bankTop = bank.getBoundingClientRect().top;
    // BUG 1: float the action row (Submit / Tap-back / Next) directly ABOVE the bank.
    // It is position:fixed on phones (CSS), so set its bottom to the bank's height from
    // the viewport bottom plus a small gap — it then always hugs the bank top regardless
    // of how far the staff has scrolled. (Only the phone breakpoint fixes it; on iPad it
    // stays in flow and this offset is harmless because the CSS there isn't fixed.)
    var phone = false; try { phone = window.matchMedia('(pointer: coarse) and (max-height: 500px)').matches; } catch (e) {}
    var actionsH = 0;
    if (actions && phone && actions.style.display !== 'none') {
      var aboveBank = Math.max(0, Math.round(window.innerHeight - bankTop + 6));
      actions.style.bottom = aboveBank + 'px';
      // Only count toward staff padding when buttons are actually visible.
      var anyBtn = actions.querySelector('button:not([style*="display: none"]):not([style*="display:none"])');
      if (anyBtn) actionsH = actions.getBoundingClientRect().height + 8;
    }
    // Reserve everything from the (floating) bank's top down to the viewport bottom PLUS
    // the floating action row, so the last staff row clears the bank, the action row,
    // and the gaps between them.
    ga.style.paddingBottom = Math.max(0, Math.round(window.innerHeight - bankTop + 8 + actionsH)) + 'px';
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
  // Unlock/resume the AudioContext inside a user gesture (mobile Safari starts it
  // suspended; scheduling against a not-yet-running clock can fire a sound early).
  function unlockAudio() {
    var c = ctx(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    try { var s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0); } catch (e) {}
  }
  var scheduledOscs = [];   // all currently-scheduled oscillators, so we can cancel playback
  function tone(freq, when, dur, type, gain) {
    var c = ctx(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(c.destination);
    o.start(when); o.stop(when + dur + 0.03);
    scheduledOscs.push(o);
    o.onended = function () { var i = scheduledOscs.indexOf(o); if (i !== -1) scheduledOscs.splice(i, 1); };
  }
  // Cancel any in-flight or upcoming sound (kills overlapping playbacks).
  function stopAllAudio() {
    scheduledOscs.forEach(function (o) { try { o.stop(); } catch (e) {} try { o.disconnect(); } catch (e) {} });
    scheduledOscs = [];
  }
  // Full stop: the count-in/metronome scheduler AND all scheduled sound. Also tears
  // down the tap-back metronome loop — it is one of "all audio scheduling", so any
  // path that fully stops playback (Play pressed, new round, stop-all) must silence
  // it too. tbStopMetro is hoisted (function decl) and idempotent, so this is safe to
  // call before the overlay ever opens. The tap-back metro and the game pulse are
  // mutually exclusive clocks; stopPlayback guarantees neither is left running.
  function stopPlayback() {
    stopPulse(); stopAllAudio(); tbStopMetro();
    S.playing = false;
    if (S._playTimer) { clearTimeout(S._playTimer); S._playTimer = null; }
  }
  function metroTick(when, accent) { if (!S.quiet) tone(accent ? 2300 : 1550, when, 0.035, 'sine', accent ? 0.32 : 0.2); }
  function subTick(when) { if (!S.quiet) tone(1500, when, 0.022, 'sine', 0.08); }
  // Warm marimba-ish pluck whose RING LENGTH scales with the note's duration, so a
  // half note is audibly held longer than a quarter (durSec omitted -> short tap hit).
  function rhythmHit(when, durSec) {
    if (S.quiet) return;
    var d = durSec || 0.14;
    var ring = Math.max(0.10, Math.min(1.1, d * 0.92));
    tone(523.25, when, ring, 'sine', 0.4);                    // fundamental (C5), soft
    tone(1046.5, when, Math.min(ring, 0.13), 'sine', 0.09);   // octave ping for a clear attack
  }
  // Visual beat flash (quiet mode substitute for the metronome click). A full-width
  // bar fixed at the top of the viewport pulses on every beat — visible in peripheral
  // vision. No-op when sound is on.
  function flashBeat(when, accent) {
    if (!S.quiet) return;
    var c = ctx(); if (!c) return;
    var el = document.getElementById('beatFlash'); if (!el) return;
    setTimeout(function () {
      el.classList.remove('bf-accent', 'bf-beat');
      void el.offsetWidth;   // restart animation
      el.classList.add(accent ? 'bf-accent' : 'bf-beat');
    }, Math.max(0, (when - c.currentTime) * 1000));
  }

  var pulse = { running: false, timer: null, nextTime: 0, beat: 0, lastHl: null };
  function stopPulse() {
    pulse.running = false;
    if (pulse.timer) { clearTimeout(pulse.timer); pulse.timer = null; }
    if (pulse.lastHl) { pulse.lastHl.classList.remove('solo-beat-on'); pulse.lastHl = null; }
  }
  function isCompoundTs(ts) { var t = +String(ts || '4/4').split('/')[0]; return t === 6 || t === 9 || t === 12; }
  function lightBeat(answerBeatIndex, when) {
    var c = ctx(); if (!c) return;
    var mb = measureOfAbs(answerBeatIndex);   // per-measure aware (changing meters)
    setTimeout(function () {
      if (!pulse.running) return;
      if (pulse.lastHl) pulse.lastHl.classList.remove('solo-beat-on');
      var z = document.querySelector('.beat-drop-zone[data-measure="' + mb.m + '"][data-beat="' + mb.b + '"]');
      if (z) { z.classList.add('solo-beat-on'); pulse.lastHl = z; }
    }, Math.max(0, (when - c.currentTime) * 1000));
  }
  // Autoscroll (mobile): only when the page actually OVERFLOWS (iPhone with many
  // bars; iPad fits so it stays put) and only DOWNWARD (never up, which would pull
  // the hidden controls back in — the flicker). Instant, so it doesn't jank the
  // highlight timers.
  function scrollToBeat(answerBeatIndex, when) {
    var c = ctx(); if (!c) return;
    var mobile = false; try { mobile = window.matchMedia('(pointer: coarse) and (max-width: 1400px)').matches; } catch (e) {}
    if (!mobile) return;
    var mb = measureOfAbs(answerBeatIndex);
    setTimeout(function () {
      if (!pulse.running) return;
      if (document.documentElement.scrollHeight <= window.innerHeight + 8) return;  // everything fits
      var z = document.querySelector('.beat-drop-zone[data-measure="' + mb.m + '"][data-beat="' + mb.b + '"]');
      if (!z) return;
      var r = z.getBoundingClientRect(), vh = window.innerHeight;
      if (r.bottom > vh * 0.8) {                      // current row near the bottom -> follow DOWN
        window.scrollBy({ top: Math.round(r.bottom - vh * 0.55) });   // positive only; instant
      }
    }, Math.max(0, (when - c.currentTime) * 1000));
  }
  function startPulse(startTime) {
    var c = ctx(); if (!c) return;
    stopPulse();
    pulse.running = true; pulse.beat = 0; pulse.nextTime = startTime;
    var mb = mBeats();
    var countInBeats = mb[0] || bpm();          // one measure of count-in (its own beat count)
    var endBeat = countInBeats + totalBeats();  // count-in + one pass of the example
    (function sched() {
      if (!pulse.running) return;
      var cc = ctx(); if (!cc) return;
      while (pulse.nextTime < cc.currentTime + 0.12) {
        var bt = pulse.beat;
        if (bt >= endBeat) {            // example finished — stop after the last beat
          setTimeout(stopPulse, Math.max(0, (pulse.nextTime - cc.currentTime) * 1000));
          return;
        }
        var countIn = bt < countInBeats;
        var abs = bt - countInBeats;
        var here = countIn ? null : measureOfAbs(abs);
        var atMeasureStart = !countIn && here.b === 1;
        tockBeatAt(pulse.nextTime);   // KIDS mascot pendulum ticks on every pulse beat
        if (countIn || S.metronome || S.quiet) {
          // audio: count-in every beat loud; example: accent measure starts
          metroTick(pulse.nextTime, countIn || atMeasureStart);
          // flash: during count-in accent ONLY beat 1 so the meter is visually clear
          var ciDownbeat = countIn && (bt % countInBeats === 0);
          flashBeat(pulse.nextTime, ciDownbeat || atMeasureStart);
          // compound clicks on the 3 eighth-pulses — per the CURRENT measure's meter
          var ts = S.curMeters ? S.curMeters[(countIn ? 1 : here.m) - 1] : S.ts;
          if (isCompoundTs(ts)) {
            var bd = 60 / S.tempo;
            subTick(pulse.nextTime + bd / 3);
            subTick(pulse.nextTime + 2 * bd / 3);
          }
        }
        if (!countIn) scrollToBeat(abs, pulse.nextTime);   // autoscroll follows playback (mobile)
        if (!countIn && S.beatGuide) lightBeat(abs, pulse.nextTime);
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

  /* The single source of truth for WHERE the target's note attacks fall.
     Walks the target exactly like playback did: for each item, scale its figure
     so it occupies its beats, then accumulate beat-offsets, emitting an onset for
     every non-rest note. Returns [{ beat, mi }] where `beat` is the attack time in
     BEATS from the rhythm's first downbeat (multiply by beatDur for seconds) and
     `mi` is the 0-based measure it belongs to. BOTH playTarget (for scheduling
     sound) and the tap-back scorer (for expected attack times) use this, so they
     can never drift apart. */
  function targetOnsets() {
    if (!S.target) return [];
    var onsets = [], beat = 0;
    S.target.forEach(function (meas, mi) {
      meas.forEach(function (it) {
        var pat = findPattern(it.patternId);
        if (!pat || !pat.vexflow) { beat += (it.beats || 1); return; }
        var raw = pat.vexflow.map(noteBeats);
        var sum = raw.reduce(function (a, x) { return a + x; }, 0) || 1;
        var scale = (it.beats || 1) / sum;  // make the figure occupy exactly its beats
        pat.vexflow.forEach(function (nn, i) {
          var d = raw[i] * scale;                 // this note's length in beats (for duration-aware sound)
          if (nn.duration.indexOf('r') === -1) onsets.push({ beat: beat, mi: mi, dur: d });
          beat += d;
        });
      });
    });
    return onsets;
  }

  /* COUNT-IN FLASH — big center words on each count-in beat, replacing the text line.
     One word per beat for ONE measure of the actual meter, so it teaches the beat:
     the last two beats are always READY · GO; earlier beats are numbers.
       2/4 -> READY GO   3/4 -> 1 READY GO   4/4 -> 1 2 READY GO   6/8 -> READY GO */
  function countInWords(n) {
    if (n <= 1) return ['GO'];
    if (n === 2) return ['READY', 'GO'];
    var w = []; for (var i = 1; i <= n - 2; i++) w.push(String(i)); w.push('READY', 'GO'); return w;
  }
  function flashCountIn(t0, beatDur, n) {
    var c = ctx(); if (!c) return;
    var words = countInWords(n);
    var host = document.getElementById('soloCountFlash');
    if (!host) { host = document.createElement('div'); host.id = 'soloCountFlash'; host.className = 'count-flash'; document.body.appendChild(host); }
    words.forEach(function (w, i) {
      var delay = Math.max(0, (t0 + i * beatDur - c.currentTime) * 1000);
      setTimeout(function () {
        host.textContent = w;
        host.classList.toggle('is-go', w === 'GO');
        host.classList.add('show'); host.classList.remove('pop'); void host.offsetWidth; host.classList.add('pop');
      }, delay);
    });
    setTimeout(function () { host.classList.remove('show'); }, Math.max(0, (t0 + n * beatDur - c.currentTime) * 1000) + 130);
  }

  /* ================= TAP-ALONG (first-listen "feel it" mechanic) =================
     On the FIRST Play of a round at the early levels, the student taps the steady BEAT
     while the rhythm plays — circles light up on each beat as a guide. This is the
     embodied learning pass (feel it before you transcribe it). The first listen is FREE
     (it doesn't count toward the listen cap — see playTarget), and grading is SOFT:
     tapping in time earns points, but it never blocks you or drains groove. Early levels
     only; fades as rhythms are internalized. (RhythmQuest tapping spec.) */
  var TAPALONG_MAX_IDX = 2;   // Levels 1-3
  function tapAlongApplies() { return S.guided && !S.bonusRound && (S.guidedIdx || 0) <= TAPALONG_MAX_IDX; }
  var TAP = { active: false, taps: [], beats: [], dots: [] };
  function showTapAlong(rhythmStart, beatDur, nBeats) {
    var area = document.querySelector('.answer-area'); var c = ctx(); if (!area || !c) return;
    var ov = document.getElementById('tapAlongOv');
    if (!ov) { ov = document.createElement('div'); ov.id = 'tapAlongOv'; ov.className = 'tapalong-ov'; area.appendChild(ov); }
    // Explanation up front so a first-timer knows what to do.
    ov.innerHTML = '<div class="ta-panel"><div class="ta-head">TAP ALONG</div><div class="ta-msg">First listen — tap the dot under each beat as it plays. Feel the rhythm and where you are.</div></div>';
    TAP.active = true; TAP.taps = []; TAP.beats = []; TAP.dots = [];
    // ONE dot per BEAT, centred UNDER that beat's cell (so the student taps the pulse AND learns
    // where they are across the measures). Positions from the live cell layout, in beat order.
    var aR = area.getBoundingClientRect();
    var cells = area.querySelectorAll('.answer-staff .beat-drop-zone');
    var idx = 0;
    cells.forEach(function (cell) {
      var r = cell.getBoundingClientRect();
      var dot = document.createElement('i'); dot.className = 'ta-dot'; dot.dataset.i = idx;
      dot.style.left = (((r.left + r.right) / 2) - aR.left) + 'px';
      dot.style.top = ((r.bottom - aR.top) + 8) + 'px';
      (function (ii, dd) { dd.addEventListener('pointerdown', function (e) { e.stopPropagation(); if (!TAP.active) return; TAP.taps.push({ i: ii, t: ctx().currentTime }); dd.classList.add('tap'); setTimeout(function () { dd.classList.remove('tap'); }, 120); }); })(idx, dot);
      ov.appendChild(dot); TAP.dots.push(dot); idx++;
    });
    for (var i = 0; i < nBeats; i++) TAP.beats.push({ t: rhythmStart + i * beatDur, i: i });
    // light each beat's dot on its beat
    TAP.beats.forEach(function (bt) {
      setTimeout(function () { var d = TAP.dots[bt.i]; if (d) { d.classList.add('lit'); setTimeout(function () { d.classList.remove('lit'); }, 210); } }, Math.max(0, (bt.t - c.currentTime) * 1000));
    });
    ov.classList.add('show');   // show from the START (before the count-in), so the student sees what to do
    setTimeout(function () { scoreTapAlong(nBeats); }, Math.max(0, (TAP.beats[nBeats - 1].t + beatDur - c.currentTime) * 1000) + 250);
  }
  function scoreTapAlong(nBeats) {
    TAP.active = false;
    var hits = 0;   // a hit = tapped the CORRECT beat's dot near that beat's time
    TAP.beats.forEach(function (bt) { if (TAP.taps.some(function (tp) { return tp.i === bt.i && Math.abs(tp.t - bt.t) <= TAP_TOLERANCE * 1.7; })) hits++; });
    var pct = nBeats ? Math.round(hits / nBeats * 100) : 0;
    var pts = hits * 5;   // soft: 5 pts per beat felt in the right place; never negative, never blocks
    if (pts > 0) { S.score += pts; floatDelta('+' + pts, true, scoreAnchor()); }
    S.tapAlongDone = true;
    var ov = document.getElementById('tapAlongOv');
    if (ov) {
      var m = ov.querySelector('.ta-msg');
      if (m) m.textContent = pct >= 70 ? ('Great — you felt it! +' + pts) : pct >= 35 ? ('Nice — keep following the measures! +' + pts) : 'Now replay to write it down';
      setTimeout(function () { ov.classList.remove('show'); }, 1300);
    }
    render();
  }

  function playTarget() {
    if (!S.target) return;
    var c = ctx(); if (!c) { msg('Tap a button to enable sound.'); return; }
    if (S.playing) { msg('Already playing — let it finish.'); return; }  // no overlapping playback
    stopPlayback();                         // clean slate (cancels any leftover sound)
    S.playing = true;
    document.body.classList.add('bq-played');   // Option E: after the first Play, Metronome/Beat-guide glide to icon-only
    // FIRST listen at early levels is the TAP-ALONG pass — it is FREE (doesn't count toward
    // the listen cap / single-listen fast-track). Every later listen counts as normal.
    var firstTapAlong = tapAlongApplies() && !S.tapAlongDone && (S.listensThisRound || 0) === 0;
    if (!firstTapAlong) S.listensThisRound = (S.listensThisRound || 0) + 1;
    // (No play-start scroll — it yanked the view back to the staff top and pulled
    // the hidden controls into frame. The view stays where the student left it; the
    // downward-only autoscroll follows the beat if the page overflows.)
    var beatDur = 60 / S.tempo;
    // TAP-ALONG pre-roll: on the first (tap-along) listen, delay the count-in ~1.4s so the
    // "TAP ALONG" message + the beat dots appear the moment Play is pressed and the student
    // can orient — THEN the READY·GO count-in starts with the metronome.
    var preroll = firstTapAlong ? 1.4 : 0;
    // If the metronome is already running, snap the count-in to the existing beat
    // grid so the flash bar doesn't jump phase when Play is pressed.
    var rawT0 = c.currentTime + 0.2 + preroll;
    var t0 = rawT0;
    if (pulse.running) {
      var n = Math.max(0, Math.ceil((rawT0 + 0.05 - pulse.nextTime) / beatDur));
      t0 = pulse.nextTime + n * beatDur;
    }
    var rhythmStart = t0 + (mBeats()[0] || bpm()) * beatDur;   // rhythm starts after one measure of count-in
    var onsets = targetOnsets();
    onsets.forEach(function (o) { rhythmHit(rhythmStart + o.beat * beatDur, (o.dur || 1) * beatDur); });
    // playback runs through the full example (one onset-walk pass == totalBeats()).
    var t = rhythmStart + totalBeats() * beatDur;
    startPulse(t0);   // count-in always ticks; metronome/guide continue per toggles
    flashCountIn(t0, beatDur, mBeats()[0] || bpm());   // big READY·GO flash instead of a text line
    if (firstTapAlong) showTapAlong(rhythmStart, beatDur, totalBeats());   // "feel the beat" pass
    // playback ends at `t`; allow Play again after that
    S._playTimer = setTimeout(function () { S.playing = false; }, Math.max(0, (t - c.currentTime + 0.3) * 1000));
    msg('');   // the count-in flash carries the cue now; keep the message line clear
  }

  /* ========================================================================
     TAP-IT-BACK — optional performance bonus, offered ONLY after a correct
     answer. Two tap zones: LEFT keeps the BEAT, RIGHT taps the RHYTHM. The
     metronome (on ctx()'s clock) is the single timing reference — we never infer
     tempo from the player's taps. Scoring is accuracy-first and forgiving.

       PREP  — player taps the LEFT (Beat) zone ON the metronome beat; bpm()
               consecutive on-beat taps (one full measure) "lock in". An off-beat
               tap resets the streak (the gate is strict by product requirement).
       GO    — on the next downbeat, capture begins. Record every RIGHT (Rhythm)
               tap and keep the beat with LEFT. Runs one pass (totalBeats()).
       DONE  — score, show per-measure pass/fail + accuracy %, award bonus.
     ====================================================================== */
  // SINGLE tunable tolerance window (seconds). A tap counts as "on" a metronome
  // beat / target onset if it lands within ±this. Deliberately generous — this is
  // a groove game, not a millisecond drum-machine quantizer. Tune here only.
  var TAP_TOLERANCE = 0.12;
  /* Input-latency offset (seconds), TUNED ON-DEVICE. Subtracted from every captured
     tap time (beat-zone AND rhythm-zone) before it is compared to the scheduled
     metronome grid. It models the fixed lag between the player FEELING a tap land on
     the beat and the event timestamp we read off ctx().currentTime (touch dispatch +
     audio output latency). 0 = no correction; raise it (e.g. 0.03–0.06) if on-device
     testing shows taps that feel on-beat scoring consistently late. One knob, applied
     in exactly one place (tapTime), so the whole pipeline stays single-clock. */
  var TAP_LATENCY = 0;
  // The audio-clock instant a physical tap should be COMPARED AT: when it was read,
  // minus the tuned input latency. Every tap (beat + rhythm) goes through here so the
  // latency correction can never be applied in one path and forgotten in another.
  function tapTime() { var c = ctx(); return c ? c.currentTime - TAP_LATENCY : 0; }
  /* Tap-back STATE MACHINE (TB.phase):
       'idle'     overlay closed.
       'ready'    overlay open; cloned staff shown; metronome OFF; nothing captures.
                  Player can change tempo and press "Start metronome".
       'metro'    clicks running on ctx()'s clock; player taps the BEAT zone to lock in.
                  Lock-in = bpm() CONSECUTIVE on-beat taps (an off-beat tap resets).
       'countoff' lock confirmed; one measure of on-screen count-off ("1·2·3·4 → GO"),
                  each number fired on a scheduled click time. No capture yet.
       'capture'  begins on the count-off's final downbeat: record RHYTHM-zone taps for
                  one pass (totalBeats()); the beat-guide highlight tracks the clock.
       'done'     score + per-measure results.
     ctx() is the SINGLE timing reference throughout — taps and the highlight are
     compared against scheduled click times, never against player-inferred tempo. */
  var TB = {
    open: false, phase: 'idle',
    timer: null, runId: 0, nextBeat: 0, beatIdx: 0, beatTimes: [],  // scheduled metronome beat times (audio clock)
    metroOn: false,                 // has the player pressed "Start metronome"?
    lockStreak: 0, lastBeatTapIdx: -1,  // consecutive on-beat taps + the beat index of the last counted tap
    captureStart: 0, captureEnd: 0, captureStartIdx: -1,  // capture anchor = an EXACT TB.beatTimes entry
    beatTaps: [], rhythmTaps: [],   // captured tap times (audio clock, latency-corrected)
    cells: [], el: null,            // per-beat highlight cells (absolute-beat ordered)
    /* RENDER TARGET. The dictation game runs tap-back in a MODAL (inline:false) —
       a cloned read-only staff inside #tbStaff — which is correct there: the rhythm
       isn't on screen until you've notated it. The standalone TAPPING game runs the
       SAME logic INLINE (inline:true): the rhythm is already shown on the main staff,
       so the perform panel mounts right under it and the beat-guide highlights the
       REAL main-staff cells. Only the render target differs; every timing/scoring
       path (tbStartMetro / lock-in / scheduleCountoff / startCapture / scoreTapBack /
       the zones / TAP_TOLERANCE / hand-switch / groove) is the one shared code. */
    inline: false, inlineEl: null,
    // iPhone compact perform-scroll: the main staff flattened to a single horizontal
    // auto-scroll lane while performing (set in enterPerformLayout). null = full view.
    scrollLane: null
  };
  // One physical tap can dispatch BOTH touchstart and a synthetic pointerdown on some
  // touch devices. Collapse any second event within this window to one logical tap.
  var TAP_DEDUP_MS = 250;
  var TB_BONUS_PER_MEASURE = 25;    // bonus points per passed measure (added to S.bonus)
  var TB_BONUS_HINT = '+' + TB_BONUS_PER_MEASURE + '/bar';   // advertised on the entry button badge

  /* The PERFORM PANEL inner DOM — the setup row, count-off, instruction line, the
     two tap zones, and the results slot. IDENTICAL in both render targets (modal +
     inline), so the shared logic addresses one stable set of IDs no matter where the
     panel is mounted. The modal additionally wraps this with a title + a cloned
     staff; the inline host mounts ONLY this panel (the rhythm is already on the main
     staff above it). `withCountoff` controls whether the big count-off overlay lives
     inside the panel (modal) or is mounted over the MAIN staff (inline). */
  function performPanelHTML(opts) {
    opts = opts || {};
    return (
      (opts.withCountoff ? '<div class="tb-countoff" id="tbCountoff" aria-hidden="true"></div>' : '') +
      '<div class="tb-setup" id="tbSetup">' +
        '<button class="tb-start" id="tbStart">' + IC.metro + 'Start metronome</button>' +
        '<div class="tb-tempo"><span class="tb-tlabel">TEMPO</span>' +
          '<button class="tb-tstep" id="tbTempoDown" aria-label="Slower">&minus;</button>' +
          '<b id="tbTempoVal">' + S.tempo + '</b>' +
          '<button class="tb-tstep" id="tbTempoUp" aria-label="Faster">+</button>' +
          '<span class="tb-tunit">bpm</span>' +
        '</div>' +
      '</div>' +
      '<div class="tb-instruct" id="tbInstruct"></div>' +
      '<div class="tb-zones" id="tbZones">' +
        '<button class="tb-zone tb-beat" id="tbBeat"><span class="tb-zlabel">Beat</span><span class="tb-zhint" id="tbBeatHint">left hand</span></button>' +
        '<button class="tb-zone tb-rhythm" id="tbRhythm"><span class="tb-zlabel">Rhythm</span><span class="tb-zhint" id="tbRhythmHint">right hand</span></button>' +
      '</div>' +
      '<div class="tb-results" id="tbResults" style="display:none"></div>'
    );
  }
  // Wire the perform panel's controls — same handlers regardless of mount point.
  function wirePerformPanel() {
    document.getElementById('tbStart').onclick = onStartMetro;
    // Tempo stepper: reuses S.tempo (the app's speed control state). Changing it
    // LIVE re-rates the running click without resetting the scheduler.
    document.getElementById('tbTempoDown').onclick = function () { nudgeTempo(-4); };
    document.getElementById('tbTempoUp').onclick = function () { nudgeTempo(4); };
    // Both pointer (desktop/dev) AND touch (mobile). On touch devices ONE physical
    // tap can dispatch touchstart AND a synthetic pointerdown — which would double-
    // count and make lock-in fire one tap early (the 3-not-4 bug). We bind both (so
    // a mouse pointerdown still works on desktop) but gate every event through a
    // single per-zone wall-clock debounce: a second event within TAP_DEDUP_MS of an
    // accepted one is dropped. preventDefault also suppresses the trailing synthetic
    // click. Result: one physical tap === exactly one call to fn().
    function bindZone(id, fn) {
      var z = document.getElementById(id);
      var lastAt = 0;
      var handler = function (e) {
        if (e.cancelable) e.preventDefault();
        var now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (now - lastAt < TAP_DEDUP_MS) return;   // collapse touch+pointer twin events
        lastAt = now;
        fn(); flashZone(z);
      };
      z.addEventListener('touchstart', handler, { passive: false });
      z.addEventListener('pointerdown', handler);
    }
    bindZone('tbBeat', onBeatTap);
    bindZone('tbRhythm', onRhythmTap);
  }

  // MODAL host (dictation game — UNCHANGED behavior): full-screen overlay with a
  // title, a cloned read-only staff, and the perform panel below it.
  function buildTapBackOverlay() {
    if (TB.el) return TB.el;
    var ov = document.createElement('div');
    ov.id = 'tapBack'; ov.className = 'tapback-ov';
    ov.innerHTML =
      '<div class="tb-card">' +
        '<button class="tb-close" id="tbClose" aria-label="Close">' + IC.close + '</button>' +
        '<div class="tb-head">' +
          '<div class="tb-title">Tap it back</div>' +
          '<div class="tb-meta" id="tbMeta"></div>' +
        '</div>' +
        // Read-only CLONE of the live answer staff (pixel-identical note spacing).
        '<div class="tb-staff" id="tbStaff"></div>' +
        performPanelHTML({ withCountoff: true }) +
      '</div>';
    document.body.appendChild(ov);
    TB.el = ov;
    document.getElementById('tbClose').onclick = closeTapBack;
    wirePerformPanel();
    return ov;
  }

  /* INLINE host (standalone TAPPING game): the perform panel mounts directly under
     the MAIN answer staff, which already shows the rhythm. No modal, no cloned staff
     — the beat-guide highlights the real main-staff cells in place. A count-off
     overlay is mounted over the main staff so "1·2·3·4 → GO" reads on the notation
     the player is about to perform. The panel is wrapped in a dark surface so the
     shared light-on-dark .tb-* styles read correctly on the themed page. */
  function buildTapBackInline() {
    if (TB.inlineEl && document.body.contains(TB.inlineEl)) return TB.inlineEl;
    var host = document.createElement('div');
    host.id = 'tbInline'; host.className = 'tb-inline';
    host.innerHTML = '<div class="tb-inline-panel">' + performPanelHTML({ withCountoff: false }) + '</div>';
    // Insert right after the answer area (the staff), before the (hidden) bank.
    var ans = document.querySelector('#gameArea .answer-area');
    if (ans && ans.parentNode) ans.parentNode.insertBefore(host, ans.nextSibling);
    else (document.getElementById('gameArea') || document.body).appendChild(host);
    TB.inlineEl = host;
    // Count-off overlay lives OVER the main staff (positioned by CSS on the staff).
    var staffWrap = document.querySelector('#measureContainer');
    if (staffWrap && !document.getElementById('tbCountoff')) {
      var co = document.createElement('div');
      co.id = 'tbCountoff'; co.className = 'tb-countoff tb-countoff-inline'; co.setAttribute('aria-hidden', 'true');
      staffWrap.style.position = staffWrap.style.position || 'relative';
      staffWrap.appendChild(co);
    }
    wirePerformPanel();
    return host;
  }
  // Remove the inline panel + its count-off overlay (tapping mode teardown).
  function destroyTapBackInline() {
    if (TB.inlineEl && TB.inlineEl.parentNode) TB.inlineEl.parentNode.removeChild(TB.inlineEl);
    TB.inlineEl = null;
    var co = document.getElementById('tbCountoff');
    if (co && co.classList.contains('tb-countoff-inline') && co.parentNode) co.parentNode.removeChild(co);
  }
  // Live tempo change: clamp, update S.tempo (so it persists like the speed control)
  // and the readout. The lookahead scheduler reads 60/S.tempo each beat, so the next
  // scheduled click simply uses the new rate — no reset, no drift.
  function nudgeTempo(d) {
    var t = Math.max(40, Math.min(220, (S.tempo || 100) + d));
    S.tempo = t; save();
    var v = document.getElementById('tbTempoVal'); if (v) v.textContent = t;
    var meta = document.getElementById('tbMeta');
    if (meta) meta.textContent = (S.changing ? 'changing meter' : S.ts) + ' · ' + S.measures + ' bar' + (S.measures === 1 ? '' : 's') + ' · ' + t + ' bpm';
  }
  function flashZone(z) { if (!z) return; z.classList.add('tb-flash'); setTimeout(function () { z.classList.remove('tb-flash'); }, 110); }
  function tbMsg(t) { var el = document.getElementById('tbInstruct'); if (el) el.textContent = t; }

  /* RENDER — deep-CLONE the live answer-board staff so the overlay's note spacing
     is pixel-identical to the answer the player just built. The live board is
     `#measureContainer .answer-staff`; we copy that whole subtree (its inline width
     + per-cell layout come along, so the proportional note placement is preserved),
     then make the copy READ-ONLY and inert:
       - strip every id (so getElementById never resolves into the clone),
       - drop the editing affordances (.remove-btn, the "Your Answer" label),
       - kill draggable + any solo marking classes,
       - namespace the highlight cells: cloneNode does NOT copy addEventListener
         handlers, so the engine's drag/drop/click listeners are already gone; we
         only neutralise the inline remove-button onclick by removing the buttons.
     The clone's own `.beat-drop-zone[data-measure][data-beat]` cells become the
     beat-guide highlight targets. We collect them in absolute-beat order into
     TB.cells so the clock-anchored highlight can index them directly. */
  function buildTapBackStaff() {
    // INLINE (tapping) target: no clone — the rhythm is already on the MAIN staff,
    // so the beat-guide highlights its real cells in place. Collect them into
    // TB.cells (the single index the clock-anchored highlight reads) and return.
    if (TB.inline) {
      TB.cells = [];
      var mbI = mBeats();
      for (var mI = 0; mI < mbI.length; mI++) {
        for (var bI = 1; bI <= mbI[mI]; bI++) {
          var zI = document.querySelector('#measureContainer .answer-staff .beat-drop-zone[data-measure="' + (mI + 1) + '"][data-beat="' + bI + '"]');
          TB.cells.push(zI || null);
        }
      }
      return;   // no fit/scale needed — the main staff is already laid out
    }
    var host = document.getElementById('tbStaff'); if (!host) return;
    host.innerHTML = ''; TB.cells = [];
    var live = document.querySelector('#measureContainer .answer-staff');
    if (!live) return;
    var clone = live.cloneNode(true);
    // Strip ids throughout (avoid colliding with the real board's getElementById).
    if (clone.id) clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    // Remove editing chrome: the answer label and per-note remove buttons.
    clone.querySelectorAll('.answer-staff-label, .remove-btn').forEach(function (n) { n.parentNode && n.parentNode.removeChild(n); });
    // Make it inert: no dragging, no leftover solo marks, no pointer interaction.
    clone.querySelectorAll('[draggable]').forEach(function (n) { n.removeAttribute('draggable'); });
    clone.querySelectorAll('.solo-wrong,.solo-right,.solo-beat-on,.filled').forEach(function (n) { n.classList.remove('solo-wrong', 'solo-right', 'solo-beat-on'); });
    clone.classList.add('tb-clone'); clone.style.maxWidth = '100%';
    host.appendChild(clone);
    // Collect the per-beat cells in ABSOLUTE-beat order (measure, then beat) so the
    // clock-anchored highlight maps beat-index -> cell deterministically.
    var mb = mBeats();
    for (var m = 0; m < mb.length; m++) {
      for (var b = 1; b <= mb[m]; b++) {
        var z = clone.querySelector('.beat-drop-zone[data-measure="' + (m + 1) + '"][data-beat="' + b + '"]');
        TB.cells.push(z || null);
      }
    }
    // On phones the overlay gives the staff the lion's share of the screen but that
    // is still short in landscape; a 4-measure rhythm clones to TWO stacked staff
    // rows that can overrun the band. Uniformly scale the clone DOWN (never up) so
    // its full natural box fits the available staff height — the notation stays
    // pixel-proportional and fully legible, never clipped. Cosmetic only: the cell
    // geometry the beat-guide indexes is untouched (transforms don't move TB.cells'
    // logical mapping). No-op on iPad/desktop, where the natural box already fits.
    // Defer the FIRST fit until the overlay's flex layout has actually rendered.
    // Measuring synchronously here (right after the overlay is shown) reads a
    // not-yet-laid-out host/clone and computes a tiny scale; previously only an
    // orientation flip (which fires a late resize re-fit) corrected it. scheduleTbFit
    // waits for layout via double-rAF and retries until the measured boxes are
    // non-zero, so landscape is correct on the FIRST open with no flip needed.
    scheduleTbFit();
  }
  // Run fitTbStaff once layout has settled. The overlay is shown immediately before
  // the clone is built, so the host band + clone have not been laid out yet on the
  // first open; a synchronous measure reads a tiny/zero box. We wait two animation
  // frames (style + layout flushed) and, if the measured natural box is still zero
  // (layout not ready), retry on the next frame up to a sane cap. Cheap no-op once
  // the box is non-zero. Used for the initial fit only; resize/orientation call
  // fitTbStaff directly (their layout is already settled).
  function scheduleTbFit(tries) {
    tries = tries || 0;
    var raf = window.requestAnimationFrame || function (cb) { return setTimeout(cb, 16); };
    raf(function () {
      raf(function () {
        if (!TB.open) return;
        var host = document.getElementById('tbStaff');
        var clone = host && host.querySelector('.tb-clone');
        // If the natural box hasn't been laid out yet, retry next frame (capped at
        // ~16 frames ≈ 0.25s) so a slow first paint still ends up correctly sized.
        var ready = clone && clone.offsetWidth > 0 && clone.offsetHeight > 0 &&
                    host && host.clientWidth > 0 && host.clientHeight > 0;
        if (!ready && tries < 16) { scheduleTbFit(tries + 1); return; }
        fitTbStaff();
      });
    });
  }
  // Measure-and-scale the cloned staff to fit its host band. Reads the clone's
  // natural (untransformed) size, compares to the padded inner box of #tbStaff, and
  // applies a single transform:scale so the whole rhythm is visible. Re-run on
  // resize/orientation so rotation re-fits. Phone-gated by being a no-op when the
  // content already fits (scale clamps to 1).
  function fitTbStaff() {
    var host = document.getElementById('tbStaff'); if (!host) return;
    var clone = host.querySelector('.tb-clone'); if (!clone) return;
    clone.style.transform = 'none';            // reset before measuring natural size
    clone.style.transformOrigin = 'top center';
    var cs = window.getComputedStyle(host);
    var availH = host.clientHeight - parseFloat(cs.paddingTop || 0) - parseFloat(cs.paddingBottom || 0);
    var availW = host.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
    var natH = clone.offsetHeight, natW = clone.offsetWidth;
    if (!natH || !natW || availH <= 0 || availW <= 0) return;
    var s = Math.min(1, availH / natH, availW / natW);
    if (s < 1) {
      clone.style.transform = 'scale(' + s + ')';
      // The transformed box keeps its natural height in flow; collapse the leftover
      // so the flex host centres the SCALED rhythm instead of leaving a tall gap.
      clone.style.marginBottom = (-(natH * (1 - s))) + 'px';
    } else {
      clone.style.transform = 'none';
      clone.style.marginBottom = '';
    }
  }
  // Tap-back beat guide: light the cell for an ABSOLUTE beat index on the cloned
  // staff (scoped via TB.cells, so it never touches the real answer board). The
  // caller passes the scheduled click time; we light exactly then.
  var tbLastHl = null;
  function tbLightBeat(absBeat, when) {
    var c = ctx(); if (!c) return;
    setTimeout(function () {
      if (!TB.open) return;
      if (tbLastHl) tbLastHl.classList.remove('solo-beat-on');
      var z = TB.cells[absBeat];
      if (z) { z.classList.add('solo-beat-on'); tbLastHl = z; autoScrollToCell(z); }
      else tbLastHl = null;
    }, Math.max(0, (when - c.currentTime) * 1000));
  }
  function tbClearBeat() { if (tbLastHl) { tbLastHl.classList.remove('solo-beat-on'); tbLastHl = null; } }

  /* ===== iPhone COMPACT PERFORM SCROLL (tapping game, long rhythms) =====
     On a small screen a multi-row (>2-bar) staff plus the two tap zones can't both
     fit. So: the PREVIEW (before Start metronome) keeps the full stacked staff —
     the player sees the whole rhythm. The instant Start metronome is pressed we
     flatten the staff into a SINGLE horizontal lane that auto-scrolls to follow the
     beat-guide highlight, shrinking the staff's vertical footprint so the lane AND
     both zones fit at once. We reuse the existing beat-guide cells (TB.cells) — the
     highlight mechanics and timing are untouched; we only scroll the lane to keep
     the active cell in view.

     Eligibility: inline (tapping) + a coarse-pointer small screen + the staff
     actually has more than one stacked row (i.e. >2 bars on mobile) OR overflows
     its area. iPad/desktop, and the single-row 2-bar case, are never compacted. */
  function compactScrollEligible() {
    if (!TB.inline) return false;
    var coarse = false;
    try { coarse = window.matchMedia('(pointer: coarse) and (max-width: 1400px)').matches; } catch (e) {}
    if (!coarse) return false;
    var staff = document.querySelector('#measureContainer .answer-staff');
    if (!staff) return false;
    var rows = staff.querySelectorAll('.staff-container');
    if (rows.length > 1) return true;                 // multi-row -> would stack tall
    // single row but wider than the viewport would still overflow horizontally; the
    // lane scroll helps there too. (2-bar fits, so this is effectively >2-bar only.)
    return staff.scrollWidth > (window.innerWidth + 8);
  }
  // Per-row pixel width for the compact lane: each row sized to its own cell count so
  // every beat cell is the same width across the continuous lane.
  var PERFORM_CELL_PX = 64;     // compact beat-cell width in the scroll lane
  var PERFORM_LEAD_PX = 56;     // leading space (time-sig / left margin) on the lane
  function enterPerformLayout() {
    if (!compactScrollEligible()) return;
    var staff = document.querySelector('#measureContainer .answer-staff');
    if (!staff) return;
    // Lay the stacked rows out side-by-side into one horizontal lane. Each row gets a
    // fixed width so EVERY beat cell across the whole lane is the same width (so the
    // bar lines / notes stay correctly proportioned). Row 0 carries a left LEAD for
    // the leading time signature; we set the beat-divisions left margin per row to
    // match (overriding the inline 70px), so cells start after the lead on row 0 and
    // flush on the rest, keeping cell width uniform.
    var rows = staff.querySelectorAll('.staff-container');
    for (var i = 0; i < rows.length; i++) {
      var nCells = rows[i].querySelectorAll('.beat-drop-zone').length || 1;
      var lead = (i === 0) ? PERFORM_LEAD_PX : 0;
      var w = nCells * PERFORM_CELL_PX + lead;
      rows[i].style.width = w + 'px';
      rows[i].style.flex = '0 0 ' + w + 'px';
      var bd = rows[i].querySelector('.beat-divisions');
      if (bd) {
        // Remember the renderer's original inline margins so we can restore them on
        // exit (they differ between normal 70px and changing-meter layouts).
        if (bd.dataset.origMl == null) bd.dataset.origMl = bd.style.marginLeft || '';
        if (bd.dataset.origMr == null) bd.dataset.origMr = bd.style.marginRight || '';
        bd.style.marginLeft = lead + 'px'; bd.style.marginRight = '0';
      }
    }
    document.body.classList.add('tb-perform-scroll');
    TB.scrollLane = staff;
    // Start the lane at the very beginning so the first beat is in view.
    try { staff.scrollLeft = 0; } catch (e) {}
  }
  function exitPerformLayout() {
    document.body.classList.remove('tb-perform-scroll');
    var staff = TB.scrollLane || document.querySelector('#measureContainer .answer-staff');
    if (staff) {
      var rows = staff.querySelectorAll('.staff-container');
      for (var i = 0; i < rows.length; i++) {
        rows[i].style.width = ''; rows[i].style.flex = '';
        var bd = rows[i].querySelector('.beat-divisions');
        // Restore the renderer's original inline margins captured on enter.
        if (bd) {
          if (bd.dataset.origMl != null) { bd.style.marginLeft = bd.dataset.origMl; delete bd.dataset.origMl; }
          if (bd.dataset.origMr != null) { bd.style.marginRight = bd.dataset.origMr; delete bd.dataset.origMr; }
        }
      }
      try { staff.scrollLeft = 0; } catch (e) {}
    }
    TB.scrollLane = null;
  }
  // Auto-scroll the compact lane so the active highlighted cell stays in view — keep
  // it slightly leading (a bit left of centre) so the player sees what's coming.
  function autoScrollToCell(z) {
    if (!document.body.classList.contains('tb-perform-scroll')) return;
    var lane = TB.scrollLane; if (!lane || !z) return;
    // Cell offset within the lane's scroll content.
    var laneRect = lane.getBoundingClientRect();
    var zRect = z.getBoundingClientRect();
    var cellLeftInContent = (zRect.left - laneRect.left) + lane.scrollLeft;
    // Position the cell ~35% from the left edge (centred-ish, slightly leading).
    var target = cellLeftInContent - lane.clientWidth * 0.35;
    var max = lane.scrollWidth - lane.clientWidth;
    target = Math.max(0, Math.min(max, target));
    try { lane.scrollTo({ left: target, behavior: 'smooth' }); }
    catch (e) { lane.scrollLeft = target; }
  }

  // Dedicated lookahead metronome for tap-back. Starts ONLY when the player presses
  // "Start metronome" (TB.metroOn). Records each beat's scheduled time in TB.beatTimes
  // (the ground-truth grid taps and the highlight are anchored to) and clicks (accent
  // on downbeats). The beat-guide highlight is NOT driven here — it runs only during
  // the count-off + capture, anchored to TB.captureStart (see scheduleCountoff).
  function tbStartMetro() {
    var c = ctx(); if (!c) return;
    // STARTING REPLACES, never stacks. Fully tear down any prior loop first, then
    // bump runId so any stale setTimeout(sched) still in flight self-aborts when it
    // sees its captured id no longer matches. The normal game pulse and the tap-back
    // metro must NEVER both run — kill the pulse so we don't hear two clocks.
    tbStopMetro();
    stopPulse();
    var myRun = ++TB.runId;
    TB.metroOn = true;
    TB.beatTimes = [];
    TB.nextBeat = c.currentTime + 0.25;   // small lead-in
    TB.beatIdx = 0;
    (function sched() {
      // Single owner check: only the current run, with the overlay open and metro on,
      // may schedule. A stale loop (older runId) or a closed overlay aborts here and
      // never re-arms its timer.
      if (myRun !== TB.runId || !TB.open || !TB.metroOn) return;
      var cc = ctx(); if (!cc) return;
      while (TB.nextBeat < cc.currentTime + 0.15) {
        var idx = TB.beatIdx;
        // accent the start of every metronome measure (bpm() beats per measure)
        var accent = (idx % bpm()) === 0;
        metroTick(TB.nextBeat, accent);
        // compound meters: soft eighth-pulse subdivisions, like the main metronome
        if (isCompoundTs(S.ts)) { var bd = 60 / S.tempo; subTick(TB.nextBeat + bd / 3); subTick(TB.nextBeat + 2 * bd / 3); }
        TB.beatTimes.push({ t: TB.nextBeat, idx: idx, accent: accent });
        pulseBeatDot(TB.nextBeat, accent);
        TB.beatIdx++; TB.nextBeat += 60 / S.tempo;   // tempo read live each beat
      }
      TB.timer = setTimeout(sched, 25);
    })();
  }
  // Stop the tap-back metro for good: clear the flag, invalidate the running loop via
  // runId (so an in-flight setTimeout that already passed its guard can't re-arm), and
  // cancel the pending timer. Idempotent — safe to call from close / stop / new round.
  function tbStopMetro() {
    TB.metroOn = false; TB.runId++;
    if (TB.timer) { clearTimeout(TB.timer); TB.timer = null; }
  }
  // Visual pulse on the Beat zone in time with the click (purely cosmetic cue).
  function pulseBeatDot(when, accent) {
    var c = ctx(); if (!c) return;
    flashBeat(when, accent);   // quiet-mode bar flash fires here too
    tockBeatAt(when);          // KIDS mascot: swing the pendulum on this beat (visual metronome)
    setTimeout(function () {
      if (!TB.open) return;
      var z = document.getElementById('tbBeat'); if (!z) return;
      z.classList.add('tb-pulse'); setTimeout(function () { z.classList.remove('tb-pulse'); }, 90);
    }, Math.max(0, (when - c.currentTime) * 1000));
  }

  /* KIDS mascot beat-sync: at each scheduled beat time, swing Tock's pendulum to the
     opposite side. The swing's transition duration is set to ~one beat so it arrives at
     the extreme exactly ON the next beat — a real metronome feel, phase-locked to the
     clicks the child hears. When beats stop for ~1.4s he returns to a gentle idle sway.
     No-op unless the kids theme is active. */
  var _tockSide = false, _tockIdleTimer = null;
  function tockBeatAt(when) {
    if (!document.body.classList.contains('theme-kids')) return;
    var el = document.getElementById('kidsTock'); if (!el) return;
    var c = ctx(); if (!c) return;
    setTimeout(function () {
      if (!document.body.classList.contains('theme-kids')) return;
      var pend = el.querySelector('.tock-pend');
      if (pend) pend.style.transitionDuration = Math.max(0.12, (60 / S.tempo) * 0.92) + 's';
      el.classList.add('tock-beat');
      _tockSide = !_tockSide;
      el.classList.toggle('tock-tick-l', !_tockSide);
      el.classList.toggle('tock-tick-r', _tockSide);
      if (_tockIdleTimer) clearTimeout(_tockIdleTimer);
      _tockIdleTimer = setTimeout(function () {
        el.classList.remove('tock-beat', 'tock-tick-l', 'tock-tick-r');
        if (pend) pend.style.transitionDuration = '';
      }, 1400);
    }, Math.max(0, (when - c.currentTime) * 1000));
  }

  // Nearest scheduled metronome beat to an audio-clock time, with its delta.
  function nearestBeat(t) {
    var best = null, bd = Infinity;
    for (var i = 0; i < TB.beatTimes.length; i++) {
      var d = Math.abs(TB.beatTimes[i].t - t);
      if (d < bd) { bd = d; best = TB.beatTimes[i]; }
    }
    return best ? { beat: best, delta: t - best.t, absDelta: bd } : null;
  }
  // Look up the scheduled metronome beat with a given monotonic index. Indices are
  // the SINGLE source of truth: the count-off, capture downbeat, beat highlight, and
  // scoring all reference beats by idx, then resolve the actual click time here. The
  // metro lookahead keeps pushing future beats, so a near-future idx resolves cleanly.
  function beatByIdx(idx) {
    for (var i = 0; i < TB.beatTimes.length; i++) if (TB.beatTimes[i].idx === idx) return TB.beatTimes[i];
    return null;
  }
  // The actual scheduled click time for an index if known; otherwise PREDICT it from
  // a known anchor beat + the live beat duration (used only to place setTimeout fire
  // moments for beats not yet emitted by the lookahead). Stored truth values always
  // come from beatByIdx once the beat exists.
  function beatTimeByIdx(idx, anchorBeat) {
    var b = beatByIdx(idx);
    if (b) return b.t;
    return anchorBeat.t + (idx - anchorBeat.idx) * (60 / S.tempo);
  }

  /* Open the perform interaction. `inline` selects the render target:
       false (default) — MODAL (dictation game, unchanged).
       true            — INLINE on the main staff (standalone TAPPING game).
     Everything after the mount is the SAME shared path. */
  function openTapBack(inline) {
    if (!S.solved || !S.target) return;   // gated strictly behind a shown rhythm
    TB.inline = !!inline;
    // Audio: the INLINE (tapping) perform UI renders perform-READY on round load —
    // before any user gesture — so it must NOT require an AudioContext yet (the
    // metronome only needs sound, and "Start metronome" unlocks it via onStartMetro).
    // The MODAL (dictation) path is always opened by a button gesture, so there we
    // still require + unlock audio up front, as before.
    var c = ctx();
    if (!TB.inline) {
      if (!c) { msg('Tap a button to enable sound first.'); return; }
      unlockAudio();
    } else if (c) {
      unlockAudio();   // best-effort if a gesture already unlocked it (e.g. Start button)
    }
    stopPlayback();                        // silence any example playback first
    if (TB.inline) {
      buildTapBackInline();                // mount the panel under the main staff
      document.body.classList.add('tapback-inline');
    } else {
      buildTapBackOverlay();
      document.body.classList.add('tapback-open');
      TB.el.classList.add('show');
      var meta = document.getElementById('tbMeta');
      if (meta) meta.textContent = (S.changing ? 'changing meter' : S.ts) + ' · ' + S.measures + ' bar' + (S.measures === 1 ? '' : 's') + ' · ' + S.tempo + ' bpm';
      var st = document.getElementById('tbStaff'); if (st) st.style.display = '';
    }
    TB.open = true;
    document.getElementById('tbResults').style.display = 'none';
    document.getElementById('tbZones').style.display = '';
    document.getElementById('tbSetup').style.display = '';
    var tv = document.getElementById('tbTempoVal'); if (tv) tv.textContent = S.tempo;
    buildTapBackStaff();                       // modal: clone staff · inline: index real cells
    enterReady();
  }
  function closeTapBack() {
    var wasInline = TB.inline;
    TB.open = false; TB.phase = 'idle';
    document.body.classList.remove('tb-performing', 'tb-results-open');
    tbStopMetro(); stopAllAudio(); tbClearBeat();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    exitPerformLayout();   // restore the full staff before teardown
    clearTbTimers();
    if (TB.el) TB.el.classList.remove('show');
    document.body.classList.remove('tapback-open');
    document.body.classList.remove('tapback-inline');
    if (wasInline) {
      destroyTapBackInline();
      TB.inline = false;
      // No "Perform it" button to restore — the inline perform UI is auto-rendered on
      // round load. closeTapBack is reached either from "Next" (newRound, which then
      // re-renders a fresh perform-ready round) or from the page tearing down; in
      // neither case do we leave a launcher behind. The button stays hidden.
      var tb = document.getElementById('soloTapBack'); if (tb) tb.style.display = 'none';
    }
  }
  function clearTbTimers() {
    ['_goTimer', '_endTimer'].forEach(function (k) { if (TB[k]) { clearTimeout(TB[k]); TB[k] = null; } });
    (TB._countTimers || []).forEach(function (t) { clearTimeout(t); }); TB._countTimers = [];
  }

  /* 'ready' — overlay open, metronome NOT started, nothing captures. The player
     can set the tempo and must press "Start metronome" to begin. */
  function enterReady() {
    TB.phase = 'ready';
    TB.metroOn = false; TB.lockStreak = 0; TB.lastBeatTapIdx = -1;
    TB.captureStart = 0; TB.captureEnd = 0; TB.captureStartIdx = -1; TB.beatTaps = []; TB.rhythmTaps = [];
    document.body.classList.remove('tb-performing', 'tb-results-open');
    tbStopMetro(); tbClearBeat(); clearTbTimers();
    exitPerformLayout();   // back to the full preview staff (Try again / fresh round)
    var co = document.getElementById('tbCountoff'); if (co) { co.classList.remove('show'); co.textContent = ''; }
    var setup = document.getElementById('tbSetup'); if (setup) setup.style.display = '';
    var start = document.getElementById('tbStart'); if (start) { start.disabled = false; start.classList.remove('tb-on'); }
    setBeatLocked(false);
    document.getElementById('tbBeat').classList.remove('tb-armed');
    document.getElementById('tbRhythm').classList.remove('tb-armed');
    tbMsg('Set the tempo, then press Start metronome.');
  }

  /* 'metro' — player pressed Start metronome. Clicks run; player taps the Beat zone
     to lock in. */
  function onStartMetro() {
    if (!TB.open) return;
    if (TB.phase !== 'ready') return;     // ignore re-presses mid-flow
    var c = ctx(); if (!c) return;
    unlockAudio();
    TB.phase = 'metro';
    TB.metroOn = true;
    TB.lockStreak = 0; TB.lastBeatTapIdx = -1;
    var start = document.getElementById('tbStart'); if (start) { start.disabled = true; start.classList.add('tb-on'); }
    document.getElementById('tbBeat').classList.add('tb-armed');
    // iPhone long-rhythm: collapse the full preview staff into the compact auto-scroll
    // lane the instant performing begins, so the lane + both tap zones fit at once.
    // No-op on iPad/desktop and on the single-row (≤2-bar) case.
    document.body.classList.add('tb-performing');
    enterPerformLayout();
    tbStartMetro();
    tbMsg('Tap the BEAT in time — ' + bpm() + ' in a row to lock in.');
    updateLockHint();
  }
  function updateLockHint() {
    var hint = document.getElementById('tbBeatHint');
    if (hint) hint.textContent = TB.lockStreak > 0 ? (TB.lockStreak + '/' + bpm() + ' locked') : 'keep tapping the beat';
  }

  function onBeatTap() {
    var c = ctx(); if (!c) return;
    var now = tapTime();   // latency-corrected audio-clock instant for this physical tap
    if (TB.phase === 'metro') {
      var nb = nearestBeat(now);
      // Lock-in requires bpm() DISTINCT on-beat metronome beats in a row. Each beat is
      // counted at most once (nb.beat.idx !== lastBeatTapIdx), and the event layer has
      // already collapsed any touch+pointer twin into one call — so on a touchscreen
      // one physical tap advances the streak by exactly one. In 4/4 that means 4 taps.
      if (nb && nb.absDelta <= TAP_TOLERANCE && nb.beat.idx !== TB.lastBeatTapIdx) {
        TB.lockStreak++; TB.lastBeatTapIdx = nb.beat.idx;
        updateLockHint();
        tbMsg('On the beat — ' + TB.lockStreak + ' / ' + bpm());
        if (TB.lockStreak >= bpm()) lockIn();
      } else if (!nb || nb.absDelta > TAP_TOLERANCE) {
        // strict gate: a genuinely off-beat tap resets the streak. (A duplicate landing
        // on the SAME beat is simply ignored above — it neither advances nor resets.)
        TB.lockStreak = 0; TB.lastBeatTapIdx = -1;
        updateLockHint();
        flashOffbeat();
        tbMsg('Stay on the beat — streak reset (0 / ' + bpm() + ').');
      }
    } else if (TB.phase === 'capture') {
      TB.beatTaps.push(now);
    }
  }
  function onRhythmTap() {
    var c = ctx(); if (!c) return;
    if (TB.phase === 'capture') { TB.rhythmTaps.push(tapTime()); return; }
    // Race guard: the visual GO and the _goTimer that flips phase both fire at the same
    // scheduled instant, but JS timer ordering on iOS can let GO display before the
    // phase flip. Accept rhythm taps within ±TAP_TOLERANCE of the capture downbeat
    // even while still in 'countoff', so the first-note tap is never silently dropped.
    if (TB.phase === 'countoff' && TB.captureStart > 0) {
      var t = tapTime();
      if (Math.abs(t - TB.captureStart) <= TAP_TOLERANCE) TB.rhythmTaps.push(t);
    }
  }
  function flashOffbeat() {
    var z = document.getElementById('tbBeat'); if (!z) return;
    z.classList.add('tb-bad'); setTimeout(function () { z.classList.remove('tb-bad'); }, 220);
  }

  /* Lock-in confirmation: the Beat pad turns green + reads "Locked", then a visual
     count-off (one measure) runs in time with the metronome, and capture begins on
     its final downbeat. */
  function lockIn() {
    TB.phase = 'countoff';
    setBeatLocked(true);
    var setup = document.getElementById('tbSetup'); if (setup) setup.style.display = 'none';
    document.getElementById('tbRhythm').classList.add('tb-armed');
    tbMsg('Locked! Count-off…');
    scheduleCountoff();
  }
  function setBeatLocked(on) {
    var z = document.getElementById('tbBeat'), hint = document.getElementById('tbBeatHint');
    if (!z) return;
    z.classList.toggle('tb-locked', !!on);
    var label = z.querySelector('.tb-zlabel');
    if (label) label.textContent = on ? 'Locked' : 'Beat';
    if (hint) hint.textContent = on ? 'keep the beat' : 'left hand';
  }

  /* Count-off + capture — ONE clock, indexed off TB.beatTimes (the scheduled metro
     clicks). The flow is anchored by monotonic beat INDEX, never by recomputed
     `start + k*beatDur`:
       - coStartIdx       = TB.lastBeatTapIdx + 1  (the NEXT click after the 4th lock
                            tap — exactly where the player's 5th beat-tap would land).
                            The count-off "1" lands there: no gap, no early/late start.
       - captureStartIdx  = coStartIdx + bpm()  (the downbeat AFTER the count-off bar).
     Every on-screen number, the "GO" flash, the beat-guide highlight, and the scoring
     anchor all reference these indices and resolve to the ACTUAL scheduled click time
     via beatTimeByIdx — so what the player hears (the click), sees (number/highlight),
     and is graded against (target onsets) are byte-for-byte the same instants.

     The prediction anchor passed to beatTimeByIdx is the lock tap's OWN beat
     (beatByIdx(lastBeatTapIdx)) — a beat the lookahead has already emitted, so its
     scheduled time is ground truth. Future indices (the count-off + capture beats) are
     predicted linearly from it until the lookahead emits them, at which point beatByIdx
     returns the real click time. Same grid, by index, end to end. */
  function scheduleCountoff() {
    var c = ctx(); if (!c) return;
    var countBeats = bpm();   // one measure of count-off
    // Anchor on the lock tap's own beat — already emitted, so its time is exact. The
    // count-off begins on the very NEXT click (lastBeatTapIdx + 1): the instant the
    // player's 5th beat-tap would have landed.
    var anchor = beatByIdx(TB.lastBeatTapIdx);
    if (!anchor) {
      // Fallback (lock tap's beat aged out of the buffer): nearest still-known beat just
      // ahead. coStartIdx is still pinned to lastBeatTapIdx + 1 so the cadence is intact.
      var future = TB.beatTimes.filter(function (b) { return b.t > c.currentTime + 0.06; });
      anchor = future[0] || TB.beatTimes[TB.beatTimes.length - 1];
    }
    if (!anchor) return;      // metro not running yet (shouldn't happen post lock-in)
    var coStartIdx = TB.lastBeatTapIdx + 1;   // next click after the final lock tap
    var captureStartIdx = coStartIdx + countBeats;
    TB.captureStartIdx = captureStartIdx;

    TB._countTimers = [];
    // Inspectable record of the count-off schedule: each number's beat index and the
    // exact scheduled display time (== that beat's click time). Drives the alignment
    // assertions; harmless in production.
    TB._coSchedule = [];
    var co = document.getElementById('tbCountoff');
    if (co) { co.textContent = ''; co.classList.add('show'); }
    // Count-off numbers 1..countBeats, each fired at the ACTUAL click time of its beat.
    for (var k = 0; k < countBeats; k++) {
      (function (k) {
        var when = beatTimeByIdx(coStartIdx + k, anchor);
        TB._coSchedule.push({ n: k + 1, idx: coStartIdx + k, when: when });
        TB._countTimers.push(setTimeout(function () {
          if (!TB.open || TB.phase !== 'countoff') return;
          if (co) { co.textContent = String(k + 1); co.classList.remove('tb-pop'); void co.offsetWidth; co.classList.add('tb-pop'); }
        }, Math.max(0, (when - c.currentTime) * 1000)));
      })(k);
    }
    // "GO" flash on the capture downbeat (same instant capture begins).
    var goWhen = beatTimeByIdx(captureStartIdx, anchor);
    TB._countTimers.push(setTimeout(function () {
      if (!TB.open) return;
      if (co) { co.textContent = 'GO'; co.classList.remove('tb-pop'); void co.offsetWidth; co.classList.add('tb-pop'); }
      setTimeout(function () { if (co) co.classList.remove('show'); }, 520);
    }, Math.max(0, (goWhen - c.currentTime) * 1000)));
    // Voice count-off: "1 2 3 go" (numbers for beats 1..n-1, "go" on the last
    // count-off beat). Music starts on the FOLLOWING beat, matching standard musical
    // practice. Each word fires 120ms early so the spoken onset lands on the click.
    // Skipped in quiet mode.
    if (!S.quiet && window.speechSynthesis) {
      var VOICE_LEAD = 0.12;
      for (var vk = 0; vk < countBeats; vk++) {
        (function (vk) {
          var when = beatTimeByIdx(coStartIdx + vk, anchor);
          var word = (vk === countBeats - 1) ? 'go' : String(vk + 1);
          TB._countTimers.push(setTimeout(function () {
            if (!TB.open || TB.phase !== 'countoff') return;
            window.speechSynthesis.cancel();
            var u = new SpeechSynthesisUtterance(word);
            u.rate = 1.1; u.volume = 1.0;
            window.speechSynthesis.speak(u);
          }, Math.max(0, (when - c.currentTime - VOICE_LEAD) * 1000)));
        })(vk);
      }
    }

    beginCapture(anchor);
  }

  /* Capture begins on the click at captureStartIdx. The beat-guide highlight, the
     phase flip, and the end-of-capture are all scheduled at the ACTUAL scheduled
     click times of beats captureStartIdx + j (resolved via beatTimeByIdx). At the
     flip we re-read the now-emitted click as TB.captureStart so the stored anchor is
     the exact time the player heard — the same value scoring uses. No drift. */
  function beginCapture(anchor) {
    var c = ctx(); if (!c) return;
    var total = totalBeats();
    var captureStartIdx = TB.captureStartIdx;
    // Provisional anchor time (refined to the real click time at the flip below).
    TB.captureStart = beatTimeByIdx(captureStartIdx, anchor);
    TB.captureEnd = beatTimeByIdx(captureStartIdx + total, anchor);
    // Moving highlight: beat j lights at the actual click time of beat captureStartIdx+j
    // on cloned cell TB.cells[j]. Same instants as the clicks the player hears.
    for (var j = 0; j < total; j++) tbLightBeat(j, beatTimeByIdx(captureStartIdx + j, anchor));
    // Flip to capture exactly on the capture downbeat. Pin TB.captureStart/End to the
    // real scheduled clicks (now emitted by the lookahead) so scoring is exact.
    TB._goTimer = setTimeout(function () {
      if (!TB.open) return;
      var sb = beatByIdx(captureStartIdx), eb = beatByIdx(captureStartIdx + total);
      if (sb) TB.captureStart = sb.t;
      if (eb) TB.captureEnd = eb.t; else TB.captureEnd = TB.captureStart + total * (60 / S.tempo);
      TB.phase = 'capture';
      tbMsg('Go! Tap the RHYTHM (' + rhythmSide() + '), keep the BEAT (' + beatSide() + ').');
      var z = document.getElementById('tbZones'); if (z) { z.classList.add('tb-go'); setTimeout(function () { z.classList.remove('tb-go'); }, 600); }
    }, Math.max(0, (beatTimeByIdx(captureStartIdx, anchor) - c.currentTime) * 1000));
    // Stop capture one beat after the last beat of the pass, then score.
    TB._endTimer = setTimeout(function () {
      if (!TB.open) return;
      finishCapture();
    }, Math.max(0, (beatTimeByIdx(captureStartIdx + total + 1, anchor) - c.currentTime) * 1000));
  }

  function finishCapture() {
    TB.phase = 'done';
    tbStopMetro();
    var res = scoreTapBack();
    showResults(res);
  }

  /* Score the captured taps against the metronome grid + target onsets — PER-BEAT,
     ALL-OR-NOTHING. Strict on RHYTHM, forgiving on TIMING.

     Why per-beat all-or-nothing: the old scorer graded each onset independently, so
     tapping the WRONG subdivision but on the beat still earned credit — tapping a
     quarter where the beat actually has two eighths scored half, and tapping the
     EXACT OPPOSITE rhythm of an example scored ~67% "because there's always a note on
     the beat." That rewards tapping the beats, not performing the rhythm. Now a beat
     scores only if the player reproduced THAT beat's rhythm exactly.

     Grouping: each beat b (0..totalBeats()-1) owns the target onsets whose offset
     floors to b. A rhythm tap is grouped the same way, but a tap up to TAP_TOLERANCE
     EARLY of a downbeat is pulled forward into that downbeat's beat (tolBeats below) —
     so a slightly-early on-beat tap counts for the beat it was aiming at, keeping
     timing forgiving without leaking credit across beats. The example has totalBeats()
     beats off the same TB.beatTimes/onset grid the rest of the tap-back uses.

     A beat is CORRECT iff its taps EXACTLY match its onsets: same COUNT, each onset
     matched by a distinct tap within ±TAP_TOLERANCE, with NO missing and NO extra
     taps in the beat. Otherwise the whole beat scores 0 (no partial credit in a beat).
       - two eighths, player taps once (a quarter)  → missing off-beat → WRONG.
       - a quarter, player taps twice               → extra            → WRONG.
       - correct count + sub-positions in tolerance → CORRECT (jitter inside window ok).

     Score = (# fully-correct beats) / totalBeats() × 100.
     A measure passes iff ALL its beats are correct (and the beat hand stayed steady).
     Beat-hand steadiness is unchanged (forgiving: one slip allowed per measure). */
  function scoreTapBack() {
    var beatDur = 60 / S.tempo;
    var tb = totalBeats();
    var tolBeats = TAP_TOLERANCE / beatDur;      // tolerance expressed in beats
    var onsets = targetOnsets();                 // [{beat, mi}] from the shared walk
    var mb = mBeats(), nMeas = mb.length;

    // Map an absolute beat index (0..tb-1) -> its measure (0-based).
    function measOfBeat(b) {
      return measureOfAbs(Math.max(0, Math.min(tb - 0.0001, b))).m - 1;
    }
    // ---- group TARGET onsets by beat ----
    // beatGroups[b] = { mi, want: [absolute target times] } for each beat that has onsets,
    // plus an entry for every beat 0..tb-1 (silent beats have 0 onsets and 0 taps).
    var beatGroups = [];
    for (var b = 0; b < tb; b++) beatGroups[b] = { mi: measOfBeat(b), want: [] };
    onsets.forEach(function (o) {
      var b = Math.floor(o.beat + 1e-9);
      if (b < 0) b = 0; if (b >= tb) b = tb - 1;
      beatGroups[b].want.push(TB.captureStart + o.beat * beatDur);
    });

    // ---- group RHYTHM-zone taps by beat (tolerance-shifted boundary) ----
    var taps = TB.rhythmTaps.slice().sort(function (a, b) { return a - b; });
    for (var i = 0; i < taps.length; i++) {
      var rel = (taps[i] - TB.captureStart) / beatDur;          // beats into the pass
      // ignore taps clearly outside the captured pass (with tolerance slack)
      if (rel < -tolBeats || rel >= tb + tolBeats) continue;
      // pull a tap up to tolBeats EARLY of a downbeat forward into that beat
      var b = Math.floor(rel + tolBeats + 1e-9);
      if (b < 0) b = 0; if (b >= tb) b = tb - 1;
      beatGroups[b].got = beatGroups[b].got || [];
      beatGroups[b].got.push(taps[i]);
    }

    // ---- evaluate each beat: ALL-OR-NOTHING exact match ----
    var perMeas = [];
    for (var m = 0; m < nMeas; m++) perMeas[m] = { beats: 0, beatsOk: 0, onsets: 0, hits: 0, extra: 0, beatBeats: 0, beatHits: 0 };
    var beatsOkTotal = 0;
    for (var bb = 0; bb < tb; bb++) {
      var g = beatGroups[bb];
      var want = g.want, got = g.got || [];
      var pm = perMeas[g.mi];
      pm.beats++;
      pm.onsets += want.length;
      // exact count is the first gate — missing OR extra fails the whole beat
      var ok = (got.length === want.length);
      var matched = 0;
      if (ok) {
        // greedy nearest-match: each onset claims the nearest unused tap within tolerance.
        // Equal counts + all matched within tolerance == exact rhythm reproduction.
        var usedT = got.map(function () { return false; });
        for (var wi = 0; wi < want.length; wi++) {
          var best = -1, bd = Infinity;
          for (var ti = 0; ti < got.length; ti++) {
            if (usedT[ti]) continue;
            var d = Math.abs(got[ti] - want[wi]);
            if (d < bd) { bd = d; best = ti; }
          }
          if (best !== -1 && bd <= TAP_TOLERANCE) { usedT[best] = true; matched++; }
          else { ok = false; break; }
        }
      }
      pm.hits += matched;
      if (got.length > want.length) pm.extra += (got.length - want.length);
      if (ok) { pm.beatsOk++; beatsOkTotal++; }
    }

    // ---- beat hand (steadiness) — UNCHANGED ----
    var btaps = TB.beatTaps.slice().sort(function (a, b) { return a - b; });
    var bused = btaps.map(function () { return false; });
    // metronome beats that fall within the capture window, tagged by measure
    TB.beatTimes.forEach(function (bt) {
      if (bt.t < TB.captureStart - 0.001 || bt.t >= TB.captureEnd - 0.001) return;
      var rel = (bt.t - TB.captureStart) / beatDur;
      var mi = measOfBeat(rel);
      perMeas[mi].beatBeats++;
      var bi = -1, bd = Infinity;
      for (var j = 0; j < btaps.length; j++) {
        if (bused[j]) continue;
        var d = Math.abs(btaps[j] - bt.t);
        if (d < bd) { bd = d; bi = j; }
      }
      if (bi !== -1 && bd <= TAP_TOLERANCE) { bused[bi] = true; perMeas[mi].beatHits++; }
    });

    // ---- per-measure pass/fail + totals ----
    var passed = 0, measures = [];
    for (var mm = 0; mm < nMeas; mm++) {
      var p = perMeas[mm];
      var rhythmOk = (p.beats > 0) ? (p.beatsOk === p.beats) : true;  // ALL beats in the bar correct
      // steady = at least all but one beat tracked (forgiving — one slip allowed)
      var beatOk = p.beatBeats === 0 ? true : (p.beatHits >= p.beatBeats - 1);
      var pass = rhythmOk && beatOk;
      if (pass) passed++;
      measures.push({
        m: mm + 1, pass: pass,
        rhythmSlip: !rhythmOk, beatSlip: !beatOk,
        onsets: p.onsets, hits: p.hits, extra: p.extra,
        beatsOk: p.beatsOk, beats: p.beats,
        beatBeats: p.beatBeats, beatHits: p.beatHits
      });
    }
    // Score = fully-correct beats / total beats. Tapping the wrong subdivision (even on
    // the beat) fails its whole beat, so the opposite rhythm scores ~0, not the 60s.
    var accuracy = tb ? Math.round((beatsOkTotal / tb) * 100) : 100;
    // bonus rewards passed measures (clean rhythm + steady beat), not raw accuracy,
    // so partial credit can't be farmed by mashing taps.
    var bonus = passed * TB_BONUS_PER_MEASURE;
    return { measures: measures, accuracy: accuracy, passed: passed, total: nMeas, beatsOk: beatsOkTotal, totalBeatsScored: tb, bonus: bonus };
  }

  function showResults(res) {
    document.getElementById('tbZones').style.display = 'none';
    tbMsg('');   // clear the stale "Locked! Count-off..." line -- not relevant once results show
    document.body.classList.remove('tb-performing');
    document.body.classList.add('tb-results-open');
    // Do NOT exit the scroll layout here — keep the horizontal lane visible so the
    // rhythm stays readable during results review. exitPerformLayout() runs in
    // enterReady() (Try Again) and closeTapBack() (Next/Done) when starting fresh.
    // "One more" exit-nudge payoff: if the boost is armed AND this round actually
    // earned a bonus, DOUBLE it and consume the boost. A boost is only spent on a
    // round that scored something, so accepting "one more" then failing keeps the
    // promise alive for the next real attempt (never feels like a bait-and-switch).
    var bonusBoosted = false;
    if (S.bonusBoost && res.bonus > 0) { res.bonus *= 2; bonusBoosted = true; S.bonusBoost = false; }
    S.bonus += res.bonus; S.score += res.bonus;     // bonus folds into the running score too
    // GUIDED (tapping game): a PERFORM result drives the same matched ladder as
    // dictation. Only the standalone tapping game's INLINE perform counts toward the
    // ladder — the optional tap-back bonus offered after a DICTATION answer must NOT
    // (that round was already recorded by submit()). correct/clean = every bar clean;
    // groovePct = the per-beat accuracy the scorer computed.
    var tapAdvText = null;
    if (S.mode === 'tapping' && TB.inline) {
      var allClean = (res.total > 0 && res.passed === res.total);
      var adv = guidedRecord(allClean, allClean, res.accuracy);
      if (adv) tapAdvText = adv.advText;
    }
    save(); render();
    var rows = res.measures.map(function (m) {
      var status = m.pass ? 'pass' : 'fail';
      var note = m.pass ? 'clean' :
        [m.rhythmSlip ? (m.beatsOk + '/' + m.beats + ' beats' + (m.extra ? ' · +' + m.extra + ' extra' : '')) : '',
         m.beatSlip ? 'beat unsteady' : ''].filter(Boolean).join(' · ');
      return '<div class="tb-mrow tb-' + status + '"><span class="tb-mlabel">Bar ' + m.m + '</span>' +
        '<span class="tb-mstat">' + (m.pass ? IC.check + 'pass' : IC.close + 'fix') + '</span>' +
        '<span class="tb-mnote">' + note + '</span></div>';
    }).join('');
    // CELEBRATION — a juicy "win" moment on a fully-clean pass (every bar clean).
    // Confetti + a rotating praise line for ALL themes; Tock celebrates in KIDS mode
    // only (mascot is kids-exclusive). This is the emotional payoff that turns a bare
    // percentage into something a kid wants to earn again.
    var isCleanPass = res.total > 0 && res.passed === res.total;
    var kidsTheme = document.body.classList.contains('theme-kids');
    var celebrateHTML = '';
    if (isCleanPass) {
      var PRAISE = ['You did it!', 'Perfect!', 'Nailed it!', 'Woohoo!', 'Right on the beat!', 'Superstar!'];
      var praise = PRAISE[(S.streak + res.passed) % PRAISE.length];
      var CONF = ['#ff6fa8', '#ffd23f', '#4caf50', '#2f7ee0', '#ff8c42', '#7c5cff'];
      var confetti = '';
      for (var ci = 0; ci < 14; ci++) {
        var col = CONF[ci % CONF.length];
        var leftPct = (7 + (ci * 6.4) % 86).toFixed(1);
        var delay = ((ci * 47) % 300);
        var rot = ((ci * 37) % 90) - 45;
        confetti += '<i class="tb-confetti-bit" style="left:' + leftPct + '%;background:' + col +
          ';animation-delay:' + delay + 'ms;transform:rotate(' + rot + 'deg)"></i>';
      }
      celebrateHTML =
        '<div class="tb-celebrate' + (kidsTheme ? ' tb-celebrate-kids' : '') + '">' +
          '<div class="tb-confetti" aria-hidden="true">' + confetti + '</div>' +
          (kidsTheme ? '<div class="tb-tock tb-tock-celebrate">' + TOCK.celebrate + '</div>' : '') +
          '<div class="tb-celebrate-head">' + praise + '</div>' +
        '</div>';
    }
    var el = document.getElementById('tbResults');
    el.innerHTML =
      celebrateHTML +
      '<div class="tb-score">' +
        '<div class="tb-acc"><b>' + res.accuracy + '%</b><span>accuracy</span></div>' +
        '<div class="tb-acc"><b>' + res.passed + '/' + res.total + '</b><span>bars clean</span></div>' +
        '<div class="tb-acc tb-bonus' + (bonusBoosted ? ' tb-bonus-2x' : '') + '"><b>+' + res.bonus + (bonusBoosted ? '<i class="tb-2x">2×</i>' : '') + '</b><span>bonus</span></div>' +
      '</div>' +
      (tapAdvText ? '<div class="tb-advance">' + tapAdvText + '</div>' : '') +
      '<div class="tb-mlist">' + rows + '</div>' +
      // Tapping (inline): the right-hand button is "Next" — a NEW perform-ready
      // rhythm. Dictation (modal): it is "Done" — close the overlay (unchanged).
      // Both modes keep "Try again" (re-arm the SAME rhythm).
      '<div class="tb-rbtns solo-ctl">' +
        '<button class="hint" id="tbRetry">' + IC.redo + 'Try again</button>' +
        (TB.inline
          ? '<button class="go" id="tbNextRound">' + IC.next + 'Next</button>'
          : '<button class="go" id="tbDone">' + IC.check + 'Done</button>') +
      '</div>' +
      // Tapping only: a graceful exit back to the hub. Tapping it doesn't just leave —
      // it triggers the "one more for double bonus" motivation nudge first.
      (TB.inline ? '<button class="tb-exit-link" id="tbExit">' + IC.home + 'Done for now</button>' : '');
    el.style.display = '';
    if (TB.inline) {
      document.getElementById('tbNextRound').onclick = newRound;   // fresh perform-ready round
      var exitBtn = document.getElementById('tbExit');
      if (exitBtn) exitBtn.onclick = showExitNudge;
    } else {
      document.getElementById('tbDone').onclick = closeTapBack;
    }
    document.getElementById('tbRetry').onclick = function () {
      document.getElementById('tbResults').style.display = 'none';
      document.getElementById('tbZones').style.display = '';
      var st = document.getElementById('tbStaff'); if (st) st.style.display = '';   // modal only
      // Full reset back to 'ready' (metronome off): the player re-starts + re-locks.
      enterReady();
    };
    // Reachability on short screens (iPhone landscape) is handled by .tb-rbtns'
    // position:sticky (see injectStyle) -- it pins to the bottom of whichever
    // ancestor scrolls the instant results render, no JS/scroll-timing needed.
  }

  /* MOTIVATION NUDGE — fires when the student tries to leave (taps "Done for now"
     on the results screen). Rather than just letting them go, offer a reason to do
     one more: the next earned bonus is DOUBLED. Accepting arms S.bonusBoost and
     starts a fresh round; declining navigates home. Theme-neutral (NO mascot — Tock
     is kids-theme-only) + reuses the shared .tapback-ov surface + --tb-accent, so it
     styles per theme automatically. */
  function showExitNudge() {
    var ov = document.getElementById('exitNudge');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'exitNudge'; ov.className = 'tapback-ov exit-nudge';
      ov.innerHTML =
        '<div class="tb-card exit-card">' +
          '<div class="exit-head">' + IC.bolt + 'One more?</div>' +
          '<div class="exit-sub">Do just <b>one more</b> and your next bonus is <b>DOUBLED</b>.</div>' +
          '<div class="exit-btns">' +
            '<button class="teach-btn teach-go" id="exitOneMore">' + IC.bolt + 'One more — 2× bonus!</button>' +
            '<button class="teach-btn exit-leave" id="exitLeave">Leave for now</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(ov);
    }
    document.getElementById('exitOneMore').onclick = function () {
      S.bonusBoost = true;
      ov.classList.remove('show');
      newRound();   // fresh perform-ready round; the doubled bonus applies when it's scored
    };
    document.getElementById('exitLeave').onclick = function () {
      try { window.location.href = 'home.html'; } catch (e) {}
    };
    ov.classList.add('show');
  }
  function showTapBackBtn() {
    var b = document.getElementById('soloTapBack'); if (b) b.style.display = '';
  }

  /* ============================================================ WIN / LOSE
     The run's two terminal moments, both on the shared .tapback-ov surface so casual
     + every theme style them automatically via --tb-accent:
       • GAME OVER      — groove hit 0. Ends the run (was a silent restart). Retry
                          rebuilds THIS level from the 2-bar ramp; Menu leaves.
       • LEVEL COMPLETE — the capstone gate opened. A real celebration + the next
                          level, plus a dare to attempt the off-ladder 16-bar bonus.
     The 16-bar bonus ("the killer rhythm") is pure upside: it never advances or
     dents the ladder (guidedRecord is skipped) and a miss doesn't cost groove — it's
     bragging rights + a fat score bonus for students who want to flex. ===== */
  var KILLER_NAME = 'Widowmaker';           // the 16-bar bonus challenge's fun name
  var KILLER_BONUS = 750;                   // flat score reward for conquering it

  function leaveToMenu() {
    // Casual wires its own return-to-menu (it has a custom menu screen); the pro game
    // just goes home. Kept generic so the engine never hard-codes casual DOM.
    if (typeof window.__casualGoMenu === 'function') { try { window.__casualGoMenu(); return; } catch (e) {} }
    try { window.location.href = 'home.html'; } catch (e) {}
  }

  function showGameOver() {
    var ov = document.getElementById('soloGameOver');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'soloGameOver'; ov.className = 'tapback-ov solo-end solo-end-over';
      ov.innerHTML =
        '<div class="tb-card end-card">' +
          '<div class="end-head end-head-over">' + IC.disc + 'Groove lost!</div>' +
          '<div class="end-sub">You ran out of groove — the run ends here. Shake it off and run it back.</div>' +
          '<div class="end-score" id="goScore"></div>' +
          '<div class="end-btns">' +
            '<button class="teach-btn teach-go" id="goRetry">' + IC.redo + 'Try this level again</button>' +
            '<button class="teach-btn end-leave" id="goMenu">' + IC.home + 'Menu</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(ov);
    }
    document.getElementById('goScore').innerHTML = 'Final score <b>' + S.score + '</b>';
    document.getElementById('goRetry').onclick = function () {
      ov.classList.remove('show');
      S.groove = 100; S.streak = 0; S.bonusRound = false;
      if (S.guided && GUIDE.avail()) GUIDE.applyLevel();   // rebuild THIS level from 2 bars
      else { S.ramp = 2; S.measures = 2; }
      newRound();
    };
    document.getElementById('goMenu').onclick = leaveToMenu;
    ov.classList.add('show');
  }

  function confettiHTML() {
    var CONF = ['#ff6fa8', '#ffd23f', '#4caf50', '#2f7ee0', '#ff8c42', '#7c5cff', '#22b083', '#ff5f6d'], bits = '';
    for (var ci = 0; ci < 36; ci++) {
      bits += '<i class="tb-confetti-bit" style="left:' + (2 + (ci * 5.3) % 96).toFixed(1) + '%;background:' +
        CONF[ci % CONF.length] + ';animation-delay:' + ((ci * 61) % 800) + 'ms;transform:rotate(' + (((ci * 37) % 90) - 45) + 'deg)"></i>';
    }
    return '<div class="tb-confetti" aria-hidden="true">' + bits + '</div>';
  }

  /* Called after a capstone pass. `nextTitle` = the level just unlocked (or null at the
     end of the ladder). Offers Continue + the optional 16-bar bonus dare. */
  function showLevelComplete(nextTitle) {
    var ov = document.getElementById('soloLevelDone');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'soloLevelDone'; ov.className = 'tapback-ov solo-end solo-end-win';
      ov.innerHTML =
        '<div class="tb-card end-card">' +
          confettiHTML() +
          '<div class="end-head end-head-win">' + IC.check + 'Level complete!</div>' +
          '<div class="end-sub" id="ldSub"></div>' +
          '<div class="end-score" id="ldScore"></div>' +
          '<div class="end-btns">' +
            '<button class="teach-btn teach-go" id="ldNext">' + IC.next + 'Next level</button>' +
            '<button class="teach-btn end-killer" id="ldKiller">' + IC.flame + 'ENTER THE ' + KILLER_NAME.toUpperCase() + '<small>16 bars · only the fearless</small></button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(ov);
    }
    document.getElementById('ldSub').innerHTML = nextTitle
      ? 'Up next: <b>' + nextTitle + '</b>… or do you dare face the ' + KILLER_NAME + '?'
      : 'Top of the ladder. Only the ' + KILLER_NAME + ' remains.';
    document.getElementById('ldScore').innerHTML = 'Score <b>' + S.score + '</b>';
    document.getElementById('ldNext').onclick = function () { ov.classList.remove('show'); newRound(); };
    document.getElementById('ldKiller').onclick = function () {
      ov.classList.remove('show');
      startKillerRound();
    };
    ov.classList.add('show');
  }

  /* The 16-bar bonus round. Off-ladder flex: sets a big bar count + a flag submit()
     reads to award KILLER_BONUS and skip the guided ladder entirely. */
  function startKillerRound() {
    S.bonusRound = true;
    S.measures = 16;
    newRound();   // generates a 16-bar target from the current vocabulary
    msg('The ' + KILLER_NAME + ' — 16 bars, one big rhythm. No pressure. Free flex, groove-safe.');
  }

  /* --------------------------------------------------------------- checking
     Compare by RHYTHMIC ONSETS, not exact tile choice. With percussive clicks a
     half note and a quarter+rest sound identical, a bar can be tiled several
     ways, and rests can be left empty — any answer with the same attacks on the
     grid is correct. */
  // grid units per beat. 840 = LCM(2,3,4,5,6,7,8): covers 16ths/triplets, the
  // half-beat's 8 sixteenths (/8), the dotted-eighth beat's 32nds (/6), and
  // 5/6/7-tuplets — so every figure's onsets land on integer grid indices.
  var RES = 840;
  function gridFromItems(items) {
    var grid = [], i; for (i = 0; i < totalBeats() * RES; i++) grid[i] = 0;
    items.forEach(function (it) {
      var pat = findPattern(it.patternId); if (!pat || !pat.vexflow) return;
      var raw = pat.vexflow.map(function (n) { return noteBeats(n) * RES; });
      var sum = raw.reduce(function (a, x) { return a + x; }, 0) || 1;
      var scale = ((it.beats || pat.beats || 1) * RES) / sum; // figure occupies exactly its beats
      var pos = (beatBase(it.mi) + (it.startBeat - 1)) * RES;  // cumulative beats (per-measure aware)
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
  /* The distinct TARGET figure ids that occupy the given wrong beats ([{m,b}], 1-based).
     Used to feed the escalation trigger "a new figure was missed": a beat is wrong, so the
     figure the target placed across that beat is one the student didn't reproduce. */
  function wrongFiguresFor(wrongBeats) {
    if (!S.target || !wrongBeats || !wrongBeats.length) return [];
    var out = {};
    wrongBeats.forEach(function (w) {
      var meas = S.target[w.m - 1]; if (!meas) return;
      meas.forEach(function (it) {
        var end = it.startBeat + (it.beats || 1) - 1;
        if (w.b >= it.startBeat && w.b <= end) out[it.patternId] = 1;
      });
    });
    return Object.keys(out);
  }
  function answerItems() {
    var a = [], mi, bi, mb = mBeats();
    for (mi = 0; mi < mb.length; mi++) {
      if (!rs.userAnswer[mi]) continue;
      for (bi = 0; bi < mb[mi]; bi++) {
        var v = rs.userAnswer[mi][bi];
        if (v && v.indexOf('_continuation') === -1) { var p = findPattern(v); a.push({ mi: mi, startBeat: bi + 1, patternId: v, beats: p ? p.beats : 1 }); }
      }
    }
    return a;
  }
  function checkAnswer() {
    var tg = gridFromItems(targetItems()), ag = gridFromItems(answerItems());
    var wrong = [], allCorrect = true, mi, bi, k, mb = mBeats();
    for (mi = 0; mi < mb.length; mi++) for (bi = 0; bi < mb[mi]; bi++) {
      var start = (beatBase(mi) + bi) * RES, diff = false;
      for (k = 0; k < RES; k++) if (tg[start + k] !== ag[start + k]) { diff = true; break; }
      if (diff) { allCorrect = false; wrong.push({ m: mi + 1, b: bi + 1 }); }
    }
    return { allCorrect: allCorrect, wrong: wrong };
  }
  function beatSoundCount(mi, bi) {
    var tg = gridFromItems(targetItems()), n = 0, start = (beatBase(mi) + bi) * RES, k;
    for (k = 0; k < RES; k++) if (tg[start + k]) n++;
    return n;
  }
  function markZone(m, b, cls) { var z = document.querySelector('.beat-drop-zone[data-measure="' + m + '"][data-beat="' + b + '"]'); if (z) z.classList.add(cls); }
  function clearMarks() { document.querySelectorAll('.beat-drop-zone.solo-wrong,.beat-drop-zone.solo-right').forEach(function (z) { z.classList.remove('solo-wrong', 'solo-right'); }); }

  /* ----------------------------------------------------------------- rounds */
  function newRound() {
    if (TB.open) closeTapBack();    // a new round tears down any open tap-back overlay + its metro
    stopPlayback();                 // stop any playing rhythm (and the tap-back metro) before building a new one
    // EXTERNAL-TARGET seam (melodic suite reuse): when an embedding page has posted a
    // target (see EXT block below), THIS round plays that exact rhythm instead of
    // generating one. Gated on ?exttarget=1 — zero effect in the normal game.
    if (EXT.active && EXT.pending) {
      S.changing = false;
      S.measures = EXT.pending.target.length;
      S.ts = EXT.pending.ts;
      // bpm()/mBeats()/the grade grid all read S.beatsPerMeasure — it MUST match
      // the external meter or grading silently covers the wrong number of beats
      // per bar (caught by the seam round-trip test: totalBeats 4, expected 8).
      S.beatsPerMeasure = beatsForTs(EXT.pending.ts);
      EXT.current = EXT.pending; EXT.pending = null;
    }
    S.target = (EXT.active && EXT.current) ? EXT.current.target : generateTarget();
    S.hintsThisRound = 0; S.wrongThisRound = false; S.solved = false; S.listensThisRound = 0; S.tapAlongDone = false;
    if (rs.updateGameSettings) rs.updateGameSettings({
      measureCount: S.measures,
      difficulty: bankKey(),                  // engine bank reads rhythmPatterns[key]
      tempo: S.tempo,
      timeSignature: S.changing ? (S.curMeters[0] || '4/4') : S.ts,
      beatsPerMeasure: bpm(),
      measureMeters: (S.changing && S.curMeters) ? S.curMeters : null   // per-measure time sigs
    });
    var fb = document.getElementById('feedback'); if (fb) { fb.style.display = 'none'; fb.textContent = ''; } // solo uses #soloMsg
    filterBank();
    S.narrowed = false; S.narrowCharged = false; setNarrowBtn();   // reset the narrow toggle
    S.pick = null; setPickBtns();                                  // disarm the pick-a-beat hints
    clearMarks();
    document.getElementById('soloNext').style.display = 'none';
    var tbBtn = document.getElementById('soloTapBack'); if (tbBtn) tbBtn.style.display = 'none';
    document.getElementById('soloSubmit').style.display = '';
    render();
    if (S.mode === 'tapping') { newTappingRound(); maybeTeachThisRound(); return; }
    if (rs) rs.onAnswerChanged = updateSubmitBtn;   // re-evaluate Submit on each placement
    updateSubmitBtn();
    // No auto-play — the rhythm only sounds when the student presses Play. (No "press play"
    // prompt: it's obvious, and the message line stays clear for real feedback.)
    msg('');
    maybeTeachThisRound();
  }
  /* TEACH gate for the round we just built. The round is already laid out underneath;
     the teach overlay (quick warm-up or escalation) mounts on TOP and reveals it on
     Start/Skip. Guided-only, and only when the decision says to show one. */
  function maybeTeachThisRound() {
    if (!(S.guided && GUIDE.avail())) return;
    GUIDE.maybeTeach();   // no-op unless teachDecision() returns a screen to show
  }

  /* ---- DEFERRED tapping features (v1 is single-line beat+rhythm). Clean seams:
       - Duet mode (two performers / two staff lines): newTappingRound builds ONE
         line; a second line would be a second revealCorrect target + a 2nd tap zone
         pair. The tap-back overlay (tb-zones) is the place to add the second hand-pair.
       - App-plays-a-line: playTarget() already renders the rhythm to audio; a duet
         variant would call it for the app's line during the player's capture window.
       - Hint buttons (beat / measure / line): the dictation hint machinery
         (hintMistakes / doHearBeat / doCountBeat) is intact and hidden by
         applyModeChrome — re-show + repoint at the tap-back staff to enable.
       - Teacher syllable layer (count-singing / Takadimi etc.): would annotate the
         cloned tb-staff cells (TB.cells) with syllable text on each onset.
     None are wired now — v1 deliberately ships the clean single-line game. ---- */
  /* TAPPING GAME round. Reuses the dictation round wholesale up to here (same
     generateTarget -> same level ladder, same updateGameSettings -> same staff +
     time signature), then DIFFERS only in what happens after the rhythm exists:
     instead of asking the player to dictate it, we SHOW it on the staff right
     away (revealCorrect places the exact target tiles, identical glyphs to the
     dictation game) and IMMEDIATELY render the inline perform-ready state — the
     rhythm + the two tap zones + the Start-metronome button — with no intermediate
     "Perform it" click. "Start metronome" is the only thing the player presses to
     begin (it unlocks audio on its own gesture). */
  /* HAND-SWAP — every single-line tapping round is performed in one of two hand
     orientations so the student learns to keep the beat in EITHER hand (real
     musicianship). 'BL' = Beat-Left/Rhythm-Right (default), 'BR' = the mirror. It is
     PRESENTATION ONLY: the tap handlers stay bound to #tbBeat/#tbRhythm (logical
     roles) — applyTapOrient just flips which screen SIDE each zone sits on (flex
     order) and the hand-hint text. Scoring/timing paths are untouched. */
  var _tapAlt = true;   // start so the first pick resolves to the familiar 'BL'
  function pickTapOrient() {
    // Capstone-forcing (both hands required to master) is layered on in the mastery
    // gate; here we simply alternate so both orientations get exercised each level.
    if (GUIDE.avail() && GUIDE.neededOrient) {
      var forced = GUIDE.neededOrient();
      if (forced) return forced;
    }
    _tapAlt = !_tapAlt;
    return _tapAlt ? 'BR' : 'BL';
  }
  function beatSide() { return S.tapOrient === 'BR' ? 'right' : 'left'; }
  function rhythmSide() { return S.tapOrient === 'BR' ? 'left' : 'right'; }
  function applyTapOrient() {
    var beat = document.getElementById('tbBeat'), rhythm = document.getElementById('tbRhythm');
    if (!beat || !rhythm) return;
    var br = S.tapOrient === 'BR';
    beat.style.order = br ? '2' : '1';      // BR: Beat renders on the RIGHT
    rhythm.style.order = br ? '1' : '2';
    var bh = document.getElementById('tbBeatHint'), rh = document.getElementById('tbRhythmHint');
    if (bh) bh.textContent = beatSide() + ' hand';
    if (rh) rh.textContent = rhythmSide() + ' hand';
  }

  function newTappingRound() {
    S.tapOrient = pickTapOrient();   // choose this round's hand orientation before mounting the panel
    // Show the rhythm to perform. Preferred path = the SHARED grouped-cell answer board
    // (RhythmQuest look); it rebuilds #measureContainer from S.target and keeps every
    // overlay hook intact. Falls back to the old continuous-staff pre-fill when the board
    // can't run (changing meter, or the shared board not loaded).
    if (!buildPerformBoard()) revealCorrect();
    // S.solved=true so the shared perform path (openTapBack) is allowed to run. It is
    // gated behind S.solved by construction; the tapping game's whole point is that
    // the rhythm is already revealed, so that gate is satisfied immediately.
    S.solved = true;
    if (rs) rs.onAnswerChanged = null;                 // no answer-editing in tapping mode
    document.getElementById('soloSubmit').style.display = 'none';
    document.getElementById('soloNext').style.display = '';
    var tbBtn = document.getElementById('soloTapBack'); if (tbBtn) tbBtn.style.display = 'none';  // no launcher button
    // Relabel the staff pill: this isn't the player's answer, it's the rhythm to perform.
    var lbl = document.querySelector('#measureContainer .answer-staff-label');
    if (lbl) lbl.textContent = 'Perform this rhythm (' + S.measures + ' bar' + (S.measures === 1 ? '' : 's') + ')';
    save(); render();
    // Render the inline perform interaction RIGHT NOW (no click). openTapBack(true)
    // mounts the panel under the main staff and drops into 'ready' (metronome off);
    // the player just presses Start metronome. The main staff already shows the rhythm.
    openTapBack(true);
    applyTapOrient();   // flip the zones to this round's orientation (after they're mounted)
    syncBankPad();
    msg('Press Start metronome, then tap the BEAT (' + beatSide() + ') to lock in.');
  }

  // On small screens, save space: only show Submit once every beat is filled.
  function updateSubmitBtn() {
    var btn = document.getElementById('soloSubmit'); if (!btn) return;
    var next = document.getElementById('soloNext');
    if (S.solved || (next && next.style.display !== 'none')) { btn.style.display = 'none'; return; }
    var mobile = false;
    try { mobile = window.matchMedia('(pointer: coarse) and (max-width: 1400px)').matches; } catch (e) {}
    // Submit appears ONLY when every answer tile is filled (owner: never present otherwise).
    // Enforced on touch AND on the tiles/casual skin (so it holds regardless of width).
    var gated = mobile || document.body.classList.contains('tiles-skin');
    var incomplete = rs && rs.isComplete && !rs.isComplete();
    btn.style.display = (gated && incomplete) ? 'none' : '';
    syncBankPad();   // the floating action row's height changed -> re-fit staff bottom pad + offset
  }

  function submit() {
    if (S.solved) return;
    clearMarks();
    var r = checkAnswer();
    // EXTERNAL-TARGET seam: report the grade to the embedding page. Correction mode is
    // forced OFF in ext mode (see EXT block), so every submit here is terminal.
    if (EXT.active && window.parent !== window) {
      var extTotal = 0, extMb = mBeats();
      for (var extI = 0; extI < extMb.length; extI++) extTotal += extMb[extI];
      try {
        window.parent.postMessage({
          type: 'melodic-ext-result',
          allCorrect: r.allCorrect,
          wrongBeats: r.wrong.length,
          totalBeats: extTotal
        }, '*');
      } catch (e) {}
    }
    if (r.allCorrect) {
      S.solved = true;
      playWin();   // cheerful fanfare on a correct answer
      // KILLER (16-bar) BONUS round: off-ladder flex. Award the flat bonus, DON'T touch the
      // guided ladder, restore the normal bar count, and offer Next. Groove-safe by design.
      if (S.bonusRound) {
        S.bonusRound = false;
        S.score += KILLER_BONUS;
        floatDelta('+' + KILLER_BONUS, true, scoreAnchor());
        S.measures = (S.guided && GUIDE.avail()) ? GUIDE.rampBars() : S.ramp;
        msg('You survived the ' + KILLER_NAME + '! +' + KILLER_BONUS + ' bonus. Certified monster.');
        document.getElementById('soloSubmit').style.display = 'none';
        document.getElementById('soloNext').style.display = '';
        syncBankPad(); save(); render(); return;
      }
      // "clean" = correct, first-try, no hints, AND within the listen cap. Going over the
      // cap is as costly as a hint here: the answer counts as correct but NOT clean, so it
      // neither builds the streak/groove nor advances the ramp. A SINGLE listen is the
      // fast-track signal that accelerates the 2->4->8 ramp (see recordRound).
      var listens = S.listensThisRound || 0;
      var cap = listenCapFor(S.measures);
      var withinCap = listens <= cap;
      var noSlips = !S.wrongThisRound && S.hintsThisRound === 0;
      var clean = noSlips && withinCap;
      var singleListen = clean && listens <= 1;
      if (clean) { S.streak++; S.groove = Math.min(100, S.groove + GROOVE_GAIN_CLEAN); floatDelta('+' + GROOVE_GAIN_CLEAN, true, grooveAnchor()); }
      else { S.streak = 0; }
      var pts = Math.round((100 + (clean ? S.streak * 20 : 0)) * tempoMult());   // tempo scales POINTS (not groove)
      S.score += pts;
      floatDelta('+' + pts, true, scoreAnchor());   // points flash on every correct answer
      var tempoNote = S.speed === 'fast' ? '  ·  Fast-tempo bonus' : (S.speed === 'slow' && tempoMult() < 1) ? '  ·  (slower = fewer points)' : '';
      var baseMsg = clean ? 'Nailed it first try! +' + pts + '  ·  Groove +' + GROOVE_GAIN_CLEAN + '  ·  streak ×' + S.streak + tempoNote
                  : (noSlips && !withinCap) ? 'Correct! +' + pts + '  ·  but that took ' + listens + ' listens — keep it to ' + cap + ' to count clean'
                  : 'Correct! +' + pts + tempoNote;
      // GUIDED: record mastery + run the capstone/ramp gate. A fully-correct answer is
      // 100% beats correct (every beat matched), so the per-beat groove for THIS round
      // is 100; the gate also requires the capstone bar count (8). bonus points for the
      // 16-bar extra are handled by the existing scoring (more bars = more points).
      var adv = guidedRecord(true, clean, 100, { singleListen: singleListen, listens: listens });
      msg(adv && adv.advText ? baseMsg + '  ·  ' + adv.advText : baseMsg);
      document.getElementById('soloSubmit').style.display = 'none';
      document.getElementById('soloNext').style.display = '';
      // LEVEL COMPLETE: the capstone gate opened this round -> celebration overlay + the
      // 16-bar dare, instead of the plain Next. Otherwise offer the optional tap-back bonus.
      var capstonePassed = adv && adv.res && adv.res.capstonePassed;
      if (capstonePassed) {
        var nextTitle = (adv.res.leveledUp && GUIDE.avail()) ? GUIDE.curLevel().title : null;
        save(); render();
        showLevelComplete(nextTitle);
        return;
      }
      showTapBackBtn();   // OPTIONAL bonus — only ever offered after a correct answer
      syncBankPad();      // Next + Tap-back now showing -> re-fit the floating action row
      save(); render(); return;
    }
    S.wrongThisRound = true;
    playLose();   // comedic "womp-womp" on a wrong answer
    // KILLER (16-bar) BONUS miss: groove-safe flex — no groove penalty, no ladder record.
    // Reveal the answer, restore the normal bar count, offer Next. The killer bites; it
    // never punishes your real progress.
    if (S.bonusRound) {
      S.bonusRound = false;
      S.measures = (S.guided && GUIDE.avail()) ? GUIDE.rampBars() : S.ramp;
      revealCorrect();
      msg('The ' + KILLER_NAME + ' got you this time — no harm done. Onward.');
      document.getElementById('soloSubmit').style.display = 'none';
      document.getElementById('soloNext').style.display = '';
      syncBankPad(); save(); render(); return;
    }
    S.groove = Math.max(0, S.groove - GROOVE_PER_WRONG * r.wrong.length); grooveHit(GROOVE_PER_WRONG * r.wrong.length);
    if (S.correctionMode) {
      r.wrong.forEach(function (w) { markZone(w.m, w.b, 'solo-wrong'); });
      msg(r.wrong.length + ' beat(s) off — fix the red beats, then submit again.');
    } else {
      S.streak = 0; revealCorrect();
      // GUIDED: a terminal wrong answer (no fix-it) counts as wrong for the mastery
      // meter (-30). It never passes the capstone (correct=false), so no advance. Pass
      // the wrong target figures so the escalation trigger can spot a repeatedly-missed
      // new figure.
      guidedRecord(false, false, 0, { wrongFigures: wrongFiguresFor(r.wrong) });
      msg('Not quite — here’s the correct rhythm.');
      document.getElementById('soloSubmit').style.display = 'none';
      document.getElementById('soloNext').style.display = '';
    }
    syncBankPad();   // Submit -> Next swap changed the floating action row
    if (S.groove <= 0) grooveBroken();
    save(); render();
  }

  function revealCorrect() {
    stopPerformBoardWatchers();   // this rebuilds the staff; drop any prior board's centre-pass timers
    if (rs.clearAnswers) rs.clearAnswers();
    S.target.forEach(function (meas, mi) {
      meas.forEach(function (it) {
        var z = document.querySelector('.beat-drop-zone[data-measure="' + (mi + 1) + '"][data-beat="' + it.startBeat + '"]');
        if (z && rs.placeTile) { try { rs.placeTile(z, it.patternId, mi + 1, it.startBeat); } catch (e) {} }
      });
    });
  }

  /* GROUPED-CELL PERFORM BOARD — renders the "Perform this rhythm" display with the
     SHARED RhythmQuest answer board (shared/rhythm-notation/answer-board.js) instead of
     the old continuous staff, so TapQuest's notation matches what RhythmQuest draws in its
     default (hybrid) renderer. That default runs EVERY figure family through the shared
     VexFlow renderer: quest-redesign.js shouldRenderPlacedVex marks the beat-unit families
     (compound/half-beat/dotted-half/eighth-beat/dotted-eighth) renderAssetOnly, but they all
     hit its custom-beaming exception (usesBeatUnitCustomBeaming) and tuplets hit the tuplet
     exception, so hybrid returns true for all of them — verified against every assetRenderedSpec
     id in renderer.js. It does NOT mirror RhythmQuest's ?renderer=png dev mode, and — like
     RhythmQuest, which drops to PNG when VexFlow is absent — it needs VexFlow; the getVexFlow +
     spec guards below reject the two KNOWN blank causes (VexFlow not loaded, or a target figure
     with no VexFlow spec) BEFORE committing, returning false so the caller keeps the old staff.
     They cannot promise a connected host with valid specs never blanks in the deferred render
     (renderPlacedVex is async), but they remove the causes we can see up front. It is
     a drop-in for revealCorrect() in the tapping game: it rebuilds #measureContainer from
     S.target and re-stamps the board's beat cells with the SAME hooks every overlay
     already queries — the host gets class `answer-staff` (so `#measureContainer
     .answer-staff …` resolves) and each `.beat-drop-zone` gets a within-measure, 1-based
     data-beat + its data-measure + a running data-absolute-beat. Because that DOM contract
     is preserved, the tap-back cell index (TB.cells), the beat-guide `.solo-beat-on`
     highlight, the tap-along dots and the count-off overlay keep working WITHOUT touching
     their code. Horizontal scroll works differently than for the old staff: the compact-scroll's
     `.staff-container` ROW-FLATTENING loop (enterPerformLayout, solo-mode.js:~1721) is a no-op
     because the grouped board emits `.staff-row`/`.measure-group`, not `.staff-container` — but
     enterPerformLayout STILL runs (compactScrollEligible accepts the board via its scrollWidth
     check, solo-mode.js:~1705) and sets TB.scrollLane to the board, so the auto-scroll-to-active-
     cell keeps working; the horizontal scrolling itself is provided by tapquest-perform-board.css.
     (That CSS also neutralises the continuous-staff `.beat-drop-zone` rules that would otherwise
     leak onto the grouped cells.)

     Returns true when it rendered the board (caller then SKIPS revealCorrect); false to
     fall back to the old continuous-staff pre-fill. GATED to the tapping game, simple
     (non-changing) meter, and the shared board actually being loaded — so the dictation
     staff and BeatQuest Casual (dictation) are never affected, and changing-meter rounds
     (which need per-measure inline time signatures the board does not draw) stay on the
     old renderer. */
  // Holds the running centre-pass poll + ResizeObserver for the CURRENT perform board so a
  // new round (or a fall-through to revealCorrect) can stop them — otherwise they keep firing
  // against the detached old host until their own timeouts expire (Codex finding).
  var performBoardCleanup = null;
  function stopPerformBoardWatchers() {
    if (performBoardCleanup) { try { performBoardCleanup(); } catch (e) {} performBoardCleanup = null; }
  }
  function buildPerformBoard() {
    stopPerformBoardWatchers();
    if (S.mode !== 'tapping' || S.changing) return false;
    if (!window.RhythmAnswerBoard || !window.RhythmNotation) return false;
    // The board renders EVERY figure through the shared VexFlow renderer, which no-ops
    // (leaving cells blank) when VexFlow is not on the page. renderAnswer still builds the
    // cells, so a `.beat-drop-zone` count is NOT proof the notation drew. Gate on VexFlow
    // up front — exactly what RhythmQuest checks (shouldRenderPlacedVex: `if (!getVexFlow())
    // return false`) before it falls back — so a missing/failed vendor script drops us to
    // revealCorrect() (the old staff) instead of committing a blank perform board.
    if (typeof window.RhythmNotation.getVexFlow !== 'function' || !window.RhythmNotation.getVexFlow()) return false;
    var container = document.getElementById('measureContainer');
    if (!container || !S.target) return false;

    // S.target (measures of { patternId, startBeat, beats }) -> the board's flat
    // [{ figureId, beats }] in play order. Each item is one meter beat-cell head; the
    // board expands multi-beat figures (half, dotted-half, …) into span + continuation
    // cells itself.
    var rhythm = [];
    S.target.forEach(function (meas) {
      meas.forEach(function (it) {
        if (it && it.patternId) rhythm.push({ figureId: it.patternId, beats: Math.max(1, Number(it.beats) || 1) });
      });
    });
    if (!rhythm.length) return false;

    // Every cell draws through renderPlacedVex, which SILENTLY returns (no PNG fallback) for a
    // figure id it has no spec for (renderer.js: `if (!spec ...) return`), leaving that one cell
    // blank while the board still reports success. So require a VexFlow spec for EVERY figure up
    // front; if any is unknown, bail to revealCorrect() rather than commit a partially-blank
    // board. RhythmNotation.catalog is beatVexPatterns (the exact map renderPlacedVex reads).
    var vexCatalog = window.RhythmNotation.catalog || {};
    if (!rhythm.every(function (f) { return f.figureId && vexCatalog[f.figureId]; })) return false;

    // Pass the REAL time-signature string so compound (6/8, 9/8, 12/8), half-note and
    // dotted-half meters draw the correct signature; beatsPerMeasure is the beat COUNT
    // per bar (dotted-quarter beats in compound), which the board uses for grouping.
    var meter = { timeSignature: S.ts, beatsPerMeasure: bpm() };

    // Build the board OFF-DOM first; only swap #measureContainer once it succeeds, so a
    // failure leaves the already-built continuous staff intact for the revealCorrect
    // fallback.
    var host = document.createElement('div');
    host.className = 'answer-staff perform-board';
    try {
      window.RhythmAnswerBoard.renderAnswer(host, rhythm, meter, { showTimeSignature: true });
    } catch (e) { return false; }
    if (!host.querySelector('.beat-drop-zone')) return false;

    // Overlay-compat stamping: every engine overlay indexes cells by (data-measure,
    // within-measure 1-based data-beat). The board emits one `.beat-drop-zone` per beat
    // (span heads + continuations) in order, grouped under `.measure-group[data-measure]`.
    var abs = 0;
    var groups = host.querySelectorAll('.measure-group');
    for (var g = 0; g < groups.length; g++) {
      var m = parseInt(groups[g].dataset.measure, 10) || (g + 1);
      var zones = groups[g].querySelectorAll('.beat-drop-zone');
      for (var b = 0; b < zones.length; b++) {
        abs += 1;
        zones[b].dataset.measure = String(m);
        zones[b].dataset.beat = String(b + 1);
        zones[b].dataset.absoluteBeat = String(abs);
      }
    }

    var label = document.createElement('div');
    label.className = 'answer-staff-label';
    label.textContent = 'Perform this rhythm (' + S.measures + ' bar' + (S.measures === 1 ? '' : 's') + ')';

    var mc = document.createElement('div');
    mc.className = 'measure-container';
    mc.appendChild(label);
    mc.appendChild(host);

    container.innerHTML = '';
    container.appendChild(mc);

    // ===========================================================================================
    // !!!!!!!!!  DO NOT REMOVE `centerGlyphs`, AND DO NOT ADD A SECOND RE-CENTER ELSEWHERE.  !!!!!!!!!
    // ===========================================================================================
    // THIS IS THE FIX FOR "notes sit too low in the answer area on iPhone/iPad Safari." Per the OWNER,
    // it was broken and re-fixed twice on 2026-07-11 (he is, rightly, furious about regressing it); the
    // three rules below are the lessons from those two owner-reported incidents. Read this before you
    // touch ANY rhythm-rendering code:
    //
    //   THE BUG: the SHARED renderer (shared/rhythm-notation/renderer.js normalizePlacedVex) centers
    //   each glyph by measuring it with getBBox(). In Safari, inside this board's fixed/scrolling
    //   landscape layout, getBBox returns a TRANSIENT wrong y at render time and settles late, so the
    //   transform locks in LOW. Re-rendering only re-hits the same bad measurement. getBoundingClientRect
    //   is reliable, so `centerGlyphs` below re-centers each glyph in screen space AFTER paint.
    //
    //   THE RULES:
    //   1. NEVER "move this fix into the shared renderer" so "every surface gets it." This board ALREADY
    //      has centerGlyphs; a second re-center in the shared renderer that is not a perfect no-op FIGHTS
    //      this one and pushes the notes back out of place -- that is exactly what regressed this board
    //      when it was tried. If another surface (answer-entry, MelodyQuest) needs it, give THAT surface
    //      its OWN scoped re-center; do NOT add one to the shared renderer.
    //   2. NEVER delete centerGlyphs thinking the shared renderer now handles it. It does NOT.
    //   3. You CANNOT verify this in headless Chrome (Chrome's getBBox is fine; measured a no-op there,
    //      -11px before and after). It has only been OBSERVED in the owner's Safari (his on-device reports).
    //      ANY change near here MUST be owner-confirmed on-device before you claim it works. See memory:
    //      safari-stale-js-and-getbbox.
    // ===========================================================================================
    // How it works: leave the renderer's output alone, then re-center each glyph in screen space by
    // nudging its existing transform's translateY, but ONLY when it is measurably off (the
    // `Math.abs(deltaPx) < 1` early-return below), so it is a no-op wherever the glyph was already right.
    // Runs across a few post-paint passes + on resize so it converges whenever Safari settles.
    var centerGlyphs = function () {
      if (!host.isConnected) return;   // board was replaced; nothing to re-center
      host.querySelectorAll('.placed-vex-host > svg').forEach(function (svg) {
        var g = svg.querySelector('g'); if (!g) return;
        var box = svg.parentNode; // .placed-vex-host, fills the beat cell
        var gr = g.getBoundingClientRect(), br = box.getBoundingClientRect();
        var vb = svg.viewBox && svg.viewBox.baseVal, svgH = svg.getBoundingClientRect().height;
        if (!gr.height || !br.height || !vb || !svgH) return;
        var deltaPx = (br.top + br.height / 2) - (gr.top + gr.height / 2); // + => move glyph DOWN
        if (Math.abs(deltaPx) < 1) return;
        var m = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)\s*\)\s*scale\(\s*([\d.]+)/.exec(g.getAttribute('transform') || '');
        if (!m) return;
        var deltaUnits = deltaPx * (vb.height / svgH); // px -> viewBox units (pre-scale translate space)
        g.setAttribute('transform', 'translate(' + m[1] + ' ' + (parseFloat(m[2]) + deltaUnits) + ') scale(' + m[3] + ')');
      });
    };
    // Poll briefly so it converges whenever Safari's layout settles, then stop. Every timer,
    // frame and observer started here is captured on performBoardCleanup so the next round (or
    // revealCorrect) cancels it; and centerGlyphs itself early-returns once the host is detached,
    // so a callback that still slips through is a no-op.
    var raf1 = 0, raf2 = 0, cgN = 0;
    raf1 = requestAnimationFrame(function () { raf2 = requestAnimationFrame(centerGlyphs); });
    var cgTimer = setInterval(function () { centerGlyphs(); if (++cgN >= 12) stopPerformBoardWatchers(); }, 120);
    var ro = (typeof ResizeObserver === 'function') ? new ResizeObserver(function () { centerGlyphs(); }) : null;
    if (ro) ro.observe(host);
    var roStop = setTimeout(function () { if (ro) ro.disconnect(); }, 2500);
    performBoardCleanup = function () {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearInterval(cgTimer);
      clearTimeout(roStop);
      if (ro) ro.disconnect();
    };

    // The board renders glyphs itself (shared VexFlow renderer); the userAnswer grid is
    // unused in the tapping game (scoring reads targetOnsets(), not rs.userAnswer).
    return true;
  }
  // Groove hit 0 -> the run is over. A real Game Over screen (Retry this level / Menu)
  // replaces the old silent restart. Bonus (killer) rounds are groove-safe, so this is
  // never reached from them. resetting groove/ramp happens on Retry (see showGameOver).
  function grooveBroken() { showGameOver(); }

  /* Bridge a graded round into the guided spine: record mastery, run the capstone/
     ramp gate, refresh the level picker + mastery meter, and return a short status
     string for the round message. No-op (returns null) in free play. Shared by the
     dictation submit() and the tapping showResults() so BOTH games drive the SAME
     matched ladder identically. */
  function guidedRecord(correct, clean, groovePct, meta) {
    // PLACEMENT intercept: assessment answers feed the placement counter, never
    // the mastery ladder (the test is diagnostic, not practice).
    if (PLACE.active) { PLACE.record(!!correct); return { advanced: false, leveledUp: false }; }
    if (!(S.guided && GUIDE.avail())) return null;
    var before = GUIDE.curLevel();
    var res = GUIDE.recordRound(correct, clean, groovePct, meta);
    var advText = null;
    if (res.capstonePassed) {
      if (res.leveledUp) {
        var now = GUIDE.curLevel();
        advText = 'Level passed! → Ch ' + now.hallChapter + ' · ' + now.title;
        // The newly-unlocked level's warm-up is shown by newRound() (on Next) once that
        // level's round is actually built — NOT here, where the passed level is still on
        // screen. newRound() is the single teach trigger for both games.
      } else {
        advText = 'Level passed! (end of the available ladder)';
      }
    } else if (res.rampedUp) {
      // ramp advanced this round (e.g. 2 -> 4); reflected on the next newRound().
      advText = 'Clean! Next: ' + res.rampBars + ' bars';
    } else if (res.needOtherHand) {
      // Clean capstone in ONE orientation — the other hand is now forced to master.
      advText = 'Clean! Now perform it the OTHER way — Beat in your ' + rhythmSide() + ' hand.';
    } else if (GUIDE.atCapstone && GUIDE.atCapstone() && correct && clean) {
      // At capstone, clean, but the full gate (Proficient band + streak) isn't open yet.
      advText = 'Clean! Keep it up to master this level (' + Math.round(res.masteryScore || 0) + '/80).';
    }
    fillLevelOptions();   // mastered/now tags + frontier may have moved
    render();             // mastery meter + ramp readout
    return { res: res, advText: advText };
  }

  /* ---------------------------------------------------------- score "juice"
     Floating +/- number that pops off an anchor and drifts up — makes every groove
     change and every point gain VISIBLE (owner: "when you click a hint should you see
     a -8 appear… when you pass, the points flash on screen"). Anchored to whichever
     score/groove element is actually on screen (the compact touch quickstats or the
     desktop readout). Cheap, self-cleaning, never blocks input. */
  // Anchor groove pops to whatever's ON SCREEN: the frame's groove badge (Option E, the bar
  // is hidden) first, else the old header bar. Without this the −8 hint pop had no anchor.
  function grooveAnchor() { return document.querySelector('.answer-area .groove-badge') || document.getElementById('soloGroovePct') || document.querySelector('#soloHud .solo-stat.groove'); }
  function scoreAnchor() { var q = document.getElementById('soloScoreQ'); if (q && q.offsetParent) return q; return document.getElementById('soloScore') || q; }
  function floatDelta(text, good, anchor) {
    try {
      if (!anchor) return;
      var r = anchor.getBoundingClientRect();
      if (!r.width && !r.height) return;
      var el = document.createElement('div');
      el.className = 'delta-pop ' + (good ? 'delta-good' : 'delta-bad');
      el.textContent = text;
      el.style.left = (r.left + r.width / 2) + 'px';
      el.style.top = (r.top - 4) + 'px';
      document.body.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1050);
    } catch (e) {}
  }
  function grooveHit(cost) { floatDelta('−' + cost, false, grooveAnchor()); }   // groove loss pop
  // Cost badge shown on each hint button: "−N ◎" (the groove disc), so students see the
  // price BEFORE tapping — and learn what the groove meter measures.
  function hintCostBadge(n) { return '<span class="hint-cost">−' + n + IC.disc + '</span>'; }

  /* WIN / FAIL SOUND EFFECTS — the playful "did I get it?" payoff students love (the cheap
     app-store version has silly sounds). WIN = a bright ascending fanfare; FAIL = a comedic
     "womp-womp" pitch-bend. Pure synth (no audio files), respects the Quiet toggle, and
     varies so it doesn't get old. */
  function playWin() {
    var c = ctx(); if (!c || S.quiet) return;
    var VARIANTS = [[523.25, 659.25, 783.99, 1046.5], [587.33, 739.99, 880.0, 1174.7], [523.25, 698.46, 880.0, 1046.5]];
    var notes = VARIANTS[Math.floor(Math.random() * VARIANTS.length)], t0 = c.currentTime + 0.02;
    notes.forEach(function (f, i) {
      var o = c.createOscillator(), g = c.createGain(), st = t0 + i * 0.085, last = i === notes.length - 1;
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.28, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, st + (last ? 0.6 : 0.24));
      o.connect(g).connect(c.destination); o.start(st); o.stop(st + (last ? 0.6 : 0.24));
    });
  }
  function playLose() {
    var c = ctx(); if (!c || S.quiet) return;
    var t0 = c.currentTime + 0.02;
    [[196, 155.56], [155.56, 116.54]].forEach(function (pr, i) {
      var o = c.createOscillator(), g = c.createGain(), st = t0 + i * 0.26;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(pr[0], st);
      o.frequency.exponentialRampToValueAtTime(pr[1], st + 0.22);
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.22, st + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.24);
      o.connect(g).connect(c.destination); o.start(st); o.stop(st + 0.26);
    });
  }

  /* ------------------------------------------------------------------ hints */
  function hintMistakes() {
    if (S.solved) return;
    S.hintsThisRound++; S.groove = Math.max(0, S.groove - GROOVE_HINT_MISTAKES); grooveHit(GROOVE_HINT_MISTAKES);
    clearMarks();
    var r = checkAnswer();
    var filledWrong = r.wrong.filter(function (w) { return rs.userAnswer[w.m - 1][w.b - 1]; });
    filledWrong.forEach(function (w) { markZone(w.m, w.b, 'solo-wrong'); });
    msg(filledWrong.length ? filledWrong.length + ' placed beat(s) are wrong (red).' : 'Nothing placed is wrong — you’re just missing beats.');
    if (S.groove <= 0) grooveBroken();
    save(); render();
  }
  /* Pick-a-beat hints. The student ARMS a mode ("Count sounds" or "Hear a beat")
     then TAPS the beat they want — no more guessing a random beat. */
  function setPickBtns() {
    var c = document.getElementById('soloHintCount'), h = document.getElementById('soloHearBeat');
    if (c) c.classList.toggle('on', S.pick === 'count');
    if (h) h.classList.toggle('on', S.pick === 'play');
  }
  function armPick(mode) {
    if (S.solved) return;
    S.pick = (S.pick === mode) ? null : mode;     // toggle; stays armed for multiple taps
    setPickBtns();
    document.body.classList.toggle('pick-armed', !!S.pick);   // outlines the answer beats as tappable
    msg(S.pick === 'count' ? 'Now tap a beat to count its sounds.' : S.pick === 'play' ? 'Now tap a beat to hear just that beat.' : '');
  }
  function doCountBeat(m, b) {
    var n = beatSoundCount(m - 1, b - 1);
    S.hintsThisRound++; S.groove = Math.max(0, S.groove - GROOVE_HINT_COUNT); grooveHit(GROOVE_HINT_COUNT);
    clearMarks(); markZone(m, b, 'solo-right');
    msg('Measure ' + m + ', beat ' + b + ': ' + n + ' sound' + (n === 1 ? '' : 's') + '.');
    // The message line is hidden in casual — pop the count ON the tapped beat so it's visible.
    var cell = document.querySelector('.beat-drop-zone[data-measure="' + m + '"][data-beat="' + b + '"]');
    if (cell) floatDelta(n + (n === 1 ? ' sound' : ' sounds'), true, cell);
    if (S.groove <= 0) grooveBroken();
    save(); render();
  }
  function doHearBeat(m, b) {
    var c = ctx(); if (!c) { msg('Tap a button to enable sound first.'); return; }
    var grid = gridFromItems(targetItems());
    var start = (beatBase(m - 1) + (b - 1)) * RES, beatDur = 60 / S.tempo, t0 = c.currentTime + 0.15;
    metroTick(t0, true);                          // the beat's downbeat, for reference
    var sounds = 0, k;
    for (k = 0; k < RES; k++) if (grid[start + k]) { rhythmHit(t0 + (k / RES) * beatDur); sounds++; }
    S.hintsThisRound++; S.groove = Math.max(0, S.groove - GROOVE_HINT_PLAY); grooveHit(GROOVE_HINT_PLAY);
    clearMarks(); markZone(m, b, 'solo-right');
    msg('Measure ' + m + ', beat ' + b + ' — ' + sounds + ' sound' + (sounds === 1 ? '' : 's') + '.');
    if (S.groove <= 0) grooveBroken();
    save(); render();
  }
  // Reflect the narrow state on its button (label + pressed look).
  function setNarrowBtn() {
    var btn = document.getElementById('soloHintNarrow'); if (!btn) return;
    btn.classList.toggle('on', !!S.narrowed);
    btn.innerHTML = IC.filter + (S.narrowed ? 'Show all' : 'Narrow options' + hintCostBadge(GROOVE_HINT_NARROW));
  }
  // TOGGLE: hide every bank tile whose figure isn't in this example (so the
  // student only chooses among the figures used), or restore the full level bank.
  // Resets each new round. The groove cost is charged only the first time.
  function hintNarrow() {
    if (S.solved) return;
    if (S.narrowed) {                 // un-narrow -> restore the level-filtered bank (free)
      filterBank(); S.narrowed = false; setNarrowBtn();
      msg('Showing all figures again.'); render(); return;
    }
    var used = {};
    S.target.forEach(function (meas) { meas.forEach(function (it) { used[it.patternId] = 1; }); });
    document.querySelectorAll('.rhythm-tile').forEach(function (t) { if (!used[t.dataset.patternId]) t.style.display = 'none'; });
    S.narrowed = true; setNarrowBtn();
    if (!S.narrowCharged) { S.hintsThisRound++; S.groove = Math.max(0, S.groove - GROOVE_HINT_NARROW); grooveHit(GROOVE_HINT_NARROW); S.narrowCharged = true; }
    msg('Showing only the ' + Object.keys(used).length + ' figure(s) in this example.');
    if (S.groove <= 0) grooveBroken();
    save(); render();
  }

  /* -------------------------------------------------------------------- UI */
  function msg(t) { var el = document.getElementById('soloMsg'); if (el) el.textContent = t; }
  // Human label per mastery band (from core/mastery LEVELS). No emoji.
  var BAND_LABEL = { attempted: 'Attempted', familiar: 'Familiar', proficient: 'Proficient', mastered: 'Mastered' };
  /* GROOVE RING — the answer frame's border drawn as a depleting progress ring (track + fill),
     ported verbatim from the approved groove-mockups.html (now archive/groove-mockups.html). A grey track is the full frame; two
     colour half-paths from top-centre down each side show groove% of the perimeter, draining
     symmetrically from the bottom up. Recomputed every render + on resize so it never distorts
     when the frame changes size (e.g. the 16-bar). Colour = the same green→red hue as before. */
  function updateGrooveRing() {
    if (!document.body.classList.contains('tiles-skin')) return;
    var area = document.querySelector('.answer-area'); if (!area) return;
    var W = area.clientWidth, H = area.clientHeight;
    if (W < 40 || H < 40) return;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = area.querySelector('.groove-ring');
    if (!svg) {
      svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'groove-ring');
      svg.setAttribute('preserveAspectRatio', 'none');   // fill the frame exactly, never letterbox
      ['gr-track', 'gr-fill gr-r', 'gr-fill gr-l'].forEach(function (cl) { var pp = document.createElementNS(NS, 'path'); pp.setAttribute('class', cl); pp.setAttribute('pathLength', '100'); svg.appendChild(pp); });
      area.insertBefore(svg, area.firstChild);
      // Redraw whenever the frame's size actually changes (flex settle, 16-bar, orientation) —
      // render() alone fired too early (stale height → the ring stopped short of the edges).
      if (typeof ResizeObserver !== 'undefined' && !area._grObs) {
        area._grObs = new ResizeObserver(function () { updateGrooveRing(); });
        area._grObs.observe(area);
      }
    }
    var SW = 6, R = 18, t = SW / 2, cx = W / 2, g = Math.max(0, Math.min(100, S.groove));
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var track = 'M' + (t + R) + ' ' + t + 'L' + (W - t - R) + ' ' + t + 'A' + R + ' ' + R + ' 0 0 1 ' + (W - t) + ' ' + (t + R) + 'L' + (W - t) + ' ' + (H - t - R) + 'A' + R + ' ' + R + ' 0 0 1 ' + (W - t - R) + ' ' + (H - t) + 'L' + (t + R) + ' ' + (H - t) + 'A' + R + ' ' + R + ' 0 0 1 ' + t + ' ' + (H - t - R) + 'L' + t + ' ' + (t + R) + 'A' + R + ' ' + R + ' 0 0 1 ' + (t + R) + ' ' + t + 'Z';
    var rp = 'M' + cx + ' ' + t + 'L' + (W - t - R) + ' ' + t + 'A' + R + ' ' + R + ' 0 0 1 ' + (W - t) + ' ' + (t + R) + 'L' + (W - t) + ' ' + (H - t - R) + 'A' + R + ' ' + R + ' 0 0 1 ' + (W - t - R) + ' ' + (H - t) + 'L' + cx + ' ' + (H - t);
    var lp = 'M' + cx + ' ' + t + 'L' + (t + R) + ' ' + t + 'A' + R + ' ' + R + ' 0 0 0 ' + t + ' ' + (t + R) + 'L' + t + ' ' + (H - t - R) + 'A' + R + ' ' + R + ' 0 0 0 ' + (t + R) + ' ' + (H - t) + 'L' + cx + ' ' + (H - t);
    svg.querySelector('.gr-track').setAttribute('d', track);
    var col = 'hsl(' + Math.round(g * 1.3) + ',68%,44%)';
    var pr = svg.querySelector('.gr-r'), pl = svg.querySelector('.gr-l');
    pr.setAttribute('d', rp); pl.setAttribute('d', lp);
    [pr, pl].forEach(function (p) { p.style.strokeDasharray = g + ' ' + (100 - g); p.style.stroke = col; });
  }
  try { window.addEventListener('resize', function () { updateGrooveRing(); }); } catch (e) {}

  function render() {
    var f = document.getElementById('soloGrooveFill');
    if (f) { f.style.width = S.groove + '%'; f.style.background = S.groove > 50 ? 'var(--groove-ok,#19e07a)' : S.groove > 25 ? 'var(--groove-warn,#ffd24a)' : 'var(--groove-low,#ff5a4d)'; }
    var p = document.getElementById('soloGroovePct'); if (p) p.textContent = S.groove + '%';
    // Option E (tiles/casual): GROOVE is the answer's border. Colour it by level and put a
    // small disc-labelled badge on the answer's lower-left so the glowing frame is legible.
    if (document.body.classList.contains('tiles-skin')) {
      // CONTINUOUS colour so the groove visibly MOVES at every value (banded thresholds made
      // 60% look identical to 100%). hue 130=green at 100% → 0=red at 0%.
      var gg = Math.max(0, Math.min(100, S.groove));
      var hue = Math.round(gg * 1.3);
      var gcol = 'hsl(' + hue + ',68%,44%)';
      var gglow = 'hsla(' + hue + ',68%,50%,.32)';
      try { document.body.style.setProperty('--groove-col', gcol); document.body.style.setProperty('--groove-glow', gglow); } catch (e) {}
      updateGrooveRing();   // the depleting progress ring around the frame
      // The groove FRAME is the whole answer AREA (not the small measures box). Dock the
      // level pips (top-left) + score/streak (top-right) onto the frame edge, and the
      // disc-labelled groove badge onto its lower-left — matching the Option-E mockup.
      var area = document.querySelector('.answer-area');
      if (area) {
        var badge = area.querySelector('.groove-badge');
        if (!badge) { badge = document.createElement('div'); badge.className = 'groove-badge'; area.appendChild(badge); }
        badge.innerHTML = IC.disc + 'GROOVE ' + S.groove + '%';
        var mast = document.getElementById('soloMastery');
        if (mast && mast.parentNode !== area) { mast.classList.add('frame-tab', 'frame-tab-left'); area.appendChild(mast); }
        var qs = document.getElementById('soloQuickStats');
        if (qs && qs.parentNode !== area) { qs.classList.add('frame-tab', 'frame-tab-right'); area.appendChild(qs); }
        var sub = document.getElementById('soloSubmit');
        if (sub && sub.parentNode !== area) { sub.classList.add('frame-submit'); area.appendChild(sub); }
        // Next + Tap-back also dock onto the frame's bottom edge (they were floating behind the
        // answer). Their display is engine-controlled, so they only appear when it's time to move on.
        var nxt = document.getElementById('soloNext');
        if (nxt && nxt.parentNode !== area) { nxt.classList.add('frame-next'); area.appendChild(nxt); }
        var tb = document.getElementById('soloTapBack');
        if (tb && tb.parentNode !== area) { tb.classList.add('frame-tapback'); area.appendChild(tb); }
      }
    }
    var sc = document.getElementById('soloScore'); if (sc) sc.textContent = S.score;
    var st = document.getElementById('soloStreak'); if (st) st.textContent = S.streak;
    var bn = document.getElementById('soloBonus'); if (bn) bn.textContent = S.bonus;
    var scQ = document.getElementById('soloScoreQ'); if (scQ) scQ.textContent = S.score;
    var stQ = document.getElementById('soloStreakQ'); if (stQ) stQ.textContent = S.streak;
    renderMastery();
  }

  // GUIDED mastery meter: the current level title + a per-theme bar showing the
  // current level's mastery score/band, plus the 2->4->8 ramp readout. Hidden in
  // free play. Colors come from per-theme CSS vars (neutral fallbacks); no emoji.
  function renderMastery() {
    var wrap = document.getElementById('soloMastery'); if (!wrap) return;
    if (!(S.guided && GUIDE.avail())) { wrap.style.display = 'none'; return; }
    var mv = GUIDE.masteryView(); if (!mv) { wrap.style.display = 'none'; return; }
    wrap.style.display = '';
    var chap = document.getElementById('smChap');
    if (chap) chap.textContent = document.body.classList.contains('tiles-skin')
      ? ('LEVEL ' + (mv.idx + 1))                                  // casual: a simple level number
      : ('Ch ' + mv.hallChapter + ' · ' + (mv.idx + 1) + '/' + mv.count);
    var title = document.getElementById('smTitle'); if (title) title.textContent = mv.title;
    // PIPS — progress THROUGH the level via the RAMP (2→4→8 bars → mastered). This resets to
    // the first step each level, so a fresh level = first pip amber, rest hollow (MelodyQuest
    // journey style). NOT the mastery score — that's seeded high by the intake, which wrongly
    // lit every pip green at Level 1. done=solid, current=amber, upcoming=hollow ring.
    var pips = document.getElementById('soloPips');
    if (pips) {
      var N = 4;                                                   // 2-bar · 4-bar · 8-bar · mastered
      var rampIdx = S.ramp <= 2 ? 0 : S.ramp <= 4 ? 1 : 2;         // which ramp step you're on
      var done = mv.mastered ? N : rampIdx;                        // steps already cleared (green)
      var active = mv.mastered ? -1 : rampIdx;                     // the step you're on (amber)
      var ph = '';
      for (var pi = 0; pi < N; pi++) {
        var pc = pi < done ? 'is-done' : (pi === active ? 'is-active' : 'is-upcoming');
        ph += '<span class="solo-pip ' + pc + '"></span>';
      }
      pips.innerHTML = ph;
    }
    var fill = document.getElementById('smFill');
    if (fill) {
      fill.style.width = mv.score + '%';
      // band color: per-theme vars, neutral fallbacks (attempted=low ... mastered=accent)
      var col = mv.band === 'mastered' ? 'var(--mastery-mastered,#6ad1ff)'
              : mv.band === 'proficient' ? 'var(--mastery-proficient,#19e07a)'
              : mv.band === 'familiar' ? 'var(--mastery-familiar,#ffd24a)'
              : 'var(--mastery-attempted,#9aa0b4)';
      fill.style.background = col;
    }
    var band = document.getElementById('smBand');
    if (band) band.textContent = (BAND_LABEL[mv.band] || mv.band) + ' · ' + mv.score;
    var ramp = document.getElementById('smRamp');
    if (ramp) {
      ramp.textContent = mv.mastered
        ? 'Passed — replaying for practice'
        : (GUIDE.atCapstone()
            ? ('Reach Proficient (' + mv.score + '/80) with clean 8-bar runs' + (S.mode === 'tapping' ? ' — both hands — to master' : ' to master'))
            : ('Capstone ramp: ' + S.measures + ' bars → climb to 8'));
    }
  }

  /* ==========================================================================
     TEACH SCREENS — the adaptive, hear→see→do warm-up / escalation overlay.
     --------------------------------------------------------------------------
     The imperative SHELL for the teach system whose POLICY lives in GUIDE
     (teachDecision / mark*). Registered via GUIDE.registerTeacher; newRound()
     calls GUIDE.maybeTeach() which routes the decision here. Everything is REUSE:
       - notation:  rs.renderPatternArt (the exact placement art the staff uses),
       - audio:     rhythmHit + metroTick on the single ctx() clock,
       - beat-guide:the .solo-beat-on highlight class, animated on the beat,
       - tap engine:a 1-bar call-and-response capture scored with TAP_TOLERANCE,
       - themes:    per-theme via --tb-accent + the shared .tapback-ov surface, NO
                    emoji, inline IC.* SVG icons.
     Per-game framed: dictation shows dictationTip ("what to listen for"); tapping
     shows tappingTip (the coordination cue). Always SKIPPABLE.
     ========================================================================== */
  var TEACH = (function () {
    // Runtime state for the open overlay (no persistence here — GUIDE owns memory).
    var T = { open: false, el: null, decision: null, demoItems: null, demoBeats: 0,
              capture: null, timers: [], onProceed: null };

    function clearTimers() { T.timers.forEach(function (t) { clearTimeout(t); }); T.timers = []; }
    function later(fn, ms) { var id = setTimeout(fn, ms); T.timers.push(id); return id; }

    // A 1-beat figure id from the level's bank to PAD the demo bar around the new
    // figure (so the bar is a complete measure). Prefer the simplest single-onset
    // figure (the family's base note); fall back to the first 1-beat figure.
    function padFigure(level) {
      var famKey = bankKeyForLevel(level);
      var bank = (rs.rhythmPatterns && rs.rhythmPatterns[famKey]) || [];
      var oneBeat = bank.filter(function (p) { return (p.beats || 1) === 1 && (level.figures || []).indexOf(p.id) !== -1; });
      // a "base" note = a single non-rest note (e.g. quarter / dotted-quarter / half).
      var base = oneBeat.filter(function (p) { return p.vexflow && p.vexflow.length === 1 && p.vexflow[0].duration.indexOf('r') === -1; })[0];
      return (base || oneBeat[0] || bank[0] || null);
    }
    // Resolve the app FAMILIES key for a level via its beat unit (mirrors GUIDE's map).
    function bankKeyForLevel(level) {
      switch (level.beatUnit) {
        case 'quarter': return 'medium';
        case 'half': return 'halfbeat';
        case 'dotted-quarter': return 'compound';
        case 'dotted-half': return 'dottedhalf';
        case 'dotted-eighth': return 'dotted16';
        default: return 'medium';
      }
    }
    // The NEW figures this level introduces that are actually generatable (in figures).
    function newFigureIds(level) {
      var figs = level.figures || [];
      var nf = (level.newSkills || []).filter(function (id) { return figs.indexOf(id) !== -1; });
      // Chapters that add no new figure (e.g. a new meter on the same figures) demo the
      // level's first couple of figures so there is always something to hear + see.
      if (!nf.length) nf = figs.slice(0, 2);
      return nf.slice(0, 2);   // at most two, to keep the bar (and the warm-up) short
    }

    /* Build a single demo BAR (one measure) that contains the new figure(s), padded to
       the meter's beat count. Returns { items:[{patternId,startBeat,beats}], beats } in
       the SAME shape targetItems()/gridFromItems consume, so the demo plays + animates
       exactly like a real round. */
    function buildDemoBar(level) {
      var beats = bpm();
      var newIds = newFigureIds(level);
      var pad = padFigure(level);
      var items = [], beat = 1, i = 0;
      // Lay the new figure(s) first (each occupies its own beats), then pad.
      while (beat <= beats && i < newIds.length) {
        var p = findPattern(newIds[i]); var nb = (p && p.beats) || 1;
        if (beat + nb - 1 > beats) break;
        items.push({ patternId: newIds[i], startBeat: beat, beats: nb }); beat += nb; i++;
      }
      while (beat <= beats && pad) {
        items.push({ patternId: pad.id, startBeat: beat, beats: (pad.beats || 1) }); beat += (pad.beats || 1);
      }
      return { items: items, beats: beats };
    }

    // --- mini read-only staff (one bar), built from the SHARED renderer + .tb-staff CSS.
    function renderDemoStaff(host, demo, tsLabel) {
      host.innerHTML = '';
      var row = document.createElement('div'); row.className = 'tb-row';
      var line = document.createElement('div'); line.className = 'tb-line';
      var cells = document.createElement('div'); cells.className = 'tb-cells';
      // time-signature glyph (top/bottom), like the real staff
      if (tsLabel) {
        var p = String(tsLabel).split('/');
        var ts = document.createElement('div'); ts.className = 'tb-ts';
        ts.innerHTML = '<span>' + (p[0] || '') + '</span><span>' + (p[1] || '') + '</span>';
        cells.appendChild(ts);
      }
      var byBeat = {};
      demo.items.forEach(function (it) { byBeat[it.startBeat] = it; });
      for (var b = 1; b <= demo.beats; b++) {
        var cell = document.createElement('div');
        cell.className = 'tb-cell teach-cell' + (b === demo.beats ? ' tb-final' : '');
        cell.setAttribute('data-beat', String(b));
        var num = document.createElement('span'); num.className = 'tb-bnum'; num.textContent = b; cell.appendChild(num);
        var na = document.createElement('div'); na.className = 'beat-notation'; cell.appendChild(na);
        var it = byBeat[b];
        if (it) { try { rs.renderPatternArt(na, it.patternId, it.beats); } catch (e) {} }
        cells.appendChild(cell);
      }
      row.appendChild(line); row.appendChild(cells); host.appendChild(row);
    }
    function teachCellByBeat(host, b) { return host.querySelector('.teach-cell[data-beat="' + b + '"]'); }
    function clearTeachHl(host) {
      host.querySelectorAll('.teach-cell.solo-beat-on').forEach(function (z) { z.classList.remove('solo-beat-on'); });
    }

    /* PLAY + ANIMATE the demo bar: count-in (one bar), then the rhythm, with the beat
       cell lighting up on each beat (the beat-guide) and rhythmHit on each onset. `tempo`
       lets the escalation lesson run slower. Returns the audio-clock time the bar ends. */
    function playDemo(host, demo, tempo, withCountIn, onDone) {
      var c = ctx(); if (!c) { if (onDone) onDone(); return; }
      unlockAudio();
      stopAllAudio();
      clearTeachHl(host);
      var beatDur = 60 / (tempo || S.tempo);
      var t0 = c.currentTime + 0.18;
      var countBeats = withCountIn ? demo.beats : 0;
      var rhythmStart = t0 + countBeats * beatDur;
      // count-in clicks (loud) + then example metronome accents on the downbeat
      var k;
      for (k = 0; k < countBeats; k++) metroTick(t0 + k * beatDur, true);
      // onsets (reuse the exact onset walk used by the real game)
      var onsets = demoOnsets(demo);
      onsets.forEach(function (o) { rhythmHit(rhythmStart + o.beat * beatDur); });
      // beat-guide highlight, one cell per beat, anchored to the same clock
      for (k = 0; k < demo.beats; k++) {
        (function (b, when) {
          later(function () {
            if (!T.open) return;
            clearTeachHl(host);
            var z = teachCellByBeat(host, b + 1); if (z) z.classList.add('solo-beat-on');
          }, Math.max(0, (when - c.currentTime) * 1000));
        })(k, rhythmStart + k * beatDur);
      }
      var endT = rhythmStart + demo.beats * beatDur;
      later(function () { if (T.open) clearTeachHl(host); if (onDone) onDone(); }, Math.max(0, (endT - c.currentTime + 0.25) * 1000));
      return endT;
    }
    // Onset walk for the demo bar (same math as targetOnsets, on one bar of items).
    function demoOnsets(demo) {
      var onsets = [], beat = 0;
      demo.items.forEach(function (it) {
        var pat = findPattern(it.patternId);
        if (!pat || !pat.vexflow) { beat += (it.beats || 1); return; }
        var raw = pat.vexflow.map(noteBeats);
        var sum = raw.reduce(function (a, x) { return a + x; }, 0) || 1;
        var scale = (it.beats || 1) / sum;
        pat.vexflow.forEach(function (nn, i) {
          if (nn.duration.indexOf('r') === -1) onsets.push({ beat: beat });
          beat += raw[i] * scale;
        });
      });
      return onsets;
    }

    /* ONE call-and-response: count-in, then the player taps the rhythm back on the tap
       pad for one bar. Scored leniently with TAP_TOLERANCE (per-beat, all-or-nothing —
       the same grading idea as the full tap-back, kept self-contained for the warm-up).
       Encourages, never hard-gates: any result lets the student proceed. `tempo` slows
       it for the escalation we-do. `playAlong` (we-do): the app SOUNDS the rhythm during
       the capture window so the student taps WITH it. onResult(passedBeats,totalBeats). */
    function runCallResponse(host, demo, tempo, padEl, coEl, onResult, playAlong) {
      var c = ctx(); if (!c) { onResult(0, demo.beats); return; }
      unlockAudio(); stopAllAudio(); clearTeachHl(host);
      var beatDur = 60 / (tempo || S.tempo);
      var t0 = c.currentTime + 0.2;
      var countBeats = demo.beats;
      var captureStart = t0 + countBeats * beatDur;
      var captureEnd = captureStart + demo.beats * beatDur;
      var onsets = demoOnsets(demo);
      // we-do: schedule the rhythm to SOUND across the capture bar (tap along with it)
      if (playAlong) onsets.forEach(function (o) { rhythmHit(captureStart + o.beat * beatDur); });
      // count-off display + clicks
      for (var k = 0; k < countBeats; k++) {
        (function (b, when) {
          metroTick(when, true);
          later(function () { if (coEl && T.open) { coEl.textContent = String(b + 1); coEl.classList.add('show'); } },
            Math.max(0, (when - c.currentTime) * 1000));
        })(k, t0 + k * beatDur);
      }
      // GO + your-turn beat-guide highlight across the capture bar (NO sound — the
      // player provides the rhythm). Capture taps in [captureStart, captureEnd+tol].
      T.capture = { active: false, taps: [], start: captureStart, end: captureEnd, beatDur: beatDur, onsets: onsets, beats: demo.beats };
      later(function () {
        if (!T.open) return;
        if (coEl) { coEl.textContent = 'GO'; coEl.classList.add('show', 'tb-pop'); later(function () { if (coEl) coEl.classList.remove('show'); }, 520); }
        T.capture.active = true;
        tbPadMsg('Your turn — tap the rhythm');
      }, Math.max(0, (captureStart - c.currentTime) * 1000));
      for (var j = 0; j < demo.beats; j++) {
        (function (b, when) {
          later(function () { if (!T.open) return; clearTeachHl(host); var z = teachCellByBeat(host, b + 1); if (z) z.classList.add('solo-beat-on'); },
            Math.max(0, (when - c.currentTime) * 1000));
        })(j, captureStart + j * beatDur);
      }
      // finish one beat after the bar, then score
      later(function () {
        if (!T.open) return;
        T.capture.active = false; clearTeachHl(host);
        var r = scoreCR(T.capture);
        onResult(r.passed, r.beats);
      }, Math.max(0, (captureEnd + beatDur - c.currentTime + 0.05) * 1000));
    }
    // Record a rhythm tap during the call-and-response capture window.
    function crTap() {
      if (!T.capture || !T.capture.active) return;
      var c = ctx(); if (!c) return;
      T.capture.taps.push(c.currentTime);
    }
    /* Per-beat all-or-nothing scoring (mirrors scoreTapBack's idea, on one bar): a beat
       is correct iff its taps match its onsets in count, each within ±TAP_TOLERANCE. */
    function scoreCR(cap) {
      var beatDur = cap.beatDur, tol = TAP_TOLERANCE, tb = cap.beats;
      // group target onset absolute times by beat
      var want = []; for (var b = 0; b < tb; b++) want[b] = [];
      cap.onsets.forEach(function (o) { var bi = Math.min(tb - 1, Math.floor(o.beat + 1e-6)); want[bi].push(cap.start + o.beat * beatDur); });
      // group taps by nearest beat (pull a slightly-early tap into the downbeat it aims at)
      var got = []; for (b = 0; b < tb; b++) got[b] = [];
      cap.taps.forEach(function (t) {
        var rel = (t - cap.start) / beatDur; var bi = Math.floor(rel + tol / beatDur);
        if (bi < 0) bi = 0; if (bi > tb - 1) bi = tb - 1; got[bi].push(t);
      });
      var passed = 0;
      for (b = 0; b < tb; b++) {
        var w = want[b], g = got[b].slice();
        if (w.length !== g.length) continue;
        var ok = true;
        for (var i = 0; i < w.length; i++) {
          var bestIdx = -1, bestD = Infinity;
          for (var jj = 0; jj < g.length; jj++) { var d = Math.abs(g[jj] - w[i]); if (d < bestD) { bestD = d; bestIdx = jj; } }
          if (bestIdx === -1 || bestD > tol) { ok = false; break; }
          g.splice(bestIdx, 1);
        }
        if (ok) passed++;
      }
      return { passed: passed, beats: tb };
    }
    function tbPadMsg(t) { var el = document.getElementById('teachPadMsg'); if (el) el.textContent = t; }

    /* --------------------------------------------------------- the overlay DOM */
    function ensureEl() {
      if (T.el) return T.el;
      var ov = document.createElement('div');
      ov.id = 'teachOv'; ov.className = 'tapback-ov teach-ov';
      ov.innerHTML =
        '<div class="tb-card teach-card">' +
          '<button class="tb-close" id="teachClose" aria-label="Skip">' + IC.close + '</button>' +
          '<div class="teach-head">' +
            '<div class="teach-chap" id="teachChap"></div>' +
            '<div class="teach-title" id="teachTitle"></div>' +
            '<div class="teach-new" id="teachNew"></div>' +
          '</div>' +
          '<div class="teach-body" id="teachBody"></div>' +
          '<div class="teach-foot" id="teachFoot"></div>' +
        '</div>';
      document.body.appendChild(ov);
      T.el = ov;
      document.getElementById('teachClose').onclick = function () { skip(); };
      return ov;
    }

    // PUBLIC entry: GUIDE.maybeTeach() routes a decision here. Returns true if shown.
    function show(decision) {
      if (!decision || !decision.content || T.open) return false;
      var c = decision.content;
      ensureEl();
      T.open = true; T.decision = decision; clearTimers();
      var lvl = decision.level;
      var demo = buildDemoBar(lvl);
      T.demoItems = demo;
      var perGameTip = (S.mode === 'tapping') ? c.tappingTip : c.dictationTip;
      var tipLabel = (S.mode === 'tapping') ? 'Coordination cue' : 'What to listen for';
      document.getElementById('teachChap').textContent =
        'Chapter ' + lvl.hallChapter + (decision.mode === 'escalation' ? ' · Let’s slow this down' : ' · Warm-up');
      document.getElementById('teachTitle').textContent = c.title;
      document.getElementById('teachNew').textContent = c.whatsNew;
      T.el.classList.add('show'); document.body.classList.add('teach-open');
      if (decision.mode === 'escalation') renderEscalation(lvl, c, demo, perGameTip, tipLabel);
      else renderQuick(lvl, c, demo, perGameTip, tipLabel);
      return true;
    }

    // Key figures list (from content) — one <li> per figure name.
    function keyFiguresHTML(c) {
      if (!c.keyFigures || !c.keyFigures.length) return '';
      return '<ul class="teach-figs">' + c.keyFigures.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>';
    }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    /* QUICK warm-up (the default) — title + whatsNew (in the head), the new figure SHOWN
       + a "Hear & see" that PLAYS it animating on the beat, ONE call-and-response, then
       "Got it → Start". ~10–15s. Always skippable. */
    function renderQuick(lvl, c, demo, tip, tipLabel) {
      var body = document.getElementById('teachBody');
      body.innerHTML =
        keyFiguresHTML(c) +
        '<div class="tb-staff teach-staff" id="teachStaff"></div>' +
        '<div class="teach-tip"><span class="teach-tip-label">' + tipLabel + '</span>' + esc(tip) + '</div>' +
        '<div class="teach-pad-wrap" id="teachPadWrap" style="display:none">' +
          '<div class="teach-pad" id="teachPad"><span class="teach-pad-co" id="teachPadCo"></span>' +
            '<span class="teach-pad-hint">Tap here</span></div>' +
          '<div class="teach-pad-msg" id="teachPadMsg">Listen, then tap it back.</div>' +
        '</div>';
      var staff = document.getElementById('teachStaff');
      renderDemoStaff(staff, demo, S.ts);
      var foot = document.getElementById('teachFoot');
      // "Got it → Start" is ENABLED from the start — the warm-up never hard-gates the
      // level; Hear & see + Tap-it-back are encouraged, not required. Skip and Got it both
      // proceed (Skip remembers a skip; Got it marks the warm-up seen as a completion).
      foot.innerHTML =
        '<button class="teach-btn teach-skip" id="teachSkipBtn">Skip</button>' +
        '<button class="teach-btn teach-hear" id="teachHearBtn">' + IC.play + 'Hear &amp; see</button>' +
        '<button class="teach-btn teach-go" id="teachGoBtn">Got it → Start</button>';
      document.getElementById('teachSkipBtn').onclick = function () { skip(); };
      bindPad();
      var goBtn = document.getElementById('teachGoBtn');
      document.getElementById('teachHearBtn').onclick = function () {
        playDemo(staff, demo, S.tempo, true, function () {
          // reveal the call-and-response after the first hearing
          var pw = document.getElementById('teachPadWrap'); if (pw) pw.style.display = '';
          tbPadMsg('Now tap it back once (press Tap, then count-in plays).');
          ensureCRButton();
        });
        tbPadMsg('Listen…');
      };
      // The call-and-response is triggered by a dedicated button injected into the pad area.
      function ensureCRButton() {
        if (document.getElementById('teachCRBtn')) return;
        var wrap = document.getElementById('teachPadWrap');
        var b = document.createElement('button'); b.className = 'teach-btn teach-cr'; b.id = 'teachCRBtn';
        b.innerHTML = IC.tap + 'Tap it back';
        b.onclick = function () {
          b.disabled = true;
          runCallResponse(staff, demo, S.tempo, document.getElementById('teachPad'), document.getElementById('teachPadCo'),
            function (passed, total) {
              b.disabled = false;
              tbPadMsg(passed === total ? 'Nice — that’s it!' : passed > 0 ? 'Close — ' + passed + '/' + total + ' beats. Try again or start.' : 'Give it another go, or just start.');
            });
        };
        wrap.insertBefore(b, wrap.firstChild);
      }
      goBtn.onclick = function () { proceed(); };
    }

    /* ESCALATION — the fuller, slower I-do / we-do / you-do mini-lesson. Fired only when
       struggling; still skippable; backs off after firing (GUIDE.markEscalated). */
    var SLOW_FACTOR = 0.68;   // slower tempo for the isolated lesson
    function renderEscalation(lvl, c, demo, tip, tipLabel) {
      var slow = Math.max(48, Math.round((S.tempo || 100) * SLOW_FACTOR));
      var body = document.getElementById('teachBody');
      body.innerHTML =
        '<div class="teach-stage" id="teachStage">Step 1 of 3 · I do — listen &amp; watch (slower)</div>' +
        keyFiguresHTML(c) +
        '<div class="teach-syll" id="teachSyll">' + esc(c.demo) + '</div>' +
        '<div class="tb-staff teach-staff" id="teachStaff"></div>' +
        '<div class="teach-tip"><span class="teach-tip-label">' + tipLabel + '</span>' + esc(tip) + '</div>' +
        '<div class="teach-pad-wrap" id="teachPadWrap" style="display:none">' +
          '<div class="teach-pad" id="teachPad"><span class="teach-pad-co" id="teachPadCo"></span>' +
            '<span class="teach-pad-hint">Tap here</span></div>' +
          '<div class="teach-pad-msg" id="teachPadMsg"></div>' +
        '</div>';
      var staff = document.getElementById('teachStaff');
      renderDemoStaff(staff, demo, S.ts);
      var foot = document.getElementById('teachFoot');
      foot.innerHTML =
        '<button class="teach-btn teach-skip" id="teachSkipBtn">Skip</button>' +
        '<button class="teach-btn teach-go" id="teachStepBtn">' + IC.play + 'I do — play it slow</button>';
      document.getElementById('teachSkipBtn').onclick = function () { GUIDE.markEscalated(); skip(); };
      bindPad();
      var stageEl = document.getElementById('teachStage');
      var btn = document.getElementById('teachStepBtn');
      var step = 1;
      btn.onclick = function () {
        if (step === 1) {
          // I-DO: slow, animated + counted. Contrast cue spoken in the syllable line.
          btn.disabled = true;
          tbPadMsg('');
          playDemo(staff, demo, slow, true, function () {
            step = 2;
            stageEl.textContent = 'Step 2 of 3 · We do — count-in, then tap along with me';
            btn.disabled = false; btn.innerHTML = IC.tap + 'We do — tap along';
            var pw = document.getElementById('teachPadWrap'); if (pw) pw.style.display = '';
            tbPadMsg('I’ll play it; tap along on the pad.');
          });
        } else if (step === 2) {
          // WE-DO: app plays the rhythm AND the student taps along (count-in + sound +
          // capture together) at the slow tempo.
          btn.disabled = true;
          // we-do: app SOUNDS the rhythm across the capture bar; the student taps WITH it
          runCallResponse(staff, demo, slow, document.getElementById('teachPad'), document.getElementById('teachPadCo'),
            function (passed, total) {
              step = 3;
              stageEl.textContent = 'Step 3 of 3 · You do — your turn, one time';
              btn.disabled = false; btn.innerHTML = IC.tap + 'You do — your turn';
              tbPadMsg(passed === total ? 'Together: perfect. Now solo.' : 'Good — now try it on your own.');
            }, true);
        } else if (step === 3) {
          // YOU-DO: one guided isolated rep at the slow tempo, then into the level.
          btn.disabled = true;
          runCallResponse(staff, demo, slow, document.getElementById('teachPad'), document.getElementById('teachPadCo'),
            function (passed, total) {
              GUIDE.markEscalated();   // fired + backs off
              stageEl.textContent = passed === total ? 'You’ve got it — back to the level.' : 'Nice work — back to the level at full tempo.';
              btn.disabled = false; btn.innerHTML = 'Start the level';
              btn.onclick = function () { proceed(); };
            });
        }
      };
    }

    // Bind the tap pad (touch + pointer, deduped like the real zones) to crTap.
    function bindPad() {
      var pad = document.getElementById('teachPad'); if (!pad) return;
      var lastAt = 0;
      var handler = function (e) {
        if (e.cancelable) e.preventDefault();
        var now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        if (now - lastAt < TAP_DEDUP_MS) return; lastAt = now;
        crTap();
        pad.classList.add('teach-pad-flash'); setTimeout(function () { pad.classList.remove('teach-pad-flash'); }, 100);
      };
      pad.addEventListener('touchstart', handler, { passive: false });
      pad.addEventListener('pointerdown', handler);
    }

    // Close the overlay + tear down audio/timers. `proceeded` = student is starting play.
    function teardown() {
      T.open = false; T.capture = null; clearTimers(); stopAllAudio();
      if (T.el) T.el.classList.remove('show');
      document.body.classList.remove('teach-open');
    }
    // GOT IT → start the level (the round is already laid out underneath).
    function proceed() {
      if (T.decision && T.decision.mode === 'quick') GUIDE.markQuickShown();
      teardown();
      msg(S.mode === 'tapping' ? 'Press Start metronome, then tap the rhythm.' : '');
    }
    // SKIP → straight to the level; remember the skip (quick) so it isn't re-shown.
    function skip() {
      if (T.decision && T.decision.mode === 'quick') GUIDE.markSkipped();
      else if (T.decision && T.decision.mode === 'escalation') GUIDE.markEscalated();
      teardown();
    }

    return { register: function () { if (GUIDE && GUIDE.registerTeacher) GUIDE.registerTeacher(show); } };
  })();

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
      // Compact score/streak: hidden by default (desktop shows the full .solo-stats
      // row already); the touch breakpoint in each page's own stylesheet reveals it.
      '#soloHud .solo-quickstats{display:none;gap:12px;flex:0 0 auto}' +
      '#soloHud .solo-quickstats .qs-item{display:flex;align-items:center;gap:4px}' +
      '#soloHud .solo-quickstats .qs-item b{font-size:1.05rem;font-weight:800;line-height:1}' +
      '#soloHud .solo-quickstats .qs-item small{font-size:.55rem;opacity:.6;letter-spacing:.06em;font-weight:700}' +
      '#soloHud .solo-quickstats .qs-streak .ic{width:.9em;height:.9em;margin:0}' +
      // Groove label gets the vinyl-disc icon so the meter is instantly recognizable.
      '#soloHud .solo-stat.groove>span{display:inline-flex;align-items:center;gap:5px}' +
      '#soloHud .solo-stat.groove>span .ic{width:1.05em;height:1.05em;margin:0;opacity:.9}' +
      // Floating +/- score & groove pops (the "juice").
      '.delta-pop{position:fixed;z-index:100000;transform:translate(-50%,0);font-weight:900;font-size:1.15rem;pointer-events:none;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,.35);animation:deltaPop 1.02s cubic-bezier(.2,.7,.3,1) forwards}' +
      '.delta-good{color:#1fbf6b}.delta-bad{color:#ff5b5b}' +
      // Count-in flash: big center word per beat (READY · GO). GO turns green.
      '.count-flash{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:9000;pointer-events:none;font-weight:900;font-size:22vh;letter-spacing:.02em;color:#5b6ee1;text-shadow:0 6px 24px rgba(0,0,0,.12)}' +
      '.count-flash.show{display:flex}.count-flash.is-go{color:#22b083}' +
      '.count-flash.pop{animation:countPop .3s ease-out}' +
      '@keyframes countPop{0%{transform:scale(.55);opacity:0}45%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:.95}}' +
      // TAP-ALONG overlay (first-listen "feel the beat"): pips light on each beat, tap anywhere.
      // TAP-ALONG: one big dot UNDER each measure; the current measure lights on the beat.
      '.tapalong-ov{position:absolute;inset:0;display:none;z-index:30;background:rgba(91,110,225,.05);border-radius:14px;-webkit-tap-highlight-color:transparent}' +
      '.tapalong-ov.show{display:block}' +
      '.tapalong-ov .ta-panel{position:absolute;left:50%;bottom:16%;transform:translateX(-50%);text-align:center;background:rgba(255,255,255,.94);border-radius:14px;padding:12px 22px;box-shadow:0 4px 16px rgba(90,110,170,.18);max-width:78%}' +
      '.tapalong-ov .ta-head{font-size:1.35rem;font-weight:900;color:#5b6ee1;letter-spacing:.05em}' +
      '.tapalong-ov .ta-msg{font-size:.92rem;color:#4a5170;font-weight:700;margin-top:4px;line-height:1.35}' +
      '.tapalong-ov .ta-dot{position:absolute;width:48px;height:48px;border-radius:50%;border:4px solid #8aa0e8;background:#eef2ff;box-sizing:border-box;transform:translate(-50%,0);cursor:pointer;transition:transform .1s,background .1s,box-shadow .1s,border-color .1s;animation:taIdle 1.2s ease-in-out infinite}' +
      '@keyframes taIdle{50%{box-shadow:0 0 0 6px rgba(91,110,225,.12)}}' +
      '.tapalong-ov .ta-dot.lit{background:#22b083;border-color:#22b083;transform:translate(-50%,0) scale(1.28);box-shadow:0 0 0 8px rgba(34,176,131,.2)}' +
      '.tapalong-ov .ta-dot.tap{background:#5b6ee1;border-color:#5b6ee1;transform:translate(-50%,0) scale(1.15)}' +
      // Hint groove-cost badge ("−N ◎") on each hint button.
      '.solo-hints .hint .hint-cost{margin-left:7px;font-size:.74em;font-weight:800;opacity:.75;color:#ff7a7a;display:inline-flex;align-items:center;gap:2px}' +
      '.solo-hints .hint .hint-cost .ic{width:.9em;height:.9em;margin:0;stroke:#ff7a7a}' +
      '@keyframes deltaPop{0%{opacity:0;transform:translate(-50%,8px) scale(.7)}18%{opacity:1;transform:translate(-50%,-2px) scale(1.12)}100%{opacity:0;transform:translate(-50%,-42px) scale(1)}}' +
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
      '.solo-ctl button.hint.on{background:rgba(255,255,255,.22);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4)}' +
      '#soloHud .solo-toggle{display:flex;align-items:center;gap:6px;font-size:.8rem;opacity:.85;margin-left:auto;cursor:pointer}' +
      '#soloHud #soloMsg{margin-top:10px;font-size:.95rem;min-height:1.3em;font-weight:600}' +
      /* ---- GUIDED mastery meter (per-theme; NO emoji) ---- */
      '.solo-mastery{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:2px 0 10px;padding:9px 12px;border-radius:11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}' +
      '.solo-mastery .sm-level{display:flex;flex-direction:column;min-width:140px}' +
      '.sm-pips{display:none;align-items:center;gap:7px}' +   // shown in casual (replaces the meter bar)
      '.solo-pip{width:11px;height:11px;border-radius:999px;box-sizing:border-box}' +
      '.solo-pip.is-upcoming{border:2px solid currentColor;opacity:.35}' +
      '.solo-pip.is-done{background:#22b083}' +
      '.solo-pip.is-active{background:#ffc23f;box-shadow:0 0 0 3px rgba(255,194,63,.3)}' +
      '.solo-mastery .sm-chap{font-size:.62rem;letter-spacing:.12em;opacity:.6;font-weight:800}' +
      '.solo-mastery .sm-title{font-size:.92rem;font-weight:700}' +
      '.solo-mastery .sm-meterwrap{display:flex;align-items:center;gap:10px;flex:1;min-width:200px}' +
      '.solo-mastery .sm-meter{position:relative;flex:1;height:12px;border-radius:7px;background:rgba(255,255,255,.14);overflow:hidden}' +
      '.solo-mastery .sm-meter i{display:block;height:100%;width:0;border-radius:7px;transition:width .4s,background .4s}' +
      // band threshold ticks at 50/80/95 (Familiar/Proficient/Mastered). overflow:visible
      // on the wrapper so ticks show above the clipped fill.
      '.solo-mastery .sm-meter{overflow:visible}' +
      '.solo-mastery .sm-meter i{overflow:hidden}' +
      '.solo-mastery .sm-tick{position:absolute;top:-2px;bottom:-2px;width:2px;background:rgba(255,255,255,.4);transform:translateX(-1px);pointer-events:none}' +
      '.solo-mastery .sm-band{font-size:.8rem;font-weight:800;white-space:nowrap;min-width:7.5em}' +
      '.solo-mastery .sm-ramp{font-size:.72rem;opacity:.7;letter-spacing:.02em;flex-basis:100%}' +
      '.beat-drop-zone.solo-wrong{outline:2px solid #ff5a4d;outline-offset:-2px;background:rgba(255,90,77,.13)!important}' +
      '.beat-drop-zone.solo-right{background:rgba(25,224,122,.16)!important}' +
      '.beat-drop-zone.solo-beat-on{background:rgba(33,150,243,.22)!important;box-shadow:inset 0 0 0 2px rgba(33,150,243,.7)}' +
      /* ---- key binding buttons in settings ---- */
      '.keybind-btn{font-family:system-ui,monospace;font-size:.82rem;font-weight:800;min-width:2.4em;padding:4px 8px;border-radius:6px;border:2px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;cursor:pointer;letter-spacing:.03em;text-transform:uppercase;transition:.12s;line-height:1}' +
      '.keybind-btn:hover{background:rgba(255,255,255,.22);border-color:rgba(255,255,255,.55)}' +
      '.keybind-btn.capturing{background:rgba(255,200,60,.18);border-color:#ffc83c;color:#ffc83c;animation:kbPulse 0.7s ease-in-out infinite}' +
      '@keyframes kbPulse{0%,100%{opacity:1}50%{opacity:.55}}' +
      /* ---- quiet-mode beat flash bar ---- */
      '#beatFlash{position:fixed;top:0;left:0;right:0;height:5px;z-index:99999;pointer-events:none;background:transparent}' +
      '@keyframes bfAccent{0%{opacity:1;background:var(--tb-accent,#7c5cff);box-shadow:0 0 18px 4px var(--tb-accent,#7c5cff)}100%{opacity:0;background:var(--tb-accent,#7c5cff)}}' +
      '@keyframes bfBeat{0%{opacity:.65;background:rgba(255,255,255,.75)}100%{opacity:0;background:rgba(255,255,255,.75)}}' +
      '#beatFlash.bf-accent{animation:bfAccent .28s ease-out forwards}' +
      '#beatFlash.bf-beat{animation:bfBeat .22s ease-out forwards}' +
      // Tap-it-back entry button (sits in the actions bar next to Submit/Next).
      // Per-theme color comes from suite-theme.css; this is the neutral default.
      '#soloTapBack{display:inline-flex;align-items:center;justify-content:center;font-family:inherit;font-weight:700;font-size:.85rem;border:none;border-radius:10px;padding:11px 16px;min-height:42px;cursor:pointer;background:#7c5cff;color:#fff;transition:.12s}' +
      '#soloTapBack{position:relative}' +
      '#soloTapBack:hover{transform:translateY(-1px);filter:brightness(1.08)}' +
      '#soloTapBack:active{transform:translateY(2px)}' +
      // "+ bonus" badge advertising the extra points (value from TB_BONUS_HINT)
      '#soloTapBack .tb-badge{margin-left:8px;font-size:.66rem;font-weight:800;letter-spacing:.04em;background:rgba(255,255,255,.22);color:#fff;border-radius:999px;padding:2px 7px;line-height:1.3}' +
      // Tapping game: the "Perform it" button IS the primary action (not a bonus),
      // so make it the prominent control and never let the bank reclaim the screen.
      '#soloTapBack.tb-perform{font-size:.95rem;padding:13px 22px;min-height:48px}' +
      'body.tapping-mode .rhythm-bank{display:none!important}' +
      'body.tapping-mode .game-area.active{padding-bottom:8px!important}' +
      // The rhythm is SHOWN, not edited, in tapping mode — drop the per-note remove
      // buttons so the staff reads as a clean piece of notation to perform.
      'body.tapping-mode .remove-btn{display:none!important}' +
      // Kill the pale-green "cell has a note" wash in tapping mode. That tint is a
      // placement affordance for DICTATION (distinguishes filled vs empty beats as
      // you build an answer); in tapping the rhythm is ALWAYS fully revealed, so
      // every cell is .filled and the green just becomes a uniform wash behind the
      // whole staff — noise that cheapens the clean "real notation" look. Dictation
      // keeps it (not tapping-mode). Higher specificity than the base .filled rule.
      'body.tapping-mode .beat-drop-zone.filled,body.tapping-mode .beat-drop-zone.continuation{background:transparent!important}' +
      /* ---- full-screen tap-it-back overlay (mobile-first, dark) ---- */
      '.tapback-ov{position:fixed;inset:0;z-index:10000;display:none;align-items:stretch;justify-content:center;background:rgba(8,8,14,.92);backdrop-filter:blur(6px);color:#eef1fb;font-family:system-ui,sans-serif;-webkit-tap-highlight-color:transparent}' +
      '.tapback-ov.show{display:flex}' +
      '.tb-card{display:flex;flex-direction:column;width:100%;max-width:760px;padding:16px env(safe-area-inset-right,12px) calc(env(safe-area-inset-bottom,0px) + 16px) env(safe-area-inset-left,12px);box-sizing:border-box;position:relative}' +
      '.tb-close{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.1);border:none;color:#eef1fb;width:40px;height:40px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center}' +
      '.tb-close .ic{margin:0;width:1.2em;height:1.2em;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round}' +
      '.tb-head{text-align:center;margin:4px 0 2px}' +
      '.tb-title{font-size:1.3rem;font-weight:800;letter-spacing:.02em}' +
      '.tb-meta{font-size:.78rem;opacity:.65;letter-spacing:.06em;margin-top:2px}' +
      // read-only notation of the rhythm being tapped (white "paper" staff like the
      // main answer board); each row is a staff line with beat cells + placement art.
      '.tb-staff{background:#fff;border-radius:10px;padding:10px 14px;margin:8px 0 2px;max-height:42vh;overflow:auto}' +
      '.tb-row{position:relative;height:84px}' +
      '.tb-row + .tb-row{margin-top:10px}' +
      '.tb-line{position:absolute;left:0;right:0;top:50%;height:2px;background:#333}' +
      '.tb-cells{position:absolute;inset:0;display:flex}' +
      '.tb-ts{flex:0 0 auto;align-self:center;display:flex;flex-direction:column;align-items:center;line-height:.8;gap:.18em;font:700 30px Georgia,serif;color:#333;padding:0 8px 0 2px}' +
      '.tb-cell{flex:1;position:relative;display:flex;align-items:center;justify-content:center;min-width:42px}' +
      '.tb-cell.tb-mend{border-right:3px solid #333}' +
      '.tb-cell.tb-final{border-right:3px solid transparent}' +
      '.tb-cell.tb-final::after{content:"";position:absolute;right:0;top:22%;bottom:22%;width:7px;background:linear-gradient(90deg,#333 0 2px,transparent 2px 4px,#333 4px 7px)}' +
      '.tb-cell .tb-bnum{position:absolute;bottom:2px;left:0;transform:translateX(-50%);font-size:.8rem;color:#bbb;font-weight:300;z-index:0}' +
      '.tb-cell .beat-notation{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}' +
      '.tb-cell .placed-note{position:absolute;left:0;top:50%;transform:translateY(-64%) scale(1.05);transform-origin:left center;height:auto;pointer-events:none;z-index:2}' +
      // moving beat guide on the cloned answer staff (same blue as the main beat guide)
      '.tb-staff .beat-drop-zone.solo-beat-on{background:rgba(33,150,243,.18)!important;box-shadow:inset 0 0 0 2px rgba(33,150,243,.7);border-radius:4px}' +
      // cloned answer staff: read-only, centered, never wider than the card
      '.tb-staff .tb-clone{width:100%!important;max-width:100%!important;margin:0 auto;pointer-events:none}' +
      '.tb-staff .tb-clone .remove-btn{display:none}' +
      '@media (orientation:landscape) and (max-height:560px){.tb-staff{max-height:30vh}}' +
      // metronome setup row: Start button + tempo stepper (bound to S.tempo)
      '.tb-setup{display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;margin:8px 0 2px}' +
      '.tb-start{display:inline-flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;font-weight:800;font-size:.95rem;border:none;border-radius:12px;padding:13px 22px;min-height:50px;cursor:pointer;background:var(--tb-accent,#7c5cff);color:#fff;transition:.12s}' +
      '.tb-start .ic{margin:0;width:1.2em;height:1.2em;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}' +
      '.tb-start:hover{filter:brightness(1.08)}.tb-start:active{transform:translateY(2px)}' +
      '.tb-start:disabled{opacity:.45;cursor:default;transform:none}' +
      '.tb-start.tb-on{opacity:.5}' +
      '.tb-tempo{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.06);border-radius:12px;padding:7px 12px}' +
      '.tb-tempo .tb-tlabel{font-size:.6rem;letter-spacing:.14em;opacity:.55;font-weight:800}' +
      '.tb-tempo b{font-size:1.2rem;min-width:2.6ch;text-align:center;font-weight:800}' +
      '.tb-tempo .tb-tunit{font-size:.66rem;opacity:.55;letter-spacing:.08em}' +
      '.tb-tstep{width:34px;height:34px;border-radius:9px;border:none;background:rgba(255,255,255,.12);color:#eef1fb;font-size:1.3rem;font-weight:700;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center}' +
      '.tb-tstep:hover{background:rgba(255,255,255,.22)}.tb-tstep:active{transform:translateY(1px)}' +
      // big on-screen count-off ("1·2·3·4 → GO"), centered over the zones
      '.tb-countoff{position:absolute;left:0;right:0;top:46%;display:none;align-items:center;justify-content:center;font-size:5.5rem;font-weight:900;letter-spacing:.03em;color:var(--tb-accent,#7c5cff);text-shadow:0 4px 30px rgba(0,0,0,.5);pointer-events:none;z-index:5}' +
      '.tb-countoff.show{display:flex}' +
      '.tb-countoff.tb-pop{animation:tbPop .42s ease-out}' +
      '@keyframes tbPop{0%{transform:scale(.5);opacity:.2}40%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:.9}}' +
      // locked-in confirmation on the Beat pad (unmistakable: green + "Locked")
      '.tb-zone.tb-locked{background:rgba(25,224,122,.22)!important;border-color:#19e07a!important;box-shadow:0 0 0 2px #19e07a,0 0 22px rgba(25,224,122,.4)}' +
      '.tb-zone.tb-locked .tb-zlabel{color:#19e07a}' +
      '.tb-instruct{text-align:center;font-size:1rem;font-weight:600;min-height:2.6em;display:flex;align-items:center;justify-content:center;padding:6px 8px;color:var(--tb-accent,#7c5cff)}' +
      '.tb-zones{flex:1;display:flex;gap:12px;min-height:150px}' +
      '.tb-zones.tb-go .tb-zone{box-shadow:inset 0 0 0 3px var(--tb-accent,#7c5cff)}' +
      '.tb-zone{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:2px solid rgba(255,255,255,.16);border-radius:18px;background:rgba(255,255,255,.05);color:#eef1fb;cursor:pointer;font-family:inherit;user-select:none;-webkit-user-select:none;transition:transform .06s,background .12s,box-shadow .12s;touch-action:manipulation}' +
      '.tb-zone .tb-zlabel{font-size:1.6rem;font-weight:800;letter-spacing:.02em}' +
      '.tb-zone .tb-zhint{font-size:.72rem;opacity:.55;letter-spacing:.1em;text-transform:uppercase}' +
      '.tb-beat{background:rgba(33,150,243,.12)}' +
      '.tb-rhythm{background:rgba(124,92,255,.12)}' +
      '.tb-zone.tb-armed{border-color:var(--tb-accent,#7c5cff);box-shadow:0 0 0 1px var(--tb-accent,#7c5cff)}' +
      '.tb-zone.tb-flash{transform:scale(.97);background:rgba(255,255,255,.22)}' +
      '.tb-zone.tb-pulse .tb-zlabel{text-shadow:0 0 14px var(--tb-accent,#7c5cff)}' +
      '.tb-zone.tb-bad{border-color:#ff5a4d!important;box-shadow:0 0 0 2px #ff5a4d;background:rgba(255,90,77,.18)}' +
      // results
      '.tb-results{flex:1;display:flex;flex-direction:column;gap:14px;padding-top:8px;overflow-y:auto}' +
      '.tb-score{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}' +
      '.tb-acc{display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,.06);border-radius:12px;padding:12px 20px;min-width:96px}' +
      '.tb-acc b{font-size:1.8rem;font-weight:800;line-height:1}' +
      '.tb-acc span{font-size:.66rem;opacity:.6;letter-spacing:.1em;text-transform:uppercase;margin-top:4px}' +
      '.tb-acc.tb-bonus b{color:var(--tb-accent,#7c5cff)}' +
      // guided level-advance banner in the tapping results (per-theme accent)
      '.tb-advance{text-align:center;font-weight:800;font-size:1rem;margin:10px 0 2px;color:var(--tb-accent,#7c5cff)}' +
      '.tb-mlist{display:flex;flex-direction:column;gap:6px}' +
      '.tb-mrow{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;background:rgba(255,255,255,.05);font-size:.85rem}' +
      '.tb-mrow.tb-pass{box-shadow:inset 0 0 0 1px rgba(25,224,122,.5)}' +
      '.tb-mrow.tb-fail{box-shadow:inset 0 0 0 2px rgba(255,90,77,.7);background:rgba(255,90,77,.1)}' +
      '.tb-mlabel{font-weight:700;min-width:54px}' +
      '.tb-mstat{display:inline-flex;align-items:center;gap:4px;font-weight:700;min-width:64px}' +
      '.tb-mstat .ic{margin:0;width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.tb-pass .tb-mstat{color:#19e07a}.tb-fail .tb-mstat{color:#ff7a6e}' +
      '.tb-mnote{opacity:.7;font-size:.78rem;flex:1}' +
      // Sticky footer: on short screens the results (score + bar list) can be taller
      // than the viewport. Instead of requiring the player to find a scrollbar to
      // reach Try again/Next, pin the button row to the bottom of whichever ancestor
      // actually scrolls (.tb-results in the modal, .game-area.active inline) so it's
      // visible the INSTANT results render, while the score/bars still scroll above it.
      '.tb-rbtns{display:flex;gap:12px;justify-content:center;margin-top:6px;' +
        'position:sticky;bottom:0;left:0;right:0;padding:10px 0 2px;background:rgba(10,10,16,.96);z-index:2}' +
      '.tb-rbtns button{display:inline-flex;align-items:center;justify-content:center;font-family:inherit;font-weight:700;font-size:.9rem;border:none;border-radius:10px;padding:12px 20px;min-height:46px;cursor:pointer;background:rgba(255,255,255,.1);color:#fff}' +
      '.tb-rbtns button .ic{margin-right:7px;width:1.05em;height:1.05em;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}' +
      '.tb-rbtns button.go{background:var(--tb-accent,#7c5cff);color:#fff}' +
      // "2x bonus" marker on the results bonus stat when the exit-nudge boost paid off
      '.tb-acc.tb-bonus-2x{box-shadow:inset 0 0 0 2px var(--tb-accent,#7c5cff)}' +
      '.tb-acc .tb-2x{font-size:.7em;font-style:normal;font-weight:800;margin-left:3px;vertical-align:super;color:var(--tb-accent,#7c5cff)}' +
      // "Done for now" graceful-exit link under the results buttons (subtle, not a CTA)
      '.tb-exit-link{display:flex;align-items:center;justify-content:center;gap:6px;margin:10px auto 0;background:none;border:none;color:#cfd3e0;font-family:inherit;font-weight:600;font-size:.82rem;opacity:.7;cursor:pointer}' +
      '.tb-exit-link:hover{opacity:1}' +
      '.tb-exit-link .ic{width:1em;height:1em;margin:0;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}' +
      // ===== EXIT MOTIVATION NUDGE (reuses .tapback-ov dark surface; theme accent) =====
      '.exit-nudge{align-items:center;justify-content:center}' +
      '.exit-card{max-width:380px;text-align:center;padding:24px 22px calc(env(safe-area-inset-bottom,0px) + 22px)}' +
      '.exit-head{display:flex;align-items:center;justify-content:center;gap:8px;font-size:1.5rem;font-weight:900;color:var(--tb-accent,#7c5cff);margin-bottom:8px}' +
      '.exit-head .ic{width:1.1em;height:1.1em;margin:0}' +
      '.exit-head .ic-fill{fill:var(--tb-accent,#7c5cff);stroke:none}' +
      '.exit-sub{font-size:1rem;line-height:1.5;opacity:.9;margin-bottom:20px}' +
      '.exit-sub b{color:var(--tb-accent,#7c5cff)}' +
      '.exit-btns{display:flex;flex-direction:column;gap:10px}' +
      '.exit-btns .teach-go{font-size:1rem}' +
      // ===== WIN / LOSE end screens (Game Over + Level Complete), share exit-card look =====
      '.tapback-ov.solo-end{align-items:center!important}' +   // centre the card vertically + horizontally
      '.end-card{max-width:440px;margin:auto;text-align:center;padding:26px 24px calc(env(safe-area-inset-bottom,0px) + 24px)}' +
      '.end-head{display:flex;align-items:center;justify-content:center;gap:10px;font-size:1.7rem;font-weight:900;margin-bottom:8px}' +
      '.end-head .ic{width:1.35em;height:1.35em;margin:0;stroke-width:2.4}' +
      '.end-head-win .ic{padding:6px;border-radius:50%;background:rgba(34,176,131,.16);box-sizing:content-box;width:1.1em;height:1.1em}' +   // check in a celebratory badge
      '.end-head-win{color:var(--tb-accent,#22b083)}.end-head-win .ic{stroke:var(--tb-accent,#22b083)}' +
      '.end-head-over{color:#ff7a7a}.end-head-over .ic{stroke:#ff7a7a}.end-head-over .ic-fill{fill:#ff7a7a;stroke:none}' +
      '.end-sub{font-size:1rem;line-height:1.5;opacity:.9;margin-bottom:14px}' +
      '.end-sub b{color:var(--tb-accent,#22b083)}' +
      '.end-score{font-size:1.05rem;margin-bottom:20px;opacity:.95}.end-score b{font-size:1.4rem;font-weight:900;color:var(--tb-accent,#22b083)}' +
      '.end-btns{display:flex;flex-direction:column;gap:12px}' +
      '.end-btns .teach-btn{font-size:1rem}' +
      // menacing dare button: deep ember gradient, dark glow, restless pulse, stacked subtitle
      '.end-killer{flex-direction:column!important;gap:2px!important;background:linear-gradient(160deg,#ff5f4a,#c1121f 70%,#7a0b16)!important;color:#fff!important;border:none!important;box-shadow:0 0 0 1px rgba(0,0,0,.25),0 8px 22px rgba(150,20,30,.5)!important;letter-spacing:.06em;animation:killerPulse 1.5s ease-in-out infinite}' +
      '.end-killer small{font-size:.66rem;font-weight:700;opacity:.9;letter-spacing:.08em;text-transform:uppercase}' +
      '.end-killer .ic-fill{fill:#ffe08a;stroke:none}' +
      '@keyframes killerPulse{0%,100%{box-shadow:0 0 0 1px rgba(0,0,0,.25),0 8px 20px rgba(150,20,30,.45)}50%{box-shadow:0 0 0 1px rgba(0,0,0,.25),0 10px 34px rgba(220,40,40,.8)}}' +
      '.end-leave{background:transparent!important;opacity:.8}' +
      '.exit-btns .teach-go .ic-fill{fill:currentColor;stroke:none;width:1.1em;height:1.1em}' +
      '.exit-leave{background:rgba(255,255,255,.1);color:#cfd3e0;font-weight:600}' +
      '.exit-leave:hover{background:rgba(255,255,255,.18);color:#fff}' +
      // ===== CELEBRATION (clean-pass win moment) — confetti + praise + Tock (kids) =====
      '.tb-celebrate{position:relative;text-align:center;padding:4px 0 8px;margin-bottom:4px}' +
      '.tb-celebrate-head{font-size:1.5rem;font-weight:900;color:var(--tb-accent,#7c5cff);letter-spacing:.01em;animation:tbPop .5s ease-out;position:relative;z-index:2}' +
      '.tb-celebrate-kids .tb-celebrate-head{color:#ff8c42}' +
      // Tock mascot (kids only) — bounces, pendulum ticks
      '.tb-tock{width:96px;height:106px;margin:0 auto -6px;display:block;animation:tockBounce 1.2s ease-in-out infinite;position:relative;z-index:2}' +
      '.tb-tock .tock{width:100%;height:100%;display:block;overflow:visible}' +
      '.tb-tock .tock-pend{transform-origin:100px 46px;animation:tockTick .5s ease-in-out infinite alternate}' +
      '@keyframes tockBounce{0%,100%{transform:translateY(0)}30%{transform:translateY(-11px)}55%{transform:translateY(2px)}}' +
      '@keyframes tockTick{from{transform:rotate(-15deg)}to{transform:rotate(15deg)}}' +
      // confetti burst across the top of the celebration
      '.tb-confetti{position:absolute;left:0;right:0;top:-6px;height:96px;pointer-events:none;overflow:hidden;z-index:1}' +
      '.tb-confetti-bit{position:absolute;top:-14px;width:9px;height:14px;border-radius:2px;opacity:0;animation:tbConfetti 1.1s ease-in forwards}' +
      '@keyframes tbConfetti{0%{opacity:0;transform:translateY(-12px) rotate(0)}15%{opacity:1}100%{opacity:0;transform:translateY(94px) rotate(240deg)}}' +
      // Level-Complete celebration: rain the confetti over the WHOLE screen, not just the card top.
      '.solo-end .tb-confetti{position:fixed!important;left:0;right:0;top:0;height:100vh;overflow:visible;z-index:0}' +
      '.solo-end .tb-confetti-bit{width:10px;height:16px;animation:tbConfettiFull 1.9s ease-in forwards}' +
      '@keyframes tbConfettiFull{0%{opacity:0;transform:translateY(-24px) rotate(0)}8%{opacity:1}100%{opacity:0;transform:translateY(82vh) rotate(400deg)}}' +
      // ===== EVER-PRESENT KIDS MASCOT (Tock) — kids theme only, never blocks taps =====
      // Docked into the HUD top-left (the ONE spot that never overlaps the staff or the
      // big tap bricks — the bricks fill the bottom, so a floating corner mascot always
      // collides). A reserved gutter (padding on the mastery row) keeps him clear of the
      // level text; during performance the mastery row is hidden so he sits in empty HUD.
      '#kidsTock{display:none}' +
      'body.theme-kids #kidsTock{display:block;position:fixed;top:calc(env(safe-area-inset-top,0px) + 4px);left:12px;width:62px;height:70px;z-index:61;pointer-events:none;filter:drop-shadow(0 3px 4px rgba(0,0,0,.2));animation:tockBob 3.2s ease-in-out infinite}' +
      'body.theme-kids #soloMastery{padding-left:60px}' +
      '#kidsTock .tock{width:100%;height:100%;display:block;overflow:visible}' +
      '#kidsTock .tock-pend{transform-origin:100px 46px;transition:transform .18s ease-out;animation:tockSway 1.6s ease-in-out infinite alternate}' +
      // when the beat is driving him, the JS toggles .tock-tick-l/.tock-tick-r and we stop the idle sway
      '#kidsTock.tock-beat .tock-pend{animation:none}' +
      '#kidsTock.tock-beat.tock-tick-l .tock-pend{transform:rotate(-16deg)}' +
      '#kidsTock.tock-beat.tock-tick-r .tock-pend{transform:rotate(16deg)}' +
      '@keyframes tockBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}' +
      '@keyframes tockSway{from{transform:rotate(-13deg)}to{transform:rotate(13deg)}}' +
      // landscape phone: smaller so he tucks neatly into the slim HUD-left
      '@media (pointer:coarse) and (max-height:500px){body.theme-kids #kidsTock{width:46px;height:52px;left:8px}body.theme-kids #soloMastery{padding-left:44px}}' +
      // landscape phones: keep zones big & side-by-side, shrink chrome
      '@media (orientation:landscape) and (max-height:560px){.tb-instruct{min-height:1.8em;font-size:.9rem}.tb-title{font-size:1.05rem}.tb-zone .tb-zlabel{font-size:1.3rem}}' +
      /* ===== iPHONE DECLUTTER — gated to the app's phone breakpoint so iPad and
         desktop overlays are untouched. The rhythm staff + the two tap zones are
         the ONLY things that should command the screen; everything else collapses
         to a thin strip so the notation reads clearly and never gets covered. The
         staff itself flex-grows to claim the freed vertical space and the clone is
         JS-scaled (fitTbStaff) to fit, so 2- and 4-measure rhythms stay fully
         visible and legible. ===== */
      '@media (pointer: coarse) and (max-height: 500px){' +
        // tighten the card so no padding eats the rhythm's room
        '.tb-card{padding:4px env(safe-area-inset-right,8px) calc(env(safe-area-inset-bottom,0px) + 6px) env(safe-area-inset-left,8px)}' +
        // smaller close button tucked into the corner
        '.tb-close{top:4px;right:4px;width:30px;height:30px}' +
        '.tb-close .ic{width:1em;height:1em}' +
        // HIDE the title + meta line entirely — pure chrome, not needed mid-tap
        '.tb-head{display:none}' +
        // STAFF is the star: claim all the slack, never capped, content centred and
        // the clone is scaled to fit by fitTbStaff so it can never be clipped
        '.tb-staff{flex:1 1 auto;min-height:0;max-height:none!important;margin:2px 0;padding:6px 10px;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
        '.tb-staff .tb-clone{margin:0 auto}' +
        // instruction folds to a single tiny hint line that never reserves height
        '.tb-instruct{min-height:0;font-size:.78rem;font-weight:600;padding:2px 6px;line-height:1.2}' +
        // setup row: compact metronome button + tempo stepper on one tight line
        '.tb-setup{gap:8px;margin:2px 0;flex-wrap:nowrap}' +
        '.tb-start{font-size:.82rem;padding:8px 14px;min-height:38px;gap:5px;border-radius:10px}' +
        '.tb-start .ic{width:1em;height:1em}' +
        '.tb-tempo{gap:5px;padding:4px 8px;border-radius:10px}' +
        '.tb-tempo .tb-tlabel{display:none}' +     // drop the "TEMPO" word, the number is self-evident
        '.tb-tempo b{font-size:1rem;min-width:2.4ch}' +
        '.tb-tstep{width:30px;height:30px;font-size:1.15rem;border-radius:8px}' +
        // tap zones: still big enough for two-hand tapping, but bounded so the staff
        // keeps the lion\'s share. Fixed height (not flex:1) so the staff grows, not them
        '.tb-zones{flex:0 0 auto;min-height:0;height:34vh;gap:10px}' +
        '.tb-zone{border-radius:14px}' +
        '.tb-zone .tb-zlabel{font-size:1.25rem}' +
        '.tb-zone .tb-zhint{font-size:.62rem}' +
        // count-off overlays the centre (already absolute) — keep it from pushing layout
        '.tb-countoff{top:38%;font-size:3.6rem}' +
      '}' +
      /* ===== INLINE PERFORM PANEL (standalone TAPPING game) =====
         The same .tb-* panel, mounted UNDER the main staff instead of in a modal.
         It is wrapped in a dark "console" surface so the shared light-on-dark panel
         styles read correctly on the themed page, and given a fixed-height zone row
         (the global .tb-zones flex:1 is for the modal's flex column). The count-off
         number is mounted OVER the main staff (#measureContainer is position:relative)
         so "1·2·3·4 → GO" reads on the very notation being performed. */
      '.tb-inline{margin:14px auto 0;max-width:1500px;width:100%}' +
      '.tb-inline-panel{display:flex;flex-direction:column;gap:6px;background:rgba(12,12,18,.92);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:14px 16px calc(env(safe-area-inset-bottom,0px) + 14px);color:#eef1fb;font-family:system-ui,sans-serif;-webkit-tap-highlight-color:transparent;box-shadow:0 10px 30px rgba(0,0,0,.35)}' +
      // zone row: fixed, comfortable height for two-hand tapping (no modal flex:1 here)
      '.tb-inline-panel .tb-zones{flex:0 0 auto;min-height:0;height:150px}' +
      '.tb-inline-panel .tb-results{flex:0 0 auto;overflow:visible}' +
      // count-off big number centered over the main staff
      '.tb-countoff-inline{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);font-size:5rem;z-index:8}' +
      '.tb-countoff-inline.show{display:flex}' +
      // phone landscape: shrink the inline panel chrome like the modal does
      '@media (pointer: coarse) and (max-height: 500px){' +
        '.tb-inline{margin:8px auto 0}' +
        '.tb-inline-panel{gap:4px;padding:8px 10px calc(env(safe-area-inset-bottom,0px) + 8px);border-radius:12px}' +
        '.tb-inline-panel .tb-zones{height:30vh}' +
        '.tb-countoff-inline{font-size:3.4rem}' +
      '}' +
      /* ===== iPhone COMPACT PERFORM SCROLL — single horizontal auto-scroll lane =====
         Active only while performing (body.tb-perform-scroll, set on Start metronome,
         and only when compactScrollEligible()). Flattens the stacked multi-row staff
         into ONE short horizontal lane: the rows are laid side-by-side (their widths
         set by JS to keep equal cell widths), the lane scrolls horizontally, and the
         vertical footprint shrinks so the lane + both tap zones fit on an iPhone. The
         white "paper" staff and per-cell notation are untouched — only layout. */
      'body.tb-perform-scroll #measureContainer{position:relative}' +
      'body.tb-perform-scroll #measureContainer .answer-staff{' +
        'display:flex;flex-wrap:nowrap;align-items:flex-start;' +
        'width:100%!important;max-width:100%!important;' +
        'overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;' +
        'padding:8px 10px;scroll-behavior:smooth}' +
      // each former row is now a fixed-width lane segment, side by side, no stacking
      'body.tb-perform-scroll #measureContainer .staff-container{' +
        'flex:0 0 auto;margin-top:0!important;height:clamp(78px,11vh,108px)}' +
      'body.tb-perform-scroll #measureContainer .staff-container + .staff-container{margin-top:0!important}' +
      // the "Perform this rhythm" pill would float oddly over the lane — hide it here
      'body.tb-perform-scroll #measureContainer .answer-staff-label{display:none}' +
      // the count-off number stays centered over the (now short) lane
      'body.tb-perform-scroll .tb-countoff-inline{top:50%}' +
      // landscape phone: keep the lane SHORT so both zones stay on screen together
      '@media (pointer: coarse) and (max-height: 500px){' +
        'body.tb-perform-scroll #measureContainer .staff-container{height:clamp(64px,20vh,96px)}' +
        'body.tb-perform-scroll #measureContainer .answer-staff{padding:4px 8px}' +
        // give the zones a touch more room now the staff is compact
        'body.tb-perform-scroll .tb-inline-panel .tb-zones{height:32vh}' +
      '}' +
      /* ============================ TEACH SCREENS ============================
         Reuse the shared .tapback-ov dark surface + --tb-accent theme var; NO
         emoji (inline IC.* icons), per-theme colors. The mini-staff reuses the
         .tb-staff/.tb-cell/.placed-note rules above (white "paper" notation). */
      '.teach-ov{align-items:flex-start;overflow-y:auto}' +
      '.teach-card{max-width:620px;margin:auto;padding-top:max(env(safe-area-inset-top,0px),18px)}' +
      '.teach-head{text-align:center;margin:2px 8px 10px}' +
      '.teach-chap{font-size:.64rem;letter-spacing:.16em;text-transform:uppercase;font-weight:800;opacity:.6;margin-bottom:5px}' +
      '.teach-title{font-size:1.4rem;font-weight:800;letter-spacing:.01em;line-height:1.15}' +
      '.teach-new{font-size:.95rem;opacity:.85;margin-top:8px;line-height:1.45}' +
      '.teach-body{display:flex;flex-direction:column;gap:12px}' +
      '.teach-figs{margin:0;padding:0 0 0 2px;list-style:none;display:flex;flex-direction:column;gap:5px}' +
      '.teach-figs li{position:relative;padding-left:18px;font-size:.86rem;opacity:.9;line-height:1.4}' +
      '.teach-figs li::before{content:"";position:absolute;left:2px;top:.5em;width:7px;height:7px;border-radius:50%;background:var(--tb-accent,#7c5cff)}' +
      '.teach-staff{margin:2px 0!important;max-height:none!important}' +
      '.teach-stage{font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--tb-accent,#7c5cff);text-align:center}' +
      '.teach-syll{font-size:.9rem;font-style:italic;opacity:.85;text-align:center;line-height:1.5;background:rgba(255,255,255,.05);border-radius:10px;padding:9px 12px}' +
      // per-game framing line (dictation: listen-for; tapping: coordination cue)
      '.teach-tip{font-size:.9rem;line-height:1.45;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:11px;padding:11px 13px}' +
      '.teach-tip-label{display:block;font-size:.6rem;letter-spacing:.14em;text-transform:uppercase;font-weight:800;opacity:.55;margin-bottom:4px}' +
      // call-and-response tap pad
      '.teach-pad-wrap{display:flex;flex-direction:column;align-items:center;gap:9px}' +
      '.teach-pad{position:relative;width:100%;max-width:360px;height:118px;border-radius:16px;border:2px dashed rgba(255,255,255,.28);background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;transition:background .1s,transform .06s}' +
      '.teach-pad:active{transform:scale(.99)}' +
      '.teach-pad.teach-pad-flash{background:var(--tb-accent,#7c5cff);box-shadow:0 0 0 3px rgba(124,92,255,.35)}' +
      '.teach-pad-hint{font-size:.95rem;font-weight:700;opacity:.6;letter-spacing:.03em}' +
      '.teach-pad-co{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:3.4rem;font-weight:900;color:var(--tb-accent,#7c5cff);opacity:0;pointer-events:none}' +
      '.teach-pad-co.show{opacity:1}' +
      '.teach-pad-co.tb-pop{animation:tbPop .42s ease-out}' +
      '.teach-pad-msg{font-size:.85rem;opacity:.8;min-height:1.2em;text-align:center}' +
      // footer action row
      '.teach-foot{display:flex;gap:10px;align-items:center;justify-content:flex-end;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12)}' +
      '.teach-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;font-weight:800;font-size:.92rem;border:none;border-radius:12px;padding:12px 20px;min-height:48px;cursor:pointer;transition:.12s}' +
      '.teach-btn .ic{margin:0;width:1.15em;height:1.15em;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}' +
      '.teach-btn .ic-fill{fill:currentColor;stroke:none}' +
      '.teach-btn:active{transform:translateY(2px)}' +
      '.teach-skip{background:transparent;color:#cfd3e0;font-weight:600;margin-right:auto;padding-left:4px}' +
      '.teach-skip:hover{color:#fff}' +
      '.teach-hear,.teach-cr{background:rgba(255,255,255,.12);color:#fff}' +
      '.teach-hear:hover,.teach-cr:hover{background:rgba(255,255,255,.2)}' +
      '.teach-cr{margin-bottom:2px}' +
      '.teach-go{background:var(--tb-accent,#7c5cff);color:#fff}' +
      '.teach-go:hover{filter:brightness(1.08)}' +
      '.teach-go:disabled{opacity:.4;cursor:default;transform:none;filter:none}' +
      // moving beat guide on the teach mini-staff (same blue as the main beat guide)
      '.teach-staff .teach-cell.solo-beat-on{background:rgba(33,150,243,.18)!important;box-shadow:inset 0 0 0 2px rgba(33,150,243,.7);border-radius:4px}' +
      '@media (max-width:480px){.teach-title{font-size:1.2rem}.teach-card{padding-left:12px;padding-right:12px}.teach-pad{height:104px}}' +
      /* ===== LANDSCAPE PHONE: the teach card was sized for a tall portrait phone
         (max-width:620px, generous padding/fonts) and never adapted for a short,
         wide landscape screen -- on landscape it either needed heavy scrolling to
         reach Skip/Got it, or just looked like a cramped portrait card stranded in
         a wide viewport. Same fix family as the tap-back modal's landscape block
         above: widen the card to use the actual available width instead of capping
         at a portrait-sized max-width, shrink vertical rhythm everywhere, and pin
         the footer buttons with position:sticky (proven pattern from .tb-rbtns)
         so they're reachable without hunting for a scrollbar. */
      '@media (pointer:coarse) and (max-height:500px){' +
        '.teach-card{max-width:94vw;padding-top:6px!important}' +
        '.teach-head{margin:0 26px 4px 4px}' +   // right margin clears the close button
        '.teach-chap{font-size:.56rem;margin-bottom:2px}' +
        '.teach-title{font-size:1.05rem;line-height:1.1}' +
        '.teach-new{font-size:.78rem;margin-top:3px;line-height:1.3}' +
        '.teach-body{gap:6px}' +
        '.teach-stage{font-size:.62rem}' +
        '.teach-figs{gap:2px}' +
        '.teach-figs li{font-size:.74rem;padding-left:14px}' +
        '.teach-syll{font-size:.78rem;padding:6px 10px;line-height:1.3}' +
        '.teach-staff{max-height:92px!important}' +
        '.teach-tip{font-size:.76rem;padding:7px 10px;line-height:1.3}' +
        '.teach-tip-label{font-size:.54rem;margin-bottom:2px}' +
        '.teach-pad{height:68px}' +
        '.teach-pad-hint{font-size:.78rem}' +
        '.teach-pad-co{font-size:2.2rem}' +
        '.teach-pad-msg{font-size:.7rem;min-height:1em}' +
        '.teach-foot{' +
          'position:sticky;bottom:0;margin-top:6px;padding:8px 0 2px;' +
          'background:rgba(10,10,16,.96);border-top:1px solid rgba(255,255,255,.12)' +
        '}' +
        '.teach-btn{padding:9px 14px;min-height:38px;font-size:.8rem}' +
      '}';
    document.head.appendChild(st);
    // Beat flash bar — always in the DOM; only animates when S.quiet is on.
    if (!document.getElementById('beatFlash')) {
      var bf = document.createElement('div'); bf.id = 'beatFlash';
      document.body.appendChild(bf);
    }
    // Ever-present KIDS mascot (Tock). Always in the DOM; shown ONLY in the kids theme
    // (CSS-gated). pointer-events:none so it never blocks a tap. His pendulum ticks in
    // time with the beat (wired in the beat schedulers) — a functional visual metronome.
    if (!document.getElementById('kidsTock')) {
      var kt = document.createElement('div'); kt.id = 'kidsTock'; kt.setAttribute('aria-hidden', 'true');
      kt.innerHTML = TOCK.idle;
      document.body.appendChild(kt);
    }
  }

  // Populate the LEVEL dropdown.
  //   GUIDED mode -> the matched 31-level ladder (one option per Hall chapter):
  //     passed (mastered) and the current frontier are selectable (replay/review);
  //     not-yet-built chapters and levels beyond the frontier are disabled.
  //   FREE PLAY -> the current family's tiers + "all figures" (the original picker).
  function fillLevelOptions() {
    var sel = document.getElementById('soloLevel'); if (!sel) return;
    if (S.guided && GUIDE.avail()) {
      var lad = GUIDE.ladder(), gd = GUIDE.data(), html = '';
      for (var i = 0; i < lad.length; i++) {
        var L = lad[i];
        var isMastered = gd.mastered.indexOf(L.id) !== -1;
        var isCurrent = (i === gd.idx);
        var canBuild = GUIDE.playable(L);
        // Selectable: a playable level that is mastered, current, or earlier-than-frontier.
        var selectable = canBuild && (isMastered || i <= gd.idx);
        var tag = isCurrent ? ' • now' : (isMastered ? ' • passed' : (!canBuild ? ' • locked' : (i > gd.idx ? ' • locked' : '')));
        html += '<option value="' + i + '"' + (selectable ? '' : ' disabled') + '>' +
          'Ch ' + L.hallChapter + ' · ' + L.title + tag + '</option>';
      }
      sel.innerHTML = html;
      sel.value = String(gd.idx);
      return;
    }
    var fam = curFamily(), html2 = '', t;
    for (t = 1; t <= fam.steps.length; t++) html2 += '<option value="' + t + '">Lvl ' + t + ' · ' + (fam.labels[t] || ('Tier ' + t)) + '</option>';
    html2 += '<option value="all">' + (fam.classic || 'All figures') + '</option>';
    sel.innerHTML = html2;
    sel.value = (S.level === 'all') ? 'all' : String(S.level);
  }

  // In GUIDED mode the level dictates the meter and the ramp drives the bar count,
  // so hide the free-play METER + BARS pickers (they reappear in Free play).
  function syncMeterPicker() {
    var guided = !!(S.guided && GUIDE.avail());
    var ms = document.querySelector('#soloHud .solo-metersel'); if (ms) ms.style.display = guided ? 'none' : '';
    var mt = document.getElementById('soloMeter');
    if (mt && !guided) mt.value = S.changing ? ('change:' + (S.changeKind || 'simple')) : S.ts;
  }
  function syncBarsPicker() {
    var guided = !!(S.guided && GUIDE.avail());
    var bs = document.querySelector('#soloHud .solo-barsel'); if (bs) bs.style.display = guided ? 'none' : '';
    var br = document.getElementById('soloBars'); if (br && !guided) br.value = String(S.measures);
  }

  function buildHud() {
    if (document.getElementById('soloHud')) return;
    injectStyle();
    TEACH.register();   // wire the teach overlay into GUIDE.maybeTeach()
    // METER selector — grouped simple/compound; each option's value is the time sig.
    var meterOpts = '<optgroup label="Simple">', g = 'simple';
    METERS.forEach(function (m) {
      if (m.meter !== g) { meterOpts += '</optgroup><optgroup label="Compound">'; g = m.meter; }
      meterOpts += '<option value="' + m.ts + '">' + m.ts + ' — ' + m.desc + '</option>';
    });
    meterOpts += '</optgroup>';
    // Changing meters within one example (Hall Ch19+). Value 'change:simple' etc.
    meterOpts += '<optgroup label="Changing">' +
      '<option value="change:simple">Changing · simple (2/4·3/4·4/4)</option>' +
      '<option value="change:beatconst">Changing · simple↔compound · beat constant</option>' +
      '</optgroup>';
    var hud = document.createElement('div'); hud.id = 'soloHud'; hud.className = 'solo-ctl';
    hud.innerHTML =
      '<div class="solo-stats">' +
        '<div class="solo-stat solo-modesel"><span>PATH</span><select id="soloPath"><option value="guided">Guided</option><option value="free">Free play</option></select></div>' +
        '<div class="solo-stat solo-metersel"><span>METER</span><select id="soloMeter">' + meterOpts + '</select></div>' +
        '<div class="solo-stat solo-levelsel"><span>LEVEL</span><select id="soloLevel"></select></div>' +
        '<div class="solo-stat solo-barsel"><span>BARS</span><select id="soloBars"><option value="2">2</option><option value="4">4</option><option value="8">8</option><option value="16">16</option></select></div>' +
        '<div class="solo-stat solo-keybind"><span>BEAT KEY</span><button class="keybind-btn" id="keyBeatBtn" title="Click to rebind"></button></div>' +
        '<div class="solo-stat solo-keybind"><span>RHYTHM KEY</span><button class="keybind-btn" id="keyRhythmBtn" title="Click to rebind"></button></div>' +
        '<div class="solo-stat"><span>SCORE</span><b id="soloScore">0</b></div>' +
        '<div class="solo-stat"><span>STREAK</span><b id="soloStreak">0</b>' + IC.flame + '</div>' +
        '<div class="solo-stat"><span>BONUS</span><b id="soloBonus">0</b></div>' +
      '</div>' +
      // GUIDED MASTERY METER — the current ladder level + a per-theme mastery bar
      // (NO emoji). Hidden in free play. Populated by render() via GUIDE.masteryView().
      '<div id="soloMastery" class="solo-mastery" style="display:none">' +
        '<div class="sm-level"><span class="sm-chap" id="smChap"></span><span class="sm-title" id="smTitle"></span></div>' +
        // Level-progress PIPS (casual): circles that fill as you near passing the level —
        // out of the way, no second bar (MelodyQuest pattern). Hidden by default; casual
        // shows them and hides the meter bar. Populated by renderMastery.
        '<div class="sm-pips" id="soloPips"></div>' +
        '<div class="sm-meterwrap"><div class="sm-meter"><i id="smFill"></i>' +
          // band threshold ticks at 50 / 80 / 95 (Familiar / Proficient / Mastered)
          '<u class="sm-tick" style="left:50%"></u><u class="sm-tick" style="left:80%"></u><u class="sm-tick" style="left:95%"></u>' +
        '</div><b id="smBand" class="sm-band"></b></div>' +
        '<div class="sm-ramp" id="smRamp"></div>' +
      '</div>' +
      '<div class="solo-actions">' +
        '<button id="soloPlay" class="primary play">' + IC.play + 'Play</button>' +
        // Everyday controls live IN the bar next to Play (on desktop too):
        '<div class="solo-stat bar-item"><span>SPEED</span><select id="soloSpeed"><option value="slow">Slow</option><option value="medium">Medium</option><option value="fast">Fast</option></select></div>' +
        '<button id="soloMetro" class="toggle">' + IC.metro + 'Metronome</button>' +
        '<button id="soloGuide" class="toggle">' + IC.guide + 'Beat guide</button>' +
        '<button id="soloMute" class="toggle" title="Quiet mode — replaces clicks with a visual beat flash">' + IC.mute + 'Quiet</button>' +
        '<button id="soloHintsToggle" class="toggle focus-only">' + IC.bulb + 'Hints</button>' +
        '<button id="soloSettingsToggle" class="toggle focus-only">' + IC.gear + 'Settings</button>' +
        '<div class="solo-stat groove bar-item"><span>' + IC.disc + 'GROOVE</span><div class="solo-bar"><i id="soloGrooveFill"></i></div><b id="soloGroovePct">100%</b></div>' +
        // Compact SCORE/STREAK — hidden by default (desktop already shows the full
        // .solo-stats readout); the touch breakpoint reveals this instead, since
        // .solo-stats itself collapses into the Settings dropdown there and score/
        // streak would otherwise be buried under a menu tap. Sits directly before
        // the theme icon so groove's flex:1 pushes BOTH of them together to the
        // far right edge, theme icon last/outermost.
        '<div class="solo-stat solo-quickstats" id="soloQuickStats" title="Score / streak">' +
          '<div class="qs-item"><b id="soloScoreQ">0</b><small>SCORE</small></div>' +
          '<div class="qs-item qs-streak"><b id="soloStreakQ">0</b>' + IC.flame + '<small>STREAK</small></div>' +
        '</div>' +
        '<button id="soloThemeToggle" class="toggle focus-only icon-only" title="Theme" aria-label="Theme">' + IC.palette + '</button>' +
        '<span class="solo-hints"><span class="hints-label">HINTS</span>' +
          '<button id="soloHintNarrow" class="hint">' + IC.filter + 'Narrow options' + hintCostBadge(GROOVE_HINT_NARROW) + '</button>' +
          '<button id="soloHearBeat" class="hint">' + IC.hear + 'Hear a beat' + hintCostBadge(GROOVE_HINT_PLAY) + '</button>' +
          '<button id="soloHintCount" class="hint">' + IC.count + 'Count sounds' + hintCostBadge(GROOVE_HINT_COUNT) + '</button>' +
          '<button id="soloHintBeats" class="hint">' + IC.search + 'Find mistakes' + hintCostBadge(GROOVE_HINT_MISTAKES) + '</button>' +
        '</span>' +
        '<label class="solo-toggle solo-cfg"><input type="checkbox" id="soloCorrect"> Fix-it mode</label>' +
      '</div>' +
      '<div id="soloMsg"></div>';
    // Insert #soloHud as a DIRECT CHILD OF BODY, a sibling of #gameArea -- NOT
    // nested inside it. On mobile both are position:fixed; #gameArea also has
    // overflow-y:auto there, and WebKit has a long-documented bug (e.g.
    // bugs.webkit.org #160953) where a position:fixed descendant of an ancestor
    // that establishes its own overflow/stacking context gets incorrectly clipped
    // -- correct layout geometry, but nothing paints. #beatFlash and the debug
    // readout (appended straight to body) never hit this; #soloHud did because it
    // was inserted inside #gameArea. Visually harmless: body is a flex column, so
    // inserting HUD immediately before #gameArea keeps it in the same spot in both
    // the desktop in-flow layout and the mobile fixed-bar layout.
    var ga = document.getElementById('gameArea');
    if (ga && ga.parentNode) ga.parentNode.insertBefore(hud, ga); else document.body.appendChild(hud);

    // Submit / Next live in their own bar at the very bottom, under the bank.
    // Same clipping risk as #soloHud above (also position:fixed on mobile) -- same
    // fix: a body-level sibling of #gameArea, not a descendant of it.
    var actions = document.createElement('div'); actions.id = 'soloActions'; actions.className = 'solo-ctl';
    actions.innerHTML =
      '<button id="soloSubmit" class="primary go">' + IC.check + 'Submit answer</button>' +
      '<button id="soloTapBack" class="tapback" style="display:none">' + IC.tap + 'Tap it back<span class="tb-badge">' + TB_BONUS_HINT + '</span></button>' +
      '<button id="soloNext" class="go" style="display:none">' + IC.next + 'Next</button>';
    if (ga && ga.parentNode) ga.parentNode.insertBefore(actions, ga.nextSibling); else document.body.appendChild(actions);

    document.getElementById('soloPlay').onclick = playTarget;
    // Focus-layout dropdowns: Settings + Hints + Theme toggle their panels (one at a time).
    var stog = document.getElementById('soloSettingsToggle');
    var htog = document.getElementById('soloHintsToggle');
    var ttog = document.getElementById('soloThemeToggle');
    // Each toggle -> its open class, button, and the panel element to anchor.
    // The panel is fetched lazily (themeSwitcher is created by suite-theme.js) and
    // its left/top are pinned under the button each time it opens (so the dropdown
    // sits directly below its OWN button instead of jammed to the far left).
    var PANELS = [
      { cls: 'settings-open', btn: stog, getPanel: function () { var h = document.getElementById('soloHud'); return h ? h.querySelector('.solo-stats') : null; } },
      { cls: 'hints-open',    btn: htog, getPanel: function () { return document.querySelector('.solo-actions .solo-hints'); } },
      { cls: 'theme-open',    btn: ttog, getPanel: function () { return document.getElementById('themeSwitcher'); } }
    ];
    function clearPanelPos() {
      PANELS.forEach(function (p) { var el = p.getPanel(); if (el) { el.style.left = ''; el.style.right = ''; el.style.top = ''; } });
    }
    // Position an open panel directly below + horizontally aligned to its button,
    // clamped so it never spills off either screen edge.
    function anchorPanel(p) {
      var el = p.getPanel(), btn = p.btn; if (!el || !btn) return;
      // Let it lay out at its natural size first, then measure + clamp.
      el.style.left = '0px'; el.style.right = 'auto'; el.style.top = '0px';
      var br = btn.getBoundingClientRect();
      var pw = el.offsetWidth || 240;
      var margin = 6, vw = window.innerWidth;
      var left = Math.min(Math.max(margin, br.left), Math.max(margin, vw - pw - margin));
      el.style.left = Math.round(left) + 'px';
      el.style.right = 'auto';
      el.style.top = Math.round(br.bottom + 6) + 'px';
    }
    var _panelOpenedAt = 0;
    function togglePanel(cls, btn) {
      var on = !document.body.classList.contains(cls);
      document.body.classList.remove('settings-open', 'hints-open', 'theme-open');
      [stog, htog, ttog].forEach(function (x) { if (x) x.classList.remove('on'); });
      clearPanelPos();
      if (on) {
        _panelOpenedAt = typeof performance !== 'undefined' ? performance.now() : 0;
        document.body.classList.add(cls); if (btn) btn.classList.add('on');
        var p = PANELS.filter(function (x) { return x.cls === cls; })[0];
        if (p) anchorPanel(p);
      }
    }
    function anyPanelOpen() { return document.body.classList.contains('settings-open') || document.body.classList.contains('hints-open') || document.body.classList.contains('theme-open'); }
    function closeAllPanels() {
      document.body.classList.remove('settings-open', 'hints-open', 'theme-open');
      [stog, htog, ttog].forEach(function (x) { if (x) x.classList.remove('on'); });
      clearPanelPos();
    }
    if (stog) stog.onclick = function () { togglePanel('settings-open', stog); };
    if (htog) htog.onclick = function () { togglePanel('hints-open', htog); };
    if (ttog) ttog.onclick = function () { togglePanel('theme-open', ttog); };
    // Click-outside-to-close. Guard: if a panel was opened < 250ms ago (same touch
    // that opened it can trigger this handler on the next frame on mobile), bail out.
    document.addEventListener('pointerdown', function (e) {
      if (!anyPanelOpen()) return;
      var now = typeof performance !== 'undefined' ? performance.now() : 0;
      if (now - _panelOpenedAt < 250) return;
      var t = e.target;
      if (t.closest && (t.closest('#soloSettingsToggle') || t.closest('#soloHintsToggle') || t.closest('#soloThemeToggle'))) return; // toggles handle themselves
      for (var i = 0; i < PANELS.length; i++) {
        var el = PANELS[i].getPanel();
        if (el && document.body.classList.contains(PANELS[i].cls) && el.contains(t)) return; // click inside an open panel
      }
      closeAllPanels();
    }, true);
    // Keep an open panel anchored to its button on resize/scroll/rotate.
    function reanchorOpen() {
      for (var i = 0; i < PANELS.length; i++) if (document.body.classList.contains(PANELS[i].cls)) anchorPanel(PANELS[i]);
    }
    window.addEventListener('resize', reanchorOpen);
    window.addEventListener('orientationchange', function () { setTimeout(reanchorOpen, 260); });
    // Re-sync the staff's bottom padding to the (wrapping) bank height on rotate/resize.
    window.addEventListener('resize', syncBankPad);
    window.addEventListener('orientationchange', function () { setTimeout(syncBankPad, 250); });
    // Re-fit the tap-back staff scale when the viewport changes while the overlay is
    // open (rotation changes the available height the rhythm must fit into).
    window.addEventListener('resize', function () { if (TB.open) fitTbStaff(); });
    window.addEventListener('orientationchange', function () { if (TB.open) setTimeout(fitTbStaff, 260); });
    document.getElementById('soloHintBeats').onclick = hintMistakes;
    document.getElementById('soloHintCount').onclick = function () { armPick('count'); };
    document.getElementById('soloHearBeat').onclick = function () { armPick('play'); };
    document.getElementById('soloHintNarrow').onclick = hintNarrow;
    // While a pick-hint is armed, a tap on a beat acts on THAT beat.
    var ga = document.getElementById('gameArea') || document;
    ga.addEventListener('click', function (e) {
      if (!S.pick) return;
      if (e.target.closest && e.target.closest('.remove-btn')) return;
      var z = e.target.closest && e.target.closest('.beat-drop-zone');
      if (!z) return;
      var m = parseInt(z.dataset.measure, 10), b = parseInt(z.dataset.beat, 10);
      if (S.pick === 'count') doCountBeat(m, b); else doHearBeat(m, b);
    });
    document.getElementById('soloSubmit').onclick = submit;
    document.getElementById('soloNext').onclick = newRound;
    // Dictation game -> MODAL overlay (the rhythm isn't shown until notated).
    // Tapping game   -> INLINE on the main staff (the rhythm is already shown).
    // Same openTapBack logic path; only the render target differs.
    document.getElementById('soloTapBack').onclick = function () { openTapBack(S.mode === 'tapping'); };
    /* NO "Show answer" BUTTON. It was never a hint, it was a forfeit, and the code said so: it
       zeroed the streak, recorded the round wrong, hid Submit, and printed
       "(No points — hit Next for a new one.)". A hint costs groove and leaves you playing.
       Removed 2026-07-10 at the owner's instruction: "a hint that is 'show the answer' is not a
       hint at all and worthless".

       revealCorrect() STAYS. Its four callers are three different things — check before you assume:
         newTappingRound()     PRE-FILLS the staff with the rhythm you are about to perform. Tapping
                               is not dictation; there the notation is the prompt, not the answer.
         checkAnswer() x2      the AUTOMATIC reveal after a wrong answer when Fix-it mode is off —
                               the engine showing you what you missed, not you asking to skip.
         forceCapstoneRound()  a DEV/QA seam (`_dev`, ?dev=1 only). It places the exact correct
                               answer so submit() can pass the capstone gate without a human
                               notating eight bars.
       I first wrote that all four were wrong-answer reveals, then that three were. Both wrong.
       Codex read them. Line numbers are deliberately omitted here: they were stale within a day. */
    // PATH toggle: Guided (the matched ladder spine) vs Free play (the original
    // free meter/level pickers). Switching re-points the level vocabulary and meter.
    var pathSel = document.getElementById('soloPath');
    if (pathSel) {
      pathSel.value = (S.guided && GUIDE.avail()) ? 'guided' : 'free';
      if (!GUIDE.avail()) pathSel.disabled = true;   // engine missing -> free play only
      pathSel.onchange = function () {
        S.guided = (pathSel.value === 'guided');
        if (S.guided && GUIDE.avail()) { GUIDE.applyLevel(); }
        fillLevelOptions(); syncMeterPicker(); syncBarsPicker();
        save(); newRound();
      };
    }
    var lv = document.getElementById('soloLevel');
    fillLevelOptions();                          // populate LEVEL for the current family/ladder
    syncMeterPicker(); syncBarsPicker();
    var mt = document.getElementById('soloMeter');
    mt.value = S.changing ? ('change:' + (S.changeKind || 'simple')) : S.ts;
    mt.onchange = function () {
      var v = mt.value;
      if (v.indexOf('change:') === 0) {          // changing-meter mode
        S.changing = true; S.changeKind = v.slice(7);
        S.changePool = CHANGE_POOLS[S.changeKind] || CHANGE_POOLS.simple;
        S.family = 'quarter'; S.meter = 'simple';  // simple-quarter vocabulary for now
        if (S.level !== 'all' && S.level > curFamily().steps.length) S.level = 'all';
      } else {
        S.changing = false; setMeter(v);          // sets family/beats/meter; resets level on family change
      }
      fillLevelOptions();
      save(); newRound();
    };
    lv.onchange = function () {
      var v = lv.value;
      if (S.guided && GUIDE.avail()) {
        // Guided: pick a ladder position (replay a passed level or the frontier).
        var i = parseInt(v, 10);
        if (GUIDE.gotoIndex(i)) { fillLevelOptions(); syncMeterPicker(); save(); newRound(); }
        else { fillLevelOptions(); }   // rejected (locked) -> snap the select back
        return;
      }
      S.level = (v === 'all') ? 'all' : parseInt(v, 10);
      save(); newRound();
    };
    var sp = document.getElementById('soloSpeed');
    sp.value = S.speed;
    // Speed is the ONLY setting that doesn't stop or regenerate: it just updates
    // the tempo (applied on the next Play) and keeps the same example/playback.
    sp.onchange = function () { S.speed = sp.value; S.tempo = SPEEDS[S.speed] || 100; save(); };
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
    var qb = document.getElementById('soloMute');
    if (qb) {
      qb.classList.toggle('on', S.quiet);
      qb.onclick = function () {
        S.quiet = !S.quiet; qb.classList.toggle('on', S.quiet);
        // swap icon so it's clear whether sound is silenced
        qb.innerHTML = (S.quiet ? IC.mute : IC.sound) + 'Quiet';
        if (!S.quiet) {
          // clear any lingering flash when turning off
          var fl = document.getElementById('beatFlash');
          if (fl) fl.className = '';
        }
        save();
      };
      // Apply initial icon state
      qb.innerHTML = (S.quiet ? IC.mute : IC.sound) + 'Quiet';
    }

    // ---- Keyboard tap shortcut: keyBeat + keyRhythm keys fire the tap zones ----
    function keyLabel(k) { return k === ' ' ? 'Space' : k.toUpperCase(); }
    function refreshKeyBtns() {
      var bb = document.getElementById('keyBeatBtn'), rb = document.getElementById('keyRhythmBtn');
      if (bb) bb.textContent = keyLabel(S.keyBeat);
      if (rb) rb.textContent = keyLabel(S.keyRhythm);
    }
    refreshKeyBtns();

    // Rebind: click a key button → it enters capture mode → next keydown sets the binding.
    var capturing = null;   // 'beat' | 'rhythm' | null
    function startCapture(which) {
      capturing = which;
      var bb = document.getElementById('keyBeatBtn'), rb = document.getElementById('keyRhythmBtn');
      if (bb) bb.classList.toggle('capturing', which === 'beat');
      if (rb) rb.classList.toggle('capturing', which === 'rhythm');
      if (which === 'beat' && bb) bb.textContent = 'press key…';
      if (which === 'rhythm' && rb) rb.textContent = 'press key…';
    }
    function endCapture() {
      capturing = null;
      var bb = document.getElementById('keyBeatBtn'), rb = document.getElementById('keyRhythmBtn');
      if (bb) bb.classList.remove('capturing');
      if (rb) rb.classList.remove('capturing');
      refreshKeyBtns();
    }
    var bb2 = document.getElementById('keyBeatBtn'), rb2 = document.getElementById('keyRhythmBtn');
    if (bb2) bb2.onclick = function (e) { e.stopPropagation(); startCapture(capturing === 'beat' ? null : 'beat'); if (capturing === null) endCapture(); };
    if (rb2) rb2.onclick = function (e) { e.stopPropagation(); startCapture(capturing === 'rhythm' ? null : 'rhythm'); if (capturing === null) endCapture(); };

    // Dedup timestamps for keyboard taps (mirrors bindZone's lastAt per zone).
    var lastKeyAt = { beat: 0, rhythm: 0 };

    // Global keydown: capture mode → rebind; normal mode → fire tap zone.
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      var k = e.key;
      // Capture mode: next non-modifier key becomes the new binding.
      if (capturing) {
        if (k === 'Escape') { endCapture(); e.preventDefault(); return; }
        if (k === 'Shift' || k === 'Control' || k === 'Alt' || k === 'Meta') return;
        var norm = (k.length === 1) ? k.toLowerCase() : k;
        if (capturing === 'beat') S.keyBeat = norm;
        else S.keyRhythm = norm;
        endCapture(); save(); e.preventDefault(); return;
      }
      // Normal mode: fire the matching tap zone directly (no synthetic event — zero latency).
      if (!TB.open || !TB.metroOn) return;
      if (e.repeat) return;
      var kn = (k.length === 1) ? k.toLowerCase() : k;
      var now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if (kn === S.keyBeat) {
        e.preventDefault();
        if (now - lastKeyAt.beat < TAP_DEDUP_MS) return;
        lastKeyAt.beat = now;
        onBeatTap();
        flashZone(document.getElementById('tbBeat'));
      } else if (kn === S.keyRhythm) {
        e.preventDefault();
        if (now - lastKeyAt.rhythm < TAP_DEDUP_MS) return;
        lastKeyAt.rhythm = now;
        onRhythmTap();
        flashZone(document.getElementById('tbRhythm'));
      }
    });
    // keyup → relay to the rhythm zone for tap-and-hold grading (sustained notes).
    document.addEventListener('keyup', function (e) {
      if (capturing || !TB.open || !TB.metroOn) return;
      var k = e.key;
      var kn = (k.length === 1) ? k.toLowerCase() : k;
      if (kn !== S.keyRhythm) return;
      var z = document.getElementById('tbRhythm');
      if (z) { var pe = new PointerEvent('pointerup', { bubbles: true, cancelable: true, isPrimary: true }); z.dispatchEvent(pe); }
    });
  }

  // Kids theme = simplified guided-only mode. These helpers keep the guided path
  // forced whenever that theme is active (on boot + on a live theme switch).
  function kidsThemeActive() { return document.body.classList.contains('theme-kids'); }
  function reconcileKidsMode() {
    if (!kidsThemeActive()) return;               // only acts for the Kids theme
    if (GUIDE.avail() && !S.guided) {             // switched INTO kids while in free play
      S.guided = true;
      GUIDE.applyLevel();
      fillLevelOptions(); syncMeterPicker(); syncBarsPicker();
      var ps = document.getElementById('soloPath'); if (ps) ps.value = 'guided';
      save(); newRound();
    }
  }

  function start() {
    unlockAudio();   // resume audio in the entering gesture so the first count-in is clean
    rs = window.rhythmStudent;
    if (!rs) { setTimeout(start, 150); return; }
    if (rs.rhythmPatterns) {
      // Register every meter family's figures under the key the engine bank reads.
      if (!rs.rhythmPatterns.compound) rs.rhythmPatterns.compound = COMPOUND_FIGS;
      rs.rhythmPatterns.halfbeat = HALF_FIGS;
      rs.rhythmPatterns.dottedhalf = DOTTEDHALF_FIGS;
      rs.rhythmPatterns.dotted16 = DOTTED16_FIGS;
      // Tuplets are simple quarter-beat figures -> add to the 'medium' set (once).
      if (rs.rhythmPatterns.medium) TUPLET_FIGS.forEach(function (f) {
        if (!rs.rhythmPatterns.medium.some(function (p) { return p.id === f.id; })) rs.rhythmPatterns.medium.push(f);
      });
      // Combined bank for simple<->compound changing meters: quarter + compound
      // figures together so the player can build BOTH measure types.
      rs.rhythmPatterns.mixedSC = (rs.rhythmPatterns.medium || []).concat(COMPOUND_FIGS);
    }
    load();
    // Casual main-menu FREE-PLAY request (set by beatquest-casual.html before start()):
    // force free play with EXACTLY the selected figures + chosen meter.
    if (window.__freeSelection && window.__freeSelection.figures && window.__freeSelection.figures.length) {
      S.guided = false;
      S.freeFigures = window.__freeSelection.figures.slice();
      setMeter(window.__freeSelection.meter === 'compound' ? '6/8' : '4/4');
      S.level = 'all';
      window.__freeForce = true;
    } else { S.freeFigures = null; window.__freeForce = false; }
    // KIDS theme is a simplified, GUIDED-ONLY mode — a young learner should never land
    // in free play with the config hidden. Force the guided path on before the spine
    // init below (which is engine-gated + degrades gracefully if the engine is absent).
    if (kidsThemeActive() && !window.__freeForce) S.guided = true;
    // GUIDED SPINE init — needs window.LevelCore (the core/ engine bridge). The bridge
    // is a deferred module, so it may land a tick after start() first runs; we wait a
    // short, bounded time for it. If it truly never arrives, we degrade gracefully to
    // FREE PLAY (S.guided=false) so the game always boots.
    // First guided boot with a fresh profile: offer the placement test (owner
    // spec). Suppressed under every automated test seam and in ext-embed mode.
    if (S.guided && window.LevelCore && !/[?&](levtest|tbtest|exttarget)=1/.test(location.search)) {
      try {
        var placedFlag = localStorage.getItem('beatquest-placed-' + (S.mode || 'dictation'));
        var guidedData = JSON.parse(localStorage.getItem('beatquest-guided-' + (S.mode || 'dictation')) || 'null');
        var freshProfile = !guidedData || ((!guidedData.idx || guidedData.idx === 0) && (!guidedData.mastered || !guidedData.mastered.length));
        if (!placedFlag && freshProfile) setTimeout(function () { PLACE.offer(); }, 700);
      } catch (e) {}
    }
    if (S.guided && !window.LevelCore) {
      if (!start._lcWaits) start._lcWaits = 0;
      if (start._lcWaits < 25) { start._lcWaits++; setTimeout(start, 120); return; }
      S.guided = false;   // engine never loaded -> free play only (still fully playable)
    }
    if (S.guided && GUIDE.avail()) {
      GUIDE.load();
      if (!GUIDE.applyLevel()) {
        // The persisted ladder position isn't playable today (shouldn't happen — load()
        // advances to a playable level) — fall back to free play rather than a dead round.
        S.guided = false;
      }
    } else {
      S.guided = false;
    }
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('gameArea').classList.add('active');
    document.body.classList.remove('login-mode');
    // Solo has no classroom — hide the "Connected to Room / Status" bar entirely.
    var statusBar = document.querySelector('.status-bar'); if (statusBar) statusBar.style.display = 'none';
    // `rs.connected` does NOT mean "joined a room" — no classroom transport exists
    // (VISION.md §9). It is rhythm-student.js's flag for "the game surface is live and
    // may accept input". Named badly, load-bearing, renamed when the room lands.
    rs.connected = true;   // = game surface active, NOT a network connection
    buildHud();
    applyModeChrome();
    // Live theme switch INTO Kids mid-session: force guided + rebuild (the config
    // controls hide via CSS on their own; this fixes the underlying path). The picker
    // is built by suite-theme.js and present by now; guard against double-binding.
    var tsw = document.getElementById('themeSwitcher');
    if (tsw && !tsw._kidsHook) {
      tsw._kidsHook = true;
      tsw.addEventListener('click', function () { setTimeout(reconcileKidsMode, 0); });
    }
    S.groove = 100;
    // The teach screen for the FIRST level is shown by newRound() once that level's
    // round is actually built (newRound -> maybeTeachThisRound), so the warm-up mounts
    // ON TOP of the laid-out round. No premature call here.
    newRound();
  }

  // Enter the standalone TAPPING game. Same engine, same page, same levels —
  // it just flips S.mode before start() so newRound() routes to newTappingRound.
  function startTapping() { S.mode = 'tapping'; start(); }

  /* Tailor the shared HUD for whichever mode is active. The dictation game and
     the tapping game share ONE control bar (built by buildHud); tapping simply
     hides the controls that only make sense while DICTATING an answer — the
     rhythm bank (palette), the hint buttons, Fix-it mode, and Submit — since in
     tapping the rhythm is shown, not built. Everything timing/level related
     (Meter, Level, Bars, Speed, Metronome, Beat guide, Play, Tap-back) stays. */
  function applyModeChrome() {
    var tapping = (S.mode === 'tapping');
    document.body.classList.toggle('tapping-mode', tapping);
    if (!tapping) return;
    // Hide the dictation-only affordances.
    var bank = document.querySelector('.rhythm-bank'); if (bank) bank.style.display = 'none';
    var hints = document.querySelector('.solo-actions .solo-hints'); if (hints) hints.style.display = 'none';
    var fixit = document.querySelector('.solo-actions .solo-cfg'); if (fixit) fixit.style.display = 'none';
    var submit = document.getElementById('soloSubmit'); if (submit) submit.style.display = 'none';
    var h1 = document.querySelector('.header h1'); if (h1) h1.textContent = 'Tapping — Perform the Rhythm';
    try { document.title = 'Tapping — Music Dictation'; } catch (e) {}
    // No entry BUTTON in tapping: the perform-ready state (zones + Start metronome)
    // renders inline on round load (newTappingRound -> openTapBack(true)), so the
    // "Perform it" launcher is redundant. Keep it permanently hidden in this mode.
    var tb = document.getElementById('soloTapBack');
    if (tb) { tb.style.display = 'none'; tb.classList.remove('tb-perform'); }
  }

  function wireEntry() {
    var solo = document.getElementById('soloBtn');
    if (solo) solo.addEventListener('click', start);
    // ?mode=tapping boots straight into the standalone TAPPING game (no login form);
    // ?mode=solo boots the dictation solo game. Both reuse this same page + engine.
    if (/[?&]mode=tapping/.test(location.search)) setTimeout(startTapping, 300);
    else if (/[?&]mode=solo/.test(location.search)) setTimeout(start, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireEntry); else wireEntry();
  // Public surface.
  window.BeatQuestSolo = {
    start: start, startTapping: startTapping, state: S,
    // DEV/QA seam — jump anywhere on the ladder + fire the end screens. No effect on
    // normal play; the on-screen level-jumper below only mounts with ?dev=1 in the URL.
    _dev: {
      // GUIDE.place has NO frontier guard (unlike gotoIndex) and marks levels below as
      // proficient — exactly what a QA run through every level needs.
      jump: function (i) {
        // Dev-only. The dropdown lists every level; only jump to a READY one (compound is not ready
        // until Codex's work lands). Check first so place() — a production function — is never asked
        // to build a level it can't.
        var t = this.levels().filter(function (l) { return l.i === i; })[0];
        if (!t || !t.playable) { msg('DEV: level ' + (i + 1) + ' is not ready yet.'); return false; }
        if (GUIDE.avail() && GUIDE.place(i, true)) { S.bonusRound = false; S.groove = 100; newRound(); return true; }
        return false;
      },
      levels: function () { try { return GUIDE.ladder().map(function (l, k) { return { i: k, title: l.title, playable: GUIDE.playable(l) }; }); } catch (e) { return []; } },
      curIdx: function () { return S.guidedIdx; },
      gameOver: function () { showGameOver(); },
      levelComplete: function (t) { showLevelComplete(t || 'Next Level'); },
      killer: function () { startKillerRound(); }
    }
  };

  /* ---- DEV LEVEL-JUMPER (QA only, ?dev=1) --------------------------------------
     A fixed-position overlay that scrolls through EVERY ladder level so the whole
     progression can be walked without playing up to it. Purely additive: it mounts
     only with ?dev=1, sits above the game in its own layer, and never touches the
     normal layout. Also exposes buttons to fire the Game Over / Level Complete /
     Killer screens directly for visual QA. */
  if (/[?&]dev=1/.test(location.search)) {
    var mountDev = function () {
      if (!document.body || document.getElementById('bqDevPanel')) return;
      var host = document.createElement('div');
      host.id = 'bqDevPanel';
      host.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483000;background:rgba(20,22,34,.94);color:#eef1fb;font:12px/1.3 system-ui,sans-serif;padding:8px 10px;border-radius:10px;box-shadow:0 6px 22px rgba(0,0,0,.45);max-width:270px;pointer-events:auto;-webkit-tap-highlight-color:transparent';
      host.innerHTML =
        '<div style="font-weight:800;margin-bottom:6px;letter-spacing:.05em;opacity:.75">DEV · LEVEL SCROLL</div>' +
        '<div style="display:flex;gap:5px;align-items:center;margin-bottom:6px">' +
          '<button id="bqDevPrev" style="flex:0 0 auto;cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><path d="M14.5 5 7.5 12l7 7"/></svg></button>' +
          '<select id="bqDevSel" style="flex:1 1 auto;min-width:0;font:12px system-ui;padding:3px"></select>' +
          '<button id="bqDevNext" style="flex:0 0 auto;cursor:pointer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><path d="M9.5 5 16.5 12l-7 7"/></svg></button>' +
        '</div>' +
        '<div style="display:flex;gap:5px;flex-wrap:wrap">' +
          '<button id="bqDevGO" style="cursor:pointer">Game Over</button>' +
          '<button id="bqDevLC" style="cursor:pointer">Level Done</button>' +
          '<button id="bqDevKill" style="cursor:pointer">Killer</button>' +
        '</div>';
      document.body.appendChild(host);
      var sel = host.querySelector('#bqDevSel');
      var fill = function () {
        var lv = window.BeatQuestSolo._dev.levels();
        if (!lv.length) return false;
        sel.innerHTML = lv.map(function (l) { return '<option value="' + l.i + '">' + (l.playable ? '' : '· ') + (l.i + 1) + ' · ' + l.title + (l.playable ? '' : ' (n/a)') + '</option>'; }).join('');
        sel.value = window.BeatQuestSolo._dev.curIdx();
        return true;
      };
      if (!fill()) { var t = setInterval(function () { if (fill()) clearInterval(t); }, 300); }
      var jump = function (i) { if (window.BeatQuestSolo._dev.jump(i)) sel.value = i; else fill(); };
      host.querySelector('#bqDevPrev').onclick = function () { jump(Math.max(0, (+sel.value) - 1)); };
      host.querySelector('#bqDevNext').onclick = function () { jump((+sel.value) + 1); };
      sel.onchange = function () { jump(+sel.value); };
      host.querySelector('#bqDevGO').onclick = function () { window.BeatQuestSolo._dev.gameOver(); };
      host.querySelector('#bqDevLC').onclick = function () { window.BeatQuestSolo._dev.levelComplete(); };
      host.querySelector('#bqDevKill').onclick = function () { window.BeatQuestSolo._dev.killer(); };
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountDev);
    else mountDev();
  }
  /* ======================================================================
     EXTERNAL-TARGET seam — ONLY active with ?exttarget=1 in the URL. Lets an
     embedding page (the MELODIC suite: M2 rhythm-first + notation-entry's
     rhythm phase) hand THIS game an exact rhythm to dictate, instead of the
     game generating its own — real reuse of the whole bank/drag/grade UI, not
     a parallel rebuild. Zero effect in the normal game: nothing below runs
     without the flag, and the newRound/submit/bankKey hooks are all gated on
     EXT.active. Protocol (window.postMessage, parent <-> this iframe):
       parent <- {type:'melodic-ext-ready'}                (we are booted)
       parent -> {type:'melodic-ext-target',
                  durations:['q','8','8',...],             (melodic codes: 'qd'
                  meter:'2/4'}                              = dotted quarter etc.)
       parent <- {type:'melodic-ext-unsupported', reason}  (can't express it)
       parent <- {type:'melodic-ext-result',
                  allCorrect, wrongBeats, totalBeats}      (after Submit)
     Scope: simple quarter-beat meters (2/4, 3/4, 4/4) AND compound 6/8-family
     (game beat = dotted quarter, one COMPOUND_FIGS figure per beat) — covers M2
     (Hall Ch1-3), the 4/4·3/4 notation-entry rungs, and M15 (6/8). Irregular
     meters (5/8·7/8, M25) fall back to the embedding page's own entry UI (it
     handles 'melodic-ext-unsupported').
     External rounds force guided OFF (they must not touch this game's own
     ladder/mastery) and correction-mode OFF (one-shot grading — the embedding
     page owns the round lifecycle).
     ====================================================================== */
  var EXT = { active: /[?&]exttarget=1/.test(location.search), pending: null, current: null };
  /* Melodic duration code for one game-pattern vexflow entry: 'q'+dots -> 'qd',
     rests keep their 'r' ('qr' both sides). */
  function extCodeOf(v) {
    var d = String(v.duration);
    if (v.dots) d += 'd';
    return d;
  }
  /* Convert melodic duration codes -> [{patternId,startBeat,beats}] measures,
     using ONE bank family throughout (the student's tile bank is one family).
     Tries 'medium' first (largest simple-meter family), then 'easy'. Returns
     {target, bank} or null when some stretch has no matching pattern. */
  function extConvert(durations, meter) {
    if (!rs || !rs.rhythmPatterns || !Array.isArray(durations) || !durations.length) return null;
    var parts = String(meter).split('/');
    var top = parseInt(parts[0], 10), bottom = parseInt(parts[1], 10);
    if (!(top > 0)) return null;
    // Meter → game-beat mapping. Simple quarter-beat meters: 1 quarter per beat,
    // quarter-family banks. Compound (6/8-family): the game's beat is the DOTTED
    // QUARTER (1.5 quarters), one COMPOUND_FIGS figure per beat, top/3 beats/bar —
    // exactly how the normal game plays 6/8 (see beatsForTs + the compound bank).
    var beatsPerBar, quartersPerBeat, families;
    if (bottom === 4) {
      beatsPerBar = top; quartersPerBeat = 1; families = ['medium', 'easy'];
    } else if (bottom === 8 && top % 3 === 0 && top > 3) {
      beatsPerBar = top / 3; quartersPerBeat = 1.5; families = ['compound'];
    } else {
      return null; // irregular (5/8·7/8) etc. — the embedding page falls back
    }
    // Quarters a duration code occupies on the page — used to reject patterns
    // whose NOTATED length differs from their GRID length (tuplets: triplet-
    // quarters is three 'q' entries squeezed into 2 beats — matching a melodic
    // sequence of three PLAIN quarters against it would silently change the
    // rhythm; caught by the round-trip test, not hypothetical).
    var EXT_Q = { w: 4, h: 2, q: 1, 8: 0.5, 16: 0.25 };
    function extQuartersOf(v) {
      var base = EXT_Q[String(v.duration).replace('r', '')] || 1;
      return v.dots ? base * 1.5 : base;
    }
    for (var f = 0; f < families.length; f++) {
      var pats = (rs.rhythmPatterns[families[f]] || []).filter(function (p) {
        if (!p.vexflow || !p.vexflow.length) return false;
        // grid length (beats × quarters-per-beat) must equal notated length
        var q = 0;
        for (var vi = 0; vi < p.vexflow.length; vi++) q += extQuartersOf(p.vexflow[vi]);
        return Math.abs(q - (p.beats || 1) * quartersPerBeat) < 1e-9;
      });
      // longest figure first so multi-beat/multi-note patterns win over singles
      pats = pats.slice().sort(function (a, b) { return b.vexflow.length - a.vexflow.length; });
      var target = [], i = 0, ok = true;
      while (ok && i < durations.length) {
        var meas = [], beat = 1;
        while (beat <= beatsPerBar && i < durations.length) {
          var matched = null;
          for (var pi = 0; pi < pats.length; pi++) {
            var p = pats[pi];
            if ((p.beats || 1) > beatsPerBar - beat + 1) continue;
            if (p.vexflow.length > durations.length - i) continue;
            var hit = true;
            for (var k = 0; k < p.vexflow.length; k++) {
              if (extCodeOf(p.vexflow[k]) !== String(durations[i + k])) { hit = false; break; }
            }
            if (hit) { matched = p; break; }
          }
          if (!matched) { ok = false; break; }
          meas.push({ patternId: matched.id, startBeat: beat, beats: matched.beats || 1 });
          beat += matched.beats || 1;
          i += matched.vexflow.length;
        }
        // Every bar must come out EXACTLY full — melodic rhythms always fill whole
        // bars, so a short bar means the conversion mis-parsed; fail to fallback.
        if (ok && beat !== beatsPerBar + 1) ok = false;
        if (ok) target.push(meas);
        if (target.length > 32) { ok = false; }
      }
      if (ok && i >= durations.length) return { target: target, bank: families[f] };
    }
    return null;
  }
  if (EXT.active) {
    window.addEventListener('message', function (ev) {
      var d = ev && ev.data;
      if (!d || d.type !== 'melodic-ext-target') return;
      var conv = extConvert(d.durations, d.meter);
      if (!conv) {
        try { window.parent.postMessage({ type: 'melodic-ext-unsupported', reason: 'no single-family pattern expression for that rhythm/meter' }, '*'); } catch (e) {}
        return;
      }
      EXT.pending = { target: conv.target, ts: d.meter, bank: conv.bank };
      S.guided = false;
      S.correctionMode = false;
      // The initial self-generated round (before our target arrived) may have
      // mounted the guided TEACH overlay — tear it down; external rounds are
      // never teach-gated (guided is off) and it would sit on top of the round.
      var teachOv = document.getElementById('teachOv');
      if (teachOv && teachOv.parentNode) teachOv.parentNode.removeChild(teachOv);
      // The EMBEDDING page owns progression + round lifecycle: hide the controls
      // that would let the student swap the round out from under the external
      // target (path/level pickers) or change grading semantics mid-round
      // (fix-it toggle re-enables correction mode → non-terminal submits), and
      // the in-iframe theme switcher (the parent page already has one).
      if (!document.getElementById('extChromeCss')) {
        var st = document.createElement('style');
        st.id = 'extChromeCss';
        st.textContent = '.solo-modesel,.solo-levelsel,.solo-actions .solo-cfg,#themeSwitcher{display:none !important}';
        document.head.appendChild(st);
      }
      // The host page (tapping.html) titles itself "Tapping — Perform the Rhythm";
      // inside MelodyQuest this round is DICTATION — retitle so the embedded game
      // doesn't announce a different task than the one the student is doing.
      var extH1 = document.querySelector('.header h1, h1');
      if (extH1) extH1.textContent = 'Rhythm dictation';
      newRound();
    });
    // Announce readiness once the game is genuinely booted (engine + first round).
    var extPoll = setInterval(function () {
      if (!rs || !S.target) return;
      clearInterval(extPoll);
      S.guided = false;
      S.correctionMode = false;
      try { window.parent.postMessage({ type: 'melodic-ext-ready' }, '*'); } catch (e) {}
    }, 120);
  }
  // Test seam — ONLY active with ?tbtest=1 in the URL. Exposes the tap-back internals
  // so the timing pipeline (single metronome clock, exact lock-count, onset alignment)
  // can be driven and asserted deterministically by automated traces. Zero effect in
  // production: nothing reads window.__tbTest unless the flag is set.
  if (/[?&]tbtest=1/.test(location.search)) {
    window.__tbTest = {
      TB: TB, S: S,
      bpm: bpm, totalBeats: totalBeats, ctx: ctx,
      openTapBack: openTapBack, closeTapBack: closeTapBack,
      onStartMetro: onStartMetro, onBeatTap: onBeatTap, onRhythmTap: onRhythmTap,
      scoreTapBack: scoreTapBack, targetOnsets: targetOnsets,
      lockIn: lockIn, scheduleCountoff: scheduleCountoff,
      beatByIdx: beatByIdx, beatTimeByIdx: beatTimeByIdx,
      enterReady: enterReady, newRound: newRound, playTarget: playTarget,
      fillCorrect: revealCorrect, submit: submit, setMeasures: function (n) { S.measures = n; save(); newRound(); },
      tapLatency: function () { return TAP_LATENCY; },
      tapTolerance: function () { return TAP_TOLERANCE; },
      showResults: showResults
    };
  }
  // Guided-spine test seam — ONLY active with ?levtest=1. Exposes the guided internals
  // so the ladder progression + capstone gate + mastery meter can be driven and asserted
  // deterministically (no audio/timing needed). Zero effect in production.
  if (/[?&]levtest=1/.test(location.search)) {
    window.__levTest = {
      S: S, GUIDE: GUIDE,
      newRound: newRound, fillCorrect: revealCorrect, submit: submit,
      guidedRecord: guidedRecord, render: render, fillLevelOptions: fillLevelOptions,
      masteryView: function () { return GUIDE.masteryView(); },
      PLACE: PLACE, GUIDEplace: function (i, mb) { return GUIDE.place(i, mb); },
      // Force the within-level ramp to the capstone bar count, regenerate at that size,
      // and place the exact correct answer — so submit() can pass the capstone gate
      // without a human notating 8 bars. Returns the new measure count.
      forceCapstoneRound: function () {
        S.ramp = 8; S.measures = 8; newRound();
        // dictation: place the exact target so checkAnswer() is allCorrect.
        if (S.mode !== 'tapping') revealCorrect();
        return S.measures;
      },
      // TAPPING capstone: build an 8-bar perform round, then feed showResults a
      // synthetic ALL-BARS-CLEAN result (the timing pipeline itself is covered by the
      // tbtest seam). Exercises the SAME guided gate the real perform path uses.
      tappingCapstonePass: function () {
        S.ramp = 8; S.measures = 8; newRound();   // newTappingRound -> reveals + openTapBack(inline)
        var nMeas = S.measures;
        var measures = [];
        for (var m = 0; m < nMeas; m++) measures.push({ m: m + 1, pass: true, rhythmSlip: false, beatSlip: false, onsets: 0, hits: 0, extra: 0, beatsOk: 0, beats: 0, beatBeats: 0, beatHits: 0 });
        showResults({ measures: measures, accuracy: 100, passed: nMeas, total: nMeas, beatsOk: 0, totalBeatsScored: 0, bonus: 0 });
        return nMeas;
      }
    };
  }
})();
