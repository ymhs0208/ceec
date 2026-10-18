import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const module = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(await readFile(new URL('../api/study-logs.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText)(() => ({ isServerSessionActive: async () => true }), module, module.exports);
const handler = module.exports.default;
const originalFetch = globalThis.fetch;
const keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
const originalEnv = keys.map(key => process.env[key]);
const userId = '00000000-0000-4000-8000-000000000001', sessionId = 'new-focus-session-proof';
const receipt = { id: `study:${sessionId}`, amount: 25 };
const paid = { incenseCoins: 25, incenseRecords: [receipt] };
try {
  for (const [i, key] of keys.entries()) process.env[key] = ['https://fixture.invalid', 'fixture-public', 'fixture-service'][i];
  for (const scenario of ['credited', 'already-spent', 'reader-repairs', 'missing', 'underpaid', 'wrong-session', 'repair-receipt', 'missing-function']) {
    const requests = [];
    globalThis.fetch = async (url, options) => {
      const path = new URL(url).pathname;
      if (path === '/auth/v1/user') return Response.json({ id: userId });
      const body = JSON.parse(options.body); requests.push({ path, body });
      assert.equal(body.p_user_id, userId);
      if (scenario === 'missing-function') return Response.json({ code: 'PGRST202' }, { status: 404 });
      if (scenario === 'already-spent') return Response.json({ incenseCoins: 0, incenseRecords: [receipt, { id: 'study:earlier-session', amount: 5 }, { id: 'ritual:fortune', amount: -30 }] });
      if (scenario === 'reader-repairs') return Response.json(path.endsWith('/record_study_session') ? {} : paid);
      if (scenario === 'credited') return Response.json(paid);
      if (scenario === 'repair-receipt') return Response.json({ incenseCoins: 25, incenseRecords: [{ ...receipt, amount: 20 }, { id: 'study-credit-repair:proof:25', studySessionId: sessionId, amount: 5 }] });
      if (scenario === 'underpaid') return Response.json({ incenseCoins: 24, incenseRecords: [{ ...receipt, amount: 24 }] });
      if (scenario === 'wrong-session') return Response.json({ incenseCoins: 100, incenseRecords: [{ id: 'study:unrelated-session', amount: 100 }] });
      return Response.json({ incenseCoins: 100, incenseRecords: [] });
    };
    const response = { code: 0, body: null, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    await handler({ method: 'POST', headers: { authorization: 'Bearer fixture' }, body: { userId: 'never-trust-this', sessions: [{ sessionId, subjectName: '數學', durationMinutes: 25, timestamp: Date.now() }] } }, response);
    const confirmed = ['credited', 'already-spent', 'reader-repairs', 'repair-receipt'].includes(scenario);
    assert.equal(response.code, confirmed ? 201 : 503, scenario);
    if (!confirmed) assert.equal(response.body.code, scenario === 'missing-function' ? 'TEMPLE_SETUP_REQUIRED' : 'STUDY_CREDIT_UNCONFIRMED');
    assert.equal(requests.filter(item => item.path.endsWith('/record_study_session')).length, 1, 'Never retry with a new ID or directly issue browser-calculated coins');
    assert.equal(requests.filter(item => item.path.endsWith('/get_temple_state')).length, ['reader-repairs', 'missing', 'underpaid', 'wrong-session'].includes(scenario) ? 1 : 0);
  }
  console.log('PASS: new study writes only acknowledge matching coin receipts; server-only reconciliation, spent balances, partial repairs, under-awards, unrelated awards and missing setup');
} finally {
  globalThis.fetch = originalFetch;
  for (const [i, key] of keys.entries()) {
    if (originalEnv[i] === undefined) delete process.env[key]; else process.env[key] = originalEnv[i];
  }
}
