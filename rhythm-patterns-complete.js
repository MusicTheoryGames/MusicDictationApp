// COMPREHENSIVE 4/4 RHYTHM PATTERNS
// All possible combinations that fit within one beat or multiple beats

const COMPLETE_RHYTHM_PATTERNS = {
    // === ONE BEAT PATTERNS (1 beat = quarter note) ===
    onebeat: {
        // Basic subdivisions
        'quarter': { notation: '♩', duration: 1, description: 'Quarter note' },
        'two-eighths': { notation: '♫', duration: 1, description: 'Two eighth notes' },
        'four-sixteenths': { notation: '♬♬', duration: 1, description: 'Four sixteenth notes' },

        // Mixed subdivisions
        'eighth-two-sixteenths': { notation: '♫♬', duration: 1, description: 'Eighth + two sixteenths' },
        'two-sixteenths-eighth': { notation: '♬♫', duration: 1, description: 'Two sixteenths + eighth' },
        'sixteenth-eighth-sixteenth': { notation: '♬♫♬', duration: 1, description: 'Sixteenth + eighth + sixteenth' },

        // Dotted rhythms (need complementary patterns)
        'dotted-eighth-sixteenth': { notation: '♫.♬', duration: 1, description: 'Dotted eighth + sixteenth' },
        'sixteenth-dotted-eighth': { notation: '♬♫.', duration: 1, description: 'Sixteenth + dotted eighth' },

        // Triplets
        'triplet-eighths': { notation: '♫³', duration: 1, description: 'Three eighth note triplets' },
        'triplet-quarter-eighth': { notation: '♩³♫³', duration: 1, description: 'Quarter + eighth triplet' },
        'triplet-eighth-quarter': { notation: '♫³♩³', duration: 1, description: 'Eighth + quarter triplet' },

        // Rest patterns
        'quarter-rest': { notation: '𝄽', duration: 1, description: 'Quarter rest' },
        'eighth-rest-eighth': { notation: '𝄾♫', duration: 1, description: 'Eighth rest + eighth' },
        'eighth-eighth-rest': { notation: '♫𝄾', duration: 1, description: 'Eighth + eighth rest' },
        'sixteenth-rest-sixteenth-eighth': { notation: '♬𝄿♬♫', duration: 1, description: 'Sixteenth rest pattern' },
        'two-sixteenths-two-rests': { notation: '♬♬𝄿𝄿', duration: 1, description: 'Two sixteenths + two rests' }
    },

    // === HALF BEAT PATTERNS (0.5 beats = eighth note) ===
    halfbeat: {
        'eighth': { notation: '♫', duration: 0.5, description: 'Single eighth note' },
        'two-sixteenths': { notation: '♬♬', duration: 0.5, description: 'Two sixteenths' },
        'eighth-rest': { notation: '𝄾', duration: 0.5, description: 'Eighth rest' },
        'sixteenth-rest-sixteenth': { notation: '♬𝄿♬', duration: 0.5, description: 'Sixteenth + rest + sixteenth' },
        'sixteenth-sixteenth-rest': { notation: '♬♬𝄿', duration: 0.5, description: 'Two sixteenths + rest' }
    },

    // === MULTI-BEAT PATTERNS ===
    multibeat: {
        // 1.5 beat patterns (dotted quarter)
        'dotted-quarter': { notation: '♩.', duration: 1.5, description: 'Dotted quarter note' },
        'quarter-tied-eighth': { notation: '♩⌐♫', duration: 1.5, description: 'Quarter tied to eighth' },
        'three-eighths': { notation: '♫♫♫', duration: 1.5, description: 'Three eighth notes' },

        // 2 beat patterns (half note)
        'half': { notation: '♪', duration: 2, description: 'Half note' },
        'quarter-quarter': { notation: '♩♩', duration: 2, description: 'Two quarter notes' },
        'dotted-quarter-eighth': { notation: '♩.♫', duration: 2, description: 'Dotted quarter + eighth' },
        'eighth-dotted-quarter': { notation: '♫♩.', duration: 2, description: 'Eighth + dotted quarter' },
        'four-eighths': { notation: '♫♫♫♫', duration: 2, description: 'Four eighth notes' },
        'half-rest': { notation: '𝄼', duration: 2, description: 'Half rest' },

        // 2.5 beat patterns
        'dotted-half': { notation: '♪.', duration: 3, description: 'Dotted half note' },

        // 3 beat patterns
        'dotted-half': { notation: '♪.', duration: 3, description: 'Dotted half note' },
        'half-quarter': { notation: '♪♩', duration: 3, description: 'Half + quarter' },
        'quarter-half': { notation: '♩♪', duration: 3, description: 'Quarter + half' },

        // 4 beat patterns (whole measure)
        'whole': { notation: '𝅝', duration: 4, description: 'Whole note' },
        'four-quarters': { notation: '♩♩♩♩', duration: 4, description: 'Four quarter notes' },
        'two-halves': { notation: '♪♪', duration: 4, description: 'Two half notes' },
        'whole-rest': { notation: '𝄻', duration: 4, description: 'Whole rest' }
    }
};

// SOUND FILES NEEDED FOR COMPLETE COVERAGE
const REQUIRED_SOUND_FILES = [
    // === BASIC BUILDING BLOCKS ===
    // Single notes
    'quarter.mp3',           // ♩ (1 beat)
    'eighth.mp3',            // ♫ (0.5 beat)
    'sixteenth.mp3',         // ♬ (0.25 beat)
    'half.mp3',              // ♪ (2 beats)
    'whole.mp3',             // 𝅝 (4 beats)

    // Dotted notes
    'dotted-quarter.mp3',    // ♩. (1.5 beats)
    'dotted-eighth.mp3',     // ♫. (0.75 beats)
    'dotted-half.mp3',       // ♪. (3 beats)

    // === ONE BEAT COMBINATIONS ===
    'two-eighths.mp3',                    // ♫♫
    'four-sixteenths.mp3',                // ♬♬♬♬
    'eighth-two-sixteenths.mp3',          // ♫♬♬
    'two-sixteenths-eighth.mp3',          // ♬♬♫
    'sixteenth-eighth-sixteenth.mp3',     // ♬♫♬
    'dotted-eighth-sixteenth.mp3',        // ♫.♬
    'sixteenth-dotted-eighth.mp3',        // ♬♫.

    // Triplets
    'triplet-eighths.mp3',                // ♫³♫³♫³
    'triplet-quarter-eighth.mp3',         // ♩³♫³
    'triplet-eighth-quarter.mp3',         // ♫³♩³

    // === MULTI-BEAT COMBINATIONS ===
    'three-eighths.mp3',                  // ♫♫♫ (1.5 beats)
    'four-eighths.mp3',                   // ♫♫♫♫ (2 beats)
    'quarter-quarter.mp3',                // ♩♩ (2 beats)
    'dotted-quarter-eighth.mp3',          // ♩.♫ (2 beats)
    'eighth-dotted-quarter.mp3',          // ♫♩. (2 beats)

    // === REST PATTERNS ===
    'quarter-rest.mp3',                   // 𝄽
    'eighth-rest.mp3',                    // 𝄾
    'sixteenth-rest.mp3',                 // 𝄿
    'half-rest.mp3',                      // 𝄼
    'whole-rest.mp3',                     // 𝄻

    // Rest combinations
    'eighth-rest-eighth.mp3',             // 𝄾♫
    'eighth-eighth-rest.mp3',             // ♫𝄾
    'sixteenth-rest-sixteenth-eighth.mp3', // ♬𝄿♬♫
    'two-sixteenths-two-rests.mp3',       // ♬♬𝄿𝄿

    // === SYNCOPATED PATTERNS ===
    'syncopated-eighth-quarter-eighth.mp3', // ♫♩♫ (2 beats)
    'syncopated-quarter-eighth-quarter.mp3', // ♩♫♩ (2 beats)
];

// DIFFICULTY LEVELS WITH COMPLETE PATTERNS
const DIFFICULTY_PATTERNS = {
    easy: [
        'quarter', 'two-eighths', 'quarter-rest', 'half',
        'eighth-rest-eighth', 'eighth-eighth-rest'
    ],

    medium: [
        'quarter', 'two-eighths', 'four-sixteenths', 'half',
        'dotted-quarter', 'three-eighths', 'quarter-rest',
        'eighth-rest-eighth', 'eighth-eighth-rest',
        'eighth-two-sixteenths', 'two-sixteenths-eighth'
    ],

    hard: [
        'quarter', 'two-eighths', 'four-sixteenths', 'half',
        'dotted-quarter', 'three-eighths', 'dotted-half',
        'eighth-two-sixteenths', 'two-sixteenths-eighth',
        'sixteenth-eighth-sixteenth', 'dotted-eighth-sixteenth',
        'sixteenth-dotted-eighth', 'triplet-eighths',
        'triplet-quarter-eighth', 'triplet-eighth-quarter',
        'quarter-rest', 'eighth-rest-eighth', 'eighth-eighth-rest',
        'sixteenth-rest-sixteenth-eighth', 'syncopated-eighth-quarter-eighth'
    ]
};

module.exports = {
    COMPLETE_RHYTHM_PATTERNS,
    REQUIRED_SOUND_FILES,
    DIFFICULTY_PATTERNS
};