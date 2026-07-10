/* RhythmQuest — VexFlow ANSWER renderer. (The bank is always PNG; this file never draws a
   chooser tile — see rhythm-student.js renderTileNotation.)
 *
 * PORTED, NOT REWRITTEN, from the redesign's renderer lab
 * (`experiments/quest-redesign/beatquest-vexflow-renderer-lab.js`, `renderVex()` and its helpers).
 * That file is outside this repo and outside Codex's sandbox, which is why nothing here should be
 * "improved" from memory: the numbers below are tuned, and the tuning is the whole value.
 *
 * I learned that the hard way. On 2026-07-10 I wrote a renderer from scratch instead of porting
 * this one and got: a five-line staff (the lab never calls `stave.draw()`), stems up (they must be
 * down), and notes that ignored the beat grid. The owner: "don't reinvent the wheel. we already
 * figured this stuff out."
 *
 * WHAT THE LAB SOLVED, and what each piece is for:
 *
 *   No `stave.draw()`      The single beat line is drawn by CSS in the cell, not by VexFlow. Calling
 *                          draw() gives you a five-line staff floating behind the figure.
 *   `answerRenderScale`    0.82 — glyphs are drawn at full size, then scaled into the cell.
 *   `notationGridNudgePx`  -6 — the anchor sits slightly left of the mathematical beat position,
 *                          because a notehead's ink centre is right of its origin.
 *   `strictOnsetProfiles`  Where each note must LAND, in beats. VexFlow's Formatter spaces notes
 *                          for engraving, not for a grid; the answer area is a grid. After drawing,
 *                          each notehead is nudged to its true onset and the beams are stretched to
 *                          follow (`applyStrictOnsets`, `stretchContinuousGroups`).
 *   `opticalLayoutProfiles` `quarter-rest` is centred in the beat rather than left-aligned, because
 *                          a rest glyph has no stem to anchor the eye.
 *   SOFT voice mode        The figures are one beat long but a Voice wants a full bar. Strict mode
 *                          throws.
 *
 * COVERAGE — EIGHTEEN figures. This is EXACTLY the redesign's `beatVexPatterns` minus its
 * `renderAssetOnly` (compound cd-*) entries. Do not add or drop figures to match a memory of what is
 * "ready" — match the redesign. It renders the ANSWER area with VexFlow for every one of these; the
 * BANK is always PNG and never calls this file.
 *
 * NOT here, and each stays PNG in the answer, exactly as the redesign does it:
 *   cd-* (compound)                 the redesign marks these renderAssetOnly -> PNG in hybrid.
 *   whole, dotted-half, half-rest   not in the redesign's beatVexPatterns at all -> PNG.
 *
 * `?renderer=`: png = all PNG; hybrid = VexFlow answer except compound; vexflow = same as hybrid
 * until compound lands (the redesign's "all" would also draw compound).
 *
 * I got this list wrong TWICE — first "fifteen" when it was eighteen, then dropped `half` on a stale
 * VISION note. Read the redesign's table, count it, do not remember it.
 */
(function () {
  'use strict';

  // ---- tuned constants. Ported verbatim. Do not "clean up".
  var answerRenderScale = 0.82;
  var notationGridNudgePx = -6;

  var opticalLayoutProfiles = {
    'quarter-rest': { xMode: 'center-beat', scale: 0.82 }
  };

  // Where each note must land, in beats from the start of the figure. Derived from the durations,
  // but stated explicitly because a triplet's onsets are thirds and floating point is not kind.
  var strictOnsetProfiles = {
    'two-eighths': [0, 0.5],
    'four-sixteenths': [0, 0.25, 0.5, 0.75],
    'eighth-two-sixteenths': [0, 0.5, 0.75],
    'two-sixteenths-eighth': [0, 0.25, 0.5],
    'sixteenth-eighth-sixteenth': [0, 0.25, 0.75],
    'dotted-eighth-sixteenth': [0, 0.75],
    'sixteenth-dotted-eighth': [0, 0.25],
    'eighth-rest-eighth': [0, 0.5],
    'eighth-eighth-rest': [0, 0.5],
    'eighth-rest-two-sixteenths': [0, 0.5, 0.75],
    'sixteenth-rest-three-sixteenths': [0, 0.25, 0.5, 0.75],
    'triplet-eighths': [0, 1 / 3, 2 / 3],
    'dotted-quarter-eighth': [0, 1.5],
    'eighth-quarter-eighth': [0, 0.5, 1.5],
    'triplet-quarters': [0, 2 / 3, 4 / 3]
  };

  // ---- the figure table, ported verbatim from the lab. `b/4` is the middle line; on a percussion
  // clef that is where a one-line rhythm staff wants its noteheads.
  var FIGURES = {
    'quarter':                        { beats: 1, vexflow: [{ duration: 'q' }] },
    'two-eighths':                    { beats: 1, vexflow: [{ duration: '8' }, { duration: '8' }] },
    'four-sixteenths':                { beats: 1, vexflow: [{ duration: '16' }, { duration: '16' }, { duration: '16' }, { duration: '16' }] },
    'eighth-two-sixteenths':          { beats: 1, vexflow: [{ duration: '8' }, { duration: '16' }, { duration: '16' }] },
    'two-sixteenths-eighth':          { beats: 1, vexflow: [{ duration: '16' }, { duration: '16' }, { duration: '8' }] },
    'sixteenth-eighth-sixteenth':     { beats: 1, vexflow: [{ duration: '16' }, { duration: '8' }, { duration: '16' }] },
    'dotted-eighth-sixteenth':        { beats: 1, vexflow: [{ duration: '8', dots: 1 }, { duration: '16' }] },
    'sixteenth-dotted-eighth':        { beats: 1, vexflow: [{ duration: '16' }, { duration: '8', dots: 1 }] },
    'eighth-rest-eighth':             { beats: 1, vexflow: [{ duration: '8r' }, { duration: '8' }] },
    'eighth-eighth-rest':             { beats: 1, vexflow: [{ duration: '8' }, { duration: '8r' }] },
    'eighth-rest-two-sixteenths':     { beats: 1, vexflow: [{ duration: '8r' }, { duration: '16' }, { duration: '16' }] },
    'sixteenth-rest-three-sixteenths':{ beats: 1, vexflow: [{ duration: '16r' }, { duration: '16' }, { duration: '16' }, { duration: '16' }] },
    'quarter-rest':                   { beats: 1, vexflow: [{ duration: 'qr' }] },
    'triplet-eighths':                { beats: 1, triplet: true, vexflow: [{ duration: '8' }, { duration: '8' }, { duration: '8' }] },
    'half':                           { beats: 2, vexflow: [{ duration: 'h' }] },
    'dotted-quarter-eighth':          { beats: 2, vexflow: [{ duration: 'q', dots: 1 }, { duration: '8' }] },
    'eighth-quarter-eighth':          { beats: 2, vexflow: [{ duration: '8' }, { duration: 'q' }, { duration: '8' }] },
    'triplet-quarters':               { beats: 2, triplet: true, vexflow: [{ duration: 'q' }, { duration: 'q' }, { duration: 'q' }] }
  };

  function hasFigure(id) { return Object.prototype.hasOwnProperty.call(FIGURES, id); }

  // ---- helpers, ported.
  function setSoftVoiceMode(VF, voice) {
    if (!voice || typeof voice.setMode !== 'function') return;
    if (VF.VoiceMode && VF.VoiceMode.SOFT !== undefined) voice.setMode(VF.VoiceMode.SOFT);
    else if (VF.Voice && VF.Voice.Mode && VF.Voice.Mode.SOFT !== undefined) voice.setMode(VF.Voice.Mode.SOFT);
  }

  function applyMusicFont(VF) {
    if (typeof VF.setMusicFont !== 'function') return;
    VF.setMusicFont('Bravura', 'Gonville', 'Custom');
  }

  function durationToBeats(noteData) {
    var duration = String(noteData.duration || '').replace(/r/g, '');
    var baseMap = { w: 4, h: 2, q: 1, '8': 0.5, '16': 0.25, '32': 0.125 };
    var base = baseMap[duration] || 0;
    var dots = Math.max(0, Number(noteData.dots || 0));
    var total = base, add = base / 2;
    for (var i = 0; i < dots; i++) { total += add; add /= 2; }
    return total;
  }

  function getStrictOnsets(id, fig) {
    if (strictOnsetProfiles[id]) return strictOnsetProfiles[id];
    if (!fig || !fig.vexflow || !fig.vexflow.length) return null;
    if (fig.triplet) {
      var step = (fig.beats || 1) / fig.vexflow.length;
      return fig.vexflow.map(function (_, i) { return i * step; });
    }
    var cursor = 0;
    return fig.vexflow.map(function (n) { var o = cursor; cursor += durationToBeats(n); return o; });
  }

  /* The usable span starts at `anchor` and ends at `width`. One beat is therefore
     `(width - anchor) / beatCount`, NOT `width / beatCount - anchor`.

     The lab has the second form. It is identical for a one-beat figure — `width - anchor` either
     way — and that is every figure the lab's own board renders in its own beat-span, so the bug
     never showed. Here, three covered figures span two beats (dotted-quarter-eighth,
     eighth-quarter-eighth, triplet-quarters), and the error is `onset * anchor`, growing with the
     onset: at width 400 and anchor 12, the eighth of a dotted-quarter-eighth landed 9px early.
     Ported faithfully, then fixed. Codex found it; the arithmetic is checkable on paper. */
  function getNotationGrid(width, beatCount) {
    var count = Math.max(1, beatCount || 1);
    var anchor = Math.max(8, Math.round((width / count) * 0.18 + notationGridNudgePx));
    return { anchor: anchor, unit: (width - anchor) / count };
  }

  /* VexFlow's Formatter spaces notes for engraving. The answer area is a GRID: a sixteenth must sit
     at exactly 0.25 of the beat or the student cannot read the alignment. So after drawing, shove
     each notehead to `anchor + onset * unit`, where `unit` is one beat of the usable span. Exact for
     one- and two-beat figures alike — see getNotationGrid for why that took two tries. */
  function applyStrictOnsets(group, id, fig, sourceXs, metrics) {
    var profile = opticalLayoutProfiles[id] || {};
    if (profile.xMode === 'center-beat') return;

    var onsets = getStrictOnsets(id, fig);
    if (!onsets || onsets.length !== sourceXs.length) return;

    var noteGroups = Array.prototype.slice.call(group.querySelectorAll('.vf-stavenote'));
    if (noteGroups.length < onsets.length) return;

    var beatUnit = metrics.gridUnit || (metrics.width / metrics.beatCount);
    onsets.forEach(function (onset, i) {
      var desiredScreenX = metrics.anchor + onset * beatUnit;
      var currentScreenX = metrics.shiftX + sourceXs[i] * metrics.scale;
      var delta = (desiredScreenX - currentScreenX) / metrics.scale;
      if (!isFinite(delta) || Math.abs(delta) < 0.01) return;
      noteGroups[i].setAttribute('transform', 'translate(' + delta.toFixed(2) + ' 0)');
    });

    // Beams and tuplet brackets were drawn against the ORIGINAL note positions. Stretch them to
    // span the new first/last onsets, or they detach from their noteheads.
    stretchContinuousGroups(group, sourceXs, onsets, metrics, beatUnit);
  }

  function stretchContinuousGroups(group, noteXs, onsets, metrics, beatUnit) {
    if (noteXs.length < 2 || onsets.length < 2) return;
    var firstLocal = noteXs[0], lastLocal = noteXs[noteXs.length - 1];
    var originalSpan = lastLocal - firstLocal;
    if (!isFinite(originalSpan) || Math.abs(originalSpan) < 0.01) return;

    var desiredFirstLocal = (metrics.anchor + onsets[0] * beatUnit - metrics.shiftX) / metrics.scale;
    var desiredLastLocal = (metrics.anchor + onsets[onsets.length - 1] * beatUnit - metrics.shiftX) / metrics.scale;
    var scaleX = (desiredLastLocal - desiredFirstLocal) / originalSpan;
    if (!isFinite(scaleX) || scaleX <= 0) return;

    var transform = 'translate(' + desiredFirstLocal.toFixed(2) + ' 0) scale(' + scaleX.toFixed(4) +
                    ' 1) translate(' + (-firstLocal).toFixed(2) + ' 0)';
    Array.prototype.slice.call(group.querySelectorAll('.vf-beam, .vf-tuplet')).forEach(function (n) {
      n.setAttribute('transform', transform);
    });
  }

  /* Put the NOTEHEAD on the staff line, not the glyph's bounding box. Centering the bbox floats the
     notehead ABOVE centre, because the box includes the downward stem — which is exactly what the
     owner saw ("can we get the render actually on the staff line?"). Instead, find the vertical
     centre of the noteheads and land THAT at the host's vertical centre (the host is centred on the
     line by CSS). Rests have no notehead, so fall back to bbox-centring for them. */
  function noteheadCenteredShiftY(group, box, height, scale) {
    var heads = group.querySelectorAll('.vf-notehead');
    if (heads.length && typeof heads[0].getBBox === 'function') {
      var top = Infinity, bot = -Infinity;
      for (var i = 0; i < heads.length; i++) {
        var hb = heads[i].getBBox();
        if (!hb || !isFinite(hb.y)) continue;
        top = Math.min(top, hb.y); bot = Math.max(bot, hb.y + hb.height);
      }
      if (isFinite(top) && isFinite(bot)) {
        var centreY = (top + bot) / 2;
        return Math.round(height / 2 - centreY * scale);
      }
    }
    return Math.round((height - box.height * scale) / 2 - box.y * scale);
  }

  function normalizeRenderedSvg(host, width, height, id, fig, firstNoteX, noteXs) {
    var svg = host.querySelector('svg');
    if (!svg) return;

    svg.setAttribute('width', String(width));
    svg.setAttribute('height', String(height));
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    svg.style.width = '100%';
    svg.style.height = '100%';

    var children = Array.prototype.slice.call(svg.childNodes);
    if (!children.length || typeof svg.getBBox !== 'function') return;

    var group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    children.forEach(function (c) { group.appendChild(c); });
    svg.appendChild(group);

    requestAnimationFrame(function () {
      try {
        var box = group.getBBox();
        if (!box || !isFinite(box.x)) return;
        var profile = opticalLayoutProfiles[id] || {};
        var beatCount = Math.max(1, fig.beats || 1);
        var scale = isFinite(profile.scale) ? profile.scale : answerRenderScale;
        var grid = getNotationGrid(width, beatCount);
        var sourceX = isFinite(firstNoteX) ? firstNoteX : box.x;
        var shiftX = profile.xMode === 'center-beat'
          ? Math.round((width - box.width * scale) / 2 - box.x * scale)
          : Math.round(grid.anchor - sourceX * scale);
        var shiftY = noteheadCenteredShiftY(group, box, height, scale);
        group.setAttribute('transform', 'translate(' + shiftX + ' ' + shiftY + ') scale(' + scale + ')');
        applyStrictOnsets(group, id, fig, noteXs || [], {
          anchor: grid.anchor, beatCount: beatCount, scale: scale,
          shiftX: shiftX, width: width, gridUnit: grid.unit
        });
      } catch (e) {
        group.removeAttribute('transform');
      }
    });
  }

  /* Draw one figure into `host`. Returns true if it drew, false if the caller must fall back to PNG.
     NEVER throws: a renderer that throws inside a drag-and-drop handler strands the tile. */
  function renderFigure(host, id) {
    // EVERYTHING that touches `host` is inside the try. An earlier version cleared it and read
    // clientWidth before entering, so a null or detached host threw straight through the
    // "never throws" contract three lines below. Codex caught it.
    try {
      var fig = FIGURES[id];
      if (!fig || !host) return false;

      var VF = window.Vex && window.Vex.Flow;
      if (!VF || !VF.Renderer || !VF.StaveNote) return false;

      host.textContent = '';
      var width = Math.max(64, Math.round(host.clientWidth || 104 * fig.beats));
      var height = Math.max(44, Math.round(host.clientHeight || 70));

      applyMusicFont(VF);
      var renderer = new VF.Renderer(host, VF.Renderer.Backends.SVG);
      renderer.resize(width, height);
      var context = renderer.getContext();

      // setContext, NOT draw(). The beat line belongs to the cell's CSS; drawing the stave here
      // paints a five-line staff behind the figure.
      var stave = new VF.Stave(0, -31, width + 8);
      stave.setContext(context);

      var notes = fig.vexflow.map(function (n) {
        var note = new VF.StaveNote({ clef: 'percussion', keys: ['b/4'], duration: n.duration });
        if (n.dots) for (var i = 0; i < n.dots; i++) note.addModifier(new VF.Dot(), 0);
        // STEMS DOWN, always. A one-line rhythm staff reads with the stems below the line; letting
        // VexFlow choose gives stems up for a notehead on the middle line. Beams override this, so
        // it is re-asserted after beaming too.
        var DOWN0 = (VF.Stem && VF.Stem.DOWN) || -1;
        if (typeof note.setStemDirection === 'function') note.setStemDirection(DOWN0);
        return note;
      });

      var beams = [];
      var tuplet = null;

      /* BEAMS RESET STEM DIRECTION. `Beam.generateBeams()` and `new Beam()` both recompute the
         stem for every note in the group from the note average, which threw away the STEM_DOWN set
         above — measured: 3 of 17 tiles came out stems-down. Pass the direction into the beam, and
         re-assert it afterwards for the notes no beam touched. */
      var DOWN = (VF.Stem && VF.Stem.DOWN) || -1;
      if (fig.triplet && notes.length === 3) {
        var canBeam = notes.every(function (n) { return n.getDuration() === '8' || n.getDuration() === '16'; });
        if (canBeam) beams = [new VF.Beam(notes, false)];   // auto_stem=false: keep ours
        tuplet = new VF.Tuplet(notes, { num_notes: 3, notes_occupied: 2, bracketed: true, location: 1, y_offset: 15 });
      } else {
        beams = VF.Beam.generateBeams(notes, { stem_direction: DOWN });
      }
      notes.forEach(function (n) {
        if (typeof n.setStemDirection === 'function') n.setStemDirection(DOWN);
      });

      var voice = new VF.Voice({ num_beats: fig.beats, beat_value: 4 });
      setSoftVoiceMode(VF, voice);
      voice.addTickables(notes);
      new VF.Formatter().joinVoices([voice]).format([voice], Math.max(24, width - 24));
      voice.draw(context, stave);
      beams.forEach(function (b) { b.setContext(context).draw(); });
      if (tuplet) tuplet.setContext(context).draw();

      var noteXs = notes
        .map(function (n) { return typeof n.getAbsoluteX === 'function' ? Math.round(n.getAbsoluteX()) : null; })
        .filter(function (x) { return x !== null; });

      normalizeRenderedSvg(host, width, height, id, fig, noteXs.length ? noteXs[0] : null, noteXs);
      return true;
    } catch (e) {
      try { if (host) host.textContent = ''; } catch (e2) {}
      return false;   // caller falls back to PNG
    }
  }

  /* `?renderer=` — png (today's art), vexflow (draw everything we can), hybrid (VexFlow where the
     lab covers the figure, PNG otherwise). Default is png: this is opt-in until it is A/B'd. */
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
    figureIds: Object.keys(FIGURES)
  };
})();
