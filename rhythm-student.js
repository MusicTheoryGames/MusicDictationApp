// Rhythm Student System
class RhythmStudent {
    constructor() {
        // Copy rhythm patterns (same as teacher and practice)
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
        this.studentName = document.getElementById('studentName').value.trim();
        this.roomCode = document.getElementById('roomCode').value.trim().toUpperCase();

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

        this.setupDragAndDrop();
    }

    renderTileNotation(pattern, container) {
        console.log('Rendering notation for pattern:', pattern.id);
        console.log('Vex available:', typeof Vex !== 'undefined');

        if (typeof Vex === 'undefined') {
            console.log('VexFlow not loaded - no notation rendered');
            container.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">VexFlow Loading...</div>`;
            return;
        }

        try {
            console.log('VexFlow available, rendering...');
            const VF = Vex.Flow;

            // Clear container
            container.innerHTML = '';
            console.log('Container cleared');

            // Create SVG element manually for better control
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '120');
            svg.setAttribute('height', '70');
            svg.style.display = 'block';
            svg.style.position = 'absolute';
            svg.style.top = '50%';
            svg.style.left = '50%';
            svg.style.transform = 'translate(-50%, -50%)';

            container.appendChild(svg);

            const renderer = new VF.Renderer(svg, VF.Renderer.Backends.SVG);
            renderer.resize(120, 70);
            const context = renderer.getContext();
            console.log('Renderer created');

            // Scale down the entire context for smaller notation
            context.scale(0.8, 0.8);

            // Create mini staff for this pattern (positioned at top)
            const stave = new VF.Stave(15, -15, 110);
            stave.setContext(context).draw();
            console.log('Staff drawn');

            // Convert pattern to VexFlow notes
            const notes = [];
            pattern.vexflow.forEach((noteData, index) => {
                console.log(`Creating note ${index + 1} for ${pattern.id}:`, noteData);

                const note = new VF.StaveNote({
                    clef: 'percussion',
                    keys: noteData.keys,
                    duration: noteData.duration
                });

                // Add dots for dotted notes - use correct VexFlow API
                if (noteData.dots && noteData.dots > 0) {
                    console.log(`Adding ${noteData.dots} dots to note`);
                    note.addModifier(new VF.Dot(), 0);
                } else if (noteData.duration.includes('d')) {
                    console.log(`Adding dot from duration suffix: ${noteData.duration}`);
                    note.addModifier(new VF.Dot(), 0);
                }

                notes.push(note);
                console.log(`Note ${index + 1} created successfully`);
            });

            console.log(`Created ${notes.length} notes for ${pattern.id}`);

            if (notes.length > 0) {
                // Create beams if needed for eighth notes and smaller
                console.log('Generating beams...');
                const beams = VF.Beam.generateBeams(notes);
                console.log(`Generated ${beams.length} beams`);

                // Format and draw
                console.log('Formatting and drawing notes...');
                VF.Formatter.FormatAndDraw(context, stave, notes);

                console.log('Drawing beams...');
                beams.forEach(beam => beam.setContext(context).draw());

                console.log(`Successfully rendered ${pattern.id}`);
            } else {
                console.warn(`No notes created for pattern ${pattern.id}`);
            }

        } catch (error) {
            console.error('VexFlow ERROR for pattern:', pattern.id, error);
            console.error('Error details:', error.message);
            console.error('Stack trace:', error.stack);
            // Show detailed error for debugging
            container.innerHTML = `<div style="color: red; text-align: center; padding: 5px; font-size: 0.7rem;">VF Error<br>${pattern.id}<br>${error.message}</div>`;
        }
    }

    updateMeasureDisplay() {
        const container = document.getElementById('measureContainer');
        container.innerHTML = '';

        for (let m = 1; m <= this.measureCount; m++) {
            const measureDiv = document.createElement('div');
            measureDiv.innerHTML = `
                <div class="measure-label">Measure ${m}</div>
                <div class="drop-zones" data-measure="${m}">
                    <div class="drop-zone" data-beat="1">
                        <h4>Beat 1</h4>
                        <div class="drop-content"></div>
                    </div>
                    <div class="drop-zone" data-beat="2">
                        <h4>Beat 2</h4>
                        <div class="drop-content"></div>
                    </div>
                    <div class="drop-zone" data-beat="3">
                        <h4>Beat 3</h4>
                        <div class="drop-content"></div>
                    </div>
                    <div class="drop-zone" data-beat="4">
                        <h4>Beat 4</h4>
                        <div class="drop-content"></div>
                    </div>
                </div>
            `;
            container.appendChild(measureDiv);
        }

        this.setupDropZones();
        this.userAnswer = Array(this.measureCount).fill(null).map(() => Array(4).fill(null));
    }

    setupDragAndDrop() {
        const tiles = document.querySelectorAll('.rhythm-tile');

        tiles.forEach(tile => {
            tile.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', tile.dataset.patternId);
                tile.classList.add('dragging');
            });

            tile.addEventListener('dragend', () => {
                tile.classList.remove('dragging');
            });
        });
    }

    setupDropZones() {
        const dropZones = document.querySelectorAll('.drop-zone');

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');

                const patternId = e.dataTransfer.getData('text/plain');
                const measure = parseInt(zone.closest('.drop-zones').dataset.measure);
                const beat = parseInt(zone.dataset.beat);

                this.placeTile(zone, patternId, measure, beat);
            });
        });
    }

    placeTile(dropZone, patternId, measure, beat) {
        const pattern = this.rhythmPatterns[this.currentDifficulty].find(p => p.id === patternId);
        if (!pattern) return;

        const dropContent = dropZone.querySelector('.drop-content');
        dropContent.innerHTML = `
            <div class="dropped-tile">
                ${pattern.notation}
                <button class="remove-btn" onclick="rhythmStudent.removeTile(${measure}, ${beat})">×</button>
            </div>
        `;

        dropZone.classList.add('filled');
        this.userAnswer[measure - 1][beat - 1] = patternId;

        // Send answer to teacher (in real implementation)
        this.sendAnswerToTeacher(measure, beat, patternId);
    }

    removeTile(measure, beat) {
        const dropZone = document.querySelector(`[data-measure="${measure}"] [data-beat="${beat}"]`);
        const dropContent = dropZone.querySelector('.drop-content');

        dropContent.innerHTML = '';
        dropZone.classList.remove('filled');
        this.userAnswer[measure - 1][beat - 1] = null;

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
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.querySelector('.drop-content').innerHTML = '';
            zone.classList.remove('filled', 'revealed');
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
}

// Initialize the student system
let rhythmStudent;
document.addEventListener('DOMContentLoaded', () => {
    rhythmStudent = new RhythmStudent();
});