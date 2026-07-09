/**
 * @file core/pitch.test.js
 * Unit tests for the SING-station pitch math (core/pitch.js).
 * Synthesizes clean/harmonic-mixed sine buffers to exercise detectPitch, and
 * checks the cents-grading + median helpers. No DOM, no WebAudio.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  midiToHz,
  hzToMidi,
  centsBetween,
  detectPitch,
  medianPitch,
  gradeSungPitch,
} from './pitch.js';

// --- inline sine synthesis helpers ------------------------------------------

/** A Float32Array of `n` samples of a sine at `hz`, amplitude `amp`. */
function sine(hz, sampleRate, n, amp = 0.8) {
  const buf = new Float32Array(n);
  const w = (2 * Math.PI * hz) / sampleRate;
  for (let i = 0; i < n; i++) buf[i] = amp * Math.sin(w * i);
  return buf;
}

/** Fundamental at `hz` plus its 2nd harmonic scaled by `h2`. */
function sineWithSecondHarmonic(hz, sampleRate, n, h2 = 0.4, amp = 0.8) {
  const buf = new Float32Array(n);
  const w = (2 * Math.PI * hz) / sampleRate;
  for (let i = 0; i < n; i++) {
    buf[i] = amp * (Math.sin(w * i) + h2 * Math.sin(2 * w * i));
  }
  return buf;
}

// ----------------------------------------------------------------------------

test('midiToHz / hzToMidi: known anchors and round-trip', () => {
  assert.equal(midiToHz(69), 440);
  assert.ok(Math.abs(midiToHz(60) - 261.6255653) < 1e-4, 'MIDI 60 ≈ 261.63 Hz');
  assert.ok(Math.abs(hzToMidi(440) - 69) < 1e-9);
  for (const midi of [40, 55, 60, 69, 72, 84]) {
    assert.ok(Math.abs(hzToMidi(midiToHz(midi)) - midi) < 1e-9, `round-trip ${midi}`);
  }
});

test('centsBetween: octave = 1200¢, semitone ≈ 100¢, unison = 0', () => {
  assert.ok(Math.abs(centsBetween(220, 440) - 1200) < 1e-9, 'octave');
  assert.ok(Math.abs(centsBetween(440, 220) + 1200) < 1e-9, 'octave down');
  assert.ok(Math.abs(centsBetween(midiToHz(60), midiToHz(61)) - 100) < 1e-9, 'semitone');
  assert.equal(centsBetween(440, 440), 0, 'unison');
});

test('detectPitch: clean sine tones detected within ±15¢ across the vocal band', () => {
  const sampleRate = 44100;
  const n = 2048;
  const freqs = [110, 146.83, 220, 261.63, 329.63, 440, 523.25, 659.25];
  const failures = [];
  for (const f of freqs) {
    const res = detectPitch(sine(f, sampleRate, n), sampleRate);
    if (!res) { failures.push(`${f}Hz: no detection (null)`); continue; }
    const cents = centsBetween(f, res.hz);
    if (Math.abs(cents) > 15) failures.push(`${f}Hz: off by ${cents.toFixed(2)}¢ (detected ${res.hz.toFixed(2)}Hz)`);
  }
  assert.equal(failures.length, 0, `detectPitch accuracy failures:\n  ${failures.join('\n  ')}`);
});

test('detectPitch: locks onto the fundamental, not the octave, with a 2nd harmonic present', () => {
  const sampleRate = 44100;
  const n = 2048;
  const failures = [];
  for (const f of [220, 329.63]) {
    const res = detectPitch(sineWithSecondHarmonic(f, sampleRate, n, 0.4), sampleRate);
    if (!res) { failures.push(`${f}Hz(+H2): no detection (null)`); continue; }
    const cents = centsBetween(f, res.hz);
    if (Math.abs(cents) > 15) failures.push(`${f}Hz(+H2): off by ${cents.toFixed(2)}¢ (detected ${res.hz.toFixed(2)}Hz)`);
  }
  assert.equal(failures.length, 0, `harmonic-lock failures:\n  ${failures.join('\n  ')}`);
});

test('detectPitch: returns null on near-silence', () => {
  const sampleRate = 44100;
  const n = 2048;
  assert.equal(detectPitch(new Float32Array(n), sampleRate), null, 'all-zeros');
  // tiny-amplitude noise, below the RMS floor
  const noise = new Float32Array(n);
  for (let i = 0; i < n; i++) noise[i] = (Math.random() * 2 - 1) * 0.0005;
  assert.equal(detectPitch(noise, sampleRate), null, 'tiny noise');
});

test('medianPitch: ignores nulls, returns median hz + voiced count', () => {
  assert.equal(medianPitch([null, null]), null);
  assert.equal(medianPitch([]), null);
  const odd = medianPitch([
    { hz: 300, clarity: 0.9 }, null, { hz: 100, clarity: 0.9 }, { hz: 200, clarity: 0.9 },
  ]);
  assert.deepEqual(odd, { hz: 200, voiced: 3 });
  const even = medianPitch([
    { hz: 100, clarity: 0.9 }, { hz: 300, clarity: 0.9 }, null, { hz: 500, clarity: 0.9 }, { hz: 100, clarity: 0.9 },
  ]);
  assert.equal(even.voiced, 4);
  assert.equal(even.hz, 200); // median of [100,100,300,500] = (100+300)/2
});

test('gradeSungPitch: hit / near / octave / miss bands', () => {
  const target = 60; // MIDI 60
  const targetHz = midiToHz(target);

  const exact = gradeSungPitch(target, targetHz);
  assert.equal(exact.verdict, 'hit');
  assert.ok(Math.abs(exact.cents) < 1e-9);

  // +40¢ sharp → still a hit
  const sharp40 = gradeSungPitch(target, targetHz * Math.pow(2, 40 / 1200));
  assert.equal(sharp40.verdict, 'hit');
  assert.ok(Math.abs(sharp40.cents - 40) < 1e-6);

  // +80¢ → near
  const sharp80 = gradeSungPitch(target, targetHz * Math.pow(2, 80 / 1200));
  assert.equal(sharp80.verdict, 'near');

  // one octave up (exactly) → octave
  const octave = gradeSungPitch(target, midiToHz(target + 12));
  assert.equal(octave.verdict, 'octave');

  // a tritone off (+600¢) → miss
  const tritone = gradeSungPitch(target, midiToHz(target + 6));
  assert.equal(tritone.verdict, 'miss');
});
