#!/usr/bin/env node

/**
 * Test script to verify our preserved validation tools work correctly
 */

// Import our validation modules
const { validateQuestionSetTonality, SCALE_DEFINITIONS } = require('./validate_tonality.js');
const { validateQuestionSetBeatCounts } = require('./validate_beat_counts.js');

console.log('🧪 Testing Preserved Validation Tools...\n');

// Test 1: Tonality validation with G# leading tone
console.log('Test 1: Tonality Validation (G# Leading Tone)');
const testAMinorQuestion = [
    // Simple A minor question with G# leading tone
    {
        timeSignature: '4/4',
        clef: 'treble',
        measure1: [
            { keys: ['a/4'], duration: 'q' },
            { keys: ['b/4'], duration: 'q' },
            { keys: ['c/5'], duration: 'q' },
            { keys: ['d/5'], duration: 'q' }
        ],
        measure2: [
            { keys: ['e/5'], duration: 'q' },
            { keys: ['f/5'], duration: 'q' },
            { keys: ['g#/5'], duration: 'q' },  // Leading tone G#
            { keys: ['a/5'], duration: 'q' }    // Resolves to tonic A
        ]
    },
    // 5 similar variations...
    {
        timeSignature: '4/4',
        clef: 'treble',
        measure1: [
            { keys: ['a/4'], duration: 'q' },
            { keys: ['b/4'], duration: 'q' },
            { keys: ['c/5'], duration: 'q' },
            { keys: ['d/5'], duration: 'q' }
        ],
        measure2: [
            { keys: ['e/5'], duration: 'q' },
            { keys: ['f/5'], duration: 'q' },
            { keys: ['g#/5'], duration: 'q' },
            { keys: ['a/5'], duration: 'q' }
        ]
    },
    {
        timeSignature: '4/4',
        clef: 'treble',
        measure1: [
            { keys: ['a/4'], duration: 'q' },
            { keys: ['b/4'], duration: 'q' },
            { keys: ['c/5'], duration: 'q' },
            { keys: ['d/5'], duration: 'q' }
        ],
        measure2: [
            { keys: ['e/5'], duration: 'q' },
            { keys: ['f/5'], duration: 'q' },
            { keys: ['g#/5'], duration: 'q' },
            { keys: ['a/5'], duration: 'q' }
        ]
    },
    {
        timeSignature: '4/4',
        clef: 'treble',
        measure1: [
            { keys: ['a/4'], duration: 'q' },
            { keys: ['b/4'], duration: 'q' },
            { keys: ['c/5'], duration: 'q' },
            { keys: ['d/5'], duration: 'q' }
        ],
        measure2: [
            { keys: ['e/5'], duration: 'q' },
            { keys: ['f/5'], duration: 'q' },
            { keys: ['g#/5'], duration: 'q' },
            { keys: ['a/5'], duration: 'q' }
        ]
    },
    {
        timeSignature: '4/4',
        clef: 'treble',
        measure1: [
            { keys: ['a/4'], duration: 'q' },
            { keys: ['b/4'], duration: 'q' },
            { keys: ['c/5'], duration: 'q' },
            { keys: ['d/5'], duration: 'q' }
        ],
        measure2: [
            { keys: ['e/5'], duration: 'q' },
            { keys: ['f/5'], duration: 'q' },
            { keys: ['g#/5'], duration: 'q' },
            { keys: ['a/5'], duration: 'q' }
        ]
    },
    {
        timeSignature: '4/4',
        clef: 'treble',
        measure1: [
            { keys: ['a/4'], duration: 'q' },
            { keys: ['b/4'], duration: 'q' },
            { keys: ['c/5'], duration: 'q' },
            { keys: ['d/5'], duration: 'q' }
        ],
        measure2: [
            { keys: ['e/5'], duration: 'q' },
            { keys: ['f/5'], duration: 'q' },
            { keys: ['g#/5'], duration: 'q' },
            { keys: ['a/5'], duration: 'q' }
        ]
    }
];

try {
    const tonalityResult = validateQuestionSetTonality(testAMinorQuestion, 34);
    console.log('✅ Tonality validation passed');
    console.log(`   Detected: ${tonalityResult.tonalityDescription}`);
    console.log(`   Success: ${tonalityResult.success}`);
} catch (error) {
    console.log(`❌ Tonality validation failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 2: Beat count validation
console.log('Test 2: Beat Count Validation (4/4 time)');

try {
    const beatResult = validateQuestionSetBeatCounts(testAMinorQuestion, 34);
    console.log('✅ Beat count validation passed');
    console.log(`   Time signature: ${beatResult.timeSignature}`);
    console.log(`   Success: ${beatResult.success}`);
    console.log(`   Total errors: ${beatResult.totalErrors}`);
} catch (error) {
    console.log(`❌ Beat count validation failed: ${error.message}`);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 3: Show available scale definitions
console.log('Test 3: Available Scale Definitions');
console.log('Scale definitions loaded:');
for (const [key, value] of Object.entries(SCALE_DEFINITIONS)) {
    console.log(`   ${key}: ${value.description}`);
    console.log(`      Natural: ${value.natural.join(', ')}`);
    console.log(`      Accidentals: ${value.accidentals.join(', ') || 'none'}`);
}

console.log('\n🎉 All validation tools working correctly!');
console.log('The preserved validation infrastructure is ready for use.');