/* mq-rhythm-board.js — MelodyQuest's interactive rhythm-dictation ENTRY board.
 *
 * WHY THIS EXISTS: MelodyQuest's rhythm dictation should match RhythmQuest's entry board (drop ->
 * white cell, complete a measure -> one combined white panel, circle measure-numbers, connected
 * multi-beat spans, matching time-sig spacing). RhythmQuest's board lives baked inside quest-redesign.js;
 * the shared, display-only twin of its DOM+CSS is shared/rhythm-notation/answer-board.{js,css}.
 * MelodyQuest previously used the OLDER rhythm-student.js board (flat cells, none of the above) — but
 * rhythm-student.js is SHARED with TapQuest (solo-mode.js reads its board DOM for tap-back), so it must
 * NOT be restyled. So this file is a SELF-CONTAINED interactive board for MelodyQuest that emits the
 * SAME structure answer-board.css expects and renders glyphs through the shared renderer DIRECTLY
 * (window.RhythmNotation.schedulePlacedVexRender — the same call RhythmQuest and answer-board.js use,
 * so every figure family incl. compound draws). Reusing answer-board.css keeps the LOOK aligned with
 * RhythmQuest; the interaction here is a SEPARATE implementation of quest-redesign.js's logic and CAN
 * drift from it — keep them in sync by hand.
 *
 * It holds the interactive answer state (a flat placements array) but does NOT grade — it exposes that
 * answer as the same 2-D userAnswer rows RhythmStudent produces, so MelodyQuest's existing onset grader
 * reads them unchanged.
 *
 * BANK TILES ARE PNG, not VexFlow — VISION.md §8: the tile bank stays PNG in every mode, VexFlow is the
 * ANSWER only. The tiles use RhythmQuest's bank-tight art.
 *
 * Classic script -> window.MqRhythmBoard.create(opts). No module import (stays cache-fresh with the
 * page). Touch DRAG (drag image + hit-testing) is PORTED from rhythm-student.js's touch path (iOS
 * Safari has no native HTML5 drag-and-drop) and is owner-confirmed working on-device (2026-07-12). A
 * separate click/keyboard select-then-place path (click a figure, then an empty cell) was added later;
 * it is verified in a headless browser but NOT yet owner-tested on touch. Keep the touch port in sync
 * with rhythm-student.js by hand.
 */
(function () {
  'use strict';

  function R() { return window.RhythmNotation || null; }
  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }
  function spanWidth(beats) {
    return 'calc((var(--slot-w) * ' + beats + ') + (var(--slot-gap) * ' + (beats - 1) + '))';
  }
  /* opts:
   *   boardHost        : element the board renders into (gets class "answer-board")
   *   bankHost         : element the draggable tiles render into
   *   measures         : number of measures
   *   beatsPerMeasure  : beats per measure (uniform)
   *   timeSignature    : display string e.g. "4/4" (falls back to beatsPerMeasure/4)
   *   figures          : [{ id }] the tile palette (order preserved)
   *   tileGlyph        : optional (tileHost, id) => void to draw a tile's art; defaults to the
   *                      shared renderer at tile size
   *   onChange         : (instance) => void, after any placement/removal
   */
  function create(opts) {
    var boardHost = opts.boardHost;
    var bankHost = opts.bankHost;
    var measures = Math.max(1, opts.measures | 0);
    var bpm = Math.max(1, opts.beatsPerMeasure | 0);
    var totalBeats = measures * bpm;
    var timeSignature = opts.timeSignature || (bpm + '/4');
    var onChange = typeof opts.onChange === 'function' ? opts.onChange : function () {};
    var bankArtBase = opts.bankArtBase || './rhythm-assets/bank-tight/'; // RhythmQuest's PNG bank art
    var bankArtFallback = './rhythm-assets/bank/';  // fuller set; used if a figure is missing from bank-tight

    // Beats per figure. Prefer the host's authoritative source (RhythmStudent's pattern bank via
    // opts.beatsOf) over the shared catalog, so a figure the catalog doesn't carry still spans/grades
    // correctly. (In practice the renderer only offers figures RhythmStudent knows, so beatsOf always
    // resolves; the catalog is just a backstop.)
    function beatsOf(id) {
      if (typeof opts.beatsOf === 'function') { var n = opts.beatsOf(id); if (n && n > 0) return Math.max(1, n | 0); }
      var r = R(); var spec = r && r.catalog ? r.catalog[id] : null;
      return Math.max(1, (spec && spec.beats) || 1);
    }

    var placements = new Array(totalBeats).fill(null); // flat; SAME object stored in each covered beat
    var destroyed = false;

    function measureOf(beat) { return Math.floor(beat / bpm); }
    function canPlace(id, start) {
      var beats = beatsOf(id);
      if (start < 0 || start + beats > totalBeats) return false;
      if (measureOf(start) !== measureOf(start + beats - 1)) return false; // never cross a barline
      return true;
    }
    function removeAt(beat) {
      var p = placements[beat];
      if (!p) return false;
      for (var i = p.start; i < p.start + p.beats; i += 1) placements[i] = null;
      return true;
    }
    function placeFigure(id, start) {
      if (!canPlace(id, start)) return false;
      var beats = beatsOf(id);
      for (var i = start; i < start + beats; i += 1) if (placements[i]) removeAt(i);
      var pl = { id: id, beats: beats, start: start };
      for (var j = start; j < start + beats; j += 1) placements[j] = pl;
      renderBoard();
      onChange(instance);
      return true;
    }
    function clearAll() {
      placements = new Array(totalBeats).fill(null);
      renderBoard();
      onChange(instance);
    }
    function isComplete() {
      for (var i = 0; i < totalBeats; i += 1) if (!placements[i]) return false;
      return true;
    }
    // The 2-D rows RhythmStudent produces (userAnswer[measure][beat]); MelodyQuest's grader reads this.
    function userAnswerRows() {
      var rows = [];
      for (var m = 0; m < measures; m += 1) {
        var row = [];
        for (var b = 0; b < bpm; b += 1) {
          var p = placements[m * bpm + b];
          if (!p) row.push(null);
          else row.push(p.start === m * bpm + b ? p.id : (p.id + '_continuation'));
        }
        rows.push(row);
      }
      return rows;
    }

    // ---- glyph ----
    function makeGlyph(pl) {
      var holder = el('span', 'placed-glyph uses-vex-renderer asset-' + pl.id);
      holder.dataset.renderer = 'vexflow';
      if (pl.beats > 1) holder.style.width = spanWidth(pl.beats);
      var host = el('span', 'placed-vex-host');
      host.dataset.pattern = pl.id; host.dataset.beats = String(pl.beats); host.dataset.start = String(pl.start);
      holder.appendChild(host);
      var r = R();
      if (r && r.schedulePlacedVexRender) r.schedulePlacedVexRender(host, { id: pl.id, beats: pl.beats, start: pl.start });
      return holder;
    }

    // ---- responsive slot width: fit ALL measures on one row inside boardHost ----
    function refit() {
      if (destroyed || !boardHost) return;
      // Measure the CONTAINER (not the board's own width, which is content-sized -> circular). The
      // board fits ALL measures inside this width; if they can't shrink to fit (min 40px), overflow-x
      // scrolls as a safety. Subtract the board's own frame (padding + border).
      var container = boardHost.parentElement || boardHost;
      var cs = window.getComputedStyle(boardHost);
      var frame = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
        + (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
      var avail = (container.clientWidth || 0) - frame;
      if (!avail || avail < 60) return;
      var GAP = 10, MGAP = 10, MPAD = 5, SIG = 48; // sig col + gap, matches answer-board.css tokens
      // width used by fixed chrome: sig column, per-measure padding + barline gutter, measure gaps
      var chrome = SIG + measures * (MPAD * 2 + 8) + (measures - 1) * MGAP + 8;
      var slotsTotal = totalBeats; // all beat cells across the row
      var gapsTotal = totalBeats - measures; // internal gaps (grid gap within each measure)
      var slot = Math.floor((avail - chrome - gapsTotal * GAP) / Math.max(1, slotsTotal));
      slot = Math.max(40, Math.min(96, slot)); // never bigger than the game's 96, never a squished sliver
      boardHost.style.setProperty('--slot-w', slot + 'px');
    }

    // ---- render ----
    function renderBoard() {
      if (!boardHost) return;
      boardHost.className = 'answer-board';
      boardHost.innerHTML = '';
      var row = el('div', 'staff-row is-first-row');
      row.style.setProperty('--sig-col-w', '38px');
      row.style.setProperty('--sig-gap', '10px');

      var sigSlot = el('div', 'time-signature-slot');
      sigSlot.appendChild(makeTimeSig(timeSignature, bpm));
      row.appendChild(sigSlot);

      var lane = el('div', 'beat-measure-lane');
      lane.style.setProperty('--row-measures', String(measures));

      for (var m = 0; m < measures; m += 1) {
        var group = el('div', 'measure-group');
        group.dataset.measure = String(m + 1);
        group.style.setProperty('--beats-per-measure', String(bpm));
        if (m === measures - 1) group.classList.add('is-final-measure');
        var start = m * bpm;
        var complete = true;
        for (var c = start; c < start + bpm; c += 1) if (!placements[c]) { complete = false; break; }
        if (complete) group.classList.add('is-complete');

        var label = el('span', 'measure-number');
        label.textContent = String(m + 1);
        group.appendChild(label);

        for (var b = 0; b < bpm; b += 1) group.appendChild(makeCell(start + b, m + 1, b + 1));
        lane.appendChild(group);
      }
      row.appendChild(lane);
      boardHost.appendChild(row);
      refit();
    }

    function makeTimeSig(ts, fallbackTop) {
      var sig = el('div', 'time-signature');
      var parsed = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(String(ts || ''));
      var top = parsed ? parsed[1] : String(fallbackTop || 4);
      var bot = parsed ? parsed[2] : '4';
      sig.setAttribute('aria-label', top + '/' + bot);
      var t = el('span'); t.textContent = top;
      var b = el('span'); b.textContent = bot;
      sig.append(t, b);
      return sig;
    }

    function makeCell(beat, measureNum, beatNumInMeasure) {
      // data-measure (1-based) + data-beat (0-based-in-measure) match what MelodyQuest's "Hear a bar"
      // aid and the reveal seam query. This board owns interaction, so the cell is a <button>.
      var zone = el('button', 'beat-drop-zone');
      zone.type = 'button';
      zone.dataset.measure = String(measureNum);
      zone.dataset.beat = String(beatNumInMeasure - 1);
      zone.dataset.absoluteBeat = String(beat);

      var num = el('span', 'beat-num');
      num.textContent = String(beatNumInMeasure);
      zone.appendChild(num);
      var notation = el('span', 'beat-notation');
      zone.appendChild(notation);

      var pl = placements[beat];
      if (pl) {
        if (pl.start === beat) {
          zone.classList.add('is-filled');
          if (pl.beats > 1) { zone.classList.add('is-span-head'); zone.style.setProperty('--span-w', spanWidth(pl.beats)); }
          notation.appendChild(makeGlyph(pl));
        } else {
          zone.classList.add('is-continuation');
        }
      }

      // Mouse drag target
      zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('is-drag-over'); });
      zone.addEventListener('dragleave', function () { zone.classList.remove('is-drag-over'); });
      zone.addEventListener('drop', function (e) {
        e.preventDefault(); zone.classList.remove('is-drag-over');
        var id = (e.dataTransfer && e.dataTransfer.getData('text/plain')) || dragState.id;
        if (id) placeFigure(id, beat);
      });
      // Click/Enter (keyboard path, since drag needs a pointer): a filled cell clears its figure; an
      // empty cell places the currently-selected bank figure (if any).
      zone.addEventListener('click', function () {
        if (placements[beat]) { if (removeAt(beat)) { renderBoard(); onChange(instance); } }
        else if (selectedId) { placeFigure(selectedId, beat); }
      });
      return zone;
    }

    // ---- bank + drag (mouse + touch, ported from rhythm-student.js so iOS works) ----
    var dragState = { id: null, preview: null };
    var selectedId = null; // click/keyboard-selected bank figure; placed by clicking an empty cell
    function updateBankSelection() {
      if (!bankHost) return;
      bankHost.querySelectorAll('.mqb-tile').forEach(function (t) {
        var on = t.dataset.patternId === selectedId;
        t.classList.toggle('is-selected', on);
        t.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function buildDragPreview(tileHost, x, y) {
      removeDragPreview();
      var p = tileHost.cloneNode(true);
      p.className = 'mqb-drag-preview';
      p.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;left:0;top:0;width:96px;height:60px;'
        + 'background:#fff;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.35);display:flex;'
        + 'align-items:center;justify-content:center;opacity:.95;';
      document.body.appendChild(p);
      dragState.preview = p;
      updateDragPreview(x, y);
    }
    function updateDragPreview(x, y) {
      if (!dragState.preview) return;
      // Float the preview ABOVE the finger so the target cell isn't hidden (matches rhythm-student.js).
      dragState.preview.style.transform = 'translate(' + (x - 48) + 'px,' + (y - 92) + 'px)';
    }
    function removeDragPreview() { if (dragState.preview) { dragState.preview.remove(); dragState.preview = null; } }
    function cellUnderPreview(x, y) {
      // Hit-test at the preview's visual center (above the finger), not the fingertip.
      var elAt = document.elementFromPoint(x - 0, y - 62);
      return elAt ? elAt.closest('.beat-drop-zone') : null;
    }
    function clearHighlights() {
      if (!boardHost) return;
      boardHost.querySelectorAll('.beat-drop-zone.is-drag-over').forEach(function (z) { z.classList.remove('is-drag-over'); });
    }

    function renderBank() {
      if (!bankHost) return;
      bankHost.innerHTML = '';
      (opts.figures || []).forEach(function (fig) {
        var tile = el('button', 'mqb-tile');
        tile.type = 'button';
        tile.dataset.patternId = fig.id;
        tile.draggable = true;
        tile.setAttribute('aria-pressed', 'false');
        tile.setAttribute('aria-label', 'Rhythm figure ' + fig.id.replace(/-/g, ' '));
        // Click/Enter selects this figure (keyboard path); click an empty cell to place it.
        tile.addEventListener('click', function () {
          selectedId = (selectedId === fig.id) ? null : fig.id;
          updateBankSelection();
        });
        var art = el('span', 'mqb-tile-art');
        // Bank tiles are PNG in EVERY mode (VISION §8), NOT VexFlow — VexFlow is the answer only.
        if (typeof opts.tileGlyph === 'function') {
          opts.tileGlyph(art, fig.id);
        } else {
          var img = document.createElement('img');
          img.className = 'placed-bank-glyph';
          img.alt = ''; img.draggable = false;
          img.onerror = function () {   // fall back to the fuller bank/ set if bank-tight lacks this figure
            if (img.dataset.fellBack) return;
            img.dataset.fellBack = '1';
            img.src = bankArtFallback + fig.id + '.png';
          };
          img.src = bankArtBase + fig.id + '.png';
          art.appendChild(img);
        }
        tile.appendChild(art);
        bankHost.appendChild(tile);

        tile.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('text/plain', fig.id);
          e.dataTransfer.effectAllowed = 'copy';
          dragState.id = fig.id;
          tile.classList.add('is-dragging');
        });
        tile.addEventListener('dragend', function () { dragState.id = null; tile.classList.remove('is-dragging'); clearHighlights(); });

        // Touch (iOS Safari). Distinguish a TAP from a DRAG: a tap (no movement past the threshold)
        // is left alone so the native click fires and SELECTS the figure (the click/keyboard place
        // path); only a real drag hijacks the gesture to place. Without this, every tap was swallowed
        // as a drag and the select path was unreachable on touch.
        var touchDragging = false, tStartX = 0, tStartY = 0, tMoved = false;
        var TAP_SLOP = 10;
        tile.addEventListener('touchstart', function (e) {
          var t = e.touches[0]; tStartX = t.clientX; tStartY = t.clientY; tMoved = false; touchDragging = false;
          // Do NOT preventDefault here — a tap must still emit click. touch-action:none stops scroll.
        }, { passive: true });
        tile.addEventListener('touchmove', function (e) {
          var t = e.touches[0];
          if (!tMoved && Math.abs(t.clientX - tStartX) + Math.abs(t.clientY - tStartY) > TAP_SLOP) tMoved = true;
          if (!tMoved) return;
          if (!touchDragging) { touchDragging = true; dragState.id = fig.id; tile.classList.add('is-dragging'); buildDragPreview(tile, t.clientX, t.clientY); }
          updateDragPreview(t.clientX, t.clientY);
          var z = cellUnderPreview(t.clientX, t.clientY);
          clearHighlights(); if (z) z.classList.add('is-drag-over');
          e.preventDefault();
        }, { passive: false });
        tile.addEventListener('touchend', function (e) {
          if (!touchDragging) return; // a tap: let the native click fire (selects the figure)
          var t = e.changedTouches[0];
          var z = cellUnderPreview(t.clientX, t.clientY);
          if (z) { var beat = parseInt(z.dataset.absoluteBeat, 10); if (!isNaN(beat)) placeFigure(fig.id, beat); }
          touchDragging = false; dragState.id = null; tile.classList.remove('is-dragging');
          clearHighlights(); removeDragPreview();
          e.preventDefault();
        }, { passive: false });
      });
    }

    var refitHandler = function () { refit(); };
    window.addEventListener('resize', refitHandler);
    window.addEventListener('orientationchange', refitHandler);

    var instance = {
      placeFigure: placeFigure,
      removeAt: function (beat) { if (removeAt(beat)) { renderBoard(); onChange(instance); } },
      clear: clearAll,
      isComplete: isComplete,
      userAnswerRows: userAnswerRows,
      placements: function () { return placements.slice(); },
      refit: refit,
      destroy: function () {
        destroyed = true;
        window.removeEventListener('resize', refitHandler);
        window.removeEventListener('orientationchange', refitHandler);
        removeDragPreview();
      }
    };

    renderBoard();
    renderBank();
    return instance;
  }

  window.MqRhythmBoard = { create: create };
})();
