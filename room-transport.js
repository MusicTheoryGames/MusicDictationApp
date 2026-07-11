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
 * SCOPE OF THIS MODULE (today): the teacher-side room lifecycle — `createRoom` and the
 * "DB is truth" read (`fetchRoom` + the pure `assembleRoom`). The INTERACTIVE state machine
 * — students joining/leaving, assigning a rhythm, answering, revealing — is deliberately NOT
 * here yet. Those mutations must honour core/room.js's rules (a closed room is terminal; no
 * answering after a reveal; a new round atomically clears the previous answers), which needs
 * the shell to validate each transition through `reduce()` and then persist it via atomic,
 * RLS-guarded writes (Postgres does not run the JS reducer). They land in the next step; until
 * then this module does not expose them.
 *
 * PURITY: core/room.js stays pure; this module owns all I/O. It is injected with the Supabase
 * client, an entropy source, and a clock (`now`) rather than importing them, so the browser
 * passes its vendored client + crypto and the node integration harness passes the npm client +
 * node crypto — the validation logic under test is identical. (Persisted timestamps come from
 * the database clock, not `now()` — see `createRoom`.)
 */
import { emptyRoom, codeFromBytes } from './core/room.js';

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
 * Build the live-room transport (teacher-side lifecycle: create + read).
 *   supabase — a configured supabase-js client (already able to sign in anonymously).
 *   deps.randomBytes(n) — returns n integers in 0..255 (crypto.getRandomValues in the
 *     browser, node:crypto.randomBytes in the harness); used for room codes.
 *   deps.now() — current time in ms (Date.now); used only to satisfy core/room.js
 *     `emptyRoom`'s timestamp validation. The persisted created / teacher_last_seen come from
 *     the database clock (column defaults), which is authoritative and free of client skew.
 * `createRoom` needs an authenticated session (it stamps teacher_uid = auth.uid()).
 * `fetchRoom` is a read gated by RLS (it returns null for a room this client may not see),
 * so it does not require one itself.
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

  return {
    assembleRoom,

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
     * Read the room as it stands — the "DB is truth" read. Calls the `get_room` SQL function
     * (supabase/migrations/0001_live_room.sql), which returns the room, its roster, and its
     * answers gathered in ONE statement so the three are a single consistent snapshot (three
     * separate SELECTs could straddle a concurrent round change). RLS still applies inside
     * it, so this returns null for a room the client may not see, and a student sees only its
     * own roster/answer rows (class-level derivations require the teacher's read — see the
     * module note). Assembles the result into a core/room.js Room. This is what a Realtime
     * change will re-run.
     */
    async fetchRoom(code) {
      const { data, error } = await supabase.rpc('get_room', { p_code: code });
      if (error) throw new Error(`room-transport: fetchRoom failed — ${error.message}`);
      if (!data) return null;
      return assembleRoom(data.room, data.students, data.answers);
    },
  };
}

const RoomTransport = { assembleRoom, createRoomTransport };
export default RoomTransport;
