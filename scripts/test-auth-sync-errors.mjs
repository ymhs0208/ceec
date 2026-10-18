import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';

const tempRoot = resolve(tmpdir());
const directory = await mkdtemp(join(tempRoot, 'ceec-auth-sync-'));
const originalGlobals = Object.fromEntries(['fetch', 'navigator', 'window', 'localStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
try {
  const storage = new Map();
  const user = { id: 'fixture-user', email: 'fixture@example.invalid', user_metadata: {} };
  let authError = null;
  let apiCalls = 0;
  let deviceError = null;
  let rankingError = null;
  let responseStatus = 500;
  const query = {
    select() { return this; }, update() { return this; }, eq() { return this; },
    async maybeSingle() { return { data: { name: '測試帳號' }, error: null }; },
  };
  const signIn = async () => ({ data: { user: authError ? null : user }, error: authError });
  const client = {
    auth: {
      signInWithPassword: signIn, signInWithPasskey: signIn, verifyOtp: signIn,
      async getSession() { return { data: { session: { access_token: 'fixture-token' } }, error: null }; },
      async getUser() { return { data: { user }, error: null }; },
      async updateUser() { return { error: null }; },
    },
    from(table) { assert.equal(table, 'profiles'); return query; },
    async rpc(name) {
      if (name === 'get_rankings') return { data: { global_ranking: [], team_ranking: [] }, error: rankingError };
      assert.equal(name, 'register_current_device'); return { error: deviceError };
    },
  };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true, userAgent: 'fixture', credentials: {} } });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { PublicKeyCredential: class {} } });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  } });
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/app-state');
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Authorization, 'Bearer fixture-token');
    apiCalls++;
    return responseStatus === 500
      ? new Response('FUNCTION_INVOCATION_FAILED', { status: 500 })
      : Response.json(responseStatus === 200 ? { data: { team: 'fixture-team' } } : { error: 'Authentication session missing' }, { status: responseStatus });
  };
  // This frontend module uses bundler imports. Inject only its browser SDK boundary;
  // execute the original account-loading and error-handling implementation.
  const source = await readFile(new URL('../services/authService.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  const nativeRequire = createRequire(import.meta.url);
  const requireFixture = name => name === './supabaseClient'
    ? { requireSupabase: () => client, initialAuthCallbackHref: '' }
    : name === '../utils/storage' ? { safeLocalStorage: globalThis.localStorage }
    : nativeRequire(name);
  new Function('require', 'module', 'exports', compiled)(requireFixture, module, module.exports);
  const { authService } = module.exports;
  const flows = [
    () => authService.login(user.email, 'fixture-password'),
    () => authService.loginWithPasskey(),
    () => authService.verifyOneTimeLoginCode(user.email, '123456'),
    () => authService.updateProfile({ name: '測試帳號' }),
    () => authService.completeOnboarding({ name: '測試帳號', examType: '116gsat', team: 'fixture-team' }),
  ];
  for (const flow of flows) {
    responseStatus = 500;
    const failed = await flow();
    assert.equal(failed.success, false);
    assert.match(failed.message, /雲端資料暫時無法同步/);
    assert.equal(failed.data, undefined);
    responseStatus = 200;
    const success = await flow();
    assert.equal(success.success, true);
    assert.equal(success.data.team, 'fixture-team');
  }
  responseStatus = 401;
  assert.match((await authService.login(user.email, 'fixture-password')).message, /登入已失效/);
  responseStatus = 200;
  deviceError = { status: 401, message: 'Authentication session missing' };
  assert.equal((await authService.login(user.email, 'fixture-password')).success, false);
  deviceError = null;
  authError = { status: 400, message: 'Invalid login credentials' };
  const before = apiCalls;
  assert.equal((await authService.login(user.email, 'wrong-password')).message, 'Email 或密碼錯誤');
  assert.equal(apiCalls, before);
  rankingError = { code: '42P01', message: 'relation "public.team_ranking_snapshots" does not exist' };
  const originalConsoleError = console.error;
  try {
    console.error = () => {};
    const failedRanking = await authService.getRanking();
    assert.equal(failedRanking.success, false);
    assert.match(failedRanking.message, /排行榜暫時無法載入/);
  } finally { console.error = originalConsoleError; }
  rankingError = null;
  const emptyRanking = await authService.getRanking();
  assert.equal(emptyRanking.success, true);
  assert.deepEqual(emptyRanking.globalRanking, []);
  console.log('PASS: five account flows handle encrypted-state outages without rejecting, recover successfully, and distinguish expired sessions and invalid credentials');
} finally {
  for (const [key, descriptor] of Object.entries(originalGlobals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
  assert.equal(dirname(directory), tempRoot);
  assert.ok(basename(directory).startsWith('ceec-auth-sync-'));
  await rm(directory, { recursive: true, force: true });
}
