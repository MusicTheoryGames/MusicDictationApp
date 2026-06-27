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

// A glyph's notehead centre sits ~14% in from the glyph's left edge (VexFlow
// stave padding). Subtract that so a note placed at beat offset N lands its
// NOTEHEAD on beat N's onset, not 14% past it.
const GLYPH_NOTEHEAD_OFFSET = 14;

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

    joinSession() {
        console.log('joinSession called');
        this.studentName = document.getElementById('studentName').value.trim();
        this.roomCode = document.getElementById('roomCode').value.trim().toUpperCase();
        console.log('Name:', this.studentName, 'Room:', this.roomCode);

        if (!this.studentName || !this.roomCode) {
            this.showFeedback('Please enter both your name and room code', 'error');
            return;
        }

        // Hide login form, show game area
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('gameArea').classList.add('active');

        // Update UI
        document.getElementById('connectedRoom').textContent = this.roomCode;
        document.getElementById('connectionStatus').textContent = 'Connected';

        this.connected = true;

        // In a real implementation, this would connect to WebSocket server
        this.setupWebSocket();
        this.showFeedback('Connected to rhythm session!', 'success');

        // Initialize with default settings
        this.updateGameSettings({
            measureCount: 2,
            difficulty: 'medium',
            tempo: 100
        });
    }

    setupWebSocket() {
        // In a real implementation, this would connect to your server
        // For now, we'll simulate receiving messages from teacher
        console.log(`Student ${this.studentName} connected to room ${this.roomCode}`);

        // Simulate receiving initial settings
        setTimeout(() => {
            this.handleTeacherMessage('new-rhythm', {
                measureCount: 2,
                difficulty: 'medium',
                tempo: 100
            });
        }, 1000);
    }

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

        const patterns = this.rhythmPatterns[this.currentDifficulty];

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
        console.log('Loading PNG asset for pattern:', pattern.id);

        try {
            // Clear container
            container.innerHTML = '';

            // Compound figures (cd-*) have their own centered bank PNGs.
            if (pattern.id && pattern.id.indexOf('cd-') === 0) {
                const cimg = document.createElement('img');
                cimg.src = `./rhythm-assets/bank/${pattern.id}.png`;
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
            img.src = `./rhythm-assets/bank/${asset.file.replace(/\.svg$/, '.png')}`;
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

        // Create single continuous staff container
        const measureContainer = document.createElement('div');
        measureContainer.className = 'measure-container';

        const [tsTop, tsBottom] = (this.timeSignature || '4/4').split('/');
        const bpm = this.beatsPerMeasure || this.beatsForMeter(this.timeSignature || '4/4');

        // Wrap measures onto multiple staff lines, 4 bars per line. One
        // .answer-staff panel holds MULTIPLE .staff-container rows stacked
        // vertically (a page of music), NOT separate panels.
        const BARS_PER_LINE = 4;
        const totalMeasures = this.measureCount;
        const lineCount = Math.ceil(totalMeasures / BARS_PER_LINE);
        // Cells in a full line. Used to size the staff so each beat-cell is up to
        // ~160px: the panel widens on big screens (bigger notes) instead of being
        // capped at 1500, and the per-cell cap keeps notes from ever colliding
        // with the beat numbers.
        const cellsPerLineFull = Math.min(totalMeasures, BARS_PER_LINE) * bpm;
        const staffPx = cellsPerLineFull * 160 + 140;

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
        staffDiv.className = 'answer-staff';
        staffDiv.style.width = `min(100%, ${staffPx}px)`;   // widen on big screens, cap cell size
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

                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const dropZone = elementBelow?.closest('.beat-drop-zone');
                this.clearDragHighlights();
                if (dropZone) this.highlightDragTarget(dropZone, true);
                e.preventDefault();
            }, { passive: false });

            tile.addEventListener('touchend', (e) => {
                if (!isTouchDragging) return;
                const touch = e.changedTouches[0];
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const dropZone = elementBelow?.closest('.beat-drop-zone');

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
        const card = document.createElement('div');
        card.className = 'drag-preview';
        card.style.cssText = 'position:fixed;top:-2000px;left:-2000px;width:104px;height:70px;' +
            'background:#fff;border:2px solid #111;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.45);' +
            'display:flex;align-items:center;justify-content:center;padding:8px;box-sizing:border-box;' +
            'pointer-events:none;z-index:10000';
        const img = tile.querySelector('img');
        if (img) {
            const c = img.cloneNode(true);
            c.style.cssText = 'width:100%;height:100%;object-fit:contain;filter:none;mix-blend-mode:normal';
            card.appendChild(c);
        }
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
        this.dragPreview.style.top = (y - 40) + 'px';
    }

    removeDragPreview() {
        if (this.dragPreview) {
            this.dragPreview.remove();
            this.dragPreview = null;
        }
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
        if (endBeat > 4) return;

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

    placeTile(dropZone, patternId, measure, beat) {
        const pattern = this.rhythmPatterns[this.currentDifficulty].find(p => p.id === patternId);
        if (!pattern) return;

        const beatsNeeded = pattern.beats;
        const startBeat = beat;
        const endBeat = startBeat + beatsNeeded - 1;

        // Check if we have enough space (don't go beyond beat 4 or into next measure)
        if (endBeat > 4) {
            alert(`Not enough space! This pattern needs ${beatsNeeded} beats.`);
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
                // First beat gets a copy of the tile's VexFlow notation
                const sourceTile = document.getElementById(`notation-${pattern.id}`);
                console.log('Source tile found:', sourceTile);
                console.log('Has child:', sourceTile?.firstChild);

                const decomposition = NOTE_DECOMPOSITION[pattern.id];
                const asset = this.rhythmAssets[pattern.id];

                notationArea.innerHTML = `<button class="remove-btn" onclick="rhythmStudent.removeTile(${measure}, ${startBeat})">×</button>`;

                if (pattern.id && pattern.id.indexOf('cd-') === 0) {
                    // Compound figure: one dotted-quarter beat. Place the whole
                    // pre-rendered figure spanning the cell (compound/ SVGs).
                    const img = document.createElement('img');
                    img.src = `./rhythm-assets/compound/${pattern.id}.svg`;
                    img.className = 'placed-note placed-compound';
                    img.style.width = '100%';
                    img.style.left = '0';
                    img.alt = pattern.id;
                    notationArea.appendChild(img);
                } else if (decomposition) {
                    // SPLIT placement: drop each single-note glyph at its beat
                    // offset. Each glyph is a single note in a 200px-per-beat
                    // canvas, shown at one beat-cell wide -> identical notehead
                    // scale to every other note, positioned on its true beat.
                    decomposition.forEach(part => {
                        const g = noteGlyphs[part.glyph];
                        if (!g) return;
                        const gimg = document.createElement('img');
                        gimg.src = `./rhythm-assets/${g.file}`;
                        gimg.className = 'placed-note placed-glyph';
                        gimg.style.width = '100%';                  // one beat wide
                        // beat offset, minus the glyph's internal notehead inset so
                        // the notehead lands on the beat onset.
                        gimg.style.left = (part.offset * 100 - GLYPH_NOTEHEAD_OFFSET) + '%';
                        gimg.alt = `${pattern.id}:${part.glyph}`;
                        notationArea.appendChild(gimg);
                    });
                    console.log('Split glyphs placed for pattern:', pattern.id);
                } else if (asset) {
                    // Single pattern image (1-beat and beamed patterns).
                    const img = document.createElement('img');
                    img.src = `./rhythm-assets/${asset.file}`;
                    img.className = 'placed-note';
                    img.style.width = (beatsNeeded * 100) + '%';
                    // Same notehead-inset shift as glyphs so the first note lands
                    // on the beat onset and patterns/glyphs align consistently.
                    img.style.left = (-GLYPH_NOTEHEAD_OFFSET) + '%';
                    img.alt = asset.name;
                    notationArea.appendChild(img);
                } else {
                    console.warn('No asset found for pattern:', pattern.id);
                    notationArea.insertAdjacentHTML('beforeend', `<span style="color: red; font-size: 0.7rem;">Missing: ${pattern.id}</span>`);
                }
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