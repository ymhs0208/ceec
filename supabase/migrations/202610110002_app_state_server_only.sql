begin;

-- Preserve legacy plaintext for the API's existing one-time encryption upgrade.
-- New writes from /api/app-state store ciphertext and clear data atomically.
alter table public.app_state add column if not exists encrypted_data jsonb;
alter table public.app_state alter column data drop not null;
alter table public.app_state alter column data drop default;
alter table public.app_state enable row level security;

-- Table-level REVOKE alone does not remove pre-existing column-level grants.
revoke all privileges on table public.app_state from public, anon, authenticated;
do $$
declare
  column_name text;
begin
  for column_name in
    select a.attname from pg_catalog.pg_attribute a
    where a.attrelid = 'public.app_state'::regclass
      and a.attnum > 0 and not a.attisdropped
  loop
    execute format(
      'revoke all privileges (%I) on table public.app_state from public, anon, authenticated',
      column_name
    );
  end loop;
end;
$$;

drop policy if exists "Users manage own app state" on public.app_state;
-- Also deny clients if an older migration or another permissive policy restores
-- their table grants. The server role bypasses RLS; its key stays server-only.
drop policy if exists "App state requires server access" on public.app_state;
create policy "App state requires server access"
on public.app_state as restrictive for all to anon, authenticated
using (false) with check (false);
grant select, insert, update, delete on public.app_state to service_role;

notify pgrst, 'reload schema';
commit;
