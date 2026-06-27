/* Generate compound-meter (dotted-quarter beat) rhythm figures as SVG.
   One tile = one way to fill a 6/8 beat (3 eighth-pulses / 6 sixteenth-units).
   Beaming is COMPOUND: consecutive 8th/16th notes in the beat beam as one group;
   quarters and rests break the beam.
   Uses VexFlow 4.2.2 from CDN (renders glyphs as PATHS, like the existing
   simple-meter assets — v5 in node_modules renders <text> which won't display
   as an <img> without the Bravura webfont). */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const n = (duration, opts = {}) => ({ duration, dot: opts.dot || 0, rest: opts.rest || 0 });
const FIGURES = [
  // Tier 1 — eighth/quarter level (Hall Ch 5)
  { id: 'cd-dotted-quarter',      seq: [n('q', { dot: 1 })] },
  { id: 'cd-three-eighths',       seq: [n('8'), n('8'), n('8')] },
  { id: 'cd-quarter-eighth',      seq: [n('q'), n('8')] },
  { id: 'cd-eighth-quarter',      seq: [n('8'), n('q')] },
  // Tier 2 — rests (Ch 5/10)
  { id: 'cd-dotted-quarter-rest', seq: [n('q', { dot: 1, rest: 1 })] },
  { id: 'cd-8rest-8-8',           seq: [n('8', { rest: 1 }), n('8'), n('8')] },
  { id: 'cd-8-8rest-8',           seq: [n('8'), n('8', { rest: 1 }), n('8')] },
  { id: 'cd-8-8-8rest',           seq: [n('8'), n('8'), n('8', { rest: 1 })] },
  { id: 'cd-quarter-8rest',       seq: [n('q'), n('8', { rest: 1 })] },
  { id: 'cd-8rest-quarter',       seq: [n('8', { rest: 1 }), n('q')] },
  // Tier 3 — sixteenths in 6/8 (Ch 8)
  { id: 'cd-six-sixteenths',      seq: [n('16'), n('16'), n('16'), n('16'), n('16'), n('16')] },
  { id: 'cd-two16-8-8',           seq: [n('16'), n('16'), n('8'), n('8')] },
  { id: 'cd-8-two16-8',           seq: [n('8'), n('16'), n('16'), n('8')] },
  { id: 'cd-8-8-two16',           seq: [n('8'), n('8'), n('16'), n('16')] },
  { id: 'cd-four16-8',            seq: [n('16'), n('16'), n('16'), n('16'), n('8')] },
  { id: 'cd-8-four16',            seq: [n('8'), n('16'), n('16'), n('16'), n('16')] },
  { id: 'cd-quarter-two16',       seq: [n('q'), n('16'), n('16')] },
  { id: 'cd-two16-quarter',       seq: [n('16'), n('16'), n('q')] },
];

const dom = new JSDOM(`<!DOCTYPE html><html><head>
<script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.2/build/cjs/vexflow.js"></script>
</head><body></body></html>`, { runScripts: 'dangerously', resources: 'usable' });

dom.window.addEventListener('load', () => setTimeout(run, 1200));

function run() {
  const { window } = dom;
  const VF = window.Vex && window.Vex.Flow;
  if (!VF) { console.error('VexFlow 4 failed to load from CDN'); process.exit(1); }
  const { document } = window;
  const STEM_DOWN = VF.StaveNote.STEM_DOWN;
  const beamable = d => d === '8' || d === '16';
  const assetsDir = path.join(__dirname, 'rhythm-assets', 'compound');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
  const width = 240, height = 120;
  let ok = 0; const manifest = {};

  FIGURES.forEach(fig => {
    try {
      const container = document.createElement('div'); document.body.appendChild(container);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', width); svg.setAttribute('height', height);
      container.appendChild(svg);
      const renderer = new VF.Renderer(svg, VF.Renderer.Backends.SVG);
      renderer.resize(width, height);
      const ctx = renderer.getContext();
      ctx.scale(Math.min(1, height / 80), Math.min(1, height / 80));
      const stave = new VF.Stave(5, 5, width - 10); stave.setContext(ctx);

      const notes = fig.seq.map(s => {
        const note = new VF.StaveNote({ clef: 'percussion', keys: ['b/4'], duration: s.duration + (s.rest ? 'r' : '') });
        if (s.dot) note.addModifier(new VF.Dot(), 0);
        if (!s.rest) note.setStemDirection(STEM_DOWN);
        return note;
      });

      const beams = []; let runArr = [];
      const flush = () => { if (runArr.length >= 2) beams.push(new VF.Beam(runArr)); runArr = []; };
      fig.seq.forEach((s, i) => { if (beamable(s.duration) && !s.rest) runArr.push(notes[i]); else flush(); });
      flush();

      VF.Formatter.FormatAndDraw(ctx, stave, notes);
      beams.forEach(b => b.setContext(ctx).draw());

      const inner = svg.innerHTML.replace(/<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      const clean = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="120" viewBox="0 0 ${width} 120">
<style>path[fill="none"]{stroke:#000;}</style>
${inner}
</svg>`;
      fs.writeFileSync(path.join(assetsDir, fig.id + '.svg'), clean);
      manifest[fig.id] = { file: fig.id + '.svg', beats: 1, beatUnit: 'dotted-quarter' };
      ok++;
    } catch (e) { console.error('FAIL', fig.id, e.message); }
  });

  fs.writeFileSync(path.join(assetsDir, 'compound-assets.js'),
    'export const compoundAssets = ' + JSON.stringify(manifest, null, 2) + ';\n');
  console.log(`generated ${ok}/${FIGURES.length} compound SVGs -> rhythm-assets/compound/`);
  process.exit(0);
}
