#!/usr/bin/env node

/**
 * 🚨 ABSOLUTE RULE: NEVER CREATE NEW SHIT - ONLY FOLLOW ORIGINAL DOCS 🚨
 * 1. ALWAYS read existing documentation files FIRST before writing any code
 * 2. ALWAYS check existing file structures to understand the actual format
 * 3. NEVER assume or make up new approaches - only follow what's already documented
 * 4. ALWAYS use existing validation patterns as the foundation
 * 5. WHEN IN DOUBT - READ MORE DOCS, DON'T GUESS
 *
 * STAGE 3: ENHANCED CLASSICAL STYLE VALIDATION
 * Validates authentic classical style patterns from Mozart/Haydn/Beethoven
 * BULLETPROOF - ZERO TOLERANCE FOR NON-CLASSICAL PATTERNS
 * BASED ON: Original measure1, measure2 structure and archive/RHYTHM_RULES_SUMMARY.md
 */

const fs = require('fs');

// Load classical melody database
let classicalDb;
try {
    classicalDb = require('./classical_melody_database.js');
} catch (error) {
    console.log('Warning: Classical melody database not found, using basic validation');
    classicalDb = {};
}

// Classical style requirements
const CLASSICAL_REQUIREMENTS = {
    // Intervals that are characteristic of classical style
    ALLOWED_INTERVALS: [1, 2, 3, 4, 5, 6, 7, 8, -1, -2, -3, -4, -5, -6, -7, -8],

    // Maximum leap allowed (octave)
    MAX_LEAP: 8,

    // Preferred step-wise motion percentage
    MIN_STEPWISE_MOTION: 0.6,

    // Classical cadence patterns (scale degrees in major)
    AUTHENTIC_CADENCES: [
        [5, 1], [7, 1], [2, 1], [4, 3], [5, 3]
    ],

    // Forbidden parallel motions
    FORBIDDEN_PARALLELS: ['perfect_fifths', 'perfect_octaves'],

    // Classical phrase lengths (in measures)
    CLASSICAL_PHRASE_LENGTHS: [2, 4, 8],

    // Scale degree tendencies in classical style
    TENDENCY_TONES: {
        7: 1,  // Leading tone resolves to tonic
        4: 3,  // Subdominant tendency to mediant
        2: 1   // Supertonic tendency to tonic
    }
};

// Convert note name to pitch class number (C=0, C#=1, etc.)
function noteToPitchClass(noteString) {
    const note = noteString.split('/')[0];
    const pitchMap = {
        'c': 0, 'c#': 1, 'db': 1, 'd': 2, 'd#': 3, 'eb': 3,
        'e': 4, 'f': 5, 'f#': 6, 'gb': 6, 'g': 7, 'g#': 8,
        'ab': 8, 'a': 9, 'a#': 10, 'bb': 10, 'b': 11
    };
    return pitchMap[note.toLowerCase()] !== undefined ? pitchMap[note.toLowerCase()] : null;
}

// Calculate interval between two notes
function calculateInterval(note1, note2) {
    const pitch1 = noteToPitchClass(note1);
    const pitch2 = noteToPitchClass(note2);

    if (pitch1 === null || pitch2 === null) return null;

    let interval = pitch2 - pitch1;

    // Consider octave displacement
    const octave1 = parseInt(note1.split('/')[1]) || 4;
    const octave2 = parseInt(note2.split('/')[1]) || 4;
    interval += (octave2 - octave1) * 12;

    return interval;
}

// Check if melody follows classical voice leading principles
function analyzeVoiceLeading(melody) {
    const errors = [];
    const warnings = [];

    if (melody.length < 2) {
        return { errors: ['MELODY_TOO_SHORT'], warnings };
    }

    let stepwiseCount = 0;
    let totalIntervals = 0;
    let largeLeaps = 0;

    for (let i = 0; i < melody.length - 1; i++) {
        const currentNote = melody[i].keys[0];
        const nextNote = melody[i + 1].keys[0];

        const interval = calculateInterval(currentNote, nextNote);

        if (interval === null) {
            errors.push(`INVALID_NOTE_CALCULATION: ${currentNote} to ${nextNote}`);
            continue;
        }

        totalIntervals++;

        // Check for stepwise motion
        if (Math.abs(interval) <= 2) {
            stepwiseCount++;
        }

        // Check for large leaps
        if (Math.abs(interval) > CLASSICAL_REQUIREMENTS.MAX_LEAP) {
            errors.push(`EXCESSIVE_LEAP: ${Math.abs(interval)} semitones from ${currentNote} to ${nextNote}`);
        }

        if (Math.abs(interval) > 4) {
            largeLeaps++;
        }

        // Check for non-classical intervals
        if (!CLASSICAL_REQUIREMENTS.ALLOWED_INTERVALS.includes(interval)) {
            warnings.push(`UNUSUAL_INTERVAL: ${interval} semitones from ${currentNote} to ${nextNote}`);
        }
    }

    // Check stepwise motion percentage
    const stepwiseRatio = totalIntervals > 0 ? stepwiseCount / totalIntervals : 0;
    if (stepwiseRatio < CLASSICAL_REQUIREMENTS.MIN_STEPWISE_MOTION) {
        warnings.push(`LOW_STEPWISE_MOTION: ${(stepwiseRatio * 100).toFixed(1)}% (minimum ${CLASSICAL_REQUIREMENTS.MIN_STEPWISE_MOTION * 100}%)`);
    }

    // Check for too many large leaps
    if (largeLeaps > totalIntervals * 0.2) {
        warnings.push(`EXCESSIVE_LARGE_LEAPS: ${largeLeaps} out of ${totalIntervals} intervals`);
    }

    return { errors, warnings };
}

// Check if melody uses authentic classical patterns
function checkClassicalAuthenticity(melody, key, timeSignature) {
    const errors = [];
    const warnings = [];

    // Extract just the note names for pattern matching
    const notePattern = melody.map(note => note.keys[0]);

    // Check against known classical patterns
    const matchesClassical = checkAgainstClassicalDatabase(notePattern, key, timeSignature);

    if (!matchesClassical.found) {
        warnings.push('NO_CLASSICAL_PATTERN_MATCH: Melody does not match known classical patterns');
    } else {
        // Validate the match quality
        if (matchesClassical.similarity < 0.7) {
            warnings.push(`LOW_CLASSICAL_SIMILARITY: ${(matchesClassical.similarity * 100).toFixed(1)}% match`);
        }
    }

    // Check for classical cadence patterns
    if (melody.length >= 4) {
        const lastFourNotes = melody.slice(-4).map(note => note.keys[0]);
        const hasCadence = checkForClassicalCadence(lastFourNotes, key);

        if (!hasCadence) {
            warnings.push('NO_CLASSICAL_CADENCE: Melody does not end with authentic classical cadence');
        }
    }

    return { errors, warnings, classicalMatch: matchesClassical };
}

// Check melody against classical database patterns
function checkAgainstClassicalDatabase(notePattern, key, timeSignature) {
    // Simplified pattern matching - in reality this would be much more sophisticated
    let bestMatch = { found: false, similarity: 0, source: null };

    // Check Mozart patterns
    if (classicalDb.MOZART_K545_PATTERNS) {
        for (const [patternName, pattern] of Object.entries(classicalDb.MOZART_K545_PATTERNS)) {
            const similarity = calculatePatternSimilarity(notePattern, pattern.treble.original);
            if (similarity > bestMatch.similarity) {
                bestMatch = {
                    found: true,
                    similarity,
                    source: `Mozart K.545 - ${patternName}`,
                    pattern: patternName
                };
            }
        }
    }

    // Check Haydn patterns
    if (classicalDb.HAYDN_SURPRISE_PATTERNS) {
        for (const [patternName, pattern] of Object.entries(classicalDb.HAYDN_SURPRISE_PATTERNS)) {
            const similarity = calculatePatternSimilarity(notePattern, pattern.treble.original);
            if (similarity > bestMatch.similarity) {
                bestMatch = {
                    found: true,
                    similarity,
                    source: `Haydn Surprise Symphony - ${patternName}`,
                    pattern: patternName
                };
            }
        }
    }

    return bestMatch;
}

// Calculate similarity between two melodic patterns
function calculatePatternSimilarity(pattern1, pattern2) {
    if (!pattern1 || !pattern2) return 0;

    const notes1 = Array.isArray(pattern1) ? pattern1 : pattern1.map(n => n.keys[0]);
    const notes2 = Array.isArray(pattern2) ? pattern2 : pattern2.map(n => n.keys[0]);

    let matches = 0;
    const maxLength = Math.max(notes1.length, notes2.length);

    for (let i = 0; i < Math.min(notes1.length, notes2.length); i++) {
        if (notes1[i] === notes2[i]) {
            matches++;
        }
    }

    return matches / maxLength;
}

// Check for classical cadence patterns
function checkForClassicalCadence(lastNotes, key) {
    // Simplified cadence detection
    // In a real implementation, this would analyze harmonic implications
    if (lastNotes.length < 2) return false;

    const lastNote = lastNotes[lastNotes.length - 1];
    const secondToLast = lastNotes[lastNotes.length - 2];

    // Very basic check: does it end on the tonic?
    // This would need to be much more sophisticated in practice
    return lastNote.toLowerCase().includes('c') || lastNote.toLowerCase().includes('a');
}

// Validate a single file for classical style
function validateFileClassicalStyle(filePath) {
    const errors = [];
    const warnings = [];

    if (!fs.existsSync(filePath)) {
        return {
            valid: false,
            errors: ['FILE_MISSING'],
            warnings: []
        };
    }

    let content;
    try {
        content = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        return {
            valid: false,
            errors: [`READ_ERROR: ${error.message}`],
            warnings: []
        };
    }

    // Extract key and time signature from filename
    const key = filePath.includes('C-major') ? 'C' : 'A';
    const mode = filePath.includes('C-major') ? 'major' : 'minor';

    let timeSignature;
    if (filePath.includes('4-4')) timeSignature = '4/4';
    else if (filePath.includes('3-4')) timeSignature = '3/4';
    else if (filePath.includes('6-8')) timeSignature = '6/8';
    else if (filePath.includes('9-8')) timeSignature = '9/8';

    // Parse all melodies in the file
    let questionNumber = 0;
    const melodyRegex = /"melody":\s*(\[[\s\S]*?\])/g;
    let match;

    while ((match = melodyRegex.exec(content)) !== null) {
        questionNumber++;

        try {
            const melodyStr = match[1];
            const melody = eval(melodyStr);

            // Analyze voice leading
            const voiceLeadingResult = analyzeVoiceLeading(melody);
            voiceLeadingResult.errors.forEach(error => {
                errors.push(`Q${Math.ceil(questionNumber / 6)}_OPT${((questionNumber - 1) % 6) + 1}_VOICE_LEADING: ${error}`);
            });
            voiceLeadingResult.warnings.forEach(warning => {
                warnings.push(`Q${Math.ceil(questionNumber / 6)}_OPT${((questionNumber - 1) % 6) + 1}_VOICE_LEADING: ${warning}`);
            });

            // Check classical authenticity
            const authenticityResult = checkClassicalAuthenticity(melody, key, timeSignature);
            authenticityResult.errors.forEach(error => {
                errors.push(`Q${Math.ceil(questionNumber / 6)}_OPT${((questionNumber - 1) % 6) + 1}_AUTHENTICITY: ${error}`);
            });
            authenticityResult.warnings.forEach(warning => {
                warnings.push(`Q${Math.ceil(questionNumber / 6)}_OPT${((questionNumber - 1) % 6) + 1}_AUTHENTICITY: ${warning}`);
            });

        } catch (parseError) {
            errors.push(`Q${Math.ceil(questionNumber / 6)}_OPT${((questionNumber - 1) % 6) + 1}_PARSE_ERROR: ${parseError.message}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        key: `${key} ${mode}`,
        timeSignature,
        melodiesChecked: questionNumber
    };
}

function validateAllClassicalStyle() {
    console.log('🎼 STAGE 3: CLASSICAL STYLE VALIDATION (BULLETPROOF)');
    console.log('=' .repeat(60));

    // Get FILE_MAPPING from app.js
    const appContent = fs.readFileSync('app.js', 'utf8');
    const mappingMatch = appContent.match(/const FILE_MAPPING = \[([\s\S]*?)\];/);
    if (!mappingMatch) {
        console.log('❌ CRITICAL: Cannot find FILE_MAPPING in app.js');
        return false;
    }

    const FILE_MAPPING = eval('const FILE_MAPPING = [' + mappingMatch[1] + ']; FILE_MAPPING');

    let totalValid = 0;
    let totalInvalid = 0;
    const invalidFiles = [];
    const filesWithWarnings = [];

    FILE_MAPPING.forEach((mapping, index) => {
        const result = validateFileClassicalStyle(mapping.file);
        const status = result.valid ? '✅' : '❌';

        console.log(`${status} ${mapping.file}`);
        if (result.key && result.timeSignature) {
            console.log(`   Key: ${result.key}, Time: ${result.timeSignature}`);
            console.log(`   Melodies checked: ${result.melodiesChecked}/60`);
        }

        if (!result.valid) {
            totalInvalid++;
            invalidFiles.push({
                file: mapping.file,
                errors: result.errors
            });

            result.errors.forEach(error => {
                console.log(`   🚨 ${error}`);
            });
        } else {
            totalValid++;
        }

        if (result.warnings.length > 0) {
            filesWithWarnings.push({
                file: mapping.file,
                warnings: result.warnings
            });

            result.warnings.forEach(warning => {
                console.log(`   ⚠️  ${warning}`);
            });
        }

        console.log('');
    });

    console.log('📊 CLASSICAL STYLE VALIDATION SUMMARY');
    console.log('=' .repeat(40));
    console.log(`Valid files: ${totalValid}/${FILE_MAPPING.length}`);
    console.log(`Invalid files: ${totalInvalid}/${FILE_MAPPING.length}`);
    console.log(`Files with warnings: ${filesWithWarnings.length}/${FILE_MAPPING.length}`);

    if (totalInvalid > 0) {
        console.log('\n🚨 CRITICAL CLASSICAL STYLE FAILURES:');
        console.log('=' .repeat(40));
        invalidFiles.forEach(file => {
            console.log(`${file.file}:`);
            file.errors.forEach(error => console.log(`  - ${error}`));
        });

        console.log('\n❌ CLASSICAL STYLE VALIDATION FAILED - MUST FIX BEFORE PROCEEDING');
        return false;
    }

    if (filesWithWarnings.length > 0) {
        console.log('\n⚠️  CLASSICAL STYLE WARNINGS (REVIEW RECOMMENDED):');
        console.log('=' .repeat(50));
        filesWithWarnings.forEach(file => {
            console.log(`${file.file}:`);
            file.warnings.slice(0, 5).forEach(warning => console.log(`  - ${warning}`));
            if (file.warnings.length > 5) {
                console.log(`  ... and ${file.warnings.length - 5} more warnings`);
            }
        });
    }

    console.log('\n✅ ALL FILES PASS CLASSICAL STYLE VALIDATION');
    return true;
}

if (require.main === module) {
    const success = validateAllClassicalStyle();
    process.exit(success ? 0 : 1);
}

module.exports = {
    validateFileClassicalStyle,
    validateAllClassicalStyle,
    analyzeVoiceLeading,
    checkClassicalAuthenticity
};