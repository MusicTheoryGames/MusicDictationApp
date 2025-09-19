// Rhythm Practice Game Logic
class RhythmPractice {
    constructor() {
        // Complete rhythmic units with VexFlow notation data
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
                    id: 'dotted-quarter-eighth',
                    name: 'Dotted Quarter + Eighth',
                    notation: '♩.♫',
                    beats: 2,
                    vexflow: [
                        { keys: ['b/4'], duration: 'qd' },
                        { keys: ['b/4'], duration: '8' }
                    ]
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
                    id: 'quarter-rest',
                    name: 'Quarter Rest',
                    notation: '𝄽',
                    beats: 1,
                    vexflow: [{ keys: ['b/4'], duration: 'qr' }]
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
                    id: 'syncopated',
                    name: 'Syncopated',
                    notation: '♫♩♫',
                    beats: 2,
                    vexflow: [
                        { keys: ['b/4'], duration: '8' },
                        { keys: ['b/4'], duration: 'q' },
                        { keys: ['b/4'], duration: '8' }
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

        this.currentRhythm = [];
        this.userAnswer = [];
        this.currentDifficulty = 'medium';
        this.measureCount = 2;
        this.tempo = 100;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.populateRhythmBank();
        this.generateNewRhythm();
        this.updateMeasureDisplay();
    }

    setupEventListeners() {
        document.getElementById('generateBtn').addEventListener('click', () => this.generateNewRhythm());
        document.getElementById('playBtn').addEventListener('click', () => this.playRhythm());
        document.getElementById('checkBtn').addEventListener('click', () => this.checkAnswer());

        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.currentDifficulty = e.target.value;
            this.populateRhythmBank();
            this.generateNewRhythm();
        });

        document.getElementById('measureCount').addEventListener('change', (e) => {
            this.measureCount = parseInt(e.target.value);
            this.updateMeasureDisplay();
            this.generateNewRhythm();
        });

        document.getElementById('tempo').addEventListener('change', (e) => {
            this.tempo = parseInt(e.target.value);
        });
    }

    populateRhythmBank() {
        const tilesContainer = document.getElementById('rhythmTiles');
        tilesContainer.innerHTML = '';

        const patterns = this.rhythmPatterns[this.currentDifficulty];

        patterns.forEach(pattern => {
            const tile = document.createElement('div');
            tile.className = 'rhythm-tile';
            tile.draggable = true;
            tile.dataset.patternId = pattern.id;
            tile.innerHTML = `
                <div style="font-size: 1.5rem; margin-bottom: 5px;">${pattern.notation}</div>
                <div style="font-size: 0.9rem;">${pattern.name}</div>
            `;
            tilesContainer.appendChild(tile);
        });
    }

    updateMeasureDisplay() {
        const container = document.getElementById('measureContainer');
        container.innerHTML = '';

        for (let m = 1; m <= this.measureCount; m++) {
            const measureDiv = document.createElement('div');
            measureDiv.innerHTML = `
                <h3>Measure ${m}</h3>
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
        // Will be called after each rhythm bank update
        this.setupDraggables();
        this.setupDropZones();
    }

    setupDraggables() {
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
                <button class="remove-btn" onclick="rhythmGame.removeTile(${measure}, ${beat})">×</button>
            </div>
        `;

        dropZone.classList.add('filled');
        this.userAnswer[measure - 1][beat - 1] = patternId;
    }

    removeTile(measure, beat) {
        const dropZone = document.querySelector(`[data-measure="${measure}"] [data-beat="${beat}"]`);
        const dropContent = dropZone.querySelector('.drop-content');

        dropContent.innerHTML = '';
        dropZone.classList.remove('filled');
        this.userAnswer[measure - 1][beat - 1] = null;
    }

    generateNewRhythm() {
        this.currentRhythm = [];
        const patterns = this.rhythmPatterns[this.currentDifficulty];

        for (let m = 0; m < this.measureCount; m++) {
            const measure = [];
            for (let b = 0; b < 4; b++) {
                // For now, only use 1-beat patterns for simplicity
                const oneBeaPatterns = patterns.filter(p => p.beats === 1);
                const randomPattern = oneBeaPatterns[Math.floor(Math.random() * oneBeaPatterns.length)];
                measure.push(randomPattern.id);
            }
            this.currentRhythm.push(measure);
        }

        this.clearUserAnswer();
        this.clearFeedback();
        console.log('Generated rhythm:', this.currentRhythm);
    }

    clearUserAnswer() {
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.querySelector('.drop-content').innerHTML = '';
            zone.classList.remove('filled');
        });
        this.userAnswer = Array(this.measureCount).fill(null).map(() => Array(4).fill(null));
    }

    playRhythm() {
        console.log('Playing rhythm:', this.currentRhythm);
        this.showFeedback('Playing rhythm...', 'info');

        // Convert rhythm pattern to playable notes
        const allNotes = [];

        for (let m = 0; m < this.measureCount; m++) {
            for (let b = 0; b < 4; b++) {
                const patternId = this.currentRhythm[m][b];
                const pattern = this.rhythmPatterns[this.currentDifficulty].find(p => p.id === patternId);

                if (pattern) {
                    // Add all notes from this pattern
                    pattern.vexflow.forEach(note => {
                        allNotes.push(note);
                    });
                }
            }
        }

        this.playWithWebAudio(allNotes);
        setTimeout(() => this.clearFeedback(), allNotes.length * 600);
    }

    playWithWebAudio(allNotes) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        let currentTime = audioContext.currentTime + 0.1;
        const beatDuration = 60 / this.tempo; // Duration of one beat in seconds

        allNotes.forEach((note, index) => {
            if (!note.duration.includes('r')) {
                // Use a click sound for rhythm (around 800Hz)
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

        // Sharp click sound
        oscillator.frequency.setValueAtTime(frequency, startTime);
        oscillator.type = 'square';

        // Quick attack and decay for percussive sound
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.005); // Quick attack
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 0.1)); // Quick decay

        oscillator.start(startTime);
        oscillator.stop(startTime + Math.min(duration, 0.1));
    }

    getNoteDuration(duration) {
        // Convert VexFlow duration to beat values
        const durationMap = {
            'w': 4,      // whole
            'h': 2,      // half
            'hd': 3,     // dotted half
            'q': 1,      // quarter
            'qd': 1.5,   // dotted quarter
            '8': 0.5,    // eighth
            '8d': 0.75,  // dotted eighth
            '16': 0.25,  // sixteenth
            '32': 0.125, // thirty-second

            // Rests
            'wr': 4,
            'hr': 2,
            'qr': 1,
            '8r': 0.5,
            '16r': 0.25
        };

        // Handle triplets (divide by 3, multiply by 2)
        if (duration.includes('triplet') || duration === '8t') {
            return (2/3) * 0.5; // Triplet eighth = 1/3 beat
        }

        return durationMap[duration] || 1;
    }

    checkAnswer() {
        let correct = true;
        let totalBeats = 0;
        let correctBeats = 0;

        for (let m = 0; m < this.measureCount; m++) {
            for (let b = 0; b < 4; b++) {
                totalBeats++;
                if (this.userAnswer[m][b] === this.currentRhythm[m][b]) {
                    correctBeats++;
                } else {
                    correct = false;
                }
            }
        }

        const accuracy = Math.round((correctBeats / totalBeats) * 100);

        if (correct) {
            this.showFeedback(`Perfect! 100% correct! 🎉`, 'correct');
        } else {
            this.showFeedback(`${accuracy}% correct. Keep trying! 💪`, 'incorrect');
        }
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

// Initialize the game when page loads
let rhythmGame;
document.addEventListener('DOMContentLoaded', () => {
    rhythmGame = new RhythmPractice();
});

// Setup drag and drop after rhythm bank updates
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(() => {
        rhythmGame.setupDraggables();
    });

    observer.observe(document.getElementById('rhythmTiles'), {
        childList: true
    });
});