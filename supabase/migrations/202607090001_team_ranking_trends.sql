-- Run this entire file so the snapshot table and its RPC are installed together.
begin;

create table if not exists public.team_ranking_snapshots (
  snapshot_date date not null,
  team text not null,
  rank integer not null check (rank > 0),
  points integer not null check (points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (snapshot_date, team)
);

create index if not exists team_ranking_snapshots_date_idx
on public.team_ranking_snapshots (snapshot_date desc);

alter table public.team_ranking_snapshots enable row level security;

create or replace function public.get_rankings(requested_team text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  result jsonb;
  snapshot_day date := (now() at time zone 'Asia/Taipei')::date;
  previous_snapshot_day date;
begin
  select max(snapshot_date)
  into previous_snapshot_day
  from public.team_ranking_snapshots
  where snapshot_date < snapshot_day;

  with user_totals as (
    select
      p.id,
      p.name,
      p.team,
      coalesce(sum(l.duration_minutes), 0)::integer as total_minutes
    from public.profiles p
    join public.study_logs l on l.user_id = p.id
    group by p.id, p.name, p.team
  ),
  ranked_users as (
    select
      row_number() over (order by total_minutes desc, name asc) as rank,
      name,
      team,
      total_minutes,
      id = auth.uid() as is_current_user
    from user_totals
  ),
  team_totals as (
    select team as name, sum(total_minutes)::integer as points
    from user_totals
    where team <> ''
    group by team
  ),
  requested_empty_team as (
    select requested_team as name, 0::integer as points
    where requested_team is not null
      and requested_team <> ''
      and not exists (select 1 from team_totals where name = requested_team)
  ),
  current_teams as (
    select
      rank() over (order by points desc)::integer as rank,
      name,
      points
    from (
      select * from team_totals
      union all
      select * from requested_empty_team
    ) teams
  ),
  ranked_teams as (
    select
      c.rank,
      c.name,
      c.points,
      case
        when previous_snapshot_day is null or s.rank is null then 0
        else s.rank - c.rank
      end as trend,
      previous_snapshot_day is not null and s.team is null as is_new
    from current_teams c
    left join public.team_ranking_snapshots s
      on s.snapshot_date = previous_snapshot_day
      and s.team = c.name
  )
  select jsonb_build_object(
    'global_ranking',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', rank,
        'name', name,
        'team', team,
        'totalMinutes', total_minutes,
        'isCurrentUser', is_current_user
      ) order by rank)
      from (select * from ranked_users order by rank limit 50) users
    ), '[]'::jsonb),
    'team_ranking',
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', rank,
        'name', name,
        'points', points,
        'trend', trend,
        'isNew', is_new
      ) order by rank, name)
      from (select * from ranked_teams order by rank, name limit 30) teams
    ), '[]'::jsonb)
  )
  into result;

  with user_totals as (
    select
      p.id,
      p.name,
      p.team,
      coalesce(sum(l.duration_minutes), 0)::integer as total_minutes
    from public.profiles p
    join public.study_logs l on l.user_id = p.id
    group by p.id, p.name, p.team
  ),
  team_totals as (
    select team as name, sum(total_minutes)::integer as points
    from user_totals
    where team <> ''
    group by team
  ),
  requested_empty_team as (
    select requested_team as name, 0::integer as points
    where requested_team is not null
      and requested_team <> ''
      and not exists (select 1 from team_totals where name = requested_team)
  ),
  current_teams as (
    select
      rank() over (order by points desc)::integer as rank,
      name,
      points
    from (
      select * from team_totals
      union all
      select * from requested_empty_team
    ) teams
  )
  insert into public.team_ranking_snapshots (snapshot_date, team, rank, points, updated_at)
  select snapshot_day, name, rank, points, now()
  from current_teams
  order by rank, name
  limit 100
  on conflict (snapshot_date, team)
  do update set
    rank = excluded.rank,
    points = excluded.points,
    updated_at = now();

  return result;
end;
$$;

revoke all on function public.get_rankings(text) from public;
grant execute on function public.get_rankings(text) to anon, authenticated;

commit;
