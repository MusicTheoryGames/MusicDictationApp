/**
 * @file core/room.js
 * PURE state logic for the live dictation room (VISION §7/§8).
 *
 * No effects: no DOM, no network, no clock, no randomness. `now` (a timestamp)
 * and entropy (bytes) are injected. A separate imperative shell — the Supabase
 * transport in `room-transport.js` — owns all effects. Its read path (`assembleRoom` +
 * `fetchRoom`) and the teacher's round lifecycle exist: ASSIGN is wired (`assignRhythm`,
 * validated here and persisted atomically), plus heartbeat/close; ANSWER and REVEAL over
 * the wire are next. The shell (JS) calls `reduce()` to validate each DOMAIN transition
 * (ASSIGN, ANSWER, REVEAL); pure lifecycle pings (heartbeat/close) carry no domain content
 * and skip it. *Authorization* (only the teacher assigns/reveals; a student writes only
 * their own answers) is enforced by row-level security keyed on `teacherUid` and the
 * answering `uid`; closed-is-terminal by a database trigger. This module enforces *state
 * validity* only.
 *
 * RHYTHM MODEL. A room is created for ONE meter, and carries a `figures`
 * VOCABULARY — a map `{ figureId: beats }` of the figures valid in this room
 * (the level's figures: the simple `core/rhythm-figures.js` set, or the compound
 * `cd-*` set, each `cd-*` spanning one dotted-quarter beat so `beats === 1`). A
 * round's `rhythm` is an ordered list of figure cells `{ figureId, onset, beats }`
 * that tiles the beat grid `[0, beatCount(meter, bars))` exactly; every cell's
 * `figureId` must be in the vocabulary and its `beats` must match the vocabulary.
 * A figure may span several beats (a half note is `beats: 2`), so figure count is
 * NOT beat count. Answers and reveals key on a figure's ONSET beat. Total beats
 * are ALWAYS meter-derived (`beatCount`) — never `measureCount * 4`, never
 * `rhythm.length` (VISION §8). The room is a plain, JSON-serialisable object.
 *
 * Run with:  node --test            (from core/)
 *        or  node --test core/room.test.js
 */

// ---- room codes: Crockford base32, excluding I, L, O, U (VISION §8) ----
// 32 symbols so a byte maps uniformly (256 / 32 = 8, no modulo bias).
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 6;

/** True iff `code` is a well-formed room code. */
export function isValidCode(code) {
  if (typeof code !== 'string' || code.length !== CODE_LENGTH) return false;
  for (const ch of code) if (CROCKFORD.indexOf(ch) === -1) return false;
  return true;
}

/**
 * Map injected random bytes to a room code. The transport supplies the entropy
 * (e.g. crypto.getRandomValues) so generation stays pure and testable here.
 * Requires at least CODE_LENGTH values, each an integer in 0..255; throws
 * otherwise so a bad entropy source can never emit an invalid code.
 */
export function codeFromBytes(bytes) {
  if (!bytes || bytes.length < CODE_LENGTH) {
    throw new Error(`codeFromBytes needs at least ${CODE_LENGTH} bytes`);
  }
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const b = bytes[i];
    if (!Number.isInteger(b) || b < 0 || b > 255) {
      throw new Error(`codeFromBytes: byte ${i} must be an integer in 0..255, got ${b}`);
    }
    out += CROCKFORD[b % 32];
  }
  return out;
}

// ---- meter → beats (never measureCount * 4, never rhythm.length) ----
/**
 * Total beats across `bars` measures. `meter.beatsPerMeasure` is an array of
 * beat counts per measure (length 1 for a constant meter, longer for a repeating
 * changing-meter cycle). Beats are counted in the meter's own beat unit, so
 * 6/8 → [2], 9/8 → [3], 12/8 → [4] (compound), 3/4 → [3], 4/4 → [4] (simple).
 * Meter-agnostic on the value, so 5/8 → [5] round-trips even though no UI
 * exposes it (VISION §8 schema non-preclusion).
 */
export function beatCount(meter, bars) {
  const bpm = meter && meter.beatsPerMeasure;
  if (!Array.isArray(bpm) || bpm.length === 0) {
    throw new Error('beatCount requires meter.beatsPerMeasure (non-empty array)');
  }
  if (!bpm.every((n) => Number.isInteger(n) && n > 0)) {
    throw new Error('beatCount requires positive integer beatsPerMeasure entries');
  }
  if (!Number.isInteger(bars) || bars < 0) {
    throw new Error('beatCount requires a non-negative integer `bars`');
  }
  let total = 0;
  for (let m = 0; m < bars; m++) total += bpm[m % bpm.length];
  return total;
}

/** Own-property check — never treats inherited keys (toString, __proto__…) as members. */
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// Tempo is a positive integer BPM. The ceiling is faster than any practical tempo AND keeps
// the value inside the transport's integer storage range (Postgres int4), so a tempo this
// module accepts can always be persisted — reducer-valid never fails at the storage boundary.
// Internal: the rule is enforced through emptyRoom/reduce, not exposed as public API.
const MAX_TEMPO = 1000;
const isValidTempo = (t) => Number.isInteger(t) && t > 0 && t <= MAX_TEMPO;

/** Validate + copy a figure vocabulary `{ figureId: beats }` (positive-int spans). */
function normalizeFigures(figures) {
  if (!figures || typeof figures !== 'object' || Array.isArray(figures)) {
    throw new Error('room figures must be an object { figureId: beats }');
  }
  const out = {};
  const ids = Object.keys(figures);
  if (ids.length === 0) throw new Error('room figures must be non-empty');
  for (const id of ids) {
    const beats = figures[id];
    if (!id) throw new Error('room figures: empty figureId');
    if (!Number.isInteger(beats) || beats < 1) {
      throw new Error(`room figures: ${id} must span a positive integer of beats`);
    }
    // defineProperty (not out[id]=) so a figure id like "__proto__" becomes an own
    // data property instead of invoking the prototype setter and silently vanishing.
    Object.defineProperty(out, id, { value: beats, enumerable: true, writable: true, configurable: true });
  }
  return out;
}

/**
 * True iff `rhythm` tiles exactly `totalBeats` using only figures from `figures`:
 * an ordered `{figureId, onset, beats}[]` whose onsets start at 0 and are
 * contiguous (`onset` = sum of preceding `beats`), each `figureId` present in the
 * vocabulary with a matching `beats`, ending exactly at `totalBeats`.
 */
export function isValidRhythm(rhythm, totalBeats, figures) {
  if (!Array.isArray(rhythm) || rhythm.length === 0) return false;
  let expected = 0;
  for (const c of rhythm) {
    if (!c || typeof c.figureId !== 'string') return false;
    if (!Object.prototype.hasOwnProperty.call(figures, c.figureId)) return false;
    if (!Number.isInteger(c.beats) || c.beats !== figures[c.figureId]) return false;
    if (!Number.isInteger(c.onset) || c.onset !== expected) return false;
    expected += c.beats;
  }
  return expected === totalBeats;
}

/** The onset beats (a figure starts on each) of the current round's rhythm. */
export function onsets(room) {
  return room.rhythm ? room.rhythm.map((c) => c.onset) : [];
}

/** True iff `beat` is a figure onset in the current round. */
function isOnset(room, beat) {
  return !!room.rhythm && room.rhythm.some((c) => c.onset === beat);
}

// ---- room state ----
export const ROOM_STATES = Object.freeze({
  LOBBY: 'lobby',
  ACTIVE: 'active',
  REVEALING: 'revealing',
  CLOSED: 'closed',
});

export const ROOM_TYPE = 'rhythm-dictation';

/**
 * A fresh room in the lobby, validated at construction so the reducer can never
 * be handed a structurally impossible room. `meter` (carrying `beatsPerMeasure`
 * and `beatUnit`, VISION §8) and `bars` are fixed for the room's life; `figures`
 * is the room's figure vocabulary `{ figureId: beats }`. `teacherUid` is the
 * owner (VISION §8 auth); `now` seeds `created` + the first heartbeat. Throws on
 * invalid inputs.
 */
export function emptyRoom(code, teacherUid, meter, bars, tempo, now, figures) {
  if (!isValidCode(code)) throw new Error('emptyRoom: invalid room code');
  if (typeof teacherUid !== 'string' || teacherUid.length === 0) {
    throw new Error('emptyRoom: teacherUid required');
  }
  if (!Number.isInteger(bars) || bars < 1) throw new Error('emptyRoom: bars must be a positive integer');
  beatCount(meter, bars); // throws if meter/bars are malformed
  if (typeof meter.beatUnit !== 'string' || meter.beatUnit.length === 0) {
    throw new Error('emptyRoom: meter.beatUnit required (VISION §8 schema)');
  }
  if (typeof meter.timeSignature !== 'string' || meter.timeSignature.length === 0) {
    throw new Error('emptyRoom: meter.timeSignature must be a non-empty string');
  }
  if (!isValidTempo(tempo)) throw new Error(`emptyRoom: tempo must be a positive integer BPM ≤ ${MAX_TEMPO}`);
  if (!Number.isFinite(now)) throw new Error('emptyRoom: now must be a finite timestamp');
  return {
    code,
    type: ROOM_TYPE,
    teacherUid,
    created: now,
    teacherLastSeen: now,
    // copy only the known schema fields: the room stays fixed under later mutation
    // AND JSON-serialisable regardless of any extra caller-supplied properties
    meter: { timeSignature: meter.timeSignature, beatsPerMeasure: [...meter.beatsPerMeasure], beatUnit: meter.beatUnit },
    bars,
    tempo,
    figures: normalizeFigures(figures),
    rhythm: null,
    state: ROOM_STATES.LOBBY,
    revealed: [],
    students: {},
    answers: {},
  };
}

/** Beats in the current round — ALWAYS meter-derived (never the figure count). */
export function roundBeatCount(room) {
  return beatCount(room.meter, room.bars);
}

/**
 * Fold one message into the room, returning a NEW state (never mutates `room`).
 * A closed room is terminal — every message is a no-op. Messages that would put
 * the room in an invalid state are IGNORED (return `room`): a malformed join, a
 * non-member or malformed answer, an answer/reveal on a beat that is not a figure
 * onset, an answer for a figure outside the room's vocabulary, or an ASSIGN whose
 * rhythm does not tile the meter with valid figures. Meter and bars are fixed at
 * creation; ASSIGN sets the round's rhythm (and optionally tempo) only.
 *
 *   { type:'JOIN', uid, name }             student joins / refreshes (uid + name required)
 *   { type:'LEAVE', uid }                  student leaves
 *   { type:'ASSIGN', rhythm, tempo? }      new round; rhythm must tile the meter with valid figures
 *   { type:'ANSWER', uid, beat, figureId } one vocabulary figure at an onset beat, by a joined student
 *   { type:'REVEAL', beat }                reveal the figure at an onset beat
 *   { type:'REVEAL_ALL' }                  reveal every figure
 *   { type:'HEARTBEAT' }                   teacher liveness ping (TTL basis)
 *   { type:'CLOSE' }                       close the room (terminal)
 * Unknown or malformed messages return the room unchanged.
 */
export function reduce(room, msg, now) {
  if (room.state === ROOM_STATES.CLOSED) return room; // terminal
  switch (msg && msg.type) {
    case 'JOIN': {
      if (typeof msg.uid !== 'string' || msg.uid.length === 0) return room;
      if (typeof msg.name !== 'string' || msg.name.length === 0) return room;
      if (!Number.isFinite(now)) return room; // timestamps must serialise losslessly
      const prev = has(room.students, msg.uid) ? room.students[msg.uid] : undefined;
      return {
        ...room,
        students: {
          ...room.students,
          [msg.uid]: { name: msg.name, joinedAt: prev ? prev.joinedAt : now, lastSeen: now },
        },
      };
    }
    case 'LEAVE': {
      if (!has(room.students, msg.uid)) return room;
      const students = { ...room.students };
      delete students[msg.uid];
      return { ...room, students };
    }
    case 'ASSIGN': {
      // New round in the room's fixed meter. The rhythm must tile the beat grid
      // with figures from the room's vocabulary. Optionally update tempo.
      if (msg.tempo != null && !isValidTempo(msg.tempo)) return room;
      if (!isValidRhythm(msg.rhythm, beatCount(room.meter, room.bars), room.figures)) return room;
      return {
        ...room,
        tempo: msg.tempo != null ? msg.tempo : room.tempo,
        // copy so the sender can't mutate the accepted rhythm after validation
        rhythm: msg.rhythm.map((c) => ({ figureId: c.figureId, onset: c.onset, beats: c.beats })),
        revealed: [],
        answers: {},
        state: ROOM_STATES.ACTIVE,
      };
    }
    case 'ANSWER': {
      // ACTIVE only (never once a reveal has begun — no copying the shown answer),
      // a joined student, a vocabulary figureId, on a real onset beat.
      if (room.state !== ROOM_STATES.ACTIVE) return room;
      if (!has(room.students, msg.uid)) return room;
      if (typeof msg.figureId !== 'string' || !has(room.figures, msg.figureId)) return room;
      if (!isOnset(room, msg.beat)) return room;
      const prev = room.answers[msg.uid] || {};
      return {
        ...room,
        answers: { ...room.answers, [msg.uid]: { ...prev, [msg.beat]: msg.figureId } },
      };
    }
    case 'REVEAL': {
      if (!isOnset(room, msg.beat)) return room;
      if (room.revealed.indexOf(msg.beat) !== -1) return room;
      return {
        ...room,
        revealed: [...room.revealed, msg.beat].sort((a, b) => a - b),
        state: ROOM_STATES.REVEALING,
      };
    }
    case 'REVEAL_ALL': {
      if (!room.rhythm) return room;
      return { ...room, revealed: onsets(room), state: ROOM_STATES.REVEALING };
    }
    case 'HEARTBEAT':
      if (!Number.isFinite(now)) return room;
      return { ...room, teacherLastSeen: now };
    case 'CLOSE':
      return { ...room, state: ROOM_STATES.CLOSED };
    default:
      return room;
  }
}

// ---- grading / reveal-unlock (pure reads, per figure onset) ----
/**
 * Per figure, `{ onset, correct }` — how many present students placed the right
 * figure at that onset. Ordered by onset. Empty if no round is assigned.
 */
export function beatCorrectCounts(room) {
  if (!room.rhythm) return [];
  const uids = Object.keys(room.students);
  return room.rhythm.map((cell) => {
    let correct = 0;
    for (const uid of uids) if ((has(room.answers, uid) ? room.answers[uid] : {})[cell.onset] === cell.figureId) correct++;
    return { onset: cell.onset, correct };
  });
}

/**
 * Onset beats every present student has correct — the reveal-unlock rule that
 * lights a reveal button (and drives Auto reveal). Empty roster or no rhythm → [].
 */
export function readyBeats(room) {
  const present = Object.keys(room.students).length;
  if (present === 0 || !room.rhythm) return [];
  return beatCorrectCounts(room).filter((c) => c.correct === present).map((c) => c.onset);
}

// ---- expiry (TTL basis: teacher heartbeat) ----
/** True iff the teacher has not pinged within `ttlMs` (VISION §8: 2h → unreadable). */
export function isExpired(room, now, ttlMs) {
  return now - room.teacherLastSeen > ttlMs;
}

const Room = {
  CODE_LENGTH,
  ROOM_STATES,
  ROOM_TYPE,
  isValidCode,
  codeFromBytes,
  beatCount,
  isValidRhythm,
  onsets,
  emptyRoom,
  roundBeatCount,
  reduce,
  beatCorrectCounts,
  readyBeats,
  isExpired,
};
export default Room;
