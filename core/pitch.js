/**
 * @file core/pitch.js
 * @module core/pitch
 *
 * Pure pitch-detection + cents-grading math for the Interval Gym's SING station
 * (INTERVAL_GYM_SPEC.md §5.4). No DOM, no WebAudio — takes a Float32-style
 * sample buffer and a sample rate, returns f0 + clarity; and grades a sung
 * frequency against a target MIDI in cents. Kept in core/ so it is unit-testable
 * with synthesized tones (the browser only supplies the real microphone stream).
 */

export const A4_HZ = 440;

/** MIDI note number → frequency in Hz (equal temperament, A4=440=MIDI 69). */
export function midiToHz(midi) {
  return A4_HZ * Math.pow(2, (midi - 69) / 12);
}

/** Frequency in Hz → (fractional) MIDI note number. */
export function hzToMidi(hz) {
  return 69 + 12 * Math.log2(hz / A4_HZ);
}

/** Signed cents from a reference Hz to a measured Hz (+ = measured is sharp). */
export function centsBetween(refHz, measuredHz) {
  return 1200 * Math.log2(measuredHz / refHz);
}

/**
 * Estimate the fundamental of one analysis frame by normalized autocorrelation
 * (INTERVAL_GYM_SPEC §5.4: 80–1000 Hz band, confidence = peak clarity).
 *
 * @param {ArrayLike<number>} buf mono samples in [-1, 1]
 * @param {number} sampleRate Hz
 * @param {Object} [opts] {minHz=80, maxHz=1000, clarityThreshold=0.5}
 * @returns {{hz:number, clarity:number}|null} null when the frame is too quiet
 *   or no confident period is found.
 */
export function detectPitch(buf, sampleRate, opts = {}) {
  const minHz = opts.minHz ?? 80;
  const maxHz = opts.maxHz ?? 1000;
  const clarityThreshold = opts.clarityThreshold ?? 0.5;
  // RMS silence floor. Default ~ -44 dBFS (the Interval Gym's fine-pitch setting).
  // Callers on quiet mobile inputs (e.g. SingQuest on iPad with auto-gain) pass a
  // much lower floor so a real-but-quiet sung tone isn't discarded as silence.
  const rmsFloor = opts.rmsFloor ?? 0.006;
  const n = buf.length;

  // RMS gate: silent/near-silent frames carry no pitch.
  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += buf[i] * buf[i];
  const rms = Math.sqrt(sumSq / n);
  if (rms < rmsFloor) return null;

  const minLag = Math.floor(sampleRate / maxHz);
  const maxLag = Math.min(Math.floor(sampleRate / minHz), n - 1);

  // Normalized autocorrelation across the candidate lag range. Normalizing by
  // the per-lag energy (rather than raw ACF) keeps the clarity comparable across
  // lags and gives a real 0..1 confidence.
  const corrs = new Float64Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) corrs[lag] = normAt(buf, lag, n);

  // Collect LOCAL MAXIMA. A pure tone's autocorrelation peaks near 1.0 at the
  // true period AND at every integer multiple of it (2×, 3× the period = an
  // octave, two octaves DOWN). Picking the highest peak — or the first peak
  // after the initial dip — locks onto one of those sub-octave multiples
  // (the classic autocorrelation octave-halving error). The fix: among all
  // strong peaks, take the one at the SHORTEST lag, i.e. the true fundamental.
  let globalMax = 0;
  const peaks = [];
  for (let lag = minLag + 1; lag < maxLag; lag++) {
    if (corrs[lag] > corrs[lag - 1] && corrs[lag] >= corrs[lag + 1]) {
      peaks.push(lag);
      if (corrs[lag] > globalMax) globalMax = corrs[lag];
    }
  }
  if (globalMax < clarityThreshold) return null;
  // The fundamental is the shortest-lag peak whose clarity is within tolerance
  // of the strongest peak (its sub-octave multiples are never much stronger).
  const accept = globalMax * 0.86;
  let bestLag = -1;
  for (const lag of peaks) { if (corrs[lag] >= accept) { bestLag = lag; break; } }
  if (bestLag < 0) return null;
  const bestCorr = corrs[bestLag];

  // Parabolic interpolation around the chosen lag for sub-sample precision.
  const y0 = normAt(buf, bestLag - 1, n);
  const y1 = bestCorr;
  const y2 = normAt(buf, bestLag + 1, n);
  const denom = (y0 - 2 * y1 + y2);
  const shift = denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0;
  const refinedLag = bestLag + Math.max(-1, Math.min(1, shift));
  return { hz: sampleRate / refinedLag, clarity: bestCorr };
}

function normAt(buf, lag, n) {
  if (lag < 1 || lag >= n) return 0;
  let corr = 0;
  let e1 = 0;
  let e2 = 0;
  for (let i = 0; i + lag < n; i++) {
    corr += buf[i] * buf[i + lag];
    e1 += buf[i] * buf[i];
    e2 += buf[i + lag] * buf[i + lag];
  }
  return corr / (Math.sqrt(e1 * e2) + 1e-12);
}

/**
 * Median f0 over a set of per-frame detections (the sung pitch across the
 * capture window), ignoring unvoiced frames.
 * @param {Array<{hz:number,clarity:number}|null>} frames
 * @returns {{hz:number, voiced:number}|null}
 */
export function medianPitch(frames) {
  const hzs = frames.filter(Boolean).map((f) => f.hz).sort((a, b) => a - b);
  if (!hzs.length) return null;
  const mid = Math.floor(hzs.length / 2);
  const hz = hzs.length % 2 ? hzs[mid] : (hzs[mid - 1] + hzs[mid]) / 2;
  return { hz, voiced: hzs.length };
}

/**
 * Grade a sung frequency against a target MIDI in cents (INTERVAL_GYM §5.4):
 * ±50¢ = hit, ±51–100¢ = near, octave-off (±1200¢±50¢) = near with its own
 * message, else miss.
 * @param {number} targetMidi
 * @param {number} sungHz
 * @returns {{verdict:'hit'|'near'|'octave'|'miss', cents:number, octaveCents:number}}
 */
export function gradeSungPitch(targetMidi, sungHz) {
  const targetHz = midiToHz(targetMidi);
  const cents = centsBetween(targetHz, sungHz);
  const abs = Math.abs(cents);
  // Distance to the nearest octave-equivalent of the target (mod 1200).
  const octaveCents = ((abs % 1200) > 600) ? 1200 - (abs % 1200) : (abs % 1200);
  if (abs <= 50) return { verdict: 'hit', cents, octaveCents };
  if (abs <= 100) return { verdict: 'near', cents, octaveCents };
  if (octaveCents <= 50) return { verdict: 'octave', cents, octaveCents };
  return { verdict: 'miss', cents, octaveCents };
}
