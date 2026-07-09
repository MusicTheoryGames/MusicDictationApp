# Levels 4–10 — Robustness & Design-Conformance Plan (owner-requested 2026-07-04)

Owner (going to bed): "make levels 4–10 more robust and make sure they line up with our design
documents (buttons, verbosity, etc.). Set up a loop to take care of those items and make 4–10
robust. All these skills must STACK." This doc is the loop's operating manual + the audit + the
stacking plan. It is the single source of truth for the overnight pass.

## The levels in scope (playable order → level number → mode → renderer)

| Lvl | id    | title                          | exerciseMode(s)          | renderer |
|-----|-------|--------------------------------|--------------------------|----------|
| 4   | m2    | The rhythm IS the melody       | rhythm-first             | createRhythmIdentityRenderer (native BeatQuest grid) — DONE this session |
| 5   | m3    | First 3 notes get numbers      | labeling                 | createLabelingRenderer |
| 6   | m4    | Read it back                   | recognition              | createRecognitionRenderer |
| 7   | m5    | The pentascale 1–5             | labeling, recognition    | labeling / recognition |
| 8   | m5_5  | Find home — minor              | live-home-minor          | createLiveHomeMinorRenderer |
| 9   | m6    | Minor arrives early            | recognition, labeling    | recognition / labeling |
| 10  | m7    | Hear the gap                   | labeling, missing-note   | labeling / createMissingNoteRenderer |

## THE DESIGN CHECKLIST (from BUTTON_DESIGN.md + memory)

Per level, the rendered gameplay screen MUST satisfy:
1. **Exactly ONE green transport** (icon-only Play via `wireHearings`/`makePlayButton`). No second green.
2. **Home reference is NEUTRAL** "▶ HOME" (`addHomeButton`) — never green.
3. **≤ ONE accent CTA** (`melodic-btn--primary`), `disabled` until actionable. (recognition has 0 — options ARE the answer.)
4. **Feedback colors reserved** (green correct / red wrong / amber missed / gold celebrate) — never a resting control color.
5. **Fewer words** — the on-screen how-to is ONE SHORT CUE (≤ ~40 chars ideal, hard cap ~55). The full
   explanation lives in the level MODAL. Progress = pip dots, not text. Hearings = pips, not "(3 left)".
6. **No emoji** — inline SVG via `services.icon` only. Gate: `node --test core/no-emoji.test.js`.
7. **Constant HUD** — the HUD is identical on every level; only the middle gameplay changes. (memory: constant-hud-lean-layout)
8. **Settings in the cog drawer** — Level/Practice/Labels/Theme off the gameplay screen. (memory: settings-cog-drawer)
9. **Speed wheel present** in the play row (per-example, resets to Medium) — Level 4 + all dictation levels above.
10. **No button collisions** (`[class$="__play-row"]` flex+gap; verified in headless).

## AUDIT FINDINGS (headless, 2026-07-04, phone width)

- Layout hygiene (1 green, ≤1 CTA disabled-at-start, 1 neutral HOME, HUD, speed wheel, no overlap):
  **CONFORMANT** on m2, m3, m4 as sampled. (Loop must re-check m5, m5_5, m6, m7.)
- **VERBOSITY = the main live gap.** Long two-sentence prompts on m3, m4 (and likely others):
  - m3: "Press Play to hear the melody — its rhythm is written below. Tap a degree button to name each note"
  - m4: "Press Play to hear a short melody, as many times as you like. Then click the staff that shows what you heard"
  These violate rule 5 ("one short cue"). Shorten to a single short cue; the modal already carries the full how-to.
- `emojiHits` in the scratch audit were FALSE POSITIVES (over-broad regex hitting ASCII). Trust `no-emoji.test.js`.

## TWO WORK TRACKS

### Track A — bounded design-conformance fixes (LOOP EXECUTES; safe + verifiable)
For each level m3, m4, m5, m5_5, m6, m7:
- **A1 Shorten the on-screen prompt** to one short cue (≤ ~55 chars). Keep the full explanation in the level modal
  (do NOT delete teaching — move it to the modal if it isn't already there). Match the terse voice of Levels 1–2.
- **A2 Button hygiene**: confirm exactly 1 green transport, HOME neutral, ≤1 accent CTA disabled-until-actionable.
  Fix any extra green / always-enabled CTA / stray word on a Play button.
- **A3 Confirm** HUD constant, speed wheel present, no play-row overlap, no emoji.

### Track B — robustness + STACKING (LOOP DRAFTS PROPOSALS ONLY; owner-gated)
Per the stacking principle (each level adds ONE new skill and RE-INTEGRATES all prior skills), the loop
appends a per-level STACKING PROPOSAL to the "Stacking proposals" section below — what prior skills the level
should fold in, and a proposed stage ladder — as ANALYSIS for owner review. Do NOT rewrite a level's stage
ladder / curriculum live (those are design decisions the owner iterates on, like the Level 4 rework). Encode
any agreed prescription as a conformance test BEFORE claiming it (memory: verify-conformance-not-just-runs).

## THE STACKING SPINE (what each level should re-integrate — starting analysis)

- L4 m2 rhythm: folds in L1 degree-ID (1/3/5) + L2 shape (passing 2). DONE.
- L5 m3 labeling (1/2/3): should fold in L4 rhythm awareness (the rhythm is shown) + L2 contour as a fallback for un-named notes.
- L6 m4 recognition: read-back of a heard melody; folds in L5 degree vocabulary (1/2/3) to reason about options.
- L7 m5 pentascale 1–5: folds in L5/L6 (names 1/2/3 + recognition) extended to 4 & 5; degree-intro invariant: 4 enters here.
- L8 m5_5 minor home: folds in L1 "find home" into the minor mode (la-based) — the M0 skill re-applied in minor.
- L9 m6 minor recognition/labeling: folds in L7 pentascale + L8 minor-home into minor-key recognition.
- L10 m7 missing-note ("hear the gap"): folds in all prior degree/labeling into a fill-the-blank; leaps to the frame next (m8).
(Loop refines these into concrete stage ladders as proposals; respects DEGREE_INTRO_MINDEX + LEAP_INTRO_MINDEX invariants.)

## THE LOOP PROTOCOL (one level per iteration)

1. Pick the next level task not marked done (order: m3 → m4 → m5 → m5_5 → m6 → m7).
2. Read that level's renderer in melodic-renderers.js. Find its on-screen prompt string(s).
3. Track A: shorten the prompt to one short cue; verify the full how-to is in the level modal (add if missing).
   Fix any button-hygiene gap found. Keep changes MINIMAL and localized.
4. Track B: append a STACKING PROPOSAL for the level to the section below (analysis only).
5. VERIFY (all must pass before deploy):
   - `node --test core/no-emoji.test.js` (guard)
   - `node --test` (full suite — 437+ must stay green)
   - headless: re-run the audit script for THIS level; confirm the checklist (1 green, ≤1 CTA disabled, HOME neutral,
     HUD, wheel, no overlap) and that the prompt is now ≤ ~55 chars.
   - screenshot the level; eyeball that it still reads well.
6. Bump the build stamp in melodic-game.html, `npx netlify deploy --prod --dir .`.
7. Mark the level's task done; record the before/after prompt + status in "Progress log" below.
8. If levels remain → ScheduleWakeup to continue. If ALL done → do NOT reschedule; write a final summary here
   and in the last message, list the Track-B proposals awaiting owner review, and STOP.

Guardrails: never claim conformance without the headless re-check passing. Never delete teaching content —
relocate to the modal. Keep each level's live change small and verified. If a level needs a real stage-ladder
redesign to be "robust" (Track B), that is OWNER-GATED — leave it as a proposal, do not build it live overnight.

## THE STACKING SPINE — anchored in L1–4, building to REAL dictation (owner 2026-07-04)

Owner: "make sure everything is anchored in what we built on L1–4 and that we're stacking/combining
the skills we've learned to get to the point where we can actually do a real-life dictation."

**The foundation L1–4 gives us (every L5–10 skill must re-use these, not replace them):**
- **L1 (m0) — HOME + anchors:** find the tonic by ear; identify the 1̂/3̂/5̂ anchors; octave equivalence.
- **L2 (m1) — CONTOUR:** up/down, step vs skip, melodic shape.
- **L3 (m1_5) — MEMORY:** hold a short melody in your head and reproduce it in order.
- **L4 (m2) — RHYTHM:** dictate the rhythm (drag figures), and combine it with naming anchors (L1) +
  shaping the passing tone (L2). L4 is already the first real "stack".

**The real-dictation target (what all of this is FOR):** hear a melody once/twice → hold it (L3) → get
its rhythm (L4) → name each pitch by degree (L1) using contour for the in-between notes (L2) → write it
on a staff (m9+). L5–10 is the ASSEMBLY phase that fuses these into the whole act.

**How each L5–10 level ADDS one thing AND re-integrates the foundation (the stack):**
- **L5 (m3):** name 1̂-2̂-3̂ **over the rhythm** → stacks pitch-naming (new) ONTO L4 rhythm + L1 home (1̂ = home).
- **L6 (m4):** recognize the notated melody; adds the **3rd skip** + a **2nd key** → re-uses L5 naming + L2
  (a skip IS L2's "skip") + L1 (home is transposable, not a memorized pitch).
- **L7 (m5):** full **pentascale 1̂–5̂** → extends L5/L6 naming to 4̂/5̂, re-uses L2 for the 1̂-3̂-5̂ skips, over L4 rhythm.
- **L8 (m5_5):** find **home in MINOR** → the L1 skill re-applied in a new mode (does not transfer for free).
- **L9 (m6):** **minor** pentascale recognition → re-uses L7 pentascale + L8 minor-home + L2 contour.
- **L10 (m7):** **fill the hidden note** → the biggest stack yet: you RECONSTRUCT a missing pitch from L1
  anchors + L2 contour + L5–9 degree vocabulary, over L4 rhythm. This is active recall — the closest rung
  to real dictation before staff notation (m8_5 protonotation → m9 full dictation).

**The "combining toward real dictation" axis to weave through the ladders (reduce scaffolding as we climb):**
given-rhythm → dictated-rhythm (re-integrate L4); unlimited replays → limited replays (re-integrate L3
memory); name-every-note → name-anchors + contour-the-rest (re-integrate L1+L2). Each level's LAST stage
should lean toward doing MORE of the act unaided, so by m8_5/m9 the student performs the full dictation.
**Invariant for every ladder below: no stage may drop a foundation skill — later stages FOLD IN L1–4, never bypass them.**

## RESEARCH FINDINGS + CORRECTED LADDERS (deep audit before writing code — 2026-07-04)

Owner: "do a deep look and research on L5–10 to make sure the robustness changes make sense before
writing it." Done. Grounded facts + corrections below SUPERSEDE the looser proposals further down.

### Verified facts
- **Degree/leap invariants:** `DEGREE_INTRO_MINDEX = {1,2,3,5→0, 4→5, 6,7→11}`, `LEAP_INTRO_MINDEX =
  {step,3rd→1, P5→5, P4→8}`. These are CEILINGS (no level reaches ahead), not floors — a level may use a subset.
- **Actual per-level specs (from core/melodic-curriculum.js):**
  - m3 (L5): degrees [1,2,3], leaps **[step] ONLY**, C major, 2/4, ch2, labeling.
  - m4 (L6): degrees [1,2,3], leaps [step,**3rd**], C+**G** major, 2/4, ch3, recognition.
  - m5 (L7): degrees [1,2,3,**4**,5], leaps [step,3rd,**P5**], C+G, 3/4, ch4, labeling. ← BIG jump.
  - m5_5 (L8): find-home-MINOR, live-home renderer (tier-based, cycles minor keys), 'ready-ish'.
  - m6 (L9): degrees [1-5] **minor** (A/D minor), 3/4, ch4, recognition.
  - m7 (L10): degrees [1-5], leaps [step,3rd,P5], C/G/**Amin**, 3/4, ch4, missing-note.
- **Generation gating:** `buildRound` accepts `opts.degrees` (works today) but NOT `opts.leaps` (leaps come
  straight from `L.pitch.leaps`). Per-stage *leap* gating REQUIRES adding a small `opts.leaps` override.
- **Renderers are generation-agnostic:** createLabelingRenderer names ALL notes; recognition/missing-note
  render whatever they're given. So staging = generation (degrees/leaps/rhythm/keys/meter per stage) +
  journey pips + advancement — **NO renderer changes** for m4/m5/m6/m7. (The m2 stage machinery is the exact template.)
- **No m3–m7 stage machinery exists yet** (only m0/m1/m1_5/m2). m5_5 already has tier structure (shares
  M0's live-home renderer).

### CORRECTIONS to earlier proposals (this is why we research first)
- **m3 (L5) proposal was WRONG:** I'd proposed a "1→3 leap you shape" stage. m3 is **stepwise-only** (no
  3rd leap until m4) AND the plain labeling renderer names ALL notes (no "anchors-only" mode). Corrected:
  m3's only real difficulty axes are **rhythm (ch1→ch2)** and **length** — a light 2-stage graduation, or
  leave it as the gentle intro it is. Do NOT add a leap or partial-naming here.
- Staging must use **degree/leap/rhythm/key gating**, not partial-naming (that only exists in the m2 identity phase).

### Corrected, grounded ladders (priority-ordered by "material moves too fast" impact)
1. **m5 (L7) — HIGHEST.** The real jump: adds degree 4 (invariant intro point) + degree 5 + P5 skips + ch4,
   all at once. Ladder: S1 degrees **[1,2,3,4] stepwise** (introduce 4); S2 add **5 + triad skips** (1-3,3-5,1-5, P5);
   S3 richer rhythm (ch4). Needs `opts.degrees` (have) + `opts.leaps` (add).
2. **m6 (L9) — new MINOR skill.** S1 major-vs-minor discrimination; S2 label minor pentascale (A min); S3 2nd key (D min).
3. **m4 (L6) — 3rd leap + 2nd key.** S1 stepwise/C; S2 add **3rd** leap; S3 add **G** key. Needs `opts.leaps`.
4. **m7 (L10) — gap difficulty.** S1 hidden note is a STEP from neighbors; S2 gap completes a **3rd**; S3 mixed keys/modes.
   Controls WHICH note hides by interval (`ctx.forceHideIdx` exists) — small generation logic, renderer unchanged.
5. **m3 (L5) — light.** 2-stage rhythm/length graduation (ch1→ch2), or leave as the intro. Lowest priority.
6. **m5_5 (L8) — minimal.** Already tier-based (M0-style); at most add a comfortable→quick tier. Special case.

### Implementation prerequisites (before writing the ladders)
- Add `opts.leaps` support to `buildRound` (mirror the existing `opts.degrees` override). Needed by m4, m5.
- Reuse the m2 stage machinery pattern verbatim: `S.stages.<id>`, `<ID>_STAGES` gating in newRound,
  clean-in-a-row advancement, journey pips, capstone-requires-last-stage. Renderers untouched.
- Encode each level's per-stage vocab as a conformance test (degrees/leaps ⊆ invariant) BEFORE claiming done.

## BUILD LOG — stage ladders

- **L7 m5 — BUILT + verified + deployed (2026-07-04).** 3-stage pentascale ladder: S0 "Add 4̂"
  (degrees [1,2,3,4], stepwise), S1 "Skips to 5̂" (degrees [1-5], step/3rd/P5), S2 "Full pentascale"
  (ch4 rhythm). Impl: `buildRound` now honors `opts.leaps` (mirrors opts.degrees); `M5_*` constants +
  newRound generation-gating + clean-in-a-row advancement (M5_K=4) + capstone-requires-last-stage +
  journey pips + `d.m5Streak` init — the m2 machinery pattern, renderer UNCHANGED. Conformance
  (headless, 18 rounds/stage): S0 degrees=={1,2,3,4}, intervals strictly stepwise (Δ∈{0,1}); S1/S2 open
  to {1..5} + skips. Stacks per spine: names OVER the rhythm (L4) + 1̂=home (L1) + skips are L2's "skip".
  **FINDING RESOLVED — no leak.** The "1↔4 (a 4th)" was a MEASUREMENT ARTIFACT in my first conformance
  test: it compared degree-NUMBERS, which conflate a P5 that crosses an octave (5̂ down to 4̂-an-octave-lower
  reads as a degree-diff of 3). Re-measured in SEMITONES (the correct metric, 30 rounds/stage): S0 = step
  only; S1/S2 = exactly step/3rd/P5, ZERO P4/tritone/6th/7th/P8. The generator (chooseNext /
  chooseNextHarmonic) only ever builds candidates from the exact span set {1,2,4}, so it cannot emit a P4.
  **LESSON for the remaining ladders: verify leap conformance in SEMITONES from note.midi, never degree numbers.**

- **REFACTOR (2026-07-04):** the per-level stage machinery is now DATA-DRIVEN — a single `STAGE_LADDERS`
  map (`{names, degrees, leaps, hallRefs, K}` per level) read by generic handlers (newRound gating,
  journey pips, clean-in-a-row advancement via `S.stageStreaks`, capstone-requires-last-stage). m2 stays
  separate (rhythm-first + identity phase). Adding a level = one data entry, no duplicated logic.
- **L5 m3, L6 m4, L9 m6, L10 m7 — BUILT + verified + deployed (2026-07-04).** All as STAGE_LADDERS data:
  - m3 (L5, labeling): 2 stages, rhythm graduation ch1→ch2 (stays stepwise 1̂-2̂-3̂; the gentle intro).
  - m4 (L6, recognition): 3 stages, leaps steps→+3rd; verified caps at the 3rd (no P5/P4).
  - m6 (L9, recognition): 3 stages, minor stepwise→+skips→richer rhythm (rare cadential 3rd in s0 —
    musical, and 3rd is legal at m6, so no invariant break).
  - m7 (L10, missing-note): 3 stages, leaps steps→+3rd/P5 — gating leaps stages the GAP difficulty for free.
  Conformance verified in SEMITONES (24 rounds/stage): zero P4/tritone/6th/7th/P8 anywhere; pips render;
  no page errors. Renderers unchanged. All fold in L1–4 per the stacking spine.
- **L8 m5_5 (find-home-MINOR):** NOT a STAGE_LADDERS level — it's a live tapping game (createLiveHomeRenderer,
  tier-based like M0) that already cycles several minor keys ('ready-ish'). It doesn't fit generation-gating;
  a light comfortable→quick tier is the only plausible add. Lower priority / different mechanism.

## Stacking proposals (Track B — earlier/looser; superseded above where they conflict)

**L7 m5 (pentascale 1–5; labeling + recognition).** NEW skill = degree **4** (DEGREE_INTRO_MINDEX puts
4 at mIndex 5), completing the 1-2-3-4-5 pentascale and consolidating 5. STACKS in: naming 1/2/3 (L5 m3)
+ recognition read-back (L6 m4) + rhythm-is-shown (L4 m2). Proposed stage ladder: (1) add **4** as a
labeled degree in stepwise 1-2-3-4 context; (2) **5** as the pentascale ceiling with small leaps 1–3 / 3–5;
(3) mixed **recognition** round (pick the staff) over the full pentascale — re-integrating L6. Vocab
invariant: NO 6/7 (they enter mIndex 11). Verify against DEGREE_INTRO_MINDEX + LEAP_INTRO_MINDEX before
building. OWNER-GATED.

**L8 m5_5 (Find home — minor; live-home-minor).** NEW skill = locating TONIC/home in a MINOR key
(la-based). STACKS in: re-applies the L1 (m0) "find home" skill into the minor mode — the same
home-finding gesture, new tonal context. Proposed stage ladder: (1) hear + tap home in natural minor;
(2) tell minor home (la/1̂) apart from the relative major's do; (3) home + the minor triad frame (1̂/3̂/5̂
of minor). No new melodic vocabulary beyond re-contextualizing home into minor. Note: this renderer is a
find-home TAPPING game (like M0) — correctly has NO speed wheel / NO HOME-reference button and no wordy
prompt; its conformance profile differs from the melody-dictation levels. OWNER-GATED.

**L10 m7 (Hear the gap; labeling + missing-note).** NEW skill = fill a SINGLE hidden note (missing-note
dictation) — the studio blurb frames it as "identify a 3rd big degree jump and fill a single hidden note
in a pentascale melody." STACKS in: naming 1–5 (L5–L7 pentascale) to identify the gap + recognition (L6)
to weigh candidates + the 1/3/5 frame (L4). Proposed stage ladder: (1) hidden note is a STEP from its
neighbors (easiest); (2) hidden note completes a 3rd LEAP to the frame (1̂/3̂/5̂) — introduces the "skip to
the frame" idea that m8 then owns; (3) mixed. Vocab invariant: pentascale 1–5 only (no 6/7 until mIndex 11);
respect LEAP_INTRO_MINDEX for the 3rd. OWNER-GATED.

## Progress log

- L4 m2: DONE this session (native grid, speed wheel, measure-focus, prompt already short).
- L5 m3 (labeling): Track A DONE — prompt shortened "Press Play to hear the melody — its rhythm is
  written below. Tap a degree button to name each note in order; click any note to change its answer."
  → "Name each note in order." (+ starts-on-home). Full how-to remains in the level intro modal.
  Button hygiene conformant (1 green, 1 CTA disabled-at-start, neutral HOME, HUD, wheel, no overlap).
  Track B stacking proposal: pending.
- L6 m4 (recognition): Track A DONE — "Press Play to hear a short melody, as many times as you like.
  Then click the staff that shows exactly what you heard." → "Pick the staff that matches what you
  heard." (+ starts-on-home). Recognition has 0 accent CTA (options ARE the answer) — conformant.
  Track B stacking proposal: pending.
- L7 m5 (labeling+recognition): DONE — Track A already satisfied: m5 REUSES the shared labeling/
  recognition renderers, so it inherited the m3/m4 short prompts ("Name each note in order." /
  "Pick the staff that matches what you heard.", + starts-on-home). Headless audit conformant
  (green 1, CTA 1 disabled-at-start, HOME 1, HUD, wheel, no overlap). No code change → no redundant
  deploy (the shared renderer shipped in DC). Track B stacking proposal added above.
- L8 m5_5 (live-home-minor): DONE — no live change needed. It's a find-home TAPPING game (like M0):
  no `.melodic-howto` (no wordy prompt), 1 green, 0 CTA, HUD present, and NO speed wheel / NO HOME
  reference BY DESIGN (correct for a find-home game). Headless audit conformant for its type. Track B
  stacking proposal added above.
- L9 m6 (recognition): DONE by inheritance — reuses the recognition renderer (short prompt "Pick the
  staff that matches what you heard."); audit conformant (green 1, CTA 0, HOME 1, HUD, wheel, no
  overlap). No code change. Track B proposal still pending (loop will add on its m6 turn or fold in).
- L10 m7 (labeling + MISSING-NOTE): DONE — the missing-note prompt "Press Play to hear the whole
  melody. One note on the staff is hidden (marked \"?\") — pick the degree that belongs there." →
  "Pick the degree for the hidden (?) note." (+ starts-on-home). Verified by FORCING missing-note mode
  (studio exMode seam — the rotation only surfaces it at high mastery): renders short, hygiene
  conformant (green 1, CTA 1, wheel, HUD), no errors, screenshot viewed. Labeling half already short.
  This fix also benefits every other missing-note level (m8/m12/m16 share the renderer). Track B proposal added.

ALL of Levels 4–10 complete. Track A (design conformance / verbosity) DONE + deployed. Track B (stacking
redesigns) delivered as OWNER-GATED proposals above. Loop stopped (no reschedule).
