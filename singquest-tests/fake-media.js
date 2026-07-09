/**
 * Fake-media injection for SingQuest headless tests.
 *
 * We do NOT rely on Chromium's built-in fake device tone (its frequency is fixed
 * and not test-controllable). Instead we launch with the fake-ui flag (so the mic
 * permission prompt is auto-accepted) and OVERRIDE navigator.mediaDevices.getUserMedia
 * inside the page to return a MediaStream carrying a sine wave at a test-chosen
 * frequency. captureSungFrames() then reads a deterministic sung pitch, so the
 * real detectPitch -> medianPitch -> gradeForLevel path is exercised end-to-end.
 *
 * window.__sqFake.setHz(freq) chooses the tone; setHz(0) simulates silence
 * (no clear pitch). setDenied(true) makes getUserMedia reject (consent-denied path).
 */

/** Page-context init script. Runs before any app script. */
export function fakeMediaInit() {
  // eslint-disable-next-line no-undef
  const AC = window.AudioContext || window.webkitAudioContext;
  const fakeCtx = new AC();
  // One continuously-running oscillator -> a gain bus. Each getUserMedia() call
  // gets its OWN fresh MediaStreamDestination fed from the bus, so when the app
  // calls releaseMic() (which STOPS the returned stream's tracks) it kills only
  // that call's stream — the shared oscillator keeps running and the NEXT
  // getUserMedia() returns a live stream. (Returning one shared stream caused the
  // 2nd capture to be silent: the 1st releaseMic() had permanently stopped it.)
  const osc = fakeCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 261.63; // C4 default
  const bus = fakeCtx.createGain();
  bus.gain.value = 0.35; // well above the -44 dBFS RMS gate
  osc.connect(bus);
  osc.start();
  let denied = false;

  function setHz(hz) {
    if (!hz || hz <= 0) { bus.gain.value = 0; return; } // 0 => silence (no clear pitch)
    bus.gain.value = 0.35;
    osc.frequency.setValueAtTime(hz, fakeCtx.currentTime);
  }

  window.__sqFake = {
    setHz,
    setDenied(v) { denied = !!v; },
    resume() { return fakeCtx.resume(); },
  };

  const realGUM = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    : null;

  const gum = async (constraints) => {
    if (denied) throw new DOMException('Permission denied', 'NotAllowedError');
    if (constraints && constraints.audio) {
      await fakeCtx.resume().catch(() => {});
      const dest = fakeCtx.createMediaStreamDestination(); // FRESH per call
      bus.connect(dest);
      return dest.stream;
    }
    if (realGUM) return realGUM(constraints);
    throw new DOMException('no media', 'NotFoundError');
  };

  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true });
  }
  try { navigator.mediaDevices.getUserMedia = gum; } catch (e) {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: gum, configurable: true });
  }
}

/** MIDI -> Hz (A4=440), matching core/pitch.js, for choosing test tones. */
export function midiToHz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }
/** Hz that is `cents` from a target MIDI note. */
export function hzAtCents(targetMidi, cents) { return midiToHz(targetMidi) * Math.pow(2, cents / 1200); }
