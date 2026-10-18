import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { createServer } from 'node:http';

const require = createRequire(import.meta.url);
let stored = null;
let upstreamFailure;
let revoked = false;
let privilegedCalls = 0;
const fixture = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://fixture.invalid');
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let value;
    if (url.pathname === '/auth/v1/user') value = { id: 'fixture-owner' };
    else if (url.pathname === '/rest/v1/rpc/is_current_session_active') {
      assert.equal(req.headers.authorization, 'Bearer fixture-token');
      value = !revoked;
    } else {
      assert.equal(req.headers.authorization, 'Bearer fixture-service');
      privilegedCalls++;
      if (url.pathname === '/rest/v1/app_state') {
        if (req.method === 'POST') {
          [stored] = JSON.parse(raw);
          assert.equal(stored.data, null);
          assert.equal(stored.encrypted_data.version, 1);
        }
        value = stored ? [stored] : [];
      } else if (url.pathname === '/rest/v1/rpc/record_study_session') {
        const body = JSON.parse(raw);
        value = { incenseCoins: 25, incenseRecords: [{ id: `study:${body.p_session_id}`, amount: 25 }] };
      } else {
        assert.equal(url.pathname, '/rest/v1/rpc/get_temple_state');
        value = { incenseCoins: 25 };
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(value));
  } catch (error) {
    upstreamFailure = error;
    res.writeHead(500); res.end('{}');
  }
});
await new Promise(resolve => fixture.listen(0, '127.0.0.1', resolve));
const reserve = createServer();
await new Promise(resolve => reserve.listen(0, '127.0.0.1', resolve));
const port = reserve.address().port;
await new Promise(resolve => reserve.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const args = ['dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', '0', '--log-level', 'error'];
for (const [key, value] of Object.entries({
  SUPABASE_URL: `http://127.0.0.1:${fixture.address().port}`,
  SUPABASE_ANON_KEY: 'fixture-public', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service',
  APP_STATE_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
})) args.push('--var', `${key}:${value}`);
const worker = spawn(process.execPath, [join(dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js'), ...args], {
  stdio: 'pipe', env: { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' },
});
let logs = '';
worker.stdout.on('data', chunk => { logs += chunk; });
worker.stderr.on('data', chunk => { logs += chunk; });
const request = (path, init = {}) => fetch(`${origin}${path}`, { ...init, signal: AbortSignal.timeout(10_000) });
try {
  let ready = false;
  for (let i = 0; i < 450; i++) {
    if (worker.exitCode !== null) throw new Error(`Worker exited: ${logs}`);
    ready = await request('/').then(r => r.ok).catch(() => false);
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Worker did not start: ${logs}`);
  const home = await request('/');
  const html = await home.text();
  assert.ok(html.includes('id="root"'));
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(home.headers.get('content-security-policy'));
  for (const path of ['/116gsat', '/116gsat/exam-checklist', '/116cap/announcements']) {
    const response = await request(path, { headers: { 'Sec-Fetch-Mode': 'navigate' } });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), html, `SPA fallback: ${path}`);
  }
  const assetPath = html.match(/src="([^\"]+\/assets\/[^\"]+\.js)"/)?.[1] || html.match(/src="(\/assets\/[^\"]+\.js)"/)?.[1];
  assert.ok(assetPath, 'Built JavaScript asset must be referenced');
  const asset = await request(assetPath);
  assert.equal(asset.status, 200);
  assert.ok(asset.headers.get('cache-control')?.includes('immutable'));
  const auth = { Authorization: 'Bearer fixture-token', 'Content-Type': 'application/json' };
  for (const [path, method] of [['/api/app-state','GET'],['/api/study-logs','POST'],['/api/temple','GET']]) {
    const response = await request(path, { method, headers: { 'Sec-Fetch-Mode': 'navigate' } });
    assert.equal(response.status, 401, `Unauthenticated API must not return HTML: ${path}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(privilegedCalls, 0);
  const data = { tasks: [{ id: 'task-one', title: '準備文具' }], incenseCoins: 999 };
  const write = await request('/api/app-state', { method: 'PUT', headers: auth, body: JSON.stringify({ data, revision: null }) });
  assert.equal(write.status, 200);
  assert.ok(stored.encrypted_data.ciphertext);
  assert.ok(!JSON.stringify(stored).includes('準備文具'));
  const read = await request('/api/app-state', { headers: auth });
  assert.deepEqual((await read.json()).data, { tasks: data.tasks });
  const session = { sessionId: 'fixture_session_123456', subjectName: 'math', durationMinutes: 25, timestamp: Date.now() };
  const study = await request('/api/study-logs', { method: 'POST', headers: auth, body: JSON.stringify({ sessions: [session] }) });
  assert.equal(study.status, 201);
  const temple = await request('/api/temple', { headers: auth });
  assert.equal((await temple.json()).data.incenseCoins, 25);
  const beforeRevocation = privilegedCalls;
  revoked = true;
  assert.equal((await request('/api/app-state', { headers: auth })).status, 401);
  assert.equal(privilegedCalls, beforeRevocation);
  assert.equal((await request('/api/missing', { headers: { 'Sec-Fetch-Mode': 'navigate' } })).status, 404);
  assert.equal((await request('/api/app-state', { method: 'DELETE' })).status, 405);
  assert.equal((await request('/api/app-state', { method: 'PUT', headers: auth, body: '{' })).status, 400);
  assert.equal((await request('/api/app-state', { method: 'PUT', headers: auth, body: 'x'.repeat(4_100_001) })).status, 413);
  if (upstreamFailure) throw upstreamFailure;
  console.log('PASS: real workerd SPA/assets/headers; all three APIs; environment bindings; encryption round-trip; revoked sessions; invalid JSON and size limits');
} finally {
  worker.kill('SIGTERM');
  await new Promise(resolve => { if (worker.exitCode !== null) resolve(); else worker.once('exit', resolve); });
  fixture.closeAllConnections();
  await new Promise(resolve => fixture.close(resolve));
}
