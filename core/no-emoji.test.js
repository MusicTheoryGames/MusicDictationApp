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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const UI_FILES = [
  'melodic-game.html',
  'melodic-renderers.js',
  'melodic-gym.js',
  'melodic-chunks-ui.js',
  'melodic-bookend-ui.js',
  'melodic-shell-services.js',
  'singquest.html',
  'singquest-renderers.js',
];

// Banned code points: emoji blocks + icon/arrow/geometric glyphs that must be SVG.
// (NOT banned: U+0302 degree caret; U+00B7 middle-dot separator; curly quotes.)
const BANNED = [
  [0x2190, 0x21FF], // arrows (→ ↑ ↓ ↔ …)
  [0x2300, 0x23FF], // misc technical (▶ playback etc. live here as U+23F5, plus ⏸)
  [0x25A0, 0x25FF], // geometric shapes (● ○ ▶ ■ …)
  [0x2600, 0x26FF], // misc symbols (☀ ★-ish, ⚑ …)
  [0x2700, 0x27BF], // dingbats (✓ ✔ ✗ ✂ …)
  [0x2B00, 0x2BFF], // arrows/stars (⭐ ★ ⬆ …)
  [0x2039, 0x203A], // ‹ ›
  [0x25B6, 0x25C0], // ▶ ◀ (also in 25A0 block, explicit)
  [0x1F000, 0x1FAFF], // emoji
  [0x2705, 0x2705], // ✅
];
function isBanned(cp) { return BANNED.some(([lo, hi]) => cp >= lo && cp <= hi); }

test('no-emoji: no icon/emoji GLYPH characters in the shipped UI source (SVG only)', () => {
  const offenders = [];
  for (const rel of UI_FILES) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      for (const ch of line) {
        const cp = ch.codePointAt(0);
        if (isBanned(cp)) {
          offenders.push(`${rel}:${i + 1}  U+${cp.toString(16).toUpperCase()} ${JSON.stringify(ch)}  in: ${line.trim().slice(0, 80)}`);
        }
      }
    });
  }
  assert.equal(offenders.length, 0,
    'Found emoji/icon glyphs in UI source — use services.icon()/gameIcon() SVG instead:\n' + offenders.join('\n'));
});
