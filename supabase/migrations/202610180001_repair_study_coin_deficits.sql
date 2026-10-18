-- Prerequisite: 202610160001_temple_ledger.sql.
-- Repair only durable, per-session under-awards; retain every original receipt
-- and every ritual expense. Browser balances and browser-only history are ignored.
begin;
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
  -- An old entry may already exist with a smaller award than its durable
  -- study log. Never rewrite that receipt or infer an award from browser data.
  -- Sum every recognized repair so repeat reads and migration replays cannot
  -- credit the same missing minutes again. Over-awards remain visible for review.
  with credited_sessions as (
    select case when l.detail->>'source' = 'study_credit_repair'
        then l.detail->>'sessionId' else substr(l.entry_id, 7) end as session_id,
      sum(l.amount) as awarded
    from public.temple_ledger l
    where l.user_id = p_user_id and l.kind = 'study'
      and (l.entry_id like 'study:%' or l.detail->>'source' = 'study_credit_repair')
    group by 1
  ), study_awards as (
    select s.user_id, s.session_id, s.subject_name, s.duration_minutes, s.session_timestamp,
      coalesce(c.awarded, 0) as awarded
    from public.study_logs s
    left join credited_sessions c on c.session_id = s.session_id
    where s.user_id = p_user_id and s.duration_minutes > 0
  )
  insert into public.temple_ledger(user_id, entry_id, kind, amount, reason, event_timestamp, detail)
    select user_id, 'study-credit-repair:' || session_id || ':' || duration_minutes::text,
      'study', (duration_minutes - awarded)::integer,
      subject_name || '專注點數差額補發 ' || (duration_minutes - awarded)::text || ' 枚',
      floor(extract(epoch from clock_timestamp()) * 1000)::bigint,
      jsonb_build_object('source', 'study_credit_repair', 'sessionId', session_id,
        'durationMinutes', duration_minutes, 'previousAward', awarded, 'sessionTimestamp', session_timestamp)
    from study_awards where awarded >= 0 and awarded < duration_minutes
    on conflict (user_id, entry_id) do nothing;
  select jsonb_build_object(
    'revision', coalesce(max(revision), 0),
    'incenseCoins', coalesce(sum(amount), 0),
    'incenseRecords', coalesce(jsonb_agg(jsonb_build_object(
      'id', entry_id, 'amount', amount, 'reason', reason, 'timestamp', event_timestamp,
      'studySessionId', case when kind = 'study' then
        case when detail->>'source' = 'study_credit_repair' then detail->>'sessionId'
          when entry_id like 'study:%' then substr(entry_id, 7) else null end
        else null end
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

revoke all on function public.get_temple_state(uuid) from public, anon, authenticated;
grant execute on function public.get_temple_state(uuid) to service_role;
commit;
