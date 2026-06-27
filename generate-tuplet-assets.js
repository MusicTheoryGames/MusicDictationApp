/* Generate SIMPLE-meter TUPLET rhythm figures as assets.
   Each tile = one way to fill ONE quarter-note BEAT with an equal-note tuplet:
     tpl-triplet    — 3 equal eighths in one beat,  bracketed "3"  (3-in-2)
     tpl-quintuplet — 5 equal sixteenths in one beat, bracketed "5" (5-in-4)
     tpl-sextuplet  — 6 equal sixteenths in one beat, bracketed "6" (6-in-4)
     tpl-septuplet  — 7 equal sixteenths in one beat, bracketed "7" (7-in-4)

   Pipeline mirrors generate-compound-assets.js / generate-meter-figures.js EXACTLY:
     - VexFlow 4.2.2 from the jsdelivr CDN inside jsdom (runScripts:'dangerously',
       structuredClone polyfill, ~1.2s wait, window.Vex.Flow). v4.2.2 renders
       <path> glyphs that display correctly as <img>; the v5 in node_modules
       renders <text> (empty boxes without the Bravura webfont).
     - VF.StaveNote (clef 'percussion', keys ['b/4']), STEM_DOWN, one VF.Beam
       over the whole group, a bracketed VF.Tuplet above (location:1), then
       FormatAndDraw, draw beam, draw tuplet. Extract svg.innerHTML, wrap in a
       clean 240x120 SVG with the path-stroke style. Write placement SVG.
     - Rasterize each SVG -> transparent PNG via puppeteer (omitBackground,
       deviceScaleFactor 3), then trim+center into the bank with ImageMagick:
       `-trim +repage -gravity center -extent 720x360`  (NO -resize — resizing
       noteheads is a known past mistake).

   Onsets are computed later by code from the vexflow[] duration array (normalized
   by total duration). N equal durations -> N equal onsets in the beat, regardless
   of the absolute base value. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { execFileSync } = require('child_process');

// Each figure: N equal notes filling one quarter-note beat, with a bracketed
// tuplet number. num_notes = N drawn, notes_occupied = the simple-meter base
// the bracket borrows from (2 for the triplet, 4 for 5/6/7-tuplets) so the
// number reads correctly.
const FIGURES = [
  { id: 'tpl-triplet',    count: 3, base: '8',  tuplet: { num_notes: 3, notes_occupied: 2 } },
  { id: 'tpl-quintuplet', count: 5, base: '16', tuplet: { num_notes: 5, notes_occupied: 4 } },
  { id: 'tpl-sextuplet',  count: 6, base: '16', tuplet: { num_notes: 6, notes_occupied: 4 } },
  { id: 'tpl-septuplet',  count: 7, base: '16', tuplet: { num_notes: 7, notes_occupied: 4 } },
].map(f => ({ ...f, seq: Array.from({ length: f.count }, () => ({ duration: f.base, dot: 0, rest: 0 })) }));

const WIDTH = 240, HEIGHT = 120;
const DIR = 'tuplets';

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

    const assetsDir = path.join(__dirname, 'rhythm-assets', DIR);
    const bankDir = path.join(__dirname, 'rhythm-assets', 'bank');
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
    if (!fs.existsSync(bankDir)) fs.mkdirSync(bankDir, { recursive: true });

    let ok = 0; const manifest = {};

    FIGURES.forEach(fig => {
      try {
        const container = document.createElement('div'); document.body.appendChild(container);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', WIDTH); svg.setAttribute('height', HEIGHT);
        container.appendChild(svg);
        const renderer = new VF.Renderer(svg, VF.Renderer.Backends.SVG);
        renderer.resize(WIDTH, HEIGHT);
        const ctx = renderer.getContext();
        ctx.scale(Math.min(1, HEIGHT / 80), Math.min(1, HEIGHT / 80));
        const stave = new VF.Stave(5, 5, WIDTH - 10); stave.setContext(ctx);

        const notes = fig.seq.map(s => {
          const note = new VF.StaveNote({ clef: 'percussion', keys: ['b/4'], duration: s.duration });
          note.setStemDirection(STEM_DOWN);
          return note;
        });

        // One beam over the whole tuplet group.
        const beam = new VF.Beam(notes);
        const tuplet = new VF.Tuplet(notes, {
          num_notes: fig.tuplet.num_notes,
          notes_occupied: fig.tuplet.notes_occupied,
          bracketed: true,
          location: 1,
          y_offset: 12,
        });

        VF.Formatter.FormatAndDraw(ctx, stave, notes);
        beam.setContext(ctx).draw();
        tuplet.setContext(ctx).draw();

        const inner = svg.innerHTML.replace(/<svg[^>]*>/, '').replace(/<\/svg>$/, '');
        const clean = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<style>path[fill="none"]{stroke:#000;}</style>
${inner}
</svg>`;
        fs.writeFileSync(path.join(assetsDir, fig.id + '.svg'), clean);

        manifest[fig.id] = {
          file: fig.id + '.svg',
          beats: 1,
          beatUnit: 'quarter',
          tuplet: { num: fig.tuplet.num_notes, inSpaceOf: fig.tuplet.notes_occupied },
          vexflow: fig.seq.map(s => ({ keys: ['b/4'], duration: s.duration, dots: 0 })),
        };
        ok++;
      } catch (e) { console.error('FAIL', fig.id, e.message); }
    });

    fs.writeFileSync(path.join(assetsDir, DIR + '-assets.js'),
      'export const tupletAssets = ' + JSON.stringify(manifest, null, 2) + ';\n');
    console.log(`generated ${ok}/${FIGURES.length} tuplet SVGs -> rhythm-assets/${DIR}/`);

    // ---- Rasterize SVG -> transparent PNG, trim+center into the bank --------
    rasterize(assetsDir, bankDir, Object.keys(manifest))
      .then(() => { console.log('SVG + bank PNG generation done.'); process.exit(0); })
      .catch(e => { console.error('RASTER ERROR', e); process.exit(1); });
  } catch (e) {
    console.error('RUN ERROR', e);
    process.exit(1);
  }
}

async function rasterize(assetsDir, bankDir, ids) {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    for (const id of ids) {
      const svgPath = path.join(assetsDir, id + '.svg');
      const rawPng = path.join(bankDir, id + '.raw.png');
      const outPng = path.join(bankDir, id + '.png');

      const svg = fs.readFileSync(svgPath, 'utf8');
      await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 3 });
      await page.setContent(
        `<!DOCTYPE html><html><head><style>html,body{margin:0;padding:0;background:transparent;}` +
        `svg{display:block;}</style></head><body>${svg}</body></html>`,
        { waitUntil: 'domcontentloaded' });
      const el = await page.$('svg');
      await el.screenshot({ path: rawPng, omitBackground: true });

      // Trim to content, then center within a 720x360 canvas. NO -resize.
      execFileSync('magick', [
        rawPng, '-trim', '+repage',
        '-background', 'none', '-gravity', 'center',
        '-extent', `${WIDTH * 3}x${HEIGHT * 3}`,
        outPng,
      ]);
      fs.unlinkSync(rawPng);
      const sz = fs.statSync(outPng).size;
      console.log(`bank png ${id}.png (${sz} bytes)`);
    }
  } finally {
    await browser.close();
  }
}
