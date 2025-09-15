/**
 * CADENCE VALIDATION SCRIPT
 * Validates proper cadential patterns in 8-measure examples
 * Ensures Classical period cadence practices
 */

/**
 * Scale degree mappings for different keys
 */
const SCALE_DEGREES = {
    'C_major': {
        'c': 1, 'd': 2, 'e': 3, 'f': 4, 'g': 5, 'a': 6, 'b': 7
    },
    'A_minor': {
        'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5, 'f': 6, 'g': 7, 'g#': 7 // Include raised 7th
    }
};

/**
 * Extract note name from VexFlow key notation
 * @param {string} key - VexFlow key like 'c/4', 'f#/3'
 * @returns {string} Note name like 'c', 'f#'
 */
function extractNoteName(key) {
    if (!key || typeof key !== 'string') {
        throw new Error(`Invalid key format: ${key}`);
    }
    return key.split('/')[0].toLowerCase();
}

/**
 * Get scale degree for a note in a given key
 * @param {string} noteName - Note name like 'c', 'g'
 * @param {string} key - Key like 'C_major', 'A_minor'
 * @returns {number|null} Scale degree (1-7) or null if not in scale
 */
function getScaleDegree(noteName, key) {
    const scaleMap = SCALE_DEGREES[key];
    if (!scaleMap) {
        throw new Error(`Unknown key: ${key}`);
    }
    return scaleMap[noteName] || null;
}

/**
 * Analyze the last few notes of a measure for cadential implications
 * @param {Array} measure - Array of note objects
 * @param {string} key - Key context ('C_major' or 'A_minor')
 * @returns {Object} Analysis of cadential motion
 */
function analyzeCadentialMotion(measure, key) {
    const notes = measure.filter(note => note.keys && !note.duration.includes('r'));
    if (notes.length === 0) {
        return { scaleDegrees: [], lastNote: null, cadentialType: 'unclear' };
    }
    
    const scaleDegrees = notes.map(note => {
        const noteName = extractNoteName(note.keys[0]);
        return getScaleDegree(noteName, key);
    }).filter(degree => degree !== null);
    
    const lastNote = scaleDegrees[scaleDegrees.length - 1];
    const secondToLast = scaleDegrees.length > 1 ? scaleDegrees[scaleDegrees.length - 2] : null;
    
    // Analyze cadential patterns
    let cadentialType = 'unclear';
    
    if (lastNote === 1) {
        // Ends on tonic (1)
        if (secondToLast === 7 || secondToLast === 2) {
            cadentialType = 'authentic'; // 7-1 or 2-1 motion suggests V-I
        } else if (secondToLast === 5) {
            cadentialType = 'authentic'; // 5-1 direct motion
        } else {
            cadentialType = 'tonic_ending';
        }
    } else if (lastNote === 5) {
        // Ends on dominant (5)
        cadentialType = 'half_cadence'; // Pause on dominant
    } else if (lastNote === 2 || lastNote === 7) {
        // Ends on leading tone or supertonic
        cadentialType = 'dominant_approach'; // Approaching dominant or tonic
    } else {
        cadentialType = 'non_cadential';
    }
    
    return {
        scaleDegrees: scaleDegrees,
        lastNote: lastNote,
        secondToLast: secondToLast,
        cadentialType: cadentialType,
        noteNames: notes.map(note => extractNoteName(note.keys[0]))
    };
}

/**
 * Validate cadence at measure 4 (should be half cadence or similar pause)
 * @param {Object} option - Question option with all measures
 * @param {string} key - Key context
 * @param {number} questionNumber - Question number for error reporting
 * @param {number} optionIndex - Option index for error reporting
 * @returns {Object} Validation result
 */
function validateMidPointCadence(option, key, questionNumber, optionIndex) {
    const measure4 = option.measure4;
    if (!measure4) {
        return {
            success: false,
            error: `Question ${questionNumber}, Option ${optionIndex}: Missing measure 4 for mid-point cadence validation`
        };
    }
    
    const analysis = analyzeCadentialMotion(measure4, key);
    const errors = [];
    const warnings = [];
    
    // Check for appropriate mid-point cadence
    if (analysis.cadentialType === 'half_cadence') {
        // Perfect - ends on dominant
    } else if (analysis.cadentialType === 'dominant_approach') {
        // Acceptable - approaching dominant
        warnings.push(`Question ${questionNumber}, Option ${optionIndex}, Measure 4: Approaching dominant rather than landing on it`);
    } else if (analysis.cadentialType === 'authentic') {
        // Warning - too final for mid-point
        warnings.push(`Question ${questionNumber}, Option ${optionIndex}, Measure 4: Authentic cadence too final for mid-point (save for end)`);
    } else {
        // Error - no clear cadential direction
        errors.push(`Question ${questionNumber}, Option ${optionIndex}, Measure 4: No clear cadential motion (ends on scale degree ${analysis.lastNote})`);
    }
    
    return {
        success: errors.length === 0,
        cadenceType: analysis.cadentialType,
        analysis: analysis,
        errors: errors,
        warnings: warnings
    };
}

/**
 * Validate final cadence at measure 8 (should be authentic cadence)
 * @param {Object} option - Question option with all measures
 * @param {string} key - Key context
 * @param {number} questionNumber - Question number for error reporting
 * @param {number} optionIndex - Option index for error reporting
 * @returns {Object} Validation result
 */
function validateFinalCadence(option, key, questionNumber, optionIndex) {
    const measure8 = option.measure8;
    if (!measure8) {
        return {
            success: false,
            error: `Question ${questionNumber}, Option ${optionIndex}: Missing measure 8 for final cadence validation`
        };
    }
    
    const analysis = analyzeCadentialMotion(measure8, key);
    const errors = [];
    const warnings = [];
    
    // Check for appropriate final cadence
    if (analysis.cadentialType === 'authentic') {
        // Perfect - proper authentic cadence
    } else if (analysis.cadentialType === 'tonic_ending') {
        // Acceptable - ends on tonic but unclear approach
        warnings.push(`Question ${questionNumber}, Option ${optionIndex}, Measure 8: Ends on tonic but cadential approach unclear`);
    } else if (analysis.cadentialType === 'half_cadence') {
        // Error - too open for final cadence
        errors.push(`Question ${questionNumber}, Option ${optionIndex}, Measure 8: Half cadence inappropriate for final cadence`);
    } else {
        // Error - no proper resolution
        errors.push(`Question ${questionNumber}, Option ${optionIndex}, Measure 8: No authentic cadence (ends on scale degree ${analysis.lastNote})`);
    }
    
    return {
        success: errors.length === 0,
        cadenceType: analysis.cadentialType,
        analysis: analysis,
        errors: errors,
        warnings: warnings
    };
}

/**
 * Detect key from the overall melody
 * @param {Object} option - Question option with all measures
 * @returns {string} Detected key ('C_major' or 'A_minor')
 */
function detectKeyFromMelody(option) {
    const allNotes = [];
    
    // Collect all notes from all measures
    for (let i = 1; i <= 8; i++) {
        const measure = option[`measure${i}`];
        if (measure) {
            const notes = measure.filter(note => note.keys && !note.duration.includes('r'));
            allNotes.push(...notes.map(note => extractNoteName(note.keys[0])));
        }
    }
    
    // Count note occurrences
    const noteCounts = {};
    allNotes.forEach(note => {
        noteCounts[note] = (noteCounts[note] || 0) + 1;
    });
    
    // Simple heuristic: if G# appears, likely A minor (harmonic/melodic)
    // Otherwise, check for C major vs A minor patterns
    if (noteCounts['g#'] > 0) {
        return 'A_minor';
    }
    
    // Look at first and last notes as additional clues
    const firstNote = allNotes[0];
    const lastNote = allNotes[allNotes.length - 1];
    
    if ((firstNote === 'c' || lastNote === 'c') && !noteCounts['g#']) {
        return 'C_major';
    } else if (firstNote === 'a' || lastNote === 'a') {
        return 'A_minor';
    }
    
    // Default to C major if unclear
    return 'C_major';
}

/**
 * Validate all cadences in an 8-measure option
 * @param {Object} option - Question option with all 8 measures
 * @param {number} questionNumber - Question number for error reporting
 * @param {number} optionIndex - Option index for error reporting
 * @param {string} expectedKey - Expected key (optional, will auto-detect if not provided)
 * @returns {Object} Comprehensive cadence validation result
 */
function validateOptionCadences(option, questionNumber, optionIndex, expectedKey = null) {
    // Check if this is actually an 8-measure question
    if (!option.measure8) {
        return {
            success: true,
            skipped: true,
            reason: 'Not an 8-measure question - cadence validation not applicable'
        };
    }
    
    // Detect or use provided key
    const key = expectedKey || detectKeyFromMelody(option);
    
    // Validate mid-point cadence (measure 4)
    const midPointResult = validateMidPointCadence(option, key, questionNumber, optionIndex);
    
    // Validate final cadence (measure 8)
    const finalResult = validateFinalCadence(option, key, questionNumber, optionIndex);
    
    // Compile results
    const allErrors = [
        ...(midPointResult.errors || []),
        ...(finalResult.errors || [])
    ];
    const allWarnings = [
        ...(midPointResult.warnings || []),
        ...(finalResult.warnings || [])
    ];
    
    return {
        success: allErrors.length === 0,
        questionNumber: questionNumber,
        optionIndex: optionIndex,
        detectedKey: key,
        midPointCadence: midPointResult,
        finalCadence: finalResult,
        errors: allErrors,
        warnings: allWarnings,
        summary: allErrors.length === 0 
            ? `Question ${questionNumber}, Option ${optionIndex}: Proper cadences in ${key.replace('_', ' ')}`
            : `Question ${questionNumber}, Option ${optionIndex}: ${allErrors.length} cadence errors`
    };
}

/**
 * Validate cadences for all options in an 8-measure question set
 * @param {Array} questionSet - Array of 6 options
 * @param {number} questionNumber - Question number for error reporting
 * @param {string} expectedKey - Expected key (optional)
 * @returns {Object} Validation result for entire question set
 */
function validateQuestionSetCadences(questionSet, questionNumber, expectedKey = null) {
    if (!Array.isArray(questionSet) || questionSet.length !== 6) {
        throw new Error(`Question ${questionNumber}: Must have exactly 6 options, found ${questionSet.length}`);
    }
    
    // Check if this is an 8-measure question
    if (!questionSet[0].measure8) {
        return {
            success: true,
            skipped: true,
            reason: `Question ${questionNumber}: Not an 8-measure question - cadence validation not applicable`
        };
    }
    
    const results = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    
    // Validate each option
    for (let i = 0; i < 6; i++) {
        const result = validateOptionCadences(questionSet[i], questionNumber, i, expectedKey);
        if (!result.skipped) {
            results.push(result);
            totalErrors += result.errors.length;
            totalWarnings += result.warnings.length;
        }
    }
    
    if (results.length === 0) {
        return {
            success: true,
            skipped: true,
            reason: `Question ${questionNumber}: No 8-measure options found`
        };
    }
    
    return {
        success: totalErrors === 0,
        questionNumber: questionNumber,
        options: results,
        totalErrors: totalErrors,
        totalWarnings: totalWarnings,
        summary: totalErrors === 0 
            ? `Question ${questionNumber}: All 6 options have proper cadences (${totalWarnings} warnings)`
            : `Question ${questionNumber}: ${totalErrors} cadence errors across ${results.filter(r => !r.success).length} options`
    };
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateOptionCadences,
        validateQuestionSetCadences,
        validateMidPointCadence,
        validateFinalCadence,
        analyzeCadentialMotion,
        detectKeyFromMelody
    };
}

// Example usage and testing function
function testCadenceValidation() {
    console.log('🎵 Testing Cadence Validation System...\n');
    
    // Test with an 8-measure example
    const testOption = {
        measure1: [{ keys: ['c/4'], duration: 'q' }, { keys: ['d/4'], duration: 'q' }, { keys: ['e/4'], duration: 'q' }, { keys: ['f/4'], duration: 'q' }],
        measure2: [{ keys: ['g/4'], duration: 'q' }, { keys: ['a/4'], duration: 'q' }, { keys: ['b/4'], duration: 'q' }, { keys: ['c/5'], duration: 'q' }],
        measure3: [{ keys: ['b/4'], duration: 'q' }, { keys: ['a/4'], duration: 'q' }, { keys: ['g/4'], duration: 'q' }, { keys: ['f/4'], duration: 'q' }],
        measure4: [{ keys: ['g/4'], duration: 'h' }, { keys: ['g/4'], duration: 'h' }], // Half cadence on G (dominant)
        measure5: [{ keys: ['c/4'], duration: 'q' }, { keys: ['d/4'], duration: 'q' }, { keys: ['e/4'], duration: 'q' }, { keys: ['f/4'], duration: 'q' }],
        measure6: [{ keys: ['g/4'], duration: 'q' }, { keys: ['a/4'], duration: 'q' }, { keys: ['b/4'], duration: 'q' }, { keys: ['c/5'], duration: 'q' }],
        measure7: [{ keys: ['b/4'], duration: 'q' }, { keys: ['a/4'], duration: 'q' }, { keys: ['g/4'], duration: 'q' }, { keys: ['f/4'], duration: 'q' }],
        measure8: [{ keys: ['e/4'], duration: 'q' }, { keys: ['d/4'], duration: 'q' }, { keys: ['c/4'], duration: 'h' }] // Authentic cadence ending on C
    };
    
    const result = validateOptionCadences(testOption, 1, 0, 'C_major');
    console.log('Test Result:', result.success ? '✅ PASS' : '❌ FAIL');
    console.log('Detected Key:', result.detectedKey);
    console.log('Mid-point Cadence:', result.midPointCadence.cadenceType);
    console.log('Final Cadence:', result.finalCadence.cadenceType);
    
    if (result.errors.length > 0) {
        console.log('Errors:', result.errors);
    }
    if (result.warnings.length > 0) {
        console.log('Warnings:', result.warnings);
    }
}

// Run test if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testCadenceValidation();
}