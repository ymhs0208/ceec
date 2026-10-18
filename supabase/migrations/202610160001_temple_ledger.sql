begin;

-- Only the authenticated API (service_role) may issue or spend coins. Every
-- entry has an idempotency key so two devices cannot award the same session.
create table if not exists public.temple_ledger (
  revision bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id text not null,
  kind text not null check (kind in ('study', 'lamp', 'fortune', 'ticket')),
  amount integer not null,
  reason text not null,
  event_timestamp bigint not null,
  detail jsonb not null default '{}'::jsonb,
  unique (user_id, entry_id)
);
alter table public.temple_ledger enable row level security;
revoke all on public.temple_ledger from public, anon, authenticated;
grant all on public.temple_ledger to service_role;
grant usage, select on sequence public.temple_ledger_revision_seq to service_role;

create or replace function public.get_temple_state(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  -- Repair missing awards from durable history, including rows written before
  -- this ledger existed. Browser coin balances are never trusted.
  insert into public.temple_ledger (user_id, entry_id, kind, amount, reason, event_timestamp)
    select user_id, 'study:' || session_id, 'study', duration_minutes,
      subject_name || '專注 ' || duration_minutes || ' 分鐘', session_timestamp
    from public.study_logs where user_id = p_user_id and duration_minutes > 0
    on conflict (user_id, entry_id) do nothing;
  select jsonb_build_object(
    'revision', coalesce(max(revision), 0),
    'incenseCoins', coalesce(sum(amount), 0),
    'incenseRecords', coalesce(jsonb_agg(jsonb_build_object(
      'id', entry_id, 'amount', amount, 'reason', reason, 'timestamp', event_timestamp
    ) order by revision desc), '[]'::jsonb),
    'templeState', jsonb_build_object(
      'lamps', coalesce(jsonb_agg(detail order by revision desc) filter (where kind = 'lamp'), '[]'::jsonb),
      'fortunes', coalesce(jsonb_agg(detail order by revision desc) filter (where kind = 'fortune'), '[]'::jsonb),
      'ticketOffered', coalesce(bool_or(kind = 'ticket'), false)
    )
  ) into result from public.temple_ledger where user_id = p_user_id;
  return result;
end;
$$;

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
    or p_session_timestamp is null or p_session_timestamp > now_ms + 300000 then
    raise exception 'INVALID_FOCUS_SESSION';
  end if;
  select * into existing from public.study_logs where user_id = p_user_id and session_id = p_session_id;
  if found then
    if existing.duration_minutes <> p_duration_minutes or existing.session_timestamp <> p_session_timestamp
      or existing.subject_name <> trim(p_subject_name) then raise exception 'FOCUS_SESSION_CONFLICT'; end if;
    return public.get_temple_state(p_user_id);
  end if;
  if p_session_timestamp < now_ms - 604800000 then raise exception 'FOCUS_SESSION_TOO_OLD'; end if;
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

create or replace function public.perform_temple_ritual(p_user_id uuid, p_action_id text, p_ritual_type text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare state jsonb; cost integer; extra jsonb := '{}'::jsonb;
  now_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000); previous_kind text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if p_action_id is null or p_action_id !~ '^[a-zA-Z0-9_-]{16,128}$'
    or p_ritual_type is null or p_ritual_type not in ('lamp', 'fortune', 'ticket') then
    raise exception 'INVALID_TEMPLE_RITUAL';
  end if;
  state := public.get_temple_state(p_user_id);
  select kind into previous_kind from public.temple_ledger where user_id = p_user_id and entry_id = 'ritual:' || p_action_id;
  if found then
    if previous_kind <> p_ritual_type then raise exception 'TEMPLE_ACTION_CONFLICT'; end if;
    return state;
  end if;
  cost := case p_ritual_type when 'lamp' then 100 when 'fortune' then 30 else 500 end;
  if (state->>'incenseCoins')::bigint < cost then raise exception '香火幣不足'; end if;
  if p_ritual_type = 'lamp' then
    if exists (select 1 from public.temple_ledger where user_id = p_user_id and kind = 'lamp'
      and (detail->>'expireAt')::bigint > now_ms) then raise exception '您的光明燈還在亮著呢'; end if;
    extra := jsonb_build_object('type', '光明燈', 'expireAt', now_ms + 604800000);
  elsif p_ritual_type = 'fortune' then
    extra := jsonb_build_object('index', floor(random() * 35)::integer, 'date', now_ms);
  elsif (state->'templeState'->>'ticketOffered')::boolean then
    raise exception '您已經供奉過准考證了';
  end if;
  insert into public.temple_ledger(user_id, entry_id, kind, amount, reason, event_timestamp, detail)
    values (p_user_id, 'ritual:' || p_action_id, p_ritual_type, -cost,
      case p_ritual_type when 'lamp' then '點光明燈' when 'fortune' then '求籤' else '供奉准考證' end, now_ms, extra);
  return public.get_temple_state(p_user_id);
end;
$$;

revoke all on function public.get_temple_state(uuid) from public, anon, authenticated;
revoke all on function public.record_study_session(uuid, text, text, integer, bigint) from public, anon, authenticated;
revoke all on function public.perform_temple_ritual(uuid, text, text) from public, anon, authenticated;
grant execute on function public.get_temple_state(uuid) to service_role;
grant execute on function public.record_study_session(uuid, text, text, integer, bigint) to service_role;
grant execute on function public.perform_temple_ritual(uuid, text, text) to service_role;
commit;
