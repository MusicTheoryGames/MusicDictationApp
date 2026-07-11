/* shared/rhythm-notation/answer-board.js — data-driven answer-key board on the SHARED renderer.
 *
 * PURPOSE: prove the teacher tool's answer key can render on the SAME renderer the game uses
 * (window.RhythmNotation, shared/rhythm-notation/renderer.js) so teacher notation matches
 * RhythmQuest exactly and can never drift.
 *
 * It builds the game's grouped-measures board — the same DOM classes the game emits from
 * quest-redesign.js `renderBeatMeasureGroup` (.staff-row / .beat-measure-lane / .measure-group /
 * .measure-number / .beat-drop-zone / .beat-notation / .placed-glyph / .placed-vex-host) — and fills
 * each beat by calling window.RhythmNotation.schedulePlacedVexRender, the exact call the game uses.
 * The accompanying answer-board.css is those .measure-group / barline / white-panel / .placed-vex-host
 * rules ported verbatim from quest-redesign.css, so a figure looks identical to the game.
 *
 * This is NOT the teacher console UI (that's mockup-fidelity, owner-approved only). It's the shared
 * answer-renderer + a demo, so any surface (teacher page, projector) can reuse it.
 *
 * API:  RhythmAnswerBoard.renderAnswer(host, rhythm, meter, opts)
 *   host   : container element (gets class "answer-board")
 *   rhythm : [{ figureId, beats }]  (beats optional — falls back to the catalog spec's beats)
 *   meter  : { timeSignature: string, beatsPerMeasure: number | number[], beatUnit: string }
 *            timeSignature is the display label (e.g. "6/8") — the ONLY correct source for the drawn
 *            signature. beatsPerMeasure is the BEAT count per measure (used for grouping), one number
 *            (uniform) or an array (per measure). beatUnit is a string ('quarter'/'dotted-quarter'/…),
 *            not used for the label. If timeSignature is omitted, the label falls back to <beats>/4.
 *   opts   : {
 *              revealed        : Set<number>   // beat indexes that are LIVE (green); others = grey key
 *              showTimeSignature : boolean      // default true — draws the leading time signature
 *            }
 *
 * KNOWN LIMITS (bounded, not silent — Codex flagged both; both are rare and the GAME itself does not
 * support #1): (1) a figure that SPANS a measure boundary would overlap the barline — valid answers
 * keep figures within a bar, so this should not occur; if it does, the input is malformed. (2) a
 * CHANGING meter (beatsPerMeasure array of differing values) draws only the leading time signature,
 * not inline signatures at each change — a follow-up if/when a changing-meter answer is actually used.
 */
(function () {
  "use strict";

  function renderAnswer(host, rhythm, meter, opts) {
    const R = window.RhythmNotation;
    if (!host || !R) return;
    const options = opts || {};
    const catalog = R.catalog || {};
    const revealed = options.revealed instanceof Set ? options.revealed : null;
    const showTimeSignature = options.showTimeSignature !== false;

    clear(host);
    host.classList.add("answer-board");
    if (revealed) host.classList.add("has-reveal");

    // 1) Walk the figure sequence into a per-beat placement map (mirrors the game's placements array).
    const placements = [];
    let cursor = 0;
    (Array.isArray(rhythm) ? rhythm : []).forEach((figure) => {
      if (!figure || !figure.figureId) return;
      const spec = catalog[figure.figureId];
      const beats = Math.max(1, Number(figure.beats || (spec && spec.beats) || 1));
      placements[cursor] = { id: figure.figureId, beats: beats, start: cursor };
      for (let k = 1; k < beats; k += 1) {
        placements[cursor + k] = { continuationOf: cursor, start: cursor };
      }
      cursor += beats;
    });
    const totalBeats = cursor;
    if (!totalBeats) return;

    // 2) Slice beats into measures per the meter (uniform number, or per-measure array).
    const perMeasure = normalizePerMeasure(meter);
    const measures = [];
    let beat = 0;
    let measureIndex = 0;
    while (beat < totalBeats) {
      const declared = perMeasure[Math.min(measureIndex, perMeasure.length - 1)] || 4;
      measures.push({ start: beat, beats: Math.min(declared, totalBeats - beat), declared: declared });
      beat += declared;
      measureIndex += 1;
    }

    // 3) Build the game's staff row: leading time signature + a lane of white measure panels.
    const row = el("div", "staff-row is-first-row");
    row.style.setProperty("--sig-col-w", showTimeSignature ? "38px" : "0px");
    row.style.setProperty("--sig-gap", showTimeSignature ? "10px" : "0px");

    const sigSlot = el("div", "time-signature-slot");
    if (showTimeSignature) {
      sigSlot.appendChild(makeTimeSignatureElement(meter && meter.timeSignature, perMeasure[0]));
    }
    row.appendChild(sigSlot);

    const lane = el("div", "beat-measure-lane");
    lane.style.setProperty("--row-measures", String(measures.length));

    measures.forEach((measure, index) => {
      const group = el("div", "measure-group is-complete");
      group.dataset.measure = String(index + 1);
      group.style.setProperty("--beats-per-measure", String(measure.beats));
      if (index === measures.length - 1) group.classList.add("is-final-measure");

      const label = el("span", "measure-number");
      label.textContent = String(index + 1);
      group.appendChild(label);

      for (let b = 0; b < measure.beats; b += 1) {
        const i = measure.start + b;
        group.appendChild(makeBeatCell(R, placements[i], i, b + 1, revealed));
      }
      lane.appendChild(group);
    });

    row.appendChild(lane);
    host.appendChild(row);
  }

  function makeBeatCell(R, placement, beatIndex, beatNumber, revealed) {
    // A DIV, not the game's interactive <button>: this board is standalone (no quest-redesign.css
    // global `button{appearance:none}` reset), so a <button> here would show native chrome and look
    // WRONG. `.beat-drop-zone` fully styles the div, matching the game without needing the reset.
    const zone = el("div", "beat-drop-zone");
    zone.dataset.beat = String(beatIndex);

    const num = el("span", "beat-num");
    num.textContent = String(beatNumber);
    zone.appendChild(num);

    const notation = el("span", "beat-notation");
    zone.appendChild(notation);

    if (placement && placement.id) {
      // Head of a figure — carries the glyph.
      zone.classList.add("is-filled");
      if (placement.beats > 1) {
        zone.classList.add("is-span-head");
        zone.style.setProperty("--span-w", spanWidth(placement.beats));
      }
      notation.appendChild(makePlacedGlyph(R, placement));
      applyRevealTint(zone, beatIndex, revealed);
    } else if (placement && placement.continuationOf !== undefined) {
      // Interior beat covered by the previous figure's span. The game tags these with ONLY
      // `is-continuation` (not `is-filled`) — match it. (Codex finding.)
      zone.classList.add("is-continuation");
      applyRevealTint(zone, placement.start, revealed);
    } else {
      // No figure on this beat (shouldn't happen for a full answer, but stays graceful).
      applyRevealTint(zone, beatIndex, revealed);
    }
    return zone;
  }

  // Mirrors quest-redesign.js makePlacedGlyph's VexFlow path: the game's default answer renderer runs
  // EVERY figure through renderPlacedVex (shouldRenderPlacedVex returns true for all families in the
  // default mode), so the answer key does too — one renderer, no drift.
  function makePlacedGlyph(R, placement) {
    const holder = el("span", "placed-glyph uses-vex-renderer asset-" + placement.id);
    holder.dataset.renderer = "vexflow";
    if (placement.beats > 1) holder.style.width = spanWidth(placement.beats);

    const vexHost = el("span", "placed-vex-host");
    vexHost.dataset.pattern = placement.id;
    vexHost.dataset.beats = String(placement.beats);
    vexHost.dataset.start = String(placement.start);
    holder.appendChild(vexHost);

    R.schedulePlacedVexRender(vexHost, {
      id: placement.id,
      beats: placement.beats,
      start: placement.start
    });
    return holder;
  }

  function applyRevealTint(zone, headBeat, revealed) {
    if (!revealed) return;
    zone.classList.add(revealed.has(headBeat) ? "is-live" : "is-key");
  }

  // Draw the leading time signature from the meter's OWN timeSignature string (e.g. "6/8"), which is
  // the only correct source. `beatUnit` is a STRING in this suite ('quarter'/'dotted-quarter'/…) and
  // `beatsPerMeasure` is the BEAT count, not the numerator — so deriving "N/Number(beatUnit)" gives
  // the wrong signature for compound and non-quarter meters (6/8 -> "2/4"). Only fall back to beats/4
  // when no timeSignature is supplied (a plain simple-meter caller).
  function makeTimeSignatureElement(timeSignature, fallbackTop) {
    const sig = el("div", "time-signature");
    const raw = timeSignature == null ? "" : String(timeSignature);
    const parsed = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(raw);
    let numerator, denominator;
    if (parsed) {
      numerator = parsed[1];
      denominator = parsed[2];
    } else if (raw.trim() === "") {
      // ABSENT: a simple-meter caller relying on beatsPerMeasure. Fall back to <beats>/4.
      numerator = String(Math.max(1, Number(fallbackTop) || 4));
      denominator = "4";
    } else {
      // PRESENT but unparseable — a caller bug. Do NOT fabricate a confident wrong meter (VISION
      // rule 12: the app never lies). Surface the raw value so it reads visibly wrong, and warn.
      if (typeof console !== "undefined" && console.warn) {
        console.warn("RhythmAnswerBoard: malformed timeSignature", raw);
      }
      numerator = raw;
      denominator = "";
    }
    sig.setAttribute("aria-label", denominator ? numerator + "/" + denominator : numerator);
    const topSpan = el("span");
    topSpan.textContent = numerator;
    const bottomSpan = el("span");
    bottomSpan.textContent = denominator;
    sig.append(topSpan, bottomSpan);
    return sig;
  }

  function normalizePerMeasure(meter) {
    const value = meter && meter.beatsPerMeasure;
    if (Array.isArray(value) && value.length) return value.map((n) => Math.max(1, Number(n) || 4));
    const single = Math.max(1, Number(value) || 4);
    return [single];
  }

  function spanWidth(beats) {
    return "calc((var(--slot-w) * " + beats + ") + (var(--slot-gap) * " + (beats - 1) + "))";
  }

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  window.RhythmAnswerBoard = { renderAnswer: renderAnswer };
})();
