// Beat Quest Projection Display
class ProjectionDisplay {
    constructor() {
        this.roomCode = '';
        this.currentRhythm = null;
        this.revealedBeats = [];
        this.measureCount = 2;
        this.timeSignature = '4/4';

        this.init();
    }

    init() {
        this.getRoomCodeFromURL();
        this.setupDisplay();
        if (this.roomCode) {
            this.connectToFirebase();
        }
    }

    getRoomCodeFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        this.roomCode = urlParams.get('room');

        if (this.roomCode) {
            this.roomCode = this.roomCode.toUpperCase();
            document.getElementById('roomCodeDisplay').textContent = `Room: ${this.roomCode}`;
        } else {
            document.getElementById('roomCodeDisplay').textContent = 'Add ?room=CODE to URL';
        }
    }

    setupDisplay() {
        const container = document.getElementById('measureContainer');
        container.innerHTML = '';

        // Create single continuous staff container - EXACT COPY from student interface
        const measureContainer = document.createElement('div');
        measureContainer.className = 'measure-container';

        const staffDiv = document.createElement('div');
        staffDiv.className = 'answer-staff';
        staffDiv.innerHTML = `
            <div class="answer-staff-label">Answer (${this.measureCount} measures)</div>
            <div class="staff-container">
                <div class="staff-lines">
                    <div class="staff-line"></div>
                </div>
                <div class="percussion-clef"></div>
                <div class="time-signature">
                    <div class="time-sig-top">${this.timeSignature.split('/')[0]}</div>
                    <div class="time-sig-bottom">${this.timeSignature.split('/')[1]}</div>
                </div>
                <div class="beat-divisions" style="margin-left: 45px; margin-right: 20px;">
                    ${Array.from({length: this.measureCount * 4}, (_, i) => {
                        const beat = (i % 4) + 1;
                        const measure = Math.floor(i / 4) + 1;
                        return `
                            <div class="beat-drop-zone" data-beat="${beat}" data-measure="${measure}" data-absolute-beat="${i + 1}">
                                <div class="beat-notation"></div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        measureContainer.appendChild(staffDiv);
        container.appendChild(measureContainer);
    }

    async connectToFirebase() {
        // Wait for Firebase to load
        while (!window.firebase) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        try {
            console.log('Projection connecting to room:', this.roomCode);
            const roomRef = window.firebase.ref(window.firebase.database, `rhythm-rooms/${this.roomCode}`);

            window.firebase.onValue(roomRef, (snapshot) => {
                if (snapshot.exists()) {
                    const roomData = snapshot.val();
                    console.log('Projection connected to room, data exists:', roomData);

                    // Update connection status
                    document.getElementById('connectionStatus').textContent = 'Connected';

                    // Update display based on room data
                    this.handleRoomUpdate(roomData);
                } else {
                    console.log('Room not found in Firebase:', this.roomCode);
                    document.getElementById('connectionStatus').textContent = 'Room not found';
                }
            });

        } catch (error) {
            console.error('Error connecting to Firebase:', error);
            document.getElementById('connectionStatus').textContent = 'Connection error';
        }
    }

    handleRoomUpdate(roomData) {
        console.log('Projection received room data:', roomData);

        // Update measure count or time signature if changed
        if (roomData.measureCount !== this.measureCount ||
            roomData.timeSignature !== this.timeSignature) {
            this.measureCount = roomData.measureCount;
            this.timeSignature = roomData.timeSignature || '4/4';
            this.setupDisplay();
        }

        // Handle revealed beats
        if (roomData.revealedBeats && roomData.revealedBeats.length > 0) {
            this.revealedBeats = roomData.revealedBeats;
            this.showRevealedBeats(roomData.currentRhythm);
            document.getElementById('waitingMessage').textContent = '';
        } else if (roomData.exerciseActive) {
            // Exercise is active but no reveals yet
            console.log('Exercise is active, showing in progress message');
            this.clearAllBeats();
            document.getElementById('waitingMessage').textContent = 'Exercise in progress...';
        } else {
            // No active exercise
            console.log('No active exercise, exerciseActive:', roomData.exerciseActive);
            this.clearAllBeats();
            document.getElementById('waitingMessage').textContent = 'Waiting for exercise to begin...';
        }
    }

    showRevealedBeats(rhythmData) {
        if (!rhythmData || !rhythmData[0]) return;

        this.revealedBeats.forEach(beatNumber => {
            const patternId = rhythmData[0][beatNumber - 1];
            if (patternId) {
                const measure = Math.floor((beatNumber - 1) / 4) + 1;
                const beat = ((beatNumber - 1) % 4) + 1;
                this.displayPattern(measure, beat, patternId);
            }
        });
    }

    displayPattern(measure, beat, patternId) {
        // Import and use the same rhythm assets as student interface
        import('./rhythm-assets/rhythm-assets.js').then(module => {
            const rhythmAssets = module.rhythmAssets;

            // Find notation element using the same structure as student interface
            const beatDropZones = document.querySelectorAll('.beat-drop-zone');
            let notationElement = null;

            beatDropZones.forEach(zone => {
                if (zone.dataset.beat == beat && zone.dataset.measure == measure) {
                    notationElement = zone.querySelector('.beat-notation');
                }
            });

            if (!notationElement) return;

            const asset = rhythmAssets[patternId];
            if (asset) {
                // Create PNG image exactly like student interface
                const img = document.createElement('img');
                img.src = `./rhythm-assets/${asset.file}`;
                img.style.position = 'absolute';
                img.style.top = '55%';
                img.style.left = '50%';
                img.style.transform = 'translate(-50%, -50%) scale(0.265)';
                img.alt = asset.name;

                notationElement.innerHTML = '';
                notationElement.appendChild(img);
                console.log('PNG image displayed for pattern:', patternId);
            } else {
                console.warn('No PNG asset found for pattern:', patternId);
                notationElement.innerHTML = `<span style="color: red; font-size: 0.7rem;">Missing: ${patternId}</span>`;
            }
        }).catch(error => {
            console.error('Error loading rhythm assets:', error);
            const beatDropZones = document.querySelectorAll('.beat-drop-zone');
            let notationElement = null;

            beatDropZones.forEach(zone => {
                if (zone.dataset.beat == beat && zone.dataset.measure == measure) {
                    notationElement = zone.querySelector('.beat-notation');
                }
            });

            if (notationElement) {
                notationElement.innerHTML = `<span style="color: red; font-size: 0.7rem;">${patternId}</span>`;
            }
        });
    }

    clearAllBeats() {
        document.querySelectorAll('.beat-drop-zone').forEach(zone => {
            const notationElement = zone.querySelector('.beat-notation');
            if (notationElement) {
                notationElement.innerHTML = '';
            }
        });
    }
}

// Initialize the projection display
let projectionDisplay;
document.addEventListener('DOMContentLoaded', () => {
    projectionDisplay = new ProjectionDisplay();
});