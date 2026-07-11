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
