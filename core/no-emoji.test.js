/**
 * @file core/no-emoji.test.js
 * ENFORCES the no-emoji-in-UI rule (a standing spec + memory): the product uses
 * currentColor inline SVG icons ONLY — never emoji or icon/arrow GLYPH characters
 * in the shipped UI source. This guard exists because the rule was documented yet
 * violated (✓ ▶ ● ↑ ↓ arrows crept into UI code); now it fails CI instead.
 *
 * Scope: the app-layer UI files. Combining marks used for MUSIC notation (the
 * scale-degree caret ◌̂ U+0302) and plain typographic separators (·, curly quotes)
 * are allowed; the banned set is emoji + icon/arrow glyphs that should be SVG.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize, posix } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// STRICT: no emoji AND no icon/arrow/geometric glyphs. These files render UI and their comments
// were written to this standard.
const UI_FILES = [
  'melodic-game.html',
  'melodic-renderers.js',
  'melodic-gym.js',
  'melodic-round.js',
  'melodic-chunks-ui.js',
  'melodic-bookend-ui.js',
  'melodic-shell-services.js',
  'melodic-teach-content.js',
  'melodic-skills-gym.js',
  'melodic-ear-arcade.js',
  'melodic-instruments.js',
  'core-bridge.js',
  'singquest.html',
  'singquest-renderers.js',
  'index.html',
  'home.html',
  'beatquest.html',
  'tapping.html',
  'suite-theme.js',
  'rhythm-vexflow-renderer.js',
  'suite-theme.css',                 // CSS `content:` can render a glyph
  'rhythm-assets/rhythm-assets.js',  // its `name` values render as image alt text
  // The ONE shared rhythm-notation renderer + its answer board, and TapQuest's bridge to it.
  // renderer.js: loaded by rhythmquest/tapping/casual + both demos. answer-board.js/css: tapping.html
  // (perform board) + answer-board-demo.html. tapquest-perform-board.css: tapping.html. renderer.css:
  // only rhythm-notation-demo.html. Strict — notation is SVG, no glyph/emoji characters belong here.
  'shared/rhythm-notation/renderer.js',
  'shared/rhythm-notation/renderer.css',
  'shared/rhythm-notation/answer-board.js',
  'shared/rhythm-notation/answer-board.css',
  'tapquest-perform-board.css',
];

// EMOJI-ONLY. Bans emoji; does NOT ban arrow/geometric glyphs. A real hole, here on purpose:
//   - prose comments:      `→ ↔ ◀ ▶ ◎` in solo-mode.js, rhythm-student.js, beatquest-casual.html
//   - a level TITLE:       teach-content.js "Simple ↔ compound: division constant"
//   - RENDERED as TEXT:    beatquest-casual.html "Continue →", "Start Free Play →";
//                          solo-mode.js "Level passed! → Ch 5", "Got it → Start"
// Those last are typography inside a sentence, not icons, and an SVG there would be absurd.
// What was replaced with in-house SVG (2026-07-10) is every glyph used AS AN ICON: the ▲▼ chevrons
// in game-runner, ▶ and ✦ in game-invaders, the ▾ caret and selection ✓ in beatquest-casual, and the
// ◀▶ dev jumper in solo-mode. The test cannot tell an icon from typography, or a comment from
// markup. A reviewer must. Do not add a glyph ICON to a file on this list.
//
// This tier exists because the STRICT whitelist silently excluded shipped pages that each had 🥁 in
// an <h1>, and the guard reported success anyway. A whitelist that omits the offenders is worse than
// no guard: it certifies a rule it never checked. Add every page you ship to one of these lists.
const UI_FILES_EMOJI_ONLY = [
  // core/ modules reachable from a page. NOT exempt: `core/melodic-curriculum.js`'s level `title`
  // is rendered at melodic-game.html:1218, so an emoji there reaches a student. They carry prose
  // arrows (→ ⇒ ↔ ←) in comments, which is why they are here and not in STRICT.
  'core/chunks.js', 'core/curriculum.js', 'core/feedback.js', 'core/grading.js', 'core/gym.js',
  'core/ladder.js', 'core/mastery.js', 'core/melodic-curriculum.js', 'core/melodic-quality.js',
  'core/melodic-recipes.js', 'core/melodic.js', 'core/pitch.js', 'core/protonotation.js',
  'core/review.js', 'core/rhythm-figures.js', 'core/singquest.js',

  'solo-mode.js',
  'rhythm-student.js',
  'teach-content.js',
  'beatquest-casual.html',
  'game-simon.html',
  'game-runner.html',
  'game-jump.html',
  'game-invaders.html',
];

// Banned code points: emoji blocks + icon/arrow/geometric glyphs that must be SVG.
// (NOT banned: U+0302 degree caret; U+00B7 middle-dot separator; curly quotes.)
// U+2669–U+266F (♩ ♪ ♫ ♬ ♭ ♮ ♯) are MUSIC NOTATION and are allowed by BOTH tiers. The 0x2600 range
// is therefore split around them. An earlier version banned the whole block while its own comment
// claimed the music glyphs were always allowed; Codex caught the contradiction.
const BANNED = [
  [0x2190, 0x21FF], // arrows (→ ↑ ↓ ↔ …)
  [0x2300, 0x23FF], // misc technical (⏸ ⏰ …)
  [0x25A0, 0x25FF], // geometric shapes (● ○ ▶ ■ …)
  [0x2600, 0x2668], // misc symbols (☀ ★-ish, ♥ …) — stops before ♩
  [0x2670, 0x26FF], // resumes after ♯ (⚑ ⚠ …)
  [0x2700, 0x27BF], // dingbats (✓ ✔ ✗ ✂ ✦ ✨ …)
  [0x2B00, 0x2BFF], // arrows/stars (⭐ ★ ⬆ …)
  [0x2039, 0x203A], // ‹ ›
  [0x1F000, 0x1FAFF], // emoji
  [0xFE0F, 0xFE0F],   // VARIATION SELECTOR-16: what makes ©️ ▶️ 1️⃣ render as emoji
  [0x20E3, 0x20E3],   // COMBINING ENCLOSING KEYCAP: the ⃣ in 1️⃣
];
function isBanned(cp) { return BANNED.some(([lo, hi]) => cp >= lo && cp <= hi); }

// Everything BANNED bans, MINUS the two ranges these files legitimately use in prose and titles:
// arrows (U+2190–U+21FF: → ↔) and geometric shapes (U+25A0–U+25FF: ◀ ▶ ◎). An earlier version
// enumerated a handful of emoji by hand and missed ✨ (U+2728) — a deny-list of specific characters
// is a deny-list you will keep patching. Derive it from BANNED instead.
const EMOJI_ALLOWED_RANGES = [[0x2190, 0x21FF], [0x25A0, 0x25FF]];
function isEmoji(cp) {
  if (EMOJI_ALLOWED_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)) return false;
  return isBanned(cp);
}

function scan(files, predicate) {
  const offenders = [];
  for (const rel of files) {
    const lines = readFileSync(join(ROOT, rel), 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const ch of line) {
        const cp = ch.codePointAt(0);
        if (predicate(cp)) {
          offenders.push(`${rel}:${i + 1}  U+${cp.toString(16).toUpperCase()} ${JSON.stringify(ch)}  in: ${line.trim().slice(0, 80)}`);
        }
      }
    });
  }
  return offenders;
}

test('no-emoji: no icon/emoji GLYPH characters in the shipped UI source (SVG only)', () => {
  const offenders = scan(UI_FILES, isBanned);
  assert.equal(offenders.length, 0,
    'Found emoji/icon glyphs in UI source — use services.icon()/gameIcon() SVG instead:\n' + offenders.join('\n'));
});

test('no-emoji: no emoji in the classroom and rhythm pages (music glyphs and prose arrows allowed)', () => {
  const offenders = scan(UI_FILES_EMOJI_ONLY, isEmoji);
  assert.equal(offenders.length, 0,
    'Found emoji in shipped UI — use an in-house SVG icon instead:\n' + offenders.join('\n'));
});

// ---------------------------------------------------------------------------------------------
// COVERAGE. The original guard's whitelist named eight files and excluded every offender, so it
// passed while four shipped pages carried a drum emoji in an <h1>. Naming files by hand is the bug.
// This test re-derives the shipped UI surface from the entry points and fails if anything it finds
// is in neither list.
//
// IT IS A STATIC CRAWLER, NOT A LOADER. It sees `src=`/`href=` attributes, static `import … from`,
// and melodic-game.html's `ARCADE_GAMES` `file:` literals, and resolves each relative to its
// importer, falling back to the repo root. It does NOT see a dynamic `import()`, a src assembled at
// runtime, or a bare package specifier. A page reached only by one of those is unaccounted for.
//
// What it DOES guarantee: every reference it can see either resolves to a file it scanned, or the
// test fails; and every file it scans is in one of the two lists or in NOT_UI with a reason. There
// is no blanket exemption — `core/` modules are covered too, because `core/melodic-curriculum.js`'s
// level titles are rendered to students. It catches the mistake that actually happened, someone
// adds a page and forgets the list. It does not catch a page hidden behind a dynamic import.
const ENTRY_POINTS = [
  'index.html', 'home.html', 'beatquest.html', 'beatquest-casual.html',
  'tapping.html', 'melodic-game.html', 'singquest.html',
];
// Files with no UI text of their own. Data, vendor code, and the arcade drawer's iframe hosts are
// covered explicitly in the lists above; these carry no glyphs a designer would ever type.
// NOT_UI IS AN EXEMPTION. It is small, explicit, and each entry states why — but it is the same
// mechanism that hid four drum emoji, so keep it that way. `suite-theme.css` was in here and should
// not have been: CSS `content:` renders text.
const NOT_UI = new Set([
  'vendor/vexflow.js',                          // third-party bundle, not ours to edit
  'rhythm-assets/glyphs/note-glyphs.js',        // generated SVG path data, no text
  'rhythm-assets/compound/compound-assets.js',  // generated filename map, no text
  // The redesign RhythmQuest game, imported verbatim 2026-07-11 and wired as the RhythmQuest entry.
  // This is NOT a "no UI text" exemption: it DOES carry UI text and glyph-icons and violates rule 11
  // today. It is a DELIBERATE, TEMPORARY hold (owner-directed) — the glyph/emoji cleanup is a tracked
  // follow-up before the redesign is held to rule 11. Remove these three once that cleanup lands.
  'rhythmquest.html',
  'quest-redesign.js',
  'quest-redesign.css',
]);

function reachable() {
  const seen = new Set(), unresolved = [], queue = [...ENTRY_POINTS];
  while (queue.length) {
    const rel = queue.pop();
    if (seen.has(rel)) continue;
    let text;
    try {
      text = readFileSync(join(ROOT, rel), 'utf8');
    } catch {
      // A reference we cannot read is a file we cannot scan. Swallowing it was the bug: it made the
      // coverage claim vacuous, because a misresolved path simply vanished from `seen`.
      unresolved.push(rel);
      continue;
    }
    seen.add(rel);
    const refs = [
      ...text.matchAll(/(?:src|href)="([^"#?]+)[^"]*"/g),
      ...text.matchAll(/(?:src|href)='([^'#?]+)[^']*'/g),
      ...text.matchAll(/from\s+['"]([^'"]+)['"]/g),
      ...text.matchAll(/file:\s*['"]([^'"]+\.html)['"]/g),   // melodic-game.html's ARCADE_GAMES
    ].map((m) => m[1].split('?')[0]);
    for (const r of refs) {
      if (/^https?:/.test(r)) continue;
      if (!/\.(js|html|css)$/.test(r)) continue;
      // Resolve relative to the IMPORTER first, then the repo root. `core/melodic.js` imports
      // './pitch.js', which is core/pitch.js — resolving that from the root silently lost it. And a
      // bare `src="sibling.js"` inside a nested page is ALSO importer-relative, not root-relative.
      const local = posix.normalize(posix.join(posix.dirname(rel), r));
      queue.push(existsSync(join(ROOT, local)) ? local : r);
    }
  }
  return { seen: [...seen], unresolved: [...new Set(unresolved)] };
}

test('no-emoji: every shipped UI file is covered by one of the two lists', () => {
  const covered = new Set([...UI_FILES, ...UI_FILES_EMOJI_ONLY]);
  const { seen, unresolved } = reachable();

  assert.deepEqual(unresolved, [],
    'The crawler found references it could not read. Each is a file it therefore never scanned,\n' +
    'which would make this test pass vacuously. Fix the path, or the reference:\n  ' +
    unresolved.join('\n  '));

  const uncovered = seen.filter((f) => !NOT_UI.has(f) && !covered.has(f));
  assert.deepEqual(uncovered, [],
    'Shipped UI files scanned by neither list — add them to UI_FILES (strict) or\n' +
    'UI_FILES_EMOJI_ONLY (if they carry prose arrows), or to NOT_UI with a reason:\n  ' +
    uncovered.join('\n  '));
});
