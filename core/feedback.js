/**
 * @file core/feedback.js
 * @module core/feedback
 *
 * STAGE-ISOLATED dictation feedback (MELODIC_LADDER_EXPANSION_PLAN NEW-F).
 * Klonoski's central critique of dictation: a wrong transcription alone can't
 * tell you WHICH sub-skill failed — meter/rhythm, contour (direction), scale-
 * degree precision, tonic anchoring, or note count. This pure classifier reads
 * the per-note truth vs the student's answer (data every graded renderer already
 * has) and names the dominant failing STAGE with a plain-language tip, so the
 * student knows what to practise — the diagnostic layer no shipped app has.
 *
 * Pure: no DOM/audio/IO. Framework-agnostic, deterministic.
 */

/** direction of the move from a→b: 'up' | 'down' | 'same' (null if either missing). */
function dir(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return b > a ? 'up' : b < a ? 'down' : 'same';
}

/**
 * Classify a degree-dictation attempt.
 *
 * @param {Object} o
 * @param {number[]} o.trueDegrees   the melody's true scale degrees, in order
 * @param {Array<number|null>} o.answerDegrees the student's degrees (null = blank)
 * @param {number} [o.rhythmAccuracy] 0..1 if a rhythm phase was graded (notation-entry)
 * @param {number} [o.pitchAccuracy]  0..1 if pitch was graded separately
 * @returns {{stage:string, headline:string, tip:string, counts:Object}}
 *   stage ∈ 'clean' | 'count' | 'rhythm' | 'contour' | 'tonic' | 'degree'
 */
export function classifyDictation(o) {
  const truth = Array.isArray(o.trueDegrees) ? o.trueDegrees : [];
  const ans = Array.isArray(o.answerDegrees) ? o.answerDegrees : [];
  const n = truth.length;

  // Rhythm vs pitch split (notation-entry): if the rhythm was the weaker channel
  // and imperfect, that's the stage to name first — the research's single-stream
  // finding (rhythm and pitch compete for attention; fix rhythm first).
  if (Number.isFinite(o.rhythmAccuracy) && o.rhythmAccuracy < 0.999
      && (!Number.isFinite(o.pitchAccuracy) || o.rhythmAccuracy <= o.pitchAccuracy)) {
    return {
      stage: 'rhythm',
      headline: 'Work on the RHYTHM first',
      tip: 'Lock the beat before the pitches — count out loud and get each note’s length down, then add the scale-degrees.',
      counts: { rhythmAccuracy: o.rhythmAccuracy },
    };
  }

  // Count mismatch: the student didn't capture the right number of notes — a
  // memory/segmentation failure, distinct from getting notes wrong.
  const answered = ans.filter((d) => Number.isFinite(d));
  if (answered.length && answered.length !== n) {
    return {
      stage: 'count',
      headline: 'Count of notes is off',
      tip: 'You wrote ' + answered.length + ' note' + (answered.length === 1 ? '' : 's') + '; there were ' + n +
        '. Hold the whole phrase in your ear and count the attacks before writing.',
      counts: { wrote: answered.length, actual: n },
    };
  }

  // Per-note errors over the overlap.
  const wrong = [];
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(ans[i]) && ans[i] !== truth[i]) wrong.push(i);
  }
  if (!wrong.length) {
    return {
      stage: 'clean',
      headline: 'Clean — every note right',
      tip: 'Nice hearing. Try a longer or faster example to stretch it.',
      counts: { wrong: 0 },
    };
  }

  // Categorize each wrong note: contour-flip (direction from the previous note
  // is wrong) vs degree-slip (direction right, wrong exact degree); and whether
  // the student lost HOME (missed a tonic, or heard tonic where there wasn't one).
  let contourFlips = 0, tonicConfusions = 0;
  for (const i of wrong) {
    if (i > 0) {
      const trueDir = dir(truth[i - 1], truth[i]);
      const ansDir = dir(ans[i - 1] != null ? ans[i - 1] : truth[i - 1], ans[i]);
      if (trueDir && ansDir && trueDir !== ansDir) contourFlips++;
    }
    if (truth[i] === 1 || ans[i] === 1) tonicConfusions++;
  }

  // Dominant stage. Contour is the more fundamental miss (you didn't track the
  // shape); then tonic anchoring; else it's degree precision (shape right, exact
  // degree off — the finest-grained, most-advanced skill).
  if (contourFlips >= Math.ceil(wrong.length / 2)) {
    return {
      stage: 'contour',
      headline: 'Track the CONTOUR',
      tip: 'Some moves went the wrong direction. Before naming degrees, trace up/down/same — get the shape, then place the exact notes.',
      counts: { wrong: wrong.length, contourFlips },
    };
  }
  if (tonicConfusions >= Math.ceil(wrong.length / 2)) {
    return {
      stage: 'tonic',
      headline: 'Re-anchor to HOME (1̂)',
      tip: 'The tonic slipped. Hum home before each hearing and keep checking notes against it — losing the key center is the usual culprit.',
      counts: { wrong: wrong.length, tonicConfusions },
    };
  }
  return {
    stage: 'degree',
    headline: 'Sharpen degree PRECISION',
    tip: 'Shape is right; a few exact degrees are off (often a neighbour). Sing each note down to home to pin its scale-degree.',
    counts: { wrong: wrong.length },
  };
}
