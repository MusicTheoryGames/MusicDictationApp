/**
 * COMPREHENSIVE VALIDATION TEST
 * Tests all validation infrastructure on current questions
 */

const fs = require('fs');

// Import validation modules
const tonalityValidator = require('./validate_tonality.js');
const classicalStyleValidator = require('./validate_classical_style.js');
const cadenceValidator = require('./validate_cadences.js');

/**
 * Extract validation functions from app.js
 */
function extractValidationFromApp() {
    const appContent = fs.readFileSync('./app.js', 'utf8');
    
    // Extract allQuestionSets
    const startIndex = appContent.indexOf('const allQuestionSets = [');
    const endIndex = appContent.indexOf(']; // End of allQuestionSets') + 2;
    const questionSetsCode = appContent.substring(startIndex, endIndex);
    
    // Extract beat validation functions
    const validationStart = appContent.indexOf('function calculateBeatCount(notes, timeSignature)');
    const validationEnd = appContent.indexOf('function validateAllQuestions()');
    const beatValidationCode = appContent.substring(validationStart, validationEnd);
    
    return `
${questionSetsCode}

${beatValidationCode}

// Re-export beat validation functions
function validateSingleOption(option, questionIndex, optionIndex) {
    if (!option) {
        throw new Error(\`Question \${questionIndex}, Option \${optionIndex}: Option is null/undefined\`);
    }
    
    const timeSignature = option.timeSignature || '4/4';
    const expectedBeats = getExpectedBeats(timeSignature);
    
    if (!option.measure1 || !option.measure2) {
        throw new Error(\`Question \${questionIndex}, Option \${optionIndex}: Missing required measure1 or measure2\`);
    }
    
    const measures = ['measure1', 'measure2'];
    if (option.measure3 && option.measure4) {
        measures.push('measure3', 'measure4');
    }
    if (option.measure5 && option.measure6 && option.measure7 && option.measure8) {
        measures.push('measure5', 'measure6', 'measure7', 'measure8');
    }
    
    for (const measureName of measures) {
        const measure = option[measureName];
        if (!measure || !Array.isArray(measure) || measure.length === 0) {
            throw new Error(\`Question \${questionIndex}, Option \${optionIndex}: \${measureName} is empty or invalid\`);
        }
        
        const actualBeats = calculateBeatCount(measure, timeSignature);
        if (actualBeats !== expectedBeats) {
            throw new Error(
                \`Question \${questionIndex}, Option \${optionIndex}, \${measureName}: \` +
                \`Beat count mismatch in \${timeSignature} time. \` +
                \`Expected \${expectedBeats}, got \${actualBeats}.\`
            );
        }
    }
    
    return true;
}
`;
}

/**
 * Run comprehensive validation test on all current questions
 */
function runComprehensiveValidation() {
    console.log('🔍 COMPREHENSIVE VALIDATION TEST');
    console.log('Testing all validation infrastructure on current 60 questions...\n');
    
    // Setup validation environment
    const validationCode = extractValidationFromApp();
    const tempValidationFile = './temp_validation_env.js';
    fs.writeFileSync(tempValidationFile, validationCode);
    
    try {
        // Load questions and validation functions
        const validationEnv = require(tempValidationFile);
        const allQuestionSets = validationEnv.allQuestionSets;
        
        console.log(`Loaded ${allQuestionSets.length} question sets for validation\n`);
        
        // Track results
        let totalErrors = 0;
        let totalWarnings = 0;
        const results = {
            beatCount: { pass: 0, fail: 0, errors: [] },
            tonality: { pass: 0, fail: 0, errors: [] },
            classicalStyle: { pass: 0, fail: 0, errors: [], warnings: [] },
            cadences: { pass: 0, fail: 0, errors: [], skipped: 0 }
        };
        
        // Test each question set
        for (let i = 0; i < allQuestionSets.length; i++) {
            const questionSet = allQuestionSets[i];
            const questionNumber = i + 1;
            
            console.log(`Testing Question ${questionNumber}...`);
            
            // 1. BEAT COUNT VALIDATION
            try {
                for (let j = 0; j < 6; j++) {
                    validationEnv.validateSingleOption(questionSet[j], questionNumber, j);
                }
                results.beatCount.pass++;
                console.log(`  ✅ Beat count validation: PASS`);
            } catch (error) {
                results.beatCount.fail++;
                results.beatCount.errors.push(`Q${questionNumber}: ${error.message}`);
                console.log(`  ❌ Beat count validation: FAIL - ${error.message}`);
                totalErrors++;
            }
            
            // 2. TONALITY VALIDATION
            try {
                const tonalityResult = tonalityValidator.validateQuestionSetTonality(questionSet, questionNumber);
                if (tonalityResult.success) {
                    results.tonality.pass++;
                    console.log(`  ✅ Tonality validation: PASS (${tonalityResult.tonalityDescription})`);
                } else {
                    results.tonality.fail++;
                    results.tonality.errors.push(`Q${questionNumber}: ${tonalityResult.errorMessages.join('; ')}`);
                    console.log(`  ❌ Tonality validation: FAIL - ${tonalityResult.errorMessages.length} errors`);
                    totalErrors++;
                }
            } catch (error) {
                results.tonality.fail++;
                results.tonality.errors.push(`Q${questionNumber}: ${error.message}`);
                console.log(`  ❌ Tonality validation: ERROR - ${error.message}`);
                totalErrors++;
            }
            
            // 3. CLASSICAL STYLE VALIDATION
            try {
                const styleResult = classicalStyleValidator.validateQuestionSetClassicalStyle(questionSet, questionNumber);
                if (styleResult.success) {
                    results.classicalStyle.pass++;
                    console.log(`  ✅ Classical style validation: PASS (${styleResult.totalWarnings} warnings)`);
                    if (styleResult.totalWarnings > 0) {
                        results.classicalStyle.warnings.push(`Q${questionNumber}: ${styleResult.totalWarnings} warnings`);
                        totalWarnings += styleResult.totalWarnings;
                    }
                } else {
                    results.classicalStyle.fail++;
                    results.classicalStyle.errors.push(`Q${questionNumber}: ${styleResult.totalErrors} errors`);
                    console.log(`  ❌ Classical style validation: FAIL - ${styleResult.totalErrors} errors`);
                    totalErrors++;
                }
            } catch (error) {
                results.classicalStyle.fail++;
                results.classicalStyle.errors.push(`Q${questionNumber}: ${error.message}`);
                console.log(`  ❌ Classical style validation: ERROR - ${error.message}`);
                totalErrors++;
            }
            
            // 4. CADENCE VALIDATION (8-measure questions only)
            try {
                const cadenceResult = cadenceValidator.validateQuestionSetCadences(questionSet, questionNumber);
                if (cadenceResult.skipped) {
                    results.cadences.skipped++;
                    console.log(`  ⏭️  Cadence validation: SKIPPED (not 8-measure)`);
                } else if (cadenceResult.success) {
                    results.cadences.pass++;
                    console.log(`  ✅ Cadence validation: PASS`);
                } else {
                    results.cadences.fail++;
                    results.cadences.errors.push(`Q${questionNumber}: ${cadenceResult.totalErrors} errors`);
                    console.log(`  ❌ Cadence validation: FAIL - ${cadenceResult.totalErrors} errors`);
                    totalErrors++;
                }
            } catch (error) {
                results.cadences.fail++;
                results.cadences.errors.push(`Q${questionNumber}: ${error.message}`);
                console.log(`  ❌ Cadence validation: ERROR - ${error.message}`);
                totalErrors++;
            }
            
            console.log(''); // Empty line between questions
        }
        
        // SUMMARY REPORT
        console.log('=' .repeat(60));
        console.log('📊 COMPREHENSIVE VALIDATION SUMMARY');
        console.log('=' .repeat(60));
        
        console.log(`\n🔢 BEAT COUNT VALIDATION:`);
        console.log(`   Pass: ${results.beatCount.pass}/${allQuestionSets.length}`);
        console.log(`   Fail: ${results.beatCount.fail}/${allQuestionSets.length}`);
        if (results.beatCount.errors.length > 0) {
            console.log(`   Errors:`);
            results.beatCount.errors.forEach(err => console.log(`     - ${err}`));
        }
        
        console.log(`\n🎵 TONALITY VALIDATION:`);
        console.log(`   Pass: ${results.tonality.pass}/${allQuestionSets.length}`);
        console.log(`   Fail: ${results.tonality.fail}/${allQuestionSets.length}`);
        if (results.tonality.errors.length > 0) {
            console.log(`   Errors:`);
            results.tonality.errors.slice(0, 5).forEach(err => console.log(`     - ${err}`));
            if (results.tonality.errors.length > 5) {
                console.log(`     ... and ${results.tonality.errors.length - 5} more`);
            }
        }
        
        console.log(`\n🎼 CLASSICAL STYLE VALIDATION:`);
        console.log(`   Pass: ${results.classicalStyle.pass}/${allQuestionSets.length}`);
        console.log(`   Fail: ${results.classicalStyle.fail}/${allQuestionSets.length}`);
        console.log(`   Total Warnings: ${results.classicalStyle.warnings.length}`);
        if (results.classicalStyle.errors.length > 0) {
            console.log(`   Errors:`);
            results.classicalStyle.errors.slice(0, 3).forEach(err => console.log(`     - ${err}`));
            if (results.classicalStyle.errors.length > 3) {
                console.log(`     ... and ${results.classicalStyle.errors.length - 3} more`);
            }
        }
        
        console.log(`\n🎯 CADENCE VALIDATION:`);
        console.log(`   Pass: ${results.cadences.pass}/${allQuestionSets.length - results.cadences.skipped}`);
        console.log(`   Fail: ${results.cadences.fail}/${allQuestionSets.length - results.cadences.skipped}`);
        console.log(`   Skipped: ${results.cadences.skipped}/${allQuestionSets.length} (not 8-measure)`);
        if (results.cadences.errors.length > 0) {
            console.log(`   Errors:`);
            results.cadences.errors.forEach(err => console.log(`     - ${err}`));
        }
        
        console.log(`\n🏆 OVERALL RESULTS:`);
        console.log(`   Total Errors: ${totalErrors}`);
        console.log(`   Total Warnings: ${totalWarnings}`);
        
        if (totalErrors === 0) {
            console.log(`\n✅✅✅ ALL VALIDATION INFRASTRUCTURE WORKING CORRECTLY! ✅✅✅`);
            console.log(`Ready to deploy subagents for question generation.`);
        } else {
            console.log(`\n❌❌❌ VALIDATION INFRASTRUCTURE NEEDS FIXES ❌❌❌`);
            console.log(`Fix these issues before proceeding with subagent deployment.`);
        }
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR during validation testing:', error.message);
    } finally {
        // Cleanup
        if (fs.existsSync(tempValidationFile)) {
            fs.unlinkSync(tempValidationFile);
        }
    }
}

// Run the comprehensive validation test
if (require.main === module) {
    runComprehensiveValidation();
}

module.exports = { runComprehensiveValidation };