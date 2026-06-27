# CURRICULUM_PLAN.md — Hall "Studying Rhythm" → playable levels

Design/data spec mapping Hall & Urban *Studying Rhythm* (4th ed.) chapters to our
rhythm-dictation levels. Source ToC in `HALL_CURRICULUM.md`. This document is the
wiring spec for the main agent; it does **not** edit `solo-mode.js`,
`rhythm-student.js`, or any HTML.

## Conventions used here (from the app's meter memory)
- **Simple** = top number 2, 3, or 4. Beat unit by bottom: `/4`→quarter beat,
  `/2`→half-note beat, `/8`→eighth-note beat. beatsPerMeasure = top number.
- **Compound** = top number 6, 9, or 12. Beat = a *dotted* note. beat COUNT = top/3
  (6→2, 9→3, 12→4). beat UNIT by bottom: `/8`→dotted-quarter, `/4`→dotted-half,
  `/16`→dotted-eighth.
- **assetPrefix** legend:
  - `medium` = simple quarter-beat figure IDs from the engine's
    `rhythmPatterns.medium` (referenced by `L_STEPS` in solo-mode.js).
  - `tpl` = triplet/tuplet figures (`triplet-eighths`, `triplet-quarters`, …).
  - `cd` = compound dotted-quarter beat (6/8·9/8·12/8) — `COMPOUND_FIGS` in solo-mode.js.
  - `hb` = simple half-note beat (2/2·3/2) — manifest `rhythm-assets/halfbeat/`.
  - `dh` = compound dotted-half beat (6/4·9/4·12/4) — manifest `rhythm-assets/dottedhalf/`.
  - `de` = compound dotted-eighth beat (6/16·9/16·12/16) — manifest `rhythm-assets/dotted16/`.
- A **beat cell** = one figure ID (`beats: 1`). A measure = (beat count) cells.
  6/8 = 2 cells, 9/8 = 3, 12/8 = 4; 2/4 = 2 cells, 4/4 = 4, etc.

### Simple quarter-beat figure IDs referenced today (from `L_STEPS`)
`quarter`, `two-eighths`, `quarter-rest`, `half`, `dotted-quarter-eighth`,
`four-sixteenths`, `eighth-two-sixteenths`, `two-sixteenths-eighth`,
`sixteenth-eighth-sixteenth`, `dotted-eighth-sixteenth`, `sixteenth-dotted-eighth`,
`eighth-rest-eighth`, `eighth-eighth-rest`, `eighth-quarter-eighth`,
`eighth-rest-two-sixteenths`, `sixteenth-rest-three-sixteenths`,
`triplet-eighths`, `triplet-quarters`.

---

## A) Chapter → level mapping table

Status legend: **READY** = art exists now · **NEEDS-ASSETS** = engine could do it,
art must be generated · **NEEDS-ENGINE** = needs new engine capability.

The "New figures introduced" column lists *only what that chapter adds*; the
cumulative vocabulary per meter is built in section B.

| Ch | Title | Time sig(s) | s/c | beats/meas | beatUnit | assetPrefix | New figures introduced (by ID) | Status |
|----|-------|-------------|-----|-----------|----------|-------------|--------------------------------|--------|
| 1 | Simple Duple Meter | 2/4 | simple | 2 | quarter | medium | `quarter`, `two-eighths`, `half` | READY |
| 2 | Simple Triple Meter | 3/4 | simple | 3 | quarter | medium | (same figs, 3 beats) | READY |
| 3 | Simple Quadruple Meter | 4/4 | simple | 4 | quarter | medium | (same figs, 4 beats) `quarter-rest` | READY |
| 4 | Dotted Quarters & Ties | 2/4·3/4·4/4 | simple | 2–4 | quarter | medium | `dotted-quarter-eighth` (+ ties) | READY |
| 5 | Compound Duple Meter | 6/8 | compound | 2 | dotted-quarter | cd | `cd-dotted-quarter`, `cd-three-eighths`, `cd-quarter-eighth`, `cd-eighth-quarter`, `cd-duplet` | READY |
| 6 | Sixteenths in Simple Meter | 2/4·3/4·4/4 | simple | 2–4 | quarter | medium | `four-sixteenths`, `eighth-two-sixteenths`, `two-sixteenths-eighth`, `sixteenth-eighth-sixteenth` | READY |
| 7 | Dotted Eighths in Simple Meter | 2/4·3/4·4/4 | simple | 2–4 | quarter | medium | `dotted-eighth-sixteenth`, `sixteenth-dotted-eighth` | READY |
| 8 | Sixteenths in Six-Eight | 6/8 | compound | 2 | dotted-quarter | cd | `cd-six-sixteenths`, `cd-two16-8-8`, `cd-8-two16-8`, `cd-8-8-two16`, `cd-four16-8`, `cd-8-four16`, `cd-quarter-two16`, `cd-two16-quarter` | READY |
| 9 | Rests & Syncopation (Simple) | 2/4·3/4·4/4 | simple | 2–4 | quarter | medium | `eighth-rest-eighth`, `eighth-eighth-rest`, `eighth-quarter-eighth`, `eighth-rest-two-sixteenths`, `sixteenth-rest-three-sixteenths` | READY |
| 10 | Rests & Syncopation (6/8) | 6/8 | compound | 2 | dotted-quarter | cd | `cd-dotted-quarter-rest`, `cd-8rest-8-8`, `cd-8-8rest-8`, `cd-8-8-8rest`, `cd-quarter-8rest`, `cd-8rest-quarter` | READY |
| 11 | Nine-Eight & Twelve-Eight | 9/8, 12/8 | compound | 3, 4 | dotted-quarter | cd | (no new figs; 3- & 4-beat measures using all `cd-*`) | READY |
| 12 | Triplets | 2/4·3/4·4/4 | simple | 2–4 | quarter | tpl | `triplet-eighths`, `triplet-quarters` | READY |
| 13 | Two Against Three | — | poly | — | — | — | 2:3 polyrhythm (two voices) | NEEDS-ENGINE¹ |
| 14 | Half-Note Beat (Simple) | 2/2, 3/2 | simple | 2, 3 | half | hb | `hb-half`, `hb-two-quarters`, `hb-four-eighths`, `hb-quarter-two8`, `hb-two8-quarter`, + rests/16ths (full hb set, see B) | READY |
| 15 | Dotted-Half Beat (Compound) | 6/4, 9/4, 12/4 | compound | 2, 3, 4 | dotted-half | dh | full `dh-*` set (see B) | READY |
| 16 | Eighth-Note Beat | 2/8, 3/8 | simple | 2, 3 | eighth | medium-fast | eighth-as-beat subdivisions | NEEDS-ASSETS² |
| 17 | Dotted-Eighth Beat (Compound) | 6/16 (9/16,12/16) | compound | 2 (3,4) | dotted-eighth | de | full `de-*` set (see B) | READY |
| 18 | Small Subdivisions | simple/compound | — | — | — | — | 32nds / fine subdivisions in existing meters | NEEDS-ASSETS³ |
| 19 | Changing Simple Meter | mixed simple | simple | varies/meas | quarter | medium | per-measure meter change (e.g. 2/4→3/4→4/4) | NEEDS-ENGINE⁴ |
| 20 | Changing Compound Meter | mixed compound | compound | varies/meas | dotted-* | cd | per-measure compound meter change | NEEDS-ENGINE⁴ |
| 21 | Changing Simple↔Compound, division const | mixed | both | varies | mixed | medium+cd | meter swap, 8th constant | NEEDS-ENGINE⁵ |
| 22 | Changing Simple↔Compound, beat const | mixed | both | varies | mixed | medium+cd | meter swap, beat constant | NEEDS-ENGINE⁵ |
| 23 | Three in Two / Two in Three | — | poly | — | — | — | 3:2 / 2:3 polyrhythm | NEEDS-ENGINE¹ |
| 24 | Four Against Three | — | poly | — | — | — | 4:3 polyrhythm | NEEDS-ENGINE¹ |
| 25 | Four in Three / Three in Four | — | poly | — | — | — | 4:3 / 3:4 polyrhythm | NEEDS-ENGINE¹ |
| 26 | Quintuplets & Septuplets | 2/4·3/4·4/4 | simple | 2–4 | quarter | tpl | `tpl-quintuplet`, `tpl-sextuplet`, `tpl-septuplet` (art being generated) | NEEDS-ASSETS⁶ |
| 27 | Five-Eight & Five-Four | 5/8, 5/4 | unequal | — | mixed | — | odd/unequal-beat meter (2+3 or 3+2 groupings) | NEEDS-ENGINE⁷ |
| 28 | More Unequal-Beat Meters | 7/8 etc. | unequal | — | mixed | — | 7/8 (2+2+3 etc.), 8/8, 10/8 | NEEDS-ENGINE⁷ |
| 29 | Changing Unequal Meters | mixed | unequal | — | mixed | — | changing odd meters | NEEDS-ENGINE⁴'⁷ |
| 30 | More Cross Rhythms | — | poly | — | — | — | advanced cross-rhythm (multi-voice) | NEEDS-ENGINE¹ |
| 31 | Tempo Modulation | — | — | — | — | — | metric / tempo modulation | NEEDS-ENGINE⁸ |

### Why each NEEDS-ENGINE / NEEDS-ASSETS chapter is blocked
1. **Polyrhythm (Ch 13, 23–25, 30):** the engine renders/answers a *single* rhythm
   voice on a 16th grid. Polyrhythm needs two simultaneous voices (e.g. quarters in
   one part, triplets in the other) with independent placement, scoring, and a
   shared bar line — a second answer track and a 2-voice renderer. Big engine work.
2. **Eighth-note-beat simple (Ch 16):** the meter math is supported (top 2/3, `/8`
   bottom → eighth beat), but there is **no figure-bank art** for eighth-as-beat
   cells (eighth = 1 beat, two-16ths = 1 beat, etc.). Art must be generated (a new
   prefix, e.g. `eb-`). Same shape as the existing manifests once art exists.
3. **Small subdivisions (Ch 18):** 32nd-note figures in quarter/eighth beats are not
   in the bank (only `de-*` uses 32nds, and only inside a dotted-eighth beat).
   Needs new art; not a teaching priority — fold into other levels later.
4. **Changing meter within a piece (Ch 19, 20, 29):** today one time signature is
   fixed for the whole exercise. Needs per-measure time-signature support: bar-line
   meter changes, mid-piece staff re-layout, and a generator that picks a meter
   sequence. Engine work (no new art for 19/20 — reuses medium/cd).
5. **Simple↔compound conversion (Ch 21, 22):** depends on (4) plus a rule linking the
   two meters (keep the eighth constant, or keep the beat constant) so the tempo/grid
   stays coherent across the switch. Engine work.
6. **Quintuplet/sextuplet/septuplet (Ch 26):** engine can place tuplets (triplets
   already work via `tpl`), but 5/6/7-tuplet **art is being generated separately** as
   `tpl-*`. Once art lands this becomes READY; ratio data: quintuplet 5:4, sextuplet
   6:4, septuplet 7:4 in a quarter beat. Marked NEEDS-ASSETS until art exists.
7. **Unequal-beat meters (Ch 27, 28):** 5/8, 5/4, 7/8 have *mixed-length* beats
   (e.g. 5/8 = 2+3 or 3+2 eighths). The current "every beat is one equal cell" model
   can't express a long beat next to a short beat. Needs a beat-grouping descriptor
   and a renderer that beams/spaces unequal groups. Engine work.
8. **Tempo modulation (Ch 31):** requires a tempo *change* keyed to a note-value
   equivalence (e.g. "eighth = eighth" across a meter change), i.e. playback tempo
   that varies mid-piece. Needs (4)+(5) plus a variable-tempo playback clock.

---

## B) Proposed unified LEVEL LADDER

Two ways into the same level set:

- **Curriculum path** — chapters in Hall order; the meter (time signature, beat
  count, beat unit) is set **automatically** per level. This is the default guided
  ladder below.
- **Meter picker** — a free dropdown that lets the user pick any *ready* meter and
  practice its full vocabulary regardless of curriculum position (see selector at end).

Each ladder entry is one Hall chapter or a tight cluster. Vocabulary is **cumulative
within a beat-unit family** (you don't carry quarter-beat figures into a half-beat
meter — the beat changed — but within e.g. 6/8 you accumulate Ch5→8→10).

### Ladder — READY levels (ship now)

These mirror the existing `LEVELS`/`COMPOUND_LEVELS` shape (cumulative steps).

**Simple, quarter beat (`medium` + `tpl`)** — time sigs 2/4·3/4·4/4, beats 2–4:
| Lvl | Hall | Time sig | Cumulative vocabulary (figure IDs) |
|-----|------|----------|-------------------------------------|
| S1 | Ch 1–3 | 2/4·3/4·4/4 | `quarter`, `two-eighths` |
| S2 | (Ch 1–3) | 4/4 | + `quarter-rest`, `half` |
| S3 | Ch 4 | 4/4 | + `dotted-quarter-eighth` |
| S4 | Ch 6 | 4/4 | + `four-sixteenths`, `eighth-two-sixteenths`, `two-sixteenths-eighth`, `sixteenth-eighth-sixteenth` |
| S5 | Ch 7 | 4/4 | + `dotted-eighth-sixteenth`, `sixteenth-dotted-eighth` |
| S6 | Ch 9 | 4/4 | + `eighth-rest-eighth`, `eighth-eighth-rest`, `eighth-quarter-eighth`, `eighth-rest-two-sixteenths`, `sixteenth-rest-three-sixteenths` |
| S7 | Ch 12 | 4/4 | + `triplet-eighths`, `triplet-quarters` |

(S1–S7 == existing `L_STEPS`; no change needed.)

**Compound, dotted-quarter beat (`cd`)** — 6/8 (2) → 9/8 (3) → 12/8 (4):
| Lvl | Hall | Time sig | Cumulative vocabulary |
|-----|------|----------|------------------------|
| C1 | Ch 5 | 6/8 | `cd-dotted-quarter`, `cd-three-eighths`, `cd-quarter-eighth`, `cd-eighth-quarter`, `cd-duplet` |
| C2 | Ch 10 | 6/8 | + `cd-dotted-quarter-rest`, `cd-8rest-8-8`, `cd-8-8rest-8`, `cd-8-8-8rest`, `cd-quarter-8rest`, `cd-8rest-quarter` |
| C3 | Ch 8 | 6/8 | + `cd-six-sixteenths`, `cd-two16-8-8`, `cd-8-two16-8`, `cd-8-8-two16`, `cd-four16-8`, `cd-8-four16`, `cd-quarter-two16`, `cd-two16-quarter` |
| C4 | Ch 11 | 9/8 | (full `cd` set; 3 beats/measure) |
| C5 | Ch 11 | 12/8 | (full `cd` set; 4 beats/measure) |

(C1–C3 == existing `CMP_STEPS`; C4/C5 reuse the same figures with beatsPerMeasure 3 and 4.)

**Simple, half-note beat (`hb`)** — Ch 14, 2/2 (2) & 3/2 (3):
| Lvl | Hall | Time sig | Cumulative vocabulary |
|-----|------|----------|------------------------|
| H1 | Ch 14 | 2/2 | `hb-half`, `hb-two-quarters`, `hb-quarter-two8`, `hb-two8-quarter`, `hb-four-eighths` |
| H2 | Ch 14 | 2/2 | + `hb-half-rest`, `hb-quarter-qrest`, `hb-qrest-quarter`, `hb-8rest-8-quarter`, `hb-quarter-8rest-8` |
| H3 | Ch 14 | 2/2 | + `hb-eight-16ths`, `hb-two16-q`, `hb-q-two16`, `hb-two8-four16`, `hb-four16-two8`, `hb-8-two16-8`, `hb-two16-8-8`, `hb-8-8-two16` |
| H4 | Ch 14 | 3/2 | (full `hb` set; 3 beats/measure) |

**Compound, dotted-half beat (`dh`)** — Ch 15, 6/4 (2) → 9/4 (3) → 12/4 (4):
| Lvl | Hall | Time sig | Cumulative vocabulary |
|-----|------|----------|------------------------|
| DH1 | Ch 15 | 6/4 | `dh-dotted-half`, `dh-three-quarters`, `dh-half-quarter`, `dh-quarter-half`, `dh-duplet`, `dh-six-eighths` |
| DH2 | Ch 15 | 6/4 | + `dh-dotted-half-rest`, `dh-qrest-q-q`, `dh-q-qrest-q`, `dh-q-q-qrest`, `dh-half-qrest`, `dh-qrest-half` |
| DH3 | Ch 15 | 6/4 | + `dh-two8-q-q`, `dh-q-two8-q`, `dh-q-q-two8`, `dh-four8-q`, `dh-q-four8`, `dh-half-two8`, `dh-two8-half` |
| DH4 | Ch 15 | 9/4 / 12/4 | (full `dh` set; 3 or 4 beats/measure) |

**Compound, dotted-eighth beat (`de`)** — Ch 17, 6/16 (2) → 9/16/12/16:
| Lvl | Hall | Time sig | Cumulative vocabulary |
|-----|------|----------|------------------------|
| DE1 | Ch 17 | 6/16 | `de-dotted-eighth`, `de-three-16ths`, `de-eighth-16th`, `de-16th-eighth`, `de-duplet` |
| DE2 | Ch 17 | 6/16 | + `de-dotted-eighth-rest`, `de-16rest-16-16`, `de-16-16rest-16`, `de-16-16-16rest`, `de-eighth-16rest`, `de-16rest-eighth` |
| DE3 | Ch 17 | 6/16 | + `de-six-32nds`, `de-two32-16-16`, `de-16-two32-16`, `de-16-16-two32`, `de-four32-16`, `de-16-four32`, `de-eighth-two32`, `de-two32-eighth` |

### Recommended full guided order (curriculum path)
S1 → S2 → S3 → C1 (Ch5 first compound) → S4 → C3(Ch8) → S5 → S6 → C2(Ch10) →
C4/C5 (Ch11, 9/8·12/8) → S7 (Ch12 triplets) → H1→H4 (Ch14 half beat) →
DH1→DH4 (Ch15 dotted-half) → DE1→DE3 (Ch17 dotted-eighth).

This interleaves the simple and compound tracks the way Hall does (Ch5/8/10/11 sit
between the simple chapters), but the data is clean even if you keep them as two
separate ladders (Simple S-series, Compound C-series) plus the three new beat-unit
mini-ladders (H, DH, DE) — whichever the UI prefers.

### NEEDS-ASSETS / NEEDS-ENGINE levels (placeholders for later)
- **Ch16 eighth-beat (2/8,3/8):** add prefix `eb-`; reuse this same ladder shape once art lands.
- **Ch26 5/6/7-tuplets:** add to the simple quarter-beat ladder as S8 once `tpl-quintuplet/-sextuplet/-septuplet` art lands.
- **Ch13/23–25/30 polyrhythm, Ch19–22/29 changing/unequal meters, Ch31 tempo mod:** require engine work (see footnotes A.1–A.8); do not ship as levels yet.

### Recommended METER selector (dropdown) contents
Only meters whose art exists today. Group by simple/compound; show the beat-count and
unit so the user knows what they're getting.

```
SIMPLE
  2/4  — 2 quarter beats          (medium / tpl)
  3/4  — 3 quarter beats          (medium / tpl)
  4/4  — 4 quarter beats          (medium / tpl)
  2/2  — 2 half-note beats        (hb)
  3/2  — 3 half-note beats        (hb)
COMPOUND
  6/8  — 2 dotted-quarter beats   (cd)
  9/8  — 3 dotted-quarter beats   (cd)
  12/8 — 4 dotted-quarter beats   (cd)
  6/4  — 2 dotted-half beats      (dh)   [9/4·12/4 optional extras]
  6/16 — 2 dotted-eighth beats    (de)   [9/16·12/16 optional extras]
```

When a meter is picked, set `S.meter` (simple|compound), `S.beatsPerMeasure`
(= top/3 for compound, = top for simple), the beat-unit family (→ which figure
array + asset prefix to use), and default the level to that family's top tier
(full vocabulary) unless the user is on the curriculum path.

---

## C) Ready-to-paste figure arrays (COMPOUND_FIGS style)

Built directly from the manifests. Conventions matched to `COMPOUND_FIGS` in
solo-mode.js: every fig is `beats: 1`, `keys: K` (= `['b/4']`), rests use a `'r'`
duration suffix (`'qr'`, `'8r'`, `'16r'`, `'hr'`), and dots use `dots: N`. The
manifests' `dot:1`/`rest:1` keys have been converted accordingly. Where a manifest
entry has a `tuplet` (the `-duplet` figures: 2 notes in the space of 3), the engine
must apply that 2:3 tuplet — preserved in a comment so the main agent wires it.

```js
// Drop these next to COMPOUND_FIGS in solo-mode.js. K = ['b/4'].

/* --- Simple HALF-NOTE beat (2/2 · 3/2) — Hall Ch14 --- */
var HALF_FIGS = [
  { id: 'hb-half',          name: 'Half',            beats: 1, vexflow: [{ keys: K, duration: 'h' }] },
  { id: 'hb-two-quarters',  name: 'Two quarters',    beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'q' }] },
  { id: 'hb-quarter-two8',  name: 'Quarter + 2 eighths', beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
  { id: 'hb-two8-quarter',  name: '2 eighths + quarter', beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: 'q' }] },
  { id: 'hb-four-eighths',  name: 'Four eighths',    beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
  { id: 'hb-half-rest',     name: 'Half rest',       beats: 1, vexflow: [{ keys: K, duration: 'hr' }] },
  { id: 'hb-quarter-qrest', name: 'Quarter + q-rest',beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'qr' }] },
  { id: 'hb-qrest-quarter', name: 'q-rest + quarter',beats: 1, vexflow: [{ keys: K, duration: 'qr' }, { keys: K, duration: 'q' }] },
  { id: 'hb-8rest-8-quarter', name: '8r 8 quarter',  beats: 1, vexflow: [{ keys: K, duration: '8r' }, { keys: K, duration: '8' }, { keys: K, duration: 'q' }] },
  { id: 'hb-quarter-8rest-8', name: 'Quarter 8r 8',  beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '8r' }, { keys: K, duration: '8' }] },
  { id: 'hb-eight-16ths',   name: 'Eight 16ths',     beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
  { id: 'hb-two16-q',       name: '2-16 + quarter',  beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: 'q' }] },
  { id: 'hb-q-two16',       name: 'Quarter + 2-16',  beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
  { id: 'hb-two8-four16',   name: '2-8 + 4-16',      beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
  { id: 'hb-four16-two8',   name: '4-16 + 2-8',      beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
  { id: 'hb-8-two16-8',     name: '8 2-16 8',        beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '8' }] },
  { id: 'hb-two16-8-8',     name: '2-16 8 8',        beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
  { id: 'hb-8-8-two16',     name: '8 8 2-16',        beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] }
];

/* --- Compound DOTTED-HALF beat (6/4 · 9/4 · 12/4) — Hall Ch15 --- */
var DOTTEDHALF_FIGS = [
  { id: 'dh-dotted-half',     name: 'Dotted half',      beats: 1, vexflow: [{ keys: K, duration: 'h', dots: 1 }] },
  { id: 'dh-three-quarters',  name: 'Three quarters',   beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'q' }, { keys: K, duration: 'q' }] },
  { id: 'dh-half-quarter',    name: 'Half + quarter',   beats: 1, vexflow: [{ keys: K, duration: 'h' }, { keys: K, duration: 'q' }] },
  { id: 'dh-quarter-half',    name: 'Quarter + half',   beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'h' }] },
  // dh-duplet: 2 quarters in the space of 3 (tuplet 2:3) — apply {num_notes:2, notes_occupied:3}
  { id: 'dh-duplet',          name: 'Duplet',           beats: 1, tuplet: { num_notes: 2, notes_occupied: 3 }, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'q' }] },
  { id: 'dh-dotted-half-rest',name: 'Dotted-half rest', beats: 1, vexflow: [{ keys: K, duration: 'hr', dots: 1 }] },
  { id: 'dh-qrest-q-q',       name: 'qr q q',           beats: 1, vexflow: [{ keys: K, duration: 'qr' }, { keys: K, duration: 'q' }, { keys: K, duration: 'q' }] },
  { id: 'dh-q-qrest-q',       name: 'q qr q',           beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'qr' }, { keys: K, duration: 'q' }] },
  { id: 'dh-q-q-qrest',       name: 'q q qr',           beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'q' }, { keys: K, duration: 'qr' }] },
  { id: 'dh-half-qrest',      name: 'Half + q-rest',    beats: 1, vexflow: [{ keys: K, duration: 'h' }, { keys: K, duration: 'qr' }] },
  { id: 'dh-qrest-half',      name: 'q-rest + half',    beats: 1, vexflow: [{ keys: K, duration: 'qr' }, { keys: K, duration: 'h' }] },
  { id: 'dh-six-eighths',     name: 'Six eighths',      beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
  { id: 'dh-two8-q-q',        name: '2-8 q q',          beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: 'q' }, { keys: K, duration: 'q' }] },
  { id: 'dh-q-two8-q',        name: 'q 2-8 q',          beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: 'q' }] },
  { id: 'dh-q-q-two8',        name: 'q q 2-8',          beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: 'q' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
  { id: 'dh-four8-q',         name: '4-8 q',            beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: 'q' }] },
  { id: 'dh-q-four8',         name: 'q 4-8',            beats: 1, vexflow: [{ keys: K, duration: 'q' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
  { id: 'dh-half-two8',       name: 'Half + 2-8',       beats: 1, vexflow: [{ keys: K, duration: 'h' }, { keys: K, duration: '8' }, { keys: K, duration: '8' }] },
  { id: 'dh-two8-half',       name: '2-8 + half',       beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '8' }, { keys: K, duration: 'h' }] }
];

/* --- Compound DOTTED-EIGHTH beat (6/16 · 9/16 · 12/16) — Hall Ch17 --- */
var DOTTED16_FIGS = [
  { id: 'de-dotted-eighth',     name: 'Dotted eighth',    beats: 1, vexflow: [{ keys: K, duration: '8', dots: 1 }] },
  { id: 'de-three-16ths',       name: 'Three 16ths',      beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
  { id: 'de-eighth-16th',       name: 'Eighth + 16th',    beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '16' }] },
  { id: 'de-16th-eighth',       name: '16th + eighth',    beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '8' }] },
  // de-duplet: 2 sixteenths in the space of 3 (tuplet 2:3)
  { id: 'de-duplet',            name: 'Duplet',           beats: 1, tuplet: { num_notes: 2, notes_occupied: 3 }, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }] },
  { id: 'de-dotted-eighth-rest',name: 'Dotted-8th rest',  beats: 1, vexflow: [{ keys: K, duration: '8r', dots: 1 }] },
  { id: 'de-16rest-16-16',      name: '16r 16 16',        beats: 1, vexflow: [{ keys: K, duration: '16r' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
  { id: 'de-16-16rest-16',      name: '16 16r 16',        beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16r' }, { keys: K, duration: '16' }] },
  { id: 'de-16-16-16rest',      name: '16 16 16r',        beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '16r' }] },
  { id: 'de-eighth-16rest',     name: 'Eighth + 16r',     beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '16r' }] },
  { id: 'de-16rest-eighth',     name: '16r + eighth',     beats: 1, vexflow: [{ keys: K, duration: '16r' }, { keys: K, duration: '8' }] },
  { id: 'de-six-32nds',         name: 'Six 32nds',        beats: 1, vexflow: [{ keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }] },
  { id: 'de-two32-16-16',       name: '2-32 16 16',       beats: 1, vexflow: [{ keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '16' }, { keys: K, duration: '16' }] },
  { id: 'de-16-two32-16',       name: '16 2-32 16',       beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '16' }] },
  { id: 'de-16-16-two32',       name: '16 16 2-32',       beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '16' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }] },
  { id: 'de-four32-16',         name: '4-32 16',          beats: 1, vexflow: [{ keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '16' }] },
  { id: 'de-16-four32',         name: '16 4-32',          beats: 1, vexflow: [{ keys: K, duration: '16' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }] },
  { id: 'de-eighth-two32',      name: 'Eighth + 2-32',    beats: 1, vexflow: [{ keys: K, duration: '8' }, { keys: K, duration: '32' }, { keys: K, duration: '32' }] },
  { id: 'de-two32-eighth',      name: '2-32 + eighth',    beats: 1, vexflow: [{ keys: K, duration: '32' }, { keys: K, duration: '32' }, { keys: K, duration: '8' }] }
];
```

### Matching CMP_STEPS-style tier arrays (for the new beat units)
```js
var HALF_STEPS = [
  ['hb-half', 'hb-two-quarters', 'hb-quarter-two8', 'hb-two8-quarter', 'hb-four-eighths'],
  ['hb-half-rest', 'hb-quarter-qrest', 'hb-qrest-quarter', 'hb-8rest-8-quarter', 'hb-quarter-8rest-8'],
  ['hb-eight-16ths', 'hb-two16-q', 'hb-q-two16', 'hb-two8-four16', 'hb-four16-two8', 'hb-8-two16-8', 'hb-two16-8-8', 'hb-8-8-two16']
];
var HALF_LABELS = { 1: '2/2 · quarters & eighths', 2: '2/2 · + rests', 3: '2/2 · + sixteenths' };

var DOTTEDHALF_STEPS = [
  ['dh-dotted-half', 'dh-three-quarters', 'dh-half-quarter', 'dh-quarter-half', 'dh-duplet', 'dh-six-eighths'],
  ['dh-dotted-half-rest', 'dh-qrest-q-q', 'dh-q-qrest-q', 'dh-q-q-qrest', 'dh-half-qrest', 'dh-qrest-half'],
  ['dh-two8-q-q', 'dh-q-two8-q', 'dh-q-q-two8', 'dh-four8-q', 'dh-q-four8', 'dh-half-two8', 'dh-two8-half']
];
var DOTTEDHALF_LABELS = { 1: '6/4 · quarters', 2: '6/4 · + rests', 3: '6/4 · + eighths' };

var DOTTED16_STEPS = [
  ['de-dotted-eighth', 'de-three-16ths', 'de-eighth-16th', 'de-16th-eighth', 'de-duplet'],
  ['de-dotted-eighth-rest', 'de-16rest-16-16', 'de-16-16rest-16', 'de-16-16-16rest', 'de-eighth-16rest', 'de-16rest-eighth'],
  ['de-six-32nds', 'de-two32-16-16', 'de-16-two32-16', 'de-16-16-two32', 'de-four32-16', 'de-16-four32', 'de-eighth-two32', 'de-two32-eighth']
];
var DOTTED16_LABELS = { 1: '6/16 · 16ths', 2: '6/16 · + rests', 3: '6/16 · + 32nds' };
```

### Wiring notes for the main agent
- These four families slot in beside `COMPOUND_FIGS`/`CMP_STEPS` identically. Pick the
  fig array + steps by the selected beat unit (quarter→engine medium, half→HALF,
  dotted-quarter→COMPOUND, dotted-half→DOTTEDHALF, dotted-eighth→DOTTED16).
- Set `beatsPerMeasure` from the chosen time signature: simple = top number;
  compound = top/3. The fig list does not change with beat count — only how many
  cells fill a measure (6/8→2, 9/8→3, 12/8→4; 6/4→2, 9/4→3, 12/4→4; 2/2→2, 3/2→3).
- The `-duplet` figures (`dh-duplet`, `de-duplet`, and the existing `cd-duplet`)
  carry a 2:3 tuplet; ensure the renderer/grader applies it (cd-duplet already does
  in COMPOUND_FIGS — match that handling).
- Manifest `dot:1`→`dots:1`, manifest `rest:1`→`'r'` duration suffix. All durations
  above were transcribed 1:1 from the manifests; counts per cell sum to the beat
  (e.g. dotted-half = 3 quarters = 6 eighths; dotted-eighth = 3 sixteenths = 6 32nds).
