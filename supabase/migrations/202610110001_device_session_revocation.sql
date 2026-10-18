begin;

-- Auth owns the session identity. Never accept a session/user ID from the browser.
create table if not exists public.device_auth_sessions (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists device_auth_sessions_device_idx
on public.device_auth_sessions (user_id, device_id);
alter table public.device_auth_sessions enable row level security;
revoke all on public.device_auth_sessions from public, anon, authenticated;

create or replace function public.is_current_session_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions s
    where s.user_id = (select auth.uid())
      and s.id::text = (select auth.jwt() ->> 'session_id')
  );
$$;
revoke all on function public.is_current_session_active() from public, anon;
grant execute on function public.is_current_session_active() to authenticated;

create or replace function public.register_current_device(p_device_id text, p_device_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_session_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text, 0));
  if p_device_id is null or length(p_device_id) not between 1 and 128
    or p_device_name is null or length(p_device_name) not between 1 and 200 then
    raise exception 'Invalid device' using errcode = '22023';
  end if;

  -- Lock before creating a mapping so revocation cannot leave a live mapping
  -- pointing to a session that has already been deleted.
  select s.id into caller_session_id
  from auth.sessions s
  where s.user_id = caller_id and s.id::text = (auth.jwt() ->> 'session_id')
  for update;
  if caller_session_id is null then
    raise exception 'Auth session missing or revoked' using errcode = '28000';
  end if;

  -- One Auth session cannot be reassigned to another browser-supplied device ID.
  if exists (
    select 1 from public.device_auth_sessions d
    where d.session_id = caller_session_id
      and (d.user_id <> caller_id or d.device_id <> p_device_id)
  ) then
    raise exception 'Auth session device mismatch' using errcode = '28000';
  end if;

  insert into public.device_auth_sessions (session_id, user_id, device_id)
  values (caller_session_id, caller_id, p_device_id)
  on conflict (session_id) do nothing;

  insert into public.devices (user_id, device_id, device_name, last_active_at)
  values (caller_id, p_device_id, p_device_name, now())
  on conflict (user_id, device_id) do update
  set device_name = excluded.device_name, last_active_at = excluded.last_active_at;
end;
$$;
revoke all on function public.register_current_device(text, text) from public, anon;
grant execute on function public.register_current_device(text, text) to authenticated;

create or replace function public.revoke_device_sessions(p_device_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text, 0));
  if not public.is_current_session_active() then
    raise exception 'Auth session missing or revoked' using errcode = '28000';
  end if;
  if p_device_id is null or length(p_device_id) not between 1 and 128 then
    raise exception 'Invalid device' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.device_auth_sessions d
    where d.user_id = caller_id and d.device_id = p_device_id
  ) and exists (
    select 1 from public.devices d
    where d.user_id = caller_id and d.device_id = p_device_id
  ) then
    -- Legacy activity records cannot prove which Auth session to revoke.
    raise exception 'DEVICE_SESSION_NOT_LINKED' using errcode = 'P0001';
  end if;

  -- Supabase's refresh_tokens.session_id FK cascades when sessions are removed.
  delete from auth.sessions s
  using public.device_auth_sessions d
  where s.id = d.session_id and s.user_id = caller_id
    and d.user_id = caller_id and d.device_id = p_device_id;
  delete from public.devices
  where user_id = caller_id and device_id = p_device_id;
end;
$$;
revoke all on function public.revoke_device_sessions(text) from public, anon;
grant execute on function public.revoke_device_sessions(text) to authenticated;

create or replace function public.revoke_other_sessions(p_keep_current boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_session_id uuid;
  caller_device_id text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller_id::text, 0));
  select s.id into caller_session_id from auth.sessions s
  where s.user_id = caller_id and s.id::text = (auth.jwt() ->> 'session_id');
  if caller_session_id is null then
    raise exception 'Auth session missing or revoked' using errcode = '28000';
  end if;
  if p_keep_current is null then
    raise exception 'Invalid revocation scope' using errcode = '22023';
  end if;
  select d.device_id into caller_device_id from public.device_auth_sessions d
  where d.session_id = caller_session_id and d.user_id = caller_id;

  -- Includes pre-upgrade sessions that have no device mapping yet.
  delete from auth.sessions
  where user_id = caller_id and (not p_keep_current or id <> caller_session_id);
  delete from public.devices
  where user_id = caller_id
    and (not p_keep_current or caller_device_id is null or device_id <> caller_device_id);
end;
$$;
revoke all on function public.revoke_other_sessions(boolean) from public, anon;
grant execute on function public.revoke_other_sessions(boolean) to authenticated;

-- Restrictive policies supplement the existing ownership policies. A revoked
-- but unexpired JWT cannot regain access by editing or recreating device rows.
do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles', 'app_state', 'study_logs', 'devices'] loop
    execute format('drop policy if exists "Require active auth session" on public.%I', table_name);
    execute format(
      'create policy "Require active auth session" on public.%I as restrictive for all to authenticated using ((select public.is_current_session_active())) with check ((select public.is_current_session_active()))',
      table_name
    );
  end loop;
end;
$$;

commit;
