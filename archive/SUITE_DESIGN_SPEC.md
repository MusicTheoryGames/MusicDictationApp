# Music Theory Suite — Consolidated Design Spec (for review)

The plan for turning the apps into a **unified guided-learning platform**: a shared core +
per-game plugins, serving solo practice AND live classroom, across rhythm, melodic, and
future games — grounded in the completed research. Read alongside:
`ARCHITECTURE_RESEARCH.md` (systems), `LEVEL_SYSTEM_RESEARCH.md` (pedagogy/curriculum),
`HALL_CATALOG.md` (the curriculum ladder), `CURRICULUM_PLAN.md` (figure-level detail),
`suite-architecture-state.md` (what exists today). **This is a review draft — redline freely.**

---

## 1. Vision & scope

**Vision:** one platform where a student is *guided* level-by-level (never a free-for-all),
a teacher can run it live in class and monitor each student, and every theory game (rhythm,
melodic, interval/singing, …) plugs into the SAME progression, mastery, identity, gamification,
dashboard, and projection.

**v1 scope (proposed):**
- **Game:** rhythm dictation (the built one) becomes the reference plugin.
- **Modes:** solo guided levels + the existing live classroom (completed/wired).
- **Levels:** the buildable simple + compound single-voice ladder (Hall ch 1–12, 14–17 —
  already has assets). Defer polyrhythm / odd-meter / modulation (need engine work).
- **Then:** onboard **melodic** against the same core (proves the boundary). **Interval +
  singing** is a planned plugin — the core must allow a **mic/pitch input modality** from day one.

---

## 2. Architecture (per `ARCHITECTURE_RESEARCH.md`)

- **Shared core + per-game plugins.** Each game implements one `GamePlugin` interface
  (`{ id, version, schema, score()/validate() [pure], renderer, serialize/deserialize, toXAPI }`);
  a registry resolves `gameId → plugin`; **core never imports a game.** (Khan Perseus / H5P model.)
- **Functional Core, Imperative Shell.** Scoring, mastery, placement, progression, spaced-
  repetition = **pure, unit-tested functions** (`grade(state,input,now)→{nextState,events}`),
  identical in solo + classroom and on client + Cloud Function. Firebase lives only in a
  `firebase-shell` package. Flow via **XState**; reactive state via **nanostores**.
- **UI = Lit web components** dropped into the existing pages — **incremental, no React rewrite.**
  VexFlow encapsulated once as a component.
- **Solo + classroom share one core** via a `SessionTransport` (local vs Firebase) — no
  `if(classroom)` branching.
- **Monorepo:** `apps/{shell-solo,student,projector,teacher}` + `packages/{core, core-score,
  firebase-shell, ui, content-rhythm, content-melodic, config}` + `functions/`. dependency-cruiser
  enforces boundaries; changesets version the core; per-game lazy-load + error boundary = isolation.

## 3. Data layer & identity (per `ARCHITECTURE_RESEARCH.md` C & D)

- **Hybrid Firebase (we already have it):** **RTDB = hot/live classroom** (presence, beat-reveal,
  per-student live state — wins fan-out latency + no per-listener read billing); **Firestore =
  cold/durable** (progress, mastery, attempts, dashboard history, offline cache).
- **Unified schema, one shape for all games** (`gameId`/`conceptId` namespacing): live
  `/sessions/{room}/students/{uid}/{online,lastSeen,live}` (RTDB); durable `users/{uid}/{progress/
  {gameId}, mastery/{conceptId}, attempts/{id}(per-item correctness, hints, time)}`, `classes/{}`,
  `sessions/{}` (Firestore). Solo writes the same docs with `sessionId=null`.
- **Identity = teacher-anchored, opaque, compliant.** Teacher = the only real account; each
  student = an **opaque server `studentId`** (progress keyed by it, not the device auth uid) bound
  via **Anonymous Auth + a redeem code / QR badge**; solo→class merge server-side. Room-code+nickname
  stays for drop-in play.
- **Privacy is a hard constraint** (COPPA 2025 / FERPA, school-as-consent via a signed DPA): store
  only non-PII — opaque IDs, scores, mastery, **numeric timing**. **Never** store names(full)/email/
  IP/device-id/geo, and ⚠️ **never microphone audio** (regulated biometric) — the singing game stores
  only numeric pitch/cents. Server-side grading; students never write their own score. Rostering
  (Clever/Classroom/OneRoster) **deferred** until a district asks; the DPA is the real gate.

## 4. Progression / mastery / placement (per `ARCHITECTURE_RESEARCH.md` B)

- **4 layers, two loops:** Knowledge-Components (the masterable, cross-game units) ← Q-matrix tags
  each item; a **prerequisite DAG** topo-sorts into the guided ladder (outer loop, owns ORDER); a
  **mastery gate** + a **review/difficulty overlay** (inner loop, owns WHICH item now).
- **Mastery meter:** correct +20 / wrong −30; Attempted<50 / Familiar 50–79 / Proficient 80–94 /
  Mastered≥95; Mastered needs ≥4-of-5 + ≥95 across ≥2 sessions; decay (H=7/14/30d); 5–10 new/session.
- **Spaced review:** expanding-interval Leitner keyed to universal skill IDs; one cross-game review
  queue routes a due skill back into its owning game; ~70–80% review / 20–30% new.
- **Placement:** Elo-for-students (auto-calibrates difficulty), 8–15-item adaptive diagnostic,
  seeded by a self-select. Keep learner in the ~80–85% success band.

## 5. The guided level loop (your decisions — see `level-pass-and-guided-structure`)

Each level:
1. **Teach/demo screen (dismissable)** when a new rhythm/concept is introduced — names it
   (e.g. "simple duple") + **demonstrates how it sounds** (play it + show notation). Re-openable.
2. **Practice** — short 2–4-bar examples drilling the new figure(s) with prior ones (the
   working-memory sweet spot). Practice progression = simple "8 of last 10" to start (meter later).
3. **Capstone = the pass gate** — ONE **8-measure** example combining the level's figures, answered
   **correctly (per-beat, meter-gated) AND at/above a groove-point threshold** (clean play) → level
   mastered → next unlocks. Heard 2–3×, optionally phrase-by-phrase.
4. **Extra points (never a gate):** **16-bar** endurance examples + the tap-back / two-zone
   performance bonus.

Grading: **per-beat all-or-nothing**, **bar-count as a hard gate**, a consistent ±1 shift penalized
once. **Accuracy-first, untimed** is non-negotiable for dictation.

## 6. Classroom, teacher & projection (extend what exists)

- Keep the existing room-code + projection-reveal flow; **complete the missing student→Firebase
  answer sync** so the teacher's per-student per-beat panel gets real data.
- **Teacher dashboard:** live view = ONE glanceable class-accuracy signal + an auto "needs help now"
  flag (teachers glance ~8×/lesson); detail → a post-session report (item×accuracy rolled into
  skills; student×skill mastery; errors shown as real notation). Never project per-student data.
- **Class game:** drama in the **collective reveal** ("class got 82%!"), unlimited replays,
  class-accuracy goals + personal bests + small discuss-first teams — **no public leaderboards,
  no speed scoring.**

## 7. Gamification

Groove points (our clean-play lever) + **XP→named ranks** (XP earned on real mastery events, not raw
taps) + **first-try / no-hint bonuses** + **streaks with a freeze** + **spaced-review** as the
retention engine. Decoupled **volatile score vs sticky mastery** (a bad run never revokes progress).
**No** global leaderboards / time-as-primary-score (research-backed harms).

## 8. Build phases (incremental, no big-bang)

0. **(in flight)** finish the rhythm app's bonus tap-back + mobile polish on `tap-back`.
1. **Monorepo + extract pure modules** — scoring + the figure bank → `core-score` + `content-rhythm`,
   with the first real unit tests; Firebase → `firebase-shell`; theme → `ui`. (Kills the 4–5× dup.)
2. **Progression core** — KC/ladder/mastery/placement as pure modules + the unified Firestore schema +
   opaque `studentId` identity. Wire rhythm solo to it.
3. **Guided level UI** — teach screens, the level ladder + level-select, the capstone pass-gate.
4. **Placement** — self-select + the Elo diagnostic.
5. **Classroom completion** — student→Firebase sync, the teacher dashboard, class-game reveal.
6. **Melodic plugin** — onboard against the same `GamePlugin` contract (proves the boundary).
7. **Later:** interval/singing plugin (mic/pitch module); advanced rhythm chapters (polyrhythm,
   odd meter, modulation) as engine work lands.

## 9. Open decisions for you
1. v1 scope = the simple+compound rhythm ladder first (defer advanced)? **(lean: yes)**
2. Practice pass = "8 of last 10" now, mastery-meter later? **(lean: yes)**
3. Placement = self-select + short Elo diagnostic now? **(lean: yes)**
4. Commit to the monorepo refactor up front (phase 1), or bolt the level system onto the current
   single-file app first and refactor later? **(lean: monorepo first — the dup is already painful,
   and it's far cheaper before the suite grows; but it's a real up-front investment — your call.)**
5. Interval/singing — list as a planned phase-7 plugin (lean: yes), or park entirely?
