# Hall & Urban — *Studying Rhythm* (4th ed.) — curriculum map

Source: `Studying Rhythm_Hall_FourthEdition.pdf` (table of contents, extracted).
Used ONLY to inform our level *progression/vocabulary* — we generate our own
rhythms, never reproduce the book's exercises (copyright). The book's genius is
that each chapter adds **one** new idea on top of the last → a ready-made
difficulty ladder.

## Full chapter progression
| Ch | Title | Meter / beat | New idea introduced |
|----|-------|--------------|---------------------|
| 1  | Simple Duple Meter | 2/4 | quarter, eighth, half; quarter beat |
| 2  | Simple Triple Meter | 3/4 | 3 beats per measure |
| 3  | Simple Quadruple Meter | 4/4 | 4 beats per measure |
| 4  | Dotted Quarters and Tied Notes | simple | dotted quarter, ties |
| 5  | **Compound Duple Meter** | **6/8** | **dotted-quarter beat = 3 eighths; ♩. ♪♪♪ ♩♪ ♪♩** |
| 6  | Sixteenth-Notes in Simple Meter | simple | sixteenths (4-16ths, 8th+2-16ths, etc.) |
| 7  | Dotted Eighths in Simple Meter | simple | dotted-eighth + sixteenth |
| 8  | **Sixteenth-Notes in Six-Eight Meter** | **6/8** | **sixteenths inside the compound beat** |
| 9  | More Rests and Syncopation in Simple Meter | simple | rests, syncopation |
| 10 | **More Rests and Syncopation in Six-Eight Meter** | **6/8** | **rests/syncopation in compound** |
| 11 | **Nine-Eight and Twelve-Eight Meter** | **9/8, 12/8** | **3 and 4 compound beats** |
| 12 | Triplets | simple | borrowed triplet (3 in a quarter) |
| 13 | Two Against Three | — | polyrhythm 2:3 |
| 14 | Half-Note Beat (Simple Meter) | cut/2-2 | half-note beat |
| 15 | **Dotted-Half-Note Beat (Compound Meter)** | **6/4-ish** | **slow compound (dotted-half beat)** |
| 16 | Eighth-Note Beat | fast simple | eighth-note beat (e.g. 2/8, 3/8) |
| 17 | **Dotted-Eighth-Note Beat (Compound Meter)** | **6/16-ish** | **fast compound (dotted-eighth beat)** |
| 18 | Small Subdivisions | — | finer subdivisions |
| 19 | Changing Simple Meter | mixed | meter changes (simple) |
| 20 | Changing Compound Meter | mixed | meter changes (compound) |
| 21 | Changing Simple↔Compound, Division Constant | mixed | conversion, 8th stays constant |
| 22 | Changing Simple↔Compound, Beat Constant | mixed | conversion, beat stays constant |
| 23 | Three in Two / Two in Three | — | 3:2, 2:3 |
| 24 | Four Against Three | — | 4:3 |
| 25 | Four in Three / Three in Four | — | 4:3, 3:4 |
| 26 | Quintuplets and Septuplets | — | 5- and 7-tuplets |
| 27 | Five-Eight and Five-Four Meter | 5/8, 5/4 | odd/unequal meters |
| 28 | More Meters with Unequal Beats | 7/8 etc. | more unequal-beat meters |
| 29 | Changing Meters with Unequal Beats | mixed | changing unequal meters |
| 30 | More Cross Rhythms | — | advanced cross-rhythm |
| 31 | Tempo Modulation | — | metric/tempo modulation |

## Two tracks through the book
- **Simple-meter track:** Ch 1–4, 6, 7, 9, 12, 14, 16 → quarters/eighths → dotted+ties → sixteenths → dotted-eighths → rests/syncopation → triplets → other beat units.
- **Compound-meter track:** **Ch 5 → 8 → 10 → 11 → 15 → 17** → 6/8 basics → 16ths in 6/8 → rests/sync in 6/8 → 9/8 & 12/8 → slow compound → fast compound.
- **Advanced:** Ch 13, 23–26, 30 (polyrhythm/tuplets); 19–22 (changing/converting meter); 27–29 (unequal beats); 31 (tempo modulation).

## Mapping to OUR app
**Simple meter — DONE (solo Levels 1–7, in `solo-mode.js` `L_STEPS`):**
L1 Ch1-3 · L2 +rests/half · L3 Ch4 dotted · L4 Ch6 sixteenths · L5 Ch7 dotted-eighths · L6 Ch9 rests/sync · L7 Ch12 triplets.

**Compound meter — IN PROGRESS (group by BEAT = dotted quarter; 6/8 = 2 cells):**
- Tier 1 = Ch 5 (eighth/quarter level): ♩. · ♪♪♪ · ♩♪ · ♪♩
- Tier 2 = Ch 5/10 rests: dotted-qtr rest, 8th-rest combos, ♩𝄽, 𝄽♩
- Tier 3 = Ch 8 sixteenths: ♬♬♬ · ♬♪♪ · ♪♬♪ · ♪♪♬ · ♬♬♪ · ♪♬♬ · ♩♬ · ♬♩
- Tier 4 = Ch 17 dotted-eighth (later): dotted-8th+16th+8th, 8th+dotted-8th+16th
- Then Ch 11 → 9/8 (3 cells) & 12/8 (4 cells).

**Not yet planned:** polyrhythms (Ch 13, 23–26), changing/odd meters (Ch 19–22, 27–29), tempo modulation (Ch 31) — need bigger engine work (see notes when we get there).
