import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', compile(await readFile(new URL('../utils/logoutBackup.ts', import.meta.url), 'utf8')))(module, module.exports);
const { saveLogoutBackup, readLogoutBackup, removeLogoutBackup, ACCOUNT_STORAGE_KEYS } = module.exports;
const historyModule = { exports: {} };
new Function('module', 'exports', compile(await readFile(new URL('../utils/studyHistory.ts', import.meta.url), 'utf8')))(historyModule, historyModule.exports);
const { filterStudyHistory, mergeStudyHistoryReset } = historyModule.exports;
const storageModule = { exports: {} };
new Function('module', 'exports', compile(await readFile(new URL('../utils/storage.ts', import.meta.url), 'utf8')))(storageModule, storageModule.exports);
const map = new Map();
const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
const data = { tasks: [{ id: 'unsent-task' }], completedTaskIds: ['completed-before-deletion'], studySessions: [{ id: 'unsent-session' }], challengeRecords: [], customDates: [], playlists: [], incenseRecords: [], deletedTaskIds: ['deleted-task'], syncMetadata: { targetSchool: 123 }, examChecklist: { ready: true }, targetSchool: 'saved-school' };
saveLogoutBackup('owner-a', data, ['unsent-session'], storage);
const original = readLogoutBackup('owner-a', storage);
assert.deepEqual(original.data, data);
assert.deepEqual(original.pendingSessionIds, ['unsent-session']);
assert.equal(readLogoutBackup('owner-b', storage), null);
assert.equal(readLogoutBackup('', storage), null);
saveLogoutBackup('owner-a', { ...data, tasks: [...data.tasks, { id: 'newer-task' }] }, ['unsent-session'], storage);
removeLogoutBackup('owner-a', storage, original);
assert.equal(readLogoutBackup('owner-a', storage).data.tasks.length, 2, 'Old in-flight upload must not delete a newer backup');
const latest = readLogoutBackup('owner-a', storage);
removeLogoutBackup('owner-a', storage, latest);
assert.equal(readLogoutBackup('owner-a', storage), null);
assert.throws(() => saveLogoutBackup('owner-a', data, [], { ...storage, setItem() { throw new DOMException('full', 'QuotaExceededError'); } }), { name: 'QuotaExceededError' });
assert.throws(() => saveLogoutBackup('owner-a', data, [], { ...storage, setItem() {}, getItem() { return null; } }), /verification/);

const source = await readFile(new URL('../App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) declarations.set(node.name.text, node.initializer);
  ts.forEachChild(node, visit);
}
visit(ast);
const helperNames = ['mergeCompletedTaskIds', 'mergeById', 'mergeDeletedIds', 'mergeSyncMetadata', 'chooseNewestValue', 'mergeDeletedTracks', 'applyCustomDateDeletions', 'mergePlaylists', 'mergeAppDataForSync'];
const helpers = new Function('filterStudyHistory', 'mergeStudyHistoryReset', compile(helperNames.map(name => `const ${name} = ${declarations.get(name).getText(ast)};`).join('\n') + `\nreturn { ${helperNames.join(',')} };`))(filterStudyHistory, mergeStudyHistoryReset);
for (const scenario of ['owner-a', 'owner-b', 'owner-a-quota']) {
  const owner = scenario === 'owner-a-quota' ? 'owner-a' : scenario;
  const quota = scenario === 'owner-a-quota';
  map.clear();
  saveLogoutBackup('owner-a', data, ['unsent-session'], storage);
  const controller = storageModule.exports.createSafeStorage(() => ({ ...storage, setItem(key, value) {
    if (quota) throw new DOMException('full', 'QuotaExceededError');
    storage.setItem(key, value);
  } }));
  const restored = new Map();
  const setters = Object.fromEntries(Array.from(declarations.get('handleLoginSuccess').getText(ast).matchAll(/\b(set[A-Z]\w*)\(/g), match => [match[1], value => restored.set(match[1], value)]));
  let reloads = 0;
  const dependencies = {
    ...helpers, ...setters, filterStudyHistory, mergeStudyHistoryReset, studyHistoryResetRef: { current: 0 }, authInvalidationHandledRef: { current: true }, safeLocalStorage: controller.storage,
    localStorageController: controller,
    ACCOUNT_STORAGE_KEYS,
    readStoredJson: (key, fallback) => JSON.parse(controller.storage.getItem(key) || JSON.stringify(fallback)),
    targetSchool: '', targetMajor: '', targetDateStr: '', dailyGoal: 120, streak: {}, activePlaylistId: 'default', examChecklist: {},
    readLogoutBackup: id => readLogoutBackup(id, storage),
    deletedTaskIds: [], tasks: [], completedTaskIds: [], studySessions: [], challengeRecords: [], customDates: [], playlists: [], incenseRecords: [],
    deletedCustomDateIds: [], deletedPlaylistIds: [], deletedTrackIds: {}, syncMetadata: {},
    pendingStudySessionIdsRef: { current: new Set() }, sessionStorage: storage,
    window: { location: { replace() { reloads++; } } }, buildAppRoute: () => '/fixture', activePage: 'home', targetExam: '116gsat',
  };
  const login = new Function(...Object.keys(dependencies), compile(`return (${declarations.get('handleLoginSuccess').getText(ast)});`))(...Object.values(dependencies));
  login({ email: 'fixture@example.invalid', name: 'fixture' }, { tasks: [], studySessions: [], challengeRecords: [], customDates: [], playlists: [], incenseRecords: [] }, owner);
  assert.deepEqual(JSON.parse(controller.storage.getItem('gsat_tasks')), owner === 'owner-a' ? data.tasks : []);
  if (owner === 'owner-a') {
    assert.deepEqual(JSON.parse(controller.storage.getItem('gsat_completed_task_ids')), data.completedTaskIds);
    assert.deepEqual(JSON.parse(controller.storage.getItem('gsat_pending_study_session_ids')), ['unsent-session']);
    assert.equal(controller.storage.getItem('gsat_target_school'), 'saved-school');
    assert.deepEqual(JSON.parse(controller.storage.getItem('gsat_exam_checklist')), data.examChecklist);
  }
  assert.ok(readLogoutBackup('owner-a', storage), 'Keep backup until cloud confirms synchronization');
  assert.equal(reloads, quota ? 0 : 1, 'Login must not reload after a failed save');
  if (quota) {
    assert.deepEqual(restored.get('setTasks'), data.tasks);
    assert.deepEqual(restored.get('setPendingStudySessionIds'), ['unsent-session']);
    assert.equal(controller.getSnapshot().failed, true);
  }
}
// Expired sessions keep a live cache. A new owner must never adopt it.
for (const backupFails of [false, true]) {
  map.clear();
  map.set('gsat_user_key', 'owner-a');
  map.set('gsat_user_profile', JSON.stringify({ email: 'a@example.invalid' }));
  map.set('gsat_study_history', JSON.stringify(data.studySessions));
  const calls = [];
  const setters = Object.fromEntries(Array.from(declarations.get('handleLoginSuccess').getText(ast).matchAll(/\b(set[A-Z]\w*)\(/g), match => [match[1], value => calls.push([match[1], value])]));
  const deps = {
    ...helpers, ...setters, localStorageController: { getFailureVersion: () => 0 }, safeLocalStorage: storage,
    readLogoutBackup: owner => readLogoutBackup(owner, storage),
    ACCOUNT_STORAGE_KEYS, latestAppDataRef: { current: data }, getCurrentData: () => data,
    syncTimeoutRef: { current: null }, pendingStudySessionIdsRef: { current: new Set(['unsent-session']) },
    saveLogoutBackup(owner, snapshot, pending) { if (backupFails) throw new Error('quota'); saveLogoutBackup(owner, snapshot, pending, storage); },
    authService: { async logout() { calls.push(['logout']); } },
    buildAppRoute: () => '/fixture', activePage: 'home',
    window: { alert() { calls.push(['warning']); }, location: { replace() { calls.push(['reload']); } } },
  };
  const login = new Function(...Object.keys(deps), compile(`return (${declarations.get('handleLoginSuccess').getText(ast)});`))(...Object.values(deps));
  login({ email: 'b@example.invalid', name: 'B' }, { targetExam: '116gsat' }, 'owner-b');
  assert.equal(calls.some(([name]) => name === 'reload'), !backupFails);
  assert.equal(map.get('gsat_user_key'), backupFails ? 'owner-a' : 'owner-b');
  if (!backupFails) {
    assert.equal(map.has('gsat_study_history'), false);
    assert.deepEqual(readLogoutBackup('owner-a', storage).data, data, 'Old owner data remains recoverable only by its owner');
  } else assert.ok(map.has('gsat_study_history'));
}

for (const scenario of ['normal', 'backup-failed', 'delete-account']) {
  map.clear();
  map.set('gsat_study_history', '["unsent-session"]');
  map.set('gsat_completed_task_ids', '["completed-before-deletion"]');
  map.set('gsat_pending_study_session_ids', '["unsent-session"]');
  const calls = [];
  const dependencies = {
    prepareLogout() {
      calls.push('backup');
      if (scenario === 'backup-failed') return false;
      saveLogoutBackup('owner-a', data, ['unsent-session'], storage);
      return true;
    },
    removeLogoutBackup: ownerId => removeLogoutBackup(ownerId, storage), encryptionKey: 'owner-a',
    ACCOUNT_STORAGE_KEYS,
    syncTimeoutRef: { current: null },
    authService: { async logout() { calls.push('signout'); } }, safeLocalStorage: storage,
    setUser() {}, setEncryptionKey() {}, setIsCloudStateReady() {},
    window: { location: { reload() { calls.push('reload'); } } },
  };
  const logout = new Function(...Object.keys(dependencies), compile(`return (${declarations.get('handleLogout').getText(ast)});`))(...Object.values(dependencies));
  await logout(scenario === 'delete-account');
  if (scenario === 'backup-failed') {
    assert.deepEqual(calls, ['backup']);
    assert.ok(map.has('gsat_study_history'));
    assert.ok(map.has('gsat_pending_study_session_ids'));
  } else {
    assert.equal(map.has('gsat_study_history'), false);
    assert.equal(map.has('gsat_completed_task_ids'), false);
    assert.equal(map.has('gsat_pending_study_session_ids'), false);
    assert.deepEqual(calls, scenario === 'normal' ? ['backup', 'signout', 'reload'] : ['signout', 'reload']);
    assert.equal(Boolean(readLogoutBackup('owner-a', storage)), scenario === 'normal');
  }
}

// Security-sensitive account actions must preserve data before revoking this
// session. Execute the real handlers with a failed preflight backup.
const accountSource = await readFile(new URL('../components/AccountPage.tsx', import.meta.url), 'utf8');
const accountAst = ts.createSourceFile('AccountPage.tsx', accountSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = new Map();
function collect(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) handlers.set(node.name.text, node.initializer);
  ts.forEachChild(node, collect);
}
collect(accountAst);
for (const name of ['handleLogoutCurrent', 'handleLogoutAllSessions', 'handleRemoveSession']) {
  const dependencies = { onPrepareLogout: () => false, currentDeviceId: 'current-device', authService: new Proxy({}, { get() { assert.fail('Backup failure must stop session revocation'); } }) };
  const handler = new Function(...Object.keys(dependencies), compile(`return (${handlers.get(name).getText(accountAst)});`))(...Object.values(dependencies));
  await handler('current-device');
}
console.log('PASS: logout backs up unsent state before cleanup; quota failure blocks logout/revocation; owner isolation and pending IDs preserved; old uploads cannot remove newer backups; account deletion discards backup');
