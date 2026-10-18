-- Keep authoritative ranks, include the requested real team beyond the first 30,
-- and prevent arbitrary requested names from entering rank snapshots.
begin;
alter table public.team_ranking_snapshots alter column points type bigint;
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
      coalesce(sum(l.duration_minutes), 0)::bigint as total_minutes
    from public.profiles p
    join public.study_logs l on l.user_id = p.id
    group by p.id, p.name, p.team
  ),
  ranked_users as (
    select
      rank() over (order by total_minutes desc) as rank,
      id,
      name,
      team,
      total_minutes,
      id = auth.uid() as is_current_user
    from user_totals
  ),
  team_totals as (
    select p.team as name, coalesce(sum(l.duration_minutes), 0)::bigint as points
    from public.profiles p
    left join public.study_logs l on l.user_id = p.id
    where p.team <> ''
    group by p.team
  ),
  current_teams as (
    select
      rank() over (order by points desc)::integer as rank,
      name,
      points
    from team_totals teams
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
      ) order by rank, name, id)
      from (select * from ranked_users
        where id in (select id from ranked_users order by rank, name, id limit 50)
          or id = auth.uid()) users
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
      from (select * from ranked_teams
        where name in (select name from ranked_teams order by rank, name limit 30)
          or name = requested_team) teams
    ), '[]'::jsonb)
  )
  into result;

  with
  team_totals as (
    select p.team as name, coalesce(sum(l.duration_minutes), 0)::bigint as points
    from public.profiles p
    left join public.study_logs l on l.user_id = p.id
    where p.team <> ''
    group by p.team
  ),
  current_teams as (
    select
      rank() over (order by points desc)::integer as rank,
      name,
      points
    from team_totals teams
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
