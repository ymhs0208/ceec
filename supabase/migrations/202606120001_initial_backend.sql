create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '使用者',
  team text not null default '',
  exam_type text not null default '116gsat',
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table if not exists public.app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  subject_name text not null,
  duration_minutes integer not null check (duration_minutes >= 0),
  session_timestamp bigint not null,
  created_at timestamptz not null default now(),
  unique (user_id, session_id)
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_name text not null,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists study_logs_user_id_idx on public.study_logs(user_id);
create index if not exists devices_user_id_idx on public.devices(user_id);

alter table public.profiles enable row level security;
alter table public.app_state enable row level security;
alter table public.study_logs enable row level security;
alter table public.devices enable row level security;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.app_state to authenticated;
grant select, insert, update, delete on public.study_logs to authenticated;
grant select, insert, update, delete on public.devices to authenticated;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users manage own app state" on public.app_state;
create policy "Users manage own app state"
on public.app_state for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own study logs" on public.study_logs;
create policy "Users manage own study logs"
on public.study_logs for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own devices" on public.devices;
create policy "Users manage own devices"
on public.devices for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, exam_type)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1), '使用者'),
    coalesce(new.raw_user_meta_data ->> 'exam_type', '116gsat')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, email, name, exam_type, created_at, last_login_at)
select
  id,
  coalesce(email, ''),
  coalesce(raw_user_meta_data ->> 'name', split_part(coalesce(email, ''), '@', 1), '使用者'),
  coalesce(raw_user_meta_data ->> 'exam_type', '116gsat'),
  created_at,
  coalesce(last_sign_in_at, created_at)
from auth.users
on conflict (id) do nothing;

create or replace function public.get_rankings(requested_team text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
  ranked_teams as (
    select
      row_number() over (order by points desc, name asc) as rank,
      name,
      points,
      0 as trend,
      false as is_new
    from (
      select * from team_totals
      union all
      select * from requested_empty_team
    ) teams
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
      ) order by rank)
      from (select * from ranked_teams order by rank limit 30) teams
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_rankings(text) from public;
grant execute on function public.get_rankings(text) to anon, authenticated;

create or replace function public.get_today_community_study(timezone_name text default 'Asia/Taipei')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select
      (((now() at time zone timezone_name)::date) at time zone timezone_name) as start_at,
      ((((now() at time zone timezone_name)::date + 1) at time zone timezone_name)) as end_at
  ),
  today_logs as (
    select
      l.user_id,
      l.subject_name,
      l.duration_minutes
    from public.study_logs l
    cross join bounds b
    where to_timestamp(l.session_timestamp / 1000.0) >= b.start_at
      and to_timestamp(l.session_timestamp / 1000.0) < b.end_at
  ),
  totals as (
    select
      coalesce(sum(duration_minutes), 0)::integer as total_minutes,
      count(distinct user_id)::integer as active_users,
      count(*)::integer as session_count
    from today_logs
  ),
  top_subject as (
    select subject_name
    from today_logs
    group by subject_name
    order by sum(duration_minutes) desc, subject_name asc
    limit 1
  )
  select jsonb_build_object(
    'total_minutes', totals.total_minutes,
    'active_users', totals.active_users,
    'session_count', totals.session_count,
    'average_minutes', case when totals.active_users > 0 then round(totals.total_minutes::numeric / totals.active_users)::integer else 0 end,
    'top_subject', coalesce((select subject_name from top_subject), '')
  )
  from totals;
$$;

revoke all on function public.get_today_community_study(text) from public;
grant execute on function public.get_today_community_study(text) to anon, authenticated;
