# Tapping/Performance game — Hall difficulty research (grounds the tapping ladder)

Difficulty-graded read of Hall & Urban "Studying Rhythm" (4th ed.) PERFORMANCE content
(tapping/clapping, not dictation). Source-verified against the page PNGs. Feeds the
TAPPING level system (twin of the dictation ladder, on the shared core).

## The key insight (from Hall's own front matter, printed pp. 1, vi–viii)
- **Single-line studies are ALREADY a two-hand task:** tap a steady **beat in one hand** while
  tapping the **rhythm in the other** — from the very first study. So the tapping game's foundation
  IS beat-hand-vs-rhythm-hand coordination (exactly the product owner's design).
- **Duets are designed for SOLO performance:** two hands, one per line ("a better way is to tap
  both parts").
- **Trios = voice + two hands** (or hand + foot). Hall says the 2- and 3-part studies are "much
  more difficult than the single lines." Duets/trios sit near the end of nearly every chapter.

## The difficulty driver
- **Single-line:** how much the rhythm **fights the beat** (on-beat → ties-across-beat → sixteenths
  → **syncopation = first real independence** → compound → triplets-against-beat → unequal/changing
  beat = the BEAT HAND itself goes uneven/variable).
- **Two-line duets:** **attack independence** — shared attacks (easy) → offset/contrasting densities
  (intermediate) → both lines syncopated (advanced) → **deliberately conflicting divisions =
  polyrhythm (peak)**.

## The 16-level tapping ladder (easy → hard, source-grounded)
| Lvl | Skill | Mode | Hall ch | ★ |
|----|-------|------|---------|---|
| 1 | beat-keeping under simple rhythm | 1-line 2-hand | 1–3 | ★ |
| 2 | ties across the beat (rhythm silent on a beat-tap) | 1-line | 4 | ★★ |
| 3 | sixteenths & scotch-snap vs steady beat | 1-line | 6–7 | ★★ |
| 4 | **easy duets** — shared attacks, complementary lines | 2-line | 1–3 duets | ★★ |
| 5 | compound beat-keeping (beat=dotted-qtr, rhythm in 3s) | 1-line | 5,8,11 | ★★★ |
| 6 | **syncopation vs the beat** — FIRST true independence | 1-line | 9,10 | ★★★ |
| 7 | intermediate duets — offset densities; first trio (6.P) | 2-line | 3–8,11 | ★★★ |
| 8 | triplets vs beat (single-hand polyrhythm) | 1-line | 12 | ★★★★ |
| 9 | advanced independent duets — both lines syncopated | 2-line | 9,10,12 | ★★★★ |
| 10 | changing/scaled beat units; tuplet precision | 1-line | 14–22,26 | ★★★★ |
| 11 | **Polyrhythm I — 2:3** (gateway; scaffold heavily) | 2-line poly | 13 | ★★★★★ |
| 12 | Polyrhythm II — 3:2 → 4:3 (longer out-of-phase) | 2-line poly | 23,24 | ★★★★★ |
| 13 | Polyrhythm III — 4-in-3 / 3-in-4 intra-beat | 2-line poly | 25 | ★★★★★★ |
| 14 | **unequal-beat keeping** — steady hand taps uneven 2+3… | 1-line | 27–29 | ★★★★★★ |
| 15 | **Polymeter — dual time signatures** (ceiling) | 2-line poly | 30 | ★★★★★★★ |
| 16 | metric modulation — beat-hand tempo changes mid-study | 1-line var-clock | 31 | ★★★★★★★ |

**Inflection points to design/scaffold around:** L6 (syncopation = hands first disagree),
L11 (Ch13 2:3 = polyrhythm gateway), L15 (Ch30 polymeter = true ceiling).

**Ground-truth correction:** Ch13 (2-against-3) is written **in 6/8** — upper staff = triple
division (3 eighths/beat), lower = duple (2 dotted-eighths), **sharing the downbeat** (the gentlest
polyrhythm, the right first one). NOT "triplets vs quarters in 2/4."

## Three-part (trio) recommendation — solves "how to do 3 lines with 2 hands"
**Primary: app plays one line, student taps the other two.** The app auto-plays the **steadiest**
line as an ostinato; the student taps the remaining two with two hands. Keeps all three voices
audible, reuses the planned "app-plays-a-line" engine, scales from Ch6.P (app plays the steady
eighth/sixteenth line) to Ch30 polymeter (app holds one meter).
**Fallback:** most non-polymetric trios are homophonic (2 lines support a 3rd) → drop the redundant
line, present as a 2-line duet (Ch14/15/18). **Bonus:** 2-student co-op (Hall's "one+ per part").

## How this maps to the requested features
- **App-plays-a-line** (product owner request) → the trio engine AND a duet aid AND a single-line model.
- **Hint buttons** (perform beat / measure / line) → scaffold the inflection levels (esp. L6, L11);
  costs groove points (consistent with dictation).
- Scoring = per-line per-beat all-or-nothing on tap timing (the single-clock tap-back engine that
  already ships in the dictation tap-back), forgiving tolerance window, both hands graded.
