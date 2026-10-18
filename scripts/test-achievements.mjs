import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', compile(await readFile(new URL('../utils/achievements.ts', import.meta.url), 'utf8')))(module, module.exports);
const helpers = module.exports;
const parseDeclarations = (source, filename) => {
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = new Map();
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) declarations.set(node.name.text, node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return { ast, declarations };
};
const modal = parseDeclarations(await readFile(new URL('../components/AchievementsModal.tsx', import.meta.url), 'utf8'), 'AchievementsModal.tsx');
const progress = new Function(...Object.keys(helpers), compile(`return (${modal.declarations.get('calculateProgress').getText(modal.ast)});`))(...Object.values(helpers));
const now = Date.now();
const session = (id, subjectId, minutes, timestamp = now) => ({ id, subjectId, subjectName: subjectId, durationMinutes: minutes, timestamp });
const base = { tasks: [], completedTaskIds: [], studySessions: [], streak: { current: 0, max: 0, lastDate: '' }, dailyGoal: 120 };
const medal = id => helpers.ACHIEVEMENTS.find(achievement => achievement.id === id);
const unlocked = (id, data) => helpers.getUnlockedAchievements(data).includes(id);
const marathon = { ...base, studySessions: [session('long', 'math', 119)] };
assert.deepEqual(progress(medal('sp10'), marathon), { current: 119, target: 120, unit: '分鐘' });
assert.equal(unlocked('sp10', marathon), false);
const twoSubjects = { ...base, studySessions: [session('a', 'math_a', 30), session('b', 'math_b', 30), session('c', 'english', 30)] };
assert.deepEqual(progress(medal('sp14'), twoSubjects), { current: 2, target: 3, unit: '科' });
assert.equal(unlocked('sp14', twoSubjects), false);
const threeSubjects = { ...twoSubjects, studySessions: [...twoSubjects.studySessions, session('d', 'chinese', 1)] };
assert.equal(unlocked('sp14', threeSubjects), true);
assert.equal(progress(medal('t1'), { ...base, studySessions: [session('a', 'math', 59)] }).current, 59);
const balanced = { ...base, studySessions: ['chinese', 'english', 'math', 'social', 'natural'].map((subject, index) => session(subject, subject, index ? 3000 : 2999)) };
assert.deepEqual(progress(medal('sp30'), balanced), { current: 2999, target: 3000, unit: '分鐘' });
assert.equal(unlocked('sp30', balanced), false);

const recentDays = [2, 1, 0].map(offset => {
  const date = new Date(now); date.setDate(date.getDate() - offset);
  return session(String(offset), 'math', 25, date.getTime());
});
const studyEveryDay = { ...base, studySessions: recentDays };
assert.equal(helpers.reconcileStudyStreak(recentDays, 120, base.streak).max, 0, 'Daily-goal widget retains its original goal rule');
assert.equal(unlocked('s1', studyEveryDay), true, 'Study streak medal needs study, not the daily goal');
assert.deepEqual(progress(medal('s1'), studyEveryDay), { current: 3, target: 3, unit: '天' });
assert.equal(unlocked('s1', { ...base, streak: { current: 365, max: 365 } }), false, 'A cached goal streak is not proof of study days');

const app = parseDeclarations(await readFile(new URL('../App.tsx', import.meta.url), 'utf8'), 'App.tsx');
const mergeCompleted = new Function(compile(`return (${app.declarations.get('mergeCompletedTaskIds').getText(app.ast)});`))();
let history = [];
for (let index = 0; index < 10; index++) {
  const task = { id: `task-${index}`, text: 'fixture', completed: true, category: 'math' };
  history = mergeCompleted({ tasks: [task], completedTaskIds: history });
  history = mergeCompleted({ tasks: [{ ...task, completed: false }], completedTaskIds: history });
  assert.equal(helpers.getCompletedTaskCount({ tasks: [], completedTaskIds: history }), index + 1, 'Unchecking, deleting and repeating the same ID cannot remove or inflate completed history');
}
const deletedAll = { ...base, completedTaskIds: history };
assert.ok(unlocked('ta1', deletedAll)); assert.ok(unlocked('ta2', deletedAll));
assert.deepEqual(progress(medal('ta2'), deletedAll), { current: 10, target: 10, unit: '個' });
assert.deepEqual(mergeCompleted({ tasks: [], completedTaskIds: ['a'] }, { tasks: [{ id: 'b', completed: true }], completedTaskIds: ['a', 'c'] }), ['a', 'c', 'b']);

// Every fully reached progress bar must agree with the unlock condition.
for (const data of [base, marathon, twoSubjects, threeSubjects, balanced, studyEveryDay, deletedAll]) {
  for (const achievement of helpers.ACHIEVEMENTS) {
    const p = progress(achievement, data);
    assert.equal(p.current >= p.target, achievement.condition(data), `Progress and unlock diverge for ${achievement.id}`);
  }
}
console.log('PASS: precise medal progress, canonical subject counts, task completion history, deletion/undo deduplication, study-day streaks and all 100 medal progress/unlock conditions');
