# Music Dictation App — Review, Competitive Landscape & Plan to Lead the Category

> Working strategy doc. Created 2026-06-25. Reference + update as we build.
>
> **Research note:** This synthesis is from domain knowledge (cutoff Jan 2026) + a direct code review of this repo. A live web-research pass to refresh 2026 prices and pull real teacher-complaint quotes is still TODO (parallel research agents hit an account session limit on first attempt). Verify any specific price before quoting it publicly.

---

## Part 1 — Honest review of what you have

**What's genuinely good:**
- **The wedge is real.** Live, teacher-controlled, multi-device classroom dictation ("Kahoot for ear training") is the single most valuable thing in this repo. Almost nobody does *real dictation* in a *live classroom game* format. This is the entire reason to exist.
- **Real notation, not Unicode hacks.** Using VexFlow for true engraving (proper beaming, bar lines, percussion clef for rhythm) puts you above the many toy apps that fake notation. `VEXFLOW_LESSONS.md` shows the hard tuition is already paid.
- **The drag-rhythm-tiles interaction** for rhythm dictation is pedagogically right — students build rhythm from rhythmic "words," mirroring how rhythm is actually taught.
- **Progressive reveal** (unlock beats as the class succeeds) is a genuinely good classroom mechanic no commercial competitor has.

**What's holding it back (technical):**
- **No real architecture.** 13 HTML entry points, a 372 KB `app.js`, a 669 KB `app.js.backup`, dozens of one-off scripts (`crop-pngs.js`, `extract_questions_*.js`, 7 `questions_*.js` files), a stalled `modular-architecture` branch. Prototype graveyard, not a scalable codebase.
- **Hardcoded question banks.** Content is frozen JS files per (meter × key × difficulty). Doesn't scale to a curriculum; can't be authored by teachers. Need **procedural generation** + validation (already started: `validate_*.js`, `validate_classical_style.js` — productionize it).
- **No accounts, no persistence, no progress.** Rooms are ephemeral. No student identity, history, mastery tracking, or gradebook. For schools this is the gap between "fun demo" and "product they pay for."
- **Firebase config + API key committed in `index.html`** with open Realtime Database. Security issue AND student-data-privacy problem (student names going into Firebase). Must fix before real classroom use (Part 6).
- **Two different sync models** mixed: melodic uses Firebase, rhythm has WebSocket strings. Pick one real-time backend.
- **Audio is thin.** Web Audio square-wave clicks + basic synth read as "amateur." Audio quality is disproportionately important for an *ear-training* product — it's literally what users judge you on.

**Verdict:** You have the hardest-to-copy idea (live classroom dictation) and the hardest technical primitive (real notation) already working in prototype. Missing is everything that turns a prototype into a product: architecture, accounts/progress, content generation, polish, business model.

---

## Part 2 — The competitive landscape

Key insight: **the market is split between "good dictation, no classroom" and "good classroom, no real dictation." Nobody owns the intersection.**

### A. Dedicated ear-training / dictation tools (strong skill, weak classroom)
| Product | What it does | Real dictation? | Live classroom? | Model (verify prices) |
|---|---|---|---|---|
| **EarMaster** (Pro / Cloud / Schools) | Category leader. Intervals, chords, scales, rhythm imitation/reading/dictation, melodic dictation, sight-singing w/ mic. | **Yes** | School + cloud assignments, **not live game**; self-paced | ~$70 one-time desktop; Cloud sub; school licenses |
| **Auralia + Musition** (Rising Software) | Auralia = aural/ear training incl. dictation; Musition = theory. University standard. | **Yes** | MusicFirst-integrated async + gradebook; not live | Per-seat / institutional |
| **musictheory.net + Tenuto** | Free lessons + exercises; Tenuto adds ear training. | Recognition, limited | No | Free site; Tenuto ~$4 one-time |
| **Teoria.com** | Free aural & theory incl. melodic/rhythmic dictation drills. | Some | Basic teacher groups, async | Free / cheap |
| **uTheory** | Polished theory + ear training for AP/classroom; dashboard, assignments, mastery. | Ear training; limited dictation | Async + analytics; **not live** | Per-student/yr; teacher-free tier |
| **Functional Ear Trainer** (miles.be) | Free, beloved for *functional* (scale-degree) hearing. | No (recognition) | No | Free |
| **ToneGym / SoundGym** | Gamified ear training for producers; arcade feel, leaderboards. | No notation dictation | Social leaderboards only | Subscription |
| **Perfect Ear / Complete Ear Trainer / EarBeater / Good Ear** | Mobile ear-training drills. | Mostly recognition | No | Freemium |
| **Meludia** | Emotion/perception-based progressive ear training. | No notation dictation | School licenses | Subscription |

**Takeaway:** EarMaster and Auralia are the only ones doing *real dictation* seriously — both desktop-rooted, assignment-based, 2010-era feel. None is a *live, fun, multi-device classroom game.*

### B. Classroom / school platforms (strong classroom or curriculum, weak/no real dictation)
| Product | Overlap | Live classroom? | Notes |
|---|---|---|---|
| **SmartMusic** (MakeMusic) | Performance/practice with mic assessment; sight-reading. | Async assignments | Huge install base; **practice/performance**, not ear-dictation |
| **Sight Reading Factory** | Infinite procedurally-generated sight-reading. | Async; group/ensemble mode | **Procedural-generation north star** |
| **MusicFirst** (suite) | Aggregates Auralia/Musition, Noteflight, etc. + LMS/gradebook. | Async | Dominant **school distribution channel** — partner/competitor |
| **Quaver (QuaverEd)** | Full K-8 general-music curriculum, gamified, whiteboard-friendly. | Teacher-led whole-class | Owns elementary general music; not aural-skills depth |
| **Breezin' Thru Theory** | Gamified theory drills, timed challenges, leaderboards. | Async + class leaderboards | Closest in *spirit* to "fun classroom theory" but theory, not dictation |
| **Flat.io for Education / Noteflight Learn** | Browser notation + assignments. | Async | Notation/composition, not ear training |
| **Soundtrap for Education** (Spotify) | Collaborative DAW. | Real-time collab | Creation, not dictation |

### C. Generic classroom game tools teachers already hack for music
**Kahoot, Quizizz, Blooket, Gimkit, Nearpod, Pear Deck.** Teachers constantly improvise music-theory/ear-training rounds in these because they're fun and live — but they can't render notation, play controlled audio reliably, or do real dictation. **Direct evidence of demand for exactly your product:** teachers want "Kahoot that actually understands music."

### D. Consumer gamified apps (the polish/engagement bar)
**Yousician, Simply Piano/Guitar (JoyTunes), Duolingo Music, Melodics, Trala, NoteRush, Music Crab, Staff Wars, Rhythm Cat.** None do classroom dictation, but they set the **production-quality + engagement bar** students expect: streaks, XP, levels, daily goals, delightful audio/animation, adaptive difficulty. Current glassmorphism UI is decent, but audio + game-feel are below this bar.

### The gap, stated plainly
> **No product is simultaneously: (1) real music dictation, (2) a live multi-device classroom game, (3) modern consumer-grade polish + gamification, (4) sold into schools with progress/gradebook.** EarMaster has #1, Kahoot-style tools have #2's feel, Duolingo/Yousician have #3, MusicFirst/uTheory have #4. **Be the first to combine all four around dictation.**

---

## Part 3 — Positioning: how you become category-leading

**One-line positioning:** *"The live ear-training game for music classrooms — real melodic & rhythm dictation that plays like Kahoot and tracks like a gradebook."*

**Beachhead:** **AP Music Theory + high-school theory classes.** Dictation is explicitly tested/scored on the AP exam (melodic + harmonic dictation, fixed number of plays); teachers feel acute pain creating practice; the audience is narrow enough to dominate; these teachers talk to each other (NAfME / state MEA conferences, Facebook groups, r/MusicEd). Win this, then expand down to middle-school general music and up to college aural skills.

**Three moats, in order:**
1. **Live-classroom dictation engine** (existing wedge — make it bulletproof and fun).
2. **Procedural content + auto-validation** so exercises are infinite + curriculum-aligned (`validate_*.js` is the seed; Sight Reading Factory proves it's defensible).
3. **Progress data + gradebook + LMS sync** so the product becomes *infrastructure* a teacher can't rip out mid-semester.

---

## Part 4 — Product roadmap (phased)

### Phase 0 — Foundation (make it a real codebase) — weeks 1–4
- Collapse 13 HTML pages + mega `app.js` into **one app** (React/Svelte/Vite, or at minimum proper modules). Delete `app.js.backup`, scratch scripts, dead branches; preserve question-validation logic + VexFlow lessons.
- Pick **one** real-time backend. Move Firebase config server-side; lock DB rules; stop putting raw student names in an open DB (Part 6).
- Stand up **accounts**: teacher accounts + lightweight student identity (class roster, not PII-heavy). Persist attempts.

### Phase 1 — Nail the live classroom MVP — weeks 4–10
- Rock-solid **room flow**: teacher launches a dictation round, students join by code (+ Google Classroom), synchronized audio, live answer tracking, progressive reveal, end-of-round leaderboard.
- **Both modes** polished: melodic (multiple-choice → then free-entry notation) and rhythm (drag tiles).
- **Audio overhaul** (non-negotiable): high-quality sampled piano (Tone.js Sampler / soundfonts) instead of square waves; clean metronome/count-in; tempo + "number of plays" controls mirroring the AP exam.
- Game feel: count-in, sound design, score animation, "all answers in" moment, simple streak/XP.

### Phase 2 — Content engine — weeks 8–16 (overlaps)
- **Procedural generation** of melodic + rhythmic items parameterized by key, meter, difficulty, rhythmic vocabulary, intervals/scale degrees — gated by **style validators** (tonality, cadence, beat-count, classical-style already written). Replaces frozen `questions_*.js`.
- **Difficulty ladder / curriculum map** aligned to AP Music Theory + typical aural-skills sequence (stepwise diatonic → leaps → chromaticism; simple → compound → syncopation → triplets).
- Teacher **authoring/curation**: pick parameters or hand-pick items, save sets, assign as homework.

### Phase 3 — Progress, assignments, gradebook — weeks 14–22
- Per-student **mastery tracking** + spaced repetition (auto-target weak intervals/rhythms — makes solo mode sticky).
- **Async assignments** + auto-grading + **gradebook export / Google Classroom / Clever / Canvas** sync. Converts "fun activity" into "the tool I run my class on."
- Solo **practice mode** with daily goals, streaks, skill tree (consumer growth loop).

### Phase 4 — Polish, expansion, monetize — weeks 20+
- Harmonic dictation (chords/cadences), sight-singing with mic pitch detection (live + classroom), bass-line dictation.
- Down-market to middle-school general music; up-market to college aural skills.
- Accessibility (keyboard nav, screen-reader labels, colorblind-safe — schools require it).
- Native-feeling PWA / app-store wrappers for the consumer/solo side.

**Sequencing principle:** every phase keeps the *live classroom* loop working and improving — the thing nobody can copy quickly.

---

## Part 5 — Business model & go-to-market

**Model — "free for teachers, paid for schools" (proven music-ed pattern):**
- **Free tier:** any teacher runs live rounds with generated library + basic class play. Viral teacher-to-teacher growth engine (like Kahoot).
- **Paid (school/teacher Pro):** assignments, gradebook/LMS sync, analytics, full content library, custom authoring, AP-exam-mode. Price per-teacher or per-student/year (music-ed software typically ~low-single-digits to ~$15/student/yr, or a few-hundred-dollar teacher/site license — **verify 2026 comps**).
- **Optional consumer/solo subscription** for independent student practice; funnels from classroom exposure.

**Go-to-market sequence:**
1. **Beachhead:** AP Music Theory & HS theory teachers. Get 20–50 classrooms on free live mode; obsess over feedback.
2. **Distribution:** NAfME national + **state MEA conferences**, Facebook teacher groups, **r/MusicEd**, YouTube demos, **Teachers Pay Teachers** (materials + SEO).
3. **SEO/content:** own "AP music theory melodic dictation practice," "rhythm dictation game," "ear training for classrooms."
4. **Channel:** explore listing/integrating via **MusicFirst** (dominant school aggregator) once solid — distribution, even if also a competitor.

---

## Part 6 — Compliance (before any real classroom use)
US K-12 means student-data-privacy is a gate, not an afterthought:
- **FERPA** (education records), **COPPA** (under-13 — schools can consent on parents' behalf only if configured for it), **SOPIPA** + patchwork of **state student-data-privacy laws**.
- Must-dos: get the **Firebase API key + open Realtime DB out of client HTML**, lock DB rules, **minimize PII** (roster IDs / first-name-last-initial, not full names in an open store), add privacy policy + signable DPA for districts, consider the **Student Privacy Pledge**. Many districts won't pilot without this.

---

## Part 7 — Suite architecture & platform (decided 2026-06-26)

**This is not one app — it's a SUITE of music-theory modules.** Today there are two, stitched together only by `home.html` ("suite by hyperlink"):

| Module | Files | Notation engine |
|---|---|---|
| **Rhythm Dictation** ("Beat Quest") | `rhythm-student/teacher/practice.html`, `beatquest.html` | Pre-rendered **image glyphs** + CSS 16th-grid (the alignment work — *do not touch*) |
| **Melodic Dictation** | `index.html` + `app.js` (~8,000 lines) | Live **VexFlow 4.2.2** + Tone.js |

Future modules: interval ID, chord quality, key signatures, etc.

**Decision: shared shell hosts pluggable modules.** Identity, theme, login, room/classroom, and progress live at the SUITE level — not inside any one game. Each game is a module that plugs in. The two games render notation differently and that's fine — they share the *shell*, not the *renderer*.

```
BEATQUEST SUITE  (one web codebase → PWA / Tauri / Capacitor)
├─ Shared shell:  identity · THEME SWITCHER · login · room/classroom · progress
│     └─ Theme (MPC / Manuscript / Arcade / Brutalist) applies across EVERY module
├─ Module: Rhythm Dictation   (image-glyph engine — the alignment work, frozen)
├─ Module: Melodic Dictation  (VexFlow + Tone — app.js)
└─ Module: …future theory games
        │
        ├─ Web (PWA)          ├─ Desktop (Tauri)        └─ Mobile (Capacitor → iOS/Android)
```

**Platform decision: stay on the web stack; do NOT switch languages.** The beat-alignment / notehead / time-signature work is *logic + assets*, not language-specific — it runs unchanged in any web shell. Standalone apps come from *wrapping* (PWA + Tauri desktop + Capacitor mobile), not rewriting. A native rewrite (Swift/Kotlin/Flutter) is the ONLY path that would destroy that work — so we avoid it. Classroom = a backend (Supabase/Firebase/WebSocket), which is language-agnostic. Optional, incremental: consolidate the vanilla-JS sprawl into Svelte/React for maintainability — still JS, notation logic ports directly; not a prerequisite.

**Theme switcher is a SUITE-wide setting** (shared `suite-theme.css` + `suite-theme.js`, persisted), so picking "Arcade" re-skins every module. Themes are **cosmetic only** — they must never alter the rhythm module's glyph positioning/time-signature/bar-line geometry.

## Immediate next steps (this week)
1. **Commit to the wedge:** "live classroom dictation for AP/HS theory" as the product identity. Everything else is downstream.
2. **Lock down Firebase** (rotate the committed key, close the open DB) — fastest-to-fix real risk in the repo.
3. **Architectural reset:** consolidate onto one app + one backend; salvage VexFlow rendering + `validate_*.js`, delete prototype sprawl.
4. **Audio upgrade spike:** swap square-wave synthesis for sampled piano — biggest perceived-quality jump for least effort.
5. **Re-run live web-research pass** (after session-limit reset) to attach current 2026 prices + real teacher-complaint quotes, then turn Phase 0–1 into a concrete technical implementation plan.

**Recommended order:** (2) → (3) → (1) → stop the bleeding + stand up foundations while strategy is fresh.

---

## Open TODOs / decisions to revisit
- [ ] Live web-research refresh (2026 prices, user complaints, scale numbers)
- [ ] Choose framework (React vs Svelte vs vanilla-modular) for the consolidation
- [ ] Choose single real-time backend (Firebase locked-down vs alternative)
- [ ] Confirm AP Music Theory exam dictation format details to mirror in "exam mode"
- [ ] Decide PII model for student identity (roster ID scheme)
