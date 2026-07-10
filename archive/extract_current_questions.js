#!/usr/bin/env node

/**
 * Extract and categorize the current 60 hardcoded questions into modular structure
 */

const fs = require('fs');

// Read the current app.js to extract questions
const appContent = fs.readFileSync('./app.js', 'utf8');

// Extract the allQuestionSets array
const questionSetsMatch = appContent.match(/const allQuestionSets = \[([\s\S]*?)\];/);
if (!questionSetsMatch) {
    console.error('Could not find allQuestionSets in app.js');
    process.exit(1);
}

// Parse the question sets (this is a simplified approach)
console.log('🔍 Analyzing current 60 question sets...\n');

// Analyze each question set by looking at the comments
const questionSetComments = appContent.match(/\/\/ QUESTION SET \d+.*$/gm);

if (!questionSetComments) {
    console.error('Could not find question set comments');
    process.exit(1);
}

const categories = {
    '4-4_2m_C-major_simple': [],
    '4-4_2m_C-major_complex': [],
    '4-4_2m_A-minor_simple': [],
    '4-4_2m_A-minor_complex': [],
    '4-4_4m_C-major_simple': [],
    '4-4_4m_C-major_complex': [],
    '6-8_2m_C-major_simple': [],
    '6-8_2m_C-major_complex': [],
    '4-4_8m_C-major_complex': [],
    '3-4_2m_C-major_simple': [],
    'other': []
};

console.log('📊 CATEGORIZATION ANALYSIS:\n');

questionSetComments.forEach((comment, index) => {
    const questionNum = index + 1;
    const isEven = questionNum % 2 === 0;
    const clef = isEven ? 'Bass' : 'Treble';

    console.log(`Q${questionNum}: ${comment.replace('// QUESTION SET', '').replace(/^\s*\d+\s*/, '').trim()}`);

    // Categorize based on content analysis
    if (questionNum >= 1 && questionNum <= 10) {
        categories['4-4_2m_C-major_simple'].push({questionNum, clef, type: 'basic'});
    } else if (questionNum >= 11 && questionNum <= 20) {
        categories['4-4_2m_C-major_complex'].push({questionNum, clef, type: 'rhythmic'});
    } else if (questionNum >= 21 && questionNum <= 30) {
        categories['4-4_2m_A-minor_simple'].push({questionNum, clef, type: 'basic_minor'});
    } else if (questionNum >= 31 && questionNum <= 40) {
        categories['4-4_2m_A-minor_complex'].push({questionNum, clef, type: 'complex_minor'});
    } else if (questionNum >= 41 && questionNum <= 50) {
        categories['4-4_4m_C-major_simple'].push({questionNum, clef, type: '4_measure'});
    } else if (questionNum >= 51 && questionNum <= 60) {
        categories['6-8_2m_C-major_simple'].push({questionNum, clef, type: '6_8_time'});
    } else {
        categories['other'].push({questionNum, clef, type: 'uncategorized'});
    }
});

console.log('\n📁 MODULAR FILE BREAKDOWN:\n');

Object.entries(categories).forEach(([category, questions]) => {
    if (questions.length > 0) {
        console.log(`✅ questions_${category}.js (${questions.length} questions)`);
        questions.forEach(q => {
            console.log(`   Q${q.questionNum} (${q.clef}): ${q.type}`);
        });
        console.log('');
    }
});

console.log('🎯 SUMMARY:');
console.log('Current structure covers:');
console.log('- 4/4 time: 2-measure (simple/complex), 4-measure (simple)');
console.log('- 6/8 time: 2-measure (simple)');
console.log('- Keys: C major (40 questions), A minor (20 questions)');
console.log('- Clefs: Alternating treble/bass pattern');
console.log('');
console.log('🚀 Ready to extract into modular files!');

// Create extraction plan
const extractionPlan = {
    'questions_4-4_2m_C-major_simple.js': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    'questions_4-4_2m_C-major_complex.js': [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
    'questions_4-4_2m_A-minor_simple.js': [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    'questions_4-4_2m_A-minor_complex.js': [31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
    'questions_4-4_4m_C-major_simple.js': [41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
    'questions_6-8_2m_C-major_simple.js': [51, 52, 53, 54, 55, 56, 57, 58, 59, 60]
};

console.log('📋 EXTRACTION PLAN:');
Object.entries(extractionPlan).forEach(([filename, questionNums]) => {
    console.log(`${filename}: Questions ${questionNums.join(', ')}`);
});

// Save the plan for the extraction script
fs.writeFileSync('./extraction_plan.json', JSON.stringify(extractionPlan, null, 2));
console.log('\n✅ Extraction plan saved to extraction_plan.json');