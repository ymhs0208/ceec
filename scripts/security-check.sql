-- Read-only metadata checks. Run in the project's Supabase SQL Editor.
-- Does not read user rows or invoke application RPCs.

-- RLS state for public tables (review any false values).
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by c.relname;

-- All policies, including permissive policies that may broaden access.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- Effective app-state privileges: all should be false if server-only.
select r.role_name,
       pg_catalog.has_table_privilege(r.role_name, 'public.app_state', 'SELECT') as can_select,
       pg_catalog.has_table_privilege(r.role_name, 'public.app_state', 'INSERT') as can_insert,
       pg_catalog.has_table_privilege(r.role_name, 'public.app_state', 'UPDATE') as can_update,
       pg_catalog.has_table_privilege(r.role_name, 'public.app_state', 'DELETE') as can_delete
from (values ('anon'), ('authenticated')) as r(role_name);

-- Effective column privileges, including inherited grants: all should be false.
select r.role_name,
       pg_catalog.has_any_column_privilege(r.role_name, 'public.app_state', 'SELECT') as can_select_column,
       pg_catalog.has_any_column_privilege(r.role_name, 'public.app_state', 'INSERT') as can_insert_column,
       pg_catalog.has_any_column_privilege(r.role_name, 'public.app_state', 'UPDATE') as can_update_column,
       pg_catalog.has_any_column_privilege(r.role_name, 'public.app_state', 'REFERENCES') as can_reference_column
from (values ('anon'), ('authenticated')) as r(role_name);

-- Column-specific grants can also allow bypassing server-only writes.
select grantee, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'app_state'
  and grantee in ('PUBLIC', 'anon', 'authenticated')
order by grantee, column_name, privilege_type;

-- Verify the encryption column exists and the plaintext column is nullable.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'app_state'
order by ordinal_position;

-- Effective RPC execute privileges, including grants inherited from PUBLIC.
-- Server-only RPCs accepting p_user_id should not be callable by client roles.
select p.proname as function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer, p.provolatile as volatility,
       p.proconfig as function_settings,
       pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, arguments;

-- Inspect the actual deployed implementations of sensitive RPCs.
select p.proname, pg_catalog.pg_get_functiondef(p.oid) as definition
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  and p.proname in ('record_study_session', 'get_temple_state',
                   'perform_temple_ritual', 'delete_own_account', 'get_rankings')
order by p.proname;
