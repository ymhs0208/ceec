import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create table public.study_logs(user_id uuid references auth.users(id), session_id text,
      subject_name text, duration_minutes integer, session_timestamp bigint, unique(user_id,session_id));`);
  for (const file of ['202610160001_temple_ledger.sql', '202610180001_repair_study_coin_deficits.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  const first = '00000000-0000-4000-8000-000000000001';
  const second = '00000000-0000-4000-8000-000000000002';
  await db.query('insert into auth.users values ($1),($2)', [first, second]);
  const old = Date.now() - 365 * 86400000;
  await db.query(`insert into public.study_logs values
    ($1,'old-durable-session-a','數學',100,$3),
    ($2,'old-durable-session-b','英文',50,$3)`, [first, second, old]);
  // One account has legacy receipts and a real expense; another has never read its wallet.
  await db.query(`insert into public.temple_ledger(user_id,entry_id,kind,amount,reason,event_timestamp) values
    ($1,'study:old-durable-session-a','study',90,'舊收入',$2),
    ($1,'ritual:existing-fortune','fortune',-30,'求籤',$2)`, [first, old]);
  const migration = await readFile(new URL('../supabase/migrations/202610180002_restore_all_study_coins.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  const totals = async () => (await db.query('select user_id, sum(amount)::int as balance from public.temple_ledger group by user_id order by user_id')).rows;
  assert.deepEqual(await totals(), [{ user_id: first, balance: 70 }, { user_id: second, balance: 50 }]);
  const receipts = (await db.query('select * from public.temple_ledger order by revision')).rows;
  await db.exec(migration);
  assert.deepEqual((await db.query('select * from public.temple_ledger order by revision')).rows, receipts);
  const record = async (id, timestamp = old - 86400000, minutes = 25) =>
    (await db.query('select public.record_study_session($1,$2,$3,$4,$5) as state', [first, id, '自然', minutes, timestamp])).rows[0].state;
  assert.equal((await record('offline-year-old-session')).incenseCoins, 95);
  assert.equal((await record('offline-year-old-session')).incenseCoins, 95);
  await assert.rejects(record('offline-year-old-session', old - 86400000, 30), /FOCUS_SESSION_CONFLICT/);
  await assert.rejects(record('overlap-year-old-session'), /FOCUS_SESSION_OVERLAPS/);
  await assert.rejects(record('future-invalid-session', Date.now() + 3600000), /INVALID_FOCUS_SESSION/);
  await assert.rejects(record('negative-time-session', -1), /INVALID_FOCUS_SESSION/);
  assert.deepEqual(await totals(), [{ user_id: first, balance: 95 }, { user_id: second, balance: 50 }]);
  await db.exec('set role authenticated');
  await assert.rejects(record('client-forged-session', old - 2 * 86400000), /permission denied/);
  console.log('PASS: bulk restoration without wallet reads, old offline upload, deficit repair, preserved spending, replay deduplication, overlap/conflict/future validation and permissions');
} finally { await db.close(); }
