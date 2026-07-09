# Rhythmic syllable / counting systems — research (grounds the syllable feature)

Teacher-configurable "syllable system" layer for the suite (dictation + tapping). Every syllable
string cross-verified against primary sources (takadimi.net, giml.org, Wikipedia "Counting (music)",
uTheory, Open Music Theory). Feeds the suite design.

## THE axis that drives the data model: two families
- **Beat-oriented (position-based):** each subdivision SLOT of the beat has a fixed syllable; a note
  gets the syllable of the slot its **onset** lands on. → **position→syllable table**.
  Systems: **Takadimi** (the one Hall prints), **Gordon/Froseth (MLT)**, **Metric "1-e-&-a"**, **Eastman**.
- **Duration-oriented (note-value):** each note VALUE has a fixed syllable regardless of position. →
  **duration→syllable table**. Systems: **Kodály**, **French time-names**, fruit/word mnemonics.
The engine needs BOTH shapes + a `type` flag. (Takadimi was invented precisely because Kodály gives
the *beat itself* different syllables in different contexts.)

## Presets (ship these) — slot/value tables
- **Metric "1-e-&-a"** (position, numeric): simple slots `1 · e · & · a`; compound `1 · la · li` (÷3),
  `1 ta la ta li ta` (÷6). Triplet has 3 competing conventions (`1 trip let` / `1 la li` / `1 ti ta`) → teacher picks.
- **Takadimi** (position): simple slots `Ta · ka · di · mi`; compound `Ta · va · ki · di · da · ma`;
  triplet `Ta · ki · da`. Rest/tie = slot thought-not-voiced (parenthesized).
- **Gordon/Froseth (MLT)** (position, beat-function): simple `Du · Ta · De · Ta`; compound `Du · Ta · Da · Ta · Di · Ta`.
  Macrobeat always `Du`. Tie = onset + dash.
- **Kodály** (duration): quarter `ta`, two-8ths `ti-ti`, four-16ths `tika-tika`, dotted8+16 `tim-ka`,
  half `ta-a`, syncopation `syn-co-pa`, triplet `tri-o-la`, compound-3 `ta-ki-da`. Tie = vowel elongation. Rest = gesture/silent.
- **Eastman/McHose-Tibbs** (position, numeric): half-beat `te`, 16th slots `ta`; **16ths = "1-ta-te-ta"**
  (NOT "1-te-&-te"); compound `1 la li` / `1 ta la ta li ta`.
- **French time-names (Curwen)** (duration, the ancestor): `taa`, `taa-tay`, `ta-fa-te-fe`… (mostly historical).

## Edge cases (all systems): **only an ONSET is voiced.** Rests = silent/parenthesized/gesture;
ties/sustains = onset-only (beat systems) or vowel-stretch (duration systems). Simple vs compound =
two slot tables (simple 4-slot, compound 6-slot, beat-unit = dotted note).

## Generic + custom-definable schema (one JSON per system)
```jsonc
{ "id":"takadimi", "label":"Takadimi", "type":"position", "beatNumbered":false,
  "attribution":"Hoffman, Pelto & White (1996) JMTP v10",
  "rest":{"mode":"silent","show":"(paren)"}, "tie":{"mode":"onset-only"},
  "grids":{ "simple":{"slots":4,"syllables":["ta","ka","di","mi"]},
            "compound":{"slots":6,"syllables":["ta","va","ki","di","da","ma"]},
            "triplet":{"slots":3,"syllables":["ta","ki","da"]} },
  "audio":{"clips":{ "ta":"...", "ka":"...", ... }} }
// duration systems swap "grids" for "durations": { "quarter":"ta", "two-eighths":"ti-ti", ... }
// numeric systems set "beatNumbered":true → engine prepends the beat number 1..N to slot 0.
```
**A teacher's CUSTOM system is just another instance of this JSON** — the custom builder is the
DIFFERENTIATOR (no surveyed product offers teacher-defined syllables; uTheory ships presets as handouts only).

## Engine flow
quantize rhythm → beat grid; per ONSET: position systems → `grids[meterClass].syllables[slot]` (prepend
beat # if `beatNumbered` & slot 0); duration systems → `durations[classifyNoteValue(event)]`. Rests/ties: omit/paren/elongate per flags.

## Teacher config + rendering + audio
- **Per-class dropdown** (Metric / Kodály / Gordon / Takadimi / Eastman / Custom…) + a **custom builder**
  (fill the 4/6/3 slot rows, or the note-value rows; defaults pre-fill from the closest preset) + a
  **multi-row** option (Hall prints Counting + Kodály + Takadimi at once → allow ≥1 row under the notes).
- **Render:** VexFlow `Annotation` (`VerticalJustify.BOTTOM`) per note, color/font **per-theme** ([[no-universal-colors]]).
- **Audio:** pre-recorded **syllable clips** decoded to AudioBuffers + the **Web-Audio lookahead scheduler**
  (the same single-clock approach the tap-back uses) — sample-accurate, REQUIRED for tapping timing.
  Web Speech API can't time onsets reliably. Custom syllables → teacher records own clip, else TTS preview only.

## Copyright: all six presets are SAFE to ship. Attribute the named ones (Takadimi → 1996 article;
Gordon → Froseth/GIA syllables; Eastman → method not the book); never copy a publisher's chart art or
curated pattern sequence. Route Conversational Solfège into the Gordon preset; fruit mnemonics into the custom builder.

→ **This is a suite-wide layer** (dictation + tapping), teacher-configured, rendered per-theme, spoken via clips.
