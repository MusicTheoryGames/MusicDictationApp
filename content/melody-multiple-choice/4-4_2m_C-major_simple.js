// questions_4-4_2m_C-major_simple.js
// Time Signature: 4/4
// Measures: 2
// Key: C major
// Complexity: simple
// Questions: Q1-Q10

var questions_4_4_2m_C_major_simple = [
    // Question 1 (Treble Clef) - C major challenging melodic dictation (same rhythm, subtle pitch changes)
    [
        // Option 0: CORRECT ANSWER - C half note, D quarter E quarter | F quarter G quarter E half note
        {
            timeSignature: '4/4',
            clef: 'treble',
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
        // Option 1: Note change + subtle rhythm change
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },
                { keys: ['g/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'h' }
            ]
        },
        // Option 2: Note change + subtle rhythm change
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'h' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },
                { keys: ['g/4'], duration: '8' },
                { keys: ['e/4'], duration: 'hd' }
            ]
        },
        // Option 3: One note change
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'h' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },
                { keys: ['g/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'h' }
            ]
        },
        // Option 4: One note change
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'h' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },
                { keys: ['g/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'h' }
            ]
        },
        // Option 5: Note change + subtle rhythm change
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'h' }
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },
                { keys: ['g/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'h' }
            ]
        }
    ], // End of Question 1

    // Question 2 (Bass Clef) - C major melody using proper bass clef staff positions
    [
        // Option 0: CORRECT - C half D quarter E quarter | F quarter G quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        },
        // Option 1
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        },
        // Option 2
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        },
        // Option 3
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'h' }
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        },
        // Option 4
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'h' }
            ]
        },
        // Option 5
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },
                { keys: ['d/3'], duration: 'h' }
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        }
    ], // End of Question 2

    // Question 3 (Treble Clef) - Clear C major tonality starting and ending on C
    [
        // Option 0: CORRECT - C quarter D quarter E half | F quarter G quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
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
        // Option 1: Note change + subtle rhythm change - C eighth D eighth E eighth E eighth F quarter | F quarter G quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: '8' },  // 0.5 beats
                { keys: ['d/4'], duration: '8' },  // 0.5 beats
                { keys: ['e/4'], duration: '8' },  // 0.5 beats
                { keys: ['e/4'], duration: '8' },  // 0.5 beats
                { keys: ['f/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['c/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 2: Note change + subtle rhythm change - C quarter D quarter F half | F eighth G eighth C dotted half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'q' },  // 1 beat
                { keys: ['f/4'], duration: 'h' }   // 2 beats (E becomes F) = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },  // 0.5 beats
                { keys: ['g/4'], duration: '8' },  // 0.5 beats
                { keys: ['c/4'], duration: 'hd' }  // 3 beats (dotted half) = 4 total
            ]
        },
        // Option 3: Swap F and G - C quarter D quarter E half | G quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
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
            timeSignature: '4/4',
            clef: 'treble',
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
        // Option 5: Note change + subtle rhythm change - C half E half | F quarter G quarter D half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'h' },  // 2 beats
                { keys: ['e/4'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // 1 beat
                { keys: ['g/4'], duration: 'q' },  // 1 beat
                { keys: ['d/4'], duration: 'h' }   // 2 beats = 4 total
            ]
        }
    ], // End of Question 3

    // Question 4 (Bass Clef) - C major melody using proper bass clef staff positions
    [
        // Option 0: CORRECT - G quarter F quarter E quarter C quarter | D quarter C quarter G half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' },  // 1 beat
                { keys: ['g/3'], duration: 'h' }   // 2 beats = 4 total
            ]
        },
        // Option 1: Different ending - G quarter F quarter E quarter C quarter | D quarter C quarter F half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'h' }   // G becomes F
            ]
        },
        // Option 2: Rhythm change - G half E quarter C quarter | D quarter C quarter G half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'h' },  // 2 beats
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['c/3'], duration: 'q' }   // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'h' }
            ]
        },
        // Option 3: Note change - F quarter E quarter D quarter C quarter | D quarter C quarter G half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },  // G becomes F
                { keys: ['e/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },  // E becomes D
                { keys: ['c/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'h' }
            ]
        },
        // Option 4: Different starting pattern - G quarter F quarter D quarter E quarter | D quarter C quarter G half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },  // E becomes D
                { keys: ['e/3'], duration: 'q' }   // C becomes E
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'h' }
            ]
        },
        // Option 5: Rhythm + note change - G eighth F eighth E half | D quarter C quarter G half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: '8' },  // 0.5 beats
                { keys: ['f/3'], duration: '8' },  // 0.5 beats
                { keys: ['e/3'], duration: 'hd' }  // 3 beats = 4 total
            ],
            measure2: [
                { keys: ['d/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'h' }
            ]
        }
    ], // End of Question 4

    // Question 5 (Treble Clef) - C major melody - CHALLENGING: Same rhythm, subtle pitch changes only
    [
        // Option 0: CORRECT ANSWER - C quarter D quarter E quarter F quarter | G quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
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
        // Option 1: One note change - C quarter D quarter E quarter G quarter | G quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },
                { keys: ['g/4'], duration: 'q' }   // F becomes G
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'h' }
            ]
        },
        // Option 2: One note change - C quarter D quarter F quarter F quarter | G quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' },  // E becomes F
                { keys: ['f/4'], duration: 'q' }   // F stays F
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'h' }
            ]
        },
        // Option 3: One note change - C quarter D quarter E quarter F quarter | G quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },  // F becomes E
                { keys: ['c/4'], duration: 'h' }
            ]
        },
        // Option 4: One note change - C quarter E quarter E quarter F quarter | G quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },  // D becomes E
                { keys: ['e/4'], duration: 'q' },  // E stays E
                { keys: ['f/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'h' }
            ]
        },
        // Option 5: One note change - C quarter D quarter E quarter F quarter | G quarter F quarter D half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'h' }   // C becomes D
            ]
        }
    ], // End of Question 5

    // Question 6 (Bass Clef) - C major melody
    [
        // Option 0: CORRECT - C quarter D quarter E quarter G quarter | F quarter E quarter C half
        {
            timeSignature: '4/4',
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
        // Option 1: Note change - C quarter D quarter F quarter G quarter | F quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' },  // E becomes F
                { keys: ['g/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        },
        // Option 2: Note change - C quarter D quarter E quarter F quarter | F quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' }   // G becomes F
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        },
        // Option 3: Note change - C quarter D quarter E quarter G quarter | G quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },  // F becomes G
                { keys: ['e/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        },
        // Option 4: Note change - C quarter E quarter E quarter G quarter | F quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },  // D becomes E
                { keys: ['e/3'], duration: 'q' },  // E stays E
                { keys: ['g/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        },
        // Option 5: Note change - C quarter D quarter E quarter G quarter | F quarter D quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },  // E becomes D
                { keys: ['c/3'], duration: 'h' }
            ]
        }
    ], // End of Question 6

    // Question 7 (Treble Clef) - C major melody
    [
        // Option 0: CORRECT - C quarter E quarter G quarter F quarter | E quarter D quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
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
        // Option 1: Note change - C quarter E quarter F quarter F quarter | E quarter D quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' },  // G becomes F
                { keys: ['f/4'], duration: 'q' }   // F stays F
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'h' }
            ]
        },
        // Option 2: Note change - C quarter D quarter G quarter F quarter | E quarter D quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },  // E becomes D
                { keys: ['g/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'h' }
            ]
        },
        // Option 3: Note change - C quarter E quarter G quarter E quarter | E quarter D quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },
                { keys: ['g/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' }   // F becomes E
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'h' }
            ]
        },
        // Option 4: Note change - C quarter E quarter G quarter F quarter | F quarter D quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },
                { keys: ['g/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },  // E becomes F
                { keys: ['d/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'h' }
            ]
        },
        // Option 5: Note change - C quarter E quarter G quarter F quarter | E quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },
                { keys: ['g/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },  // D becomes E
                { keys: ['c/4'], duration: 'h' }
            ]
        }
    ], // End of Question 7

    // Question 8 (Bass Clef) - C major melody
    [
        // Option 0: CORRECT - G quarter F quarter E quarter D quarter | C quarter D quarter G half
        {
            timeSignature: '4/4',
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
        // Option 1: Note change - F quarter F quarter E quarter D quarter | C quarter D quarter G half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },  // G becomes F
                { keys: ['f/3'], duration: 'q' },  // F stays F
                { keys: ['e/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'h' }
            ]
        },
        // Option 2: Note change - G quarter F quarter D quarter D quarter | C quarter D quarter G half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },  // E becomes D
                { keys: ['d/3'], duration: 'q' }   // D stays D
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'h' }
            ]
        },
        // Option 3: Note change - G quarter F quarter E quarter C quarter | C quarter D quarter G half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'q' }   // D becomes C
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'h' }
            ]
        },
        // Option 4: Note change - G quarter F quarter E quarter D quarter | E quarter D quarter G half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },  // C becomes E
                { keys: ['d/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'h' }
            ]
        },
        // Option 5: Note change - G quarter F quarter E quarter D quarter | C quarter E quarter G half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' },  // D becomes E
                { keys: ['g/3'], duration: 'h' }
            ]
        }
    ], // End of Question 8

    // Question 9 (Treble Clef) - C major melody
    [
        // Option 0: CORRECT - G quarter E quarter D quarter C quarter | E quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
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
        // Option 1: Note change - F quarter E quarter D quarter C quarter | E quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['f/4'], duration: 'q' },  // G becomes F
                { keys: ['e/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'h' }
            ]
        },
        // Option 2: Note change - G quarter D quarter D quarter C quarter | E quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['g/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },  // E becomes D
                { keys: ['d/4'], duration: 'q' },  // D stays D
                { keys: ['c/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'h' }
            ]
        },
        // Option 3: Note change - G quarter E quarter C quarter C quarter | E quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['g/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'q' },  // D becomes C
                { keys: ['c/4'], duration: 'q' }   // C stays C
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },
                { keys: ['f/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'h' }
            ]
        },
        // Option 4: Note change - G quarter E quarter D quarter C quarter | D quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['g/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['d/4'], duration: 'q' },  // E becomes D
                { keys: ['f/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'h' }
            ]
        },
        // Option 5: Note change - G quarter E quarter D quarter C quarter | E quarter G quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['g/4'], duration: 'q' },
                { keys: ['e/4'], duration: 'q' },
                { keys: ['d/4'], duration: 'q' },
                { keys: ['c/4'], duration: 'q' }
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },
                { keys: ['g/4'], duration: 'q' },  // F becomes G
                { keys: ['c/4'], duration: 'h' }
            ]
        }
    ], // End of Question 9

    // Question 10 (Bass Clef) - C major melody
    [
        // Option 0: CORRECT - C half D quarter E quarter | F quarter G quarter C half
        {
            timeSignature: '4/4',
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
        // Option 1: Rhythm change - C quarter D quarter E quarter F quarter | F quarter G quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat (half becomes quarter)
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'q' },  // 1 beat
                { keys: ['f/3'], duration: 'q' }   // 1 beat (new note) = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        },
        // Option 2: Note change - C half D quarter F quarter | F quarter G quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['f/3'], duration: 'q' }   // E becomes F
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        },
        // Option 3: Note change - C quarter D quarter E half | F quarter G quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },  // 1 beat (half becomes quarter)
                { keys: ['d/3'], duration: 'q' },  // 1 beat
                { keys: ['e/3'], duration: 'h' }   // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        },
        // Option 4: Note change - C half D quarter E quarter | F quarter G quarter D half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },
                { keys: ['d/3'], duration: 'q' },
                { keys: ['e/3'], duration: 'q' }
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'q' },
                { keys: ['d/3'], duration: 'h' }   // C becomes D
            ]
        },
        // Option 5: Rhythm change - C half D half | F quarter G quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'h' },  // 2 beats
                { keys: ['d/3'], duration: 'h' }   // 2 beats (quarter+quarter becomes half) = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },
                { keys: ['g/3'], duration: 'q' },
                { keys: ['c/3'], duration: 'h' }
            ]
        }
    ] // End of Question 10
];

// Export for browser compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = questions_4_4_2m_C_major_simple;
} else if (typeof window !== 'undefined') {
    window.questions_4_4_2m_C_major_simple = questions_4_4_2m_C_major_simple;
}