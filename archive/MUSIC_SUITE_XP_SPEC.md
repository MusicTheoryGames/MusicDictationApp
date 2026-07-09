# Music‑Theory Games — Shared XP & Account Spec (proposal)

**Audience:** Staff Commander / Grand Staff Prix team
**From:** the Rhythm‑game (BeatQuest) side
**Status:** proposal for review — nothing here is built into Staff Commander yet
**Goal:** let every game in the suite (Notes, Rhythm, and whatever comes next) share **one student account** and one **fair, farm‑resistant XP system**, so a student's progress and standing are coherent across the whole ecosystem.

---

## 0. TL;DR / what we're asking of the Staff Commander team

1. **Namespace the cloud `data` blob per game and make saves *merge‑preserve*** (see §1). Today `player_save` overwrites the whole blob, so a second game would wipe Staff Commander's fields (and vice‑versa). This is the one change we need in your app before two games can share an account safely.
2. **Adopt the shared XP contract** in §3 — award XP as `BASE × difficulty × quality × novelty`, tagged with a **skill domain**, instead of a game‑specific score. (Concretely: move Staff Commander's speed reward into a *capped quality* term, and rate note‑game content on the shared 1–10 difficulty scale in §4.)
3. **Confirm the per‑skill + UMK model** in §5 (separate skill XP + a computed "Universal Music Knowledge" meta‑score) and the leaderboard mapping in §6.
4. **Send us your current XP‑award formula** (where `profile.xp` is incremented during gameplay) so we can calibrate the shared constants. We could not read it remotely.

---

## 1. Account model (already good) + the one required change

The existing model is solid and we want to reuse it as‑is:

- **Identity = handle + PIN** (global player), optional `class_code`. Teachers use Supabase Auth.
- **RLS deny‑all + SECURITY DEFINER RPCs** (`player_signup`, `player_login`, `player_save`, `class_roster`, `global_board`, …). Anon key is publishable/safe to ship.
- **Sign‑in carries across the suite** via `localStorage['gsp3d.cloudauth'] = {handle, pin}` — **provided all games are served from the same origin.** A game launched from the Staff Commander hub reads that key and is already "signed in"; no second login. (If a game is ever on a different domain, localStorage isn't shared and we'd need a token hand‑off — so please keep suite games same‑origin.)

**The required change — namespace + merge‑preserve `players.data`:**

Today each app builds `data` from only *its own* fields and `player_save` replaces the entire blob. Two games therefore clobber each other. Fix:

```
players.data = {
  gsp3d:     { …note‑game progress… },   // Staff Commander owns this key
  beatquest: { …rhythm progress… },      // rhythm game owns this key
  skills:    { pitch:{xp}, rhythm:{xp}, … }, // per‑skill XP (see §5)
  umk:       <number>                    // computed meta‑score (see §5)
}
```

Every game must **read the full `data`, update only its own key(s), and write the full blob back** (read‑merge‑write). Please update Staff Commander's `toCloudData`/persist so it **preserves keys it doesn't own** (or move its current fields under `data.gsp3d`). This is the single blocking change.

> Optional but cleaner: a `player_save_partial(handle, pin, path, value)` RPC that deep‑merges server‑side, so clients can't accidentally drop another game's data. Not required if every client is disciplined about read‑merge‑write.

---

## 2. Why not "one shared score"

A single shared XP pool re‑creates the classic problem: students grind whichever game pays fastest, the board stops reflecting skill, and one skill gets neglected. So we separate XP **per skill** and compute a **breadth‑weighted meta‑score** on top (§5). Best of both: fair per‑skill competition *and* one motivating headline number.

---

## 3. The universal XP contract (works for ANY game)

Games do **not** invent their own XP scale. Each success is reported as a standardized *learning event* to one shared function:

```
XP = BASE × difficulty(D) × quality(Q) × novelty(N)
```

- **BASE** — one constant for the whole suite (normalization anchor). Proposed **BASE = 10**.
- **difficulty D (1–10)** — the content's challenge on the **shared rubric** (§4). This is the anti‑farm core *and* the cross‑game equalizer: *"difficulty 6 pays the same XP in any game."* Suggested multiplier: `D` (linear) or a mild `D^1.15`.
- **quality Q** — clean / first‑try / accurate = **1.0**; hints, retries, or errors scale down to a floor (~**0.4**). **Speed lives here as a small, CAPPED bonus** (e.g. up to +0.2) so a fast‑but‑easy run can't out‑earn a hard one. This preserves Staff Commander's racing feel without letting speed dominate.
- **novelty N** — fresh material = **1.0**; the *same* item repeated decays toward a floor (~**0.3**) (per‑item exposure decay). Kills round‑looping.

**No flat‑per‑round, no volume rewards, no time‑farming.**

Worked examples (BASE 10):
- Clean Level‑1 rhythm round, D≈2, fresh → `10 × 2 × 1.0 × 1.0 = 20 XP`
- Clean syncopation round, D≈8, fresh → `10 × 8 × 1.0 × 1.0 = 80 XP`
- That easy round looped → `10 × 2 × 1.0 × 0.3 ≈ 6 XP`

Hard‑clean‑fresh pays ~4× easy; repetition collapses. Identical logic in every game.

Every award is tagged with a **skill domain** (`pitch`, `rhythm`, `interval`, `harmony`, …) so it routes to the right pool (§5).

---

## 4. The shared difficulty rubric (1–10) — the key artifact

One page every game's designer rates their content against, so difficulty means the same thing suite‑wide. Draft:

| D | Meaning | Notes‑game example | Rhythm‑game example |
|---|---|---|---|
| 1 | single, simple, slow | one note, middle staff | steady quarter beat |
| 2 | basic vocabulary | notes on the staff, no ledger | quarters + eighths |
| 3 | + one new element | + a ledger line / rest | + rests, half/whole |
| 4 | small combinations | small intervals in context | + dotted quarter |
| 5 | full core vocabulary | full staff, both clefs | + sixteenths |
| 6 | mixed, faster | + accidentals / key context | + dotted‑eighth‑sixteenth |
| 7 | advanced patterns | + intervals/chords at speed | + triplets / syncopation |
| 8 | chromatic / compound | chromatic reading | compound (6/8) meter |
| 9 | high load | fast tempo, wide range | mixed meter, fast |
| 10 | expert | modulation / atonal reading | irregular meter, expert tempo |

*(Each game maps its own levels onto these numbers. BeatQuest's Hall ladder maps roughly Level 1 → D2 up to compound/syncopation → D8.)*

---

## 5. Per‑skill XP + Universal Music Knowledge (UMK)

- **Per‑skill XP pools** (`data.skills.pitch.xp`, `data.skills.rhythm.xp`, …) are the source of truth and drive **per‑skill leaderboards**. Fair, farm‑resistant, and they tell a teacher exactly where a student is strong/weak. Every future game feeds the pool for its skill.
- **UMK = a computed, breadth‑weighted meta‑score** — the headline "musicianship" number and the flagship suite board. The *formula matters*: a naive sum re‑opens farming, so UMK must reward **breadth + balance**:
  1. convert each skill's XP to a **skill level via a diminishing curve** (e.g. `level ≈ √xp`), so the 10,000th point in one skill is worth far less than the first thousand;
  2. `UMK = Σ(skill levels)` weighted so **balance pays** — either weight the *lowest* skills more (weakest‑link), or add a bonus that grows as skills even out (low variance).
  Net effect: a well‑rounded musician outranks a one‑skill grinder with the same raw XP. This encodes the pedagogical goal directly into the number kids chase.
- **Gems** (existing) can stay a single **shared spendable wallet** across the suite — currency doesn't need the per‑skill split that ranking XP does.

---

## 6. Leaderboard mapping (minimal schema change)

- **UMK board = the existing board.** Repurpose `players.xp` / `global_board` to hold **UMK** (recomputed from per‑skill XP on each save). The flagship board already exists.
- **Per‑skill boards = new, small RPCs** that read `data.skills.<skill>.xp` (e.g. `skill_board(p_skill, p_limit)`), same RLS/SECURITY‑DEFINER pattern as the current boards.
- Class rosters can show UMK and/or per‑skill columns for teachers.

---

## 7. The shared `awardXP` module (the "plug‑in any game" piece)

A tiny shared client helper (+ optional RPC) is the whole integration surface:

```
awardXP({
  game,        // 'beatquest' | 'gsp3d' | …
  skill,       // 'rhythm' | 'pitch' | 'interval' | 'harmony' | …
  difficulty,  // 1–10, from the rubric
  quality,     // 0.4–1.2 (clean=1.0; speed adds a capped bonus)
  novelty,     // 0.3–1.0 (fresh=1.0)
  itemKey      // for per‑item novelty decay
}) -> xpAwarded
```

It applies the formula (§3), updates `data.skills.<skill>.xp`, recomputes `data.umk`, and read‑merge‑writes the blob via `player_save`. **A new game only has to (a) rate its content 1–10 and (b) report solved‑items‑with‑quality.** Everything else — formula, normalization, novelty decay, skill routing, UMK, leaderboards — is shared.

---

## 8. What we need back from you

1. **Agree to §1** (namespace `data` + merge‑preserve saves) — the one blocking change.
2. **Send your current XP‑award formula** (where `profile.xp` increments in gameplay) so we can calibrate BASE and the constants against real numbers.
3. **Confirm §5/§6** (per‑skill + UMK, reuse the existing board as UMK) and whether you want us to author the shared `awardXP` module + the rubric as the reference implementation.
4. **Confirm same‑origin hosting** for suite games (so the handle+PIN sign‑in carries over).

Once §1 and #2 land, we'll finalize the rubric numbers and the UMK formula constants, ship the shared `awardXP` module, and retrofit both games onto it (BeatQuest first, since it's the immediate second game).
