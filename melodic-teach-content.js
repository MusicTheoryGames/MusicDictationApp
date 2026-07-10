/**
 * @file melodic-teach-content.js
 *
 * TEACH / INTRO CONTENT for MelodyQuest's guided ladder — the short educational
 * intro shown before each new melodic concept, so the ladder feels guided
 * rather than guesswork. The melodic sibling of teach-content.js (RhythmQuest);
 * same delivery shape: a DATA-only file exposing one global. The game reads
 * `window.MELODIC_TEACH_CONTENT` (or the module export) and renders it.
 *
 * KEYS: melodic level ids `m0`…`m26`, matched 1:1 to core/melodic-curriculum.js.
 *
 * GROUNDING: every entry is tied to MELODIC_CURRICULUM.md — §3's full per-level
 * writeups for M0–M9 (quoted concepts, not invented ones) and §2's ladder table
 * for M10–M26. `listenFor` bullets only name percepts that level actually
 * assesses; `strategy` is the one habit that unlocks the level. RCM/Hall
 * references stay in the curriculum doc — the student-facing copy stays plain.
 *
 * Field shape per level:
 *   { title, whatsNew, listenFor:[…], strategy, roadmap? }
 *
 * No emoji anywhere (product rule).
 */

(function (global) {
  'use strict';

  var MELODIC_TEACH_CONTENT = {

    /* =========================== Pre-foundation ========================== */

    m0: {
      title: 'Find home',
      controls: 'Tap Start, then tap HOME every time the note you hear is home.',
      strategy: 'Hum home first — if a note melts into your hum, it is home.',
    },

    m1: {
      title: 'Which way?',
      whatsNew: 'Melodies move. Before naming any note, your ear learns to track direction: ' +
        'does each step go up, go down, or stay the same?',
      listenFor: [
        'rising motion — the sound gets brighter/higher',
        'falling motion — the sound relaxes downward',
        'repeated notes — no change at all',
      ],
      strategy: 'Trace the shape in the air with your hand while you listen — your hand hears it too.',
    },

    m1_5: {
      title: 'Hold the tune',
      whatsNew: 'The single biggest reason dictation feels hard is MEMORY — the tune slips ' +
        'away before you can write it. So we train that first: hear a short run of notes and ' +
        'echo it straight back. The run grows as you get stronger.',
      listenFor: [
        'the whole shape as ONE phrase, not separate notes',
        'home (1̂) as your anchor — where the run sits around it',
        'hold the entire run in your ear before you tap anything',
      ],
      strategy: 'Don’t tap along while it plays — listen to the whole run, keep it ringing in ' +
        'your head, THEN echo it. Holding it is the skill.',
    },

    m2: {
      title: 'The rhythm IS the melody',
      whatsNew: 'Here is the method\'s hinge: before naming pitches, dictate the RHYTHM. ' +
        'This round IS the rhythm game — same tiles, same staff — with the pitch held flat ' +
        'so all of your attention goes to time.',
      listenFor: [
        'how many sounds land in each measure',
        'which sounds are long and which split the beat',
      ],
      strategy: 'Count the beat out loud and tap each sound. Rhythm first — always — from here on.',
    },

    /* ===================== Degrees without the staff ===================== */

    m3: {
      title: 'First 3 notes get numbers',
      whatsNew: 'The first three scale degrees get names: 1, 2, 3 (do-re-mi). Melodies here ' +
        'start on 1 and move by step — your job is to name each note\'s degree.',
      listenFor: [
        '1 — home itself (the tonic)',
        '2 — one step above home, leaning back toward it',
        '3 — two steps up, bright and stable',
      ],
      strategy: 'Sing "1-2-3" up from home before you answer; then match each heard note to your own scale.',
    },

    m4: {
      title: 'Read it back',
      whatsNew: 'First look at real notation: hear a short 1-2-3 melody, then pick the staff ' +
        'that matches it. You are reading, not writing — recognition before production.',
      listenFor: [
        'the contour (up/down/same) you learned in M1 — it must match the printed shape',
        'where the melody starts and ends (usually home)',
      ],
      strategy: 'Eliminate options whose SHAPE is wrong before comparing any single note.',
    },

    m5: {
      title: 'The pentascale (1-5)',
      whatsNew: 'The degree family grows to five: 1-2-3-4-5. Melodies still move mostly by ' +
        'step, with small skips inside the tonic chord (1-3-5).',
      listenFor: [
        '4 — the step above 3 that leans back down onto it',
        '5 — the strong, open note that balances home',
      ],
      strategy: 'Anchor on 1, 3, and 5 (the tonic chord) — then hear 2 and 4 as the steps between them.',
    },

    m6: {
      title: 'Minor arrives early',
      whatsNew: 'The same five degrees, but in MINOR — the 3rd sits a half step lower, and the ' +
        'whole color darkens. You will tell major from minor and label degrees in both.',
      listenFor: [
        'the darker, softer 3 of minor vs the bright 3 of major',
        'everything else staying familiar — 1, 2, 5 behave the same',
      ],
      strategy: 'Listen to the FIRST chord/notes for the color (bright or dark) before tracking degrees.',
    },

    m7: {
      title: 'Hear the gap — 3rds',
      whatsNew: 'Melodies now SKIP: a 3rd jumps over exactly one degree (1 to 3, 2 to 4). ' +
        'You will name skips by their degrees and fill in a hidden note.',
      listenFor: [
        'the small "hop" of a 3rd vs the smooth glide of a step',
        'which degree got skipped over',
      ],
      strategy: 'When you hear a hop, sing the note it skipped — that names both ends of the 3rd.',
    },

    m8: {
      title: 'Skips to the frame — 4ths & 5ths',
      whatsNew: 'Bigger leaps arrive: the perfect 5th (1 up to 5) and perfect 4th (5 up to 1). ' +
        'These outline the frame of the key itself.',
      listenFor: [
        'the open, horn-call sound of 1 to 5',
        'the arriving-home sound of 5 up to 1',
      ],
      strategy: 'Both leaps land on a pillar (1 or 5). Find the pillar first; the leap names itself.',
    },

    /* ====================== Notation begins (M9+) ======================== */

    m8_5: {
      title: 'Sketch it',
      whatsNew: 'One step before the staff. Instead of fighting notation, SKETCH what you hear: ' +
        'the scale-degree of each note and whether it went up, down, or stayed. Capturing the ' +
        'idea first — then drawing it later — is how real transcribers work.',
      listenFor: [
        'the scale-degree of each note (1̂..5̂)',
        'the contour between notes — up, down, or same',
        'how many notes there are in total',
      ],
      strategy: 'Get the shape down fast in shorthand while it’s fresh; the staff can wait. ' +
        'Degrees and contour ARE the melody — the notation is just how you write it.',
    },

    m9: {
      title: 'First staff notation',
      whatsNew: 'Now you WRITE. Two phases, in the order you have practiced all along: ' +
        'first dictate the rhythm (in the rhythm game), then place each note\'s degree. ' +
        'Rhythm, then pitch — never both at once.',
      listenFor: [
        'the rhythm, complete, before any pitch thought',
        'then each degree, using every skill from M3-M8',
      ],
      strategy: 'Trust the two-phase habit: a correct rhythm makes the pitches far easier to hang on it.',
    },

    m10: {
      title: 'Spot the wrong note',
      whatsNew: 'Error detection: the staff you see contains exactly ONE wrong pitch. ' +
        'Hear the real melody, then click the note that does not belong.',
      listenFor: [
        'the moment the printed melody and the heard melody split apart',
      ],
      strategy: 'Read along while listening — sing what you SEE and flag where your ear disagrees.',
    },

    m11: {
      title: 'Complete the octave',
      whatsNew: 'Degrees 6 and 7 join, closing the full scale up to 8 (home again, an octave ' +
        'higher). 7 is the leading tone — it aches to rise to 8.',
      listenFor: [
        '6 — gentle, one step past 5',
        '7 — restless, pulling strongly up to 8',
        '8 — home again, higher',
      ],
      strategy: 'Whenever a note feels like it MUST resolve upward, it is 7. Let it point you to home.',
    },

    m12: {
      title: 'The octave leap + 6ths',
      whatsNew: 'Wide leaps: the full octave (1 to 8) and 6ths. Rests and syncopation also ' +
        'appear in the rhythms.',
      listenFor: [
        'the same-note-but-higher ring of an octave',
        'the wide, songful reach of a 6th',
      ],
      strategy: 'An octave keeps the note\'s identity; a 6th changes it. Ask: same letter, or new one?',
    },

    m13: {
      title: 'Full minor: three forms',
      whatsNew: 'Minor comes in three flavors: natural, harmonic (raised 7), and melodic ' +
        '(raised 6 AND 7 on the way up). You will hear WHICH form is playing.',
      listenFor: [
        'natural — the plain dark scale, soft 7',
        'harmonic — the dramatic wide gap up to a raised 7',
        'melodic — the ascending run that smooths that gap with a raised 6',
      ],
      strategy: 'Focus on degrees 6 and 7 near the top of the scale — the three forms differ nowhere else.',
    },

    m14: {
      title: 'Steps everywhere — longer phrases',
      whatsNew: 'Four-bar phrases, either mode, with triplet rhythms available. Nothing new in ' +
        'pitch — the challenge is HOLDING a longer line in memory.',
      listenFor: [
        'the phrase\'s two halves — most 4-bar lines breathe in the middle',
      ],
      strategy: 'Chunk it: memorize bars 1-2 as one gesture, 3-4 as the answer. Never note-by-note.',
    },

    m15: {
      title: 'Compound meter — 6/8',
      whatsNew: 'The beat itself changes: in 6/8 each beat is a dotted quarter that splits into ' +
        'THREE eighths, not two. The rhythm phase runs in the real rhythm game, in 6/8.',
      listenFor: [
        'the lilting ONE-and-a TWO-and-a swing of compound time',
      ],
      strategy: 'Feel two big beats per bar first; only then count the three little notes inside each.',
    },

    m16: {
      title: 'Wider leaps — 7ths',
      whatsNew: 'The 7th: one step short of an octave, tense and dramatic. The rarest leap in ' +
        'real melodies, and the last one to learn.',
      listenFor: [
        'an almost-octave that lands one step low (or high) of where you expected',
      ],
      strategy: 'Hear the octave in your head first; a 7th is that arrival bent by one step.',
    },

    m17: {
      title: 'Multi-phrase dictation — the period',
      whatsNew: 'A full 8-bar musical sentence: a question phrase (ending unsettled, on 5) and ' +
        'an answer phrase (ending home, on 1). Any key up to three sharps or flats.',
      listenFor: [
        'the half-close at bar 4 — the music pauses but is not finished',
        'the full close at bar 8 — now it is finished',
      ],
      strategy: 'The two phrases usually OPEN the same way. Catch the repetition and you have half the notes.',
    },

    m18: {
      title: 'First chromatic note',
      whatsNew: 'A note from OUTSIDE the key: a chromatic passing tone that slides between two ' +
        'scale notes, coloring the line without changing the key.',
      listenFor: [
        'a small "extra" half step filling a gap the scale usually jumps',
        'its resolution — it always continues in the same direction',
      ],
      strategy: 'A chromatic passing tone never stays: hear where it lands, and spell it as leaning that way.',
    },

    m19: {
      title: 'Modulation — the key moves',
      whatsNew: 'The piece genuinely changes key partway through: the question phrase lives at ' +
        'home, the answer phrase settles in the DOMINANT key (built on 5) and stays there.',
      listenFor: [
        'the new leading tone (a fresh sharp) announcing the new key',
        'the final cadence landing on the NEW home, not the old one',
      ],
      strategy: 'When the old home stops feeling like rest, re-aim your ear: the note that now feels like rest is the new 1.',
    },

    m20: {
      title: 'Two-part dictation',
      whatsNew: 'Two melodies at once — the melodic duet. This level needs the two-voice ' +
        'engine and is coming soon.',
      listenFor: [
        'the outer voices: top line and bottom line first',
      ],
      strategy: 'Dictate one voice at a time across multiple hearings — never both in one pass.',
      roadmap: true,
    },

    /* ================== Beyond-RCM extension (M21-M26) =================== */

    m21: {
      title: 'Modal mixture — borrowed color',
      whatsNew: 'A major-key melody borrows the flat 6 from its parallel minor — a moment of ' +
        'shadow inside a bright key, leaning down onto 5.',
      listenFor: [
        'a sudden darkening on 6 that melts down to 5',
      ],
      strategy: 'Mixture DESCENDS: if the dark note resolves down a half step to 5, it is the borrowed flat 6.',
    },

    m22: {
      title: 'Secondary dominant color',
      whatsNew: 'The raised 4: a temporary leading tone borrowed from the dominant\'s own key, ' +
        'sharpened so it pushes up into 5.',
      listenFor: [
        'a bright, sharpened note a half step under 5, rising into it',
      ],
      strategy: 'Raised 4 ASCENDS: dark-to-5-from-above is mixture, bright-to-5-from-below is the raised 4.',
    },

    m23: {
      title: 'Church modes',
      whatsNew: 'Scales older than major and minor: dorian, phrygian, lydian, mixolydian, ' +
        'locrian. Each is a familiar ladder with one or two rungs moved.',
      listenFor: [
        'dorian — minor with a brighter 6',
        'phrygian — minor with a dark flat 2 right above home',
        'lydian — major with a raised, floating 4',
        'mixolydian — major with a relaxed flat 7',
      ],
      strategy: 'Ask two questions: is 3 bright or dark? Then which single degree sounds "moved"? That names the mode.',
    },

    m24: {
      title: 'Pentatonic, whole-tone & octatonic',
      whatsNew: 'New pitch collections: the five-note pentatonic (no half steps at all), the ' +
        'dreamlike whole-tone scale, and the symmetrical octatonic.',
      listenFor: [
        'pentatonic — open, folk-song smoothness, nothing leans anywhere',
        'whole-tone — floating, no home-pull, every step identical',
        'octatonic — tense, alternating small-large steps',
      ],
      strategy: 'These scales remove the leading tone. Stop expecting the 7-to-8 pull — anchor on the tonic pitch alone.',
    },

    m25: {
      title: 'Irregular meter — 5/8 & 7/8',
      whatsNew: 'Bars of five and seven eighths, grouped 2+3 and 2+2+3. The groups are uneven ' +
        'on purpose — that limp is the meter\'s identity.',
      listenFor: [
        'the long group (three eighths) versus the short groups (two)',
      ],
      strategy: 'Count the groups, not the eighths: "ONE-two ONE-two-three" — the pattern of longs and shorts IS the bar.',
    },

    m26: {
      title: 'Composition capstone',
      whatsNew: 'Everything at once: a piece that modulates AND carries color tones — mixture, ' +
        'the raised 4 — in its first half. The summit of the ladder.',
      listenFor: [
        'color tones early (before the key change), pure new-key notes after it',
        'the same landmarks you have trained since M0: home, direction, cadence',
      ],
      strategy: 'Structure first: find the modulation point, then treat each half with the skills of its own key.',
    },
  };

  // Deliver both ways: classic global (matches teach-content.js) and CJS for tests.
  global.MELODIC_TEACH_CONTENT = MELODIC_TEACH_CONTENT;
  if (typeof module !== 'undefined' && module.exports) module.exports = MELODIC_TEACH_CONTENT;
})(typeof window !== 'undefined' ? window : globalThis);
