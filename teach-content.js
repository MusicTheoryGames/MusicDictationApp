/**
 * @file teach-content.js
 *
 * TEACH / DEMO CONTENT for the guided level system — the short educational
 * intro the teach screen shows BEFORE each new rhythmic concept, so the program
 * feels guided rather than guesswork.
 *
 * This is a DATA file only. It does NOT touch app flow, the engine, the ladder,
 * or any other file — the teach screen reads `window.TEACH_CONTENT` and renders
 * it. The app already loads data via plain <script> globals (e.g. solo-mode), so
 * a single `window.*` global is the safest delivery shape.
 *
 * KEYS: the curriculum level ids `ch1`…`ch31` (one per Hall & Urban "Studying
 * Rhythm" 4th-ed. chapter), matched 1:1 to `core/curriculum.js` (LEVELS) on the
 * `level-core` branch. All 31 are present.
 *
 *   READY-15 (authored most thoroughly): ch1–ch12 (minus ch13), ch14, ch15, ch17
 *               — the chapters whose figure art exists today.
 *   ROADMAP   : ch13, ch16, ch18–ch31 — not yet buildable (needs-engine /
 *               needs-assets). Their teach copy is still grounded in the real
 *               Hall chapter, and each is flagged `roadmap: true` so the screen
 *               can mark it "coming soon."
 *
 * GROUNDING: every entry is tied to its Hall chapter principle (HALL_CATALOG.md)
 * and to that level's REAL figure vocabulary (curriculum.js `newSkills` /
 * `figures` + CURRICULUM_PLAN.md §B). No concept a level does not cover is
 * introduced. Tapping tips draw on TAPPING_RESEARCH.md's per-level performance
 * notes (esp. the three inflection points: ch9 syncopation, ch13 the 2:3
 * gateway, ch30 polymeter). The Hall chapter is cited in a comment on each entry.
 *
 * Field shape per level:
 *   { title, whatsNew, keyFigures:[…], demo, dictationTip, tappingTip,
 *     roadmap? }
 *
 * No emoji anywhere (product rule).
 */

(function () {
  'use strict';

  /** @type {Object<string, {
   *   title: string, whatsNew: string, keyFigures: string[], demo: string,
   *   dictationTip: string, tappingTip: string, roadmap?: boolean }>} */
  var TEACH_CONTENT = {

    /* ===================================================================
     * READY-15 — the buildable single-voice ladder (art exists today)
     * =================================================================== */

    // Hall Ch1 — The beat; simple DUPLE; strong/weak. Figures: quarter,
    // two-eighths, half. 2/4, quarter beat.
    ch1: {
      title: 'The beat: quarters, eighths & halves',
      whatsNew: 'This is where it all starts: a steady beat in 2/4, with two ' +
        'beats per measure. The first beat is strong, the second is weak.',
      keyFigures: [
        'quarter note — one beat',
        'two eighths — the beat split in half ("ta-ki")',
        'half note — held for both beats of the measure'
      ],
      demo: 'Clap: quarter — two eighths — quarter — half (over two measures), ' +
        'counting "1 2" in each bar.',
      dictationTip: 'Decide first whether each beat is a single sound (quarter) ' +
        'or two even sounds (two eighths) before you place a tile.',
      tappingTip: 'Tap a steady beat in one hand and the rhythm in the other ' +
        'from the very first study — this hand-split is the whole foundation.'
    },

    // Hall Ch2 — Third beat; simple TRIPLE. Same figures, now 3 beats. 3/4.
    ch2: {
      title: 'Simple triple meter (3/4)',
      whatsNew: 'Same note values you already know, now in 3/4 — three beats per ' +
        'measure. Beat 1 is strong; beats 2 and 3 are weak.',
      keyFigures: [
        'no new note values — quarters, eighth-pairs and halves in a 3-beat bar',
        'a half note now fills beats 1–2 (or 2–3), leaving one beat'
      ],
      demo: 'Clap in 3/4: quarter — quarter — quarter, then half — quarter, ' +
        'counting "1 2 3" each bar.',
      dictationTip: 'Count to three every measure; a half note covers two of ' +
        'those three beats, so listen for where the empty beat lands.',
      tappingTip: 'Keep the beat hand even across all three beats — the pulse ' +
        'should not lean or rush into beat 3.'
    },

    // Hall Ch3 — Secondary accent (beat 3); QUADRUPLE. New: quarter-rest,
    // whole note. 4/4.
    ch3: {
      title: 'Simple quadruple meter (4/4)',
      whatsNew: 'Four beats per measure. Beat 1 is the strongest and beat 3 gets ' +
        'a secondary accent. You also meet the rest — a beat of silence.',
      keyFigures: [
        'four-beat measure with a strong beat 1 and a secondary accent on beat 3',
        'quarter rest — one beat of silence you still count'
      ],
      demo: 'Clap in 4/4: quarter — (rest) — quarter — quarter, counting ' +
        '"1 2 3 4" and staying silent on beat 2.',
      dictationTip: 'A rest is a beat you hear nothing on — keep counting through ' +
        'it and place a rest tile rather than skipping the beat.',
      tappingTip: 'On a rest the rhythm hand lifts but the beat hand keeps ' +
        'tapping — silence is still counted, not skipped.'
    },

    // Hall Ch4 — Dotted quarter + ties. New: dotted-quarter-eighth, ties over
    // barline. 2/4·3/4·4/4.
    ch4: {
      title: 'Dotted quarters & ties',
      whatsNew: 'A note can last one-and-a-half beats: the dotted quarter, ' +
        'usually followed by an eighth. Ties also let a note ring across a beat ' +
        'or a barline.',
      keyFigures: [
        'dotted-quarter + eighth — a long note (1½ beats) into a short one (½ beat)',
        'tie — joins two notes into one longer sound, even across the barline'
      ],
      demo: 'Clap: dotted-quarter + eighth — quarter — quarter; the eighth ' +
        'lands just before beat 2.',
      dictationTip: 'A dotted quarter holds through the next half-beat — the ' +
        'following eighth sounds on the "and," not on the beat.',
      tappingTip: 'A tie means the rhythm hand stays silent on a beat the beat ' +
        'hand still taps — your first taste of the two hands diverging.'
    },

    // Hall Ch6 — Sixteenths in simple. New: four-sixteenths,
    // eighth-two-sixteenths, two-sixteenths-eighth, sixteenth-eighth-sixteenth.
    ch6: {
      title: 'Sixteenth notes in simple meter',
      whatsNew: 'The beat can now split into four. Four sixteenths fill one beat, ' +
        'and you mix them with eighths inside a single beat.',
      keyFigures: [
        'four sixteenths — one beat in four even parts ("ta-ka-di-mi")',
        'eighth + two sixteenths, and two sixteenths + eighth — half-and-quarter splits',
        'sixteenth–eighth–sixteenth — short-long-short inside the beat'
      ],
      demo: 'Clap: four sixteenths — quarter — eighth + two sixteenths — quarter, ' +
        'keeping each beat the same length.',
      dictationTip: 'First hear how many sounds are in the beat (one, two, or ' +
        'four), then hear whether they are even or a long/short mix.',
      tappingTip: 'Keep the beat hand perfectly even while the rhythm hand ' +
        'doubles up — let the steady beat anchor the faster notes.'
    },

    // Hall Ch7 — Dotted eighths in simple. New: dotted-eighth-sixteenth (and
    // the reverse: scotch snap). Catalog flags double-dots (concept only).
    ch7: {
      title: 'Dotted eighths & the scotch snap',
      whatsNew: 'A long-then-very-short pairing inside one beat: the dotted ' +
        'eighth plus a sixteenth, and its reverse, the short-long "scotch snap."',
      keyFigures: [
        'dotted-eighth + sixteenth — long then very short (the "dum-da" galloping figure)',
        'sixteenth + dotted-eighth — the reverse, a snapped short-long ("scotch snap")'
      ],
      demo: 'Clap: dotted-eighth + sixteenth — quarter — dotted-eighth + ' +
        'sixteenth — quarter, feeling the gallop.',
      dictationTip: 'Both notes are in one beat — the sixteenth is squeezed ' +
        'right up against the next beat, so listen for which sound is the tiny one.',
      tappingTip: 'The dotted-eighth/sixteenth gallops against an even beat ' +
        'hand; keep the beat steady so the snap stays crisp, not rushed.'
    },

    // Hall Ch9 — Rests as "active silence" + SYNCOPATION (simple). New:
    // eighth-rest-eighth, eighth-eighth-rest, eighth-quarter-eighth (the e-q-e
    // syncopation), eighth-rest-two-sixteenths, sixteenth-rest-three-sixteenths.
    // INFLECTION POINT (TAPPING_RESEARCH).
    ch9: {
      title: 'Rests & syncopation',
      whatsNew: 'Accents move off the beat. Rests on strong beats and the ' +
        'eighth–quarter–eighth figure push the sound onto the "and," creating ' +
        'syncopation.',
      keyFigures: [
        'eighth–quarter–eighth — the classic syncopation (the middle note lands off the beat)',
        'eighth-rest + eighth, and eighth + eighth-rest — silence on part of the beat',
        'eighth-rest + two sixteenths — an off-beat burst after a silent start'
      ],
      demo: 'Clap: eighth–quarter–eighth — quarter; the long middle note feels ' +
        'like it pushes against the beat.',
      dictationTip: 'When the accent feels "off," check for a rest on the beat ' +
        'or a note that starts between beats — that is the syncopation.',
      tappingTip: 'This is where your two hands first stop agreeing: the rhythm ' +
        'hand sounds between the beat-hand taps. Slow down and lean on the beat hint.'
    },

    // Hall Ch12 — Triplets (borrowed division). New: triplet-eighths,
    // triplet-quarters. assetPrefix tpl.
    ch12: {
      title: 'Triplets',
      whatsNew: 'In simple meter the beat normally splits into two — a triplet ' +
        'borrows a three-way split instead, fitting three even notes where two ' +
        'would go.',
      keyFigures: [
        'eighth-note triplet — three even notes in one beat',
        'quarter-note triplet — three even notes across two beats'
      ],
      demo: 'Clap: quarter — eighth-triplet — quarter — eighth-triplet, saying ' +
        '"1 — tri-pl-et — 2 — tri-pl-et."',
      dictationTip: 'Three even notes in the time of one beat means a triplet, ' +
        'not sixteenths — count "1-and-a" rather than "1-e-and-a."',
      tappingTip: 'Three taps against one steady beat is a single-hand ' +
        'polyrhythm — the first time three rubs against the pulse. Feel the ' +
        'middle note fall exactly between two beats.'
    },

    // Hall Ch5 — COMPOUND duple (feel in 2). New: cd-dotted-quarter,
    // cd-three-eighths, cd-quarter-eighth, cd-eighth-quarter, cd-duplet. 6/8.
    ch5: {
      title: 'Compound duple meter (6/8)',
      whatsNew: 'A new feel: in 6/8 you count two beats, but each beat now ' +
        'divides into three eighths instead of two. The beat is a dotted quarter.',
      keyFigures: [
        'dotted quarter — one whole compound beat',
        'three eighths — the beat divided evenly into three',
        'quarter + eighth, and eighth + quarter — long-short and short-long within the beat',
        'duplet — two notes squeezed into the space of three'
      ],
      demo: 'Clap in 6/8: three eighths — three eighths, counting ' +
        '"1-2-3 4-5-6" with the pulse on 1 and 4.',
      dictationTip: 'Feel two beats per bar, each holding three eighths — a ' +
        'dotted quarter fills a whole beat, "quarter + eighth" is long-then-short.',
      tappingTip: 'The beat hand now taps the dotted quarter while the rhythm ' +
        'hand moves in threes — keep two steady beats, not six fast ones.'
    },

    // Hall Ch8 — Sixteenths in 6/8. New: cd-six-sixteenths, cd-two16-8-8,
    // cd-8-two16-8, cd-8-8-two16, cd-four16-8, cd-8-four16, cd-quarter-two16,
    // cd-two16-quarter.
    ch8: {
      title: 'Sixteenths in 6/8',
      whatsNew: 'Now the eighths inside the compound beat can split further into ' +
        'sixteenths, filling the dotted-quarter beat with up to six notes.',
      keyFigures: [
        'six sixteenths — the whole compound beat split into six',
        'two sixteenths + two eighths (and its rearrangements) — one eighth broken into sixteenths',
        'quarter + two sixteenths, two sixteenths + quarter — a long note with a sixteenth pair'
      ],
      demo: 'Clap in 6/8: three eighths — six sixteenths, keeping the two main ' +
        'beats steady underneath.',
      dictationTip: 'Inside each compound beat, ask how many of the three ' +
        'eighths got split into a sixteenth pair, and where.',
      tappingTip: 'Hold the two dotted-quarter beats rock-steady while the ' +
        'rhythm hand doubles to sixteenths — the beat hand must not speed up.'
    },

    // Hall Ch10 — Rests + syncopation in 6/8. New: cd-dotted-quarter-rest,
    // cd-8rest-8-8, cd-8-8rest-8, cd-8-8-8rest, cd-quarter-8rest, cd-8rest-quarter.
    ch10: {
      title: 'Rests & syncopation in 6/8',
      whatsNew: 'Rests now land inside the compound beat, and ties across the ' +
        'eighths create syncopation in 6/8 — the off-beat feel, compound-style.',
      keyFigures: [
        'dotted-quarter rest — a whole compound beat of silence',
        'eighth-rest + two eighths, and rests on the middle or last eighth of the beat',
        'quarter + eighth-rest, eighth-rest + quarter — silence paired with a longer note'
      ],
      demo: 'Clap in 6/8: eighth-rest + two eighths — three eighths, staying ' +
        'silent on the first eighth of beat 1.',
      dictationTip: 'Count all three eighths of each beat out loud; a rest is ' +
        'one of those three you hear nothing on.',
      tappingTip: 'Compound syncopation puts the rhythm hand on the off-eighths ' +
        'while the beat hand holds the dotted-quarter pulse — keep the pulse honest.'
    },

    // Hall Ch11 — 9/8 & 12/8. No new figures; 3 & 4 compound beats.
    ch11: {
      title: 'Nine-eight & twelve-eight',
      whatsNew: 'The same compound feel, now with more beats per bar: 9/8 has ' +
        'three dotted-quarter beats and 12/8 has four. No new note values — just ' +
        'longer measures.',
      keyFigures: [
        'no new figures — the full 6/8 vocabulary, with 3 beats (9/8) or 4 beats (12/8)',
        '9/8 counted "1-2-3 4-5-6 7-8-9"; 12/8 adds a fourth group of three'
      ],
      demo: 'Clap in 9/8: three eighths — three eighths — three eighths, with ' +
        'the pulse on 1, 4 and 7.',
      dictationTip: 'Find the dotted-quarter beats first (three of them in 9/8, ' +
        'four in 12/8), then read each beat’s three eighths.',
      tappingTip: 'The beat hand now taps three or four times per bar — keep ' +
        'every compound beat the same length across the longer measure.'
    },

    // Hall Ch14 — Half-note beat (no new rhythm, doubled values). hb-* set.
    // 2/2, 3/2.
    ch14: {
      title: 'The half-note beat (2/2 & 3/2)',
      whatsNew: 'Same rhythms, slower beat unit: now the HALF note gets one beat. ' +
        'In 2/2 (cut time) you count two half-note beats per bar.',
      keyFigures: [
        'half note — one beat (the new beat unit)',
        'two quarters — the beat split in two; four eighths — split in four',
        'quarter + two eighths and rests/sixteenths re-metered onto the half-note beat'
      ],
      demo: 'Clap in 2/2: half — two quarters, counting just "1 2" with each ' +
        'beat a half-note long.',
      dictationTip: 'Re-read the familiar figures one notch slower: a quarter is ' +
        'now a half-beat, two eighths a quarter of the beat.',
      tappingTip: 'The beat hand taps half notes — a slower, broader pulse. Same ' +
        'patterns, re-metered onto that wider beat.'
    },

    // Hall Ch15 — Dotted-half beat (compound). dh-* set. 6/4, 9/4, 12/4.
    ch15: {
      title: 'The dotted-half beat (6/4, 9/4, 12/4)',
      whatsNew: 'Compound feel with a slower beat: the DOTTED HALF gets one beat, ' +
        'dividing into three quarters. 6/4 has two of these big beats per bar.',
      keyFigures: [
        'dotted half — one whole compound beat',
        'three quarters — the beat divided evenly into three',
        'half + quarter, quarter + half, and a duplet (two in the space of three)'
      ],
      demo: 'Clap in 6/4: three quarters — three quarters, with the pulse on the ' +
        'first and fourth quarter.',
      dictationTip: 'It is 6/8 stretched larger — two dotted-half beats, each ' +
        'holding three quarters instead of three eighths.',
      tappingTip: 'The beat hand taps a slow dotted-half pulse while the rhythm ' +
        'hand moves in threes of quarters — a broad compound groove.'
    },

    // Hall Ch17 — Dotted-eighth beat (compound). de-* set + 32nds. 6/16, 9/16,
    // 12/16.
    ch17: {
      title: 'The dotted-eighth beat (6/16, 9/16, 12/16)',
      whatsNew: 'The fastest compound beat: the DOTTED EIGHTH gets one beat, ' +
        'dividing into three sixteenths. New tiny notes (thirty-seconds) can ' +
        'split it further.',
      keyFigures: [
        'dotted eighth — one whole compound beat',
        'three sixteenths — the beat divided evenly into three',
        'six thirty-seconds — the beat split into six fast notes'
      ],
      demo: 'Clap in 6/16: three sixteenths — three sixteenths, keeping two quick ' +
        'beats steady underneath.',
      dictationTip: 'It is 6/8 in miniature — same shapes, written with ' +
        'sixteenths (and thirty-seconds) on a fast dotted-eighth beat.',
      tappingTip: 'Two quick dotted-eighth beats in the beat hand; keep them ' +
        'even so the fast sixteenths and thirty-seconds stay clean.'
    },

    /* ===================================================================
     * ROADMAP — the rest of Hall, not yet buildable (needs-engine /
     * needs-assets). Teach copy still grounded in the real chapter; flagged
     * roadmap:true so the screen can show "coming soon."
     * =================================================================== */

    // Hall Ch13 — Two against three (polyrhythm 2:3). Written in 6/8, sharing the
    // downbeat. INFLECTION POINT (TAPPING_RESEARCH). NEEDS-ENGINE.
    ch13: {
      roadmap: true,
      title: 'Two against three',
      whatsNew: 'Your first true polyrhythm: one hand plays two even notes while ' +
        'the other plays three, sharing the downbeat. Hall writes this in 6/8.',
      keyFigures: [
        'two-against-three (2:3) — two notes in one hand vs three in the other',
        'the composite (resultant) rhythm — what the two lines sound like combined'
      ],
      demo: 'Say "nice cup of tea": "nice" is the shared downbeat, then the two ' +
        'hands split apart and meet again on the next "nice."',
      dictationTip: 'Notate what you HEAR as one combined line — the merged ' +
        'pattern of both voices, not two separate staves.',
      tappingTip: 'The polyrhythm gateway: two against three is where the hands ' +
        'truly part ways. Let the app play one line first, and scaffold heavily.'
    },

    // Hall Ch16 — Eighth-note beat (no new rhythm, halved). 2/8, 3/8.
    // NEEDS-ASSETS (eb-* art).
    ch16: {
      roadmap: true,
      title: 'The eighth-note beat (2/8 & 3/8)',
      whatsNew: 'Same rhythms, fastest simple beat unit: the EIGHTH note gets one ' +
        'beat. The values are simply halved from the quarter-beat meters.',
      keyFigures: [
        'eighth note — one beat (the new fast beat unit)',
        'two sixteenths — the beat split in two; four thirty-seconds — split in four'
      ],
      demo: 'Clap in 2/8: eighth — two sixteenths, counting a quick "1 2."',
      dictationTip: 'Read the familiar patterns one notch faster — the eighth is ' +
        'now the beat, the sixteenth its half.',
      tappingTip: 'A quick eighth-note pulse in the beat hand; the same patterns, ' +
        're-metered onto that faster beat.'
    },

    // Hall Ch18 — Small subdivisions (32nds/64ths, irregular 3/5/7 at slow tempo).
    // NEEDS-ASSETS.
    ch18: {
      roadmap: true,
      title: 'Small subdivisions',
      whatsNew: 'At slow tempos the beat can split into very fine values — ' +
        'thirty-seconds and sixty-fourths — plus irregular groupings of three, ' +
        'five or seven.',
      keyFigures: [
        'thirty-second and sixty-fourth notes — very fine subdivisions of the beat',
        'irregular tuplets (3, 5, 7) read accurately at a slow tempo'
      ],
      demo: 'At a slow tempo, clap one beat split into four sixteenths, then the ' +
        'same beat split into eight thirty-seconds.',
      dictationTip: 'Slow tempo makes the fine notes countable — feel how many ' +
        'even parts fill a single beat before naming the value.',
      tappingTip: 'Precision over speed: keep the slow beat hand rock-steady so ' +
        'the dense subdivisions stay even.'
    },

    // Hall Ch19 — Changing SIMPLE meter (eighth constant). NEEDS-ENGINE.
    ch19: {
      roadmap: true,
      title: 'Changing simple meter',
      whatsNew: 'The time signature can change from bar to bar — 2/4 to 3/4 to ' +
        '4/4 — while the eighth note stays the same speed. Measures get longer ' +
        'and shorter.',
      keyFigures: [
        'per-bar meter change in simple meter (e.g. 2/4 → 3/4 → 4/4)',
        'the eighth-note pulse stays constant across the change'
      ],
      demo: 'Clap a bar of 2/4, then a bar of 3/4, then 4/4, keeping the same ' +
        'beat speed and just adding or dropping a beat per bar.',
      dictationTip: 'Watch the new time signature at each barline — the beat ' +
        'speed holds, only the number of beats per bar changes.',
      tappingTip: 'The beat hand keeps an even quarter, but counts a different ' +
        'number of beats each bar — stay locked to the unchanging pulse.'
    },

    // Hall Ch20 — Changing COMPOUND meter. NEEDS-ENGINE.
    ch20: {
      roadmap: true,
      title: 'Changing compound meter',
      whatsNew: 'Like changing simple meter, but compound: the bar shifts among ' +
        '6/8, 9/8 and 12/8 while the dotted-quarter beat stays the same speed.',
      keyFigures: [
        'per-bar compound meter change (e.g. 6/8 → 9/8 → 12/8)',
        'the dotted-quarter beat stays constant; only the beat count per bar changes'
      ],
      demo: 'Clap a bar of 6/8 (two beats), then 9/8 (three beats), keeping each ' +
        'dotted-quarter beat the same length.',
      dictationTip: 'Keep feeling the dotted-quarter beat; only how many of them ' +
        'fill the bar changes from measure to measure.',
      tappingTip: 'Hold a steady compound beat while the number of beats per bar ' +
        'changes — the pulse never speeds up or slows down.'
    },

    // Hall Ch21 — Simple<->Compound, DIVISION constant (eighth = eighth).
    // NEEDS-ENGINE.
    ch21: {
      roadmap: true,
      title: 'Simple ↔ compound: division constant',
      whatsNew: 'The meter swaps between simple and compound, but the EIGHTH note ' +
        'stays the same speed. The beat shifts (quarter to dotted-quarter) while ' +
        'the small notes hold.',
      keyFigures: [
        'simple ↔ compound swap with the eighth held constant (♪ = ♪)',
        'the beat changes from quarter to dotted-quarter even though the division does not'
      ],
      demo: 'Clap steady eighths, then re-group them: two per beat (simple), ' +
        'then three per beat (compound), without changing the eighth speed.',
      dictationTip: 'The fast notes never change speed — listen for the beat ' +
        'regrouping the same eighths into twos or threes.',
      tappingTip: 'Keep the eighths even and let the beat hand re-group them; ' +
        'the beat changes, the underlying pulse of eighths does not.'
    },

    // Hall Ch22 — Simple<->Compound, BEAT constant (quarter = dotted-quarter).
    // NEEDS-ENGINE.
    ch22: {
      roadmap: true,
      title: 'Simple ↔ compound: beat constant',
      whatsNew: 'The meter swaps between simple and compound, but the BEAT stays ' +
        'the same speed. The eighth note changes (two-per-beat vs three-per-beat) ' +
        'while the pulse holds.',
      keyFigures: [
        'simple ↔ compound swap with the beat held constant (♩ = ♩.)',
        'the division changes from two to three per beat even though the beat does not'
      ],
      demo: 'Tap a steady beat; fill each beat with two even notes (simple), then ' +
        'three even notes (compound), without changing the beat speed.',
      dictationTip: 'The beat never changes speed — listen for whether each beat ' +
        'holds two notes or three.',
      tappingTip: 'The beat hand stays identical the whole time; only the rhythm ' +
        'hand switches between dividing the beat in two and in three.'
    },

    // Hall Ch23 — Three in two / two in three (3:2). NEEDS-ENGINE.
    ch23: {
      roadmap: true,
      title: 'Three in two / two in three',
      whatsNew: 'A longer polyrhythm than 2:3: one voice plays three even notes ' +
        'while the other plays two, spread across a wider span before they line ' +
        'up again.',
      keyFigures: [
        'three-against-two (3:2) and two-against-three across the bar',
        'the composite (resultant) rhythm of the two voices combined'
      ],
      demo: 'Tap three even notes in one hand and two in the other across two ' +
        'beats; they meet only at the start and the end.',
      dictationTip: 'Notate the combined line you hear — where the two voices ' +
        'coincide and where they interlock.',
      tappingTip: 'The hands stay out of phase longer than in 2:3 — count the ' +
        'shared landing points and let the app hold one line.'
    },

    // Hall Ch24 — Four against three (4:3). NEEDS-ENGINE.
    ch24: {
      roadmap: true,
      title: 'Four against three',
      whatsNew: 'A denser polyrhythm: one voice plays four even notes against the ' +
        'other’s three, within the same span, before they realign.',
      keyFigures: [
        'four-against-three (4:3) — four notes in one hand vs three in the other',
        'the composite (resultant) rhythm of the two interlocking voices'
      ],
      demo: 'Over one shared span, tap four even notes in one hand and three in ' +
        'the other; only the first note is shared.',
      dictationTip: 'Listen for the close, uneven interlock of the combined ' +
        'line — four-against-three packs the attacks tightly.',
      tappingTip: 'A tighter cross-rhythm than 3:2 — the hands rarely agree; ' +
        'lock onto the single shared downbeat and scaffold slowly.'
    },

    // Hall Ch25 — Four in three / three in four (4:3, 3:4). NEEDS-ENGINE.
    ch25: {
      roadmap: true,
      title: 'Four in three / three in four',
      whatsNew: 'The intra-beat cross-rhythm: four against three (and its ' +
        'reverse) placed so the divisions of the beat fight each other directly.',
      keyFigures: [
        'four-in-three and three-in-four — division pitted against division',
        'the composite (resultant) rhythm of the two voices'
      ],
      demo: 'Within one beat, tap four even notes in one hand and three in the ' +
        'other, feeling the divisions grind against each other.',
      dictationTip: 'Hear the combined attack pattern within the beat — division ' +
        'against division is the densest single-beat cross-rhythm here.',
      tappingTip: 'Division-against-division inside the beat — among the hardest ' +
        'two-hand patterns; build it from the shared beat outward.'
    },

    // Hall Ch26 — Quintuplets & septuplets (asymmetric divisions).
    // NEEDS-ASSETS (tpl-* art).
    ch26: {
      roadmap: true,
      title: 'Quintuplets & septuplets',
      whatsNew: 'Beyond triplets: the beat can borrow a five-, six- or seven-way ' +
        'split — odd, asymmetric divisions that fit an unusual number of even ' +
        'notes into one beat.',
      keyFigures: [
        'quintuplet — five even notes in one beat',
        'sextuplet — six even notes in one beat',
        'septuplet — seven even notes in one beat'
      ],
      demo: 'Clap one beat as a quintuplet (five even notes), then the next beat ' +
        'as a normal four sixteenths, to feel the difference.',
      dictationTip: 'Count how many even notes fill the single beat — five, six ' +
        'or seven — rather than trying to subdivide in the usual way.',
      tappingTip: 'Precision against a steady beat: fit five or seven even taps ' +
        'into one beat-hand pulse without rushing the ends.'
    },

    // Hall Ch27 — Five-eight & five-four (first UNEQUAL meter). 2+3 / 3+2.
    // NEEDS-ENGINE.
    ch27: {
      roadmap: true,
      title: 'Five-eight & five-four',
      whatsNew: 'The first unequal meter: a bar of five splits into a long beat ' +
        'and a short beat (2+3 or 3+2), so the beats themselves are uneven.',
      keyFigures: [
        '5/8 and 5/4 grouped as 2+3 or 3+2 — one long beat plus one short beat',
        'unequal-beat meter — the pulse itself is no longer evenly spaced'
      ],
      demo: 'Clap 5/8 as "1-2 / 1-2-3" (a short beat then a long beat), feeling ' +
        'the limp in the pulse.',
      dictationTip: 'Find the grouping first (2+3 or 3+2) — the bar has two ' +
        'beats, but one is longer than the other.',
      tappingTip: 'Now the beat hand itself taps unevenly — a short beat then a ' +
        'long one. The steady pulse becomes a deliberate limp.'
    },

    // Hall Ch28 — More unequal-beat meters (7/8, 8/8, 9/8-asym, 11/8).
    // NEEDS-ENGINE.
    ch28: {
      roadmap: true,
      title: 'More unequal-beat meters',
      whatsNew: 'More odd groupings: 7/8 and beyond, split into mixes of twos and ' +
        'threes (like 2+2+3). Many come from Bulgarian and Macedonian folk tunes.',
      keyFigures: [
        '7/8 grouped as 2+2+3 (or 3+2+2, 2+3+2) — three beats of unequal length',
        'longer unequal meters (8/8, 11/8) built from twos and threes'
      ],
      demo: 'Clap 7/8 as "1-2 / 1-2 / 1-2-3," feeling two short beats then a ' +
        'long one.',
      dictationTip: 'Decode the bar into its 2s and 3s — the grouping tells you ' +
        'where the uneven beats fall.',
      tappingTip: 'The beat hand taps a folk groove of unequal beats; lock the ' +
        '2+2+3 pattern into your hand before adding the rhythm.'
    },

    // Hall Ch29 — Changing unequal meters (eighth constant). NEEDS-ENGINE.
    ch29: {
      roadmap: true,
      title: 'Changing unequal meters',
      whatsNew: 'Unequal meters that also change bar to bar — 5/8 to 7/8 and back ' +
        '— while the eighth stays constant. The uneven beat pattern itself shifts ' +
        'each measure.',
      keyFigures: [
        'per-bar change among unequal meters (e.g. 5/8 ↔ 7/8)',
        'the eighth stays constant while the grouping of beats changes each bar'
      ],
      demo: 'Clap a bar of 5/8 (2+3), then a bar of 7/8 (2+2+3), keeping the ' +
        'eighth note the same speed throughout.',
      dictationTip: 'Read the grouping fresh at each barline; the eighth holds ' +
        'steady, but how it clusters into beats changes.',
      tappingTip: 'The uneven beat pattern in the beat hand changes every bar — ' +
        'keep the eighth constant as the limp re-shapes itself.'
    },

    // Hall Ch30 — More cross-rhythms / POLYMETER (dual time sigs). CEILING /
    // INFLECTION (TAPPING_RESEARCH). NEEDS-ENGINE.
    ch30: {
      roadmap: true,
      title: 'Polymeter & cross-rhythms',
      whatsNew: 'The ceiling: two different time signatures at once (for example ' +
        '6/8 against 2/4), each hand in its own meter, drifting in and out of ' +
        'phase.',
      keyFigures: [
        'polymeter — two simultaneous time signatures (dual meters)',
        'advanced cross-rhythms (e.g. groups of seven against a steady meter)'
      ],
      demo: 'Tap 2/4 in one hand and 6/8 in the other, both starting together ' +
        'and meeting again only after a full cycle.',
      dictationTip: 'Notate the combined resultant line — where two different ' +
        'meters coincide and where they pull apart.',
      tappingTip: 'The peak of two-hand independence: the app holds one meter ' +
        'while you tap the other. Find the points where the two meters realign.'
    },

    // Hall Ch31 — Tempo / metric MODULATION. NEEDS-ENGINE (variable-tempo clock).
    ch31: {
      roadmap: true,
      title: 'Tempo modulation',
      whatsNew: 'A note value is held equal across a meter change to set a new ' +
        'tempo — for example "the old eighth equals the new triplet," so the ' +
        'pulse proportionally speeds up or slows down.',
      keyFigures: [
        'metric / tempo modulation — a note-value equivalence carried across the change',
        'the new tempo is set by holding one value constant (e.g. ♩ = ♩.)'
      ],
      demo: 'Tap a steady eighth, change meter so that same eighth becomes part ' +
        'of a triplet, and let the felt beat shift to the new speed.',
      dictationTip: 'Track the note value that stays constant — it is the bridge ' +
        'that sets the new tempo after the change.',
      tappingTip: 'The beat-hand tempo itself changes mid-study, anchored to the ' +
        'held note value — keep the constant value steady as the pulse re-gears.'
    }
  };

  // Expose as a browser global (script-tag load, like solo-mode's data).
  if (typeof window !== 'undefined') {
    window.TEACH_CONTENT = TEACH_CONTENT;
  }
  // Also support CommonJS in case a build/test harness requires() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TEACH_CONTENT;
  }
})();
