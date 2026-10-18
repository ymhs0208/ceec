-- Run in the project's Supabase SQL Editor. Read-only: does not call a repair
-- RPC, award coins, edit study history, or change any user's balance.
begin read only;

select
  to_regclass('public.temple_ledger') is not null as coin_ledger_installed,
  to_regprocedure('public.record_study_session(uuid,text,text,integer,bigint)') is not null as study_write_rpc_installed,
  position('study_credit_repair' in coalesce(pg_get_functiondef(to_regprocedure('public.get_temple_state(uuid)')), '')) > 0 as deficit_repair_installed;

-- Optional: replace NULL with a specific user's UUID to narrow the result.
-- Results contain internal IDs; keep the output within project support.
with options as (select null::uuid as only_user),
recent as (
  select s.user_id, s.session_id, s.subject_name, s.duration_minutes, s.session_timestamp
  from public.study_logs s, options o
  where s.session_timestamp >= floor(extract(epoch from (now() - interval '7 days')) * 1000)::bigint
    and (o.only_user is null or s.user_id = o.only_user)
  order by s.session_timestamp desc, s.user_id, s.session_id
  limit 100
), awards as (
  select l.user_id,
    case when l.detail->>'source' = 'study_credit_repair' then l.detail->>'sessionId'
      else substr(l.entry_id, 7) end as session_id,
    sum(l.amount) as awarded_coins,
    count(*) as receipt_count
  from public.temple_ledger l
  where l.kind = 'study' and (l.entry_id like 'study:%' or l.detail->>'source' = 'study_credit_repair')
    and l.user_id in (select user_id from recent)
  group by 1, 2
)
select s.user_id, s.session_id,
  to_char(to_timestamp(s.session_timestamp / 1000.0) at time zone 'Asia/Taipei', 'YYYY-MM-DD HH24:MI:SS') as completed_at_taipei,
  s.subject_name, s.duration_minutes,
  coalesce(a.awarded_coins, 0) as awarded_coins,
  s.duration_minutes - coalesce(a.awarded_coins, 0) as missing_coins,
  coalesce(a.receipt_count, 0) as receipt_count,
  case when a.receipt_count is null then 'MISSING_RECEIPT'
    when a.awarded_coins < s.duration_minutes then 'UNDER_AWARDED'
    when a.awarded_coins > s.duration_minutes then 'REVIEW_OVER_AWARD'
    else 'AWARDED' end as credit_status
from recent s left join awards a on a.user_id = s.user_id and a.session_id = s.session_id
order by s.session_timestamp desc, s.user_id, s.session_id;

commit;
