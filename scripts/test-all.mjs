import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const scripts = readdirSync(new URL('./', import.meta.url)).filter(name => name.startsWith('test-') && name.endsWith('.mjs') && !['test-all.mjs', 'test-browser.mjs'].includes(name)).sort();
const failures = [];
for (const script of scripts) {
  console.log(`\nRUN ${script}`);
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], { stdio: 'inherit', timeout: 120_000 });
  if (result.status !== 0) failures.push(script);
}
console.log(`\n${scripts.length - failures.length}/${scripts.length} test suites passed.`);
if (failures.length) { console.error(`Failed: ${failures.join(', ')}`); process.exitCode = 1; }
