// Wait for VexFlow to load
let VF;
if (typeof Vex !== 'undefined') {
    VF = Vex.Flow;
} else {
    console.error('VexFlow not loaded');
}

let selectedOption = null;
let correctAnswer = 0; // Index of correct answer in current shuffled order
let currentQuestionSet = 0; // Which question set we're using (0-9 for questions 1-10)
let currentCorrectOption = 0; // Which option from the set is correct (0-5)  
let shuffledOptions = []; // Current randomized order of options
let usedQuestionSets = []; // Track which question sets have been used

// Auto-repeat settings
let autoRepeatCount = 2; // Default to 2x
let currentPlayCount = 0;
let isAutoPlaying = false;
let playbackSpeed = 1.0; // Default normal speed (1.0x)

// Define all 10 question sets (each with 6 very similar options)
const allQuestionSets = [
    // QUESTION SET 1 (Treble Clef) - C major challenging melodic dictation (same rhythm, subtle pitch changes)
    [
    // Option 0: CORRECT ANSWER - C half note, D quarter E quarter | F quarter G quarter E half note  
    {
        measure1: [
            { keys: ['c/4'], duration: 'h' },  // 2 beats
            { keys: ['d/4'], duration: 'q' },  // 1 beat
            { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
        ],
        measure2: [
            { keys: ['f/4'], duration: 'q' },  // 1 beat
            { keys: ['g/4'], duration: 'q' },  // 1 beat
            { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
        ]
    },
    // Option 1: Note change + subtle rhythm change - C quarter D quarter E quarter | F quarter G quarter E half (half becomes quarter+quarter)
    {
        measure1: [
            { keys: ['c/4'], duration: 'q' },  // 1 beat (half becomes quarter)
            { keys: ['d/4'], duration: 'q' },  // 1 beat (new quarter note)
            { keys: ['e/4'], duration: 'q' },  // 1 beat (swapped with D)
            { keys: ['d/4'], duration: 'q' }   // 1 beat (swapped with E) = 4 total
        ],
        measure2: [
            { keys: ['f/4'], duration: 'q' },  // 1 beat
            { keys: ['g/4'], duration: 'q' },  // 1 beat
            { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
        ]
    },
    // Option 2: Note change + subtle rhythm change - C half note, D quarter F quarter | F eighth G eighth E dotted half (quarters become eighths+dotted half)
    {
        measure1: [
            { keys: ['c/4'], duration: 'h' },  // 2 beats
            { keys: ['d/4'], duration: 'q' },  // 1 beat
            { keys: ['f/4'], duration: 'q' }   // 1 beat (E becomes F, one step up) = 4 total
        ],
        measure2: [
            { keys: ['f/4'], duration: '8' },  // 0.5 beats (quarter becomes eighth)
            { keys: ['g/4'], duration: '8' },  // 0.5 beats (quarter becomes eighth)
            { keys: ['e/4'], duration: 'hd' }  // 3 beats (dotted half) = 4 total
        ]
    },
    // Option 3: One note change - C half note, D quarter E quarter | F quarter G quarter F half (E→F at end, one step up)
    {
        measure1: [
            { keys: ['c/4'], duration: 'h' },  // 2 beats
            { keys: ['d/4'], duration: 'q' },  // 1 beat
            { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
        ],
        measure2: [
            { keys: ['f/4'], duration: 'q' },  // 1 beat
            { keys: ['g/4'], duration: 'q' },  // 1 beat
            { keys: ['f/4'], duration: 'h' }   // 2 beats (E becomes F, one step up) = 4 total
        ]
    },
    // Option 4: One note change - C half note, D quarter E quarter | F quarter G quarter D half (E→D at end, one step down)
    {
        measure1: [
            { keys: ['c/4'], duration: 'h' },  // 2 beats
            { keys: ['d/4'], duration: 'q' },  // 1 beat
            { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
        ],
        measure2: [
            { keys: ['f/4'], duration: 'q' },  // 1 beat
            { keys: ['g/4'], duration: 'q' },  // 1 beat
            { keys: ['d/4'], duration: 'h' }   // 2 beats (E becomes D, one step down) = 4 total
        ]
    },
    // Option 5: Note change + subtle rhythm change - C quarter C quarter E half | F quarter G quarter E half (half becomes quarter+quarter, D→C)
    {
        measure1: [
            { keys: ['c/4'], duration: 'q' },  // 1 beat (half becomes quarter)
            { keys: ['c/4'], duration: 'q' },  // 1 beat (D becomes C, one step down)
            { keys: ['e/4'], duration: 'h' }   // 2 beats (quarter becomes half) = 4 total
        ],
        measure2: [
            { keys: ['f/4'], duration: 'q' },  // 1 beat
            { keys: ['g/4'], duration: 'q' },  // 1 beat
            { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
        ]
    }
    ], // End of Question Set 1
    
    // QUESTION SET 2 (Bass Clef) - C major melody using proper bass clef staff positions for C-D-E-F-G
    [
        // Option 0: CORRECT - C half D quarter E quarter | F quarter G quarter C half  
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats - C3 (second space)
                { keys: ['d/3'], duration: 'q' },  // 1 beat - D3 (third line)
                { keys: ['e/3'], duration: 'q' }   // 1 beat - E3 (third space) = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat - F3 (fourth line)
                { keys: ['g/3'], duration: 'q' },  // 1 beat - G3 (fourth space)
                { keys: ['c/3'], duration: 'h' }   // 2 beats - ends on C3 = 4 total
            ]
        },
        // Option 1: C quarter D quarter E quarter F quarter | G quarter F quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: C half D quarter F quarter | G quarter F quarter C half (E becomes F)
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat (E becomes F)
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: C quarter D quarter E half | F quarter G quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: C half D quarter E quarter | F quarter G quarter D half (ending change)
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'h' }   // 2 beats (C becomes D)
            ]
        },
        // Option 5: C half D half | F quarter G quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 2

    // QUESTION SET 3 (Treble Clef) - Clear C major tonality starting and ending on C
    [
        // Option 0: CORRECT - C quarter D quarter E half | F quarter G quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat - start on C
                { keys: ['d/4'], duration: 'q' },  // 1 beat  
                { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats - end on C = 4 total
            ]
        },
        // Option 1: Note change + subtle rhythm change - C eighth D eighth E eighth E eighth F quarter | F quarter G quarter C half (quarters become eighths)
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },  // 0.5 beats (quarter becomes eighth)
                { keys: ['d/4'], duration: '8' },  // 0.5 beats (quarter becomes eighth)
                { keys: ['e/4'], duration: '8' },  // 0.5 beats (half becomes eighth)
                { keys: ['e/4'], duration: '8' },  // 0.5 beats (new eighth)
                { keys: ['f/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: Note change + subtle rhythm change - C quarter D quarter F half | F eighth G eighth C dotted half (quarters become eighths+dotted half)
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat  
                { keys: ['f/4'], duration: 'h' }   // 2 beats (E becomes F) = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },  // 0.5 beats (quarter becomes eighth)
                { keys: ['g/4'], duration: '8' },  // 0.5 beats (quarter becomes eighth)
                { keys: ['c/4'], duration: 'hd' }  // 3 beats (dotted half) = 4 total
            ]
        },
        // Option 3: Swap F and G - C quarter D quarter E half | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat  
                { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat (swapped with F)
                { keys: ['f/4'], duration: 'q' },  // 1 beat (swapped with G)
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: Change G to A - C quarter D quarter E half | F quarter A quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat  
                { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' },  // 1 beat (G becomes A)
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: Note change + subtle rhythm change - C half E half | F quarter G quarter D half (quarter+quarter+half becomes half+half)
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats (quarter becomes half)
                { keys: ['e/4'], duration: 'h' }   // 2 beats (quarter+half becomes half) = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'h' }   // 2 beats (C becomes D) = 4 total
            ]
        }
    ], // End of Question Set 3

    // QUESTION SET 4 (Bass Clef) - C major melody using proper bass clef staff positions
    [
        // Option 0: CORRECT - G quarter F quarter E quarter C quarter | D quarter C quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat - G in fourth space
                { keys: ['f/3'], duration: 'q' },  // 1 beat - F on fourth line
                { keys: ['e/3'], duration: 'q' },  // 1 beat - E in third space 
                { keys: ['c/3'], duration: 'q' }   // 1 beat - C in second space = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat - D on third line
                { keys: ['c/3'], duration: 'q' },  // 1 beat - C in second space
                { keys: ['g/3'], duration: 'h' }   // 2 beats - ends on G = 4 total
            ]
        },
        // Option 1: G quarter F quarter C quarter D quarter | C quarter D quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: G half F quarter C quarter | D quarter C quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: G quarter F quarter C half | D quarter C quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: G quarter F quarter C quarter D quarter | C quarter D quarter F half (ending change)
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: G quarter F quarter C quarter D quarter | E quarter C quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 4

    // QUESTION SET 5 (Treble Clef) - C major melody - CHALLENGING: Same rhythm, subtle pitch changes only
    [
        // Option 0: CORRECT ANSWER - C quarter D quarter E quarter F quarter | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: Note change + subtle rhythm change - C half D quarter F quarter | G quarter E quarter C half (quarter+quarter becomes half+quarter)
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats (quarter becomes half)
                { keys: ['d/4'], duration: 'q' },  // 1 beat (quarter removed)
                { keys: ['f/4'], duration: 'q' }   // 1 beat (E becomes F, quarter removed) = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat (F becomes E)
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: C quarter D quarter F quarter E quarter | G quarter F quarter C half (E/F swap in measure 1)
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat (E becomes F)
                { keys: ['e/4'], duration: 'q' }   // 1 beat (F becomes E) = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: Note change + subtle rhythm change - C quarter E eighth D eighth F quarter | G eighth F eighth C half (some quarters become eighths)
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: '8' },  // 0.5 beats (D becomes E, quarter becomes eighth)
                { keys: ['d/4'], duration: '8' },  // 0.5 beats (E becomes D, quarter becomes eighth)
                { keys: ['f/4'], duration: 'h' }   // 2 beats (quarter becomes half) = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: '8' },  // 0.5 beats (quarter becomes eighth)
                { keys: ['f/4'], duration: '8' },  // 0.5 beats (quarter becomes eighth)
                { keys: ['c/4'], duration: 'hd' }  // 3 beats (half becomes dotted half) = 4 total
            ]
        },
        // Option 4: C quarter D quarter E quarter F quarter | G quarter F quarter D half (C becomes D - step up)
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'h' }   // 2 beats (C becomes D) = 4 total
            ]
        },
        // Option 5: Note change + subtle rhythm change - C quarter D quarter E quarter G quarter | F eighth E eighth C dotted half (quarters become eighths+dotted half)
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' }   // 1 beat (F becomes G) = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },  // 0.5 beats (G becomes F, quarter becomes eighth)
                { keys: ['e/4'], duration: '8' },  // 0.5 beats (F becomes E, quarter becomes eighth)
                { keys: ['c/4'], duration: 'hd' }  // 3 beats (half becomes dotted half) = 4 total
            ]
        }
    ], // End of Question Set 5

    // QUESTION SET 6 (Bass Clef) - C major melody
    [
        // Option 0: CORRECT - C quarter D quarter E quarter G quarter | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: C quarter E quarter D quarter G quarter | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: C half E quarter G quarter | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: C quarter D quarter E quarter G quarter | E quarter F quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: C quarter D quarter E quarter G quarter | F quarter E quarter D half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: C quarter D quarter F quarter G quarter | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 6

    // QUESTION SET 7 (Treble Clef) - C major melody
    [
        // Option 0: CORRECT - C quarter E quarter G quarter F quarter | E quarter D quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: C quarter G quarter E quarter F quarter | E quarter D quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: C quarter E quarter G quarter F quarter | D quarter E quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: C half G quarter F quarter | E quarter D quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: C quarter E quarter G quarter F quarter | E quarter D quarter E half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: C quarter E quarter F quarter G quarter | E quarter D quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 7

    // QUESTION SET 8 (Bass Clef) - C major melody
    [
        // Option 0: CORRECT - G quarter F quarter E quarter D quarter | C quarter D quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: G quarter E quarter F quarter D quarter | C quarter D quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: G half E quarter D quarter | C quarter D quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: G quarter F quarter E quarter D quarter | D quarter C quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: G quarter F quarter E quarter D quarter | C quarter D quarter F half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: G quarter F quarter D quarter E quarter | C quarter D quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 8

    // QUESTION SET 9 (Treble Clef) - C major melody
    [
        // Option 0: CORRECT - G quarter E quarter D quarter C quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: G quarter D quarter E quarter C quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: G quarter E quarter D quarter C quarter | F quarter E quarter C half
        {
            measure1: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: G half D quarter C quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['g/4'], duration: 'h' },  // 2 beats
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: G quarter E quarter D quarter C quarter | E quarter F quarter D half
        {
            measure1: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: G quarter E quarter C quarter D quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 9

    // QUESTION SET 10 (Bass Clef) - C major melody
    [
        // Option 0: CORRECT - C half D quarter E quarter | F quarter G quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: C quarter D quarter E quarter F quarter | G quarter F quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: C half E quarter D quarter | F quarter G quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: C quarter D quarter E half | F quarter G quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: C half D quarter E quarter | G quarter F quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: C half D quarter E quarter | F quarter G quarter D half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 10

    // QUESTION SET 11 (Treble Clef) - C major with dotted rhythms and eighth notes
    [
        // Option 0: CORRECT - C dotted quarter D eighth E quarter F quarter | G eighth G eighth F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 1.5 beats - dotted quarter
                { keys: ['d/4'], duration: '8' },   // 0.5 beats - eighth
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C dotted quarter D eighth F quarter E quarter | G eighth G eighth F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' },   // 1 beat (E/F swap)
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C dotted quarter D eighth E quarter F quarter | F eighth G eighth G quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C quarter D eighth D eighth E quarter F quarter | G eighth G eighth F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C dotted quarter D eighth E quarter F quarter | G eighth G eighth F quarter D half
        {
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C dotted quarter E eighth D quarter F quarter | G eighth G eighth F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 11

    // QUESTION SET 12 (Bass Clef) - C major with dotted quarters and eighth notes
    [
        // Option 0: CORRECT - C dotted quarter D eighth E quarter F quarter | G quarter F quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C dotted quarter D eighth F quarter E quarter | G quarter F quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C quarter D eighth D eighth E quarter F quarter | G quarter F quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C dotted quarter D eighth E quarter F quarter | F quarter G quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C dotted quarter D eighth E quarter F quarter | G quarter F quarter D half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C dotted quarter E eighth D quarter F quarter | G quarter F quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 12

    // QUESTION SET 13 (Treble Clef) - C major with two eighth notes patterns
    [
        // Option 0: CORRECT - C quarter D eighth E eighth F half | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'h' }    // 2 beats = 4 beats total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C quarter E eighth D eighth F half | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 0.5 beats (D becomes E)
                { keys: ['d/4'], duration: '8' },   // 0.5 beats (E becomes D) - subtle swap
                { keys: ['f/4'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Note change + subtle rhythm change - C quarter D eighth E eighth E half | G eighth F eighth C dotted half (quarters become eighths+dotted half)
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'h' }    // 2 beats = 4 total (F becomes E - step down)
            ],
            measure2: [
                { keys: ['g/4'], duration: '8' },   // 0.5 beats (quarter becomes eighth)
                { keys: ['f/4'], duration: '8' },   // 0.5 beats (quarter becomes eighth)
                { keys: ['c/4'], duration: 'hd' }   // 3 beats (half becomes dotted half) = 4 total
            ]
        },
        // Option 3: C quarter D eighth F eighth F half | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats (E becomes F - step up)
                { keys: ['f/4'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Note change + subtle rhythm change - C half D eighth E eighth | G quarter E quarter C half (quarter becomes half, quarter removed)
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },   // 2 beats (quarter becomes half)
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat (F becomes E - step down)
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: Note change + subtle rhythm change - C quarter D quarter F half | F quarter F quarter C half (eighths become quarter+half)
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['f/4'], duration: 'h' }    // 2 beats (eighth+quarter becomes half, E becomes F) = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat (G becomes F - step down)
                { keys: ['f/4'], duration: 'q' },   // 1 beat (F stays F)
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 13

    // QUESTION SET 14 (Bass Clef) - C major with four eighth notes patterns
    [
        // Option 0: CORRECT - C eighth D eighth E eighth F eighth G half | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C eighth E eighth D eighth F eighth G half | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C eighth D eighth E eighth F eighth F half | G quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C eighth D eighth E eighth F eighth G half | F quarter D quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C quarter D eighth E eighth F eighth G eighth | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C eighth D eighth F eighth E eighth G half | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 14

    // QUESTION SET 15 (Treble Clef) - C major with mixed advanced rhythms
    [
        // Option 0: CORRECT - C dotted quarter D eighth E quarter F quarter | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C dotted quarter D eighth F quarter E quarter | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C quarter D eighth E eighth F quarter G quarter | F quarter E quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C dotted quarter D eighth E quarter F quarter | F quarter G quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C dotted quarter D eighth E quarter F quarter | G quarter F quarter D half
        {
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C dotted quarter E eighth D quarter F quarter | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 15

    // QUESTION SET 16 (Bass Clef) - C major with dotted quarters and two eighths
    [
        // Option 0: CORRECT - C quarter D eighth E eighth F dotted quarter G eighth | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['g/3'], duration: '8' }    // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C quarter E eighth D eighth F dotted quarter G eighth | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['g/3'], duration: '8' }    // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C quarter D eighth E eighth G dotted quarter F eighth | E quarter F quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['f/3'], duration: '8' }    // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C quarter D eighth E eighth F dotted quarter G eighth | G quarter F quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['g/3'], duration: '8' }    // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C quarter D eighth E eighth F dotted quarter G eighth | F quarter E quarter D half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['g/3'], duration: '8' }    // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C dotted quarter D eighth E eighth F eighth G quarter | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 16

    // QUESTION SET 17 (Treble Clef) - C major with complex eighth note patterns
    [
        // Option 0: CORRECT - C eighth D eighth E quarter F eighth G eighth | F quarter E quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C eighth E eighth D quarter F eighth G eighth F quarter | F quarter E quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C eighth D eighth E quarter G eighth F eighth F quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C eighth D eighth F quarter E eighth G eighth E quarter | F quarter E quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C eighth D eighth E quarter F eighth G eighth | F quarter E quarter D half
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C quarter D eighth E eighth F eighth G eighth F quarter | F quarter E quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 17

    // QUESTION SET 18 (Bass Clef) - C major with advanced rhythmic combinations
    [
        // Option 0: CORRECT - C dotted quarter D eighth E eighth F eighth G quarter | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C dotted quarter D eighth F eighth E eighth G quarter | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C quarter D eighth E eighth F eighth F eighth G quarter | E quarter F quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 beats total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 beats total
            ]
        },
        // Option 3: C dotted quarter D eighth E eighth F eighth F quarter | G quarter F quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C dotted quarter D eighth E eighth F eighth G quarter | F quarter E quarter D half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C dotted quarter E eighth D eighth F eighth G quarter | F quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 18

    // QUESTION SET 19 (Treble Clef) - C major with challenging melodic dictation (SIMILAR CONTOUR)
    [
        // Option 0: CORRECT - C eighth D eighth E eighth F eighth G eighth F eighth E quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Single note change - C eighth D eighth E eighth F eighth G eighth F eighth E quarter | D quarter F quarter C half (E→D in measure 2)
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/4'], duration: 'q' },   // 1 beat (E becomes D - step down)
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Note change + subtle rhythm change - C eighth D eighth E eighth F eighth G eighth F eighth E quarter | E eighth F eighth E eighth C dotted half (quarters become complex rhythm)
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: '8' },   // 0.5 beats (quarter becomes eighth)
                { keys: ['f/4'], duration: '8' },   // 0.5 beats (E becomes F, quarter becomes eighth)
                { keys: ['e/4'], duration: 'qd' },  // 1.5 beats (dotted quarter)
                { keys: ['c/4'], duration: 'qd' }   // 1.5 beats (dotted quarter) = 4 total
            ]
        },
        // Option 3: Adjacent swap in measure 1 - C eighth D eighth E eighth F eighth G eighth E eighth F quarter | E quarter F quarter C half (swap F-E to E-F)
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats (F becomes E)
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total (E becomes F)
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Note change + subtle rhythm change - C eighth D eighth F eighth E eighth G quarter F quarter | E quarter F quarter C half (some eighths become quarters)
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats (E becomes F)
                { keys: ['e/4'], duration: '8' },   // 0.5 beats (F becomes E)
                { keys: ['g/4'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['f/4'], duration: 'q' }    // 1 beat (eighth becomes quarter) = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: Note change + subtle rhythm change - C quarter D quarter E eighth F eighth G eighth F eighth | E quarter F quarter D half (first eighths become quarters)
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['d/4'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' }    // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'h' }    // 2 beats = 4 total (C becomes D - step up)
            ]
        }
    ], // End of Question Set 19

    // QUESTION SET 20 (Bass Clef) - C major with most complex rhythmic patterns
    [
        // Option 0: CORRECT - C eighth D eighth E dotted quarter F eighth G eighth | F eighth E eighth C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' }    // 1 beat = 4 beats total
            ]
        },
        // Option 1: C eighth E eighth D dotted quarter F eighth G eighth | F eighth E eighth C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' }    // 1 beat = 4 beats total
            ]
        },
        // Option 2: C eighth D eighth E dotted quarter G eighth F quarter | E eighth F eighth G quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: 'h' },   // 2 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: C eighth D eighth F dotted quarter E eighth G eighth | F eighth E eighth C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' }    // 1 beat = 4 beats total
            ]
        },
        // Option 4: C eighth D eighth E dotted quarter F eighth G eighth | F eighth E eighth D half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: 'h' },   // 2 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: C dotted quarter D eighth E eighth F eighth G eighth | F eighth E eighth C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' }    // 1 beat = 4 beats total
            ]
        }
    ], // End of Question Set 20

    // QUESTION SET 21 (Treble Clef) - A minor melody (EASY: G#4-A4-B4-C5-D5-E5 ONLY)
    [
        // Option 0: CORRECT - A quarter B quarter C half | D quarter E quarter A half
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: G# quarter B quarter C half | D quarter E quarter A half (A→G# subtle change)
        {
            measure1: [
                { keys: ['g#/4'], duration: 'q' }, // 1 beat (A becomes G#)
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: A quarter C quarter C half | D quarter E quarter A half (B→C subtle step change)
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat (B becomes C)
                { keys: ['c/5'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: A quarter B quarter C half | D quarter D quarter A half (E→D subtle change)
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat (E becomes D)
                { keys: ['a/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: A quarter B quarter C half | D quarter E quarter B half (A→B subtle ending change)
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'h' }   // 2 beats (A becomes B) = 4 total
            ]
        },
        // Option 5: A quarter B quarter B half | D quarter E quarter A half (C→B subtle change)
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'h' }   // 2 beats (C becomes B) = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 21

    // QUESTION SET 22 (Bass Clef) - A minor melody (EASY: G#2-A2-B2-C3-D3-E3 ONLY)  
    [
        // Option 0: CORRECT - A quarter B quarter C half | D quarter E quarter A half
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: A quarter C quarter B half | D quarter E quarter A half (B/C swap in measure 1)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat (B becomes C)
                { keys: ['b/2'], duration: 'h' }   // 2 beats (C becomes B) = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: A quarter B quarter D half | D quarter E quarter A half (C becomes D in measure 1)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'h' }   // 2 beats (C becomes D) = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: A quarter B quarter C quarter D quarter | E quarter D quarter A half (rhythm change in measure 1)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat (half becomes quarter)
                { keys: ['d/3'], duration: 'q' }   // 1 beat (moves from measure 2) = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat (E becomes D)
                { keys: ['a/2'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: A quarter B quarter C half | D quarter E quarter B half (ending A becomes B)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'h' }   // 2 beats (A becomes B) = 4 total
            ]
        },
        // Option 5: A quarter B quarter C half | E quarter D quarter A half (D/E swap in measure 2)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat (D becomes E)
                { keys: ['d/3'], duration: 'q' },  // 1 beat (E becomes D)
                { keys: ['a/2'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 22

    // QUESTION SET 23 (Treble Clef) - A minor melody (EASY: G#4-A4-B4-C5-D5-E5 ONLY)
    [
        // Option 0: CORRECT ANSWER - A quarter B quarter C quarter D quarter | E quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 1: Different rhythm - A quarter B quarter C half | E quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'h' }   // 2 beats = 4 total (rhythm change)
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 2: Single note change - A quarter B quarter C quarter D quarter | E quarter D quarter B quarter A quarter (C becomes B)
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat (C becomes B - step down)
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 3: Different rhythm - A quarter B quarter C quarter D quarter | E quarter D quarter C half (A becomes C half)
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'h' }   // 2 beats = 4 total (rhythm change)
            ]
        },
        // Option 4: Single note change - A quarter C quarter B quarter D quarter | E quarter D quarter C quarter A quarter (B/C swap)
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat (B becomes C)
                { keys: ['b/4'], duration: 'q' },  // 1 beat (C becomes B) 
                { keys: ['d/5'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 5: Different rhythm - A half B quarter C quarter | E quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'h' },  // 2 beats (rhythm change)
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        }
    ], // End of Question Set 23

    // QUESTION SET 24 (Bass Clef) - A minor melody (EASY: G#2-A2-B2-C3-D3-E3 ONLY)
    [
        // Option 0: CORRECT ANSWER - A quarter B quarter C quarter D quarter | E quarter D quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 1: One note change - A quarter B quarter C quarter D quarter | E quarter D quarter B quarter A quarter (C becomes B)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat (C becomes B)
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 2: One note change - A quarter B quarter D quarter D quarter | E quarter D quarter C quarter A quarter (C becomes D)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat (C becomes D)
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 3: One note change - A quarter B quarter C quarter D quarter | E quarter C quarter C quarter A quarter (D becomes C)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat (D becomes C)
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 4: One note change - A quarter B quarter C quarter D quarter | E quarter D quarter C quarter B quarter (ending A becomes B)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' }   // 1 beat (A becomes B)
            ]
        },
        // Option 5: Adjacent notes swapped - A quarter B quarter C quarter D quarter | E quarter D quarter A quarter C quarter (C and A swapped)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' },  // 1 beat (swapped with next note)
                { keys: ['c/3'], duration: 'q' }   // 1 beat (swapped with previous note)
            ]
        }
    ], // End of Question Set 24

    // QUESTION SET 25 (Treble Clef) - A minor melody (EASY: G#4-A4-B4-C5-D5-E5 ONLY)
    [
        // Option 0: CORRECT - A half C quarter D quarter | E quarter B quarter A half
        {
            measure1: [
                { keys: ['a/4'], duration: 'h' },  // 2 beats
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: A half D quarter C quarter | E quarter B quarter A half (C/D swap - extremely subtle)
        {
            measure1: [
                { keys: ['a/4'], duration: 'h' },  // 2 beats
                { keys: ['d/5'], duration: 'q' },  // 1 beat (swapped)
                { keys: ['c/5'], duration: 'q' }   // 1 beat (swapped) = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: A half C quarter D quarter | E quarter C quarter A half (B→C change - one step)
        {
            measure1: [
                { keys: ['a/4'], duration: 'h' },  // 2 beats
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat (B→C, one step up)
                { keys: ['a/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: A half C quarter E quarter | D quarter B quarter A half (D→E change - one step)
        {
            measure1: [
                { keys: ['a/4'], duration: 'h' },  // 2 beats
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['e/5'], duration: 'q' }   // 1 beat (D→E, one step up) = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },  // 1 beat (E→D, moved down)
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: A quarter C quarter D half | E quarter B quarter A half (rhythm change - subtle)
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat (half→quarter)
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'h' }   // 2 beats (quarter→half) = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: A half C quarter D quarter | E quarter B quarter B half (A→B ending change - one step)
        {
            measure1: [
                { keys: ['a/4'], duration: 'h' },  // 2 beats
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'h' }   // 2 beats (A→B, one step up) = 4 total
            ]
        }
    ], // End of Question Set 25

    // QUESTION SET 26 (Bass Clef) - A minor melody (EASY: G#2-A2-B2-C3-D3-E3 ONLY)
    [
        // Option 0: CORRECT - A half C quarter D quarter | E quarter B quarter A half
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'h' },  // 2 beats
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: A half C quarter E quarter | E quarter B quarter A half (D becomes E)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'h' },  // 2 beats
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat (D→E, one step up)
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: A half B quarter D quarter | E quarter B quarter A half (C becomes B)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'h' },  // 2 beats
                { keys: ['b/2'], duration: 'q' },  // 1 beat (C→B, one step down)
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: A half C quarter D quarter | E quarter C quarter A half (B becomes C)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'h' },  // 2 beats
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat (B→C, one step up)
                { keys: ['a/2'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: A half C quarter D quarter | D quarter B quarter A half (E becomes D)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'h' },  // 2 beats
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat (E→D, one step down)
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: A quarter B quarter C quarter D quarter | E quarter B quarter A half (rhythm change)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat (rhythm change from half)
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 26

    // QUESTION SET 27 (Treble Clef) - A minor basic rhythms (EASY: G#4-A4-B4-C5-D5-E5 ONLY)
    [
        // Option 0: CORRECT ANSWER - A quarter B quarter A quarter B quarter | C quarter D quarter E quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 1: Swap first two notes - B quarter A quarter A quarter B quarter | C quarter D quarter E quarter A quarter
        {
            measure1: [
                { keys: ['b/4'], duration: 'q' },  // 1 beat (was A)
                { keys: ['a/4'], duration: 'q' },  // 1 beat (was B)
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 2: Change ending note - A quarter B quarter A quarter B quarter | C quarter D quarter E quarter B quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' }   // 1 beat = 4 total (A becomes B)
            ]
        },
        // Option 3: Change one note by step - A quarter B quarter A quarter B quarter | C quarter E quarter D quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['e/5'], duration: 'q' },  // 1 beat (D becomes E)
                { keys: ['d/5'], duration: 'q' },  // 1 beat (E becomes D - swap)
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 4: Rhythm change - A half A quarter B quarter | C quarter D quarter E quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'h' },  // 2 beats (A quarter B quarter becomes A half)
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 5: Change first measure ending - A quarter B quarter A quarter C quarter | C quarter D quarter E quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' }   // 1 beat = 4 total (B becomes C)
            ],
            measure2: [
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        }
    ], // End of Question Set 27

    // QUESTION SET 28 (Bass Clef) - A minor basic rhythms (EASY: G#2-A2-B2-C3-D3-E3 ONLY)
    [
        // Option 0: CORRECT ANSWER - A quarter B quarter A quarter B quarter | C quarter D quarter E quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 1: One note different - A quarter B quarter A quarter B quarter | C quarter D quarter E quarter B quarter (ending B instead of A)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat 
                { keys: ['b/2'], duration: 'q' },  // 1 beat 
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' }   // 1 beat = 4 total (A becomes B)
            ]
        },
        // Option 2: Swap two notes - A quarter B quarter B quarter A quarter | C quarter D quarter E quarter A quarter (swapped 3rd and 4th notes in measure 1)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat (A becomes B)
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total (B becomes A)
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 3: One step different - A quarter B quarter A quarter B quarter | C quarter E quarter D quarter A quarter (D and E swapped)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat (D becomes E)
                { keys: ['d/3'], duration: 'q' },  // 1 beat (E becomes D)
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 4: One note higher - A quarter B quarter A quarter B quarter | C quarter D quarter E quarter C quarter (ending C instead of A)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total (A becomes C)
            ]
        },
        // Option 5: Different rhythm - A quarter B quarter A half | C quarter D quarter E quarter A quarter (3rd and 4th notes combined into half note)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }   // 2 beats = 4 total (A quarter B quarter becomes A half)
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        }
    ], // End of Question Set 28

    // QUESTION SET 29 (Treble Clef) - A minor basic rhythms (EASY: G#4-A4-B4-C5-D5-E5 ONLY)
    [
        // Option 0: CORRECT ANSWER - E quarter D quarter C quarter B quarter | A quarter B quarter C quarter A quarter
        {
            measure1: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 1: One note changed - E quarter D quarter B quarter B quarter | A quarter B quarter C quarter A quarter (C becomes B)
        {
            measure1: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat (C becomes B)
                { keys: ['b/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 2: One note changed - E quarter D quarter C quarter A quarter | A quarter B quarter C quarter A quarter (B becomes A)
        {
            measure1: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total (B becomes A)
            ],
            measure2: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 3: One note changed - E quarter D quarter C quarter B quarter | A quarter B quarter D quarter A quarter (C becomes D)
        {
            measure1: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat (C becomes D)
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 4: Two notes swapped - E quarter D quarter C quarter B quarter | B quarter A quarter C quarter A quarter (A-B swapped)
        {
            measure1: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['d/5'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['b/4'], duration: 'q' },  // 1 beat (A becomes B)
                { keys: ['a/4'], duration: 'q' },  // 1 beat (B becomes A)
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 5: One note changed - E quarter C quarter C quarter B quarter | A quarter B quarter C quarter A quarter (D becomes C)
        {
            measure1: [
                { keys: ['e/5'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat (D becomes C)
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'q' },  // 1 beat
                { keys: ['c/5'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }   // 1 beat = 4 total
            ]
        }
    ], // End of Question Set 29

    // QUESTION SET 30 (Bass Clef) - A minor basic rhythms (EASY: G#2-A2-B2-C3-D3-E3 ONLY)
    [
        // Option 0: CORRECT ANSWER - E quarter D quarter C quarter B quarter | A quarter B quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 1: Change C to D - E quarter D quarter D quarter B quarter | A quarter B quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat (C becomes D)
                { keys: ['b/2'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 2: Swap C and B - E quarter D quarter B quarter C quarter | A quarter B quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat (swapped with C)
                { keys: ['c/3'], duration: 'q' }   // 1 beat (swapped with B) = 4 total
            ],
            measure2: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 3: Change final A to B - E quarter D quarter C quarter B quarter | A quarter B quarter C quarter B quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' }   // 1 beat (A becomes B) = 4 total
            ]
        },
        // Option 4: Change D to E - E quarter E quarter C quarter B quarter | A quarter B quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat (D becomes E)
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        },
        // Option 5: Swap B and C in measure 2 - E quarter D quarter C quarter B quarter | A quarter C quarter B quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/2'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat (swapped with B)
                { keys: ['b/2'], duration: 'q' },  // 1 beat (swapped with C)
                { keys: ['a/2'], duration: 'q' }   // 1 beat = 4 total
            ]
        }
    ], // End of Question Set 30

    // QUESTION SET 31 (Treble Clef) - A minor with dotted rhythms and leading tone (G#4-A4-B4-C5-D5-E5 + G#5)
    [
        // Option 0: CORRECT - A dotted quarter B eighth C quarter D quarter | E quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Add G# leading tone in measure 2 - A dotted quarter B eighth C quarter D quarter | E quarter D quarter G# quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },  // 1 beat (leading tone)
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 2: Rhythm change - A quarter B quarter C quarter D quarter | E quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat (dotted quarter becomes quarter)
                { keys: ['b/4'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Note swap D→E in measure 1 - A dotted quarter B eighth C quarter E quarter | E quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' }    // 1 beat (D becomes E) = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Note swap E→D in measure 2 start - A dotted quarter B eighth C quarter D quarter | D quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat (E becomes D)
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Note swap B→C in measure 1 - A dotted quarter C eighth C quarter D quarter | E quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats (B becomes C)
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // QUESTION SET 32 (Bass Clef) - A minor with dotted rhythms and leading tone (G#2-A2-B2-C3-D3-E3 + G#3)
    [
        // Option 0: CORRECT - A dotted quarter B eighth C quarter D quarter | E quarter D quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Add G# leading tone in measure 2 - A dotted quarter B eighth C quarter D quarter | E quarter D quarter G# quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },  // 1 beat (leading tone)
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 2: Rhythm change - A quarter B quarter C quarter D quarter | E quarter D quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },   // 1 beat (dotted quarter becomes quarter)
                { keys: ['b/2'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Note swap D→E in measure 1 - A dotted quarter B eighth C quarter E quarter | E quarter D quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' }    // 1 beat (D becomes E) = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Note swap E→D in measure 2 start - A dotted quarter B eighth C quarter D quarter | D quarter D quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },   // 1 beat (E becomes D)
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Note swap B→C in measure 1 - A dotted quarter C eighth C quarter D quarter | E quarter D quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'qd' },  // 1.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats (B becomes C)
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // QUESTION SET 33 (Treble Clef) - A minor with eighth note patterns and leading tone (G#4-A4-B4-C5-D5-E5 + G#5)
    [
        // Option 0: CORRECT - A quarter B eighth C eighth D quarter | E quarter D quarter G# quarter A quarter (with leading tone)
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },  // 1 beat (leading tone)
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Remove leading tone - A quarter B eighth C eighth D quarter E quarter | E quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat (G# becomes C)
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 2: Rhythm change - A eighth B eighth C eighth D eighth E quarter | E quarter D quarter G# quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats (quarter becomes eighth)
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats (quarter becomes eighth)
                { keys: ['e/5'], duration: 'h' }    // 2 beats (quarter becomes half) = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Note swap C→D in measure 1 - A quarter B eighth D eighth D quarter E quarter | E quarter D quarter G# quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats (C becomes D)
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Note swap D→C in measure 2 - A quarter B eighth C eighth D quarter E quarter | E quarter C quarter G# quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat (D becomes C)
                { keys: ['g#/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Add extra E in measure 1 - A quarter B eighth C eighth D quarter E quarter | E quarter D quarter G# quarter A quarter  
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' },   // 1 beat (D becomes E)
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // QUESTION SET 34 (Bass Clef) - A minor with eighth note patterns and leading tone (G#2-A2-B2-C3-D3-E3 + G#3)
    [
        // Option 0: CORRECT - A quarter B eighth C eighth D quarter E quarter | E quarter D quarter G# quarter A quarter (with leading tone)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },   // 1 beat
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },  // 1 beat (leading tone)
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Remove leading tone - A quarter B eighth C eighth D quarter E quarter | E quarter D quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },   // 1 beat
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat (G# becomes C)
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 2: Rhythm change - A eighth B eighth C eighth D eighth E quarter | E quarter D quarter G# quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: '8' },   // 0.5 beats (quarter becomes eighth)
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats (quarter becomes eighth)
                { keys: ['e/3'], duration: 'h' }    // 2 beats (quarter becomes half) = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Note swap C→D in measure 1 - A quarter B eighth D eighth D quarter E quarter | E quarter D quarter G# quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },   // 1 beat
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats (C becomes D)
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Note swap D→C in measure 2 - A quarter B eighth C eighth D quarter E quarter | E quarter C quarter G# quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },   // 1 beat
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat (D becomes C)
                { keys: ['g#/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Add extra E in measure 1 - A quarter B eighth C eighth E quarter E quarter | E quarter D quarter G# quarter A quarter  
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },   // 1 beat
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat (D becomes E)
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // QUESTION SET 35 (Treble Clef) - A minor with complex rhythms and leading tone variations (G#4-A4-B4-C5-D5-E5 + G#5)
    [
        // Option 0: CORRECT - A eighth B eighth C dotted quarter D eighth | E quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Add leading tone - A eighth B eighth C dotted quarter D eighth E quarter | E quarter D quarter G# quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },  // 1 beat (C becomes G# - leading tone)
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 2: Rhythm change - A quarter B quarter C quarter D quarter | E quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['b/4'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['c/5'], duration: 'q' },   // 1 beat (dotted quarter becomes quarter)
                { keys: ['d/5'], duration: 'q' }    // 1 beat (eighth+quarter becomes quarter) = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Note swap C→B in measure 1 - A eighth B eighth B dotted quarter D eighth E quarter | E quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: 'qd' },  // 1.5 beats (C becomes B)
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Note swap D→E in measure 1 - A eighth B eighth C dotted quarter E eighth E quarter | E quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: 'qd' },  // 1.5 beats
                { keys: ['e/5'], duration: '8' },   // 0.5 beats (D becomes E)
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Note swap E→D in measure 2 - A eighth B eighth C dotted quarter D eighth E quarter | D quarter D quarter C quarter A quarter
        {
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat (E becomes D)
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // QUESTION SET 36 (Bass Clef) - A minor with complex rhythms and leading tone variations (G#2-A2-B2-C3-D3-E3 + G#3)
    [
        // Option 0: CORRECT - A eighth B eighth C dotted quarter D eighth E quarter | E quarter D quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Add leading tone - A eighth B eighth C dotted quarter D eighth E quarter | E quarter D quarter G# quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },  // 1 beat (C becomes G# - leading tone)
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 2: Rhythm change - A quarter B quarter C quarter D quarter | E quarter D quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['b/2'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['c/3'], duration: 'q' },   // 1 beat (dotted quarter becomes quarter)
                { keys: ['d/3'], duration: 'q' }    // 1 beat (eighth+quarter becomes quarter) = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Note swap C→B in measure 1 - A eighth B eighth B dotted quarter D eighth E quarter | E quarter D quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: 'qd' },  // 1.5 beats (C becomes B)
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Note swap D→E in measure 1 - A eighth B eighth C dotted quarter E eighth E quarter | E quarter D quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats (D becomes E)
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Note swap E→D in measure 2 - A eighth B eighth C dotted quarter D eighth E quarter | D quarter D quarter C quarter A quarter
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },   // 1 beat (E becomes D)
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // QUESTION SET 37 (Treble Clef) - A minor with advanced rhythmic patterns and leading tone (G#4-A4-B4-C5-D5-E5 + G#5)
    [
        // Option 0: CORRECT - A eighth B eighth C eighth D eighth E quarter | D quarter G# quarter A half (with leading tone)
        {
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },  // 1 beat (leading tone)
                { keys: ['a/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Remove leading tone - A eighth B eighth C eighth D eighth E quarter | D quarter C quarter A half
        {
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat (G# becomes C)
                { keys: ['a/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change - A quarter B quarter C half | D quarter G# quarter A half
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['b/4'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['c/5'], duration: 'h' }    // 2 beats (two eighths + half becomes half) = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: Note swap D→C in measure 1 - A eighth B eighth C eighth C eighth E half | D quarter G# quarter A half
        {
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats (D becomes C)
                { keys: ['e/5'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Note swap A→B in measure 2 ending - A eighth B eighth C eighth D eighth E half | D quarter G# quarter B half
        {
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },  // 1 beat
                { keys: ['b/4'], duration: 'h' }    // 2 beats (A becomes B) = 4 total
            ]
        },
        // Option 5: Note swap E→D in measure 1 - A eighth B eighth C eighth D eighth D half | D quarter G# quarter A half
        {
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: 'h' }    // 2 beats (E becomes D) = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ],

    // QUESTION SET 38 (Bass Clef) - A minor with advanced rhythmic patterns and leading tone (G#2-A2-B2-C3-D3-E3 + G#3)
    [
        // Option 0: CORRECT - A eighth B eighth C eighth D eighth E half | D quarter G# quarter A half (with leading tone)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },  // 1 beat (leading tone)
                { keys: ['a/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Remove leading tone - A eighth B eighth C eighth D eighth E half | D quarter C quarter A half
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' },   // 1 beat (G# becomes C)
                { keys: ['a/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change - A quarter B quarter C half | D quarter G# quarter A half
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['b/2'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['c/3'], duration: 'h' }    // 2 beats (two eighths + half becomes half) = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: Note swap D→C in measure 1 - A eighth B eighth C eighth C eighth E half | D quarter G# quarter A half
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats (D becomes C)
                { keys: ['e/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Note swap A→B in measure 2 ending - A eighth B eighth C eighth D eighth E half | D quarter G# quarter B half
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },  // 1 beat
                { keys: ['b/2'], duration: 'h' }    // 2 beats (A becomes B) = 4 total
            ]
        },
        // Option 5: Note swap E→D in measure 1 - A eighth B eighth C eighth D eighth D half | D quarter G# quarter A half
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: 'h' }    // 2 beats (E becomes D) = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ],

    // QUESTION SET 39 (Treble Clef) - A minor with most complex patterns and leading tone training (G#4-A4-B4-C5-D5-E5 + G#5)
    [
        // Option 0: CORRECT - A dotted quarter B eighth C eighth D eighth E quarter | D eighth C eighth G# quarter A half (with leading tone)
        {
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: 'q' },  // 1 beat (leading tone)
                { keys: ['a/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Remove leading tone - A dotted quarter B eighth C eighth D eighth E quarter | D eighth C eighth B quarter A half
        {
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: 'q' },   // 1 beat (G# becomes B)
                { keys: ['a/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change - A quarter B quarter C quarter E quarter | D eighth C eighth G# quarter A half
        {
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat (dotted quarter becomes quarter)
                { keys: ['b/4'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['c/5'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['e/5'], duration: 'q' }    // 1 beat (eighth+quarter becomes quarter) = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: Note swap C→B in measure 1 - A dotted quarter B eighth B eighth D eighth E quarter | D eighth C eighth G# quarter A half
        {
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats (C becomes B)
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Note swap D→E in measure 1 and 2 - A dotted quarter B eighth C eighth E eighth E quarter | E eighth C eighth G# quarter A half
        {
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: '8' },   // 0.5 beats (D becomes E)
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: '8' },   // 0.5 beats (D becomes E)
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: 'q' },  // 1 beat
                { keys: ['a/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: Note swap A→G# in ending - A dotted quarter B eighth C eighth D eighth E quarter | D eighth C eighth G# quarter G# half
        {
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: 'q' },  // 1 beat
                { keys: ['g#/4'], duration: 'h' }   // 2 beats (A becomes G#) = 4 total
            ]
        }
    ],

    // QUESTION SET 40 (Bass Clef) - A minor with most complex patterns and leading tone training (G#2-A2-B2-C3-D3-E3 + G#3)
    [
        // Option 0: CORRECT - A dotted quarter B eighth C eighth D eighth E quarter | D eighth C eighth G# quarter A half (with leading tone)
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/3'], duration: 'q' },  // 1 beat (leading tone)
                { keys: ['a/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Remove leading tone - A dotted quarter B eighth C eighth D eighth E quarter | D eighth C eighth B quarter A half
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: 'q' },   // 1 beat (G# becomes B)
                { keys: ['a/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change - A quarter B quarter C quarter E quarter | D eighth C eighth G# quarter A half
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'q' },   // 1 beat (dotted quarter becomes quarter)
                { keys: ['b/2'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['c/3'], duration: 'q' },   // 1 beat (eighth becomes quarter)
                { keys: ['e/3'], duration: 'q' }    // 1 beat (eighth+quarter becomes quarter) = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: Note swap C→B in measure 1 - A dotted quarter B eighth B eighth D eighth E quarter | D eighth C eighth G# quarter A half
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats (C becomes B)
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Note swap D→E in measure 1 and 2 - A dotted quarter B eighth C eighth E eighth E quarter | E eighth C eighth G# quarter A half
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats (D becomes E)
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: '8' },   // 0.5 beats (D becomes E)
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/3'], duration: 'q' },  // 1 beat
                { keys: ['a/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: Note swap A→G# in ending - A dotted quarter B eighth C eighth D eighth E quarter | D eighth C eighth G# quarter G# half
        {
            clef: 'bass',
            measure1: [
                { keys: ['a/2'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/2'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/3'], duration: 'q' },  // 1 beat
                { keys: ['g#/3'], duration: 'h' }   // 2 beats (A becomes G#) = 4 total
            ]
        }
    ], // End of Question Set 40

    // QUESTION SET 41 (Treble Clef) - C major 4-measure melodic dictation (basic rhythms from Q1-10)
    [
        // Option 0: CORRECT ANSWER - C half D quarter E quarter | F quarter G quarter E quarter F quarter | G half F quarter E quarter | D quarter C quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/4'], duration: 'h' },  // 2 beats
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: Rhythm change in measure 1 - C quarter D quarter E half | F quarter G quarter E quarter F quarter | G half F quarter E quarter | D quarter C quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat (half becomes quarter)
                { keys: ['d/4'], duration: 'q' },  // 1 beat (new quarter)
                { keys: ['e/4'], duration: 'h' }   // 2 beats (quarter becomes half) = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/4'], duration: 'h' },  // 2 beats
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: Note change in measure 2 - C half D quarter E quarter | F quarter G quarter F quarter E quarter | G half F quarter E quarter | D quarter C quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat (E becomes F - step up)
                { keys: ['e/4'], duration: 'q' }   // 1 beat (F becomes E - step down) = 4 total
            ],
            measure3: [
                { keys: ['g/4'], duration: 'h' },  // 2 beats
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: Note change in measure 3 - C half D quarter E quarter | F quarter G quarter E quarter F quarter | G half E quarter F quarter | D quarter C quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/4'], duration: 'h' },  // 2 beats
                { keys: ['e/4'], duration: 'q' },  // 1 beat (F becomes E - step down)
                { keys: ['f/4'], duration: 'q' }   // 1 beat (E becomes F - step up) = 4 total
            ],
            measure4: [
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: Note change in measure 4 - C half D quarter E quarter | F quarter G quarter E quarter F quarter | G half F quarter E quarter | D quarter C quarter D half
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/4'], duration: 'h' },  // 2 beats
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'h' }   // 2 beats (C becomes D - step up) = 4 total
            ]
        },
        // Option 5: Rhythm change in measure 4 - C half D quarter E quarter | F quarter G quarter E quarter F quarter | G half F quarter E quarter | D half C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/4'], duration: 'h' },  // 2 beats
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/4'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['c/4'], duration: 'h' }   // 2 beats (quarter+half becomes half) = 4 total
            ]
        }
    ], // End of Question Set 41

    // QUESTION SET 42 (Bass Clef) - C major 4-measure melodic dictation (basic rhythms from Q1-10)
    [
        // Option 0: CORRECT ANSWER - C half D quarter E quarter | F quarter G quarter E quarter D quarter | C quarter D quarter E half | F quarter G quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: Note change in measure 2 - C half D quarter E quarter | F quarter G quarter D quarter E quarter | C quarter D quarter E half | F quarter G quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat (E becomes D - step down)
                { keys: ['e/3'], duration: 'q' }   // 1 beat (D becomes E - step up) = 4 total
            ],
            measure3: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change in measure 1 - C quarter D quarter E half | F quarter G quarter E quarter D quarter | C quarter D quarter E half | F quarter G quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat (half becomes quarter)
                { keys: ['d/3'], duration: 'q' },  // 1 beat (new quarter)
                { keys: ['e/3'], duration: 'h' }   // 2 beats (quarter becomes half) = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: Note change in measure 3 - C half D quarter E quarter | F quarter G quarter E quarter D quarter | C quarter E quarter D half | F quarter G quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat (D becomes E - step up)
                { keys: ['d/3'], duration: 'h' }   // 2 beats (E+half becomes half) = 4 total
            ],
            measure4: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: Note change in measure 4 - C half D quarter E quarter | F quarter G quarter E quarter D quarter | C quarter D quarter E half | F quarter G quarter D half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'h' }   // 2 beats (C becomes D - step up) = 4 total
            ]
        },
        // Option 5: Rhythm change in measure 3 - C half D quarter E quarter | F quarter G quarter E quarter D quarter | C half E half | F quarter G quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['e/3'], duration: 'h' }   // 2 beats (quarter+half becomes half) = 4 total
            ],
            measure4: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 42

    // QUESTION SET 43 (Treble Clef) - C major 4-measure melodic dictation (basic rhythms from Q1-10)
    [
        // Option 0: CORRECT ANSWER - C quarter D quarter E quarter F quarter | G quarter F quarter E quarter D quarter | C quarter E quarter G quarter F quarter | E quarter D quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: Note change in measure 1 - C quarter D quarter F quarter E quarter | G quarter F quarter E quarter D quarter | C quarter E quarter G quarter F quarter | E quarter D quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat (E becomes F - step up)
                { keys: ['e/4'], duration: 'q' }   // 1 beat (F becomes E - step down) = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change in measure 2 - C quarter D quarter E quarter F quarter | G half E quarter D quarter | C quarter E quarter G quarter F quarter | E quarter D quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: Note change in measure 3 - C quarter D quarter E quarter F quarter | G quarter F quarter E quarter D quarter | C quarter D quarter G quarter F quarter | E quarter D quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat (E becomes D - step down)
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: Note change in measure 4 - C quarter D quarter E quarter F quarter | G quarter F quarter E quarter D quarter | C quarter E quarter G quarter F quarter | E quarter D quarter D half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'h' }   // 2 beats (C becomes D - step up) = 4 total
            ]
        },
        // Option 5: Rhythm change in measure 4 - C quarter D quarter E quarter F quarter | G quarter F quarter E quarter D quarter | C quarter E quarter G quarter F quarter | E half C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['e/4'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['c/4'], duration: 'h' }   // 2 beats (quarter+half becomes half) = 4 total
            ]
        }
    ], // End of Question Set 43

    // QUESTION SET 44 (Bass Clef) - C major 4-measure melodic dictation (basic rhythms from Q1-10)
    [
        // Option 0: CORRECT ANSWER - G quarter F quarter E quarter D quarter | C quarter D quarter E quarter F quarter | G half F quarter E quarter | D quarter C quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: Note change in measure 1 - G quarter E quarter F quarter D quarter | C quarter D quarter E quarter F quarter | G half F quarter E quarter | D quarter C quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat (F becomes E - step down)
                { keys: ['f/3'], duration: 'q' },  // 1 beat (E becomes F - step up)
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change in measure 2 - G quarter F quarter E quarter D quarter | C half E quarter F quarter | G half F quarter E quarter | D quarter C quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: Note change in measure 3 - G quarter F quarter E quarter D quarter | C quarter D quarter E quarter F quarter | G half E quarter F quarter | D quarter C quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['e/3'], duration: 'q' },  // 1 beat (F becomes E - step down)
                { keys: ['f/3'], duration: 'q' }   // 1 beat (E becomes F - step up) = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: Note change in measure 4 - G quarter F quarter E quarter D quarter | C quarter D quarter E quarter F quarter | G half F quarter E quarter | D quarter C quarter F half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'h' }   // 2 beats (G becomes F - step down) = 4 total
            ]
        },
        // Option 5: Rhythm change in measure 1 - G half E quarter D quarter | C quarter D quarter E quarter F quarter | G half F quarter E quarter | D quarter C quarter G half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 44

    // QUESTION SET 45 (Treble Clef) - C major 4-measure melodic dictation (basic rhythms from Q1-10)
    [
        // Option 0: CORRECT ANSWER - C quarter E quarter G quarter F quarter | E quarter D quarter C quarter D quarter | E quarter F quarter G half | F quarter E quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: Note change in measure 1 - C quarter D quarter G quarter F quarter | E quarter D quarter C quarter D quarter | E quarter F quarter G half | F quarter E quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat (E becomes D - step down)
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change in measure 2 - C quarter E quarter G quarter F quarter | E half C quarter D quarter | E quarter F quarter G half | F quarter E quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: Note change in measure 3 - C quarter E quarter G quarter F quarter | E quarter D quarter C quarter D quarter | F quarter E quarter G half | F quarter E quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat (E becomes F - step up)
                { keys: ['e/4'], duration: 'q' },  // 1 beat (F becomes E - step down)
                { keys: ['g/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: Note change in measure 4 - C quarter E quarter G quarter F quarter | E quarter D quarter C quarter D quarter | E quarter F quarter G half | F quarter E quarter D half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'h' }   // 2 beats (C becomes D - step up) = 4 total
            ]
        },
        // Option 5: Rhythm change in measure 3 - C quarter E quarter G quarter F quarter | E quarter D quarter C quarter D quarter | E half G half | F quarter E quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['e/4'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['g/4'], duration: 'h' }   // 2 beats (quarter+half becomes half) = 4 total
            ],
            measure4: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 45

    // QUESTION SET 46 (Bass Clef) - C major 4-measure melodic dictation (basic rhythms from Q1-10)
    [
        // Option 0: CORRECT ANSWER - C quarter D quarter E quarter C quarter | F quarter E quarter D quarter C quarter | G quarter F quarter E half | D quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: Note change in measure 1 - C quarter D quarter F quarter C quarter | F quarter E quarter D quarter C quarter | G quarter F quarter E half | D quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat (E becomes F - step up)
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change in measure 2 - C quarter D quarter E quarter C quarter | F half D quarter C quarter | G quarter F quarter E half | D quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: Note change in measure 3 - C quarter D quarter E quarter C quarter | F quarter E quarter D quarter C quarter | G quarter E quarter F half | D quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat (F becomes E - step down)
                { keys: ['f/3'], duration: 'h' }   // 2 beats (E+half becomes half) = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: Note change in measure 4 - C quarter D quarter E quarter C quarter | F quarter E quarter D quarter C quarter | G quarter F quarter E half | D quarter E quarter D half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'h' }   // 2 beats (C becomes D - step up) = 4 total
            ]
        },
        // Option 5: Rhythm change in measure 3 - C quarter D quarter E quarter C quarter | F quarter E quarter D quarter C quarter | G half E half | D quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['e/3'], duration: 'h' }   // 2 beats (quarter+half becomes half) = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 46

    // QUESTION SET 47 (Treble Clef) - C major 4-measure melodic dictation (basic rhythms from Q1-10)
    [
        // Option 0: CORRECT ANSWER - G quarter E quarter D quarter C quarter | E quarter F quarter G quarter F quarter | E quarter D quarter C quarter E quarter | F quarter G quarter C half
        {
            measure1: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: Note change in measure 1 - G quarter F quarter D quarter C quarter | E quarter F quarter G quarter F quarter | E quarter D quarter C quarter E quarter | F quarter G quarter C half
        {
            measure1: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat (E becomes F - step up)
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change in measure 2 - G quarter E quarter D quarter C quarter | E half G quarter F quarter | E quarter D quarter C quarter E quarter | F quarter G quarter C half
        {
            measure1: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: Note change in measure 3 - G quarter E quarter D quarter C quarter | E quarter F quarter G quarter F quarter | E quarter D quarter D quarter E quarter | F quarter G quarter C half
        {
            measure1: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat (C becomes D - step up)
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: Note change in measure 4 - G quarter E quarter D quarter C quarter | E quarter F quarter G quarter F quarter | E quarter D quarter C quarter E quarter | F quarter G quarter D half
        {
            measure1: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'h' }   // 2 beats (C becomes D - step up) = 4 total
            ]
        },
        // Option 5: Rhythm change in measure 1 - G half D quarter C quarter | E quarter F quarter G quarter F quarter | E quarter D quarter C quarter E quarter | F quarter G quarter C half
        {
            measure1: [
                { keys: ['g/4'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 47

    // QUESTION SET 48 (Bass Clef) - C major 4-measure melodic dictation (basic rhythms from Q1-10)
    [
        // Option 0: CORRECT ANSWER - C half E quarter F quarter | G quarter F quarter E quarter D quarter | C quarter D quarter E quarter F quarter | G quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: Note change in measure 1 - C half D quarter F quarter | G quarter F quarter E quarter D quarter | C quarter D quarter E quarter F quarter | G quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'q' },  // 1 beat (E becomes D - step down)
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change in measure 1 - C quarter D quarter E half | G quarter F quarter E quarter D quarter | C quarter D quarter E quarter F quarter | G quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat (half becomes quarter)
                { keys: ['d/3'], duration: 'q' },  // 1 beat (new quarter)
                { keys: ['e/3'], duration: 'h' }   // 2 beats (quarter+quarter becomes half) = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: Note change in measure 2 - C half E quarter F quarter | G quarter E quarter F quarter D quarter | C quarter D quarter E quarter F quarter | G quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat (F becomes E - step down)
                { keys: ['f/3'], duration: 'q' },  // 1 beat (E becomes F - step up)
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: Note change in measure 3 - C half E quarter F quarter | G quarter F quarter E quarter D quarter | C quarter E quarter D quarter F quarter | G quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat (D becomes E - step up)
                { keys: ['d/3'], duration: 'q' },  // 1 beat (E becomes D - step down)
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: Note change in measure 4 - C half E quarter F quarter | G quarter F quarter E quarter D quarter | C quarter D quarter E quarter F quarter | G quarter E quarter D half
        {
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'h' }   // 2 beats (C becomes D - step up) = 4 total
            ]
        }
    ], // End of Question Set 48

    // QUESTION SET 49 (Treble Clef) - C major 4-measure melodic dictation (basic rhythms from Q1-10)
    [
        // Option 0: CORRECT ANSWER - C quarter D quarter E quarter D quarter | C quarter E quarter F quarter G quarter | F quarter E quarter D quarter C quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: Note change in measure 1 - C quarter D quarter F quarter D quarter | C quarter E quarter F quarter G quarter | F quarter E quarter D quarter C quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat (E becomes F - step up)
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change in measure 2 - C quarter D quarter E quarter D quarter | C half F quarter G quarter | F quarter E quarter D quarter C quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: Note change in measure 3 - C quarter D quarter E quarter D quarter | C quarter E quarter F quarter G quarter | F quarter D quarter E quarter C quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat (E becomes D - step down)
                { keys: ['e/4'], duration: 'q' },  // 1 beat (D becomes E - step up)
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: Note change in measure 4 - C quarter D quarter E quarter D quarter | C quarter E quarter F quarter G quarter | F quarter E quarter D quarter C quarter | E quarter F quarter D half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'h' }   // 2 beats (C becomes D - step up) = 4 total
            ]
        },
        // Option 5: Rhythm change in measure 1 - C half E quarter D quarter | C quarter E quarter F quarter G quarter | F quarter E quarter D quarter C quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats (quarter+quarter becomes half)
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question Set 49

    // QUESTION SET 50 (Bass Clef) - C major 4-measure melodic dictation (basic rhythms from Q1-10)
    [
        // Option 0: CORRECT ANSWER - G half F quarter E quarter | D quarter C quarter D quarter E quarter | F quarter G quarter F quarter E quarter | D quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: Note change in measure 1 - G half E quarter F quarter | D quarter C quarter D quarter E quarter | F quarter G quarter F quarter E quarter | D quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['e/3'], duration: 'q' },  // 1 beat (F becomes E - step down)
                { keys: ['f/3'], duration: 'q' }   // 1 beat (E becomes F - step up) = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: Rhythm change in measure 1 - G quarter F quarter E half | D quarter C quarter D quarter E quarter | F quarter G quarter F quarter E quarter | D quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat (half becomes quarter)
                { keys: ['f/3'], duration: 'q' },  // 1 beat (new quarter)
                { keys: ['e/3'], duration: 'h' }   // 2 beats (quarter becomes half) = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: Note change in measure 2 - G half F quarter E quarter | D quarter C quarter E quarter F quarter | F quarter G quarter F quarter E quarter | D quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat (D becomes E - step up)
                { keys: ['f/3'], duration: 'q' }   // 1 beat (E becomes F - step up) = 4 total
            ],
            measure3: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: Note change in measure 3 - G half F quarter E quarter | D quarter C quarter D quarter E quarter | F quarter E quarter G quarter F quarter | D quarter E quarter C half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat (G becomes E - step down)
                { keys: ['g/3'], duration: 'q' },  // 1 beat (F becomes G - step up)
                { keys: ['f/3'], duration: 'q' }   // 1 beat (E becomes F - step up) = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: Note change in measure 4 - G half F quarter E quarter | D quarter C quarter D quarter E quarter | F quarter G quarter F quarter E quarter | D quarter E quarter D half
        {
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure3: [
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure4: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['d/3'], duration: 'h' }   // 2 beats (C becomes D - step up) = 4 total
            ]
        }
    ], // End of Question Set 50

    // QUESTION SET 51 (Treble Clef) - C major 6/8 time signature (dotted quarter=3, quarter+eighth=2+1, three eighths=3)
    [
        // Option 0: CORRECT - C dotted quarter D dotted quarter | E quarter eighth F eighth G eighth C dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 3 beats (dotted quarter)
                { keys: ['d/4'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 2 beats (quarter)
                { keys: ['f/4'], duration: '8' },   // 1 beat (eighth)
                { keys: ['g/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 1: Rhythm change - C quarter eighth D eighth dotted quarter | E quarter eighth F eighth G eighth C dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 2 beats (quarter)
                { keys: ['d/4'], duration: '8' },   // 1 beat (eighth)
                { keys: ['d/4'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 2: Single note change - C dotted quarter E dotted quarter | E quarter eighth F eighth G eighth C dotted quarter (D becomes E)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 3 beats
                { keys: ['e/4'], duration: 'qd' }   // 3 beats = 6 total (D->E)
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 3: Note change in measure 2 - C dotted quarter D dotted quarter | E quarter eighth F eighth E eighth C dotted quarter (G->E)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 3 beats
                { keys: ['d/4'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat (G->E)
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 4: Three eighths pattern - C eighth D eighth E eighth F dotted quarter | E quarter eighth F eighth G eighth C dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 5: Different ending - C dotted quarter D dotted quarter | E quarter eighth F eighth G eighth D dotted quarter (C->D)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 3 beats
                { keys: ['d/4'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' }    // 1 beat = 6 total (C->D)
            ]
        }
    ], // End of Question Set 51

    // QUESTION SET 52 (Bass Clef) - C major 6/8 time signature
    [
        // Option 0: CORRECT - C dotted quarter D dotted quarter | E quarter eighth F eighth G eighth C dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 3 beats
                { keys: ['d/3'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 1: Rhythm change - C quarter eighth D eighth dotted quarter | E quarter eighth F eighth G eighth C dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 2 beats
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 2: Single note change - C dotted quarter E dotted quarter | E quarter eighth F eighth G eighth C dotted quarter (D->E)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 3 beats
                { keys: ['e/3'], duration: 'qd' }   // 3 beats = 6 total (D->E)
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 3: Note change in measure 2 - C dotted quarter D dotted quarter | E quarter eighth F eighth E eighth C dotted quarter (G->E)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 3 beats
                { keys: ['d/3'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat (G->E)
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 4: Three eighths pattern - C eighth D eighth E eighth F dotted quarter | E quarter eighth F eighth G eighth C dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 5: Different ending - C dotted quarter D dotted quarter | E quarter eighth F eighth G eighth D dotted quarter (C->D)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 3 beats
                { keys: ['d/3'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' }    // 1 beat = 6 total (C->D)
            ]
        }
    ], // End of Question Set 52

    // QUESTION SET 53 (Treble Clef) - C major 6/8 time signature with different melodic pattern
    [
        // Option 0: CORRECT - G eighth F eighth E eighth D dotted quarter | C quarter eighth D eighth E eighth F dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['g/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 2 beats
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 1: Note change - G eighth F eighth D eighth C dotted quarter | C quarter eighth D eighth E eighth F dotted quarter (E->D, D->C)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['g/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat (E->D)
                { keys: ['c/4'], duration: 'qd' }   // 3 beats = 6 total (D->C)
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 2 beats
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 2: Rhythm change - G dotted quarter E dotted quarter | C quarter eighth D eighth E eighth F dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['g/4'], duration: 'qd' },  // 3 beats
                { keys: ['e/4'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 2 beats
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 3: Different ending - G eighth F eighth E eighth D dotted quarter | C quarter eighth D eighth E eighth E dotted quarter (F->E, G->E)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['g/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 2 beats
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat (F->E)
                { keys: ['e/4'], duration: '8' }    // 1 beat = 6 total (G->E)
            ]
        },
        // Option 4: Rhythm in measure 2 - G eighth F eighth E eighth D dotted quarter | C eighth D eighth E eighth F dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['g/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 5: Step wise change - F eighth E eighth D eighth C dotted quarter | C quarter eighth D eighth E eighth F dotted quarter (G->F)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['f/4'], duration: '8' },   // 1 beat (G->F)
                { keys: ['e/4'], duration: '8' },   // 1 beat (F->E)
                { keys: ['d/4'], duration: '8' },   // 1 beat (E->D)
                { keys: ['c/4'], duration: 'qd' }   // 3 beats = 6 total (D->C)
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 2 beats
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ]
        }
    ], // End of Question Set 53

    // QUESTION SET 54 (Bass Clef) - C major 6/8 time signature with different melodic pattern
    [
        // Option 0: CORRECT - G eighth F eighth E eighth D dotted quarter | C quarter eighth D eighth E eighth F dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['g/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },   // 2 beats
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 1: Note change - G eighth F eighth D eighth C dotted quarter | C quarter eighth D eighth E eighth F dotted quarter (E->D, D->C)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['g/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat (E->D)
                { keys: ['c/3'], duration: 'qd' }   // 3 beats = 6 total (D->C)
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },   // 2 beats
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 2: Rhythm change - G dotted quarter E dotted quarter | C quarter eighth D eighth E eighth F dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['g/3'], duration: 'qd' },  // 3 beats
                { keys: ['e/3'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },   // 2 beats
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 3: Different ending - G eighth F eighth E eighth D dotted quarter | C quarter eighth D eighth E eighth E dotted quarter (F->E, G->E)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['g/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },   // 2 beats
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat (F->E)
                { keys: ['e/3'], duration: '8' }    // 1 beat = 6 total (G->E)
            ]
        },
        // Option 4: Rhythm in measure 2 - G eighth F eighth E eighth D dotted quarter | C eighth D eighth E eighth F dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['g/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: 'qd' }   // 3 beats = 6 total
            ],
            measure2: [
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 5: Step wise change - F eighth E eighth D eighth C dotted quarter | C quarter eighth D eighth E eighth F dotted quarter (G->F)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['f/3'], duration: '8' },   // 1 beat (G->F)
                { keys: ['e/3'], duration: '8' },   // 1 beat (F->E)
                { keys: ['d/3'], duration: '8' },   // 1 beat (E->D)
                { keys: ['c/3'], duration: 'qd' }   // 3 beats = 6 total (D->C)
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },   // 2 beats
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ]
        }
    ], // End of Question Set 54

    // QUESTION SET 55 (Treble Clef) - C major 6/8 time signature with quarter+eighth patterns
    [
        // Option 0: CORRECT - E quarter eighth F eighth G quarter eighth | F eighth E eighth D eighth C dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 1: Rhythm change - E dotted quarter G quarter eighth | F eighth E eighth D eighth C dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['e/4'], duration: 'qd' },  // 3 beats
                { keys: ['g/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 2: Note change - D quarter eighth F eighth G quarter eighth | F eighth E eighth D eighth C dotted quarter (E->D)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['d/4'], duration: 'q' },   // 2 beats (E->D)
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 3: Note change in measure 2 - E quarter eighth F eighth G quarter eighth | F eighth E eighth C eighth D dotted quarter (D->C)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: '8' },   // 1 beat (D->C)
                { keys: ['d/4'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 4: Different ending rhythm - E quarter eighth F eighth G quarter eighth | F eighth E eighth D dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: 'qd' },  // 3 beats
                { keys: ['c/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 5: Three eighths start - E eighth F eighth G eighth F quarter eighth | F eighth E eighth D eighth C dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 2 beats
                { keys: ['e/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: 'qd' }   // 3 beats = 6 total
            ]
        }
    ], // End of Question Set 55

    // QUESTION SET 56 (Bass Clef) - C major 6/8 time signature with quarter+eighth patterns
    [
        // Option 0: CORRECT - E quarter eighth F eighth G quarter eighth | F eighth E eighth D eighth C dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 1: Rhythm change - E dotted quarter G quarter eighth | F eighth E eighth D eighth C dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['e/3'], duration: 'qd' },  // 3 beats
                { keys: ['g/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 2: Note change - D quarter eighth F eighth G quarter eighth | F eighth E eighth D eighth C dotted quarter (E->D)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['d/3'], duration: 'q' },   // 2 beats (E->D)
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 3: Note change in measure 2 - E quarter eighth F eighth G quarter eighth | F eighth E eighth C eighth D dotted quarter (D->C)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: '8' },   // 1 beat (D->C)
                { keys: ['d/3'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 4: Different ending rhythm - E quarter eighth F eighth G quarter eighth | F eighth E eighth D dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: 'qd' },  // 3 beats
                { keys: ['c/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 5: Three eighths start - E eighth F eighth G eighth F quarter eighth | F eighth E eighth D eighth C dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 2 beats
                { keys: ['e/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: 'qd' }   // 3 beats = 6 total
            ]
        }
    ], // End of Question Set 56

    // QUESTION SET 57 (Treble Clef) - C major 6/8 time signature with mixed patterns
    [
        // Option 0: CORRECT - C eighth D eighth E eighth F quarter eighth | G eighth F eighth E eighth D dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 2 beats
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 1: Note change - C eighth D eighth F eighth E quarter eighth | G eighth F eighth E eighth D dotted quarter (E->F, F->E)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat (E->F)
                { keys: ['e/4'], duration: 'q' },   // 2 beats (F->E)
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 2: Rhythm change - C dotted quarter F quarter eighth | G eighth F eighth E eighth D dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 3 beats
                { keys: ['f/4'], duration: 'q' },   // 2 beats
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 3: Different ending - C eighth D eighth E eighth F quarter eighth | G eighth F eighth E eighth E dotted quarter (D->E, C->E)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 2 beats
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat (D->E)
                { keys: ['e/4'], duration: 'qd' }   // 3 beats = 6 total (C->E)
            ]
        },
        // Option 4: Rhythm change in measure 2 - C eighth D eighth E eighth F quarter eighth | G quarter eighth F eighth E dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 2 beats
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 5: Note change in high register - C eighth D eighth E eighth G quarter eighth | F eighth E eighth D eighth C dotted quarter (F->G)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['g/4'], duration: 'q' },   // 2 beats (F->G)
                { keys: ['f/4'], duration: '8' }    // 1 beat (G->F)
            ],
            measure2: [
                { keys: ['e/4'], duration: '8' },   // 1 beat (F->E)
                { keys: ['d/4'], duration: '8' },   // 1 beat (E->D)
                { keys: ['c/4'], duration: '8' },   // 1 beat (D->C)
                { keys: ['d/4'], duration: 'qd' }   // 3 beats = 6 total (C->D)
            ]
        }
    ], // End of Question Set 57

    // QUESTION SET 58 (Bass Clef) - C major 6/8 time signature with mixed patterns
    [
        // Option 0: CORRECT - C eighth D eighth E eighth F quarter eighth | G eighth F eighth E eighth D dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 2 beats
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 1: Note change - C eighth D eighth F eighth E quarter eighth | G eighth F eighth E eighth D dotted quarter (E->F, F->E)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat (E->F)
                { keys: ['e/3'], duration: 'q' },   // 2 beats (F->E)
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 2: Rhythm change - C dotted quarter F quarter eighth | G eighth F eighth E eighth D dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/3'], duration: 'qd' },  // 3 beats
                { keys: ['f/3'], duration: 'q' },   // 2 beats
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 3: Different ending - C eighth D eighth E eighth F quarter eighth | G eighth F eighth E eighth E dotted quarter (D->E, C->E)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 2 beats
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat (D->E)
                { keys: ['e/3'], duration: 'qd' }   // 3 beats = 6 total (C->E)
            ]
        },
        // Option 4: Rhythm change in measure 2 - C eighth D eighth E eighth F quarter eighth | G quarter eighth F eighth E dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 2 beats
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: 'qd' }   // 3 beats = 6 total
            ]
        },
        // Option 5: Note change in high register - C eighth D eighth E eighth G quarter eighth | F eighth E eighth D eighth C dotted quarter (F->G)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['g/3'], duration: 'q' },   // 2 beats (F->G)
                { keys: ['f/3'], duration: '8' }    // 1 beat (G->F)
            ],
            measure2: [
                { keys: ['e/3'], duration: '8' },   // 1 beat (F->E)
                { keys: ['d/3'], duration: '8' },   // 1 beat (E->D)
                { keys: ['c/3'], duration: '8' },   // 1 beat (D->C)
                { keys: ['d/3'], duration: 'qd' }   // 3 beats = 6 total (C->D)
            ]
        }
    ], // End of Question Set 58

    // QUESTION SET 59 (Treble Clef) - C major 6/8 time signature with complex patterns
    [
        // Option 0: CORRECT - F dotted quarter E quarter eighth | D eighth C eighth D eighth E quarter eighth
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['f/4'], duration: 'qd' },  // 3 beats
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['d/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 2 beats
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 1: Note change - G dotted quarter E quarter eighth | D eighth C eighth D eighth E quarter eighth (F->G)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['g/4'], duration: 'qd' },  // 3 beats (F->G)
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['d/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 2 beats
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 2: Rhythm change - F quarter eighth E quarter eighth | D eighth C eighth D eighth E quarter eighth
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['f/4'], duration: 'q' },   // 2 beats
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['d/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 2 beats
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 3: Note change in measure 2 - F dotted quarter E quarter eighth | E eighth C eighth D eighth F quarter eighth (D->E, E->F)
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['f/4'], duration: 'qd' },  // 3 beats
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['d/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['e/4'], duration: '8' },   // 1 beat (D->E)
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 2 beats (E->F)
                { keys: ['g/4'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 4: Three eighths pattern - F eighth E eighth F eighth D quarter eighth | D eighth C eighth D eighth E quarter eighth
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 2 beats
                { keys: ['c/4'], duration: '8' }    // 1 beat = 6 total (D->C)
            ],
            measure2: [
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['f/4'], duration: '8' }    // 1 beat = 6 total (G->F)
            ]
        },
        // Option 5: Different ending - F dotted quarter E quarter eighth | D eighth C eighth D eighth F dotted quarter
        {
            timeSignature: '6/8',
            measure1: [
                { keys: ['f/4'], duration: 'qd' },  // 3 beats
                { keys: ['e/4'], duration: 'q' },   // 2 beats
                { keys: ['d/4'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['c/4'], duration: '8' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 1 beat
                { keys: ['f/4'], duration: 'qd' }   // 3 beats = 6 total (rhythm change)
            ]
        }
    ], // End of Question Set 59

    // QUESTION SET 60 (Bass Clef) - C major 6/8 time signature with complex patterns
    [
        // Option 0: CORRECT - F dotted quarter E quarter eighth | D eighth C eighth D eighth E quarter eighth
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['f/3'], duration: 'qd' },  // 3 beats
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['d/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 2 beats
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 1: Note change - G dotted quarter E quarter eighth | D eighth C eighth D eighth E quarter eighth (F->G)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['g/3'], duration: 'qd' },  // 3 beats (F->G)
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['d/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 2 beats
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 2: Rhythm change - F quarter eighth E quarter eighth | D eighth C eighth D eighth E quarter eighth
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 2 beats
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['d/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 2 beats
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 3: Note change in measure 2 - F dotted quarter E quarter eighth | E eighth C eighth D eighth F quarter eighth (D->E, E->F)
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['f/3'], duration: 'qd' },  // 3 beats
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['d/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['e/3'], duration: '8' },   // 1 beat (D->E)
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 2 beats (E->F)
                { keys: ['g/3'], duration: '8' }    // 1 beat = 6 total
            ]
        },
        // Option 4: Three eighths pattern - F eighth E eighth F eighth D quarter eighth | D eighth C eighth D eighth E quarter eighth
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 2 beats
                { keys: ['c/3'], duration: '8' }    // 1 beat = 6 total (D->C)
            ],
            measure2: [
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['f/3'], duration: '8' }    // 1 beat = 6 total (G->F)
            ]
        },
        // Option 5: Different ending - F dotted quarter E quarter eighth | D eighth C eighth D eighth F dotted quarter
        {
            clef: 'bass',
            timeSignature: '6/8',
            measure1: [
                { keys: ['f/3'], duration: 'qd' },  // 3 beats
                { keys: ['e/3'], duration: 'q' },   // 2 beats
                { keys: ['d/3'], duration: '8' }    // 1 beat = 6 total
            ],
            measure2: [
                { keys: ['c/3'], duration: '8' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 1 beat
                { keys: ['f/3'], duration: 'qd' }   // 3 beats = 6 total (rhythm change)
            ]
        }
    ] // End of Question Set 60
]; // End of allQuestionSets

let questionOptions = allQuestionSets[currentQuestionSet];

function createNotation(containerId, option) {
    if (!VF) {
        console.error('VexFlow not available');
        return;
    }
    
    // Clear existing content
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    try {
        // Determine if this is a 4-measure question
        const is4Measure = option.measure3 && option.measure4;
        
        // Get time signature from option or default to 4/4
        const timeSignature = option.timeSignature || '4/4';
        
        // Create renderer with width adjusted for measure count
        const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
        const rendererWidth = is4Measure ? 600 : 420; // Reduced width for 4-measure questions
        renderer.resize(rendererWidth, 100);
        const context = renderer.getContext();
        
        const clefType = option.clef || 'treble';
        let stave1, stave2, stave3, stave4;
        
        if (is4Measure) {
            // Create 4 staves for 4-measure questions with proper widths
            // First stave needs extra width for clef and time signature
            stave1 = new VF.Stave(5, -10, 180);
            stave1.addClef(clefType).addTimeSignature(timeSignature);
            stave1.setContext(context).draw();
            
            stave2 = new VF.Stave(185, -10, 135);
            stave2.setContext(context).draw();
            
            stave3 = new VF.Stave(320, -10, 135);
            stave3.setContext(context).draw();
            
            stave4 = new VF.Stave(455, -10, 135);
            stave4.setContext(context).draw();
        } else {
            // Create 2 staves for 2-measure questions
            stave1 = new VF.Stave(5, -10, 220);
            stave1.addClef(clefType).addTimeSignature(timeSignature);
            stave1.setContext(context).draw();
            
            stave2 = new VF.Stave(225, -10, 170);
            stave2.setContext(context).draw();
        }
        
        // Debug: Calculate beat counts based on time signature
        const calculateBeats = (notes, timeSignature) => {
            if (timeSignature === '6/8') {
                // For 6/8 time, count in eighth note units (should total 6 eighth notes)
                const beatMap = { 'w': 16, 'h': 8, 'hd': 12, 'q': 2, 'qr': 2, 'qd': 3, '8': 1 };
                return notes.reduce((total, note) => total + (beatMap[note.duration] || 0), 0);
            } else {
                // For 4/4 time, count in quarter note beats (should total 4)
                const beatMap = { 'w': 4, 'h': 2, 'hd': 3, 'q': 1, 'qr': 1, 'qd': 1.5, '8': 0.5 };
                return notes.reduce((total, note) => total + (beatMap[note.duration] || 0), 0);
            }
        };
        
        const expectedBeats = timeSignature === '6/8' ? 6 : 4; // 6/8 should have 6 eighth notes, 4/4 should have 4 quarter notes
        const beats1 = calculateBeats(option.measure1, timeSignature);
        const beats2 = calculateBeats(option.measure2, timeSignature);
        
        if (is4Measure) {
            const beats3 = calculateBeats(option.measure3, timeSignature);
            const beats4 = calculateBeats(option.measure4, timeSignature);
            console.log(`Container: ${containerId}, 4-measure (${timeSignature}): M1=${beats1}, M2=${beats2}, M3=${beats3}, M4=${beats4}`);
            
            if (beats1 !== expectedBeats || beats2 !== expectedBeats || beats3 !== expectedBeats || beats4 !== expectedBeats) {
                throw new Error(`Invalid beat count for ${timeSignature}: M1=${beats1}, M2=${beats2}, M3=${beats3}, M4=${beats4}, expected ${expectedBeats} each`);
            }
        } else {
            console.log(`Container: ${containerId}, 2-measure (${timeSignature}): M1=${beats1}, M2=${beats2}`);
            
            if (beats1 !== expectedBeats || beats2 !== expectedBeats) {
                throw new Error(`Invalid beat count for ${timeSignature}: M1=${beats1}, M2=${beats2}, expected ${expectedBeats} each`);
            }
        }
        
        // Helper function to create notes for any measure
        const createNotesForMeasure = (measureNotes) => {
            return measureNotes.map(note => {
                if (note.duration.includes('r')) {
                    return new VF.StaveNote({ keys: ['b/4'], duration: note.duration, clef: clefType });
                }
                
                // ⚠️ CRITICAL STEM DIRECTION LOGIC - DO NOT MODIFY ⚠️
                // Use auto_stem for non-eighth notes, but not for eighth notes that will be beamed
                // This prevents conflicts between individual note stem directions and beam group directions
                const useAutoStem = note.duration !== '8';
                const staveNote = new VF.StaveNote({ 
                    keys: note.keys, 
                    duration: note.duration, 
                    clef: clefType,
                    auto_stem: useAutoStem
                });
                // ⚠️ END CRITICAL SECTION ⚠️
                
                // Add dots for dotted notes
                if (note.duration === 'qd') {
                    staveNote.addModifier(new VF.Dot(), 0);
                }
                
                // Add sharp accidentals for G# notes
                if (note.keys[0].includes('#')) {
                    staveNote.addModifier(new VF.Accidental('#'), 0);
                }
                
                return staveNote;
            });
        };
        
        // Create notes for all measures
        const notes1 = createNotesForMeasure(option.measure1);
        const notes2 = createNotesForMeasure(option.measure2);
        let notes3, notes4;
        
        if (is4Measure) {
            notes3 = createNotesForMeasure(option.measure3);
            notes4 = createNotesForMeasure(option.measure4);
        }
        
        // Stem directions are set manually for bass clef, auto for treble clef
        
        // Create voices - one for each measure with appropriate time signature
        const voiceConfig = timeSignature === '6/8' 
            ? { num_beats: 6, beat_value: 8 }
            : { num_beats: 4, beat_value: 4 };
            
        const voice1 = new VF.Voice(voiceConfig).setStrict(true);
        const voice2 = new VF.Voice(voiceConfig).setStrict(true);
        
        voice1.addTickables(notes1);
        voice2.addTickables(notes2);
        
        let voice3, voice4;
        if (is4Measure) {
            voice3 = new VF.Voice(voiceConfig).setStrict(true);
            voice4 = new VF.Voice(voiceConfig).setStrict(true);
            voice3.addTickables(notes3);
            voice4.addTickables(notes4);
        }
        
        // Create beams based on time signature
        const createBeams = (notes, measureNotes, timeSignature) => {
            if (timeSignature === '6/8') {
                // In 6/8 time, find consecutive eighth notes and beam them in groups of 3
                const beams = [];
                let consecutiveEighths = [];
                
                for (let i = 0; i < notes.length; i++) {
                    if (notes[i].getDuration() === '8') {
                        consecutiveEighths.push(notes[i]);
                        
                        // ⚠️ CRITICAL: auto_stem in beam options fixes stem attachment positioning ⚠️
                        if (consecutiveEighths.length === 3) {
                            beams.push(new VF.Beam(consecutiveEighths, { auto_stem: true }));
                            consecutiveEighths = [];
                        }
                    } else {
                        // Non-eighth note breaks the sequence
                        if (consecutiveEighths.length >= 2) {
                            beams.push(new VF.Beam(consecutiveEighths, { auto_stem: true }));
                        }
                        consecutiveEighths = [];
                    }
                }
                
                // Handle any remaining consecutive eighths
                if (consecutiveEighths.length >= 2) {
                    beams.push(new VF.Beam(consecutiveEighths, { auto_stem: true }));
                }
                
                return beams;
            } else {
                // For 4/4 time, use VexFlow's automatic beaming with proper stem direction handling
                const eighthNotes = notes.filter(note => note.getDuration() === '8');
                return VF.Beam.generateBeams(eighthNotes, { auto_stem: true });
            }
        };
        
        const beams1 = createBeams(notes1, option.measure1, timeSignature);
        const beams2 = createBeams(notes2, option.measure2, timeSignature);
        let beams3, beams4;
        
        if (is4Measure) {
            beams3 = createBeams(notes3, option.measure3, timeSignature);
            beams4 = createBeams(notes4, option.measure4, timeSignature);
        }
        
        // ⚠️⚠️⚠️ CRITICAL UNBEAMED EIGHTH NOTES FIX - DO NOT MODIFY ⚠️⚠️⚠️
        // This function fixes stem directions for individual eighth notes that are NOT in beams
        // It works perfectly with the beam logic above - DO NOT CHANGE THIS!
        const fixUnbeamedEighthNotes = (notes, beams, clefType) => {
            // Get all notes that are in beams
            const beamedNotes = new Set();
            beams.forEach(beam => {
                beam.notes.forEach(note => beamedNotes.add(note));
            });
            
            // Fix stem direction for eighth notes that are NOT beamed
            notes.forEach(note => {
                if (note.getDuration() === '8' && !beamedNotes.has(note)) {
                    // Apply auto stem direction for unbeamed eighth notes
                    const noteKey = note.keys[0];
                    
                    if (clefType === 'bass') {
                        // Bass clef: below D3 = UP, D3 and above = DOWN
                        if (noteKey === 'c/3' || noteKey === 'b/2' || noteKey === 'a/2' || noteKey === 'g/2') {
                            note.setStemDirection(VF.Stem.UP);
                        } else {
                            note.setStemDirection(VF.Stem.DOWN);
                        }
                    } else {
                        // Treble clef: below B4 = UP, B4 and above = DOWN
                        if (noteKey === 'a/4' || noteKey === 'g/4' || noteKey === 'f/4' || 
                            noteKey === 'e/4' || noteKey === 'd/4' || noteKey === 'c/4' || noteKey === 'g#/4') {
                            note.setStemDirection(VF.Stem.UP);
                        } else {
                            note.setStemDirection(VF.Stem.DOWN);
                        }
                    }
                }
            });
        };
        
        // Apply the fix to all measures
        fixUnbeamedEighthNotes(notes1, beams1, clefType);
        fixUnbeamedEighthNotes(notes2, beams2, clefType);
        if (is4Measure) {
            fixUnbeamedEighthNotes(notes3, beams3, clefType);
            fixUnbeamedEighthNotes(notes4, beams4, clefType);
        }
        
        // Format and draw each measure independently 
        if (is4Measure) {
            VF.Formatter.FormatAndDraw(context, stave1, notes1);
            VF.Formatter.FormatAndDraw(context, stave2, notes2);
            VF.Formatter.FormatAndDraw(context, stave3, notes3);
            VF.Formatter.FormatAndDraw(context, stave4, notes4);
            
            // Draw beams
            beams1.forEach(beam => beam.setContext(context).draw());
            beams2.forEach(beam => beam.setContext(context).draw());
            beams3.forEach(beam => beam.setContext(context).draw());
            beams4.forEach(beam => beam.setContext(context).draw());
        } else {
            VF.Formatter.FormatAndDraw(context, stave1, notes1);
            VF.Formatter.FormatAndDraw(context, stave2, notes2);
            
            // Draw beams
            beams1.forEach(beam => beam.setContext(context).draw());
            beams2.forEach(beam => beam.setContext(context).draw());
        }
        
    } catch (error) {
        console.error('Error creating notation:', error);
        container.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

// ⚠️ VALIDATION FUNCTION: Checks if current question set has all 6 options ⚠️
function validateQuestionSet() {
    const setIndex = currentQuestionSet + 1;
    
    // Check if questionOptions exists and is an array
    if (!questionOptions || !Array.isArray(questionOptions)) {
        console.error(`❌ Question Set ${setIndex}: questionOptions is invalid`, questionOptions);
        return false;
    }
    
    // Check if we have exactly 6 options
    if (questionOptions.length !== 6) {
        console.error(`❌ Question Set ${setIndex}: Has ${questionOptions.length} options instead of 6`);
        console.error('Options data:', questionOptions);
        return false;
    }
    
    // Check if each option has required properties
    questionOptions.forEach((option, index) => {
        if (!option) {
            console.error(`❌ Question Set ${setIndex}, Option ${index}: Option is null/undefined`);
            return false;
        }
        
        if (!option.measure1 || !option.measure2) {
            console.error(`❌ Question Set ${setIndex}, Option ${index}: Missing measure1 or measure2`, option);
            return false;
        }
        
        // Check for 4-measure questions
        const is4Measure = option.measure3 && option.measure4;
        if (is4Measure && (!option.measure3 || !option.measure4)) {
            console.error(`❌ Question Set ${setIndex}, Option ${index}: Incomplete 4-measure question`, option);
            return false;
        }
    });
    
    console.log(`✅ Question Set ${setIndex}: Validation passed - all 6 options present`);
    return true;
}

function generateOptions() {
    // Validate question set before generating options
    validateQuestionSet();
    
    // Create shuffled version of options with one designated as correct
    shuffleOptionsForNewQuestion();
    
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    
    // ⚠️ VALIDATION: Ensure we have exactly 6 options ⚠️
    if (shuffledOptions.length !== 6) {
        console.error(`❌ CRITICAL ERROR: Question Set ${currentQuestionSet + 1} has ${shuffledOptions.length} options instead of 6!`);
        console.error('Question Set Data:', questionOptions);
        
        // Try to recover by showing error message
        container.innerHTML = `
            <div style="color: red; font-size: 1.2rem; text-align: center; padding: 20px;">
                ❌ ERROR: Question ${currentQuestionSet + 1} is missing options!<br>
                Found ${shuffledOptions.length} options, expected 6.<br>
                <button onclick="nextQuestion()" style="margin-top: 10px; padding: 5px 10px;">Skip to Next Question</button>
            </div>
        `;
        return;
    }
    
    shuffledOptions.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.onclick = () => selectOption(index);
        
        const notationDiv = document.createElement('div');
        notationDiv.className = 'notation';
        notationDiv.id = `notation-${index}`;
        
        const label = document.createElement('div');
        label.className = 'option-label';
        label.textContent = String.fromCharCode(65 + index);
        label.style.fontWeight = '700';
        label.style.fontSize = '1.25rem';
        label.style.color = 'white';
        label.style.marginBottom = '12px';
        label.style.textAlign = 'center';
        label.style.flexShrink = '0';
        label.style.width = '40px';
        label.style.height = '40px';
        label.style.borderRadius = '50%';
        label.style.display = 'flex';
        label.style.alignItems = 'center';
        label.style.justifyContent = 'center';
        label.style.margin = '0 auto 12px auto';
        label.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.2)';
        label.style.transition = 'all 0.3s ease';
        
        // Set background color based on index
        const colors = ['#e74c3c', '#1abc9c', '#3498db', '#27ae60', '#f39c12', '#9b59b6'];
        label.style.background = colors[index];
        label.style.border = `1px solid ${colors[index]}80`;
        
        optionDiv.appendChild(label);
        optionDiv.appendChild(notationDiv);
        container.appendChild(optionDiv);
        
        // Create notation after DOM element is added
        setTimeout(() => createNotation(`notation-${index}`, option), 10);
    });
    
    // ⚠️ VALIDATION: Check that all options rendered correctly ⚠️
    setTimeout(() => {
        const renderedOptions = document.querySelectorAll('.option');
        if (renderedOptions.length !== 6) {
            console.error(`❌ RENDER ERROR: Only ${renderedOptions.length} options rendered out of 6!`);
            console.error('Expected 6 options (A-F), but only found:', renderedOptions.length);
            
            // Show error in UI
            const container = document.getElementById('optionsContainer');
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'color: red; text-align: center; padding: 10px; border: 2px solid red; margin: 10px; border-radius: 8px;';
            errorDiv.innerHTML = `⚠️ RENDER ERROR: Only ${renderedOptions.length}/6 options visible!`;
            container.appendChild(errorDiv);
        } else {
            console.log(`✅ All 6 options rendered successfully for Question ${currentQuestionSet + 1}`);
        }
    }, 100); // Wait for notation creation to complete
    
    // Update question header
    updateQuestionHeader();
}

function shuffleOptionsForNewQuestion() {
    // Randomly select which option should be the correct answer (0-5)
    currentCorrectOption = Math.floor(Math.random() * 6);
    
    // Create a copy of all options and shuffle them
    shuffledOptions = [...questionOptions];
    
    // Fisher-Yates shuffle
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
    }
    
    // Set the correct answer to be the option at currentCorrectOption position
    // Find where the designated correct option ended up after shuffle
    correctAnswer = shuffledOptions.findIndex((option, index) => 
        option === questionOptions[currentCorrectOption]
    );
    
    console.log(`Question using option ${currentCorrectOption} as correct answer, now at position ${correctAnswer}`);
}

function updateQuestionHeader() {
    const header = document.querySelector('.question-header h1');
    if (header) {
        header.textContent = `Melodic Dictation - Easy`;
    }
}

function nextQuestion() {
    // Move to next question variation within current set
    currentCorrectOption = (currentCorrectOption + 1) % 6;
    
    // If we've used all 6 variations, move to next question set
    if (currentCorrectOption === 0) {
        // Find next unused question set
        do {
            currentQuestionSet = (currentQuestionSet + 1) % allQuestionSets.length;
        } while (usedQuestionSets.includes(currentQuestionSet) && usedQuestionSets.length < allQuestionSets.length);
        
        // Mark this set as used
        if (!usedQuestionSets.includes(currentQuestionSet)) {
            usedQuestionSets.push(currentQuestionSet);
        }
        
        // Update current question options
        questionOptions = allQuestionSets[currentQuestionSet];
        console.log(`Moving to Question Set ${currentQuestionSet + 1}, Used sets: ${usedQuestionSets.length}`);
    }
    
    // Reset UI
    selectedOption = null;
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect');
        opt.style.pointerEvents = 'auto';
    });
    document.getElementById('submitButton').disabled = true;
    
    // Generate new question
    generateOptions();
}

function selectOption(index) {
    // Remove previous selection
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Add selection to clicked option
    document.querySelectorAll('.option')[index].classList.add('selected');
    selectedOption = index;
    
    // Enable submit button
    document.getElementById('submitButton').disabled = false;
}

function checkAnswer() {
    if (selectedOption === null) return;
    
    const options = document.querySelectorAll('.option');
    
    // Show correct/incorrect
    options.forEach((opt, index) => {
        if (index === correctAnswer) {
            opt.classList.add('correct');
        } else if (index === selectedOption && index !== correctAnswer) {
            opt.classList.add('incorrect');
        }
        opt.style.pointerEvents = 'none'; // Disable further clicking
    });
    
    // Disable submit button
    document.getElementById('submitButton').disabled = true;
    
    // Show visual feedback
    const isCorrect = selectedOption === correctAnswer;
    showFeedback(isCorrect);
}

function showNextQuestionButton() {
    // Add next question button if it doesn't exist
    let nextBtn = document.getElementById('nextButton');
    if (!nextBtn) {
        nextBtn = document.createElement('button');
        nextBtn.id = 'nextButton';
        nextBtn.className = 'submit-button';
        nextBtn.textContent = 'Next Question';
        nextBtn.onclick = () => {
            nextQuestion();
            nextBtn.style.display = 'none';
        };
        document.getElementById('submitButton').parentNode.appendChild(nextBtn);
    }
    nextBtn.style.display = 'inline-block';
}

// ACTUAL piano sample URLs - real recorded piano notes
const pianoSamples = {
    'c/4': 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', // Will replace with actual piano samples
    'd/4': 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav', 
    'e/4': 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    'f/4': 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',
    'g/4': 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav'
};

// Load and play actual piano audio files
let pianoAudioElements = {};
let pianoLoaded = false;

function loadPiano() {
    if (typeof Tone !== 'undefined') {
        // Use Tone.js PolySynth with piano-like settings
        piano = new Tone.PolySynth(Tone.Synth, {
            oscillator: {
                partials: [0, 2, 3, 4],
            },
            envelope: {
                attack: 0.01,
                decay: 0.8,
                sustain: 0.2,
                release: 1.2,
            }
        }).toDestination();
        
        pianoLoaded = true;
        console.log('Tone.js Piano synthesizer loaded!');
    }
}

// Play using VexFlow MIDI generation + Tone.js piano
function playAudio() {
    try {
        // Reset play count if this is a new manual play
        if (!isAutoPlaying) {
            currentPlayCount = 0;
        }
        
        // Play the audio for the current correct answer
        const correctOption = shuffledOptions[correctAnswer];
        let allNotes = [...correctOption.measure1, ...correctOption.measure2];
        
        // Add measures 3 and 4 if this is a 4-measure question
        if (correctOption.measure3 && correctOption.measure4) {
            allNotes = [...allNotes, ...correctOption.measure3, ...correctOption.measure4];
        }
        
        console.log('Playing MIDI-generated piano audio');
        
        // Auto-enable voting when melody is played (if room exists) - only on first play
        if (currentRoomCode && isTeacher && currentPlayCount === 0) {
            enableVotingForCurrentQuestion();
        }
        
        currentPlayCount++;
        
        if (typeof Tone !== 'undefined' && piano) {
            playMIDIWithPiano(allNotes);
        } else {
            // Fallback to Web Audio
            playWithWebAudio(allNotes);
        }
        
        // Schedule next play if auto-repeat is enabled
        if (autoRepeatCount !== 'manual' && currentPlayCount < autoRepeatCount && !isAutoPlaying) {
            scheduleNextPlay(allNotes);
        }
    } catch (error) {
        console.error('MIDI piano playback error:', error);
        playWithWebAudio(allNotes);
    }
}

function playMIDIWithPiano(allNotes) {
    // Start Tone.js transport
    Tone.start();
    
    let currentTime = 0;
    
    allNotes.forEach((note, index) => {
        if (!note.duration.includes('r')) { // Skip rests
            const midiNote = convertToMIDINote(note.keys[0]);
            const duration = getNoteDuration(note.duration);
            
            console.log(`Playing MIDI piano note: ${midiNote} for ${duration}s at time ${currentTime}`);
            
            // Schedule the note with Tone.js
            piano.triggerAttackRelease(midiNote, duration, `+${currentTime}`);
        }
        currentTime += getNoteDuration(note.duration);
    });
}

function convertToMIDINote(vexNote) {
    // Convert VexFlow note format (c/4) to MIDI format (C4)
    const noteMap = {
        // Treble clef notes - C major range
        'c/4': 'C4',
        'd/4': 'D4', 
        'e/4': 'E4',
        'f/4': 'F4',
        'g/4': 'G4',
        'a/4': 'A4',
        // Bass clef notes - C major range
        'c/3': 'C3',
        'd/3': 'D3',
        'e/3': 'E3',
        'f/3': 'F3',
        'g/3': 'G3',
        // Treble clef notes - A minor range (extended)
        'g#/4': 'G#4',  // Leading tone for A minor treble clef
        'b/4': 'B4',
        'c/5': 'C5',
        'd/5': 'D5',
        'e/5': 'E5',
        'f/5': 'F5',
        'g/5': 'G5',
        'g#/5': 'G#5',
        // Bass clef notes - A minor range (extended)
        'g#/3': 'G#2',  // Leading tone for A minor bass clef
        'a/2': 'A2',
        'b/2': 'B2',
        'g#/3': 'G#3'
    };
    return noteMap[vexNote] || 'C4';
}

function playWebAudioNote(noteKey, duration) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    const frequency = getFrequency(noteKey);
    createPianoNote(audioContext, frequency, duration, audioContext.currentTime);
    console.log(`Playing Web Audio note: ${noteKey}`);
}

function playWithWebAudio(allNotes) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    let currentTime = audioContext.currentTime + 0.1;
    
    allNotes.forEach((note, index) => {
        if (!note.duration.includes('r')) {
            const frequency = getFrequency(note.keys[0]);
            const duration = getNoteDuration(note.duration);
            
            // Create more realistic piano sound with multiple harmonics
            createPianoNote(audioContext, frequency, duration, currentTime);
        }
        currentTime += getNoteDuration(note.duration);
    });
}

function createPianoNote(audioContext, frequency, duration, startTime) {
    // Create fundamental + harmonics for more realistic piano sound
    const harmonics = [1, 0.8, 0.6, 0.4, 0.3, 0.2]; // Harmonic amplitudes
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    
    harmonics.forEach((amplitude, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(masterGain);
        
        oscillator.frequency.setValueAtTime(frequency * (index + 1), startTime);
        oscillator.type = 'triangle';
        
        // Individual harmonic envelope
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(amplitude * 0.1, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(amplitude * 0.05, startTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    });
    
    // Master envelope
    masterGain.gain.setValueAtTime(0, startTime);
    masterGain.gain.linearRampToValueAtTime(0.8, startTime + 0.01);
    masterGain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.1);
    masterGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
}

function getFrequency(noteString) {
    const noteMap = {
        // Treble clef notes - C major
        'c/4': 261.63,  // C4
        'd/4': 293.66,  // D4
        'e/4': 329.63,  // E4
        'f/4': 349.23,  // F4
        'g/4': 392.00,  // G4
        'a/4': 440.00,  // A4
        // Treble clef notes - A minor extended range (G#4-A4-B4-C5-D5-E5)
        'g#/4': 415.30, // G#4 - leading tone for A minor
        'b/4': 493.88,  // B4
        'c/5': 523.25,  // C5
        'd/5': 587.33,  // D5
        'e/5': 659.25,  // E5
        // Bass clef notes - C major (C3-G3 on staff lines and spaces)
        'c/3': 130.81,  // C3 - second space in bass clef
        'd/3': 146.83,  // D3 - third line in bass clef
        'e/3': 164.81,  // E3 - third space in bass clef
        'f/3': 174.61,  // F3 - fourth line in bass clef
        'g/3': 196.00,  // G3 - fourth space in bass clef
        // Bass clef notes - A minor extended range (G#2-A2-B2-C3-D3-E3)
        'g#/3': 207.65, // G#2 - leading tone for A minor bass clef
        'a/2': 110.00,  // A2
        'b/2': 123.47   // B2
    };
    return noteMap[noteString] || 261.63;
}

function getNoteDuration(duration) {
    const durationMap = {
        'w': 2.0,   // whole note
        'h': 1.0,   // half note
        'q': 0.5,   // quarter note
        'qd': 0.75, // dotted quarter note
        '8': 0.25,  // eighth note
        'qr': 0.5   // quarter rest
    };
    return (durationMap[duration] || 0.5) / playbackSpeed;
}

// Auto-repeat functions
function updateRepeatSetting() {
    const repeatSelect = document.getElementById('repeatSelect');
    const value = repeatSelect.value;
    
    if (value === 'manual') {
        autoRepeatCount = 'manual';
    } else {
        autoRepeatCount = parseInt(value);
    }
    
    console.log('Auto-repeat set to:', autoRepeatCount);
}

function scheduleNextPlay(allNotes) {
    isAutoPlaying = true;
    
    // Calculate total duration of current melody
    const totalDuration = allNotes.reduce((total, note) => {
        return total + getNoteDuration(note.duration);
    }, 0);
    
    // Add a small pause between plays (0.5 seconds)
    const delayMs = (totalDuration + 0.5) * 1000;
    
    setTimeout(() => {
        if (currentPlayCount < autoRepeatCount) {
            playAudio();
        } else {
            isAutoPlaying = false;
            currentPlayCount = 0;
        }
    }, delayMs);
}

// Simple question navigation functions
function previousQuestion() {
    const newQuestionSet = currentQuestionSet > 0 ? currentQuestionSet - 1 : allQuestionSets.length - 1;
    skipToQuestionSet(newQuestionSet);
    generateOptions();
    updateQuestionCounter();
    
    // Reset voting for new question
    resetVotingForNewQuestion();
}

function nextQuestion() {
    const newQuestionSet = currentQuestionSet < allQuestionSets.length - 1 ? currentQuestionSet + 1 : 0;
    skipToQuestionSet(newQuestionSet);
    generateOptions();
    updateQuestionCounter();
    
    // Reset voting for new question
    resetVotingForNewQuestion();
}

function updateQuestionCounter() {
    const counter = document.getElementById('questionCounter');
    if (counter) {
        counter.textContent = `Question ${currentQuestionSet + 1} of ${allQuestionSets.length}`;
    }
}

function changeSpeed() {
    const slider = document.getElementById('speedSlider');
    const speedText = document.getElementById('speedText');
    
    const speedValues = [0.5, 0.75, 1.0]; // 60, 90, 120 BPM
    const speedLabels = ['Largo', 'Andante', 'Allegro'];
    
    const index = parseInt(slider.value);
    playbackSpeed = speedValues[index];
    speedText.textContent = speedLabels[index];
}

function showFeedback(isCorrect) {
    const overlay = document.getElementById('feedbackOverlay');
    const icon = document.getElementById('feedbackIcon');
    const text = document.getElementById('feedbackText');
    
    // Set content based on result
    if (isCorrect) {
        overlay.className = 'feedback-overlay correct';
        icon.textContent = '✓';
        text.textContent = 'Correct!';
        createConfetti();
    } else {
        overlay.className = 'feedback-overlay incorrect';
        icon.textContent = '✗';
        text.textContent = 'Incorrect';
    }
    
    // Show overlay
    overlay.classList.add('show');
    
    // Auto-hide after 2 seconds
    setTimeout(() => {
        overlay.classList.remove('show');
        
        // Show next question button if not at the end
        if (currentCorrectOption < 5) {
            setTimeout(() => showNextQuestionButton(), 300);
        }
    }, 2000);
}

function createConfetti() {
    const colors = ['#f39c12', '#e74c3c', '#3498db', '#27ae60', '#9b59b6', '#1abc9c'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            
            document.body.appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }, i * 30);
    }
}

// ⚠️ VALIDATION: Check all question sets for missing options ⚠️
function validateAllQuestionSets() {
    console.log('🔍 Validating all question sets for missing options...');
    
    let totalErrors = 0;
    let errorSets = [];
    
    allQuestionSets.forEach((questionSet, setIndex) => {
        const setNumber = setIndex + 1;
        
        if (!questionSet || !Array.isArray(questionSet)) {
            console.error(`❌ Question Set ${setNumber}: Invalid question set data`);
            totalErrors++;
            errorSets.push(setNumber);
            return;
        }
        
        if (questionSet.length !== 6) {
            console.error(`❌ Question Set ${setNumber}: Has ${questionSet.length} options instead of 6`);
            totalErrors++;
            errorSets.push(setNumber);
            return;
        }
        
        // Check each option in the set
        let setHasErrors = false;
        questionSet.forEach((option, optionIndex) => {
            if (!option) {
                console.error(`❌ Question Set ${setNumber}, Option ${optionIndex}: Option is null/undefined`);
                setHasErrors = true;
            } else if (!option.measure1 || !option.measure2) {
                console.error(`❌ Question Set ${setNumber}, Option ${optionIndex}: Missing required measures`);
                setHasErrors = true;
            }
        });
        
        if (setHasErrors) {
            totalErrors++;
            errorSets.push(setNumber);
        }
    });
    
    if (totalErrors > 0) {
        console.error(`❌ VALIDATION FAILED: ${totalErrors} question sets have errors!`);
        console.error('Problem question sets:', errorSets);
        
        // Show warning in console
        console.warn('⚠️  These question sets may not display all 6 options correctly:');
        errorSets.forEach(setNum => console.warn(`   • Question ${setNum}`));
    } else {
        console.log(`✅ VALIDATION PASSED: All ${allQuestionSets.length} question sets have 6 valid options`);
    }
    
    return totalErrors === 0;
}

// Beat Validation Script - CRITICAL for preventing beat count errors
// ⚠️⚠️⚠️ BULLETPROOF BEAT VALIDATION SYSTEM ⚠️⚠️⚠️
// This validation system PREVENTS any question with wrong beat counts from being used
// NO QUESTION CAN PASS WITHOUT CORRECT BEAT COUNTS IN ALL MEASURES

/**
 * Universal beat validation function that works for ALL time signatures
 * @param {Array} notes - Array of note objects with duration property
 * @param {string} timeSignature - Time signature (e.g., '4/4', '6/8')
 * @returns {number} Total beat count for the measure
 */
function calculateBeatCount(notes, timeSignature) {
    // Define beat maps for different time signatures
    const beatMaps = {
        '4/4': {
            // 4/4 time: count in quarter note beats (total should be 4)
            'w': 4,     // whole note = 4 quarter beats
            'h': 2,     // half note = 2 quarter beats  
            'hd': 3,    // dotted half = 3 quarter beats
            'q': 1,     // quarter note = 1 quarter beat
            'qr': 1,    // quarter rest = 1 quarter beat
            'qd': 1.5,  // dotted quarter = 1.5 quarter beats
            '8': 0.5,   // eighth note = 0.5 quarter beats
            '8r': 0.5   // eighth rest = 0.5 quarter beats
        },
        '3/4': {
            // 3/4 time: count in quarter note beats (total should be 3)
            'w': 4,     // whole note = 4 quarter beats (rare in 3/4)
            'h': 2,     // half note = 2 quarter beats
            'hd': 3,    // dotted half = 3 quarter beats (full measure in 3/4)
            'q': 1,     // quarter note = 1 quarter beat
            'qr': 1,    // quarter rest = 1 quarter beat
            'qd': 1.5,  // dotted quarter = 1.5 quarter beats
            '8': 0.5,   // eighth note = 0.5 quarter beats
            '8r': 0.5   // eighth rest = 0.5 quarter beats
        },
        '6/8': {
            // 6/8 time: count in eighth note units (total should be 6)
            'w': 16,    // whole note = 16 eighth beats (not typically used in 6/8)
            'h': 8,     // half note = 8 eighth beats (not typically used in 6/8)
            'hd': 12,   // dotted half = 12 eighth beats (full measure in 6/8)
            'q': 2,     // quarter note = 2 eighth beats
            'qr': 2,    // quarter rest = 2 eighth beats
            'qd': 3,    // dotted quarter = 3 eighth beats (one beat in 6/8)
            '8': 1,     // eighth note = 1 eighth beat
            '8r': 1     // eighth rest = 1 eighth beat
        },
        '9/8': {
            // 9/8 time: count in eighth note units (total should be 9)
            'w': 16,    // whole note = 16 eighth beats (not typically used in 9/8)
            'h': 8,     // half note = 8 eighth beats (not typically used in 9/8)
            'hd': 12,   // dotted half = 12 eighth beats (not typically used in 9/8)
            'q': 2,     // quarter note = 2 eighth beats
            'qr': 2,    // quarter rest = 2 eighth beats
            'qd': 3,    // dotted quarter = 3 eighth beats (one beat in 9/8)
            '8': 1,     // eighth note = 1 eighth beat
            '8r': 1     // eighth rest = 1 eighth beat
        }
    };
    
    const beatMap = beatMaps[timeSignature];
    if (!beatMap) {
        throw new Error(`Unsupported time signature: ${timeSignature}. Supported: ${Object.keys(beatMaps).join(', ')}`);
    }
    
    let totalBeats = 0;
    for (const note of notes) {
        const duration = note.duration;
        const beatValue = beatMap[duration];
        
        if (beatValue === undefined) {
            throw new Error(`Unknown duration '${duration}' in ${timeSignature} time. Valid durations: ${Object.keys(beatMap).join(', ')}`);
        }
        
        totalBeats += beatValue;
    }
    
    return totalBeats;
}

/**
 * Get expected beat count for a time signature
 * @param {string} timeSignature - Time signature
 * @returns {number} Expected beat count per measure
 */
function getExpectedBeats(timeSignature) {
    const expectedBeats = {
        '4/4': 4,   // 4 quarter note beats
        '3/4': 3,   // 3 quarter note beats
        '6/8': 6,   // 6 eighth note beats
        '9/8': 9    // 9 eighth note beats
    };
    
    if (!(timeSignature in expectedBeats)) {
        throw new Error(`Unsupported time signature for validation: ${timeSignature}`);
    }
    
    return expectedBeats[timeSignature];
}

/**
 * Validate a single option (all its measures)
 * @param {Object} option - Question option with measure1, measure2, etc.
 * @param {number} questionIndex - Question number (1-based)
 * @param {number} optionIndex - Option number (0-based)
 * @returns {boolean} True if valid, throws error if invalid
 */
function validateSingleOption(option, questionIndex, optionIndex) {
    if (!option) {
        throw new Error(`Question ${questionIndex}, Option ${optionIndex}: Option is null/undefined`);
    }
    
    // Default to 4/4 if no time signature specified
    const timeSignature = option.timeSignature || '4/4';
    const expectedBeats = getExpectedBeats(timeSignature);
    
    // Check required measures
    if (!option.measure1 || !option.measure2) {
        throw new Error(`Question ${questionIndex}, Option ${optionIndex}: Missing required measure1 or measure2`);
    }
    
    // Validate each measure
    const measures = ['measure1', 'measure2'];
    
    // Check for 4-measure questions
    if (option.measure3 && option.measure4) {
        measures.push('measure3', 'measure4');
    } else if (option.measure3 || option.measure4) {
        throw new Error(`Question ${questionIndex}, Option ${optionIndex}: Incomplete 4-measure question (has measure3 XOR measure4)`);
    }
    
    for (const measureName of measures) {
        const measure = option[measureName];
        if (!measure || !Array.isArray(measure) || measure.length === 0) {
            throw new Error(`Question ${questionIndex}, Option ${optionIndex}: ${measureName} is empty or invalid`);
        }
        
        try {
            const actualBeats = calculateBeatCount(measure, timeSignature);
            
            if (actualBeats !== expectedBeats) {
                throw new Error(
                    `Question ${questionIndex}, Option ${optionIndex}, ${measureName}: ` +
                    `Beat count mismatch in ${timeSignature} time. ` +
                    `Expected ${expectedBeats}, got ${actualBeats}. ` +
                    `Notes: ${measure.map(n => `${n.keys?.[0] || 'rest'}(${n.duration})`).join(', ')}`
                );
            }
        } catch (error) {
            // Re-throw with context
            throw new Error(`Question ${questionIndex}, Option ${optionIndex}, ${measureName}: ${error.message}`);
        }
    }
    
    return true;
}

/**
 * Validate an entire question set (all 6 options)
 * @param {Array} questionSet - Array of 6 options
 * @param {number} questionIndex - Question number (1-based)
 * @returns {boolean} True if valid, throws error if invalid
 */
function validateEntireQuestionSet(questionSetIndex, questionSet) {
    const questionNumber = questionSetIndex + 1;
    
    if (!questionSet || !Array.isArray(questionSet)) {
        throw new Error(`Question ${questionNumber}: Question set is not a valid array`);
    }
    
    if (questionSet.length !== 6) {
        throw new Error(`Question ${questionNumber}: Must have exactly 6 options, found ${questionSet.length}`);
    }
    
    // Validate each option
    for (let optionIndex = 0; optionIndex < 6; optionIndex++) {
        validateSingleOption(questionSet[optionIndex], questionNumber, optionIndex);
    }
    
    return true;
}

function validateAllQuestions() {
    console.log('🔍 Running BULLETPROOF beat validation on ALL questions...\n');
    
    let totalErrors = 0;
    let errorDetails = [];
    
    try {
        // Validate each question set
        for (let questionSetIndex = 0; questionSetIndex < allQuestionSets.length; questionSetIndex++) {
            const questionSet = allQuestionSets[questionSetIndex];
            const questionNumber = questionSetIndex + 1;
            
            try {
                validateEntireQuestionSet(questionSetIndex, questionSet);
                console.log(`✅ Question ${questionNumber}: All 6 options have correct beat counts`);
            } catch (error) {
                totalErrors++;
                errorDetails.push(`❌ ${error.message}`);
                console.error(`❌ Question ${questionNumber}: ${error.message}`);
            }
        }
        
        // Summary
        console.log('\n📊 BULLETPROOF VALIDATION RESULTS:');
        console.log(`Total Questions Validated: ${allQuestionSets.length}`);
        console.log(`Questions with Errors: ${totalErrors}`);
        console.log(`Valid Questions: ${allQuestionSets.length - totalErrors}`);
        
        if (totalErrors > 0) {
            console.error('\n❌❌❌ CRITICAL VALIDATION FAILURES ❌❌❌');
            console.error('The following questions have INCORRECT BEAT COUNTS and will NOT work:');
            errorDetails.forEach(error => console.error(error));
            console.error('\n⚠️  NO QUESTIONS WITH WRONG BEAT COUNTS CAN BE USED! ⚠️');
            
            // Throw error to prevent app from working with invalid data
            throw new Error(`VALIDATION FAILED: ${totalErrors} questions have incorrect beat counts. Fix these before proceeding.`);
        } else {
            console.log('\n✅✅✅ VALIDATION PASSED ✅✅✅');
            console.log('ALL questions have correct beat counts in all measures!');
        }
        
    } catch (error) {
        console.error('❌ FATAL VALIDATION ERROR:', error.message);
        throw error;
    }
    
    return totalErrors === 0;
}

// Developer functions
function toggleDevMode() {
    const devControls = document.getElementById('devControls');
    const devToggle = document.getElementById('devToggle');
    
    if (devControls.style.display === 'none') {
        devControls.style.display = 'block';
        devToggle.style.display = 'none';
    } else {
        devControls.style.display = 'none';
        devToggle.style.display = 'block';
    }
}

function skipToQuestionSet(setIndex) {
    if (setIndex < 0 || setIndex >= allQuestionSets.length) {
        console.error(`Invalid question set index: ${setIndex}`);
        return;
    }
    
    // Reset everything
    currentQuestionSet = setIndex;
    currentCorrectOption = 0;
    questionOptions = allQuestionSets[currentQuestionSet];
    selectedOption = null;
    
    // Reset UI
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected', 'correct', 'incorrect');
        opt.style.pointerEvents = 'auto';
    });
    document.getElementById('submitButton').disabled = true;
    
    // Hide next button if visible
    const nextBtn = document.getElementById('nextButton');
    if (nextBtn) nextBtn.style.display = 'none';
    
    // Generate new question
    generateOptions();
    
    console.log(`Skipped to Question Set ${setIndex + 1}`);
}

// Initialize the app
window.onload = function() {
    // Wait a bit for VexFlow and Tone.js to fully load
    setTimeout(() => {
        if (typeof Vex !== 'undefined') {
            VF = Vex.Flow;
            console.log('VexFlow loaded successfully');
            
            // Initialize with first question set
            currentQuestionSet = 0;
            questionOptions = allQuestionSets[currentQuestionSet];
            usedQuestionSets.push(0); // Mark first set as used
            
            generateOptions();
            
            // Run validation on all questions
            console.log('Running validation on all questions...');
            validateAllQuestions();
            validateAllQuestionSets();
            
            // Load piano samples if Tone.js is available
            if (typeof Tone !== 'undefined') {
                console.log('Loading piano samples...');
                loadPiano();
            }
        } else {
            console.error('VexFlow failed to load');
            document.getElementById('optionsContainer').innerHTML = '<p>Error: VexFlow library failed to load</p>';
        }
    }, 100);
};

// ===== FIREBASE REAL-TIME VOTING SYSTEM =====

// Global variables for voting
let currentRoomCode = null;
let isTeacher = false;
let votingEnabled = false;

// Generate random room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create a new room (teacher only)
async function createRoom() {
    if (!window.firebase) {
        alert('Firebase not loaded yet. Please wait and try again.');
        return;
    }
    
    currentRoomCode = generateRoomCode();
    isTeacher = true;
    
    const roomData = {
        created: window.firebase.serverTimestamp(),
        currentQuestion: currentQuestionSet + 1,
        votingEnabled: false,
        votes: {},
        totalStudents: 0
    };
    
    try {
        await window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}`), roomData);
        console.log('Room created:', currentRoomCode);
        updateRoomDisplay();
        showTeacherControls();
    } catch (error) {
        console.error('Error creating room:', error);
        alert('Error creating room. Please try again.');
    }
}

// Student functionality moved to student.html

// Enable/disable voting (teacher only)
async function toggleVoting() {
    if (!isTeacher || !currentRoomCode) return;
    
    votingEnabled = !votingEnabled;
    
    try {
        await window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}/votingEnabled`), votingEnabled);
        await window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}/currentQuestion`), currentQuestionSet + 1);
        
        if (votingEnabled) {
            // Clear previous votes
            await window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}/votes`), {});
        }
        
        updateTeacherControls();
    } catch (error) {
        console.error('Error toggling voting:', error);
    }
}

// Auto-enable voting for current question (when play button is pressed)
async function enableVotingForCurrentQuestion() {
    if (!isTeacher || !currentRoomCode || votingEnabled) return; // Don't reset if already enabled
    
    votingEnabled = true;
    
    try {
        await window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}/votingEnabled`), true);
        await window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}/currentQuestion`), currentQuestionSet + 1);
        
        // Only clear votes if this is the first time voting is enabled for this question
        await window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}/votes`), {});
        
        updateTeacherControls();
        console.log('Voting auto-enabled for question', currentQuestionSet + 1);
    } catch (error) {
        console.error('Error enabling voting:', error);
    }
}

// Reset voting when changing questions
async function resetVotingForNewQuestion() {
    if (!isTeacher || !currentRoomCode) return;
    
    votingEnabled = false;
    
    try {
        await window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}/votingEnabled`), false);
        await window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}/currentQuestion`), currentQuestionSet + 1);
        await window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}/questionChanged`), Date.now());
        await window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}/votes`), {});
        
        updateTeacherControls();
        console.log('Voting reset for new question', currentQuestionSet + 1);
    } catch (error) {
        console.error('Error resetting voting:', error);
    }
}

// Submit vote (student only)
async function submitVote(optionIndex) {
    if (isTeacher || !currentRoomCode || !votingEnabled) return;
    
    const studentId = localStorage.getItem('studentId') || generateStudentId();
    
    try {
        await window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}/votes/${studentId}`), {
            vote: optionIndex,
            timestamp: window.firebase.serverTimestamp()
        });
        
        console.log('Vote submitted:', optionIndex);
        highlightStudentVote(optionIndex);
    } catch (error) {
        console.error('Error submitting vote:', error);
    }
}

// Generate unique student ID
function generateStudentId() {
    const id = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('studentId', id);
    return id;
}

// Listen to room updates
function listenToRoomUpdates() {
    if (!currentRoomCode) return;
    
    window.firebase.onValue(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}`), (snapshot) => {
        if (snapshot.exists()) {
            const roomData = snapshot.val();
            votingEnabled = roomData.votingEnabled || false;
            
            // Only handle teacher interface (students use student.html)
            updateVoteDisplay(roomData.votes || {}, roomData.students || {});
            updateTeacherControls();
        }
    });
}

// Update vote display for teacher
function updateVoteDisplay(votes, students) {
    const voteContainer = document.getElementById('voteResults');
    if (!voteContainer) return;
    
    const voteCounts = [0, 0, 0, 0, 0, 0]; // 6 options
    const totalVotes = Object.keys(votes).length;
    const totalStudents = students ? Object.keys(students).length : 0;
    
    Object.values(votes).forEach(vote => {
        if (vote.vote >= 0 && vote.vote < 6) {
            voteCounts[vote.vote]++;
        }
    });
    
    // Check if all students have voted
    const allVotesIn = totalStudents > 0 && totalVotes >= totalStudents;
    
    voteContainer.innerHTML = `
        <div class="vote-summary">
            <h3>Live Vote Results (${totalVotes}/${totalStudents} votes)</h3>
            ${allVotesIn ? '<div class="all-votes-in">🎉 All votes are in!</div>' : ''}
            ${voteCounts.map((count, index) => `
                <div class="vote-bar">
                    <span>Option ${String.fromCharCode(65 + index)}: ${count} votes</span>
                    <div class="bar">
                        <div class="fill" style="width: ${totalVotes > 0 ? (count / totalVotes) * 100 : 0}%"></div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Auto-reveal answer when all votes are in
    if (allVotesIn && votingEnabled) {
        setTimeout(() => {
            revealCorrectAnswer();
            // Auto-advance to next question after showing answer
            setTimeout(() => {
                autoAdvanceToNextQuestion();
            }, 4000); // Wait 4 seconds to show the correct answer, then advance
        }, 2000); // Wait 2 seconds to show the "all votes in" message
    }
}

// Student interface moved to student.html

// Student voting moved to student.html

// Reveal correct answer automatically
function revealCorrectAnswer() {
    // Disable voting first
    votingEnabled = false;
    if (currentRoomCode && isTeacher) {
        window.firebase.set(window.firebase.ref(window.firebase.database, `rooms/${currentRoomCode}/votingEnabled`), false);
    }
    
    // Highlight the correct answer
    const options = document.querySelectorAll('.option');
    options.forEach((option, index) => {
        option.classList.remove('selected', 'correct', 'incorrect');
        if (index === correctAnswer) {
            option.classList.add('correct');
        }
    });
    
    // Show feedback message
    showFeedback(true);
    
    console.log('Correct answer revealed automatically');
}

// Auto-advance to next question and reset UI
function autoAdvanceToNextQuestion() {
    console.log('Auto-advancing to next question...');
    
    // Reset selected option
    selectedOption = null;
    
    // Clear all highlighting and reset UI
    const options = document.querySelectorAll('.option');
    options.forEach(option => {
        option.classList.remove('selected', 'correct', 'incorrect');
        option.style.pointerEvents = 'auto';
    });
    
    // Hide feedback
    const feedbackPanel = document.getElementById('feedbackPanel');
    if (feedbackPanel) {
        feedbackPanel.style.opacity = '0';
        feedbackPanel.style.pointerEvents = 'none';
    }
    
    // Reset submit button
    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
        submitButton.disabled = true; // Will be enabled when new melody is played
    }
    
    // Hide any next button that might be showing
    const nextBtn = document.getElementById('nextButton');
    if (nextBtn) nextBtn.style.display = 'none';
    
    // Move to next question
    const newQuestionSet = currentQuestionSet < allQuestionSets.length - 1 ? currentQuestionSet + 1 : 0;
    skipToQuestionSet(newQuestionSet);
    generateOptions();
    updateQuestionCounter();
    
    // Reset voting for new question
    resetVotingForNewQuestion();
    
    console.log('Advanced to question set:', newQuestionSet + 1);
}

// Update room display
function updateRoomDisplay() {
    const roomDisplay = document.getElementById('roomDisplay');
    if (roomDisplay && currentRoomCode) {
        roomDisplay.innerHTML = `
            <div class="room-info">
                <strong>Room Code: ${currentRoomCode}</strong>
                <span class="role">(${isTeacher ? 'Teacher' : 'Student'})</span>
            </div>
        `;
        roomDisplay.style.display = 'block';
    }
}

// Show teacher controls
function showTeacherControls() {
    let teacherControls = document.getElementById('teacherControls');
    if (!teacherControls) {
        teacherControls = document.createElement('div');
        teacherControls.id = 'teacherControls';
        teacherControls.innerHTML = `
            <div class="teacher-panel">
                <h3>Teacher Controls</h3>
                <p style="color: rgba(255, 255, 255, 0.8); font-size: 0.9rem; margin: 10px 0;">
                    Voting auto-enables when you press "Play Melody"
                </p>
                <button id="toggleVotingBtn" onclick="toggleVoting()">Manual Toggle</button>
                <div id="voteResults"></div>
            </div>
        `;
        document.querySelector('.container').appendChild(teacherControls);
    }
    teacherControls.style.display = 'block';
    listenToRoomUpdates();
}

// Student controls moved to student.html

// Update teacher controls
function updateTeacherControls() {
    const toggleBtn = document.getElementById('toggleVotingBtn');
    if (toggleBtn) {
        toggleBtn.textContent = votingEnabled ? 'Disable Voting' : 'Enable Voting';
        toggleBtn.className = votingEnabled ? 'voting-active' : '';
    }
}