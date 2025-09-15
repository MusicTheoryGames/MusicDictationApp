# SUBAGENT INSTRUCTIONS FOR QUESTION GENERATION
## CRITICAL: All 6 Options Must Be EXTREMELY Similar

### 🚨 MOST IMPORTANT RULE 🚨
**ALL 6 OPTIONS IN EACH QUESTION MUST BE NEARLY IDENTICAL**

This is the CORE PURPOSE of the game. Students must distinguish between 6 options that sound almost the same. The differences must be:
- **SUBTLE** - Only 1-2 small changes per option
- **SIMILAR DIFFICULTY** - No option should be obviously easier or harder
- **MUSICALLY COHERENT** - All options must make musical sense
- **BARELY AUDIBLE** - Students must listen carefully to detect differences

---

## YOUR SPECIFIC ASSIGNMENT

You are responsible for creating **exactly 10 questions with 6 options each** (60 total options).

### Your Parameters:
- **Time Signature**: [TO BE SPECIFIED]
- **Measure Count**: [TO BE SPECIFIED] 
- **Key**: [TO BE SPECIFIED]
- **Clef**: [TO BE SPECIFIED]
- **Complexity**: [TO BE SPECIFIED]
- **Question Numbers**: [TO BE SPECIFIED]

---

## MANDATORY VALIDATION WORKFLOW

### Step 1: Generate Your Questions
Use the provided templates and guidelines to create your 10 questions.

### Step 2: Run All Validation Scripts
**BEFORE SUBMITTING**, you MUST run these validation scripts on ALL your questions:

```bash
# Beat count validation (CRITICAL - must pass 100%)
node validate_beat_counts.js [your_questions.js]

# Tonality validation (ensure proper C major/A minor)
node validate_tonality.js [your_questions.js]

# Classical style validation (Mozart/Haydn/Beethoven style)
node validate_classical_style.js [your_questions.js]

# Cadence validation (8-measure questions only)
node validate_cadences.js [your_questions.js]
```

### Step 3: Fix All Errors
- **Zero tolerance for beat count errors**
- Fix any tonality violations
- Address classical style issues
- Ensure proper cadences (8-measure only)

### Step 4: Submit Only Perfect Questions
Do not submit until ALL validation passes without errors.

---

## OPTION SIMILARITY REQUIREMENTS

### The 6 Options Must Follow This Pattern:

**Option 0 (Correct Answer):**
- The "correct" melody that students will hear
- Must follow all Classical style guidelines perfectly
- Serves as the template for other options

**Options 1-5 (Distractors):**
Each should have **exactly ONE** of these tiny changes:

1. **Single Note Change**: Change ONE note by a step (C→D or C→B)
2. **Single Interval Change**: Change ONE interval direction (up→down) 
3. **Single Rhythm Change**: Change ONE rhythm (quarter→two eighths)
4. **Single Register Change**: Move ONE phrase up/down (within comfortable range)
5. **Single Ornament Change**: Add/remove ONE passing tone or neighbor

### Examples of GOOD Variations:

**Original (Option 0):**
```
Measure 1: C(q) D(q) E(q) F(q)
Measure 2: G(q) F(q) E(q) C(h)
```

**Option 1** - Single note change:
```
Measure 1: C(q) D(q) F(q) F(q)  // E→F (one step up)
Measure 2: G(q) F(q) E(q) C(h)
```

**Option 2** - Single rhythm change:
```
Measure 1: C(q) D(q) E(8) E(8) F(q)  // E(q)→E(8)E(8) 
Measure 2: G(q) F(q) E(q) C(h)
```

### Examples of BAD Variations:

❌ **Too Many Changes:**
```
Measure 1: D(q) E(q) F(q) G(q)  // Changed 3 notes
Measure 2: A(q) G(q) F(q) D(h)  // Changed 2 more notes
```

❌ **Too Obvious:**
```
Measure 1: C(h) D(h)             // Completely different rhythm
Measure 2: E(h) F(h)
```

❌ **Wrong Style:**
```
Measure 1: C(q) G(q) C(q) G(q)   // Too repetitive, not Classical
Measure 2: E(q) C(q) A(q) F(q)   // Random leaps
```

---

## CLASSICAL STYLE REQUIREMENTS

### Melodic Rules (MANDATORY):
- **Minimum 60% stepwise motion** (movement by 2nd)
- **Maximum 2 consecutive leaps** in same direction
- **Resolve large leaps** (6th or larger) by step in opposite direction
- **No tritones** in melodic motion
- **No intervals larger than octave**

### Phrase Structure:
- **2-measure**: Simple arch or linear motion
- **4-measure**: Classical curve with peak in measures 2-3
- **8-measure**: Two phrases with half cadence at m.4, authentic at m.8

### Cadential Requirements (8-measure only):
- **Measure 4**: Half cadence (end on scale degree 5)
- **Measure 8**: Authentic cadence (end on scale degree 1)

---

## BEAT COUNT REQUIREMENTS

### Time Signature Beat Counts:
- **4/4 time**: 4 quarter-note beats per measure
- **3/4 time**: 3 quarter-note beats per measure  
- **6/8 time**: 6 eighth-note beats per measure
- **9/8 time**: 9 eighth-note beats per measure

### Rhythm Patterns:

**4/4 Simple**: `q q q q`, `h h`, `h q q`, `q h q`, `q q h`
**4/4 Complex**: `q 8 8 q`, `8 8 q q`, `qd 8 q`, `q qd 8`

**3/4 Simple**: `hd`, `q q q`, `h q`, `q h`
**3/4 Complex**: `q 8 8 q`, `qd 8 q`, `q qd 8`

**6/8 Simple**: `qd qd`, `q 8 qd`, `qd q 8`
**6/8 Complex**: `8 8 8 8 8 8`, `qd 8 8 8`, `q 8 8 8 8`

**9/8 Simple**: `qd qd qd`, `q 8 qd qd`
**9/8 Complex**: `qd 8 8 8 qd`, `q 8 q 8 qd`

---

## REST USAGE RULES (8-MEASURE EXAMPLES ONLY)

### ⚠️ CRITICAL REST PLACEMENT RULE ⚠️
**Rests must be placed so they do NOT make the correct answer obvious!**

### Rest Guidelines:
- **Only quarter rests allowed** in 8-measure examples
- **No rests in 2-measure or 4-measure examples** (Easy level only)
- **Rests must be in same or adjacent positions** across all 6 options
- **Maximum 1 beat difference** in rest placement between options

### Examples of CORRECT Rest Usage:

**Good Example** - Rests in similar positions:
```
Option 0: M3: C(q) REST(qr) E(q) F(q)
Option 1: M3: C(q) D(qr) E(q) F(q)     // Rest 1 beat later - SUBTLE
Option 2: M3: REST(qr) D(q) E(q) F(q)  // Rest 1 beat earlier - SUBTLE
Option 3: M3: C(q) REST(qr) F(q) G(q)  // Same rest position, different notes
```

### Examples of BAD Rest Usage:

❌ **Too Obvious** - Rests in completely different measures:
```
Option 0: M1: REST(qr) D(q) E(q) F(q)
Option 1: M5: C(q) D(q) REST(qr) F(q)  // TOO DIFFERENT - makes answer obvious
```

❌ **Inconsistent** - Some options with rests, others without:
```
Option 0: C(q) D(q) E(q) F(q)           // No rest
Option 1: C(q) REST(qr) E(q) F(q)       // Has rest - makes it obvious
```

---

## TONALITY REQUIREMENTS

### C Major:
- **Allowed notes**: C, D, E, F, G, A, B (any octave)
- **No accidentals** permitted
- **Cadences**: End phrases on C (tonic)

### A Minor:
- **Natural minor**: A, B, C, D, E, F, G
- **Harmonic minor**: A, B, C, D, E, F, G# (raised 7th)
- **Melodic minor**: A, B, C, D, E, F#, G# (ascending only, use sparingly)
- **Cadences**: End phrases on A (tonic)

---

## SUBMISSION FORMAT

Submit your questions as a JavaScript array in this EXACT format:

```javascript
// QUESTION SET [START_NUMBER] to [END_NUMBER] ([TIME_SIG] [MEASURES] [KEY] [COMPLEXITY])
const questionSet_[ASSIGNMENT_ID] = [
    // QUESTION SET [NUMBER]
    [
        // Option 0: CORRECT ANSWER - [description]
        {
            timeSignature: '[TIME_SIG]',
            clef: '[CLEF]',
            measure1: [
                { keys: ['note/octave'], duration: 'duration' },
                // ... more notes
            ],
            measure2: [
                // ... notes
            ]
            // ... more measures if applicable
        },
        // Option 1: [description of single change]
        {
            // ... similar structure with ONE small change
        },
        // ... Options 2-5 with ONE small change each
    ], // End of Question Set [NUMBER]
    
    // ... 9 more question sets
]; // End of Question Sets [START_NUMBER] to [END_NUMBER]
```

---

## QUALITY CHECKLIST

Before submitting, verify:

### Structure:
- ✅ Exactly 10 question sets
- ✅ Exactly 6 options per question set  
- ✅ Correct number of measures for each option
- ✅ Proper time signature and clef specified

### Validation:
- ✅ ALL beat counts are mathematically correct
- ✅ ALL notes are in the specified key
- ✅ ALL melodies follow Classical style rules
- ✅ ALL cadences are proper (8-measure only)

### Similarity:
- ✅ All 6 options are clearly related to each other
- ✅ Each option has only ONE small change
- ✅ No option stands out as obviously different
- ✅ All options are equally difficult to distinguish

### Musical Quality:
- ✅ Melodies sound like Mozart/Haydn/Beethoven
- ✅ Proper phrase structure and contour
- ✅ Appropriate melodic range
- ✅ Coherent musical logic

---

## FAILURE CONDITIONS

Your submission will be REJECTED if:

❌ **Any beat count errors** (zero tolerance)
❌ **Wrong number of questions/options** 
❌ **Notes outside specified key**
❌ **Non-Classical melodic style**
❌ **Options too different from each other**
❌ **Options too similar to distinguish**
❌ **Missing or incorrect cadences**
❌ **Validation scripts fail**

---

**Remember: The goal is creating 6 options so similar that students must listen very carefully to hear the tiny differences. This develops acute musical listening skills!**