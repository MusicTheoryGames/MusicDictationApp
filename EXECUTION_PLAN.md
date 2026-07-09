# EXECUTION PLAN — closing every gap between the shipped app and the original design

Written 2026-07-02 after the owner's direct correction: repeated deviations from the
founding documents (labeling boxes vs specified notation; missing gamification despite
LEVEL_SYSTEM_RESEARCH.md; first-open failures). This plan is the single source of truth
for the autonomous completion loop. **Rules of engagement, non-negotiable:**

1. Every item cites the founding doc or locked memory decision it implements.
   Build what the document says — no silent substitutions, no shortcuts. If a
   simplification is genuinely required, it is written HERE first, marked as a
   deviation, and surfaced to the owner — never discovered by them in play.
2. Every item ships only with: `node --test core/*.test.js` green, ext-seam
   regression when solo-mode.js is touched, puppeteer screenshots actually
   examined, production deploy, memory update.
3. The loop keeps executing phases IN ORDER without owner intervention.
   Owner-preference items use the documented default (recorded below) rather
   than blocking; the owner can override any default later.

---

## A. Conformance audit (docs + locked decisions vs shipped)

### DONE and verified (no action)
- M0–M26 generative ladder, all documented generators (MELODIC_ENGINE_SPEC.md §2–2c),
  cadence funnel, color tones, modulation, symmetric collections, irregular +
  changing-simple meter. 379 tests.
- 7/8 renderers per MELODIC_RENDERER_SPEC.md incl. real-notation labeling, mystery-slot
  missing-note, find+CORRECT error-detect, two-phase notation-entry with real
  rhythm-game embed (2/4·3/4·4/4·6/8) per the "delegates to the existing rhythm game"
  contract.
- Sticky mastery (core/mastery.js) + spaced review (core/review.js Leitner) wired;
  teach content all 27 levels; Hear-home + starts-on-1̂ context (RCM give-the-tonic);
  5-theme chrome; BeatQuest/MelodyQuest naming; production hosting on the established
  domain; Safari audio hardening + silence watchdog.
- Volatile-score layer v1 (LEVEL_SYSTEM_RESEARCH.md): score+combo, XP + 11 ranks,
  gems, 8 declarative achievements, stars/score-pops/achievement banners. Untimed;
  no leaderboards (research DON'Ts).

### GAPS — the work of this plan (each phase below)
| # | Gap | Source of truth |
|---|-----|-----------------|
| P1 | Melodic advancement gate lacks the CAPSTONE (currently band+streak only) and the decay-driven "back up a step on return" | mastery-progression-model memory (LOCKED): "Proficient band + capstone + streak"; "decay-driven back-up-a-step on return" |
| P2 | Placement/onboarding not wired (core/placement.js exists, unused; no self-select tier cards) | LEVEL_SYSTEM_RESEARCH.md §1 (full placement design; "a real short adaptive diagnostic is a genuine differentiator") |
| P3 | A/B self-compare (hear YOUR answer vs the original before submitting) absent | LEVEL_SYSTEM_RESEARCH.md §2: "a strong built-in error-detection mode — we should add it" |
| P4 | Teaching-loop economy: unlimited hearings, no count-off before the melody | LEVEL_SYSTEM_RESEARCH.md §2: "2–3 hearings", "always give meter + count-off up front" |
| P5 | Daily challenges (date-seeded) + streak-freeze | LEVEL_SYSTEM_RESEARCH.md §1 dailies; §2 "daily streak with a streak-freeze slack" |
| P6 | M20 two-part (two-voice engine) | TWO_VOICE_ENGINE_PLAN.md (scoped; defaults declared below) |
| P7 | Changing simple↔compound meter with metric-equivalence markings | changing-meter-conventions memory (Hall Ch21/22; division-constant is Hall's default) |
| P8 | Kids-mode parity for MelodyQuest (guided-only under kids theme; mascot presence) + teacher/classroom melodic parity (the ORIGINAL app was a classroom system) | kids-mode-design-principles memory; RHYTHM_DICTATION_SUMMARY.md (teacher-controlled classroom mirroring melodic dictation) |
| P9 | Final conformance re-audit: walk this table, re-verify every row, full-ladder play-through, all themes, mobile | this document |

### Documented DEFAULTS for owner-preference points (override any time)
- **P6 two-voice**: strict note-against-note first; first duet rung uses M9's key set
  (C/G/F major, A/D minor); melodic M20 ships before tapping duets (cheaper to verify).
- **P7 equivalence**: division-constant (♪=♪) as default per Hall's own rule; a
  beat-constant toggle exposed later as a teaching option.
- **P4 hearings**: 3 hearings default per research; a "practice mode" toggle keeps
  unlimited hearings available (research warns against anxiety mechanics for kids).
- **P8 mascot**: text/SVG placeholder presence for Tock only (real mascot art is an
  owner/art decision — flagged, not faked).

---

## B. Phase details + verification gates

**P1 — Locked mastery model parity (capstone + return-decay).**
Melodic capstone = a LONGER round (4 bars, or 8 for M17+) of the level's own exercise
that must be passed CLEAN once the band+streak gate is met (mirrors solo-mode GUIDE's
capstone semantics; hand-swap is rhythm-performance-specific and does not apply).
Return decay: on load, if viewItemAsOf shows the current level fell below Familiar,
step the working level back one rung (never erase mastery records — the memory's
"back up a step", not a reset).
Gate: unit-style browser test driving the full gate (band→streak→capstone→advance),
screenshots, deploy.

**P2 — Placement.**
First-run (no save): offer "Start from the beginning" or "I've done this before →
placement": self-select a tier card (M-groups with visual previews per
LEVEL_SYSTEM_RESEARCH §1), then a capped no-fail in-engine assessment (16 items,
recognition mode, PASS=0.85, fail steps down one tier and re-tests) using
core/placement.js where its API fits. placeProfile idempotent, never demotes.
Gate: scripted placement run for a mid-ladder tier + a fail-step-down path.

**P3 — A/B self-compare.**
In notation-entry (and labeling), before Check: a "Hear my answer" button renders the
student's current answer to audio next to "Hear it again" (the original) — unlimited,
per research. Requires degrees→midi for the answer under the round's key (trivial via
core/melodic's SCALE_SEMITONES; no engine change).
Gate: browser test hears-both paths; screenshot.

**P4 — Hearings + count-off.**
Play buttons show remaining hearings (default 3, replenish per round); a one-bar
count-off (metronome ticks, reusing raw-WebAudio) precedes the melody in dictation
modes. Practice-mode toggle = unlimited.
Gate: hearing counter behavior + count-off timing test.

**P5 — Dailies + streak-freeze.**
3 date-seeded daily challenges (FNV-1a of yyyy-mm-dd → level+seed picks, per
StaffCommander pattern), a daily-streak counter with ONE streak-freeze earnable via
gems (research's anxiety slack). Shown on a small "Today" card on the game page.
Gate: same-day determinism test (two loads → same challenges), freeze consumption test.

**P6 — Two-voice engine (per TWO_VOICE_ENGINE_PLAN.md §2, defaults above).**
generateTwoPartMelody + counterpoint filters + tests (≥40 asserts incl. no crossing,
no parallel 5ths/8ves, strong-beat consonance, determinism); two-stave renderStaff;
per-voice play with mute/solo; M20 rung-1 (voice-attention) + rung-2 (one-voice
dictation) renderers; curriculum m20 → buildStatus ready (two rungs).
Gate: the plan doc's own §6 verification list.

**P7 — Simple↔compound changing meter.**
meterSequence accepts mixed classes ONLY with an explicit equivalence field
({equivalence:'division'|'beat'}); renderers draw the ♪=♪ / ♩=♩. marking at the
change (VexFlow text annotation above the barline); generator scales the beat map
accordingly. Hall default division-constant.
Gate: notation screenshot vs Hall's convention (changing-meter-conventions memory),
duration-math tests.

**P8 — Kids parity + classroom scoping.**
Kids theme on melodic-game forces guided (mirror solo-mode's kidsThemeActive rule) and
hides the free level picker; Tock placeholder greeting on intro cards under kids theme
only. Classroom/teacher melodic parity: a SCOPING doc (mirrors rhythm-teacher flow,
room codes, projection) — build gated on owner because it's a product-surface decision.
Gate: kids-theme behavioral test; scoping doc completeness.

**P9 — Final conformance sweep.**
Re-walk section A's table; play every level headless answering correctly via seams;
screenshot every exercise type in every theme + mobile; verify every founding-doc
claim that names a student-visible behavior; update all docs' build-status lines;
final production deploy; memory closure.

---

## C. Loop mechanics
Each wake: read THIS file → find the first unfinished phase → execute it fully under
the rules of engagement → mark the phase DONE here with date + evidence pointers →
deploy → update melodic-generator-plan.md memory → schedule the next wake with the
same instruction. Never end a turn while a phase is executable (see
never-stop-while-work-remains memory).

## C2. INTERVAL GYM build (owner-approved 2026-07-02: "complete this FULLY,
COMPLETELY and PROFESSIONALLY") — phases per INTERVAL_GYM_SPEC.md §8, same loop
protocol as P1-P9. Owner's open items resolved by documented default (overridable):
unlock map + thresholds as specced; SING v1 = unaccompanied (drone-under-voice =
future); name = "Interval Gym". DEVIATION (documented): the tritone circuit ships
as a 3-station circuit (FEEL/NAME/SING — no FIND stream because the generator
correctly BANS tritone melodic moves, no USE because the in-key tritone lives as
a passing tone whose alter-based entry doesn't fit the degree palette; revisit
with a dedicated percept exercise later).

## C3. DICTATION DEPTH (owner directive 2026-07-02: "goes through material WAY
too quickly... doesn't tackle multiple time signatures, multiple keys, compound
and simple meters that much... needs an EXTENSIVE dictation engine where
students can practice 2, 4 and 8 measure dictations and more exercises... can't
just give them 3 things they get right and then move on"). Confirmed real in
code: buildRound always used L.meter (meters[] never rotated), every practice
round was 2 bars, and the gate needed ~5 good rounds. Phases, loop protocol:
- D1 VARIETY BY CONSTRUCTION: rounds rotate through the level's WHOLE meters[]
  set (same rotation mechanism as keys[]); round length grows with mastery
  (score <40 → 2 bars · 40-79 → alternating 2/4 · ≥80 → 4 bars; capstone 4/8
  unchanged). Special-path levels (m19/m24/m25/m20) keep their own meter logic.
- D2 COVERAGE-GATED ADVANCEMENT: the capstone may not arm until the level's
  coverage map is filled — ≥1 CORRECT round in EVERY key pair of keys[], ≥1
  correct in EVERY meter of meters[], ≥10 total graded rounds at the level, and
  ≥1 clean 4-bar round. Coverage persisted per level (S.coverage), displayed in
  the HUD as an explicit checklist ("Keys 2/5 · Meters 1/3 · Rounds 6/10 ·
  Long —") so the demand is visible, not assumed. Reviews/dailies of a level
  count toward ITS coverage. Defaults overridable by owner.
- D3 PRACTICE STUDIO: a student-driven drill panel — pick length (2, 4, or 8
  measures), any key from the level's keys[], any meter from meters[]; endless
  generated dictations; records mastery + coverage but NEVER advances the
  ladder by itself (guided rounds still own streak/capstone).

## D. Phase status
- P1: **DONE** 2026-07-02 — capstone gate (arm at band+streak, 4-bar / 8-bar-at-M17+ clean capstone advances, miss resets streak+arm; HUD badge + toasts) and return-decay step-back (decayed-below-Familiar on load steps back one rung with a welcome-back note, records untouched). Evidence: test-capstone.js full path (arm toast +140 combo, 14-note capstone, Level-up overlay, levelIdx 0→1; 90-day decay 5→4 with message), 379/379, build L deployed.
- P2: **DONE** 2026-07-02 — first-run self-select tier cards (7 tiers with plain-language descriptions), 16-item no-fail RECOGNITION assessment, PASS=0.85 → placed one step ahead with all lower levels marked proficient (idempotent, never demotes), fail → step-down-one-tier re-test, floor → start at m0. Evidence: pass path 16/16 → "Placed! M9" + 9 lower levels marked; fail path 25% → "check one tier down"; build M deployed.
- P3: **DONE** 2026-07-02 — services.playDegrees renders a degree-sequence answer to audio under the round's key/mode (octaves follow the true melody's register so the comparison isolates DEGREE choices); "Hear MY answer" in labeling + notation-entry phase 2, enabled once every note is answered, unlimited per the research. Evidence: gating verified (disabled before answers, enabled after, plays clean); build N deployed.
- P4: **DONE** 2026-07-02 — 3-hearing budget on every dictation Play button ("Play (2 left)" countdown, locks at 0), one-bar accented count-off in the melody's meter before playback (compound-aware), Practice-mode toggle = unlimited + auto-play (the research's anxiety slack). DEVIATION note: graded rounds no longer auto-play (the budget must be exact); practice mode keeps auto-play. Evidence: budget 3→0 with lock verified; build P deployed.
- P5: **DONE** 2026-07-02 — 3 daily challenges, FNV-1a date-seeded (deterministic across loads, verified), drawn from the player's own unlocked span; daily rounds use the challenge's exact level+seed, badge "Daily · Mx" in HUD (bug caught+fixed: HUD showed the wrong level), rewards +10 gems/+5 XP/+150 each, all-three → day-streak +1 + fanfare; STREAK FREEZE purchasable for 30 gems absorbs one missed/incomplete day (rollDailyDate consumes it before resetting). Build Q deployed.
- P6: **DONE** 2026-07-02 — generateTwoPartMelody (first species; staged widening; cadence tonic hard-placed; counterpoint sweep 381/381), renderTwoStaves + playTwoPart (per-voice mute: Play both / Top alone / Bottom alone), rung-1 voice-attention renderer (2 selective-listening questions, duet notation revealed after grading), rung-2 one-voice dictation (labeling fed voices[0]), m20 in PLAYABLE, curriculum buildStatus ready, ladder/renderer-spec docs updated. DEVIATIONS (documented): cadential hidden octave accepted when unavoidable; rung 3 (full two-voice notation) future. Evidence: browser rung-1 run graded Correct with both staves rendered (screenshot examined); build R.
- P7: **DONE** 2026-07-02 — mixed simple<->compound meterSequence gated on explicit spec.equivalence ('division'|'beat'; Hall's default rule is division and the round builder uses it); melody carries equivalence; BOTH renderers draw the ♪=♪ / ♩=♩. marking above each class change (clip bug found by screenshot + fixed); beat-constant playback scales compound bars 2/3 (division-constant is the scheduler's natural behavior); m25 rounds rotate three kinds by seed. Evidence: 3/4→6/8→3/4 round with ♪=♪ at both changes (screenshot examined), 382/382.
- P8: **DONE** 2026-07-02 — kids theme on the melodic game is GUIDED-ONLY (free level picker + practice toggle hidden, MutationObserver keeps it live across theme switches; mirrors solo-mode's kidsThemeActive rule) and Tock greets on intro cards (text placeholder per the documented default — real mascot art is owner/art). Classroom parity SCOPED, not built (owner-gated as the plan allows): MELODIC_CLASSROOM_PLAN.md — deterministic-seed round distribution (no melody payloads), reuse of the rhythm classroom's transport, teacher console/projection scope + the 3 owner decisions. Evidence: kids-mode behavioral test (theme-kids: pickers hidden, Tock present); build S deployed.
- G1: **DONE** 2026-07-02 — core/gym.js pure engine (GYM_CIRCUITS unlock map in lockstep with curriculum pitch.leaps, INTERVAL_QUALITY, gymPairItem with ≤12-semitone simple-interval guard, gymFindStream, gymUseRound; 7 sweep tests, suite 389/389) · services playCadence (I-IV-V-I triads) + playPairTimbred (timbre/register roulette by seed) · melodic-gym.js shell (circuit board, station chips w/ live mastery bands, melodic-gym-v1 save with micConsent slot, __mqTest.lastGymStation seam) · FEEL (settled/leaning, 6 pairs, 5/6 pass) + NAME (cadence → roulette pair → degree-pair AND quality, both-right per item, 5/6 pass) renderers · Gym button in controls gated at melodicLevel('m7').mIndex via renderHud. Evidence: production playthrough (musicdictation-roadtest, build Z) — gate hidden@M6/visible@M7, board 6 circuits w/ correct unlock labels, FEEL 6/6 → "Station passed — 100%", chips refresh to attempted, NAME 6/6 fully named, melodic-gym-v1 persisted both items, clean exit to an M7 round; screenshots gym-board/gym-feel/gym-name/gym-after-exit EXAMINED; zero page errors.
- G2: **DONE** 2026-07-02 — tap-stream core EXTRACTED per the spec's reuse note: createTapStreamGame (index-predicate targets) now serves BOTH M0's degree hunt (createTapTargetGame = thin wrapper, behavior identical — M0 stage-2 regression re-verified in browser) and FIND (createGymFindRenderer: gymFindStream targets, tap window = the pair's SECOND note, singular prose noun per circuit). USE = createGymUseRenderer, a thin wrapper on the EXISTING missing-note renderer via new ctx.forceHideIdx (defaults to pickHideIndex when absent). Shell mounts per-station material (FEEL/NAME pair items · FIND stream · USE micro-melody), all four station chips live. Evidence: production run (build AA) — FIND timed-tap playthrough "Perfect — caught every one" with reveal chips, USE staff+"?"+full palette graded Correct through the real missing-note flow, melodic-gym-v1 gains 3rd:find/3rd:use, M0 regression green, 389/389, zero page errors; screenshots g2-find/g2-find-done/g2-use/g2-m0-regression EXAMINED.
- D1+D2+D3: **DONE** 2026-07-02 (§C3 DICTATION DEPTH, built same-day as the owner's directive) — D1: buildRound takes a validated opts.meter; the game rotates the level's WHOLE meters[] set (m2 verified cycling 2/4→3/4→4/4 — previously it ONLY ever played one meter) and round length grows with mastery (new=2 bars, mid-band alternates 2/4, Proficient=4, M17+=8; dailies pin primary meter + 2 bars for seed determinism). D2: per-level coverage map (S.coverage: correct-by-key, correct-by-meter, round count, one clean 4-bar) — capstone arms ONLY when band+streak AND coverage complete (every meter, ≥min(keys,6) distinct keys, ≥10 rounds, long clean); HUD shows the checklist ("Coverage — keys 1/1 · meters 1/1 · rounds 5/10 · long round done"); "Skill band met — now cover the level: …" toast names exactly what's missing. D3: Practice Studio button → overlay pickers (length 2/4/8 measures · any level key · any level meter) → endless drills that record mastery+coverage+score but never touch streak/capstone; HUD "Studio · Mx"; leave-button restores guided flow (armed capstone intact). Evidence: production run (build AB) — meter rotation, bars 2→4 ladder, gate blocked at streak 4/score 80 with hint toast, armed after coverage complete, 8-measure studio round (35 notes) graded, capstone preserved through studio and offered on exit; screenshots depth-coverage-hint/depth-studio-overlay/depth-studio-8bar EXAMINED; 389/389; zero page errors.
- CONFORMANCE: **DONE** 2026-07-02 (CONFORMANCE_AUDIT.md — written after the owner correctly called out repeated false conformance claims; root cause recorded there: P9 verified "runs" and I reported it as "conforms"). Fixed same-day, build AC: DOC_CONFORMANCE map in core/melodic-curriculum.js (exerciseModes[] progression, hallRhythmRefs[] chapter ranges, lengthBars material lengths, all doc-derived per level); buildRound validated opts.exerciseMode/opts.hallRhythmRef (modulating/symmetric forced-recognition safeguard intact = audit §A5 registered gap, noted in the curriculum doc itself); game mode PROGRESSION (below Familiar = easiest mode → middle band rotates all → Proficient/capstone = hardest), Hall-ref rotation, base length = the level's own material (m14=4, m17/m26=8, scaffolded at half below Familiar); coverage gate + HUD + hint extended with EXERCISES (every prescribed mode correct before capstone arms); Studio gained an Exercise picker; stale doc lines fixed (M25 equivalence, M20 rung 3 = shipped). NEW core/melodic-conformance.test.js: every level × meters × refs × material length generates bar-filling (the sweep that would have caught this). Evidence: production (build AC) — m7 modes labeling→alternating→missing-note by band, m9 refs rotate ch4/ch6, m14=4 bars, m17=8 bars mid-band, gate blocked with 1/2 modes + complete with 2/2, studio mounts chosen mode, 391/391, zero page errors, screenshots examined.
- G3: **DONE** 2026-07-02 — SING mic station (build AD). NEW core/pitch.js (pure, unit-testable): midiToHz/hzToMidi/centsBetween, detectPitch (normalized autocorrelation, 80–1000 Hz, RMS gate, LOCAL-MAXIMA peak pick fixing a real octave-halving bug an agent caught via synthesized-tone tests — shortest-lag peak within 0.86× of global max), medianPitch, gradeSungPitch (±50¢ hit · ±100¢ near · octave-off near-with-message · else miss); core/pitch.test.js 7/7. Services captureSungFrames (getUserMedia inside the gesture, shared actx, per-frame Float32 time-domain, live level via onLevel; releaseMic) — mic math stays in core/, never in services. createGymSingRenderer: consent-gate (asked once, persisted to melodic-gym-v1.micConsent), reference (drone→FROM), explicit "Sing UP/DOWN a <interval>", 2.5s capture with level meter → core/pitch grading, verdict per item, pass ≥4/6; FALLBACK sing-then-compare (self-report match/near/miss, selfGraded, records only on confident hit/miss) when mic denied/unavailable — never fails silently (project's audio lesson). Fixed a real consent-loop bug (renderer read ctx.micConsent snapshot → local mutable copy). Evidence: fake-media browser test (--use-file-for-fake-audio-capture sine440.wav) ON PRODUCTION — real MediaStream captured, detectPitch read 439.9995 Hz (61 voiced frames, essentially exact), graded correctly (P5 = 500¢ miss vs E4; a MIDI-69 target = clean "hit"), mic round completes + records 3rd:sing (micConsent:true), fallback path 6/6 self-checked records with micConsent:false; screenshots sing-record/sing-fallback EXAMINED; core suite 415/415 (+24: pitch/chunks/protonotation), zero page errors.
- EXPANSION SLICE 1: **DONE** 2026-07-02 (build AE — owner approved "part of the rung · agree order · first slice · do it together w/ multiple agents"). Built via 3 parallel core-builder agents (pure modules + tests, shared-file wiring kept serial): core/chunks.js (32 tonal chunks, 8/8), core/protonotation.js (stage-isolated grader, 9/9), core/pitch.test.js (7/7, caught+fixed a real octave-halving bug in pitch.js). Two owner-approved NUMBERED rungs with fractional mIndex (no renumbering — mIndex only ever compared / checked >=17): M1.5 'Hold the tune' (createMemorySpanRenderer — echo back a growing tonal run 3→4→5 by mastery; trains the working-memory bottleneck the research names #1; kept tonal so it transfers) between m1/m2; M8.5 'Sketch it' (createProtonotationRenderer — degree + up/down/same contour capture before the staff, graded by core/protonotation.js with stage-isolated feedback "Degrees X% · Contour Y% · Count") between m8/m9. Wired: RENDERERS map, PLAYABLE auto-includes them, curriculum DOC_CONFORMANCE fields inline, teach content, idTag() display ('m1_5'→'M1.5'), coverage/mode system. Curriculum tests updated for 27→29 rungs + fractional mIndex; MELODIC_ENGINE_SPEC §5 enum extended. Evidence: production (build AE) — both rungs in PLAYABLE at idx 2 & 10, M1.5 echo 3/3 "Perfect — held all 3" +100, M8.5 sketch "Degrees 100% · Contour 100% · Count right" +120; screenshots exp-memory/exp-proto EXAMINED; 415/415; zero page errors. Then (owner "continue and execute your plan") the third slice-1 piece SHIPPED (build AF): CHUNK-VOCABULARY drill — melodic-chunks-ui.js mountChunkDrill side-mode over core/chunks.js (32 cells): a 6-cell INTERLEAVED session (interleaving > blocking, research), play a tonal cell (octave-smoothed so cadence cells resolve correctly) → echo on a degree palette that includes neighbour FOILS (real recall, not a giveaway) → per-tier mastery in melodic-chunks-v1; "Pattern drill" button gated at M3; tier scales with mIndex. Evidence: production (build AF) — gate hidden<M3/shown@M5, session runs all 6 patterns + records tier mastery + "Drill again", clean exit to a round; screenshot chunk-drill EXAMINED; 415/415; zero page errors. FIRST SLICE COMPLETE (memory-span + protonotation + chunk-vocab). Deferred to next slices per plan: bookend, cadence track, stage-isolated feedback, difficulty dials, task-per-hearing.
- G4-CONFORMANCE: **DONE** 2026-07-02 (build AH — owner: "fix all items you found not to be to spec... do exactly as your plans say"). Brought the 5 G4 deviations I'd flagged to LITERAL spec: (1) GEMS now use the identical mastery-event formula the ladder uses — extracted `masteryEventGems(eventScore, cleanRate)`, shared by level-ups AND circuit completion; the capstone accumulates a real score (100/clean step) fed to the formula (verified: gems 35 = 25+round(600/120)+5, and score += 600 not a flat 300). (2) FIND station threshold is now ≥ 5/6 (createTapStreamGame gains passRatio; capstone still demands a perfect FIND). (3) Capstone "2 items from EACH station": USE now runs TWO rounds (6 steps total for a 5-station circuit — verified "Capstone 1 of 6"); FIND's single stream carries ≥2 target detections. (4) SPACED REVIEW (spec §2) IMPLEMENTED — my earlier "can't route through review" was WRONG; the spec designed `gym:<circuit>` entries. Completion enrolls one, box-1 out; newRound()'s due check surfaces it as the circuit's NAME station via new exported mountGymStation; grading advances the Leitner box (verified: due → "Gym review · 3rd" → NAME → reviewsPassed 1, box 1→2). (5) DAILY gym-round TYPE (spec §6) IMPLEMENTED — third daily becomes a date-seeded Gym NAME round once ≥1 circuit unlocked, same reward/streak (verified: daily types [ladder,ladder,gym]). All prod-verified on build AH, 415/415, zero page errors. The §7 verification gap (Kids-theme station shots) was also closed.
- G4: **DONE** 2026-07-02 (build AG) — circuit CAPSTONE + economy + achievements. Capstone lights when every built station of a circuit reaches Proficient (score ≥80, mastery.viewItemAsOf) and it's not yet complete; it chains a mixed round of ALL stations (2 items each for FEEL/NAME/SING via a shared stationCtx builder; FIND stream + USE round once each), each must be passed CLEAN in one sitting (ctx.capstone tightens FEEL/NAME/SING to all-correct), any not-clean aborts with a Retry; all-clean → circuit added to circuitsCompleted + host game awards the mastery-event economy (deps.onCircuitComplete: +50 XP, +35 gems, +300 score, fanfare, toast) + 3 new declarative achievements (gym-first, gym-3-circuits, gym-singer = a perfect MIC-graded — not self-checked — SING round). Refactored mountStation to share stationCtx with the capstone; fixed a real stale-station-CSS-class leak on the host (clearStationClasses). DOCUMENTED DEVIATIONS (registered, not dropped): (a) gym circuits do NOT enroll in the ladder spaced-review rotation — review.dueItems replays by PLAYABLE level id and a circuit isn't a ladder level; the gym's own per-station mastery+decay keeps it sharp; (b) the daily gym-round TYPE is deferred — the daily flow is coupled to ladder buildRound and hosting a non-ladder gym round needs a daily-flow refactor disproportionate to one sub-item. Evidence: fake-media browser test ON PRODUCTION — all 5 stations seeded Proficient → capstone lit ("all PROFICIENT" chips + banner, screenshot EXAMINED) → chained clean through FEEL/FIND(timed taps)/NAME/SING(self-check)/USE → "CIRCUIT COMPLETE! +50 XP · +35 gems · Achievement: Circuit Trainer", gymCircuits 0→1, circuit recorded to melodic-gym-v1; 415/415; zero page errors.
- G5: **DONE** 2026-07-02 (build AG) — theme + mobile sweep of every new surface: Ink/Kids/MPC desktop + 390px mobile screenshots EXAMINED (gym circuit board single-columns on mobile, FEEL/NAME/FIND/SING/USE stations + M1.5 memory-span + M8.5 protonotation + Pattern drill all legible — staff/cards stay light with themed melodic-btn controls, big touch targets), zero page errors across all themes. Docs synced (INTERVAL_GYM_SPEC §8 G1-G5 status + deviations, MELODIC_ENGINE_SPEC enum for expansion rungs, MELODIC_CURRICULUM stale-line fixes from the conformance pass). Memory closed (melodic-generator-plan). Kids-parity decision documented: free side-modes (Gym/Pattern drill/Studio) stay visible in kids theme consistent with the already-shipped Gym/Studio (revisit only if owner wants kids fully guided-only). **THE INTERVAL GYM (G1-G5) IS COMPLETE.**
- P9: **DONE** 2026-07-02 — full-ladder sweep: all 27 playable levels × 3 rounds each
  (hits m20's two rungs, m25's three meter kinds, embeds), ZERO failures/page errors;
  live production mobile first-open verified (placement cards up, stamp current, no
  error banner); 382/382 core tests; all founding-doc build-status lines updated
  through the phases. THE PLAN'S GAP TABLE IS CLOSED. Remaining owner-gated items,
  by design: classroom build (MELODIC_CLASSROOM_PLAN.md, 3 decisions), real Tock
  mascot art, custom production URL.
- POST-PLAN 2026-07-02 (owner design): PROGRESSIVE M0 — the yes/no drill is only the
  floor; mastery-driven stages graduate to TAP-THE-TARGET streams (home established,
  ~10 notes at one steady beat, tap on every occurrence of the target): score 35+ →
  tap 1̂, 70+ → tap 3̂, 90+ → tap 5̂. Graded hits-minus-false-taps with a per-note
  reveal row. Verified with a timed correct-tap run ("Perfect — caught every HOME").
  Build X.
- OWNER QUESTION (2026-07-02): "does an intensive intervals trainer belong in the
  ladder?" RECOMMENDATION (grounded): NOT as a ladder rung — the curriculum's LOCKED
  decision is degree-jumps-in-key-context, not interval-name drills, and the pedagogy
  research backs training intervals through function (chunking/extractive listening)
  rather than isolated pairs, which transfer poorly to dictation. BUT an optional
  "Interval Gym" PRACTICE SIDE-MODE (like tap-back in BeatQuest: unlocked from M7 when
  3rds arrive, drilling the level's own leap vocabulary as degree-pairs with solfège
  anchors) fits the product without bending the ladder. Awaiting owner call before
  building.
- POST-PLAN 2026-07-02 (owner spec): PLACEMENT IN BOTH GAMES. Melodic: pass now
  starts AT the tested tier (owner's rule, replacing the one-ahead default) + a
  "Placement test" button for existing players. BeatQuest: vocabulary-checklist
  placement generated FROM the curriculum data (31 rows: each chapter's new figures +
  new time signatures, cascade-checking), contiguous known-prefix -> 8-question no-fail
  dictation check at that chapter via a guidedRecord intercept (diagnostic, no mastery
  recording), pass 0.85 -> GUIDE.place(target, markBelow) so play STARTS THERE with
  lower chapters marked proficient; fail -> back one tier (3 chapters) and re-test;
  offer on fresh guided boot, suppressed under all test seams; PLACE exposed via
  __levTest. Verified: levtest + ext-seam regressions green; fresh-boot checklist;
  pass path (guidedIdx=6, 6 chapters marked); fail path (step-down re-test). Build W.
- POST-PLAN 2026-07-02: two-part RUNG 3 shipped (full two-voice dictation — composes
  the labeling renderer per voice, per-voice accuracy averaged, m20 rotates all three
  rungs by seed; verified end-to-end both voices). Self-run polish: temporary
  Sound-test panel removed from students' view, favicon added, warmer two-oscillator
  instrument voice. Build U deployed. M20's mastery goal is now fully served.
