# MODULAR QUESTION FILE STRUCTURE

## Overview
Questions are organized in separate files by filtering characteristics, allowing users to select exactly what they want to practice.

---

## **FILE NAMING CONVENTION**

Format: `questions_[TIME_SIG]_[MEASURES]m_[KEY]_[COMPLEXITY].js`

Examples:
- `questions_4-4_2m_C-major_simple.js`
- `questions_6-8_4m_A-minor_complex.js`
- `questions_9-8_8m_C-major_simple.js`

---

## **FILTER CATEGORIES**

### **Time Signatures**
- `4-4` (4/4 time)
- `3-4` (3/4 time)
- `6-8` (6/8 time)
- `9-8` (9/8 time)

### **Measure Counts**
- `2m` (2 measures)
- `4m` (4 measures)
- `8m` (8 measures)

### **Keys**
- `C-major` (C major)
- `A-minor` (A minor)

### **Complexity Levels**
- `simple` (Basic rhythms: quarters, halves, dotted quarters)
- `complex` (Advanced rhythms: eighths, sixteenths, syncopation)

---

## **REQUIRED FILES (48 total combinations)**

### **2-Measure Questions (16 files)**
```
questions_4-4_2m_C-major_simple.js     (20 questions)
questions_4-4_2m_C-major_complex.js    (20 questions)
questions_4-4_2m_A-minor_simple.js     (20 questions)
questions_4-4_2m_A-minor_complex.js    (20 questions)

questions_3-4_2m_C-major_simple.js     (20 questions)
questions_3-4_2m_C-major_complex.js    (20 questions)
questions_3-4_2m_A-minor_simple.js     (20 questions)
questions_3-4_2m_A-minor_complex.js    (20 questions)

questions_6-8_2m_C-major_simple.js     (20 questions)
questions_6-8_2m_C-major_complex.js    (20 questions)
questions_6-8_2m_A-minor_simple.js     (20 questions)
questions_6-8_2m_A-minor_complex.js    (20 questions)

questions_9-8_2m_C-major_simple.js     (20 questions)
questions_9-8_2m_C-major_complex.js    (20 questions)
questions_9-8_2m_A-minor_simple.js     (20 questions)
questions_9-8_2m_A-minor_complex.js    (20 questions)
```

### **4-Measure Questions (16 files)**
```
questions_4-4_4m_C-major_simple.js     (20 questions)
questions_4-4_4m_C-major_complex.js    (20 questions)
questions_4-4_4m_A-minor_simple.js     (20 questions)
questions_4-4_4m_A-minor_complex.js    (20 questions)

questions_3-4_4m_C-major_simple.js     (20 questions)
questions_3-4_4m_C-major_complex.js    (20 questions)
questions_3-4_4m_A-minor_simple.js     (20 questions)
questions_3-4_4m_A-minor_complex.js    (20 questions)

questions_6-8_4m_C-major_simple.js     (20 questions)
questions_6-8_4m_C-major_complex.js    (20 questions)
questions_6-8_4m_A-minor_simple.js     (20 questions)
questions_6-8_4m_A-minor_complex.js    (20 questions)

questions_9-8_4m_C-major_simple.js     (20 questions)
questions_9-8_4m_C-major_complex.js    (20 questions)
questions_9-8_4m_A-minor_simple.js     (20 questions)
questions_9-8_4m_A-minor_complex.js    (20 questions)
```

### **8-Measure Questions (16 files)**
```
questions_4-4_8m_C-major_simple.js     (20 questions)
questions_4-4_8m_C-major_complex.js    (20 questions)
questions_4-4_8m_A-minor_simple.js     (20 questions)
questions_4-4_8m_A-minor_complex.js    (20 questions)

questions_3-4_8m_C-major_simple.js     (20 questions)
questions_3-4_8m_C-major_complex.js    (20 questions)
questions_3-4_8m_A-minor_simple.js     (20 questions)
questions_3-4_8m_A-minor_complex.js    (20 questions)

questions_6-8_8m_C-major_simple.js     (20 questions)
questions_6-8_8m_C-major_complex.js    (20 questions)
questions_6-8_8m_A-minor_simple.js     (20 questions)
questions_6-8_8m_A-minor_complex.js    (20 questions)

questions_9-8_8m_C-major_simple.js     (20 questions)
questions_9-8_8m_C-major_complex.js    (20 questions)
questions_9-8_8m_A-minor_simple.js     (20 questions)
questions_9-8_8m_A-minor_complex.js    (20 questions)
```

**Total: 48 files × 20 questions each = 960 questions**

---

## **CURRENT QUESTION MAPPING**

### **What We Have:**
- `questionSet_71_80.js` → Should become `questions_4-4_8m_C-major_complex.js` (but has beat errors)
- `question_set_81_90.js` → Should become `questions_3-4_2m_C-major_simple.js` ✓
- `questionSet_91_100.js` → Should become `questions_6-8_2m_C-major_simple.js` ✓
- `questions_101_110.js` → Should become `questions_3-4_4m_C-major_simple.js` ✓

### **What We Need:**
- 44 more files (960 - current questions = ~900 more questions needed)

---

## **USER INTERFACE DESIGN**

### **Splash Page Filters:**
```
📊 PRACTICE SETTINGS

Time Signature:     [4/4] [3/4] [6/8] [9/8] [All]
Phrase Length:      [2 measures] [4 measures] [8 measures] [All]
Key:                [C major] [A minor] [Both]
Complexity:         [Simple] [Complex] [Both]
Clef:               [Treble] [Bass] [Both]

Questions per session: [10] [20] [50] [All available]

[START PRACTICE] [PRESET LEVELS]
```

### **Preset Levels:**
```
🎯 PRESET LEARNING PATHS

Level 1: Beginner        (2m, simple rhythms, C major)
Level 2: Intermediate    (4m, simple rhythms, C major)
Level 3: Advanced        (2m, complex rhythms, both keys)
Level 4: Expert          (4m, complex rhythms, both keys)
Level 5: Master          (8m, all patterns, both keys)
```

---

## **FILE FORMAT TEMPLATE**

Each file should follow this structure:

```javascript
// Questions: [TIME_SIG] [MEASURES] [KEY] [COMPLEXITY]
// Example: 4/4 time, 2 measures, C major, simple rhythms
const questions_4_4_2m_C_major_simple = [
    // Question 1 (Treble Clef)
    [
        // Option 0: CORRECT ANSWER
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [ /* notes */ ],
            measure2: [ /* notes */ ]
        },
        // Options 1-5: Similar variations
        { /* ... */ },
        // ...
    ],

    // Question 2 (Bass Clef)
    [
        // 6 options...
    ],

    // ... Questions 3-20 (alternating clefs)
];

// Export for dynamic loading
if (typeof module !== 'undefined' && module.exports) {
    module.exports = questions_4_4_2m_C_major_simple;
}
```

---

## **DYNAMIC LOADING SYSTEM**

The app will:
1. Show splash page with filters
2. User selects criteria or preset level
3. App dynamically loads only the relevant question files
4. Creates custom practice session from filtered questions
5. Tracks progress separately for each question type

This gives maximum flexibility for targeted practice while keeping files manageable!