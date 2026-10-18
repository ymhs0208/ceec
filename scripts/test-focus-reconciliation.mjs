import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const load = (source, require = createRequire(import.meta.url)) => {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compile(source))(require, module, module.exports);
  return module.exports;
};
const achievements = load(await readFile(new URL('../utils/achievements.ts', import.meta.url), 'utf8'));
const session = (id, subjectId, subjectName, minutes = 30) => ({ id, subjectId, subjectName, durationMinutes: minutes, timestamp: Date.now() });
const history = [session('a', 'chinese1', '國綜'), session('b', '國寫', '國寫'), session('c', 'english_read', '英語 (閱讀)'), session('d', '英語 (聽力)', '英語 (聽力)'), session('e', '數學A', '數學A', 60), session('f', 'physics', '物理', 60)];
const data = { studySessions: history, tasks: [], streak: { current: 0, max: 0, lastDate: '' } };
for (const subject of ['chinese', 'english', 'math', 'natural']) {
  assert.equal(achievements.getStudyTimeBySubject(history, subject), 60);
  assert.ok(achievements.getUnlockedAchievements(data).includes(`sub_${subject}_1`));
}
assert.equal(achievements.getStudyTimeBySubject([session('old-math', 'legacy-math', '數學 A/B', 265)], 'math'), 265);
assert.ok(!achievements.getUnlockedAchievements({ ...data, studySessions: [
  session('math-a', 'math_a', '數學 A'), session('math-b', '數學 B', '數學 B'), session('math-old', 'math_ab', '數學 A/B'),
] }).includes('sp14'), 'Local and restored IDs for the same subject cannot manufacture a multi-subject medal');
const streakHistory = [1, 2, 3].flatMap(day => [
  { ...history[0], timestamp: new Date(2026, 9, day, 10).getTime(), durationMinutes: 60 },
  { ...history[1], timestamp: new Date(2026, 9, day, 12).getTime(), durationMinutes: 60 },
]);
const repairedStreak = achievements.reconcileStudyStreak(streakHistory, 120, data.streak, new Date(2026, 9, 3, 15).getTime());
assert.equal(repairedStreak.max, 3, 'Daily goals completed across devices repair historical streaks');
assert.equal(repairedStreak.current, 3);
assert.ok(achievements.getUnlockedAchievements({ ...data, studySessions: streakHistory, streak: repairedStreak }).includes('s1'));

// Execute the actual history reader with >1000 records and a delayed upload
// whose completion time precedes records already downloaded by this device.
const rows = Array.from({ length: 1203 }, (_, n) => ({ session_id: String(n).padStart(16, '0'), subject_name: '國綜', duration_minutes: 25, session_timestamp: n }));
let ranges = [], failOffset = -1;
const client = {
  async rpc(name) { assert.equal(name, 'register_current_device'); return { error: null }; },
  auth: { async getUser() { return { data: { user: { id: 'user-a' } }, error: null }; }, async getSession() { return { data: { session: { access_token: 'token', user: { id: 'user-a' } } }, error: null }; } },
  from(table) {
    assert.equal(table, 'study_logs');
    let start, end;
    return {
      select() { return this; }, eq(column, id) { assert.equal(column, 'user_id'); assert.equal(id, 'user-a'); return this; },
      order() { return this; }, gte() { throw new Error('Full reconciliation must include delayed older uploads'); },
      range(a, b) { start = a; end = b; return this; },
      then(resolve) { ranges.push([start, end]); return Promise.resolve({ data: rows.slice(start, end + 1), error: start === failOffset ? { message: 'network unavailable' } : null }).then(resolve); },
    };
  },
};
const { authService } = load(await readFile(new URL('../services/authService.ts', import.meta.url), 'utf8'), name => {
  if (name === './supabaseClient') return { requireSupabase: () => client };
  if (name === '../utils/storage') return { safeLocalStorage: { getItem: () => null, setItem() {} } };
  throw new Error(name);
});
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true, userAgent: 'fixture' } });
let result = await authService.getStudySessions();
assert.equal(result.success, true);
assert.equal(result.sessions.length, 1203);
assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]]);
rows.unshift({ ...rows[0], session_id: 'offline-delayed-session', session_timestamp: -100 });
result = await authService.getStudySessions();
assert.ok(result.sessions.some(row => row.id === 'offline-delayed-session'));
failOffset = 500;
result = await authService.getStudySessions();
assert.equal(result.success, false);
assert.deepEqual(result.sessions, [], 'Never expose a truncated history as a successful read');
const previousFetch = globalThis.fetch;
try {
  globalThis.fetch = async (_url, options) => {
    const batch = JSON.parse(options.body).sessions;
    return batch.some(row => row.sessionId === 'overlapping-session')
      ? Response.json({ error: 'Study sessions overlap' }, { status: 409 })
      : Response.json({ temple: { revision: 3, incenseCoins: 25 } }, { status: 201 });
  };
  const partial = await authService.syncStudyLogs([
    session('overlapping-session', 'math', '數學'), session('valid-other-device', 'chinese1', '國綜'),
  ]);
  assert.equal(partial.success, false);
  assert.deepEqual(partial.syncedStudySessionIds, ['valid-other-device'], 'One conflict cannot block another device from uploading');
  const originalFrom = client.from;
  try {
    client.from = table => {
      assert.equal(table, 'profiles');
      return { update() { return this; }, async eq() { return { error: { message: 'fixture profile outage' } }; } };
    };
    const credited = await authService.logSession('', '', session('credited-profile-failed', 'math', '數學'), 'school');
    assert.equal(credited.success, false);
    assert.deepEqual(credited.syncedStudySessionIds, ['credited-profile-failed']);
    assert.equal(credited.data.incenseCoins, 25, 'A failed profile update must not hide a confirmed coin award');
  } finally { client.from = originalFrom; }
  globalThis.fetch = async () => Response.json({ code: 'TEMPLE_SETUP_REQUIRED', error: 'fixture setup missing' }, { status: 503 });
  assert.match((await authService.logSession('', '', session('setup-error-focus', 'math', '數學'))).message, /帳本尚未完成設定/);
  globalThis.fetch = async () => assert.fail('An expired owner must never send data using another account');
  assert.equal((await authService.syncData('', '', {}, 'user-b', null)).code, 'AUTH_REQUIRED');
  assert.equal((await authService.getData('', '', 'user-b')).code, 'AUTH_REQUIRED');
  assert.equal((await authService.syncStudyLogs(history, undefined, 'user-b')).code, 'AUTH_REQUIRED');
  const getSession = client.auth.getSession;
  client.auth.getSession = async () => ({ data: { session: { access_token: 'other-token', user: { id: 'user-b' } } }, error: null });
  assert.equal((await authService.syncData('', '', {}, 'user-a', null)).code, 'AUTH_REQUIRED', 'Account switching between getUser and getSession is rejected');
  client.auth.getSession = getSession;
} finally { globalThis.fetch = previousFetch; }

const { PGlite } = await import(process.env.SESSION_TEST_PGLITE_PATH ? pathToFileURL(process.env.SESSION_TEST_PGLITE_PATH).href : '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create table public.study_logs(id uuid default gen_random_uuid(), user_id uuid references auth.users(id), session_id text,
      subject_name text, duration_minutes integer, session_timestamp bigint, unique(user_id, session_id));`);
  const sql = await readFile(new URL('../supabase/migrations/202610160001_temple_ledger.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql); // Re-running must preserve awards and spending.
  const user = '00000000-0000-4000-8000-000000000001', other = '00000000-0000-4000-8000-000000000002';
  await db.query('insert into auth.users values ($1), ($2)', [user, other]);
  const scalar = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0];
  const state = () => scalar('select public.get_temple_state($1)', [user]);
  const now = Date.now();
  await db.query('insert into public.study_logs(user_id, session_id, subject_name, duration_minutes, session_timestamp) values($1,$2,$3,$4,$5)', [user, 'legacy-study-session', '國綜', 600, now - 10 * 86400000]);
  assert.equal((await state()).incenseCoins, 600, 'Existing history receives its missing award');
  assert.equal((await state()).incenseCoins, 600, 'Repair is idempotent');
  const record = (id, minutes = 240, timestamp = now) => scalar('select public.record_study_session($1,$2,$3,$4,$5)', [user, id, '國寫', minutes, timestamp]);
  assert.equal((await record('new-study-session')).incenseCoins, 840, 'Long sessions are accepted');
  assert.equal((await record('new-study-session')).incenseCoins, 840, 'Retry cannot double award');
  await assert.rejects(record('new-study-session', 100), /FOCUS_SESSION_CONFLICT/);
  await assert.rejects(record('overlap-study-session', 60), /FOCUS_SESSION_OVERLAPS/);
  const ritual = (id, type) => scalar('select public.perform_temple_ritual($1,$2,$3)', [user, id, type]);
  const lamp = await ritual('lamp-action-session', 'lamp');
  assert.equal(lamp.incenseCoins, 740);
  assert.equal((await ritual('lamp-action-session', 'lamp')).incenseCoins, 740);
  await assert.rejects(ritual('lamp-action-another', 'lamp'), /還在亮/);
  assert.equal((await ritual('ticket-action-session', 'ticket')).incenseCoins, 240);
  await assert.rejects(ritual('ticket-action-another', 'ticket'), /不足|供奉/);
  assert.equal((await ritual('fortune-action-session', 'fortune')).incenseCoins, 210);
  const final = await state();
  assert.equal(final.incenseRecords.reduce((sum, row) => sum + row.amount, 0), 210);
  assert.ok(final.templeState.ticketOffered);
  assert.ok(final.templeState.fortunes[0].index >= 0 && final.templeState.fortunes[0].index < 35);
  assert.equal((await scalar('select public.get_temple_state($1)', [other])).incenseCoins, 0);
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select public.get_temple_state($1)', [user]), /permission denied/);
  await assert.rejects(db.query('select * from public.temple_ledger'), /permission denied/);
  console.log('PASS: subject medals, paginated history, delayed offline uploads, read failure, missing coin repair, long sessions, retry deduplication, overlapping devices, spending and client permissions');
} finally { await db.close(); }
