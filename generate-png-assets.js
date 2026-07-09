#!/usr/bin/env node

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const rhythmPatterns = [
    {
        id: 'quarter',
        name: 'Quarter Note',
        beats: 1,
        vexflow: [{ keys: ['b/4'], duration: 'q' }]
    },
    {
        id: 'two-eighths',
        name: 'Two Eighths',
        beats: 1,
        vexflow: [
            { keys: ['b/4'], duration: '8' },
            { keys: ['b/4'], duration: '8' }
        ]
    },
    {
        id: 'four-sixteenths',
        name: 'Four Sixteenths',
        beats: 1,
        vexflow: [
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' }
        ]
    },
    {
        id: 'eighth-two-sixteenths',
        name: 'Eighth + 2 Sixteenths',
        beats: 1,
        vexflow: [
            { keys: ['b/4'], duration: '8' },
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' }
        ]
    },
    {
        id: 'two-sixteenths-eighth',
        name: '2 Sixteenths + Eighth',
        beats: 1,
        vexflow: [
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '8' }
        ]
    },
    {
        id: 'dotted-quarter-eighth',
        name: 'Dotted Quarter + Eighth',
        beats: 2,
        vexflow: [
            { keys: ['b/4'], duration: 'q', dots: 1 },
            { keys: ['b/4'], duration: '8' }
        ]
    },
    {
        id: 'half',
        name: 'Half Note',
        beats: 2,
        vexflow: [{ keys: ['b/4'], duration: 'h' }]
    },
    {
        id: 'eighth-rest-eighth',
        name: 'Eighth Rest + Eighth',
        beats: 1,
        vexflow: [
            { keys: ['b/4'], duration: '8r' },
            { keys: ['b/4'], duration: '8' }
        ]
    },
    {
        id: 'eighth-eighth-rest',
        name: 'Eighth + Eighth Rest',
        beats: 1,
        vexflow: [
            { keys: ['b/4'], duration: '8' },
            { keys: ['b/4'], duration: '8r' }
        ]
    },
    {
        id: 'quarter-rest',
        name: 'Quarter Rest',
        beats: 1,
        vexflow: [{ keys: ['b/4'], duration: 'qr' }]
    },
    {
        id: 'sixteenth-eighth-sixteenth',
        name: '16th + 8th + 16th',
        beats: 1,
        vexflow: [
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '8' },
            { keys: ['b/4'], duration: '16' }
        ]
    },
    {
        id: 'dotted-eighth-sixteenth',
        name: 'Dotted 8th + 16th',
        beats: 1,
        vexflow: [
            { keys: ['b/4'], duration: '8', dots: 1 },
            { keys: ['b/4'], duration: '16' }
        ]
    },
    {
        id: 'triplet-eighths',
        name: 'Triplet Eighths',
        beats: 1,
        vexflow: [
            { keys: ['b/4'], duration: '8' },
            { keys: ['b/4'], duration: '8' },
            { keys: ['b/4'], duration: '8' }
        ],
        triplet: true
    },
    {
        id: 'sixteenth-dotted-eighth',
        name: '16th + Dotted 8th',
        beats: 1,
        vexflow: [
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '8', dots: 1 }
        ]
    },
    {
        id: 'eighth-quarter-eighth',
        name: '8th + Quarter + 8th',
        beats: 2,
        vexflow: [
            { keys: ['b/4'], duration: '8' },
            { keys: ['b/4'], duration: 'q' },
            { keys: ['b/4'], duration: '8' }
        ]
    },
    {
        id: 'eighth-rest-two-sixteenths',
        name: '8th Rest + 2 16ths',
        beats: 1,
        vexflow: [
            { keys: ['b/4'], duration: '8r' },
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' }
        ]
    },
    {
        id: 'sixteenth-rest-three-sixteenths',
        name: '16th Rest + 3 16ths',
        beats: 1,
        vexflow: [
            { keys: ['b/4'], duration: '16r' },
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' },
            { keys: ['b/4'], duration: '16' }
        ]
    },
    {
        id: 'triplet-quarters',
        name: 'Triplet Quarters',
        beats: 2,
        vexflow: [
            { keys: ['b/4'], duration: 'q' },
            { keys: ['b/4'], duration: 'q' },
            { keys: ['b/4'], duration: 'q' }
        ],
        triplet: true
    }
];

async function generatePNGAssets() {
    console.log('Starting PNG asset generation...');

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({ width: 200, height: 80, deviceScaleFactor: 1 });

    // Create assets directory
    const assetsDir = path.join(__dirname, 'rhythm-assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir);
    }

    const assetMap = {};

    for (const pattern of rhythmPatterns) {
        try {
            console.log(`Generating PNG for ${pattern.id}...`);

            // Create HTML content with VexFlow - EXACT copy of SVG generator logic
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.2/build/cjs/vexflow.js"></script>
    <style>
        body { margin: 0; padding: 0; background: white; }
        #canvas { border: none; }
    </style>
</head>
<body>
    <canvas id="canvas" width="200" height="80"></canvas>
    <script>
        const VF = Vex.Flow;
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 200, 80);

        const renderer = new VF.Renderer(canvas, VF.Renderer.Backends.CANVAS);
        renderer.resize(200, 80);
        const context = renderer.getContext();

        const scale = Math.min(200 / 200, 80 / 80);
        context.scale(scale, scale);

        const stave = new VF.Stave(5, -30, 190);
        stave.setContext(context);

        const pattern = ${JSON.stringify(pattern)};
        const notes = [];

        pattern.vexflow.forEach(noteData => {
            const note = new VF.StaveNote({
                clef: 'percussion',
                keys: noteData.keys,
                duration: noteData.duration
            });

            if (noteData.dots && noteData.dots > 0) {
                note.addModifier(new VF.Dot(), 0);
            }

            notes.push(note);
        });

        if (notes.length > 0) {
            let beams = [];
            let triplet = null;

            if (pattern.triplet && notes.length === 3) {
                notes.forEach(note => note.setStemDirection(VF.StaveNote.STEM_DOWN));

                const canBeam = notes.every(note => note.getDuration() === '8' || note.getDuration() === '16');
                if (canBeam) {
                    const tripletBeam = new VF.Beam(notes);
                    beams = [tripletBeam];
                }

                triplet = new VF.Tuplet(notes, {
                    num_notes: 3,
                    notes_occupied: 2,
                    bracketed: true,
                    location: 1,
                    y_offset: 15
                });
            } else {
                beams = VF.Beam.generateBeams(notes);
            }

            VF.Formatter.FormatAndDraw(context, stave, notes);
            beams.forEach(beam => beam.setContext(context).draw());

            if (triplet) {
                triplet.setContext(context).draw();
            }
        }
    </script>
</body>
</html>`;

            // Set the HTML content
            await page.setContent(htmlContent);

            // Wait for VexFlow to render
            await page.waitForFunction(() => window.Vex && window.Vex.Flow, { timeout: 10000 });

            // Wait for rendering to complete
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Take screenshot of just the canvas
            const canvas = await page.$('#canvas');
            const screenshot = await canvas.screenshot({ type: 'png' });

            // Save PNG file
            const filename = `${pattern.id}.png`;
            const filepath = path.join(assetsDir, filename);
            fs.writeFileSync(filepath, screenshot);

            // Add to asset map
            assetMap[pattern.id] = {
                file: filename,
                name: pattern.name,
                beats: pattern.beats,
                triplet: pattern.triplet || false
            };

            console.log(`✓ Generated ${filename}`);

        } catch (error) {
            console.error(`Error generating ${pattern.id}:`, error);
        }
    }

    await browser.close();

    // Save asset map
    const mapContent = `// Auto-generated rhythm pattern asset map
export const rhythmAssets = ${JSON.stringify(assetMap, null, 2)};
`;

    fs.writeFileSync(path.join(assetsDir, 'rhythm-assets.js'), mapContent);

    console.log(`\n✓ Generated ${Object.keys(assetMap).length} rhythm PNG assets`);
    console.log(`✓ Created asset map: rhythm-assets.js`);
    console.log(`\nAssets saved to: ${assetsDir}`);
}

generatePNGAssets().catch(console.error);