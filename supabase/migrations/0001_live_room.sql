-- ============================================================================
-- Live dictation room — schema + row-level security (VISION §7/§8).
-- One Supabase project for the whole suite. Identity is an anonymous auth.uid()
-- (Supabase anonymous sign-in). SECURITY is enforced here by RLS; the pure state
-- RULES (tiling, onsets, reveal-unlock, closed-terminal) live in core/room.js.
--
-- Run in the Supabase SQL editor. Re-running REPLACES the policies, triggers, code constraint,
-- and helper functions with the same definitions (those converge); the tables are only
-- create-if-not-exists, so a pre-existing table's columns/keys/defaults are NOT reconciled —
-- this does not upgrade a different/older schema. The code CHECK re-add can fail if an invalid
-- room code was inserted since (or on the usual permission/lock/dependency errors).
--
-- The three RLS guarantees VISION §8 requires, checked by supabase/rls-check.mjs:
--   1. a student cannot write another student's answer,
--   2. a student cannot write the room's rhythm or revealed beats,
--   3. a student cannot read a room it has not joined.
-- ============================================================================

-- ---- tables -------------------------------------------------------------
create table if not exists public.rooms (
  code               text primary key,
  teacher_uid        uuid not null,
  type               text not null default 'rhythm-dictation',
  meter              jsonb not null,          -- { timeSignature, beatsPerMeasure, beatUnit }
  bars               integer not null,
  tempo              integer not null,
  figures            jsonb not null,          -- { figureId: beats } vocabulary
  rhythm             jsonb,                   -- [{ figureId, onset, beats }] or null until assigned
  state              text not null default 'lobby',
  revealed           integer[] not null default '{}',
  created            timestamptz not null default now(),
  teacher_last_seen  timestamptz not null default now()
);

create table if not exists public.room_students (
  room_code   text not null references public.rooms(code) on delete cascade,
  uid         uuid not null,
  name        text not null,
  joined_at   timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  primary key (room_code, uid)
);

create table if not exists public.room_answers (
  room_code   text not null references public.rooms(code) on delete cascade,
  uid         uuid not null,
  beat        integer not null,               -- figure onset
  figure_id   text not null,
  updated_at  timestamptz not null default now(),
  primary key (room_code, uid, beat)
);

-- room codes must be 6 chars of Crockford base32 (no I/L/O/U), per VISION §8.
-- Via ALTER (not inline) so it also applies to an already-created rooms table.
alter table public.rooms drop constraint if exists rooms_code_crockford;
alter table public.rooms add constraint rooms_code_crockford
  check (code ~ '^[0-9A-HJKMNP-TV-Z]{6}$');

-- ---- membership helpers (SECURITY DEFINER so policies don't recurse into RLS) --
create or replace function public.is_room_member(p_room text)
  returns boolean language sql security definer stable
  set search_path = public as $$
    select exists (select 1 from public.room_students s
                   where s.room_code = p_room and s.uid = auth.uid());
$$;

create or replace function public.is_room_teacher(p_room text)
  returns boolean language sql security definer stable
  set search_path = public as $$
    select exists (select 1 from public.rooms r
                   where r.code = p_room and r.teacher_uid = auth.uid());
$$;

-- ---- consistent-snapshot read -------------------------------------------
-- Returns a room with its roster and answers gathered in ONE statement, so all three are a
-- single snapshot (three separate client SELECTs could straddle a concurrent round change).
-- SECURITY INVOKER (the default): RLS below still decides visibility, so an outsider gets
-- NULL and a student sees only its own roster/answer rows. NULL when no visible room.
create or replace function public.get_room(p_code text)
  returns jsonb language sql stable
  set search_path = public as $$
    select jsonb_build_object(
      'room', to_jsonb(r),
      'students', coalesce((select jsonb_agg(to_jsonb(s)) from public.room_students s where s.room_code = r.code), '[]'::jsonb),
      'answers',  coalesce((select jsonb_agg(to_jsonb(a)) from public.room_answers  a where a.room_code = r.code), '[]'::jsonb)
    )
    from public.rooms r
    where r.code = p_code;
$$;

-- ---- RLS ----------------------------------------------------------------
alter table public.rooms         enable row level security;
alter table public.room_students enable row level security;
alter table public.room_answers  enable row level security;

-- rooms: teacher creates & owns; teacher OR a joined student may read; only the teacher writes.
drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms for select
  using (teacher_uid = auth.uid() or public.is_room_member(code));
drop policy if exists rooms_insert on public.rooms;
create policy rooms_insert on public.rooms for insert
  with check (teacher_uid = auth.uid());
drop policy if exists rooms_update on public.rooms;
create policy rooms_update on public.rooms for update
  using (teacher_uid = auth.uid()) with check (teacher_uid = auth.uid());
drop policy if exists rooms_delete on public.rooms;
create policy rooms_delete on public.rooms for delete
  using (teacher_uid = auth.uid());

-- room_students: a student joins/updates/leaves ONLY their own row; teacher reads the roster.
drop policy if exists students_select on public.room_students;
create policy students_select on public.room_students for select
  using (uid = auth.uid() or public.is_room_teacher(room_code));
drop policy if exists students_insert on public.room_students;
create policy students_insert on public.room_students for insert
  with check (uid = auth.uid());
drop policy if exists students_update on public.room_students;
create policy students_update on public.room_students for update
  using (uid = auth.uid()) with check (uid = auth.uid());
drop policy if exists students_delete on public.room_students;
create policy students_delete on public.room_students for delete
  using (uid = auth.uid());

-- room_answers: a student writes ONLY their own answers, and only into a room it has joined;
-- teacher reads all answers, student reads own.
drop policy if exists answers_select on public.room_answers;
create policy answers_select on public.room_answers for select
  using (uid = auth.uid() or public.is_room_teacher(room_code));
drop policy if exists answers_insert on public.room_answers;
create policy answers_insert on public.room_answers for insert
  with check (uid = auth.uid() and public.is_room_member(room_code));
-- UPDATE requires membership too (both the old row and the new one), so a student
-- cannot tamper after leaving, nor move an answer into a room it has not joined.
drop policy if exists answers_update on public.room_answers;
create policy answers_update on public.room_answers for update
  using (uid = auth.uid() and public.is_room_member(room_code))
  with check (uid = auth.uid() and public.is_room_member(room_code));
-- No DELETE policy on room_answers: answer deletion (a student clearing its own, the teacher
-- clearing the board for a new round) is a state-machine mutation and ships WITH the round
-- state machine, guarded, not here. Actively drop any answers_delete a superseded run
-- installed, so re-running converges on this delete-denied schema.
drop policy if exists answers_delete on public.room_answers;

-- ---- key columns are immutable on UPDATE ----
-- room_code + uid identify a roster/answer row; they must never change on UPDATE, so a
-- student cannot move a row to another room or uid — even between two rooms it has joined
-- (RLS with_check is enforced too; this trigger closes the remaining move paths).
create or replace function public.forbid_key_change()
  returns trigger language plpgsql as $$
begin
  if new.room_code <> old.room_code or new.uid <> old.uid then
    raise exception 'room_code and uid are immutable' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists room_students_pin_keys on public.room_students;
create trigger room_students_pin_keys before update on public.room_students
  for each row execute function public.forbid_key_change();
drop trigger if exists room_answers_pin_keys on public.room_answers;
create trigger room_answers_pin_keys before update on public.room_answers
  for each row execute function public.forbid_key_change();

-- ---- teacher round mutations (atomic + guarded) --------------------------
-- These own the multi-step / clock-stamped teacher actions that a plain client write cannot
-- do safely. DB-BOUNDARY GUARANTEES: authorization (RLS + the DEFINER teacher check),
-- atomicity (the whole function is one transaction), and a TERMINAL CLOSED ROUND — once closed,
-- the rooms row itself cannot be changed (the trigger below), so a teacher cannot reopen or
-- re-run a closed round by any UPDATE path. SCOPE of that guarantee: it is the rooms ROW only.
-- Post-close STUDENT JOINs are blocked too, structurally, by the room_students trigger further
-- below; ANSWERs are accepted only while the round is ACTIVE (the room_answers trigger further
-- below), which also blocks any post-close/post-reveal answer. Room teardown via DELETE is
-- intentionally allowed (TTL cleanup). What the database does NOT re-derive is the DOMAIN shape
-- of a round (that the rhythm tiles the meter with the room's figures, that tempo is a positive
-- integer): those rules live only in core/room.js and are enforced in the shell via reduce()
-- before assign_round is called — a teacher writing a malformed rhythm by BYPASSING the transport
-- is the honest-actor boundary, and duplicating the tiling rule in SQL would fork the source of truth.

-- TERMINAL CLOSED ROUND: once a room is closed, no update may CHANGE its rooms row. A row-identical
-- update (e.g. a redundant close) is allowed so closeRoom stays idempotent; any actual change is
-- rejected. This makes the rooms row terminal independent of the UPDATE path (a direct edit to
-- reopen or to change rhythm/tempo/reveals, or an assign_round that raced a concurrent close).
drop trigger if exists rooms_forbid_reopen on public.rooms; -- superseded name (a prior run installed it)
drop function if exists public.forbid_reopen();
create or replace function public.forbid_closed_mutation()
  returns trigger language plpgsql as $$
begin
  if old.state = 'closed' and new is distinct from old then
    raise exception 'room is closed (terminal)' using errcode = 'check_violation';     -- 23514
  end if;
  return new;
end $$;
drop trigger if exists rooms_forbid_closed_mutation on public.rooms;
create trigger rooms_forbid_closed_mutation before update on public.rooms
  for each row execute function public.forbid_closed_mutation();

-- Start a new round: clear the previous answers and set the new rhythm ACTIVE, in one
-- transaction so a reader never sees a new round carrying old answers. SECURITY DEFINER
-- because clearing answers needs to bypass the (deliberately absent) answer-delete policy;
-- it therefore checks teacher ownership itself. It locks the room row (FOR UPDATE) before
-- reading state so a concurrent closeRoom cannot interleave between the check and the write;
-- the forbid_closed_mutation trigger is the backstop if one still does.
create or replace function public.assign_round(p_code text, p_rhythm jsonb, p_tempo integer)
  returns void language plpgsql security definer
  set search_path = public as $$
declare v_state text;
begin
  if not public.is_room_teacher(p_code) then
    raise exception 'not the room teacher' using errcode = 'insufficient_privilege';   -- 42501
  end if;
  select state into v_state from public.rooms where code = p_code for update;
  if v_state = 'closed' then
    raise exception 'room is closed' using errcode = 'check_violation';                -- 23514
  end if;
  delete from public.room_answers where room_code = p_code;
  update public.rooms
     set rhythm = p_rhythm, tempo = coalesce(p_tempo, tempo), revealed = '{}', state = 'active'
   where code = p_code;
end $$;

-- Teacher liveness ping — the TTL basis (VISION §8), stamped by the DATABASE clock (not a
-- client clock). SECURITY INVOKER: the rooms UPDATE policy already restricts it to the
-- teacher; the extra predicates make it a no-op on a room this caller does not own or that is
-- closed.
create or replace function public.heartbeat(p_code text)
  returns void language sql security invoker
  set search_path = public as $$
    update public.rooms set teacher_last_seen = now()
     where code = p_code and teacher_uid = auth.uid() and state <> 'closed';
$$;

-- ---- student roster mutations (guarded) ----------------------------------
-- Students join/leave through these so the closed-terminal rule reaches roster writes too (RLS
-- alone does not check the parent room's state). CLOSED blocks a JOIN structurally: a trigger
-- rejects any INSERT/UPDATE of a room_students row whose room is closed, covering a direct client
-- write, not only join_room. It LOCKS the parent room row (FOR SHARE) before checking, so a
-- concurrent closeRoom cannot commit between the check and the insert — the insert either lands
-- while the room is still open, or waits and then sees it closed and is rejected. DELETE is
-- intentionally NOT trigger-guarded: a BEFORE DELETE guard would also fire during the FK cascade
-- of room teardown (breaking cleanup), and a student removing its own row is benign — leave_room's
-- own predicate makes leaving a no-op on a closed room. The trigger is SECURITY DEFINER so it can
-- read the room's state even for a JOINING non-member, whom RLS would otherwise show no room.
create or replace function public.forbid_closed_student_write()
  returns trigger language plpgsql security definer
  set search_path = public as $$
declare v_state text;
begin
  select state into v_state from public.rooms where code = new.room_code for share;
  if v_state = 'closed' then
    raise exception 'room is closed' using errcode = 'check_violation';   -- 23514
  end if;
  return new;
end $$;
drop trigger if exists room_students_forbid_closed on public.room_students;
create trigger room_students_forbid_closed before insert or update on public.room_students
  for each row execute function public.forbid_closed_student_write();

-- Join (or refresh display name on rejoin). SECURITY DEFINER so it can read the room to reject a
-- missing or closed one before inserting (a non-member cannot read rooms under RLS). Inserts the
-- caller's OWN row via auth.uid(), never a client-supplied uid, so a caller only joins as itself.
-- The trigger above is the structural backstop against a direct write; this gives the clean error.
create or replace function public.join_room(p_code text, p_name text)
  returns void language plpgsql security definer
  set search_path = public as $$
declare v_state text;
begin
  if p_name is null or length(p_name) = 0 then
    raise exception 'name required' using errcode = 'check_violation';        -- 23514
  end if;
  select state into v_state from public.rooms where code = p_code;
  if v_state is null then
    raise exception 'room % not found', p_code;                              -- P0001
  end if;
  if v_state = 'closed' then
    raise exception 'room is closed' using errcode = 'check_violation';       -- 23514
  end if;
  insert into public.room_students (room_code, uid, name, last_seen)
  values (p_code, auth.uid(), p_name, now());
exception
  when unique_violation then   -- already joined: refresh the display name + last-seen
    update public.room_students
       set name = p_name, last_seen = now()
     where room_code = p_code and uid = auth.uid();
end $$;

-- Leave — delete the caller's OWN roster row; a no-op if the room is already closed (matching
-- core, where LEAVE after CLOSE is a no-op). SECURITY INVOKER (the default): RLS restricts the
-- delete to the caller's own row, and the caller (a member) can read the room for the state
-- guard. A leave racing a close may still remove the row — benign, it is the student's own row.
create or replace function public.leave_room(p_code text)
  returns void language plpgsql
  set search_path = public as $$
begin
  delete from public.room_students
   where room_code = p_code and uid = auth.uid()
     and exists (select 1 from public.rooms r where r.code = p_code and r.state <> 'closed');
end $$;

-- ---- answers are accepted only while the round is ACTIVE ------------------
-- core/room.js accepts an ANSWER only in the ACTIVE state — never in the lobby, never once a
-- reveal has begun (no copying the shown answer), never after close. A trigger enforces that phase
-- structurally for every write path, taking a FOR SHARE lock on the room so an answer racing a
-- reveal/close is serialized (the answer lands while ACTIVE, or waits and is then rejected). It
-- does NOT re-derive the DOMAIN rules (the beat is a real figure onset, the figure is in the
-- room's vocabulary) — those live only in core/room.js and are checked in the shell via reduce();
-- a student writing a bogus beat/figure into its OWN answer by bypassing the transport only harms
-- its own grading (the honest-actor boundary). SECURITY DEFINER so the check reads the room state
-- under RLS-free visibility. DELETE is not guarded (assign_round's board-clear + FK cascade).
create or replace function public.forbid_inactive_answer()
  returns trigger language plpgsql security definer
  set search_path = public as $$
declare v_state text;
begin
  select state into v_state from public.rooms where code = new.room_code for share;
  if v_state is distinct from 'active' then
    raise exception 'room is not accepting answers' using errcode = 'check_violation';   -- 23514
  end if;
  return new;
end $$;
drop trigger if exists room_answers_active_only on public.room_answers;
create trigger room_answers_active_only before insert or update on public.room_answers
  for each row execute function public.forbid_inactive_answer();

-- ---- Realtime: broadcast row changes (RLS still filters what each client sees) ----
do $$
declare t text;
begin
  foreach t in array array['rooms','room_students','room_answers'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
