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

        // Create single continuous staff container
        const measureContainer = document.createElement('div');
        measureContainer.className = 'measure-container';

        const staffDiv = document.createElement('div');
        staffDiv.className = 'answer-staff';
        staffDiv.innerHTML = `
            <div class="staff-container">
                <div class="staff-lines">
                    <div class="staff-line"></div>
                </div>
                <div class="percussion-clef"></div>
                <div class="time-signature">
                    <div class="time-sig-top">${this.timeSignature.split('/')[0]}</div>
                    <div class="time-sig-bottom">${this.timeSignature.split('/')[1]}</div>
                </div>
                <div class="beat-divisions">
                    <div class="responsive-measures">
                        ${Array.from({length: this.measureCount * 4}, (_, i) => {
                            const absoluteBeat = i + 1; // 1-8 for grid positioning
                            const beat = (i % 4) + 1; // 1-4 for measure beat
                            const measure = Math.floor(i / 4) + 1;
                            return `
                                <div class="beat-drop-zone" data-beat="${beat}" data-measure="${measure}" data-absolute-beat="${absoluteBeat}">
                                    <div class="beat-notation"></div>
                                </div>
                            `;
                        }).join('')}
                        ${this.measureCount > 1 ? '<div class="measure-bar-line"></div>' : ''}
                        <div class="double-bar"></div>
                    </div>
                </div>
            </div>
        `;

        measureContainer.appendChild(staffDiv);
        container.appendChild(measureContainer);

        this.setupDropZones();
        this.userAnswer = Array(this.measureCount).fill(null).map(() => Array(4).fill(null));
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

        // Check if any of the target beats are already filled
        for (let b = startBeat; b <= endBeat; b++) {
            if (this.userAnswer[measure - 1][b - 1] !== null) {
                alert(`Beat ${b} is already filled! Clear it first.`);
                return;
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

                // Use PNG asset instead of cloning SVG
                const asset = this.rhythmAssets[pattern.id];
                if (asset) {
                    // Create PNG image for the placed notation
                    const img = document.createElement('img');
                    img.src = `./rhythm-assets/${asset.file}`;
                    img.style.width = '98%';
                    img.style.height = '98%';
                    img.style.objectFit = 'contain';
                    img.style.objectPosition = 'center 70%'; // Align with staff line
                    img.alt = asset.name;

                    notationArea.innerHTML = `<button class="remove-btn" onclick="window.rhythmStudent.removeTile(${measure}, ${startBeat})">×</button>`;
                    notationArea.appendChild(img);
                    console.log('PNG image placed for pattern:', pattern.id);
                } else {
                    // Fallback if no asset found
                    console.warn('No PNG asset found for pattern:', pattern.id);
                    notationArea.innerHTML = `<button class="remove-btn" onclick="window.rhythmStudent.removeTile(${measure}, ${startBeat})">×</button><span style="color: red; font-size: 0.7rem;">Missing: ${pattern.id}</span>`;
                }
                targetZone.classList.add('filled');
                this.userAnswer[measure - 1][b - 1] = patternId;
            } else {
                // Subsequent beats get a visual indicator
                notationArea.innerHTML = '<span style="color: #999; font-size: 0.8rem;">—</span>';
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
                fitBtn.textContent = '🔍 Normal View';
                fitBtn.classList.add('active');
            } else {
                fitBtn.textContent = '📏 Fit to Screen';
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