/**
 * @file core/curriculum.js
 * @module core/curriculum
 *
 * The CURRICULUM LADDER + core data model, encoded as DATA.
 *
 * This is a PURE, framework-agnostic ES module: no I/O, no DOM, no engine
 * dependency. It defines the SHARED skill / level vocabulary that the other
 * core modules key on. The traversal logic lives in {@link module:core/ladder};
 * this file only holds the encoded ladder + the lookup tables over it.
 *
 * Grounding
 * ---------
 * The ladder is grounded in Hall & Urban, *Studying Rhythm* (4th ed.) as
 * mapped in `HALL_CURRICULUM.md` (the chapter→idea progression) and
 * `CURRICULUM_PLAN.md` (the chapter→level wiring spec, §A mapping table and
 * §B unified ladder). We never reproduce the book's exercises — we reuse only
 * its difficulty *progression*: each chapter adds exactly one new idea on top
 * of the last, which is a ready-made difficulty ladder.
 *
 * v1 scope: the SINGLE-VOICE simple + compound ladder, using only the
 * chapters whose figure art exists today ("READY" in CURRICULUM_PLAN.md §A):
 *   Hall chapters 1–12 (minus Ch13 polyrhythm) and 14, 15, 17.
 * Deferred (not encoded here): Ch13 (polyrhythm, NEEDS-ENGINE), Ch16
 * (eighth-note beat, NEEDS-ASSETS), and Ch18–31 (small subdivisions, changing
 * /odd meters, more tuplets, tempo modulation) — see CURRICULUM_PLAN.md §A.
 *
 * Figure IDs are transcribed 1:1 from the canonical figure banks in
 * `solo-mode.js` (`L_STEPS`, `COMPOUND_FIGS`/`CMP_STEPS`, `HALF_*`,
 * `DOTTEDHALF_*`, `DOTTED16_*`). Those IDs are the contract the renderer /
 * grader / asset banks already use; the curriculum keys on the same IDs so
 * the modules share one vocabulary.
 *
 * @see module:core/ladder for the pure traversal helpers over this data.
 */

/* ===========================================================================
 * TYPEDEFS — the shared data model
 * =========================================================================*/

/**
 * The kind/category of a {@link Skill}. Mirrors the beat-unit FAMILIES in
 * `solo-mode.js` plus a couple of cross-cutting categories (ties, tuplets)
 * that are not a beat-unit of their own. Used for grouping / filtering /
 * pacing — masterable figures of the same `kind` share a beat unit and an
 * asset bank.
 *
 * @typedef {(
 *   | 'simple-quarter'    // simple meter, quarter-note beat   (engine `medium` bank)
 *   | 'simple-half'       // simple meter, half-note beat      (`hb-*`, halfbeat bank)
 *   | 'simple-eighth'     // simple meter, eighth-note beat    (`eb-*`, NEEDS-ASSETS — Ch16)
 *   | 'compound-dquarter' // compound meter, dotted-quarter    (`cd-*`, compound bank)
 *   | 'compound-dhalf'    // compound meter, dotted-half       (`dh-*`, dottedhalf bank)
 *   | 'compound-deighth'  // compound meter, dotted-eighth     (`de-*`, dotted16 bank)
 *   | 'tuplet'            // borrowed division in a simple beat (`triplet-*`, `tpl-*`)
 *   | 'polyrhythm'        // a two-voice cross-rhythm (Ch13,23-25,30 — NEEDS-ENGINE)
 *   | 'meter-change'      // a changing/converting-meter capability (Ch19-22,29 — NEEDS-ENGINE)
 *   | 'unequal-meter'     // an unequal-beat meter (Ch27-28 — NEEDS-ENGINE)
 *   | 'concept'           // any other non-figure concept (e.g. ties, tempo modulation)
 * )} SkillKind
 */

/**
 * A Knowledge-Component — a single *masterable* unit. In v1 a skill is almost
 * always one rhythmic FIGURE (one beat cell, identified by its figure-bank ID),
 * but the shape also admits non-figure concepts (e.g. ties) so a level can
 * introduce an idea that is graded but is not its own bank glyph.
 *
 * The `id` of a figure-skill IS the figure-bank ID used by the renderer /
 * grader (e.g. `'two-eighths'`, `'cd-quarter-eighth'`), so other modules can
 * map a mastered skill straight onto a generatable figure.
 *
 * @typedef {Object} Skill
 * @property {string}    id        Stable unique id. For figures this equals the
 *                                 figure-bank ID. For concepts, a `concept:`-
 *                                 prefixed id (e.g. `'concept:tie'`).
 * @property {string}    name      Human-readable display name.
 * @property {SkillKind} kind      Category / beat-unit family (see {@link SkillKind}).
 * @property {boolean}   [isFigure=true]  True if `id` is a generatable figure-bank
 *                                 ID; false for `concept` skills.
 * @property {number}    introLevel Hall chapter number of the level that first
 *                                 introduces this skill (back-reference; the
 *                                 authoritative direction is Level.newSkills).
 */

/**
 * A beat-unit descriptor. Beat unit is the note value that gets ONE beat in a
 * level's meter (per the app's meter memory / CURRICULUM_PLAN.md conventions).
 *
 * @typedef {(
 *   | 'quarter'         // simple /4
 *   | 'half'            // simple /2
 *   | 'eighth'          // simple /8  (Ch16, NEEDS-ASSETS)
 *   | 'dotted-quarter'  // compound /8
 *   | 'dotted-half'     // compound /4
 *   | 'dotted-eighth'   // compound /16
 *   | 'mixed'           // changing or unequal meters where the beat varies (Ch19-22,27-29)
 *   | 'none'            // no single beat unit applies (pure polyrhythm / tempo-mod levels)
 * )} BeatUnit
 */

/**
 * Buildability of a level — whether it can be shipped/played today, or what
 * class of work gates it. Sourced from the per-chapter status in
 * CURRICULUM_PLAN.md §A (READY / NEEDS-ASSETS / NEEDS-ENGINE).
 *
 * @typedef {(
 *   | 'ready'        // figure art exists + engine supports it → playable now
 *   | 'needs-assets' // engine could do it, but the figure-bank art must be generated
 *   | 'needs-engine' // requires a new engine capability (see Level.engineNeeds)
 * )} BuildStatus
 */

/**
 * A meter descriptor for a level. A level can list one OR several time
 * signatures (e.g. Ch11 covers 9/8 and 12/8), all sharing one beat unit.
 *
 * @typedef {Object} Meter
 * @property {'simple'|'compound'} kind          simple (top 2/3/4) vs compound (top 6/9/12).
 * @property {string[]}            timeSignatures One or more time sigs, e.g. `['6/8']`,
 *                                               `['2/4','3/4','4/4']`, `['9/8','12/8']`.
 * @property {number[]}            beatsPerMeasure Beat count per time signature, index-
 *                                               aligned with `timeSignatures`. Simple =
 *                                               top number; compound = top / 3.
 */

/**
 * The per-gameplay-FORM data attached to a level. Every level carries BOTH a
 * `dictation` form and a `tapping` form (see {@link Level.forms}); the two
 * ladders are matched 1:1 — same levels, same order — and differ ONLY in which
 * form's data the front-end surfaces.
 *
 * @typedef {Object} LevelForm
 * @property {number} voices Number of simultaneous rhythmic voices in THIS form.
 *                           For the single-voice chapters both forms are `1`.
 *                           For the inherently two-voice chapters (13,23,24,25,
 *                           30) the DICTATION form is `1` (the single-line
 *                           composite / resultant rhythm — notated single-voice,
 *                           no two-voice engine) and the TAPPING form is `2`
 *                           (perform the two voices, one per hand).
 */

/**
 * The TAPPING performance-difficulty metadata for a level, grounded in
 * `TAPPING_RESEARCH.md` (the per-level performance curve, distinct from the
 * dictation reading difficulty). Drives the tapping ladder's scaffolding/pacing
 * — NOT a separate ladder structure.
 *
 * @typedef {Object} TappingDifficulty
 * @property {number}  rank     Performance-difficulty rank 1–7 (the ★ count in
 *                              TAPPING_RESEARCH.md's 16-level table, mapped onto
 *                              the 31 chapters).
 * @property {string}  scaffold Short scaffolding/curve note (what to coach), esp.
 *                              at the inflection points.
 * @property {boolean} [inflection] True at the three inflection points called
 *                              out in TAPPING_RESEARCH.md: syncopation (Ch9, the
 *                              first hand independence), the 2:3 polyrhythm
 *                              gateway (Ch13), and the polymeter ceiling (Ch30).
 */

/**
 * A level / ladder node — one Hall chapter (or tight chapter cluster). This is
 * the unit BOTH guided ladders (dictation + tapping) walk in lock-step, and the
 * unit a profile records mastery of.
 *
 * The dictation and tapping ladders are MATCHED ONE-TO-ONE: there is exactly one
 * level per Hall chapter (all 31), and both ladders walk the SAME level set in
 * the SAME order. A level therefore carries BOTH a `dictation` form and a
 * `tapping` form (see {@link Level.forms} / {@link LevelForm}); the ladders
 * differ only by which form's data is surfaced.
 *
 * Vocabulary is CUMULATIVE within a beat-unit family but NOT across families
 * (you don't carry quarter-beat figures into a half-beat meter — the beat
 * changed). `newSkills` = what THIS level adds; `allSkills` = the full
 * vocabulary in play at this level (this level's news + every prereq's
 * vocabulary IN THE SAME beat-unit family). Both are skill ids.
 *
 * @typedef {Object} Level
 * @property {string}   id          Stable level id, e.g. `'ch1'`, `'ch5'`.
 * @property {number}   hallChapter Hall "Studying Rhythm" chapter number.
 * @property {string}   title       Display title (from HALL_CURRICULUM.md).
 * @property {Meter}    meter        Meter descriptor (see {@link Meter}).
 * @property {BeatUnit} beatUnit    The note value that gets one beat.
 * @property {string[]} newSkills   Skill ids FIRST introduced at this level.
 * @property {string[]} allSkills   Full cumulative vocabulary (skill ids) at
 *                                  this level = newSkills ∪ family-prereq skills.
 * @property {string[]} figures     The generatable figure-bank IDs available at
 *                                  this level (= allSkills minus `concept:` ids).
 *                                  This is what a generator would draw from.
 * @property {string[]} prereqs     Level ids that must be mastered first
 *                                  (the prerequisite DAG edges, child→parents).
 * @property {(string|null)} assetPrefix Figure-bank asset prefix from
 *                                  CURRICULUM_PLAN.md §A where one is specified
 *                                  (`medium`, `cd`, `hb`, `dh`, `de`, `tpl`,
 *                                  `eb`), else null.
 * @property {BuildStatus} buildStatus Whether this level is playable now or
 *                                  what work gates it (see {@link BuildStatus}).
 * @property {(string|null)} engineNeeds For non-`ready` levels, a short
 *                                  description of the capability (engine or art)
 *                                  required to unlock it; `null` for `ready`.
 * @property {{dictation: LevelForm, tapping: LevelForm}} forms The per-gameplay-
 *                                  form data. EVERY level has both a `dictation`
 *                                  and a `tapping` form so the two ladders stay
 *                                  matched 1:1 (see {@link LevelForm}). The
 *                                  inherently two-voice chapters (13,23,24,25,30)
 *                                  set `dictation.voices:1` (the single-line
 *                                  composite) and `tapping.voices:2`; every other
 *                                  chapter sets both to `1`.
 * @property {TappingDifficulty} tappingDifficulty Per-level performance-
 *                                  difficulty metadata from TAPPING_RESEARCH.md
 *                                  (see {@link TappingDifficulty}).
 * @property {boolean}  [approxFigures] True when `newSkills`/`figures` are
 *                                  approximate placeholders because the spec is
 *                                  thin for this (not-yet-buildable) chapter.
 */

/**
 * A learner profile — the minimal shape the traversal helpers read. Other
 * modules may extend it; the ladder helpers only ever read `masteredLevels`.
 *
 * @typedef {Object} Profile
 * @property {string[]} masteredLevels Level ids the learner has mastered.
 */

/* ===========================================================================
 * SKILLS — the masterable figure / concept units
 *
 * Figure ids are transcribed from solo-mode.js. Grouped by Hall chapter that
 * introduces them. `introLevel` is the Hall chapter number.
 * =========================================================================*/

/** @type {Skill[]} */
export const SKILLS = [
  /* --- Simple, quarter beat (engine `medium` bank). Hall Ch1–4,6,7,9,12 --- */
  // Ch1–3: the basics. quarter + two-eighths are the L1 step; rest+half are L2;
  // quarter-rest first appears as a notated rest in Ch3 (Quadruple).
  { id: 'quarter',                        name: 'Quarter note',                 kind: 'simple-quarter', introLevel: 1 },
  { id: 'two-eighths',                    name: 'Two eighths',                  kind: 'simple-quarter', introLevel: 1 },
  { id: 'half',                           name: 'Half note',                    kind: 'simple-quarter', introLevel: 1 },
  { id: 'quarter-rest',                   name: 'Quarter rest',                 kind: 'simple-quarter', introLevel: 3 },
  // Ch4: dotted quarter + tie concept.
  { id: 'dotted-quarter-eighth',          name: 'Dotted quarter + eighth',      kind: 'simple-quarter', introLevel: 4 },
  { id: 'concept:tie',                    name: 'Ties',                         kind: 'concept', isFigure: false, introLevel: 4 },
  // Ch6: sixteenths in simple meter.
  { id: 'four-sixteenths',                name: 'Four sixteenths',              kind: 'simple-quarter', introLevel: 6 },
  { id: 'eighth-two-sixteenths',          name: 'Eighth + two sixteenths',      kind: 'simple-quarter', introLevel: 6 },
  { id: 'two-sixteenths-eighth',          name: 'Two sixteenths + eighth',      kind: 'simple-quarter', introLevel: 6 },
  { id: 'sixteenth-eighth-sixteenth',     name: 'Sixteenth, eighth, sixteenth', kind: 'simple-quarter', introLevel: 6 },
  // Ch7: dotted eighths in simple meter.
  { id: 'dotted-eighth-sixteenth',        name: 'Dotted eighth + sixteenth',    kind: 'simple-quarter', introLevel: 7 },
  { id: 'sixteenth-dotted-eighth',        name: 'Sixteenth + dotted eighth',    kind: 'simple-quarter', introLevel: 7 },
  // HALL_CATALOG.md §refinements: "Add double-dotted figures (Ch 7) — absent from the
  // plan's bank." Ch7 is marked "READY (− double-dots)" there. The double-dotted figures
  // are NOT yet in solo-mode.js's `medium` bank (needs-assets art), so we register them as
  // a NON-figure CONCEPT (isFigure:false → excluded from `figures` and from the
  // solo-mode figure-id cross-check) rather than inventing a bank id. This keeps the
  // HALL_CATALOG refinement visible in the catalog instead of being silently dropped;
  // when the art lands, replace this concept with real `*-double-dotted-*` figure ids.
  { id: 'concept:double-dot',             name: 'Double-dotted figures',        kind: 'concept', isFigure: false, introLevel: 7 },
  // Ch9: rests & syncopation in simple meter.
  { id: 'eighth-rest-eighth',             name: 'Eighth rest + eighth',         kind: 'simple-quarter', introLevel: 9 },
  { id: 'eighth-eighth-rest',             name: 'Eighth + eighth rest',         kind: 'simple-quarter', introLevel: 9 },
  { id: 'eighth-quarter-eighth',          name: 'Eighth, quarter, eighth (syncopation)', kind: 'simple-quarter', introLevel: 9 },
  { id: 'eighth-rest-two-sixteenths',     name: 'Eighth rest + two sixteenths', kind: 'simple-quarter', introLevel: 9 },
  { id: 'sixteenth-rest-three-sixteenths',name: 'Sixteenth rest + three sixteenths', kind: 'simple-quarter', introLevel: 9 },
  // Ch12: borrowed triplets in a simple quarter beat.
  { id: 'triplet-eighths',                name: 'Eighth-note triplet',          kind: 'tuplet', introLevel: 12 },
  { id: 'triplet-quarters',               name: 'Quarter-note triplet',         kind: 'tuplet', introLevel: 12 },

  /* --- Compound, dotted-quarter beat (`cd-*`). Hall Ch5,8,10,11 --- */
  // Ch5: compound duple basics.
  { id: 'cd-dotted-quarter',              name: 'Dotted quarter',               kind: 'compound-dquarter', introLevel: 5 },
  { id: 'cd-three-eighths',               name: 'Three eighths',                kind: 'compound-dquarter', introLevel: 5 },
  { id: 'cd-quarter-eighth',              name: 'Quarter + eighth',             kind: 'compound-dquarter', introLevel: 5 },
  { id: 'cd-eighth-quarter',              name: 'Eighth + quarter',             kind: 'compound-dquarter', introLevel: 5 },
  { id: 'cd-duplet',                      name: 'Duplet (2:3)',                 kind: 'compound-dquarter', introLevel: 5 },
  // Ch8: sixteenths inside the compound beat.
  { id: 'cd-six-sixteenths',              name: 'Six sixteenths',               kind: 'compound-dquarter', introLevel: 8 },
  { id: 'cd-two16-8-8',                   name: '2 sixteenths + 2 eighths',     kind: 'compound-dquarter', introLevel: 8 },
  { id: 'cd-8-two16-8',                   name: 'Eighth, 2 sixteenths, eighth', kind: 'compound-dquarter', introLevel: 8 },
  { id: 'cd-8-8-two16',                   name: '2 eighths + 2 sixteenths',     kind: 'compound-dquarter', introLevel: 8 },
  { id: 'cd-four16-8',                    name: '4 sixteenths + eighth',        kind: 'compound-dquarter', introLevel: 8 },
  { id: 'cd-8-four16',                    name: 'Eighth + 4 sixteenths',        kind: 'compound-dquarter', introLevel: 8 },
  { id: 'cd-quarter-two16',              name: 'Quarter + 2 sixteenths',       kind: 'compound-dquarter', introLevel: 8 },
  { id: 'cd-two16-quarter',              name: '2 sixteenths + quarter',       kind: 'compound-dquarter', introLevel: 8 },
  // Ch10: rests & syncopation in 6/8.
  { id: 'cd-dotted-quarter-rest',         name: 'Dotted-quarter rest',          kind: 'compound-dquarter', introLevel: 10 },
  { id: 'cd-8rest-8-8',                   name: 'Eighth rest + 2 eighths',      kind: 'compound-dquarter', introLevel: 10 },
  { id: 'cd-8-8rest-8',                   name: 'Eighth, eighth rest, eighth',  kind: 'compound-dquarter', introLevel: 10 },
  { id: 'cd-8-8-8rest',                   name: '2 eighths + eighth rest',      kind: 'compound-dquarter', introLevel: 10 },
  { id: 'cd-quarter-8rest',              name: 'Quarter + eighth rest',        kind: 'compound-dquarter', introLevel: 10 },
  { id: 'cd-8rest-quarter',              name: 'Eighth rest + quarter',        kind: 'compound-dquarter', introLevel: 10 },
  // Ch11 (9/8 & 12/8): no NEW figures — same cd-* vocabulary, more beats/measure.

  /* --- Simple, half-note beat (`hb-*`). Hall Ch14 --- */
  { id: 'hb-half',                        name: 'Half (beat)',                  kind: 'simple-half', introLevel: 14 },
  { id: 'hb-two-quarters',                name: 'Two quarters',                 kind: 'simple-half', introLevel: 14 },
  { id: 'hb-quarter-two8',                name: 'Quarter + 2 eighths',          kind: 'simple-half', introLevel: 14 },
  { id: 'hb-two8-quarter',                name: '2 eighths + quarter',          kind: 'simple-half', introLevel: 14 },
  { id: 'hb-four-eighths',                name: 'Four eighths',                 kind: 'simple-half', introLevel: 14 },
  { id: 'hb-half-rest',                   name: 'Half rest',                    kind: 'simple-half', introLevel: 14 },
  { id: 'hb-quarter-qrest',               name: 'Quarter + quarter rest',       kind: 'simple-half', introLevel: 14 },
  { id: 'hb-qrest-quarter',               name: 'Quarter rest + quarter',       kind: 'simple-half', introLevel: 14 },
  { id: 'hb-8rest-8-quarter',             name: 'Eighth rest, eighth, quarter', kind: 'simple-half', introLevel: 14 },
  { id: 'hb-quarter-8rest-8',             name: 'Quarter, eighth rest, eighth', kind: 'simple-half', introLevel: 14 },
  { id: 'hb-eight-16ths',                 name: 'Eight sixteenths',             kind: 'simple-half', introLevel: 14 },
  { id: 'hb-two16-q',                     name: '2 sixteenths + quarter',       kind: 'simple-half', introLevel: 14 },
  { id: 'hb-q-two16',                     name: 'Quarter + 2 sixteenths',       kind: 'simple-half', introLevel: 14 },
  { id: 'hb-two8-four16',                 name: '2 eighths + 4 sixteenths',     kind: 'simple-half', introLevel: 14 },
  { id: 'hb-four16-two8',                 name: '4 sixteenths + 2 eighths',     kind: 'simple-half', introLevel: 14 },
  { id: 'hb-8-two16-8',                   name: 'Eighth, 2 sixteenths, eighth', kind: 'simple-half', introLevel: 14 },
  { id: 'hb-two16-8-8',                   name: '2 sixteenths + 2 eighths',     kind: 'simple-half', introLevel: 14 },
  { id: 'hb-8-8-two16',                   name: '2 eighths + 2 sixteenths',     kind: 'simple-half', introLevel: 14 },

  /* --- Compound, dotted-half beat (`dh-*`). Hall Ch15 --- */
  { id: 'dh-dotted-half',                 name: 'Dotted half',                  kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-three-quarters',              name: 'Three quarters',               kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-half-quarter',                name: 'Half + quarter',               kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-quarter-half',                name: 'Quarter + half',               kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-duplet',                      name: 'Duplet (2:3)',                 kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-six-eighths',                 name: 'Six eighths',                  kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-dotted-half-rest',            name: 'Dotted-half rest',             kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-qrest-q-q',                   name: 'Quarter rest + 2 quarters',    kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-q-qrest-q',                   name: 'Quarter, quarter rest, quarter', kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-q-q-qrest',                   name: '2 quarters + quarter rest',    kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-half-qrest',                  name: 'Half + quarter rest',          kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-qrest-half',                  name: 'Quarter rest + half',          kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-two8-q-q',                    name: '2 eighths + 2 quarters',       kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-q-two8-q',                    name: 'Quarter, 2 eighths, quarter',  kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-q-q-two8',                    name: '2 quarters + 2 eighths',       kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-four8-q',                     name: '4 eighths + quarter',          kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-q-four8',                     name: 'Quarter + 4 eighths',          kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-half-two8',                   name: 'Half + 2 eighths',             kind: 'compound-dhalf', introLevel: 15 },
  { id: 'dh-two8-half',                   name: '2 eighths + half',             kind: 'compound-dhalf', introLevel: 15 },

  /* --- Compound, dotted-eighth beat (`de-*`). Hall Ch17 --- */
  { id: 'de-dotted-eighth',               name: 'Dotted eighth',                kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-three-16ths',                 name: 'Three sixteenths',             kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-eighth-16th',                 name: 'Eighth + sixteenth',           kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-16th-eighth',                 name: 'Sixteenth + eighth',           kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-duplet',                      name: 'Duplet (2:3)',                 kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-dotted-eighth-rest',          name: 'Dotted-eighth rest',           kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-16rest-16-16',                name: 'Sixteenth rest + 2 sixteenths', kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-16-16rest-16',                name: 'Sixteenth, 16th rest, 16th',   kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-16-16-16rest',                name: '2 sixteenths + 16th rest',     kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-eighth-16rest',               name: 'Eighth + sixteenth rest',      kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-16rest-eighth',               name: 'Sixteenth rest + eighth',      kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-six-32nds',                   name: 'Six thirty-seconds',           kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-two32-16-16',                 name: '2 thirty-seconds + 2 sixteenths', kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-16-two32-16',                 name: '16th, 2 thirty-seconds, 16th', kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-16-16-two32',                 name: '2 sixteenths + 2 thirty-seconds', kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-four32-16',                   name: '4 thirty-seconds + sixteenth', kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-16-four32',                   name: 'Sixteenth + 4 thirty-seconds', kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-eighth-two32',                name: 'Eighth + 2 thirty-seconds',    kind: 'compound-deighth', introLevel: 17 },
  { id: 'de-two32-eighth',                name: '2 thirty-seconds + eighth',    kind: 'compound-deighth', introLevel: 17 },

  /* =========================================================================
   * NOT-YET-BUILDABLE chapters (needs-engine / needs-assets). Their "skills"
   * are mostly capability CONCEPTS rather than generatable bank figures, so
   * they carry isFigure:false unless the figure art already exists. Figure
   * lists for these chapters are approximate (see Level.approxFigures).
   * =======================================================================*/

  // Ch13 — Two Against Three (polyrhythm 2:3). NEEDS-ENGINE: two-voice render+score.
  { id: 'concept:poly-2-3',  name: 'Two against three (2:3)',  kind: 'polyrhythm', isFigure: false, introLevel: 13 },

  // Ch16 — Eighth-Note Beat (simple, 2/8·3/8). NEEDS-ASSETS: `eb-*` art not yet
  // generated. Placeholder figure ids mirror the quarter-beat subdivisions, one
  // octave faster (eighth = 1 beat). approxFigures.
  { id: 'eb-eighth',         name: 'Eighth (beat)',            kind: 'simple-eighth', introLevel: 16 },
  { id: 'eb-two-sixteenths', name: 'Two sixteenths',           kind: 'simple-eighth', introLevel: 16 },
  { id: 'eb-four-32nds',     name: 'Four thirty-seconds',      kind: 'simple-eighth', introLevel: 16 },
  { id: 'eb-eighth-rest',    name: 'Eighth rest',              kind: 'simple-eighth', introLevel: 16 },

  // Ch18 — Small Subdivisions (32nds/64ths in existing meters). NEEDS-ASSETS.
  { id: 'concept:small-subdivisions', name: 'Small subdivisions (32nd/64th)', kind: 'concept', isFigure: false, introLevel: 18 },

  // Ch19 — Changing Simple Meter. NEEDS-ENGINE: per-measure time-signature change.
  { id: 'concept:changing-simple',   name: 'Changing simple meter',   kind: 'meter-change', isFigure: false, introLevel: 19 },
  // Ch20 — Changing Compound Meter. NEEDS-ENGINE.
  { id: 'concept:changing-compound', name: 'Changing compound meter', kind: 'meter-change', isFigure: false, introLevel: 20 },
  // Ch21 — Changing Simple↔Compound, division constant. NEEDS-ENGINE.
  { id: 'concept:convert-division-const', name: 'Simple↔compound (division constant)', kind: 'meter-change', isFigure: false, introLevel: 21 },
  // Ch22 — Changing Simple↔Compound, beat constant. NEEDS-ENGINE.
  { id: 'concept:convert-beat-const', name: 'Simple↔compound (beat constant)', kind: 'meter-change', isFigure: false, introLevel: 22 },

  // Ch23 — Three in Two / Two in Three (3:2). NEEDS-ENGINE.
  { id: 'concept:poly-3-2', name: 'Three in two / two in three (3:2)', kind: 'polyrhythm', isFigure: false, introLevel: 23 },
  // Ch24 — Four Against Three (4:3). NEEDS-ENGINE.
  { id: 'concept:poly-4-3', name: 'Four against three (4:3)', kind: 'polyrhythm', isFigure: false, introLevel: 24 },
  // Ch25 — Four in Three / Three in Four (4:3, 3:4). NEEDS-ENGINE.
  { id: 'concept:poly-3-4', name: 'Four in three / three in four (3:4)', kind: 'polyrhythm', isFigure: false, introLevel: 25 },

  // Ch26 — Quintuplets & Septuplets. NEEDS-ASSETS: `tpl-*` art being generated.
  // These ARE real figure ids (present in solo-mode.js TUPLET_FIGS) but the art
  // is not finished, so the chapter is needs-assets even though the ids exist.
  { id: 'tpl-quintuplet', name: 'Quintuplet (5:4)',  kind: 'tuplet', introLevel: 26 },
  { id: 'tpl-sextuplet',  name: 'Sextuplet (6:4)',   kind: 'tuplet', introLevel: 26 },
  { id: 'tpl-septuplet',  name: 'Septuplet (7:4)',   kind: 'tuplet', introLevel: 26 },

  // Ch27 — Five-Eight & Five-Four (unequal beats, 2+3 / 3+2). NEEDS-ENGINE.
  { id: 'concept:unequal-5', name: 'Five-eight / five-four (unequal beats)', kind: 'unequal-meter', isFigure: false, introLevel: 27 },
  // Ch28 — More Unequal-Beat Meters (7/8, 8/8, 10/8…). NEEDS-ENGINE.
  { id: 'concept:unequal-7', name: 'Seven-eight & other unequal meters', kind: 'unequal-meter', isFigure: false, introLevel: 28 },
  // Ch29 — Changing Unequal Meters. NEEDS-ENGINE.
  { id: 'concept:changing-unequal', name: 'Changing unequal meters', kind: 'meter-change', isFigure: false, introLevel: 29 },

  // Ch30 — More Cross Rhythms (advanced multi-voice). NEEDS-ENGINE.
  { id: 'concept:cross-rhythms', name: 'Advanced cross rhythms', kind: 'polyrhythm', isFigure: false, introLevel: 30 },
  // Ch31 — Tempo Modulation (metric/tempo modulation). NEEDS-ENGINE.
  { id: 'concept:tempo-modulation', name: 'Tempo / metric modulation', kind: 'concept', isFigure: false, introLevel: 31 }
];

/** @type {Map<string, Skill>} id → Skill, for O(1) lookup. */
export const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

/* ===========================================================================
 * LEVELS — the ladder nodes (one per READY Hall chapter)
 *
 * `newSkills` is authored; `allSkills` and `figures` are DERIVED below from
 * the prerequisite DAG (cumulative within a beat-unit family). The prereq
 * edges encode Hall's two interleaved tracks plus the pedagogy that compound
 * meter (Ch5) comes early — right after the simple basics.
 * =========================================================================*/

/**
 * Author-time level definitions. `allSkills`/`figures` are filled in by the
 * derivation pass below, so they are intentionally omitted here.
 * @type {Array<Omit<Level,'allSkills'|'figures'>>}
 */
const LEVEL_DEFS = [
  // --- Simple quarter-beat track (medium bank) ---
  {
    id: 'ch1', hallChapter: 1, title: 'Simple Duple Meter',
    meter: { kind: 'simple', timeSignatures: ['2/4'], beatsPerMeasure: [2] },
    beatUnit: 'quarter', assetPrefix: 'medium',
    newSkills: ['quarter', 'two-eighths', 'half'],
    prereqs: []
  },
  {
    id: 'ch2', hallChapter: 2, title: 'Simple Triple Meter',
    meter: { kind: 'simple', timeSignatures: ['3/4'], beatsPerMeasure: [3] },
    beatUnit: 'quarter', assetPrefix: 'medium',
    newSkills: [], // same figures, 3 beats per measure
    prereqs: ['ch1']
  },
  {
    id: 'ch3', hallChapter: 3, title: 'Simple Quadruple Meter',
    meter: { kind: 'simple', timeSignatures: ['4/4'], beatsPerMeasure: [4] },
    beatUnit: 'quarter', assetPrefix: 'medium',
    newSkills: ['quarter-rest'], // 4 beats/measure; quarter rest now in play
    prereqs: ['ch2']
  },
  {
    id: 'ch4', hallChapter: 4, title: 'Dotted Quarters and Tied Notes',
    meter: { kind: 'simple', timeSignatures: ['2/4', '3/4', '4/4'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'quarter', assetPrefix: 'medium',
    newSkills: ['dotted-quarter-eighth', 'concept:tie'],
    prereqs: ['ch3']
  },
  {
    id: 'ch6', hallChapter: 6, title: 'Sixteenth-Notes in Simple Meter',
    meter: { kind: 'simple', timeSignatures: ['2/4', '3/4', '4/4'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'quarter', assetPrefix: 'medium',
    newSkills: ['four-sixteenths', 'eighth-two-sixteenths', 'two-sixteenths-eighth', 'sixteenth-eighth-sixteenth'],
    prereqs: ['ch4']
  },
  {
    id: 'ch7', hallChapter: 7, title: 'Dotted Eighths in Simple Meter',
    meter: { kind: 'simple', timeSignatures: ['2/4', '3/4', '4/4'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'quarter', assetPrefix: 'medium',
    // HALL_CATALOG.md adds double-dots to Ch7 (`concept:double-dot`). It is a NON-figure
    // concept (no bank art yet), so ch7 stays buildStatus 'ready': its two generatable
    // figures (dotted-eighth-sixteenth, sixteenth-dotted-eighth) already exist in the bank.
    // The double-dot refinement is tracked as a concept rather than silently dropped.
    newSkills: ['dotted-eighth-sixteenth', 'sixteenth-dotted-eighth', 'concept:double-dot'],
    prereqs: ['ch6']
  },
  {
    id: 'ch9', hallChapter: 9, title: 'More Rests and Syncopation in Simple Meter',
    meter: { kind: 'simple', timeSignatures: ['2/4', '3/4', '4/4'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'quarter', assetPrefix: 'medium',
    newSkills: ['eighth-rest-eighth', 'eighth-eighth-rest', 'eighth-quarter-eighth', 'eighth-rest-two-sixteenths', 'sixteenth-rest-three-sixteenths'],
    prereqs: ['ch7']
  },
  {
    id: 'ch12', hallChapter: 12, title: 'Triplets',
    meter: { kind: 'simple', timeSignatures: ['2/4', '3/4', '4/4'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'quarter', assetPrefix: 'tpl',
    newSkills: ['triplet-eighths', 'triplet-quarters'],
    prereqs: ['ch9']
  },

  // --- Compound dotted-quarter track (cd bank). Comes early (Ch5 after basics). ---
  {
    id: 'ch5', hallChapter: 5, title: 'Compound Duple Meter',
    meter: { kind: 'compound', timeSignatures: ['6/8'], beatsPerMeasure: [2] },
    beatUnit: 'dotted-quarter', assetPrefix: 'cd',
    newSkills: ['cd-dotted-quarter', 'cd-three-eighths', 'cd-quarter-eighth', 'cd-eighth-quarter', 'cd-duplet'],
    // Pedagogy: compound enters once the student can read simple eighths/halves
    // (Ch3) and is comfortable with notated rests; it does NOT depend on the
    // simple sixteenth/triplet chapters. Track-internal prereq is ch5's own.
    prereqs: ['ch3']
  },
  {
    id: 'ch8', hallChapter: 8, title: 'Sixteenth-Notes in Six-Eight Meter',
    meter: { kind: 'compound', timeSignatures: ['6/8'], beatsPerMeasure: [2] },
    beatUnit: 'dotted-quarter', assetPrefix: 'cd',
    newSkills: ['cd-six-sixteenths', 'cd-two16-8-8', 'cd-8-two16-8', 'cd-8-8-two16', 'cd-four16-8', 'cd-8-four16', 'cd-quarter-two16', 'cd-two16-quarter'],
    // Sixteenths in 6/8 build on compound basics (Ch5) AND on having met
    // sixteenths in simple meter first (Ch6) — Hall's ordering.
    prereqs: ['ch5', 'ch6']
  },
  {
    id: 'ch10', hallChapter: 10, title: 'More Rests and Syncopation in Six-Eight Meter',
    meter: { kind: 'compound', timeSignatures: ['6/8'], beatsPerMeasure: [2] },
    beatUnit: 'dotted-quarter', assetPrefix: 'cd',
    newSkills: ['cd-dotted-quarter-rest', 'cd-8rest-8-8', 'cd-8-8rest-8', 'cd-8-8-8rest', 'cd-quarter-8rest', 'cd-8rest-quarter'],
    // Rests/syncopation in 6/8 build on 6/8 sixteenths (Ch8) and on rests in
    // simple meter (Ch9).
    prereqs: ['ch8', 'ch9']
  },
  {
    id: 'ch11', hallChapter: 11, title: 'Nine-Eight and Twelve-Eight Meter',
    meter: { kind: 'compound', timeSignatures: ['9/8', '12/8'], beatsPerMeasure: [3, 4] },
    beatUnit: 'dotted-quarter', assetPrefix: 'cd',
    newSkills: [], // no new figures — full cd-* vocabulary, 3 & 4 beats/measure
    prereqs: ['ch10']
  },

  // --- Simple half-note-beat track (hb bank). Hall Ch14. ---
  {
    id: 'ch14', hallChapter: 14, title: 'Half-Note Beat (Simple Meter)',
    meter: { kind: 'simple', timeSignatures: ['2/2', '3/2'], beatsPerMeasure: [2, 3] },
    beatUnit: 'half', assetPrefix: 'hb',
    newSkills: ['hb-half', 'hb-two-quarters', 'hb-quarter-two8', 'hb-two8-quarter', 'hb-four-eighths',
      'hb-half-rest', 'hb-quarter-qrest', 'hb-qrest-quarter', 'hb-8rest-8-quarter', 'hb-quarter-8rest-8',
      'hb-eight-16ths', 'hb-two16-q', 'hb-q-two16', 'hb-two8-four16', 'hb-four16-two8', 'hb-8-two16-8', 'hb-two16-8-8', 'hb-8-8-two16'],
    // New beat unit. Depends on the full simple quarter-beat track (Ch12) so the
    // student already reads quarters/eighths/sixteenths/rests before re-metering
    // them onto a half-note beat.
    prereqs: ['ch12']
  },

  // --- Compound dotted-half-beat track (dh bank). Hall Ch15. ---
  {
    id: 'ch15', hallChapter: 15, title: 'Dotted-Half-Note Beat (Compound Meter)',
    meter: { kind: 'compound', timeSignatures: ['6/4', '9/4', '12/4'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'dotted-half', assetPrefix: 'dh',
    newSkills: ['dh-dotted-half', 'dh-three-quarters', 'dh-half-quarter', 'dh-quarter-half', 'dh-duplet', 'dh-six-eighths',
      'dh-dotted-half-rest', 'dh-qrest-q-q', 'dh-q-qrest-q', 'dh-q-q-qrest', 'dh-half-qrest', 'dh-qrest-half',
      'dh-two8-q-q', 'dh-q-two8-q', 'dh-q-q-two8', 'dh-four8-q', 'dh-q-four8', 'dh-half-two8', 'dh-two8-half'],
    // New (slow) compound beat unit. Depends on the full dotted-quarter compound
    // track (Ch11) and on the half-note beat (Ch14) which establishes the
    // re-metering-onto-a-slower-beat idea.
    prereqs: ['ch11', 'ch14']
  },

  // --- Compound dotted-eighth-beat track (de bank). Hall Ch17. ---
  {
    id: 'ch17', hallChapter: 17, title: 'Dotted-Eighth-Note Beat (Compound Meter)',
    meter: { kind: 'compound', timeSignatures: ['6/16', '9/16', '12/16'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'dotted-eighth', assetPrefix: 'de',
    newSkills: ['de-dotted-eighth', 'de-three-16ths', 'de-eighth-16th', 'de-16th-eighth', 'de-duplet',
      'de-dotted-eighth-rest', 'de-16rest-16-16', 'de-16-16rest-16', 'de-16-16-16rest', 'de-eighth-16rest', 'de-16rest-eighth',
      'de-six-32nds', 'de-two32-16-16', 'de-16-two32-16', 'de-16-16-two32', 'de-four32-16', 'de-16-four32', 'de-eighth-two32', 'de-two32-eighth'],
    // New (fast) compound beat unit. Depends on the dotted-half compound beat
    // (Ch15), the other "other beat unit" chapter that precedes it in Hall.
    prereqs: ['ch15']
  },

  /* =========================================================================
   * ROADMAP levels — the rest of Hall, NOT yet buildable. Encoded so the
   * ladder is the COMPLETE 31-chapter journey and the level-select can show
   * them locked / coming-soon. Status, meter & engineNeeds follow
   * CURRICULUM_PLAN.md §A (status table + footnotes A.1–A.8). Figure lists are
   * approximate placeholders where the spec is thin → approxFigures:true.
   *
   * Form split (matched 1:1 ladders): EVERY level carries BOTH a `dictation`
   * and a `tapping` form (see Level.forms). The inherently two-voice
   * POLYRHYTHM/cross-rhythm chapters (13, 23, 24, 25, 30) set
   * `forms.dictation.voices:1` (the single-line COMPOSITE / resultant rhythm —
   * notated single-voice, no two-voice engine) and `forms.tapping.voices:2`
   * (perform the two voices, one per hand). Every OTHER chapter sets both forms
   * to voices:1. This keeps the dictation and tapping ladders the SAME count and
   * order — they differ only by which form's data the front-end surfaces.
   *
   * `engineNeeds` here describes the DICTATION buildability (what gates notating
   * the chapter). For the polyrhythm chapters the dictation composite is a
   * single-voice line, but it is still gated by the supporting tuplet/odd art /
   * engine — see each level's engineNeeds. The two-zone tapping engine the
   * tapping FORM needs is recorded separately in tappingDifficulty.scaffold.
   * ========================================================================*/

  // --- Ch13: Two Against Three — dictation = the 2:3 COMPOSITE (single voice);
  //     tapping form = two voices. ---
  {
    id: 'ch13', hallChapter: 13, title: 'Two Against Three',
    meter: { kind: 'simple', timeSignatures: ['2/4', '3/4', '4/4'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'quarter', assetPrefix: null,
    newSkills: ['concept:poly-2-3'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'notating the 2:3 composite (resultant rhythm) single-voice; the tapping form additionally needs the two-zone two-voice engine',
    forms: { dictation: { voices: 1 }, tapping: { voices: 2 } },
    // Builds on triplets (Ch12) — you must read a triplet before tapping 2:3.
    prereqs: ['ch12']
  },

  // --- Ch16: Eighth-Note Beat — DICTATION, needs `eb-*` notation art ---
  {
    id: 'ch16', hallChapter: 16, title: 'Eighth-Note Beat',
    meter: { kind: 'simple', timeSignatures: ['2/8', '3/8'], beatsPerMeasure: [2, 3] },
    beatUnit: 'eighth', assetPrefix: 'eb',
    newSkills: ['eb-eighth', 'eb-two-sixteenths', 'eb-four-32nds', 'eb-eighth-rest'],
    approxFigures: true,
    buildStatus: 'needs-assets',
    engineNeeds: 'eighth-as-beat notation art (the `eb-*` figure bank)',
    // A new (fast) SIMPLE beat unit, like the half-beat chapter (Ch14).
    prereqs: ['ch14']
  },

  // --- Ch18: Small Subdivisions — DICTATION, needs 32nd/64th art ---
  {
    id: 'ch18', hallChapter: 18, title: 'Small Subdivisions',
    meter: { kind: 'simple', timeSignatures: ['2/4', '3/4', '4/4'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'quarter', assetPrefix: null,
    newSkills: ['concept:small-subdivisions'], approxFigures: true,
    buildStatus: 'needs-assets',
    engineNeeds: '32nd/64th-note subdivision notation art in existing meters',
    prereqs: ['ch17']
  },

  // --- Ch19: Changing Simple Meter — DICTATION, needs per-bar meter change ---
  {
    id: 'ch19', hallChapter: 19, title: 'Changing Simple Meter',
    meter: { kind: 'simple', timeSignatures: ['2/4', '3/4', '4/4'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'mixed', assetPrefix: 'medium',
    newSkills: ['concept:changing-simple'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'per-bar changing meter (per-measure time-signature support; some pieces partly in the app already)',
    prereqs: ['ch18']
  },

  // --- Ch20: Changing Compound Meter — DICTATION, needs per-bar meter change ---
  {
    id: 'ch20', hallChapter: 20, title: 'Changing Compound Meter',
    meter: { kind: 'compound', timeSignatures: ['6/8', '9/8', '12/8'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'mixed', assetPrefix: 'cd',
    newSkills: ['concept:changing-compound'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'per-bar changing meter (compound)',
    prereqs: ['ch19']
  },

  // --- Ch21: Changing Simple↔Compound, division constant — DICTATION ---
  {
    id: 'ch21', hallChapter: 21, title: 'Changing Simple↔Compound, Division Constant',
    meter: { kind: 'simple', timeSignatures: ['2/4', '6/8'], beatsPerMeasure: [2, 2] },
    beatUnit: 'mixed', assetPrefix: null,
    newSkills: ['concept:convert-division-const'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'per-bar changing meter + simple↔compound conversion keeping the eighth constant',
    prereqs: ['ch20']
  },

  // --- Ch22: Changing Simple↔Compound, beat constant — DICTATION ---
  {
    id: 'ch22', hallChapter: 22, title: 'Changing Simple↔Compound, Beat Constant',
    meter: { kind: 'simple', timeSignatures: ['2/4', '6/8'], beatsPerMeasure: [2, 2] },
    beatUnit: 'mixed', assetPrefix: null,
    newSkills: ['concept:convert-beat-const'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'per-bar changing meter + simple↔compound conversion keeping the beat constant',
    prereqs: ['ch21']
  },

  // --- Ch23: Three in Two / Two in Three — dictation = composite (1 voice);
  //     tapping form = two voices. ---
  {
    id: 'ch23', hallChapter: 23, title: 'Three in Two / Two in Three',
    meter: { kind: 'simple', timeSignatures: ['2/4', '3/4'], beatsPerMeasure: [2, 3] },
    beatUnit: 'quarter', assetPrefix: null,
    newSkills: ['concept:poly-3-2'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'notating the 3:2 composite (resultant rhythm) single-voice; the tapping form additionally needs the two-zone two-voice engine',
    forms: { dictation: { voices: 1 }, tapping: { voices: 2 } },
    prereqs: ['ch13', 'ch22']
  },

  // --- Ch24: Four Against Three — dictation = composite (1 voice);
  //     tapping form = two voices. ---
  {
    id: 'ch24', hallChapter: 24, title: 'Four Against Three',
    meter: { kind: 'simple', timeSignatures: ['2/4', '3/4', '4/4'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'quarter', assetPrefix: null,
    newSkills: ['concept:poly-4-3'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'notating the 4:3 composite (resultant rhythm) single-voice; the tapping form additionally needs the two-zone two-voice engine',
    forms: { dictation: { voices: 1 }, tapping: { voices: 2 } },
    prereqs: ['ch23']
  },

  // --- Ch25: Four in Three / Three in Four — dictation = composite (1 voice);
  //     tapping form = two voices. ---
  {
    id: 'ch25', hallChapter: 25, title: 'Four in Three / Three in Four',
    meter: { kind: 'simple', timeSignatures: ['2/4', '3/4', '4/4'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'quarter', assetPrefix: null,
    newSkills: ['concept:poly-3-4'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'notating the 4:3 / 3:4 composite (resultant rhythm) single-voice; the tapping form additionally needs the two-zone two-voice engine',
    forms: { dictation: { voices: 1 }, tapping: { voices: 2 } },
    prereqs: ['ch24']
  },

  // --- Ch26: Quintuplets & Septuplets — DICTATION, needs `tpl-*` art ---
  {
    id: 'ch26', hallChapter: 26, title: 'Quintuplets and Septuplets',
    meter: { kind: 'simple', timeSignatures: ['2/4', '3/4', '4/4'], beatsPerMeasure: [2, 3, 4] },
    beatUnit: 'quarter', assetPrefix: 'tpl',
    newSkills: ['tpl-quintuplet', 'tpl-sextuplet', 'tpl-septuplet'],
    buildStatus: 'needs-assets',
    engineNeeds: 'quintuplet/sextuplet/septuplet notation art (`tpl-*`, being generated)',
    // Same simple quarter-beat family as triplets (Ch12) → inherit that vocab.
    // ch25 is the chapter-order predecessor; ch12 carries the family vocabulary.
    prereqs: ['ch12', 'ch25']
  },

  // --- Ch27: Five-Eight & Five-Four — DICTATION, needs unequal-meter engine ---
  {
    id: 'ch27', hallChapter: 27, title: 'Five-Eight and Five-Four Meter',
    meter: { kind: 'simple', timeSignatures: ['5/8', '5/4'], beatsPerMeasure: [2, 2] },
    beatUnit: 'mixed', assetPrefix: null,
    newSkills: ['concept:unequal-5'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'unequal/odd-meter rendering + scoring (mixed-length beats, e.g. 2+3 / 3+2)',
    prereqs: ['ch26']
  },

  // --- Ch28: More Unequal-Beat Meters — DICTATION, needs unequal-meter engine ---
  {
    id: 'ch28', hallChapter: 28, title: 'More Meters with Unequal Beats',
    meter: { kind: 'simple', timeSignatures: ['7/8', '8/8', '10/8'], beatsPerMeasure: [3, 3, 4] },
    beatUnit: 'mixed', assetPrefix: null,
    newSkills: ['concept:unequal-7'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'unequal/odd-meter rendering + scoring (7/8 = 2+2+3 etc.)',
    prereqs: ['ch27']
  },

  // --- Ch29: Changing Unequal Meters — DICTATION, needs changing+unequal ---
  {
    id: 'ch29', hallChapter: 29, title: 'Changing Meters with Unequal Beats',
    meter: { kind: 'simple', timeSignatures: ['5/8', '7/8'], beatsPerMeasure: [2, 3] },
    beatUnit: 'mixed', assetPrefix: null,
    newSkills: ['concept:changing-unequal'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'per-bar changing meter + unequal/odd-meter rendering + scoring',
    prereqs: ['ch28', 'ch19']
  },

  // --- Ch30: More Cross Rhythms / Polymeter — dictation = composite (1 voice);
  //     tapping form = two voices (the polymeter ceiling). ---
  {
    id: 'ch30', hallChapter: 30, title: 'More Cross Rhythms',
    meter: { kind: 'simple', timeSignatures: ['4/4'], beatsPerMeasure: [4] },
    beatUnit: 'quarter', assetPrefix: null,
    newSkills: ['concept:cross-rhythms'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'notating the composite of an advanced cross-rhythm/polymeter single-voice; the tapping form additionally needs the two-zone two-voice (polymeter) engine',
    forms: { dictation: { voices: 1 }, tapping: { voices: 2 } },
    prereqs: ['ch29', 'ch25']
  },

  // --- Ch31: Tempo Modulation — single-voice both forms, needs variable-tempo clock ---
  {
    id: 'ch31', hallChapter: 31, title: 'Tempo Modulation',
    meter: { kind: 'simple', timeSignatures: ['4/4'], beatsPerMeasure: [4] },
    beatUnit: 'mixed', assetPrefix: null,
    newSkills: ['concept:tempo-modulation'], approxFigures: true,
    buildStatus: 'needs-engine',
    engineNeeds: 'variable-tempo clock (metric/tempo modulation: tempo change keyed to a note-value equivalence)',
    prereqs: ['ch30']
  }
];

/* ===========================================================================
 * DERIVATION — fill in `allSkills` + `figures` (cumulative within a beat unit)
 *
 * Cumulative vocabulary is accumulated over the prerequisite DAG, but ONLY
 * across prereqs that share this level's beat unit (you don't carry
 * quarter-beat figures into a half-beat meter). This keeps `allSkills`
 * faithful to CURRICULUM_PLAN.md §B ("Vocabulary is cumulative within a
 * beat-unit family").
 * =========================================================================*/

const DEF_BY_ID = new Map(LEVEL_DEFS.map((d) => [d.id, d]));

/**
 * Accumulate the cumulative skill set for a level over its same-beat-unit
 * prerequisite ancestry. Memoized via `cache`.
 * @param {string} id Level id.
 * @param {Map<string,string[]>} cache Memo of id → allSkills.
 * @returns {string[]} Ordered, de-duplicated skill ids (ancestors first).
 */
function accumulate(id, cache) {
  if (cache.has(id)) return cache.get(id);
  const def = DEF_BY_ID.get(id);
  const seen = new Set();
  const ordered = [];
  // Inherit a prereq's cumulative vocabulary ONLY when it is the same beat-unit
  // family AND on the same side of the POLYRHYTHM boundary. This stops:
  //   - cross-family carryover (e.g. quarter figures into a half-beat meter), and
  //   - cross-boundary carryover (e.g. the two-voice polyrhythm CONCEPT leaking
  //     into a single-voice dictation level, or a single-voice figure leaking
  //     into a polyrhythm level) — several roadmap levels share the `quarter`
  //     beat unit across the boundary, so beat unit alone is not enough.
  // The boundary is `forms.tapping.voices === 2`: the inherently two-voice
  // chapters (13,23,24,25,30) carry only polyrhythm CONCEPT skills, so they form
  // their own cumulative lineage, separate from the single-voice figure lineage.
  // `forms` defaults to both-voices-1 when a def omits it (the single-voice case).
  const isPolyOf = (d) => (d.forms ? d.forms.tapping.voices : 1) === 2;
  for (const p of def.prereqs) {
    const pdef = DEF_BY_ID.get(p);
    if (!pdef) continue;
    if (pdef.beatUnit !== def.beatUnit) continue;     // different beat-unit family
    if (isPolyOf(pdef) !== isPolyOf(def)) continue;   // across the polyrhythm boundary
    for (const sk of accumulate(p, cache)) {
      if (!seen.has(sk)) { seen.add(sk); ordered.push(sk); }
    }
  }
  for (const sk of def.newSkills) {
    if (!seen.has(sk)) { seen.add(sk); ordered.push(sk); }
  }
  cache.set(id, ordered);
  return ordered;
}

/**
 * The default per-form data: a single-voice level in BOTH forms. The five
 * inherently two-voice chapters override `forms` in their def (the dictation
 * form stays voices:1 — the composite — but the tapping form is voices:2). A
 * fresh object is created per level so no two levels share a `forms` reference.
 * @returns {{dictation: {voices: number}, tapping: {voices: number}}}
 */
const defaultForms = () => ({ dictation: { voices: 1 }, tapping: { voices: 1 } });

/**
 * Defaults applied to every level def, so the original READY levels need no
 * edits when the buildStatus/forms fields were added: a level is single-voice in
 * both forms and playable now, unless it overrides these.
 * @type {{buildStatus: BuildStatus, engineNeeds: (string|null), approxFigures: boolean}}
 */
const LEVEL_DEFAULTS = {
  buildStatus: 'ready', engineNeeds: null, approxFigures: false
};

/* ---------------------------------------------------------------------------
 * TAPPING performance-difficulty per chapter (grounded in TAPPING_RESEARCH.md).
 *
 * TAPPING_RESEARCH.md grades a 16-level PERFORMANCE ladder (★1–7) and tags each
 * Hall chapter cluster. We carry that per-chapter onto our 31 matched levels as
 * a difficulty `rank` (1–7) + a short `scaffold` note. The three INFLECTION
 * points the research calls out — syncopation (Ch9, hands first disagree), the
 * 2:3 polyrhythm gateway (Ch13), and the polymeter ceiling (Ch30) — are flagged
 * `inflection:true` so the tapping front-end can scaffold them heavily.
 *
 * This metadata sets the tapping ladder's CURVE only; it does not change the
 * ladder's structure (same levels, same order as dictation).
 * @type {Object<string, import('./curriculum.js').TappingDifficulty>}
 * ------------------------------------------------------------------------- */
const TAPPING_DIFFICULTY = {
  ch1:  { rank: 1, scaffold: 'Beat-hand vs rhythm-hand foundation; introduce the beat↔rhythm hand-switch.' },
  ch2:  { rank: 1, scaffold: 'Simple-triple beat-keeping; third-beat pulse in the beat hand.' },
  ch3:  { rank: 1, scaffold: 'Quadruple beat-keeping; the secondary accent (beat 3).' },
  ch4:  { rank: 2, scaffold: 'Ties across the beat — the rhythm hand stays silent on a beat-tap (first beat/rhythm divergence).' },
  ch5:  { rank: 3, scaffold: 'Compound beat-keeping: beat-hand on the dotted-quarter, rhythm hand in 3s.' },
  ch6:  { rank: 2, scaffold: 'Sixteenths vs the steady beat — keep the beat hand even under faster subdivision.' },
  ch7:  { rank: 2, scaffold: 'Dotted-eighth/sixteenth scotch-snap against the steady beat.' },
  ch8:  { rank: 3, scaffold: 'Sixteenths inside the compound (dotted-quarter) beat.' },
  ch9:  { rank: 3, inflection: true, scaffold: 'INFLECTION: syncopation vs the beat — the FIRST true hand independence; scaffold with a beat-hint and slow tempo.' },
  ch10: { rank: 3, scaffold: 'Compound syncopation in 6/8 — off-beat ties over the dotted-quarter beat.' },
  ch11: { rank: 3, scaffold: '9/8 & 12/8 compound beat-keeping at 3 & 4 beats per bar.' },
  ch12: { rank: 4, scaffold: 'Triplets vs the beat — single-hand polyrhythm (3 against the steady beat).' },
  ch13: { rank: 5, inflection: true, scaffold: 'INFLECTION: Polyrhythm I — 2:3 GATEWAY (written in 6/8, sharing the downbeat). Scaffold heavily; let the app play one line first.' },
  ch14: { rank: 4, scaffold: 'Scaled beat unit (half-note beat) — re-meter the same rhythms onto a slower beat hand.' },
  ch15: { rank: 4, scaffold: 'Scaled compound beat unit (dotted-half beat).' },
  ch16: { rank: 4, scaffold: 'Scaled fast beat unit (eighth-note beat).' },
  ch17: { rank: 4, scaffold: 'Scaled fast compound beat unit (dotted-eighth beat).' },
  ch18: { rank: 4, scaffold: 'Small-subdivision tuplet precision at slow tempo.' },
  ch19: { rank: 4, scaffold: 'Changing simple meter — the beat-hand grouping changes per bar.' },
  ch20: { rank: 4, scaffold: 'Changing compound meter — per-bar compound regrouping.' },
  ch21: { rank: 4, scaffold: 'Simple↔compound, division constant (♪=♪) — the beat shifts, the division holds.' },
  ch22: { rank: 4, scaffold: 'Simple↔compound, beat constant (♩=♩.) — the beat holds, the division shifts.' },
  ch23: { rank: 5, scaffold: 'Polyrhythm II — 3:2 across two voices (longer out-of-phase span).' },
  ch24: { rank: 5, scaffold: 'Polyrhythm II — 4:3 across two voices.' },
  ch25: { rank: 6, scaffold: 'Polyrhythm III — 4-in-3 / 3-in-4 intra-beat division against division.' },
  ch26: { rank: 4, scaffold: 'Quintuplet/sextuplet/septuplet precision against the beat.' },
  ch27: { rank: 6, scaffold: 'Unequal-beat keeping — the steady hand itself taps an uneven 2+3 / 3+2.' },
  ch28: { rank: 6, scaffold: 'More unequal beats (7/8 = 2+2+3, etc.) — folk groupings in the beat hand.' },
  ch29: { rank: 6, scaffold: 'Changing unequal meters — the uneven beat pattern changes per bar.' },
  ch30: { rank: 7, inflection: true, scaffold: 'INFLECTION: Polymeter — dual time signatures (the CEILING). The app holds one meter while the student taps the other.' },
  ch31: { rank: 7, scaffold: 'Metric modulation — the beat-hand tempo changes mid-study (note-value equivalence).' }
};

/** @type {Level[]} */
export const LEVELS = (() => {
  const cache = new Map();
  return LEVEL_DEFS.map((def) => {
    const allSkills = accumulate(def.id, cache);
    const figures = allSkills.filter((sk) => {
      const s = SKILL_BY_ID.get(sk);
      return s && s.isFigure !== false;
    });
    const forms = def.forms || defaultForms();
    const tappingDifficulty = TAPPING_DIFFICULTY[def.id];
    return { ...LEVEL_DEFAULTS, ...def, forms, tappingDifficulty, allSkills, figures };
  });
})();

/** @type {Map<string, Level>} id → Level, for O(1) lookup. */
export const LEVEL_BY_ID = new Map(LEVELS.map((l) => [l.id, l]));
