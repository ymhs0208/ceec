import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Test-only runtime; keep PGlite out of the production dependency tree.
const { PGlite } = await import(process.env.SESSION_TEST_PGLITE_PATH
  ? pathToFileURL(process.env.SESSION_TEST_PGLITE_PATH).href
  : '@electric-sql/pglite');
const db = new PGlite();
const userA = '00000000-0000-4000-8000-000000000001';
const userB = '00000000-0000-4000-8000-000000000002';
const sessions = [1, 2, 3, 4, 5].map(n => `10000000-0000-4000-8000-00000000000${n}`);
const query = (sql, params = []) => db.query(sql, params);
const scalar = async (sql, params = []) => Object.values((await query(sql, params)).rows[0])[0];
const asUser = async (user, session) => {
  await db.exec('reset role');
  await query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: user, session_id: session })]);
  await db.exec('set role authenticated');
};
const count = async (table, column, value) => {
  await db.exec('reset role');
  return Number(await scalar(`select count(*) from ${table} where ${column} = $1`, [value]));
};

try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    grant usage on schema auth, public to anon, authenticated, service_role;
    create table auth.users (
      id uuid primary key, email text, raw_user_meta_data jsonb default '{}',
      created_at timestamptz default now(), last_sign_in_at timestamptz
    );
    create table auth.sessions (id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade);
    -- Match Supabase Auth's session FK, which also removes the refresh tokens.
    create table auth.refresh_tokens (id bigint generated always as identity primary key,
      session_id uuid references auth.sessions(id) on delete cascade);
    create function auth.jwt() returns jsonb language sql stable as
      $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as
      $$ select (auth.jwt() ->> 'sub')::uuid $$;
  `);
  const initial = await readFile(new URL('../supabase/migrations/202606120001_initial_backend.sql', import.meta.url), 'utf8');
  // gen_random_uuid is built into PostgreSQL; PGlite doesn't need pgcrypto here.
  await db.exec(initial.replace('create extension if not exists pgcrypto;', ''));
  const migration = await readFile(new URL('../supabase/migrations/202610110001_device_session_revocation.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration); // Migration replay must not remove any data or fail.
  await query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [userA, 'a@example.test', userB, 'b@example.test']);
  for (let index = 0; index < sessions.length; index++) {
    await query('insert into auth.sessions (id, user_id) values ($1, $2)', [sessions[index], index === 3 ? userB : userA]);
    await query('insert into auth.refresh_tokens (session_id) values ($1)', [sessions[index]]);
  }
  for (const [index, device] of [[0, 'laptop'], [1, 'phone'], [2, 'phone'], [3, 'phone']]) {
    await asUser(index === 3 ? userB : userA, sessions[index]);
    await query('select public.register_current_device($1, $2)', [device, device]);
  }
  await asUser(userA, sessions[0]);
  await assert.rejects(query("select public.register_current_device('spoofed', 'spoofed')"), /device mismatch/);
  await assert.rejects(query("delete from public.device_auth_sessions where device_id = 'phone'"), /permission denied/);
  assert.equal(await scalar("select has_function_privilege('anon', 'public.revoke_device_sessions(text)', 'EXECUTE')"), false);
  assert.equal(await scalar("select has_function_privilege('anon', 'public.register_current_device(text,text)', 'EXECUTE')"), false);
  assert.equal(await scalar("select has_function_privilege('anon', 'public.revoke_other_sessions(boolean)', 'EXECUTE')"), false);

  // B cannot remove A's laptop, even if its device ID is known.
  await asUser(userB, sessions[3]);
  await query("select public.revoke_device_sessions('laptop')");
  assert.equal(await count('auth.sessions', 'id', sessions[0]), 1);

  await asUser(userA, sessions[0]);
  await query("select public.revoke_device_sessions('phone')");
  for (const index of [1, 2]) {
    assert.equal(await count('auth.sessions', 'id', sessions[index]), 0);
    assert.equal(await count('auth.refresh_tokens', 'session_id', sessions[index]), 0);
  }
  assert.equal(await count('auth.sessions', 'id', sessions[0]), 1);
  assert.equal(await count('auth.sessions', 'id', sessions[3]), 1);

  // Simulate a still-unexpired but revoked JWT. RLS and management RPCs deny it.
  await asUser(userA, sessions[1]);
  assert.equal(await scalar('select public.is_current_session_active()'), false);
  assert.equal((await query('select * from public.profiles')).rows.length, 0);
  await assert.rejects(query("insert into public.devices (user_id,device_id,device_name) values ($1,'phone','phone')", [userA]), /row-level security/);
  await assert.rejects(query("select public.register_current_device('phone', 'phone')"), /missing or revoked/);
  await assert.rejects(query('select public.revoke_other_sessions(false)'), /missing or revoked/);
  assert.equal(await count('auth.sessions', 'id', sessions[0]), 1);

  await db.exec('reset role');
  await query("insert into public.devices (user_id, device_id, device_name) values ($1, 'legacy', 'legacy')", [userA]);
  await asUser(userA, sessions[0]);
  await assert.rejects(query("select public.revoke_device_sessions('legacy')"), /DEVICE_SESSION_NOT_LINKED/);
  assert.equal(await count('auth.sessions', 'id', sessions[4]), 1);
  await asUser(userA, sessions[0]);
  await query('select public.revoke_other_sessions(true)');
  assert.equal(await count('auth.sessions', 'id', sessions[4]), 0);
  assert.equal(await count('auth.sessions', 'id', sessions[0]), 1);
  assert.equal(await count('auth.sessions', 'id', sessions[3]), 1);

  await asUser(userA, sessions[0]);
  await query('select public.revoke_other_sessions(false)');
  assert.equal(await scalar('select public.is_current_session_active()'), false);
  assert.equal(await count('auth.refresh_tokens', 'session_id', sessions[0]), 0);
  assert.equal(await count('auth.sessions', 'id', sessions[3]), 1);
  console.log('PASS: migration replay, device/session binding, refresh-token cascade, cross-user isolation, revoked JWT RLS, legacy fallback, others/global revocation');
} finally {
  await db.close();
}
