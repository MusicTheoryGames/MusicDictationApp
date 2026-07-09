# Interval Training — deep research + a differentiated design ("Interval Gym")

Research pass 2026-07-02 (owner request: survey the crowded interval-app market and
find a pedagogical approach genuinely better than anything shipping). Companion to
LEVEL_SYSTEM_RESEARCH.md; the design at the end is build-gated on the owner.

---

## 1. What the science actually says

**Acontextual interval drills — the mechanic 90% of apps ship — barely transfer.**
Karpinski (Aural Skills Acquisition, the field's foundational text) is blunt: "a
preponderance of experimental evidence shows little connection between the ability to
identify intervals acontextually and the ability to identify them in context." Brains
perceive tonal music as scale degrees relative to a key center, not as abstract
distances. Chenette (MTO 2021, "What Are the Truly Aural Skills?") goes further:
skills worth training are the ones that engage working memory directly; pattern
exposure ("the most frequently occurring events of the past are the most likely to
occur") beats mechanical drills; he recommends attentional-control and chunking units
over isolated ID tasks.

**Perception-only training doesn't become production.** Micromelody-discrimination
research (Zarate et al.) found subjects who improved dramatically at *hearing* fine
pitch differences showed **no improvement in singing accuracy** — perception and
production are partially dissociated systems, and audio-vocal integration only
develops when you actually produce the notes. Any interval trainer that never asks
the student to produce the interval is training half the skill.

**Varied timbre/register improves generalization.** Perceptual-learning and
cochlear-implant training literature consistently finds single-timbre drills produce
timbre-specific gains; cycling instruments and registers builds the abstraction.

## 2. Market survey — what exists and where each falls short

| App | Approach | Strength | Weakness (vs the science) |
|---|---|---|---|
| **Tenuto / musictheory.net, Perfect Ear, most apps** | isolated two-note ID | ubiquitous, simple | exactly the acontextual drill Karpinski debunks; piano-only; recognition-only |
| **Functional Ear Trainer (Benbassat)** | cadence establishes key → identify a note by *feeling its resolution to tonic* | THE pedagogically-right core; beloved ("my only regret is I wasn't using it sooner") | single mechanic, spartan, recognition-only, no production, no melodic context, no progression system |
| **ToneGym** | gamified drill suite | best-in-class engagement, dailies, community | its interval games are still acontextual pairs; leaderboard-centric (Hanus & Fox: leaderboards+badges *lowered* learning outcomes); timed pressure |
| **EarMaster / Auralia** | structured conservatory curricula | breadth, mic input exists (EarMaster) | drill-bank feel, interval sections still isolated pairs, dated engagement |
| **Meludia** | pre-verbal sensory judgments (stable/unstable, tension) across 5 dimensions | genuinely different on-ramp; conservatory-endorsed | not interval-focused; no names/notation bridge; no production |
| **Song-anchor lists** ("My Bonnie" = M6) | mnemonic | popular advice | anchors are key/direction-specific; known to break down inside real melodic context |

**The gap nobody fills:** *contextual* interval training (Benbassat's insight) ×
*production* (sing it back) × *melodic embedding* (find and use intervals inside real
lines) × *modern mastery loop* (spacing, decay, self-vs-self) — in one product. Every
app has at most one of these legs.

## 3. The differentiated design: the INTERVAL GYM

A practice side-mode (not a ladder rung — the ladder's locked degree-jump philosophy
stands). Gym metaphor made literal: each interval class is trained as a **5-station
circuit**, and every station is something the market's interval apps don't combine.
Interval order follows the ladder/RCM: 3rds → P4/P5 → P8 → 6ths → 2nds → 7ths (+
tritone last), each unlocking as the ladder reaches it (M7 unlocks the Gym itself).

**Station 1 — FEEL (Meludia-style on-ramp, pre-verbal).** Key established (drone/
cadence — machinery we have). Two notes sound *in key*. Student answers sensory
questions only: "settled or leaning?", "close or far?", "did it land home?" No names
yet. This is the missing gentle entry every drill app skips.

**Station 2 — FIND (attentional control — Chenette's unit, our mechanic).** The
owner's own M0 tap-stream generalized: a generated in-key melody flows by; **tap
every time you hear the target interval** (any 3rd, ascending 6th, etc.). Nobody on
the market trains interval *detection inside moving music* — and it's the form the
skill is actually used in during dictation.

**Station 3 — NAME (Benbassat core, upgraded).** Cadence → two notes as scale
degrees → identify the interval AND the degree pair (not "M3" but "1̂ up to 3̂ — a
major 3rd"), tying interval names to tonal function permanently. Timbre/register
roulette across items (generalization research). Untimed, accuracy-first.

**Station 4 — SING (the production leg — the real differentiator).** The app plays
degree 1̂, names a target ("sing up a perfect 5th"), the student sings it.
v1 grading: mic pitch detection via WebAudio autocorrelation (getUserMedia), coarse
±50-cent tolerance — fully in-browser, no server. Fallback where mic is
denied/unavailable: sing-then-compare (app replays the true note against a recording
prompt; student self-grades) — still production, still audio-vocal integration.
EarMaster aside, essentially no interval app grades singing; none ties it to degrees.

**Station 5 — USE (transfer — the whole point).** A generated 3–5-note micro-melody
containing the target interval plays; student notates ONLY the interval's second
note (our missing-note renderer, reused verbatim). This is the dictation transfer
step, measured directly instead of hoped for.

**Progression & motivation (our existing engines, no new systems):** per-interval
mastery items (core/mastery.js bands + decay), circuit completion = the capstone,
Gym results feed spaced review, gems/XP on mastery events only. Self-vs-self; no
leaderboards; no timers — per our own research DON'Ts.

## 4. Why this wins
Every competitor trains *recognition of isolated pairs*. The Gym trains the four
things the evidence says actually constitute interval skill — feeling tonal tension,
detecting intervals inside real music, naming them as tonal functions, and
producing them — then measures transfer into notation. It reuses ~80% existing
machinery (drone/cadence, tap-stream, generator, missing-note renderer, mastery/
review/gamification), so the only genuinely new engineering is mic pitch detection
(bounded: autocorrelation on a mono stream) and the circuit shell.

## 5. Build gate
Owner call. Estimated: Stations 1–3 + 5 ≈ one session (reuse-heavy); Station 4 mic
path ≈ one session including cross-browser mic testing (Safari mic permissions!).

## Sources
- [Chenette, "What Are the Truly Aural Skills?" (MTO 27.2)](https://mtosmt.org/issues/mto.21.27.2/mto.21.27.2.chenette.html)
- [Marvin, "Rethinking Aural Skills Instruction" (MTO 27.2)](https://mtosmt.org/issues/mto.21.27.2/mto.21.27.2.marvin.pdf)
- [Karpinski, Aural Skills Acquisition](https://www.amazon.com/Aural-Skills-Acquisition-Development-College-Level/dp/0195117859)
- [Foundations of Aural Skills — pedagogy research survey](https://uen.pressbooks.pub/auralskills/back-matter/aural-skills-pedagogy-research/)
- [Functional vs Intervallic Ear Training (Jeff Schneider)](https://jeffschneidermusic.com/blog/functional-vs-intervallic-ear-training)
- [Functional Ear Trainer / Benbassat method](https://advancingmusician.com/functional-ear-training/)
- [ToneGym](https://www.tonegym.co/) · [ToneGym review (Jade Bultitude)](https://jadebultitude.com/ear-training/tonegym/)
- [Meludia — what it is](https://meludia.com/en/what-is-meludia/) · [Meludia in conservatories](https://ensemblenews.org/region/meludia-in-action/)
- [Micromelody discrimination training ≠ vocal accuracy (Zarate et al., PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2887372/)
- [Best ear training apps roundups (market scan)](https://emastered.com/blog/best-ear-training-apps)
