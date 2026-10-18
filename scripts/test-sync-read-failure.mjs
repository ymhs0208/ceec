import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Execute the actual App upload job with controlled network responses, without
// rendering unrelated UI or duplicating its read-before-write logic.
const source = await readFile(new URL('../App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let job;
const visit = node => {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'doSync') job = node.initializer;
  ts.forEachChild(node, visit);
};
visit(ast);
assert.ok(job, 'App upload job must be covered by this test');
const compiled = ts.transpileModule(`return (${job.getText(ast)})();`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

for (const scenario of ['read-failed', 'auth-expired', 'overwrite-read-failed', 'merged-success', 'overwrite-success', 'write-conflict']) {
  const calls = [];
  const local = { studySessions: [], tasks: ['local'] };
  const remote = { studySessions: [], tasks: ['remote'] };
  const overwrite = scenario.startsWith('overwrite-');
  const readFailed = scenario.endsWith('read-failed') || scenario === 'read-failed';
  const expired = scenario === 'auth-expired';
  const dependencies = {
    syncTimeoutRef: { current: 123 }, syncInFlightRef: { current: false },
    syncPendingRef: { current: false }, forceOverwriteRef: { current: false },
    latestAppDataRef: { current: local }, skipRemoteMerge: overwrite,
    user: { email: 'fixture@example.invalid' }, encryptionKey: 'fixture',
    setIsSyncing: value => calls.push(['busy', value]),
    setStudySyncError() {},
    authService: {
      async getData() { calls.push(['read']); return { success: !readFailed && !expired, code: expired ? 'AUTH_REQUIRED' : undefined, data: remote, message: 'fixture outage' }; },
      isAuthError: response => response.code === 'AUTH_REQUIRED',
      async syncData(_email, _password, data) { calls.push(['write', data]); return scenario === 'write-conflict' ? { success: false, code: 'STATE_CONFLICT' } : { success: true }; },
      async syncStudyLogs() { calls.push(['ledger']); return { success: true }; },
    },
    handleAuthError: () => calls.push(['logout']),
    mergeAppDataForSync: (current, fetched) => { assert.equal(current, local); assert.equal(fetched, remote); return { studySessions: [], tasks: ['local', 'remote'] }; },
    pendingStudySessionIdsRef: { current: new Set() },
    applyTempleSyncData: () => assert.fail('No temple payload in this fixture'),
    setPendingStudySessionIds: () => assert.fail('No pending sessions in this fixture'),
    triggerSync: () => { assert.equal(scenario, 'write-conflict'); calls.push(['retry']); },
    readLogoutBackup: () => null,
    removeLogoutBackup: () => assert.fail('No backup exists in this fixture'),
    applyStudyHistoryReset() {},
    filterStudyHistory: sessions => sessions,
    studyHistoryResetRef: { current: 0 },
    console: { error() {} },
  };
  await new Function(...Object.keys(dependencies), compiled)(...Object.values(dependencies));
  const writes = calls.filter(([name]) => name === 'write');
  if (readFailed || expired) {
    assert.equal(writes.length, 0, `${scenario}: failed cloud read must never upload local state`);
    assert.equal(calls.some(([name]) => name === 'ledger'), false);
    assert.equal(dependencies.forceOverwriteRef.current, overwrite, 'Preserve an explicit reset for retry');
  } else {
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0][1].tasks, overwrite ? ['local'] : ['local', 'remote']);
    assert.equal(calls.some(([name]) => name === 'ledger'), scenario !== 'write-conflict');
    assert.equal(calls.some(([name]) => name === 'retry'), scenario === 'write-conflict');
  }
  assert.equal(calls.some(([name]) => name === 'logout'), expired);
  assert.equal(dependencies.syncInFlightRef.current, false);
  assert.deepEqual(calls.filter(([name]) => name === 'busy'), [['busy', true], ['busy', false]]);
}
console.log('PASS: failed/expired cloud reads never write; explicit resets survive failure; successful uploads merge remote state and release the sync lock');
