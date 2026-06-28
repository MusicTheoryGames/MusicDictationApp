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
    groove: 100, score: 0, streak: 0, bonus: 0,
    correctionMode: true, metronome: false, beatGuide: false,
    level: 1,                                  // tier number within the family, or 'all'
    ts: '4/4', family: 'quarter',              // selected meter -> beat-unit family
    meter: 'simple', beatsPerMeasure: 4, speed: 'medium',
    changing: false, changePool: null, curMeters: null,  // changing-meter mode
    hintsThisRound: 0, wrongThisRound: false, solved: false
  };
  var GROOVE_PER_WRONG = 12, GROOVE_HINT_MISTAKES = 8, GROOVE_HINT_COUNT = 5, GROOVE_HINT_NARROW = 10, GROOVE_HINT_PLAY = 6, GROOVE_GAIN_CLEAN = 15;
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
    if (S.level === 'all') return null;                       // every figure in the family
    var steps = curFamily().steps, acc = [], i;
    for (i = 0; i < S.level && i < steps.length; i++) acc = acc.concat(steps[i]);
    return acc;
  }

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
    eye:   '<svg viewBox="0 0 20 20" class="ic"><path d="M1.5 10S5 4.5 10 4.5 18.5 10 18.5 10 15 15.5 10 15.5 1.5 10 1.5 10z"/><circle cx="10" cy="10" r="2.4"/></svg>',
    check: '<svg viewBox="0 0 20 20" class="ic"><path d="M4 10.5l4 4 8-9"/></svg>',
    next:  '<svg viewBox="0 0 20 20" class="ic ic-fill"><path d="M5 4l8 6-8 6z"/><path d="M14.5 4v12" class="ic-stroke"/></svg>',
    flame: '<svg viewBox="0 0 20 20" class="ic ic-fill ic-sm"><path d="M10 2c1.1 3 4 4.2 4 8a4 4 0 11-8 0c0-2.2 1.1-3.2 2-4.2.2 1.2 1 2 2 2.2.3-2.4-2-3.6-2-8z"/></svg>',
    gear:  '<svg viewBox="0 0 20 20" class="ic"><circle cx="10" cy="10" r="2.6"/><path d="M10 2.5v2.2M10 15.3v2.2M2.5 10h2.2M15.3 10h2.2M4.8 4.8l1.6 1.6M13.6 13.6l1.6 1.6M15.2 4.8l-1.6 1.6M6.4 13.6l-1.6 1.6"/></svg>',
    bulb:  '<svg viewBox="0 0 20 20" class="ic"><path d="M7 13.5a5 5 0 1 1 6 0c-.7.5-1 1.2-1 2H8c0-.8-.3-1.5-1-2z"/><path d="M8 17.5h4"/></svg>',
    palette: '<svg viewBox="0 0 20 20" class="ic"><path d="M10 2.6a7.4 7.4 0 1 0 0 14.8c1.3 0 1.7-1.6.8-2.5-.7-.7-.2-1.8.8-1.8H14a3.4 3.4 0 0 0 3.4-3.5C17.4 5.6 14.1 2.6 10 2.6z"/><circle cx="6.6" cy="9.2" r="1"/><circle cx="9" cy="6.2" r="1"/><circle cx="12.8" cy="7.4" r="1"/></svg>',
    // hand/finger tapping a surface — the "Tap it back" performance mode
    tap:   '<svg viewBox="0 0 20 20" class="ic"><path d="M9 9V4.4a1.3 1.3 0 0 1 2.6 0V9"/><path d="M11.6 9V7.6a1.2 1.2 0 0 1 2.4 0V9"/><path d="M14 9V8a1.2 1.2 0 0 1 2.4 0v3.2a4.6 4.6 0 0 1-4.6 4.6h-1.2a4 4 0 0 1-3-1.4l-2.3-2.7a1.3 1.3 0 0 1 1.9-1.7L9 11.4V9"/></svg>',
    close: '<svg viewBox="0 0 20 20" class="ic"><path d="M5 5l10 10M15 5L5 15"/></svg>',
    redo:  '<svg viewBox="0 0 20 20" class="ic"><path d="M15 6a6 6 0 1 0 1.5 4"/><path d="M16 3v3.5h-3.5"/></svg>'
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
    try { localStorage.setItem('beatquest-solo', JSON.stringify({ score: S.score, streak: S.streak, bonus: S.bonus, correctionMode: S.correctionMode, metronome: S.metronome, beatGuide: S.beatGuide, level: S.level, ts: S.ts, speed: S.speed, measures: S.measures, changing: S.changing, changeKind: S.changeKind })); } catch (e) {}
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
    if (!ga || !bank) return;
    if (!mobile) { ga.style.paddingBottom = ''; return; }
    // Reserve everything from the (floating) bank's top down to the viewport bottom,
    // so the last staff row clears the bank AND its bottom gap.
    var top = bank.getBoundingClientRect().top;
    ga.style.paddingBottom = Math.max(0, Math.round(window.innerHeight - top + 8)) + 'px';
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
  // Full stop: the count-in/metronome scheduler AND all scheduled sound.
  function stopPlayback() {
    stopPulse(); stopAllAudio();
    S.playing = false;
    if (S._playTimer) { clearTimeout(S._playTimer); S._playTimer = null; }
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
        if (countIn || S.metronome) {
          // count-in: every beat loud; example metronome: accent measure starts
          metroTick(pulse.nextTime, countIn || atMeasureStart);
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
          if (nn.duration.indexOf('r') === -1) onsets.push({ beat: beat, mi: mi });
          beat += raw[i] * scale;
        });
      });
    });
    return onsets;
  }

  function playTarget() {
    if (!S.target) return;
    var c = ctx(); if (!c) { msg('Tap a button to enable sound.'); return; }
    if (S.playing) { msg('Already playing — let it finish.'); return; }  // no overlapping playback
    stopPlayback();                         // clean slate (cancels any leftover sound)
    S.playing = true;
    // (No play-start scroll — it yanked the view back to the staff top and pulled
    // the hidden controls into frame. The view stays where the student left it; the
    // downward-only autoscroll follows the beat if the page overflows.)
    var beatDur = 60 / S.tempo;
    var t0 = c.currentTime + 0.2;          // count-in start
    var rhythmStart = t0 + (mBeats()[0] || bpm()) * beatDur;   // rhythm starts after one measure of count-in
    var onsets = targetOnsets();
    onsets.forEach(function (o) { rhythmHit(rhythmStart + o.beat * beatDur); });
    // playback runs through the full example (one onset-walk pass == totalBeats()).
    var t = rhythmStart + totalBeats() * beatDur;
    startPulse(t0);   // count-in always ticks; metronome/guide continue per toggles
    // playback ends at `t`; allow Play again after that
    S._playTimer = setTimeout(function () { S.playing = false; }, Math.max(0, (t - c.currentTime + 0.3) * 1000));
    msg('Count-in… then the rhythm' + (S.metronome ? ' · metronome on' : '') + (S.beatGuide ? ' · beat guide on' : '') + '. Build your answer.');
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
    timer: null, nextBeat: 0, beatIdx: 0, beatTimes: [],  // scheduled metronome beat times (audio clock)
    metroOn: false,                 // has the player pressed "Start metronome"?
    lockStreak: 0, lastBeatTapIdx: -1,  // consecutive on-beat taps + the beat index of the last counted tap
    captureStart: 0, captureEnd: 0,
    beatTaps: [], rhythmTaps: [],   // captured tap times (audio clock)
    cells: [], el: null             // cloned per-beat highlight cells (absolute-beat ordered)
  };
  var TB_BONUS_PER_MEASURE = 25;    // bonus points per passed measure (added to S.bonus)
  var TB_BONUS_HINT = '+' + TB_BONUS_PER_MEASURE + '/bar';   // advertised on the entry button badge

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
        // Big on-screen count-off overlay (hidden until lock-in).
        '<div class="tb-countoff" id="tbCountoff" aria-hidden="true"></div>' +
        // Metronome setup row: Start button + the app's tempo control (bound to S.tempo).
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
          '<button class="tb-zone tb-rhythm" id="tbRhythm"><span class="tb-zlabel">Rhythm</span><span class="tb-zhint">right hand</span></button>' +
        '</div>' +
        '<div class="tb-results" id="tbResults" style="display:none"></div>' +
      '</div>';
    document.body.appendChild(ov);
    TB.el = ov;
    document.getElementById('tbClose').onclick = closeTapBack;
    document.getElementById('tbStart').onclick = onStartMetro;
    // Tempo stepper: reuses S.tempo (the app's speed control state). Changing it
    // LIVE re-rates the running click without resetting the scheduler.
    document.getElementById('tbTempoDown').onclick = function () { nudgeTempo(-4); };
    document.getElementById('tbTempoUp').onclick = function () { nudgeTempo(4); };
    // Both pointer (desktop/dev) AND touch (mobile) — touchstart fires first on
    // touch devices, so preventDefault stops the synthetic click/pointer double-fire.
    function bindZone(id, fn) {
      var z = document.getElementById(id);
      var handler = function (e) { if (e.cancelable) e.preventDefault(); fn(); flashZone(z); };
      z.addEventListener('touchstart', handler, { passive: false });
      z.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') return; handler(e); });
    }
    bindZone('tbBeat', onBeatTap);
    bindZone('tbRhythm', onRhythmTap);
    return ov;
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
      if (z) { z.classList.add('solo-beat-on'); tbLastHl = z; }
      else tbLastHl = null;
    }, Math.max(0, (when - c.currentTime) * 1000));
  }
  function tbClearBeat() { if (tbLastHl) { tbLastHl.classList.remove('solo-beat-on'); tbLastHl = null; } }

  // Dedicated lookahead metronome for tap-back. Starts ONLY when the player presses
  // "Start metronome" (TB.metroOn). Records each beat's scheduled time in TB.beatTimes
  // (the ground-truth grid taps and the highlight are anchored to) and clicks (accent
  // on downbeats). The beat-guide highlight is NOT driven here — it runs only during
  // the count-off + capture, anchored to TB.captureStart (see scheduleCountoff).
  function tbStartMetro() {
    var c = ctx(); if (!c) return;
    if (TB.timer) { clearTimeout(TB.timer); TB.timer = null; }   // clear any prior loop (keep metroOn)
    TB.metroOn = true;
    TB.beatTimes = [];
    TB.nextBeat = c.currentTime + 0.25;   // small lead-in
    TB.beatIdx = 0;
    (function sched() {
      if (!TB.open || !TB.metroOn) return;
      var cc = ctx(); if (!cc) return;
      while (TB.nextBeat < cc.currentTime + 0.15) {
        var idx = TB.beatIdx;
        // accent the start of every metronome measure (bpm() beats per measure)
        var accent = (idx % bpm()) === 0;
        metroTick(TB.nextBeat, accent);
        // compound meters: soft eighth-pulse subdivisions, like the main metronome
        if (isCompoundTs(S.ts)) { var bd = 60 / S.tempo; subTick(TB.nextBeat + bd / 3); subTick(TB.nextBeat + 2 * bd / 3); }
        TB.beatTimes.push({ t: TB.nextBeat, idx: idx, accent: accent });
        pulseBeatDot(TB.nextBeat);
        TB.beatIdx++; TB.nextBeat += 60 / S.tempo;   // tempo read live each beat
      }
      TB.timer = setTimeout(sched, 25);
    })();
  }
  function tbStopMetro() { TB.metroOn = false; if (TB.timer) { clearTimeout(TB.timer); TB.timer = null; } }
  // Visual pulse on the Beat zone in time with the click (purely cosmetic cue).
  function pulseBeatDot(when) {
    var c = ctx(); if (!c) return;
    setTimeout(function () {
      if (!TB.open) return;
      var z = document.getElementById('tbBeat'); if (!z) return;
      z.classList.add('tb-pulse'); setTimeout(function () { z.classList.remove('tb-pulse'); }, 90);
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

  function openTapBack() {
    if (!S.solved || !S.target) return;   // gated strictly behind a correct answer
    var c = ctx(); if (!c) { msg('Tap a button to enable sound first.'); return; }
    unlockAudio();
    stopPlayback();                        // silence any example playback first
    buildTapBackOverlay();
    TB.open = true;
    document.body.classList.add('tapback-open');
    TB.el.classList.add('show');
    var meta = document.getElementById('tbMeta');
    if (meta) meta.textContent = (S.changing ? 'changing meter' : S.ts) + ' · ' + S.measures + ' bar' + (S.measures === 1 ? '' : 's') + ' · ' + S.tempo + ' bpm';
    document.getElementById('tbResults').style.display = 'none';
    document.getElementById('tbZones').style.display = '';
    document.getElementById('tbStaff').style.display = '';
    document.getElementById('tbSetup').style.display = '';
    var tv = document.getElementById('tbTempoVal'); if (tv) tv.textContent = S.tempo;
    buildTapBackStaff();                       // clone the answer staff (read-only)
    enterReady();
  }
  function closeTapBack() {
    TB.open = false; TB.phase = 'idle';
    tbStopMetro(); stopAllAudio(); tbClearBeat();
    clearTbTimers();
    if (TB.el) TB.el.classList.remove('show');
    document.body.classList.remove('tapback-open');
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
    TB.captureStart = 0; TB.captureEnd = 0; TB.beatTaps = []; TB.rhythmTaps = [];
    tbStopMetro(); tbClearBeat(); clearTbTimers();
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
    var now = c.currentTime;
    if (TB.phase === 'metro') {
      var nb = nearestBeat(now);
      // Only count a given metronome beat ONCE (consecutive distinct on-beat taps).
      if (nb && nb.absDelta <= TAP_TOLERANCE && nb.beat.idx !== TB.lastBeatTapIdx) {
        TB.lockStreak++; TB.lastBeatTapIdx = nb.beat.idx;
        updateLockHint();
        tbMsg('On the beat — ' + TB.lockStreak + ' / ' + bpm());
        if (TB.lockStreak >= bpm()) lockIn();
      } else {
        // strict gate: an off-beat tap resets the streak
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
    if (TB.phase === 'capture') TB.rhythmTaps.push(c.currentTime);
    // ignored before capture (rhythm hand idle until the count-off ends)
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

  /* Count-off + capture, ALL anchored to scheduled metronome click times (ctx()
     clock). We find the next downbeat strictly in the future, then map one measure
     of clicks (bpm() beats) onto big on-screen numbers; the click AFTER that measure
     is the capture downbeat. From there the highlight indexes TB.cells by the
     beat number computed from the clock, so it tracks smoothly bar-to-bar. */
  function scheduleCountoff() {
    var c = ctx(); if (!c) return;
    var beatDur = 60 / S.tempo;
    // collect upcoming scheduled beats; ensure enough are scheduled to cover the
    // count-off measure + first capture downbeat.
    var future = TB.beatTimes.filter(function (b) { return b.t > c.currentTime + 0.06; });
    // find the first DOWNBEAT (accent) in the future to anchor the count-off start.
    var firstDown = null, fi = 0;
    for (fi = 0; fi < future.length; fi++) { if (future[fi].accent) { firstDown = future[fi]; break; } }
    var countBeats = bpm();   // one measure of count-off
    var coStart;
    if (firstDown) coStart = firstDown.t;
    else coStart = (future[0] ? future[0].t : c.currentTime + 0.25);
    // count-off numbers fall on coStart + k*beatDur for k in [0, countBeats)
    TB._countTimers = [];
    var co = document.getElementById('tbCountoff');
    if (co) { co.textContent = ''; co.classList.add('show'); }
    for (var k = 0; k < countBeats; k++) {
      (function (k) {
        var when = coStart + k * beatDur;
        TB._countTimers.push(setTimeout(function () {
          if (!TB.open || TB.phase !== 'countoff') return;
          if (co) { co.textContent = String(k + 1); co.classList.remove('tb-pop'); void co.offsetWidth; co.classList.add('tb-pop'); }
        }, Math.max(0, (when - c.currentTime) * 1000)));
      })(k);
    }
    // capture begins on the downbeat AFTER the count-off measure.
    var captureStart = coStart + countBeats * beatDur;
    TB.captureStart = captureStart;
    TB.captureEnd = captureStart + totalBeats() * beatDur;
    // "GO" flash on the capture downbeat.
    TB._countTimers.push(setTimeout(function () {
      if (!TB.open) return;
      if (co) { co.textContent = 'GO'; co.classList.remove('tb-pop'); void co.offsetWidth; co.classList.add('tb-pop'); }
      setTimeout(function () { if (co) co.classList.remove('show'); }, 520);
    }, Math.max(0, (captureStart - c.currentTime) * 1000)));
    beginCapture(captureStart);
  }

  /* Capture starts at the explicit moment `captureStart` (the count-off's final
     downbeat) — so the app unambiguously knows when rhythm-tapping begins. The
     beat-guide highlight is scheduled per-beat from this clock anchor: beat j lights
     at captureStart + j*beatDur on cell TB.cells[j]. Deterministic; no jumping. */
  function beginCapture(captureStart) {
    var c = ctx(); if (!c) return;
    var beatDur = 60 / S.tempo, total = totalBeats();
    // schedule the moving highlight, anchored to real click times
    for (var j = 0; j < total; j++) tbLightBeat(j, captureStart + j * beatDur);
    // flip to capture phase exactly at the downbeat
    TB._goTimer = setTimeout(function () {
      if (!TB.open) return;
      TB.phase = 'capture';
      tbMsg('Go! Tap the RHYTHM (right), keep the BEAT (left).');
      var z = document.getElementById('tbZones'); if (z) { z.classList.add('tb-go'); setTimeout(function () { z.classList.remove('tb-go'); }, 600); }
    }, Math.max(0, (captureStart - c.currentTime) * 1000));
    // stop capture one beat after the last beat of the pass, then score
    TB._endTimer = setTimeout(function () {
      if (!TB.open) return;
      finishCapture();
    }, Math.max(0, (TB.captureEnd + beatDur - c.currentTime) * 1000));
  }

  function finishCapture() {
    TB.phase = 'done';
    tbStopMetro();
    var res = scoreTapBack();
    showResults(res);
  }

  /* Score the captured taps against the metronome grid + target onsets.
     - Rhythm hand: each target onset claims the nearest unused rhythm tap within
       tolerance (hit); unclaimed onsets are misses; leftover rhythm taps are extra.
     - Beat hand: each metronome beat inside the capture window claims the nearest
       unused beat tap within tolerance (steady) — measures the second hand.
     - A measure PASSES iff all its onsets hit, it had no extra rhythm taps, and the
       beat hand stayed steady across its beats. */
  function scoreTapBack() {
    var beatDur = 60 / S.tempo;
    var onsets = targetOnsets();                 // [{beat, mi}] from the shared walk
    var mb = mBeats(), nMeas = mb.length;
    // ---- rhythm hand ----
    var taps = TB.rhythmTaps.slice().sort(function (a, b) { return a - b; });
    var used = taps.map(function () { return false; });
    var perMeas = [];
    for (var m = 0; m < nMeas; m++) perMeas[m] = { onsets: 0, hits: 0, extra: 0, beatBeats: 0, beatHits: 0 };
    onsets.forEach(function (o) {
      var want = TB.captureStart + o.beat * beatDur;
      perMeas[o.mi].onsets++;
      var bi = -1, bd = Infinity;
      for (var i = 0; i < taps.length; i++) {
        if (used[i]) continue;
        var d = Math.abs(taps[i] - want);
        if (d < bd) { bd = d; bi = i; }
      }
      if (bi !== -1 && bd <= TAP_TOLERANCE) { used[bi] = true; perMeas[o.mi].hits++; }
    });
    // leftover rhythm taps inside the capture window = extras, attributed to their measure
    var extraTotal = 0;
    for (var i = 0; i < taps.length; i++) {
      if (used[i]) continue;
      if (taps[i] < TB.captureStart - TAP_TOLERANCE || taps[i] > TB.captureEnd + TAP_TOLERANCE) continue;
      var rel = (taps[i] - TB.captureStart) / beatDur;          // beats into the pass
      var mi = measureOfAbs(Math.max(0, Math.min(totalBeats() - 0.0001, rel))).m - 1;
      perMeas[mi].extra++; extraTotal++;
    }
    // ---- beat hand ----
    var btaps = TB.beatTaps.slice().sort(function (a, b) { return a - b; });
    var bused = btaps.map(function () { return false; });
    // metronome beats that fall within the capture window, tagged by measure
    TB.beatTimes.forEach(function (bt) {
      if (bt.t < TB.captureStart - 0.001 || bt.t >= TB.captureEnd - 0.001) return;
      var rel = (bt.t - TB.captureStart) / beatDur;
      var mi = measureOfAbs(Math.max(0, Math.min(totalBeats() - 0.0001, rel))).m - 1;
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
    var totalOnsets = 0, totalHits = 0, passed = 0, measures = [];
    for (var mm = 0; mm < nMeas; mm++) {
      var p = perMeas[mm];
      totalOnsets += p.onsets; totalHits += p.hits;
      var rhythmOk = (p.hits === p.onsets) && p.extra === 0;
      // steady = at least all but one beat tracked (forgiving — one slip allowed)
      var beatOk = p.beatBeats === 0 ? true : (p.beatHits >= p.beatBeats - 1);
      var pass = rhythmOk && beatOk;
      if (pass) passed++;
      measures.push({
        m: mm + 1, pass: pass,
        rhythmSlip: !rhythmOk, beatSlip: !beatOk,
        onsets: p.onsets, hits: p.hits, extra: p.extra,
        beatBeats: p.beatBeats, beatHits: p.beatHits
      });
    }
    var accuracy = totalOnsets ? Math.round((totalHits / totalOnsets) * 100) : 100;
    // bonus rewards passed measures (clean rhythm + steady beat), not raw accuracy,
    // so partial credit can't be farmed by mashing taps.
    var bonus = passed * TB_BONUS_PER_MEASURE;
    return { measures: measures, accuracy: accuracy, passed: passed, total: nMeas, extra: extraTotal, bonus: bonus };
  }

  function showResults(res) {
    document.getElementById('tbZones').style.display = 'none';
    S.bonus += res.bonus; S.score += res.bonus;     // bonus folds into the running score too
    save(); render();
    var rows = res.measures.map(function (m) {
      var status = m.pass ? 'pass' : 'fail';
      var note = m.pass ? 'clean' :
        [m.rhythmSlip ? (m.hits + '/' + m.onsets + ' rhythm' + (m.extra ? ' · +' + m.extra + ' extra' : '')) : '',
         m.beatSlip ? 'beat unsteady' : ''].filter(Boolean).join(' · ');
      return '<div class="tb-mrow tb-' + status + '"><span class="tb-mlabel">Bar ' + m.m + '</span>' +
        '<span class="tb-mstat">' + (m.pass ? IC.check + 'pass' : IC.close + 'fix') + '</span>' +
        '<span class="tb-mnote">' + note + '</span></div>';
    }).join('');
    var el = document.getElementById('tbResults');
    el.innerHTML =
      '<div class="tb-score">' +
        '<div class="tb-acc"><b>' + res.accuracy + '%</b><span>accuracy</span></div>' +
        '<div class="tb-acc"><b>' + res.passed + '/' + res.total + '</b><span>bars clean</span></div>' +
        '<div class="tb-acc tb-bonus"><b>+' + res.bonus + '</b><span>bonus</span></div>' +
      '</div>' +
      '<div class="tb-mlist">' + rows + '</div>' +
      '<div class="tb-rbtns solo-ctl">' +
        '<button class="hint" id="tbRetry">' + IC.redo + 'Try again</button>' +
        '<button class="go" id="tbDone">' + IC.check + 'Done</button>' +
      '</div>';
    el.style.display = '';
    document.getElementById('tbDone').onclick = closeTapBack;
    document.getElementById('tbRetry').onclick = function () {
      document.getElementById('tbResults').style.display = 'none';
      document.getElementById('tbZones').style.display = '';
      document.getElementById('tbStaff').style.display = '';
      // Full reset back to 'ready' (metronome off): the player re-starts + re-locks.
      enterReady();
    };
  }
  function showTapBackBtn() {
    var b = document.getElementById('soloTapBack'); if (b) b.style.display = '';
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
    stopPlayback();                 // stop any playing rhythm before building a new one
    S.target = generateTarget();
    S.hintsThisRound = 0; S.wrongThisRound = false; S.solved = false;
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
    if (rs) rs.onAnswerChanged = updateSubmitBtn;   // re-evaluate Submit on each placement
    updateSubmitBtn();
    // No auto-play — the rhythm only sounds when the student presses Play.
    msg('Press ▶ Play rhythm to hear it.');
  }

  // On small screens, save space: only show Submit once every beat is filled.
  function updateSubmitBtn() {
    var btn = document.getElementById('soloSubmit'); if (!btn) return;
    var next = document.getElementById('soloNext');
    if (S.solved || (next && next.style.display !== 'none')) { btn.style.display = 'none'; return; }
    var mobile = false;
    try { mobile = window.matchMedia('(pointer: coarse) and (max-width: 1400px)').matches; } catch (e) {}
    btn.style.display = (mobile && rs && rs.isComplete && !rs.isComplete()) ? 'none' : '';
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
      showTapBackBtn();   // OPTIONAL bonus — only ever offered after a correct answer
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
    msg(S.pick === 'count' ? 'Tap a beat to count its sounds.' : S.pick === 'play' ? 'Tap a beat to hear just that beat.' : '');
  }
  function doCountBeat(m, b) {
    var n = beatSoundCount(m - 1, b - 1);
    S.hintsThisRound++; S.groove = Math.max(0, S.groove - GROOVE_HINT_COUNT);
    clearMarks(); markZone(m, b, 'solo-right');
    msg('Measure ' + m + ', beat ' + b + ': ' + n + ' sound' + (n === 1 ? '' : 's') + '.');
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
    S.hintsThisRound++; S.groove = Math.max(0, S.groove - GROOVE_HINT_PLAY);
    clearMarks(); markZone(m, b, 'solo-right');
    msg('Measure ' + m + ', beat ' + b + ' — ' + sounds + ' sound' + (sounds === 1 ? '' : 's') + '.');
    if (S.groove <= 0) grooveBroken();
    save(); render();
  }
  // Reflect the narrow state on its button (label + pressed look).
  function setNarrowBtn() {
    var btn = document.getElementById('soloHintNarrow'); if (!btn) return;
    btn.classList.toggle('on', !!S.narrowed);
    btn.innerHTML = IC.filter + (S.narrowed ? 'Show all' : 'Narrow options');
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
    if (!S.narrowCharged) { S.hintsThisRound++; S.groove = Math.max(0, S.groove - GROOVE_HINT_NARROW); S.narrowCharged = true; }
    msg('Showing only the ' + Object.keys(used).length + ' figure(s) in this example.');
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
    var bn = document.getElementById('soloBonus'); if (bn) bn.textContent = S.bonus;
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
      '.solo-ctl button.hint.on{background:rgba(255,255,255,.22);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4)}' +
      '#soloHud .solo-toggle{display:flex;align-items:center;gap:6px;font-size:.8rem;opacity:.85;margin-left:auto;cursor:pointer}' +
      '#soloHud #soloMsg{margin-top:10px;font-size:.95rem;min-height:1.3em;font-weight:600}' +
      '.beat-drop-zone.solo-wrong{outline:2px solid #ff5a4d;outline-offset:-2px;background:rgba(255,90,77,.13)!important}' +
      '.beat-drop-zone.solo-right{background:rgba(25,224,122,.16)!important}' +
      '.beat-drop-zone.solo-beat-on{background:rgba(33,150,243,.22)!important;box-shadow:inset 0 0 0 2px rgba(33,150,243,.7)}' +
      // Tap-it-back entry button (sits in the actions bar next to Submit/Next).
      // Per-theme color comes from suite-theme.css; this is the neutral default.
      '#soloTapBack{display:inline-flex;align-items:center;justify-content:center;font-family:inherit;font-weight:700;font-size:.85rem;border:none;border-radius:10px;padding:11px 16px;min-height:42px;cursor:pointer;background:#7c5cff;color:#fff;transition:.12s}' +
      '#soloTapBack{position:relative}' +
      '#soloTapBack:hover{transform:translateY(-1px);filter:brightness(1.08)}' +
      '#soloTapBack:active{transform:translateY(2px)}' +
      // "+ bonus" badge advertising the extra points (value from TB_BONUS_HINT)
      '#soloTapBack .tb-badge{margin-left:8px;font-size:.66rem;font-weight:800;letter-spacing:.04em;background:rgba(255,255,255,.22);color:#fff;border-radius:999px;padding:2px 7px;line-height:1.3}' +
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
      '.tb-mlist{display:flex;flex-direction:column;gap:6px}' +
      '.tb-mrow{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;background:rgba(255,255,255,.05);font-size:.85rem}' +
      '.tb-mrow.tb-pass{box-shadow:inset 0 0 0 1px rgba(25,224,122,.5)}' +
      '.tb-mrow.tb-fail{box-shadow:inset 0 0 0 2px rgba(255,90,77,.7);background:rgba(255,90,77,.1)}' +
      '.tb-mlabel{font-weight:700;min-width:54px}' +
      '.tb-mstat{display:inline-flex;align-items:center;gap:4px;font-weight:700;min-width:64px}' +
      '.tb-mstat .ic{margin:0;width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
      '.tb-pass .tb-mstat{color:#19e07a}.tb-fail .tb-mstat{color:#ff7a6e}' +
      '.tb-mnote{opacity:.7;font-size:.78rem;flex:1}' +
      '.tb-rbtns{display:flex;gap:12px;justify-content:center;margin-top:6px}' +
      '.tb-rbtns button{display:inline-flex;align-items:center;justify-content:center;font-family:inherit;font-weight:700;font-size:.9rem;border:none;border-radius:10px;padding:12px 20px;min-height:46px;cursor:pointer;background:rgba(255,255,255,.1);color:#fff}' +
      '.tb-rbtns button .ic{margin-right:7px;width:1.05em;height:1.05em;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}' +
      '.tb-rbtns button.go{background:var(--tb-accent,#7c5cff);color:#fff}' +
      // landscape phones: keep zones big & side-by-side, shrink chrome
      '@media (orientation:landscape) and (max-height:560px){.tb-instruct{min-height:1.8em;font-size:.9rem}.tb-title{font-size:1.05rem}.tb-zone .tb-zlabel{font-size:1.3rem}}';
    document.head.appendChild(st);
  }

  // Populate the LEVEL dropdown with the CURRENT family's tiers + "all figures".
  function fillLevelOptions() {
    var fam = curFamily(), sel = document.getElementById('soloLevel'); if (!sel) return;
    var html = '', t;
    for (t = 1; t <= fam.steps.length; t++) html += '<option value="' + t + '">Lvl ' + t + ' · ' + (fam.labels[t] || ('Tier ' + t)) + '</option>';
    html += '<option value="all">' + (fam.classic || 'All figures') + '</option>';
    sel.innerHTML = html;
    sel.value = (S.level === 'all') ? 'all' : String(S.level);
  }

  function buildHud() {
    if (document.getElementById('soloHud')) return;
    injectStyle();
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
        '<div class="solo-stat"><span>METER</span><select id="soloMeter">' + meterOpts + '</select></div>' +
        '<div class="solo-stat"><span>LEVEL</span><select id="soloLevel"></select></div>' +
        '<div class="solo-stat"><span>BARS</span><select id="soloBars"><option value="2">2</option><option value="4">4</option><option value="8">8</option><option value="16">16</option></select></div>' +
        '<div class="solo-stat"><span>SCORE</span><b id="soloScore">0</b></div>' +
        '<div class="solo-stat"><span>STREAK</span><b id="soloStreak">0</b>' + IC.flame + '</div>' +
        '<div class="solo-stat"><span>BONUS</span><b id="soloBonus">0</b></div>' +
      '</div>' +
      '<div class="solo-actions">' +
        '<button id="soloPlay" class="primary play">' + IC.play + 'Play rhythm</button>' +
        // Everyday controls live IN the bar next to Play (on desktop too):
        '<div class="solo-stat bar-item"><span>SPEED</span><select id="soloSpeed"><option value="slow">Slow</option><option value="medium">Medium</option><option value="fast">Fast</option></select></div>' +
        '<button id="soloMetro" class="toggle">' + IC.metro + 'Metronome</button>' +
        '<button id="soloGuide" class="toggle">' + IC.guide + 'Beat guide</button>' +
        '<button id="soloHintsToggle" class="toggle focus-only">' + IC.bulb + 'Hints</button>' +
        '<button id="soloSettingsToggle" class="toggle focus-only">' + IC.gear + 'Settings</button>' +
        '<div class="solo-stat groove bar-item"><span>GROOVE</span><div class="solo-bar"><i id="soloGrooveFill"></i></div><b id="soloGroovePct">100%</b></div>' +
        '<button id="soloThemeToggle" class="toggle focus-only icon-only" title="Theme" aria-label="Theme">' + IC.palette + '</button>' +
        '<span class="solo-hints"><span class="hints-label">HINTS</span>' +
          '<button id="soloHintNarrow" class="hint">' + IC.filter + 'Narrow options</button>' +
          '<button id="soloHearBeat" class="hint">' + IC.hear + 'Hear a beat</button>' +
          '<button id="soloHintCount" class="hint">' + IC.count + 'Count sounds</button>' +
          '<button id="soloHintBeats" class="hint">' + IC.search + 'Find mistakes</button>' +
          '<button id="soloReveal" class="hint">' + IC.eye + 'Show answer</button>' +
        '</span>' +
        '<label class="solo-toggle solo-cfg"><input type="checkbox" id="soloCorrect"> Fix-it mode</label>' +
      '</div>' +
      '<div id="soloMsg"></div>';
    var ga = document.getElementById('gameArea');
    var sb = ga ? ga.querySelector('.status-bar') : null;
    if (sb) sb.insertAdjacentElement('afterend', hud); else if (ga) ga.insertBefore(hud, ga.firstChild);

    // Submit / Next live in their own bar at the very bottom, under the bank.
    var actions = document.createElement('div'); actions.id = 'soloActions'; actions.className = 'solo-ctl';
    actions.innerHTML =
      '<button id="soloSubmit" class="primary go">' + IC.check + 'Submit answer</button>' +
      '<button id="soloTapBack" class="tapback" style="display:none">' + IC.tap + 'Tap it back<span class="tb-badge">' + TB_BONUS_HINT + '</span></button>' +
      '<button id="soloNext" class="go" style="display:none">' + IC.next + 'Next</button>';
    if (ga) ga.appendChild(actions);

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
    function togglePanel(cls, btn) {
      var on = !document.body.classList.contains(cls);
      document.body.classList.remove('settings-open', 'hints-open', 'theme-open');
      [stog, htog, ttog].forEach(function (x) { if (x) x.classList.remove('on'); });
      clearPanelPos();
      if (on) {
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
    // Click-outside-to-close: a tap anywhere that isn't an open panel or its toggle
    // closes the dropdowns. Capture phase so it runs before per-control handlers,
    // and we early-out when nothing is open so normal play is untouched.
    document.addEventListener('pointerdown', function (e) {
      if (!anyPanelOpen()) return;
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
    document.getElementById('soloTapBack').onclick = openTapBack;
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
    fillLevelOptions();                          // populate LEVEL for the current family
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
  // Public surface.
  window.BeatQuestSolo = {
    start: start, state: S
  };
})();
