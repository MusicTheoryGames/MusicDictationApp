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
    hintsThisRound: 0, wrongThisRound: false, solved: false,
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
    // GUIDED mode: the figure vocabulary comes from the ladder level (core/curriculum
    // Level.figures), NOT the free-play tier system. This is the one seam where the
    // guided spine overrides the figure pool; everything downstream (patternsFor,
    // filterBank) reads levelIds() so it flows through unchanged.
    if (S.guided && S.guidedFigures) return S.guidedFigures.slice();
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
    // Per-game persisted progress: ladder index, per-level mastery item state, the
    // set of mastered level ids, and the current session start (for the Mastered
    // spacing gate). Keyed by mode so dictation and tapping progress independently
    // while walking the SAME matched ladder.
    var data = null;               // { idx, items:{levelId:ItemState}, mastered:[], sessionStart }
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
          idx: data.idx, items: data.items, mastered: data.mastered
        }));
      } catch (e) {}
    }

    function curLevel() { return ladder()[data.idx]; }
    function levelCount() { return ladder().length; }
    function itemFor(levelId) {
      if (!data.items[levelId]) data.items[levelId] = core().mastery.createItemState();
      return data.items[levelId];
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
    // Returns { advanced, leveledUp, mastery } for the caller to surface.
    function recordRound(correct, clean, groovePct) {
      if (!avail()) return { advanced: false, leveledUp: false };
      var level = curLevel();
      var now = Date.now();
      var item = itemFor(level.id);
      // Mastery: a round counts "correct" for the meter when it was answered correctly.
      data.items[level.id] = core().mastery.recordAnswer(item, !!correct, { now: now, sessionStart: data.sessionStart });

      var leveledUp = false, advanced = false;
      // CAPSTONE GATE: pass the level with ONE clean capstone example —
      //   at the capstone bar count (8), answered correctly, at/above the groove
      //   threshold. 16 bars are a bonus (never required) so >=8 qualifies.
      var capstonePassed = correct && atCapstone() && S.measures >= CAPSTONE_BARS && groovePct >= GROOVE_PASS;
      if (capstonePassed) {
        if (data.mastered.indexOf(level.id) === -1) data.mastered.push(level.id);
        // Advance to the next PLAYABLE level (skip not-yet-built chapters but keep the
        // matched index so dictation/tapping stay on the same chapter sequence).
        var lad = ladder();
        var next = data.idx;
        for (var n = data.idx + 1; n < lad.length; n++) { next = n; if (playable(lad[n])) break; }
        if (next !== data.idx) { data.idx = next; S.guidedIdx = next; leveledUp = true; }
        advanced = true;
        applyLevel();   // re-point vocabulary/meter at the (new) current level, ramp->2
      } else if (clean && correct) {
        // Clean but not yet at capstone bars -> climb the 2->4->8 ramp.
        advanceRamp();
      }
      persist();
      return { advanced: advanced, leveledUp: leveledUp, capstonePassed: capstonePassed };
    }

    // SEAM (teach): show a teach/demo screen before a new level. window.TEACH_CONTENT
    // is authored by a separate agent; until then this is a no-op. Wire the overlay here.
    function maybeTeach() {
      if (!window.TEACH_CONTENT) return false;
      /* A sibling agent owns the teach overlay; the hook is intentionally empty. */
      return false;
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

    return {
      avail: avail, load: load, persist: persist,
      curLevel: curLevel, levelCount: levelCount, ladder: ladder,
      applyLevel: applyLevel, playable: playable,
      rampBars: rampBars, atCapstone: atCapstone,
      recordRound: recordRound, masteryView: masteryView, maybeTeach: maybeTeach,
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
      }
    };
  })();

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
        '<button class="tb-zone tb-rhythm" id="tbRhythm"><span class="tb-zlabel">Rhythm</span><span class="tb-zhint">right hand</span></button>' +
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
        pulseBeatDot(TB.nextBeat);
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
    tbStopMetro(); stopAllAudio(); tbClearBeat();
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
    if (TB.phase === 'capture') TB.rhythmTaps.push(tapTime());   // latency-corrected
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
      tbMsg('Go! Tap the RHYTHM (right), keep the BEAT (left).');
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
    exitPerformLayout();   // performance over -> restore the full rhythm view for review
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
    var el = document.getElementById('tbResults');
    el.innerHTML =
      '<div class="tb-score">' +
        '<div class="tb-acc"><b>' + res.accuracy + '%</b><span>accuracy</span></div>' +
        '<div class="tb-acc"><b>' + res.passed + '/' + res.total + '</b><span>bars clean</span></div>' +
        '<div class="tb-acc tb-bonus"><b>+' + res.bonus + '</b><span>bonus</span></div>' +
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
      '</div>';
    el.style.display = '';
    if (TB.inline) {
      document.getElementById('tbNextRound').onclick = newRound;   // fresh perform-ready round
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
    if (TB.open) closeTapBack();    // a new round tears down any open tap-back overlay + its metro
    stopPlayback();                 // stop any playing rhythm (and the tap-back metro) before building a new one
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
    if (S.mode === 'tapping') { newTappingRound(); return; }
    if (rs) rs.onAnswerChanged = updateSubmitBtn;   // re-evaluate Submit on each placement
    updateSubmitBtn();
    // No auto-play — the rhythm only sounds when the student presses Play.
    msg('Press ▶ Play rhythm to hear it.');
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
  function newTappingRound() {
    // Pre-fill the staff with the generated rhythm (same note glyphs as dictation).
    revealCorrect();
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
    syncBankPad();
    msg('Press Start metronome, then tap the BEAT (left) to lock in.');
  }

  // On small screens, save space: only show Submit once every beat is filled.
  function updateSubmitBtn() {
    var btn = document.getElementById('soloSubmit'); if (!btn) return;
    var next = document.getElementById('soloNext');
    if (S.solved || (next && next.style.display !== 'none')) { btn.style.display = 'none'; return; }
    var mobile = false;
    try { mobile = window.matchMedia('(pointer: coarse) and (max-width: 1400px)').matches; } catch (e) {}
    btn.style.display = (mobile && rs && rs.isComplete && !rs.isComplete()) ? 'none' : '';
    syncBankPad();   // the floating action row's height changed -> re-fit staff bottom pad + offset
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
      var baseMsg = clean ? 'Nailed it first try! +' + pts + '  ·  Groove +' + GROOVE_GAIN_CLEAN + '  ·  streak ×' + S.streak
                          : 'Correct! +' + pts;
      // GUIDED: record mastery + run the capstone/ramp gate. A fully-correct answer is
      // 100% beats correct (every beat matched), so the per-beat groove for THIS round
      // is 100; the gate also requires the capstone bar count (8). bonus points for the
      // 16-bar extra are handled by the existing scoring (more bars = more points).
      var adv = guidedRecord(true, clean, 100);
      msg(adv && adv.advText ? baseMsg + '  ·  ' + adv.advText : baseMsg);
      document.getElementById('soloSubmit').style.display = 'none';
      document.getElementById('soloNext').style.display = '';
      showTapBackBtn();   // OPTIONAL bonus — only ever offered after a correct answer
      syncBankPad();      // Next + Tap-back now showing -> re-fit the floating action row
      save(); render(); return;
    }
    S.wrongThisRound = true;
    S.groove = Math.max(0, S.groove - GROOVE_PER_WRONG * r.wrong.length);
    if (S.correctionMode) {
      r.wrong.forEach(function (w) { markZone(w.m, w.b, 'solo-wrong'); });
      msg(r.wrong.length + ' beat(s) off — fix the red beats, then submit again.');
    } else {
      S.streak = 0; revealCorrect();
      // GUIDED: a terminal wrong answer (no fix-it) counts as wrong for the mastery
      // meter (-30). It never passes the capstone (correct=false), so no advance.
      guidedRecord(false, false, 0);
      msg('Not quite — here’s the correct rhythm.');
      document.getElementById('soloSubmit').style.display = 'none';
      document.getElementById('soloNext').style.display = '';
    }
    syncBankPad();   // Submit -> Next swap changed the floating action row
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

  /* Bridge a graded round into the guided spine: record mastery, run the capstone/
     ramp gate, refresh the level picker + mastery meter, and return a short status
     string for the round message. No-op (returns null) in free play. Shared by the
     dictation submit() and the tapping showResults() so BOTH games drive the SAME
     matched ladder identically. */
  function guidedRecord(correct, clean, groovePct) {
    if (!(S.guided && GUIDE.avail())) return null;
    var before = GUIDE.curLevel();
    var res = GUIDE.recordRound(correct, clean, groovePct);
    var advText = null;
    if (res.capstonePassed) {
      if (res.leveledUp) {
        var now = GUIDE.curLevel();
        advText = 'Level passed! → Ch ' + now.hallChapter + ' · ' + now.title;
        GUIDE.maybeTeach();   // SEAM: teach screen before the newly-unlocked level
      } else {
        advText = 'Level passed! (end of the available ladder)';
      }
    } else if (clean && correct && GUIDE.rampBars() > S.measures) {
      // ramp advanced this round (e.g. 2 -> 4); reflected on the next newRound().
      advText = 'Clean! Next: ' + GUIDE.rampBars() + ' bars';
    }
    fillLevelOptions();   // mastered/now tags + frontier may have moved
    render();             // mastery meter + ramp readout
    return { res: res, advText: advText };
  }

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
  // Human label per mastery band (from core/mastery LEVELS). No emoji.
  var BAND_LABEL = { attempted: 'Attempted', familiar: 'Familiar', proficient: 'Proficient', mastered: 'Mastered' };
  function render() {
    var f = document.getElementById('soloGrooveFill');
    if (f) { f.style.width = S.groove + '%'; f.style.background = S.groove > 50 ? 'var(--groove-ok,#19e07a)' : S.groove > 25 ? 'var(--groove-warn,#ffd24a)' : 'var(--groove-low,#ff5a4d)'; }
    var p = document.getElementById('soloGroovePct'); if (p) p.textContent = S.groove + '%';
    var sc = document.getElementById('soloScore'); if (sc) sc.textContent = S.score;
    var st = document.getElementById('soloStreak'); if (st) st.textContent = S.streak;
    var bn = document.getElementById('soloBonus'); if (bn) bn.textContent = S.bonus;
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
    var chap = document.getElementById('smChap'); if (chap) chap.textContent = 'Ch ' + mv.hallChapter + ' · ' + (mv.idx + 1) + '/' + mv.count;
    var title = document.getElementById('smTitle'); if (title) title.textContent = mv.title;
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
        : ('Capstone ramp: ' + S.measures + ' bars' + (GUIDE.atCapstone() ? ' · pass a clean 8-bar example to advance' : ' → climb to 8'));
    }
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
      /* ---- GUIDED mastery meter (per-theme; NO emoji) ---- */
      '.solo-mastery{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin:2px 0 10px;padding:9px 12px;border-radius:11px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}' +
      '.solo-mastery .sm-level{display:flex;flex-direction:column;min-width:140px}' +
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
      '.tb-rbtns{display:flex;gap:12px;justify-content:center;margin-top:6px}' +
      '.tb-rbtns button{display:inline-flex;align-items:center;justify-content:center;font-family:inherit;font-weight:700;font-size:.9rem;border:none;border-radius:10px;padding:12px 20px;min-height:46px;cursor:pointer;background:rgba(255,255,255,.1);color:#fff}' +
      '.tb-rbtns button .ic{margin-right:7px;width:1.05em;height:1.05em;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}' +
      '.tb-rbtns button.go{background:var(--tb-accent,#7c5cff);color:#fff}' +
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
      '}';
    document.head.appendChild(st);
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
        '<div class="solo-stat"><span>LEVEL</span><select id="soloLevel"></select></div>' +
        '<div class="solo-stat solo-barsel"><span>BARS</span><select id="soloBars"><option value="2">2</option><option value="4">4</option><option value="8">8</option><option value="16">16</option></select></div>' +
        '<div class="solo-stat"><span>SCORE</span><b id="soloScore">0</b></div>' +
        '<div class="solo-stat"><span>STREAK</span><b id="soloStreak">0</b>' + IC.flame + '</div>' +
        '<div class="solo-stat"><span>BONUS</span><b id="soloBonus">0</b></div>' +
      '</div>' +
      // GUIDED MASTERY METER — the current ladder level + a per-theme mastery bar
      // (NO emoji). Hidden in free play. Populated by render() via GUIDE.masteryView().
      '<div id="soloMastery" class="solo-mastery" style="display:none">' +
        '<div class="sm-level"><span class="sm-chap" id="smChap"></span><span class="sm-title" id="smTitle"></span></div>' +
        '<div class="sm-meterwrap"><div class="sm-meter"><i id="smFill"></i>' +
          // band threshold ticks at 50 / 80 / 95 (Familiar / Proficient / Mastered)
          '<u class="sm-tick" style="left:50%"></u><u class="sm-tick" style="left:80%"></u><u class="sm-tick" style="left:95%"></u>' +
        '</div><b id="smBand" class="sm-band"></b></div>' +
        '<div class="sm-ramp" id="smRamp"></div>' +
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
    document.getElementById('soloReveal').onclick = function () {
      if (S.solved) return;
      S.solved = true; S.streak = 0; S.wrongThisRound = true;
      stopPulse(); clearMarks(); revealCorrect();
      // GUIDED: revealing the answer ends the round unsolved -> counts as wrong (-30),
      // never passes the capstone.
      guidedRecord(false, false, 0);
      msg('Here’s the correct rhythm. (No points — hit Next for a new one.)');
      document.getElementById('soloSubmit').style.display = 'none';
      document.getElementById('soloNext').style.display = '';
      syncBankPad();
      save(); render();
    };
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
    // GUIDED SPINE init — needs window.LevelCore (the core/ engine bridge). The bridge
    // is a deferred module, so it may land a tick after start() first runs; we wait a
    // short, bounded time for it. If it truly never arrives, we degrade gracefully to
    // FREE PLAY (S.guided=false) so the game always boots.
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
    rs.connected = true;
    buildHud();
    applyModeChrome();
    S.groove = 100;
    GUIDE.maybeTeach();   // SEAM: show a teach/demo screen before the first level (no-op until TEACH_CONTENT)
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
    start: start, startTapping: startTapping, state: S
  };
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
      tapTolerance: function () { return TAP_TOLERANCE; }
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
      // Force the within-level ramp to the capstone bar count, regenerate at that size,
      // and place the exact correct answer — so submit() can pass the capstone gate
      // without a human notating 8 bars. Returns the new measure count.
      forceCapstoneRound: function () {
        S.ramp = 8; S.measures = 8; newRound();
        // dictation: place the exact target so checkAnswer() is allCorrect.
        if (S.mode !== 'tapping') revealCorrect();
        return S.measures;
      }
    };
  }
})();
