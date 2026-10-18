import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', compile(await readFile(new URL('../utils/storage.ts', import.meta.url), 'utf8')))(module, module.exports);
const { createSafeStorage } = module.exports;
const persisted = new Map([['gsat_tasks', '["old-task"]']]);
let full = true;
const controller = createSafeStorage(() => ({
  getItem: key => persisted.get(key) ?? null,
  setItem(key, value) { if (full) throw new DOMException('full', 'QuotaExceededError'); persisted.set(key, value); },
  removeItem: key => persisted.delete(key),
}));
controller.storage.setItem('gsat_tasks', '["new-task"]');
assert.equal(controller.getSnapshot().reason, 'quota');
assert.equal(controller.storage.getItem('gsat_tasks'), '["new-task"]');
assert.equal(persisted.get('gsat_tasks'), '["old-task"]');
controller.storage.setItem('gsat_tasks', '["latest-task"]');
controller.retry();
assert.equal(controller.getSnapshot().failed, true, 'Failed retry must keep the warning');
assert.throws(() => controller.writeRequired('gsat_study_history_reset_at', '100'), /write failed/);
full = false;
controller.retry();
assert.equal(persisted.get('gsat_tasks'), '["latest-task"]');
assert.equal(persisted.has('gsat_study_history_reset_at'), false, 'Cancelled reset must never be queued for retry');
assert.equal(controller.getSnapshot().failed, false);
assert.equal(persisted.has('gsat_storage_probe'), false);
const denied = createSafeStorage(() => { throw new DOMException('denied', 'SecurityError'); });
assert.equal(denied.storage.getItem('any'), null);
assert.doesNotThrow(() => denied.storage.setItem('key', 'unsaved'));
assert.equal(denied.storage.getItem('key'), 'unsaved');
assert.equal(denied.getSnapshot().reason, 'unavailable');

// Execute App's real persistence effect under quota exhaustion. It must keep
// running and permit an independent cloud-sync attempt rather than crash React.
const source = await readFile(new URL('../App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let effect;
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes("safeLocalStorage.setItem('gsat_tasks'")) effect = node.arguments[0];
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(effect);
let attemptedCloudSync = false;
full = true;
const deps = { safeLocalStorage: controller.storage, tasks: [{ id: 'unsent' }], triggerSync() { attemptedCloudSync = true; }, forceSyncRef: { current: false } };
assert.doesNotThrow(() => new Function(...Object.keys(deps), compile(`return (${effect.getText(ast)})();`))(...Object.values(deps)));
assert.equal(attemptedCloudSync, true);
assert.deepEqual(JSON.parse(controller.storage.getItem('gsat_tasks')), [{ id: 'unsent' }]);
const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
try {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => persisted.get(key) ?? null, setItem: (key, value) => persisted.set(key, value), removeItem: key => persisted.delete(key),
  } });
  const readerModule = { exports: {} };
  new Function('module', 'exports', compile(await readFile(new URL('../utils/storage.ts', import.meta.url), 'utf8')))(readerModule, readerModule.exports);
  const { readStoredJson } = readerModule.exports;
  for (const invalid of ['null', '{}', '42', '"history"']) {
    persisted.set('gsat_study_history', invalid);
    assert.deepEqual(readStoredJson('gsat_study_history', []), []);
  }
  const good = { id: 'ok', subjectId: 'math', subjectName: '數學', durationMinutes: 25, timestamp: 1000 };
  persisted.set('gsat_study_history', JSON.stringify([null, {}, { ...good, durationMinutes: '25' }, good]));
  assert.deepEqual(readStoredJson('gsat_study_history', []), [good], 'Invalid rows must not crash statistics or fabricate minutes');
  const validTask = { id: 'valid-task', text: '保留任務', completed: true, category: 'math', dueDate: '2027-01-01' };
  persisted.set('gsat_tasks', JSON.stringify([null, 42, {}, { id: 'broken' }, validTask, { id: 'legacy', text: '舊任務', category: 42, dueDate: 'invalid' }]));
  assert.deepEqual(readStoredJson('gsat_tasks', []), [validTask, { id: 'legacy', text: '舊任務', category: 'other', dueDate: undefined, completed: false }]);
  const validDate = { id: 'valid-date', title: '保留日程', date: '2027-01-01' };
  persisted.set('gsat_custom_dates', JSON.stringify([null, {}, 42, { ...validDate, date: 'invalid' }, validDate]));
  assert.deepEqual(readStoredJson('gsat_custom_dates', []), [validDate]);
  persisted.set('gsat_streak', '[]');
  assert.deepEqual(readStoredJson('gsat_streak', { max: 0 }), { max: 0 });
} finally {
  if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage);
  else delete globalThis.localStorage;
}
console.log('PASS: quota and denied storage, cloud retry, reset cancellation, wrong JSON shapes and malformed history rows');
