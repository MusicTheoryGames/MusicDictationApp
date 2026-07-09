# Melodic ladder expansion plan — closing the "hear it → notate it" gap

Written 2026-07-02 after (a) the conformance audit (CONFORMANCE_AUDIT.md) and
(b) deep research into what actually makes melodic dictation hard
(MELODIC_DICTATION_RESEARCH.md — the five-agent evidence report). **This is a
plan for owner review, not built work.** Nothing here ships until the §7
decisions are made.

## 0. The one-sentence finding
Every high-confidence source (Karpinski, Chenette, Klonoski, Pembrook,
Nichols & Springer 2025) says the same thing: **melodic dictation fails at
working memory and chunking, not at "the ear."** Students lose the melody
before they can write it because they store it note-by-note instead of as
patterns, and lose the tonic mid-phrase. The current ladder trains *naming* and
*notating* well but barely trains the **memory and chunking stages that come
first** — the exact gap the owner felt as "it moves too fast / assumes you're
good after 3 rights."

## 1. What the ladder ALREADY gets right (keep, don't touch)
- **Scale-degree-function first, intervals deferred.** Research's #1 ranked
  intervention (398-teacher survey; interval-ID only explains ~29% of variance).
  M0–M8 are aural/degree work before notation — already correct.
- **Notation last (M9), two-phase (rhythm then pitch).** Matches the
  single-attention-stream finding (pitch is the weaker channel under dual load;
  rhythm-first is evidence-backed — Beckett 1997).
- **Hearing budget (3 + count-off) with unlimited Practice mode.** Research says
  limited hearings should be a *trained, graduated constraint*, not unlimited
  brute-force — we already have the mechanic; §4 upgrades it.
- **Missing-note (partial recall) and the Interval Gym's FEEL→FIND→NAME.**
  These already isolate sub-skills — the model the research begs for.
- **Coverage-gated advancement (just shipped).** Directly answers "don't move on
  after 3 rights."

## 2. What's MISSING — new ladder steps, mapped to insertion points
Each carries an evidence-strength flag from the research report and a concrete
slot. Reuse-first: most ride machinery we already have (drone/cadence, tap-stream,
generator, missing-note, mastery/coverage).

### NEW-A. Melody-memory span game (growing n). **[STRONG]**
Play back n TONAL notes; the student echoes them (tap the degrees / sing on the
short spans); n grows on success, shrinks on miss. Tonal working memory predicts
dictation at β=.406 and the authors explicitly recommend graduated pitch-sequence
practice; keep sequences tonal (structure is what transfers — random-note span
training does NOT transfer). No competitor connects span training to dictation.
- **Slot:** a new **M1.5 "Hold the tune"** rung between M1 (contour) and M2
  (rhythm), AND available as a permanent warm-up track (like the Gym).
- **Reuse:** the tap-stream engine (createTapStreamGame) + degree palette; grows
  the melody length the generator already parameterizes.

### NEW-B. Frequency-ranked tonal-chunk echo drills. **[STRONG]**
Play a 2–5-note tonal CELL (scalar run, triad outline, cadence formula ti-do /
re-do, sol-mi-la), student echoes/labels it in scale degrees. This builds the
*chunk vocabulary* that makes chunking possible — capacity is fixed, so we train
efficiency, not span. Banks are ready-made (Gordon MLT tonal patterns, Kodály
333); rank by corpus frequency later.
- **Slot:** a new **CHUNK track** (parallel side-mode like the Interval Gym),
  unlocked at M3 (once degrees exist), feeding all later levels. Also: seed each
  level's generator with its era-appropriate chunk set so real rounds contain
  recognizable patterns, not random legal notes.
- **Reuse:** generator + degree palette + mastery/coverage; new = a curated cell
  bank (start ~24 cells: pentascale runs, triad outlines, 3 cadence formulas).

### NEW-C. Protonotation entry stage. **[MODERATE — high originality]**
A NON-staff input mode: beat slashes + contour arrows + scale-degree numbers —
capture only what's HEARD, before fighting staff fluency. Karpinski's device;
adopted by Open Music Theory & Chenette's OER; **no shipped product has it.**
Lets us grade UNDERSTANDING separately from NOTATION (the diagnostic the whole
field asks for). Use onset-marking shorthand (Brown 2020 fixes protonotation's
rhythm weakness).
- **Slot:** a new **M8.5 "Sketch it"** rung between M8 (last no-staff level) and
  M9 (first staff notation) — the missing bridge. Also an optional
  "sketch-first" phase toggle on every notation-entry level.
- **Reuse:** renderRhythmLine's slot strip for beats; new = arrow/number chips +
  a proto→truth grader (compare degrees+contour+onsets, ignore staff placement).

### NEW-D. Bookend (first-note / last-note) anchoring drill. **[MODERATE]**
Given a phrase, notate ONLY the first and last notes (usually tonic-triad tones),
then a mode that fills inward. Named expert AP strategy (Paney & Buonviri 2014).
- **Slot:** a micro-drill mode available from M4 up; also the DEFAULT scaffold
  inside long (4/8-bar) notation rounds — anchor the ends first.
- **Reuse:** missing-note renderer with forced hide-set = interior notes.

### NEW-E. Cadence recognition as its own track. **[MODERATE]**
Classify cadence type / transcribe the bass line, separate from full harmonic
dictation (88% of Chenette's subjects used the bass as their primary strategy;
harmonic dictation overloads WM). We don't teach harmony yet, but cadence FEEL
(does it end open or closed? on home or away?) is a real, buildable ear skill and
a natural companion to M0's tonic sense.
- **Slot:** a **CADENCE track** (side-mode), unlocked ~M11 (full octave), and a
  cadence-labeling phase on the period levels (M17).
- **Reuse:** playCadence (already built for the Gym!) + a 2–4 button classifier.

### NEW-F. Stage-isolated error feedback — **SHIPPED** (build AI, 2026-07-02). **[STRONG NEED]**
core/feedback.js `classifyDictation` (pure, 8 tests): from per-note truth vs
answer it names the dominant failing STAGE — rhythm · count · contour · tonic ·
degree · clean — with a plain-language tip. Wired into the labeling (M3-M8),
notation-entry (rhythm+pitch split), and memory-span (M1.5) renderers: a wrong
answer shows a "Work on: <headline>. <tip>" line. Prod-verified (a contour flip
reads "Track the CONTOUR"). Remaining renderers (missing-note single-note,
error-detect, recognition) carry too little per-note data to classify usefully.

After any dictation attempt, tell the student WHICH stage failed: meter? contour?
a specific chunk? a scale degree? notation placement? Klonoski's central critique
is that a wrong transcription alone can't tell you what broke. Nobody ships this.
- **Slot:** not a level — an upgrade to every graded renderer's result path
  (classify the error using data we already compute: rhythm vs pitch accuracy,
  which degree, contour direction at the miss).
- **Reuse:** the per-note grading each renderer already does; new = a classifier
  + a plain-language "what to work on" line.

## 3. Difficulty engine dials (generator + coverage upgrade) **[STRONG]**
Baker's dissertation measured what makes a melody hard; expose these as graded
dials rather than the current implicit difficulty:
- **note density** (η²=.46 — the single biggest structural knob),
- **length / chunk count** (memory collapses past ~10 notes — Pembrook),
- **tonalness → minor → chromatic**, **interval size / disjunct motion**
  (errors "contract" on big leaps — Ortmann),
- **multi-timbre randomization** (piano-only training overfits to "specific
  notes," not function — already partly done via the Gym's timbre roulette).
Wire these into the length/mode ladder shipped in the depth build so a level's
material genuinely eases in and ramps up.

## 4. Upgrade the existing hearing budget → task-per-hearing routine **[MODERATE]**
We have the budget; add Karpinski's **P = (chunks / memory-limit) + 1** to set it
by melody length, and an OPTIONAL per-hearing checklist practiced as a routine
(hearing 1: meter + contour + bookends · 2: rhythm · 3: scale degrees · 4:
verify). CRITICAL CAVEAT from the research: **never pop these as live prompts
during a graded round** — Paney 2016 showed live attention-directing LOWERS
scores. Teach it in Practice mode only, as a rehearsable habit.

## 5. What the research says DO NOT build (or the app would get worse)
- **No forced sing-back before writing a full melody** — the single most
  replicated harm finding (Pembrook, Buonviri, Lima): inaccurate singing
  overwrites the memory trace. Sing-back stays OPTIONAL and only on short spans
  (this constrains the Interval Gym's SING station — keep it short-span, opt-in).
- **No live attention prompts during a graded item** (§4 caveat).
- **Don't hard-force write-while vs write-after** — no significant difference
  (Buonviri 2017/2021); offer both, respect preference.
- **Don't make unlimited replays the default** — brute-force kills transfer; keep
  the graduated hearing budget.

## 6. Proposed revised ladder shape (insertions in **bold**)
```
M0  Find home           M9  First staff notation
M1  Which way?          M10 Spot the wrong note
**M1.5 Hold the tune**  M11 Complete the octave
M2  Rhythm-first        …            (M11+: CADENCE track unlocks)
M3  First 3 degrees     M17 Period  (+ cadence labeling phase)
   (CHUNK track unlocks)…
M4  Read it back        M26 Composition capstone
M5–M8  pentascale/minor/3rds/P4P5
**M8.5 Sketch it (protonotation)**
Side tracks (always-available, like the Interval Gym):
  • Memory span (NEW-A)   • Chunk vocabulary (NEW-B)
  • Cadence ear (NEW-E)   • Interval Gym (existing)
Cross-cutting: bookend scaffold (NEW-D), stage-isolated feedback (NEW-F),
difficulty dials (§3), task-per-hearing routine (§4).
```

## 7. DECISIONS I need from the owner before building
1. **Two new numbered rungs (M1.5 Hold-the-tune, M8.5 Sketch-it) — insert into
   the main ladder, or keep them as optional side tracks so the numbered spine
   stays M0–M26?** (I lean: insert both — they're the missing memory/bridge steps
   the whole critique is about.)
2. **Build order.** Recommended by evidence strength + reuse: (1) memory-span
   game, (2) chunk-vocabulary drills, (3) stage-isolated feedback, (4)
   protonotation, (5) bookend scaffold, (6) cadence track, (7) difficulty dials,
   (8) task-per-hearing. Agree, or reprioritize?
3. **Scope now vs. later.** This is 8 substantial pieces. Do you want the full
   set built in a loop, or a first slice (say memory-span + chunk drills +
   protonotation — the three that most directly answer "it moves too fast") and
   then reassess?
4. **The in-flight Interval Gym (G3 SING mic + G4/G5)** — finish it first, or
   pause it and start this expansion? (They don't conflict; SING must stay
   short-span opt-in either way per §5.)

## 8. MINOR — orient FIRST, then drill the 6̂/7̂ forms (owner note, 2026-07-03)

**Owner directive: when minor is first introduced, an M0-TYPE aural orientation
must run BEFORE anything else in minor.** Minor currently debuts at **M6 "Minor
arrives early"** and jumps straight into recognition — a gap. Mastering "find
home" in *major* does NOT transfer to minor (the ♭3̂ color, the darker tonic pull,
the la-based map). So:

- **Add "Find home — minor" (M0-type) as minor arrives.** Reuse the live find-home
  engine (`createLiveHomeRenderer` in melodic-renderers.js) with the **minor** scale
  instead of major; run the same tap-HOME-across-keys flow in minor keys. Add a
  **"hear the minor third (♭3̂)"** landmark — that lowered third is *what makes it
  sound minor*, so it is the defining thing to internalize. Lighter than the full
  5-stage M0 (they're not raw beginners). Placement lean: a compact **M5.5 "Find
  home — minor"** rung (or stage 0 of M6), independently testable.

- **Then an EAR drill for the variable degrees — "raised or lowered 7̂?" and "raised
  or lowered 6̂?"** — to really drill in the three forms of minor:
  - natural minor = ♭6̂ ♭7̂
  - harmonic minor = ♭6̂ **♯7̂** (leading tone)
  - melodic minor (asc) = **♯6̂ ♯7̂**
  This is the aural foundation UNDER the existing **M13 "Full minor: three forms"**
  (today recognition/notation). Build it as an M0-style aural discrimination rung
  (hear a 6̂/7̂ or a short phrase and pick which form) BEFORE / feeding M13 — e.g.
  **M12.5 "Which 6? Which 7?"** — so students HEAR the forms before labeling them.

Reuse: the live find-home substrate; scale-degree targeting + la-based label system
already exist. NOT yet built — captured per owner "make a note to add this before it
does anything else." Pairs with the open **M1** thread (up/down + step/skip;
pick-the-contour-shape) — same principle: orient the ear before demanding
recognition.

## 9. Shape-picker difficulty + Gym shape-match game (owner notes, 2026-07-03)

Captured, NOT yet built (owner: "just make a note"):

- **More decoy shapes as a difficulty ramp.** M1 stage 2 (shape-picker) currently
  shows 3 options and grows the melody 3→6 notes. Idea: on the *last* rounds also add
  **1, 2, or 3 extra shape options** (→ 4/5/6 lines to choose from) so the
  discrimination gets harder, not just the melody longer. Two independent difficulty
  axes: melody LENGTH and number of DECOY shapes. `createShapePickerRenderer` already
  takes `ctx.shapeLen`; add a parallel `ctx.shapeOptions` (default 3) and generate that
  many distinct-signature distractors.

- **Gym "match the shape" game (~10 shapes).** In the practice Gym (side-track, like
  the Interval Gym), a harder standalone drill: play a short melody, show **~10** contour
  lines, pick the match. Gym is the right home (advanced, always-available, not a ladder
  gate). Reuse `contourShapeSvg` + the distinct-signature distractor generator; scale the
  option count way up. Could be its own Gym circuit/station.

## 9b. Rhythm-aware shape graph — LATER, not M1 (owner Q, 2026-07-03)

Owner asked if the M1 shape-picker should also encode note LENGTH (faster/held notes).
Decision: **NO at M1** — M1 isolates PITCH contour only (even time spacing). Duration is
its own dimension, taught at **M2 (rhythm-first)**. Once pitch-shape AND rhythm are each
solid, COMBINE them into a time-accurate contour graph (x-spacing = duration, longer notes
drawn wider) — a strong bridge to notation. Fits the protonotation/"Sketch it" (M8.5) area
or a dedicated later rung. Principle: isolate one dimension, then combine.

## 10. Fluency gate — speed as a mastery signal (owner idea, 2026-07-03, PENDING decision)

Owner: advancement should factor ANSWER SPEED — fast+accurate students pass in ~10;
strugglers keep going until they can answer X in a row under a time threshold. This is
the automaticity/fluency principle (Precision Teaching rate aims). Plan: a universal
RT-tracking + **fluency gate** — a "fluent hit" = correct AND under a per-level time
threshold; advance at K fluent hits (floor + ceiling). **Per-level thresholds**, applied
ONLY to recognition/reaction levels (M0, M1, interval/degree ID); the deliberate levels
(notation M9+, memory-span, multi-note dictation) stay accuracy-only — rushing there is a
bug, not mastery. OPEN owner decisions: (1) K fluent-hits-total (gentler) vs K-in-a-row
(stricter, resets on slow/wrong); (2) pilot on M1 first then generalize, or wire all
reaction levels at once (I lean: pilot M1, tune the threshold, then roll out).

## Sources
Full citations in MELODIC_DICTATION_RESEARCH.md. Anchor hubs: Karpinski *Aural
Skills Acquisition* & 1990 JMTP 4; Chenette MTO 27.2 (2021) + *Foundations of
Aural Skills*; Pembrook 1986 JRME; Nichols & Springer 2022/2025; Klonoski 2006
MEJ; Baker 2019 (difficulty modeling); Buonviri 2017/2021 (writing-timing null);
Paney 2016 (attention backfire); Melby-Lervåg 2016 (generic span training fails).
