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
    level: 1,                                  // tier number within the family, or 'all'
    ts: '4/4', family: 'quarter',              // selected meter -> beat-unit family
    meter: 'simple', beatsPerMeasure: 4, speed: 'medium',
    changing: false, changePool: null, curMeters: null,  // changing-meter mode
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
    try { localStorage.setItem('beatquest-solo', JSON.stringify({ score: S.score, streak: S.streak, correctionMode: S.correctionMode, metronome: S.metronome, beatGuide: S.beatGuide, level: S.level, ts: S.ts, speed: S.speed, measures: S.measures, changing: S.changing, changeKind: S.changeKind })); } catch (e) {}
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
    return ids ? base.filter(function (p) { return ids.indexOf(p.id) !== -1; }) : base;
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
        // Hold the same meter ~40% of the time (so it changes less often than
        // every measure, closer to how Hall paces it). Measure numbers keep the
        // count clear when a meter spans 2-3 bars.
        if (prev && Math.random() < 0.4) { S.curMeters.push(prev); continue; }
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

  function playTarget() {
    if (!S.target) return;
    var c = ctx(); if (!c) { msg('Tap a button to enable sound.'); return; }
    stopPulse();
    var beatDur = 60 / S.tempo;
    var t0 = c.currentTime + 0.2;          // count-in start
    var t = t0 + (mBeats()[0] || bpm()) * beatDur;   // rhythm starts after one measure of count-in
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
    stopPulse();
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
  window.BeatQuestSolo = { start: start, state: S };
})();
