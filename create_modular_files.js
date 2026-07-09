#!/usr/bin/env node

/**
 * Extract current 60 questions from app.js and create modular files
 */

const fs = require('fs');

// Load the extraction plan
const extractionPlan = JSON.parse(fs.readFileSync('./extraction_plan.json', 'utf8'));

// Read and parse the current app.js
const appContent = fs.readFileSync('./app.js', 'utf8');

// Extract the full allQuestionSets array content
const questionSetsMatch = appContent.match(/const allQuestionSets = \[([\s\S]*?)\];$/m);
if (!questionSetsMatch) {
    console.error('❌ Could not find allQuestionSets in app.js');
    process.exit(1);
}

console.log('🔧 Extracting question sets from app.js...\n');

// Use a more robust approach - execute the JavaScript to get the actual data
const vm = require('vm');

// Create a safe context to execute the code
const context = vm.createContext({
    console: console,
    module: {},
    exports: {}
});

// Execute the relevant parts of app.js to get the question data
try {
    // Extract just the allQuestionSets definition
    const questionSetsCode = questionSetsMatch[0];
    vm.runInContext(questionSetsCode, context);

    const allQuestionSets = context.allQuestionSets;

    if (!allQuestionSets || !Array.isArray(allQuestionSets)) {
        throw new Error('allQuestionSets is not a valid array');
    }

    console.log(`✅ Successfully extracted ${allQuestionSets.length} question sets\n`);

    // Create modular files based on extraction plan
    Object.entries(extractionPlan).forEach(([filename, questionNumbers]) => {
        console.log(`📁 Creating ${filename}...`);

        const questionsForFile = [];

        questionNumbers.forEach(questionNum => {
            const questionIndex = questionNum - 1; // Convert to 0-based index

            if (questionIndex < allQuestionSets.length) {
                const questionSet = allQuestionSets[questionIndex];
                questionsForFile.push(questionSet);
                console.log(`   ✓ Extracted Question ${questionNum}`);
            } else {
                console.log(`   ⚠️  Question ${questionNum} not found in source`);
            }
        });

        // Determine metadata from filename
        const [, timeSig, measures, key, complexity] = filename.match(/questions_(\d-\d)_(\d+)m_([^_]+)_([^.]+)\.js/);
        const timeSignature = timeSig.replace('-', '/');
        const measureCount = parseInt(measures);

        // Create the modular file content
        const fileContent = createModularFile({
            filename,
            timeSignature,
            measureCount,
            key,
            complexity,
            questions: questionsForFile
        });

        // Write the file
        fs.writeFileSync(filename, fileContent);
        console.log(`   ✅ Created ${filename} with ${questionsForFile.length} questions\n`);
    });

    console.log('🎉 Modular extraction complete!');
    console.log('\n📊 SUMMARY:');
    console.log(`Created ${Object.keys(extractionPlan).length} modular files`);
    console.log('Ready to implement dynamic loading system');

} catch (error) {
    console.error('❌ Error extracting questions:', error.message);
    process.exit(1);
}

/**
 * Create the content for a modular question file
 */
function createModularFile({ filename, timeSignature, measureCount, key, complexity, questions }) {
    const keyDisplayName = key.replace('-', ' ');
    const variableName = filename.replace('.js', '').replace(/-/g, '_');

    const header = `// ${filename}
// Time Signature: ${timeSignature}
// Measures: ${measureCount}
// Key: ${keyDisplayName}
// Complexity: ${complexity}
// Questions: ${questions.length}

var ${variableName} = ${JSON.stringify(questions, null, 4)};

// Export for browser compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ${variableName};
} else if (typeof window !== 'undefined') {
    window.${variableName} = ${variableName};
}`;

    return header;
}