// Questions 31-40: 4/4 time signature, 2 measures, A minor, complex patterns
// SUBAGENT_4 assignment: Q31-Q40

var questions_4_4_2m_A_minor_complex = [
    // Question 31
    [
        // Option 0: CORRECT ANSWER - A dotted quarter B eighth C eighth D eighth E quarter | F quarter G quarter A half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Only dotted quarter A→G (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['g#/4'], duration: 'qd' },  // 1.5 beats (A→G)
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Only eighth B→C (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats (B→C)
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: Only eighth C→B (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats (C→B)
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Only eighth D→E (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['e/5'], duration: '8' },   // 0.5 beats (D→E)
                { keys: ['e/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: Only quarter E→F (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'qd' },  // 1.5 beats
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' },   // 0.5 beats
                { keys: ['f/5'], duration: 'q' }    // 1 beat (E→F) = 4 total
            ],
            measure2: [
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ],

    // Question 32
    [
        // Option 0: CORRECT ANSWER - C eighth D eighth E quarter F quarter G quarter | A eighth B eighth C quarter D quarter E quarter
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Only eighth C→B (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['b/2'], duration: '8' },   // 0.5 beats (C→B)
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/4'], duration: 'q' },   // 1 beat - proper resolution B→C
                { keys: ['c/4'], duration: 'q' },   // 1 beat - stays on tonic
                { keys: ['c/4'], duration: 'q' }    // 1 beat - stays on tonic = 4 total
            ]
        },
        // Option 2: Only eighth D→E (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats (D→E)
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Only quarter E→D (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: 'q' },   // 1 beat (E→D)
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Only quarter F→G (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },   // 1 beat (F→G)
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Only quarter G→F (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['f/3'], duration: 'q' }    // 1 beat (G→F) = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: '8' },   // 0.5 beats
                { keys: ['b/3'], duration: '8' },   // 0.5 beats
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // Question 33
    [
        // Option 0: CORRECT ANSWER - F quarter G quarter A quarter B eighth C eighth | D quarter E quarter F half
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' }    // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Only quarter F→E (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['e/4'], duration: 'q' },   // 1 beat (F→E)
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' }    // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 2: Only quarter G→A (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' },   // 1 beat (G→A)
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' }    // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 3: Only quarter A→G (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },   // 1 beat (A→G)
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['c/5'], duration: '8' }    // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 4: Only eighth B→A (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: '8' },   // 0.5 beats (B→A)
                { keys: ['c/5'], duration: '8' }    // 0.5 beats = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 5: Only eighth C→D (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' },   // 1 beat
                { keys: ['b/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/5'], duration: '8' }    // 0.5 beats (C→D) = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        }
    ],

    // Question 34
    [
        // Option 0: CORRECT ANSWER - E half F quarter G quarter | A quarter B quarter C half
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'h' },   // 2 beats
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat - G# resolves UP to A
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'h' }    // 2 beats = 4 total
            ]
        },
        // Option 1: Only half E→D (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['d/3'], duration: 'h' },   // 2 beats (E→D)
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat - G# resolves UP to A
                { keys: ['a/4'], duration: 'q' },   // 1 beat - stays on A
                { keys: ['a/4'], duration: 'h' }    // 2 beats - stays on A = 4 total
            ]
        },
        // Option 2: Only quarter F→E (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'h' },   // 2 beats
                { keys: ['e/3'], duration: 'q' },   // 1 beat (F→E)
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat - G# resolves UP to A
                { keys: ['a/4'], duration: 'q' },   // 1 beat - stays on A
                { keys: ['a/4'], duration: 'h' }    // 2 beats - stays on A = 4 total
            ]
        },
        // Option 3: Only quarter G→A (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'h' },   // 2 beats
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['a/4'], duration: 'q' }    // 1 beat (G#→A) = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat - already on A
                { keys: ['a/4'], duration: 'q' },   // 1 beat - stays on A
                { keys: ['a/4'], duration: 'h' }    // 2 beats - stays on A = 4 total
            ]
        },
        // Option 4: Only quarter A→G (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'h' },   // 2 beats
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat - G# resolves UP to A
                { keys: ['a/4'], duration: 'q' },   // 1 beat - stays on A
                { keys: ['a/4'], duration: 'h' }    // 2 beats - stays on A = 4 total
            ]
        },
        // Option 5: Only quarter B→C (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'h' },   // 2 beats
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat - G# resolves UP to A
                { keys: ['a/4'], duration: 'q' },   // 1 beat - stays on A
                { keys: ['a/4'], duration: 'h' }    // 2 beats - stays on A = 4 total
            ]
        }
    ],

    // Question 35
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

    // Question 36
    [
        // Option 0: CORRECT ANSWER - C quarter D quarter E eighth F eighth G quarter | A quarter B quarter C quarter D quarter
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Only quarter C→B (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['b/2'], duration: 'q' },   // 1 beat (C→B)
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 2: Only quarter D→E (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: 'q' },   // 1 beat (D→E)
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Only eighth E→D (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: '8' },   // 0.5 beats (E→D)
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Only eighth F→G (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/3'], duration: '8' },   // 0.5 beats (F→G)
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Only quarter G→A (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: 'q' },   // 1 beat
                { keys: ['d/3'], duration: 'q' },   // 1 beat
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['a/3'], duration: 'q' }    // 1 beat (G→A) = 4 total
            ],
            measure2: [
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // Question 37
    [
        // Option 0: CORRECT ANSWER - G whole | E whole
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['g#/4'], duration: 'w' }    // 4 beats = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'w' }    // 4 beats = 4 total
            ]
        },
        // Option 1: Only whole G→A (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'w' }    // 4 beats (G→A) = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'w' }    // 4 beats = 4 total
            ]
        },
        // Option 2: Only whole G→F (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['f/4'], duration: 'w' }    // 4 beats (G→F) = 4 total
            ],
            measure2: [
                { keys: ['e/4'], duration: 'w' }    // 4 beats = 4 total
            ]
        },
        // Option 3: Only whole E→F (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['g#/4'], duration: 'w' }    // 4 beats = 4 total
            ],
            measure2: [
                { keys: ['f/4'], duration: 'w' }    // 4 beats (E→F) = 4 total
            ]
        },
        // Option 4: Only whole E→D (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['g#/4'], duration: 'w' }    // 4 beats = 4 total
            ],
            measure2: [
                { keys: ['d/4'], duration: 'w' }    // 4 beats (E→D) = 4 total
            ]
        },
        // Option 5: Only whole E→G (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['g#/4'], duration: 'w' }    // 4 beats = 4 total
            ],
            measure2: [
                { keys: ['g#/4'], duration: 'w' }    // 4 beats (E→G) = 4 total
            ]
        }
    ],

    // Question 38
    [
        // Option 0: CORRECT ANSWER - D eighth E eighth F eighth G eighth A quarter B quarter | C eighth D eighth E quarter F quarter G quarter
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/3'], duration: '8' },   // 0.5 beats
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Only eighth D→C (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['c/3'], duration: '8' },   // 0.5 beats (D→C)
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/3'], duration: '8' },   // 0.5 beats
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 2: Only eighth E→F (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats (E→F)
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/3'], duration: '8' },   // 0.5 beats
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Only eighth F→E (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats (F→E)
                { keys: ['g#/3'], duration: '8' },   // 0.5 beats
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Only eighth G→A (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['a/3'], duration: '8' },   // 0.5 beats (G→A)
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Only quarter A→G (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['d/3'], duration: '8' },   // 0.5 beats
                { keys: ['e/3'], duration: '8' },   // 0.5 beats
                { keys: ['f/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/3'], duration: '8' },   // 0.5 beats
                { keys: ['g#/4'], duration: 'q' },   // 1 beat (A→G)
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: '8' },   // 0.5 beats
                { keys: ['d/4'], duration: '8' },   // 0.5 beats
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // Question 39
    [
        // Option 0: CORRECT ANSWER - B quarter C half D quarter | E quarter F quarter G quarter A quarter
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'h' },   // 2 beats
                { keys: ['d/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Only quarter B→A (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['a/4'], duration: 'q' },   // 1 beat (B→A)
                { keys: ['c/5'], duration: 'h' },   // 2 beats
                { keys: ['d/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 2: Only half C→D (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['d/5'], duration: 'h' },   // 2 beats (C→D)
                { keys: ['d/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Only quarter D→E (one step up)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'h' },   // 2 beats
                { keys: ['e/5'], duration: 'q' }    // 1 beat (D→E) = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Only quarter E→D (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'h' },   // 2 beats
                { keys: ['d/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['d/5'], duration: 'q' },   // 1 beat (E→D)
                { keys: ['f/5'], duration: 'q' },   // 1 beat
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Only quarter F→E (one step down)
        {
            timeSignature: '4/4',
            clef: 'treble',
            measure1: [
                { keys: ['b/4'], duration: 'q' },   // 1 beat
                { keys: ['c/5'], duration: 'h' },   // 2 beats
                { keys: ['d/5'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['e/5'], duration: 'q' },   // 1 beat
                { keys: ['e/5'], duration: 'q' },   // 1 beat (F→E)
                { keys: ['g#/5'], duration: 'q' },   // 1 beat
                { keys: ['a/5'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ],

    // Question 40
    [
        // Option 0: CORRECT ANSWER - F quarter G quarter A quarter B quarter | C quarter D quarter E quarter F quarter
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 1: Only quarter F→E (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['e/3'], duration: 'q' },   // 1 beat (F→E)
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
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
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 3: Only quarter A→G (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },   // 1 beat (A→G)
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 4: Only quarter B→C (one step up)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['c/4'], duration: 'q' }    // 1 beat (B→C) = 4 total
            ],
            measure2: [
                { keys: ['c/4'], duration: 'q' },   // 1 beat
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        },
        // Option 5: Only quarter C→B (one step down)
        {
            timeSignature: '4/4',
            clef: 'bass',
            measure1: [
                { keys: ['f/3'], duration: 'q' },   // 1 beat
                { keys: ['g#/4'], duration: 'q' },   // 1 beat
                { keys: ['a/3'], duration: 'q' },   // 1 beat
                { keys: ['b/3'], duration: 'q' }    // 1 beat = 4 total
            ],
            measure2: [
                { keys: ['b/3'], duration: 'q' },   // 1 beat (C→B)
                { keys: ['d/4'], duration: 'q' },   // 1 beat
                { keys: ['e/4'], duration: 'q' },   // 1 beat
                { keys: ['f/4'], duration: 'q' }    // 1 beat = 4 total
            ]
        }
    ]
];

// Export for browser loading
if (typeof module !== 'undefined' && module.exports) {
    module.exports = questions_4_4_2m_A_minor_complex;
}