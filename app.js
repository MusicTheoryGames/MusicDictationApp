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
let playbackSpeed = 1.0; // Default normal speed (1.0x)

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
        // Option 0: CORRECT - C quarter D eighth E eighth F quarter | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C quarter E eighth D eighth F quarter | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C quarter D eighth E eighth G quarter | F quarter E quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C quarter D eighth E eighth F quarter | F quarter G quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C quarter D eighth E eighth F quarter | G quarter F quarter D half
        {
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C half D eighth E eighth F quarter | G quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'h' },   // 2 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
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

    // QUESTION SET 19 (Treble Clef) - C major with mixed complex rhythms
    [
        // Option 0: CORRECT - C eighth D eighth E eighth F eighth G eighth F eighth | E quarter C half
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
        // Option 1: C eighth E eighth D eighth F eighth G eighth F eighth E quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
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
        // Option 2: C eighth D eighth E eighth F eighth F eighth G eighth F quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C eighth D eighth E eighth F eighth G eighth F eighth | F quarter E quarter C half
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
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C eighth D eighth E eighth F eighth G eighth F eighth | E quarter D half
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
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: C dotted quarter D eighth E eighth F eighth G quarter | E quarter F quarter C half
        {
            measure1: [
                { keys: ['c/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
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
    ] // End of Question Set 30
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
            
            // Add sharp accidentals for G# notes
            if (note.keys[0].includes('#')) {
                staveNote.addModifier(new VF.Accidental('#'), 0);
            }
            
            // Set stem direction based on note position and clef
            if (clefType === 'bass') {
                const noteKey = note.keys[0];
                // Bass clef: notes below middle line (D3) go UP, on/above go DOWN
                if (noteKey === 'c/3' || noteKey === 'a/2' || noteKey === 'b/2' || noteKey === 'g#/2') {
                    staveNote.setStemDirection(VF.Stem.UP);
                } else {
                    // d/3, e/3, f/3, g/3, g#/3 and higher go DOWN
                    staveNote.setStemDirection(VF.Stem.DOWN);
                }
            } else {
                // Treble clef stem directions (middle line is B4)
                const noteKey = note.keys[0];
                // Notes below/on middle line (B4) go UP, above go DOWN
                if (noteKey === 'c/4' || noteKey === 'd/4' || noteKey === 'e/4' || 
                    noteKey === 'f/4' || noteKey === 'g/4' || noteKey === 'a/4' || 
                    noteKey === 'g#/4' || noteKey === 'b/4') {
                    staveNote.setStemDirection(VF.Stem.UP);
                } else {
                    // c/5, d/5, e/5, f/5, g/5 and higher go DOWN
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
            
            // Add sharp accidentals for G# notes
            if (note.keys[0].includes('#')) {
                staveNote.addModifier(new VF.Accidental('#'), 0);
            }
            
            // Set stem direction based on note position and clef
            if (clefType === 'bass') {
                const noteKey = note.keys[0];
                // Bass clef: notes below middle line (D3) go UP, on/above go DOWN
                if (noteKey === 'c/3' || noteKey === 'a/2' || noteKey === 'b/2' || noteKey === 'g#/2') {
                    staveNote.setStemDirection(VF.Stem.UP);
                } else {
                    // d/3, e/3, f/3, g/3, g#/3 and higher go DOWN
                    staveNote.setStemDirection(VF.Stem.DOWN);
                }
            } else {
                // Treble clef stem directions (middle line is B4)
                const noteKey = note.keys[0];
                // Notes below/on middle line (B4) go UP, above go DOWN
                if (noteKey === 'c/4' || noteKey === 'd/4' || noteKey === 'e/4' || 
                    noteKey === 'f/4' || noteKey === 'g/4' || noteKey === 'a/4' || 
                    noteKey === 'g#/4' || noteKey === 'b/4') {
                    staveNote.setStemDirection(VF.Stem.UP);
                } else {
                    // c/5, d/5, e/5, f/5, g/5 and higher go DOWN
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
        'g#/2': 'G#2',  // Leading tone for A minor bass clef
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
        'g#/2': 207.65, // G#2 - leading tone for A minor bass clef
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

// Beat Validation Script - CRITICAL for preventing beat count errors
function validateAllQuestions() {
    const beatMap = {
        'w': 4,     // whole note = 4 beats
        'h': 2,     // half note = 2 beats  
        'q': 1,     // quarter note = 1 beat
        'qd': 1.5,  // dotted quarter = 1.5 beats
        '8': 0.5,   // eighth note = 0.5 beats
        'qr': 1     // quarter rest = 1 beat
    };

    const calculateBeats = (notes) => {
        return notes.reduce((total, note) => total + (beatMap[note.duration] || 0), 0);
    };

    const errors = [];
    let totalQuestions = 0;
    let totalOptions = 0;
    
    allQuestionSets.forEach((questionSet, setIndex) => {
        totalQuestions++;
        questionSet.forEach((option, optionIndex) => {
            totalOptions++;
            const beats1 = calculateBeats(option.measure1);
            const beats2 = calculateBeats(option.measure2);
            
            if (beats1 !== 4) {
                errors.push(`Q${setIndex + 1} Option ${String.fromCharCode(65 + optionIndex)}: Measure 1 has ${beats1} beats (should be 4)`);
            }
            if (beats2 !== 4) {
                errors.push(`Q${setIndex + 1} Option ${String.fromCharCode(65 + optionIndex)}: Measure 2 has ${beats2} beats (should be 4)`);
            }
        });
    });

    console.log(`\n=== BEAT VALIDATION REPORT ===`);
    console.log(`Total Questions: ${totalQuestions}`);
    console.log(`Total Options: ${totalOptions}`);
    console.log(`Measures Checked: ${totalOptions * 2}`);

    if (errors.length === 0) {
        console.log(`✅ ALL QUESTIONS VALID - Every measure has exactly 4 beats!`);
        
        // Temporarily show validation result on page
        setTimeout(() => {
            const header = document.querySelector('.question-header h1');
            if (header) {
                header.textContent = `✅ All ${totalQuestions} Questions Valid - Melodic Dictation Easy`;
                header.style.color = '#27ae60';
            }
        }, 1000);
        
        return true;
    } else {
        console.log(`❌ BEAT COUNT ERRORS FOUND: ${errors.length}`);
        console.log(`\nERROR DETAILS:`);
        errors.forEach(error => console.error(`  ${error}`));
        
        // Show validation errors on page
        setTimeout(() => {
            const header = document.querySelector('.question-header h1');
            if (header) {
                header.textContent = `❌ Beat Errors Found: ${errors.length}`;
                header.style.color = '#e74c3c';
            }
        }, 1000);
        
        return false;
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
            
            // Run beat validation on existing questions
            console.log('Running beat validation on existing questions...');
            validateAllQuestions();
            
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
            updateVoteDisplay(roomData.votes || {});
            updateTeacherControls();
        }
    });
}

// Update vote display for teacher
function updateVoteDisplay(votes) {
    const voteContainer = document.getElementById('voteResults');
    if (!voteContainer) return;
    
    const voteCounts = [0, 0, 0, 0, 0, 0]; // 6 options
    const totalVotes = Object.keys(votes).length;
    
    Object.values(votes).forEach(vote => {
        if (vote.vote >= 0 && vote.vote < 6) {
            voteCounts[vote.vote]++;
        }
    });
    
    voteContainer.innerHTML = `
        <div class="vote-summary">
            <h3>Live Vote Results (${totalVotes} votes)</h3>
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
}

// Student interface moved to student.html

// Student voting moved to student.html

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
                <button id="toggleVotingBtn" onclick="toggleVoting()">Enable Voting</button>
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