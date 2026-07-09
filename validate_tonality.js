/**
 * TONALITY VALIDATION SCRIPT
 * Validates that melodies use proper scale degrees for their key
 * Ensures classical tonal integrity for educational purposes
 */

/**
 * Define scale degrees for each key and mode.
 * The original 4 entries (C major, A minor x3) are kept EXACTLY as authored below —
 * every question ever validated against them keeps behaving identically.
 */
const LEGACY_SCALE_DEFINITIONS = {
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
 * Generalized scale spelling (circle-of-fifths transposition), so the validator can judge
 * melodies in ANY of the 15 major / 15 relative-minor keys, not just C major / A minor.
 * Mirrors the verified spelling logic in core/melodic generator — same math, so a melody
 * the generator considers "in G major" and this validator considers "in G major" agree.
 */
const LETTER_SEQ = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
const LETTER_PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const MODE_OFFSETS = {
    'major':          [0, 2, 4, 5, 7, 9, 11],
    'natural-minor':  [0, 2, 3, 5, 7, 8, 10],
    'harmonic-minor': [0, 2, 3, 5, 7, 8, 11],
    'melodic-minor':  [0, 2, 3, 5, 7, 9, 11], // ascending form
};
function spellScaleDegrees(tonicSpell, mode) {
    const base = tonicSpell[0].toLowerCase();
    let tacc = 0;
    for (let i = 1; i < tonicSpell.length; i++) tacc += tonicSpell[i] === '#' ? 1 : tonicSpell[i] === 'b' ? -1 : 0;
    const tonicPc = (LETTER_PC[base] + tacc + 120) % 12;
    const startIdx = LETTER_SEQ.indexOf(base);
    const offs = MODE_OFFSETS[mode];
    const scale = [];
    for (let i = 0; i < 7; i++) {
        const letter = LETTER_SEQ[(startIdx + i) % 7];
        const naturalPc = LETTER_PC[letter];
        const desiredPc = (tonicPc + offs[i]) % 12;
        let d = ((desiredPc - naturalPc + 18) % 12) - 6;
        if (d > 2) d -= 12;
        if (d < -2) d += 12;
        const accStr = d === 0 ? '' : (d > 0 ? '#'.repeat(d) : 'b'.repeat(-d));
        scale.push({ letter, acc: d, spell: letter + accStr });
    }
    return scale;
}
function keyLabel(spell) { return spell[0].toUpperCase() + spell.slice(1); }
function scaleToDefinition(scale, description) {
    return {
        natural: scale.filter((s) => s.acc === 0).map((s) => s.spell),
        accidentals: scale.filter((s) => s.acc !== 0).map((s) => s.spell),
        description
    };
}
const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
function buildGeneratedScaleDefinitions() {
    const defs = {};
    for (const tonic of MAJOR_KEYS) {
        const majorScale = spellScaleDegrees(tonic, 'major');
        defs[`${keyLabel(tonic)}_major`] = scaleToDefinition(majorScale, `${keyLabel(tonic)} Major`);
        const minorTonic = majorScale[5].spell; // scale degree 6 of the major key = its relative minor tonic
        defs[`${keyLabel(minorTonic)}_minor_natural`] = scaleToDefinition(spellScaleDegrees(minorTonic, 'natural-minor'), `${keyLabel(minorTonic)} Minor (natural)`);
        defs[`${keyLabel(minorTonic)}_minor_harmonic`] = scaleToDefinition(spellScaleDegrees(minorTonic, 'harmonic-minor'), `${keyLabel(minorTonic)} Minor (harmonic)`);
        defs[`${keyLabel(minorTonic)}_minor_melodic`] = scaleToDefinition(spellScaleDegrees(minorTonic, 'melodic-minor'), `${keyLabel(minorTonic)} Minor (melodic)`);
    }
    return defs;
}
// Generated keys first, legacy 4 spread LAST so they win on any naming collision —
// guarantees byte-identical behavior for every question validated before this change.
const SCALE_DEFINITIONS = { ...buildGeneratedScaleDefinitions(), ...LEGACY_SCALE_DEFINITIONS };

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
/**
 * Detect tonality using ALL given options together (not just one). A single option — e.g. the
 * "correct answer" — often doesn't use every note that distinguishes its key from a coincidental
 * look-alike (a raised-leading-tone distractor might be the only option using g#, which is the
 * one note that rules out C major in favor of A minor). More evidence = fewer misdetections.
 */
function detectTonalityFromOptions(options) {
    const tonalities = Object.keys(SCALE_DEFINITIONS);
    const scores = {};

    for (const tonality of tonalities) {
        let validNoteCount = 0;
        for (const option of options) {
            const result = validateOptionTonality(option, tonality, 0, 0); // dummy numbers for detection
            validNoteCount += result.allUsedNotes.length - result.allInvalidNotes.length;
        }
        scores[tonality] = validNoteCount;
    }

    // Return the tonality with the highest score. On a TIE — common for short/sparse melodies,
    // since many keys' scales overlap on any given small subset of notes (e.g. C major and F
    // melodic minor both spell {c,d,e,f,g} with zero accidentals) — prefer the SIMPLER key
    // (fewer accidentals). Don't guess an exotic key when a plainer one explains the notes
    // equally well; this is what keeps 30-key detection from misfiring on legacy short melodies
    // that were written/validated back when only C major / A minor existed as candidates.
    return Object.keys(scores).reduce((a, b) => {
        if (scores[b] !== scores[a]) return scores[b] > scores[a] ? b : a;
        return SCALE_DEFINITIONS[b].accidentals.length < SCALE_DEFINITIONS[a].accidentals.length ? b : a;
    });
}

function detectTonality(option) {
    return detectTonalityFromOptions([option]);
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
        detectedTonality = detectTonalityFromOptions(questionSet);
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
        detectTonalityFromOptions,
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