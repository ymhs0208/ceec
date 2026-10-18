import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const tempRoot = resolve(tmpdir());
const testDirectory = await mkdtemp(join(tempRoot, 'ceec-api-security-'));
const originalFetch = globalThis.fetch;
const originalError = console.error;
const keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'APP_STATE_ENCRYPTION_KEY'];
const originalEnvironment = Object.fromEntries(keys.map(key => [key, process.env[key]]));

try {
  await writeFile(join(testDirectory, 'package.json'), JSON.stringify({ type: 'module' }));
  for (const [input, output] of [
    ['services/serverSession.ts', 'services/serverSession.js'],
    ['api/app-state.ts', 'api/app-state.js'],
    ['api/study-logs.ts', 'api/study-logs.js'],
    ['api/temple.ts', 'api/temple.js'],
  ]) {
    // Keep real relative imports intact: Node must resolve the emitted modules.
    const source = await readFile(new URL(`../${input}`, import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
    await mkdir(dirname(join(testDirectory, output)), { recursive: true });
    await writeFile(join(testDirectory, output), compiled.outputText);
  }
  process.env.SUPABASE_URL = 'https://session-test.invalid';
  process.env.SUPABASE_ANON_KEY = 'fixture-public';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service';
  process.env.APP_STATE_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64');
  console.error = () => {}; // Expected failures must not clutter test output.
  const routes = [
    ['api/app-state.js', 'GET', undefined, 200],
    ['api/study-logs.js', 'POST', { sessions: [{ sessionId: 'session_1234567890', subjectName: 'math', durationMinutes: 25, timestamp: Date.now() }] }, 201],
    ['api/temple.js', 'GET', undefined, 200],
  ];
  for (const [filename, method, body, healthyStatus] of routes) {
    const { default: handler } = await import(pathToFileURL(join(testDirectory, filename)).href);
    for (const [scenario, expectedStatus] of [['active', healthyStatus], ['revoked', 401], ['missing-check', 500], ['invalid-token', 401], ['missing-token', 401]]) {
      let privilegedCalls = 0;
      globalThis.fetch = async (url, options) => {
        const path = new URL(url).pathname;
        if (path === '/auth/v1/user') {
          return new Response(JSON.stringify({ id: '00000000-0000-4000-8000-000000000001' }), { status: scenario === 'invalid-token' ? 401 : 200 });
        }
        if (path === '/rest/v1/rpc/is_current_session_active') {
          assert.equal(options.headers.apikey, 'fixture-public');
          assert.equal(options.headers.Authorization, 'Bearer fixture-token');
          return new Response(JSON.stringify(scenario === 'active'), { status: scenario === 'missing-check' ? 404 : 200 });
        }
        assert.equal(options.headers.apikey, 'fixture-service');
        privilegedCalls++;
        return new Response(JSON.stringify(filename === 'api/app-state.js' ? [] : filename === 'api/study-logs.js'
          ? { incenseCoins: 25, incenseRecords: [{ id: 'study:session_1234567890', amount: 25 }] } : {}), { status: 200 });
      };
      const response = {
        code: 0, payload: undefined,
        setHeader() {},
        status(code) { this.code = code; return this; },
        json(payload) { this.payload = payload; },
      };
      await handler({ method, headers: scenario === 'missing-token' ? {} : { authorization: 'Bearer fixture-token' }, body }, response);
      assert.equal(response.code, expectedStatus, `${filename}: ${scenario}`);
      assert.equal(privilegedCalls, scenario === 'active' ? 1 : 0, `${filename}: must deny before using service-role access`);
    }
  }
  // Exercise the actual app-state encryption endpoint, including legacy upgrade.
  const { default: stateHandler } = await import(pathToFileURL(join(testDirectory, 'api/app-state.js')).href);
  const owner = '00000000-0000-4000-8000-000000000001';
  let stored = null;
  let writes = 0;
  globalThis.fetch = async (url, options) => {
    const requestUrl = new URL(url);
    if (requestUrl.pathname === '/auth/v1/user') return Response.json({ id: owner });
    if (requestUrl.pathname === '/rest/v1/rpc/is_current_session_active') return Response.json(true);
    assert.equal(requestUrl.pathname, '/rest/v1/app_state');
    assert.equal(options.headers.Authorization, 'Bearer fixture-service');
    if (options.method === 'POST' || options.method === 'PATCH') {
      const rows = options.method === 'POST' ? JSON.parse(options.body) : [JSON.parse(options.body)];
      assert.equal(rows.length, 1);
      assert.equal(rows[0].user_id, owner);
      assert.equal(rows[0].data, null);
      assert.equal(rows[0].encrypted_data.version, 1);
      if (options.method === 'POST' && stored) return Response.json({ code: '23505' }, { status: 409 });
      if (options.method === 'PATCH' && requestUrl.searchParams.get('updated_at') !== `eq.${stored?.updated_at}`) return Response.json([]);
      stored = rows[0];
      writes++;
      return Response.json(rows);
    }
    assert.equal(requestUrl.searchParams.get('user_id'), `eq.${owner}`);
    return Response.json(stored ? [stored] : []);
  };
  const stateRequest = async (method, data, revision = stored?.updated_at ?? null) => {
    const result = {
      code: 0, payload: undefined,
      setHeader(name, value) { assert.equal(name, 'Cache-Control'); assert.equal(value, 'no-store'); },
      status(code) { this.code = code; return this; },
      json(payload) { this.payload = payload; },
    };
    await stateHandler({ method, headers: { authorization: 'Bearer fixture-token' }, body: { data, revision } }, result);
    return result;
  };
  const plaintext = { notes: 'private fixture', user_id: 'spoofed-owner', incenseCoins: 999, incenseRecords: ['fake'], templeState: {} };
  const expected = { notes: plaintext.notes, user_id: plaintext.user_id };
  assert.equal((await stateRequest('PUT', plaintext)).code, 200);
  assert.ok(!JSON.stringify(stored).includes(plaintext.notes));
  const firstIv = stored.encrypted_data.iv;
  assert.deepEqual((await stateRequest('GET')).payload.data, expected);
  const staleRevision = stored.updated_at;
  assert.equal((await stateRequest('PUT', plaintext)).code, 200);
  assert.notEqual(stored.encrypted_data.iv, firstIv);
  assert.equal((await stateRequest('PUT', { notes: 'stale device' }, staleRevision)).code, 409);
  assert.equal((await stateRequest('PUT', { notes: 'second initial writer' }, null)).code, 409);
  assert.deepEqual((await stateRequest('GET')).payload.data, expected, 'Concurrent stale writers cannot erase the first device changes');
  const writesBeforeInvalid = writes;
  assert.equal((await stateRequest('PUT', { notes: 'x'.repeat(1_000_001) })).code, 400);
  assert.equal((await stateRequest('PUT', undefined)).code, 400);
  assert.equal(writes, writesBeforeInvalid);
  stored = { user_id: owner, data: { notes: 'legacy fixture' }, encrypted_data: null, updated_at: '2026-10-01T00:00:00.000Z' };
  assert.deepEqual((await stateRequest('GET')).payload.data, { notes: 'legacy fixture' });
  assert.equal(stored.data, null);
  assert.ok(stored.encrypted_data);
  assert.deepEqual((await stateRequest('GET')).payload.data, { notes: 'legacy fixture' });
  stored.encrypted_data.tag = Buffer.alloc(16, 1).toString('base64');
  assert.equal((await stateRequest('GET')).code, 500);
  console.log('PASS: three APIs reject revoked credentials before privileged access; app-state encrypts/decrypts, binds writes to authenticated owner, strips ledger values, validates size, upgrades legacy data and rejects corrupted ciphertext');
} finally {
  globalThis.fetch = originalFetch;
  console.error = originalError;
  for (const key of keys) {
    if (originalEnvironment[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnvironment[key];
  }
  const resolvedDirectory = resolve(testDirectory);
  assert.equal(dirname(resolvedDirectory), tempRoot);
  assert.ok(basename(resolvedDirectory).startsWith('ceec-api-security-'));
  await rm(resolvedDirectory, { recursive: true, force: true });
}
