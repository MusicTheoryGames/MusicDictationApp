// Questions 21-30: 4/4 time signature, 2 measures, A minor, simple patterns
// SUBAGENT_3 assignment: Q21-Q30

var questions_4_4_2m_A_minor_simple = [
    // Question 21
    [
        // Option 0: CORRECT ANSWER - A quarter B quarter C half | D quarter E quarter F half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Only quarter B→C (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' },   // 1 beat (B→C)
                { keys: ['c/5'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Only half C→D (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'h' }    // 2 beats (C→D) = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: Only quarter D→C (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['c/5'], duration: 'q' },   // 1 beat (D→C)
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Only quarter E→F (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'q' },   // 1 beat (E→F)
                { keys: ['f/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: Only half F→G (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'h' }    // 2 beats (F→G) = 4 total
            ]
        }
    ],

    // Question 22
    [
        // Option 0: CORRECT ANSWER - C quarter D quarter E quarter F quarter | G quarter A quarter B half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g#/3'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Only quarter C→B (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['b/2'], duration: 'q' },   // 1 beat (C→B)
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g#/3'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Only quarter D→E (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat (D→E)
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g#/3'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: Only quarter E→D (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat (E→D)
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g#/3'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Only quarter F→G (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' }    // 1 beat (F→G) = 4 total
            ],
            measure2: [
                { keys: ['g#/3'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: Only quarter G→F (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat (G→F)
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ],

    // Question 23
    [
        // Option 0: CORRECT ANSWER - A half G quarter F quarter | E half D half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'h' },   // 2 beats
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'h' },   // 2 beats
                { keys: ['d/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Only half A→B (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['b/4'], duration: 'h' },   // 2 beats (A→B)
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'h' },   // 2 beats
                { keys: ['d/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Only quarter G→A (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'h' },   // 2 beats
                { keys: ['a/4'], duration: 'q' },   // 1 beat (G→A)
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'h' },   // 2 beats
                { keys: ['d/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: Only quarter F→E (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'h' },   // 2 beats
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' }    // 1 beat (F→E) = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'h' },   // 2 beats
                { keys: ['d/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Only half E→F (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'h' },   // 2 beats
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'h' },   // 2 beats (E→F)
                { keys: ['d/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: Only half D→C (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'h' },   // 2 beats
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'h' },   // 2 beats
                { keys: ['c/4'], duration: 'h' }    // 2 beats (D→C) = 4 total
            ]
        }
    ],

    // Question 24
    [
        // Option 0: CORRECT ANSWER - F quarter E quarter D quarter C quarter | B quarter A quarter G half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['b/2'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' },   // 1 beat
                { keys: ['g#/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Only quarter F→G (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g#/3'], duration: 'q' },   // 1 beat (F→G)
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['b/2'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' },   // 1 beat
                { keys: ['g#/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Only quarter E→F (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat (E→F)
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['b/2'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' },   // 1 beat
                { keys: ['g#/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: Only quarter D→E (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat (D→E)
                { keys: ['c/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['b/2'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' },   // 1 beat
                { keys: ['g#/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Only quarter C→D (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' }    // 1 beat (C→D) = 4 total
            ],
            measure2: [
                { keys: ['b/2'], duration: 'q' },   // 1 beat
                { keys: ['a/2'], duration: 'q' },   // 1 beat
                { keys: ['g#/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: Only quarter B→C (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['c/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat (B→C)
                { keys: ['a/2'], duration: 'q' },   // 1 beat
                { keys: ['g#/2'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ],

    // Question 25
    [
        // Option 0: CORRECT ANSWER - A eighth B eighth C quarter D eighth E eighth F quarter | G quarter A quarter B quarter C quarter
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: '8' },   // 0.5 beats
                { keys: ['f/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'q' },   // 1 beat
                { keys: ['b/5'], duration: 'q' },   // 1 beat
                { keys: ['c/6'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Only eighth A→G (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['g#/4'], duration: '8' },   // 0.5 beats (A→G)
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: '8' },   // 0.5 beats
                { keys: ['f/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'q' },   // 1 beat
                { keys: ['b/5'], duration: 'q' },   // 1 beat
                { keys: ['c/6'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 2: Only eighth B→C (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats (B→C)
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: '8' },   // 0.5 beats
                { keys: ['f/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'q' },   // 1 beat
                { keys: ['b/5'], duration: 'q' },   // 1 beat
                { keys: ['c/6'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Only quarter C→B (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: 'q' },   // 1 beat (C→B)
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: '8' },   // 0.5 beats
                { keys: ['f/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'q' },   // 1 beat
                { keys: ['b/5'], duration: 'q' },   // 1 beat
                { keys: ['c/6'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Only eighth D→C (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: '8' },   // 0.5 beats (D→C)
                { keys: ['e/5'], duration: '8' },   // 0.5 beats
                { keys: ['f/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'q' },   // 1 beat
                { keys: ['b/5'], duration: 'q' },   // 1 beat
                { keys: ['c/6'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Only eighth E→F (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['f/5'], duration: '8' },   // 0.5 beats (E→F)
                { keys: ['f/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'q' },   // 1 beat
                { keys: ['b/5'], duration: 'q' },   // 1 beat
                { keys: ['c/6'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // Question 26
    [
        // Option 0: CORRECT ANSWER - E quarter F quarter G half | A quarter B quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Only quarter E→D (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['d/3'], duration: 'q' },   // 1 beat (E→D)
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Only quarter F→G (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },   // 1 beat (F→G)
                { keys: ['g#/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: Only half G→F (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'h' }    // 2 beats (G→F) = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Only quarter A→G (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['g#/3'], duration: 'q' },   // 1 beat (A→G)
                { keys: ['b/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: Only quarter B→A (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'h' }    // 2 beats = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat (B→A)
                { keys: ['c/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ],

    // Question 27
    [
        // Option 0: CORRECT ANSWER - C whole | A whole
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/5'], duration: 'w' }    // 4 beats = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'w' }    // 4 beats = 4 total
            ]
        },
        // Option 1: Only whole C→D (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['d/5'], duration: 'w' }    // 4 beats (C→D) = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'w' }    // 4 beats = 4 total
            ]
        },
        // Option 2: Only whole C→B (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['b/4'], duration: 'w' }    // 4 beats (C→B) = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'w' }    // 4 beats = 4 total
            ]
        },
        // Option 3: Only whole A→B (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/5'], duration: 'w' }    // 4 beats = 4 total
            ],
            measure2: [
                { keys: ['b/4'], duration: 'w' }    // 4 beats (A→B) = 4 total
            ]
        },
        // Option 4: Only whole A→G (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/5'], duration: 'w' }    // 4 beats = 4 total
            ],
            measure2: [
                { keys: ['g#/4'], duration: 'w' }    // 4 beats (A→G) = 4 total
            ]
        },
        // Option 5: Only whole A→C (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['c/5'], duration: 'w' }    // 4 beats = 4 total
            ],
            measure2: [
                { keys: ['c/5'], duration: 'w' }    // 4 beats (A→C) = 4 total
            ]
        }
    ],

    // Question 28
    [
        // Option 0: CORRECT ANSWER - G eighth A eighth B eighth C eighth D quarter E quarter | F eighth G eighth A quarter B quarter C quarter
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g#/3'], duration: '8' },   // 0.5 beats
                { keys: ['a/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: '8' },   // 0.5 beats
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Only eighth G→F (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: '8' },   // 0.5 beats (G→F)
                { keys: ['a/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: '8' },   // 0.5 beats
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 2: Only eighth A→B (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g#/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/3'], duration: '8' },   // 0.5 beats (A→B)
                { keys: ['b/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: '8' },   // 0.5 beats
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Only eighth B→A (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g#/3'], duration: '8' },   // 0.5 beats
                { keys: ['a/3'], duration: '8' },   // 0.5 beats
                { keys: ['a/3'], duration: '8' },   // 0.5 beats (B→A)
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: '8' },   // 0.5 beats
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Only eighth C→D (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g#/3'], duration: '8' },   // 0.5 beats
                { keys: ['a/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats (C→D)
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: '8' },   // 0.5 beats
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Only quarter D→C (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['g#/3'], duration: '8' },   // 0.5 beats
                { keys: ['a/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/4'], duration: 'q' },   // 1 beat (D→C)
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: '8' },   // 0.5 beats
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // Question 29
    [
        // Option 0: CORRECT ANSWER - A quarter B half C quarter | D quarter E quarter F quarter G quarter
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'h' },   // 2 beats
                { keys: ['c/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Only quarter A→G (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['g#/4'], duration: 'q' },   // 1 beat (A→G)
                { keys: ['b/4'], duration: 'h' },   // 2 beats
                { keys: ['c/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 2: Only half B→C (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'h' },   // 2 beats (B→C)
                { keys: ['c/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Only quarter C→D (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'h' },   // 2 beats
                { keys: ['d/5'], duration: 'q' }    // 1 beat (C→D) = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Only quarter D→E (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'h' },   // 2 beats
                { keys: ['c/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat (D→E)
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Only quarter E→D (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: 'h' },   // 2 beats
                { keys: ['c/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'q' },   // 1 beat (E→D)
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // Question 30
    [
        // Option 0: CORRECT ANSWER - F quarter G quarter A quarter B quarter | C quarter D quarter E half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Only quarter F→E (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat (F→E)
                { keys: ['g#/3'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Only quarter G→F (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat (G→F)
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: Only quarter A→G (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },   // 1 beat (A→G)
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Only quarter B→C (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'q' }    // 1 beat (B→C) = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: Only quarter C→B (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/3'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['b/3'], duration: 'q' },   // 1 beat (C→B)
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ]
];

// Export for browser loading
if (typeof module !== 'undefined' && module.exports) {
    module.exports = questions_4_4_2m_A_minor_simple;
}