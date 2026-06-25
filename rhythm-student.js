// Import rhythm assets
import { rhythmAssets } from './rhythm-assets/rhythm-assets.js';

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
        this.tempo = 100;
        this.timeSignature = '4/4';
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

        // Fit to screen button
        document.getElementById('fitToScreenBtn').addEventListener('click', () => this.toggleFitToScreen());
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

        // Remove splash screen background
        document.body.classList.remove('login-mode');

        // Update UI
        document.getElementById('connectedRoom').textContent = `Room: ${this.roomCode}`;
        document.getElementById('connectionStatus').classList.add('connected');

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

        // Note: Initial settings are already handled in joinSession()
        // This would normally set up WebSocket listeners for teacher messages
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

    updateGameSettings(settings) {
        this.measureCount = settings.measureCount;
        this.currentDifficulty = settings.difficulty;
        this.tempo = settings.tempo;

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

        // Setup drag and drop after all tiles are rendered
        setTimeout(() => this.setupDragAndDrop(), patterns.length * 50 + 100);
    }

    renderVexFlowNotation(pattern, container, beatsNeeded) {
        try {
            // Clear container
            container.innerHTML = '';

            // Calculate appropriate width for the notation based on beats needed
            const containerWidth = beatsNeeded * 80; // 80px per beat
            const containerHeight = 120; // Make it taller temporarily to see VexFlow content

            // Create VexFlow renderer
            const VF = Vex.Flow;
            const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
            renderer.resize(containerWidth, containerHeight);

            const context = renderer.getContext();
            context.setFont('Arial', 10);

            // Create a single-line percussion stave - center it vertically in the container
            const stave = new VF.Stave(10, containerHeight / 2 - 10, containerWidth - 20);
            stave.setContext(context);
            stave.addClef('percussion');

            // Draw only the single staff line (percussion style)
            stave.draw();

            // Convert pattern to VexFlow notes
            const notes = this.convertPatternToVexFlowNotes(pattern);

            if (notes.length === 0) {
                throw new Error(`No notes generated for pattern: ${pattern.id}`);
            }

            // Create voice for the notes
            const voice = new VF.Voice({
                num_beats: beatsNeeded,
                beat_value: 4
            }).setStrict(false);

            voice.addTickables(notes);

            // Format and draw the voice on the stave
            const formatter = new VF.Formatter();
            formatter.joinVoices([voice]).format([voice], containerWidth - 40);

            voice.draw(context, stave);

            console.log(`VexFlow notation rendered for ${pattern.id}`);

        } catch (error) {
            console.error('Error rendering VexFlow notation:', error);
            container.innerHTML = `<div style="color: red; font-size: 0.7rem;">VexFlow Error<br>${pattern.id}</div>`;
        }
    }

    convertPatternToVexFlowNotes(pattern) {
        const VF = Vex.Flow;
        const notes = [];

        if (!pattern.vexflow || !Array.isArray(pattern.vexflow)) {
            console.warn(`Pattern ${pattern.id} has no vexflow data`);
            return notes;
        }

        try {
            pattern.vexflow.forEach((noteData, index) => {
                let note;

                if (noteData.duration.includes('r')) {
                    // Rest note
                    note = new VF.StaveNote({
                        keys: ['b/4'],
                        duration: noteData.duration.replace('r', '') + 'r'
                    });
                } else {
                    // Regular note - use percussion clef positioning
                    note = new VF.StaveNote({
                        keys: noteData.keys || ['b/4'],
                        duration: noteData.duration,
                        stem_direction: VF.StaveNote.STEM_DOWN
                    });
                }

                if (noteData.dots) {
                    note.addDotToAll();
                }

                notes.push(note);
            });

            // Handle triplets
            if (pattern.triplet && notes.length >= 3) {
                const tuplet = new VF.Tuplet(notes.slice(0, 3));
                // Store tuplet reference for later rendering
                notes.tuplet = tuplet;
            }

        } catch (error) {
            console.error(`Error converting pattern ${pattern.id} to VexFlow:`, error);
            console.error('Pattern data:', pattern.vexflow);
        }

        return notes;
    }

    renderTileNotation(pattern, container) {
        console.log('Loading PNG asset for pattern:', pattern.id);

        try {
            // Clear container
            container.innerHTML = '';

            // Check if we have an asset for this pattern
            const asset = this.rhythmAssets[pattern.id];
            if (!asset) {
                console.warn(`No PNG asset found for pattern: ${pattern.id}`);
                container.innerHTML = `<div style="color: red; text-align: center; padding: 5px; font-size: 0.7rem;">Asset Missing<br>${pattern.id}</div>`;
                return;
            }

            // Create img element to load the SVG
            const img = document.createElement('img');
            img.src = `./rhythm-assets/${asset.file}`;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.style.objectPosition = 'center top';
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
        const container = document.getElementById('measureContainer');
        container.innerHTML = '';

        // Create VexFlow staff container
        const staffContainer = document.createElement('div');
        staffContainer.className = 'vexflow-staff-container';
        staffContainer.id = 'vexflow-staff';
        staffContainer.style.height = '180px';
        staffContainer.style.position = 'relative';
        // Width + horizontal centering are set in createSharedVexFlowStave()
        // once the exact stave width is known (keeps drop zones aligned to notes).

        container.appendChild(staffContainer);

        // Create the shared VexFlow stave
        this.createSharedVexFlowStave();

        // Create invisible drop zones overlaid on the stave
        this.createDropZones();
        this.setupDropZones();

        this.userAnswer = Array(this.measureCount).fill(null).map(() => Array(4).fill(null));
    }

    createSharedVexFlowStave() {
        const container = document.getElementById('vexflow-staff');
        container.innerHTML = '';

        const VF = Vex.Flow;

        // Calculate width based on number of measures - much smaller beatWidth to fit all 8 beats
        const totalBeats = this.measureCount * 4;
        const beatWidth = 85;  // Wide enough that beamed groups stay legible
        const clefWidth = 60;
        const timeSigWidth = 30;  // Also reduce this
        const barLineWidth = 10;  // Reduce bar line spacing
        const endBarWidth = 20;
        const staveX = 20;        // Left padding inside the SVG before the clef
        const totalWidth = staveX + clefWidth + timeSigWidth + (totalBeats * beatWidth) + (this.measureCount - 1) * barLineWidth + endBarWidth;

        // Size the container to the stave and center it (drop zones are absolutely
        // positioned relative to this container, so they travel with it and stay aligned).
        container.style.width = totalWidth + 'px';
        container.style.maxWidth = '100%';
        container.style.margin = '0 auto';

        // Create VexFlow renderer
        const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
        renderer.resize(totalWidth, 180);

        const context = renderer.getContext();

        // Create single-line percussion stave positioned lower so notes sit ON the line
        const stave = new VF.Stave(staveX, 80, totalWidth - 40);  // Move stave down so notes align with line
        stave.setContext(context);
        stave.addClef('percussion');
        stave.addTimeSignature(this.timeSignature);

        // Configure for single line percussion display
        stave.setNumLines(1);

        // Add measure bar lines
        for (let i = 1; i < this.measureCount; i++) {
            const barX = clefWidth + timeSigWidth + (i * 4 * beatWidth) + (i - 1) * barLineWidth;
            stave.setBegBarType(VF.Barline.type.SINGLE);
        }

        // Add end bar line
        stave.setEndBarType(VF.Barline.type.END);

        // Draw the stave
        stave.draw();

        // Store reference to the stave for adding notes later
        this.sharedStave = stave;
        this.sharedContext = context;
        this.sharedRenderer = renderer;
        this.beatWidth = beatWidth;

        // Calculate exact beat positions for accurate note placement
        this.beatPositions = this.calculateBeatPositions(clefWidth, timeSigWidth, beatWidth, barLineWidth);

        // Storage for individual beat voices
        this.beatVoices = {};

        console.log(`Created shared VexFlow stave: ${this.measureCount} measures, ${this.timeSignature} time signature`);
        console.log('Beat positions:', this.beatPositions);
    }

    calculateBeatPositions(clefWidth, timeSigWidth, beatWidth, barLineWidth) {
        const positions = {};

        for (let measure = 1; measure <= this.measureCount; measure++) {
            positions[`measure${measure}`] = {};

            for (let beat = 1; beat <= 4; beat++) {
                // Calculate X position for this beat
                const measureOffset = (measure - 1) * (4 * beatWidth + barLineWidth);
                const beatOffset = (beat - 1) * beatWidth;
                const xPosition = 20 + clefWidth + timeSigWidth + measureOffset + beatOffset;

                positions[`measure${measure}`][`beat${beat}`] = {
                    x: xPosition,
                    width: beatWidth,
                    measure: measure,
                    beat: beat
                };
            }
        }

        return positions;
    }

    createDropZones() {
        const container = document.getElementById('vexflow-staff');
        if (!container) {
            console.error('VexFlow staff container not found!');
            return;
        }

        console.log(`Creating drop zones for ${this.measureCount} measures`);

        // Create invisible drop zones positioned over each beat area
        for (let measure = 1; measure <= this.measureCount; measure++) {
            for (let beat = 1; beat <= 4; beat++) {
                const dropZone = document.createElement('div');
                dropZone.className = 'beat-drop-zone';
                dropZone.dataset.measure = measure;
                dropZone.dataset.beat = beat;
                dropZone.dataset.absoluteBeat = ((measure - 1) * 4) + beat;

                // Position the drop zone over the corresponding beat area.
                // These offsets MUST match createSharedVexFlowStave()/calculateBeatPositions()
                // so the zones line up with the rendered notes (staveX + clef + timeSig).
                const staveX = 20;
                const clefWidth = 60;
                const timeSigWidth = 30;
                const barLineWidth = 10;
                const measureOffset = (measure - 1) * (4 * this.beatWidth + barLineWidth);
                const beatOffset = (beat - 1) * this.beatWidth;
                const leftPos = staveX + clefWidth + timeSigWidth + measureOffset + beatOffset;

                dropZone.style.position = 'absolute';
                dropZone.style.left = leftPos + 'px';
                dropZone.style.top = '0px';
                dropZone.style.width = this.beatWidth + 'px';
                dropZone.style.height = '180px';
                dropZone.style.zIndex = '10';

                container.appendChild(dropZone);
                console.log(`Created drop zone for measure ${measure}, beat ${beat}`);
            }
        }

        // Verify drop zones were created
        const createdZones = container.querySelectorAll('.beat-drop-zone');
        console.log(`Created ${createdZones.length} drop zones total`);
    }


    setupDragAndDrop() {
        const tiles = document.querySelectorAll('.rhythm-tile');
        console.log('🔧 setupDragAndDrop called, found tiles:', tiles.length);

        tiles.forEach((tile, index) => {
            console.log(`🎵 Setting up drag for tile ${index}:`, tile.dataset.patternId, 'draggable:', tile.draggable);

            tile.addEventListener('dragstart', (e) => {
                console.log('🚀 DRAGSTART:', tile.dataset.patternId);
                e.dataTransfer.setData('text/plain', tile.dataset.patternId);
                tile.classList.add('dragging');
                this.currentDragPattern = tile.dataset.patternId;
            });

            tile.addEventListener('dragend', () => {
                console.log('🏁 DRAGEND:', tile.dataset.patternId);
                tile.classList.remove('dragging');
                this.currentDragPattern = null;
                this.clearDragHighlights();
            });

            // Test if tile is actually clickable/interactive
            tile.addEventListener('mousedown', () => {
                console.log('🖱️ MOUSEDOWN on tile:', tile.dataset.patternId);
            });

            tile.addEventListener('click', () => {
                console.log('👆 CLICK on tile:', tile.dataset.patternId);
                alert(`Clicked tile: ${tile.dataset.patternId}`);
            });

            // Mobile touch drag support
            let isDragging = false;
            let startX, startY;
            let dragPreview = null;

            tile.addEventListener('touchstart', (e) => {
                console.log('👆 TOUCHSTART on tile:', tile.dataset.patternId);
                isDragging = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                this.currentDragPattern = tile.dataset.patternId;
                tile.classList.add('dragging');

                // Create drag preview
                this.createDragPreview(tile, e.touches[0].clientX, e.touches[0].clientY);

                e.preventDefault();
            });

            tile.addEventListener('touchmove', (e) => {
                if (!isDragging) return;

                const touch = e.touches[0];
                const deltaX = Math.abs(touch.clientX - startX);
                const deltaY = Math.abs(touch.clientY - startY);

                // Only start dragging if moved significantly
                if (deltaX > 10 || deltaY > 10) {
                    console.log('📱 TOUCH DRAGGING:', tile.dataset.patternId);

                    // Update drag preview position
                    this.updateDragPreview(touch.clientX, touch.clientY);

                    // Find element under touch point
                    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                    const dropZone = elementBelow?.closest('.beat-drop-zone');

                    if (dropZone) {
                        console.log('📍 Over drop zone:', dropZone.dataset.measure, dropZone.dataset.beat);
                        this.highlightDragTarget(dropZone, true);
                    } else {
                        this.clearDragHighlights();
                    }
                }
                e.preventDefault();
            });

            tile.addEventListener('touchend', (e) => {
                if (!isDragging) return;
                console.log('🏁 TOUCHEND for tile:', tile.dataset.patternId);

                const touch = e.changedTouches[0];
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const dropZone = elementBelow?.closest('.beat-drop-zone');

                if (dropZone) {
                    console.log('💥 TOUCH DROP in zone:', dropZone.dataset.measure, dropZone.dataset.beat);
                    const measure = parseInt(dropZone.dataset.measure);
                    const beat = parseInt(dropZone.dataset.beat);
                    this.placeTile(dropZone, tile.dataset.patternId, measure, beat);
                }

                isDragging = false;
                tile.classList.remove('dragging');
                this.currentDragPattern = null;
                this.clearDragHighlights();
                this.removeDragPreview();
                e.preventDefault();
            });
        });
    }

    setupDropZones() {
        const dropZones = document.querySelectorAll('.beat-drop-zone');
        console.log('🎯 setupDropZones called, found zones:', dropZones.length);

        dropZones.forEach((zone, index) => {
            console.log(`🎯 Setting up drop zone ${index}: measure ${zone.dataset.measure}, beat ${zone.dataset.beat}`);

            zone.addEventListener('dragover', (e) => {
                console.log('🌊 DRAGOVER zone:', zone.dataset.measure, zone.dataset.beat);
                e.preventDefault();
                this.highlightDragTarget(zone, true);
            });

            zone.addEventListener('dragleave', () => {
                console.log('🚪 DRAGLEAVE zone:', zone.dataset.measure, zone.dataset.beat);
                this.clearDragHighlights();
            });

            zone.addEventListener('drop', (e) => {
                console.log('💥 DROP in zone:', zone.dataset.measure, zone.dataset.beat);
                e.preventDefault();
                this.clearDragHighlights();

                const patternId = e.dataTransfer.getData('text/plain');
                const measure = parseInt(zone.dataset.measure);
                const beat = parseInt(zone.dataset.beat);

                console.log('📦 Dropped pattern:', patternId, 'at measure:', measure, 'beat:', beat);
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
        console.log(`placeTile called with: pattern=${patternId}, measure=${measure}, beat=${beat}`);

        const pattern = this.rhythmPatterns[this.currentDifficulty].find(p => p.id === patternId);
        if (!pattern) {
            console.error(`Pattern not found: ${patternId}`);
            return;
        }

        console.log(`Pattern found:`, pattern);
        const beatsNeeded = pattern.beats;
        const startBeat = beat;
        const endBeat = startBeat + beatsNeeded - 1;

        console.log(`Placing pattern spanning beats ${startBeat} to ${endBeat}`);

        // Check if we have enough space (don't go beyond beat 4 or into next measure)
        if (endBeat > 4) {
            alert(`Not enough space! This pattern needs ${beatsNeeded} beats.`);
            return;
        }

        // Check if any of the target beats are already filled
        for (let b = startBeat; b <= endBeat; b++) {
            if (this.userAnswer[measure - 1][b - 1] !== null) {
                alert(`Beat ${b} is already filled! Clear it first.`);
                return;
            }
        }

        // Mark beats as occupied in our tracking FIRST
        console.log(`Updating userAnswer array for measure ${measure}, beats ${startBeat} to ${endBeat}`);
        for (let b = startBeat; b <= endBeat; b++) {
            const arrayValue = b === startBeat ? patternId : `${patternId}_continuation`;
            console.log(`Setting userAnswer[${measure - 1}][${b - 1}] = ${arrayValue}`);
            this.userAnswer[measure - 1][b - 1] = arrayValue;

            // Add visual indicator to drop zone
            const targetZone = document.querySelector(`.beat-drop-zone[data-measure="${measure}"][data-beat="${b}"]`);
            if (targetZone) {
                targetZone.classList.add('filled');
                if (b > startBeat) {
                    targetZone.classList.add('continuation');
                }
            } else {
                console.error(`Could not find drop zone for measure ${measure}, beat ${b}`);
            }
        }

        console.log(`Updated userAnswer:`, this.userAnswer);

        // NOW add notes to the shared VexFlow stave (after userAnswer is updated)
        this.addNotesToSharedStave(pattern, measure, startBeat);

        // Add remove button to the starting beat zone
        const startZone = document.querySelector(`.beat-drop-zone[data-measure="${measure}"][data-beat="${startBeat}"]`);
        if (!startZone) {
            console.error(`Could not find start zone for measure ${measure}, beat ${startBeat}`);
            return;
        }
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.style.position = 'absolute';
        removeBtn.style.top = '2px';
        removeBtn.style.right = '2px';
        removeBtn.style.zIndex = '20';
        removeBtn.onclick = () => this.removeTile(measure, startBeat);
        startZone.appendChild(removeBtn);

        // Send answer to teacher (in real implementation)
        this.sendAnswerToTeacher(measure, startBeat, patternId);

        // Force a render after userAnswer is fully updated
        console.log('Forcing render after userAnswer update...');
        setTimeout(() => {
            this.renderAllNotesOnStave();
        }, 100);
    }

    addNotesToSharedStave(pattern, measure, beat) {
        // This method will add the pattern's notes to the shared VexFlow stave
        // at the correct beat position. For now, we'll redraw the entire stave
        // with all placed notes.
        this.redrawSharedStave();
    }

    redrawSharedStave() {
        // Clear and redraw the entire shared stave with all current notes
        const container = document.getElementById('vexflow-staff');

        // Store existing drop zones before removing SVG
        const existingDropZones = Array.from(container.querySelectorAll('.beat-drop-zone'));

        // Remove existing SVG but preserve drop zones
        const existingSVG = container.querySelector('svg');
        if (existingSVG) {
            existingSVG.remove();
        }

        // Recreate the stave
        this.createSharedVexFlowStave();

        // Restore drop zones if they were removed
        const currentDropZones = container.querySelectorAll('.beat-drop-zone');
        if (currentDropZones.length === 0 && existingDropZones.length > 0) {
            console.log('Restoring drop zones after stave redraw');
            existingDropZones.forEach(zone => container.appendChild(zone));
        }

        // Add all placed notes back to the stave
        this.renderAllNotesOnStave();
    }

    renderAllNotesOnStave() {
        if (!this.sharedStave || !this.sharedContext) {
            console.error('Shared stave not available for rendering notes');
            return;
        }

        console.log('Current userAnswer state:', this.userAnswer);

        // Clear existing beat voices
        this.beatVoices = {};

        // Create individual voices for each filled beat
        for (let measure = 1; measure <= this.measureCount; measure++) {
            for (let beat = 1; beat <= 4; beat++) {
                const patternId = this.userAnswer[measure - 1][beat - 1];
                console.log(`Checking measure ${measure}, beat ${beat}: ${patternId}`);

                if (patternId && !patternId.includes('_continuation')) {
                    console.log(`Found pattern to render: ${patternId} at measure ${measure}, beat ${beat}`);

                    const pattern = this.rhythmPatterns[this.currentDifficulty].find(p => p.id === patternId);
                    if (pattern) {
                        this.createBeatVoice(measure, beat, pattern);
                    } else {
                        console.error(`Pattern not found for ID: ${patternId}`);
                    }
                }
            }
        }

        // Render all beat voices
        this.renderAllBeatVoices();
    }

    createBeatVoice(measure, beat, pattern) {
        const VF = Vex.Flow;
        const beatKey = `measure${measure}_beat${beat}`;

        console.log(`Creating beat voice for ${beatKey} with pattern ${pattern.id}`);

        // Get beat position info
        const beatPos = this.beatPositions[`measure${measure}`][`beat${beat}`];
        if (!beatPos) {
            console.error(`Beat position not found for measure ${measure}, beat ${beat}`);
            return;
        }

        // Convert pattern to VexFlow notes
        const notes = this.convertPatternToVexFlowNotes(pattern);
        if (notes.length === 0) {
            console.error(`No notes generated for pattern ${pattern.id}`);
            return;
        }

        // Create voice for this specific beat
        const voice = new VF.Voice({
            num_beats: pattern.beats, // Use pattern's actual beat count
            beat_value: 4
        }).setStrict(false);

        // Set stave for all notes
        notes.forEach(note => note.setStave(this.sharedStave));
        voice.addTickables(notes);

        // Store the beat voice with positioning info
        this.beatVoices[beatKey] = {
            voice: voice,
            notes: notes,
            pattern: pattern,
            position: beatPos,
            measure: measure,
            beat: beat
        };

        console.log(`Created beat voice for ${beatKey}:`, this.beatVoices[beatKey]);
    }

    renderAllBeatVoices() {
        console.log(`Rendering ${Object.keys(this.beatVoices).length} beat voices`);

        Object.values(this.beatVoices).forEach(beatVoice => {
            this.renderSingleBeatVoice(beatVoice);
        });
    }

    renderSingleBeatVoice(beatVoice) {
        const VF = Vex.Flow;
        const { voice, notes, pattern, position } = beatVoice;

        console.log(`Rendering beat voice at position x=${position.x}, width=${position.width}`);

        try {
            // Use the main shared stave (not individual beat staves)
            notes.forEach(note => note.setStave(this.sharedStave));

            // Apply beaming BEFORE formatting
            this.applyBeaming(notes, pattern);

            // For multi-beat patterns, calculate the spanning width
            const spanWidth = pattern.beats * this.beatWidth;
            console.log(`Pattern ${pattern.id} spans ${pattern.beats} beats (${spanWidth}px)`);

            // Create a formatter and format to the appropriate width
            const formatter = new VF.Formatter();
            formatter.format([voice], spanWidth - 20);

            // Calculate the exact start position for this voice
            const startX = position.x - 20; // Adjust for stave offset

            // Manually position each note at the calculated beat positions
            notes.forEach((note, index) => {
                const noteX = startX + (index * (spanWidth / notes.length));
                note.setXShift(noteX - this.sharedStave.getX());
            });

            // Draw the voice using the shared stave
            voice.draw(this.sharedContext, this.sharedStave);

            // Draw the beams and tuplets after the notes
            this.handleNoteGrouping(notes, pattern, this.sharedContext);

            console.log(`Successfully rendered beat voice for ${pattern.id} on shared stave`);

        } catch (error) {
            console.error(`Error rendering beat voice for ${pattern.id}:`, error);
        }
    }

    applyBeaming(notes, pattern) {
        const VF = Vex.Flow;

        try {
            // Handle beaming for grouped notes
            if (pattern.id === 'four-sixteenths' || pattern.id === 'two-eighths') {
                if (notes.length > 1) {
                    console.log(`Applying beam to ${notes.length} notes for pattern ${pattern.id}`);

                    // Create and apply beam to the notes
                    const beam = new VF.Beam(notes);
                    console.log('Beam created:', beam);

                    // Store beam reference so it gets drawn with the voice
                    notes.forEach(note => {
                        note.beam = beam;
                    });
                }
            }

            // Handle triplet brackets
            if (pattern.triplet && notes.length >= 3) {
                const tuplet = new VF.Tuplet(notes.slice(0, 3));
                notes.forEach((note, i) => {
                    if (i < 3) note.tuplet = tuplet;
                });
            }
        } catch (error) {
            console.warn(`Could not apply beaming for ${pattern.id}:`, error);
        }
    }

    handleNoteGrouping(notes, pattern, context) {
        const VF = Vex.Flow;

        try {
            // Draw beams that were applied in applyBeaming
            if (pattern.id === 'four-sixteenths' || pattern.id === 'two-eighths') {
                if (notes.length > 1 && notes[0].beam) {
                    notes[0].beam.setContext(context).draw();
                }
            }

            // Draw tuplet brackets
            if (pattern.triplet && notes.length >= 3 && notes[0].tuplet) {
                notes[0].tuplet.setContext(context).draw();
            }
        } catch (error) {
            console.warn(`Could not draw note grouping for ${pattern.id}:`, error);
        }
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
            const notation = zone.querySelector('.beat-notation');
            if (notation) notation.innerHTML = '';
            zone.classList.remove('filled', 'revealed', 'continuation');
        });
        this.userAnswer = Array(this.measureCount).fill(null).map(() => Array(4).fill(null));
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

    toggleFitToScreen() {
        const measureContainer = document.querySelector('.responsive-measures');
        const fitBtn = document.getElementById('fitToScreenBtn');

        if (measureContainer) {
            measureContainer.classList.toggle('fit-mode');

            if (measureContainer.classList.contains('fit-mode')) {
                fitBtn.classList.add('active');
            } else {
                fitBtn.classList.remove('active');
            }
        }
    }

    scrollToCurrentBeat(currentBeat) {
        const measureContainer = document.querySelector('.responsive-measures');
        if (!measureContainer || measureContainer.classList.contains('fit-mode')) return;

        const totalBeats = this.measureCount * 4;
        const scrollWidth = measureContainer.scrollWidth - measureContainer.clientWidth;
        const scrollPosition = (currentBeat / totalBeats) * scrollWidth;

        measureContainer.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
        });
    }

    createDragPreview(originalTile, x, y) {
        this.removeDragPreview(); // Remove any existing preview

        this.dragPreview = originalTile.cloneNode(true);
        this.dragPreview.style.position = 'fixed';
        this.dragPreview.style.pointerEvents = 'none';
        this.dragPreview.style.zIndex = '10000';
        this.dragPreview.style.opacity = '0.8';

        // Use transform scaling but with simpler approach
        this.dragPreview.style.transform = 'scale(0.35)';
        this.dragPreview.style.transformOrigin = 'top left';
        this.dragPreview.style.width = 'auto';
        this.dragPreview.style.height = 'auto';
        this.dragPreview.style.transition = 'none';
        this.dragPreview.classList.add('drag-preview');

        // Position at touch point
        this.updateDragPreview(x, y);

        document.body.appendChild(this.dragPreview);
    }

    updateDragPreview(x, y) {
        if (!this.dragPreview) return;

        // Position with transform-origin top left, so we can position exactly
        this.dragPreview.style.left = (x - 20) + 'px';  // Smaller offset for 0.35 scale
        this.dragPreview.style.top = (y - 40) + 'px';   // Above finger
    }

    removeDragPreview() {
        if (this.dragPreview) {
            this.dragPreview.remove();
            this.dragPreview = null;
        }
    }
}

// Initialize the student system
window.rhythmStudent = null; // Make it globally accessible
document.addEventListener('DOMContentLoaded', () => {
    window.rhythmStudent = new RhythmStudent();
});