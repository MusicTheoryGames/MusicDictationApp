/**
 * TONALITY VALIDATION SCRIPT
 * Validates that melodies use proper C major or A minor scale degrees
 * Ensures classical tonal integrity for educational purposes
 */

/**
 * Define scale degrees for each key and mode
 */
const SCALE_DEFINITIONS = {
    'C_major': {
        natural: ['c', 'd', 'e', 'f', 'g', 'a', 'b'],
        accidentals: [], // No accidentals in C major
        description: 'C Major (natural)'
    },
    'A_minor_natural': {
        natural: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        accidentals: [], // No accidentals in natural minor
        description: 'A Minor (natural)'
    },
    'A_minor_harmonic': {
        natural: ['a', 'b', 'c', 'd', 'e', 'f'],
        accidentals: ['g#'], // Raised 7th degree
        description: 'A Minor (harmonic)'
    },
    'A_minor_melodic': {
        natural: ['a', 'b', 'c', 'd', 'e'],
        accidentals: ['f#', 'g#'], // Raised 6th and 7th degrees (ascending)
        description: 'A Minor (melodic)'
    }
};

/**
 * Extract note name from VexFlow key notation
 * @param {string} key - VexFlow key like 'c/4', 'f#/3', 'bb/5'
 * @returns {string} Note name like 'c', 'f#', 'bb'
 */
function extractNoteName(key) {
    if (!key || typeof key !== 'string') {
        throw new Error(`Invalid key format: ${key}`);
    }
    
    // Split by '/' and take the first part
    const notePart = key.split('/')[0];
    if (!notePart) {
        throw new Error(`Could not extract note from key: ${key}`);
    }
    
    return notePart.toLowerCase();
}

/**
 * Validate a single measure against a specific tonality
 * @param {Array} measure - Array of note objects with keys property
 * @param {string} tonality - One of: 'C_major', 'A_minor_natural', 'A_minor_harmonic', 'A_minor_melodic'
 * @param {number} questionNumber - Question number for error reporting
 * @param {number} optionIndex - Option index for error reporting
 * @param {string} measureName - Measure name for error reporting
 * @returns {Object} Validation result with success flag and details
 */
function validateMeasureTonality(measure, tonality, questionNumber, optionIndex, measureName) {
    const scaleDefinition = SCALE_DEFINITIONS[tonality];
    if (!scaleDefinition) {
        throw new Error(`Unknown tonality: ${tonality}. Valid options: ${Object.keys(SCALE_DEFINITIONS).join(', ')}`);
    }
    
    const allowedNotes = [...scaleDefinition.natural, ...scaleDefinition.accidentals];
    const usedNotes = [];
    const invalidNotes = [];
    
    for (let i = 0; i < measure.length; i++) {
        const note = measure[i];
        
        // Skip rests
        if (!note.keys || note.duration.includes('r')) {
            continue;
        }
        
        // Check each key in the note (for chords, though we expect single notes)
        for (const key of note.keys) {
            const noteName = extractNoteName(key);
            usedNotes.push(noteName);
            
            if (!allowedNotes.includes(noteName)) {
                invalidNotes.push({
                    note: noteName,
                    position: i,
                    key: key
                });
            }
        }
    }
    
    return {
        success: invalidNotes.length === 0,
        tonality: scaleDefinition.description,
        usedNotes: [...new Set(usedNotes)], // Remove duplicates
        invalidNotes: invalidNotes,
        errorMessage: invalidNotes.length > 0 
            ? `Question ${questionNumber}, Option ${optionIndex}, ${measureName}: Invalid notes for ${scaleDefinition.description}: ${invalidNotes.map(n => n.note).join(', ')}`
            : null
    };
}

/**
 * Validate an entire question option against a specific tonality
 * @param {Object} option - Question option with measure1, measure2, etc.
 * @param {string} tonality - Target tonality to validate against
 * @param {number} questionNumber - Question number for error reporting
 * @param {number} optionIndex - Option index for error reporting
 * @returns {Object} Validation result
 */
function validateOptionTonality(option, tonality, questionNumber, optionIndex) {
    const results = [];
    
    // Get all measures in the option
    const measures = ['measure1', 'measure2'];
    if (option.measure3 && option.measure4) {
        measures.push('measure3', 'measure4');
    }
    if (option.measure5 && option.measure6 && option.measure7 && option.measure8) {
        measures.push('measure5', 'measure6', 'measure7', 'measure8');
    }
    
    // Validate each measure
    for (const measureName of measures) {
        const measure = option[measureName];
        if (!measure) {
            continue;
        }
        
        const result = validateMeasureTonality(measure, tonality, questionNumber, optionIndex, measureName);
        results.push({
            measure: measureName,
            ...result
        });
    }
    
    // Compile overall result
    const allValid = results.every(r => r.success);
    const allUsedNotes = [...new Set(results.flatMap(r => r.usedNotes))];
    const allInvalidNotes = results.flatMap(r => r.invalidNotes);
    
    return {
        success: allValid,
        tonality: tonality,
        measures: results,
        allUsedNotes: allUsedNotes,
        allInvalidNotes: allInvalidNotes,
        errorMessage: allValid ? null : `Question ${questionNumber}, Option ${optionIndex}: Contains notes outside ${SCALE_DEFINITIONS[tonality].description}`
    };
}

/**
 * Auto-detect the most likely tonality for a question option
 * @param {Object} option - Question option to analyze
 * @returns {string} Most likely tonality
 */
function detectTonality(option) {
    const tonalities = Object.keys(SCALE_DEFINITIONS);
    const scores = {};
    
    // Try each tonality and count how many notes fit
    for (const tonality of tonalities) {
        const result = validateOptionTonality(option, tonality, 0, 0); // Use dummy numbers for detection
        const validNoteCount = result.allUsedNotes.length - result.allInvalidNotes.length;
        scores[tonality] = validNoteCount;
    }
    
    // Return the tonality with the highest score
    return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
}

/**
 * Validate all options in a question set for proper tonality
 * @param {Array} questionSet - Array of 6 options
 * @param {number} questionNumber - Question number for error reporting
 * @param {string} expectedTonality - Expected tonality (optional, will auto-detect if not provided)
 * @returns {Object} Validation result for entire question set
 */
function validateQuestionSetTonality(questionSet, questionNumber, expectedTonality = null) {
    if (!Array.isArray(questionSet) || questionSet.length !== 6) {
        throw new Error(`Question ${questionNumber}: Must have exactly 6 options, found ${questionSet.length}`);
    }
    
    const results = [];
    let detectedTonality = expectedTonality;
    
    // Auto-detect tonality from first option if not provided
    if (!detectedTonality) {
        detectedTonality = detectTonality(questionSet[0]);
    }
    
    // Validate each option
    for (let i = 0; i < 6; i++) {
        const result = validateOptionTonality(questionSet[i], detectedTonality, questionNumber, i);
        results.push(result);
    }
    
    // Compile overall result
    const allValid = results.every(r => r.success);
    const errorMessages = results.filter(r => !r.success).map(r => r.errorMessage);
    
    return {
        success: allValid,
        questionNumber: questionNumber,
        detectedTonality: detectedTonality,
        tonalityDescription: SCALE_DEFINITIONS[detectedTonality].description,
        options: results,
        errorMessages: errorMessages,
        summary: allValid 
            ? `Question ${questionNumber}: All options valid for ${SCALE_DEFINITIONS[detectedTonality].description}`
            : `Question ${questionNumber}: ${errorMessages.length} options have tonality errors`
    };
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateMeasureTonality,
        validateOptionTonality,
        validateQuestionSetTonality,
        detectTonality,
        SCALE_DEFINITIONS
    };
}

// Example usage and testing function
function testTonalityValidation() {
    console.log('🎵 Testing Tonality Validation System...\n');
    
    // Test with a simple C major melody
    const testOption = {
        measure1: [
            { keys: ['c/4'], duration: 'q' },
            { keys: ['d/4'], duration: 'q' },
            { keys: ['e/4'], duration: 'q' },
            { keys: ['f/4'], duration: 'q' }
        ],
        measure2: [
            { keys: ['g/4'], duration: 'q' },
            { keys: ['a/4'], duration: 'q' },
            { keys: ['b/4'], duration: 'q' },
            { keys: ['c/5'], duration: 'q' }
        ]
    };
    
    const result = validateOptionTonality(testOption, 'C_major', 1, 0);
    console.log('Test Result:', result.success ? '✅ PASS' : '❌ FAIL');
    if (result.errorMessage) {
        console.log('Error:', result.errorMessage);
    }
    console.log('Used notes:', result.allUsedNotes);
}

// Run test if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testTonalityValidation();
}