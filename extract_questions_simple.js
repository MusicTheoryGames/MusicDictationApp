#!/usr/bin/env node

/**
 * Simple approach: manually extract question ranges from app.js
 */

const fs = require('fs');

// Read app.js
const appContent = fs.readFileSync('./app.js', 'utf8');

console.log('🔧 Extracting question data using manual parsing...\n');

// Find the start and end of allQuestionSets
const startMatch = appContent.match(/const allQuestionSets = \[/);
if (!startMatch) {
    console.error('❌ Could not find start of allQuestionSets');
    process.exit(1);
}

const startIndex = startMatch.index + startMatch[0].length;

// Find the end - look for the closing ]; that ends allQuestionSets
let braceCount = 1;
let endIndex = startIndex;
let inString = false;
let stringChar = '';

for (let i = startIndex; i < appContent.length && braceCount > 0; i++) {
    const char = appContent[i];
    const prevChar = i > 0 ? appContent[i - 1] : '';

    if (!inString) {
        if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
        } else if (char === '[') {
            braceCount++;
        } else if (char === ']') {
            braceCount--;
        }
    } else {
        if (char === stringChar && prevChar !== '\\') {
            inString = false;
        }
    }

    endIndex = i;
}

if (braceCount > 0) {
    console.error('❌ Could not find end of allQuestionSets array');
    process.exit(1);
}

// Extract the array content
const arrayContent = appContent.substring(startIndex, endIndex);

console.log('✅ Found allQuestionSets array');
console.log(`📏 Array content length: ${arrayContent.length} characters`);

// Create a simple extraction by finding question set boundaries
const questionSetBoundaries = [];
const questionSetRegex = /\/\/ QUESTION SET (\d+)/g;
let match;

while ((match = questionSetRegex.exec(appContent)) !== null) {
    questionSetBoundaries.push({
        questionNum: parseInt(match[1]),
        startIndex: match.index
    });
}

console.log(`✅ Found ${questionSetBoundaries.length} question set markers\n`);

// For now, let's create a simpler approach - just create template files with the preserved A-minor fixes
console.log('🏗️  Creating modular template files with corrected A-minor questions...\n');

// Create the 6 files we need based on current structure
const files = [
    {
        name: 'questions_4-4_2m_C-major_simple.js',
        timeSignature: '4/4',
        measures: 2,
        key: 'C major',
        complexity: 'simple',
        range: 'Q1-Q10'
    },
    {
        name: 'questions_4-4_2m_C-major_complex.js',
        timeSignature: '4/4',
        measures: 2,
        key: 'C major',
        complexity: 'complex',
        range: 'Q11-Q20'
    },
    {
        name: 'questions_4-4_2m_A-minor_simple.js',
        timeSignature: '4/4',
        measures: 2,
        key: 'A minor',
        complexity: 'simple',
        range: 'Q21-Q30'
    },
    {
        name: 'questions_4-4_2m_A-minor_complex.js',
        timeSignature: '4/4',
        measures: 2,
        key: 'A minor',
        complexity: 'complex',
        range: 'Q31-Q40'
    },
    {
        name: 'questions_4-4_4m_C-major_simple.js',
        timeSignature: '4/4',
        measures: 4,
        key: 'C major',
        complexity: 'simple',
        range: 'Q41-Q50'
    },
    {
        name: 'questions_6-8_2m_C-major_simple.js',
        timeSignature: '6/8',
        measures: 2,
        key: 'C major',
        complexity: 'simple',
        range: 'Q51-Q60'
    }
];

files.forEach(file => {
    console.log(`📁 Creating ${file.name} (${file.range})...`);

    // For A-minor files, use the preserved corrected versions
    if (file.key === 'A minor' && fs.existsSync(`PRESERVED_WORK/${file.name}`)) {
        console.log(`   🔄 Using preserved corrected version with G# fixes`);
        const preservedContent = fs.readFileSync(`PRESERVED_WORK/${file.name}`, 'utf8');
        fs.writeFileSync(file.name, preservedContent);
        console.log(`   ✅ Used preserved ${file.name} with G# leading tone fixes`);
    } else {
        // Create template file that we'll populate later
        const templateContent = createTemplateFile(file);
        fs.writeFileSync(file.name, templateContent);
        console.log(`   ✅ Created template ${file.name}`);
    }
    console.log('');
});

console.log('🎉 Initial modular files created!');
console.log('\n📋 NEXT STEPS:');
console.log('1. Extract actual question data from app.js (manual process)');
console.log('2. Update app.js to use modular loading');
console.log('3. Test the modular system');
console.log('4. Add the remaining 420 questions for full 480-question system');

function createTemplateFile(file) {
    const variableName = file.name.replace('.js', '').replace(/-/g, '_');

    return `// ${file.name}
// Time Signature: ${file.timeSignature}
// Measures: ${file.measures}
// Key: ${file.key}
// Complexity: ${file.complexity}
// Questions: ${file.range}

var ${variableName} = [
    // Question data will be extracted from app.js
    // TODO: Extract questions ${file.range} from original app.js
];

// Export for browser compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ${variableName};
} else if (typeof window !== 'undefined') {
    window.${variableName} = ${variableName};
}`;
}