# Level System / Placement / Gamification — research notes

Working notes for building (a) a **guided level progression** and (b) an **onboarding
placement test** with gamification, on top of the existing Hall curriculum
(`CURRICULUM_PLAN.md`). Sources: the StaffCommander reference game + dictation
pedagogy research + the Hall textbook (agents). This doc is research → becomes the
design spec.

---

## 1. Reference patterns from StaffCommander (`grand-staff-prix-3d`) — DONE

A note-reading racing game by the same author. Education logic is **pure, unit-tested
functions** in `src/data/*.ts`, orchestrated by one Zustand store, with thin UI. That
separation is the #1 thing to copy.

### Placement / onboarding (directly reusable)
- **Self-select a milestone**, not a quiz: show the cumulative tiers/"regions" as cards
  with a **visual preview** (a staff showing the notes); the user taps the highest one
  they think they can already do. "Brand new" + the first tier skip the test.
- Picking tier N runs a **capped in-engine assessment**: `PLACEMENT_NOTES = 16` items,
  in the **easiest mode**, **no-fail** (can't run out of lives → stable accuracy denom).
- **`PLACEMENT_PASS = 0.85`.** Pass → placed one step *ahead* (the test counted as that
  tier's pass → drop in at its next sub-stage); everything below marked mastered.
- **Fail → step DOWN exactly one tier and re-test** ("let's check tier N−1 instead").
  Iterative, one tier per attempt — gentle, re-validated each step, NOT a big leap.
  Floor = start at the very beginning (no test).
- `placeProfileForStage()` marks all lower tiers mastered+unlocked, is **idempotent +
  never demotes** (sets, merge onto existing) → safe for returning students.

### Progression = adaptive mastery meter (not streaks, not "% over N")
- Per-(profile, level) meter `M`. Correct `+1`, wrong `−2` (`WRONG_PENALTY`).
- As `M` crosses evenly-spaced thresholds (`STEP = 15`), the **next item in the level's
  ordered ladder joins the active pool**; drop a `HYST = 5` band below → top item drops
  (hysteresis stops flicker).
- **Mastery = double-gated:** hold the *full* ladder one more STEP **AND** a *per-item*
  gate — every newly-introduced item must independently hold **≥90% over a rolling
  10-rep window** (`MASTERY_BAR=0.9`, `MASTERY_WINDOW=10`). Can't coast past new material
  on old strength.
- **Auto ramp-down:** if ≥50% of the last 6 answers missed, shed a STEP to isolate the
  hard item (invisible, automatic).
- **Decay on return:** re-entering pulls the meter back `8 + 4×daysAway`, capped — rusty
  students re-climb fast if they know it.
- Mastering a level: append to `mastered`, unlock next tier, +50 XP, end run as a win.
- Levels are a **linear spine** (the "Journey", 7 regions × 3 modes = 21 stages) + optional
  **side quests** (branches). Meter is **sticky** (saves `max(saved, M)`) — a bad run never
  revokes an earned stage.

### Gamification — two decoupled currencies
- **Volatile score** (thrill) vs **sticky mastery** (progression) — a wrong answer hurts
  score but can never cost progress.
- Points: per-mode base (`name 2 / find 3 / mix 4`) × **speed multiplier** (up to 2.5×,
  but fast = less reaction time = real risk) × **combo multiplier** (`1 + min(streak,20)×0.2`
  → up to 5× at a 20-streak). Wrong → `max(0, score−penalty)`, streak resets.
- **XP** = 1/correct + 50/mastery → **11 named ranks** (Beginner→Maestro) at
  `0,50,150,350,700,…12000`.
- **Gems** = `round(score/120)` + **5 if accuracy ≥95% (clean-play)** + **25 if mastered**.
- **Achievements**: 9 declarative `{id,name,desc,icon,test:(stats)=>bool}` (e.g. 15-streak,
  master-with-zero-mistakes, 100% over 12+). Trivially extensible.
- **Daily challenges**: 3/day, **date-seeded (FNV-1a hash → deterministic, no server)**.
- Lives per band: beginner 3 but **no-fail**; intermediate 4; advanced 3.

### Reusable-as-is for our rhythm game
Placement flow · `placeProfileForStage` · the whole `ladder.ts` meter model (item-agnostic
— ladders ANY ordered list, so it ladders rhythmic figures directly) · per-item mastery gate
· decoupled sticky-mastery vs volatile-score · declarative achievements · date-seeded dailies
· XP/rank curve + gems formula · migration layer (re-key + backfill, idempotent).

**Our advantage they lack:** we already have **"fewer hints → more groove points"** — that
IS our clean-play / skill-reward lever (their analog is the speed×combo + 95% gem bonus).

### Tunables to copy & retune (one place each)
`ladder.ts`: STEP=15, HYST=5, WRONG_PENALTY=2, BASE_WARMUP=8, DECAY_PER_DAY=4,
RAMP_DOWN_WINDOW=6, RAMP_DOWN_MISS_RATE=0.5. `pernote→perfigure`: MASTERY_BAR=0.9,
MASTERY_WINDOW=10. `store`: PLACEMENT_NOTES=16, PLACEMENT_PASS=0.85. `scoring`: per-mode
tables. `progression`: rank thresholds, gems = score/120 +5@95% +25 mastered.

---

## 2. Dictation pedagogy + gamification research — DONE

Well-cited (Ottman & Karpinski TOCs, Gordon/GIML, AP College Board 2025 rubric,
Sailer & Homner 2020 meta-analysis, Hanus & Fox 2015, Duolingo eng blog, CAT literature).

### Concept sequencing — strong cross-source consensus
Beat → quarter/half/whole + rests → **eighth division (÷2)** → **COMPOUND meter (÷3) —
EARLY** → **sixteenths (simple ÷4 / compound ÷6)** → **dots & ties** → **syncopation** →
**triplets/duplets** → **changing/mixed/asymmetric meter + hemiola + hypermeter (last)**.
Key point: **compound comes early** (right after eighth-division, *before* sixteenths and
syncopation) — Hall does this (ch5), and our CURRICULUM_PLAN's recommended order already
interleaves it. Each stage = "one new problem." Within a stage (Gordon micro-order):
macro/micro-beat → division → elongation (dots/ties) → rests → ties.
Default a **beat-oriented** counting system (Takadimi / Gordon du-de) with a toggle to
"1-e-&-a" or Kodály — beat-oriented gives identical-sounding rhythms identical syllables
(quarter in 2/4 = dotted-quarter in 6/8 = "the beat").

### Teaching loop (the listen→notate mechanics)
- **2–3 hearings** with silence between; example length **~4 bars / 12–20 notes**.
- Always give **meter + count-off** up front. Proto-notation: one stroke per beat, tally
  attacks-per-beat, **never leave blanks** (guess from the rhythm set). Metronome; **slow
  tempo / chunk** when hard.
- The only two trainable memory levers are **chunking** (fuse durations into beat-cells)
  and **extractive listening** (focus one segment) — raw working memory is the top
  predictor but is fixed, so train these.
- **A/B self-compare** (hear your entered answer vs the original, unlimited, before submit)
  is a strong built-in error-detection mode — we should add it.

### Mastery assessment
- Common cutoff **80%** ("B"); 70–85% "proficient" band; CBE pushes toward 100/no-averaging.
- **Per-beat all-or-nothing** (rhythm analog of AP's per-segment "pitch AND rhythm correct").
- **Meter/bar-count is a HARD GATE** — check correct beats-per-measure *before* scoring beats.
- **Don't double-penalize a consistent ±1 displacement** — deduct once, not per beat.
- Mastery is **provable + decaying**: Khan ladder Attempted → Familiar(70–85%) → Proficient
  → **Mastered (only on a later, MIXED delayed retrieval)**; sub-70% review **demotes 2 levels**.
- Tap-back grading = accurate **AND in steady time**.

### Placement / adaptive testing
- Best practice (CAT): start **medium**, re-estimate after each item (right→harder,
  wrong→easier), **stop on a precision threshold** (~8–12 items, 5–10 min) → ~50% shorter.
- **Self-assessment = weak prior only** (Dunning–Kruger: low-skill over-rate) — seed the
  start, but let the adaptive diagnostic override it. Use **partial credit per beat**.
- Music apps mostly **skip** adaptive placement (graded tiers + self-select) → a real short
  adaptive diagnostic is a genuine **differentiator** for us.

### Gamification — DO / DON'T
- **DO:** mastery-based unlocks + immediate feedback (strongest evidence); **spaced-repetition
  review queue** (SMD≈0.78; FSRS-style intervals expand on success, contract on miss);
  first-try / no-assist "perfect" bonuses; **XP tied to genuine mastery events** (not raw taps);
  **self-vs-self** progress meter; daily streak **with a streak-freeze** slack.
- **DON'T:** ⚠️ **TIME-BASED SCORING is the single highest-risk choice** — dictation is a
  careful working-memory task; timed scoring lowers accuracy, raises anxiety, and **trains
  persistent rushing that carries into untimed work**. Make **accuracy the primary, untimed
  grade**; offer **speed only as an optional tap-back challenge gated BEHIND accuracy mastery**,
  never the path to progress.
  Avoid **global leaderboards + badge-chasing** (Hanus & Fox: leaderboard+badges *lowered*
  exam scores; points/badges/leaderboards are the most harm-associated mechanics; demotivate
  the bottom). If social, use **leagues/percentile/friends + a collaborative element**.
  Watch **novelty decay (~4 wks)** and **streak anxiety in kids**.

## 3. Hall textbook examples (ch 5–12) — exhaustive catalog — (agent running)
_(to be filled from the Hall deep-read agent; cross-checks CURRICULUM_PLAN.md)_

## 4. Proposed design (curriculum ladder + placement + gamification) — TODO after research
