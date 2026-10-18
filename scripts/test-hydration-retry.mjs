import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effect;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect'
    && node.arguments[0]?.getText(ast).includes('const hydrateCloudState')) effect = node.arguments[0];
  ts.forEachChild(node, visit);
}
visit(ast);
let online = false, reads = 0, ready = false, sessions = [], pending = [];
const listeners = new Map();
const deps = {
  user: { email: 'fixture@example.invalid' }, encryptionKey: 'owner-a',
  setIsCloudStateReady: value => { ready = value; },
  authService: {
    async getData() { reads++; return { success: online }; },
    async getStudySessions() { return { success: online, sessions: [] }; },
    isAuthError: () => false,
  },
  handleAuthError: () => assert.fail('Network failure is not an expired session'),
  applyStudyHistoryReset() {}, studySessions: [{ id: 'year-old-offline-session', durationMinutes: 25, timestamp: Date.now() - 365 * 86400000 }], studyHistoryResetRef: { current: 0 },
  mergeById: (local, remote = []) => [...new Map([...remote, ...local].map(row => [row.id, row])).values()],
  filterStudyHistory: history => history,
  setStudySessions: update => { sessions = update(sessions); },
  setPendingStudySessionIds: update => { pending = update(pending); },
  window: { addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name) },
  console: { error() {} },
};
const compiled = ts.transpileModule(`return (${effect.getText(ast)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const cleanup = new Function(...Object.keys(deps), compiled)(...Object.values(deps))();
const settle = () => new Promise(resolve => setImmediate(resolve));
await settle();
assert.equal(reads, 1); assert.equal(ready, false);
online = true;
listeners.get('online')(); listeners.get('focus')();
await settle();
assert.equal(reads, 2, 'Reconnect retries failed hydration once, without parallel duplicate reads');
assert.equal(ready, true);
assert.deepEqual(pending, ['year-old-offline-session'], 'Initial hydration queues old offline history regardless of age');
listeners.get('focus')(); await settle();
assert.equal(reads, 2, 'Successful hydration is not replayed on every focus');
cleanup(); assert.equal(listeners.size, 0);
console.log('PASS: offline startup recovers on reconnect, duplicate retries are coalesced and listeners are cleaned up');
