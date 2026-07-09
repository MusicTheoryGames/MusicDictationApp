// Wait for VexFlow to load
let VF;
if (typeof Vex !== 'undefined') {
    VF = Vex.Flow;
} else {
    console.error('VexFlow not loaded');
}

let selectedOption = null;
let correctAnswer = 0; // Index of correct answer in current shuffled order
let currentQuestionSet = 0; // Which question set we're using (0-based)
let currentCorrectOption = 0; // Which option from the set is correct (0-5)
let shuffledOptions = []; // Current randomized order of options
let usedQuestionSets = []; // Track which question sets have been used

// Auto-repeat settings
let autoRepeatCount = 2; // Default to 2x
let currentPlayCount = 0;
let isAutoPlaying = false;
let playbackSpeed = 1.0; // Default normal speed (1.0x)

// MODULAR QUESTION LOADING SYSTEM
// File mapping for current 60 questions (6 files × 10 questions each)
const FILE_MAPPING = [
    // Questions 1-10: 4/4 time, 2 measures, C major, simple
    { file: 'questions_4-4_2m_C-major_simple.js', startQuestion: 1, count: 10 },
    // Questions 11-20: 4/4 time, 2 measures, C major, complex
    { file: 'questions_4-4_2m_C-major_complex.js', startQuestion: 11, count: 10 },
    // Questions 21-30: 4/4 time, 2 measures, A minor, simple
    { file: 'questions_4-4_2m_A-minor_simple.js', startQuestion: 21, count: 10 },
    // Questions 31-40: 4/4 time, 2 measures, A minor, complex (WITH G# FIXES!)
    { file: 'questions_4-4_2m_A-minor_complex.js', startQuestion: 31, count: 10 },
    // Questions 41-50: 4/4 time, 4 measures, C major, simple
    { file: 'questions_4-4_4m_C-major_simple.js', startQuestion: 41, count: 10 },
    // Questions 51-60: 6/8 time, 2 measures, C major, simple
    { file: 'questions_6-8_2m_C-major_simple.js', startQuestion: 51, count: 10 }
];

// Global variables for modular loading
let allQuestionSets = [];
let questionsLoaded = false;
let loadingProgress = 0;

/**
 * Load a single question file using HTML script tag approach (most reliable)
 */
function loadQuestionFile(filename) {
    return new Promise((resolve, reject) => {
        // Check if already loaded (variable exists in window)
        const variableName = filename.replace('.js', '').replace(/-/g, '_');
        if (window[variableName]) {
            console.log(`✅ ${filename} already loaded`);
            resolve(window[variableName]);
            return;
        }

        console.log(`📁 Loading ${filename}...`);

        const script = document.createElement('script');
        script.src = filename;
        script.async = false; // Ensure sequential loading

        script.onload = () => {
            // Give a small delay for the variable to be available
            setTimeout(() => {
                const questionData = window[variableName];
                if (questionData && Array.isArray(questionData)) {
                    console.log(`✅ Loaded ${filename}: ${questionData.length} questions`);
                    resolve(questionData);
                } else {
                    console.error(`❌ ${filename}: Variable ${variableName} not found or invalid`);
                    reject(new Error(`Failed to load questions from ${filename}`));
                }
            }, 10);
        };

        script.onerror = () => {
            console.error(`❌ Failed to load script: ${filename}`);
            reject(new Error(`Failed to load ${filename}`));
        };

        document.head.appendChild(script);
    });
}

/**
 * Load all question files sequentially
 */
async function loadAllQuestions() {
    if (questionsLoaded) {
        return allQuestionSets;
    }

    console.log('🎵 Loading modular question system...');
    console.log(`📂 Loading ${FILE_MAPPING.length} question files...`);

    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.textContent = 'Loading questions...';
        loadingIndicator.style.display = 'block';
    }

    allQuestionSets = [];

    try {
        for (let i = 0; i < FILE_MAPPING.length; i++) {
            const mapping = FILE_MAPPING[i];

            updateLoadingProgress(i, FILE_MAPPING.length, `Loading ${mapping.file}...`);

            try {
                const questionData = await loadQuestionFile(mapping.file);

                if (questionData && Array.isArray(questionData)) {
                    // Add all questions from this file
                    allQuestionSets.push(...questionData);
                    console.log(`✅ Added ${questionData.length} questions from ${mapping.file}`);
                } else {
                    console.error(`❌ Invalid data from ${mapping.file}`);
                    // Add empty placeholders to maintain question numbering
                    for (let j = 0; j < mapping.count; j++) {
                        allQuestionSets.push([]);
                    }
                }
            } catch (error) {
                console.error(`❌ Error loading ${mapping.file}:`, error);
                // Add empty placeholders to maintain question numbering
                for (let j = 0; j < mapping.count; j++) {
                    allQuestionSets.push([]);
                }
            }
        }

        questionsLoaded = true;
        updateLoadingProgress(FILE_MAPPING.length, FILE_MAPPING.length, 'Questions loaded!');

        console.log(`🎉 Modular loading complete: ${allQuestionSets.length} question sets loaded`);

        if (loadingIndicator) {
            setTimeout(() => {
                loadingIndicator.style.display = 'none';
            }, 1000);
        }

    } catch (error) {
        console.error('❌ Critical error during question loading:', error);
        if (loadingIndicator) {
            loadingIndicator.textContent = 'Error loading questions';
            loadingIndicator.style.color = 'red';
        }
        throw error;
    }

    return allQuestionSets;
}

function updateLoadingProgress(current, total, message) {
    loadingProgress = Math.round((current / total) * 100);
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.textContent = `${message} (${loadingProgress}%)`;
    }
    console.log(`📊 Loading progress: ${loadingProgress}% - ${message}`);
}

// Initialize the app with modular loading
window.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Starting modular Music Dictation app...');

    try {
        await loadAllQuestions();

        if (allQuestionSets.length > 0) {
            console.log('✅ Questions loaded successfully');
            console.log(`📊 Total question sets: ${allQuestionSets.length}`);

            // Initialize with first question
            currentQuestionSet = 0;
            questionOptions = allQuestionSets[currentQuestionSet];

            // Validate first question set
            if (validateQuestionSet()) {
                generateOptions();
                updateQuestionCounter();
                console.log('🎯 App ready for use!');
            } else {
                throw new Error('First question set validation failed');
            }
        } else {
            throw new Error('No questions loaded');
        }
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        const container = document.getElementById('optionsContainer');
        if (container) {
            container.innerHTML = `
                <div style="color: red; text-align: center; padding: 20px;">
                    <h3>❌ Failed to load questions</h3>
                    <p>${error.message}</p>
                    <button onclick="location.reload()">Reload Page</button>
                </div>
            `;
        }
    }
});

// Rest of the app logic (keeping existing functions from working app.js)
let questionOptions = []; // This will be populated after loading

function createNotation(containerId, option) {
    if (!VF) {
        console.error('VexFlow not available');
        return;
    }

    // Clear existing content
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    try {
        // Create renderer with maximum width for TV screen visibility
        const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
        renderer.resize(420, 100);
        const context = renderer.getContext();

        // Use the exact original working dimensions from app.js
        const stave1 = new VF.Stave(5, -10, 220);
        const clefType = option.clef || 'treble';
        const timeSignature = option.timeSignature || '4/4';
        stave1.addClef(clefType).addTimeSignature(timeSignature);
        stave1.setContext(context).draw();

        const stave2 = new VF.Stave(225, -10, 170);
        // No clef or time signature for second measure
        stave2.setContext(context).draw();

        // Add additional staves for 4-measure questions
        let stave3, stave4;
        if (option.measure3 && option.measure4) {
            renderer.resize(820, 200); // Wider for 4 measures, taller for 2 systems

            // Second system for measures 3-4
            stave3 = new VF.Stave(5, 90, 220);
            stave3.setContext(context).draw();

            stave4 = new VF.Stave(225, 90, 170);
            stave4.setContext(context).draw();
        }

        // Create notes for each measure
        const notes1 = createStaveNotes(option.measure1, clefType);
        const notes2 = createStaveNotes(option.measure2, clefType);

        let notes3, notes4;
        if (option.measure3 && option.measure4) {
            notes3 = createStaveNotes(option.measure3, clefType);
            notes4 = createStaveNotes(option.measure4, clefType);
        }

        // Create voices and format each measure
        formatAndDrawMeasure(context, stave1, notes1, timeSignature, clefType, option.measure1);
        formatAndDrawMeasure(context, stave2, notes2, timeSignature, clefType, option.measure2);

        if (notes3 && notes4) {
            formatAndDrawMeasure(context, stave3, notes3, timeSignature, clefType, option.measure3);
            formatAndDrawMeasure(context, stave4, notes4, timeSignature, clefType, option.measure4);
        }

    } catch (error) {
        console.error('Error creating notation:', error);
        container.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

function createStaveNotes(measure, clefType) {
    return measure.map(note => {
        if (note.duration.includes('r')) {
            return new VF.StaveNote({ keys: ['b/4'], duration: note.duration, clef: clefType });
        }

        // ⚠️ CRITICAL STEM DIRECTION LOGIC - DO NOT MODIFY ⚠️
        // Use auto_stem for non-eighth notes, but not for eighth notes that will be beamed
        // This prevents conflicts between individual note stem directions and beam group directions
        const useAutoStem = note.duration !== '8';
        const staveNote = new VF.StaveNote({
            keys: note.keys,
            duration: note.duration,
            clef: clefType,
            auto_stem: useAutoStem
        });
        // ⚠️ END CRITICAL SECTION ⚠️

        // Add dots for dotted notes
        if (note.duration === 'qd' || note.duration === 'hd') {
            staveNote.addModifier(new VF.Dot(), 0);
        }

        // Add sharp accidentals for G# notes (leading tone in A minor)
        if (note.keys[0].includes('#')) {
            staveNote.addModifier(new VF.Accidental('#'), 0);
        }

        return staveNote;
    });
}

function setStemDirection(staveNote, noteKey, clefType) {
    if (clefType === 'bass') {
        // Bass clef: notes below middle line (D3) go UP, on/above go DOWN
        if (noteKey === 'c/3' || noteKey === 'a/2' || noteKey === 'b/2' || noteKey === 'g#/2') {
            staveNote.setStemDirection(VF.Stem.UP);
        } else {
            staveNote.setStemDirection(VF.Stem.DOWN);
        }
    } else {
        // Treble clef: notes below/on middle line (B4) go UP, above go DOWN
        if (noteKey === 'c/4' || noteKey === 'd/4' || noteKey === 'e/4' ||
            noteKey === 'f/4' || noteKey === 'g/4' || noteKey === 'a/4' ||
            noteKey === 'g#/4' || noteKey === 'b/4') {
            staveNote.setStemDirection(VF.Stem.UP);
        } else {
            staveNote.setStemDirection(VF.Stem.DOWN);
        }
    }
}

function formatAndDrawMeasure(context, stave, notes, timeSignature, clefType, measureData) {
    // Create beams based on time signature - EXACT COPY from original
    const createBeams = (notes, measureNotes, timeSignature) => {
        if (timeSignature === '6/8') {
            // In 6/8 time, find consecutive eighth notes and beam them in groups of 3
            const beams = [];
            let consecutiveEighths = [];

            for (let i = 0; i < notes.length; i++) {
                if (notes[i].getDuration() === '8') {
                    consecutiveEighths.push(notes[i]);

                    // ⚠️ CRITICAL: auto_stem in beam options fixes stem attachment positioning ⚠️
                    if (consecutiveEighths.length === 3) {
                        beams.push(new VF.Beam(consecutiveEighths, { auto_stem: true }));
                        consecutiveEighths = [];
                    }
                } else {
                    // Non-eighth note breaks the sequence
                    if (consecutiveEighths.length >= 2) {
                        beams.push(new VF.Beam(consecutiveEighths, { auto_stem: true }));
                    }
                    consecutiveEighths = [];
                }
            }

            // Handle any remaining consecutive eighths
            if (consecutiveEighths.length >= 2) {
                beams.push(new VF.Beam(consecutiveEighths, { auto_stem: true }));
            }

            return beams;
        } else {
            // For 4/4 time, use custom beaming that respects beat boundaries
            const beams = [];
            let consecutiveEighths = [];
            let currentBeat = 0;
            let lastBeatGroup = -1;

            for (let i = 0; i < notes.length; i++) {
                const note = notes[i];
                const duration = note.getDuration();
                let beats;

                // Calculate beats for each duration
                if (duration === 'w') beats = 4;
                else if (duration === 'hd') beats = 3;
                else if (duration === 'h') beats = 2;
                else if (duration === 'qd') beats = 1.5;
                else if (duration === 'q') beats = 1;
                else if (duration === '8') beats = 0.5;
                else if (duration === '16') beats = 0.25;
                else beats = 1; // default

                if (duration === '8') {
                    // Determine which beat this eighth note belongs to
                    // Beat groups: 0-1=beat1, 1-2=beat2, 2-3=beat3, 3-4=beat4
                    const startBeatGroup = Math.floor(currentBeat);
                    const endBeatGroup = Math.floor(currentBeat + beats - 0.001);

                    // If this eighth note starts a new beat group, finalize previous group
                    if (lastBeatGroup !== -1 && startBeatGroup !== lastBeatGroup) {
                        if (consecutiveEighths.length >= 2) {
                            beams.push(new VF.Beam(consecutiveEighths, { auto_stem: true }));
                        }
                        consecutiveEighths = [];
                    }

                    consecutiveEighths.push(note);
                    lastBeatGroup = startBeatGroup;

                    // If this eighth note spans across beat boundaries, end the group
                    if (startBeatGroup !== endBeatGroup) {
                        if (consecutiveEighths.length >= 2) {
                            beams.push(new VF.Beam(consecutiveEighths, { auto_stem: true }));
                        }
                        consecutiveEighths = [];
                        lastBeatGroup = -1;
                    }
                } else {
                    // Non-eighth note breaks the sequence
                    if (consecutiveEighths.length >= 2) {
                        beams.push(new VF.Beam(consecutiveEighths, { auto_stem: true }));
                    }
                    consecutiveEighths = [];
                    lastBeatGroup = -1;
                }

                currentBeat += beats;
            }

            // Handle any remaining consecutive eighths
            if (consecutiveEighths.length >= 2) {
                beams.push(new VF.Beam(consecutiveEighths, { auto_stem: true }));
            }

            return beams;
        }
    };

    const beams = createBeams(notes, measureData, timeSignature);

    // ⚠️⚠️⚠️ CRITICAL UNBEAMED EIGHTH NOTES FIX - DO NOT MODIFY ⚠️⚠️⚠️
    // This function fixes stem directions for individual eighth notes that are NOT in beams
    const fixUnbeamedEighthNotes = (notes, beams, clefType) => {
        // Get all notes that are in beams
        const beamedNotes = new Set();
        beams.forEach(beam => {
            beam.notes.forEach(note => beamedNotes.add(note));
        });

        // Fix stem direction for eighth notes that are NOT beamed
        notes.forEach(note => {
            if (note.getDuration() === '8' && !beamedNotes.has(note)) {
                // Apply auto stem direction for unbeamed eighth notes
                const noteKey = note.keys[0];

                if (clefType === 'bass') {
                    // Bass clef: below D3 = UP, D3 and above = DOWN
                    if (noteKey === 'c/3' || noteKey === 'b/2' || noteKey === 'a/2' || noteKey === 'g/2') {
                        note.setStemDirection(VF.Stem.UP);
                    } else {
                        note.setStemDirection(VF.Stem.DOWN);
                    }
                } else {
                    // Treble clef: below B4 = UP, B4 and above = DOWN
                    if (noteKey === 'a/4' || noteKey === 'g/4' || noteKey === 'f/4' ||
                        noteKey === 'e/4' || noteKey === 'd/4' || noteKey === 'c/4' || noteKey === 'g#/4') {
                        note.setStemDirection(VF.Stem.UP);
                    } else {
                        note.setStemDirection(VF.Stem.DOWN);
                    }
                }
            }
        });
    };

    // Use the original working method from app.js
    VF.Formatter.FormatAndDraw(context, stave, notes);

    // Apply the fix
    fixUnbeamedEighthNotes(notes, beams, clefType);

    // Draw beams
    beams.forEach(beam => beam.setContext(context).draw());
}

// Keep all the existing validation, UI, and audio functions from the working app.js
// (continuing with the rest of the original functions...)

function validateQuestionSet() {
    const setIndex = currentQuestionSet + 1;

    if (!questionOptions || !Array.isArray(questionOptions)) {
        console.error(`❌ Question Set ${setIndex}: questionOptions is invalid`, questionOptions);
        return false;
    }

    if (questionOptions.length !== 6) {
        console.error(`❌ Question Set ${setIndex}: Has ${questionOptions.length} options instead of 6`);
        return false;
    }

    questionOptions.forEach((option, index) => {
        if (!option || !option.measure1 || !option.measure2) {
            console.error(`❌ Question Set ${setIndex}, Option ${index}: Missing required measures`);
            return false;
        }
    });

    console.log(`✅ Question Set ${setIndex}: Validation passed`);
    return true;
}

function generateOptions() {
    validateQuestionSet();
    shuffleOptionsForNewQuestion();

    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';

    if (shuffledOptions.length !== 6) {
        console.error(`❌ CRITICAL ERROR: Question Set ${currentQuestionSet + 1} has ${shuffledOptions.length} options instead of 6!`);
        container.innerHTML = `
            <div style="color: red; font-size: 1.2rem; text-align: center; padding: 20px;">
                ❌ ERROR: Question ${currentQuestionSet + 1} is missing options!<br>
                Found ${shuffledOptions.length} options, expected 6.<br>
                <button onclick="nextQuestion()" style="margin-top: 10px; padding: 5px 10px;">Skip to Next Question</button>
            </div>
        `;
        return;
    }

    shuffledOptions.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.onclick = () => selectOption(index);

        const notationDiv = document.createElement('div');
        notationDiv.className = 'notation';
        notationDiv.id = `notation-${index}`;

        const label = document.createElement('div');
        label.className = 'option-label';
        label.textContent = String.fromCharCode(65 + index);
        label.style.cssText = `
            font-weight: 700; font-size: 1.25rem; color: white; margin-bottom: 12px;
            text-align: center; flex-shrink: 0; width: 40px; height: 40px;
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
            margin: 0 auto 12px auto; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            transition: all 0.3s ease;
        `;

        const colors = ['#e74c3c', '#1abc9c', '#3498db', '#27ae60', '#f39c12', '#9b59b6'];
        label.style.background = colors[index];
        label.style.border = `1px solid ${colors[index]}80`;

        optionDiv.appendChild(label);
        optionDiv.appendChild(notationDiv);
        container.appendChild(optionDiv);

        // Create notation after DOM element is added
        setTimeout(() => createNotation(`notation-${index}`, option), 10);
    });

    updateQuestionHeader();
}

function shuffleOptionsForNewQuestion() {
    currentCorrectOption = Math.floor(Math.random() * 6);
    shuffledOptions = [...questionOptions];

    // Fisher-Yates shuffle
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }

    correctAnswer = shuffledOptions.findIndex((option, index) =>
        option === questionOptions[currentCorrectOption]
    );

    console.log(`Question using option ${currentCorrectOption} as correct answer, now at position ${correctAnswer}`);
}

function updateQuestionHeader() {
    const header = document.querySelector('.question-header h1');
    if (header) {
        header.textContent = `Melodic Dictation - Easy`;
    }
}

function updateQuestionCounter() {
    const counter = document.getElementById('questionCounter');
    if (counter) {
        counter.textContent = `Question ${currentQuestionSet + 1} of ${allQuestionSets.length}`;
    }
}

function nextQuestion() {
    const newQuestionSet = currentQuestionSet < allQuestionSets.length - 1 ? currentQuestionSet + 1 : 0;
    skipToQuestionSet(newQuestionSet);
    generateOptions();
    updateQuestionCounter();
}

function previousQuestion() {
    const newQuestionSet = currentQuestionSet > 0 ? currentQuestionSet - 1 : allQuestionSets.length - 1;
    skipToQuestionSet(newQuestionSet);
    generateOptions();
    updateQuestionCounter();
}

function skipToQuestionSet(setIndex) {
    if (setIndex < 0 || setIndex >= allQuestionSets.length) {
        console.error(`Invalid question set index: ${setIndex}`);
        return;
    }

    currentQuestionSet = setIndex;
    currentCorrectOption = 0;
    questionOptions = allQuestionSets[currentQuestionSet];
    selectedOption = null;

    // Reset UI
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect');
        opt.style.pointerEvents = 'auto';
    });
    document.getElementById('submitButton').disabled = true;

    console.log(`Skipped to Question Set ${setIndex + 1}`);
}

function selectOption(index) {
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });

    document.querySelectorAll('.option')[index].classList.add('selected');
    selectedOption = index;

    document.getElementById('submitButton').disabled = false;
}

function checkAnswer() {
    if (selectedOption === null) return;

    const options = document.querySelectorAll('.option');

    options.forEach((opt, index) => {
        if (index === correctAnswer) {
            opt.classList.add('correct');
        } else if (index === selectedOption && index !== correctAnswer) {
            opt.classList.add('incorrect');
        }
        opt.style.pointerEvents = 'none';
    });

    document.getElementById('submitButton').disabled = true;

    const isCorrect = selectedOption === correctAnswer;
    showFeedback(isCorrect);
}

function showFeedback(isCorrect) {
    const overlay = document.getElementById('feedbackOverlay');
    const icon = document.getElementById('feedbackIcon');
    const text = document.getElementById('feedbackText');

    if (isCorrect) {
        overlay.className = 'feedback-overlay correct';
        icon.textContent = '✓';
        text.textContent = 'Correct!';
    } else {
        overlay.className = 'feedback-overlay incorrect';
        icon.textContent = '✗';
        text.textContent = 'Incorrect';
    }

    overlay.classList.add('show');

    setTimeout(() => {
        overlay.classList.remove('show');
    }, 2000);
}

// Audio playback functions (simplified for now)
function playAudio() {
    console.log('🎵 Playing audio for current question...');
    // TODO: Implement audio playback
}

console.log('📁 Modular app.js loaded successfully');