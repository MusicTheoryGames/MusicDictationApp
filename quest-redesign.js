(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";

  // ---- ONE shared rhythm renderer: shared/rhythm-notation/renderer.js (window.RhythmNotation).
  // The game's internal renderer + catalog were EXTRACTED there so every surface shares one renderer
  // and notation can never drift. These alias the pieces the game still references. renderer.js MUST
  // load before this file (see rhythmquest.html).
  const beatVexPatterns = window.RhythmNotation.catalog;
  const renderPlacedVex = window.RhythmNotation.renderPlacedVex;
  const refreshPlacedVex = window.RhythmNotation.refreshPlacedVex;
  const schedulePlacedVexRender = window.RhythmNotation.schedulePlacedVexRender;
  const markPlacedVexPending = window.RhythmNotation.markPlacedVexPending;
  const markPlacedVexRendered = window.RhythmNotation.markPlacedVexRendered;
  const rhythmAsset = window.RhythmNotation.rhythmAsset;
  const durationToBeats = window.RhythmNotation.durationToBeats;
  const isRestDuration = window.RhythmNotation.isRestDuration;
  const usesBeatUnitCustomBeaming = window.RhythmNotation.usesBeatUnitCustomBeaming;
  const rendererFamilyForPattern = window.RhythmNotation.rendererFamilyForPattern;
  const getVexFlow = window.RhythmNotation.getVexFlow;

  const ICON_PATHS = {
    play: "M8 5v14l11-7z",
    restart: "M17.7 6.3A8 8 0 1 1 12 4v2.4A5.6 5.6 0 1 0 16 8l-3 3h8V3z",
    check: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z",
    cross: "M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z",
    dot: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
    home: "M4 11.4 12 5l8 6.4V20h-5.2v-5.4H9.2V20H4z"
  };

  const ORIGINAL_ICONS = {
    metro: '<svg viewBox="0 0 20 20" class="ic"><path d="M7.2 17h5.6l-1.3-12H8.5z"/><path d="M10 14l3.6-7.4"/><path d="M6 17h8"/></svg>',
    guide: '<svg viewBox="0 0 20 20" class="ic"><path d="M2 11h3l2-5 3 9 2-6 1.4 2H18"/></svg>',
    search: '<svg viewBox="0 0 20 20" class="ic"><circle cx="9" cy="9" r="5"/><path d="M13 13l4.5 4.5"/></svg>',
    count: '<svg viewBox="0 0 20 20" class="ic"><path d="M5 15V8M10 15V5M15 15v-4"/></svg>',
    filter: '<svg viewBox="0 0 20 20" class="ic"><path d="M2.5 4h15l-6 7.2v4.6l-3 1.6v-6.2z"/></svg>',
    hear: '<svg viewBox="0 0 20 20" class="ic"><path d="M3 8v4h3l4 3V5L6 8z"/><path d="M13.5 7c1.6 1.4 1.6 5.6 0 7"/></svg>',
    bulb: '<svg viewBox="0 0 20 20" class="ic"><path d="M7 13.5a5 5 0 1 1 6 0c-.7.5-1 1.2-1 2H8c0-.8-.3-1.5-1-2z"/><path d="M8 17.5h4"/></svg>'
  };

  function icon(name, size) {
    if (ORIGINAL_ICONS[name]) {
      const holder = document.createElement("span");
      holder.innerHTML = ORIGINAL_ICONS[name];
      const svg = holder.firstElementChild;
      svg.setAttribute("width", String(size || 18));
      svg.setAttribute("height", String(size || 18));
      svg.setAttribute("aria-hidden", "true");
      return svg;
    }
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size || 18));
    svg.setAttribute("height", String(size || 18));
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICON_PATHS[name] || ICON_PATHS.dot);
    svg.appendChild(path);
    return svg;
  }

  function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  class TonePlayer {
    constructor() {
      this.ctx = null;
    }

    ensure() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === "suspended") this.ctx.resume();
      return this.ctx;
    }

    midiToHz(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    play(midi, seconds, options) {
      const ctx = this.ensure();
      const dur = seconds || 0.42;
      if (!ctx) return wait(dur * 1000);
      this.playAt(midi, ctx.currentTime, dur, options);
      return wait(dur * 1000);
    }

    playHz(frequency, seconds, options) {
      const ctx = this.ensure();
      const dur = seconds || 0.42;
      if (!ctx) return wait(dur * 1000);
      this.playHzAt(frequency, ctx.currentTime, dur, options);
      return wait(dur * 1000);
    }

    playAt(midi, time, seconds, options) {
      return this.playHzAt(this.midiToHz(midi), time, seconds, options);
    }

    playHzAt(frequency, time, seconds, options) {
      const ctx = this.ensure();
      const dur = seconds || 0.42;
      if (!ctx) return null;
      const opts = options || {};
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = Math.max(ctx.currentTime, time || ctx.currentTime);
      osc.type = opts.type || "sine";
      osc.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(opts.gain || 0.16, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
      return osc;
    }
  }

  const audio = new TonePlayer();
  const hintCosts = {
    narrow: 10,
    count: 5,
    hear: 6,
    mistakes: 8
  };
  const beatScoring = {
    completionXp: 50,
    performanceMax: 50,
    wrongAttemptPenalty: 15,
    streakStep: 10,
    streakCap: 30,
    independenceFloor: 0.7,
    extraListenGroovePenalty: 2,
    freeCountHints: 1,
    maxCountHints: 2,
    maxHearHints: 2,
    freeListenBaseByBand: {
      beginner: 5,
      intermediate: 4,
      advanced: 3
    },
    freeListenLengthBonus: {
      2: 0,
      4: 1,
      8: 2,
      16: 4
    }
  };
  const beatAdaptiveFormula = {
    weakBias: 3.0,
    hardMax: 20,
    stageMax: { 2: 6, 4: 7, 8: 9 },
    avgStage2: 42,
    avgStage4Clean: 56,
    avgStage4Independent: 52,
    avgStage4Correct: 50,
    passAvgFigure: 64,
    passWeakestFigure: 40,
    passLevelIndependence: 55,
    passStageIndependence: 60,
    safetyAvgFigure: 58,
    safetyWeakestFigure: 32,
    safetyStageCorrect: 3
  };

  function playMetroTick(accent) {
    audio.playHz(accent ? 2300 : 1550, 0.035, {
      type: "sine",
      gain: accent ? 0.32 : 0.2
    });
  }

  function scheduleMetroTickAt(performanceTime, accent) {
    const ctx = audio.ensure();
    if (!ctx) {
      return null;
    }
    const secondsUntilBeat = Math.max(0, (performanceTime - performance.now()) / 1000);
    const audioTime = ctx.currentTime + secondsUntilBeat;
    audio.playHzAt(accent ? 2300 : 1550, audioTime, 0.035, {
      type: "sine",
      gain: accent ? 0.32 : 0.2
    });
    return performanceTime;
  }

  function playRhythmHit(durationSeconds) {
    const ring = Math.max(0.1, Math.min(1.1, (durationSeconds || 0.14) * 0.92));
    audio.playHz(523.25, ring, { type: "sine", gain: 0.4 });
    audio.playHz(1046.5, Math.min(ring, 0.13), { type: "sine", gain: 0.09 });
  }

  const beatPatterns = [
    { id: "quarter", label: "Quarter", beats: 1, sounds: 1 },
    { id: "two-eighths", label: "Two eighths", beats: 1, sounds: 2 },
    { id: "four-sixteenths", label: "Four sixteenths", beats: 1, sounds: 4 },
    { id: "eighth-two-sixteenths", label: "Eighth two sixteenths", beats: 1, sounds: 3 },
    { id: "two-sixteenths-eighth", label: "Two sixteenths eighth", beats: 1, sounds: 3 },
    { id: "sixteenth-eighth-sixteenth", label: "Sixteenth eighth sixteenth", beats: 1, sounds: 3 },
    { id: "dotted-eighth-sixteenth", label: "Dotted eighth sixteenth", beats: 1, sounds: 2 },
    { id: "sixteenth-dotted-eighth", label: "Sixteenth dotted eighth", beats: 1, sounds: 2 },
    { id: "eighth-rest-eighth", label: "Eighth rest eighth", beats: 1, sounds: 1 },
    { id: "eighth-eighth-rest", label: "Eighth eighth rest", beats: 1, sounds: 2 },
    { id: "eighth-rest-two-sixteenths", label: "Eighth rest two sixteenths", beats: 1, sounds: 2 },
    { id: "sixteenth-rest-three-sixteenths", label: "Sixteenth rest three sixteenths", beats: 1, sounds: 3 },
    { id: "quarter-rest", label: "Quarter rest", beats: 1, sounds: 0 },
    { id: "triplet-eighths", label: "Triplet eighths", beats: 1, sounds: 3 },
    { id: "half", label: "Half note", beats: 2, sounds: 1 },
    { id: "dotted-half", label: "Dotted half note", beats: 3, sounds: 1 },
    { id: "whole", label: "Whole note", beats: 4, sounds: 1 },
    { id: "dotted-quarter-eighth", label: "Dotted quarter eighth", beats: 2, sounds: 2 },
    { id: "eighth-quarter-eighth", label: "Eighth quarter eighth", beats: 2, sounds: 3 },
    { id: "triplet-quarters", label: "Triplet quarters", beats: 2, sounds: 3 },
    { id: "cd-dotted-quarter", label: "Dotted quarter", beats: 1, sounds: 1 },
    { id: "cd-three-eighths", label: "Three eighths", beats: 1, sounds: 3 },
    { id: "cd-quarter-eighth", label: "Quarter eighth", beats: 1, sounds: 2 },
    { id: "cd-eighth-quarter", label: "Eighth quarter", beats: 1, sounds: 2 },
    { id: "cd-duplet", label: "Duplet", beats: 1, sounds: 2 },
    { id: "cd-six-sixteenths", label: "Six sixteenths", beats: 1, sounds: 6 },
    { id: "cd-two16-8-8", label: "Two sixteenths two eighths", beats: 1, sounds: 4 },
    { id: "cd-8-two16-8", label: "Eighth two sixteenths eighth", beats: 1, sounds: 4 },
    { id: "cd-8-8-two16", label: "Two eighths two sixteenths", beats: 1, sounds: 4 },
    { id: "cd-four16-8", label: "Four sixteenths eighth", beats: 1, sounds: 5 },
    { id: "cd-8-four16", label: "Eighth four sixteenths", beats: 1, sounds: 5 },
    { id: "cd-quarter-two16", label: "Quarter two sixteenths", beats: 1, sounds: 3 },
    { id: "cd-two16-quarter", label: "Two sixteenths quarter", beats: 1, sounds: 3 },
    { id: "cd-dotted-quarter-rest", label: "Dotted quarter rest", beats: 1, sounds: 0 },
    { id: "cd-8rest-8-8", label: "Eighth rest two eighths", beats: 1, sounds: 2 },
    { id: "cd-8-8rest-8", label: "Eighth eighth rest eighth", beats: 1, sounds: 2 },
    { id: "cd-8-8-8rest", label: "Two eighths eighth rest", beats: 1, sounds: 2 },
    { id: "cd-quarter-8rest", label: "Quarter eighth rest", beats: 1, sounds: 1 },
    { id: "cd-8rest-quarter", label: "Eighth rest quarter", beats: 1, sounds: 1 },
    { id: "hb-half", label: "Half beat", beats: 1, sounds: 1 },
    { id: "hb-two-quarters", label: "Two quarters", beats: 1, sounds: 2 },
    { id: "hb-quarter-two8", label: "Quarter two eighths", beats: 1, sounds: 3 },
    { id: "hb-two8-quarter", label: "Two eighths quarter", beats: 1, sounds: 3 },
    { id: "hb-four-eighths", label: "Four eighths", beats: 1, sounds: 4 },
    { id: "hb-half-rest", label: "Half rest", beats: 1, sounds: 0 },
    { id: "hb-quarter-qrest", label: "Quarter quarter rest", beats: 1, sounds: 1 },
    { id: "hb-qrest-quarter", label: "Quarter rest quarter", beats: 1, sounds: 1 },
    { id: "hb-8rest-8-quarter", label: "Eighth rest eighth quarter", beats: 1, sounds: 2 },
    { id: "hb-quarter-8rest-8", label: "Quarter eighth rest eighth", beats: 1, sounds: 2 },
    { id: "hb-eight-16ths", label: "Eight sixteenths", beats: 1, sounds: 8 },
    { id: "hb-two16-q", label: "Two sixteenths quarter", beats: 1, sounds: 3 },
    { id: "hb-q-two16", label: "Quarter two sixteenths", beats: 1, sounds: 3 },
    { id: "hb-two8-four16", label: "Two eighths four sixteenths", beats: 1, sounds: 6 },
    { id: "hb-four16-two8", label: "Four sixteenths two eighths", beats: 1, sounds: 6 },
    { id: "hb-8-two16-8", label: "Eighth two sixteenths eighth", beats: 1, sounds: 4 },
    { id: "hb-two16-8-8", label: "Two sixteenths two eighths", beats: 1, sounds: 4 },
    { id: "hb-8-8-two16", label: "Two eighths two sixteenths", beats: 1, sounds: 4 },
    { id: "dh-dotted-half", label: "Dotted half", beats: 1, sounds: 1 },
    { id: "dh-three-quarters", label: "Three quarters", beats: 1, sounds: 3 },
    { id: "dh-half-quarter", label: "Half quarter", beats: 1, sounds: 2 },
    { id: "dh-quarter-half", label: "Quarter half", beats: 1, sounds: 2 },
    { id: "dh-duplet", label: "Duplet", beats: 1, sounds: 2 },
    { id: "dh-six-eighths", label: "Six eighths", beats: 1, sounds: 6 },
    { id: "dh-dotted-half-rest", label: "Dotted half rest", beats: 1, sounds: 0 },
    { id: "dh-qrest-q-q", label: "Quarter rest two quarters", beats: 1, sounds: 2 },
    { id: "dh-q-qrest-q", label: "Quarter rest between quarters", beats: 1, sounds: 2 },
    { id: "dh-q-q-qrest", label: "Two quarters quarter rest", beats: 1, sounds: 2 },
    { id: "dh-half-qrest", label: "Half quarter rest", beats: 1, sounds: 1 },
    { id: "dh-qrest-half", label: "Quarter rest half", beats: 1, sounds: 1 },
    { id: "dh-two8-q-q", label: "Two eighths two quarters", beats: 1, sounds: 4 },
    { id: "dh-q-two8-q", label: "Quarter two eighths quarter", beats: 1, sounds: 4 },
    { id: "dh-q-q-two8", label: "Two quarters two eighths", beats: 1, sounds: 4 },
    { id: "dh-four8-q", label: "Four eighths quarter", beats: 1, sounds: 5 },
    { id: "dh-q-four8", label: "Quarter four eighths", beats: 1, sounds: 5 },
    { id: "dh-half-two8", label: "Half two eighths", beats: 1, sounds: 3 },
    { id: "dh-two8-half", label: "Two eighths half", beats: 1, sounds: 3 },
    { id: "eb-eighth", label: "Eighth", beats: 1, sounds: 1 },
    { id: "eb-two-sixteenths", label: "Two sixteenths", beats: 1, sounds: 2 },
    { id: "eb-four-32nds", label: "Four thirty seconds", beats: 1, sounds: 4 },
    { id: "eb-eighth-rest", label: "Eighth rest", beats: 1, sounds: 0 },
    { id: "de-dotted-eighth", label: "Dotted eighth", beats: 1, sounds: 1 },
    { id: "de-three-16ths", label: "Three sixteenths", beats: 1, sounds: 3 },
    { id: "de-eighth-16th", label: "Eighth sixteenth", beats: 1, sounds: 2 },
    { id: "de-16th-eighth", label: "Sixteenth eighth", beats: 1, sounds: 2 },
    { id: "de-duplet", label: "Duplet", beats: 1, sounds: 2 },
    { id: "de-dotted-eighth-rest", label: "Dotted eighth rest", beats: 1, sounds: 0 },
    { id: "de-16rest-16-16", label: "Sixteenth rest two sixteenths", beats: 1, sounds: 2 },
    { id: "de-16-16rest-16", label: "Sixteenth rest between sixteenths", beats: 1, sounds: 2 },
    { id: "de-16-16-16rest", label: "Two sixteenths sixteenth rest", beats: 1, sounds: 2 },
    { id: "de-eighth-16rest", label: "Eighth sixteenth rest", beats: 1, sounds: 1 },
    { id: "de-16rest-eighth", label: "Sixteenth rest eighth", beats: 1, sounds: 1 },
    { id: "de-six-32nds", label: "Six thirty seconds", beats: 1, sounds: 6 },
    { id: "de-two32-16-16", label: "Two thirty seconds two sixteenths", beats: 1, sounds: 4 },
    { id: "de-16-two32-16", label: "Sixteenth two thirty seconds sixteenth", beats: 1, sounds: 4 },
    { id: "de-16-16-two32", label: "Two sixteenths two thirty seconds", beats: 1, sounds: 4 },
    { id: "de-four32-16", label: "Four thirty seconds sixteenth", beats: 1, sounds: 5 },
    { id: "de-16-four32", label: "Sixteenth four thirty seconds", beats: 1, sounds: 5 },
    { id: "de-eighth-two32", label: "Eighth two thirty seconds", beats: 1, sounds: 3 },
    { id: "de-two32-eighth", label: "Two thirty seconds eighth", beats: 1, sounds: 3 },
    { id: "tpl-quintuplet", label: "Quintuplet", beats: 1, sounds: 5 },
    { id: "tpl-sextuplet", label: "Sextuplet", beats: 1, sounds: 6 },
    { id: "tpl-septuplet", label: "Septuplet", beats: 1, sounds: 7 },
    { id: "measure-rest-2", label: "Full measure rest", beats: 2, sounds: 0 },
    { id: "measure-rest-3", label: "Full measure rest", beats: 3, sounds: 0 },
    { id: "measure-rest-4", label: "Full measure rest", beats: 4, sounds: 0 }
  ];

  const beatPatternMap = new Map(beatPatterns.map((p) => [p.id, p]));
  const glyphFiles = { h: "h.svg", q: "q.svg", qd: "qd.svg", "8": "8.svg" };
  const noteheadOffset = 11;
  const beatDecomposition = {
  };
  const beatAnswerAssets = {
    "dotted-quarter-eighth": "dotted-quarter-eighth-answer.png",
    "eighth-quarter-eighth": "eighth-quarter-eighth.png",
    "triplet-quarters": "triplet-quarters-answer.png"
  };
  const beatDemoLoop = [
    "quarter",
    "two-eighths",
    "four-sixteenths",
    "quarter-rest",
    "dotted-quarter-eighth",
    "eighth-two-sixteenths",
    "sixteenth-eighth-sixteenth",
    "two-sixteenths-eighth",
    "half",
    "dotted-eighth-sixteenth",
    "sixteenth-dotted-eighth",
    "eighth-rest-eighth",
    "eighth-eighth-rest",
    "eighth-quarter-eighth",
    "triplet-quarters",
    "triplet-eighths"
  ];
  const simpleCh1Figures = ["quarter", "two-eighths", "half", "dotted-half", "whole"];
  const simpleCh3Figures = simpleCh1Figures.concat(["quarter-rest"]);
  const simpleCh4Figures = simpleCh3Figures.concat(["dotted-quarter-eighth"]);
  const simpleCh6Figures = simpleCh4Figures.concat(["four-sixteenths", "eighth-two-sixteenths", "two-sixteenths-eighth", "sixteenth-eighth-sixteenth"]);
  const simpleCh7Figures = simpleCh6Figures.concat(["dotted-eighth-sixteenth", "sixteenth-dotted-eighth"]);
  const simpleCh9Figures = simpleCh7Figures.concat(["eighth-rest-eighth", "eighth-eighth-rest", "eighth-quarter-eighth", "eighth-rest-two-sixteenths", "sixteenth-rest-three-sixteenths"]);
  const simpleCh12Figures = simpleCh9Figures.concat(["triplet-eighths", "triplet-quarters"]);
  const compoundCh5Figures = ["cd-dotted-quarter", "cd-three-eighths", "cd-quarter-eighth", "cd-eighth-quarter"];
  const compoundCh8Figures = compoundCh5Figures.concat(["cd-six-sixteenths", "cd-two16-8-8", "cd-8-two16-8", "cd-8-8-two16", "cd-four16-8", "cd-8-four16", "cd-quarter-two16", "cd-two16-quarter"]);
  const compoundCh10Figures = compoundCh8Figures.concat(["cd-dotted-quarter-rest", "cd-8rest-8-8", "cd-8-8rest-8", "cd-8-8-8rest", "cd-quarter-8rest", "cd-8rest-quarter"]);
  const compoundCh13Figures = compoundCh10Figures.concat(["cd-duplet"]);
  const halfBeatCh14Figures = ["hb-half", "hb-two-quarters", "hb-quarter-two8", "hb-two8-quarter", "hb-four-eighths"];
  const dottedHalfCh15Figures = ["dh-dotted-half", "dh-three-quarters", "dh-half-quarter", "dh-quarter-half", "dh-duplet", "dh-six-eighths", "dh-dotted-half-rest", "dh-qrest-q-q", "dh-q-qrest-q", "dh-q-q-qrest", "dh-half-qrest", "dh-qrest-half", "dh-two8-q-q", "dh-q-two8-q", "dh-q-q-two8", "dh-four8-q", "dh-q-four8", "dh-half-two8", "dh-two8-half"];
  const eighthBeatCh16Figures = ["eb-eighth", "eb-two-sixteenths", "eb-four-32nds", "eb-eighth-rest"];
  const dottedEighthCh17Figures = ["de-dotted-eighth", "de-three-16ths", "de-eighth-16th", "de-16th-eighth", "de-duplet", "de-dotted-eighth-rest", "de-16rest-16-16", "de-16-16rest-16", "de-16-16-16rest", "de-eighth-16rest", "de-16rest-eighth", "de-six-32nds", "de-two32-16-16", "de-16-two32-16", "de-16-16-two32", "de-four32-16", "de-16-four32", "de-eighth-two32", "de-two32-eighth"];
  const tupletCh26Figures = simpleCh12Figures.concat(["tpl-quintuplet", "tpl-sextuplet", "tpl-septuplet"]);

  function beatDifficultyBandForChapter(chapter) {
    if (chapter <= 7) return "beginner";
    if (chapter <= 17) return "intermediate";
    return "advanced";
  }

  function beatsForTimeSignature(timeSignature, beatUnit) {
    const parts = String(timeSignature || "").split("/");
    const top = Number(parts[0]);
    if (!Number.isFinite(top) || top <= 0) return null;
    return String(beatUnit || "").startsWith("dotted-") ? top / 3 : top;
  }

  function defaultTimeSignatureForLevel(timeSignatures, beatsPerMeasure, beatUnit) {
    return timeSignatures.find((timeSignature) => beatsForTimeSignature(timeSignature, beatUnit) === beatsPerMeasure)
      || timeSignatures[0];
  }

  function meterChoiceForLevel(level, requestedTimeSignature) {
    const allowed = level && Array.isArray(level.timeSignatures) ? level.timeSignatures : [];
    const requested = String(requestedTimeSignature || "").trim();
    const timeSignature = allowed.includes(requested) ? requested : level.timeSignature;
    return {
      timeSignature,
      beatsPerMeasure: beatsForTimeSignature(timeSignature, level.beatUnit) || level.beatsPerMeasure
    };
  }

  function fixedMeterForLevel(level, requestedTimeSignature) {
    const allowed = level && Array.isArray(level.timeSignatures) ? level.timeSignatures : [];
    const requested = String(requestedTimeSignature || "").trim();
    return allowed.includes(requested) ? requested : "";
  }

  function chooseSingleMeterForRound(state) {
    const level = state && state.level;
    const allowed = level && Array.isArray(level.timeSignatures) ? level.timeSignatures.filter(Boolean) : [];
    if (!allowed.length) return state && state.timeSignature ? state.timeSignature : "4/4";
    if (state.fixedMeter && allowed.includes(state.fixedMeter)) return state.fixedMeter;
    if (allowed.length === 1) return allowed[0];
    const currentIndex = allowed.includes(state.timeSignature) ? allowed.indexOf(state.timeSignature) : 0;
    const index = Number.isFinite(state.meterCursor) ? state.meterCursor : currentIndex;
    const meter = allowed[((index % allowed.length) + allowed.length) % allowed.length];
    state.meterCursor = (index + 1) % allowed.length;
    return meter;
  }

  function hallBeatLevel(number, title, timeSignatures, beatsPerMeasure, figures, options) {
    const opts = options || {};
    const beatUnit = opts.beatUnit || "quarter";
    return {
      number,
      id: "ch" + number,
      hallChapter: number,
      title,
      timeSignatures: timeSignatures.slice(),
      timeSignature: opts.timeSignature || defaultTimeSignatureForLevel(timeSignatures, beatsPerMeasure, beatUnit),
      beatsPerMeasure,
      figures: figures.filter((id) => beatPatternMap.has(id)),
      requestedFigures: figures.slice(),
      beatUnit,
      assetPrefix: opts.assetPrefix || "medium",
      autoMeasureRest: opts.autoMeasureRest,
      buildStatus: opts.buildStatus || "ready",
      engineNeeds: opts.engineNeeds || null,
      forms: opts.forms || { dictation: { voices: 1 }, tapping: { voices: 1 } },
      changeKind: opts.changeKind || null,
      changePool: opts.changePool ? opts.changePool.slice() : null,
      requiredFigures: opts.requiredFigures ? opts.requiredFigures.filter((id) => beatPatternMap.has(id)) : [],
      difficultyBand: opts.difficultyBand || beatDifficultyBandForChapter(number)
    };
  }

  const polyCompositeForms = { dictation: { voices: 1 }, tapping: { voices: 2 } };
  const beatGuidedLevels = [
    hallBeatLevel(1, "Simple Duple Meter", ["2/4"], 2, simpleCh1Figures),
    hallBeatLevel(2, "Simple Triple Meter", ["3/4"], 3, simpleCh1Figures, { requiredFigures: ["dotted-half"] }),
    hallBeatLevel(3, "Simple Quadruple Meter", ["4/4"], 4, simpleCh3Figures, { requiredFigures: ["whole"] }),
    hallBeatLevel(4, "Dotted Quarters and Tied Notes", ["2/4", "3/4", "4/4"], 4, simpleCh4Figures),
    hallBeatLevel(5, "Compound Duple Meter", ["6/8"], 2, compoundCh5Figures, { beatUnit: "dotted-quarter", assetPrefix: "cd" }),
    hallBeatLevel(6, "Sixteenth-Notes in Simple Meter", ["2/4", "3/4", "4/4"], 4, simpleCh6Figures),
    hallBeatLevel(7, "Dotted Eighths in Simple Meter", ["2/4", "3/4", "4/4"], 4, simpleCh7Figures),
    hallBeatLevel(8, "Sixteenth-Notes in Six-Eight Meter", ["6/8"], 2, compoundCh8Figures, { beatUnit: "dotted-quarter", assetPrefix: "cd", difficultyBand: "intermediate" }),
    hallBeatLevel(9, "More Rests and Syncopation in Simple Meter", ["2/4", "3/4", "4/4"], 4, simpleCh9Figures, { difficultyBand: "intermediate" }),
    hallBeatLevel(10, "More Rests and Syncopation in Six-Eight Meter", ["6/8"], 2, compoundCh10Figures, { beatUnit: "dotted-quarter", assetPrefix: "cd", difficultyBand: "intermediate" }),
    hallBeatLevel(11, "Nine-Eight and Twelve-Eight Meter", ["9/8", "12/8"], 3, compoundCh10Figures, { beatUnit: "dotted-quarter", assetPrefix: "cd", difficultyBand: "intermediate" }),
    hallBeatLevel(12, "Triplets", ["2/4", "3/4", "4/4"], 4, simpleCh12Figures, { assetPrefix: "tpl", difficultyBand: "intermediate" }),
    hallBeatLevel(13, "Two Against Three: Compound Duplets", ["6/8", "9/8", "12/8"], 2, compoundCh13Figures, { beatUnit: "dotted-quarter", assetPrefix: "cd", requiredFigures: ["cd-duplet"], difficultyBand: "intermediate" }),
    hallBeatLevel(14, "Half-Note Beat", ["2/2", "3/2"], 2, halfBeatCh14Figures, { beatUnit: "half", assetPrefix: "hb", difficultyBand: "intermediate" }),
    hallBeatLevel(15, "Dotted-Half-Note Beat", ["6/4", "9/4", "12/4"], 2, dottedHalfCh15Figures, { beatUnit: "dotted-half", assetPrefix: "dh", difficultyBand: "intermediate" }),
    hallBeatLevel(16, "Eighth-Note Beat", ["2/8", "3/8"], 2, eighthBeatCh16Figures, { beatUnit: "eighth", assetPrefix: "eb", difficultyBand: "intermediate" }),
    hallBeatLevel(17, "Dotted-Eighth-Note Beat", ["6/16", "9/16", "12/16"], 2, dottedEighthCh17Figures, { beatUnit: "dotted-eighth", assetPrefix: "de", difficultyBand: "intermediate" }),
    hallBeatLevel(18, "Small Subdivisions", ["2/4", "3/4", "4/4"], 4, [], { buildStatus: "needs-assets", engineNeeds: "32nd/64th subdivision figure art" }),
    hallBeatLevel(19, "Changing Simple Meter", ["2/4", "3/4", "4/4"], 4, simpleCh12Figures, { changeKind: "simple", changePool: ["2/4", "3/4", "4/4"], difficultyBand: "advanced" }),
    hallBeatLevel(20, "Changing Compound Meter", ["6/8", "9/8", "12/8"], 2, [], { buildStatus: "needs-engine", engineNeeds: "per-measure compound meter changes" }),
    hallBeatLevel(21, "Changing Simple to Compound, Division Constant", ["2/4", "6/8"], 2, [], { buildStatus: "needs-engine", engineNeeds: "simple/compound conversion with division constant" }),
    hallBeatLevel(22, "Changing Simple to Compound, Beat Constant", ["2/4", "6/8"], 2, [], { buildStatus: "needs-engine", engineNeeds: "simple/compound conversion with beat constant" }),
    hallBeatLevel(23, "Three in Two / Two in Three", ["2/4", "3/4"], 3, [], { buildStatus: "needs-engine", engineNeeds: "notating the 3:2 composite/resultant rhythm as a single-voice dictation line; tapping additionally needs the two-zone two-voice engine", forms: polyCompositeForms, difficultyBand: "advanced" }),
    hallBeatLevel(24, "Four Against Three", ["2/4", "3/4", "4/4"], 4, [], { buildStatus: "needs-engine", engineNeeds: "notating the 4:3 composite/resultant rhythm as a single-voice dictation line; tapping additionally needs the two-zone two-voice engine", forms: polyCompositeForms, difficultyBand: "advanced" }),
    hallBeatLevel(25, "Four in Three / Three in Four", ["2/4", "3/4", "4/4"], 4, [], { buildStatus: "needs-engine", engineNeeds: "notating the 4:3 / 3:4 composite/resultant rhythm as a single-voice dictation line; tapping additionally needs the two-zone two-voice engine", forms: polyCompositeForms, difficultyBand: "advanced" }),
    hallBeatLevel(26, "Quintuplets and Septuplets", ["2/4", "3/4", "4/4"], 4, tupletCh26Figures, { assetPrefix: "tpl", difficultyBand: "advanced" }),
    hallBeatLevel(27, "Five-Eight and Five-Four Meter", ["5/8", "5/4"], 2, [], { buildStatus: "needs-engine", engineNeeds: "unequal beat rendering and scoring", difficultyBand: "advanced" }),
    hallBeatLevel(28, "More Meters with Unequal Beats", ["7/8", "8/8", "10/8"], 3, [], { buildStatus: "needs-engine", engineNeeds: "larger unequal-meter rendering and scoring", difficultyBand: "advanced" }),
    hallBeatLevel(29, "Changing Meters with Unequal Beats", ["5/8", "7/8"], 3, [], { buildStatus: "needs-engine", engineNeeds: "changing unequal-meter rendering and scoring", difficultyBand: "advanced" }),
    hallBeatLevel(30, "More Cross Rhythms", ["4/4"], 4, [], { buildStatus: "needs-engine", engineNeeds: "notating the composite of an advanced cross-rhythm/polymeter as a single-voice dictation line; tapping additionally needs the two-zone two-voice engine", forms: polyCompositeForms, difficultyBand: "advanced" }),
    hallBeatLevel(31, "Tempo Modulation", ["4/4"], 4, [], { buildStatus: "needs-engine", engineNeeds: "variable-tempo clock for metric modulation", difficultyBand: "advanced" })
  ].map((level) => ({
    ...level,
    playable: level.buildStatus === "ready" && level.figures.length > 0
  }));

  function resolveBeatGuidedLevel(requestedNumber) {
    const requested = beatGuidedLevels[requestedNumber - 1] || beatGuidedLevels[0];
    if (requested && requested.playable) return requested;
    for (let index = requestedNumber - 2; index >= 0; index -= 1) {
      if (beatGuidedLevels[index] && beatGuidedLevels[index].playable) return beatGuidedLevels[index];
    }
    return beatGuidedLevels.find((level) => level.playable) || beatGuidedLevels[0];
  }

  function beatLevelAvailability(level) {
    if (!level) return { canGenerate: false, label: "missing level", title: "Missing level data." };
    if (level.figures && level.figures.length && level.buildStatus === "ready") {
      return { canGenerate: true, label: "", title: level.title };
    }
    if (level.figures && level.figures.length) {
      return {
        canGenerate: true,
        label: "lab",
        title: level.title + " — playable in the redesign lab, not approved for guided progression yet."
      };
    }
    const chapter = Number(level.number);
    let label = "coming soon";
    if ([23, 24, 25, 30].includes(chapter)) label = "coming soon: single-line cross-rhythm dictation design";
    else if (chapter === 16) label = "coming soon: eighth-beat assets";
    else if (chapter === 18) label = "coming soon: small-subdivision assets";
    else if (chapter === 20) label = "coming soon: changing compound meter";
    else if (chapter === 21) label = "coming soon: division-constant conversion";
    else if (chapter === 22) label = "coming soon: beat-constant conversion";
    else if ([27, 28].includes(chapter)) label = "coming soon: unequal-meter engine";
    else if (chapter === 29) label = "coming soon: changing unequal meter";
    else if (chapter === 31) label = "coming soon: variable-tempo clock";
    const detail = level.engineNeeds ? " Needs: " + level.engineNeeds : "";
    return {
      canGenerate: false,
      label,
      title: level.title + " — " + label + "." + detail
    };
  }
  const rhythmGridResolution = 840;
  const tapBackBonusPerMeasure = 25;
  // Tap Back rhythm-scoring window: rhythm taps must land within +/-120 ms of
  // the intended onset. Keep this tighter than beat lock so bonus scoring still
  // reflects pulse control.
  const tapBackToleranceMs = 120;
  // Beat lock is intentionally a little wider than rhythm scoring because it
  // follows the audible metronome through browser/touch latency.
  const tapBackLockToleranceMs = 180;

  function rhythmBankAsset(id) {
    return "assets/rhythm-assets/bank-tight/" + id + ".png?v=banktight-14";
  }

  function makeBeatRoundStats() {
    return {
      wrongAttempts: 0,
      countHintsUsed: 0,
      hearHintsUsed: 0,
      paidHintUses: 0,
      extraListensCharged: 0,
      scoreBreakdown: null
    };
  }

  function formatLevelNumber(number) {
    return String(number || 1).padStart(2, "0");
  }

  function normalizeBeatRendererMode(mode) {
    const value = String(mode || "hybrid").toLowerCase();
    return ["hybrid", "all", "png"].includes(value) ? value : "hybrid";
  }

  const beatUnitDurationUnits = {
    eighth: 2,
    "dotted-eighth": 3,
    quarter: 4,
    "dotted-quarter": 6,
    half: 8,
    "dotted-half": 12
  };

  function noteDurationUnits(note) {
    const duration = String(note && note.duration || "").replace(/r/g, "");
    const base = { w: 16, h: 8, q: 4, 8: 2, 16: 1, 32: 0.5 }[duration];
    if (!base) return 0;
    let total = base;
    let add = base / 2;
    for (let i = 0; i < Number(note.dots || 0); i += 1) {
      total += add;
      add /= 2;
    }
    return total;
  }

  function vexflowDurationUnits(vexflow) {
    return (vexflow || []).reduce((sum, note) => sum + noteDurationUnits(note), 0);
  }

  function patternFitsBeatUnit(state, id) {
    const spec = beatVexPatterns[id];
    if (!state || !spec || !Array.isArray(spec.vexflow) || spec.fullMeasureRest) return true;
    if (spec.triplet || spec.duplet || spec.tuplet) return true;
    const expectedUnit = beatUnitDurationUnits[state.level && state.level.beatUnit || state.beatUnit || "quarter"];
    if (!expectedUnit) return true;
    const expected = expectedUnit * Math.max(1, Number(spec.beats || 1));
    return Math.abs(vexflowDurationUnits(spec.vexflow) - expected) < 0.001;
  }

  function patternFitsCurrentMeasures(state, id) {
    const pattern = beatPatternMap.get(id);
    if (!state || !pattern) return true;
    const spec = beatVexPatterns[id];
    if (spec && spec.fullMeasureRest) {
      return measureRestIdsForState(state).includes(id);
    }
    const beats = Math.max(1, Math.round(Number(pattern.beats) || 1));
    return measureBeatCounts(state).some((measureBeats) => beats <= measureBeats);
  }

  function shouldRenderPlacedVex(state, placement, spec) {
    if (!state || !placement || !spec || !getVexFlow()) return false;
    const mode = normalizeBeatRendererMode(state.answerRenderer);
    if (mode === "png") return false;
    if (mode === "all") return true;
    if (!spec.renderAssetOnly) return true;
    if (rendererFamilyForPattern(placement.id) === "tuplet") return true;
    return usesBeatUnitCustomBeaming(placement.id);
  }

  function activeBeatPatternIds(state) {
    const ids = (state.levelFigures || []).filter((id) => {
      if (!beatPatternMap.has(id)) return false;
      // A few bank PNG families are visually related, but each guided level must only
      // expose figures that actually fill its current beat unit.
      return patternFitsBeatUnit(state, id) && patternFitsCurrentMeasures(state, id);
    });
    const hasBeatRest = ids.some((id) => {
      const pattern = beatPatternMap.get(id);
      return pattern && pattern.sounds === 0;
    });
    if (hasBeatRest && !(state.level && state.level.autoMeasureRest === false)) {
      measureRestIdsForState(state).forEach((restId) => {
        if (restId && beatPatternMap.has(restId) && !ids.includes(restId)) ids.push(restId);
      });
    }
    return ids;
  }

  function measureRestIdForState(state) {
    const beats = Math.round(Number(state && maxBeatsPerMeasure(state)) || 0);
    return measureRestIdForBeats(beats);
  }

  function measureRestIdForBeats(beats) {
    return beats >= 2 && beats <= 4 ? "measure-rest-" + beats : "";
  }

  function measureRestIdsForState(state) {
    const ids = measureBeatCounts(state).map(measureRestIdForBeats).filter(Boolean);
    return Array.from(new Set(ids.length ? ids : [measureRestIdForState(state)].filter(Boolean)));
  }

  function activeBeatPatterns(state) {
    const allowed = new Set(activeBeatPatternIds(state));
    if (!allowed.size) return beatPatterns.slice();
    return beatPatterns.filter((pattern) => allowed.has(pattern.id));
  }

  function isChangingMeterState(state) {
    return !!(state && Array.isArray(state.measureMeters) && state.measureMeters.length);
  }

  function getMeasureCount(state) {
    return isChangingMeterState(state) ? state.measureMeters.length : Math.max(0, Number(state && state.bars) || 0);
  }

  function beatUnitForMeasure(state, timeSignature) {
    const top = Number(String(timeSignature || "").split("/")[0]);
    if (state && state.level && state.level.changeKind) {
      return top === 6 || top === 9 || top === 12 ? "dotted-quarter" : "quarter";
    }
    return state && state.level ? state.level.beatUnit : "quarter";
  }

  function timeSignatureForMeasure(state, measure) {
    if (isChangingMeterState(state)) return state.measureMeters[measure] || state.timeSignature || "4/4";
    return state && state.timeSignature ? state.timeSignature : "4/4";
  }

  function measureBeatCount(state, measure) {
    const timeSignature = timeSignatureForMeasure(state, measure);
    return beatsForTimeSignature(timeSignature, beatUnitForMeasure(state, timeSignature))
      || Math.max(1, Math.round(Number(state && state.beatsPerMeasure) || 4));
  }

  function measureBeatCounts(state) {
    const count = getMeasureCount(state);
    const out = [];
    for (let measure = 0; measure < count; measure += 1) out.push(measureBeatCount(state, measure));
    if (!out.length && state) out.push(Math.max(1, Math.round(Number(state.beatsPerMeasure) || 4)));
    return out;
  }

  function maxBeatsPerMeasure(state) {
    return Math.max(1, ...measureBeatCounts(state));
  }

  function totalBeatsForState(state) {
    return measureBeatCounts(state).reduce((total, beats) => total + beats, 0);
  }

  function measureStartIndex(state, measure) {
    let start = 0;
    for (let i = 0; i < measure; i += 1) start += measureBeatCount(state, i);
    return start;
  }

  function measureEndIndex(state, measure) {
    return measureStartIndex(state, measure) + measureBeatCount(state, measure);
  }

  function measureIndexForBeat(state, beatIndex) {
    const count = getMeasureCount(state);
    let start = 0;
    for (let measure = 0; measure < count; measure += 1) {
      const end = start + measureBeatCount(state, measure);
      if (beatIndex < end) return measure;
      start = end;
    }
    return Math.max(0, count - 1);
  }

  function beatNumberInMeasure(state, beatIndex) {
    const measure = measureIndexForBeat(state, beatIndex);
    return beatIndex - measureStartIndex(state, measure) + 1;
  }

  function beatLabel(state, beatIndex) {
    const measure = measureIndexForBeat(state, beatIndex);
    return "Measure " + (measure + 1) + ", beat " + beatNumberInMeasure(state, beatIndex);
  }

  function meterSummary(state) {
    return isChangingMeterState(state) ? "changing meter" : (state && state.timeSignature ? state.timeSignature : "4/4");
  }

  function changingMeterChangePoints(meters) {
    const points = [];
    for (let measure = 1; measure < meters.length; measure += 1) {
      if (meters[measure] !== meters[measure - 1]) points.push(measure);
    }
    return points;
  }

  function changingMeterSequenceIsUsable(meters, rowCols) {
    if (!Array.isArray(meters) || meters.length < 2) return true;
    const changes = changingMeterChangePoints(meters);
    if (!changes.length) return false;
    if (meters.length > 2 && changes.length === meters.length - 1) return false;
    const rowStarts = new Set();
    if (Array.isArray(rowCols)) {
      rowCols.forEach((row) => {
        if (Array.isArray(row) && row.length && row[0] > 0) rowStarts.add(row[0]);
      });
    } else if (rowCols && rowCols > 1) {
      for (let measure = rowCols; measure < meters.length; measure += rowCols) rowStarts.add(measure);
    }
    if (rowStarts.size) {
      const rowStartChanges = changes.filter((measure) => rowStarts.has(measure));
      if (rowStartChanges.length === changes.length) return false;
    }
    return true;
  }

  function generateChangingMeterSequence(state, options) {
    const level = state && state.level;
    if (!level || !level.changeKind) return null;
    const pool = (level.changePool && level.changePool.length ? level.changePool : level.timeSignatures || [])
      .filter(Boolean);
    if (!pool.length) return null;
    const opts = options || {};
    const bars = Math.max(1, Math.round(Number(state.bars) || 1));
    const maxRun = bars <= 4 ? 3 : bars <= 8 ? 4 : 6;
    const buildCandidate = () => {
      const meters = [];
      let previous = null;
      let measure = 0;
      while (measure < bars) {
        const choices = pool.filter((meter) => meter !== previous);
        const usable = choices.length ? choices : pool;
        const pick = usable[Math.floor(Math.random() * usable.length)] || pool[0];
        const remaining = bars - measure;
        const runLength = bars <= 2 ? 1 : clamp(1, Math.min(maxRun, remaining), Math.ceil(Math.random() * Math.min(maxRun, remaining)));
        for (let i = 0; i < runLength && measure < bars; i += 1) {
          meters.push(pick);
          measure += 1;
        }
        previous = pick;
      }
      return meters;
    };
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const meters = buildCandidate();
      if (changingMeterSequenceIsUsable(meters, opts.rowCols)) return meters;
    }
    const fallback = [];
    const first = pool[0];
    const second = pool.find((meter) => meter !== first) || first;
    const rowColsHint = Array.isArray(opts.rowCols)
      ? Math.max(1, ...opts.rowCols.map((row) => Array.isArray(row) ? row.length || 1 : 1))
      : opts.rowCols;
    const changeAt = bars <= 2 ? 1 : (rowColsHint && rowColsHint > 1 ? 1 : Math.max(1, Math.floor(bars / 2)));
    const secondRun = bars <= 2 ? 1 : Math.max(2, Math.min(bars - changeAt, rowColsHint && rowColsHint > 1 ? rowColsHint : 3));
    for (let measure = 0; measure < bars; measure += 1) {
      if (bars <= 2) fallback.push(measure === 0 ? first : second);
      else if (measure >= changeAt && measure < changeAt + secondRun) fallback.push(second);
      else fallback.push(first);
    }
    return fallback;
  }

  function configureRoundMeter(state, options) {
    const meters = generateChangingMeterSequence(state, options);
    state.measureMeters = meters;
    if (meters && meters.length) {
      state.timeSignature = meters[0];
      state.beatsPerMeasure = maxBeatsPerMeasure(state);
    } else {
      state.measureMeters = null;
      state.timeSignature = chooseSingleMeterForRound(state);
      state.beatsPerMeasure = beatsForTimeSignature(state.timeSignature, state.level && state.level.beatUnit)
        || state.beatsPerMeasure;
    }
    state.totalBeats = totalBeatsForState(state);
  }

  function rebuildBlankChangingRoundForRows(state, rowCols) {
    if (!state || !isChangingMeterState(state) || !state.level || !state.level.changeKind) return false;
    if (state.submitted || state.solved || (state.userTouched && state.userTouched.size)) return false;
    if (changingMeterSequenceIsUsable(state.measureMeters, rowCols)) return false;
    configureRoundMeter(state, { rowCols });
    state.target = generateBeatTarget(state);
    state.answerKey = answerKeyFromTarget(state, state.target);
    state.placements = new Array(state.totalBeats).fill(null);
    state.resultMarks.clear();
    return true;
  }

  function freeListenBudget(state) {
    const band = (state.level && state.level.difficultyBand) || "intermediate";
    const base = beatScoring.freeListenBaseByBand[band] ?? beatScoring.freeListenBaseByBand.intermediate;
    const bars = [2, 4, 8, 16].reduce((best, value) => {
      return Math.abs(value - state.bars) < Math.abs(best - state.bars) ? value : best;
    }, 2);
    return base + (beatScoring.freeListenLengthBonus[bars] || 0);
  }

  function applyGrooveLoss(els, state, amount, options) {
    const opts = options || {};
    const loss = Math.max(0, Number(amount) || 0);
    if (!loss) return false;
    state.groove = Math.max(0, state.groove - loss);
    floatBeatDelta("-" + loss, false, opts.anchor || els.groove, opts.floatClass || "");
    updateBeatStatus(els, state);
    return true;
  }

  function maybeChargeExtraListen(els, state) {
    const free = freeListenBudget(state);
    const extraListens = Math.max(0, state.listens - free);
    if (!extraListens || extraListens <= state.roundStats.extraListensCharged) return;
    state.roundStats.extraListensCharged = extraListens;
    applyGrooveLoss(els, state, beatScoring.extraListenGroovePenalty, {
      anchor: els.groove,
      floatClass: "is-hint-cost"
    });
  }

  function calculateBeatRoundScore(state, clean) {
    const wrongAttempts = state.roundStats.wrongAttempts || 0;
    const completionXp = beatScoring.completionXp;
    const performanceBonus = beatScoring.performanceMax;
    const streakBonus = clean ? Math.min(beatScoring.streakCap, state.streak * beatScoring.streakStep) : 0;
    const basePoints = completionXp + performanceBonus + streakBonus;
    const independenceMultiplier = beatScoring.independenceFloor + (state.groove / 100) * (1 - beatScoring.independenceFloor);
    const points = Math.max(completionXp, Math.round(basePoints * independenceMultiplier));
    return {
      points,
      completionXp,
      performanceBonus,
      streakBonus,
      wrongAttempts,
      groove: Math.round(state.groove),
      independenceMultiplier: Number(independenceMultiplier.toFixed(3))
    };
  }

  function shouldEnableBeatAdaptive(params) {
    const value = String(params.get("adaptive") || params.get("model") || "").toLowerCase();
    return value === "1" || value === "true" || value === "v1" || value === "recommended";
  }

  function makeBeatAdaptiveState(enabled) {
    return {
      enabled,
      formula: beatAdaptiveFormula,
      figureMastery: new Map(),
      completedLevels: new Set(),
      checkpointedLevels: new Set(),
      pending: null,
      levelStats: null
    };
  }

  function resetBeatAdaptiveLevel(state) {
    if (!state || !state.adaptive || !state.adaptive.enabled) return;
    state.adaptive.pending = null;
    state.adaptive.levelStats = {
      levelNumber: state.levelNumber,
      examples: 0,
      stageRounds: { 2: 0, 4: 0, 8: 0 },
      stageHistory: { 2: [], 4: [], 8: [] },
      allRounds: [],
      stageCheckpointed: { 2: false, 4: false, 8: false }
    };
  }

  function beatAdaptiveStatsForRounds(state, rounds) {
    const adaptive = state && state.adaptive;
    const total = rounds.length;
    const correct = rounds.filter((round) => round.correct).length;
    const clean = rounds.filter((round) => round.clean).length;
    const independentCorrect = rounds.filter((round) => round.correct && round.independence >= 70 && round.attempts === 1).length;
    const independence = total ? averageNumber(rounds.map((round) => round.independence)) : 0;
    const scores = (state.levelFigures || [])
      .filter((id) => beatPatternMap.has(id))
      .map((id) => adaptive.figureMastery.get(id) || 0);
    return {
      total,
      correct,
      clean,
      independentCorrect,
      independence,
      avgFigure: scores.length ? averageNumber(scores) : 0,
      weakestFigure: scores.length ? Math.min(...scores) : 0
    };
  }

  function averageNumber(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  function beatAdaptiveStageStats(state) {
    const stats = state.adaptive && state.adaptive.levelStats;
    return beatAdaptiveStatsForRounds(state, stats ? stats.stageHistory[state.bars] || [] : []);
  }

  function beatAdaptiveLevelStats(state) {
    const stats = state.adaptive && state.adaptive.levelStats;
    return beatAdaptiveStatsForRounds(state, stats ? stats.allRounds : []);
  }

  function beatAdaptiveHintCount(state) {
    let count = 0;
    if (state.roundStats) {
      count += state.roundStats.countHintsUsed || 0;
      count += state.roundStats.hearHintsUsed || 0;
    }
    if (state.chargedHints) {
      if (state.chargedHints.has("narrow")) count += 1;
      if (state.chargedHints.has("mistakes")) count += 1;
    }
    return count;
  }

  function beatAdaptiveRoundIndependence(state) {
    const hints = beatAdaptiveHintCount(state);
    const extraListens = Math.max(0, (state.listens || 0) - freeListenBudget(state));
    return clamp(0, 100,
      100
      - hints * 14
      - extraListens * 6
      - Math.max(0, (state.attempts || 1) - 1) * 8
      - Math.max(0, (state.listens || 0) - 1) * 1.5
    );
  }

  function beatAdaptiveRoundClean(state) {
    return state.attempts === 1
      && !state.wrongThisRound
      && beatAdaptiveHintCount(state) === 0
      && (state.listens || 0) <= freeListenBudget(state);
  }

  function targetFigureIds(state) {
    const ids = [];
    (state.target || []).forEach((measure) => {
      (measure || []).forEach((item) => {
        if (item && item.patternId) ids.push(item.patternId);
      });
    });
    return ids;
  }

  function recordBeatAdaptiveRound(state, correct, clean) {
    if (!state || !state.adaptive || !state.adaptive.enabled) return null;
    if (!state.adaptive.levelStats || state.adaptive.levelStats.levelNumber !== state.levelNumber) {
      resetBeatAdaptiveLevel(state);
    }
    const stats = state.adaptive.levelStats;
    const round = {
      correct,
      clean,
      bars: state.bars,
      attempts: state.attempts,
      hints: beatAdaptiveHintCount(state),
      listens: state.listens || 0,
      independence: beatAdaptiveRoundIndependence(state),
      figures: targetFigureIds(state)
    };
    updateBeatAdaptiveFigureMastery(state, round);
    stats.examples += 1;
    stats.stageRounds[state.bars] = (stats.stageRounds[state.bars] || 0) + 1;
    if (!stats.stageHistory[state.bars]) stats.stageHistory[state.bars] = [];
    stats.stageHistory[state.bars].push(round);
    stats.allRounds.push(round);
    state.adaptive.pending = beatAdaptiveNextAction(state);
    return state.adaptive.pending;
  }

  function updateBeatAdaptiveFigureMastery(state, round) {
    const unique = Array.from(new Set(round.figures || []));
    const barMultiplier = state.bars >= 8 ? 1.18 : state.bars >= 4 ? 1.05 : 0.9;
    const quality = round.clean ? 16 : round.correct ? 10 : 4;
    unique.forEach((id) => {
      const oldScore = state.adaptive.figureMastery.get(id) || 0;
      const gain = quality * (round.independence / 100) * barMultiplier;
      const penalty = round.correct ? 0 : 5;
      state.adaptive.figureMastery.set(id, clamp(0, 100, oldScore + gain - penalty));
    });
  }

  function beatAdaptiveStageShouldAdvance(state) {
    const formula = state.adaptive.formula;
    const stage = beatAdaptiveStageStats(state);
    if (state.bars === 2) {
      return (stage.clean >= 1 && stage.avgFigure >= formula.avgStage2)
        || stage.correct >= 3
        || stage.total >= formula.stageMax[2];
    }
    if (state.bars === 4) {
      return (stage.clean >= 2 && stage.avgFigure >= formula.avgStage4Clean)
        || (stage.independentCorrect >= 2 && stage.avgFigure >= formula.avgStage4Independent)
        || (stage.correct >= 5 && stage.avgFigure >= formula.avgStage4Correct)
        || stage.total >= formula.stageMax[4];
    }
    return false;
  }

  function beatAdaptiveLevelPasses(state) {
    const formula = state.adaptive.formula;
    const stage = beatAdaptiveStageStats(state);
    const level = beatAdaptiveLevelStats(state);
    const enoughLongWork = (state.adaptive.levelStats.stageRounds[8] || 0) >= 2;
    const proofAtLength = stage.clean >= 1
      || stage.independentCorrect >= 2
      || (stage.correct >= 4 && stage.independence >= 52);
    const coverage = level.avgFigure >= formula.passAvgFigure && level.weakestFigure >= formula.passWeakestFigure;
    const independence = level.independence >= formula.passLevelIndependence || stage.independence >= formula.passStageIndependence;
    const safetyValve = state.adaptive.levelStats.examples >= formula.hardMax
      && state.bars === 8
      && level.avgFigure >= formula.safetyAvgFigure
      && level.weakestFigure >= formula.safetyWeakestFigure
      && stage.correct >= formula.safetyStageCorrect;
    return state.bars === 8 && enoughLongWork && ((proofAtLength && coverage && independence) || safetyValve);
  }

  function beatAdaptiveNextAction(state) {
    const adaptive = state.adaptive;
    const stats = adaptive.levelStats;
    if (beatAdaptiveLevelPasses(state)) {
      return { type: "level-complete" };
    }
    if (state.bars < 8 && beatAdaptiveStageShouldAdvance(state)) {
      return { type: "ramp", bars: state.bars === 2 ? 4 : 8 };
    }
    if (stats.examples >= adaptive.formula.hardMax) {
      return { type: "checkpoint" };
    }
    return { type: "continue" };
  }

  function beatAdaptiveMessage(state, action) {
    if (!state || !state.adaptive || !state.adaptive.enabled || !action) return "";
    const level = beatAdaptiveLevelStats(state);
    if (action.type === "level-complete") {
      return "Level complete. Avg mastery " + Math.round(level.avgFigure) + " / weakest " + Math.round(level.weakestFigure) + ".";
    }
    if (action.type === "checkpoint") {
      return "Checkpoint reached. Progress saved; weak rhythms will keep showing up.";
    }
    if (action.type === "ramp") {
      return "Adaptive ramp: next example is " + action.bars + " measures.";
    }
    return "Adaptive model is targeting weak rhythms.";
  }

  function advanceBeatAdaptiveBeforeRound(els, state) {
    if (!state.adaptive || !state.adaptive.enabled) return "";
    const action = state.adaptive.pending || { type: "continue" };
    if (action.type === "ramp") {
      state.bars = action.bars;
      state.totalBeats = totalBeatsForState(state);
      state.adaptive.pending = null;
      return "Now try " + action.bars + " measures.";
    }
    if (action.type === "level-complete" || action.type === "checkpoint") {
      if (action.type === "level-complete") state.adaptive.completedLevels.add(state.levelNumber);
      if (action.type === "checkpoint") state.adaptive.checkpointedLevels.add(state.levelNumber);
      const advanced = advanceBeatToNextPlayableLevel(state);
      state.adaptive.pending = null;
      if (advanced) {
        return action.type === "checkpoint"
          ? "Checkpoint saved. Moving on, with weak rhythms remembered."
          : "New level unlocked.";
      }
      return action.type === "checkpoint"
        ? "Checkpoint saved. Continuing repair rounds."
        : "Top level complete. Keep practicing for mastery.";
    }
    state.adaptive.pending = null;
    return "";
  }

  function advanceBeatToNextPlayableLevel(state) {
    const currentIndex = beatGuidedLevels.findIndex((level) => level.number === state.levelNumber);
    const next = beatGuidedLevels.slice(currentIndex + 1).find((level) => level.figures.length > 0);
    if (!next) return false;
    state.level = next;
    state.levelNumber = next.number;
    state.requestedLevelNumber = next.number;
    state.levelTitle = next.title;
    state.levelFigures = next.figures.slice();
    state.fixedMeter = "";
    state.meterCursor = 0;
    const meterChoice = meterChoiceForLevel(next, "");
    state.timeSignature = meterChoice.timeSignature;
    state.beatsPerMeasure = meterChoice.beatsPerMeasure;
    state.bars = 2;
    state.measureMeters = null;
    state.measureCols = 4;
    state.measureRows = null;
    resetBeatAdaptiveLevel(state);
    return true;
  }

  function initBeatQuest() {
    const els = {
      device: document.querySelector(".quest-device"),
      rail: document.querySelector(".thin-rail"),
      frame: document.getElementById("beatFrame"),
      stage: document.querySelector(".rhythm-stage"),
      board: document.getElementById("rhythmBoard"),
      bankPanel: document.querySelector(".rhythm-bank-panel"),
      bank: document.getElementById("rhythmBank"),
      play: document.getElementById("beatPlay"),
      transportToggle: document.getElementById("beatTransportToggle"),
      tapBack: document.getElementById("beatTapBack"),
      speedControl: document.querySelector(".speed-control"),
      speedButtons: Array.from(document.querySelectorAll(".speed-control [data-speed]")),
      submit: document.getElementById("beatSubmit"),
      next: document.getElementById("beatNext"),
      reset: document.getElementById("beatReset"),
      filled: document.getElementById("beatFilled"),
      groove: document.getElementById("beatGroove"),
      points: document.getElementById("beatPoints"),
      streak: document.getElementById("beatStreak"),
      readout: document.getElementById("beatReadout"),
      message: document.getElementById("beatMessage"),
      bankCount: document.getElementById("beatBankCount"),
      metro: document.getElementById("beatMetro"),
      guide: document.getElementById("beatGuide"),
      hintsToggle: document.getElementById("beatHintsToggle"),
      hintsMenu: document.getElementById("beatHintsMenu"),
      hintNarrow: document.getElementById("beatHintNarrow"),
      hintCount: document.getElementById("beatHintCount"),
      hintHear: document.getElementById("beatHintHear"),
      hintMistakes: document.getElementById("beatHintMistakes"),
      tapOverlay: document.getElementById("beatTapOverlay"),
      tapZones: document.getElementById("beatTapZones"),
      tapClose: document.getElementById("beatTapClose"),
      tapStaff: document.getElementById("beatTapStaff"),
      tapStart: document.getElementById("beatTapStart"),
      tapTempoDown: document.getElementById("beatTapTempoDown"),
      tapTempoUp: document.getElementById("beatTapTempoUp"),
      tapTempoVal: document.getElementById("beatTapTempoVal"),
      tapInstruct: document.getElementById("beatTapInstruct"),
      tapBeat: document.getElementById("beatTapBeat"),
      tapRhythm: document.getElementById("beatTapRhythm"),
      tapCountoff: document.getElementById("beatTapCountoff"),
      tapResults: document.getElementById("beatTapResults"),
      tapSetup: document.getElementById("beatTapSetup"),
      tapMeta: document.getElementById("beatTapMeta"),
      levelChip: document.querySelector(".readouts .lcd-chip:last-child"),
      frameLevel: document.querySelector(".frame-level b"),
      displayLabel: document.querySelector(".display-label"),
      devJumper: document.getElementById("beatDevJumper"),
      devDrawerToggle: document.getElementById("beatDevDrawerToggle"),
      devDrawerLevel: document.getElementById("beatDevDrawerLevel"),
      devLevelScroll: document.getElementById("beatDevLevelScroll"),
      devLevel: document.getElementById("beatDevLevel"),
      devBars: document.getElementById("beatDevBars"),
      devMeter: document.getElementById("beatDevMeter"),
      devRenderer: document.getElementById("beatDevRenderer")
    };
    const params = new URLSearchParams(window.location.search);
    const devMode = params.get("dev") !== "0";
    const requestedLevel = clamp(1, beatGuidedLevels.length, Number(params.get("level") || 1) || 1);
    const guidedLevel = resolveBeatGuidedLevel(requestedLevel);
    const requestedBars = clamp(2, 16, Number(params.get("bars") || params.get("measures") || 2) || 2);
    const requestedMeter = params.get("meter") || params.get("timeSignature");
    const meterChoice = meterChoiceForLevel(guidedLevel, requestedMeter);
    const fixedMeter = fixedMeterForLevel(guidedLevel, requestedMeter);
    const answerRenderer = normalizeBeatRendererMode(params.get("renderer"));
    const railMode = String(params.get("rail") || params.get("floatingrail") || "").toLowerCase();
    const adaptiveEnabled = shouldEnableBeatAdaptive(params);

    const state = {
      level: guidedLevel,
      levelNumber: guidedLevel.number,
      requestedLevelNumber: requestedLevel,
      levelTitle: guidedLevel.title,
      levelFigures: guidedLevel.figures.slice(),
      timeSignature: meterChoice.timeSignature,
      fixedMeter,
      meterCursor: 0,
      beatsPerMeasure: meterChoice.beatsPerMeasure,
      bars: requestedBars,
      totalBeats: requestedBars * meterChoice.beatsPerMeasure,
      measureMeters: null,
      measureCols: 4,
      placements: new Array(requestedBars * meterChoice.beatsPerMeasure).fill(null),
      answerKey: new Array(requestedBars * meterChoice.beatsPerMeasure).fill(null),
      target: [],
      userTouched: new Set(),
      attempts: 0,
      playing: false,
      dragPattern: null,
      touchTile: null,
      dragPreview: null,
      dragPreviewMetrics: null,
      dragTouchX: 0,
      dragTouchY: 0,
      dragRaf: 0,
      dragDropZones: [],
      dragHighlightCells: [],
      dragLastHighlightAt: 0,
      currentDropZone: null,
      currentDropId: null,
      touchDragging: false,
      submitted: false,
      metronome: true,
      beatGuide: true,
      speed: "medium",
      tempoBpm: 100,
      narrowed: false,
      pickMode: null,
      solved: false,
      groove: 100,
      score: 0,
      streak: 0,
      listens: 0,
      tapBackActive: false,
      tapBackStart: 0,
      tapBackTaps: [],
      tapBackBeatTaps: [],
      tapBackTimer: null,
      tapBackTimers: [],
      tapBackMetroTimer: null,
      tapBackMetroRun: 0,
      tapBackPhase: "idle",
      tapBackBeatTimes: [],
      tapBackBeatIndex: 0,
      tapBackNextBeatTime: 0,
      tapBackLockStreak: 0,
      tapBackConfirmStreak: 0,
      tapBackLastBeatTapIndex: -1,
      tapBackCaptureStart: 0,
      tapBackCaptureStartIndex: -1,
      tapBackDone: false,
      tapBackOpen: false,
      tapBackTempo: 100,
      tapBackBestBonus: 0,
      tapBackAnswerSnapshot: [],
      devMode,
      devDrawerOpen: params.get("devdrawer") === "open",
      forceCompactTransport: params.get("phonecontrols") === "1" || params.get("compactcontrols") === "1",
      floatingTransport: railMode === "floating" || railMode === "auto" || railMode === "1",
      forceFloatingTransport: railMode === "force" || railMode === "forced" || params.get("forcefloatingrail") === "1",
      transportCollapsed: params.get("controls") === "collapsed",
      answerRenderer,
      adaptive: makeBeatAdaptiveState(adaptiveEnabled),
      wrongThisRound: false,
      resultMarks: new Set(),
      chargedHints: new Set(),
      roundStats: makeBeatRoundStats()
    };

    resetBeatAdaptiveLevel(state);
    newBeatRound(els, state, { reveal: params.get("answers") === "1", skipRender: true });
    if (params.get("beamtest") === "1") {
      loadBeamTestRound(state);
    }
    if (params.get("compoundtest") === "1") {
      loadCompoundBeamTestRound(state);
    }
    if (params.get("dhtest") === "1") {
      loadDottedHalfBeamTestRound(state);
    }
    if (params.get("detest") === "1") {
      loadDottedEighthBeamTestRound(state);
    }

    if (els.reset) els.reset.appendChild(icon("restart", 18));
    els.metro.prepend(icon("metro", 16));
    els.guide.prepend(icon("guide", 16));
    els.hintsToggle.prepend(icon("bulb", 16));
    els.hintNarrow.prepend(icon("filter", 16));
    els.hintCount.prepend(icon("count", 16));
    els.hintHear.prepend(icon("hear", 16));
    els.hintMistakes.prepend(icon("search", 16));

    if (els.reset) {
      els.reset.addEventListener("click", () => {
        stopTapBackBonus(els, state);
        state.placements.fill(null);
        state.userTouched.clear();
        state.submitted = false;
        state.solved = false;
        state.resultMarks.clear();
        state.narrowed = false;
        state.pickMode = null;
        renderBeatBoard(els, state);
        updateBeatStatus(els, state);
        updateBeatHints(els, state, "Answer cleared.");
      });
    }

    els.play.addEventListener("click", () => {
      if (state.transportCollapsed && compactTransportApplies(state)) {
        setBeatTransportCollapsed(els, state, false);
      }
      if (state.tapBackOpen) {
        startTapBackBonus(els, state);
        return;
      }
      playBeatRhythm(els, state);
    });

    if (els.tapBack) {
      els.tapBack.addEventListener("click", () => {
        if (!state.solved || state.tapBackDone) return;
        openTapBackOverlay(els, state);
      });
    }

    if (els.tapClose) els.tapClose.addEventListener("click", () => closeTapBackOverlay(els, state));
    if (els.tapStart) els.tapStart.addEventListener("click", () => startTapBackBonus(els, state));
    bindTapBackInput(els.tapRhythm, () => recordTapBack(els, state));
    bindTapBackInput(els.tapBeat, () => recordTapBeat(els, state));
    if (els.tapTempoDown) els.tapTempoDown.addEventListener("click", () => nudgeTapTempo(els, state, -4));
    if (els.tapTempoUp) els.tapTempoUp.addEventListener("click", () => nudgeTapTempo(els, state, 4));

    els.speedButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (state.playing) return;
        const speed = button.dataset.speed || "medium";
        if (speed === state.speed) {
          cycleBeatSpeed(els, state);
          return;
        }
        setBeatSpeed(els, state, speed);
      });
    });
    setupFloatingSpeedScroller(els, state);

    els.metro.addEventListener("click", () => {
      state.metronome = !state.metronome;
      updateBeatStatus(els, state);
      updateBeatHints(els, state, state.metronome ? "Metronome on." : "Metronome off.");
    });

    els.guide.addEventListener("click", () => {
      state.beatGuide = !state.beatGuide;
      updateBeatStatus(els, state);
      updateBeatHints(els, state, state.beatGuide ? "Beat guide on." : "Beat guide off.");
    });

    els.hintsToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleBeatHintMenu(els);
    });

    els.hintNarrow.addEventListener("click", () => {
      if (!state.narrowed) chargeBeatHint(els, state, "narrow", hintCosts.narrow, { once: true });
      state.narrowed = !state.narrowed;
      closeBeatHintMenu(els);
      updateBeatStatus(els, state);
      updateBeatHints(els, state, state.narrowed ? "Bank narrowed to figures used in this example." : "Full bank restored.");
    });

    els.hintCount.addEventListener("click", () => {
      closeBeatHintMenu(els);
      armBeatPick(els, state, "count");
    });

    els.hintHear.addEventListener("click", () => {
      closeBeatHintMenu(els);
      armBeatPick(els, state, "hear");
    });

    els.hintMistakes.addEventListener("click", () => {
      if (state.chargedHints.has("mistakes")) {
        closeBeatHintMenu(els);
        updateBeatHints(els, state, "Find mistakes was already used on this example.");
        updateBeatStatus(els, state);
        return;
      }
      chargeBeatHint(els, state, "mistakes", hintCosts.mistakes, { once: true });
      state.pickMode = null;
      closeBeatHintMenu(els);
      clearBeatHintMarks(els);
      let markIndex = state.placements.findIndex((value) => !value);
      if (markIndex < 0) {
        const result = checkBeatAnswer(state);
        markIndex = result.wrong[0] ?? -1;
      }
      const zone = els.board.querySelector('[data-beat="' + (markIndex >= 0 ? markIndex : 0) + '"]');
      if (zone && markIndex >= 0) zone.classList.add("is-hint-mark");
      updateBeatStatus(els, state);
      updateBeatHints(els, state, markIndex >= 0 ? "A beat to check is highlighted." : "No missing beats. Ready to submit.");
    });

    els.submit.addEventListener("click", () => {
      if (els.submit.disabled) return;
      submitBeatAnswer(els, state);
    });

    if (els.next) {
      els.next.addEventListener("click", () => {
        const previousLevel = state.levelNumber;
        const message = advanceBeatAdaptiveBeforeRound(els, state);
        newBeatRound(els, state, { message });
        if (state.levelNumber !== previousLevel) renderBeatBank(els, state);
      });
    }

    setupBeatDevJumper(els, state);
    setupBeatTransportDrawer(els, state);
    renderBeatBank(els, state);
    renderBeatBoard(els, state);
    updateBeatStatus(els, state);
    if (params.get("tapback") === "1" || params.get("tap-smoke") === "1") {
      state.placements = cloneBeatPlacements(state.answerKey);
      for (let beat = 0; beat < state.totalBeats; beat += 1) state.userTouched.add(beat);
      state.solved = true;
      renderBeatBoard(els, state);
      updateBeatStatus(els, state);
      openTapBackOverlay(els, state);
    }
    if (params.get("replace-preview") === "1") {
      const previewReplacement = () => requestAnimationFrame(() => showBeatReplacementPreview(els));
      requestAnimationFrame(previewReplacement);
      window.setTimeout(previewReplacement, 260);
      window.setTimeout(previewReplacement, 900);
    }
    document.addEventListener("touchmove", (event) => {
      if (!state.dragPattern || !state.dragPreview) return;
      event.preventDefault();
      const touch = event.touches[0];
      if (!touch) return;
      state.dragTouchX = touch.clientX;
      state.dragTouchY = touch.clientY;
      scheduleTouchDragFrame(els, state);
    }, { passive: false });

    document.addEventListener("touchend", (event) => {
      if (!state.dragPattern) return;
      event.preventDefault();
      flushTouchDragFrame(els, state, { forceHighlight: true });
      const zone = state.dragPreview ? dropZoneUnderPreview(state) : null;
      if (zone) {
        placeBeatPattern(els, state, state.dragPattern, Number(zone.dataset.beat));
      }
      endBeatDrag(els, state);
    }, { passive: false });

    document.addEventListener("touchcancel", () => endBeatDrag(els, state));

    const scheduleFit = makeRafScheduler(() => fitBeatLayout(els, state));
    window.addEventListener("resize", () => {
      markPlacedVexPending(els.board);
      updateBeatTransportDrawer(els, state);
      positionBeatHintMenu(els);
      scheduleFit();
    });
    updateBeatTransportDrawer(els, state);
    requestAnimationFrame(scheduleFit);
    setTimeout(scheduleFit, 120);
  }

  function compactTransportApplies(state) {
    if (floatingTransportApplies(state)) return false;
    if (state && state.forceCompactTransport) return true;
    if (!window.matchMedia) return false;
    return window.matchMedia("(max-width: 700px), (max-height: 620px)").matches;
  }

  function floatingTransportApplies(state) {
    if (!state) return false;
    if (state.forceFloatingTransport) return true;
    if (!state.floatingTransport || !window.matchMedia) return false;

    // Auto floating rail is intended for phone-sized long examples only.
    // iPad/tablet/desktop should keep the normal top controls unless rail=force is used.
    const phoneViewport = window.matchMedia("(max-width: 700px), (max-height: 460px) and (max-width: 980px)").matches;
    if (!phoneViewport) return false;

    const measureCount = getMeasureCount(state);
    const veryCrampedPhone = window.matchMedia("(max-width: 380px), (max-height: 390px)").matches;
    return measureCount >= 8 || (veryCrampedPhone && measureCount >= 4);
  }

  function updateBeatTransportDrawer(els, state) {
    if (!els || !els.device) return;
    const floating = floatingTransportApplies(state);
    const compact = compactTransportApplies(state);
    els.device.classList.toggle("has-floating-rail", floating);
    els.device.classList.toggle("has-collapsible-rail", compact);
    if (!compact || floating) state.transportCollapsed = false;
    els.device.classList.toggle("is-controls-collapsed", compact && state.transportCollapsed);
    if (els.transportToggle) {
      const expanded = compact && !state.transportCollapsed;
      els.transportToggle.hidden = !compact;
      els.transportToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      els.transportToggle.setAttribute("aria-label", state.transportCollapsed ? "Show controls" : "Hide controls");
    }
    requestAnimationFrame(() => updateFloatingRailPosition(els, state));
  }

  function updateFloatingRailPosition(els, state) {
    if (!els || !els.device || !els.rail) return;
    if (!floatingTransportApplies(state)) {
      els.device.style.removeProperty("--floating-rail-top");
      els.device.style.removeProperty("--floating-rail-y");
      return;
    }
    const frame = els.frame;
    if (!frame) return;
    const deviceRect = els.device.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const railRect = els.rail.getBoundingClientRect();
    if (!deviceRect.height || !frameRect.height || !railRect.height) return;
    const frameTop = frameRect.top - deviceRect.top;
    const frameBottom = frameRect.bottom - deviceRect.top;
    const desiredTop = frameTop + frameRect.height / 2 - railRect.height / 2;
    const minTop = Math.max(8, frameTop + 8);
    const maxTop = Math.max(minTop, Math.min(deviceRect.height - railRect.height - 8, frameBottom - railRect.height - 8));
    const top = clamp(minTop, maxTop, desiredTop);
    els.device.style.setProperty("--floating-rail-top", Math.round(top) + "px");
    els.device.style.setProperty("--floating-rail-y", "0");
  }

  function setBeatTransportCollapsed(els, state, collapsed) {
    if (!compactTransportApplies(state)) return;
    state.transportCollapsed = !!collapsed;
    updateBeatTransportDrawer(els, state);
    requestAnimationFrame(() => fitBeatLayout(els, state));
  }

  function setupBeatTransportDrawer(els, state) {
    if (!els || !els.rail) return;
    if (els.transportToggle) {
      els.transportToggle.addEventListener("click", (event) => {
        event.stopPropagation();
        setBeatTransportCollapsed(els, state, !state.transportCollapsed);
      });
    }

    let touchStartY = null;
    els.rail.addEventListener("touchstart", (event) => {
      const touch = event.touches && event.touches[0];
      touchStartY = touch ? touch.clientY : null;
    }, { passive: true });
    els.rail.addEventListener("touchend", (event) => {
      if (touchStartY === null) return;
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) {
        touchStartY = null;
        return;
      }
      const deltaY = touch.clientY - touchStartY;
      touchStartY = null;
      if (Math.abs(deltaY) < 28) return;
      event.preventDefault();
      setBeatTransportCollapsed(els, state, deltaY < 0);
    }, { passive: false });
  }

  function renderBeatBank(els, state) {
    clear(els.bank);
    activeBeatPatterns(state).forEach((pattern) => {
      const tile = document.createElement("button");
      tile.className = "rhythm-tile";
      tile.type = "button";
      tile.draggable = true;
      tile.dataset.pattern = pattern.id;
      tile.setAttribute("aria-label", pattern.label);

      const img = document.createElement("img");
      img.src = rhythmBankAsset(pattern.id);
      img.alt = "";
      tile.appendChild(img);

      tile.addEventListener("dragstart", (event) => {
        state.dragPattern = pattern.id;
        state.touchTile = tile;
        tile.classList.add("dragging");
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("text/plain", pattern.id);
          const dragImage = buildDragImage(tile, pattern);
          event.dataTransfer.setDragImage(dragImage, 52, 35);
          setTimeout(() => dragImage.remove(), 0);
        }
      });

      tile.addEventListener("dragend", () => endBeatDrag(els, state));

      tile.addEventListener("touchstart", (event) => {
        const touch = event.touches[0];
        if (!touch) return;
        event.preventDefault();
        state.dragPattern = pattern.id;
        state.touchTile = tile;
        state.touchDragging = true;
        state.dragTouchX = touch.clientX;
        state.dragTouchY = touch.clientY;
        document.body.classList.add("uses-touch-input");
        document.body.classList.add("is-touch-dragging");
        tile.classList.add("dragging");
        state.dragPreview = buildDragImage(tile, pattern);
        state.dragPreviewMetrics = measureDragPreview(state.dragPreview);
        state.dragDropZones = collectDragDropZones(els);
        state.dragLastHighlightAt = 0;
        updateDragPreview(state.dragPreview, state.dragTouchX, state.dragTouchY);
        scheduleTouchDragFrame(els, state);
      }, { passive: false });

      els.bank.appendChild(tile);
    });
  }

  function makeTimeSignatureElement(timeSignature, className) {
    const sig = document.createElement("div");
    sig.className = className || "time-signature";
    sig.setAttribute("aria-label", timeSignature || "4/4");
    const sigParts = String(timeSignature || "4/4").split("/");
    const top = document.createElement("span");
    top.textContent = sigParts[0] || "4";
    const bottom = document.createElement("span");
    bottom.textContent = sigParts[1] || "4";
    sig.append(top, bottom);
    return sig;
  }

  function defaultMeasureRows(state, measuresPerRow) {
    const rows = [];
    const measures = getMeasureCount(state);
    const cols = Math.max(1, Math.min(measures, measuresPerRow || state.measureCols || 4));
    for (let first = 0; first < measures; first += cols) {
      const row = [];
      for (let measure = first; measure < Math.min(measures, first + cols); measure += 1) row.push(measure);
      rows.push(row);
    }
    return rows;
  }

  function measureRowsForRender(state) {
    if (isChangingMeterState(state) && Array.isArray(state.measureRows) && state.measureRows.length) {
      return state.measureRows;
    }
    return defaultMeasureRows(state, state.measureCols || 4);
  }

  function measureNeedsInlineTimeSignature(state, measure) {
    if (!isChangingMeterState(state) || measure <= 0) return false;
    return timeSignatureForMeasure(state, measure) !== timeSignatureForMeasure(state, measure - 1);
  }

  function rowLayoutKey(rows) {
    return Array.isArray(rows) ? rows.map((row) => Array.isArray(row) ? row.join(",") : "").join("|") : "";
  }

  function measureRenderWidth(state, measure, slotW, slotGap, measurePad) {
    const beats = Math.max(1, measureBeatCount(state, measure));
    return beats * slotW
      + Math.max(0, beats - 1) * slotGap
      + (measurePad * 2)
      + 8;
  }

  function smartMeasureRows(state, availableW, slotW, measureGap, measurePad, slotGap, inlineSigW) {
    const rows = [];
    let row = [];
    let rowW = 0;
    let childCount = 0;
    const measures = getMeasureCount(state);

    const addLaneChild = (width) => {
      rowW += (childCount ? measureGap : 0) + width;
      childCount += 1;
    };

    for (let measure = 0; measure < measures; measure += 1) {
      const measureW = measureRenderWidth(state, measure, slotW, slotGap, measurePad);
      const needsSignature = measureNeedsInlineTimeSignature(state, measure);
      const signatureMovesToRowSlot = !row.length && needsSignature;
      const widths = signatureMovesToRowSlot ? [measureW] : (needsSignature ? [inlineSigW, measureW] : [measureW]);
      const addedW = widths.reduce((total, width) => total + width, 0)
        + Math.max(0, widths.length - 1) * measureGap;
      const nextW = rowW + (childCount ? measureGap : 0) + addedW;

      if (row.length && nextW > availableW) {
        rows.push(row);
        row = [];
        rowW = 0;
        childCount = 0;
      }

      const rowStartSignature = !row.length && needsSignature;
      const rowWidths = rowStartSignature ? [measureW] : (needsSignature ? [inlineSigW, measureW] : [measureW]);
      rowWidths.forEach(addLaneChild);
      row.push(measure);
    }

    if (row.length) rows.push(row);
    return rows;
  }

  function chooseSmartChangingLayout(state, availableW, availableH, measureGap, measurePad, slotGap, inlineSigW, options) {
    const opts = options || {};
    const maxMeasureBeats = maxBeatsPerMeasure(state);
    const measureCount = getMeasureCount(state);
    const readableSlot = opts.tapBackLayout
      ? (opts.stageWidth < 760 || opts.stageHeight < 420 ? 36 : 46)
      : (opts.phonePortrait || opts.compactTransport || measureCount >= 8)
        ? (maxMeasureBeats <= 2 ? 50 : 42)
        : 38;
    const candidates = [];

    for (let slotW = 104; slotW >= 22; slotW -= 2) {
      const rows = smartMeasureRows(state, availableW, slotW, measureGap, measurePad, slotGap, inlineSigW);
      const rowCount = rows.length;
      const slotH = Math.round(slotW * 72 / 104);
      const height = rowCount * (slotH + measurePad * 2) + Math.max(0, rowCount - 1) * measureGap;
      if (height > availableH) continue;
      const cols = Math.max(1, ...rows.map((row) => row.length || 1));
      candidates.push({ cols, rowCount, rows, slotW });
    }

    const pool = candidates.filter((candidate) => candidate.slotW >= readableSlot);
    const usable = pool.length ? pool : candidates;
    if (usable.length) {
      return usable.sort((a, b) => {
        if (measureCount >= 8 || opts.phonePortrait || opts.compactTransport) {
          if (b.slotW !== a.slotW) return b.slotW - a.slotW;
          return a.rowCount - b.rowCount;
        }
        if (a.rowCount !== b.rowCount) return a.rowCount - b.rowCount;
        if (b.slotW !== a.slotW) return b.slotW - a.slotW;
        return b.cols - a.cols;
      })[0];
    }

    const rows = defaultMeasureRows(state, state.measureCols || 4);
    return {
      cols: Math.max(1, ...rows.map((row) => row.length || 1)),
      rowCount: rows.length,
      rows,
      slotW: 54
    };
  }

  function renderBeatBoard(els, state) {
    clear(els.board);
    const rows = measureRowsForRender(state);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const rowMeasures = rows[rowIndex];
      const row = document.createElement("div");
      row.className = "staff-row";
      if (isChangingMeterState(state)) row.classList.add("is-changing-meter");
      const sigSlot = document.createElement("div");
      sigSlot.className = "time-signature-slot";
      const firstMeasure = rowMeasures[0] || 0;
      const leadingChangeSignature = isChangingMeterState(state) && measureNeedsInlineTimeSignature(state, firstMeasure);
      const showLeadingSignature = rowIndex === 0 || leadingChangeSignature;
      if (showLeadingSignature) {
        row.classList.add("is-first-row");
        sigSlot.appendChild(makeTimeSignatureElement(
          isChangingMeterState(state) ? timeSignatureForMeasure(state, firstMeasure) : state.timeSignature
        ));
      }
      row.appendChild(sigSlot);

      const lane = document.createElement("div");
      lane.className = "beat-measure-lane";
      lane.style.setProperty("--row-measures", String(rowMeasures.length));

      rowMeasures.forEach((measure, measureOffset) => {
        if (measureOffset > 0 && measureNeedsInlineTimeSignature(state, measure)) {
          lane.appendChild(makeTimeSignatureElement(timeSignatureForMeasure(state, measure), "time-signature inline-time-signature"));
        }
        const group = document.createElement("div");
        renderBeatMeasureGroup(els, state, group, measure);
        lane.appendChild(group);
      });

      row.appendChild(lane);
      els.board.appendChild(row);
    }
  }

  function renderBeatMeasureGroup(els, state, group, measure) {
    const measures = getMeasureCount(state);
    clear(group);
    group.className = "measure-group";
    group.dataset.measure = String(measure + 1);
    const beatsInMeasure = measureBeatCount(state, measure);
    group.style.setProperty("--beats-per-measure", String(beatsInMeasure));
    if (measure === measures - 1) group.classList.add("is-final-measure");
    const measureStart = measureStartIndex(state, measure);
    const measureEnd = Math.min(state.totalBeats, measureEndIndex(state, measure));
    const measureComplete = state.placements
      .slice(measureStart, measureEnd)
      .every(Boolean);
    if (measureComplete) group.classList.add("is-complete");

    const label = document.createElement("span");
    label.className = "measure-number";
    label.textContent = String(measure + 1);
    group.appendChild(label);

    for (let beat = 0; beat < beatsInMeasure; beat += 1) {
      const i = measureStart + beat;
      if (i >= state.totalBeats) break;
      group.appendChild(makeBeatDropZone(els, state, i));
    }
  }

  function renderBeatMeasures(els, state, measures) {
    Array.from(measures)
      .sort((a, b) => a - b)
      .forEach((measure) => {
        const group = els.board.querySelector('.measure-group[data-measure="' + (measure + 1) + '"]');
        if (!group) {
          renderBeatBoard(els, state);
          return;
        }
        renderBeatMeasureGroup(els, state, group, measure);
      });
  }

  function updateBeatMeasureState(els, state, measure) {
    const measures = getMeasureCount(state);
    const group = els.board.querySelector('.measure-group[data-measure="' + (measure + 1) + '"]');
    if (!group) return null;
    const measureStart = measureStartIndex(state, measure);
    const measureEnd = Math.min(state.totalBeats, measureEndIndex(state, measure));
    const measureComplete = state.placements
      .slice(measureStart, measureEnd)
      .every(Boolean);
    group.classList.toggle("is-complete", measureComplete);
    group.classList.toggle("is-final-measure", measure === measures - 1);
    group.style.setProperty("--beats-per-measure", String(measureBeatCount(state, measure)));
    return group;
  }

  function renderBeatCells(els, state, beatIndexes) {
    const measuresToUpdate = new Set();
    let missingCell = false;
    Array.from(beatIndexes)
      .filter((beat) => beat >= 0 && beat < state.totalBeats)
      .sort((a, b) => a - b)
      .forEach((beat) => {
        if (missingCell) return;
        measuresToUpdate.add(measureIndexForBeat(state, beat));
        const current = els.board.querySelector('.beat-drop-zone[data-beat="' + beat + '"]');
        if (!current) {
          missingCell = true;
          renderBeatBoard(els, state);
          return;
        }
        current.replaceWith(makeBeatDropZone(els, state, beat));
      });
    if (missingCell) return;
    measuresToUpdate.forEach((measure) => updateBeatMeasureState(els, state, measure));
  }

  function makeBeatDropZone(els, state, index) {
    const zone = document.createElement("button");
    zone.className = "beat-drop-zone";
    zone.type = "button";
    zone.dataset.beat = String(index);
    zone.setAttribute("aria-label", beatLabel(state, index));

    const num = document.createElement("span");
    num.className = "beat-num";
    num.textContent = String(beatNumberInMeasure(state, index));
    zone.appendChild(num);

    const notation = document.createElement("span");
    notation.className = "beat-notation";
    zone.appendChild(notation);

    const guideFlash = document.createElement("span");
    guideFlash.className = "beat-guide-flash";
    guideFlash.setAttribute("aria-hidden", "true");
    zone.appendChild(guideFlash);

    const placement = state.placements[index];
    if (placement) {
      zone.classList.add(placement.start === index ? "is-filled" : "is-continuation");
      if (placement.start === index) {
        if (placement.beats > 1) {
          zone.classList.add("is-span-head");
          zone.style.setProperty("--span-w", "calc((var(--slot-w) * " + placement.beats + ") + (var(--slot-gap) * " + (placement.beats - 1) + "))");
        }
        notation.appendChild(makePlacedGlyph(state, placement));
      }
    }
    if (state.resultMarks && state.resultMarks.has(index)) {
      zone.classList.add("is-wrong");
    }

    zone.addEventListener("dragover", (event) => {
      if (state.tapBackOpen) return;
      event.preventDefault();
      const id = state.dragPattern || (event.dataTransfer && event.dataTransfer.getData("text/plain"));
      highlightBeatZone(els, state, zone, id);
    });

    zone.addEventListener("dragleave", (event) => {
      if (!els.board.contains(event.relatedTarget)) clearBeatHighlights(els, state);
    });

    zone.addEventListener("drop", (event) => {
      if (state.tapBackOpen) return;
      event.preventDefault();
      const id = state.dragPattern || (event.dataTransfer && event.dataTransfer.getData("text/plain"));
      placeBeatPattern(els, state, id, index);
      endBeatDrag(els, state);
    });

    zone.addEventListener("click", () => {
      if (state.tapBackOpen) return;
      handleBeatZoneClick(els, state, index);
    });

    return zone;
  }

  function makePlacedGlyph(state, placement) {
    const holder = document.createElement("span");
    holder.className = "placed-glyph";
    const vexSpec = beatVexPatterns[placement.id];
    if (shouldRenderPlacedVex(state, placement, vexSpec)) {
      holder.classList.add("uses-vex-renderer", "asset-" + placement.id);
      holder.dataset.renderer = "vexflow";
      if (placement.beats > 1) {
        holder.style.width = "calc((var(--slot-w) * " + placement.beats + ") + (var(--slot-gap) * " + (placement.beats - 1) + "))";
      }
      const host = document.createElement("span");
      host.className = "placed-vex-host";
      host.dataset.pattern = placement.id;
      host.dataset.beats = String(placement.beats);
      host.dataset.start = String(placement.start);
      holder.appendChild(host);
      schedulePlacedVexRender(host, placement);
      return holder;
    }

    const answerAsset = beatAnswerAssets[placement.id];
    if (answerAsset) {
      holder.classList.add("uses-answer-asset", "asset-" + placement.id);
      holder.dataset.renderer = "answer-asset";
      holder.style.width = "calc((var(--slot-w) * " + placement.beats + ") + (var(--slot-gap) * " + (placement.beats - 1) + "))";
      const img = document.createElement("img");
      img.className = "placed-answer-glyph";
      img.src = "assets/rhythm-assets/bank/" + answerAsset;
      img.alt = "";
      img.style.width = "100%";
      holder.appendChild(img);
      return holder;
    }
    const decomposition = beatDecomposition[placement.id];
    if (decomposition) {
      holder.dataset.renderer = "decomposition";
      decomposition.forEach((part) => {
        const file = glyphFiles[part.glyph];
        if (!file) return;
        const img = document.createElement("img");
        img.className = "placed-tiled-glyph";
        img.src = "assets/rhythm-assets/glyphs/" + file;
        img.alt = "";
        img.style.width = "100%";
        img.style.left = (part.offset * 100 - noteheadOffset) + "%";
        holder.appendChild(img);
      });
    } else {
      holder.dataset.renderer = "bank-asset";
      const img = document.createElement("img");
      img.className = "placed-bank-glyph";
      img.src = rhythmAsset(placement.id);
      img.alt = "";
      img.style.width = "100%";
      holder.appendChild(img);
    }

    return holder;
  }

  function placeBeatPattern(els, state, id, startBeat) {
    const pattern = beatPatternMap.get(id);
    if (!pattern || !canPlaceBeatPattern(state, pattern, startBeat)) {
      updateBeatHints(els, state, "That pad does not fit there.");
      return false;
    }
    const touchedStarts = new Set();
    const affectedBeats = new Set();
    for (let i = startBeat; i < startBeat + pattern.beats; i += 1) {
      affectedBeats.add(i);
    }
    for (let i = startBeat; i < startBeat + pattern.beats; i += 1) {
      if (state.placements[i]) {
        touchedStarts.add(state.placements[i].start);
        const oldPlacement = state.placements[i];
        for (let j = oldPlacement.start; j < oldPlacement.start + oldPlacement.beats; j += 1) {
          affectedBeats.add(j);
        }
      }
    }
    touchedStarts.forEach((start) => removeBeatPlacement(state, start));
    const placement = { id: pattern.id, label: pattern.label, beats: pattern.beats, start: startBeat };
    for (let i = startBeat; i < startBeat + pattern.beats; i += 1) {
      state.placements[i] = placement;
      state.userTouched.add(i);
    }
    state.submitted = false;
    state.solved = false;
    state.resultMarks.clear();
    state.pickMode = null;
    clearBeatHintMarks(els);
    renderBeatCells(els, state, affectedBeats);
    updateBeatStatus(els, state);
    return true;
  }

  function removeBeatPlacement(state, start) {
    const placement = state.placements[start];
    if (!placement) return;
    for (let i = placement.start; i < placement.start + placement.beats; i += 1) {
      state.placements[i] = null;
    }
  }

  function canPlaceBeatPattern(state, pattern, startBeat) {
    if (startBeat < 0 || startBeat + pattern.beats > state.totalBeats) return false;
    const measureStart = measureIndexForBeat(state, startBeat);
    const measureEnd = measureIndexForBeat(state, startBeat + pattern.beats - 1);
    return measureStart === measureEnd;
  }

  function buildDragImage(tile, pattern) {
    const rect = tile.getBoundingClientRect();
    const clone = tile.cloneNode(true);
    clone.classList.add("drag-preview");
    clone.style.width = rect.width + "px";
    clone.style.height = rect.height + "px";
    clone.style.left = "0";
    clone.style.top = "0";
    clone.style.transition = "none";
    clone.style.transform = "translate3d(-999px, -999px, 0)";
    const label = document.createElement("span");
    label.className = "drag-beat";
    label.textContent = pattern.beats === 1 ? "1 beat" : pattern.beats + " beats";
    clone.appendChild(label);
    document.body.appendChild(clone);
    return clone;
  }

  function measureDragPreview(preview) {
    const rect = preview.getBoundingClientRect();
    return {
      width: rect.width || preview.offsetWidth || 96,
      height: rect.height || preview.offsetHeight || 60,
      offsetX: 20,
      offsetY: 96
    };
  }

  function updateDragPreview(preview, x, y) {
    preview.style.transform = "translate3d(" + Math.round(x - 20) + "px, " + Math.round(y - 96) + "px, 0)";
  }

  function dragHitPoint(state) {
    const metrics = state.dragPreviewMetrics || measureDragPreview(state.dragPreview);
    return {
      x: (state.dragTouchX || 0) - metrics.offsetX + metrics.width / 2,
      y: (state.dragTouchY || 0) - metrics.offsetY + metrics.height * 0.62
    };
  }

  function collectDragDropZones(els) {
    return Array.from(els.board.querySelectorAll(".beat-drop-zone")).map((zone) => {
      const rect = zone.getBoundingClientRect();
      return {
        zone,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom
      };
    });
  }

  function dropZoneUnderPreview(state) {
    const point = dragHitPoint(state);
    const cached = Array.isArray(state.dragDropZones) ? state.dragDropZones : [];
    for (let index = 0; index < cached.length; index += 1) {
      const item = cached[index];
      if (point.x >= item.left && point.x <= item.right && point.y >= item.top && point.y <= item.bottom) {
        return item.zone;
      }
    }
    const el = document.elementFromPoint(point.x, point.y);
    return el ? el.closest(".beat-drop-zone") : null;
  }

  function scheduleTouchDragFrame(els, state) {
    if (state.dragRaf) return;
    state.dragRaf = requestAnimationFrame(() => {
      state.dragRaf = 0;
      processTouchDragFrame(els, state);
    });
  }

  function flushTouchDragFrame(els, state, options) {
    if (state.dragRaf) {
      cancelAnimationFrame(state.dragRaf);
      state.dragRaf = 0;
    }
    processTouchDragFrame(els, state, options);
  }

  function processTouchDragFrame(els, state, options) {
    if (!state.dragPattern || !state.dragPreview) return;
    updateDragPreview(state.dragPreview, state.dragTouchX, state.dragTouchY);
    const zone = dropZoneUnderPreview(state);
    const now = performance.now ? performance.now() : Date.now();
    const forceHighlight = !!(options && options.forceHighlight);
    if (!forceHighlight && zone !== state.currentDropZone && now - (state.dragLastHighlightAt || 0) < 72) return;
    state.dragLastHighlightAt = now;
    highlightBeatZone(els, state, zone, state.dragPattern);
  }

  function highlightBeatZone(els, state, zone, id) {
    const pattern = beatPatternMap.get(id);
    if (!zone || !pattern) {
      clearBeatHighlights(els, state);
      state.currentDropZone = null;
      state.currentDropId = null;
      return;
    }
    if (state.currentDropZone === zone && state.currentDropId === id) return;
    clearBeatHighlights(els, state);
    const start = Number(zone.dataset.beat);
    const ok = canPlaceBeatPattern(state, pattern, start);
    for (let i = start; i < Math.min(state.totalBeats, start + pattern.beats); i += 1) {
      const cell = els.board.querySelector('[data-beat="' + i + '"]');
      if (cell) {
        cell.classList.add(ok ? "is-drag-over" : "is-blocked");
        state.dragHighlightCells.push(cell);
      }
    }
    state.currentDropZone = zone;
    state.currentDropId = id;
  }

  function clearBeatHighlights(els, state) {
    if (state && Array.isArray(state.dragHighlightCells) && state.dragHighlightCells.length) {
      state.dragHighlightCells.forEach((node) => node.classList.remove("is-drag-over", "is-blocked"));
      state.dragHighlightCells = [];
      state.currentDropZone = null;
      state.currentDropId = null;
      return;
    }
    els.board.querySelectorAll(".is-drag-over, .is-blocked").forEach((node) => {
      node.classList.remove("is-drag-over", "is-blocked");
    });
    if (state) {
      state.currentDropZone = null;
      state.currentDropId = null;
    }
  }

  function showBeatReplacementPreview(els) {
    if (!els || !els.board) return;
    clearBeatHighlights(els);
    const target = els.board.querySelector(".beat-drop-zone.is-filled");
    if (target) target.classList.add("is-drag-over");
  }

  function endBeatDrag(els, state) {
    const wasTouchDrag = !!state.touchDragging;
    if (state.dragRaf) {
      cancelAnimationFrame(state.dragRaf);
      state.dragRaf = 0;
    }
    clearBeatHighlights(els, state);
    if (state.touchTile) state.touchTile.classList.remove("dragging");
    if (state.dragPreview) state.dragPreview.remove();
    state.dragPattern = null;
    state.touchTile = null;
    state.dragPreview = null;
    state.dragPreviewMetrics = null;
    state.dragDropZones = [];
    state.dragLastHighlightAt = 0;
    state.dragTouchX = 0;
    state.dragTouchY = 0;
    state.currentDropZone = null;
    state.currentDropId = null;
    state.touchDragging = false;
    document.body.classList.remove("is-touch-dragging");
    if (wasTouchDrag) suppressPostTouchFocus(els);
  }

  function suppressPostTouchFocus(els) {
    document.body.classList.add("is-touch-placement-cleanup");
    const blurActiveAnswerControl = () => {
      const active = document.activeElement;
      if (!active || typeof active.blur !== "function") return;
      if (els.board && els.board.contains(active)) active.blur();
      if (els.bank && els.bank.contains(active)) active.blur();
    };
    window.setTimeout(blurActiveAnswerControl, 0);
    window.setTimeout(blurActiveAnswerControl, 80);
    window.setTimeout(() => {
      blurActiveAnswerControl();
      document.body.classList.remove("is-touch-placement-cleanup");
    }, 260);
  }

  function updateBeatStatus(els, state) {
    const filled = state.placements.filter(Boolean).length;
    const pct = Math.round((filled / state.totalBeats) * 100);
    const userComplete = filled === state.totalBeats && state.userTouched.size >= state.totalBeats;
    setText(els.filled, filled + " of " + state.totalBeats + " beats");
    setText(els.groove, Math.round(state.groove) + "%");
    setText(els.points, String(state.score));
    setText(els.streak, String(state.streak));
    if (els.levelChip) setText(els.levelChip, "Level " + formatLevelNumber(state.levelNumber));
    if (els.frameLevel) setText(els.frameLevel, formatLevelNumber(state.levelNumber));
    if (els.devDrawerLevel) setText(els.devDrawerLevel, formatLevelNumber(state.levelNumber));
    if (els.displayLabel) setText(els.displayLabel, "Your answer / " + getMeasureCount(state) + " measure" + (getMeasureCount(state) === 1 ? "" : "s"));
    if (els.device) {
      els.device.dataset.bars = String(getMeasureCount(state));
      els.device.dataset.beatsPerMeasure = String(maxBeatsPerMeasure(state));
      els.device.dataset.bankOptions = String(activeBeatPatterns(state).length);
    }
    setText(els.readout, state.pickMode === "count"
      ? "Tap a beat to count sounds."
      : state.pickMode === "hear"
        ? "Tap a beat to hear it."
        : state.tapBackOpen
          ? "Tap Back"
        : state.playing
          ? "Listening with beat guide."
          : "");
    setText(els.bankCount, activeBeatPatterns(state).length + " options / no scroll");
    els.submit.disabled = !userComplete || state.solved;
    els.submit.hidden = state.solved;
    if (els.next) els.next.hidden = !state.solved || (state.tapBackOpen && state.tapBackPhase !== "done");
    els.frame.classList.toggle("is-answer-complete", userComplete || state.solved);
    els.play.disabled = state.tapBackOpen ? (state.tapBackActive || state.tapBackDone || state.tapBackPhase === "done") : state.playing;
    const playLabel = els.play.querySelector("span:not(.play-icon)");
    if (playLabel) {
      const tapBackPlayLabel = state.tapBackPhase === "ready"
        ? "Start metro"
        : state.tapBackPhase === "metro"
          ? "Lock beat"
          : state.tapBackPhase === "locked"
            ? "Keep beat"
          : state.tapBackPhase === "capture"
            ? "Recording"
            : state.tapBackDone || state.tapBackPhase === "done"
              ? "Done"
              : "Count-off";
      setText(playLabel, state.tapBackOpen
        ? state.tapBackActive
          ? tapBackPlayLabel
          : state.tapBackDone
            ? "Done"
          : "Start metro"
        : "Play");
    }
    if (els.tapBack) {
      els.tapBack.classList.toggle("is-recording", state.tapBackActive);
      els.tapBack.disabled = state.playing;
      els.tapBack.hidden = !state.solved || state.tapBackDone || state.tapBackOpen;
      setText(els.tapBack.querySelector("span"), state.tapBackActive ? "Tap Now" : "Tap it back");
    }
    els.speedButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.speed === state.speed);
      button.disabled = state.playing;
      button.setAttribute("aria-disabled", state.playing ? "true" : "false");
    });
    if (els.speedControl) {
      els.speedControl.classList.toggle("is-locked", state.playing);
    }
    updateFloatingSpeedScroller(els, state);
    const hue = Math.round(clamp(0, 132, state.groove * 1.32));
    document.documentElement.style.setProperty("--groove-col", "hsl(" + hue + " 78% 44%)");
    els.metro.classList.toggle("is-active", state.metronome);
    els.metro.setAttribute("aria-pressed", state.metronome ? "true" : "false");
    els.guide.classList.toggle("is-active", state.beatGuide);
    els.guide.setAttribute("aria-pressed", state.beatGuide ? "true" : "false");
    els.hintNarrow.classList.toggle("is-armed", state.narrowed);
    if (els.devLevel && els.devLevel.value !== String(state.levelNumber)) {
      els.devLevel.value = String(state.levelNumber);
    }
    if (els.devBars && els.devBars.value !== String(state.bars)) {
      els.devBars.value = String(state.bars);
    }
    if (els.devMeter && els.devMeter.value !== (state.fixedMeter || "")) {
      els.devMeter.value = state.fixedMeter || "";
    }
    if (els.devRenderer && els.devRenderer.value !== state.answerRenderer) {
      els.devRenderer.value = state.answerRenderer;
    }
    updateBeatDevDrawer(els, state);
    updateBeatDevLevelScroll(els, state);
    els.hintNarrow.setAttribute("aria-pressed", state.narrowed ? "true" : "false");
    els.hintCount.classList.toggle("is-armed", state.pickMode === "count");
    els.hintCount.setAttribute("aria-pressed", state.pickMode === "count" ? "true" : "false");
    els.hintHear.classList.toggle("is-armed", state.pickMode === "hear");
    els.hintHear.setAttribute("aria-pressed", state.pickMode === "hear" ? "true" : "false");
    updateHintCostLabels(els, state);
    updateBankFilter(els, state);
  }

  function updateBeatHints(els, state, text) {
    setText(els.message, text);
    setText(els.readout, text);
  }

  function setHintCostLabel(button, text) {
    if (!button) return;
    const cost = button.querySelector(".hint-cost");
    if (cost) setText(cost, text);
  }

  function updateHintCostLabels(els, state) {
    setHintCostLabel(els.hintNarrow, state.chargedHints.has("narrow") ? "Used" : "-" + hintCosts.narrow);
    setHintCostLabel(els.hintCount, countHintCostLabel(state));
    setHintCostLabel(els.hintHear, state.roundStats.hearHintsUsed >= beatScoring.maxHearHints ? "Max" : "-" + hintCosts.hear);
    setHintCostLabel(els.hintMistakes, state.chargedHints.has("mistakes") ? "Used" : "-" + hintCosts.mistakes);
  }

  function countHintFreeRemaining(state) {
    return Math.max(0, beatScoring.freeCountHints - state.roundStats.countHintsUsed);
  }

  function countHintCostLabel(state) {
    if (state.roundStats.countHintsUsed >= beatScoring.maxCountHints) return "Max";
    const freeRemaining = countHintFreeRemaining(state);
    return freeRemaining ? "Free x" + freeRemaining : "-" + hintCosts.count;
  }

  function countHintPrompt(state) {
    const freeRemaining = countHintFreeRemaining(state);
    if (state.roundStats.countHintsUsed >= beatScoring.maxCountHints) {
      return "Count sounds limit reached for this example.";
    }
    if (freeRemaining) {
      return "Tap any answer beat to count its sounds. Free x" + freeRemaining + "; after that Count costs -" + hintCosts.count + " groove.";
    }
    return "Tap any answer beat to count its sounds. Costs -" + hintCosts.count + " groove.";
  }

  function chargeBeatHint(els, state, key, cost, options) {
    const opts = options || {};
    if (!cost) return false;
    if (opts.once && state.chargedHints.has(key)) return false;
    if (opts.once) state.chargedHints.add(key);
    state.roundStats.paidHintUses += 1;
    return applyGrooveLoss(els, state, cost, opts);
  }

  function floatBeatDelta(text, positive, anchor, extraClass) {
    const target = anchor && anchor.nodeType === 1 ? anchor : document.querySelector(".frame-points");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const delta = document.createElement("span");
    delta.className = "score-float" + (positive ? " is-good" : " is-loss") + (extraClass ? " " + extraClass : "");
    delta.textContent = text;
    delta.style.left = Math.round(rect.left + rect.width / 2) + "px";
    delta.style.top = Math.round(rect.top + rect.height / 2) + "px";
    document.body.appendChild(delta);
    window.setTimeout(() => delta.remove(), 1800);
  }

  function playWinSound() {
    const ctx = audio.ensure();
    const now = ctx ? ctx.currentTime : 0;
    audio.playHzAt(659.25, now, 0.12, { type: "sine", gain: 0.16 });
    audio.playHzAt(783.99, now + 0.09, 0.14, { type: "sine", gain: 0.16 });
    audio.playHzAt(1046.5, now + 0.2, 0.18, { type: "sine", gain: 0.18 });
  }

  function playMissSound() {
    const ctx = audio.ensure();
    const now = ctx ? ctx.currentTime : 0;
    audio.playHzAt(220, now, 0.16, { type: "sawtooth", gain: 0.08 });
    audio.playHzAt(174.61, now + 0.13, 0.22, { type: "sawtooth", gain: 0.07 });
  }

  function toggleBeatHintMenu(els) {
    const open = !els.hintsMenu.classList.contains("is-open");
    els.hintsMenu.classList.toggle("is-open", open);
    els.hintsToggle.classList.toggle("is-armed", open);
    els.hintsToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) positionBeatHintMenu(els);
  }

  function closeBeatHintMenu(els) {
    els.hintsMenu.classList.remove("is-open");
    els.hintsMenu.classList.remove("opens-up", "opens-left", "is-positioned");
    els.hintsMenu.style.removeProperty("--hint-top");
    els.hintsMenu.style.removeProperty("--hint-left");
    els.hintsMenu.style.removeProperty("--hint-width");
    els.hintsMenu.style.removeProperty("--hint-max-height");
    els.hintsToggle.classList.remove("is-armed");
    els.hintsToggle.setAttribute("aria-expanded", "false");
  }

  function positionBeatHintMenu(els) {
    if (!els || !els.hintsMenu || !els.hintsToggle || !els.hintsMenu.classList.contains("is-open")) return;
    const menu = els.hintsMenu;
    menu.classList.remove("opens-up", "opens-left", "is-positioned");
    requestAnimationFrame(() => {
      if (!menu.classList.contains("is-open")) return;
      const margin = 8;
      const gap = 8;
      const viewportW = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 0;
      const anchor = els.hintsToggle.getBoundingClientRect();
      const natural = menu.getBoundingClientRect();
      const width = Math.min(Math.max(natural.width, 192), Math.max(160, viewportW - margin * 2));
      const opensSide = anchor.left < width + margin && anchor.right + gap + width <= viewportW - margin;
      let left = opensSide ? anchor.right + gap : anchor.right - width;
      left = clamp(margin, Math.max(margin, viewportW - width - margin), left);

      const belowTop = anchor.bottom + gap;
      const aboveHeight = Math.max(0, anchor.top - margin - gap);
      const belowHeight = Math.max(0, viewportH - margin - belowTop);
      const naturalHeight = menu.scrollHeight || natural.height || 180;
      const openUp = belowHeight < Math.min(naturalHeight, 180) && aboveHeight > belowHeight;
      const maxHeight = Math.max(96, Math.min(naturalHeight, openUp ? aboveHeight : belowHeight));
      const top = openUp
        ? Math.max(margin, anchor.top - gap - maxHeight)
        : Math.min(belowTop, viewportH - margin - maxHeight);

      menu.style.setProperty("--hint-left", left + "px");
      menu.style.setProperty("--hint-top", top + "px");
      menu.style.setProperty("--hint-width", width + "px");
      menu.style.setProperty("--hint-max-height", maxHeight + "px");
      menu.classList.add("is-positioned");
    });
  }

  function armBeatPick(els, state, mode) {
    state.pickMode = state.pickMode === mode ? null : mode;
    clearBeatHintMarks(els);
    updateBeatStatus(els, state);
    updateBeatHints(els, state, state.pickMode === "count"
      ? countHintPrompt(state)
      : state.pickMode === "hear"
        ? "Tap any answer beat to hear that beat."
        : "Guided tools are ready.");
  }

  function handleBeatZoneClick(els, state, index) {
    if (!state.pickMode) return;
    clearBeatHintMarks(els);
    const zone = els.board.querySelector('[data-beat="' + index + '"]');
    if (zone) zone.classList.add("is-hint-mark");
    if (state.pickMode === "count") {
      if (state.roundStats.countHintsUsed >= beatScoring.maxCountHints) {
        updateBeatHints(els, state, "Count sounds limit reached for this example.");
        updateBeatStatus(els, state);
        return;
      }
      const free = state.roundStats.countHintsUsed < beatScoring.freeCountHints;
      state.roundStats.countHintsUsed += 1;
      if (!free) chargeBeatHint(els, state, "count:" + state.roundStats.countHintsUsed + ":" + index, hintCosts.count, { floatClass: "is-hint-cost" });
      const sounds = countTargetSoundsInBeat(state, index);
      showBeatHintBadge(zone, String(sounds));
      const costMessage = free
        ? countHintFreeRemaining(state)
          ? " Free x" + countHintFreeRemaining(state) + " left."
          : " Free count used. Count mode is off; choose Count again to spend -" + hintCosts.count + " groove."
        : " Count hint cost -" + hintCosts.count + " groove. Count mode is off.";
      updateBeatHints(els, state, beatLabel(state, index) + ": " + sounds + " sound" + (sounds === 1 ? "." : "s.") + costMessage);
      state.pickMode = null;
      updateBeatStatus(els, state);
      return;
    }
    if (state.pickMode === "hear") {
      if (state.roundStats.hearHintsUsed >= beatScoring.maxHearHints) {
        updateBeatHints(els, state, "Hear a beat limit reached for this example.");
        updateBeatStatus(els, state);
        return;
      }
      state.roundStats.hearHintsUsed += 1;
      chargeBeatHint(els, state, "hear:" + state.roundStats.hearHintsUsed + ":" + index, hintCosts.hear, { floatClass: "is-hint-cost" });
      playTargetBeat(state, index);
      updateBeatHints(els, state, "Played " + beatLabel(state, index).toLowerCase() + ".");
      updateBeatStatus(els, state);
    }
  }

  function showBeatHintBadge(zone, text) {
    if (!zone) return;
    zone.querySelectorAll(".beat-hint-badge").forEach((node) => node.remove());
    const badge = document.createElement("span");
    badge.className = "beat-hint-badge";
    badge.textContent = text;
    zone.appendChild(badge);
  }

  function playTargetBeat(state, index) {
    const beatMs = Math.round(60000 / state.tempoBpm);
    const onsets = targetOnsets(state).filter((onset) => onset.beat >= index && onset.beat < index + 1);
    if (!onsets.length) {
      audio.playHz(1550, 0.035, { type: "sine", gain: 0.12 });
      return;
    }
    onsets.forEach((onset) => {
      const delay = Math.max(0, (onset.beat - index) * beatMs);
      window.setTimeout(() => {
        playRhythmHit(onset.duration * beatMs / 1000);
      }, delay);
    });
  }

  const beatSpeedBpms = {
    slow: 72,
    medium: 100,
    fast: 132
  };
  const beatSpeedOrder = ["slow", "medium", "fast"];

  function updateFloatingSpeedScroller(els, state) {
    if (!els || !els.speedControl) return;
    const index = Math.max(0, beatSpeedOrder.indexOf(state.speed));
    els.speedControl.style.setProperty("--floating-speed-index", String(index));
  }

  function nudgeBeatSpeed(els, state, delta) {
    if (state.playing) return;
    const index = Math.max(0, beatSpeedOrder.indexOf(state.speed));
    const next = clamp(0, beatSpeedOrder.length - 1, index + delta);
    if (next === index) return;
    setBeatSpeed(els, state, beatSpeedOrder[next]);
  }

  function cycleBeatSpeed(els, state) {
    if (state.playing) return;
    const index = Math.max(0, beatSpeedOrder.indexOf(state.speed));
    setBeatSpeed(els, state, beatSpeedOrder[(index + 1) % beatSpeedOrder.length]);
  }

  function setupFloatingSpeedScroller(els, state) {
    if (!els || !els.speedControl) return;
    let touchStartY = null;
    els.speedControl.addEventListener("touchstart", (event) => {
      const touch = event.touches && event.touches[0];
      touchStartY = touch ? touch.clientY : null;
    }, { passive: true });
    els.speedControl.addEventListener("touchend", (event) => {
      if (touchStartY === null) {
        touchStartY = null;
        return;
      }
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) {
        touchStartY = null;
        return;
      }
      const deltaY = touch.clientY - touchStartY;
      touchStartY = null;
      if (Math.abs(deltaY) < 16) return;
      event.preventDefault();
      nudgeBeatSpeed(els, state, deltaY < 0 ? 1 : -1);
    }, { passive: false });
    els.speedControl.addEventListener("wheel", (event) => {
      if (Math.abs(event.deltaY) < 4) return;
      event.preventDefault();
      nudgeBeatSpeed(els, state, event.deltaY > 0 ? 1 : -1);
    }, { passive: false });
  }

  function setBeatSpeed(els, state, speed) {
    if (state.playing) return;
    state.speed = beatSpeedBpms[speed] ? speed : "medium";
    state.tempoBpm = beatSpeedBpms[state.speed];
    updateBeatStatus(els, state);
    updateBeatHints(els, state, "Speed: " + state.speed + ".");
  }

  function bindTapBackInput(node, handler) {
    if (!node) return;
    let lastAt = 0;
    const wrapped = (event) => {
      if (event.cancelable) event.preventDefault();
      const now = performance.now();
      // Only suppress accidental double-fires from one physical tap.
      // Use one event family below; a long debounce drops legitimate quick notes.
      if (now - lastAt < 35) return;
      lastAt = now;
      handler(event);
    };
    if (window.PointerEvent) {
      node.addEventListener("pointerdown", wrapped);
    } else {
      node.addEventListener("touchstart", wrapped, { passive: false });
      node.addEventListener("mousedown", wrapped);
    }
  }

  function tapBackBeatMs(state) {
    return Math.round(60000 / (state.tapBackTempo || state.tempoBpm || 100));
  }

  function defaultTapBackTempo(state) {
    return Math.min(state && state.tempoBpm || 100, 84);
  }

  function tapBackLockRequirement(state) {
    return Math.max(1, measureBeatCount(state, 0));
  }

  function tapBackLockEntryRequirement(state) {
    return tapBackLockRequirement(state) + 1;
  }

  function tapBackBeatByIndex(state, index) {
    return state.tapBackBeatTimes.find((beat) => beat.index === index) || null;
  }

  function tapBackBeatTimeByIndex(state, index, anchor) {
    const beat = tapBackBeatByIndex(state, index);
    if (beat) return beat.time;
    const base = anchor || state.tapBackBeatTimes[state.tapBackBeatTimes.length - 1] || { index: 0, time: performance.now() };
    return base.time + (index - base.index) * tapBackBeatMs(state);
  }

  function tapBackAccentForBeatIndex(state, index) {
    const captureStart = Number(state.tapBackCaptureStartIndex);
    if (Number.isFinite(captureStart) && captureStart >= 0 && index >= captureStart) {
      const relativeBeat = index - captureStart;
      if (relativeBeat >= 0 && relativeBeat < (state.totalBeats || 0)) {
        return beatNumberInMeasure(state, relativeBeat) === 1;
      }
    }
    return (index % tapBackLockRequirement(state)) === 0;
  }

  function nearestTapBackBeat(state, time) {
    let best = null;
    let bestDelta = Infinity;
    state.tapBackBeatTimes.forEach((beat) => {
      const reference = Number.isFinite(beat.firedTime) ? beat.firedTime : beat.time;
      const delta = Math.abs(reference - time);
      if (delta < bestDelta) {
        best = beat;
        bestDelta = delta;
      }
    });
    return best ? { beat: best, delta: time - best.time, absDelta: bestDelta } : null;
  }

  function clearTapBackBeatGuide(els, state) {
    if (state && state.tapBackGuideNode) {
      state.tapBackGuideNode.classList.remove("is-playing");
      state.tapBackGuideNode = null;
    }
    if (els && els.board) {
      els.board.querySelectorAll(".is-playing").forEach((zone) => zone.classList.remove("is-playing"));
    }
  }

  function clearTapBackTimers(state) {
    if (state.tapBackTimer) window.clearTimeout(state.tapBackTimer);
    if (state.tapBackMetroTimer) window.clearTimeout(state.tapBackMetroTimer);
    (state.tapBackTimers || []).forEach((timer) => window.clearTimeout(timer));
    state.tapBackTimer = null;
    state.tapBackMetroTimer = null;
    state.tapBackTimers = [];
    state.tapBackMetroRun += 1;
  }

  function stopTapBackMetronome(state) {
    state.tapBackMetroRun += 1;
    if (state.tapBackMetroTimer) window.clearTimeout(state.tapBackMetroTimer);
    state.tapBackMetroTimer = null;
  }

  function startTapBackMetronome(els, state) {
    stopTapBackMetronome(state);
    const run = state.tapBackMetroRun;
    state.tapBackBeatTimes = [];
    state.tapBackBeatIndex = 0;
    state.tapBackNextBeatTime = performance.now() + 250;

    const schedule = () => {
      if (run !== state.tapBackMetroRun || !state.tapBackOpen || state.tapBackPhase === "idle" || state.tapBackPhase === "done") return;
      const now = performance.now();
      const beatMs = tapBackBeatMs(state);
      while (state.tapBackNextBeatTime < now + 900) {
        const beat = {
          time: state.tapBackNextBeatTime,
          scheduledTime: state.tapBackNextBeatTime,
          firedTime: state.tapBackNextBeatTime,
          index: state.tapBackBeatIndex,
          accent: tapBackAccentForBeatIndex(state, state.tapBackBeatIndex)
        };
        state.tapBackBeatTimes.push(beat);
        const scheduledAudioTime = scheduleMetroTickAt(beat.time, beat.accent);
        if (scheduledAudioTime === null) beat.firedTime = null;
        const timer = window.setTimeout(() => {
          if (run !== state.tapBackMetroRun || !state.tapBackOpen || state.tapBackPhase === "idle" || state.tapBackPhase === "done") return;
          const firedAt = performance.now();
          // UI callbacks can jitter; audio was already scheduled on the Web
          // Audio clock. Keep the scoring reference on the intended audible
          // beat unless the fallback immediate-audio path is being used.
          if (!Number.isFinite(beat.firedTime)) {
            beat.firedTime = firedAt;
            beat.time = firedAt;
            playMetroTick(beat.accent);
          }
          beat.accent = tapBackAccentForBeatIndex(state, beat.index);
          if (els.tapBeat) {
            els.tapBeat.classList.add("tb-pulse");
            window.setTimeout(() => {
              if (els.tapBeat) els.tapBeat.classList.remove("tb-pulse");
            }, 90);
          }
        }, Math.max(0, beat.time - performance.now()));
        state.tapBackTimers.push(timer);
        state.tapBackBeatIndex += 1;
        state.tapBackNextBeatTime += beatMs;
      }
      state.tapBackBeatTimes = state.tapBackBeatTimes.filter((beat) => beat.time > now - 2400);
      state.tapBackMetroTimer = window.setTimeout(schedule, 50);
    };

    schedule();
  }

  function setTapBackBeatLocked(els, locked) {
    if (!els.tapBeat) return;
    els.tapBeat.classList.toggle("tb-locked", !!locked);
    const label = els.tapBeat.querySelector(".tb-zlabel");
    const hint = els.tapBeat.querySelector(".tb-zhint");
    if (label) setText(label, locked ? "Locked" : "Beat");
    if (hint) setText(hint, locked ? "keep the beat" : "left hand");
  }

  function updateTapBackLockHint(els, state) {
    const hint = els.tapBeat && els.tapBeat.querySelector(".tb-zhint");
    if (!hint) return;
    const need = tapBackLockRequirement(state);
    if (state.tapBackPhase === "locked") {
      setText(hint, state.tapBackConfirmStreak > 0 ? state.tapBackConfirmStreak + "/" + need + " steady" : "keep beat");
      return;
    }
    if (state.tapBackLockStreak >= need) {
      setText(hint, "next downbeat");
      return;
    }
    setText(hint, state.tapBackLockStreak > 0 ? state.tapBackLockStreak + "/" + need + " locking" : "keep tapping");
  }

  function flashTapBackCenterText(els, text, duration) {
    if (!els.tapCountoff) return;
    els.tapCountoff.hidden = false;
    els.tapCountoff.classList.add("is-showing", "is-word");
    setText(els.tapCountoff, text);
    pulseTapNode(els.tapCountoff);
    if (duration) {
      window.setTimeout(() => {
        if (!els.tapCountoff || els.tapCountoff.textContent !== text) return;
        els.tapCountoff.hidden = true;
        els.tapCountoff.classList.remove("is-word");
      }, duration);
    }
  }

  function enterTapBackReady(els, state) {
    clearTapBackTimers(state);
    clearTapBackBeatGuide(els, state);
    if (els.device) els.device.classList.remove("is-tapback-review");
    state.tapBackActive = false;
    state.tapBackPhase = "ready";
    state.tapBackStart = 0;
    state.tapBackTaps = [];
    state.tapBackBeatTaps = [];
    state.tapBackBeatTimes = [];
    state.tapBackCaptureStart = 0;
    state.tapBackCaptureStartIndex = -1;
    state.tapBackLockStreak = 0;
    state.tapBackConfirmStreak = 0;
    state.tapBackLastBeatTapIndex = -1;
    state.tapBackDone = false;
    if (els.tapZones) {
      els.tapZones.hidden = false;
      els.tapZones.classList.remove("tb-go");
    }
    if (els.tapResults) {
      els.tapResults.hidden = true;
      els.tapResults.textContent = "";
    }
    if (els.tapCountoff) {
      els.tapCountoff.hidden = true;
      els.tapCountoff.textContent = "";
      els.tapCountoff.classList.remove("is-showing", "tb-pop", "is-word");
    }
    if (els.tapBeat) els.tapBeat.classList.remove("tb-armed", "tb-flash", "tb-pulse", "tb-bad");
    if (els.tapRhythm) els.tapRhythm.classList.remove("tb-armed", "tb-flash");
    setTapBackBeatLocked(els, false);
    if (els.tapInstruct) {
      els.tapInstruct.hidden = false;
      setText(els.tapInstruct, "Press Play to start the metronome. Tap Beat in time to lock in.");
    }
    updateBeatStatus(els, state);
    updateBeatHints(els, state, "Tap Back ready. Start the metronome, then lock the beat.");
  }

  function startTapBackBonus(els, state) {
    if (state.playing || state.tapBackActive) return;
    if (els.tapOverlay && els.tapOverlay.hidden) openTapBackOverlay(els, state);
    if (state.tapBackPhase !== "ready") return;
    state.tapBackActive = true;
    state.tapBackPhase = "metro";
    state.tapBackLockStreak = 0;
    state.tapBackConfirmStreak = 0;
    state.tapBackLastBeatTapIndex = -1;
    state.tapBackTaps = [];
    state.tapBackBeatTaps = [];
    state.tapBackStart = 0;
    state.tapBackDone = false;
    if (els.tapResults) {
      els.tapResults.hidden = true;
      els.tapResults.textContent = "";
    }
    if (els.tapBeat) els.tapBeat.classList.add("tb-armed");
    if (els.tapRhythm) els.tapRhythm.classList.remove("tb-armed");
    if (els.tapInstruct) {
      els.tapInstruct.hidden = false;
      setText(els.tapInstruct, "Tap Beat for one measure, then hit the next downbeat to lock.");
    }
    startTapBackMetronome(els, state);
    updateTapBackLockHint(els, state);
    updateBeatStatus(els, state);
    updateBeatHints(els, state, "Tap the Beat pad in time to lock in.");
  }

  function flashTapBackOffbeat(els) {
    if (!els.tapBeat) return;
    els.tapBeat.classList.add("tb-bad");
    window.setTimeout(() => {
      if (els.tapBeat) els.tapBeat.classList.remove("tb-bad");
    }, 220);
  }

  function recordTapBeat(els, state) {
    pulseTapNode(els.tapBeat);
    const now = performance.now();
    if (state.tapBackPhase === "ready") {
      if (els.tapInstruct) setText(els.tapInstruct, "Press Play first, then tap Beat with the metronome.");
      return;
    }
    if (state.tapBackPhase === "metro") {
      const nearest = nearestTapBackBeat(state, now);
      if (nearest && nearest.absDelta <= tapBackLockToleranceMs && nearest.beat.index !== state.tapBackLastBeatTapIndex) {
        state.tapBackLockStreak += 1;
        state.tapBackLastBeatTapIndex = nearest.beat.index;
        updateTapBackLockHint(els, state);
        if (state.tapBackLockStreak >= tapBackLockEntryRequirement(state)) {
          lockTapBackBeat(els, state, 1);
        } else if (els.tapInstruct) {
          const need = tapBackLockRequirement(state);
          setText(els.tapInstruct, state.tapBackLockStreak >= need
            ? "Good. Hit the next downbeat to lock."
            : "On the beat: " + state.tapBackLockStreak + " / " + need + ".");
        }
      } else if (!nearest || nearest.absDelta > tapBackLockToleranceMs) {
        state.tapBackLockStreak = 0;
        state.tapBackLastBeatTapIndex = -1;
        updateTapBackLockHint(els, state);
        flashTapBackOffbeat(els);
        if (els.tapInstruct) setText(els.tapInstruct, "Stay on the beat. Streak reset.");
      }
      return;
    }
    if (state.tapBackPhase === "locked") {
      const nearest = nearestTapBackBeat(state, now);
      if (nearest && nearest.absDelta <= tapBackLockToleranceMs && nearest.beat.index !== state.tapBackLastBeatTapIndex) {
        state.tapBackConfirmStreak += 1;
        state.tapBackLastBeatTapIndex = nearest.beat.index;
        const remaining = Math.max(1, tapBackLockRequirement(state) - state.tapBackConfirmStreak + 1);
        flashTapBackCenterText(els, "LOCKED " + remaining);
        updateTapBackLockHint(els, state);
        if (els.tapInstruct) setText(els.tapInstruct, "Locked. Keep the beat: " + state.tapBackConfirmStreak + " / " + tapBackLockRequirement(state) + ".");
        if (state.tapBackConfirmStreak >= tapBackLockRequirement(state)) scheduleTapBackCountoff(els, state);
      } else if (!nearest || nearest.absDelta > tapBackLockToleranceMs) {
        state.tapBackConfirmStreak = 0;
        updateTapBackLockHint(els, state);
        flashTapBackOffbeat(els);
        if (els.tapInstruct) setText(els.tapInstruct, "Locked, but keep the pulse steady.");
      }
      return;
    }
    if (state.tapBackPhase === "capture") {
      state.tapBackBeatTaps.push(now);
    }
  }

  function lockTapBackBeat(els, state, initialConfirm) {
    const firstConfirm = Math.max(0, Number(initialConfirm) || 0);
    state.tapBackPhase = "locked";
    state.tapBackConfirmStreak = firstConfirm;
    setTapBackBeatLocked(els, true);
    if (els.tapRhythm) els.tapRhythm.classList.remove("tb-armed");
    if (firstConfirm) {
      const remaining = Math.max(1, tapBackLockRequirement(state) - firstConfirm + 1);
      flashTapBackCenterText(els, "LOCKED " + remaining, Math.max(650, tapBackBeatMs(state)));
    } else {
      flashTapBackCenterText(els, "LOCKED", Math.max(650, tapBackBeatMs(state)));
    }
    updateTapBackLockHint(els, state);
    if (els.tapInstruct) setText(els.tapInstruct, "Locked. Keep tapping Beat for one more measure.");
    updateBeatStatus(els, state);
    if (state.tapBackConfirmStreak >= tapBackLockRequirement(state)) scheduleTapBackCountoff(els, state);
  }

  function scheduleTapBackCountoff(els, state) {
    state.tapBackPhase = "countoff";
    setTapBackBeatLocked(els, true);
    if (els.tapRhythm) els.tapRhythm.classList.add("tb-armed");
    if (els.tapInstruct) setText(els.tapInstruct, "Count-off. Get ready to tap Rhythm.");
    const countBeats = tapBackLockRequirement(state);
    const labels = tapBackCountoffLabels(countBeats);
    const anchor = tapBackBeatByIndex(state, state.tapBackLastBeatTapIndex)
      || state.tapBackBeatTimes[state.tapBackBeatTimes.length - 1]
      || { index: state.tapBackLastBeatTapIndex, time: performance.now() };
    const countStartIndex = state.tapBackLastBeatTapIndex + 1;
    const captureStartIndex = countStartIndex + countBeats;
    state.tapBackCaptureStartIndex = captureStartIndex;
    if (els.tapCountoff) {
      els.tapCountoff.hidden = false;
      els.tapCountoff.classList.add("is-showing");
    }

    for (let i = 0; i < countBeats; i += 1) {
      const when = tapBackBeatTimeByIndex(state, countStartIndex + i, anchor);
      const timer = window.setTimeout(() => {
        if (!state.tapBackOpen || state.tapBackPhase !== "countoff") return;
        const label = labels[i] || String(i + 1);
        if (els.tapCountoff) els.tapCountoff.classList.toggle("is-word", !/^\d+$/.test(label));
        setText(els.tapCountoff, label);
        pulseTapNode(els.tapCountoff);
      }, Math.max(0, when - performance.now()));
      state.tapBackTimers.push(timer);
    }

    const startWhen = tapBackBeatTimeByIndex(state, captureStartIndex, anchor);
    state.tapBackCaptureStart = startWhen;
    const clearTimer = window.setTimeout(() => {
      if (!state.tapBackOpen || state.tapBackPhase !== "countoff") return;
      if (!els.tapCountoff) return;
      setText(els.tapCountoff, "TAP");
      els.tapCountoff.classList.add("is-word");
      pulseTapNode(els.tapCountoff);
      window.setTimeout(() => {
        if (els.tapCountoff) els.tapCountoff.hidden = true;
      }, Math.min(520, Math.max(280, tapBackBeatMs(state) * 0.62)));
    }, Math.max(0, startWhen - performance.now()));
    state.tapBackTimers.push(clearTimer);
    beginTapBackCapture(els, state, anchor);
  }

  function tapBackCountoffLabels(countBeats) {
    const beats = Math.max(1, Math.round(Number(countBeats) || 1));
    if (beats === 1) return ["GO"];
    if (beats === 2) return ["READY", "GO"];
    if (beats === 3) return ["1", "READY", "GO"];
    const labels = [];
    for (let i = 1; i <= beats - 2; i += 1) labels.push(String(i));
    labels.push("READY", "GO");
    return labels;
  }

  function lightTapBackBeat(els, state, beatIndex, when) {
    const timer = window.setTimeout(() => {
      if (!state.tapBackOpen || (state.tapBackPhase !== "countoff" && state.tapBackPhase !== "capture")) return;
      clearTapBackBeatGuide(els, state);
      const zones = Array.from(els.board.querySelectorAll(".beat-drop-zone"));
      const zone = zones[beatIndex];
      if (zone) {
        zone.classList.add("is-playing");
        state.tapBackGuideNode = zone;
      }
    }, Math.max(0, when - performance.now()));
    state.tapBackTimers.push(timer);
  }

  function beginTapBackCapture(els, state, anchor) {
    const total = state.totalBeats;
    const startIndex = state.tapBackCaptureStartIndex;
    for (let beat = 0; beat < total; beat += 1) {
      lightTapBackBeat(els, state, beat, tapBackBeatTimeByIndex(state, startIndex + beat, anchor));
    }
    const startWhen = tapBackBeatTimeByIndex(state, startIndex, anchor);
    const startTimer = window.setTimeout(() => {
      if (!state.tapBackOpen || state.tapBackPhase !== "countoff") return;
      const exactStart = tapBackBeatByIndex(state, startIndex);
      const actualStart = exactStart && Number.isFinite(exactStart.firedTime)
        ? exactStart.firedTime
        : performance.now();
      state.tapBackCaptureStart = actualStart;
      state.tapBackStart = state.tapBackCaptureStart;
      state.tapBackPhase = "capture";
      state.tapBackTaps = [];
      state.tapBackBeatTaps = [];
      if (els.tapZones) {
        els.tapZones.classList.add("tb-go");
        window.setTimeout(() => {
          if (els.tapZones) els.tapZones.classList.remove("tb-go");
        }, 600);
      }
      if (els.tapInstruct) setText(els.tapInstruct, "Go. Tap Rhythm, and keep Beat steady.");
      updateBeatStatus(els, state);
      updateBeatHints(els, state, "Tap the rhythm now.");
      state.tapBackTimer = window.setTimeout(
        () => finishTapBackBonus(els, state),
        Math.max(0, (total + 1) * tapBackBeatMs(state))
      );
    }, Math.max(0, startWhen - performance.now()));
    state.tapBackTimers.push(startTimer);
  }

  function recordTapBack(els, state) {
    pulseTapNode(els.tapRhythm);
    const now = performance.now();
    if (state.tapBackPhase === "capture") {
      state.tapBackTaps.push(now);
      if (els.tapInstruct) setText(els.tapInstruct, state.tapBackTaps.length + " rhythm tap" + (state.tapBackTaps.length === 1 ? "" : "s") + " captured.");
      return;
    }
    if (state.tapBackPhase === "countoff" && state.tapBackCaptureStart > 0 && Math.abs(now - state.tapBackCaptureStart) <= tapBackToleranceMs) {
      state.tapBackTaps.push(now);
    }
  }

  function openTapBackOverlay(els, state) {
    if (!els.tapOverlay || !state.solved || state.tapBackDone) return;
    const visibleAnswer = state.placements && state.placements.some(Boolean)
      ? state.placements
      : state.answerKey;
    state.tapBackAnswerSnapshot = cloneBeatPlacements(visibleAnswer || []);
    state.tapBackTempo = defaultTapBackTempo(state);
    setText(els.tapTempoVal, String(state.tapBackTempo));
    setText(els.tapMeta, "");
    setText(els.tapInstruct, "Press Play to start the metronome. Tap Beat in time to lock in.");
    if (els.tapMeta) els.tapMeta.hidden = true;
    if (els.tapClose) els.tapClose.hidden = false;
    if (els.tapInstruct) els.tapInstruct.hidden = false;
    if (els.tapStart) els.tapStart.hidden = true;
    if (els.tapResults) {
      els.tapResults.hidden = true;
      els.tapResults.textContent = "";
    }
    if (els.tapCountoff) {
      els.tapCountoff.hidden = true;
      els.tapCountoff.textContent = "";
    }
    if (els.tapStaff) els.tapStaff.textContent = "";
    state.tapBackOpen = true;
    els.tapOverlay.hidden = false;
    if (els.device) els.device.classList.add("is-tapback");
    if (els.device) els.device.classList.remove("is-tapback-review");
    if (els.bank) els.bank.setAttribute("aria-hidden", "true");
    if (els.tapBack) els.tapBack.hidden = true;
    document.body.classList.add("tapback-open");
    enterTapBackReady(els, state);
    requestAnimationFrame(() => fitBeatLayout(els, state));
  }

  function closeTapBackOverlay(els, state) {
    stopTapBackBonus(els, state);
    state.tapBackOpen = false;
    state.tapBackPhase = "idle";
    if (els.tapOverlay) els.tapOverlay.hidden = true;
    if (els.tapMeta) els.tapMeta.hidden = true;
    if (els.tapClose) els.tapClose.hidden = true;
    if (els.tapInstruct) els.tapInstruct.hidden = true;
    if (els.tapResults) els.tapResults.hidden = true;
    if (els.device) els.device.classList.remove("is-tapback", "is-tapback-review");
    if (els.bank) els.bank.removeAttribute("aria-hidden");
    document.body.classList.remove("tapback-open");
    updateBeatStatus(els, state);
  }

  function nudgeTapTempo(els, state, delta) {
    if (state.tapBackActive || state.tapBackPhase !== "ready") return;
    state.tapBackTempo = clamp(60, 156, (state.tapBackTempo || state.tempoBpm || 100) + delta);
    setText(els.tapTempoVal, String(state.tapBackTempo));
    setText(els.tapInstruct, "Tap Back tempo: " + state.tapBackTempo + " bpm.");
  }

  function pulseTapNode(node) {
    if (!node) return;
    node.classList.remove("tb-flash", "tb-pop");
    void node.offsetWidth;
    node.classList.add(node.classList.contains("tb-countoff") ? "tb-pop" : "tb-flash");
    window.setTimeout(() => node.classList.remove("tb-flash", "tb-pop"), 170);
  }

  function stopTapBackBonus(els, state) {
    clearTapBackTimers(state);
    clearTapBackBeatGuide(els, state);
    state.tapBackActive = false;
    state.tapBackStart = 0;
    state.tapBackTaps = [];
    state.tapBackBeatTaps = [];
    state.tapBackBeatTimes = [];
    state.tapBackCaptureStart = 0;
    state.tapBackCaptureStartIndex = -1;
    state.tapBackLockStreak = 0;
    state.tapBackConfirmStreak = 0;
    state.tapBackLastBeatTapIndex = -1;
    if (state.tapBackPhase !== "done") state.tapBackPhase = state.tapBackOpen ? "ready" : "idle";
    if (els && els.tapBack) {
      els.tapBack.classList.remove("is-recording");
      els.tapBack.disabled = false;
      setText(els.tapBack.querySelector("span"), "Tap it back");
    }
    if (els && els.tapStart) {
      els.tapStart.disabled = false;
      els.tapStart.classList.remove("tb-on");
      setText(els.tapStart, "Start metronome");
    }
    if (els && els.tapZones) els.tapZones.classList.remove("tb-go");
    if (els && els.tapBeat) els.tapBeat.classList.remove("tb-armed", "tb-flash", "tb-pulse", "tb-bad", "tb-locked");
    if (els && els.tapRhythm) els.tapRhythm.classList.remove("tb-armed", "tb-flash");
    if (els && els.tapCountoff) {
      els.tapCountoff.classList.remove("is-showing", "tb-pop");
      els.tapCountoff.classList.remove("is-word");
      els.tapCountoff.hidden = true;
      els.tapCountoff.textContent = "";
    }
    if (els) setTapBackBeatLocked(els, false);
  }

  function finishTapBackBonus(els, state) {
    if (!state.tapBackActive && state.tapBackPhase !== "capture") return;
    const score = scoreTapBack(state);
    clearTapBackTimers(state);
    clearTapBackBeatGuide(els, state);
    state.tapBackActive = false;
    state.tapBackPhase = "done";
    state.tapBackDone = true;
    const previousBest = state.tapBackBestBonus || 0;
    const points = Math.max(0, score.bonus - previousBest);
    state.tapBackBestBonus = Math.max(previousBest, score.bonus);
    if (points > 0) {
      state.score += points;
      state.groove = Math.min(100, state.groove + 5);
      floatBeatDelta("+" + points, true, els.points);
      floatBeatDelta("+5", true, els.groove);
      playWinSound();
      updateBeatHints(els, state, "Tap bonus +" + points + " / " + score.passed + " clean bar" + (score.passed === 1 ? "" : "s") + ".");
    } else {
      playMissSound();
      updateBeatHints(els, state, score.bonus > 0 ? "Tap bonus matched previous best." : "Tap bonus " + score.percent + "%. No bonus.");
    }
    state.tapBackStart = 0;
    state.tapBackTaps = [];
    state.tapBackBeatTaps = [];
    renderTapBackResults(els, state, score, points);
    if (points > 0) flashTapBackCenterText(els, "+" + points + " BONUS", 950);
    updateBeatStatus(els, state);
  }

  function renderTapBackResults(els, state, score, pointsAwarded) {
    if (els.tapZones) els.tapZones.hidden = true;
    if (els.device) els.device.classList.add("is-tapback-review");
    if (els.tapInstruct) {
      els.tapInstruct.hidden = true;
      setText(els.tapInstruct, "");
    }
    if (!els.tapResults) return;
    els.tapResults.hidden = false;
    els.tapResults.innerHTML =
      '<div class="tb-summary-strip">' +
        '<span><b>' + score.percent + '%</b> rhythm</span>' +
        '<span><b>' + score.beatPercent + '%</b> beat</span>' +
        '<span><b>' + score.passed + '/' + score.total + '</b> bars</span>' +
      '</div>' +
      renderTapBackComparison(score) +
      '<div class="tb-rbtns">' +
        '<button type="button" class="tb-mini" data-tap-retry>Try again</button>' +
        '<button type="button" class="tb-mini tb-done" data-tap-done>Done</button>' +
      '</div>';
    refreshPlacedVex(els.tapResults);
    const retry = els.tapResults.querySelector("[data-tap-retry]");
    const done = els.tapResults.querySelector("[data-tap-done]");
    if (retry) retry.addEventListener("click", () => enterTapBackReady(els, state));
    if (done) done.addEventListener("click", () => closeTapBackOverlay(els, state));
  }

  function renderTapBackComparison(score) {
    const measuresPerSystem = Math.min(4, Math.max(1, score.total || 1));
    const systems = [];
    for (let i = 0; i < score.measures.length; i += measuresPerSystem) {
      systems.push(score.measures.slice(i, i + measuresPerSystem));
    }
    return '<div class="tb-review tb-score-review">' + systems.map((system) => {
      return '<div class="tb-system" style="--system-measures:' + system.length + '">' +
        renderTapBackSystemLine(system, "actual", "actual") +
        renderTapBackSystemLine(system, "you", "you") +
      '</div>';
    }).join("") + '</div>';
  }

  function renderTapBackSystemLine(measures, kind, label) {
    const measureHtml = measures.map((measure) => renderTapBackResultMeasure(measure, kind)).join("");
    return '<div class="tb-system-line tb-line-' + kind + '">' +
      '<em>' + label + '</em>' +
      '<div class="tb-system-measures" style="--system-measures:' + measures.length + '">' + measureHtml + '</div>' +
    '</div>';
  }

  function renderTapBackResultMeasure(measure, kind) {
    const status = measure.pass ? "pass" : "fix";
    const items = kind === "actual" ? measure.actualItems : measure.performedItems;
    const tileType = kind === "actual" ? "actual" : (measure.pass ? "you ok" : "you check");
    const body = kind === "you" && measure.rhythmSlip
      ? renderTapBackTapTrace(measure.performedTaps, measure.beats)
      : renderTapBackMusicLine(items, measure.beats, tileType);
    return '<div class="tb-result-measure tb-' + status + '" style="--beats:' + measure.beats + '">' +
      '<span class="tb-measure-badge">' + measure.measure + '</span>' +
      body +
    '</div>';
  }

  function renderTapBackTapTrace(taps, beats) {
    const dots = (taps || []).map((value) => {
      const x = 4 + clamp(0, 1, value) * 92;
      return '<i class="tb-tap-dot" style="left:' + x + '%"></i>';
    }).join("");
    return '<div class="tb-tap-trace" style="--beats:' + Math.max(1, beats || 1) + '">' + dots + '</div>';
  }

  function renderTapBackMusicLine(items, beats, type) {
    const content = (items || []).map((item) => {
      const start = Math.max(0, Math.round(Number(item.startBeat) || 0));
      const span = Math.max(1, Math.round(Number(item.beats) || 1));
      return '<span class="tb-note-tile tb-' + type + '" style="grid-column:' + (start + 1) + ' / span ' + span + '">' +
        '<span class="placed-vex-host tb-review-glyph" data-pattern="' + item.patternId + '" data-beats="' + span + '" data-start="' + start + '"></span>' +
      '</span>';
    }).join("");
    return '<div class="tb-music-grid" style="--beats:' + Math.max(1, beats || 1) + '">' + content + '</div>';
  }

  function scoreTapBack(state) {
    const measureCount = getMeasureCount(state);
    const total = state.totalBeats || totalBeatsForState(state);
    const beatMs = tapBackBeatMs(state);
    const start = state.tapBackCaptureStart || state.tapBackStart;
    const onsets = targetOnsets(state);
    const targets = onsets.map((onset, index) => ({
      index,
      beat: onset.beat,
      beatIndex: clamp(0, total - 1, Math.floor(onset.beat + 1e-9)),
      time: start + onset.beat * beatMs
    }));
    const beatGroups = [];
    for (let beat = 0; beat < total; beat += 1) {
      beatGroups[beat] = { beat, measure: measureIndexForBeat(state, beat), want: [], got: [], rawGot: [], ok: false, matched: 0, extra: 0 };
    }
    targets.forEach((target) => {
      beatGroups[target.beatIndex].want.push(target.time);
    });
    assignTapBackTapsToTargets(state, beatGroups, targets, start, beatMs);

    const perMeasure = [];
    for (let measure = 0; measure < measureCount; measure += 1) {
      perMeasure[measure] = { beats: 0, beatsOk: 0, onsets: 0, hits: 0, extra: 0, beatBeats: 0, beatHits: 0 };
    }
    let beatsOkTotal = 0;
    beatGroups.forEach((group) => {
      const summary = perMeasure[group.measure];
      summary.beats += 1;
      summary.onsets += group.want.length;
      let ok = group.got.length === group.want.length;
      let matched = 0;
      if (ok) {
        const used = group.got.map(() => false);
        for (let wantIndex = 0; wantIndex < group.want.length; wantIndex += 1) {
          let bestIndex = -1;
          let bestDelta = Infinity;
          for (let tapIndex = 0; tapIndex < group.got.length; tapIndex += 1) {
            if (used[tapIndex]) continue;
            const delta = Math.abs(group.got[tapIndex] - group.want[wantIndex]);
            if (delta < bestDelta) {
              bestDelta = delta;
              bestIndex = tapIndex;
            }
          }
          if (bestIndex >= 0 && bestDelta <= tapBackToleranceMs) {
            used[bestIndex] = true;
            matched += 1;
          } else {
            ok = false;
            break;
          }
        }
      }
      summary.hits += matched;
      group.ok = ok;
      group.matched = matched;
      group.extra = Math.max(0, group.got.length - group.want.length);
      // If a tap scored as correct, show it on the intended onset in the review.
      // The review should explain missed rhythms, not punish tiny accepted timing drift.
      group.displayGot = ok ? group.want.slice() : (group.rawGot && group.rawGot.length ? group.rawGot.slice() : group.got.slice());
      if (group.extra) summary.extra += group.extra;
      if (ok) {
        summary.beatsOk += 1;
        beatsOkTotal += 1;
      }
    });

    const beatTaps = state.tapBackBeatTaps.slice().sort((a, b) => a - b);
    const beatTapUsed = beatTaps.map(() => false);
    for (let beat = 0; beat < total; beat += 1) {
      const measure = measureIndexForBeat(state, beat);
      const targetTime = start + beat * beatMs;
      perMeasure[measure].beatBeats += 1;
      let bestIndex = -1;
      let bestDelta = Infinity;
      for (let i = 0; i < beatTaps.length; i += 1) {
        if (beatTapUsed[i]) continue;
        const delta = Math.abs(beatTaps[i] - targetTime);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestIndex = i;
        }
      }
      if (bestIndex >= 0 && bestDelta <= tapBackLockToleranceMs) {
        beatTapUsed[bestIndex] = true;
        perMeasure[measure].beatHits += 1;
      }
    }

    let passed = 0;
    let steadyMeasures = 0;
    const targetByMeasure = tapBackReferenceItemsByMeasure(state);
    const perfectRhythm = total > 0 && beatsOkTotal === total;
    const measures = perMeasure.map((summary, index) => {
      const rhythmOk = summary.beats > 0 ? summary.beatsOk === summary.beats : true;
      const beatOk = summary.beatBeats === 0 ? true : summary.beatHits >= summary.beatBeats - 1;
      const pass = rhythmOk && beatOk;
      if (pass) passed += 1;
      if (beatOk) steadyMeasures += 1;
      const startBeat = measureStartIndex(state, index);
      const measureBeats = measureBeatCount(state, index);
      const actualItems = targetByMeasure[index] || [];
      const performedTaps = tapBackPerformedTapPositionsForMeasure(state, index, beatGroups, start, beatMs);
      const performedItems = perfectRhythm || rhythmOk
        ? cloneTapBackReviewItems(actualItems)
        : tapBackPerformedItemsForMeasure(state, index, actualItems, beatGroups, start, beatMs);
      return {
        measure: index + 1,
        pass,
        rhythmSlip: !rhythmOk,
        beatSlip: !beatOk,
        beatsOk: summary.beatsOk,
        beats: summary.beats,
        extra: summary.extra,
        actualItems,
        performedItems,
        performedTaps
      };
    });
    return {
      // Original BeatQuest principle: score the performed rhythm per beat, all-or-nothing.
      // Do not loosen this back into onset partial credit, or opposite rhythms will score too high.
      percent: total ? Math.round((beatsOkTotal / total) * 100) : 0,
      beatPercent: measureCount ? Math.round((steadyMeasures / measureCount) * 100) : 0,
      passed,
      total: measureCount,
      measures,
      bonus: passed * tapBackBonusPerMeasure
    };
  }

  function assignTapBackTapsToTargets(state, beatGroups, targets, start, beatMs) {
    const total = state.totalBeats || totalBeatsForState(state);
    const rawTaps = state.tapBackTaps
      .slice()
      .sort((a, b) => a - b)
      .filter((tap) => tap >= start - tapBackToleranceMs && tap <= start + total * beatMs + tapBackToleranceMs);
    const offset = estimateTapBackRhythmOffset(rawTaps, targets, beatMs);
    const taps = rawTaps.map((raw, index) => ({ raw, time: raw - offset, index }));
    const candidates = [];

    taps.forEach((tap) => {
      targets.forEach((target) => {
        const delta = Math.abs(tap.time - target.time);
        if (delta <= tapBackToleranceMs) candidates.push({ tap, target, delta });
      });
    });

    candidates.sort((a, b) => a.delta - b.delta);
    const usedTaps = new Set();
    const usedTargets = new Set();
    candidates.forEach((candidate) => {
      if (usedTaps.has(candidate.tap.index) || usedTargets.has(candidate.target.index)) return;
      usedTaps.add(candidate.tap.index);
      usedTargets.add(candidate.target.index);
      const group = beatGroups[candidate.target.beatIndex];
      if (!group) return;
      group.got.push(candidate.tap.time);
      group.rawGot.push(candidate.tap.raw);
    });

    taps.forEach((tap) => {
      if (usedTaps.has(tap.index)) return;
      const target = nearestTapBackTarget(tap.time, targets);
      const relativeBeat = (tap.time - start) / beatMs;
      const beat = target
        ? target.beatIndex
        : clamp(0, total - 1, Math.round(relativeBeat));
      const group = beatGroups[beat];
      if (!group) return;
      group.got.push(tap.time);
      group.rawGot.push(tap.raw);
    });
  }

  function estimateTapBackRhythmOffset(rawTaps, targets, beatMs) {
    if (!rawTaps.length || !targets.length) return 0;
    const searchWindow = Math.min(170, beatMs * 0.28);
    let deltas = [];
    const pairCount = Math.min(rawTaps.length, targets.length);
    for (let index = 0; index < pairCount; index += 1) {
      const delta = rawTaps[index] - targets[index].time;
      if (Math.abs(delta) <= searchWindow) deltas.push(delta);
    }
    if (deltas.length < Math.min(2, targets.length)) {
      deltas = [];
      rawTaps.forEach((tap) => {
        const target = nearestTapBackTarget(tap, targets);
        if (!target) return;
        const delta = tap - target.time;
        if (Math.abs(delta) <= searchWindow) deltas.push(delta);
      });
    }
    if (deltas.length < Math.min(2, targets.length)) return 0;
    deltas.sort((a, b) => a - b);
    const middle = Math.floor(deltas.length / 2);
    const median = deltas.length % 2
      ? deltas[middle]
      : (deltas[middle - 1] + deltas[middle]) / 2;
    return clamp(-90, 90, median);
  }

  function nearestTapBackTarget(time, targets) {
    let best = null;
    let bestDelta = Infinity;
    targets.forEach((target) => {
      const delta = Math.abs(time - target.time);
      if (delta < bestDelta) {
        best = target;
        bestDelta = delta;
      }
    });
    return best;
  }

  function tapBackReferenceItemsByMeasure(state) {
    const byMeasure = Array.from({ length: getMeasureCount(state) }, () => []);
    // Tap Back review must mirror the solved music the student saw before the
    // bonus round. Do not prefer answerKey here; equivalent answers can render
    // differently and make the result page look like it changed the answer.
    const source = state.tapBackAnswerSnapshot && state.tapBackAnswerSnapshot.some(Boolean)
      ? state.tapBackAnswerSnapshot
      : state.placements && state.placements.some(Boolean)
        ? state.placements
        : state.answerKey && state.answerKey.some(Boolean)
          ? state.answerKey
          : null;

    if (source) {
      const starts = new Set();
      source.forEach((placement) => {
        if (placement) starts.add(placement.start);
      });
      starts.forEach((start) => {
        const placement = source[start];
        if (!placement) return;
        const measure = measureIndexForBeat(state, placement.start);
        byMeasure[measure].push({
          patternId: placement.id,
          startBeat: placement.start - measureStartIndex(state, measure),
          beats: placement.beats || 1
        });
      });
      byMeasure.forEach((items) => items.sort((a, b) => a.startBeat - b.startBeat));
      return byMeasure;
    }

    targetItems(state).forEach((item) => {
      const measure = measureIndexForBeat(state, item.start);
      byMeasure[measure].push({
        patternId: item.patternId,
        startBeat: item.start - measureStartIndex(state, measure),
        beats: item.beats || 1
      });
    });
    byMeasure.forEach((items) => items.sort((a, b) => a.startBeat - b.startBeat));
    return byMeasure;
  }

  function cloneTapBackReviewItems(items) {
    return (items || []).map((item) => ({
      patternId: item.patternId,
      startBeat: item.startBeat,
      beats: item.beats
    }));
  }

  function tapBackPerformedTapPositionsForMeasure(state, measure, beatGroups, startTime, beatMs) {
    const measureStart = measureStartIndex(state, measure);
    const measureBeats = measureBeatCount(state, measure);
    const positions = [];

    for (let offset = 0; offset < measureBeats; offset += 1) {
      const group = beatGroups[measureStart + offset];
      const taps = group && (group.displayGot || group.got) || [];
      taps.forEach((time) => {
        const relativeBeat = (time - startTime) / beatMs;
        positions.push(clamp(0, 1, (relativeBeat - measureStart) / measureBeats));
      });
    }

    return positions.sort((a, b) => a - b);
  }

  function tapBackPerformedItemsForMeasure(state, measure, actualItems, beatGroups, startTime, beatMs) {
    const items = [];
    const occupied = new Set();
    const measureStart = measureStartIndex(state, measure);
    const measureBeats = measureBeatCount(state, measure);

    actualItems.forEach((item) => {
      const absoluteStart = measureStart + item.startBeat;
      const span = Math.max(1, Math.round(Number(item.beats) || 1));
      const groups = [];
      for (let beat = absoluteStart; beat < absoluteStart + span; beat += 1) {
        groups.push(beatGroups[beat]);
      }
      if (groups.length && groups.every((group) => group && group.ok)) {
        items.push({
          patternId: item.patternId,
          startBeat: item.startBeat,
          beats: span
        });
        groups.forEach((group) => occupied.add(group.beat));
      }
    });

    for (let offset = 0; offset < measureBeats; offset += 1) {
      const beat = measureStart + offset;
      if (occupied.has(beat)) continue;
      const group = beatGroups[beat];
      const patternId = tapBackClosestPatternForBeat(state, group, startTime, beatMs);
      if (!patternId) continue;
      items.push({
        patternId,
        startBeat: offset,
        beats: 1
      });
    }

    return items.sort((a, b) => a.startBeat - b.startBeat);
  }

  function tapBackClosestPatternForBeat(state, group, startTime, beatMs) {
    const got = (group && group.got || []).map((time) => {
      return clamp(0, 0.999, ((time - startTime) / beatMs) - (group ? group.beat : 0));
    }).sort((a, b) => a - b);

    if (!got.length) return tapBackRestPatternForState(state);

    const active = activeBeatPatternIds(state);
    const candidateIds = (active.length ? active : Object.keys(beatVexPatterns)).filter((id) => {
      const pattern = beatPatternMap.get(id);
      const spec = beatVexPatterns[id];
      return pattern && spec && pattern.beats === 1 && !spec.fullMeasureRest && patternFitsBeatUnit(state, id);
    });
    let best = null;
    candidateIds.forEach((id) => {
      const onsets = soundingOnsetsForPattern(id);
      if (!onsets.length && got.length) return;
      const countPenalty = Math.abs(onsets.length - got.length) * 2;
      const pairs = Math.min(onsets.length, got.length);
      let timingCost = 0;
      for (let i = 0; i < pairs; i += 1) timingCost += Math.abs(onsets[i] - got[i]);
      const cost = countPenalty + timingCost;
      if (!best || cost < best.cost) best = { id, cost };
    });
    return best ? best.id : tapBackRestPatternForState(state);
  }

  function tapBackRestPatternForState(state) {
    const unit = state && state.level && state.level.beatUnit || state && state.beatUnit || "quarter";
    const preferred = {
      quarter: "quarter-rest",
      "dotted-quarter": "cd-dotted-quarter-rest",
      half: "hb-half-rest",
      "dotted-half": "dh-dotted-half-rest",
      eighth: "eb-eighth-rest",
      "dotted-eighth": "de-dotted-eighth-rest"
    }[unit];
    if (preferred && beatVexPatterns[preferred]) return preferred;
    return activeBeatPatternIds(state).find((id) => {
      const pattern = beatPatternMap.get(id);
      const spec = beatVexPatterns[id];
      return pattern && spec && pattern.beats === 1 && pattern.sounds === 0 && !spec.fullMeasureRest;
    }) || "quarter-rest";
  }

  function soundingOnsetsForPattern(id) {
    const spec = beatVexPatterns[id];
    if (!spec || !Array.isArray(spec.vexflow)) return [];
    const raw = spec.vexflow.map(durationToBeats);
    const sum = raw.reduce((total, value) => total + value, 0) || 1;
    const scale = (spec.beats || 1) / sum;
    let cursor = 0;
    const onsets = [];
    spec.vexflow.forEach((noteData, index) => {
      if (!isRestDuration(noteData)) onsets.push(cursor * scale);
      cursor += raw[index];
    });
    return onsets.sort((a, b) => a - b);
  }

  function clearBeatHintMarks(els) {
    els.board.querySelectorAll(".is-hint-mark").forEach((node) => node.classList.remove("is-hint-mark"));
    els.board.querySelectorAll(".beat-hint-badge").forEach((node) => node.remove());
  }

  function updateBankFilter(els, state) {
    const source = state.answerKey && state.answerKey.some(Boolean) ? state.answerKey : state.placements;
    const used = new Set(source.filter(Boolean).map((placement) => placement.id));
    const allowed = new Set(activeBeatPatternIds(state));
    els.bank.querySelectorAll(".rhythm-tile").forEach((tile) => {
      const outsideLevel = allowed.size && !allowed.has(tile.dataset.pattern);
      const hidden = outsideLevel || (state.narrowed && !used.has(tile.dataset.pattern));
      tile.classList.toggle("is-filtered-out", hidden);
      tile.disabled = hidden;
    });
  }

  function setupBeatDevJumper(els, state) {
    if (!els.devJumper || !els.devLevel || !els.devBars) return;
    if (!state.devMode) {
      els.devJumper.hidden = true;
      return;
    }

    clear(els.devLevel);
    if (els.devLevelScroll) clear(els.devLevelScroll);
    beatGuidedLevels.forEach((level) => {
      const availability = beatLevelAvailability(level);
      const option = document.createElement("option");
      option.value = String(level.number);
      option.disabled = !availability.canGenerate;
      option.textContent = formatLevelNumber(level.number) + " - " + level.title
        + (availability.label ? " (" + availability.label + ")" : "");
      option.title = availability.title;
      els.devLevel.appendChild(option);

      if (els.devLevelScroll) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.level = String(level.number);
        button.textContent = formatLevelNumber(level.number);
        button.disabled = !availability.canGenerate;
        button.title = availability.title;
        button.addEventListener("click", () => {
          setBeatDevLevel(els, state, level.number, Number(els.devBars.value));
        });
        els.devLevelScroll.appendChild(button);
      }
    });

    els.devLevel.value = String(state.levelNumber);
    els.devBars.value = String(state.bars);
    updateBeatDevMeterOptions(els, state);
    if (els.devRenderer) els.devRenderer.value = state.answerRenderer;
    els.devJumper.hidden = false;
    updateBeatDevDrawer(els, state);
    updateBeatDevLevelScroll(els, state, { immediate: true });

    if (els.devDrawerToggle) {
      els.devDrawerToggle.addEventListener("click", () => {
        state.devDrawerOpen = !state.devDrawerOpen;
        updateBeatDevDrawer(els, state);
        persistBeatDevLocation(state);
      });
    }

    els.devLevel.addEventListener("change", () => {
      setBeatDevLevel(els, state, Number(els.devLevel.value), Number(els.devBars.value));
    });
    els.devBars.addEventListener("change", () => {
      setBeatDevLevel(els, state, state.levelNumber, Number(els.devBars.value));
    });
    if (els.devMeter) {
      els.devMeter.addEventListener("change", () => {
        setBeatDevMeter(els, state, els.devMeter.value);
      });
    }
    if (els.devRenderer) {
      els.devRenderer.addEventListener("change", () => {
        setBeatRendererMode(els, state, els.devRenderer.value);
      });
    }
  }

  function updateBeatDevMeterOptions(els, state) {
    if (!els.devMeter) return;
    clear(els.devMeter);
    const auto = document.createElement("option");
    auto.value = "";
    auto.textContent = "Auto";
    els.devMeter.appendChild(auto);
    const meters = state.level && Array.isArray(state.level.timeSignatures) ? state.level.timeSignatures : [];
    meters.forEach((meter) => {
      const option = document.createElement("option");
      option.value = meter;
      option.textContent = meter;
      els.devMeter.appendChild(option);
    });
    els.devMeter.value = state.fixedMeter && meters.includes(state.fixedMeter) ? state.fixedMeter : "";
  }

  function updateBeatDevLevelScroll(els, state, options) {
    if (!els.devLevelScroll) return;
    let activeButton = null;
    els.devLevelScroll.querySelectorAll("button[data-level]").forEach((button) => {
      const active = button.dataset.level === String(state.levelNumber);
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "true" : "false");
      if (active) activeButton = button;
    });
    if (!activeButton || !state.devMode || typeof activeButton.scrollIntoView !== "function") return;
    activeButton.scrollIntoView({
      behavior: options && options.immediate ? "auto" : "smooth",
      block: "nearest",
      inline: "center"
    });
  }

  function updateBeatDevDrawer(els, state) {
    if (!els.devJumper) return;
    els.devJumper.classList.toggle("is-collapsed", !state.devDrawerOpen);
    if (els.devDrawerToggle) {
      els.devDrawerToggle.setAttribute("aria-expanded", state.devDrawerOpen ? "true" : "false");
      els.devDrawerToggle.setAttribute("aria-label", state.devDrawerOpen ? "Hide developer controls" : "Show developer controls");
    }
  }

  function setBeatRendererMode(els, state, mode) {
    state.answerRenderer = normalizeBeatRendererMode(mode);
    renderBeatBoard(els, state);
    updateBeatStatus(els, state);
    updateBeatHints(els, state, "Renderer: " + rendererModeLabel(state.answerRenderer) + ".");
    fitBeatLayout(els, state);
    persistBeatDevLocation(state);
  }

  function rendererModeLabel(mode) {
    if (mode === "all") return "live all";
    if (mode === "png") return "PNG fallback";
    return "hybrid live";
  }

  function setBeatDevMeter(els, state, meter) {
    const allowed = state.level && Array.isArray(state.level.timeSignatures) ? state.level.timeSignatures : [];
    state.fixedMeter = allowed.includes(meter) ? meter : "";
    state.meterCursor = 0;
    const meterChoice = meterChoiceForLevel(state.level, state.fixedMeter);
    state.timeSignature = meterChoice.timeSignature;
    state.beatsPerMeasure = meterChoice.beatsPerMeasure;
    state.measureMeters = null;
    state.totalBeats = totalBeatsForState(state);
    resetBeatAdaptiveLevel(state);
    newBeatRound(els, state, { skipRender: true });
    renderBeatBoard(els, state);
    updateBeatStatus(els, state);
    updateBeatHints(els, state, state.fixedMeter ? "Dev meter: " + state.fixedMeter + "." : "Dev meter: Auto.");
    fitBeatLayout(els, state);
    persistBeatDevLocation(state);
  }

  function setBeatDevLevel(els, state, requestedLevel, requestedBars) {
    const level = beatGuidedLevels[requestedLevel - 1];
    const availability = beatLevelAvailability(level);
    if (!level || !availability.canGenerate) {
      updateBeatHints(els, state, level
        ? "Level " + formatLevelNumber(level.number) + " is " + availability.label + "."
        : "That Hall chapter is missing from the redesign data.");
      updateBeatStatus(els, state);
      return;
    }

    state.level = level;
    state.levelNumber = level.number;
    state.requestedLevelNumber = level.number;
    state.levelTitle = level.title;
    state.levelFigures = level.figures.slice();
    state.fixedMeter = "";
    state.meterCursor = 0;
    const meterChoice = meterChoiceForLevel(level, "");
    state.timeSignature = meterChoice.timeSignature;
    state.beatsPerMeasure = meterChoice.beatsPerMeasure;
    state.bars = clamp(2, 16, Number(requestedBars) || state.bars || 2);
    state.measureMeters = null;
    state.totalBeats = totalBeatsForState(state);
    state.measureCols = 4;
    state.measureRows = null;
    resetBeatAdaptiveLevel(state);

    newBeatRound(els, state, { skipRender: true });
    renderBeatBank(els, state);
    updateBeatDevMeterOptions(els, state);
    renderBeatBoard(els, state);
    updateBeatStatus(els, state);
    updateBeatHints(els, state, "Dev jump: Level " + formatLevelNumber(level.number) + " / " + state.bars + " bars.");
    fitBeatLayout(els, state);
    persistBeatDevLocation(state);
  }

  function persistBeatDevLocation(state) {
    if (!state.devMode || !window.history || !window.location) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("level", String(state.levelNumber));
      url.searchParams.set("bars", String(state.bars));
      url.searchParams.set("renderer", state.answerRenderer || "hybrid");
      if (state.fixedMeter) {
        url.searchParams.set("meter", state.fixedMeter);
      } else {
        url.searchParams.delete("meter");
      }
      url.searchParams.set("devdrawer", state.devDrawerOpen ? "open" : "closed");
      window.history.replaceState(null, "", url);
    } catch (error) {
      // File URLs can be fussy in older browsers; the jumper still works without URL sync.
    }
  }

  function setBeatBars(els, state, bars) {
    state.bars = bars;
    state.totalBeats = totalBeatsForState(state);
    state.placements = new Array(state.totalBeats).fill(null);
    resetBeatAdaptiveLevel(state);
    newBeatRound(els, state, { skipRender: true });
    state.userTouched.clear();
    state.attempts = 0;
    state.submitted = false;
    state.narrowed = false;
    state.pickMode = null;
    renderBeatBoard(els, state);
    updateBeatStatus(els, state);
    updateBeatHints(els, state, "");
    fitBeatLayout(els, state);
  }

  function newBeatRound(els, state, options) {
    const opts = options || {};
    stopTapBackBonus(els, state);
    configureRoundMeter(state, { rowCols: state.measureCols });
    state.measureRows = null;
    state.target = generateBeatTarget(state);
    state.answerKey = answerKeyFromTarget(state, state.target);
    state.placements = new Array(state.totalBeats).fill(null);
    state.userTouched.clear();
    state.resultMarks.clear();
    state.attempts = 0;
    state.submitted = false;
    state.solved = false;
    state.pickMode = null;
    state.narrowed = false;
    state.speed = "medium";
    state.tempoBpm = 100;
    state.listens = 0;
    state.groove = 100;
    state.tapBackDone = false;
    state.tapBackOpen = false;
    state.tapBackPhase = "idle";
    state.tapBackBestBonus = 0;
    state.tapBackAnswerSnapshot = [];
    state.wrongThisRound = false;
    state.chargedHints.clear();
    state.roundStats = makeBeatRoundStats();
    if (els && els.tapOverlay) els.tapOverlay.hidden = true;
    if (els && els.device) els.device.classList.remove("is-tapback", "is-tapback-review");
    if (els && els.bank) els.bank.removeAttribute("aria-hidden");
    document.body.classList.remove("tapback-open");
    if (opts.reveal) {
      state.placements = cloneBeatPlacements(state.answerKey);
      for (let i = 0; i < state.totalBeats; i += 1) state.userTouched.add(i);
    }
    if (els && !opts.skipRender) {
      renderBeatBoard(els, state);
      updateBeatStatus(els, state);
      updateBeatHints(els, state, opts.message || "");
      fitBeatLayout(els, state);
    }
  }

  function generateBeatTarget(state) {
    const target = [];
    const pool = activeBeatPatterns(state);
    const safePool = pool.length ? pool : [beatPatternMap.get("quarter")].filter(Boolean);
    const measures = getMeasureCount(state);

    for (let measure = 0; measure < measures; measure += 1) {
      const items = [];
      let beat = 0;
      let guard = 0;
      const beatsInMeasure = measureBeatCount(state, measure);
      while (beat < beatsInMeasure && guard < 30) {
        guard += 1;
        const remaining = beatsInMeasure - beat;
        const choices = safePool.filter((pattern) => pattern.beats <= remaining);
        const usable = choices.length ? choices : [beatPatternMap.get("quarter")];
        let pick = chooseBeatTargetPattern(state, usable);
        if (!pick) pick = beatPatternMap.get("quarter");
        items.push({ patternId: pick.id, startBeat: beat + 1, beats: pick.beats });
        beat += pick.beats;
      }
      target.push(items);
    }

    ensureTargetUsesNewerFigure(state, target);
    canonicalizeFullMeasureRests(state, target);
    avoidTwoMeasureFullValueRepeat(state, target);
    avoidTwoMeasureMonotony(state, target);
    return target;
  }

  function chooseBeatTargetPattern(state, usable) {
    if (!usable || !usable.length) return null;
    if (!state || !state.adaptive || !state.adaptive.enabled) {
      return usable[Math.floor(Math.random() * usable.length)];
    }
    const bias = state.adaptive.formula.weakBias || 1;
    const weights = usable.map((pattern) => {
      const mastery = state.adaptive.figureMastery.get(pattern.id) || 0;
      const weakWeight = 1 + bias * Math.pow(1 - mastery / 100, 1.4);
      const newestBoost = pattern.id === (state.levelFigures || [])[Math.max(0, (state.levelFigures || []).length - 1)] ? 1.25 : 1;
      return weakWeight * newestBoost;
    });
    const total = weights.reduce((sum, value) => sum + value, 0);
    let pick = Math.random() * total;
    for (let i = 0; i < usable.length; i += 1) {
      pick -= weights[i];
      if (pick <= 0) return usable[i];
    }
    return usable[usable.length - 1];
  }

  function canonicalizeFullMeasureRests(state, target) {
    target.forEach((items, measureIndex) => {
      const beatsPerMeasure = measureBeatCount(state, measureIndex);
      const restId = measureRestIdForBeats(beatsPerMeasure);
      if (!restId || !beatPatternMap.has(restId) || beatsPerMeasure < 2) return;
      if (!Array.isArray(items) || !items.length) return;
      let allSilent = true;
      const covered = new Array(beatsPerMeasure).fill(false);
      items.forEach((item) => {
        const pattern = beatPatternMap.get(item.patternId);
        if (!pattern || pattern.sounds !== 0) allSilent = false;
        const start = Math.max(0, Number(item.startBeat || 1) - 1);
        const beats = Math.max(1, Math.round(Number(item.beats || pattern && pattern.beats || 1)));
        for (let beat = start; beat < Math.min(beatsPerMeasure, start + beats); beat += 1) {
          covered[beat] = true;
        }
      });
      if (allSilent && covered.every(Boolean)) {
        // Correct notation: a silent full measure is one measure rest, not stacked beat rests.
        target[measureIndex] = [{ patternId: restId, startBeat: 1, beats: beatsPerMeasure }];
      }
    });
  }

  function avoidTwoMeasureFullValueRepeat(state, target) {
    if (getMeasureCount(state) !== 2 || !Array.isArray(target) || target.length !== 2) return;
    const fullValueIds = target.map((items, measureIndex) => {
      if (!Array.isArray(items) || items.length !== 1) return "";
      const item = items[0];
      const pattern = beatPatternMap.get(item.patternId);
      const beatsInMeasure = measureBeatCount(state, measureIndex);
      if (!pattern || pattern.sounds <= 0 || pattern.beats !== beatsInMeasure || item.startBeat !== 1) return "";
      return pattern.id;
    });
    if (!fullValueIds[0] || fullValueIds[0] !== fullValueIds[1]) return;

    const measureIndex = 1;
    const beatsInMeasure = measureBeatCount(state, measureIndex);
    const oneBeatFillers = activeBeatPatterns(state)
      .filter((pattern) => pattern.beats === 1 && pattern.sounds > 0 && pattern.id !== fullValueIds[0]);
    if (!oneBeatFillers.length) return;

    const preferred = ["two-eighths", "quarter", "four-sixteenths", "cd-three-eighths", "hb-two-quarters"];
    const ordered = preferred
      .map((id) => oneBeatFillers.find((pattern) => pattern.id === id))
      .filter(Boolean);
    oneBeatFillers.forEach((pattern) => {
      if (!ordered.includes(pattern)) ordered.push(pattern);
    });

    target[measureIndex] = [];
    for (let beat = 0; beat < beatsInMeasure; beat += 1) {
      const pattern = ordered[beat % ordered.length];
      target[measureIndex].push({ patternId: pattern.id, startBeat: beat + 1, beats: 1 });
    }
  }

  function avoidTwoMeasureMonotony(state, target) {
    if (getMeasureCount(state) !== 2 || !Array.isArray(target) || target.length !== 2) return;
    const flat = flattenTargetPatternIdsByBeat(state, target);
    const unique = new Set(flat.filter(Boolean));
    const measuresMatch = measurePatternSignature(target[0]) === measurePatternSignature(target[1]);
    if (unique.size > 1 && !measuresMatch) return;
    const changed = replaceTargetItemForVariety(state, target, unique);
    if (changed) return;
    rebuildSecondMeasureForVariety(state, target);
  }

  function flattenTargetPatternIdsByBeat(state, target) {
    const flat = [];
    target.forEach((items, measureIndex) => {
      const measureStart = measureStartIndex(state, measureIndex);
      const beatsInMeasure = measureBeatCount(state, measureIndex);
      (items || []).forEach((item) => {
        const start = measureStart + Math.max(0, Math.round(Number(item.startBeat || 1)) - 1);
        const beats = Math.max(1, Math.round(Number(item.beats || 1)));
        for (let beat = start; beat < Math.min(measureStart + beatsInMeasure, start + beats); beat += 1) {
          flat[beat] = item.patternId;
        }
      });
    });
    return flat;
  }

  function measurePatternSignature(items) {
    return (items || [])
      .map((item) => [item.patternId, item.startBeat, item.beats].join("@"))
      .join("|");
  }

  function protectedGenerationIds(state) {
    const figures = state.levelFigures || [];
    if (!figures.length) return new Set();
    if (state && state.level && state.level.changeKind) return new Set();
    const required = state.level && Array.isArray(state.level.requiredFigures)
      ? state.level.requiredFigures.filter((id) => figures.includes(id))
      : [];
    return new Set(required.length ? required : [figures[figures.length - 1]]);
  }

  function replacementPatternsForItem(state, item) {
    const current = beatPatternMap.get(item.patternId);
    const itemBeats = Math.max(1, Math.round(Number(item.beats || current && current.beats || 1)));
    const audibleCurrent = current && current.sounds > 0;
    return activeBeatPatterns(state)
      .filter((pattern) => {
        if (!pattern || pattern.id === item.patternId || pattern.beats !== itemBeats) return false;
        if (audibleCurrent && pattern.sounds <= 0) return false;
        return true;
      })
      .sort((a, b) => {
        const aSounding = a.sounds > 0 ? 0 : 1;
        const bSounding = b.sounds > 0 ? 0 : 1;
        return aSounding - bSounding || a.id.localeCompare(b.id);
      });
  }

  function replaceTargetItemForVariety(state, target, currentUniqueIds) {
    const protectedIds = protectedGenerationIds(state);
    const secondMeasure = target[1] || [];
    const candidates = secondMeasure
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => replacementPatternsForItem(state, item).length);
    if (!candidates.length) return false;
    const preferred = candidates.find(({ item }) => !protectedIds.has(item.patternId)) || candidates[candidates.length - 1];
    const replacements = replacementPatternsForItem(state, preferred.item);
    const varied = replacements.find((pattern) => !currentUniqueIds.has(pattern.id)) || replacements[0];
    if (!varied) return false;
    secondMeasure[preferred.index] = {
      patternId: varied.id,
      startBeat: preferred.item.startBeat,
      beats: preferred.item.beats
    };
    return true;
  }

  function rebuildSecondMeasureForVariety(state, target) {
    const beatsInMeasure = measureBeatCount(state, 1);
    const oneBeatFillers = activeBeatPatterns(state)
      .filter((pattern) => pattern.beats === 1 && pattern.sounds > 0);
    if (oneBeatFillers.length < 2 || beatsInMeasure < 2) return;
    target[1] = [];
    for (let beat = 0; beat < beatsInMeasure; beat += 1) {
      const pattern = oneBeatFillers[beat % oneBeatFillers.length];
      target[1].push({ patternId: pattern.id, startBeat: beat + 1, beats: 1 });
    }
  }

  function ensureTargetUsesNewerFigure(state, target) {
    // Changing-meter chapters are testing meter awareness, not forcing the
    // newest rhythm figure. Forcing the last figure here made Ch19 repeatedly
    // open with triplet quarters, which is pedagogically lopsided.
    if (state && state.level && state.level.changeKind) return;
    const figures = state.levelFigures || [];
    if (figures.length < 2 || !target.length) return;
    const required = state.level && Array.isArray(state.level.requiredFigures)
      ? state.level.requiredFigures.filter((id) => figures.includes(id))
      : [];
    const featuredIds = required.length ? required : [figures[figures.length - 1]];
    featuredIds.forEach((featuredId, offset) => {
      if (target.some((measure) => measure.some((item) => item.patternId === featuredId))) return;
      const featured = beatPatternMap.get(featuredId);
      const measureIndex = Math.min(offset, target.length - 1);
      const measureBeats = measureBeatCount(state, measureIndex);
      if (!featured || featured.beats > measureBeats) return;
      const measure = target[measureIndex];
      measure.length = 0;
      measure.push({ patternId: featured.id, startBeat: 1, beats: featured.beats });
      let beat = featured.beats;
      const filler = figures
        .map((id) => beatPatternMap.get(id))
        .filter(Boolean)
        .find((pattern) => pattern.beats === 1 && pattern.id !== featured.id)
        || beatPatternMap.get("quarter");
      while (beat < measureBeats && filler) {
        measure.push({ patternId: filler.id, startBeat: beat + 1, beats: filler.beats });
        beat += filler.beats;
      }
    });
  }

  function answerKeyFromTarget(state, target) {
    const answer = new Array(state.totalBeats).fill(null);
    target.forEach((measure, measureIndex) => {
      measure.forEach((item) => {
        const pattern = beatPatternMap.get(item.patternId);
        if (!pattern) return;
        const start = measureStartIndex(state, measureIndex) + item.startBeat - 1;
        const placement = { id: pattern.id, label: pattern.label, beats: pattern.beats, start };
        for (let i = start; i < start + pattern.beats && i < answer.length; i += 1) {
          answer[i] = placement;
        }
      });
    });
    return answer;
  }

  function loadBeamTestRound(state) {
    state.bars = 2;
    state.measureMeters = null;
    state.totalBeats = totalBeatsForState(state);
    state.measureCols = 2;
    state.target = [
      [
        { patternId: "eighth-two-sixteenths", startBeat: 1, beats: 1 },
        { patternId: "two-sixteenths-eighth", startBeat: 2, beats: 1 },
        { patternId: "eighth-two-sixteenths", startBeat: 3, beats: 1 },
        { patternId: "two-sixteenths-eighth", startBeat: 4, beats: 1 }
      ],
      [
        { patternId: "two-sixteenths-eighth", startBeat: 1, beats: 1 },
        { patternId: "eighth-two-sixteenths", startBeat: 2, beats: 1 },
        { patternId: "two-sixteenths-eighth", startBeat: 3, beats: 1 },
        { patternId: "eighth-two-sixteenths", startBeat: 4, beats: 1 }
      ]
    ];
    state.answerKey = answerKeyFromTarget(state, state.target);
    state.placements = cloneBeatPlacements(state.answerKey);
    state.userTouched.clear();
    for (let i = 0; i < state.totalBeats; i += 1) state.userTouched.add(i);
    state.submitted = false;
    state.solved = false;
    state.resultMarks.clear();
  }

  function loadCompoundBeamTestRound(state) {
    const level = beatGuidedLevels[7] || state.level;
    state.level = level;
    state.levelNumber = level.number;
    state.requestedLevelNumber = level.number;
    state.levelTitle = level.title;
    state.levelFigures = level.figures.slice();
    state.timeSignature = "6/8";
    state.beatsPerMeasure = 2;
    state.bars = 4;
    state.measureMeters = null;
    state.totalBeats = totalBeatsForState(state);
    state.measureCols = 4;
    state.target = [
      [
        { patternId: "cd-three-eighths", startBeat: 1, beats: 1 },
        { patternId: "cd-six-sixteenths", startBeat: 2, beats: 1 }
      ],
      [
        { patternId: "cd-two16-8-8", startBeat: 1, beats: 1 },
        { patternId: "cd-8-two16-8", startBeat: 2, beats: 1 }
      ],
      [
        { patternId: "cd-8-8-two16", startBeat: 1, beats: 1 },
        { patternId: "cd-four16-8", startBeat: 2, beats: 1 }
      ],
      [
        { patternId: "cd-8-four16", startBeat: 1, beats: 1 },
        { patternId: "cd-quarter-two16", startBeat: 2, beats: 1 }
      ]
    ];
    state.answerKey = answerKeyFromTarget(state, state.target);
    state.placements = cloneBeatPlacements(state.answerKey);
    state.userTouched.clear();
    for (let i = 0; i < state.totalBeats; i += 1) state.userTouched.add(i);
    state.submitted = false;
    state.solved = false;
    state.resultMarks.clear();
  }

  function loadDottedHalfBeamTestRound(state) {
    const level = beatGuidedLevels[14] || state.level;
    state.level = level;
    state.levelNumber = level.number;
    state.requestedLevelNumber = level.number;
    state.levelTitle = level.title;
    state.levelFigures = level.figures.slice();
    state.timeSignature = "6/4";
    state.beatsPerMeasure = 2;
    state.bars = 4;
    state.measureMeters = null;
    state.totalBeats = totalBeatsForState(state);
    state.measureCols = 4;
    state.target = [
      [
        { patternId: "dh-six-eighths", startBeat: 1, beats: 1 },
        { patternId: "dh-four8-q", startBeat: 2, beats: 1 }
      ],
      [
        { patternId: "dh-q-four8", startBeat: 1, beats: 1 },
        { patternId: "dh-two8-q-q", startBeat: 2, beats: 1 }
      ],
      [
        { patternId: "dh-q-two8-q", startBeat: 1, beats: 1 },
        { patternId: "dh-q-q-two8", startBeat: 2, beats: 1 }
      ],
      [
        { patternId: "dh-half-two8", startBeat: 1, beats: 1 },
        { patternId: "dh-two8-half", startBeat: 2, beats: 1 }
      ]
    ];
    state.answerKey = answerKeyFromTarget(state, state.target);
    state.placements = cloneBeatPlacements(state.answerKey);
    state.userTouched.clear();
    for (let i = 0; i < state.totalBeats; i += 1) state.userTouched.add(i);
    state.submitted = false;
    state.solved = false;
    state.resultMarks.clear();
  }

  function loadDottedEighthBeamTestRound(state) {
    const level = beatGuidedLevels[16] || state.level;
    state.level = level;
    state.levelNumber = level.number;
    state.requestedLevelNumber = level.number;
    state.levelTitle = level.title;
    state.levelFigures = level.figures.slice();
    state.timeSignature = "6/16";
    state.beatsPerMeasure = 2;
    state.bars = 4;
    state.measureMeters = null;
    state.totalBeats = totalBeatsForState(state);
    state.measureCols = 4;
    state.target = [
      [
        { patternId: "de-three-16ths", startBeat: 1, beats: 1 },
        { patternId: "de-duplet", startBeat: 2, beats: 1 }
      ],
      [
        { patternId: "de-two32-16-16", startBeat: 1, beats: 1 },
        { patternId: "de-six-32nds", startBeat: 2, beats: 1 }
      ],
      [
        { patternId: "de-16-two32-16", startBeat: 1, beats: 1 },
        { patternId: "de-16-16-two32", startBeat: 2, beats: 1 }
      ],
      [
        { patternId: "de-four32-16", startBeat: 1, beats: 1 },
        { patternId: "de-16-four32", startBeat: 2, beats: 1 }
      ]
    ];
    state.answerKey = answerKeyFromTarget(state, state.target);
    state.placements = cloneBeatPlacements(state.answerKey);
    state.userTouched.clear();
    for (let i = 0; i < state.totalBeats; i += 1) state.userTouched.add(i);
    state.submitted = false;
    state.solved = false;
    state.resultMarks.clear();
  }

  function buildBeatExample(state) {
    const answer = new Array(state.totalBeats).fill(null);
    let beat = 0;
    let cursor = 0;
    while (beat < state.totalBeats) {
      let pattern = beatPatternMap.get(beatDemoLoop[cursor % beatDemoLoop.length]);
      cursor += 1;
      if (!pattern || !canPlaceBeatPattern(state, pattern, beat)) {
        pattern = beatPatternMap.get("quarter");
      }
      const placement = { id: pattern.id, label: pattern.label, beats: pattern.beats, start: beat };
      for (let i = beat; i < beat + pattern.beats; i += 1) {
        answer[i] = placement;
      }
      beat += pattern.beats;
    }
    return answer;
  }

  function cloneBeatPlacements(placements) {
    const clone = new Array(placements.length).fill(null);
    const starts = new Set();
    placements.forEach((placement) => {
      if (placement) starts.add(placement.start);
    });
    starts.forEach((start) => {
      const placement = placements[start];
      if (!placement) return;
      const copy = { id: placement.id, label: placement.label, beats: placement.beats, start: placement.start };
      for (let i = copy.start; i < copy.start + copy.beats; i += 1) {
        clone[i] = copy;
      }
    });
    return clone;
  }

  function submitBeatAnswer(els, state) {
    if (state.solved) return;
    state.submitted = true;
    state.attempts += 1;
    state.resultMarks.clear();
    const result = checkBeatAnswer(state);

    if (result.allCorrect) {
      const clean = state.adaptive && state.adaptive.enabled
        ? beatAdaptiveRoundClean(state)
        : state.attempts === 1 && !state.wrongThisRound;
      state.solved = true;
      state.streak = clean ? state.streak + 1 : 0;
      const breakdown = calculateBeatRoundScore(state, clean);
      state.roundStats.scoreBreakdown = breakdown;
      state.score += breakdown.points;
      floatBeatDelta("+" + breakdown.points, true, els.points);
      playWinSound();
      const adaptiveAction = recordBeatAdaptiveRound(state, true, clean);
      const adaptiveText = beatAdaptiveMessage(state, adaptiveAction);
      updateBeatHints(els, state, clean
        ? "Correct. Clean run: " + breakdown.points + " points." + (adaptiveText ? " " + adaptiveText : "")
        : "Correct: " + breakdown.points + " points. " + breakdown.wrongAttempts + " attempt" + (breakdown.wrongAttempts === 1 ? "" : "s") + " before correct." + (adaptiveText ? " " + adaptiveText : ""));
    } else {
      state.wrongThisRound = true;
      state.streak = 0;
      state.roundStats.wrongAttempts += 1;
      state.score -= beatScoring.wrongAttemptPenalty;
      floatBeatDelta("-" + beatScoring.wrongAttemptPenalty, false, els.points);
      playMissSound();
      result.wrong.forEach((index) => {
        state.resultMarks.add(index);
        const placement = state.placements[index];
        if (placement) {
          for (let i = placement.start; i < placement.start + placement.beats; i += 1) {
            state.resultMarks.add(i);
          }
        }
      });
      updateBeatHints(els, state, result.wrong.length + " beat" + (result.wrong.length === 1 ? "" : "s") + " off. -" + beatScoring.wrongAttemptPenalty + " points.");
    }

    renderBeatBoard(els, state);
    updateBeatStatus(els, state);
    fitBeatLayout(els, state);
  }

  function checkBeatAnswer(state) {
    const targetGrid = gridFromBeatItems(state, targetItems(state));
    const answerGrid = gridFromBeatItems(state, answerItems(state));
    const wrong = [];
    let allCorrect = true;

    for (let beat = 0; beat < state.totalBeats; beat += 1) {
      const start = beat * rhythmGridResolution;
      let different = false;
      for (let tick = 0; tick < rhythmGridResolution; tick += 1) {
        if (targetGrid[start + tick] !== answerGrid[start + tick]) {
          different = true;
          break;
        }
      }
      if (different) {
        allCorrect = false;
        wrong.push(beat);
      }
    }

    return { allCorrect, wrong };
  }

  function targetItems(state) {
    const items = [];
    state.target.forEach((measure, measureIndex) => {
      measure.forEach((item) => {
        items.push({
          start: measureStartIndex(state, measureIndex) + item.startBeat - 1,
          patternId: item.patternId,
          beats: item.beats
        });
      });
    });
    return items;
  }

  function answerItems(state) {
    const items = [];
    const starts = new Set();
    state.placements.forEach((placement) => {
      if (placement) starts.add(placement.start);
    });
    starts.forEach((start) => {
      const placement = state.placements[start];
      if (!placement) return;
      items.push({
        start,
        patternId: placement.id,
        beats: placement.beats
      });
    });
    return items;
  }

  function gridFromBeatItems(state, items) {
    const grid = new Array(state.totalBeats * rhythmGridResolution).fill(0);
    items.forEach((item) => {
      const spec = beatVexPatterns[item.patternId];
      if (!spec || !Array.isArray(spec.vexflow)) return;
      const raw = spec.vexflow.map((noteData) => durationToBeats(noteData) * rhythmGridResolution);
      const sum = raw.reduce((total, value) => total + value, 0) || rhythmGridResolution;
      const scale = ((item.beats || spec.beats || 1) * rhythmGridResolution) / sum;
      let position = item.start * rhythmGridResolution;
      spec.vexflow.forEach((noteData, index) => {
        const gridIndex = Math.round(position);
        if (String(noteData.duration || "").indexOf("r") === -1 && gridIndex >= 0 && gridIndex < grid.length) {
          grid[gridIndex] = 1;
        }
        position += raw[index] * scale;
      });
    });
    return grid;
  }

  function targetOnsets(state) {
    const onsets = [];
    targetItems(state).forEach((item) => {
      const spec = beatVexPatterns[item.patternId];
      if (!spec || !Array.isArray(spec.vexflow)) return;
      const raw = spec.vexflow.map(durationToBeats);
      const sum = raw.reduce((total, value) => total + value, 0) || 1;
      const scale = (item.beats || spec.beats || 1) / sum;
      let position = item.start;
      spec.vexflow.forEach((noteData, index) => {
        const duration = raw[index] * scale;
        if (String(noteData.duration || "").indexOf("r") === -1) {
          onsets.push({ beat: position, duration });
        }
        position += duration;
      });
    });
    return onsets.sort((a, b) => a.beat - b.beat);
  }

  function countTargetSoundsInBeat(state, index) {
    const grid = gridFromBeatItems(state, targetItems(state));
    const start = index * rhythmGridResolution;
    let sounds = 0;
    for (let tick = 0; tick < rhythmGridResolution; tick += 1) {
      if (grid[start + tick]) sounds += 1;
    }
    return sounds;
  }

  async function playBeatRhythm(els, state) {
    if (state.playing) return;
    state.playing = true;
    state.listens += 1;
    maybeChargeExtraListen(els, state);
    updateBeatStatus(els, state);
    const zones = Array.from(els.board.querySelectorAll(".beat-drop-zone"));
    const beatMs = Math.round(60000 / state.tempoBpm);
    const onsets = targetOnsets(state);
    const countInBeats = measureBeatCount(state, 0);

    for (let count = 0; count < countInBeats; count += 1) {
      playMetroTick(count === 0);
      await wait(beatMs);
    }

    for (let i = 0; i < state.totalBeats; i += 1) {
      zones.forEach((zone) => zone.classList.remove("is-playing"));
      if (state.beatGuide && zones[i]) zones[i].classList.add("is-playing");
      if (state.metronome) playMetroTick(beatNumberInMeasure(state, i) === 1);
      onsets
        .filter((onset) => onset.beat >= i && onset.beat < i + 1)
        .forEach((onset) => {
          const delay = Math.max(0, (onset.beat - i) * beatMs);
          window.setTimeout(() => {
            playRhythmHit(onset.duration * beatMs / 1000);
          }, delay);
        });
      await wait(beatMs);
    }
    zones.forEach((zone) => zone.classList.remove("is-playing"));
    state.playing = false;
    updateBeatHints(els, state, "");
    updateBeatStatus(els, state);
  }

  function fitBeatLayout(els, state) {
    const stageRect = els.stage.getBoundingClientRect();
    const bankRect = els.bank.getBoundingClientRect();
    const tapBackLayout = !!(state.tapBackOpen || (els.device && els.device.classList.contains("is-tapback")));
    const phonePortrait = window.matchMedia && window.matchMedia("(max-width: 700px) and (orientation: portrait)").matches;
    const stageStyle = window.getComputedStyle(els.stage);
    const stagePadX = (parseFloat(stageStyle.paddingLeft) || 0) + (parseFloat(stageStyle.paddingRight) || 0);
    const stagePadY = (parseFloat(stageStyle.paddingTop) || 0) + (parseFloat(stageStyle.paddingBottom) || 0);
    const gap = stageRect.width < 560 ? 4 : 6;
    const measureGap = stageRect.width < 560 ? 5 : 9;
    const measurePad = stageRect.width < 560 ? 3 : 5;
    const sigSlot = els.board.querySelector(".time-signature-slot");
    const sigGap = parseFloat(window.getComputedStyle(els.device).getPropertyValue("--sig-gap")) || 6;
    const sigSlotW = sigSlot ? sigSlot.getBoundingClientRect().width : 48;
    const sigWidth = sigSlotW + sigGap;
    const availableW = Math.max(220, stageRect.width - stagePadX - sigWidth - 10);
    const availableH = Math.max(90, stageRect.height - stagePadY - 10);
    const measureCount = getMeasureCount(state);
    const measureCounts = measureBeatCounts(state);
    const maxMeasureBeats = maxBeatsPerMeasure(state);
    let best = null;
    let rerolledForRows = false;
    let rowsChanged = false;

    if (isChangingMeterState(state)) {
      const previousRowsKey = rowLayoutKey(state.measureRows);
      let layout = null;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        layout = chooseSmartChangingLayout(state, availableW, availableH, measureGap, measurePad, gap, sigSlotW, {
          phonePortrait,
          compactTransport: compactTransportApplies(state),
          tapBackLayout,
          stageWidth: stageRect.width,
          stageHeight: stageRect.height
        });
        if (!rebuildBlankChangingRoundForRows(state, layout.rows)) break;
        rerolledForRows = true;
      }
      const rows = layout ? layout.rows : defaultMeasureRows(state, state.measureCols || 4);
      state.measureRows = rows;
      rowsChanged = rowLayoutKey(rows) !== previousRowsKey;
      best = {
        cols: Math.max(1, ...rows.map((row) => row.length || 1)),
        rows: rows.length,
        slotW: layout ? layout.slotW : 54
      };
    } else {
      if (Array.isArray(state.measureRows) && state.measureRows.length) rowsChanged = true;
      state.measureRows = null;
      const maxMeasureCols = Math.max(1, Math.min(measureCount, 4));
      const allowedMeasureCols = getAlignedMeasureCols(measureCount, maxMeasureCols);
      const candidates = [];
      const rowStatsForCols = (cols) => {
        let maxBeatSlots = 1;
        let maxInternalGaps = 0;
        let maxMeasuresInRow = 1;
        let maxInlineSigs = 0;
        let maxChildren = 1;
        for (let start = 0; start < measureCount; start += cols) {
          const rowCounts = measureCounts.slice(start, start + cols);
          let inlineSigs = 0;
          for (let measure = start + 1; measure < Math.min(measureCount, start + cols); measure += 1) {
            if (isChangingMeterState(state) && timeSignatureForMeasure(state, measure) !== timeSignatureForMeasure(state, measure - 1)) {
              inlineSigs += 1;
            }
          }
          const beatSlots = rowCounts.reduce((total, value) => total + value, 0);
          const internalGaps = rowCounts.reduce((total, value) => total + Math.max(0, value - 1), 0);
          maxBeatSlots = Math.max(maxBeatSlots, beatSlots);
          maxInternalGaps = Math.max(maxInternalGaps, internalGaps);
          maxMeasuresInRow = Math.max(maxMeasuresInRow, rowCounts.length);
          maxInlineSigs = Math.max(maxInlineSigs, inlineSigs);
          maxChildren = Math.max(maxChildren, rowCounts.length + inlineSigs);
        }
        return { maxBeatSlots, maxInternalGaps, maxMeasuresInRow, maxInlineSigs, maxChildren };
      };

      allowedMeasureCols.forEach((cols) => {
        const rows = Math.ceil(measureCount / cols);
        const rowStats = rowStatsForCols(cols);
        const slotFromW = (
          availableW
          - measureGap * Math.max(0, rowStats.maxChildren - 1)
          - rowStats.maxInlineSigs * sigSlotW
          - rowStats.maxMeasuresInRow * ((measurePad * 2) + 8)
          - gap * rowStats.maxInternalGaps
        ) / rowStats.maxBeatSlots;
        const slotFromH = ((availableH - measureGap * (rows - 1) - rows * measurePad * 2) / rows) * 104 / 72;
        const candidateW = Math.floor(Math.min(104, slotFromW, slotFromH));
        const candidate = { cols, rows, slotW: candidateW };
        candidates.push(candidate);
        if (!best || candidateW > best.slotW || (candidateW === best.slotW && cols > best.cols)) {
          best = candidate;
        }
      });

      if (measureCount <= 4) {
        const singleRow = candidates.find((candidate) => candidate.cols === measureCount);
        const minSingleRowSlot = maxMeasureBeats <= 2 ? 50 : 42;
        if (singleRow && singleRow.slotW >= minSingleRowSlot) best = singleRow;
      }

      if (phonePortrait && !tapBackLayout) {
        const readableSlot = maxMeasureBeats <= 2 ? 56 : 44;
        const widestReadable = candidates
          .filter((candidate) => candidate.slotW >= readableSlot)
          .sort((a, b) => b.cols - a.cols || b.slotW - a.slotW)[0];
        if (widestReadable) best = widestReadable;
      }

      if (tapBackLayout) {
        const readableSlot = stageRect.width < 760 || stageRect.height < 420 ? 36 : 46;
        const widestReadable = candidates
          .filter((candidate) => candidate.slotW >= readableSlot)
          .sort((a, b) => b.cols - a.cols || b.slotW - a.slotW)[0];
        if (widestReadable) best = widestReadable;
      }
    }

    let slotW = best ? best.slotW : 54;

    if (bankRect.width > 0 && bankRect.height > 0) {
      const bankCount = Math.max(1, activeBeatPatterns(state).length);
      const minBankSlotW = phonePortrait ? (bankCount > 16 ? 72 : 78) : 42;
      const bankSlotRatio = phonePortrait ? 60 / 104 : 62 / 104;
      const minBankSlotH = Math.round(minBankSlotW * bankSlotRatio);
      const bankGap = phonePortrait ? 7 : gap;
      const maxBankSlotW = phonePortrait ? 112 : 110;
      let bankSlotW = maxBankSlotW;
      let bankSlotH = Math.round(bankSlotW * bankSlotRatio);
      let bankCols = Math.max(1, Math.floor((bankRect.width + bankGap) / (bankSlotW + bankGap)));
      let bankRows = Math.ceil(bankCount / bankCols);
      while (bankSlotW > minBankSlotW && bankRows * bankSlotH + bankGap * (bankRows - 1) > bankRect.height) {
        bankSlotW -= 2;
        bankSlotH = Math.round(bankSlotW * bankSlotRatio);
        bankCols = Math.max(1, Math.floor((bankRect.width + bankGap) / (bankSlotW + bankGap)));
        bankRows = Math.ceil(bankCount / bankCols);
      }
      document.documentElement.style.setProperty("--bank-slot-w", clamp(minBankSlotW, maxBankSlotW, bankSlotW) + "px");
      document.documentElement.style.setProperty("--bank-slot-h", clamp(minBankSlotH, Math.round(maxBankSlotW * bankSlotRatio), bankSlotH) + "px");
    }

    slotW = clamp(22, 104, slotW);
    const slotH = Math.round(slotW * 72 / 104);
    const cols = best ? best.cols : 1;
    markPlacedVexPending(els.board);
    document.documentElement.style.setProperty("--measure-cols", String(cols));
    document.documentElement.style.setProperty("--slot-gap", gap + "px");
    document.documentElement.style.setProperty("--measure-gap", measureGap + "px");
    document.documentElement.style.setProperty("--measure-pad", measurePad + "px");
    document.documentElement.style.setProperty("--slot-w", slotW + "px");
    document.documentElement.style.setProperty("--slot-h", slotH + "px");
    if (state.measureCols !== cols || rowsChanged || rerolledForRows) {
      state.measureCols = cols;
      renderBeatBoard(els, state);
    }
    updateFloatingRailPosition(els, state);
    requestAnimationFrame(() => refreshPlacedVex(els.board));
  }

  function getAlignedMeasureCols(measureCount, maxMeasureCols) {
    const aligned = [];
    for (let cols = 1; cols <= maxMeasureCols; cols += 1) {
      if (measureCount % cols === 0) aligned.push(cols);
    }
    return aligned.length ? aligned : Array.from({ length: maxMeasureCols }, (_, index) => index + 1);
  }

  const degreeLabels = ["1", "2", "3", "4", "5", "6", "7"];
  const streamNotes = [
    { degree: 1, midi: 60 },
    { degree: 3, midi: 64 },
    { degree: 2, midi: 62 },
    { degree: 1, midi: 60 },
    { degree: 5, midi: 67 },
    { degree: 4, midi: 65 },
    { degree: 3, midi: 64 },
    { degree: 1, midi: 72 },
    { degree: 2, midi: 62 },
    { degree: 1, midi: 60 }
  ];

  const labelMelody = [
    { degree: 1, midi: 60 },
    { degree: 2, midi: 62 },
    { degree: 3, midi: 64 },
    { degree: 5, midi: 67 },
    { degree: 3, midi: 64 },
    { degree: 2, midi: 62 },
    { degree: 1, midi: 60 }
  ];

  function initMelodyQuest() {
    const els = {
      frame: document.getElementById("melodyFrame"),
      stage: document.getElementById("melodyStage"),
      play: document.getElementById("melodyPlay"),
      home: document.getElementById("melodyHome"),
      check: document.getElementById("melodyCheck"),
      message: document.getElementById("melodyMessage"),
      modeChip: document.getElementById("melodyModeChip"),
      levelChip: document.getElementById("melodyLevelChip"),
      hearings: document.getElementById("melodyHearings"),
      keyChip: document.getElementById("melodyKeyChip"),
      groove: document.getElementById("melodyGroove"),
      readout: document.getElementById("melodyReadout"),
      trial: document.getElementById("melodyTrial"),
      progress: document.getElementById("melodyProgress"),
      modeButtons: Array.from(document.querySelectorAll("[data-melody-mode]"))
    };

    const state = {
      mode: "find",
      hearingsLeft: 3,
      playing: false,
      findMarked: new Set(),
      findSubmitted: false,
      findTiles: [],
      homeTile: null,
      labelAnswers: new Array(labelMelody.length).fill(null),
      activeSlot: 0,
      labelSubmitted: false
    };

    els.play.appendChild(icon("play", 18));
    els.home.prepend(icon("play", 15));

    els.modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.melodyMode;
        if (!mode || mode === state.mode) return;
        state.mode = mode;
        state.hearingsLeft = 3;
        state.playing = false;
        if (mode === "find") {
          state.findMarked.clear();
          state.findSubmitted = false;
        } else {
          state.labelAnswers = new Array(labelMelody.length).fill(null);
          state.activeSlot = 0;
          state.labelSubmitted = false;
        }
        renderMelody(els, state);
      });
    });

    els.play.addEventListener("click", () => {
      if (state.mode === "find") playFindStream(els, state);
      else playLabelMelody(els, state);
    });

    els.home.addEventListener("click", () => audio.play(60, 0.75));

    els.check.addEventListener("click", () => {
      if (state.mode === "find") checkFindStream(els, state);
      else checkLabelMelody(els, state);
    });

    renderMelody(els, state);

    const scheduleFit = makeRafScheduler(() => fitMelodyLayout(els, state));
    window.addEventListener("resize", scheduleFit);
    requestAnimationFrame(scheduleFit);
    setTimeout(scheduleFit, 120);
  }

  function renderMelody(els, state) {
    clear(els.stage);
    els.modeButtons.forEach((button) => {
      const on = button.dataset.melodyMode === state.mode;
      button.classList.toggle("is-active", on);
      button.setAttribute("aria-selected", on ? "true" : "false");
    });

    if (state.mode === "find") renderFindMode(els, state);
    else renderNameMode(els, state);

    updateMelodyStatus(els, state);
    fitMelodyLayout(els, state);
  }

  function renderFindMode(els, state) {
    const targetBar = document.createElement("div");
    targetBar.className = "tap-target-bar";

    const chip = document.createElement("button");
    chip.className = "target-chip";
    chip.type = "button";
    chip.setAttribute("aria-label", "Hear home");
    chip.append(icon("play", 16));
    const chipLabel = document.createElement("b");
    chipLabel.textContent = "HOME";
    chip.appendChild(chipLabel);
    chip.addEventListener("click", () => audio.play(60, 0.75));
    targetBar.appendChild(chip);

    const stream = document.createElement("div");
    stream.className = "stream-grid";

    const home = document.createElement("button");
    home.className = "melody-tile home-tile";
    home.type = "button";
    home.append(icon("play", 15), document.createTextNode("HOME"));
    home.setAttribute("aria-label", "Play home");
    home.addEventListener("click", () => audio.play(60, 0.75));
    state.homeTile = home;
    stream.appendChild(home);

    state.findTiles = streamNotes.map((note, index) => {
      const tile = document.createElement("button");
      tile.className = "melody-tile";
      tile.type = "button";
      tile.textContent = String(index + 1);
      tile.setAttribute("aria-label", "Note " + (index + 1));
      tile.addEventListener("click", () => {
        if (state.findSubmitted || state.playing) return;
        if (state.findMarked.has(index)) state.findMarked.delete(index);
        else state.findMarked.add(index);
        tile.classList.toggle("is-marked", state.findMarked.has(index));
        updateMelodyStatus(els, state);
      });
      if (state.findMarked.has(index)) tile.classList.add("is-marked");
      stream.appendChild(tile);
      return tile;
    });

    els.stage.append(targetBar, stream);
  }

  function renderNameMode(els, state) {
    const layout = document.createElement("div");
    layout.className = "labeling-layout";

    const line = document.createElement("div");
    line.className = "rhythm-label-line";
    line.style.setProperty("--note-count", String(labelMelody.length));

    labelMelody.forEach((note, index) => {
      const cell = document.createElement("div");
      cell.className = "note-cell";

      const figure = document.createElement("div");
      figure.className = "note-figure";
      figure.appendChild(noteSvg(index));

      const slot = document.createElement("button");
      slot.className = "answer-slot";
      slot.type = "button";
      slot.setAttribute("aria-label", "Answer slot " + (index + 1));
      slot.textContent = state.labelAnswers[index] || "";
      if (!state.labelAnswers[index]) slot.textContent = String(index + 1);
      if (index === state.activeSlot && !state.labelSubmitted) slot.classList.add("is-active");
      if (state.labelSubmitted) {
        const correct = state.labelAnswers[index] === degreeLabels[note.degree - 1];
        slot.classList.add(correct ? "is-correct" : "is-wrong");
        slot.textContent = (state.labelAnswers[index] || "?") + "/" + degreeLabels[note.degree - 1];
      }
      slot.addEventListener("click", () => {
        if (state.labelSubmitted) return;
        state.activeSlot = index;
        renderMelody(els, state);
      });

      cell.append(figure, slot);
      line.appendChild(cell);
    });

    const bank = document.createElement("div");
    bank.className = "degree-bank";
    [1, 2, 3, 4, 5].forEach((degree) => {
      const pad = document.createElement("button");
      pad.className = "degree-pad";
      pad.type = "button";
      pad.textContent = degreeLabels[degree - 1];
      pad.addEventListener("click", () => assignDegree(els, state, degreeLabels[degree - 1]));
      bank.appendChild(pad);
    });

    layout.append(line, bank);
    els.stage.appendChild(layout);
  }

  function noteSvg(index) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 48 64");
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    const y = 36 - (index % 4) * 5;
    const head = document.createElementNS(SVG_NS, "ellipse");
    head.setAttribute("cx", "21");
    head.setAttribute("cy", String(y));
    head.setAttribute("rx", "8");
    head.setAttribute("ry", "6");
    head.setAttribute("transform", "rotate(-18 21 " + y + ")");
    const stem = document.createElementNS(SVG_NS, "path");
    stem.setAttribute("d", "M27 " + y + "V10h3v" + (y - 8));
    const flag = document.createElementNS(SVG_NS, "path");
    flag.setAttribute("d", "M30 10c8 3 10 8 5 14-1-5-3-8-5-10z");
    svg.append(head, stem, flag);
    return svg;
  }

  function assignDegree(els, state, label) {
    if (state.labelSubmitted) return;
    const slot = state.activeSlot >= 0 ? state.activeSlot : state.labelAnswers.findIndex((v) => !v);
    if (slot < 0) return;
    state.labelAnswers[slot] = label;
    const next = state.labelAnswers.findIndex((v) => !v);
    state.activeSlot = next;
    renderMelody(els, state);
  }

  async function playFindStream(els, state) {
    if (state.playing || state.hearingsLeft <= 0) return;
    state.playing = true;
    state.hearingsLeft -= 1;
    updateMelodyStatus(els, state);
    setText(els.message, "Listening.");
    state.homeTile.classList.add("is-playing");
    await audio.play(60, 0.55);
    await wait(320);
    state.homeTile.classList.remove("is-playing");
    for (let i = 0; i < streamNotes.length; i += 1) {
      if (state.mode !== "find") break;
      state.findTiles.forEach((tile) => tile.classList.remove("is-playing"));
      state.findTiles[i].classList.add("is-playing");
      await audio.play(streamNotes[i].midi, 0.32);
      await wait(110);
    }
    state.findTiles.forEach((tile) => tile.classList.remove("is-playing"));
    state.playing = false;
    setText(els.message, "Mark every HOME tile, then check.");
    updateMelodyStatus(els, state);
  }

  async function playLabelMelody(els, state) {
    if (state.playing || state.hearingsLeft <= 0) return;
    state.playing = true;
    state.hearingsLeft -= 1;
    updateMelodyStatus(els, state);
    setText(els.message, "Listening.");
    await audio.play(60, 0.58);
    await wait(280);
    for (const note of labelMelody) {
      if (state.mode !== "name") break;
      await audio.play(note.midi, 0.34);
      await wait(95);
    }
    state.playing = false;
    setText(els.message, "Name each note under the rhythm line.");
    updateMelodyStatus(els, state);
  }

  function checkFindStream(els, state) {
    if (state.findSubmitted || state.findMarked.size === 0) return;
    state.findSubmitted = true;
    let hits = 0;
    let misses = 0;
    let falseMarks = 0;
    state.findTiles.forEach((tile, index) => {
      const target = streamNotes[index].degree === 1;
      const marked = state.findMarked.has(index);
      tile.classList.remove("is-marked", "is-playing");
      tile.textContent = degreeLabels[streamNotes[index].degree - 1];
      if (target && marked) {
        tile.classList.add("is-correct");
        tile.appendChild(makeBadge("check"));
        hits += 1;
      } else if (!target && marked) {
        tile.classList.add("is-wrong");
        tile.appendChild(makeBadge("cross"));
        falseMarks += 1;
      } else if (target && !marked) {
        tile.classList.add("is-missed");
        tile.appendChild(makeBadge("dot"));
        misses += 1;
      }
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".hint-menu")) closeBeatHintMenu(els);
    });
    const clean = misses === 0 && falseMarks === 0;
    setText(els.message, clean ? "Correct." : hits + " correct, " + misses + " missed, " + falseMarks + " extra.");
    updateMelodyStatus(els, state);
  }

  function checkLabelMelody(els, state) {
    if (state.labelSubmitted || state.labelAnswers.some((v) => !v)) return;
    state.labelSubmitted = true;
    let correct = 0;
    labelMelody.forEach((note, index) => {
      if (state.labelAnswers[index] === degreeLabels[note.degree - 1]) correct += 1;
    });
    renderMelody(els, state);
    setText(els.message, correct === labelMelody.length ? "Correct." : correct + " of " + labelMelody.length + " correct.");
  }

  function makeBadge(name) {
    const badge = document.createElement("span");
    badge.className = "tile-badge";
    badge.appendChild(icon(name, 12));
    return badge;
  }

  function updateMelodyStatus(els, state) {
    const find = state.mode === "find";
    setText(els.modeChip, find ? "Find Home" : "Name Degrees");
    setText(els.levelChip, find ? "M0" : "M3");
    setText(els.keyChip, "C major");
    setText(els.hearings, state.hearingsLeft + " hearings");

    const progress = find
      ? clamp(0, 100, state.findMarked.size * 18 + (state.findSubmitted ? 24 : 0))
      : clamp(0, 100, state.labelAnswers.filter(Boolean).length * 12 + (state.labelSubmitted ? 20 : 0));
    const groove = Math.round(62 + progress * 0.28);
    setText(els.groove, "Groove " + groove);
    setText(els.readout, find ? "LEVEL 1 / FIND HOME / LIVE" : "LEVEL 3 / NAME DEGREES / RHYTHM");
    setText(els.trial, find ? "Marked " + state.findMarked.size : state.labelAnswers.filter(Boolean).length + " of " + labelMelody.length);
    if (els.progress) els.progress.style.width = Math.max(5, progress) + "%";
    document.documentElement.style.setProperty("--groove-col", "hsl(" + Math.round(18 + progress * 1.12) + " 78% 44%)");

    els.home.classList.toggle("is-hidden", find);
    els.play.disabled = state.playing || state.hearingsLeft <= 0;
    els.check.disabled = find
      ? state.findSubmitted || state.findMarked.size === 0
      : state.labelSubmitted || state.labelAnswers.some((v) => !v);

    const submitted = find ? state.findSubmitted : state.labelSubmitted;
    if (!state.playing && !submitted) {
      setText(els.message, find ? "Mark every HOME tile, then check." : "Name each note under the rhythm line.");
    }
  }

  function fitMelodyLayout() {
    const stream = document.querySelector(".stream-grid");
    if (!stream) return;
    const rect = stream.getBoundingClientRect();
    const count = stream.children.length;
    if (!rect.width || !count) return;
    const gap = 8;
    const minW = 42;
    const minH = 38;
    const maxColsAtMin = Math.max(1, Math.floor((rect.width + gap) / (minW + gap)));
    const rows = clamp(1, 3, Math.ceil(count / maxColsAtMin));
    const cols = Math.ceil(count / rows);
    const tileW = clamp(minW, 64, Math.floor((rect.width - gap * (cols - 1)) / cols));
    const tileH = clamp(minH, 64, Math.floor((rect.height - gap * (rows - 1)) / rows));
    document.documentElement.style.setProperty("--melody-tile-w", tileW + "px");
    document.documentElement.style.setProperty("--melody-tile-h", tileH + "px");
  }

  function makeRafScheduler(fn) {
    let raf = 0;
    return function schedule() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        fn();
      });
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    const app = document.body.dataset.app;
    if (app === "beatquest") initBeatQuest();
    if (app === "melodyquest") initMelodyQuest();
  });
})();
