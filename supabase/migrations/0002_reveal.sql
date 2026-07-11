-- ============================================================================
-- Live dictation room — reveal (VISION §7/§8). The teacher reveals figure onsets to the
-- projector, one at a time or all at once. Depends on 0001_live_room.sql.
--
-- core/room.js owns the DOMAIN rule (a reveal targets a figure ONSET of the assigned rhythm)
-- and the shell checks it via reduce() before calling, for a clean early error. But that check
-- is against a fetched snapshot, so these functions LOCK the room row (FOR UPDATE) and validate
-- the onset against the CURRENT stored rhythm — a concurrent assign_round cannot swap the round
-- between the check and the write. AUTHORIZATION: each is SECURITY DEFINER and checks
-- is_room_teacher (42501). The 0001 forbid_closed_mutation trigger rejects a reveal on a closed
-- room (a closed room's row cannot change), including one racing a close.
-- ============================================================================

-- Reveal one onset beat: append it (deduped + sorted) and enter REVEALING. Locks the room and
-- verifies p_beat is a non-null onset of the CURRENT rhythm. Truly idempotent: a redundant reveal
-- (the beat already shown and already REVEALING) updates no row, so it emits no change-feed event.
create or replace function public.reveal_beat(p_code text, p_beat integer)
  returns void language plpgsql security definer
  set search_path = public as $$
declare v_rhythm jsonb;
begin
  if not public.is_room_teacher(p_code) then
    raise exception 'not the room teacher' using errcode = 'insufficient_privilege';   -- 42501
  end if;
  if p_beat is null then
    raise exception 'beat is required' using errcode = 'check_violation';               -- 23514
  end if;
  select rhythm into v_rhythm from public.rooms where code = p_code for update;         -- lock the round
  if v_rhythm is null or not (p_beat in (select (e->>'onset')::int from jsonb_array_elements(v_rhythm) e)) then
    raise exception 'beat % is not a figure onset', p_beat using errcode = 'check_violation';   -- 23514
  end if;
  update public.rooms
     set revealed = (select array_agg(distinct b order by b) from unnest(revealed || array[p_beat]) as b),
         state = 'revealing'
   where code = p_code
     and (state is distinct from 'revealing' or not (p_beat = any(revealed)));   -- skip a no-change write
end $$;

-- Reveal the whole rhythm: set revealed to every onset and enter REVEALING. Locks the room and
-- reads the onsets from the CURRENT stored rhythm, so it cannot reveal a stale round's onsets.
-- Rejects a room with no assigned rhythm (matching core's REVEAL_ALL no-op).
create or replace function public.reveal_all(p_code text)
  returns void language plpgsql security definer
  set search_path = public as $$
declare v_rhythm jsonb; v_onsets integer[];
begin
  if not public.is_room_teacher(p_code) then
    raise exception 'not the room teacher' using errcode = 'insufficient_privilege';   -- 42501
  end if;
  select rhythm into v_rhythm from public.rooms where code = p_code for update;         -- lock the round
  if v_rhythm is null then
    raise exception 'no rhythm to reveal' using errcode = 'check_violation';            -- 23514
  end if;
  select coalesce(array_agg(distinct (e->>'onset')::int order by (e->>'onset')::int), '{}')
    into v_onsets from jsonb_array_elements(v_rhythm) e;
  update public.rooms set revealed = v_onsets, state = 'revealing' where code = p_code;
end $$;
