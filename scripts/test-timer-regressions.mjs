import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
new Function('module', 'exports', compile(await readFile(new URL('../utils/studyTimer.ts', import.meta.url), 'utf8')))(module, module.exports);
const { startStudyClock } = module.exports;
let now = 0, tick, completions = 0, displayed = -1, cancelled = 0, completedAt;
const environment = { now: () => now, schedule: callback => { tick = callback; return 1; }, cancel: () => { cancelled++; } };
const countdown = startStudyClock({ ...environment, initialSeconds: 1500, countUp: false,
  onTick: value => { displayed = value; }, onComplete: timestamp => { completions++; completedAt = timestamp; } });
now = 900_000; tick();
assert.equal(displayed, 600, 'A suspended background tab must catch up to wall time');
now = 1_600_000; tick(); countdown.update(); tick();
assert.equal(displayed, 0);
assert.equal(completions, 1, 'Timer and visibility events cannot duplicate a completed session');
assert.equal(completedAt, 1_500_000, 'Record the real deadline, not the later time when a background tab wakes up');
assert.equal(cancelled, 1);
let stopwatch = startStudyClock({ ...environment, initialSeconds: 60, countUp: true, onTick: value => { displayed = value; }, onComplete: () => assert.fail('Stopwatch never auto-completes') });
now += 5000; tick(); assert.equal(displayed, 65);
stopwatch.stop(); now += 100_000; stopwatch.update(); assert.equal(displayed, 65);
stopwatch = startStudyClock({ ...environment, initialSeconds: displayed, countUp: true, onTick: value => { displayed = value; }, onComplete() {} });
now += 10_000; tick(); assert.equal(displayed, 75, 'Paused time must not count on resume');
stopwatch.stop();

const source = await readFile(new URL('../components/StudyTimer.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('StudyTimer.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let timerEffect, toggle, stopwatchSave;
const saveButtons = [];
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('startStudyClock')) timerEffect = node.arguments[0];
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'toggleTimer') toggle = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleStopwatchSave') stopwatchSave = node.initializer;
  if (ts.isJsxOpeningElement(node) && node.tagName.getText(ast) === 'button'
    && node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && ['title', 'aria-label'].includes(attr.name.getText(ast)) && attr.initializer?.getText(ast).includes('儲存專注紀錄'))) {
    saveButtons.push(node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(ast) === 'onClick').initializer.expression);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
const saved = [], listeners = new Map();
const events = { addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name) };
const timerCompletionRef = { current: { completeSession: () => saved.push('old'), initialDuration: 1500, isSoundEnabled: false } };
const deps = {
  isActive: true, mode: 'challenge', timeLeft: 10, timerCompletionRef,
  startStudyClock: options => startStudyClock({ ...options, ...environment }),
  setTimeLeft: value => { assert.equal(typeof value, 'number', 'Completion must never be a React state-updater side effect'); displayed = value; },
  setIsActive() {}, document: events, window: events,
};
const effect = new Function(...Object.keys(deps), compile(`return (${timerEffect.getText(ast)});`))(...Object.values(deps));
const firstCleanup = effect(); firstCleanup(); // StrictMode's first setup is discarded.
const cleanup = effect();
timerCompletionRef.current = { completeSession: duration => saved.push(['new-subject-and-score', duration]), initialDuration: 600, isSoundEnabled: false };
now += 20_000; tick(); listeners.get('visibilitychange')();
assert.deepEqual(saved, [['new-subject-and-score', 600]], 'Use the latest subject/score and save once after StrictMode cleanup');
cleanup(); assert.equal(listeners.size, 0);
for (const remaining of [8, 0]) {
  let resets = 0;
  const values = { isActive: false, mode: 'challenge', timeLeft: remaining, initialDuration: 10,
    stopwatchSaveLockRef: { current: true },
    setChallengeScore() { resets++; }, setPrevTaskCompletedCount() {}, completedTasksCount: 3,
    setTimeLeft() {}, setStrictModeWarnings() {}, setIsActive() {} };
  new Function(...Object.keys(values), compile(`return (${toggle.getText(ast)})();`))(...Object.values(values));
  assert.equal(resets, remaining === 0 ? 1 : 0, 'Resuming a paused challenge must retain its score');
}
assert.equal(saveButtons.length, 2);
{
  const lock = { current: true };
  const values = { isActive: false, mode: 'stopwatch', stopwatchSaveLockRef: lock, timeLeft: 0, initialDuration: 0, setIsActive() {} };
  new Function(...Object.keys(values), compile(`return (${toggle.getText(ast)})();`))(...Object.values(values));
  assert.equal(lock.current, false, 'Starting the next stopwatch segment allows a new save');
}
for (const expression of saveButtons) {
  let savedSeconds = -1, cleared = false, saves = 0;
  const saveDeps = { stopwatchSaveLockRef: { current: false }, setIsActive() {}, timeLeft: 60, completeSession: seconds => { saves++; savedSeconds = seconds; }, setTimeLeft: seconds => { cleared = seconds === 0; } };
  const save = new Function(...Object.keys(saveDeps), compile(`return (${stopwatchSave.getText(ast)});`))(...Object.values(saveDeps));
  const handler = new Function('mode', 'handleStopwatchSave', 'resetTimer', compile(`return (${expression.getText(ast)});`))('stopwatch', save, () => assert.fail('Save must not call reset'));
  handler(); handler(); assert.equal(savedSeconds, 60); assert.equal(cleared, true);
  assert.equal(saves, 1, 'Rapid saves in the same render cannot inflate local study totals');
  let resetValue = -1;
  const shortValues = { ...saveDeps, stopwatchSaveLockRef: { current: false }, timeLeft: 59,
    completeSession: seconds => assert.equal(seconds, 59), setTimeLeft: seconds => { resetValue = seconds; } };
  new Function(...Object.keys(shortValues), compile(`return (${stopwatchSave.getText(ast)})();`))(...Object.values(shortValues));
  assert.equal(resetValue, 0, 'The reset action still clears stopwatch segments shorter than a minute');
}
// Execute the real day-refresh hook against a clock crossing midnight.
let dayNow = new Date(2026, 9, 15, 23, 59, 59).getTime(), todayState, cleanupDay;
class TestDate extends Date { constructor(...args) { super(...(args.length ? args : [dayNow])); } }
const dayEvents = new Map();
const dayWindow = {
  setInterval: () => 1, clearInterval() {},
  addEventListener: (name, fn) => dayEvents.set(name, fn), removeEventListener: name => dayEvents.delete(name),
};
const dayModule = { exports: {} };
const react = {
  useState(initial) { todayState = initial(); return [todayState, value => { todayState = value; }]; },
  useEffect(fn) { cleanupDay = fn(); },
};
new Function('require', 'module', 'exports', 'Date', 'window', 'document', compile(await readFile(new URL('../utils/useToday.ts', import.meta.url), 'utf8')))
  (() => react, dayModule, dayModule.exports, TestDate, dayWindow, dayWindow);
dayModule.exports.useToday();
assert.equal(todayState, new Date(2026, 9, 15).getTime());
dayNow += 2000; dayEvents.get('focus')();
assert.equal(todayState, new Date(2026, 9, 16).getTime(), 'Date-dependent statistics advance after midnight without new study');
cleanupDay(); assert.equal(dayEvents.size, 0);
console.log('PASS: background throttling, stopwatch pause/resume, one-time completion, StrictMode cleanup, latest subject/score, listener cleanup and challenge resume');
