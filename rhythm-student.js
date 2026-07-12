// Import rhythm assets
import { rhythmAssets } from './rhythm-assets/rhythm-assets.js';
import { noteGlyphs } from './rhythm-assets/glyphs/note-glyphs.js';

// "Split" placement: multi-note patterns are composed at placement time from
// single-note glyphs dropped at their beat offsets, so every notehead is the
// same size AND each note lands on its true beat. Offsets are in beats from the
// start of the pattern's span. Patterns not listed here fall back to their
// single pattern image.
const NOTE_DECOMPOSITION = {
    'dotted-quarter-eighth': [{ glyph: 'qd', offset: 0 }, { glyph: '8', offset: 1.5 }],
    'eighth-quarter-eighth': [{ glyph: '8', offset: 0 }, { glyph: 'q', offset: 0.5 }, { glyph: '8', offset: 1.5 }],
    'half': [{ glyph: 'h', offset: 0 }],
};

// The glyph's first visible ink (notehead/stem) sits ~11% in from the image's
// left edge (VexFlow stave padding). Subtract that so the note's LEFT EDGE lands
// exactly on the beat onset / bar line / drag-highlight edge, with no overhang.
const GLYPH_NOTEHEAD_OFFSET = 11;

// Pre-rendered ONE-BEAT figure sets: each id has a centered bank PNG
// (rhythm-assets/bank/<id>.png) and a placement SVG that spans its beat-cell
// (rhythm-assets/<dir>/<id>.svg). They all place identically (whole figure
// across the cell, shifted left so the first notehead sits on the onset). Keyed
// by id prefix -> placement-SVG directory.
const METER_FIG_DIRS = { 'cd-': 'compound', 'hb-': 'halfbeat', 'dh-': 'dottedhalf', 'de-': 'dotted16', 'tpl-': 'tuplets' };
function meterFigDir(id) { if (!id) return null; for (const p in METER_FIG_DIRS) { if (id.indexOf(p) === 0) return METER_FIG_DIRS[p]; } return null; }

/* WHICH TILE ART. `bank/` is the source of truth, hand-tuned, never regenerated. It is TWO size
   families: 79 files at 720x360 and 20 at 380x192.
   `bank-tight/` is the redesign's art — the same 99 filenames, each trimmed to its alpha bounding
   box but with a MINIMUM CANVAS PER FAMILY, so a quarter rest does not end up the visual weight of
   four beamed sixteenths. The result is NOT one size: 76 land at 640x443 and the remaining 23 range
   from 360x249 to 668x462. (I wrote "640x443" for all of them. Measure, do not remember.)
   Produced by tools/generate-tight-bank-assets.py, which regenerates all 99 byte-for-byte from
   bank/ — verified by sha256, 2026-07-10. Selected by `?renderer=`, alongside the VexFlow switch. */
function bankDir() {
    try {
        // Gated on the renderer module being loaded. melodic-game.html imports this file but not
        // rhythm-vexflow-renderer.js; without this it would serve the redesign's tight art with the
        // old PNG figures and none of the VexFlow, i.e. half the switch. The two halves ship or they
        // do not. Codex caught it.
        if (!window.RhythmVexFlow) return 'bank';
        const m = window.RhythmVexFlow.mode();
        return (m === 'hybrid' || m === 'vexflow') ? 'bank-tight' : 'bank';
    } catch (e) { return 'bank'; }
}

// Touch devices (phone/tablet) get a single horizontal scrolling staff instead
// of the desktop multi-line wrap, so playback can autoscroll left->right.
function isMobileStaff() {
    try { return window.matchMedia('(pointer: coarse) and (max-width: 1400px)').matches; } catch (e) { return false; }
}

// Rhythm Student System
class RhythmStudent {
    constructor() {
        // Use pre-rendered PNG assets instead of VexFlow patterns
        this.rhythmAssets = rhythmAssets;
        console.log('Loaded rhythm assets:', this.rhythmAssets);
        this.rhythmPatterns = {
            easy: [
                {
                    id: 'quarter',
                    name: 'Quarter Note',
                    notation: '♩',
                    beats: 1,
                    vexflow: [{ keys: ['b/4'], duration: 'q' }]
                },
                {
                    id: 'two-eighths',
                    name: 'Two Eighths',
                    notation: '♫♫',
                    beats: 1,
                    vexflow: [
                        { keys: ['b/4'], duration: '8' },
                        { keys: ['b/4'], duration: '8' }
                    ]
                },
                {
                    id: 'quarter-rest',
                    name: 'Quarter Rest',
                    notation: '𝄽',
                    beats: 1,
                    vexflow: [{ keys: ['b/4'], duration: 'qr' }]
                },
                {
                    id: 'half',
                    name: 'Half Note',
                    notation: '♪',
                    beats: 2,
                    vexflow: [{ keys: ['b/4'], duration: 'h' }]
                }
            ],
            medium: [
                {
                    id: 'quarter',
                    name: 'Quarter Note',
                    notation: '♩',
                    beats: 1,
                    vexflow: [{ keys: ['b/4'], duration: 'q' }]
                },
                {
                    id: 'two-eighths',
                    name: 'Two Eighths',
                    notation: '♫♫',
                    beats: 1,
                    vexflow: [
                        { keys: ['b/4'], duration: '8' },
                        { keys: ['b/4'], duration: '8' }
                    ]
                },
                {
                    id: 'four-sixteenths',
                    name: 'Four Sixteenths',
                    notation: '♬♬♬♬',
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
                    notation: '♫♬♬',
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
                    notation: '♬♬♫',
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
                    notation: '♩.♫',
                    beats: 2,
                    vexflow: [
                        { keys: ['b/4'], duration: 'q', dots: 1 },
                        { keys: ['b/4'], duration: '8' }
                    ]
                },
                {
                    id: 'half',
                    name: 'Half Note',
                    notation: '♪',
                    beats: 2,
                    vexflow: [{ keys: ['b/4'], duration: 'h' }]
                },
                {
                    id: 'eighth-rest-eighth',
                    name: 'Eighth Rest + Eighth',
                    notation: '𝄾♫',
                    beats: 1,
                    vexflow: [
                        { keys: ['b/4'], duration: '8r' },
                        { keys: ['b/4'], duration: '8' }
                    ]
                },
                {
                    id: 'eighth-eighth-rest',
                    name: 'Eighth + Eighth Rest',
                    notation: '♫𝄾',
                    beats: 1,
                    vexflow: [
                        { keys: ['b/4'], duration: '8' },
                        { keys: ['b/4'], duration: '8r' }
                    ]
                },
                {
                    id: 'quarter-rest',
                    name: 'Quarter Rest',
                    notation: '𝄽',
                    beats: 1,
                    vexflow: [{ keys: ['b/4'], duration: 'qr' }]
                },
                {
                    id: 'sixteenth-eighth-sixteenth',
                    name: '16th + 8th + 16th',
                    notation: '♬♫♬',
                    beats: 1,
                    vexflow: [
                        { keys: ['b/4'], duration: '16' },
                        { keys: ['b/4'], duration: '8' },
                        { keys: ['b/4'], duration: '16' }
                    ]
                },
                {
                    id: 'triplet-eighths',
                    name: 'Triplet Eighths',
                    notation: '♫♫♫',
                    beats: 1,
                    vexflow: [
                        { keys: ['b/4'], duration: '8' },
                        { keys: ['b/4'], duration: '8' },
                        { keys: ['b/4'], duration: '8' }
                    ],
                    triplet: true
                },
                {
                    id: 'dotted-eighth-sixteenth',
                    name: 'Dotted 8th + 16th',
                    notation: '♫.♬',
                    beats: 1,
                    vexflow: [
                        { keys: ['b/4'], duration: '8', dots: 1 },
                        { keys: ['b/4'], duration: '16' }
                    ]
                },
                {
                    id: 'sixteenth-dotted-eighth',
                    name: '16th + Dotted 8th',
                    notation: '♬♫.',
                    beats: 1,
                    vexflow: [
                        { keys: ['b/4'], duration: '16' },
                        { keys: ['b/4'], duration: '8', dots: 1 }
                    ]
                },
                {
                    id: 'eighth-quarter-eighth',
                    name: '8th + Quarter + 8th',
                    notation: '♫♩♫',
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
                    notation: '𝄾♬♬',
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
                    notation: '𝄿♬♬♬',
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
                    notation: '♩♩♩',
                    beats: 2,
                    vexflow: [
                        { keys: ['b/4'], duration: 'q' },
                        { keys: ['b/4'], duration: 'q' },
                        { keys: ['b/4'], duration: 'q' }
                    ],
                    triplet: true
                }
            ],
            hard: [
                {
                    id: 'quarter',
                    name: 'Quarter Note',
                    notation: '♩',
                    beats: 1,
                    vexflow: [{ keys: ['b/4'], duration: 'q' }]
                },
                {
                    id: 'two-eighths',
                    name: 'Two Eighths',
                    notation: '♫♫',
                    beats: 1,
                    vexflow: [
                        { keys: ['b/4'], duration: '8' },
                        { keys: ['b/4'], duration: '8' }
                    ]
                },
                {
                    id: 'four-sixteenths',
                    name: 'Four Sixteenths',
                    notation: '♬♬♬♬',
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
                    notation: '♫♬♬',
                    beats: 1,
                    vexflow: [
                        { keys: ['b/4'], duration: '8' },
                        { keys: ['b/4'], duration: '16' },
                        { keys: ['b/4'], duration: '16' }
                    ]
                },
                {
                    id: 'triplet-eighths',
                    name: 'Triplet Eighths',
                    notation: '♫³♫³♫³',
                    beats: 1,
                    vexflow: [
                        { keys: ['b/4'], duration: '8', triplet: true },
                        { keys: ['b/4'], duration: '8', triplet: true },
                        { keys: ['b/4'], duration: '8', triplet: true }
                    ]
                },
                {
                    id: 'quarter-rest',
                    name: 'Quarter Rest',
                    notation: '𝄽',
                    beats: 1,
                    vexflow: [{ keys: ['b/4'], duration: 'qr' }]
                }
            ]
        };

        this.studentName = '';
        this.roomCode = '';
        this.connected = false;
        this.currentDifficulty = 'medium';
        this.measureCount = 2;
        this.timeSignature = '4/4';
        this.beatsPerMeasure = 4;
        this.tempo = 100;
        this.userAnswer = [];
        this.revealedBeats = [];

        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('joinBtn').addEventListener('click', () => this.joinSession());

        // Handle Enter key in input fields
        document.getElementById('studentName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinSession();
        });

        document.getElementById('roomCode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinSession();
        });
    }

    /**
     * Classroom join. THERE IS NO TRANSPORT IN THIS BUILD, AND NO TEACHER TOOL EITHER.
     *
     * The old teacher tool and projector broadcast on a `rhythm-rooms/*` schema that no
     * student client ever spoke. Both were archived on 2026-07-10 (archive/rhythm-teacher.js,
     * archive/projection.js); the owner wants a new teacher interface built against the Quest
     * games. Until one exists, this must say so.
     *
     * It previously hid the login form, wrote "Connected" into #connectionStatus,
     * flashed "Connected to rhythm session!", and then fed the page fabricated
     * teacher messages on a setTimeout — so a teacher standing in front of a class
     * saw a connected student who was connected to nothing. See VISION.md rule 12
     * (the app never lies to the user) and §9.
     */
    joinSession() {
        this.showFeedback(
            'Classroom mode is not available yet. Choose "Practice on your own" to play.',
            'error'
        );
    }

    /**
     * Entry point for the classroom transport, once one exists: the room
     * subscription will call this with each message the teacher broadcasts.
     * Currently UNCALLED — nothing produces these messages. Do not delete; this is
     * the seam the live room will attach to (VISION.md §7).
     */
    handleTeacherMessage(type, data) {
        switch (type) {
            case 'new-rhythm':
                this.updateGameSettings(data);
                break;
            case 'play-rhythm':
                this.playRhythm(data.notes, data.tempo);
                break;
            case 'reveal-beat':
                this.revealBeat(data.beatNumber);
                break;
            case 'reveal-all':
                this.revealAll(data.rhythm);
                break;
        }
    }

    beatsForMeter(ts) {
        const [t, b] = String(ts || '4/4').split('/').map(Number);
        if (b === 8 && t % 3 === 0) return t / 3;   // compound: 6/8->2, 9/8->3, 12/8->4
        return t || 4;                               // simple: 4/4->4, 3/4->3, 2/4->2
    }

    updateGameSettings(settings) {
        this.measureCount = settings.measureCount;
        this.currentDifficulty = settings.difficulty;
        this.tempo = settings.tempo;
        if (settings.timeSignature) this.timeSignature = settings.timeSignature;
        this.beatsPerMeasure = settings.beatsPerMeasure || this.beatsForMeter(this.timeSignature || '4/4');
        // Changing-meter mode: a per-measure list of time signatures. Null/absent
        // means a single fixed meter (the normal path).
        this.measureMeters = (settings.measureMeters && settings.measureMeters.length) ? settings.measureMeters.slice() : null;

        this.populateRhythmBank();
        this.updateMeasureDisplay();
        this.clearAnswers();
        this.revealedBeats = [];

        this.showFeedback('New rhythm exercise loaded!', 'info');
        setTimeout(() => this.clearFeedback(), 2000);
    }

    populateRhythmBank() {
        const tilesContainer = document.getElementById('rhythmTiles');
        tilesContainer.innerHTML = '';

        // Order the bank by ATTACKS per figure: rests (0 sounds) first, then 1, 2,
        // 3, 4 sounds; ties broken by length (shorter first). Makes the palette read
        // simplest -> busiest instead of random.
        const attacks = p => (p.vexflow || []).filter(n => (('' + (n.duration || '')).indexOf('r') === -1)).length;
        const patterns = this.rhythmPatterns[this.currentDifficulty]
            .slice()
            .sort((a, b) => (attacks(a) - attacks(b)) || ((a.beats || 1) - (b.beats || 1)));

        patterns.forEach((pattern, index) => {
            const tile = document.createElement('div');
            tile.className = 'rhythm-tile';
            tile.draggable = true;
            tile.dataset.patternId = pattern.id;

            // Create container for VexFlow notation (centered in tile)
            const notationDiv = document.createElement('div');
            notationDiv.style.height = '100%';
            notationDiv.style.width = '100%';
            notationDiv.style.overflow = 'visible';
            notationDiv.style.display = 'flex';
            notationDiv.style.alignItems = 'center';
            notationDiv.style.justifyContent = 'center';
            notationDiv.style.position = 'relative';
            notationDiv.id = `notation-${pattern.id}`;

            // No text label - notation is self-explanatory
            tile.appendChild(notationDiv);
            tilesContainer.appendChild(tile);

            // Render VexFlow notation for this tile
            setTimeout(() => this.renderTileNotation(pattern, notationDiv), index * 50);
        });

        this.setupDragAndDrop();
    }

    renderTileNotation(pattern, container) {
        try {
            // Clear container
            container.innerHTML = '';

              /* THE BANK IS ALWAYS A PNG — VexFlow never draws a chooser tile (the redesign's
                 renderBeatBank has no renderer mode). `?renderer=` never switches the bank to VexFlow.
                 It DOES pick which PNG: bankDir() returns `bank/` in png mode and `bank-tight/` in
                 hybrid/vexflow (the redesign's tighter crops). So the switch changes the bank's ART
                 but never its RENDERER. I first wired VexFlow in here too — the wrong half of hybrid,
                 and what mangled the placed bank tiles the owner saw. */

            // One-beat figure sets (compound cd-, half-beat hb-, dotted-half dh-,
            // dotted-eighth de-, tuplets tpl-) all have their own centered bank PNGs.
            if (meterFigDir(pattern.id)) {
                const cimg = document.createElement('img');
                cimg.src = `./rhythm-assets/${bankDir()}/${pattern.id}.png`;
                cimg.style.width = '100%';
                cimg.style.height = '100%';
                cimg.style.objectFit = 'contain';
                cimg.alt = pattern.name || pattern.id;
                container.appendChild(cimg);
                return;
            }

            // Check if we have an asset for this pattern
            const asset = this.rhythmAssets[pattern.id];
            if (!asset) {
                console.warn(`No PNG asset found for pattern: ${pattern.id}`);
                container.innerHTML = `<div style="color: red; text-align: center; padding: 5px; font-size: 0.7rem;">Asset Missing<br>${pattern.id}</div>`;
                return;
            }

            // Bank/choosing area uses the ORIGINAL combined pattern PNG (readable,
            // hand-tuned). The answer area uses the split single-note glyphs.
            const img = document.createElement('img');
            // Use the centered/normalized bank versions (trimmed to content, so
            // the actual glyph is centered in the tile, not the image box).
            img.src = `./rhythm-assets/${bankDir()}/${asset.file.replace(/\.svg$/, '.png')}`;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.objectPosition = 'center';
            img.alt = asset.name;

            // Handle load success
            img.onload = () => {
                console.log(`Successfully loaded PNG asset: ${asset.file}`);
            };

            // Handle load error
            img.onerror = (event) => {
                console.error(`Failed to load SVG asset: ${asset.file}`, event);
                console.error(`Full path attempted: ${img.src}`);
                container.innerHTML = `<div style="color: red; text-align: center; padding: 5px; font-size: 0.7rem;">Load Error<br>${pattern.id}<br>${img.src}</div>`;
            };

            container.appendChild(img);

        } catch (error) {
            console.error('Error loading SVG asset for pattern:', pattern.id, error);
            container.innerHTML = `<div style="color: red; text-align: center; padding: 5px; font-size: 0.7rem;">SVG Error<br>${pattern.id}<br>${error.message}</div>`;
        }
    }

    updateMeasureDisplay() {
      try {
        const container = document.getElementById('measureContainer');
        container.innerHTML = '';

        // Changing-meter mode renders its own way (per-measure beat counts +
        // inline time-sig at each change, the way Hall notates it).
        if (this.measureMeters) { this.updateMeasureDisplayMixed(); return; }

        // Create single continuous staff container
        const measureContainer = document.createElement('div');
        measureContainer.className = 'measure-container';

        const [tsTop, tsBottom] = (this.timeSignature || '4/4').split('/');
        const bpm = this.beatsPerMeasure || this.beatsForMeter(this.timeSignature || '4/4');

        // Wrap measures onto multiple staff lines, 4 bars per line. One
        // .answer-staff panel holds MULTIPLE .staff-container rows stacked
        // vertically (a page of music), NOT separate panels.
        const totalMeasures = this.measureCount;
        // Desktop: a fixed 4 bars per line. Touch (iPad/phone): pack enough bars per row
        // to FILL the viewport width, so a long example (e.g. the 16-bar bonus) uses the
        // whole LANDSCAPE screen instead of stacking as a narrow, centered 2-bar column.
        // Cells keep their fixed px size (tiles must match the bank); we just fit more bars
        // per row when the screen is wide. Phone / iPad-portrait fall back to 2. The row
        // scrolls horizontally if it still overflows (playback autoscrolls to follow).
        const mobile = isMobileStaff();
        const tilesSkin = document.body.classList.contains('tiles-skin');
        const viewW = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0) || 1024;
        // DENSE (long example, e.g. the 16-bar bonus): FIT-TO-VIEWPORT. Lay every bar out in
        // as few rows as possible and SHRINK the tiles so the whole example fits on screen
        // with NO horizontal scroll. Both the answer cells AND the bank palette shrink
        // together (they share the body-level --slot-w / --slot-h vars) so a dragged tile
        // still matches its slot exactly. Non-dense clears the vars -> default 104x98.
        const dense = tilesSkin && totalMeasures > 8;
        let CELL, BARS_PER_LINE;
        if (dense) {
            // 4 bars per line (comfortable, readable — like desktop), stacked into as many
            // ROWS as needed (16 bars -> 4 rows). Owner wants VERTICAL stacking, NOT horizontal
            // cramming into tiny tiles. Tiles are as large as fit 4 bars across the width,
            // capped at natural size; answer + bank share --slot-w/h so they stay matched.
            // FIXED overhead calibrated from measured DOM; dense CSS trims cell/measure gaps.
            const FIXED = 226, CELLM = 2, MGAP = 6;
            const bpl = Math.min(4, totalMeasures);
            const cpr = bpl * bpm;
            const overhead = FIXED + CELLM * cpr + MGAP * (bpl - 1);
            const cell = Math.max(52, Math.min(104, Math.floor((viewW - overhead) / cpr)));
            document.body.style.setProperty('--slot-w', cell + 'px');
            document.body.style.setProperty('--slot-h', Math.round(cell * 72 / 104) + 'px');   // shorter tiles (trimmed whitespace)
            CELL = cell; BARS_PER_LINE = bpl;
        } else {
            document.body.style.removeProperty('--slot-w');
            document.body.style.removeProperty('--slot-h');
            CELL = mobile ? (tilesSkin ? 112 : 130) : 160;
            if (mobile) {
                const fillBars = Math.ceil((viewW - 150) / (bpm * CELL));
                BARS_PER_LINE = Math.min(Math.max(2, fillBars), Math.max(1, totalMeasures), 8);
            } else {
                BARS_PER_LINE = 4;
            }
        }
        const lineCount = Math.ceil(totalMeasures / BARS_PER_LINE);
        const cellsPerLineFull = Math.min(totalMeasures, BARS_PER_LINE) * bpm;
        const staffPx = cellsPerLineFull * CELL + 140;

        let rowsHtml = '';
        for (let line = 0; line < lineCount; line++) {
            const firstMeasure = line * BARS_PER_LINE + 1;            // 1-based global
            const lastMeasure = Math.min(firstMeasure + BARS_PER_LINE - 1, totalMeasures);
            const measuresInRow = lastMeasure - firstMeasure + 1;
            const isFirstRow = line === 0;

            // Time signature ONLY on the first row. EVERY row uses the same left
            // margin so cells (and therefore bar lines) stack vertically across
            // lines; rows 2+ leave that space empty.
            const timeSigHtml = isFirstRow
                ? `<div class="answer-time-sig"><span>${tsTop}</span><span>${tsBottom}</span></div>`
                : '';
            const leftMargin = 70;

            let cellsHtml = '';
            for (let j = 0; j < measuresInRow * bpm; j++) {
                const beat = (j % bpm) + 1;
                const measure = firstMeasure + Math.floor(j / bpm);   // GLOBAL data-measure
                const absoluteBeat = (firstMeasure - 1) * bpm + j + 1; // GLOBAL data-absolute-beat
                const isMeasureEnd = beat === bpm;
                // The final double bar belongs only to the very last cell of the
                // last row; every other measure boundary keeps a normal bar line.
                const isFinalCell = (measure === totalMeasures) && (beat === bpm);
                cellsHtml += `
                    <div class="beat-drop-zone${isMeasureEnd ? ' measure-end' : ''}${isFinalCell ? ' final-cell' : ''}" data-beat="${beat}" data-measure="${measure}" data-absolute-beat="${absoluteBeat}">
                        <div class="beat-notation"></div>
                    </div>
                `;
            }

            rowsHtml += `
                <div class="staff-container">
                    <div class="staff-lines">
                        <div class="staff-line"></div>
                    </div>
                    ${timeSigHtml}
                    <div class="beat-divisions" style="margin-left: ${leftMargin}px; margin-right: 0;">
                        ${cellsHtml}
                    </div>
                </div>
            `;
        }

        const staffDiv = document.createElement('div');
        staffDiv.className = 'answer-staff' + (document.body.classList.contains('tiles-skin') ? ' tiles-skin' : '') + (dense ? ' dense-staff' : '');
        // Dense (fit-to-viewport) spans the full width so the tiles — already sized to fit —
        // aren't scrolled inside a narrower staffPx-capped panel. Normal keeps min(100%,px).
        staffDiv.style.width = dense ? '100%' : `min(100%, ${staffPx}px)`;
        staffDiv.style.maxWidth = 'none';
        staffDiv.innerHTML = `
            <div class="answer-staff-label">Your Answer (${this.measureCount} measures)</div>
            ${rowsHtml}
        `;

        measureContainer.appendChild(staffDiv);
        container.appendChild(measureContainer);

        this.setupDropZones();
        this.userAnswer = Array(this.measureCount).fill(null).map(() => Array(bpm).fill(null));
      } catch (err) {
        // Surface the failure on-screen instead of silently leaving an empty
        // answer area, so it can be diagnosed without opening dev tools.
        const container = document.getElementById('measureContainer');
        if (container) {
            container.innerHTML = `<div style="background:#fff;color:#c0392b;padding:16px;border-radius:8px;font-size:0.85rem;">
                <strong>Could not build the answer staff.</strong><br>${err && err.message ? err.message : err}<br>
                <span style="color:#888;font-size:0.75rem;">${(err && err.stack ? err.stack.split('\n')[1] || '' : '').trim()}</span>
            </div>`;
        }
        console.error('updateMeasureDisplay failed:', err);
    }
    }

    // CHANGING-METER renderer. measureMeters = ['4/4','3/4',...]; each measure
    // gets its own beat count, and the time signature is drawn inline ONLY when it
    // changes from the previous measure (Hall's convention), restated at each line.
    updateMeasureDisplayMixed() {
      try {
        const container = document.getElementById('measureContainer');
        const mc = document.createElement('div'); mc.className = 'measure-container';
        const mm = this.measureMeters;
        const beatsOf = (ts) => this.beatsForMeter(ts);

        // Wrap measures into lines: cap at 3 measures/line (mixed meters get
        // cramped with more) and a beat budget as a backstop.
        const BEATS_PER_LINE = 16, MAX_PER_LINE = 3;
        const lines = []; let cur = [], curBeats = 0;
        mm.forEach((ts, i) => {
            const bt = beatsOf(ts);
            if (cur.length > 0 && (cur.length >= MAX_PER_LINE || curBeats + bt > BEATS_PER_LINE)) { lines.push(cur); cur = []; curBeats = 0; }
            cur.push(i); curBeats += bt;
        });
        if (cur.length) lines.push(cur);
        const maxBeats = Math.max.apply(null, lines.map((ln) => ln.reduce((s, i) => s + beatsOf(mm[i]), 0)));
        const staffPx = maxBeats * 150 + 180;

        const isComp = (ts) => { const t = +String(ts).split('/')[0]; return t === 6 || t === 9 || t === 12; };
        const beatImg = (ts) => `./rhythm-assets/mark/${isComp(ts) ? 'cd-dotted-quarter' : 'quarter'}.png`;
        let rowsHtml = '';
        let globalPrev = null;                       // previous measure's meter (across lines) for the equivalence marking
        lines.forEach((lineMeasures) => {
            let prevTs = null;                       // restate the time sig at each line start
            let cells = '';
            lineMeasures.forEach((mi) => {
                const ts = mm[mi]; const parts = ts.split('/'); const bts = beatsOf(ts);
                let tsShown = false;
                if (ts !== prevTs) {                 // show the time sig on first measure / any change
                    // At a SIMPLE<->COMPOUND change, the beat stays equal: show
                    // [prev beat] = [new beat] right after the measure number.
                    const showEquiv = globalPrev !== null && isComp(ts) !== isComp(globalPrev);
                    const equiv = showEquiv ? `<span class="ts-equiv"><img src="${beatImg(globalPrev)}"><b>=</b><img src="${beatImg(ts)}"></span>` : '';
                    // Top row: measure number, then (if a simple<->compound change)
                    // the beat-equivalence image directly to its right.
                    const top = `<span class="ts-top"><span class="mnum">${mi + 1}</span>${equiv}</span>`;
                    cells += `<div class="answer-ts-inline">${top}<div class="ts-stack"><span>${parts[0]}</span><span>${parts[1]}</span></div></div>`;
                    tsShown = true;
                }
                prevTs = ts; globalPrev = ts;
                for (let b = 1; b <= bts; b++) {
                    const isEnd = b === bts;
                    const isFinal = (mi === mm.length - 1) && isEnd;
                    const cellTop = (b === 1 && !tsShown) ? `<span class="ts-top"><span class="mnum">${mi + 1}</span></span>` : '';
                    cells += `<div class="beat-drop-zone${isEnd ? ' measure-end' : ''}${isFinal ? ' final-cell' : ''}" data-beat="${b}" data-measure="${mi + 1}">${cellTop}<div class="beat-notation"></div></div>`;
                }
            });
            rowsHtml += `
                <div class="staff-container">
                    <div class="staff-lines"><div class="staff-line"></div></div>
                    <div class="beat-divisions" style="margin-left: 14px; margin-right: 0;">${cells}</div>
                </div>`;
        });

        const staffDiv = document.createElement('div');
        staffDiv.className = 'answer-staff' + (document.body.classList.contains('tiles-skin') ? ' tiles-skin' : '');
        // Fill the available width (capped on ultra-wide screens); every line
        // stretches to this same width.
        staffDiv.style.width = 'min(100%, 1600px)';
        staffDiv.style.maxWidth = 'none';
        staffDiv.innerHTML = `
            <div class="answer-staff-label">Your Answer (${mm.length} measures · changing meter)</div>
            ${rowsHtml}`;
        mc.appendChild(staffDiv); container.appendChild(mc);

        this.setupDropZones();
        this.userAnswer = mm.map((ts) => Array(beatsOf(ts)).fill(null));
      } catch (err) {
        const container = document.getElementById('measureContainer');
        if (container) container.innerHTML = `<div style="background:#fff;color:#c0392b;padding:16px;border-radius:8px;font-size:0.85rem;"><strong>Could not build the changing-meter staff.</strong><br>${err && err.message ? err.message : err}</div>`;
        console.error('updateMeasureDisplayMixed failed:', err);
      }
    }


    setupDragAndDrop() {
        const tiles = document.querySelectorAll('.rhythm-tile');

        tiles.forEach(tile => {
            tile.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', tile.dataset.patternId);
                tile.classList.add('dragging');
                this.currentDragPattern = tile.dataset.patternId;
                // High-contrast drag image (white card + dark glyph) so the note
                // is visible on ANY theme bg — the browser's default snapshot of
                // the Arcade tile drops the invert filter and looks dark.
                const di = this.buildDragImage(tile);
                try { e.dataTransfer.setDragImage(di, 52, 35); } catch (err) {}
                setTimeout(() => di.remove(), 0);
            });

            tile.addEventListener('dragend', () => {
                tile.classList.remove('dragging');
                this.currentDragPattern = null;
                this.clearDragHighlights();
            });

            // Mobile touch drag support
            let isTouchDragging = false;
            let startX, startY;

            tile.addEventListener('touchstart', (e) => {
                isTouchDragging = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                this.currentDragPattern = tile.dataset.patternId;
                tile.classList.add('dragging');
                this.createDragPreview(tile, e.touches[0].clientX, e.touches[0].clientY);
                e.preventDefault();
            }, { passive: false });

            tile.addEventListener('touchmove', (e) => {
                if (!isTouchDragging) return;
                const touch = e.touches[0];
                this.updateDragPreview(touch.clientX, touch.clientY);

                // Highlight the cell under the PREVIEW (which floats above the finger),
                // not under the fingertip.
                const dropZone = this.dropZoneUnderPreview(touch);
                this.clearDragHighlights();
                if (dropZone) this.highlightDragTarget(dropZone, true);
                if (this.dragBeatLabel) {
                    this.dragBeatLabel.textContent = dropZone ? ('Beat ' + dropZone.dataset.beat) : '';
                    this.dragBeatLabel.style.opacity = dropZone ? '1' : '0';
                }
                e.preventDefault();
            }, { passive: false });

            tile.addEventListener('touchend', (e) => {
                if (!isTouchDragging) return;
                const touch = e.changedTouches[0];
                const dropZone = this.dropZoneUnderPreview(touch);

                if (dropZone) {
                    const measure = parseInt(dropZone.dataset.measure);
                    const beat = parseInt(dropZone.dataset.beat);
                    this.placeTile(dropZone, tile.dataset.patternId, measure, beat);
                }

                isTouchDragging = false;
                tile.classList.remove('dragging');
                this.currentDragPattern = null;
                this.clearDragHighlights();
                this.removeDragPreview();
                e.preventDefault();
            }, { passive: false });
        });
    }

    // Build a theme-agnostic drag image: a white card with the glyph in its
    // native (dark) ink, so it reads on light AND dark backgrounds.
    buildDragImage(tile) {
        // Drag ghost = an EXACT clone of the tile (same image, same size, same
        // styling/theme), so what you drag looks identical to the tile and to what
        // locks into the slot — no re-rendered/skewed card.
        const card = tile.cloneNode(true);
        card.querySelectorAll('.remove-btn, .drag-beat').forEach((n) => n.remove());
        // Freeze the tile's on-screen size so the rasterized native drag image and
        // the touch preview both match the tile exactly.
        const r = tile.getBoundingClientRect();
        card.style.position = 'fixed';
        card.style.top = '-2000px';
        card.style.left = '-2000px';
        card.style.margin = '0';
        card.style.width = (r.width || 104) + 'px';
        card.style.height = (r.height || 94) + 'px';
        card.style.pointerEvents = 'none';
        card.style.zIndex = '10000';
        card.style.opacity = '0.96';
        // CRITICAL: the tile class carries `transition: all .4s`; without this the
        // cloned preview EASES toward each touch position (flies in from off-screen,
        // then lags/jumps behind the finger). The ghost must track instantly.
        card.style.transition = 'none';
        // Beat badge floats ABOVE the preview so it's never under the finger.
        const num = document.createElement('div');
        num.className = 'drag-beat';
        num.style.cssText = 'position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);' +
            'font:600 11px/1 system-ui,sans-serif;letter-spacing:.03em;color:#fff;background:rgba(20,20,28,.8);' +
            'border-radius:6px;padding:2px 7px;box-shadow:0 1px 4px rgba(0,0,0,.3);white-space:nowrap;opacity:0;transition:opacity .1s';
        card.appendChild(num);
        this.dragBeatLabel = num;
        document.body.appendChild(card);
        return card;
    }

    createDragPreview(originalTile, x, y) {
        this.removeDragPreview();
        this.dragPreview = this.buildDragImage(originalTile); // white card, follows the finger
        this.updateDragPreview(x, y);
    }

    updateDragPreview(x, y) {
        if (!this.dragPreview) return;
        this.dragPreview.style.left = (x - 20) + 'px';
        // Lift the preview well above the fingertip so the finger doesn't cover it.
        this.dragPreview.style.top = (y - 96) + 'px';
    }

    removeDragPreview() {
        if (this.dragPreview) {
            this.dragPreview.remove();
            this.dragPreview = null;
        }
    }

    // Cell under the PREVIEW (which floats above the finger), so the highlight/drop
    // follow what the user sees. Falls back to the touch point if no preview.
    dropZoneUnderPreview(touch) {
        let px = touch.clientX, py = touch.clientY;
        if (this.dragPreview) {
            const r = this.dragPreview.getBoundingClientRect();
            px = r.left + r.width / 2;
            py = r.top + r.height * 0.62;   // ~ where the notehead lands in the preview
        }
        const el = document.elementFromPoint(px, py);
        return el ? el.closest('.beat-drop-zone') : null;
    }

    setupDropZones() {
        const dropZones = document.querySelectorAll('.beat-drop-zone');

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.highlightDragTarget(zone, true);
            });

            zone.addEventListener('dragleave', () => {
                this.clearDragHighlights();
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.clearDragHighlights();

                const patternId = e.dataTransfer.getData('text/plain');
                const measure = parseInt(zone.dataset.measure);
                const beat = parseInt(zone.dataset.beat);

                this.placeTile(zone, patternId, measure, beat);
            });
        });
    }

    highlightDragTarget(zone, isOver) {
        if (!this.currentDragPattern) return;

        const measure = parseInt(zone.dataset.measure);
        const beat = parseInt(zone.dataset.beat);
        const pattern = this.rhythmPatterns[this.currentDifficulty].find(p => p.id === this.currentDragPattern);

        if (!pattern) return;

        const beatsNeeded = pattern.beats;
        const endBeat = beat + beatsNeeded - 1;

        // Check if pattern fits
        if (endBeat > this.beatsPerMeasure) return;

        // Highlight all beats this pattern would occupy
        for (let b = beat; b <= endBeat; b++) {
            const targetZone = document.querySelector(`.beat-drop-zone[data-measure="${measure}"][data-beat="${b}"]`);
            if (targetZone && isOver) {
                targetZone.classList.add('drag-over');
            }
        }
    }

    clearDragHighlights() {
        document.querySelectorAll('.beat-drop-zone').forEach(zone => {
            zone.classList.remove('drag-over');
        });
    }

    // Cross-family pattern lookup (searches EVERY registered figure set, not just
    // the current difficulty) so callers like the solo tap-back overlay can resolve
    // any id regardless of which bank is active.
    findPatternAny(patternId) {
        const rp = this.rhythmPatterns || {};
        for (const k in rp) {
            const set = rp[k];
            if (!Array.isArray(set)) continue;
            const f = set.find(p => p.id === patternId);
            if (f) return f;
        }
        return null;
    }

    // Draw a figure's placement ART into `notationArea` exactly the way placeTile
    // does (one-beat figDir SVG, split single-note glyphs, or a single pattern
    // image), so a READ-ONLY staff (e.g. the tap-back overlay) renders identically
    // to the answer board. Does NOT touch userAnswer or add a remove button.
    renderPatternArt(notationArea, patternId, beatsNeeded) {
        /* THE ANSWER RENDERER — `?renderer=hybrid|vexflow`, default off. This is the seam VISION §8
           item 2 names: the placed answer, not the chooser bank.

           It dispatches BEFORE the tiles-skin branch on purpose. BeatQuest Casual renders through
           that branch, and it returns early; putting VexFlow after it meant Casual kept its PNGs
           while the PRO staff drew notation — the same figure, two different images, which is the
           exact property the shared sizing exists to guarantee. Codex caught it.

           The PRO staff otherwise draws each figure as separate SVG note glyphs positioned at their
           beat offsets (NOTE_DECOMPOSITION + GLYPH_NOTEHEAD_OFFSET). VexFlow draws the figure once
           and pins each notehead to its true onset (strictOnsetProfiles) — the same job, done once.

           `!meterFigDir(patternId)` excludes EVERY meter-specific figure family, not just compound:
           `cd-` `hb-` `dh-` `de-` `tpl-` (see METER_FIG_DIRS). Those have their own staff-spanning
           SVGs. `hasFigure()` then decides the rest. Any miss falls through to the art below;
           renderFigure() returns false rather than throwing. */
          /* THE ANSWER AREA IS VexFlow. The goal (owner): all-VexFlow answer, all-PNG bank.
             On THESE pages the meter-specific families (`cd- hb- dh- de- tpl-`, filtered by
             meterFigDir) and whole/dotted-half/half-rest still render PNG — a deliberate gate HERE
             (they use staff-spanning SVGs, and the adapter's hasFigure() declines them), NOT a
             shared-renderer limitation. RhythmQuest already draws the meter families through the
             shared renderer as VexFlow (renderAssetOnly, but they hit its custom-beaming/tuplet
             exceptions — see VISION §8). Routing these pages onto that takes TWO changes, not done
             yet: widen the adapter's COVERED_IDS to include the meter families (today hasFigure()
             declines them) AND drop this `!meterFigDir` guard. Dropping the guard alone changes
             nothing, since hasFigure() would still return false for those ids.

             The host is sized like the redesign's .placed-vex-host — it fills the cell box
             (width = beats * cell); the SHARED renderer's own layout (renderPlacedVex ->
             normalizePlacedVex) places the notation. NOT height:100%, which read the oversized staff
             panel and blew the glyph to ~180px beside a ~90px PNG. */
          const VXF = window.RhythmVexFlow;
          if (VXF && VXF.mode() !== 'png' && !meterFigDir(patternId) && VXF.hasFigure(patternId)) {
              const host = document.createElement('div');
              host.className = 'placed-note placed-vexflow';
              host.style.width = ((beatsNeeded || 1) * 100) + '%';
              notationArea.appendChild(host);
              if (VXF.renderFigure(host, patternId)) return;
              host.remove();   // it declined; fall through to the art
          }

        // ── CASUAL TILES-SKIN placement (OWNER-APPROVED FINAL — "that's perfect", 2026-07-05) ──
        // WHY the app has two asset sets: the PRO staff uses wide, staff-spanning SVGs
        // (rhythm-assets/<figDir>/<id>.svg) whose noteheads land exactly on their beat
        // onsets across the cell. The BANK uses a compact PNG (rhythm-assets/bank/<id>.png).
        // In the tiles skin there is no staff, so the placed figure must look IDENTICAL to
        // the bank tile + drag ghost → we place the SAME bank PNG here.
        //
        // CRITICAL for multi-beat figures (half, dotted-quarter+eighth, syncopation…):
        // do NOT stretch the glyph to beats*100% — that BLOWS UP a half note (too big +
        // mis-placed). Keep it at NATURAL one-beat size (width 100%) sitting in its own
        // beat cell; the MERGED green cells (see beatquest-casual.html .filled/.continuation
        // merge rules) form the larger container that lights up across the figure's beats.
        // Net: a normal-size half note in beat 1, inside one green tile spanning both beats.
        if (document.body.classList.contains('tiles-skin')) {
            const dec = NOTE_DECOMPOSITION[patternId];
            // MULTI-NOTE figure spanning >1 beat (dotted-quarter+eighth, eighth-quarter-eighth…):
            // the single bank PNG squishes BOTH notes into beat 1, so the later note lands in the
            // wrong place. Instead place each note's glyph at its beat OFFSET (exactly like the PRO
            // staff's decomposition branch) so e.g. the eighth lands on the "and of 2". The head
            // cell has overflow:visible so a glyph at left>100% spans into the continuation cell.
            if (dec && dec.length > 1 && (beatsNeeded || 1) > 1) {
                dec.forEach(part => {
                    const g = noteGlyphs[part.glyph]; if (!g) return;
                    const gimg = document.createElement('img');
                    gimg.src = `./rhythm-assets/${g.file}`;
                    gimg.className = 'placed-tiled-glyph';
                    gimg.style.width = '100%';
                    gimg.style.left = (part.offset * 100 - GLYPH_NOTEHEAD_OFFSET) + '%';
                    gimg.alt = `${patternId}:${part.glyph}`;
                    notationArea.appendChild(gimg);
                });
                return;
            }
            // Single-note (half) or one-beat figures: the natural-size bank PNG (never beats*100%,
            // which blows up a half note); the merged green cells form the spanning container.
            const timg = document.createElement('img');
            timg.src = `./rhythm-assets/${bankDir()}/${patternId}.png`;
            timg.className = 'placed-note';
            timg.style.width = '100%';
            timg.alt = patternId;
            notationArea.appendChild(timg);
            return;
        }
        const decomposition = NOTE_DECOMPOSITION[patternId];
        const asset = this.rhythmAssets[patternId];
        const figDir = meterFigDir(patternId);

        if (figDir) {
            const img = document.createElement('img');
            img.src = `./rhythm-assets/${figDir}/${patternId}.svg`;
            img.className = 'placed-note placed-compound';
            img.style.width = '100%';
            img.style.left = '-9.2%';   // stave-padding shift so onset lands on the beat
            img.alt = patternId;
            notationArea.appendChild(img);
        } else if (decomposition) {
            decomposition.forEach(part => {
                const g = noteGlyphs[part.glyph];
                if (!g) return;
                const gimg = document.createElement('img');
                gimg.src = `./rhythm-assets/${g.file}`;
                gimg.className = 'placed-note placed-glyph';
                gimg.style.width = '100%';
                gimg.style.left = (part.offset * 100 - GLYPH_NOTEHEAD_OFFSET) + '%';
                gimg.alt = `${patternId}:${part.glyph}`;
                notationArea.appendChild(gimg);
            });
        } else if (asset) {
            const img = document.createElement('img');
            img.src = `./rhythm-assets/${asset.file}`;
            img.className = 'placed-note';
            img.style.width = ((beatsNeeded || 1) * 100) + '%';
            img.style.left = (-GLYPH_NOTEHEAD_OFFSET) + '%';
            img.alt = asset.name;
            notationArea.appendChild(img);
        } else {
            notationArea.insertAdjacentHTML('beforeend', `<span style="color: red; font-size: 0.7rem;">Missing: ${patternId}</span>`);
        }
    }

    placeTile(dropZone, patternId, measure, beat) {
        const pattern = this.rhythmPatterns[this.currentDifficulty].find(p => p.id === patternId);
        if (!pattern) return;

        const beatsNeeded = pattern.beats;
        const startBeat = beat;
        const endBeat = startBeat + beatsNeeded - 1;

        // Check if we have enough space (don't go beyond this measure's beat count)
        if (endBeat > this.beatsPerMeasure) {
            return;
        }

        // Drag-to-replace: if any target beat is occupied, remove the pattern(s)
        // occupying it first (find each occupant's start beat), then place the new
        // one. No alignment/grid logic changes — only what happens on overlap.
        for (let b = startBeat; b <= endBeat; b++) {
            if (this.userAnswer[measure - 1][b - 1] !== null) {
                let sb = b;
                while (sb >= 1) {
                    const v = this.userAnswer[measure - 1][sb - 1];
                    if (v && !String(v).includes('_continuation')) break; // sb = occupant start
                    sb--;
                }
                if (sb >= 1) this.removeTile(measure, sb);
            }
        }

        // Place the pattern in the first beat and mark subsequent beats as occupied
        for (let b = startBeat; b <= endBeat; b++) {
            const targetZone = document.querySelector(`.beat-drop-zone[data-measure="${measure}"][data-beat="${b}"]`);
            const notationArea = targetZone.querySelector('.beat-notation');

            if (b === startBeat) {
                notationArea.innerHTML = `<button class="remove-btn" onclick="rhythmStudent.removeTile(${measure}, ${startBeat})">×</button>`;
                // Draw the placement art (figDir SVG / split glyphs / single image)
                // via the shared renderer so the tap-back overlay can reuse it.
                this.renderPatternArt(notationArea, pattern.id, beatsNeeded);
                targetZone.classList.add('filled');
                this.userAnswer[measure - 1][b - 1] = patternId;
            } else {
                // Subsequent beats are spanned by the first beat's note image,
                // so leave them visually empty (just mark them occupied).
                notationArea.innerHTML = '';
                targetZone.classList.add('filled', 'continuation');
                this.userAnswer[measure - 1][b - 1] = `${patternId}_continuation`;
            }
        }

        // Send answer to teacher (in real implementation)
        this.sendAnswerToTeacher(measure, startBeat, patternId);
        if (this.onAnswerChanged) this.onAnswerChanged();
    }


    removeTile(measure, beat) {
        // Find the pattern that starts at this beat
        const patternId = this.userAnswer[measure - 1][beat - 1];
        if (!patternId || patternId.includes('_continuation')) return;

        const pattern = this.rhythmPatterns[this.currentDifficulty].find(p => p.id === patternId);
        if (!pattern) return;

        const beatsToRemove = pattern.beats;
        const startBeat = beat;
        const endBeat = startBeat + beatsToRemove - 1;

        // Remove the pattern from all beats it occupies
        for (let b = startBeat; b <= endBeat; b++) {
            const targetZone = document.querySelector(`.beat-drop-zone[data-measure="${measure}"][data-beat="${b}"]`);
            const notationArea = targetZone.querySelector('.beat-notation');

            notationArea.innerHTML = '';
            targetZone.classList.remove('filled', 'continuation');
            this.userAnswer[measure - 1][b - 1] = null;
        }

        // Send removal to teacher
        this.sendAnswerToTeacher(measure, beat, null);
        if (this.onAnswerChanged) this.onAnswerChanged();
    }

    // True only when EVERY beat of every measure holds a figure (no empty beats).
    isComplete() {
        if (!this.userAnswer || !this.userAnswer.length) return false;
        return this.userAnswer.every(row => row.every(cell => cell !== null && cell !== undefined));
    }

    sendAnswerToTeacher(measure, beat, patternId) {
        // In a real implementation, this would send to WebSocket server
        console.log(`Student answer: Measure ${measure}, Beat ${beat} = ${patternId}`);
    }

    playRhythm(notes, tempo) {
        this.showFeedback('Playing rhythm...', 'info');
        this.playWithWebAudio(notes, tempo);
        setTimeout(() => this.clearFeedback(), notes.length * 600);
    }

    playWithWebAudio(allNotes, tempo) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        let currentTime = audioContext.currentTime + 0.1;
        const beatDuration = 60 / tempo;

        allNotes.forEach((note) => {
            if (!note.duration.includes('r')) {
                const frequency = 800;
                const duration = this.getNoteDuration(note.duration) * beatDuration;

                this.createClickSound(audioContext, frequency, duration, currentTime);
            }
            currentTime += this.getNoteDuration(note.duration) * beatDuration;
        });
    }

    createClickSound(audioContext, frequency, duration, startTime) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = 'square';

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 0.1));

        oscillator.start(startTime);
        oscillator.stop(startTime + Math.min(duration, 0.1));
    }

    getNoteDuration(duration) {
        const durationMap = {
            'w': 4, 'h': 2, 'hd': 3, 'q': 1, 'qd': 1.5,
            '8': 0.5, '8d': 0.75, '16': 0.25, '32': 0.125,
            'wr': 4, 'hr': 2, 'qr': 1, '8r': 0.5, '16r': 0.25
        };

        if (duration.includes('triplet') || duration === '8t') {
            return (2/3) * 0.5;
        }

        return durationMap[duration] || 1;
    }

    revealBeat(beatNumber) {
        if (!this.revealedBeats.includes(beatNumber)) {
            this.revealedBeats.push(beatNumber);

            // Highlight the revealed beat
            const dropZones = document.querySelectorAll(`[data-beat="${beatNumber}"]`);
            dropZones.forEach(zone => {
                zone.classList.add('revealed');
            });

            this.showFeedback(`Beat ${beatNumber} revealed by teacher!`, 'info');
            setTimeout(() => this.clearFeedback(), 2000);
        }
    }

    revealAll(rhythm) {
        this.revealedBeats = [1, 2, 3, 4];

        // Highlight all beats
        const allDropZones = document.querySelectorAll('.drop-zone');
        allDropZones.forEach(zone => {
            zone.classList.add('revealed');
        });

        this.showFeedback('All beats revealed! Check your answers.', 'info');
        setTimeout(() => this.clearFeedback(), 3000);
    }

    clearAnswers() {
        document.querySelectorAll('.beat-drop-zone').forEach(zone => {
            zone.querySelector('.beat-notation').innerHTML = '';
            zone.classList.remove('filled', 'revealed', 'continuation');
        });
        this.userAnswer = Array(this.measureCount).fill(null).map(() => Array(this.beatsPerMeasure || 4).fill(null));
    }

    showFeedback(message, type) {
        const feedback = document.getElementById('feedback');
        feedback.textContent = message;
        feedback.className = `feedback ${type}`;
        feedback.style.display = 'block';
    }

    clearFeedback() {
        const feedback = document.getElementById('feedback');
        feedback.style.display = 'none';
        feedback.className = 'feedback';
    }
}

// Initialize the student system.
// Must be on window (not a module-scoped `let`) so the inline
// onclick="rhythmStudent.removeTile(...)" on remove buttons can resolve it.
window.rhythmStudent = null;
document.addEventListener('DOMContentLoaded', () => {
    window.rhythmStudent = new RhythmStudent();
});