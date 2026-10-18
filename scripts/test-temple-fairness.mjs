import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

const load = (source, require = () => { throw new Error('Unexpected import'); }) => {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText)(require, module, module.exports);
  return module.exports;
};
const { reconcileTempleCoins } = load(await readFile(new URL('../utils/templeReconciliation.ts', import.meta.url), 'utf8'));
const timerSource = await readFile(new URL('../components/StudyTimer.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('StudyTimer.tsx', timerSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let complete;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'completeSession') complete = node.initializer.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
for (const sessionType of ['focus', 'break']) {
  const saved = [];
  const dependencies = { setStrictModeWarnings() {}, mode: 'pomodoro', sessionType,
    currentExamSubjects: [{ id: 'math', name: '數學' }], selectedSubject: 'math', onSaveSession: value => saved.push(value) };
  const code = ts.transpileModule(`module.exports = ${complete}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('module', ...Object.keys(dependencies), code)(module, ...Object.values(dependencies));
  for (const seconds of [0, 59, 60, 61, 119, 120]) module.exports(seconds, 1234);
  assert.deepEqual(saved.map(value => value.durationMinutes), sessionType === 'focus' ? [1, 1, 1, 2] : []);
}

const db = new PGlite();
const originalFetch = globalThis.fetch;
const keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const originalEnvironment = keys.map(key => process.env[key]);
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create table public.study_logs(user_id uuid references auth.users(id), session_id text,
      subject_name text, duration_minutes integer, session_timestamp bigint, unique(user_id, session_id));`);
  await db.exec(await readFile(new URL('../supabase/migrations/202610160001_temple_ledger.sql', import.meta.url), 'utf8'));
  const user = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  await db.query('insert into auth.users values ($1),($2)', [user, other]);
  const rpc = async (name, values) => Object.values((await db.query(`select public.${name}(${values.map((_, i) => `$${i + 1}`).join(',')})`, values)).rows[0])[0];
  const now = Date.now();
  await db.query('insert into public.study_logs values ($1,$2,$3,$4,$5)', [user, 'old-accepted-session', '數學', 60, now - 10 * 86400000]);
  const handler = load(await readFile(new URL('../api/study-logs.ts', import.meta.url), 'utf8'), () => ({ isServerSessionActive: async () => true })).default;
  for (const [i, key] of keys.entries()) process.env[key] = ['https://fixture.invalid', 'fixture-anon', 'fixture-service'][i];
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/v1/user')) return Response.json({ id: user });
    const input = JSON.parse(options.body);
    try {
      return Response.json(await rpc('record_study_session', [input.p_user_id, input.p_session_id, input.p_subject_name, input.p_duration_minutes, input.p_session_timestamp]));
    } catch (error) { return Response.json({ message: error.message }, { status: 400 }); }
  };
  const send = async (id, minutes, timestamp) => {
    const response = { code: 0, body: null, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await handler({ method: 'POST', headers: { authorization: 'Bearer fixture' }, body: { sessions: [{ sessionId: id, subjectName: '數學', durationMinutes: minutes, timestamp }] } }, response);
    return response;
  };
  const retry = await send('old-accepted-session', 60, now - 10 * 86400000);
  assert.equal(retry.code, 201, 'An already accepted session remains retryable after seven days');
  assert.equal(retry.body.temple.incenseCoins, 60);
  assert.equal((await send('new-expired-session', 60, now - 10 * 86400000)).code, 400);
  assert.equal((await send('old-accepted-session', 30, now - 10 * 86400000)).code, 409);
  assert.equal((await send('recent-focus-session', 30, now - 3600000)).code, 201);
  assert.equal((await send('recent-focus-session', 30, now - 3600000)).body.temple.incenseCoins, 90);
  assert.equal((await send('overlap-focus-session', 15, now - 3600000)).code, 409);
  assert.equal((await send('invalid-focus-session', 1.5, now)).code, 400);
  assert.equal((await send('future-focus-session', 1, now + 3600000)).code, 400);
  const workingFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => url.endsWith('/auth/v1/user') ? workingFetch(url, options) : Response.json({ code: 'PGRST202', message: 'fixture missing function' }, { status: 404 });
  const missingSetup = await send('setup-error-session', 1, now);
  assert.equal(missingSetup.code, 503);
  assert.equal(missingSetup.body.code, 'TEMPLE_SETUP_REQUIRED');
  const templeHandler = load(await readFile(new URL('../api/temple.ts', import.meta.url), 'utf8'), () => ({ isServerSessionActive: async () => true })).default;
  const missingRead = { code: 0, body: null, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
  await templeHandler({ method: 'GET', headers: { authorization: 'Bearer fixture' } }, missingRead);
  assert.equal(missingRead.body.code, 'TEMPLE_SETUP_REQUIRED');
  globalThis.fetch = workingFetch;
  const state = await rpc('perform_temple_ritual', [user, 'fortune-payment-once', 'fortune']);
  assert.equal(state.incenseCoins, 60);
  assert.equal((await rpc('perform_temple_ritual', [user, 'fortune-payment-once', 'fortune'])).incenseCoins, 60);
  await assert.rejects(rpc('perform_temple_ritual', [user, 'ticket-payment-denied', 'ticket']), /不足/);
  const sessions = (await db.query('select duration_minutes as "durationMinutes" from public.study_logs where user_id=$1', [user])).rows;
  assert.deepEqual(reconcileTempleCoins(sessions, state.incenseRecords, state.incenseCoins), { minutes: 90, earned: 90, spent: 30, balance: 60, matches: true });
  assert.equal(reconcileTempleCoins(sessions, state.incenseRecords, 61).matches, false);
  assert.equal(reconcileTempleCoins([], state.incenseRecords, 60).matches, false, 'Reset-filtered display history must not be mistaken for lifetime earnings');

  // Audit the trust boundary without claiming that local timers prove real study.
  const claimed = await rpc('record_study_session', [other, 'audit-client-duration', '數學', 1440, now]);
  console.log(`AUDIT LIMIT: a client-reported 1440-minute session can award ${claimed.incenseCoins} coins without server-side timer evidence. This is accounting consistency, not proof of study or complete anti-cheat.`);
  console.log('PASS: whole-minute rounding, no break awards, lifetime ledger reconciliation, expired retries, overlap/conflict errors, idempotent awards/payments and insufficient-balance protection');
} finally {
  globalThis.fetch = originalFetch;
  for (const [i, key] of keys.entries()) {
    if (originalEnvironment[i] === undefined) delete process.env[key]; else process.env[key] = originalEnvironment[i];
  }
  await db.close();
}
