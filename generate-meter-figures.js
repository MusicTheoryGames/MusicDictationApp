/* Generate three additional rhythm-figure image batches, mirroring the proven
   compound-meter pipeline (see generate-compound-assets.js).

   Each batch = "the ways to fill ONE beat of that unit":
     1) hb- : HALF-NOTE beat   (2/2, 3/2 ; simple, divides in 2)
     2) dh- : DOTTED-HALF beat  (6/4 compound ; divides in 3)
     3) de- : DOTTED-EIGHTH beat(6/16 compound ; divides in 3 ; uses 32nds)

   Pipeline (mirrors generate-compound-assets.js exactly):
     - VexFlow 4.2.2 from the CDN inside jsdom (runScripts:'dangerously',
       structuredClone polyfill, ~1.2s wait, window.Vex.Flow). v4.2.2 renders
       <path> glyphs which display correctly as <img>; v5 in node_modules
       renders <text> which shows empty boxes.
     - Build VF.StaveNote (clef 'percussion', keys ['b/4'], duration), add
       VF.Dot for dotted notes, STEM_DOWN for non-rests, beam maximal runs of
       consecutive beamable non-rest notes, FormatAndDraw, draw beams, extract
       svg.innerHTML, wrap in a clean SVG with the path-stroke style. Write SVG.
     - Then rasterize each SVG -> transparent PNG via puppeteer (omitBackground,
       deviceScaleFactor 3), trim+center into the bank with ImageMagick.

   Onsets are computed later by code from the vexflow[] duration array in the
   per-batch manifest; this script only produces correct NOTATION. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { execFileSync } = require('child_process');

const n = (duration, opts = {}) => ({ duration, dot: opts.dot || 0, rest: opts.rest || 0 });

// ------------------------------------------------------------------ BATCH 1
// HALF-NOTE beat (simple, divides in 2). The quarter-beat simple vocabulary
// shifted ONE note value UP: quarter->half, eighth->quarter, sixteenth->eighth,
// 32nd->sixteenth. Eighths beam in 4 per beat; sixteenths group under the beat.
const HALFBEAT = {
  dir: 'halfbeat',
  beatUnit: 'half',
  figures: [
    // Tier 1 — whole beat + simple divisions in 2 (quarter level)
    { id: 'hb-half',            seq: [n('h')] },
    { id: 'hb-two-quarters',    seq: [n('q'), n('q')] },
    { id: 'hb-quarter-two8',    seq: [n('q'), n('8'), n('8')] },
    { id: 'hb-two8-quarter',    seq: [n('8'), n('8'), n('q')] },
    { id: 'hb-four-eighths',    seq: [n('8'), n('8'), n('8'), n('8')] },
    // Tier 2 — rests at the quarter level (half rest = whole beat rest)
    { id: 'hb-half-rest',       seq: [n('h', { rest: 1 })] },
    { id: 'hb-quarter-qrest',   seq: [n('q'), n('q', { rest: 1 })] },
    { id: 'hb-qrest-quarter',   seq: [n('q', { rest: 1 }), n('q')] },
    { id: 'hb-8rest-8-quarter', seq: [n('8', { rest: 1 }), n('8'), n('q')] },
    { id: 'hb-quarter-8rest-8', seq: [n('q'), n('8', { rest: 1 }), n('8')] },
    // Tier 3 — sixteenths (the finer subdivision = eighths in this beat)
    { id: 'hb-eight-16ths',     seq: [n('16'), n('16'), n('16'), n('16'), n('16'), n('16'), n('16'), n('16')] },
    { id: 'hb-two16-q',         seq: [n('16'), n('16'), n('q')] },
    { id: 'hb-q-two16',         seq: [n('q'), n('16'), n('16')] },
    { id: 'hb-two8-four16',     seq: [n('8'), n('8'), n('16'), n('16'), n('16'), n('16')] },
    { id: 'hb-four16-two8',     seq: [n('16'), n('16'), n('16'), n('16'), n('8'), n('8')] },
    { id: 'hb-8-two16-8',       seq: [n('8'), n('16'), n('16'), n('8')] },
    { id: 'hb-two16-8-8',       seq: [n('16'), n('16'), n('8'), n('8')] },
    { id: 'hb-8-8-two16',       seq: [n('8'), n('8'), n('16'), n('16')] },
  ],
};

// ------------------------------------------------------------------ BATCH 2
// DOTTED-HALF beat (compound, divides in 3). 6/8 set shifted ONE value UP:
// 8th->quarter, 16th->8th, dotted-quarter->dotted-half. COMPOUND beaming:
// only eighths beam (the 3-group); quarters and rests break the beam.
const DOTTEDHALF = {
  dir: 'dottedhalf',
  beatUnit: 'dotted-half',
  figures: [
    // Tier 1 — quarter/half level (mirror of Hall Ch 5)
    { id: 'dh-dotted-half',    seq: [n('h', { dot: 1 })] },
    { id: 'dh-three-quarters', seq: [n('q'), n('q'), n('q')] },
    { id: 'dh-half-quarter',   seq: [n('h'), n('q')] },
    { id: 'dh-quarter-half',   seq: [n('q'), n('h')] },
    // duplet — TWO quarters borrowed into the dotted-half beat (bracketed "2")
    { id: 'dh-duplet',         seq: [n('q'), n('q')], tuplet: { num_notes: 2, notes_occupied: 3 } },
    // Tier 2 — rests
    { id: 'dh-dotted-half-rest', seq: [n('h', { dot: 1, rest: 1 })] },
    { id: 'dh-qrest-q-q',      seq: [n('q', { rest: 1 }), n('q'), n('q')] },
    { id: 'dh-q-qrest-q',      seq: [n('q'), n('q', { rest: 1 }), n('q')] },
    { id: 'dh-q-q-qrest',      seq: [n('q'), n('q'), n('q', { rest: 1 })] },
    { id: 'dh-half-qrest',     seq: [n('h'), n('q', { rest: 1 })] },
    { id: 'dh-qrest-half',     seq: [n('q', { rest: 1 }), n('h')] },
    // Tier 3 — eighths in the compound beat (mirror of Ch 8 sixteenths)
    { id: 'dh-six-eighths',    seq: [n('8'), n('8'), n('8'), n('8'), n('8'), n('8')] },
    { id: 'dh-two8-q-q',       seq: [n('8'), n('8'), n('q'), n('q')] },
    { id: 'dh-q-two8-q',       seq: [n('q'), n('8'), n('8'), n('q')] },
    { id: 'dh-q-q-two8',       seq: [n('q'), n('q'), n('8'), n('8')] },
    { id: 'dh-four8-q',        seq: [n('8'), n('8'), n('8'), n('8'), n('q')] },
    { id: 'dh-q-four8',        seq: [n('q'), n('8'), n('8'), n('8'), n('8')] },
    { id: 'dh-half-two8',      seq: [n('h'), n('8'), n('8')] },
    { id: 'dh-two8-half',      seq: [n('8'), n('8'), n('h')] },
  ],
};

// ------------------------------------------------------------------ BATCH 3
// DOTTED-EIGHTH beat (compound, divides in 3). 6/8 set shifted ONE value DOWN:
// 8th->16th, 16th->32nd, dotted-quarter->dotted-eighth. 16ths/32nds beam in the
// 3-group; quarters... here the "quarter" of the 6/8 set maps to eighth.
const DOTTED16 = {
  dir: 'dotted16',
  beatUnit: 'dotted-eighth',
  figures: [
    // Tier 1 — 16th/8th level
    { id: 'de-dotted-eighth',  seq: [n('8', { dot: 1 })] },
    { id: 'de-three-16ths',    seq: [n('16'), n('16'), n('16')] },
    { id: 'de-eighth-16th',    seq: [n('8'), n('16')] },
    { id: 'de-16th-eighth',    seq: [n('16'), n('8')] },
    // duplet — TWO sixteenths borrowed into the dotted-eighth beat (bracketed "2")
    { id: 'de-duplet',         seq: [n('16'), n('16')], tuplet: { num_notes: 2, notes_occupied: 3 } },
    // Tier 2 — rests
    { id: 'de-dotted-eighth-rest', seq: [n('8', { dot: 1, rest: 1 })] },
    { id: 'de-16rest-16-16',   seq: [n('16', { rest: 1 }), n('16'), n('16')] },
    { id: 'de-16-16rest-16',   seq: [n('16'), n('16', { rest: 1 }), n('16')] },
    { id: 'de-16-16-16rest',   seq: [n('16'), n('16'), n('16', { rest: 1 })] },
    { id: 'de-eighth-16rest',  seq: [n('8'), n('16', { rest: 1 })] },
    { id: 'de-16rest-eighth',  seq: [n('16', { rest: 1 }), n('8')] },
    // Tier 3 — 32nds in the compound beat
    { id: 'de-six-32nds',      seq: [n('32'), n('32'), n('32'), n('32'), n('32'), n('32')] },
    { id: 'de-two32-16-16',    seq: [n('32'), n('32'), n('16'), n('16')] },
    { id: 'de-16-two32-16',    seq: [n('16'), n('32'), n('32'), n('16')] },
    { id: 'de-16-16-two32',    seq: [n('16'), n('16'), n('32'), n('32')] },
    { id: 'de-four32-16',      seq: [n('32'), n('32'), n('32'), n('32'), n('16')] },
    { id: 'de-16-four32',      seq: [n('16'), n('32'), n('32'), n('32'), n('32')] },
    { id: 'de-eighth-two32',   seq: [n('8'), n('32'), n('32')] },
    { id: 'de-two32-eighth',   seq: [n('32'), n('32'), n('8')] },
  ],
};

const BATCHES = [HALFBEAT, DOTTEDHALF, DOTTED16];

const dom = new JSDOM(`<!DOCTYPE html><html><head>
<script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.2/build/cjs/vexflow.js"></script>
</head><body></body></html>`, {
  runScripts: 'dangerously',
  resources: 'usable',
  beforeParse(window) {
    if (!window.structuredClone) {
      window.structuredClone = (v) => JSON.parse(JSON.stringify(v));
    }
  },
});

dom.window.addEventListener('load', () => setTimeout(run, 1200));

function run() {
  try {
    const { window } = dom;
    const VF = window.Vex && window.Vex.Flow;
    if (!VF) { console.error('VexFlow 4 failed to load from CDN'); process.exit(1); }
    const { document } = window;
    const STEM_DOWN = VF.StaveNote.STEM_DOWN;
    const beamable = d => d === '8' || d === '16' || d === '32';
    const width = 240, height = 120;

    BATCHES.forEach(batch => {
      const assetsDir = path.join(__dirname, 'rhythm-assets', batch.dir);
      if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
      let ok = 0; const manifest = {};

      batch.figures.forEach(fig => {
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

          let tuplet = null;
          if (fig.tuplet) {
            tuplet = new VF.Tuplet(notes, { num_notes: fig.tuplet.num_notes, notes_occupied: fig.tuplet.notes_occupied, bracketed: true, location: 1, y_offset: 12 });
          }

          VF.Formatter.FormatAndDraw(ctx, stave, notes);
          beams.forEach(b => b.setContext(ctx).draw());
          if (tuplet) tuplet.setContext(ctx).draw();

          const inner = svg.innerHTML.replace(/<svg[^>]*>/, '').replace(/<\/svg>$/, '');
          const clean = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="120" viewBox="0 0 ${width} 120">
<style>path[fill="none"]{stroke:#000;}</style>
${inner}
</svg>`;
          fs.writeFileSync(path.join(assetsDir, fig.id + '.svg'), clean);
          manifest[fig.id] = {
            file: fig.id + '.svg',
            beats: 1,
            beatUnit: batch.beatUnit,
            vexflow: fig.seq.map(s => {
              const v = { duration: s.duration };
              if (s.dot) v.dot = s.dot;
              if (s.rest) v.rest = s.rest;
              return v;
            }),
            ...(fig.tuplet ? { tuplet: { num_notes: fig.tuplet.num_notes, notes_occupied: fig.tuplet.notes_occupied } } : {}),
          };
          ok++;
        } catch (e) { console.error('FAIL', fig.id, e.message); }
      });

      const exportName = batch.dir.replace(/[^a-zA-Z0-9]/g, '') + 'Assets';
      fs.writeFileSync(path.join(assetsDir, batch.dir + '-assets.js'),
        'export const ' + exportName + ' = ' + JSON.stringify(manifest, null, 2) + ';\n');
      console.log(`generated ${ok}/${batch.figures.length} SVGs -> rhythm-assets/${batch.dir}/`);
    });

    console.log('SVG generation done.');
    process.exit(0);
  } catch (e) {
    console.error('RUN ERROR', e);
    process.exit(1);
  }
}
