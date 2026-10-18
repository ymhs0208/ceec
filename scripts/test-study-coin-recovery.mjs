import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const load = source => { const module = { exports: {} }; new Function('module', 'exports', compile(source))(module, module.exports); return module.exports; };
const { reconcileTempleCoins, getTempleCoinDifferences } = load(await readFile(new URL('../utils/templeReconciliation.ts', import.meta.url), 'utf8'));
const source = await readFile(new URL('../App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let check, retryEffect, confirmationStatements;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleCheckStudySync') check = node.initializer.getText(ast);
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('setInterval(retryPending')) retryEffect = node.arguments[0].getText(ast);
  if (ts.isIfStatement(node) && node.expression.getText(ast) === 'studyLogsRes.success' && node.thenStatement.getText(ast).includes('getTempleCoinDifferences')) {
    confirmationStatements = node.thenStatement.statements.slice(0, 3).map(statement => statement.getText(ast)).join('\n');
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const mergeById = (a = [], b = []) => [...new Map([...a, ...b].map(item => [item.id, item])).values()];
const now = Date.now();
const row = (id, days = 0) => ({ id, subjectId: 'math', subjectName: '數學', durationMinutes: 30, timestamp: now - days * 86400000 });
for (const scenario of ['success', 'partial', 'outage', 'already-stored-uncredited']) {
  const success = ['success', 'already-stored-uncredited'].includes(scenario);
  const accepted = row('already-accepted', 1), pending = row('pending-session-a'), pendingB = row('pending-session-b'), expired = row('old-local-session', 8);
  const local = [accepted, pending, pendingB, expired];
  let ids = ['pending-session-a', 'pending-session-b'], release, settled = false, syncError = '', applied;
  const acknowledged = success ? [pending, pendingB, expired] : scenario === 'partial' ? [pending] : [];
  const total = 30 + acknowledged.length * 30;
  const temple = { incenseCoins: total, incenseRecords: [accepted, ...acknowledged].map(session => ({ id: `study:${session.id}`, amount: 30 })), templeState: { lamps: [], fortunes: [], ticketOffered: false } };
  const dependencies = {
    user: { email: 'fixture@example.invalid' }, encryptionKey: 'fixture-owner', team: 'test-team',
    pendingStudySessionIdsRef: { current: new Set(['pending-session-a', 'pending-session-b']) },
    authService: {
      async getData() { return { success: true, data: { studySessions: local } }; },
      async getStudySessions() { return { success: true, sessions: scenario === 'already-stored-uncredited' ? [accepted, pending] : [accepted] }; },
      async syncStudyLogs(sessions, team, owner) {
        assert.equal(sessions.length, 3); assert.ok(sessions.some(session => session.id === expired.id)); assert.equal(owner, 'fixture-owner'); assert.equal(team, 'test-team');
        await new Promise(resolve => { release = resolve; });
        return { success, syncedStudySessionIds: acknowledged.map(item => item.id), data: acknowledged.length ? temple : undefined, message: scenario === 'outage' ? '香火幣帳本尚未完成設定' : '部分紀錄時段重疊' };
      },
      async getTempleState() { assert.ok(release, 'The ledger must be refreshed after the repair attempt'); return { success: true, data: temple }; },
    },
    applyStudyHistoryReset() {}, latestAppDataRef: { current: { studySessions: local } }, studySessions: local,
    studyHistoryResetRef: { current: 0 }, filterStudyHistory: rows => rows, mergeById,
    setStudySessions() {}, setPendingStudySessionIds: update => { ids = update(ids); },
    reconcileStudyStreak: () => ({}), dailyGoal: 120, streak: {}, setStreak() {},
    getVerifiedAchievementIds: () => [], tasks: [], completedTaskIds: [], unlockedAchievementIdsRef: { current: new Set() },
    applyTempleSyncData: value => { applied = value; }, reconcileTempleCoins, getTempleCoinDifferences, setStudySyncError: value => { syncError = value; },
  };
  const handler = new Function(...Object.keys(dependencies), compile(`return (${check});`))(...Object.values(dependencies));
  const result = handler().then(value => { settled = true; return value; });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(settled, false, 'The check must await the actual write, not merely queue it');
  release(); const report = await result;
  assert.match(report, new RegExp(`本次補傳成功 ${acknowledged.length} 筆`));
  assert.match(report, new RegExp(`${3 - acknowledged.length} 筆仍待處理`));
  assert.doesNotMatch(report, /超過 7 天/);
  assert.match(report, /帳本一致/);
  if (scenario === 'already-stored-uncredited') assert.match(report, /已在專注帳本入帳 4 筆/);
  assert.deepEqual(ids.sort(), [pending, pendingB, expired].filter(item => !acknowledged.some(a => a.id === item.id)).map(item => item.id).sort());
  assert.equal(applied.incenseCoins, total);
  assert.equal(Boolean(syncError), !success);
}

// A transient failure retries without needing another saved session, but stops
// after five automatic attempts until new activity, reconnect or focus.
const events = new Map(); let tick, retries = 0, removed = false;
const navigator = { onLine: false }, document = { visibilityState: 'visible' }, pendingRef = { current: new Set(['unsent']) };
const window = { addEventListener: (name, fn) => events.set(name, fn), removeEventListener: name => events.delete(name), setInterval: fn => { tick = fn; return 1; }, clearInterval: () => { removed = true; } };
const deps = { window, navigator, document, pendingStudySessionIdsRef: pendingRef, triggerSync: () => { retries++; } };
const cleanup = new Function(...Object.keys(deps), compile(`return (${retryEffect})();`))(...Object.values(deps));
tick(); assert.equal(retries, 0);
navigator.onLine = true; for (let i = 0; i < 7; i++) tick(); assert.equal(retries, 5);
events.get('focus')(); assert.equal(retries, 6);
pendingRef.current.clear(); tick(); assert.equal(retries, 6);
cleanup(); assert.equal(events.size, 0); assert.equal(removed, true);
for (const scenario of ['no-read', 'missing-receipt', 'underpaid', 'confirmed']) {
  let pending = ['stored-but-pending', 'not-yet-uploaded'];
  const dependencies = { studyLogsRes: { success: true, sessions: [{ ...row('stored-but-pending'), durationMinutes: 25 }] },
    templeRes: { success: scenario !== 'no-read', data: { incenseRecords: scenario === 'missing-receipt' ? [] : [{ id: 'study:stored-but-pending', amount: scenario === 'confirmed' ? 25 : 24 }] } },
    getTempleCoinDifferences, setPendingStudySessionIds: update => { pending = update(pending); } };
  new Function(...Object.keys(dependencies), compile(confirmationStatements))(...Object.values(dependencies));
  assert.deepEqual(pending, scenario === 'confirmed' ? ['not-yet-uploaded'] : ['stored-but-pending', 'not-yet-uploaded'], 'A study row alone cannot clear a pending coin award');
}
console.log('PASS: awaited coin recovery, partial acknowledgements, setup/outage feedback, all-age history recovery, bounded automatic retries and cleanup');
