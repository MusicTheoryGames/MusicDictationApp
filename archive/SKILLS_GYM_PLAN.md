# Skills Gym plan — endless, educational reinforcement for the foundation (M0–M1)

Written 2026-07-03 (owner request: "a writeup on how to make it as robust, useful,
intuitive and educational as possible" **before** building). This is a plan for owner
review, not built work. It reuses the renderers we already have (live find-home, up/down,
step/skip, shape-picker) and the existing mastery/review/economy engines; nothing here
ships until the owner signs off on §11.

Companion to `INTERVAL_GYM_SPEC.md` (the intervals gym, unlocked ~M8). This one covers the
*pre-interval foundation* and can unlock from day one.

---

## 1. What the gym is FOR (and what it is NOT)

Three engines move a student forward, and they must not do each other's job:

| System | Owns | Feels like |
|---|---|---|
| **Ladder** | *Progression* — gated advancement, one skill at a time, mastery to move on | "level up" |
| **Spaced review** (automatic) | *Retention* — resurfaces passed skills on a schedule; backs you up after a layoff | "keeping sharp" |
| **Skills Gym** (this doc) | *Voluntary reinforcement* — endless, student-chosen, no gate | "practice / train" |

The gym exists because the ladder is deliberately *stingy* (you advance and move on) and
spaced review is *scheduled* (the app decides when). Neither lets a motivated student say
"I want to drill step-vs-skip **right now**, as much as I want, as hard as I can take it."
That's the gap the gym fills — **deliberate, self-directed practice**.

**Non-goals (important):** the gym must **never** advance the ladder, never gate anything,
and never punish. It is pressure-free by design. Its only "stakes" are personal
(score/streak/best), and its only consequence is *good* — it **refreshes retention** (see §8).

---

## 2. Design principles (the four the owner named)

### Robust — comprehensive coverage, endless, and it goes PAST the ladder
- Every foundational skill is drillable across its **full range** and **beyond** what the
  ladder teaches. The ladder *introduces* 3→6-note shapes; the gym goes to 7, 8, more decoys.
  The ladder finds home in a comfortable window; the gym goes faster, wider, more keys.
- **Never-ending**: content is generated, not a finite bank, so it can't be memorised or
  exhausted.
- **No blind spots**: within a skill it rotates every axis (reference pitch/key, direction,
  distance, length, tempo) so a student can't accidentally practise only the easy slice.
- All melodic content longer than two notes uses the **style-aware generator**
  (`buildRound`/`generateMelody`), never a random walk — same rule as the ladder.

### Useful — it targets the RIGHT thing and tells the student the truth
- **Shows the student where they actually stand**: per-skill accuracy, reaction speed, and
  *current decayed* mastery (so a skill that's fading is visible).
- **Points them at their weakest / most-faded skill** ("Your step-vs-skip is getting rusty
  — drill it?"), turning the mastery-decay data we already compute into a coaching signal.
- A **"Warm up my due reviews"** shortcut that pulls exactly the items spaced-review would
  surface — so the gym doubles as a manual retention tool.

### Intuitive — zero relearning, obvious controls, immediate read
- **Reuses the exact renderers and controls** from the ladder (same HOME button, same
  up/down/step/skip/shape buttons) — nothing new to learn; the gym *is* the game, unlimited.
- One clean **picker**: choose a skill, or "Mix," or "Weakest," or "Daily." A visible
  difficulty read-out. One tap to start, one tap to leave.
- **Immediate per-answer feedback** (right/wrong, fast/slow), a running score + streak, and a
  short **session summary** on exit ("42 answered · 88% · best streak 15 · fastest yet").

### Educational — grounded in how skills actually stick
The gym is the natural home for the practice science the ladder can only partly use:
- **Deliberate practice** (Ericsson): focused, immediate feedback, at the **edge of ability**.
  → the gym auto-tunes difficulty to keep you in the productive-struggle zone (§5).
- **Desirable difficulty & retrieval practice** (Bjork; Roediger): effortful, varied recall
  beats easy repetition. → variation on every axis, and speed pressure for automaticity.
- **Interleaving > blocking** (for transfer/retention). → a first-class **Mix mode** that
  shuffles skills, not just single-skill blocks.
- **Automaticity / fluency** (the same principle behind the ladder's fluency gate): a master
  answers *fast*. → speed is scored and celebrated, and difficulty rises as you get quick.
- **Growth-mindset framing**: no "fail," ever — "beat your best," "new record," encouraging
  copy. Effort and improvement are what's rewarded.
- **Metacognition**: by showing per-skill strength/decay and suggesting what to work on, the
  gym teaches students to **self-direct** — a skill in itself.

---

## 3. The skills it drills (foundation set)

Each is the ladder renderer, unlocked once the student has *reached* it on the ladder (so the
gym never front-runs teaching), then drillable forever after.

| Skill | Renderer (exists) | Ladder range | Gym range (goes further) |
|---|---|---|---|
| **Find home** | live find-home | 3–5 keys, 1.5s→0.9s | more keys, faster spacing, longer streaks |
| **Up / down / same** | contour dir | held→shifting reference | reference every item, wider pitch spread |
| **Step or skip** | step/skip | steps + 3rds | + bigger skips (4th/5th) as "skip," faster |
| **Match the shape** | shape-picker | 3–6 notes, 3–6 options | 3–8+ notes, up to ~10 options (the "10-shape" idea) |

(Intervals stay in the existing Interval Gym; degrees/memory-span join later as those levels ship.)

---

## 4. Modes

1. **Single-skill drill** — pick one skill, endless, difficulty auto-ramps (§5).
2. **Mix** (interleaved) — shuffles across all *unlocked* skills; the retention/ transfer
   power mode. Default suggestion for returning students.
3. **Weakest link** — auto-selects the skill with the lowest *decayed* mastery and drills it.
4. **Warm up due reviews** — runs exactly the items spaced-review would surface today.
5. *(optional)* **Daily gym goal** — a small daily target ("15 clean in Mix") tied to the
   existing daily-challenge economy, for streak/habit building.

---

## 5. Difficulty & adaptivity (no gate, but always at the edge)

- Difficulty is a **continuous dial** per skill (reference spread, tempo, shape length,
  option count, skip size), **not** stages.
- It **auto-tunes to keep you in the flow zone**: a rolling accuracy+speed window nudges it
  **up** when you're cruising and **down** when you're struggling — the "desirable
  difficulty" band, never so hard it demoralises, never so easy it bores.
- **Unbounded upward**: it keeps climbing past the ladder ceiling for students who want a
  real challenge (this is where "10 shapes" and fast multi-key find-home live).
- **No fail state**: a wrong answer just nudges difficulty down a hair and breaks your
  streak — you keep going. The only "score" is personal.

---

## 6. Economy = MASTER-then-RETAIN (owner 2026-07-03, supersedes the gem-trickle idea)

Ear training *is* repetition — so the economy must reward the **outcome** of the grind
(mastery) and then use repetition for **retention**, not pay per rep (farmable) and not
under-pay (a single gem is nothing). This mirrors the BeatQuest model the owner liked.

Each gym skill carries a **mastery state driven by the speed/fluency engine**:
- **Learning → Mastered.** You master a skill by hitting the **fluency bar** — a run of
  *fast + correct* in a row (same engine as the ladder's fluency gate).
- **First mastery → BIG reward** (XP + a gem chunk + a "Mastered" stamp on that skill).
- **Speed baseline recorded at mastery.** Thereafter the gym watches recent speed+accuracy.
- **REGRESSION detection (the retention core):** if recent speed/accuracy on a mastered
  skill drops meaningfully below its baseline — or it time-decays — the gym flags it
  **"rusty"** and re-surfaces it. The speed engine literally reports "you've regressed."
- **Re-master a rusty skill → MEDIUM reward** (retention is worth real points, less than
  the first time).
- **Grind an already-mastered, still-sharp skill → SMALL maintenance reward** (never
  un-rewarded, but the big money is gone until it goes rusty — so it can't be farmed).

**Smart Practice prioritises: rusty/regressed skills first, then unmastered** — the
hands-off "app decides what you need," powered by the speed engine spotting decay/regression.
Net: the first pass is richly rewarding; after that the gym is a **retention coach** that
pays you to keep your speed sharp. Still NOT a second advancement ladder — it never gates
the main ladder; "mastered/rusty" is gym-local.

Open specifics to confirm: fluency bar for gym-mastery (K fast-in-a-row per skill?),
regression trigger (recent median RT > ~1.5× baseline, and/or accuracy drop, and/or decay),
and the three reward sizes (big / medium / small).

---

## 7. Stats & self-direction (the "useful" made concrete)

A small dashboard on the gym home:
- Per skill: a strength bar (current **decayed** mastery), last-practised, best streak,
  best speed.
- A one-line **coach nudge**: "Find-home is fading — a few reps?" (drawn from decay).
- Session history sparkline (optional, later).

This turns the mastery/decay numbers we *already compute* into something the student can see
and act on — which is itself an educational outcome (learning to self-assess).

---

## 8. Integration with the existing engines

- **Refreshes retention, never advances.** A gym round updates the skill's **mastery/decay**
  and can satisfy a **due spaced-review** (real practice *should* count for staying sharp) —
  but it **never** touches the ladder's advancement streak, capstone, or `levelIdx`. This is
  the key rule: the gym keeps you sharp; the ladder decides when you move up.
- **Own save slice** (like the Interval Gym's) for gym-specific stats (bests, per-skill gym
  history), so it can't corrupt ladder state.
- **Reuses renderers** — same controls, same feedback, same no-emoji / per-theme / custom-SVG
  rules; guarded by `core/no-emoji.test.js`.
- **Unlock rule**: a skill appears in the gym once the student has *reached* its ladder level
  (never teaches ahead of the ladder).

---

## 9. UX / flow

```
Gym home
 ├─ [skill tiles: Find home · Up/down · Step/skip · Shape]  (locked ones greyed)
 ├─ [Mix]  [Weakest link]  [Warm up reviews]  (+ Daily goal)
 ├─ per-skill strength bars + coach nudge
 └─ Back to the ladder
        │  pick →
        ▼
Drill session (reuses the ladder renderer)
 ├─ endless items, difficulty auto-tuning
 ├─ live score · streak · best
 └─ [End session] → encouraging summary + gems
```

- Reachable from a single **Gym** button in the main chrome (like the Interval Gym button),
  hidden under the kids-theme guided-only rule if that applies.

---

## 10. Build plan (phased, each testable)

1. **Gym shell + picker + one skill** (shape, since it's the highest-value and already
   ramps) — proves the endless-drill loop, difficulty auto-tune, scoring, summary.
2. **Add the other three skills** (find home, up/down, step/skip) via their renderers.
3. **Mix + Weakest-link + Warm-up-reviews** modes.
4. **Stats dashboard + coach nudge** (decay-driven).
5. **Economy + daily goal** tie-in.
Each phase deploys and is puppeteer-verified; no phase gates the ladder.

---

## 11. Decisions I need from the owner before building

1. **Does gym practice refresh retention** (satisfy due reviews / slow decay), as §8
   proposes? (I strongly recommend yes — it's real practice — but it's a philosophy call.)
2. **Auto-tuning difficulty** (§5, keeps you at the edge) vs a simple **student-picked**
   difficulty (Easy/Medium/Hard)? (I lean auto-tune with an optional manual override.)
3. **Economy**: small gem trickle for gym reps — yes, and roughly how small?
4. **Scope now**: build phase 1 (shape drill) first and react, or the whole foundation set
   in one pass?
5. **Unlock timing**: gym available from M0 (drill find-home immediately), or only once a
   couple of skills exist to mix? (I lean: available immediately, single-skill until more
   unlock.)

## Sources
Deliberate practice — Ericsson. Desirable difficulties / spacing / interleaving — Bjork;
retrieval practice — Roediger & Karpicke. Aural-skills specifics — Karpinski *Aural Skills
Acquisition*; Chenette *Foundations of Aural Skills*. (Same anchor set as
`MELODIC_DICTATION_RESEARCH.md`.)
