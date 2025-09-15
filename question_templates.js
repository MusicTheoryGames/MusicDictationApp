/**
 * QUESTION GENERATION TEMPLATES
 * Standardized templates for creating questions across all time signatures and measure counts
 * Includes rhythm patterns, note ranges, and structural guidelines
 */

/**
 * Time signature definitions with beat counts and rhythm vocabularies
 */
const TIME_SIGNATURES = {
    '4/4': {
        beatsPerMeasure: 4,
        beatUnit: 'quarter',
        description: '4/4 time (Common time)',
        simpleRhythms: {
            allowed: ['w', 'h', 'hd', 'q'],
            patterns: ['q q q q', 'h h', 'h q q', 'q h q', 'q q h', 'hd q'],
            restrictions: {
                2: { maxWholeNotes: 0, maxHalfNotes: 1 },
                4: { maxWholeNotes: 1, maxHalfNotes: 2 },
                8: { maxWholeNotes: 1, maxHalfNotes: 2 }
            }
        },
        complexRhythms: {
            allowed: ['w', 'h', 'hd', 'q', 'qd', '8'],
            patterns: ['q 8 8 q', '8 8 q q', 'qd 8 q', 'q qd 8', '8 8 8 8', 'h 8 8'],
            restrictions: {
                2: { maxWholeNotes: 0, maxHalfNotes: 1 },
                4: { maxWholeNotes: 1, maxHalfNotes: 2 },
                8: { maxWholeNotes: 1, maxHalfNotes: 2 }
            },
            grouping: 'eighth_notes_paired'
        }
    },
    '3/4': {
        beatsPerMeasure: 3,
        beatUnit: 'quarter',
        description: '3/4 time (Waltz time)',
        simpleRhythms: {
            allowed: ['w', 'h', 'hd', 'q'],
            patterns: ['hd', 'q q q', 'h q', 'q h', 'q q h'],
            restrictions: {
                2: { maxWholeNotes: 0, maxHalfNotes: 1 },
                4: { maxWholeNotes: 1, maxHalfNotes: 1 },
                8: { maxWholeNotes: 1, maxHalfNotes: 1 }
            }
        },
        complexRhythms: {
            allowed: ['w', 'h', 'hd', 'q', 'qd', '8'],
            patterns: ['q 8 8 q', 'qd 8 q', 'q qd 8', '8 8 q q', 'q q 8 8'],
            restrictions: {
                2: { maxWholeNotes: 0, maxHalfNotes: 1 },
                4: { maxWholeNotes: 1, maxHalfNotes: 1 },
                8: { maxWholeNotes: 1, maxHalfNotes: 1 }
            },
            grouping: 'eighth_notes_paired'
        }
    },
    '6/8': {
        beatsPerMeasure: 6,
        beatUnit: 'eighth',
        description: '6/8 time (Compound duple)',
        simpleRhythms: {
            allowed: ['hd', 'qd', 'q', '8', '8_8_8'],
            patterns: ['qd qd', 'q 8 qd', 'qd q 8', 'q 8 q 8', '8 8 8 qd'],
            restrictions: {
                2: { maxDottedHalves: 0 },
                4: { maxDottedHalves: 2 },
                8: { maxDottedHalves: 4 }
            },
            grouping: 'eighth_notes_in_threes'
        },
        complexRhythms: {
            allowed: ['hd', 'qd', 'q', '8', '8_8_8', '8_16_8', '8_q'],
            patterns: ['8 8 8 8 8 8', 'qd 8 8 8', '8 8 8 qd', 'q 8 8 8 8', '8 qd 8 8', '8 16 8 qd'],
            restrictions: {
                2: { maxDottedHalves: 0 },
                4: { maxDottedHalves: 2 },
                8: { maxDottedHalves: 4 }
            },
            grouping: 'compound_patterns'
        }
    },
    '9/8': {
        beatsPerMeasure: 9,
        beatUnit: 'eighth',
        description: '9/8 time (Compound triple)',
        simpleRhythms: {
            allowed: ['hd', 'qd', 'q', '8', '8_8_8'],
            patterns: ['qd qd qd', 'q 8 qd qd', 'qd q 8 qd', 'qd qd q 8'],
            restrictions: {
                2: { maxDottedHalves: 0 },
                4: { maxDottedHalves: 1 },
                8: { maxDottedHalves: 2 }
            },
            grouping: 'eighth_notes_in_threes'
        },
        complexRhythms: {
            allowed: ['hd', 'qd', 'q', '8', '8_8_8', '8_16_8', '8_q'],
            patterns: ['qd 8 8 8 qd', 'q 8 q 8 qd', '8 8 8 qd qd', 'qd q 8 8 8 8'],
            restrictions: {
                2: { maxDottedHalves: 0 },
                4: { maxDottedHalves: 1 },
                8: { maxDottedHalves: 2 }
            },
            grouping: 'compound_patterns'
        }
    }
};

/**
 * Note ranges and patterns for different clefs and keys
 */
const NOTE_RANGES = {
    treble: {
        C_major: {
            low: 'c/4',
            high: 'c/6',
            comfortable: ['c/4', 'd/4', 'e/4', 'f/4', 'g/4', 'a/4', 'b/4', 'c/5', 'd/5', 'e/5', 'f/5', 'g/5'],
            scale: ['c/4', 'd/4', 'e/4', 'f/4', 'g/4', 'a/4', 'b/4', 'c/5']
        },
        A_minor: {
            low: 'a/3',
            high: 'a/5',
            comfortable: ['a/3', 'b/3', 'c/4', 'd/4', 'e/4', 'f/4', 'g/4', 'a/4', 'b/4', 'c/5', 'd/5', 'e/5'],
            scale: ['a/3', 'b/3', 'c/4', 'd/4', 'e/4', 'f/4', 'g/4', 'a/4'],
            harmonicScale: ['a/3', 'b/3', 'c/4', 'd/4', 'e/4', 'f/4', 'g#/4', 'a/4']
        }
    },
    bass: {
        C_major: {
            low: 'c/2',
            high: 'c/4',
            comfortable: ['c/2', 'd/2', 'e/2', 'f/2', 'g/2', 'a/2', 'b/2', 'c/3', 'd/3', 'e/3', 'f/3', 'g/3'],
            scale: ['c/3', 'd/3', 'e/3', 'f/3', 'g/3', 'a/3', 'b/3', 'c/4']
        },
        A_minor: {
            low: 'a/2',
            high: 'a/4',
            comfortable: ['a/2', 'b/2', 'c/3', 'd/3', 'e/3', 'f/3', 'g/3', 'a/3', 'b/3', 'c/4', 'd/4', 'e/4'],
            scale: ['a/2', 'b/2', 'c/3', 'd/3', 'e/3', 'f/3', 'g/3', 'a/3'],
            harmonicScale: ['a/2', 'b/2', 'c/3', 'd/3', 'e/3', 'f/3', 'g#/3', 'a/3']
        }
    }
};

/**
 * Classical melodic patterns and guidelines
 */
const CLASSICAL_PATTERNS = {
    stepwisePatterns: [
        ['c/4', 'd/4', 'e/4', 'f/4'],
        ['f/4', 'e/4', 'd/4', 'c/4'],
        ['g/4', 'f/4', 'e/4', 'd/4', 'c/4'],
        ['c/4', 'd/4', 'e/4', 'd/4', 'c/4']
    ],
    arpeggiatedPatterns: [
        ['c/4', 'e/4', 'g/4', 'c/5'],
        ['c/5', 'g/4', 'e/4', 'c/4'],
        ['f/4', 'a/4', 'c/5', 'f/4']
    ],
    cadentialPatterns: {
        authentic: [
            ['d/4', 'c/4'], // 2-1
            ['b/4', 'c/5'], // 7-1
            ['g/4', 'c/4'], // 5-1
            ['f/4', 'e/4', 'c/4'] // 4-3-1
        ],
        half: [
            ['f/4', 'g/4'], // 4-5
            ['d/4', 'g/4'], // 2-5
            ['a/4', 'g/4'] // 6-5
        ]
    }
};

/**
 * Generate a basic question template structure
 * @param {string} timeSignature - Time signature ('4/4', '3/4', '6/8', '9/8')
 * @param {number} measureCount - Number of measures (2, 4, or 8)
 * @param {string} key - Key ('C_major' or 'A_minor')
 * @param {string} clef - Clef ('treble' or 'bass')
 * @param {string} complexity - Rhythm complexity ('simple' or 'complex')
 * @returns {Object} Question template structure
 */
function generateQuestionTemplate(timeSignature, measureCount, key, clef, complexity) {
    const timeSig = TIME_SIGNATURES[timeSignature];
    if (!timeSig) {
        throw new Error(`Unknown time signature: ${timeSignature}`);
    }
    
    const noteRange = NOTE_RANGES[clef][key];
    if (!noteRange) {
        throw new Error(`Unknown clef/key combination: ${clef}/${key}`);
    }
    
    const rhythmVocabulary = complexity === 'simple' ? timeSig.simpleRhythms : timeSig.complexRhythms;
    
    return {
        timeSignature: timeSignature,
        measureCount: measureCount,
        key: key,
        clef: clef,
        complexity: complexity,
        
        // Template structure
        structure: {
            beatsPerMeasure: timeSig.beatsPerMeasure,
            totalBeats: timeSig.beatsPerMeasure * measureCount,
            beatUnit: timeSig.beatUnit
        },
        
        // Available materials
        materials: {
            rhythmPatterns: rhythmVocabulary,
            noteRange: noteRange,
            scaleNotes: noteRange.scale,
            comfortableRange: noteRange.comfortable
        },
        
        // Classical guidelines
        guidelines: {
            stepwisePercent: 70, // At least 70% stepwise motion
            maxLeap: 8, // Maximum leap in semitones
            rangeLimits: {
                min: 5, // Minimum range in semitones
                max: 19 // Maximum range in semitones
            },
            cadences: measureCount === 8 ? {
                midPoint: 'half_cadence',
                final: 'authentic_cadence'
            } : null
        },
        
        // Option variation strategies
        variationStrategies: [
            'single_note_change',      // Change one note by step
            'interval_inversion',      // Invert interval direction
            'rhythm_subdivision',      // Subdivide or combine rhythms
            'register_shift',          // Move passage up/down octave (within reason)
            'ornamental_variation',    // Add/remove passing tones
            'cadential_variation'      // Vary cadential approach
        ]
    };
}

/**
 * Generate rhythm pattern for a single measure
 * @param {string} timeSignature - Time signature
 * @param {string} complexity - 'simple' or 'complex'
 * @returns {Array} Array of duration strings
 */
function generateRhythmPattern(timeSignature, complexity) {
    const timeSig = TIME_SIGNATURES[timeSignature];
    const patterns = complexity === 'simple' ? timeSig.simpleRhythms : timeSig.complexRhythms;
    
    // Select random pattern
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    // Split pattern into individual durations
    return pattern.split(' ');
}

/**
 * Generate a basic melodic contour template
 * @param {number} measureCount - Number of measures
 * @param {string} key - Key context
 * @returns {Object} Contour template
 */
function generateContourTemplate(measureCount, key) {
    let contourShape;
    
    if (measureCount === 2) {
        // Simple arch or descending line
        contourShape = ['start_low', 'rise', 'descend'];
    } else if (measureCount === 4) {
        // Classical 4-measure phrase
        contourShape = ['start_mid', 'rise', 'peak', 'descend', 'cadence'];
    } else if (measureCount === 8) {
        // Classical 8-measure period
        contourShape = [
            'start_mid',     // m1
            'rise',          // m2
            'approach_peak', // m3
            'half_cadence',  // m4
            'restart',       // m5
            'build',         // m6
            'climax',        // m7
            'final_cadence'  // m8
        ];
    }
    
    return {
        measureCount: measureCount,
        key: key,
        shape: contourShape,
        guidelines: {
            climaxPosition: measureCount >= 4 ? Math.floor(measureCount * 0.6) : measureCount - 1,
            startingRange: 'middle',
            endingNote: key === 'C_major' ? 'c' : 'a',
            peakNote: null // To be determined during generation
        }
    };
}

/**
 * Create complete question set template with all 6 options
 * @param {Object} baseTemplate - Base template from generateQuestionTemplate
 * @param {number} questionNumber - Question number for naming
 * @returns {Object} Complete question set template
 */
function createQuestionSetTemplate(baseTemplate, questionNumber) {
    const contourTemplate = generateContourTemplate(baseTemplate.measureCount, baseTemplate.key);
    
    return {
        questionNumber: questionNumber,
        ...baseTemplate,
        contour: contourTemplate,
        
        // Template for all 6 options
        optionTemplates: Array.from({ length: 6 }, (_, index) => ({
            optionIndex: index,
            isCorrect: index === 0, // First option is correct answer
            
            // Base structure for this option
            measures: Array.from({ length: baseTemplate.measureCount }, (_, measureIndex) => ({
                measureNumber: measureIndex + 1,
                measureName: `measure${measureIndex + 1}`,
                beatsRequired: baseTemplate.structure.beatsPerMeasure,
                rhythmPattern: null, // To be filled during generation
                notePattern: null,   // To be filled during generation
                
                // Special considerations for specific measures
                special: (() => {
                    if (baseTemplate.measureCount === 8) {
                        if (measureIndex === 3) return 'half_cadence';
                        if (measureIndex === 7) return 'final_cadence';
                    }
                    return null;
                })()
            })),
            
            // Variation strategy for this option (if not the correct answer)
            variationStrategy: index === 0 ? null : 
                baseTemplate.variationStrategies[index % baseTemplate.variationStrategies.length]
        }))
    };
}

/**
 * Validate a generated question against template requirements
 * @param {Object} questionSet - Generated question set (6 options)
 * @param {Object} template - Original template
 * @returns {Object} Validation result
 */
function validateGeneratedQuestion(questionSet, template) {
    const errors = [];
    const warnings = [];
    
    // Check structure
    if (!Array.isArray(questionSet) || questionSet.length !== 6) {
        errors.push(`Must have exactly 6 options, found ${questionSet.length}`);
        return { success: false, errors, warnings };
    }
    
    // Validate each option
    for (let i = 0; i < 6; i++) {
        const option = questionSet[i];
        
        // Check required properties
        if (template.timeSignature && option.timeSignature !== template.timeSignature) {
            errors.push(`Option ${i}: Incorrect time signature ${option.timeSignature}, expected ${template.timeSignature}`);
        }
        
        if (template.clef && option.clef !== template.clef) {
            errors.push(`Option ${i}: Incorrect clef ${option.clef}, expected ${template.clef}`);
        }
        
        // Check measure count
        const measureCount = template.measureCount;
        for (let m = 1; m <= measureCount; m++) {
            if (!option[`measure${m}`]) {
                errors.push(`Option ${i}: Missing measure${m}`);
            }
        }
        
        // Check for extra measures
        if (option[`measure${measureCount + 1}`]) {
            errors.push(`Option ${i}: Unexpected extra measure${measureCount + 1}`);
        }
    }
    
    return {
        success: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}

// Export all functions and constants
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TIME_SIGNATURES,
        NOTE_RANGES,
        CLASSICAL_PATTERNS,
        generateQuestionTemplate,
        generateRhythmPattern,
        generateContourTemplate,
        createQuestionSetTemplate,
        validateGeneratedQuestion
    };
}

// Example usage and testing
function testQuestionTemplates() {
    console.log('🎼 Testing Question Template System...\n');
    
    // Test template generation for different configurations
    const configs = [
        { timeSignature: '4/4', measureCount: 2, key: 'C_major', clef: 'treble', complexity: 'simple' },
        { timeSignature: '6/8', measureCount: 4, key: 'A_minor', clef: 'bass', complexity: 'complex' },
        { timeSignature: '3/4', measureCount: 8, key: 'C_major', clef: 'treble', complexity: 'simple' }
    ];
    
    configs.forEach((config, index) => {
        console.log(`\nTest ${index + 1}: ${config.timeSignature} ${config.measureCount}-measure ${config.key} ${config.complexity}`);
        
        try {
            const template = generateQuestionTemplate(
                config.timeSignature,
                config.measureCount,
                config.key,
                config.clef,
                config.complexity
            );
            
            const questionSet = createQuestionSetTemplate(template, index + 1);
            
            console.log('✅ Template generated successfully');
            console.log(`   - Time signature: ${template.timeSignature}`);
            console.log(`   - Measure count: ${template.measureCount}`);
            console.log(`   - Available rhythms: ${template.materials.rhythmPatterns.length}`);
            console.log(`   - Note range: ${template.materials.noteRange.comfortable.length} notes`);
            console.log(`   - Variation strategies: ${template.variationStrategies.length}`);
            
        } catch (error) {
            console.log('❌ Template generation failed:', error.message);
        }
    });
}

// Run test if this script is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    testQuestionTemplates();
}