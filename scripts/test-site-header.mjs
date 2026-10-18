import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = await readFile(new URL('../components/SiteHeader.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
const module = { exports: {} };
const localRequire = name => {
  if (name.endsWith('.css')) return {};
  if (name === './PageLink') return ({ children, page, examId, ...props }) => React.createElement('a', { href: `/${examId}/${page}`, ...props }, children);
  return require(name);
};
new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
const Header = module.exports.default;
const props = { activePage: 'home', examId: '116gsat', examName: '116學測', targetSchool: '', isSyncing: false, onNavigate() {}, pastUrl: '#', pastTitle: '歷屆試題', scoreTitle: '成績查詢', onScoreQuery() {}, onExamReminder() {} };
const render = state => renderToStaticMarkup(React.createElement(Header, { ...props, ...state }));
const guest = render({ isLoggedIn: false });
assert.match(guest, /aria-label="尚未登入，登入或註冊"/);
assert.match(guest, /<span>登入<\/span>/);
assert.match(guest, /lucide-log-in/);
for (const userName of ['測試同學', '', undefined]) {
  const signedIn = render({ isLoggedIn: true, userName });
  assert.match(signedIn, /data-logged-in="true"/);
  assert.match(signedIn, /<span>已登入<\/span>/);
  assert.match(signedIn, /lucide-user-round-check/);
  assert.doesNotMatch(signedIn, /尚未登入/);
}
assert.match(render({ isLoggedIn: true, isSyncing: true }), /aria-busy="true"/);
console.log('PASS: guest and signed-in labels/icons, unnamed accounts and sync accessibility');
