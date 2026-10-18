import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const { PGlite } = await import(process.env.SESSION_TEST_PGLITE_PATH
  ? pathToFileURL(process.env.SESSION_TEST_PGLITE_PATH).href
  : '@electric-sql/pglite');
const db = new PGlite();
const userId = '00000000-0000-4000-8000-000000000001';
const sessionId = '10000000-0000-4000-8000-000000000001';
const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
const legacy = { notes: 'keep existing data' };

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    grant usage on schema auth, public to anon, authenticated, service_role;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}',
      created_at timestamptz default now(), last_sign_in_at timestamptz);
    create table auth.sessions (id uuid primary key, user_id uuid references auth.users(id));
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
  `);
  const initial = await readFile(new URL('../supabase/migrations/202606120001_initial_backend.sql', import.meta.url), 'utf8');
  await db.exec(initial.replace('create extension if not exists pgcrypto;', ''));
  await db.exec(await readFile(new URL('../supabase/migrations/202610110001_device_session_revocation.sql', import.meta.url), 'utf8'));
  await db.query('insert into auth.users (id) values ($1)', [userId]);
  await db.query('insert into auth.sessions (id, user_id) values ($1, $2)', [sessionId, userId]);
  await db.query('insert into public.app_state (user_id, data) values ($1, $2)', [userId, legacy]);
  // Simulate extra table, PUBLIC and column grants left by an older deployment.
  await db.exec(`
    grant select, insert, update, delete on public.app_state to public, anon;
    grant select(data), insert(data), update(data), references(data) on public.app_state to public, anon, authenticated;
    create policy "Legacy broad access" on public.app_state for all to public using (true) with check (true);
  `);
  const migration = await readFile(new URL('../supabase/migrations/202610110002_app_state_server_only.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration);
  assert.deepEqual(await scalar('select data from public.app_state'), legacy);
  for (const role of ['anon', 'authenticated']) {
    for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) {
      assert.equal(await scalar('select has_table_privilege($1, $2, $3)', [role, 'public.app_state', privilege]), false);
    }
    for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) {
      assert.equal(await scalar('select has_any_column_privilege($1, $2, $3)', [role, 'public.app_state', privilege]), false);
    }
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: userId, session_id: sessionId })]);
    await db.exec(`set role ${role}`);
    for (const sql of [
      'select * from public.app_state',
      'select data from public.app_state',
      "insert into public.app_state (user_id, data) values (gen_random_uuid(), '{}')",
      "update public.app_state set data = '{}'",
      "update public.app_state set encrypted_data = '{}'",
      'delete from public.app_state',
    ]) await assert.rejects(db.query(sql), /permission denied/);
    await db.exec('reset role');
  }
  // A stale deployment restoring grants cannot reopen client access via RLS.
  await db.exec('grant select, insert, update, delete on public.app_state to anon, authenticated');
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    assert.equal((await db.query('select * from public.app_state')).rows.length, 0);
    assert.equal((await db.query("update public.app_state set data = '{}' returning user_id")).rows.length, 0);
    assert.equal((await db.query('delete from public.app_state returning user_id')).rows.length, 0);
    await assert.rejects(db.query("insert into public.app_state (user_id, data) values (gen_random_uuid(), '{}')"), /row-level security/);
    await db.exec('reset role');
  }
  await db.exec(migration); // Restore the intended grants after the regression test.
  const encrypted = { version: 1, iv: 'test-iv', tag: 'test-tag', ciphertext: 'test-ciphertext' };
  await db.exec('set role service_role');
  await db.query(`insert into public.app_state (user_id, data, encrypted_data) values ($1, null, $2)
    on conflict (user_id) do update set data = excluded.data, encrypted_data = excluded.encrypted_data`, [userId, encrypted]);
  const row = (await db.query('select data, encrypted_data from public.app_state')).rows[0];
  assert.equal(row.data, null);
  assert.deepEqual(row.encrypted_data, encrypted);
  assert.equal((await db.query('delete from public.app_state returning user_id')).rows.length, 1);
  console.log('PASS: migration replay preserves legacy data; table/PUBLIC/column grants removed; anon and authenticated direct access denied; restrictive RLS survives restored grants; service-role encrypted upsert/read/delete works');
} finally {
  await db.close();
}
