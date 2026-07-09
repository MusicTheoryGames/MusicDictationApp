/**
 * RHYTHM PATTERN VALIDATION SCRIPT
 * Validates that rhythms follow educational progression and Classical style rules
 * Based on specific constraints for different time signatures and complexity levels
 */

/**
 * Allowed rhythm patterns by time signature and complexity
 */
const RHYTHM_CONSTRAINTS = {
    '4/4': {
        simple: {
            allowed: ['w', 'h', 'hd', 'q'],
            allowedRests: [],  // No rests in 2/4-measure examples
            description: 'Simple 4/4: whole, half, dotted half, quarter notes',
            measureRestrictions: {
                2: { maxWholeNotes: 0, maxHalfNotes: 1, allowRests: false },
                4: { maxWholeNotes: 1, maxHalfNotes: 2, allowRests: false },
                8: { maxWholeNotes: 1, maxHalfNotes: 2, allowRests: true, restTypes: ['qr'] }
            }
        },
        complex: {
            allowed: ['w', 'h', 'hd', 'q', 'qd', '8'],
            allowedRests: [],  // No rests in 2/4-measure examples
            description: 'Complex 4/4: whole, half, dotted half, quarter, dotted quarter, eighth notes',
            measureRestrictions: {
                2: { maxWholeNotes: 0, maxHalfNotes: 1, allowRests: false },
                4: { maxWholeNotes: 1, maxHalfNotes: 2, allowRests: false },
                8: { maxWholeNotes: 1, maxHalfNotes: 2, allowRests: true, restTypes: ['qr'] }
            },
            groupingRules: {
                eighthNotes: 'must_be_paired',                 // Eighth notes must come in pairs
                beamGroups: 'max_4_consecutive',               // Max 4 consecutive eighth notes
                restsRule: 'similar_positions_across_options'   // Rests in same/adjacent positions so NOT obvious
            }
        }
    },
    
    '3/4': {
        simple: {
            allowed: ['w', 'h', 'hd', 'q'],
            allowedRests: [],  // No rests in 2/4-measure examples
            description: 'Simple 3/4: whole, half, dotted half, quarter notes',
            measureRestrictions: {
                2: { maxWholeNotes: 0, maxHalfNotes: 1, allowRests: false },
                4: { maxWholeNotes: 1, maxHalfNotes: 1, allowRests: false },
                8: { maxWholeNotes: 1, maxHalfNotes: 1, allowRests: true, restTypes: ['qr'] }
            }
        },
        complex: {
            allowed: ['w', 'h', 'hd', 'q', 'qd', '8'],
            allowedRests: [],  // No rests in 2/4-measure examples
            description: 'Complex 3/4: whole, half, dotted half, quarter, dotted quarter, eighth notes', 
            measureRestrictions: {
                2: { maxWholeNotes: 0, maxHalfNotes: 1, allowRests: false },
                4: { maxWholeNotes: 1, maxHalfNotes: 1, allowRests: false },
                8: { maxWholeNotes: 1, maxHalfNotes: 1, allowRests: true, restTypes: ['qr'] }
            },
            groupingRules: {
                eighthNotes: 'must_be_paired',                 // Eighth notes must come in pairs
                beamGroups: 'max_4_consecutive',               // Max 4 consecutive eighth notes
                restsRule: 'similar_positions_across_options'   // Rests in same/adjacent positions so NOT obvious
            }
        }
    },
    
    '6/8': {
        simple: {
            allowed: ['hd', 'qd', 'q', '8', '8_8_8'],
            description: 'Simple 6/8: dotted half, dotted quarter, quarter, eighth, groups of 3 eighths',
            measureRestrictions: {
                2: { maxDottedHalves: 0 },                     // No dotted halves in 2-measure examples
                4: { maxDottedHalves: 2 },                     // Max 2 dotted halves in 4-measure examples
                8: { maxDottedHalves: 4 }                      // Max 4 dotted halves in 8-measure examples
            },
            groupingRules: {
                eighthNotes: 'groups_of_3',                    // Eighth notes in groups of 3
                compound: 'two_dotted_quarters_per_measure'    // Typical 6/8 grouping
            }
        },
        complex: {
            allowed: ['hd', 'qd', 'q', '8', '8_8_8', '8_16_8', '8_q'],
            description: 'Complex 6/8: dotted half, dotted quarter, quarter, eighth, 3 eighths, eighth-sixteenth-eighth, eighth-quarter',
            measureRestrictions: {
                2: { maxDottedHalves: 0 },                     // No dotted halves in 2-measure examples
                4: { maxDottedHalves: 2 },                     // Max 2 dotted halves in 4-measure examples
                8: { maxDottedHalves: 4 }                      // Max 4 dotted halves in 8-measure examples
            },
            groupingRules: {
                eighthNotes: 'groups_of_3_or_subdivided',      // Groups of 3 or subdivided patterns
                sixteenthNotes: 'only_in_8_16_8_pattern',      // 16th notes only in eighth-sixteenth-eighth
                compound: 'maintain_6_8_feel'                  // Maintain compound duple feel
            }
        }
    },
    
    '9/8': {
        simple: {
            allowed: ['hd', 'qd', 'q', '8', '8_8_8'],
            description: 'Simple 9/8: dotted half, dotted quarter, quarter, eighth, groups of 3 eighths',
            measureRestrictions: {
                2: { maxDottedHalves: 0 },                     // No dotted halves in 2-measure examples
                4: { maxDottedHalves: 1 },                     // Max 1 dotted half in 4-measure examples  
                8: { maxDottedHalves: 2 }                      // Max 2 dotted halves in 8-measure examples
            },
            groupingRules: {
                eighthNotes: 'groups_of_3',                    // Eighth notes in groups of 3
                compound: 'three_dotted_quarters_per_measure'  // Typical 9/8 grouping
            }
        },
        complex: {
            allowed: ['hd', 'qd', 'q', '8', '8_8_8', '8_16_8', '8_q'],
            description: 'Complex 9/8: dotted half, dotted quarter, quarter, eighth, 3 eighths, eighth-sixteenth-eighth, eighth-quarter',
            measureRestrictions: {
                2: { maxDottedHalves: 0 },                     // No dotted halves in 2-measure examples
                4: { maxDottedHalves: 1 },                     // Max 1 dotted half in 4-measure examples
                8: { maxDottedHalves: 2 }                      // Max 2 dotted halves in 8-measure examples  
            },
            groupingRules: {
                eighthNotes: 'groups_of_3_or_subdivided',      // Groups of 3 or subdivided patterns
                sixteenthNotes: 'only_in_8_16_8_pattern',      // 16th notes only in eighth-sixteenth-eighth
                compound: 'maintain_9_8_feel'                  // Maintain compound triple feel
            }
        }
    }
};

/**
 * Validate rhythm patterns in a single measure
 * @param {Array} measure - Array of note objects with duration property
 * @param {string} timeSignature - Time signature
 * @param {string} complexity - 'simple' or 'complex'
 * @param {number} totalMeasures - Total measures in the question (2, 4, or 8)
 * @param {number} questionNumber - Question number for error reporting
 * @param {number} optionIndex - Option index for error reporting
 * @param {string} measureName - Measure name for error reporting
 * @returns {Object} Validation result
 */
function validateMeasureRhythms(measure, timeSignature, complexity, totalMeasures, questionNumber, optionIndex, measureName) {
    const constraints = RHYTHM_CONSTRAINTS[timeSignature]?.[complexity];
    if (!constraints) {
        throw new Error(`Unknown time signature/complexity: ${timeSignature}/${complexity}`);
    }
    
    const errors = [];
    const warnings = [];
    const rhythmCounts = {};
    
    // Extract rhythm patterns from measure
    const rhythms = measure.filter(note => !note.duration.includes('r')).map(note => note.duration);
    
    // Count each rhythm type
    for (const rhythm of rhythms) {
        rhythmCounts[rhythm] = (rhythmCounts[rhythm] || 0) + 1;
    }
    
    // Check allowed rhythms
    for (const rhythm of rhythms) {
        if (!constraints.allowed.includes(rhythm)) {
            errors.push(`${measureName}: Rhythm '${rhythm}' not allowed in ${complexity} ${timeSignature} time`);
        }
    }
    
    // Apply measure restrictions
    const restrictions = constraints.measureRestrictions[totalMeasures];
    if (restrictions) {
        
        // Check whole note restrictions
        if (restrictions.maxWholeNotes !== undefined) {
            const wholeCount = rhythmCounts['w'] || 0;
            if (wholeCount > restrictions.maxWholeNotes) {
                if (restrictions.maxWholeNotes === 0) {
                    errors.push(`${measureName}: Whole notes not allowed in ${totalMeasures}-measure examples`);
                } else {
                    errors.push(`${measureName}: Too many whole notes (${wholeCount}, max ${restrictions.maxWholeNotes} total)`);
                }
            }
        }
        
        // Check half note restrictions
        if (restrictions.maxHalfNotes !== undefined) {
            const halfCount = (rhythmCounts['h'] || 0) + (rhythmCounts['hd'] || 0);
            if (halfCount > restrictions.maxHalfNotes) {
                warnings.push(`${measureName}: Many half notes (${halfCount}, consider max ${restrictions.maxHalfNotes} per measure)`);
            }
        }
        
        // Check dotted half restrictions for compound time
        if (restrictions.maxDottedHalves !== undefined) {
            const dottedHalfCount = rhythmCounts['hd'] || 0;
            if (dottedHalfCount > 0 && totalMeasures === 2) {
                errors.push(`${measureName}: Dotted half notes not allowed in 2-measure ${timeSignature} examples`);
            }
        }
    }
    
    // Apply grouping rules for complex rhythms
    if (complexity === 'complex' && constraints.groupingRules) {
        const groupingErrors = validateGroupingRules(rhythms, constraints.groupingRules, measureName);
        errors.push(...groupingErrors);
    }
    
    return {
        success: errors.length === 0,
        rhythms: rhythms,
        rhythmCounts: rhythmCounts,
        errors: errors,
        warnings: warnings
    };
}

/**
 * Validate grouping rules for complex rhythms
 * @param {Array} rhythms - Array of rhythm durations
 * @param {Object} rules - Grouping rules
 * @param {string} measureName - Measure name for error reporting
 * @returns {Array} Array of error messages
 */
function validateGroupingRules(rhythms, rules, measureName) {
    const errors = [];
    
    // Check eighth note pairing (4/4 and 3/4)
    if (rules.eighthNotes === 'must_be_paired') {
        const eighthPositions = rhythms.map((r, i) => r === '8' ? i : -1).filter(i => i >= 0);
        
        // Check for isolated eighth notes
        for (const pos of eighthPositions) {
            const hasEighthBefore = pos > 0 && rhythms[pos - 1] === '8';
            const hasEighthAfter = pos < rhythms.length - 1 && rhythms[pos + 1] === '8';
            
            if (!hasEighthBefore && !hasEighthAfter) {
                errors.push(`${measureName}: Isolated eighth note at position ${pos} (eighth notes should be paired)`);
            }
        }
    }
    
    // Check eighth note grouping of 3 (6/8 and 9/8)
    if (rules.eighthNotes === 'groups_of_3') {
        const eighthRuns = findConsecutiveEighths(rhythms);
        for (const run of eighthRuns) {
            if (run.length % 3 !== 0) {
                errors.push(`${measureName}: ${run.length} consecutive eighth notes (should be groups of 3 in compound time)`);
            }
        }
    }
    
    // Check sixteenth note restrictions
    if (rules.sixteenthNotes === 'only_in_8_16_8_pattern') {
        for (let i = 0; i < rhythms.length; i++) {
            if (rhythms[i] === '16') {
                const validPattern = i > 0 && i < rhythms.length - 1 && 
                                  rhythms[i - 1] === '8' && rhythms[i + 1] === '8';
                if (!validPattern) {
                    errors.push(`${measureName}: Sixteenth note at position ${i} not in eighth-sixteenth-eighth pattern`);
                }
            }
        }
    }
    
    return errors;
}

/**
 * Find consecutive eighth note runs
 * @param {Array} rhythms - Array of rhythm durations
 * @returns {Array} Array of consecutive eighth note groups
 */
function findConsecutiveEighths(rhythms) {
    const runs = [];
    let currentRun = [];
    
    for (const rhythm of rhythms) {
        if (rhythm === '8') {
            currentRun.push(rhythm);
        } else {
            if (currentRun.length > 0) {
                runs.push([...currentRun]);
                currentRun = [];
            }
        }
    }
    
    if (currentRun.length > 0) {
        runs.push(currentRun);
    }
    
    return runs;
}

/**
 * Validate rhythm patterns for an entire option
 * @param {Object} option - Question option with measures
 * @param {string} timeSignature - Time signature
 * @param {string} complexity - 'simple' or 'complex'
 * @param {number} questionNumber - Question number for error reporting
 * @param {number} optionIndex - Option index for error reporting
 * @returns {Object} Comprehensive validation result
 */
function validateOptionRhythms(option, timeSignature, complexity, questionNumber, optionIndex) {
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
    
    const totalMeasures = measureNames.length;
    
    // Validate each measure
    for (const measureName of measureNames) {
        const measure = option[measureName];
        if (!measure) continue;
        
        const result = validateMeasureRhythms(
            measure, timeSignature, complexity, totalMeasures, 
            questionNumber, optionIndex, measureName
        );
        
        measureResults.push({
            measure: measureName,
            ...result
        });
        
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
    }
    
    // Check overall rhythm distribution
    const overallStats = analyzeOverallRhythmDistribution(measureResults, timeSignature, complexity);
    allWarnings.push(...overallStats.warnings);
    
    return {
        success: allErrors.length === 0,
        questionNumber: questionNumber,
        optionIndex: optionIndex,
        timeSignature: timeSignature,
        complexity: complexity,
        measures: measureResults,
        errors: allErrors,
        warnings: allWarnings,
        overallStats: overallStats,
        summary: allErrors.length === 0 
            ? `Question ${questionNumber}, Option ${optionIndex}: Rhythm patterns valid for ${complexity} ${timeSignature}`
            : `Question ${questionNumber}, Option ${optionIndex}: ${allErrors.length} rhythm pattern errors`
    };
}

/**
 * Analyze overall rhythm distribution across all measures
 * @param {Array} measureResults - Results from all measures
 * @param {string} timeSignature - Time signature
 * @param {string} complexity - Complexity level
 * @returns {Object} Overall statistics and warnings
 */
function analyzeOverallRhythmDistribution(measureResults, timeSignature, complexity) {
    const allRhythms = measureResults.flatMap(r => r.rhythms);
    const totalRhythmCounts = {};
    
    // Count all rhythms across all measures
    for (const rhythm of allRhythms) {
        totalRhythmCounts[rhythm] = (totalRhythmCounts[rhythm] || 0) + 1;
    }
    
    const warnings = [];
    
    // Check for rhythm variety (avoid too much repetition)
    const totalRhythms = allRhythms.length;
    const uniqueRhythms = Object.keys(totalRhythmCounts).length;
    
    if (uniqueRhythms === 1 && totalRhythms > 4) {
        warnings.push(`Only one rhythm type used (${Object.keys(totalRhythmCounts)[0]}) - consider adding variety`);
    }
    
    // Check for appropriate rhythm complexity progression
    if (complexity === 'simple' && totalRhythmCounts['8'] > totalRhythms * 0.5) {
        warnings.push(`Many eighth notes (${totalRhythmCounts['8']}) for simple complexity - consider using more quarters/halves`);
    }
    
    return {
        totalRhythmCounts: totalRhythmCounts,
        rhythmVariety: uniqueRhythms,
        warnings: warnings
    };
}

/**
 * Validate that rests are used properly across all 6 options
 * (rests should be in same or adjacent positions so NOT obvious which option)
 * @param {Array} questionSet - Array of 6 options
 * @param {number} questionNumber - Question number for error reporting
 * @returns {Object} Rest usage validation result
 */
function validateRestUsageAcrossOptions(questionSet, questionNumber) {
    const errors = [];
    const warnings = [];
    
    // Find all rest positions across all options
    const restPositions = [];
    
    for (let optionIndex = 0; optionIndex < 6; optionIndex++) {
        const option = questionSet[optionIndex];
        const optionRestPositions = [];
        
        // Check each measure for rests
        ['measure1', 'measure2', 'measure3', 'measure4', 'measure5', 'measure6', 'measure7', 'measure8'].forEach((measureName, measureIndex) => {
            const measure = option[measureName];
            if (!measure) return;
            
            measure.forEach((note, noteIndex) => {
                if (note.duration && note.duration.includes('r')) {
                    optionRestPositions.push({
                        measure: measureIndex + 1,
                        position: noteIndex + 1,
                        type: note.duration
                    });
                }
            });
        });
        
        restPositions.push(optionRestPositions);
    }
    
    // Check if any options have rests
    const optionsWithRests = restPositions.filter(positions => positions.length > 0);
    
    if (optionsWithRests.length > 0) {
        // If some options have rests, validate the placement rules
        
        // Rule 1: If one option has a rest, others should have rests in same/adjacent positions
        const firstRestOption = optionsWithRests[0];
        
        for (let i = 1; i < optionsWithRests.length; i++) {
            const currentRestOption = optionsWithRests[i];
            
            if (currentRestOption.length !== firstRestOption.length) {
                warnings.push(`Question ${questionNumber}: Different number of rests across options (${firstRestOption.length} vs ${currentRestOption.length})`);
            }
            
            // Check that rests are in similar positions (same or ±1 beat)
            for (let j = 0; j < Math.min(firstRestOption.length, currentRestOption.length); j++) {
                const firstRest = firstRestOption[j];
                const currentRest = currentRestOption[j];
                
                const measureDiff = Math.abs(firstRest.measure - currentRest.measure);
                const positionDiff = Math.abs(firstRest.position - currentRest.position);
                
                if (measureDiff > 0 || positionDiff > 1) {
                    errors.push(`Question ${questionNumber}: Rest positions too different (M${firstRest.measure}:${firstRest.position} vs M${currentRest.measure}:${currentRest.position}) - should be same or adjacent to avoid obviousness`);
                }
            }
        }
        
        // Rule 2: All options should have similar rest patterns or no rests
        if (optionsWithRests.length < 6 && optionsWithRests.length > 0) {
            warnings.push(`Question ${questionNumber}: Only ${optionsWithRests.length}/6 options have rests - consider consistent rest usage across all options`);
        }
    }
    
    return {
        success: errors.length === 0,
        restPositions: restPositions,
        errors: errors,
        warnings: warnings
    };
}

/**
 * Validate rhythm patterns for all options in a question set
 * @param {Array} questionSet - Array of 6 options
 * @param {string} timeSignature - Time signature
 * @param {string} complexity - Complexity level
 * @param {number} questionNumber - Question number for error reporting
 * @returns {Object} Validation result for entire question set
 */
function validateQuestionSetRhythms(questionSet, timeSignature, complexity, questionNumber) {
    if (!Array.isArray(questionSet) || questionSet.length !== 6) {
        throw new Error(`Question ${questionNumber}: Must have exactly 6 options, found ${questionSet.length}`);
    }
    
    const results = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    
    // Validate each option
    for (let i = 0; i < 6; i++) {
        const result = validateOptionRhythms(questionSet[i], timeSignature, complexity, questionNumber, i);
        results.push(result);
        totalErrors += result.errors.length;
        totalWarnings += result.warnings.length;
    }
    
    // Validate rest usage across all options
    const restValidation = validateRestUsageAcrossOptions(questionSet, questionNumber);
    totalErrors += restValidation.errors.length;
    totalWarnings += restValidation.warnings.length;
    
    return {
        success: totalErrors === 0,
        questionNumber: questionNumber,
        timeSignature: timeSignature,
        complexity: complexity,
        options: results,
        restValidation: restValidation,
        totalErrors: totalErrors,
        totalWarnings: totalWarnings,
        summary: totalErrors === 0 
            ? `Question ${questionNumber}: All 6 options have valid ${complexity} ${timeSignature} rhythm patterns (${totalWarnings} warnings)`
            : `Question ${questionNumber}: ${totalErrors} rhythm pattern errors across ${results.filter(r => !r.success).length} options`
    };
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RHYTHM_CONSTRAINTS,
        validateMeasureRhythms,
        validateOptionRhythms,
        validateQuestionSetRhythms,
        validateGroupingRules
    };
}

// Example usage and testing function
function testRhythmValidation() {
    console.log('🎵 Testing Rhythm Pattern Validation System...\n');
    
    // Test simple 4/4 pattern
    const testOption = {
        measure1: [
            { keys: ['c/4'], duration: 'q' },   // quarter
            { keys: ['d/4'], duration: 'q' },   // quarter
            { keys: ['e/4'], duration: 'h' }    // half
        ],
        measure2: [
            { keys: ['f/4'], duration: 'q' },   // quarter
            { keys: ['g/4'], duration: 'q' },   // quarter
            { keys: ['c/4'], duration: 'h' }    // half
        ]
    };
    
    const result = validateOptionRhythms(testOption, '4/4', 'simple', 1, 0);
    console.log('Test Result:', result.success ? '✅ PASS' : '❌ FAIL');
    
    if (result.errors.length > 0) {
        console.log('Errors:', result.errors);
    }
    if (result.warnings.length > 0) {
        console.log('Warnings:', result.warnings);
    }
    
    console.log('Rhythm counts:', result.overallStats.totalRhythmCounts);
}

// Run test if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testRhythmValidation();
}