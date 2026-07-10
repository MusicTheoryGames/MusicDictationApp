# Melody multiple-choice bank

**Forty hand-authored questions. Each is a set of six near-identical melodies.** You play one of the
six; the student identifies which. See "Which option is the correct answer?" below — it is not
option 0, and it is not fixed.

This is content, not code. Nothing in the repo loads it today. It is kept because the near-misses are
the expensive part: they are hand-made so that telling them apart is the exercise.

**How near is not uniform.** Option 0 is the reference; the other five deviate from it by varying
amounts. In question 1 of `4-4_2m_C-major_simple.js`, options 3 and 4 each change one pitch — but
option 1 changes the rhythm, the note count *and* a pitch, and option 5 changes rhythm and pitch.
That spread was never documented. Measure it before you build a difficulty model on it.

## Where it came from

A multiple-choice dictation app, written 2025-09, BUILT to run a classroom: the teacher plays an
excerpt, students pick which of the six notations they heard. Whether it ever ran one is unrecorded
— see below. It is now in `archive/` (`app.js`,
`app.js.backup`, `app_modular.js`, `student.html`, `index_modular.html`, `question_templates.js`).
Only the questions were kept in the live tree; the app itself is still readable in `archive/`.

It **did** have a student client: `archive/student.html` looks up a room, registers, subscribes and
writes answers under `rooms/${code}` **[source]**. What no record shows is anyone running the loop
against a live Firebase project **[inferred]** — see `VISION.md` §9, which is careful about exactly
this distinction. (The tool with *no* client was the RHYTHM teacher, which broadcast on
`rhythm-rooms/*`. Different app, different schema.) I wrote "no working student client" here and it
was false; Codex caught it.

## What it is for

The owner remembers this as the one thing worth keeping: *"a game for classes where it showed like
10 different similar melodies, you would play a melody and the students had to guess which one it
was."* When a classroom mode is built for the Quest games, this bank seeds it.

Note it is a **recognition** task, not dictation — the student picks a notation rather than writing
one. `VISION.md` §2 is explicit that recognition is not the skill the suite trains. Treat this as a
formative classroom activity, not as a dictation exercise, and do not let it drift into being the
product.

## Format

Each file declares a global `var` (a classic script, not an ES module — there is no `export`).
Each question is an array of six option objects.

### Which option is the correct answer?

**Whichever one you play.** There is no fixed answer key, and nothing reads the
`// Option 0: CORRECT ANSWER` comment. In `archive/app.js`:

```js
shuffleOptionsForNewQuestion()   // :6808  currentCorrectOption = Math.floor(Math.random() * 6)
                                 //        …Fisher-Yates the six for display…
                                 //        correctAnswer = where that option landed on screen
playAudio()                      // :6963  plays shuffledOptions[correctAnswer] — the target
```

So the app picks one of the six at random, **sounds that one**, and the student identifies it. The six
options are six playable melodies of equal standing.

There is a `nextQuestion()` at `:6837` that steps the target with `(currentCorrectOption + 1) % 6`,
which looks like it cycles through all six. **It is dead code.** `archive/app.js` defines
`nextQuestion()` twice — at `:6835` and again at `:7204` — and the later declaration wins. The live
one just advances to the next question set. I read the first definition and reported cycling as fact;
Codex found the override. If you reuse this bank, you choose the target yourself.

`// Option 0: CORRECT ANSWER` is an **authoring label**, not a runtime fact. It marks the reference
melody: the other five were written as deviations from it ("Note change + subtle rhythm change").
Useful if you want to know what the author considered canonical. Useless as an answer key.

**If you build a grader that assumes `options[0]` is correct, it is wrong five times in six.**
The answer is the option you played.

(`archive/app_modular.js` has the same selection code but its `playAudio()` is a `// TODO` stub —
it is the unfinished rewrite. Read `archive/app.js`.)

### Format

```js
{
  timeSignature: '4/4',
  clef: 'treble',
  measure1: [ { keys: ['c/4'], duration: 'h' }, … ],   // VexFlow note objects
  measure2: [ … ]
}
```

`duration` is VexFlow's: `'w' 'h' 'q' '8' '16'`, `'r'` suffix for rests, `dots: 1` for dotted.
Ties use `tie: { firstNote: true }` / `tie: { lastNote: true }` on the two notes involved.
Four-measure questions add `measure3` / `measure4`; none of the kept files use them.

| file | key | difficulty | questions |
|---|---|---|---|
| `4-4_2m_C-major_simple.js`  | C major | simple  | 10 |
| `4-4_2m_C-major_complex.js` | C major | complex | 10 |
| `4-4_2m_A-minor_simple.js`  | A minor | simple  | 10 |
| `4-4_2m_A-minor_complex.js` | A minor | complex | 10 |

All are 4/4, two measures.

## Two things a future reader needs to know

1. **There was a `questions_4-4_2m_C-major_complex_fixed.js`.** It is in `archive/`. It differs from
   the file kept here in exactly one question, replacing a tied `f/3` quarter-plus-eighth with a
   dotted quarter and an eighth. Nothing loaded it — `app_modular.js`'s `FILE_MAPPING` named
   `_complex.js`. Whether the tie was a rendering bug or a musical error was never recorded, so the
   file that actually shipped is the one kept here. If you use this bank, render that question and
   decide.

2. **`questions_4-4_4m_C-major_simple.js` and `questions_6-8_2m_C-major_simple.js` were empty stubs**
   — headers promising Q41–Q50 and a 6/8 set that were never written. Archived, not kept. The 4/4
   4-measure and 6/8 material does not exist.
