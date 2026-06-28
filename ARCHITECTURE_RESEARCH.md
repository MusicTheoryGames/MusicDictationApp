# Suite Architecture — research synthesis (4-agent deep dive)

Engineering-architecture research for turning the theory-games suite into a unified
platform (shared core + per-game plugins), serving solo + classroom across rhythm,
melodic, interval/singing, and future games. Companion to `LEVEL_SYSTEM_RESEARCH.md`
(pedagogy/curriculum) and `suite-architecture-state.md` (current code state). Feeds the
consolidated design spec. All four agents web-researched + cited real implementations.

---

## A. Platform & frontend architecture

- **Monorepo** (pnpm workspaces + Turborepo; Nx is overkill). Layout:
  `apps/{shell-solo, shell-student, shell-projector, shell-teacher}` +
  `packages/{core, core-score, firebase-shell, ui, content-rhythm, content-melodic, config}` +
  `functions/`. Rules: `apps → packages` (never reverse); `content-*` → `core` only; `core`
  imports nothing internal; **only `firebase-shell` touches Firebase** (kills config-in-3-files).
  Enforce with **dependency-cruiser**. (Current code duplicates patterns 4–5×.)
- **Framework = HYBRID, not a React rewrite:** vanilla at the page level + **Lit web components**
  for shared UI (drops into existing HTML today, zero migration, framework-agnostic) +
  **nanostores** reactive store + pure logic modules. Encapsulate VexFlow ONCE as a Lit element.
  (SolidJS later only if richer declarative screens are needed.)
- **Each game = a plugin** implementing one `GamePlugin` interface (modeled on Khan **Perseus**
  `WidgetExports` + **H5P** runtime contract): `{ id, version, schema(zod), score()/validate()
  [pure, in core-score], renderer(Lit), serialize/deserialize(getCurrentState), toXAPI? }`.
  Core has a **registry** (`register`/`get`, zod-validated); **core never imports a game.**
  Dependency: `content-rhythm → core`, never reverse.
- **Functional Core, Imperative Shell:** scoring/mastery/placement/progression/SR = PURE
  functions (`grade(state, input, now) → {nextState, events}`; inject `now`/RNG), exhaustively
  unit-tested, run identically client (optimistic) + Cloud Function (authoritative). **XState**
  for flow (`question→answer→feedback→next→level-up` + classroom rounds). Store ≠ logic.
- **SOLO + CLASSROOM share ONE core** via a **`SessionTransport`** interface (solo = local sync
  transport; classroom = Firebase transport). Mode injected once; **no `if(classroom)` in game
  logic.** Three views over one model (projector / teacher dashboard / student) — Pear Deck pattern.
  Use Quizizz/Gimkit **self-paced-within-live** (not Kahoot lock-step) → trivial late-join/reconnect.
- **"Flawless across games":** TS `GamePlugin` interface = the contract; **Vitest `expectTypeOf`
  type-tests** + **zod at registration** catch breaks at the seam; **changesets** version the core;
  **lazy-load + per-game error boundary + feature flags** isolate failures. (NOT Pact — wrong tool.)
- **Migration (incremental, no rewrite):** monorepo+shared theme/firebase → extract scoring+bank
  as pure tested modules → define GamePlugin+registry → Lit-wrap VexFlow/UI in existing pages →
  nanostores + SessionTransport → re-express rhythm then melodic as plugins.
- Sources: Khan Perseus, H5P contracts, Duolingo eng blog, Bernhardt FCIS, Lit/nanostores, XState.

## B. Progression, mastery & content engine

- **4 layers joined by a Q-matrix, split across VanLehn's two loops** (they only fight if they make
  the same decision): **tag layer** (Knowledge Components) · **sequencing** (prereq DAG, topo-sort
  → the Hall ladder) · **mastery gate** · **review+difficulty overlay**.
- **Generic data model** (engine owns; game-agnostic): `KnowledgeComponent` (shareable ACROSS games
  → transfer), `KCModel`/Q-matrix, `PrerequisiteEdge` (DAG = source of truth; topo-sort for ladder),
  `ItemTemplate` (radical=difficulty/KC params vs incidental=cosmetic), `Item`(template+params+seed,
  reproducible not stored), `Step`, **`QMatrixEntry` = the games↔engine contract**, `Transaction`
  (xAPI-shaped), `StudentKCState`. Generator registry: each game implements `generate(skill,diff,
  seed)→Item` + `grade(item,resp)→perStepOutcomes`; engine consumes only `{item_id, kc_ids[], outcome}`.
- **Mastery = weighted-Leitner meter** (Khan dropped streaks as gameable): per-item `s` 0–100,
  **correct +20, wrong −30**; levels **Attempted<50 / Familiar 50–79 / Proficient 80–94 / Mastered≥95**;
  **Mastered gate = ≥4 of last 5 correct AND s≥95 AND seen across ≥2 sessions ≥12h apart**;
  **decay** `s·2^(−Δt/H)`, H≈**7/14/30 d**; ramp new after ~3 Familiar, **cap 5–10 new/session**;
  **level advance = ≥80% of level's items Proficient+ AND a cumulative capstone ≥80%** (matches our
  8-bar capstone). BKT(0.95) = documented later upgrade.
- **Spaced repetition = expanding-interval Leitner keyed to universal skill IDs** (NOT full FSRS —
  auto-generated items have no stable card identity, binary grading + kids break FSRS's assumptions).
  Track the **skill not the card**; ~**70–80% review / 20–30% new** per session (a **steady-state
  target** for a healthy queue — at sparse review supply the session does all due review + up to the
  absolute new-cap, which governs cognitive load, NOT the ratio; the 20%-new floor is advisory); one **cross-game
  review queue** `{skill_id, box, due}` that routes a due skill back into its owning game.
- **Placement/adaptive = Elo-for-students** (Pelánek; 1PL/Rasch, ~10 lines, **auto-calibrates item
  difficulty from play** — no pre-calibrated bank). Placement **8–15 items**. Keep learner in the
  **~80–85% success band** (Wilson "85% rule"); 1-up/2-down staircase as the no-math fallback.
- **Reconcile:** outer loop = the ladder (owns ORDER; never reordered); inner loop = item/difficulty/
  review (owns WHICH item now). Review **injects items, never moves ladder position / never demotes
  level**; throttle new intake under review debt; capstone is cumulative (new + sampled prior).
  Classroom: teacher can pin/assign the level pointer; inner loop unchanged.
- **Spec reconciliations (2026-06-28, after the core triple-check) — these are spec-of-record:**
  Mastered-gate session spacing = **≥12h** (lower bound only; no 24h cap — returning after days still
  counts). Placement window **8–15 items** is canonical (subsumes LEVEL_SYSTEM_RESEARCH's "~8–12").
  Elo step **K = 1/(1+0.05·n)** (fixed-K fallback 0.3) and **placement-pass ≥0.85** (place one tier
  ahead; the tier-stepping policy lives in the ladder/placement layer, NOT the Elo estimator) are now
  recorded here. The **50/80/95** numeric meter bands are canonical; LEVEL_SYSTEM_RESEARCH's "Familiar
  70–85% / sub-70% demotes 2 levels" is the SAME Khan-style ladder expressed as the **review-overlay**
  pedagogy — demotion-on-failure is deferred to the review layer (per the Reconcile bullet above), so
  the two docs agree once read at the right layer.
- Sources: CMU DataShop/KLI Q-matrix, VanLehn two-loop, Khan (David Hu), Duolingo Birdbrain/HLR,
  Pelánek Elo, Wilson 85% rule, Bloom mastery learning.

## C. Real-time, data layer & offline resilience

- **Hybrid: RTDB (hot/live classroom, ephemeral) + Firestore (cold/durable progress, analytics,
  dashboard).** RTDB wins live fan-out: ≤10ms, single multiplexed socket, native presence, and
  **bills bandwidth NOT per-listener reads** (Firestore bills 1 read × every listener per change →
  ~30× on a beat-reveal). Firestore = the only Firebase **web** product with real offline persistence
  + indexed dashboard queries. Stay on Firebase (don't switch vendors for 30 students).
- **RTDB web SDK has NO offline persistence** (in-memory, lost on reload). **Solo offline = IndexedDB**
  (Dexie) and/or **Firestore persistent cache**. **LWW suffices** (each student writes only own
  records) — **CRDTs overkill**. Use `setDoc({merge:true})` / monotonic fields (max level, max score).
- **Grade server-side** (Cloud Function vs the trusted key) — students never write their own score;
  rules enforce shape+access only. **Presence:** `.info/connected` → register `onDisconnect` FIRST
  then mark online; **heartbeat** `lastSeen:serverTimestamp()` + **scheduled prune** (onDisconnect
  lags on silent wifi drops). Rooms via Cloud Function + RTDB transaction on the room code. Per-student
  child nodes (no shared-doc contention); flat summary node for the dashboard; append-only `push()` logs.
- **Unified schema:** HOT RTDB `/sessions/{roomId}/{meta, current(late-joiner state), students/{uid}/
  {online, lastSeen, live:{beats,score}}}`. COLD Firestore `users/{uid}/{progress/{gameId},
  mastery/{conceptId}(SM-2 fields, index `due`), attempts/{id}(append-only, perItem correctness)}`,
  `classes/{}`, `sessions/{}`(archive). **One schema serves solo + classroom + dashboard across all
  games** — only `gameId`/`conceptId` namespacing varies. Solo writes the same `attempts`/`progress`/
  `mastery` docs with `sessionId=null`.
- **Security:** student writes raw answers to ownership-locked path → Cloud Function grades →
  writes score/progress. **Anonymous Auth** for kids; **custom claims** for role (teacher/student);
  `.validate` for shape; `newData.val()===now` forces server timestamps; **App Check** blocks scripts.
- Sources: Firebase RTDB-vs-Firestore / limits / pricing / offline / presence / rules docs, Quickdraw.

## D. Identity, privacy & classroom UX (HARD CONSTRAINTS)

- **Two-tier, teacher-anchored identity:** **teacher = the only real account** (Google/email);
  **`studentId` = opaque server-generated UUID = THE identity** (progress keyed by it, NOT the device
  auth `uid`) → cross-device + history-merge fall out free; **redeemCode/QR badge** binds a device's
  Anonymous-Auth session to the studentId (Clever-Badge / Seesaw-code pattern). **Solo→class merge =
  server-side Cloud Function** (sidesteps Firebase merge-conflict). Shared iPad → "Who's playing?"
  roster picker + badge confirm each turn. Keep room-code+nickname only for drop-in live play.
- **Rostering = DEFER all** (Clever/ClassLink/OneRoster/Google Classroom) until a real district asks —
  it's a sales gate, not speculative eng. **NOW:** Google SSO (teachers) + badge/room-code + a signed
  **DPA (SDPC National DPA v2.2)** — the DPA is the real procurement blocker. OneRoster CSV = best
  neutral middle when asked. (Student Privacy Pledge is RETIRED — don't sign it.)
- **COPPA (2025 rule; full compliance by Apr 22 2026) + FERPA:** rely on **school as consent authority**
  (school-authorization + school-official exception) via the DPA. **SAFE to store:** opaque `studentId`,
  scores, accuracy, mastery, **numeric tap-onset timing** (abstract numbers). **AVOID/PII:** full name,
  student email, **IP address**, device/advertising ID, precise gelocation, 3rd-party analytics SDKs on
  student pages, and ⚠️ **microphone audio / voice = now a regulated biometric voiceprint** → for the
  planned singing game, store ONLY numeric pitch/cents, **never the audio**. First-name+initial is
  display-only/borderline. **Written retention + deletion policy + a scheduled purge job** are required now.
  (Research, not legal advice — counsel reviews the DPA/policy.)
- **Teacher dashboard UX:** teacher glances ~8×/lesson, 2–3s each → **live view = ONE glanceable
  class-accuracy signal + an auto-computed "needs help now" chip** (≤3 colors); push detail to a
  **post-session report** (item×accuracy, rolled up into musical skills; student×skill mastery in 3–4
  states; errors shown as ACTUAL notation). **Never project per-student data.**
- **In-class game = accuracy-first, UNTIMED** (matches our pedagogy research). Harm clusters in two
  choices to simply decline: **public individual bottom-ranking** + **speed scoring** (Boaler: timed =
  working-memory block + math-anxiety; Hanus&Fox: leaderboards lowered scores). Put the drama in the
  **collective reveal** (unlimited replays, "class got 82%!", reveal which beats nailed); score =
  **accuracy + personal bests + class-accuracy goals / small discuss-first teams** (Quizlet Live model);
  time only as a tiebreaker among already-correct answers.
- Sources: FTC 2025 COPPA rule + FAQs, ED FERPA vendor FAQ, SDPC NDPA, Firebase anon-auth/claims,
  Clever/Seesaw codes, Molenaar dashboard-glance study, Pear Deck, Hanus&Fox, Boaler, Sailer&Homner.

---

## Cross-cutting decisions these converge on (for the design spec)
1. **Shared core + per-game plugins** (GamePlugin interface, registry, pure FCIS logic) — one
   progression/mastery/placement/gamification engine; games only supply content + answer UI + renderer.
2. **One unified data model** keyed by opaque `studentId`, namespaced by `gameId`/`conceptId`/`skill_id`,
   serving solo + classroom + dashboard. Hot=RTDB, cold=Firestore. Server-side grading.
3. **Identity = teacher-anchored opaque IDs + anonymous auth + redeem codes;** privacy by minimization
   (no PII, no audio); DPA as the compliance instrument; rostering deferred.
4. **Mastery meter + expanding-Leitner review + Elo placement, over a fixed DAG ladder** (two-loop).
5. **Class game = accuracy-first, untimed, reveal-driven;** dashboard = one glance + needs-help flag.
6. **Lit + nanostores + monorepo, migrated incrementally** — no big-bang rewrite.
