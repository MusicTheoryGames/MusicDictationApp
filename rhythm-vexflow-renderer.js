/* TapQuest / BeatQuest-Casual — VexFlow tile/answer renderer (adapter over the shared renderer).
 *
 * THIN ADAPTER (2026-07-11). This file used to carry its own PORTED copy of the redesign's answer
 * renderer (~350 lines: FIGURES table, strictOnsetProfiles, getNotationGrid, applyStrictOnsets, …).
 * That copy was a hand-port of the SAME renderer that now lives, canonical, in
 * `shared/rhythm-notation/renderer.js` as `window.RhythmNotation`. Two copies of one renderer is
 * exactly the drift the suite is trying to kill: fix a beam in one and the other silently disagrees.
 *
 * So this file no longer draws anything itself. It keeps the `window.RhythmVexFlow` surface that
 * `rhythm-student.js` (the old TapQuest / Casual / MelodyQuest engine) already calls —
 * `renderFigure(host, id)`, `hasFigure(id)`, `mode()`, `figureIds` — and routes the actual drawing to
 * `window.RhythmNotation.renderPlacedVex(host, {id, beats, start})`. The ported duplicate renderer is
 * DELETED — one renderer implementation, not two. (Coverage is a separate axis: a page reaches the
 * shared renderer only where it LOADS this adapter — tapping.html + beatquest-casual.html — and only
 * for the 18 COVERED_IDS; MelodyQuest / meter families stay PNG, see the notes below. "No duplicate
 * to drift" is about the code, not about every surface using it yet.)
 *
 * WHY AN ADAPTER, not a call-site migration: `rhythm-student.js` calls this in two spots — the
 * `renderFigure` draw site (rhythm-student.js:1015) and a `mode()` read inside `bankDir()`
 * (rhythm-student.js:44) that picks the BANK art. Keeping the `RhythmVexFlow` name means both keep
 * working unchanged; only the DRAWING is unified. Migrating the call sites would touch far more
 * surface for no behavioural gain.
 *
 * WHERE THIS FILE IS ACTUALLY LOADED: tapping.html and beatquest-casual.html (verified — grep). NOTE:
 * `rhythm-student.js` is ALSO loaded by melodic-game.html, but that page does NOT load this renderer or
 * the shared one, so `window.RhythmVexFlow` is undefined there and MelodyQuest's rhythm falls back to
 * PNG. Wiring MelodyQuest onto the shared renderer is a KNOWN, separate follow-up — not done here.
 *
 * WHAT STAYS THE SAME (contract with rhythm-student.js renderPatternArt):
 *   - `renderFigure(host, id)` returns TRUE if it drew, FALSE if the caller must fall back to its own
 *     PNG art. The shared renderer has no boolean return AND does its own PNG fallback (with a
 *     DIFFERENT asset path — `assets/rhythm-assets/bank/…` vs TapQuest's `./rhythm-assets/bank/…`), so
 *     this adapter DETECTS that fallback and converts it back to a clean `return false`, preserving the
 *     old fallback CONTRACT (caller inserts the correct-path PNG). "Contract", not pixels: a figure the
 *     shared renderer DOES draw may look slightly different from the old ported copy (see KNOWN VISUAL
 *     DIFFERENCES below).
 *   - `hasFigure(id)` answers TRUE only for the SAME 18 ids the old ported table covered (see
 *     COVERED_IDS). The shared catalog is a superset (adds whole, dotted-half, measure-rest-*, and the
 *     meter families cd-/hb-/de-/tpl-). Restricting to the old 18 keeps the SAME SPLIT of which figures
 *     are VexFlow vs PNG: whole / dotted-half / measure-rests stay PNG in TapQuest & Casual, as today.
 *   - `mode()` is unchanged: reads `?renderer=png|hybrid|vexflow`, default png.
 *
 * FIGURES THAT RENDER DIFFERENTLY vs the old ported copy (the shared renderer is the FULLER original).
 * OWNER-VERIFIED IN SAFARI on-device, 2026-07-11 — all three look correct:
 *   - `quarter-rest`: old profile was { xMode: 'center-beat' }; shared is { xMode: 'onset', xOffset: 8 }.
 *     The shared behaviour is CORRECT for the answer area: the rest lines up with the first of the beat
 *     (its onset), not centred in the cell (owner confirmed — centred is the BANK tile, not the answer).
 *   - `eighth-two-sixteenths`: shared has a beamTrim profile the old copy lacked; the beam looks normal.
 *   - triplet-eighths / triplet-quarters: shared draws a thin bracket (the fix in renderer.js makes it
 *     self-styled); renders as a clean bracket, not the solid blob the missing CSS used to leave.
 * The other ~13 covered figures now draw through the SAME shared renderer (there is no longer a second
 * copy to compare against) — same stem/vertical/onset machinery as the verified ones and as RhythmQuest,
 * which is what makes them match RhythmQuest. They were not each separately eyeballed on TapQuest.
 */
(function () {
  'use strict';

  /* The EXACT 18 figure ids the old ported FIGURES table covered. Kept as an explicit allow-list so
     `hasFigure` covers the same 18 ids as the old table even though the shared catalog is larger.
     It ALSO now requires the shared catalog to carry the spec (see the `R.catalog[id]` check below),
     so it is not literally byte-identical to the old table-membership test — but for all 18 ids the
     catalog does carry the spec, so the answer matches in practice. Do not widen this to
     `Object.keys(RhythmNotation.catalog)` — that would newly VexFlow-render whole / dotted-half /
     measure-rest-* which have always been PNG on these pages. */
  var COVERED_IDS = [
    'quarter',
    'two-eighths',
    'four-sixteenths',
    'eighth-two-sixteenths',
    'two-sixteenths-eighth',
    'sixteenth-eighth-sixteenth',
    'dotted-eighth-sixteenth',
    'sixteenth-dotted-eighth',
    'eighth-rest-eighth',
    'eighth-eighth-rest',
    'eighth-rest-two-sixteenths',
    'sixteenth-rest-three-sixteenths',
    'quarter-rest',
    'triplet-eighths',
    'half',
    'dotted-quarter-eighth',
    'eighth-quarter-eighth',
    'triplet-quarters'
  ];
  var COVERED = COVERED_IDS.reduce(function (set, id) { set[id] = true; return set; }, {});

  function shared() { return window.RhythmNotation || null; }

  function hasFigure(id) {
    if (!Object.prototype.hasOwnProperty.call(COVERED, id)) return false;
    var R = shared();
    // Also require the shared catalog to actually carry the spec, so a catalog change can't leave
    // hasFigure lying about a figure the renderer can't draw.
    return !!(R && R.catalog && R.catalog[id]);
  }

  /* Draw one figure into `host` via the ONE shared renderer. Returns true if it drew, false if the
     caller must fall back to PNG. NEVER throws: a renderer that throws inside a drag-and-drop handler
     strands the tile. */
  function renderFigure(host, id) {
    try {
      if (!host || !hasFigure(id)) return false;

      var R = shared();
      var VF = window.Vex && window.Vex.Flow;
      // vexflow.js is only injected when ?renderer=hybrid|vexflow is present. If it is not loaded,
      // decline so the caller draws its PNG — same as the old ported renderer's `!VF` guard.
      if (!R || typeof R.renderPlacedVex !== 'function' || !VF || !VF.Renderer || !VF.StaveNote) {
        return false;
      }

      var spec = R.catalog[id];
      // Beats come from the SHARED catalog now, not a private table — deliberate: the catalog is the
      // one source of truth for how many beats a figure spans. For the 18 covered ids this equals the
      // old ported table; if a future catalog edit changed a covered figure's beats, the tile art
      // would follow it (that is the point of unifying, not a regression).
      var beats = (spec && spec.beats) || 1;

      // The shared renderer keys everything off placement.id and placement.beats; placement.start is
      // used only by RhythmQuest's board layout, never by the draw path (verified), so 0 is safe.
      R.renderPlacedVex(host, { id: id, beats: beats, start: 0 });

      // renderPlacedVex has no boolean return and does its OWN PNG fallback on failure, inserting an
      // <img class="placed-bank-glyph"> with the shared asset path — which is WRONG for these pages.
      // Detect that and convert it back to the old contract: clear the host and return false so the
      // caller inserts the correct-path PNG. (The fallback is inserted synchronously in its catch, so
      // it is observable here.)
      if (host.querySelector('img.placed-bank-glyph')) {
        host.textContent = '';
        return false;
      }

      // renderPlacedVex early-returns (drawing nothing) if the host is not yet connected to the DOM.
      // If no <svg> was produced, treat it as a decline so the caller falls back to PNG rather than
      // leaving an empty cell.
      if (!host.querySelector('svg')) return false;

      return true;
    } catch (e) {
      try { if (host) host.textContent = ''; } catch (e2) {}
      return false;   // caller falls back to PNG
    }
  }

  /* `?renderer=` — png (today's art), vexflow / hybrid (VexFlow for the figures THIS adapter covers,
     i.e. the 18 COVERED_IDS that hasFigure() allows — NOT the whole shared catalog — PNG otherwise).
     Default is png: opt-in until it is A/B'd. Unchanged behaviour — rhythm-student.js `bankDir()`
     reads this to pick tile art. */
  function mode() {
    try {
      var m = new URLSearchParams(window.location.search).get('renderer');
      return (m === 'vexflow' || m === 'hybrid' || m === 'png') ? m : 'png';
    } catch (e) { return 'png'; }
  }

  window.RhythmVexFlow = {
    renderFigure: renderFigure,
    hasFigure: hasFigure,
    mode: mode,
    figureIds: COVERED_IDS.slice()
  };
})();
