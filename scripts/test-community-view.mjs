import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = await readFile(new URL('../components/TodayCommunityStudy.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
let values;
let hookIndex;
const fakeReact = { ...React, useEffect() {}, useMemo: fn => fn(), useState: () => [values[hookIndex++], () => {}] };
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled)(name => name === 'react' ? fakeReact : name.endsWith('.css') ? {} : name === '../services/authService' ? { authService: {} } : require(name), module, module.exports);
const Component = module.exports.default;
const day = '2026-10-17';
const sessions = [
  { id: 'today', timestamp: new Date('2026-10-17T08:00:00+08:00').getTime(), durationMinutes: 45 },
  { id: 'yesterday', timestamp: new Date('2026-10-16T23:59:59+08:00').getTime(), durationMinutes: 90 },
  { id: 'tomorrow', timestamp: new Date('2026-10-18T00:00:00+08:00').getTime(), durationMinutes: 60 },
];
const render = (stats, loading, unavailable, history = sessions) => {
  values = [stats, loading, unavailable, 0, null, day]; hookIndex = 0;
  return renderToStaticMarkup(React.createElement(Component, { sessions: history, variant: 'page', onBack() {}, onStartFocus() {} }));
};
const loading = render(null, true, false);
assert.match(loading, /正在更新共讀統計/);
assert.match(loading, /讀取中/);
const unavailable = render(null, false, true);
assert.match(unavailable, /重試共讀統計/);
assert.match(unavailable, /等待統計/);
assert.match(unavailable, /45 分鐘/);
assert.match(unavailable, /完成 1 段專注/);
assert.doesNotMatch(unavailable, /占今日共讀時數/);
const stats = { totalMinutes: 600, activeUsers: 5, sessionCount: 12, averageMinutes: 120, topSubject: '數學' };
const populated = render(stats, false, false);
assert.match(populated, /數學/);
assert.match(populated, /占今日共讀時數 8%/);
assert.match(populated, /width:37.5%/);
assert.match(populated, /每 5 分鐘更新/);
assert.match(render({ ...stats, totalMinutes: 12_545 }, false, false), /占今日共讀時數 不到 1%/);
const empty = render({ totalMinutes: 0, activeUsers: 0, sessionCount: 0, averageMinutes: 0 }, false, false, []);
assert.match(empty, /等待第一筆紀錄/);
assert.match(empty, /width:0%/);
assert.match(empty, /開始今天的第一段專注/);
assert.doesNotMatch(empty, /NaN|Infinity/);
console.log('PASS: community loading, unavailable, populated and empty states; Taipei-day filtering; zero chart widths and personal history');
