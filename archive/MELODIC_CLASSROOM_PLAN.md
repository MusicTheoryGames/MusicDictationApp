# MelodyQuest Classroom Mode — scoping plan (owner-gated; NOT built)

The ORIGINAL product (RHYTHM_DICTATION_SUMMARY.md) was a **classroom system**:
teacher controls exercises, students participate on their own devices, with a
projection view. The rhythm side still ships that surface (rhythm-teacher.html,
rhythm-student.html, projection.html, room codes). The rebuilt MelodyQuest is
currently solo-only — this plan scopes classroom parity. **Build is gated on the
owner** because it's a product-surface decision (which teacher workflows matter)
and may involve infrastructure (realtime sync) that costs money.

## What the rhythm classroom does today (parity checklist)
- Teacher page: create a room code; choose exercise parameters; start/stop; see
  per-student answers/accuracy as they arrive.
- Student page: join by room code; receive the teacher's exercise; answer; get
  feedback per teacher settings.
- Projection page: class-facing staff/prompt display (no answers).
- Transport: (inspect rhythm-teacher.html's mechanism — same transport should be
  reused verbatim for melodic; do NOT introduce a second sync stack.)

## Melodic classroom v1 (proposed scope)
1. **Teacher console** (melodic-teacher.html): pick level (M0–M26) + key/labels +
   hearings; "Play for class" drives the PROJECTION device's audio (one sound
   source in the room — matches how dictation is really taught); students answer
   on devices; live per-student accuracy grid using the existing grading meta.
2. **Student join flow**: same room-code UX as rhythm-student; receives
   {levelId, seed, settings} — the deterministic seed means every device builds
   the IDENTICAL round locally via melodic-round.js (no melody payload needed —
   the same trick the daily challenges use).
3. **Projection**: staff-only view of the round (reveal toggled by teacher),
   reusing renderStaff/renderTwoStaves.
4. Out of scope v1: grades persistence/rosters/LMS export.

## Decisions needed from the owner
- Is classroom parity wanted for launch, or is solo MelodyQuest the launch scope?
- If wanted: same transport as the rhythm classroom (whatever rhythm-teacher uses
  today) — confirm it still works / is still hosted.
- Should the teacher console expose the full M0–M26 ladder or a curated subset?
