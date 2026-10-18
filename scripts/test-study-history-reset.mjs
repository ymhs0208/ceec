import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', compile(await readFile(new URL('../utils/studyHistory.ts', import.meta.url), 'utf8')))(module, module.exports);
const { filterStudyHistory, mergeStudyHistoryReset } = module.exports;
const source = await readFile(new URL('../App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) declarations.set(node.name.text, node.initializer);
  ts.forEachChild(node, visit);
}
visit(ast);
const helpers = ['mergeCompletedTaskIds', 'mergeById', 'mergeDeletedIds', 'mergeSyncMetadata', 'chooseNewestValue', 'mergeDeletedTracks', 'applyCustomDateDeletions', 'mergePlaylists', 'mergeAppDataForSync'];
const merge = new Function('filterStudyHistory', 'mergeStudyHistoryReset', compile(helpers.map(name => `const ${name} = ${declarations.get(name).getText(ast)};`).join('\n') + '\nreturn mergeAppDataForSync;'))(filterStudyHistory, mergeStudyHistoryReset);
const old = { id: 'old', timestamp: 99 }, boundary = { id: 'boundary', timestamp: 100 }, fresh = { id: 'new', timestamp: 101 };
const empty = { tasks: [], studySessions: [], challengeRecords: [], customDates: [], playlists: [], incenseRecords: [] };
const staleDevice = { ...empty, studySessions: [old, boundary, fresh] };
const resetDevice = { ...empty, studyHistoryResetAt: 100 };
assert.deepEqual(merge(resetDevice, staleDevice).studySessions, [fresh]);
assert.deepEqual(merge(staleDevice, resetDevice).studySessions, [fresh]);
assert.equal(merge(resetDevice, { ...staleDevice, studyHistoryResetAt: 80 }).studyHistoryResetAt, 100);
assert.equal(merge(resetDevice, { ...staleDevice, studyHistoryResetAt: 102 }).studySessions.length, 0);
const completedOnFirstDevice = { ...empty, tasks: [{ id: 'done-a', completed: true }], completedTaskIds: ['done-b'] };
const deletedOnSecondDevice = { ...empty, deletedTaskIds: ['done-a'], completedTaskIds: ['done-c'] };
for (const pair of [[completedOnFirstDevice, deletedOnSecondDevice], [deletedOnSecondDevice, completedOnFirstDevice]]) {
  const merged = merge(...pair);
  assert.deepEqual(merged.tasks, []);
  assert.deepEqual(new Set(merged.completedTaskIds), new Set(['done-a', 'done-b', 'done-c']), 'Cross-device task deletion cannot erase completion evidence');
}
assert.equal(mergeStudyHistoryReset(undefined, NaN, Infinity, -1, 100), 100);
assert.deepEqual(filterStudyHistory([old, boundary, fresh], 100), [fresh], 'Durable study_logs must not resurrect cleared history');

let sessions = [old];
const stored = new Map();
const ref = { current: 0 };
const stateChanges = [];
const setter = new Function('filterStudyHistory', 'studyHistoryResetRef', 'setStudySessionState', compile(`return (${declarations.get('setStudySessions').getText(ast)});`))(filterStudyHistory, ref, update => { sessions = update(sessions); });
const dependencies = {
  mergeStudyHistoryReset, studyHistoryResetRef: ref,
  localStorageController: { writeRequired(key, value) { stored.set(key, value); } },
  setStudyHistoryResetAt: value => stateChanges.push(value), setStudySessions: setter,
};
const applyReset = new Function(...Object.keys(dependencies), compile(`return (${declarations.get('applyStudyHistoryReset').getText(ast)});`))(...Object.values(dependencies));
applyReset(100);
assert.equal(stored.get('gsat_study_history_reset_at'), '100');
assert.deepEqual(sessions, []);
setter(() => [old, boundary, fresh]); // Network request started before reset completes late.
assert.deepEqual(sessions, [fresh]);
applyReset(80); // Older device cannot roll the marker back.
assert.equal(ref.current, 100);
assert.deepEqual(stateChanges, [100]);
assert.deepEqual(filterStudyHistory([old, fresh], Number(stored.get('gsat_study_history_reset_at'))), [fresh], 'Reload respects the saved reset marker');
console.log('PASS: reset survives cloud/ledger replay, stale devices, late network responses and reload; cutoff is monotonic; newer sessions survive');
