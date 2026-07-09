/**
 * SingQuest Phase 0 (trimmed) headless fake-media test driver.
 *
 * Scope under test: LANDING -> Find-your-voice -> S1 "Match a note", in all
 * THREE themes (Playful / Studio / Minimal, default Studio), with COARSE
 * feedback (matched / close / way-off) and teach-then-do.
 *
 * Serves the repo via `python3 -m http.server`, launches Chromium with
 * --use-fake-ui-for-media-stream (auto-accept the mic prompt), injects
 * fake-media.js to feed getUserMedia a test-controlled sine tone, drives the
 * page, and reads window.__sqTest.* to assert the real capture -> detect ->
 * coarse-grade -> coach path.
 *
 * Asserts (headless-provable — human-only checks are listed in the report):
 *   1. probe: an in-range tone yields a plausible {lowMidi,highMidi,tonicOctave}.
 *   2. S1: an in-tune tone -> COARSE 'matched' + pass; a slightly-off tone ->
 *      'close'; a far-off tone -> 'way-off' + a hint rung fired (never bare fail).
 *   3. NO digit / ¢ / needle character anywhere in the feedback DOM.
 *   4. Theme switch changes the skin: a Playful-only marker and a Studio-only
 *      marker are present under their themes and absent under the other.
 *   5. Consent-denied self-check fallback is reachable.
 *   6. No emoji anywhere in the rendered DOM.
 *   7. Six screenshots: LANDING + S1 in each of the three themes.
 *
 * Usage: node singquest-tests/run.mjs   (exit 0 = all assertions passed)
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import puppeteer from '../node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import { fakeMediaInit, midiToHz, hzAtCents } from './fake-media.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail });
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  — ' + detail : ''));
}

function freePort() {
  return new Promise((res) => {
    const srv = net.createServer();
    srv.listen(0, () => { const p = srv.address().port; srv.close(() => res(p)); });
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(page, fn, { timeout = 9000, poll = 100 } = {}, ...args) {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await page.evaluate(fn, ...args);
    if (v) return v;
    if (Date.now() > end) return null;
    await sleep(poll);
  }
}
function waitForButton(page, reSource) {
  return waitFor(page, (rs) => {
    const re = new RegExp(rs, 'i');
    return [...document.querySelectorAll('button')].some((b) => b.offsetParent && re.test(b.textContent));
  }, { timeout: 10000 });
}
async function clickButtonByText(page, text) {
  if (!text) return false;
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent !== null && x.textContent.toLowerCase().includes(t.toLowerCase()));
    if (b) { b.click(); return true; }
    return false;
  }, text);
}

/**
 * Feed a tone and click the probe's capture button for intake note `n` (1..3),
 * then wait until that note is recorded (the prompt advances past "note n of 3",
 * or the probe finishes and S1 mounts). Robust against the transient
 * "Listening…"/"got it" states.
 */
async function probeCapture(page, hz, n) {
  await page.evaluate((h) => window.__sqFake.setHz(h), hz);
  // Wait for the fresh capture button for THIS note (label "Sing" or "Try again").
  await waitFor(page, (nn) => [...document.querySelectorAll('button')].some((b) =>
    b.offsetParent && /^\s*(sing|try again)\s*$/i.test(b.textContent)) &&
    new RegExp('note ' + nn + ' of 3', 'i').test(document.body.innerText), { timeout: 12000 }, n);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && /^\s*(sing|try again)\s*$/i.test(x.textContent));
    if (b) b.click();
  });
  // Recorded when the prompt LEAVES this note number (advanced to n+1 or to S1).
  await waitFor(page, (nn) => {
    if (window.__sq && window.__sq.step === 1) return true;
    return !new RegExp('note ' + nn + ' of 3', 'i').test(document.body.innerText)
      && /Find your voice — note|Found it/i.test(document.body.innerText);
  }, { timeout: 12000 }, n);
}

/**
 * Drive landing -> Start -> 3-POINT probe (low, mid, high tones) -> land on S1.
 * `tones` overrides the [low,mid,high] Hz fed for the three intake captures.
 */
async function toS1(page, tones = null) {
  const [loHz, midHz, hiHz] = tones || [midiToHz(48), midiToHz(55), midiToHz(64)];
  await page.evaluate(() => { window.__sqTest = {}; });
  await clickButtonByText(page, 'Start singing');
  await waitForButton(page, 'use microphone');
  await clickButtonByText(page, 'Use microphone');
  // Three guided captures: LOWEST -> MIDDLE -> HIGHEST.
  await probeCapture(page, loHz, 1);
  await probeCapture(page, midHz, 2);
  await probeCapture(page, hiHz, 3);
  await waitFor(page, () => window.__sq && window.__sq.step === 1, { timeout: 12000 });
  // S1: Listen -> click "Sing with me" to advance -> "My turn"/"Your turn"
  await waitForButton(page, 'sing with me');
}

/** From S1 Listen, advance through Sing-with-me to the graded "Your turn". */
async function toYourTurn(page) {
  // Listen -> Sing-with-me phase ("Sing with me" primary)
  await clickButtonByText(page, 'sing with me');
  await waitForButton(page, 'sing together');
  // Sing-with-me phase -> run the unison-guide capture; it AUTO-advances to solo.
  await clickButtonByText(page, 'sing together');
  // Wait for the graded "Sing now" (the with-me capture + auto-advance takes ~4s).
  await waitFor(page, () => [...document.querySelectorAll('button')]
    .some((b) => b.offsetParent && /sing now/i.test(b.textContent)), { timeout: 12000 });
}

async function main() {
  const port = await freePort();
  const server = spawn('python3', ['-m', 'http.server', String(port)], { cwd: ROOT, stdio: 'ignore' });
  await sleep(700);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--no-sandbox'],
  });

  try {
    const base = `http://127.0.0.1:${port}/singquest.html`;

    /* ---------- Run A: probe + S1 coarse states (matched / close / way-off) ---------- */
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 430, height: 900 });
      await page.evaluateOnNewDocument(fakeMediaInit);
      page.on('pageerror', (e) => check('no page error (Run A)', false, String(e)));
      await page.goto(base, { waitUntil: 'networkidle0' });

      // 3-point intake: LOW=C3(48), MID=G3(55), HIGH=E4(64).
      await toS1(page, [midiToHz(48), midiToHz(55), midiToHz(64)]);

      // probe result — seam now exposes the three measured MIDI values + the built range.
      const probe = await page.evaluate(() => window.__sqTest.lastProbe);
      check('probe: 3-point intake exposes low/mid/high measured MIDI + built range',
        probe && Number.isFinite(probe.lowMidi) && Number.isFinite(probe.midMidi) &&
        Number.isFinite(probe.highMidi) && probe.voice && Number.isFinite(probe.voice.tonicMidi),
        probe ? `measured lo=${probe.lowMidi} mid=${probe.midMidi} hi=${probe.highMidi} -> range [${probe.voice.lowMidi},${probe.voice.highMidi}] tonic=${probe.voice.tonicMidi}` : 'no probe');
      check('probe: built range is ordered low < tonic < high',
        probe && probe.voice.lowMidi < probe.voice.tonicMidi && probe.voice.tonicMidi < probe.voice.highMidi,
        probe ? `[${probe.voice.lowMidi} < ${probe.voice.tonicMidi} < ${probe.voice.highMidi}]` : '');
      check('probe: seam carries NO cents field (coarse only)',
        probe && !('centsOff' in probe) && !('cents' in probe));

      // S1 target must sit within the built range [low, high].
      const s1 = await page.evaluate(() => ({
        target: window.__sq.progress.voice.tonicMidi,
        low: window.__sq.progress.voice.lowMidi,
        high: window.__sq.progress.voice.highMidi,
      }));
      check('S1: target sits within the built range [low, high]',
        s1.low <= s1.target && s1.target <= s1.high, `${s1.low} <= ${s1.target} <= ${s1.high}`);
      const s1target = s1.target;

      // -- in-tune -> matched --
      await page.evaluate((hz) => window.__sqFake.setHz(hz), midiToHz(s1target));
      await toYourTurn(page);
      await page.evaluate(() => { delete window.__sqTest.lastSingRound; });
      await clickButtonByText(page, 'sing now');
      const matched = await waitFor(page, () => {
        const r = window.__sqTest.lastSingRound;
        return r && r.level === 1 && r.state ? r : null;
      }, { timeout: 16000 });
      check('S1: in-tune tone -> COARSE matched + pass', matched && matched.state === 'matched' && matched.pass,
        matched ? `state=${matched.state} pass=${matched.pass}` : 'no round');
      check('S1: matched round exposes NO cents field (coarse only)',
        matched && !('cents' in matched), matched ? `keys=${Object.keys(matched).join(',')}` : '');
      check('S1: sound-then-sing was bleed-safe (reference stopped before capture)',
        matched && matched.soundThenSing === true && matched.referenceStoppedBeforeCapture === true);
      await page.close();
    }

    /* ---------- Run B: S1 slightly-off -> 'close'; far-off -> 'way-off' + hint ---------- */
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 430, height: 900 });
      await page.evaluateOnNewDocument(fakeMediaInit);
      await page.goto(base, { waitUntil: 'networkidle0' });
      // Deliberately OCTAVE-SLIP the LOW reading: intended C3(48) is heard an
      // octave HIGH as C4(60) (the classic low/male-voice detection error). The
      // built range must STILL be sane/ordered (buildVoiceRange clamps+sorts).
      await toS1(page, [midiToHz(60), midiToHz(55), midiToHz(64)]);
      const slipped = await page.evaluate(() => ({
        low: window.__sq.progress.voice.lowMidi,
        tonic: window.__sq.progress.voice.tonicMidi,
        high: window.__sq.progress.voice.highMidi,
      }));
      check('probe: an octave-slipped LOW reading still yields a sane ordered range',
        slipped.low <= slipped.tonic && slipped.tonic <= slipped.high && (slipped.high - slipped.low) >= 5,
        `[${slipped.low} <= ${slipped.tonic} <= ${slipped.high}]`);
      const s1target = slipped.tonic;

      // slightly-off (~250¢) -> close
      await page.evaluate((hz) => window.__sqFake.setHz(hz), hzAtCents(s1target, 250));
      await toYourTurn(page);
      await page.evaluate(() => { delete window.__sqTest.lastSingRound; });
      await clickButtonByText(page, 'sing now');
      const close = await waitFor(page, () => {
        const r = window.__sqTest.lastSingRound;
        return r && r.state ? r : null;
      }, { timeout: 15000 });
      check('S1: slightly-off tone -> COARSE close', close && close.state === 'close',
        close ? `state=${close.state} dir=${close.dir}` : 'no round');

      // far-off (~550¢) -> way-off + a hint-ladder rung fired
      // (after a 'close' the button re-arms as "Try again")
      await waitForButton(page, 'try again');
      await page.evaluate((hz) => window.__sqFake.setHz(hz), hzAtCents(s1target, 550));
      await page.evaluate(() => { delete window.__sqTest.lastSingRound; });
      await clickButtonByText(page, 'try again');
      const off = await waitFor(page, () => {
        const r = window.__sqTest.lastSingRound;
        return r && r.state === 'way-off' ? r : null;
      }, { timeout: 15000 });
      check('S1: far-off tone -> COARSE way-off (not a pass)', off && off.state === 'way-off' && !off.pass,
        off ? `state=${off.state}` : 'no round');
      check('S1: a hint-ladder rung fired on the way-off (never a bare fail)',
        off && off.hintRung >= 1 && !!off.hintRungId, off ? `rung=${off.hintRung} (${off.hintRungId})` : '');

      // No digit / ¢ / needle in the visible feedback DOM at this point.
      const leak = await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('.sq-verdict, .sq-prompt, .sq-sub, .sq-field-wrap, .sq-note')];
        const txt = nodes.map((n) => n.textContent).join(' ');
        const badChars = txt.match(/[0-9¢]/g) || [];
        const hasNeedle = !!document.querySelector('.sq-needle, [class*="needle"]');
        return { badChars, hasNeedle, sample: txt.slice(0, 120) };
      });
      check('S1: NO digit/¢ character in the feedback DOM (coarse only)', leak.badChars.length === 0,
        leak.badChars.length ? `found: ${leak.badChars.join('')} in "${leak.sample}"` : 'clean');
      check('S1: NO needle/tuner element in the DOM', leak.hasNeedle === false);
      await page.close();
    }

    /* ---------- Run C: consent-denied self-check fallback reachable ---------- */
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 430, height: 900 });
      await page.evaluateOnNewDocument(fakeMediaInit);
      await page.goto(base, { waitUntil: 'networkidle0' });
      await page.evaluate(() => { window.__sqTest = {}; window.__sqFake.setDenied(true); });
      await clickButtonByText(page, 'Start singing');
      const skip = await waitForButton(page, 'skip');
      check('consent: self-check/skip button reachable at the probe gate', !!skip);
      await clickButtonByText(page, 'Skip — no mic');
      const fallbackShown = await waitFor(page, () => /Sounds good|middle range/.test(document.body.innerText), { timeout: 6000 });
      check('consent-denied fallback path renders (no mic needed)', !!fallbackShown);
      await page.close();
    }

    /* ---------- Run D: theme switch changes the skin + no emoji + 6 screenshots ---------- */
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 430, height: 900 });
      await page.evaluateOnNewDocument(fakeMediaInit);
      await page.goto(base, { waitUntil: 'networkidle0' });
      await page.evaluate((hz) => window.__sqFake.setHz(hz), midiToHz(60));

      // default theme = Studio
      const defTheme = await page.evaluate(() => document.body.className);
      check('default theme is Studio', defTheme === 'theme-studio', defTheme);

      // Marker probes: Playful uses ui-rounded font + a face buddy (::before eyes on
      // .sq-voice); Studio uses the lock-on ring with a glowing note-shadow. We test
      // via the applied CSS custom props + body class which the skin keys off.
      async function themeMarkers() {
        return page.evaluate(() => {
          const cls = document.body.className;
          const cs = getComputedStyle(document.body);
          return { cls, font: cs.getPropertyValue('--font').trim().slice(0, 24), frameRadius: cs.getPropertyValue('--frame-radius').trim() };
        });
      }

      // LANDING + S1 screenshots per theme.
      for (const theme of ['playful', 'studio', 'minimal']) {
        // set theme via the cog drawer (real user path)
        await page.reload({ waitUntil: 'networkidle0' });
        await page.evaluate((hz) => window.__sqFake.setHz(hz), midiToHz(60));
        await page.click('#cogBtn');
        await page.evaluate((t) => { document.querySelector(`#themeSeg button[data-theme="${t}"]`).click(); }, theme);
        await page.click('#drawerClose');
        await sleep(150);
        // landing shot
        await page.screenshot({ path: path.join(SHOTS, `landing-${theme}.png`) });
        // shot the 3-point probe step 1 (LOWEST note prompt) before completing it
        await page.evaluate(() => { window.__sqTest = {}; });
        await clickButtonByText(page, 'Start singing');
        await waitForButton(page, 'use microphone');
        await clickButtonByText(page, 'Use microphone');
        await waitForButton(page, '^\\s*(sing|try again)\\s*$');
        await sleep(200);
        await page.screenshot({ path: path.join(SHOTS, `probe-${theme}.png`) });
        // finish the 3 captures and shot the S1 lesson
        await probeCapture(page, midiToHz(48), 1);
        await probeCapture(page, midiToHz(55), 2);
        await probeCapture(page, midiToHz(64), 3);
        await waitFor(page, () => window.__sq && window.__sq.step === 1, { timeout: 12000 });
        await waitForButton(page, 'sing with me');
        await sleep(250);
        await page.screenshot({ path: path.join(SHOTS, `s1-${theme}.png`) });
      }

      // Assert the theme is actually applied (skin marker) for Playful and Studio.
      await page.reload({ waitUntil: 'networkidle0' });
      await page.click('#cogBtn');
      await page.evaluate(() => document.querySelector('#themeSeg button[data-theme="playful"]').click());
      await page.click('#drawerClose');
      const playful = await themeMarkers();
      check('theme switch -> Playful skin marker (rounded font applied)',
        playful.cls === 'theme-playful' && /rounded|Nunito/i.test(playful.font), JSON.stringify(playful));

      await page.click('#cogBtn');
      await page.evaluate(() => document.querySelector('#themeSeg button[data-theme="studio"]').click());
      await page.click('#drawerClose');
      const studio = await themeMarkers();
      check('theme switch -> Studio skin marker (Inter font applied, not rounded)',
        studio.cls === 'theme-studio' && /Inter/i.test(studio.font) && !/rounded/i.test(studio.font), JSON.stringify(studio));

      // Theme persists across reload.
      await page.reload({ waitUntil: 'networkidle0' });
      const persisted = await page.evaluate(() => document.body.className);
      check('theme choice persists across reload (localStorage)', persisted === 'theme-studio', persisted);

      // No emoji anywhere in the DOM.
      const emojiHits = await page.evaluate(() => {
        const re = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2705}]/u;
        const bad = [];
        const walk = (node) => {
          if (node.nodeType === 3) { for (const ch of node.textContent) if (re.test(ch)) bad.push(ch); }
          else node.childNodes.forEach(walk);
        };
        walk(document.body);
        return bad;
      });
      check('no emoji/arrow-glyph in the DOM (SVG icons only)', emojiHits.length === 0,
        emojiHits.length ? `found: ${emojiHits.join(' ')}` : 'clean');
      await page.close();
    }

    /* ---------- Run E: dev level-skip (?dev=1) bypasses the intake ---------- */
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 430, height: 900 });
      await page.evaluateOnNewDocument(fakeMediaInit);

      // Without ?dev=1 the dev bar must NOT exist.
      await page.goto(base, { waitUntil: 'networkidle0' });
      const noBar = await page.evaluate(() => !document.getElementById('devBar'));
      check('dev: no dev bar without ?dev=1', noBar);

      // With ?dev=1 the bar exists and lists every FLOW entry.
      await page.goto(base + '?dev=1', { waitUntil: 'networkidle0' });
      const barInfo = await page.evaluate(() => {
        const bar = document.getElementById('devBar');
        return {
          present: !!bar,
          labels: bar ? [...bar.querySelectorAll('button')].map((b) => b.textContent) : [],
          flow: window.__sqDev ? window.__sqDev.flow.slice() : null,
        };
      });
      check('dev: ?dev=1 renders a dev bar with one button per FLOW entry',
        barInfo.present && barInfo.flow && barInfo.labels.length === barInfo.flow.length &&
        barInfo.flow.every((id) => barInfo.labels.includes(id)),
        `labels=[${barInfo.labels.join(',')}] flow=[${(barInfo.flow || []).join(',')}]`);

      // Programmatic jump straight to S1 bypasses the probe; voice is seeded.
      const jumped = await page.evaluate(() => {
        const ok = window.__sqDev.jump('s1');
        return {
          ok, step: window.__sq.step,
          voiceOk: Number.isFinite(window.__sq.progress.voice.tonicMidi),
        };
      });
      // The S1 lesson mounts with no probe run — either its consent gate (mic
      // ask) or, past it, the Listen/"Sing with me" step appears.
      const s1Mounted = await waitFor(page, () => {
        const t = document.body.innerText;
        return /Ready to sing|Sing with me|Listen to the note|Match one note/i.test(t);
      }, { timeout: 8000 });
      check('dev: jump("s1") bypasses the intake and mounts S1 with a seeded voice',
        jumped.ok && jumped.step === 1 && jumped.voiceOk && !!s1Mounted,
        `ok=${jumped.ok} step=${jumped.step} voiceOk=${jumped.voiceOk} mounted=${!!s1Mounted}`);

      // No emoji leaked by the dev bar.
      const devEmoji = await page.evaluate(() => {
        const re = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{2705}]/u;
        return [...(document.getElementById('devBar')?.textContent || '')].filter((c) => re.test(c));
      });
      check('dev: dev bar carries no emoji', devEmoji.length === 0);
      await page.close();
    }

    const failed = results.filter((r) => !r.pass);
    console.log('\n' + (results.length - failed.length) + '/' + results.length + ' assertions passed.');
    console.log('screenshots -> ' + SHOTS);
    process.exitCode = failed.length ? 1 : 0;
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
