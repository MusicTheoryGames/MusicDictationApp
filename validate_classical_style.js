/**
 * CLASSICAL STYLE VALIDATION SCRIPT
 * Validates melodies against Classical period compositional rules
 * Based on Mozart, Haydn, and Beethoven melodic practices
 */

/**
 * Note name to semitone mapping for interval calculations
 */
const NOTE_SEMITONES = {
    'c': 0, 'd': 2, 'e': 4, 'f': 5, 'g': 7, 'a': 9, 'b': 11,
    'c#': 1, 'db': 1, 'd#': 3, 'eb': 3, 'f#': 6, 'gb': 6,
    'g#': 8, 'ab': 8, 'a#': 10, 'bb': 10
};

/**
 * Extract note name and octave from VexFlow key notation
 * @param {string} key - VexFlow key like 'c/4', 'f#/3'
 * @returns {Object} {note: 'c', octave: 4, semitone: 48}
 */
function parseKey(key) {
    if (!key || typeof key !== 'string') {
        throw new Error(`Invalid key format: ${key}`);
    }
    
    const parts = key.split('/');
    if (parts.length !== 2) {
        throw new Error(`Invalid key format: ${key}. Expected format: 'note/octave'`);
    }
    
    const noteName = parts[0].toLowerCase();
    const octave = parseInt(parts[1]);
    
    if (!(noteName in NOTE_SEMITONES)) {
        throw new Error(`Unknown note: ${noteName}`);
    }
    
    const semitone = (octave * 12) + NOTE_SEMITONES[noteName];
    
    return {
        note: noteName,
        octave: octave,
        semitone: semitone,
        original: key
    };
}

/**
 * Calculate interval between two notes in semitones
 * @param {string} note1 - First note
 * @param {string} note2 - Second note
 * @returns {Object} {semitones: number, direction: 'up'|'down'|'same', intervalName: string}
 */
function calculateInterval(note1, note2) {
    const parsed1 = parseKey(note1);
    const parsed2 = parseKey(note2);
    
    const semitones = Math.abs(parsed2.semitone - parsed1.semitone);
    const direction = parsed2.semitone > parsed1.semitone ? 'up' : 
                     parsed2.semitone < parsed1.semitone ? 'down' : 'same';
    
    // Map semitones to interval names
    const intervalNames = {
        0: 'unison', 1: 'minor 2nd', 2: 'major 2nd', 3: 'minor 3rd',
        4: 'major 3rd', 5: 'perfect 4th', 6: 'tritone', 7: 'perfect 5th',
        8: 'minor 6th', 9: 'major 6th', 10: 'minor 7th', 11: 'major 7th',
        12: 'octave'
    };
    
    const baseSemitones = semitones % 12;
    const octaves = Math.floor(semitones / 12);
    let intervalName = intervalNames[baseSemitones] || `${baseSemitones} semitones`;
    
    if (octaves > 0) {
        intervalName += ` + ${octaves} octave${octaves > 1 ? 's' : ''}`;
    }
    
    return {
        semitones: semitones,
        direction: direction,
        intervalName: intervalName,
        isStep: semitones <= 2,
        isSmallLeap: semitones >= 3 && semitones <= 5,
        isLargeLeap: semitones >= 6
    };
}

/**
 * Validate melodic motion according to Classical rules
 * @param {Array} measure - Array of note objects
 * @param {number} questionNumber - Question number for error reporting
 * @param {number} optionIndex - Option index for error reporting
 * @param {string} measureName - Measure name for error reporting
 * @returns {Object} Validation result
 */
function validateMelodicMotion(measure, questionNumber, optionIndex, measureName) {
    const errors = [];
    const warnings = [];
    const intervals = [];
    const notes = measure.filter(note => note.keys && !note.duration.includes('r'));
    
    if (notes.length < 2) {
        return {
            success: true,
            intervals: [],
            errors: [],
            warnings: [],
            stats: { stepPercent: 100, leapCount: 0, largeLeapCount: 0 }
        };
    }
    
    // Analyze each interval
    for (let i = 0; i < notes.length - 1; i++) {
        const note1 = notes[i].keys[0];
        const note2 = notes[i + 1].keys[0];
        const interval = calculateInterval(note1, note2);
        intervals.push(interval);
        
        // Rule 1: Large leaps (6th or larger) should be rare
        if (interval.isLargeLeap) {
            warnings.push(`${measureName}: Large leap (${interval.intervalName}) from ${note1} to ${note2} at position ${i}-${i+1}`);
        }
        
        // Rule 2: Tritones should be avoided in melodic lines
        if (interval.semitones === 6) {
            errors.push(`${measureName}: Tritone interval avoided in Classical style: ${note1} to ${note2} at position ${i}-${i+1}`);
        }
        
        // Rule 3: No intervals larger than an octave
        if (interval.semitones > 12) {
            errors.push(`${measureName}: Interval too large (${interval.intervalName}): ${note1} to ${note2} at position ${i}-${i+1}`);
        }
    }
    
    // Calculate statistics
    const stepCount = intervals.filter(i => i.isStep).length;
    const leapCount = intervals.filter(i => i.isSmallLeap || i.isLargeLeap).length;
    const largeLeapCount = intervals.filter(i => i.isLargeLeap).length;
    const stepPercent = intervals.length > 0 ? (stepCount / intervals.length) * 100 : 100;
    
    // Rule 4: At least 60% of motion should be stepwise (Classical preference)
    if (stepPercent < 60 && intervals.length >= 3) {
        warnings.push(`${measureName}: Only ${stepPercent.toFixed(1)}% stepwise motion (Classical style prefers >60%)`);
    }
    
    return {
        success: errors.length === 0,
        intervals: intervals,
        errors: errors,
        warnings: warnings,
        stats: {
            stepPercent: stepPercent,
            leapCount: leapCount,
            largeLeapCount: largeLeapCount,
            totalIntervals: intervals.length
        }
    };
}

/**
 * Validate melodic contour (shape) according to Classical principles
 * @param {Array} allMeasures - All measures in the option
 * @param {number} questionNumber - Question number for error reporting
 * @param {number} optionIndex - Option index for error reporting
 * @returns {Object} Validation result
 */
function validateMelodicContour(allMeasures, questionNumber, optionIndex) {
    const allNotes = [];
    const errors = [];
    const warnings = [];
    
    // Collect all notes from all measures
    for (const measure of allMeasures) {
        const notes = measure.filter(note => note.keys && !note.duration.includes('r'));
        allNotes.push(...notes.map(note => parseKey(note.keys[0])));
    }
    
    if (allNotes.length < 4) {
        return { success: true, errors: [], warnings: [], contourAnalysis: null };
    }
    
    // Find highest and lowest notes
    const semitones = allNotes.map(note => note.semitone);
    const highestSemitone = Math.max(...semitones);
    const lowestSemitone = Math.min(...semitones);
    const range = highestSemitone - lowestSemitone;
    
    // Find position of highest note (climax)
    const climaxPosition = semitones.indexOf(highestSemitone);
    const climaxPercent = (climaxPosition / (semitones.length - 1)) * 100;
    
    // Rule 1: Melodic range should be reasonable (not too wide or narrow)
    if (range < 5) {
        warnings.push(`Question ${questionNumber}, Option ${optionIndex}: Melodic range very narrow (${range} semitones)`);
    } else if (range > 19) { // More than an octave + 7th
        warnings.push(`Question ${questionNumber}, Option ${optionIndex}: Melodic range very wide (${range} semitones)`);
    }
    
    // Rule 2: Climax should ideally occur in the middle portion (Classical arch shape)
    if (allMeasures.length >= 4) { // Only for longer melodies
        if (climaxPercent < 25 || climaxPercent > 75) {
            warnings.push(`Question ${questionNumber}, Option ${optionIndex}: Melodic climax at ${climaxPercent.toFixed(1)}% (Classical style prefers 25-75%)`);
        }
    }
    
    // Rule 3: Check for repeated high notes (should be rare)
    const highNoteOccurrences = semitones.filter(s => s === highestSemitone).length;
    if (highNoteOccurrences > 2) {
        warnings.push(`Question ${questionNumber}, Option ${optionIndex}: Highest note repeated ${highNoteOccurrences} times (use sparingly)`);
    }
    
    return {
        success: errors.length === 0,
        errors: errors,
        warnings: warnings,
        contourAnalysis: {
            range: range,
            climaxPosition: climaxPosition,
            climaxPercent: climaxPercent,
            highestNote: allNotes.find(n => n.semitone === highestSemitone).original,
            lowestNote: allNotes.find(n => n.semitone === lowestSemitone).original
        }
    };
}

/**
 * Validate an entire option for Classical style
 * @param {Object} option - Question option with measures
 * @param {number} questionNumber - Question number for error reporting
 * @param {number} optionIndex - Option index for error reporting
 * @returns {Object} Comprehensive validation result
 */
function validateOptionClassicalStyle(option, questionNumber, optionIndex) {
    const measureResults = [];
    const allErrors = [];
    const allWarnings = [];
    
    // Get all measures
    const measureNames = ['measure1', 'measure2'];
    if (option.measure3 && option.measure4) {
        measureNames.push('measure3', 'measure4');
    }
    if (option.measure5 && option.measure6 && option.measure7 && option.measure8) {
        measureNames.push('measure5', 'measure6', 'measure7', 'measure8');
    }
    
    const allMeasures = measureNames.map(name => option[name]).filter(Boolean);
    
    // Validate melodic motion in each measure
    for (const measureName of measureNames) {
        const measure = option[measureName];
        if (!measure) continue;
        
        const result = validateMelodicMotion(measure, questionNumber, optionIndex, measureName);
        measureResults.push({
            measure: measureName,
            ...result
        });
        
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
    }
    
    // Validate overall contour
    const contourResult = validateMelodicContour(allMeasures, questionNumber, optionIndex);
    allErrors.push(...contourResult.errors);
    allWarnings.push(...contourResult.warnings);
    
    // Calculate overall statistics
    const totalIntervals = measureResults.reduce((sum, r) => sum + r.stats.totalIntervals, 0);
    const totalSteps = measureResults.reduce((sum, r) => sum + Math.round(r.stats.stepPercent * r.stats.totalIntervals / 100), 0);
    const overallStepPercent = totalIntervals > 0 ? (totalSteps / totalIntervals) * 100 : 100;
    
    return {
        success: allErrors.length === 0,
        questionNumber: questionNumber,
        optionIndex: optionIndex,
        measures: measureResults,
        contour: contourResult,
        errors: allErrors,
        warnings: allWarnings,
        overallStats: {
            stepPercent: overallStepPercent,
            totalIntervals: totalIntervals,
            measureCount: allMeasures.length
        },
        summary: allErrors.length === 0 
            ? `Question ${questionNumber}, Option ${optionIndex}: Passes Classical style validation (${overallStepPercent.toFixed(1)}% stepwise motion)`
            : `Question ${questionNumber}, Option ${optionIndex}: ${allErrors.length} Classical style errors`
    };
}

/**
 * Validate all options in a question set for Classical style
 * @param {Array} questionSet - Array of 6 options
 * @param {number} questionNumber - Question number for error reporting
 * @returns {Object} Validation result for entire question set
 */
function validateQuestionSetClassicalStyle(questionSet, questionNumber) {
    if (!Array.isArray(questionSet) || questionSet.length !== 6) {
        throw new Error(`Question ${questionNumber}: Must have exactly 6 options, found ${questionSet.length}`);
    }
    
    const results = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    
    // Validate each option
    for (let i = 0; i < 6; i++) {
        const result = validateOptionClassicalStyle(questionSet[i], questionNumber, i);
        results.push(result);
        totalErrors += result.errors.length;
        totalWarnings += result.warnings.length;
    }
    
    return {
        success: totalErrors === 0,
        questionNumber: questionNumber,
        options: results,
        totalErrors: totalErrors,
        totalWarnings: totalWarnings,
        summary: totalErrors === 0 
            ? `Question ${questionNumber}: All 6 options pass Classical style validation (${totalWarnings} warnings)`
            : `Question ${questionNumber}: ${totalErrors} Classical style errors across ${results.filter(r => !r.success).length} options`
    };
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateMelodicMotion,
        validateMelodicContour,
        validateOptionClassicalStyle,
        validateQuestionSetClassicalStyle,
        calculateInterval,
        parseKey
    };
}

// Example usage and testing function
function testClassicalStyleValidation() {
    console.log('🎼 Testing Classical Style Validation System...\n');
    
    // Test with a Classical-style melody (stepwise with small leaps)
    const testOption = {
        measure1: [
            { keys: ['c/4'], duration: 'q' },  // C
            { keys: ['d/4'], duration: 'q' },  // step up
            { keys: ['e/4'], duration: 'q' },  // step up  
            { keys: ['f/4'], duration: 'q' }   // step up
        ],
        measure2: [
            { keys: ['g/4'], duration: 'q' },  // step up
            { keys: ['f/4'], duration: 'q' },  // step down
            { keys: ['e/4'], duration: 'q' },  // step down
            { keys: ['d/4'], duration: 'q' }   // step down
        ]
    };
    
    const result = validateOptionClassicalStyle(testOption, 1, 0);
    console.log('Test Result:', result.success ? '✅ PASS' : '❌ FAIL');
    console.log('Step percentage:', result.overallStats.stepPercent.toFixed(1) + '%');
    
    if (result.errors.length > 0) {
        console.log('Errors:', result.errors);
    }
    if (result.warnings.length > 0) {
        console.log('Warnings:', result.warnings);
    }
}

// Run test if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testClassicalStyleValidation();
}