// questions_4-4_2m_C-major_complex.js
// Time Signature: 4/4
// Measures: 2
// Key: C major
// Complexity: complex
// Questions: Q11-Q20

var questions_4_4_2m_C_major_complex = [
    // Question 11 (Treble Clef) - C major with dotted rhythms and eighth notes
    [
        // Option 0: CORRECT - C dotted quarter D eighth E quarter F quarter | G eighth G eighth F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
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
            timeSignature: '4/4',
            clef: 'treble',
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
            timeSignature: '4/4',
            clef: 'treble',
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
            timeSignature: '4/4',
            clef: 'treble',
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
            timeSignature: '4/4',
            clef: 'treble',
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
            timeSignature: '4/4',
            clef: 'treble',
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
    ], // End of Question 11

    // Question 12 (Bass Clef) - C major with dotted quarters and eighth notes
    [
        // Option 0: CORRECT - C dotted quarter D eighth E quarter F quarter | G quarter F quarter C half
        {
            timeSignature: '4/4',
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
            timeSignature: '4/4',
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
            timeSignature: '4/4',
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
            timeSignature: '4/4',
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
            timeSignature: '4/4',
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
            timeSignature: '4/4',
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
    ], // End of Question 12

    // Question 13 (Treble Clef) - C major with two eighth notes patterns
    [
        // Option 0: CORRECT - C quarter D eighth E eighth F half | G quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
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
            timeSignature: '4/4',
            clef: 'treble',
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
        // Option 2: Note change + subtle rhythm change - C quarter D eighth E eighth E half | G eighth F eighth C dotted half
        {
            timeSignature: '4/4',
            clef: 'treble',
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
            timeSignature: '4/4',
            clef: 'treble',
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
        // Option 4: Note change + subtle rhythm change - C half D eighth E eighth | G quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
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
        // Option 5: Note change + subtle rhythm change - C quarter D quarter F half | F quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
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
    ], // End of Question 13

    // Question 14 (Bass Clef) - C major with four eighth notes patterns
    [
        // Option 0: CORRECT - C eighth D eighth E eighth F eighth G half | F quarter E quarter C half
        {
            timeSignature: '4/4',
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
            timeSignature: '4/4',
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
            timeSignature: '4/4',
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
            timeSignature: '4/4',
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
        // Option 4: C eighth E eighth F eighth G eighth C half | F quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
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
            timeSignature: '4/4',
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
    ], // End of Question 14

    // Question 15 (Treble Clef) - C major with mixed rhythms
    [
        // Option 0: CORRECT - C half D eighth E eighth F quarter | G quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'h' },   // 2 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C half E eighth D eighth F quarter | G quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'h' },   // 2 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C half D eighth E eighth F quarter | F quarter G quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'h' },   // 2 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C half D eighth E eighth F quarter | G quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'h' },   // 2 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C half D eighth E eighth E quarter | G quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'h' },   // 2 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C half D eighth E eighth F quarter | G quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
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
    ], // End of Question 15

    // Question 16 (Bass Clef) - C major with dotted quarters and two eighths (WORKING PATTERN FROM OLD APP.JS)
    [
        // Option 0: CORRECT - C quarter D eighth E eighth F quarter tied to F eighth | F quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 0.5 beats - beamed with E
                { keys: ['e/3'], duration: '8' },   // 0.5 beats - beamed with D
                { keys: ['f/3'], duration: 'q', tie: { firstNote: true } },   // 1 beat - tied to next
                { keys: ['f/3'], duration: '8', tie: { lastNote: true } }     // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C quarter E eighth D eighth F quarter tied to F eighth | F quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 0.5 beats - beamed with D
                { keys: ['d/3'], duration: '8' },   // 0.5 beats - beamed with E
                { keys: ['f/3'], duration: 'q', tie: { firstNote: true } },   // 1 beat - tied to next
                { keys: ['f/3'], duration: '8', tie: { lastNote: true } }     // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C quarter D eighth E eighth G quarter tied to G eighth | E quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 0.5 beats - beamed with E
                { keys: ['e/3'], duration: '8' },   // 0.5 beats - beamed with D
                { keys: ['g/3'], duration: 'q', tie: { firstNote: true } },   // 1 beat - tied to next
                { keys: ['g/3'], duration: '8', tie: { lastNote: true } }     // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C quarter D eighth E eighth F quarter tied to F eighth | G quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 0.5 beats - beamed with E
                { keys: ['e/3'], duration: '8' },   // 0.5 beats - beamed with D
                { keys: ['f/3'], duration: 'q', tie: { firstNote: true } },   // 1 beat - tied to next
                { keys: ['f/3'], duration: '8', tie: { lastNote: true } }     // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C quarter D eighth E eighth F quarter tied to F eighth | F quarter E quarter D half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 0.5 beats - beamed with E
                { keys: ['e/3'], duration: '8' },   // 0.5 beats - beamed with D
                { keys: ['f/3'], duration: 'q', tie: { firstNote: true } },   // 1 beat - tied to next
                { keys: ['f/3'], duration: '8', tie: { lastNote: true } }     // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C quarter tied to C eighth D eighth E eighth F eighth G quarter | F quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q', tie: { firstNote: true } },   // 1 beat - tied to next
                { keys: ['c/3'], duration: '8', tie: { lastNote: true } },    // 0.5 beats
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
    ], // End of Question 16

    // Question 17 (Treble Clef) - C major with dotted half note patterns
    [
        // Option 0: CORRECT - C dotted half D quarter | E quarter F quarter G half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'hd' },  // 3 beats
                { keys: ['d/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C dotted half E quarter | D quarter F quarter G half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'hd' },  // 3 beats
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C dotted half D quarter | F quarter E quarter G half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'hd' },  // 3 beats
                { keys: ['d/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['g/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C dotted half D quarter | F quarter E quarter G half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'hd' },  // 3 beats
                { keys: ['d/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C dotted half D quarter | E quarter F quarter F half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'hd' },  // 3 beats
                { keys: ['d/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C dotted half D quarter | E quarter G quarter F half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'hd' },  // 3 beats
                { keys: ['d/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ], // End of Question 17

    // Question 18 (Bass Clef) - C major with syncopated rhythms
    [
        // Option 0: CORRECT - C eighth D eighth E dotted quarter F eighth G quarter | F eighth G eighth E quarter C half
        {
            timeSignature: '4/4',
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
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C eighth D eighth F dotted quarter E eighth G quarter | F eighth G eighth E quarter C half
        {
            timeSignature: '4/4',
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
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C eighth E eighth D dotted quarter F eighth G quarter | F eighth G eighth E quarter C half
        {
            timeSignature: '4/4',
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
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C eighth D eighth E dotted quarter F eighth F quarter | G eighth F eighth E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C eighth D eighth E dotted quarter F eighth G quarter | F eighth G eighth D quarter C half
        {
            timeSignature: '4/4',
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
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C eighth D eighth E dotted quarter G eighth F quarter | F eighth G eighth E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'qd' },  // 1.5 beats
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ], // End of Question 18

    // Question 19 (Treble Clef) - C major with eighth note and quarter combinations
    [
        // Option 0: CORRECT - C quarter D quarter E eighth F eighth G quarter | F quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C quarter D quarter F eighth E eighth G quarter | F quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C quarter E quarter D eighth F eighth G quarter | F quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C quarter D quarter E eighth F eighth F quarter | G quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C quarter D quarter E eighth F eighth G quarter | F quarter F quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C quarter D quarter E eighth F eighth G quarter | F quarter E quarter C half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: '8' },   // 0.5 beats
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ], // End of Question 19

    // Question 20 (Bass Clef) - C major with complex syncopated rhythms
    [
        // Option 0: CORRECT - C eighth rest eighth D quarter E eighth F eighth G quarter | F eighth rest eighth E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8r' },  // 0.5 beats rest
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8r' },  // 0.5 beats rest
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: C eighth rest eighth E quarter D eighth F eighth | G eighth F eighth E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8r' },  // 0.5 beats rest
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: C eighth D eighth rest eighth F eighth E quarter G quarter | G eighth F eighth E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8r' },  // 0.5 beats rest
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: C eighth rest eighth D eighth E eighth F quarter G quarter | F eighth G eighth E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8r' },  // 0.5 beats rest
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: C eighth D eighth E eighth rest eighth F quarter G quarter | G eighth F eighth D quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8r' },  // 0.5 beats rest
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: C eighth rest eighth D quarter E eighth F eighth G quarter | G eighth F eighth E quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8r' },  // 0.5 beats rest
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ] // End of Question 20
];

// Export for browser compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = questions_4_4_2m_C_major_complex;
} else if (typeof window !== 'undefined') {
    window.questions_4_4_2m_C_major_complex = questions_4_4_2m_C_major_complex;
}