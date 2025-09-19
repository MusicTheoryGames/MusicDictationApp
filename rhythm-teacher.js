// Rhythm Teacher Control System
class RhythmTeacher {
    constructor() {
        // Copy rhythm patterns from rhythm-practice.js
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

        this.currentRhythm = [];
        this.currentDifficulty = 'medium';
        this.measureCount = 2;
        this.tempo = 100;
        this.roomCode = '';
        this.students = new Map();
        this.revealedBeats = [];

        this.init();
    }

    init() {
        this.generateRoomCode();
        this.setupEventListeners();
        this.generateNewRhythm();
        this.setupWebSocket();
    }

    generateRoomCode() {
        this.roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        document.getElementById('roomCode').textContent = this.roomCode;
    }

    setupEventListeners() {
        document.getElementById('generateBtn').addEventListener('click', () => this.generateNewRhythm());
        document.getElementById('playBtn').addEventListener('click', () => this.playRhythm());

        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.currentDifficulty = e.target.value;
            this.generateNewRhythm();
        });

        document.getElementById('measureCount').addEventListener('change', (e) => {
            this.measureCount = parseInt(e.target.value);
            this.generateNewRhythm();
        });

        document.getElementById('tempo').addEventListener('change', (e) => {
            this.tempo = parseInt(e.target.value);
        });

        // Reveal button listeners
        for (let i = 1; i <= 4; i++) {
            document.getElementById(`revealBeat${i}`).addEventListener('click', () => this.revealBeat(i));
        }
        document.getElementById('revealAll').addEventListener('click', () => this.revealAll());
    }

    setupWebSocket() {
        // In a real implementation, this would connect to your server
        // For now, we'll simulate students joining
        this.simulateStudents();
    }

    simulateStudents() {
        // Simulate some students joining for demo
        const studentNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eva'];

        studentNames.forEach((name, index) => {
            setTimeout(() => {
                this.addStudent(name, `student_${index + 1}`);
            }, index * 1000);
        });
    }

    addStudent(name, id) {
        this.students.set(id, {
            name: name,
            connected: true,
            answers: Array(this.measureCount * 4).fill(null),
            correctBeats: []
        });

        this.updateStudentDisplay();
        this.updateConnectedCount();
    }

    generateNewRhythm() {
        this.currentRhythm = [];
        this.revealedBeats = [];
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

        this.renderTeacherStaff();
        this.updateRhythmInfo();
        this.updateRevealButtons();
        this.broadcastToStudents('new-rhythm', {
            measureCount: this.measureCount,
            difficulty: this.currentDifficulty,
            tempo: this.tempo
        });

        console.log('Generated rhythm:', this.currentRhythm);
    }

    renderTeacherStaff() {
        const container = document.getElementById('teacherStaff');
        container.innerHTML = '';

        // Check if VexFlow is loaded
        if (typeof Vex === 'undefined') {
            container.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">Loading notation library...</p>';
            // Try again after a short delay
            setTimeout(() => this.renderTeacherStaff(), 500);
            return;
        }

        try {
            const VF = Vex.Flow;
            const div = document.createElement('div');
            container.appendChild(div);

            const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
            const totalWidth = Math.max(600, this.measureCount * 300);
            renderer.resize(totalWidth, 200);
            const context = renderer.getContext();

            // Create connected staves for each measure
            const staves = [];
            const measureWidth = (totalWidth - 20) / this.measureCount;

            for (let m = 0; m < this.measureCount; m++) {
                const x = 10 + m * measureWidth;
                const stave = new VF.Stave(x, 40, measureWidth);

                if (m === 0) {
                    stave.addClef('percussion');
                    stave.addTimeSignature('4/4');
                }

                // Connect to previous measure
                if (m > 0) {
                    stave.setBegBarType(VF.Barline.type.SINGLE);
                }

                // Add end bar to last measure
                if (m === this.measureCount - 1) {
                    stave.setEndBarType(VF.Barline.type.END);
                }

                stave.setContext(context).draw();
                staves.push(stave);
            }

            // Convert each measure to VexFlow notes
            for (let m = 0; m < this.measureCount; m++) {
                const measureNotes = [];

                for (let b = 0; b < 4; b++) {
                    const patternId = this.currentRhythm[m][b];
                    const pattern = this.rhythmPatterns[this.currentDifficulty].find(p => p.id === patternId);

                    if (pattern) {
                        pattern.vexflow.forEach(noteData => {
                            const note = new VF.StaveNote({
                                clef: 'percussion',
                                keys: noteData.keys,
                                duration: noteData.duration
                            });
                            measureNotes.push(note);
                        });
                    }
                }

                if (measureNotes.length > 0) {
                    // Create beams for this measure
                    const beams = VF.Beam.generateBeams(measureNotes);

                    // Format and draw this measure
                    VF.Formatter.FormatAndDraw(context, staves[m], measureNotes);
                    beams.forEach(beam => beam.setContext(context).draw());
                }
            }

        } catch (error) {
            console.error('VexFlow rendering error:', error);
            container.innerHTML = `
                <div style="color: #666; text-align: center; padding: 40px;">
                    <h4>Rhythm Generated Successfully!</h4>
                    <p>Notation display temporarily unavailable</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">
                        Measures: ${this.measureCount} |
                        Difficulty: ${this.currentDifficulty} |
                        Tempo: ${this.tempo} BPM
                    </p>
                </div>
            `;
        }
    }

    updateRhythmInfo() {
        const infoDiv = document.getElementById('rhythmInfo');
        const totalBeats = this.measureCount * 4;
        infoDiv.innerHTML = `
            <strong>Exercise Details:</strong> ${this.measureCount} measure(s), ${totalBeats} beats total<br>
            <strong>Difficulty:</strong> ${this.currentDifficulty.charAt(0).toUpperCase() + this.currentDifficulty.slice(1)}<br>
            <strong>Tempo:</strong> ${this.tempo} BPM
        `;
    }

    playRhythm() {
        console.log('Playing rhythm for students:', this.currentRhythm);

        // Convert rhythm pattern to playable notes
        const allNotes = [];

        for (let m = 0; m < this.measureCount; m++) {
            for (let b = 0; b < 4; b++) {
                const patternId = this.currentRhythm[m][b];
                const pattern = this.rhythmPatterns[this.currentDifficulty].find(p => p.id === patternId);

                if (pattern) {
                    pattern.vexflow.forEach(note => {
                        allNotes.push(note);
                    });
                }
            }
        }

        this.playWithWebAudio(allNotes);
        this.broadcastToStudents('play-rhythm', { notes: allNotes, tempo: this.tempo });
    }

    playWithWebAudio(allNotes) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        let currentTime = audioContext.currentTime + 0.1;
        const beatDuration = 60 / this.tempo;

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
            this.updateRevealButtons();
            this.broadcastToStudents('reveal-beat', { beatNumber: beatNumber });
        }
    }

    revealAll() {
        this.revealedBeats = [1, 2, 3, 4];
        this.updateRevealButtons();
        this.broadcastToStudents('reveal-all', { rhythm: this.currentRhythm });
    }

    updateRevealButtons() {
        for (let i = 1; i <= 4; i++) {
            const btn = document.getElementById(`revealBeat${i}`);
            if (this.revealedBeats.includes(i)) {
                btn.disabled = true;
                btn.textContent = `Beat ${i} Revealed`;
            } else {
                btn.disabled = false;
                btn.textContent = `Reveal Beat ${i}`;
            }
        }

        const revealAllBtn = document.getElementById('revealAll');
        if (this.revealedBeats.length === 4) {
            revealAllBtn.disabled = true;
            revealAllBtn.textContent = 'All Revealed';
        } else {
            revealAllBtn.disabled = false;
            revealAllBtn.textContent = 'Reveal All';
        }
    }

    updateStudentDisplay() {
        const container = document.getElementById('studentProgress');
        container.innerHTML = '';

        this.students.forEach((student, id) => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.innerHTML = `
                <div class="student-name">
                    <span class="status-indicator ${student.connected ? 'online' : 'offline'}"></span>
                    ${student.name}
                </div>
                <div class="beat-progress">
                    ${Array.from({length: 4}, (_, i) => {
                        const beatNum = i + 1;
                        const isCorrect = student.correctBeats.includes(beatNum);
                        const hasAnswer = student.answers[i] !== null;

                        let statusClass = 'pending';
                        if (hasAnswer) {
                            statusClass = isCorrect ? 'correct' : 'incorrect';
                        }

                        return `<div class="beat-status ${statusClass}">${beatNum}</div>`;
                    }).join('')}
                </div>
            `;
            container.appendChild(card);
        });
    }

    updateConnectedCount() {
        const connectedStudents = Array.from(this.students.values()).filter(s => s.connected).length;
        document.getElementById('connectedCount').textContent = connectedStudents;
    }

    broadcastToStudents(type, data) {
        // In a real implementation, this would send to WebSocket server
        console.log('Broadcasting to students:', type, data);

        // Simulate student responses for demo
        if (type === 'new-rhythm') {
            this.simulateStudentAnswers();
        }
    }

    simulateStudentAnswers() {
        // Simulate students gradually submitting answers
        this.students.forEach((student, id) => {
            setTimeout(() => {
                // Simulate some correct and some incorrect answers
                for (let i = 0; i < 4; i++) {
                    const isCorrect = Math.random() > 0.3; // 70% chance of being correct
                    if (isCorrect) {
                        student.correctBeats.push(i + 1);
                    }
                    student.answers[i] = isCorrect ? this.currentRhythm[0][i] : 'wrong-answer';
                }
                this.updateStudentDisplay();
            }, Math.random() * 3000);
        });
    }
}

// Initialize the teacher control system
let rhythmTeacher;
document.addEventListener('DOMContentLoaded', () => {
    rhythmTeacher = new RhythmTeacher();
});