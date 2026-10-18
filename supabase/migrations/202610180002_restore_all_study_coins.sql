-- Requires 202610160001 and 202610180001. Preserve all existing receipts,
-- including ritual expenses. Legacy expenses absent from this ledger are not
-- reconstructed or charged. Restore every durable session for every account.
begin;
create or replace function public.record_study_session(
  p_user_id uuid, p_session_id text, p_subject_name text,
  p_duration_minutes integer, p_session_timestamp bigint
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare existing public.study_logs; now_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000);
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if p_session_id is null or p_session_id !~ '^[a-zA-Z0-9_-]{16,128}$'
    or p_subject_name is null or length(trim(p_subject_name)) not between 1 and 40
    or p_duration_minutes is null or p_duration_minutes not between 1 and 1440
    or p_session_timestamp is null or p_session_timestamp < 0 or p_session_timestamp > now_ms + 300000 then
    raise exception 'INVALID_FOCUS_SESSION';
  end if;
  select * into existing from public.study_logs where user_id = p_user_id and session_id = p_session_id;
  if found then
    if existing.duration_minutes <> p_duration_minutes or existing.session_timestamp <> p_session_timestamp
      or existing.subject_name <> trim(p_subject_name) then raise exception 'FOCUS_SESSION_CONFLICT'; end if;
    return public.get_temple_state(p_user_id);
  end if;
  if exists (
    select 1 from public.study_logs where user_id = p_user_id
      and session_timestamp > p_session_timestamp - p_duration_minutes::bigint * 60000
      and session_timestamp - duration_minutes::bigint * 60000 < p_session_timestamp
  ) then raise exception 'FOCUS_SESSION_OVERLAPS'; end if;
  insert into public.study_logs(user_id, session_id, subject_name, duration_minutes, session_timestamp)
    values (p_user_id, p_session_id, trim(p_subject_name), p_duration_minutes, p_session_timestamp);
  return public.get_temple_state(p_user_id);
end;
$$;

revoke all on function public.record_study_session(uuid, text, text, integer, bigint) from public, anon, authenticated;
grant execute on function public.record_study_session(uuid, text, text, integer, bigint) to service_role;

do $$
declare owner_id uuid;
begin
  for owner_id in select distinct user_id from public.study_logs order by user_id loop
    perform public.get_temple_state(owner_id);
  end loop;
end;
$$;
commit;
