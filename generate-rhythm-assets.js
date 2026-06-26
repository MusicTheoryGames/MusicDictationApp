#!/usr/bin/env node

// Rhythm SVG Asset Generator
// This script generates static SVG files for all rhythm patterns

const fs = require('fs');
const path = require('path');

// We'll need to use a browser environment for VexFlow, so we'll use jsdom
const { JSDOM } = require('jsdom');

// Create a virtual DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/vexflow@4.2.2/build/cjs/vexflow.js"></script>
</head>
<body>
    <div id="container"></div>
</body>
</html>
`, {
    runScripts: "dangerously",
    resources: "usable"
});

// Wait for VexFlow to load
dom.window.addEventListener('load', () => {
    setTimeout(generateAssets, 1000); // Wait for VexFlow to be available
});

function generateAssets() {
    const { window } = dom;
    const { document, Vex } = window;

    if (!Vex) {
        console.error('VexFlow not loaded!');
        return;
    }

    const VF = Vex.Flow;

    // Copy rhythm patterns from the student file
    const rhythmPatterns = {
        medium: [
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
        ]
    };

    // Create assets directory
    const assetsDir = path.join(__dirname, 'rhythm-assets');
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir);
    }

    // Generate SVG for each pattern
    const assetMap = {};

    rhythmPatterns.medium.forEach(pattern => {
        try {
            console.log(`Generating SVG for ${pattern.id}...`);

            // Create container
            const container = document.createElement('div');
            document.body.appendChild(container);

            // Get container dimensions.
            // Width is proportional to the pattern's beat count so that, when each
            // asset is later displayed spanning its beats, every pattern renders at
            // the SAME scale (consistent notehead size) AND the inner notes land at
            // their correct beat positions.
            const beats = pattern.beats || 1;
            const width = 200 * beats;
            const height = 120;

            // Create SVG
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', width);
            svg.setAttribute('height', height);
            svg.style.display = 'block';
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';

            container.appendChild(svg);

            const renderer = new VF.Renderer(svg, VF.Renderer.Backends.SVG);
            renderer.resize(width, height);
            const context = renderer.getContext();

            // Scale by height only (independent of beat count) so noteheads are
            // the same size in every pattern, narrow or wide.
            const scale = Math.min(1, height / 80);
            context.scale(scale, scale);

            // Create invisible stave
            const stave = new VF.Stave(5, 5, width - 10);
            stave.setContext(context);

            // Convert pattern to VexFlow notes
            const notes = [];
            pattern.vexflow.forEach(noteData => {
                const note = new VF.StaveNote({
                    clef: 'percussion',
                    keys: noteData.keys,
                    duration: noteData.duration
                });

                // Add dots if needed
                if (noteData.dots && noteData.dots > 0) {
                    note.addModifier(new VF.Dot(), 0);
                }

                notes.push(note);
            });

            if (notes.length > 0) {
                // Handle beaming and triplets
                let beams = [];
                let triplet = null;

                if (pattern.triplet && notes.length === 3) {
                    // Force stem direction down for triplets
                    notes.forEach(note => note.setStemDirection(VF.StaveNote.STEM_DOWN));

                    // Only beam if notes are eighth notes or shorter
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

                // Format and draw
                VF.Formatter.FormatAndDraw(context, stave, notes);

                // Draw beams
                beams.forEach(beam => beam.setContext(context).draw());

                // Draw triplet bracket if created
                if (triplet) {
                    triplet.setContext(context).draw();
                }

                // Apply viewBox cropping
                if (pattern.triplet) {
                    svg.setAttribute('viewBox', '5 45 110 25');
                } else {
                    svg.setAttribute('viewBox', '5 50 110 20');
                }

                // Extract the VexFlow content from the nested SVG
                const innerSvg = svg.innerHTML;

                // Remove the nested SVG wrapper and get just the paths/groups
                const vexFlowContent = innerSvg.replace(/<svg[^>]*>/, '').replace(/<\/svg>$/, '');

                // Create a clean SVG without cropping - show full notation.
                // viewBox/width scale with the proportional canvas width.
                const viewBox = `0 0 ${width} 120`;
                const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="120" viewBox="${viewBox}">
${vexFlowContent}
</svg>`;

                // Save to file
                const filename = `${pattern.id}.svg`;
                const filepath = path.join(assetsDir, filename);
                fs.writeFileSync(filepath, cleanSvg);

                // Add to asset map
                assetMap[pattern.id] = {
                    file: filename,
                    name: pattern.name,
                    beats: pattern.beats,
                    triplet: pattern.triplet || false
                };

                console.log(`✓ Generated ${filename}`);
            }

            // Clean up
            document.body.removeChild(container);

        } catch (error) {
            console.error(`Error generating ${pattern.id}:`, error);
        }
    });

    // Save asset map
    const mapContent = `// Auto-generated rhythm pattern asset map
export const rhythmAssets = ${JSON.stringify(assetMap, null, 2)};
`;

    fs.writeFileSync(path.join(assetsDir, 'rhythm-assets.js'), mapContent);

    console.log(`\n✓ Generated ${Object.keys(assetMap).length} rhythm SVG assets`);
    console.log(`✓ Created asset map: rhythm-assets.js`);
    console.log(`\nAssets saved to: ${assetsDir}`);
}