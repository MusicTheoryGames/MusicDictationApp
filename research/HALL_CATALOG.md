# Hall & Urban "Studying Rhythm" (4th ed.) — consolidated read catalog

Page-by-page read of all 252 pages by a 6-agent fleet (syllable systems ignored;
focus = principles, rhythms, example types). Cross-checks/enriches `CURRICULUM_PLAN.md`.
Authors: Anne Carothers Hall + Timothy Paul Urban (Pearson, ©2019). **31 chapters,
~450 studies (≈370 in simple meter), most 12–16 measures; designed as a 12–16-week course.**

## Per-chapter EXAMPLE-TYPE template (every chapter, confirmed)
Prose principle + conducting diagram → **numbered Preparatory Exercises** (short
repeated single-cell drills; some 2-line clap/tap) → **lettered single-line studies**
(tempo/character word + metronome mark + dynamics; ~8–24 mm) → **real-music excerpt(s)**
(named composers) → **2-line duets & occasional 3-line trios** (clap one line, tap
another) → **text-set rhythm** from real poetry/drama → **Structured Improvisation**
(escalating: complete-the-bar → antecedent/consequent **period** → motive→phrase →
**sentence** → 8-bar forms → call-and-response → two-part). Anacrusis/pickups +
whole-measure-rest phrase separation throughout. (Counting/Kodály/Takadimi syllable
rows sit under every prep exercise — IGNORED per product owner.)

→ **These example types = our future GAME MODES:** single-line dictation (core) ·
**2-/3-line duet/trio** = two-tap-zone performance mode (NEEDS-ENGINE; the on-ramp to
the polyrhythm chapters) · **real-music excerpts** = "real tune" flavor levels ·
**improvisation** = a compose/tap-back mode. Ties-across-barline + pickups are
structural features the generator must support.

## Chapter ladder (principle · meter/beat · new figures · build status)

| Ch | Principle / new problem | Meter · beat | Key NEW figures | Build status |
|----|-------------------------|--------------|-----------------|--------------|
| 1 | The beat; simple DUPLE; strong/weak | 2/4 · quarter | quarter, half, eighth-pairs, rests, ties; **"syn-co-pa" (e–q–e) named in prep 1.3** | READY |
| 2 | Third beat; simple TRIPLE | 3/4 · quarter | dotted-half (full bar), half+quarter / quarter+half | READY |
| 3 | Secondary accent (beat 3); QUADRUPLE | 4/4 (C) · quarter | whole note, accents (>) | READY |
| 4 | Dotted quarter + ties | 2/4·3/4·4/4 · quarter | **dotted-quarter+eighth**, ties over barline | READY |
| 5 | COMPOUND duple (feel in 2) | 6/8 · dotted-quarter | ♩., ♪♪♪, ♩♪, ♪♩, dotted-quarter rest, eighth+2-16 | READY (`cd`) |
| 6 | Sixteenths in simple | 2/4·3/4·4/4 · quarter | 4-16ths, e+2-16, 2-16+e, 16-e-16 | READY |
| 7 | Dotted eighths in simple | simple · quarter | dotted-8th+16th, 16th+dotted-8th (scotch snap), **DOUBLE-DOTS** ⟵ *add to plan* | READY (− double-dots) |
| 8 | Sixteenths in 6/8 | 6/8 · dotted-quarter | 4-/5-/6-note compound beat cells + tied/dotted | READY (`cd`) |
| 9 | Rests as "active silence" + SYNCOPATION (simple) | simple · quarter | e–q–e sync, off-beat ties, rests on strong beats; flagged (un-beamed) notation | READY |
| 10 | Rests + syncopation in 6/8 | 6/8 · dotted-quarter | compound syncopation, duple-division of the dotted-quarter beat | READY (`cd`) |
| 11 | 9/8 & 12/8 | 9/8·12/8 · dotted-quarter | (no new figs; 3 & 4 compound beats) | READY (`cd`) |
| 12 | Triplets (borrowed division) | simple · quarter | eighth-triplet, **quarter-triplet**, **sextuplet**, duple-vs-triple alternation | READY (`tpl`) |
| 13 | **Two against three** (polyrhythm) | compound · 2 voices | 2:3, the composite/resultant rhythm | **NEEDS-ENGINE (2-voice)** |
| 14 | Half-note beat (no new rhythm, doubled values) | 2/2·3/2·4/2 · half | values scaled to half-note beat | READY (`hb`) |
| 15 | Dotted-half beat (compound) | 6/4·9/4·12/4 · dotted-half | 3 quarters/beat, scaled compound figs | READY (`dh`) |
| 16 | Eighth-note beat (no new rhythm, halved) | 2/8·3/8·4/8 · eighth | values scaled to eighth beat | NEEDS-ASSETS (`eb`); **PDF missing pp.122–125 (ch16 open)** |
| 17 | Dotted-eighth beat (compound) | 6/16·9/16·12/16 · dotted-8th | 3 sixteenths/beat, +32nds | READY (`de`) |
| 18 | **Small subdivisions** | slow simple+compound | **32nds, 64ths, irregular tuplets (3/5/7) at slow tempo** ⟵ *real level, plan flagged* | NEEDS-ASSETS |
| 19 | Changing SIMPLE meter | mixed simple (♪ const) | per-bar meter change, varying bar length | **NEEDS-ENGINE (per-bar meter)** — DONE in app (changing-simple) |
| 20 | Changing COMPOUND meter | mixed compound | per-bar compound meter change | NEEDS-ENGINE — partially in app |
| 21 | Simple↔Compound, **DIVISION constant (♪=♪)** | mixed · eighth const | beat shifts q↔dotted-q, division held; **♪=♪ equivalence mark** | NEEDS-ENGINE |
| 22 | Simple↔Compound, **BEAT constant (♩=♩.)** | mixed · beat const | beat held, eighth changes; **♩=♩. mark** | NEEDS-ENGINE — DONE in app (change:beatconst) |
| 23 | Three-in-two / two-in-three | poly · 2 voices | 3:2 / 2:3 | NEEDS-ENGINE (2-voice) |
| 24 | Four against three | poly · 2 voices | 4:3 | NEEDS-ENGINE (2-voice) |
| 25 | Four-in-three / three-in-four | poly · 2 voices | 4:3 / 3:4 | NEEDS-ENGINE (2-voice) |
| 26 | Quintuplets & septuplets (asymmetric divisions) | simple · quarter | **5-, 6-, 7-tuplets**, symmetric↔asymmetric alternation | NEEDS-ASSETS (`tpl-*` art) |
| 27 | Five-eight & five-four (first UNEQUAL meter) | 5/8, 5/4 | **2+3 / 3+2** unequal-beat grouping | **NEEDS-ENGINE (unequal beats)** |
| 28 | More unequal-beat meters | 7/8, 8/8, 9/8-asym, 11/8 | 2+2+3, 3+2+2, 3+3+2, 2+2+2+3…; folk tunes (Bulgarian/Macedonian) | NEEDS-ENGINE (unequal beats) |
| 29 | Changing unequal meters (♪ const) | mixed odd · eighth const | per-bar odd-meter change; Stravinsky/Bartók | NEEDS-ENGINE |
| 30 | More cross-rhythms / POLYMETER | 6/8-vs-2/4, 5/4-vs-3/2, 5+7/8-vs-12/8 | 3:2, groups-of-7, **dual time sigs**; West-African | NEEDS-ENGINE (2-voice polymeter) |
| 31 | **Tempo / metric MODULATION** | mixed | note-value held across meter change → proportional tempo (♩=♩., trip-8=8); Carter | NEEDS-ENGINE (variable-tempo clock) |

## Refinements vs CURRICULUM_PLAN (from the read)
- **Add double-dotted figures** (Ch 7) — absent from the plan's bank.
- **Ch 18 "Small Subdivisions"** is a real teachable level (32nds/64ths + 3/5/7 irregular tuplets at slow tempo) — the plan had it vague; treat as an advanced simple/compound level needing 32nd/64th art.
- **Syncopation is introduced *by name* in Ch 1** (the "syn-co-pa" e–q–e cell) — so a tiny taste of syncopation can appear earlier than the dedicated Ch 9, if desired.
- **Two changing simple↔compound modes are distinct:** Ch 21 = DIVISION-constant (♪=♪), Ch 22 = BEAT-constant (♩=♩.). App already has beat-constant; division-constant (Ch 21) is the not-yet-built sibling.
- The plan's READY/NEEDS-ENGINE assessment is **confirmed**: everything simple/compound single-voice with existing beat-units is buildable now; the genuine engine gaps are **(a) 2-voice/polyrhythm** (Ch 13, 23–25, 30 + the duet/trio mode), **(b) unequal/asymmetric meters** (Ch 27–29), **(c) variable-tempo clock for modulation** (Ch 31), **(d) per-bar changing meter** (Ch 19–22, mostly built), **(e) tuplet/32nd/64th art** (Ch 18, 26).
- **Real-music excerpts** span easy→hard: Türk, Petzold, J.S. Bach, Beethoven (Ode to Joy), Telemann, Handel, Haydn, Mozart, Gounod, Dvořák, Tchaikovsky (Pathétique 5/4), Pierné, Scriabin, Stravinsky, plus Bulgarian/Macedonian folk; **text settings** from Shakespeare, Poe, Dunbar, Wilde, Browning, Hardy, Dickinson, Coleridge, Carroll, etc. → a ready-made "real music" flavor track.

_(Pending: Ch 10 + Ch 22–25 detail from the last 2 agents — table rows above are from the plan + adjacent agents; will confirm.)_
