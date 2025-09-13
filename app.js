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

// Define all 10 question sets (each with 6 very similar options)
const allQuestionSets = [
    // QUESTION SET 1 (Treble Clef) - Current question
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
    // Option 1: Different rhythm - C quarter D quarter E quarter F quarter | G quarter F quarter E half
    {
        measure1: [
            { keys: ['c/4'], duration: 'q' },   // 1 beat 
            { keys: ['d/4'], duration: 'q' },   // 1 beat 
            { keys: ['e/4'], duration: 'q' },   // 1 beat
            { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
        ],
        measure2: [
            { keys: ['g/4'], duration: 'q' },   // 1 beat
            { keys: ['f/4'], duration: 'q' },   // 1 beat
            { keys: ['e/4'], duration: 'h' }    // 2 beats = 4 total
        ]
    },
    // Option 2: Different notes - C half note D quarter F quarter | G quarter F quarter E half
    {
        measure1: [
            { keys: ['c/4'], duration: 'h' },  // 2 beats
            { keys: ['d/4'], duration: 'q' },  // 1 beat
            { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total (E becomes F)
        ],
        measure2: [
            { keys: ['g/4'], duration: 'q' },  // 1 beat
            { keys: ['f/4'], duration: 'q' },  // 1 beat
            { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
        ]
    },
    // Option 3: Different rhythm - C quarter D quarter E half | F quarter G quarter E half  
    {
        measure1: [
            { keys: ['c/4'], duration: 'q' },  // 1 beat
            { keys: ['d/4'], duration: 'q' },  // 1 beat
            { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
        ],
        measure2: [
            { keys: ['f/4'], duration: 'q' },  // 1 beat
            { keys: ['g/4'], duration: 'q' },  // 1 beat
            { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
        ]
    },
    // Option 4: Different ending - C half note D quarter E quarter | F quarter G quarter D half
    {
        measure1: [
            { keys: ['c/4'], duration: 'h' },  // 2 beats
            { keys: ['d/4'], duration: 'q' },  // 1 beat
            { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
        ],
        measure2: [
            { keys: ['f/4'], duration: 'q' },  // 1 beat
            { keys: ['g/4'], duration: 'q' },  // 1 beat
            { keys: ['d/4'], duration: 'h' }   // 2 beats = 4 total (E becomes D)
        ]
    },
    // Option 5: Different rhythm - C half note D half note | F quarter G quarter E half
    {
        measure1: [
            { keys: ['c/4'], duration: 'h' },  // 2 beats
            { keys: ['d/4'], duration: 'h' }   // 2 beats = 4 total
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
        // Option 1: C quarter E quarter D half | F quarter G quarter C half (D/E swap)
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat  
                { keys: ['d/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: C quarter D quarter E half | G quarter F quarter C half (F/G swap)
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat  
                { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: C half D quarter E quarter | F quarter G quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats
                { keys: ['d/4'], duration: 'q' },  // 1 beat  
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: C quarter D quarter E half | F quarter G quarter E half (ending change)
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat  
                { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: C quarter D quarter E half | F half C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat  
                { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'h' },  // 2 beats
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
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

    // QUESTION SET 5 (Treble Clef) - C major melody
    [
        // Option 0: CORRECT - C quarter D quarter E quarter F quarter | G quarter F quarter C half
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
        // Option 1: C quarter E quarter D quarter F quarter | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: C quarter D quarter E quarter F quarter | F quarter G quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 3: C half E quarter F quarter | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats
                { keys: ['e/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 4: C quarter D quarter E quarter F quarter | G quarter F quarter D half
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
                { keys: ['d/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 5: C quarter D quarter F quarter E quarter | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['e/4'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
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
    ] // End of Question Set 11
];
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
        // Create renderer with maximum width for TV screen visibility
        const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
        renderer.resize(420, 100);
        const context = renderer.getContext();
        
        // Create separate staves for each measure - first measure longer for clef and time signature
        const stave1 = new VF.Stave(5, -10, 220);
        const clefType = option.clef || 'treble';
        stave1.addClef(clefType).addTimeSignature('4/4');
        stave1.setContext(context).draw();
        
        const stave2 = new VF.Stave(225, -10, 170);
        // No clef or time signature for second measure
        stave2.setContext(context).draw();
        
        // Debug: Calculate beat counts
        const calculateBeats = (notes) => {
            const beatMap = { 'w': 4, 'h': 2, 'q': 1, 'qr': 1, 'qd': 1.5, '8': 0.5 };
            return notes.reduce((total, note) => total + (beatMap[note.duration] || 0), 0);
        };
        
        const beats1 = calculateBeats(option.measure1);
        const beats2 = calculateBeats(option.measure2);
        console.log(`Container: ${containerId}, Measure 1 beats: ${beats1}, Measure 2 beats: ${beats2}`);
        
        if (beats1 !== 4 || beats2 !== 4) {
            throw new Error(`Invalid beat count: M1=${beats1}, M2=${beats2}`);
        }
        
        // Create notes for measure 1
        const notes1 = option.measure1.map(note => {
            if (note.duration.includes('r')) {
                return new VF.StaveNote({ keys: ['b/4'], duration: note.duration, clef: clefType });
            }
            const staveNote = new VF.StaveNote({ keys: note.keys, duration: note.duration, clef: clefType });
            
            // Add dots for dotted notes
            if (note.duration === 'qd') {
                staveNote.addModifier(new VF.Dot(), 0);
            }
            
            // Set stem direction based on note position and clef
            if (clefType === 'bass') {
                const noteKey = note.keys[0];
                if (noteKey === 'c/3' || noteKey === 'a/2' || noteKey === 'b/2') {
                    staveNote.setStemDirection(VF.Stem.UP);
                } else {
                    staveNote.setStemDirection(VF.Stem.DOWN);
                }
            } else {
                // Treble clef stem directions (middle line is B4)
                const noteKey = note.keys[0];
                if (noteKey === 'c/4' || noteKey === 'd/4' || noteKey === 'e/4' || 
                    noteKey === 'f/4' || noteKey === 'g/4' || noteKey === 'a/4') {
                    staveNote.setStemDirection(VF.Stem.UP);
                } else {
                    staveNote.setStemDirection(VF.Stem.DOWN);
                }
            }
            
            return staveNote;
        });
        
        // Create notes for measure 2  
        const notes2 = option.measure2.map(note => {
            if (note.duration.includes('r')) {
                return new VF.StaveNote({ keys: ['b/4'], duration: note.duration, clef: clefType });
            }
            const staveNote = new VF.StaveNote({ keys: note.keys, duration: note.duration, clef: clefType });
            
            // Add dots for dotted notes
            if (note.duration === 'qd') {
                staveNote.addModifier(new VF.Dot(), 0);
            }
            
            // Set stem direction based on note position and clef
            if (clefType === 'bass') {
                const noteKey = note.keys[0];
                if (noteKey === 'c/3' || noteKey === 'a/2' || noteKey === 'b/2') {
                    staveNote.setStemDirection(VF.Stem.UP);
                } else {
                    staveNote.setStemDirection(VF.Stem.DOWN);
                }
            } else {
                // Treble clef stem directions (middle line is B4)
                const noteKey = note.keys[0];
                if (noteKey === 'c/4' || noteKey === 'd/4' || noteKey === 'e/4' || 
                    noteKey === 'f/4' || noteKey === 'g/4' || noteKey === 'a/4') {
                    staveNote.setStemDirection(VF.Stem.UP);
                } else {
                    staveNote.setStemDirection(VF.Stem.DOWN);
                }
            }
            
            return staveNote;
        });
        
        // Create voices - one for each measure
        const voice1 = new VF.Voice({ num_beats: 4, beat_value: 4 }).setStrict(true);
        const voice2 = new VF.Voice({ num_beats: 4, beat_value: 4 }).setStrict(true);
        
        voice1.addTickables(notes1);
        voice2.addTickables(notes2);
        
        // Create beams for eighth notes
        const beams1 = VF.Beam.generateBeams(notes1.filter(note => note.getDuration() === '8'));
        const beams2 = VF.Beam.generateBeams(notes2.filter(note => note.getDuration() === '8'));
        
        // Format and draw each measure independently 
        VF.Formatter.FormatAndDraw(context, stave1, notes1);
        VF.Formatter.FormatAndDraw(context, stave2, notes2);
        
        // Draw beams
        beams1.forEach(beam => beam.setContext(context).draw());
        beams2.forEach(beam => beam.setContext(context).draw());
        
    } catch (error) {
        console.error('Error creating notation:', error);
        container.innerHTML = `<p>Error: ${error.message}</p>`;
    }
}

function generateOptions() {
    // Create shuffled version of options with one designated as correct
    shuffleOptionsForNewQuestion();
    
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    
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
    
    // Update question header
    updateQuestionHeader();
}

function shuffleOptionsForNewQuestion() {
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
        const clefType = questionOptions[0].clef || 'treble';
        const clefIcon = clefType === 'bass' ? '𝄢' : '𝄞';
        header.textContent = `Music Dictation - Set ${currentQuestionSet + 1}, Question ${currentCorrectOption + 1} of 6 ${clefIcon}`;
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
    
    // Disable submit button and show next question button
    document.getElementById('submitButton').disabled = true;
    
    // Show result and next question option
    const result = selectedOption === correctAnswer ? 'Correct!' : `Incorrect. The correct answer was Option ${String.fromCharCode(65 + correctAnswer)}.`;
    const nextQuestionText = currentCorrectOption < 5 ? '\n\nClick "Next Question" to continue.' : '\n\nYou\'ve completed all 6 variations!';
    
    alert(result + nextQuestionText);
    
    // Show next question button if not at the end
    if (currentCorrectOption < 5) {
        showNextQuestionButton();
    }
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
        // Play the audio for the current correct answer
        const correctOption = shuffledOptions[correctAnswer];
        const allNotes = [...correctOption.measure1, ...correctOption.measure2];
        
        console.log('Playing MIDI-generated piano audio');
        
        if (typeof Tone !== 'undefined' && piano) {
            playMIDIWithPiano(allNotes);
        } else {
            // Fallback to Web Audio
            playWithWebAudio(allNotes);
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
        'c/4': 'C4',
        'd/4': 'D4', 
        'e/4': 'E4',
        'f/4': 'F4',
        'g/4': 'G4'
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
        // Treble clef notes
        'c/4': 261.63,  // C4
        'd/4': 293.66,  // D4
        'e/4': 329.63,  // E4
        'f/4': 349.23,  // F4
        'g/4': 392.00,  // G4
        'a/4': 440.00,  // A4
        // Bass clef notes (C3-G3 on staff lines and spaces)
        'c/3': 130.81,  // C3 - second space in bass clef
        'd/3': 146.83,  // D3 - third line in bass clef
        'e/3': 164.81,  // E3 - third space in bass clef
        'f/3': 174.61,  // F3 - fourth line in bass clef
        'g/3': 196.00   // G3 - fourth space in bass clef
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
    return durationMap[duration] || 0.5;
}

// Simple question navigation functions
function previousQuestion() {
    const newQuestionSet = currentQuestionSet > 0 ? currentQuestionSet - 1 : allQuestionSets.length - 1;
    skipToQuestionSet(newQuestionSet);
    generateOptions();
    updateQuestionCounter();
}

function nextQuestion() {
    const newQuestionSet = currentQuestionSet < allQuestionSets.length - 1 ? currentQuestionSet + 1 : 0;
    skipToQuestionSet(newQuestionSet);
    generateOptions();
    updateQuestionCounter();
}

function updateQuestionCounter() {
    const counter = document.getElementById('questionCounter');
    if (counter) {
        counter.textContent = `Question ${currentQuestionSet + 1} of ${allQuestionSets.length}`;
    }
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