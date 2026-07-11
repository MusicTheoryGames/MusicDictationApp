/**
 * @file room-transport.js
 * The imperative SHELL for the live dictation room — the app's path to Supabase for the
 * live room. (The verification scripts supabase/rls-check.mjs and
 * supabase/room-transport.integration.mjs also talk to Supabase directly, on purpose.) It
 * maps the pure model in core/room.js (schema + rules) onto the tables and row-level
 * security in supabase/migrations/0001_live_room.sql.
 *
 * STATE MODEL: the database is the single source of truth (owner decision, 2026-07-10).
 * A client changes the room by WRITING rows and RLS decides what each write may touch. To
 * READ the room you re-assemble it from the current rows with `assembleRoom`, which produces
 * a plain core/room.js Room. On a FULL-visibility read — the teacher's — the pure derivations
 * (readyBeats, beatCorrectCounts, onsets) work on it unchanged. A STUDENT's read is RLS-scoped
 * to that student's own roster/answer rows, so the assembled Room is that student's OWN view,
 * not the whole class: the class-level derivations (readyBeats/beatCorrectCounts) are only
 * meaningful on the teacher's read. There is no optimistic local copy to reconcile: you see a
 * write once it lands and you re-read. The live change-feed (Realtime subscription) that
 * triggers the re-read is a SEPARATE, later step.
 *
 * SCOPE OF THIS MODULE (today): the "DB is truth" read (`fetchRoom` + the pure `assembleRoom`),
 * the TEACHER's round lifecycle — `createRoom`, `assignRhythm` (start/replace a round),
 * `heartbeat` (TTL liveness), `closeRoom` — and students `joinRoom` / `leaveRoom` / `submitAnswer`.
 * Still deliberately NOT here: revealing — the next step.
 *
 * HOW A MUTATION IS MADE SAFE. Responsibilities are split by what the mutation carries. A
 * mutation with DOMAIN content — `assignRhythm` — is validated in the shell by folding it
 * through core/room.js `reduce()` against a fresh read, refusing a rejected transition before
 * any write (Postgres does not run the JS reducer). Pure LIFECYCLE ops — `heartbeat`,
 * `closeRoom` — carry no domain content, so they do NOT reduce(); they are plain guarded writes.
 * The DATABASE enforces, on every write path: AUTHORIZATION (RLS + `assign_round`'s teacher
 * check), ATOMICITY (`assign_round`'s answer-clear + rhythm-set are one transaction), and a
 * TERMINAL CLOSED ROUND (a trigger rejects any change to the closed rooms ROW, so the teacher
 * cannot reopen or re-run a closed round — by a direct write or a race, not only via reduce();
 * a DELETE teardown is still allowed). Post-close student JOINs are also blocked structurally — a
 * trigger on room_students that LOCKS the room row, so a join racing a close is serialized (race-safe
 * like assign_round), and student ANSWERs are accepted only while the round is ACTIVE (a second such
 * locking trigger on room_answers, so there is no answering after a reveal, race-safe). What the database does NOT
 * re-derive is a round's DOMAIN shape (rhythm tiling, tempo sign) on a DIRECT write that bypasses
 * the transport — those rules live only in core, and a teacher bypassing their own room's
 * transport is the honest-actor boundary, not guarded here. The reduce() pre-check for
 * assignRhythm is advisory under concurrency; the trigger and the FOR UPDATE lock in
 * `assign_round` are the hard backstops.
 *
 * PURITY: core/room.js stays pure; this module owns all I/O. It is injected with the Supabase
 * client, an entropy source, and a clock (`now`) rather than importing them, so the browser
 * passes its vendored client + crypto and the node integration harness passes the npm client +
 * node crypto — the validation logic under test is identical. (Persisted timestamps come from
 * the database clock, not `now()` — see `createRoom`.)
 */
import { emptyRoom, codeFromBytes, reduce, ROOM_STATES } from './core/room.js';

const UNIQUE_VIOLATION = '23505'; // room-code primary-key collision

/** ms since epoch, or null for a missing/blank timestamptz. */
function toMs(ts) {
  if (ts == null) return null;
  const ms = Date.parse(ts);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Rebuild a core/room.js Room from database rows (the "DB is truth" read). PURE: no client,
 * no clock — just the rows. `roomRow` is a `public.rooms` row; `studentRows` / `answerRows`
 * are the matching `room_students` / `room_answers` rows (any order). Returns null if there
 * is no room row. The shapes mirror the columns in supabase/migrations/0001_live_room.sql;
 * jsonb columns (meter, figures, rhythm) already arrive as parsed objects.
 */
export function assembleRoom(roomRow, studentRows = [], answerRows = []) {
  if (!roomRow) return null;
  const students = {};
  for (const s of studentRows) {
    students[s.uid] = { name: s.name, joinedAt: toMs(s.joined_at), lastSeen: toMs(s.last_seen) };
  }
  const answers = {};
  for (const a of answerRows) {
    (answers[a.uid] || (answers[a.uid] = {}))[a.beat] = a.figure_id;
  }
  return {
    code: roomRow.code,
    type: roomRow.type,
    teacherUid: roomRow.teacher_uid,
    created: toMs(roomRow.created),
    teacherLastSeen: toMs(roomRow.teacher_last_seen),
    meter: roomRow.meter,
    bars: roomRow.bars,
    tempo: roomRow.tempo,
    figures: roomRow.figures,
    rhythm: roomRow.rhythm ?? null,
    state: roomRow.state,
    revealed: roomRow.revealed ?? [],
    students,
    answers,
  };
}

// A fresh Crockford room code from the injected entropy source (6 bytes → 6 chars).
const codeFrom = (randomBytes) => codeFromBytes(randomBytes(6));

/**
 * Build the live-room transport (the "DB is truth" read, the teacher's round lifecycle, and the
 * student join/leave/answer verbs).
 *   supabase — a configured supabase-js client (already able to sign in anonymously).
 *   deps.randomBytes(n) — returns n integers in 0..255 (crypto.getRandomValues in the
 *     browser, node:crypto.randomBytes in the harness); used for room codes.
 *   deps.now() — current time in ms (Date.now); used only to satisfy core/room.js's timestamp
 *     validation (`emptyRoom`, `reduce`). Persisted timestamps come from the database clock
 *     (`assign_round`, `heartbeat` in the migration), not from here.
 * Every mutating verb needs an authenticated session and acts as that caller: the teacher verbs
 * (createRoom / assignRhythm / heartbeat / closeRoom) require the room's teacher (enforced by RLS
 * and the SQL guards), and the student verbs (joinRoom / leaveRoom act on the caller's own roster
 * row; submitAnswer upserts the caller's own answer). `fetchRoom` is a read gated by RLS (it
 * returns null for a room this client may not see), so it does not require a session itself.
 */
export function createRoomTransport(supabase, deps) {
  const { randomBytes, now } = deps;

  async function uid() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const id = data.session?.user?.id;
    if (!id) throw new Error('room-transport: not signed in (no auth session)');
    return id;
  }

  // Reject a Supabase rpc/query error (returned, not thrown, by the client) with a label.
  const failIf = (error, what) => {
    if (error) throw new Error(`room-transport: ${what} failed — ${error.message}`);
  };

  /**
   * Read the room as it stands — the "DB is truth" read. Calls the `get_room` SQL function
   * (supabase/migrations/0001_live_room.sql), which returns the room, its roster, and its
   * answers gathered in ONE statement so the three are a single consistent snapshot (three
   * separate SELECTs could straddle a concurrent round change). RLS still applies inside it,
   * so this returns null for a room the client may not see, and a student sees only its own
   * roster/answer rows (class-level derivations require the teacher's read — see the module
   * note). Assembles the result into a core/room.js Room. This is what a Realtime change will
   * re-run — and what the mutating verbs re-read to validate a transition through reduce().
   */
  async function fetchRoom(code) {
    const { data, error } = await supabase.rpc('get_room', { p_code: code });
    if (error) throw new Error(`room-transport: fetchRoom failed — ${error.message}`);
    if (!data) return null;
    return assembleRoom(data.room, data.students, data.answers);
  }

  return {
    assembleRoom,
    fetchRoom,

    /**
     * Teacher creates a room for one meter and figure vocabulary. Validates the whole shape
     * via core/room.js `emptyRoom` before writing (a bad room never reaches the table),
     * generates a Crockford code from injected entropy, and retries on the (astronomically
     * unlikely) code collision. A single INSERT, so it is atomic. Returns { code }. DB
     * defaults own type/state/revealed/created/teacher_last_seen.
     */
    async createRoom({ meter, bars, tempo, figures }) {
      const teacherUid = await uid();
      for (let attempt = 0; attempt < 5; attempt++) {
        const room = emptyRoom(codeFrom(randomBytes), teacherUid, meter, bars, tempo, now(), figures);
        const res = await supabase.from('rooms').insert({
          code: room.code,
          teacher_uid: room.teacherUid,
          meter: room.meter,
          bars: room.bars,
          tempo: room.tempo,
          figures: room.figures,
        });
        if (!res.error) return { code: room.code };
        if (res.error.code !== UNIQUE_VIOLATION) {
          throw new Error(`room-transport: createRoom failed — ${res.error.message}`);
        }
        // else: code collision — loop and mint a new one
      }
      throw new Error('room-transport: createRoom failed — could not find a free room code');
    },

    /**
     * Teacher starts (or replaces) a round. Re-reads the room and folds an ASSIGN through
     * `reduce()`, which rejects a rhythm that does not tile the room's fixed meter with its
     * figure vocabulary, a tempo that is not a positive integer BPM in core's supported range,
     * or a closed room; a rejected transition throws before any write. Then calls `assign_round`,
     * which clears the previous
     * answers and sets the new rhythm ACTIVE in one transaction (and re-checks teacher ownership
     * + not-closed server-side). `tempo` is optional — omitting it keeps the room's current tempo.
     */
    async assignRhythm(code, rhythm, tempo) {
      const room = await fetchRoom(code);
      if (!room) throw new Error(`room-transport: assignRhythm — room ${code} not found`);
      if (reduce(room, { type: 'ASSIGN', rhythm, tempo }, now()) === room) {
        throw new Error(
          `room-transport: assignRhythm rejected — the rhythm must tile ${code}'s meter with its ` +
          "figures, tempo (if given) must be a positive integer BPM in core's supported range, " +
          'and the room must not be closed',
        );
      }
      const { error } = await supabase.rpc('assign_round', { p_code: code, p_rhythm: rhythm, p_tempo: tempo ?? null });
      failIf(error, `assignRhythm ${code}`);
    },

    /**
     * Teacher liveness ping — refreshes the TTL basis (VISION §8) with the database clock. A
     * no-op on a room this caller does not own or that is closed (the SQL function's guards).
     */
    async heartbeat(code) {
      const { error } = await supabase.rpc('heartbeat', { p_code: code });
      failIf(error, `heartbeat ${code}`);
    },

    /** Teacher closes the room (terminal). Idempotent; RLS restricts the write to the teacher. */
    async closeRoom(code) {
      const { error } = await supabase.from('rooms').update({ state: ROOM_STATES.CLOSED }).eq('code', code);
      failIf(error, `closeRoom ${code}`);
    },

    /**
     * Student joins a room, or refreshes its display name on rejoin. Calls `join_room`, which
     * validates the name, rejects a missing or CLOSED room, and inserts the caller's OWN roster
     * row (auth.uid()). A student cannot read a room before joining, so this cannot fetch-then-
     * reduce; `join_room` — plus the room_students closed-write trigger — is the validator/guard.
     */
    async joinRoom(code, name) {
      const { error } = await supabase.rpc('join_room', { p_code: code, p_name: name });
      failIf(error, `joinRoom ${code}`);
    },

    /**
     * Student leaves — removes only its own roster row (`leave_room`); a no-op if the room is
     * already closed, matching core's LEAVE-after-CLOSE.
     */
    async leaveRoom(code) {
      const { error } = await supabase.rpc('leave_room', { p_code: code });
      failIf(error, `leaveRoom ${code}`);
    },

    /**
     * Student records one figure at a beat. Re-reads the room and folds an ANSWER through
     * `reduce()`, which rejects it unless the room is ACTIVE, the caller has joined, the figure is
     * in the room's vocabulary, and the beat is a real figure onset — throwing before any write.
     * Then upserts the caller's OWN answer row (RLS restricts it to `uid = auth.uid()`). The
     * `room_answers` active-only trigger is the hard, race-safe backstop on the ACTIVE phase (so a
     * reveal landing between the read and the write still blocks the answer); onset/vocabulary are
     * core domain rules, checked here in the shell, not re-derived in SQL.
     */
    async submitAnswer(code, beat, figureId) {
      const room = await fetchRoom(code);
      if (!room) throw new Error(`room-transport: submitAnswer — room ${code} not found`);
      const id = await uid();
      if (reduce(room, { type: 'ANSWER', uid: id, beat, figureId }, now()) === room) {
        throw new Error(
          `room-transport: submitAnswer rejected — the room must be ACTIVE, you must have joined, ` +
          `'${figureId}' must be a figure in the room, and beat ${beat} must be a figure onset`,
        );
      }
      const { error } = await supabase
        .from('room_answers')
        .upsert({ room_code: code, uid: id, beat, figure_id: figureId }, { onConflict: 'room_code,uid,beat' });
      failIf(error, `submitAnswer ${code}`);
    },
  };
}

const RoomTransport = { assembleRoom, createRoomTransport };
export default RoomTransport;
