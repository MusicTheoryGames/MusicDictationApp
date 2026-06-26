#!/usr/bin/env node

// Single-note glyph generator (for the "split" placement approach).
// Renders ONE note per file at the SAME 200px-per-beat scale used by
// generate-rhythm-assets.js, so a placed glyph's notehead matches the notes in
// the 1-beat pattern assets exactly. Multi-note patterns are then composed at
// placement time by dropping these glyphs at their beat offsets.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.2/build/cjs/vexflow.js"></script>
</head>
<body><div id="container"></div></body>
</html>
`, { runScripts: "dangerously", resources: "usable" });

dom.window.addEventListener('load', () => setTimeout(generate, 1000));

// One glyph per single note value. duration/dots match VexFlow note codes.
const GLYPHS = [
    { id: 'q',   duration: 'q' },
    { id: 'qd',  duration: 'q', dots: 1 },
    { id: '8',   duration: '8' },
    { id: '16',  duration: '16' },
    { id: 'h',   duration: 'h' },
    { id: 'hd',  duration: 'h', dots: 1 },
    { id: 'qr',  duration: 'qr' },
    { id: '8r',  duration: '8r' },
    { id: '16r', duration: '16r' },
];

function generate() {
    const { window } = dom;
    const { document, Vex } = window;
    if (!Vex) { console.error('VexFlow not loaded!'); return; }
    const VF = Vex.Flow;

    const outDir = path.join(__dirname, 'rhythm-assets', 'glyphs');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const manifest = {};

    GLYPHS.forEach(g => {
        try {
            const container = document.createElement('div');
            document.body.appendChild(container);

            // Same coordinate system as the 1-beat pattern assets: 200 wide x 120.
            const width = 200, height = 120;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', width);
            svg.setAttribute('height', height);
            container.appendChild(svg);

            const renderer = new VF.Renderer(svg, VF.Renderer.Backends.SVG);
            renderer.resize(width, height);
            const context = renderer.getContext();
            const scale = Math.min(1, height / 80); // == 1; identical to pattern generator
            context.scale(scale, scale);

            const stave = new VF.Stave(5, 5, width - 10);
            stave.setContext(context);

            const note = new VF.StaveNote({ clef: 'percussion', keys: ['b/4'], duration: g.duration });
            if (g.dots) note.addModifier(new VF.Dot(), 0);

            const notes = [note];
            VF.Formatter.FormatAndDraw(context, stave, notes);

            const inner = svg.innerHTML.replace(/<svg[^>]*>/, '').replace(/<\/svg>$/, '');
            const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="120" viewBox="0 0 ${width} 120">
${inner}
</svg>`;

            fs.writeFileSync(path.join(outDir, `${g.id}.svg`), cleanSvg);
            manifest[g.id] = { file: `glyphs/${g.id}.svg` };
            console.log(`✓ glyph ${g.id}.svg`);

            document.body.removeChild(container);
        } catch (err) {
            console.error(`Error on glyph ${g.id}:`, err.message);
        }
    });

    const mapContent = `// Auto-generated single-note glyph map (split placement)
export const noteGlyphs = ${JSON.stringify(manifest, null, 2)};
`;
    fs.writeFileSync(path.join(outDir, 'note-glyphs.js'), mapContent);
    console.log(`\n✓ ${Object.keys(manifest).length} glyphs + note-glyphs.js`);
    process.exit(0);
}
