/**
 * BEAT COUNT VALIDATION SCRIPT
 * Validates that all notes in each measure add up to the correct number of beats
 * for the specified time signature
 */

// Duration to beat count mapping for different time signatures
const BEAT_VALUES = {
    // Note values in quarter note beats (for 4/4 and 3/4)
    'quarter': {
        'w': 4,    // whole note = 4 quarter beats
        'h': 2,    // half note = 2 quarter beats
        'hd': 3,   // dotted half = 3 quarter beats
        'q': 1,    // quarter note = 1 quarter beat
        'qd': 1.5, // dotted quarter = 1.5 quarter beats
        '8': 0.5,  // eighth note = 0.5 quarter beats
        '16': 0.25, // sixteenth note = 0.25 quarter beats
        'qr': 1,   // quarter rest = 1 quarter beat
        '8r': 0.5, // eighth rest = 0.5 quarter beats
        '16r': 0.25 // sixteenth rest = 0.25 quarter beats
    },

    // Note values in eighth note beats (for 6/8 and 9/8)
    'eighth': {
        'w': 8,    // whole note = 8 eighth beats (not typically used in compound time)
        'h': 4,    // half note = 4 eighth beats
        'hd': 6,   // dotted half = 6 eighth beats
        'q': 2,    // quarter note = 2 eighth beats
        'qd': 3,   // dotted quarter = 3 eighth beats
        '8': 1,    // eighth note = 1 eighth beat
        '16': 0.5, // sixteenth note = 0.5 eighth beats
        'qr': 2,   // quarter rest = 2 eighth beats
        '8r': 1,   // eighth rest = 1 eighth beat
        '16r': 0.5 // sixteenth rest = 0.5 eighth beats
    }
};

// Expected beats per measure for each time signature
const TIME_SIGNATURES = {
    '4/4': { totalBeats: 4, beatUnit: 'quarter' },
    '3/4': { totalBeats: 3, beatUnit: 'quarter' },
    '6/8': { totalBeats: 6, beatUnit: 'eighth' },
    '9/8': { totalBeats: 9, beatUnit: 'eighth' }
};

/**
 * Calculate total beats in a measure
 * @param {Array} measure - Array of note objects with duration property
 * @param {string} timeSignature - Time signature (e.g., '4/4', '6/8')
 * @returns {number} Total beats in the measure
 */
function calculateMeasureBeats(measure, timeSignature) {
    const timeSigInfo = TIME_SIGNATURES[timeSignature];
    if (!timeSigInfo) {
        throw new Error(`Unknown time signature: ${timeSignature}`);
    }

    const beatValues = BEAT_VALUES[timeSigInfo.beatUnit];
    let totalBeats = 0;

    for (const note of measure) {
        const duration = note.duration;
        if (beatValues[duration] === undefined) {
            throw new Error(`Unknown duration: ${duration} in ${timeSigInfo.beatUnit} beat context`);
        }
        totalBeats += beatValues[duration];
    }

    return totalBeats;
}

/**
 * Validate beat counts for a single option
 * @param {Object} option - Question option with measures
 * @param {number} questionNumber - Question number for error reporting
 * @param {number} optionIndex - Option index for error reporting
 * @returns {Object} Validation result
 */
function validateOptionBeatCounts(option, questionNumber, optionIndex) {
    const timeSignature = option.timeSignature;
    const timeSigInfo = TIME_SIGNATURES[timeSignature];
    const expectedBeats = timeSigInfo.totalBeats;

    const errors = [];
    const warnings = [];
    const measureResults = [];

    // Get all measures dynamically
    const measureNames = [];
    for (let i = 1; i <= 8; i++) {
        const measureName = `measure${i}`;
        if (option[measureName]) {
            measureNames.push(measureName);
        }
    }

    // Validate each measure
    for (const measureName of measureNames) {
        const measure = option[measureName];
        try {
            const actualBeats = calculateMeasureBeats(measure, timeSignature);
            const isValid = Math.abs(actualBeats - expectedBeats) < 0.001; // Allow for floating point precision

            measureResults.push({
                measure: measureName,
                expectedBeats: expectedBeats,
                actualBeats: actualBeats,
                valid: isValid,
                notes: measure.map(note => `${note.duration}`)
            });

            if (!isValid) {
                errors.push(`Question ${questionNumber}, Option ${optionIndex}, ${measureName}: Expected ${expectedBeats} ${timeSigInfo.beatUnit} beats, got ${actualBeats}`);
            }
        } catch (error) {
            errors.push(`Question ${questionNumber}, Option ${optionIndex}, ${measureName}: ${error.message}`);
        }
    }

    return {
        success: errors.length === 0,
        questionNumber: questionNumber,
        optionIndex: optionIndex,
        timeSignature: timeSignature,
        expectedBeats: expectedBeats,
        measureResults: measureResults,
        errors: errors,
        warnings: warnings
    };
}

/**
 * Validate beat counts for all options in a question set
 * @param {Array} questionSet - Array of 6 options
 * @param {number} questionNumber - Question number for error reporting
 * @returns {Object} Validation result for entire question set
 */
function validateQuestionSetBeatCounts(questionSet, questionNumber) {
    if (!Array.isArray(questionSet) || questionSet.length !== 6) {
        throw new Error(`Question ${questionNumber}: Must have exactly 6 options, found ${questionSet.length}`);
    }

    const results = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    // Validate each option
    for (let i = 0; i < 6; i++) {
        const result = validateOptionBeatCounts(questionSet[i], questionNumber, i);
        results.push(result);
        totalErrors += result.errors.length;
        totalWarnings += result.warnings.length;
    }

    return {
        success: totalErrors === 0,
        questionNumber: questionNumber,
        timeSignature: questionSet[0].timeSignature,
        options: results,
        totalErrors: totalErrors,
        totalWarnings: totalWarnings,
        summary: totalErrors === 0
            ? `Question ${questionNumber}: All 6 options have correct beat counts (${totalWarnings} warnings)`
            : `Question ${questionNumber}: ${totalErrors} beat count errors across ${results.filter(r => !r.success).length} options`
    };
}

/**
 * Validate beat counts for all question sets from a file
 * @param {string} filename - Path to JavaScript file containing question sets
 * @returns {Object} Comprehensive validation result
 */
function validateQuestionSetsFromFile(filename) {
    const fs = require('fs');
    const path = require('path');

    // Read the file
    const filePath = path.resolve(filename);
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Extract the question sets array
    let questionSets;
    try {
        // Create a safe environment to execute the file
        const vm = require('vm');
        const context = vm.createContext({
            module: { exports: {} },
            exports: {}
        });

        // Execute the file content in the safe context
        vm.runInContext(fileContent, context);

        // Find the question sets variable (could be questionSet_X_Y or similar)
        const questionSetMatch = fileContent.match(/const\s+(\w+)\s*=\s*\[/);
        if (questionSetMatch) {
            const variableName = questionSetMatch[1];
            questionSets = context[variableName];
        }

        // If not found as direct variable, check module.exports
        if (!questionSets && context.module && context.module.exports) {
            questionSets = context.module.exports;
        }

        if (!questionSets) {
            throw new Error('Could not find question sets array in file');
        }
    } catch (error) {
        throw new Error(`Error parsing file: ${error.message}`);
    }

    if (!Array.isArray(questionSets)) {
        throw new Error('Question sets must be an array');
    }

    console.log(`🔍 Validating beat counts for ${questionSets.length} question sets from ${filename}...\n`);

    const allResults = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    let questionNumber = 91; // Starting from question 91 for this file

    // Validate each question set
    for (const questionSet of questionSets) {
        try {
            const result = validateQuestionSetBeatCounts(questionSet, questionNumber);
            allResults.push(result);
            totalErrors += result.totalErrors;
            totalWarnings += result.totalWarnings;

            // Print result for this question
            if (result.success) {
                console.log(`✅ Question ${questionNumber}: All beat counts correct (${result.timeSignature})`);
            } else {
                console.log(`❌ Question ${questionNumber}: ${result.totalErrors} beat count errors`);
                result.options.forEach(optionResult => {
                    if (!optionResult.success) {
                        optionResult.errors.forEach(error => console.log(`   ${error}`));
                    }
                });
            }
        } catch (error) {
            console.log(`❌ Question ${questionNumber}: ${error.message}`);
            totalErrors++;
        }

        questionNumber++;
    }

    // Print summary
    console.log(`\n📊 BEAT COUNT VALIDATION SUMMARY:`);
    console.log(`Total Questions: ${questionSets.length}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log(`Success Rate: ${((questionSets.length * 6 - totalErrors) / (questionSets.length * 6) * 100).toFixed(1)}%`);

    if (totalErrors === 0) {
        console.log(`\n🎉 ALL BEAT COUNTS VALID! All ${questionSets.length * 6} options have correct beat counts.`);
    } else {
        console.log(`\n⚠️  VALIDATION FAILED: ${totalErrors} beat count errors found.`);
    }

    return {
        success: totalErrors === 0,
        filename: filename,
        totalQuestions: questionSets.length,
        totalOptions: questionSets.length * 6,
        totalErrors: totalErrors,
        totalWarnings: totalWarnings,
        results: allResults
    };
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BEAT_VALUES,
        TIME_SIGNATURES,
        calculateMeasureBeats,
        validateOptionBeatCounts,
        validateQuestionSetBeatCounts,
        validateQuestionSetsFromFile
    };
}

// If this script is run directly, validate the specified file
if (typeof require !== 'undefined' && require.main === module) {
    const filename = process.argv[2];
    if (!filename) {
        console.error('Usage: node validate_beat_counts.js <filename>');
        process.exit(1);
    }

    try {
        const result = validateQuestionSetsFromFile(filename);
        process.exit(result.success ? 0 : 1);
    } catch (error) {
        console.error(`❌ Validation failed: ${error.message}`);
        process.exit(1);
    }
}