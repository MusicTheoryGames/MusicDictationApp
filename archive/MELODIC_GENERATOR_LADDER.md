# Melodic Generator ↔ Curriculum Ladder — the difficulty contract

The single generator (`core/melodic.js`) is the difficulty spine for the whole melodic
course. Each curriculum rung is just a **clamp on the generator's knobs**. This file is the
authoritative mapping: *level → generator spec*. It EXTENDS `MELODIC_CURRICULUM.md` (which
owns the pedagogy/exercise-modes) with the exact generator parameters per rung, and it
extends the ceiling from "diatonic ≤3♯/♭" up to **late-Romantic → Impressionist → early-20th-
century** harmony (owner target, 2026-07-01). Atonal/serial is explicitly OUT of scope for now.

Verified foundation: the harmony-aware generate-and-validate loop passes the existing
classical validators 108/108 on C major / A minor (2–4 bar, 2/4·3/4·4/4).

---

## The generator's knobs (what a rung clamps)

```
spec = {
  collection:  'diatonic-major' | 'diatonic-minor(natural|harmonic|melodic)'
             | 'mode(dorian|phrygian|lydian|mixolydian|aeolian|locrian)'
             | 'pentatonic' | 'whole-tone' | 'octatonic' | 'acoustic' | ...   // the pitch set
  key:         any of 30 keys (tonic + spelling)          // transposition + enharmonic spelling
  degrees:     allowed scale positions (e.g. [1,2,3] early; full set later)
  leaps:       allowed melodic moves ['step','3rd','P4','P5','6th','7th','P8']
  chromatic:   none | passing | neighbor | mixture | secondary-dominant   // non-collection tones + resolution rule
  range:       {lowMidi, highMidi}
  meter:       simple(2/4,3/4,4/4) | compound(6/8,9/8,12/8) | irregular(5/8,7/8) | changing
  lengthBars:  1..8
  cadence:     authentic | half | modal | none            // constructed, not just validated
  modulation:  none | dominant | relative | chromatic-mediant | enharmonic
  startOn:     tonic | tonic-triad | any
  seed
}
```

The generator GUARANTEES by construction: notes in-collection, no interval it isn't allowed,
range respected, a constructed cadence. It AIMS (soft) for era-appropriate stepwise ratios,
leap resolution, arch contour.

---

## The ladder (level → generator clamp)

Stages 0–5 are the existing `MELODIC_CURRICULUM.md` M0–M20. Stage 6 (M21–M26) is the NEW
conservatory ceiling. "Judge" = which validator/rules gate the output.

### Stage 0 — Pre-notation (never tried dictation)
| Rung | collection | key | degrees | leaps | meter | len | Judge |
|------|-----------|-----|---------|-------|-------|-----|-------|
| M0 Find home | diatonic-major | C | tonic + 1 test tone | — | none | — | aural only |
| M1 Which way | diatonic-major | C | 1,3,5 | step,3rd | none | 2–3 notes | aural only |

### Stage 1 — No-staff foundation (rhythm + degrees, staff withheld)
| M2 Rhythm-is-melody | (monotone) | C | 1 | — | 2/4·3/4·4/4 | 2 | rhythm grader |
| M3 First 3 numbers | diatonic-major | C | 1,2,3 | step | simple | 2 | classical(strict) |
| M4 Read it back | diatonic-major | C,G | 1,2,3 | step | simple | 2 | classical(strict) |
| M5 Pentascale 1–5 | diatonic-major | C,G | 1–5 | step, triad-skip | simple | 2 | classical(strict) |
| M6 Minor early | diatonic-minor(natural) | Am,Dm | 1–5 | step, triad-skip | simple | 2 | classical(strict) |
| M7 First 3rds | diatonic | C,G,Am | 1–5 | +3rd | simple | 2 | classical(strict) |
| M8 P4 & P5 | diatonic | G,F,Dm | 1–5 | +P4,+P5 | simple | 2 | classical(strict) |

### Stage 2 — Notation + full scale
| M9 First staff | diatonic | C,G,F,Am,Dm | 1–5 | prior | simple | 2 | classical(strict) |
| M10 Wrong note | diatonic | ≤1♯/♭ | 1–5 | prior | simple | 2 | classical(strict) |
| M11 Full octave | diatonic-major | C,G,F,D | 1–8 (+6,7,8) | +P8 | simple | 2–4 | classical(strict) |
| M12 Octave + 6ths | diatonic | ≤2♯/♭ | 1–8 | +m6,M6,P8 | simple | 4 | classical(strict) |
| M13 Three minors | minor(nat/harm/mel) | ≤2♯/♭ | 1–8 | prior | simple | 4 | classical(minor-aware)* |

\* minor-aware: allow the harmonic-minor ♯7; still forbid the D→♯7 melodic tritone by construction.

### Stage 3 — Phrases, compound & irregular meter
| M14 2nds + longer | diatonic | ≤2♯/♭ | 1–8 | all steps | simple | 4 | classical |
| M15 Compound 6/8 | diatonic | ≤2♯/♭ | 1–8 | prior | 6/8,9/8 | 4 | classical |
| M16 7ths | diatonic | ≤3♯/♭ | 1–8 | +m7,M7 | simple/compound | 4 | classical |
| M17 8-bar period | diatonic | ≤3♯/♭ | 1–8 | all | mixed | 8 | classical + cadence(period) |

### Stage 4 — All keys (owner: "every key signature")
| M18 Every key | diatonic-major/minor | **ALL 30 keys** | 1–8 | all | simple/compound | 4–8 | classical (transposed judge) |

Requires generalizing the tonality validator's `SCALE_DEFINITIONS` from {C_major, A_minor}
to any (tonic, mode) by transposition + circle-of-fifths spelling. The style validator is
already key-agnostic (pure semitone math) — no change.

### Stage 5 — Chromatic + modulation (late-Romantic entry)
| M19 First chromatic | diatonic + passing/neighbor | any | 1–8 | all | mixed | 4–8 | chromatic-aware |
| M20 Modal mixture | diatonic + mixture (♭6,♭3,♭7) | any | 1–8 | all | mixed | 8 | romantic-aware |
| M21 Secondary-dom color | diatonic + secondary-dom leading tones | any | 1–8 | all | mixed | 8 | romantic-aware |
| M22 Modulation | diatonic, modulating | dom / relative / chromatic-mediant | 1–8 | all | mixed | 8 | modulation-aware |

Chromatic tones are generated ONLY with a resolution rule (chromatic passing between two
diatonic tones; neighbor returns; raised tone resolves up, lowered resolves down). The strict
classical tritone rule relaxes to "unresolved tritone leaps" only.

### Stage 6 — Impressionist / early-20th-century CEILING (owner target)
| M23 Church modes | mode(dorian…locrian) | any tonic | full | all | mixed | 4–8 | mode-aware (allow characteristic tritone) |
| M24 Symmetric scales | pentatonic / whole-tone / octatonic | centered | full | all incl. tritone | mixed | 4–8 | collection-membership + no accidental cadence |
| M25 Synthetic / folk | acoustic, polymodal | centered | full | wide | irregular 5/8,7/8, changing | 4–8 | collection + interval-variety |
| M26 Early-20th synthesis | mixed collections, side-slips | shifting center | full | wide angular (resolved) | changing | 8 | era panel |

STOP HERE (pre-atonal). No serial/12-tone rung for now.

---

## Judge evolution (why one validator can't gate the whole ladder)

- **classical(strict)** — the existing `validate_classical_style.js` + `validate_tonality.js`.
  Gates Stages 0–4. Verified to have teeth (caught 8 authored tritone leaps).
- **minor-aware** — allow harmonic/melodic raised 6/7; forbid the resulting melodic tritone by construction.
- **chromatic/romantic-aware** — allow non-diatonic tones that RESOLVE correctly; still flag
  unresolved leaps, unresolved chromaticism.
- **mode-aware** — validate membership in the mode; ALLOW the characteristic tritone
  (Lydian ♯4, Locrian ♭5) that classical(strict) wrongly rejects.
- **collection-membership** — for whole-tone/octatonic/pentatonic: notes must belong to the
  collection; classical stepwise/tritone rules DO NOT apply (whole-tone is all tritones/2nds).
  Guard instead against *accidental tonal cadence* (which would break the impressionist color).

Each new judge is a small module beside the existing validators; the existing ones are reused
verbatim for the classical band.

---

## Build order (bottom-up, each rung verified before the next)
1. Rung→spec table above ← (this file)
2. Polish Stage 0–2 generator quality (fix sparse 2-bar; repetition guard; contour/climax).
3. Minors (M13) with minor-aware judge.
4. Phrases + compound/irregular meter (M14–M17).
5. All 30 keys (M18) + generalize tonality validator.
6. Chromatic + modulation (M19–M22) + romantic-aware judge.
7. Modes + symmetric/synthetic scales (M23–M26) + mode/collection judges.
