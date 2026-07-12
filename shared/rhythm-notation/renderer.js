/* shared/rhythm-notation/renderer.js — the ONE shared rhythm-notation renderer.
 *
 * EXTRACTED from quest-redesign.js — the RhythmQuest redesign game — as the ONE renderer that rhythm
 * surfaces share INSTEAD of each carrying a drifting copy. Originally copied byte-for-byte (the tuning
 * IS the value; do not "clean up" the numbers). TWO intentional changes since extraction:
 *   (a) the triplet bracket legs + number are now styled INLINE (search "custom-triplet-bracket") so the
 *       engine draws a COMPLETE bracket even on a host whose page CSS lacks the `.custom-triplet-bracket`
 *       rule — e.g. TapQuest's `.placed-vexflow` tile art, which used to render solid-black blobs;
 *   (b) getNotationGrid's per-beat `unit` is now (width-anchor)/count, fixing a leftward compression of
 *       MULTI-beat figures' onsets (see the comment there). Single-beat figures are unaffected.
 * ON THIS RENDERER TODAY: RhythmQuest, the shared answer board, and — via the rhythm-vexflow-renderer.js
 * adapter — TapQuest + BeatQuest Casual. STILL MIGRATING onto it (so not yet drift-proof suite-wide):
 * MelodyQuest and the teacher/projector surfaces. Source ranges (quest-redesign.js): catalog+constants
 * 303-443, rhythmAsset 648-651, family/custom-beaming 676-690, render block 2152-2754.
 *
 * The render block references only its own helpers + this catalog/constants + VexFlow + the DOM —
 * it never touches game state (verified). Exposes window.RhythmNotation; consumers call
 * renderPlacedVex(host, {id, beats, start}) into a .placed-vex-host (see renderer.css).
 */
(function () {
  "use strict";
  const SVG_NS = "http://www.w3.org/2000/svg";

  // General utility, copied from quest-redesign.js:47 (used by the render block's beam trimming).
  function clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
  }

  const beatVexPatterns = {
    quarter: { beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }] },
    "two-eighths": { beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] },
    "four-sixteenths": { beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] },
    "eighth-two-sixteenths": { beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] },
    "two-sixteenths-eighth": { beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "8" }] },
    "sixteenth-eighth-sixteenth": { beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "16" }] },
    "dotted-eighth-sixteenth": { beats: 1, vexflow: [{ keys: ["b/4"], duration: "8", dots: 1 }, { keys: ["b/4"], duration: "16" }] },
    "sixteenth-dotted-eighth": { beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "8", dots: 1 }] },
    "eighth-rest-eighth": { beats: 1, vexflow: [{ keys: ["b/4"], duration: "8r" }, { keys: ["b/4"], duration: "8" }] },
    "eighth-eighth-rest": { beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8r" }] },
    "eighth-rest-two-sixteenths": { beats: 1, vexflow: [{ keys: ["b/4"], duration: "8r" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] },
    "sixteenth-rest-three-sixteenths": { beats: 1, vexflow: [{ keys: ["b/4"], duration: "16r" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] },
    "quarter-rest": { beats: 1, vexflow: [{ keys: ["b/4"], duration: "qr" }] },
    "triplet-eighths": { beats: 1, triplet: true, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] },
    half: { beats: 2, vexflow: [{ keys: ["b/4"], duration: "h" }] },
    "dotted-half": { beats: 3, vexflow: [{ keys: ["b/4"], duration: "h", dots: 1 }] },
    whole: { beats: 4, vexflow: [{ keys: ["b/4"], duration: "w" }] },
    "dotted-quarter-eighth": { beats: 2, vexflow: [{ keys: ["b/4"], duration: "q", dots: 1 }, { keys: ["b/4"], duration: "8" }] },
    "eighth-quarter-eighth": { beats: 2, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "8" }] },
    "triplet-quarters": { beats: 2, triplet: true, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "q" }] },
    "measure-rest-2": { beats: 2, fullMeasureRest: true, vexflow: [{ keys: ["b/4"], duration: "wr" }] },
    "measure-rest-3": { beats: 3, fullMeasureRest: true, vexflow: [{ keys: ["b/4"], duration: "wr" }] },
    "measure-rest-4": { beats: 4, fullMeasureRest: true, vexflow: [{ keys: ["b/4"], duration: "wr" }] }
  };
  function assetRenderedSpec(spec) {
    spec.renderAssetOnly = true;
    return spec;
  }
  Object.assign(beatVexPatterns, {
    "cd-dotted-quarter": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q", dots: 1 }] }),
    "cd-three-eighths": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] }),
    "cd-quarter-eighth": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "8" }] }),
    "cd-eighth-quarter": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "q" }] }),
    "cd-duplet": assetRenderedSpec({ beats: 1, duplet: true, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] }),
    "cd-six-sixteenths": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "cd-two16-8-8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] }),
    "cd-8-two16-8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "8" }] }),
    "cd-8-8-two16": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "cd-four16-8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "8" }] }),
    "cd-8-four16": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "cd-quarter-two16": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "cd-two16-quarter": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "q" }] }),
    "cd-dotted-quarter-rest": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "qr", dots: 1 }] }),
    "cd-8rest-8-8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8r" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] }),
    "cd-8-8rest-8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8r" }, { keys: ["b/4"], duration: "8" }] }),
    "cd-8-8-8rest": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8r" }] }),
    "cd-quarter-8rest": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "8r" }] }),
    "cd-8rest-quarter": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8r" }, { keys: ["b/4"], duration: "q" }] }),
    "hb-half": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "h" }] }),
    "hb-two-quarters": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "q" }] }),
    "hb-quarter-two8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] }),
    "hb-two8-quarter": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "q" }] }),
    "hb-four-eighths": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] }),
    "hb-half-rest": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "hr" }] }),
    "hb-quarter-qrest": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "qr" }] }),
    "hb-qrest-quarter": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "qr" }, { keys: ["b/4"], duration: "q" }] }),
    "hb-8rest-8-quarter": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8r" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "q" }] }),
    "hb-quarter-8rest-8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "8r" }, { keys: ["b/4"], duration: "8" }] }),
    "hb-eight-16ths": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "hb-two16-q": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "q" }] }),
    "hb-q-two16": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "hb-two8-four16": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "hb-four16-two8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] }),
    "hb-8-two16-8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "8" }] }),
    "hb-two16-8-8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] }),
    "hb-8-8-two16": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "dh-dotted-half": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "h", dots: 1 }] }),
    "dh-three-quarters": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "q" }] }),
    "dh-half-quarter": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "h" }, { keys: ["b/4"], duration: "q" }] }),
    "dh-quarter-half": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "h" }] }),
    "dh-duplet": assetRenderedSpec({ beats: 1, duplet: true, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "q" }] }),
    "dh-six-eighths": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] }),
    "dh-dotted-half-rest": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "hr", dots: 1 }] }),
    "dh-qrest-q-q": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "qr" }, { keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "q" }] }),
    "dh-q-qrest-q": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "qr" }, { keys: ["b/4"], duration: "q" }] }),
    "dh-q-q-qrest": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "qr" }] }),
    "dh-half-qrest": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "h" }, { keys: ["b/4"], duration: "qr" }] }),
    "dh-qrest-half": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "qr" }, { keys: ["b/4"], duration: "h" }] }),
    "dh-two8-q-q": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "q" }] }),
    "dh-q-two8-q": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "q" }] }),
    "dh-q-q-two8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] }),
    "dh-four8-q": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "q" }] }),
    "dh-q-four8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "q" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] }),
    "dh-half-two8": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "h" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }] }),
    "dh-two8-half": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "h" }] }),
    "eb-eighth": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }] }),
    "eb-two-sixteenths": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "eb-four-32nds": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }] }),
    "eb-eighth-rest": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8r" }] }),
    "de-dotted-eighth": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8", dots: 1 }] }),
    "de-three-16ths": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "de-eighth-16th": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "16" }] }),
    "de-16th-eighth": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "8" }] }),
    "de-duplet": assetRenderedSpec({ beats: 1, duplet: true, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "de-dotted-eighth-rest": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8r", dots: 1 }] }),
    "de-16rest-16-16": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16r" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "de-16-16rest-16": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16r" }, { keys: ["b/4"], duration: "16" }] }),
    "de-16-16-16rest": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16r" }] }),
    "de-eighth-16rest": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "16r" }] }),
    "de-16rest-eighth": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16r" }, { keys: ["b/4"], duration: "8" }] }),
    "de-six-32nds": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }] }),
    "de-two32-16-16": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "de-16-two32-16": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "16" }] }),
    "de-16-16-two32": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }] }),
    "de-four32-16": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "16" }] }),
    "de-16-four32": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }] }),
    "de-eighth-two32": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "8" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }] }),
    "de-two32-eighth": assetRenderedSpec({ beats: 1, vexflow: [{ keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "32" }, { keys: ["b/4"], duration: "8" }] }),
    "tpl-quintuplet": assetRenderedSpec({ beats: 1, tuplet: 5, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "tpl-sextuplet": assetRenderedSpec({ beats: 1, tuplet: 6, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] }),
    "tpl-septuplet": assetRenderedSpec({ beats: 1, tuplet: 7, vexflow: [{ keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }, { keys: ["b/4"], duration: "16" }] })
  });
  const answerRenderScale = 0.82;
  const notationGridNudgePx = -6;
  const opticalLayoutProfiles = {
    "quarter-rest": { xMode: "onset", xOffset: 8, scale: 0.82 },
    "measure-rest-2": { xMode: "center-beat", scale: 0.86 },
    "measure-rest-3": { xMode: "center-beat", scale: 0.86 },
    "measure-rest-4": { xMode: "center-beat", scale: 0.86 }
  };
  const strictOnsetProfiles = {
    "two-eighths": [0, 0.5],
    "four-sixteenths": [0, 0.25, 0.5, 0.75],
    "eighth-two-sixteenths": [0, 0.5, 0.75],
    "two-sixteenths-eighth": [0, 0.25, 0.5],
    "sixteenth-eighth-sixteenth": [0, 0.25, 0.75],
    "dotted-eighth-sixteenth": [0, 0.75],
    "sixteenth-dotted-eighth": [0, 0.25],
    "eighth-rest-eighth": [0, 0.5],
    "eighth-eighth-rest": [0, 0.5],
    "eighth-rest-two-sixteenths": [0, 0.5, 0.75],
    "sixteenth-rest-three-sixteenths": [0, 0.25, 0.5, 0.75],
    "triplet-eighths": [0, 1 / 3, 2 / 3],
    "dotted-quarter-eighth": [0, 1.5],
    "eighth-quarter-eighth": [0, 0.5, 1.5],
    "triplet-quarters": [0, 2 / 3, 4 / 3]
  };
  const beamTrimProfiles = {
    "eighth-two-sixteenths": [{ path: 2, start: 1.8 }]
  };

  function rhythmAsset(id) {
    return "assets/rhythm-assets/bank/" + id + ".png";
  }


  function rendererFamilyForPattern(id) {
    if (String(id || "").startsWith("cd-")) return "compound";
    if (String(id || "").startsWith("hb-")) return "half-beat";
    if (String(id || "").startsWith("dh-")) return "dotted-half";
    if (String(id || "").startsWith("eb-")) return "eighth-beat";
    if (String(id || "").startsWith("de-")) return "dotted-eighth";
    if (String(id || "").startsWith("tpl-")) return "tuplet";
    return "simple";
  }

  function usesBeatUnitCustomBeaming(id) {
    const family = rendererFamilyForPattern(id);
    return family === "compound" || family === "half-beat" || family === "dotted-half" || family === "eighth-beat" || family === "dotted-eighth";
  }


  function getVexFlow() {
    return window.Vex && window.Vex.Flow;
  }

  function schedulePlacedVexRender(host, placement) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => renderPlacedVex(host, placement));
    });
  }

  function refreshPlacedVex(root) {
    if (!root || !getVexFlow()) return;
    root.querySelectorAll(".placed-vex-host").forEach((host) => {
      const id = host.dataset.pattern;
      const spec = beatVexPatterns[id];
      if (!id || !spec) return;
      renderPlacedVex(host, {
        id,
        beats: Number(host.dataset.beats || spec.beats || 1),
        start: Number(host.dataset.start || 0)
      });
    });
  }

  function markPlacedVexPending(root) {
    if (!root) return;
    root.querySelectorAll(".placed-vex-host").forEach((host) => {
      host.classList.remove("is-rendered");
      host.classList.add("is-rendering");
    });
  }

  function markPlacedVexRendered(host) {
    if (!host) return;
    host.classList.remove("is-rendering");
    host.classList.add("is-rendered");
  }

  function renderPlacedVex(host, placement) {
    const spec = beatVexPatterns[placement.id];
    if (!spec || !host.isConnected) return;
    const VF = getVexFlow();
    if (!VF) return;

    host.classList.remove("is-rendered");
    host.classList.add("is-rendering");
    host.textContent = "";
    const displayWidth = Math.max(48, Math.round(host.clientWidth || 104 * placement.beats));
    const displayHeight = Math.max(38, Math.round(host.clientHeight || 70));
    const width = Math.max(displayWidth, Math.round(104 * (placement.beats || 1)));
    const height = Math.max(displayHeight, 72);

    try {
      applyBeatMusicFont(VF);
      const renderer = new VF.Renderer(host, VF.Renderer.Backends.SVG);
      renderer.resize(width, height);

      const context = renderer.getContext();
      const stave = new VF.Stave(0, -31, width + 8);
      stave.setContext(context);

      const notes = spec.vexflow.map((noteData) => {
        const note = new VF.StaveNote({
          clef: "percussion",
          keys: noteData.keys,
          duration: noteData.duration
        });
        forceBeatStemDown(VF, note, noteData);

        if (noteData.dots) {
          for (let i = 0; i < noteData.dots; i += 1) {
            note.addModifier(new VF.Dot(), 0);
          }
        }

        return note;
      });

      const beams = makeBeatBeams(VF, placement, spec, notes);

      const voiceTime = voiceTimeForVexSpec(spec);
      const voice = new VF.Voice(voiceTime);
      setBeatVoiceMode(VF, voice);
      voice.addTickables(notes);
      new VF.Formatter()
        .joinVoices([voice])
        .format([voice], Math.max(24, width - 24));
      voice.draw(context, stave);
      beams.forEach((beam) => beam.setContext(context).draw());

      const noteXs = notes
        .map((note) => typeof note.getAbsoluteX === "function" ? Math.round(note.getAbsoluteX()) : null)
        .filter((x) => x !== null);
      normalizePlacedVex(host, placement, noteXs.length ? noteXs[0] : null, noteXs, width, height);
    } catch (error) {
      host.textContent = "";
      const fallback = document.createElement("img");
      fallback.className = "placed-bank-glyph";
      fallback.src = rhythmAsset(placement.id);
      fallback.alt = "";
      host.appendChild(fallback);
      markPlacedVexRendered(host);
    }
  }

  function applyBeatMusicFont(VF) {
    if (typeof VF.setMusicFont === "function") {
      VF.setMusicFont("Bravura", "Gonville", "Custom");
    }
  }

  function setBeatVoiceMode(VF, voice) {
    if (!voice || typeof voice.setMode !== "function") return;
    if (VF.VoiceMode && VF.VoiceMode.SOFT !== undefined) {
      voice.setMode(VF.VoiceMode.SOFT);
    } else if (VF.Voice && VF.Voice.Mode && VF.Voice.Mode.SOFT !== undefined) {
      voice.setMode(VF.Voice.Mode.SOFT);
    }
  }

  function forceBeatStemDown(VF, note, noteData) {
    if (!note || isRestDuration(noteData) || typeof note.setStemDirection !== "function") return;
    if (!VF.StaveNote || VF.StaveNote.STEM_DOWN === undefined) return;
    note.setStemDirection(VF.StaveNote.STEM_DOWN);
  }

  function makeBeatBeams(VF, placement, spec, notes) {
    if (!spec || !Array.isArray(spec.vexflow) || !notes.length) return [];

    if (tupletNumberForSpec(spec) && notes.length > 1) {
      notes.forEach((note) => note.setStemDirection(VF.StaveNote.STEM_DOWN));
      const canBeam = notes.every((note, index) => isBeamableDuration(spec.vexflow[index]));
      return canBeam ? [new VF.Beam(notes)] : [];
    }

    if (usesBeatUnitCustomBeaming(placement.id)) {
      const beams = makeIndexedBeams(VF, compoundBeamRuns(spec.vexflow), notes);
      if (needsFlatBeamCleanup(spec)) beams.forEach(configureFlatBeam);
      return beams;
    }

    return VF.Beam.generateBeams(notes);
  }

  function needsFlatBeamCleanup(spec) {
    return !!(spec && Array.isArray(spec.vexflow) && spec.vexflow.some((noteData) => String(noteData.duration || "").replace(/r/g, "") === "32"));
  }

  function configureFlatBeam(beam) {
    if (!beam || !beam.render_options) return;
    // Ch17 dotted-eighth 32nd figures use the same fixed onset grid as the 16th fixes.
    // Keep these beams flat so VexFlow's pre-alignment slope does not survive the grid stretch.
    beam.render_options.flat_beams = true;
    beam.render_options.max_slope = 0;
    beam.render_options.min_slope = 0;
    beam.slope = 0;
  }

  function makeIndexedBeams(VF, runs, notes) {
    return runs
      .map((run) => run.map((index) => notes[index]).filter(Boolean))
      .filter((group) => group.length > 1)
      .map((group) => new VF.Beam(group));
  }

  function compoundBeamRuns(vexflow) {
    const runs = [];
    let run = [];
    vexflow.forEach((noteData, index) => {
      if (isBeamableDuration(noteData)) {
        run.push(index);
        return;
      }
      if (run.length > 1) runs.push(run);
      run = [];
    });
    if (run.length > 1) runs.push(run);
    return runs;
  }

  function isBeamableDuration(noteData) {
    const duration = String(noteData && noteData.duration || "");
    if (duration.includes("r")) return false;
    return duration === "8" || duration === "16" || duration === "32" || duration === "64";
  }

  function voiceTimeForVexSpec(spec) {
    const total = Array.isArray(spec.vexflow)
      ? spec.vexflow.reduce((sum, noteData) => sum + durationToBeats(noteData), 0)
      : spec.beats || 1;
    const safeTotal = total > 0 ? total : spec.beats || 1;
    const beatValues = [4, 8, 16, 32];
    for (const beatValue of beatValues) {
      const numBeats = safeTotal * (beatValue / 4);
      if (Math.abs(numBeats - Math.round(numBeats)) < 0.001) {
        return { num_beats: Math.max(1, Math.round(numBeats)), beat_value: beatValue };
      }
    }
    return { num_beats: Math.max(1, Math.ceil(safeTotal)), beat_value: 4 };
  }

  function normalizePlacedVex(host, placement, firstNoteX, noteXs, width, height) {
    const svg = host.querySelector("svg");
    if (!svg) return;

    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    svg.style.width = "100%";
    svg.style.height = "100%";

    const children = Array.from(svg.childNodes);
    if (!children.length || typeof svg.getBBox !== "function") {
      markPlacedVexRendered(host);
      return;
    }

    const group = document.createElementNS(SVG_NS, "g");
    children.forEach((child) => group.appendChild(child));
    svg.appendChild(group);

    requestAnimationFrame(() => {
      try {
        const box = group.getBBox();
        if (!box || !Number.isFinite(box.x)) {
          markPlacedVexRendered(host);
          return;
        }
        const spec = beatVexPatterns[placement.id];
        const profile = opticalLayoutProfiles[placement.id] || {};
        const beatCount = Math.max(1, spec ? spec.beats : placement.beats || 1);
        const scale = Number.isFinite(profile.scale) ? profile.scale : answerRenderScale;
        const grid = getNotationGrid(width, beatCount);
        const sourceX = Number.isFinite(firstNoteX) ? firstNoteX : box.x;
        const shiftX = profile.xMode === "center-beat"
          ? Math.round((width - box.width * scale) / 2 - box.x * scale)
          : Math.round(grid.anchor + (profile.xOffset || 0) - sourceX * scale);
        const shiftY = Math.round((height - box.height * scale) / 2 - box.y * scale);

        group.setAttribute("transform", "translate(" + shiftX + " " + shiftY + ") scale(" + scale + ")");
        applyStrictBeatOnsets(host, group, placement, noteXs || [], {
          anchor: grid.anchor,
          beatCount,
          scale,
          shiftX,
          width,
          gridUnit: grid.unit
        });
        markPlacedVexRendered(host);
      } catch (error) {
        group.removeAttribute("transform");
        markPlacedVexRendered(host);
      }
    });
  }

  function getNotationGrid(width, beatCount) {
    const count = Math.max(1, beatCount || 1);
    const beatUnit = width / count;
    const anchor = Math.max(8, Math.round(beatUnit * 0.18 + notationGridNudgePx));
    // `unit` is the per-beat spacing applyStrictBeatOnsets uses as `anchor + onset*unit`. For the
    // onsets to span [anchor, width] it must be (width - anchor)/count. The earlier form
    // `beatUnit - anchor` (= width/count - anchor) subtracted the WHOLE anchor per beat, which is
    // correct only for count == 1 and compresses multi-beat figures leftward by onset*anchor*(1-1/count)
    // — the last note of a 2-beat figure landed ~10px early. Fixed 2026-07-11 (owner-verified on-device,
    // incl. RhythmQuest); single-beat figures are unchanged (count == 1 makes the two forms identical).
    return {
      anchor,
      unit: (width - anchor) / count
    };
  }

  function applyStrictBeatOnsets(host, group, placement, sourceXs, metrics) {
    const profile = opticalLayoutProfiles[placement.id] || {};
    if (profile.xMode === "center-beat") return;

    const onsets = getStrictBeatOnsets(placement.id);
    if (!onsets || onsets.length !== sourceXs.length) return;

    const noteGroups = Array.from(group.querySelectorAll(".vf-stavenote"));
    if (noteGroups.length < onsets.length) return;
    const spec = beatVexPatterns[placement.id];
    const stemsByNote = getStemGroupsByNote(group, noteGroups, spec, sourceXs);

    const beatUnit = metrics.gridUnit || (metrics.width / metrics.beatCount);
    onsets.forEach((onset, index) => {
      const desiredScreenX = metrics.anchor + onset * beatUnit;
      const currentScreenX = metrics.shiftX + sourceXs[index] * metrics.scale;
      const delta = (desiredScreenX - currentScreenX) / metrics.scale;
      noteGroups[index].setAttribute("transform", "translate(" + delta.toFixed(2) + " 0)");
      const stemGroup = stemsByNote[index];
      if (stemGroup && !stemGroup.closest(".vf-stavenote")) {
        stemGroup.setAttribute("transform", "translate(" + delta.toFixed(2) + " 0)");
      }
    });

    if (usesBeatUnitCustomBeaming(placement.id)) {
      // Correct by design: bank tiles may be PNGs, but answer-area notation stays VexFlow.
      // Keep dotted-half/compound patterns on this VexFlow alignment path; do not replace
      // the placed answer glyphs with hand-drawn SVG or PNG notation.
      stretchBeatUnitBeamGroups(group, sourceXs, onsets, metrics, beatUnit, spec);
    } else {
      stretchContinuousGroups(group, placement.id, sourceXs, onsets, metrics, beatUnit);
    }
    trimBeamOverhangs(group, placement.id);
    drawCustomTupletBracket(group, placement, onsets, metrics, beatUnit);
  }

  function getStrictBeatOnsets(id) {
    if (strictOnsetProfiles[id]) return strictOnsetProfiles[id];
    const spec = beatVexPatterns[id];
    if (!spec || !Array.isArray(spec.vexflow) || !spec.vexflow.length) return null;

    if (tupletNumberForSpec(spec)) {
      const step = (spec.beats || 1) / spec.vexflow.length;
      return spec.vexflow.map((_, index) => index * step);
    }

    const durations = spec.vexflow.map(durationToBeats);
    const totalDuration = durations.reduce((total, value) => total + value, 0);
    const beatScale = totalDuration > 0 ? (spec.beats || 1) / totalDuration : 1;
    let cursor = 0;
    return durations.map((duration) => {
      const onset = cursor;
      cursor += duration;
      return onset * beatScale;
    });
  }

  function durationToBeats(noteData) {
    const duration = String(noteData.duration || "").replace(/r/g, "");
    const baseMap = { w: 4, h: 2, q: 1, "8": 0.5, "16": 0.25, "32": 0.125 };
    const base = baseMap[duration] || 0;
    const dots = Math.max(0, Number(noteData.dots || 0));
    let total = base;
    let add = base / 2;
    for (let i = 0; i < dots; i += 1) {
      total += add;
      add /= 2;
    }
    return total;
  }

  function getStemGroupsByNote(group, noteGroups, spec, sourceXs) {
    const stemsByNote = noteGroups.map((noteGroup, index) => {
      const noteData = spec && Array.isArray(spec.vexflow) ? spec.vexflow[index] : null;
      if (isRestDuration(noteData)) return null;
      const nestedStem = noteGroup.querySelector(".vf-stem");
      if (nestedStem) return nestedStem;
      return null;
    });
    const looseStems = Array.from(group.querySelectorAll(".vf-stem"))
      .filter((stem) => !stem.closest(".vf-stavenote"));
    if (!looseStems.length) return stemsByNote;

    const availableNotes = noteGroups
      .map((noteGroup, index) => ({ noteGroup, index, sourceX: sourceXs && sourceXs[index] }))
      .filter((entry) => {
        const noteData = spec && Array.isArray(spec.vexflow) ? spec.vexflow[entry.index] : null;
        return !stemsByNote[entry.index] && !isRestDuration(noteData) && Number.isFinite(entry.sourceX);
      });
    const used = new Set();
    looseStems.forEach((stem) => {
      const stemX = stemCenterX(stem, null);
      if (!Number.isFinite(stemX)) return;
      let best = null;
      availableNotes.forEach((entry) => {
        if (used.has(entry.index)) return;
        const distance = Math.abs(entry.sourceX - stemX);
        if (!best || distance < best.distance) best = { entry, distance };
      });
      if (!best) return;
      used.add(best.entry.index);
      stemsByNote[best.entry.index] = stem;
    });
    return stemsByNote;
  }

  function isRestDuration(noteData) {
    return String(noteData && noteData.duration || "").includes("r");
  }

  function stretchBeatUnitBeamGroups(group, sourceXs, onsets, metrics, beatUnit, spec) {
    if (!spec || !Array.isArray(spec.vexflow)) return;
    const beamGroups = Array.from(group.querySelectorAll(".vf-beam"));
    if (!beamGroups.length) return;
    const runs = compoundBeamRuns(spec.vexflow);
    beamGroups.forEach((beamGroup, index) => {
      const run = runs[index];
      if (!run || run.length < 2) return;
      const stretch = applyContinuousGroupStretch(
        beamGroup,
        sourceXs,
        onsets,
        metrics,
        beatUnit,
        run[0],
        run[run.length - 1]
      );
      alignNestedBeamRuns(beamGroup, spec.vexflow, run, onsets, metrics, beatUnit, stretch);
    });
  }

  function alignNestedBeamRuns(beamGroup, vexflow, run, onsets, metrics, beatUnit, stretch) {
    if (!stretch || !vexflow || !run || run.length < 3) return;
    // Correct by visual inspection: Ch17 dotted-eighth 32nd-note figures need this
    // nested-beam retargeting. VexFlow draws the third beam before our fixed-grid
    // alignment, so the 32nd-only beam can overhang after the parent beam stretch.
    // Do not simplify this back to whole-beam scaling unless the 32nd beam test page
    // is checked and still matches the PNG-style spacing.
    for (let level = 3; level <= 4; level += 1) {
      const nestedRuns = beamLevelRuns(vexflow, run, level);
      if (nestedRuns.length !== 1) continue;
      const nestedRun = nestedRuns[0];
      if (nestedRun.length < 2 || nestedRun.length === run.length) continue;
      const path = beamGroup.querySelector("path:nth-of-type(" + level + ")");
      if (!path) continue;
      const left = internalBeamXForIndex(nestedRun[0], onsets, metrics, beatUnit, stretch);
      const right = internalBeamXForIndex(nestedRun[nestedRun.length - 1], onsets, metrics, beatUnit, stretch);
      setClosedBeamPathBounds(path, left, right);
    }
  }

  function beamLevelRuns(vexflow, indexes, level) {
    const runs = [];
    let run = [];
    indexes.forEach((index) => {
      if (beamLevelForDuration(vexflow[index]) >= level) {
        run.push(index);
        return;
      }
      if (run.length) runs.push(run);
      run = [];
    });
    if (run.length) runs.push(run);
    return runs;
  }

  function beamLevelForDuration(noteData) {
    if (isRestDuration(noteData)) return 0;
    const duration = String(noteData && noteData.duration || "").replace(/r/g, "");
    if (duration === "64") return 4;
    if (duration === "32") return 3;
    if (duration === "16") return 2;
    if (duration === "8") return 1;
    return 0;
  }

  function internalBeamXForIndex(index, onsets, metrics, beatUnit, stretch) {
    const desiredLocal = (metrics.anchor + onsets[index] * beatUnit - metrics.shiftX) / metrics.scale;
    return stretch.firstLocal + (desiredLocal - stretch.desiredFirstLocal) / stretch.scaleX;
  }

  function stemCenterX(stem, noteGroup) {
    if (!stem) return NaN;
    const path = stem.querySelector("path");
    const d = path ? path.getAttribute("d") || "" : "";
    const match = d.match(/^M(-?\d+(?:\.\d+)?)\s/);
    const pathX = match ? Number(match[1]) : NaN;
    if (!Number.isFinite(pathX)) return NaN;
    const stemX = translateX(stem.getAttribute("transform") || "");
    const noteX = stem.closest(".vf-stavenote") && noteGroup ? translateX(noteGroup.getAttribute("transform") || "") : 0;
    return pathX + stemX + noteX;
  }

  function translateX(transform) {
    const match = String(transform || "").match(/translate\(\s*(-?\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : 0;
  }

  function stretchContinuousGroups(group, placementId, sourceXs, onsets, metrics, beatUnit) {
    if (sourceXs.length < 2 || onsets.length < 2) return;

    const beamLikeGroups = Array.from(group.querySelectorAll(".vf-beam, .vf-tuplet"));

    beamLikeGroups.forEach((beamLike) => {
      applyContinuousGroupStretch(beamLike, sourceXs, onsets, metrics, beatUnit, 0, sourceXs.length - 1);
    });
  }

  function applyContinuousGroupStretch(beamLike, sourceXs, onsets, metrics, beatUnit, firstIndex, lastIndex) {
    const firstLocal = sourceXs[firstIndex];
    const lastLocal = sourceXs[lastIndex];
    const originalSpan = lastLocal - firstLocal;
    if (!Number.isFinite(originalSpan) || Math.abs(originalSpan) < 0.01) return;

    const desiredFirstLocal = (metrics.anchor + onsets[firstIndex] * beatUnit - metrics.shiftX) / metrics.scale;
    const desiredLastLocal = (metrics.anchor + onsets[lastIndex] * beatUnit - metrics.shiftX) / metrics.scale;
    const scaleX = (desiredLastLocal - desiredFirstLocal) / originalSpan;
    if (!Number.isFinite(scaleX) || scaleX <= 0) return;

    const transform = "translate(" + desiredFirstLocal.toFixed(2) + " 0) scale(" + scaleX.toFixed(4) + " 1) translate(" + (-firstLocal).toFixed(2) + " 0)";
    beamLike.setAttribute("transform", transform);
    return { firstLocal, desiredFirstLocal, scaleX };
  }

  function trimBeamOverhangs(group, placementId) {
    const trims = beamTrimProfiles[placementId];
    if (!trims || !trims.length) return;
    trims.forEach((trim) => {
      const beamPath = group.querySelector(".vf-beam path:nth-of-type(" + trim.path + ")");
      if (beamPath) trimClosedBeamPath(beamPath, trim.start || 0, trim.end || 0);
    });
  }

  function trimClosedBeamPath(beamPath, startNudge, endNudge) {
    const d = beamPath.getAttribute("d") || "";
    const match = d.match(/^M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)Z$/);
    if (!match) return;
    const values = match.slice(1).map(Number);
    if (values.some((value) => !Number.isFinite(value))) return;
    values[0] += startNudge;
    values[2] += startNudge;
    values[4] -= endNudge;
    values[6] -= endNudge;
    setClosedBeamPathValues(beamPath, values);
  }

  function setClosedBeamPathBounds(beamPath, left, right) {
    if (!Number.isFinite(left) || !Number.isFinite(right)) return;
    const d = beamPath.getAttribute("d") || "";
    const match = d.match(/^M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)Z$/);
    if (!match) return;
    const values = match.slice(1).map(Number);
    if (values.some((value) => !Number.isFinite(value))) return;
    values[0] = left;
    values[2] = left;
    values[4] = right;
    values[6] = right;
    setClosedBeamPathValues(beamPath, values);
  }

  function setClosedBeamPathValues(beamPath, values) {
    if (Math.max(values[0], values[2]) >= Math.min(values[4], values[6])) return;
    beamPath.setAttribute(
      "d",
      "M" + values[0].toFixed(3) + " " + values[1] +
        "L" + values[2].toFixed(3) + " " + values[3] +
        "L" + values[4].toFixed(3) + " " + values[5] +
        "L" + values[6].toFixed(3) + " " + values[7] + "Z"
    );
  }

  function drawCustomTupletBracket(group, placement, onsets, metrics, beatUnit) {
    const spec = beatVexPatterns[placement.id];
    const tupletNumber = tupletNumberForSpec(spec);
    if (!tupletNumber || onsets.length < 2) return;

    group.querySelectorAll(".custom-triplet-bracket").forEach((node) => node.remove());
    group.querySelectorAll(".vf-tuplet").forEach((node) => {
      node.style.display = "none";
    });

    const localXs = onsets.map((onset) => (metrics.anchor + onset * beatUnit - metrics.shiftX) / metrics.scale);
    const localBeatUnit = beatUnit / metrics.scale;
    let x1 = localXs[0] - 5;
    let x2 = localXs[localXs.length - 1] + Math.max(14, localBeatUnit * 0.22);

    const localLeftLimit = (2 - metrics.shiftX) / metrics.scale;
    const localRightLimit = (metrics.width - 3 - metrics.shiftX) / metrics.scale;
    x1 = clamp(localLeftLimit, localRightLimit, x1);
    x2 = clamp(localLeftLimit, localRightLimit, x2);

    const noteGroups = Array.from(group.querySelectorAll(".vf-stavenote")).slice(0, onsets.length);
    let y = 8;
    const noteBounds = [];
    noteGroups.forEach((noteGroup) => {
      if (typeof noteGroup.getBBox !== "function") return;
      try {
        const box = noteGroup.getBBox();
        if (box && Number.isFinite(box.y)) noteBounds.push(box);
      } catch (error) {
        // Ignore SVG bbox failures; the fixed fallback below still keeps the bracket inside the tile.
      }
    });

    if (noteBounds.length) {
      y = Math.max(6, Math.min(...noteBounds.map((box) => box.y)) - 12);
    }

    const center = (x1 + x2) / 2;
    const gap = Math.min(13, Math.max(8, (x2 - x1) * 0.08));
    const leg = 6;
    const bracket = document.createElementNS(SVG_NS, "g");
    bracket.classList.add("custom-triplet-bracket");

    const left = document.createElementNS(SVG_NS, "path");
    left.setAttribute("d", "M " + x1.toFixed(2) + " " + (y + leg).toFixed(2) + " V " + y.toFixed(2) + " H " + (center - gap).toFixed(2));
    const right = document.createElementNS(SVG_NS, "path");
    right.setAttribute("d", "M " + (center + gap).toFixed(2) + " " + y.toFixed(2) + " H " + x2.toFixed(2) + " V " + (y + leg).toFixed(2));

    // Style the bracket legs INLINE (the number below gets the same treatment) so the engine draws a
    // COMPLETE bracket on its own — a thin stroke, not a filled shape. An SVG path with no fill/stroke
    // defaults to fill:black, stroke:none, so an open "bracket" path fills as a solid black area
    // (blobs). The values mirror the two host-scoped CSS copies — renderer.css (fill/stroke/width) and
    // answer-board.css (caps/joins) — so it's a no-op where that CSS also applies (RhythmQuest / the
    // answer board keep their exact styling, incl. the CSS's !important themed number fill), and the
    // fix for any host the CSS does NOT reach, e.g. TapQuest's `.placed-vexflow` tile art, which now
    // gets a correct, complete bracket instead of black-blob legs and a default-font number.
    [left, right].forEach((legPath) => {
      legPath.setAttribute("fill", "none");
      legPath.setAttribute("stroke", "rgba(20, 25, 19, 0.9)");
      legPath.setAttribute("stroke-width", "1.35");
      legPath.setAttribute("stroke-linecap", "square");
      legPath.setAttribute("stroke-linejoin", "miter");
    });

    const number = document.createElementNS(SVG_NS, "text");
    number.textContent = String(tupletNumber);
    number.setAttribute("x", center.toFixed(2));
    number.setAttribute("y", (y + 4.4).toFixed(2));
    number.setAttribute("text-anchor", "middle");
    // Style the tuplet number INLINE too (same reason as the legs) — the answer-board/RhythmQuest
    // CSS `.custom-triplet-bracket text` rule does not reach TapQuest's `.placed-vexflow` host, so
    // without this the "3" falls back to a default sans glyph. On hosts that DO carry that CSS its
    // `!important` fill wins (keeping the themed --note-ink), so RhythmQuest is unchanged.
    number.setAttribute("fill", "rgb(20, 25, 19)");
    number.setAttribute("stroke", "none");
    number.setAttribute("font-family", 'Georgia, "Times New Roman", serif');
    number.setAttribute("font-size", "13px");
    number.setAttribute("font-weight", "950");

    bracket.append(left, right, number);
    group.appendChild(bracket);
  }

  function tupletNumberForSpec(spec) {
    if (!spec) return null;
    if (Number.isFinite(spec.tuplet)) return spec.tuplet;
    if (spec.triplet) return 3;
    if (spec.duplet) return 2;
    return null;
  }


  window.RhythmNotation = {
    getVexFlow: getVexFlow,
    renderPlacedVex: renderPlacedVex,
    refreshPlacedVex: refreshPlacedVex,
    schedulePlacedVexRender: schedulePlacedVexRender,
    markPlacedVexPending: markPlacedVexPending,
    markPlacedVexRendered: markPlacedVexRendered,
    catalog: beatVexPatterns,
    rhythmAsset: rhythmAsset,
    usesBeatUnitCustomBeaming: usesBeatUnitCustomBeaming,
    rendererFamilyForPattern: rendererFamilyForPattern,
    durationToBeats: durationToBeats,
    isRestDuration: isRestDuration
  };
})();
