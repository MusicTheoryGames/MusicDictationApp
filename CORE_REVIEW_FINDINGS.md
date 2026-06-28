# Core modules — triple-check findings

Independent adversarial review + doc-conformance check of the overnight `core/` modules
(each in its worktree). Layers: (1) agent self-report, (2) I independently re-ran every test
suite, (3) independent skeptical reviewers read the code + verified conformance to the actual
design docs (`ARCHITECTURE_RESEARCH.md`, `LEVEL_SYSTEM_RESEARCH.md`, `HALL_CATALOG.md`,
`CURRICULUM_PLAN.md`). Status: 2026-06-28.

| Module | Tests (I re-ran) | Verdict | Must-fix |
|---|---|---|---|
| placement | 58/58 | solid; conforms to docs | none (minor footguns) |
| mastery | 58/58 | solid core | **1 real bug** + doc reconcile |
| grading | 28/28 | tests rigorous (I read them) | doc-conformance review CUT OFF (rate limit) |
| review | 39/39 | (review cut off) | doc-conformance review CUT OFF |
| curriculum/ladder | 73/73 | **faithful to docs** | 1 clear doc-miss (ch7) |

## A. Real CODE fixes
1. **mastery — path-dependent decay (the one that can corrupt scores).** `applyDecay` picks the
   half-life from the item's *current* level, so a 20-day idle gap = 63/Familiar one-shot vs
   29/Attempted if decayed in two steps with the view persisted. Normal `recordAnswer` is safe;
   the public `applyDecay`/`viewItemAsOf` invite a caller to corrupt it. FIX: document the invariant
   ("decay only from the last real answer; never persist a decayed view") and/or store level-at-idle-start.
2. **curriculum — Ch7 double-dotted figures dropped.** `HALL_CATALOG.md` explicitly says "add
   double-dots (Ch7)"; the code followed `CURRICULUM_PLAN.md` (which omits them) and neither adds
   nor flags them. FIX: add a `double-dot` skill/figure to ch7 (or at minimum a cited comment).
3. **mastery hardening** (lower priority): no `Number.isFinite` guard (a NaN score silently → Attempted);
   public `hasSpacedSessions` assumes a pre-sorted array (use min/max); `planRampIn` doesn't integer-floor
   `remainingCapacity`; `correct` is coerced not validated.
4. **placement hardening** (low): the `exhausted` stop is opt-in (needs `bankSize`) — couple it to the
   real bank so a caller can't silently spin; NaN item-δ silently dropped; `maxItems<minItems` unguarded.
5. **curriculum test rigor** (low): the solo-mode figure-id scraper regex is too permissive (matches any
   quoted token); tighten to declared `id:`/`*_STEPS` forms. Optionally reconcile ch28 time sigs
   (code's `10/8` follows CURRICULUM_PLAN; HALL_CATALOG lists `9/8-asym, 11/8`).

## B. DOC reconciliations (the docs disagree with each other or with the better answer)
- **Mastery session spacing:** `ARCHITECTURE_RESEARCH.md` says "≥2 sessions **12–24h apart**"; code
  enforces only **≥12h** (no upper cap). The code is the more defensible reading (returning after 3 days
  should still count) — **fix the doc** to "≥12h," don't cap the code.
- **Placement window:** ARCH says **8–15**, LEVEL_SYSTEM says **~8–12**, the legacy note says **16**.
  Code uses 8–15 (the §B headline). Pick one canonical value + align both docs.
- **Bands / demotion:** ARCH says numeric 50/80/95; LEVEL_SYSTEM says "Familiar 70–85% … sub-70% demotes
  2 levels." Code follows ARCH (correct for the engine; the 2-level demotion is the review overlay,
  deliberately deferred). Note the resolution in the docs so they stop conflicting.
- **Elo K / pass-threshold:** `K=1/(1+0.05n)`, `PLACEMENT_PASS=0.85`, tier-stepping aren't in the docs
  (they came from the build prompts). Add them to ARCHITECTURE_RESEARCH §B so the docs are the spec of record.

## C. Verified genuinely solid (independently)
- All four re-run suites pass when *I* run them (not just the agents' reports).
- **placement**: math hand-checked, convergence test has teeth (flipping a sign makes it diverge + fail).
- **curriculum READY 15**: meter/figures/buildStatus/order match HALL_CATALOG + CURRICULUM_PLAN; figure IDs
  cross-checked against the REAL `solo-mode.js` banks — the "couldn't find HALL_CATALOG" worry did NOT
  corrupt the buildable data. Compound enters early at ch5 exactly as the plan prescribes.
- **mastery arithmetic**: deltas, clamping, decay formula, the 3-part Mastered gate, demotion, advance
  gate all correct + boundary-inclusive; tests assert specific values (not "didn't throw").

## D. NOT yet verified (rate-limited; resets 4:20am)
- **grading** doc-conformance vs `LEVEL_SYSTEM_RESEARCH.md` + **review** scheduler conformance vs
  `ARCHITECTURE_RESEARCH.md` — that combined review hit the session limit. (I independently re-ran both
  suites — pass — and read grading's tests myself: rigorous. Still owe the formal doc-conformance pass.)
