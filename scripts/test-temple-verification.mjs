import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../components/TempleModal.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('TempleModal.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const handlers = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node) && ['handleLightLamp', 'handleDrawFortune', 'handleOfferTicket'].includes(node.name.getText(ast))) handlers.set(node.name.getText(ast), node.initializer);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(handlers.size, 3);
for (const handler of handlers.values()) {
  let message = '';
  const code = ts.transpileModule(`return (${handler.getText(ast)})();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('isVerified', 'setError', 'incenseCoins', code)(false, value => { message = value; }, 999999);
  assert.match(message, /尚未核對/);
}
console.log('PASS: unverified cached balances cannot start paid rituals, even when the cached balance is large');
