# Melody Lands — design prototype

**Isolated prototype.** Does not modify or replace the deployed MelodyQuest product
(`melodic-game.html`, `core/*`, `suite-theme.css`, hub pages, etc.).

## What this is

A self-contained re-imagining of the first ~5 MelodyQuest rungs as a **journey of lands**,
with collectible ear tokens, combo juice, and a world map — same pedagogy, different feel.

| Land | Curriculum | Skill |
|------|------------|--------|
| The Hearth | M0 | Find home (tonic) |
| The Ridge | M1 | Contour (up / down / same) |
| Echo Cave | M1.5 | Memory span |
| Pulse Path | M2 | Rhythm-first (simplified tiles) |
| Name Stones | M3 | Degree labels 1̂–2̂–3̂ (no staff) |

## How to open

Open in a browser (file:// is fine; needs audio permission after first click):

```bash
open prototypes/melody-lands/index.html
```

Or from the app folder with any static server.

Progress is stored in `localStorage` under `melody-lands-proto-v1` only.

## Intentional limits

- Audio is simple Web Audio oscillators (not production samples).
- Pulse Path is a **concept** of M2 (pattern pick), not a full Hall rhythm-tile bank.
- No classroom, no cloud, no shared XP with the suite.
- This is a **design argument you can play**, not a merge candidate as-is.
