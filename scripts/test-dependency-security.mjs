import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createCipheriv } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import fs from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as XLSX from 'xlsx';

XLSX.set_fs(fs);

const require = createRequire(import.meta.url);
assert.equal(fs.existsSync(fileURLToPath(new URL('../package-lock.json', import.meta.url))), false);
const installGuard = fileURLToPath(new URL('./check-package-manager.mjs', import.meta.url));
for (const [agent, expectedStatus] of [['npm/11.0.0', 1], ['pnpm/11.25.0', 0]]) {
  const result = spawnSync(process.execPath, [installGuard], {
    env: { ...process.env, npm_config_user_agent: agent }, encoding: 'utf8', timeout: 5_000,
  });
  assert.equal(result.status, expectedStatus, `install guard: ${agent}`);
}
const tailwindRequire = createRequire(require.resolve('tailwindcss/package.json'));
const micromatchRequire = createRequire(tailwindRequire.resolve('micromatch'));
const watcherRequire = createRequire(tailwindRequire.resolve('chokidar'));
const braces = micromatchRequire('braces');
assert.equal(micromatchRequire.resolve('braces'), watcherRequire.resolve('braces'));
assert.equal(tailwindRequire('postcss-selector-parser/package.json').version, '7.1.6');
assert.deepEqual(braces.expand('src/{components,services}/file.{ts,tsx}'), [
  'src/components/file.ts', 'src/components/file.tsx', 'src/services/file.ts', 'src/services/file.tsx',
]);
assert.deepEqual(braces.expand('{a,{b,c}}'), ['a', 'b', 'c']);
assert.deepEqual(braces.expand('{1..3}'), ['1', '2', '3']);
assert.equal(braces.stringify('a/{b,c}'), 'a/{b,c}');
assert.equal(braces.compile('a/{b,c}'), 'a/(b|c)');
const isDepthGuard = error => error instanceof RangeError && error.message.includes('maximum nesting depth');
for (const input of ['{'.repeat(4_000) + 'x' + '}'.repeat(4_000), '('.repeat(4_000) + 'x' + ')'.repeat(4_000), '{'.repeat(4_000)]) {
  for (const method of ['parse', 'compile', 'expand', 'stringify']) {
    assert.throws(() => braces[method](input), isDepthGuard, `${method} must reject deep input before stack exhaustion`);
  }
}
// Public walkers can receive an AST directly, bypassing the string parser.
const deepAst = () => {
  const root = { type: 'root', nodes: [] };
  let node = root;
  for (let depth = 0; depth < 200; depth++) {
    const child = { type: 'brace', nodes: [], parent: node };
    node.nodes.push(child);
    node = child;
  }
  node.nodes.push({ type: 'text', value: 'x', parent: node });
  return root;
};
for (const method of ['compile', 'expand', 'stringify']) assert.throws(() => braces[method](deepAst()), isDepthGuard);

// Real dry-run of the legacy importer with synthetic XLSX data; no network writes.
const tempRoot = resolve(tmpdir());
const fixtureDirectory = await mkdtemp(join(tempRoot, 'ceec-dependency-tests-'));
try {
  assert.equal(XLSX.version, '0.20.3');
  const key = Buffer.alloc(32, 7);
  const iv = Buffer.alloc(12, 4);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ notes: 'fixture 測試', targetExam: '116gsat' })), cipher.final()]);
  const encryptedData = Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString('base64');
  const workbook = XLSX.utils.book_new();
  for (const [name, rows] of [
    ['Users', [
      { Email: 'fixture@example.test', Name: '測試使用者', RegistrationDate: 46000, EncryptedData: encryptedData, EncryptionKey: key.toString('base64') },
      { Email: 'invalid', Name: 'invalid' },
      { Email: 'FIXTURE@example.test', Name: 'duplicate' },
    ]],
    ['Sessions', [{ Email: 'fixture@example.test', DeviceId: 'fixture-device' }, { Email: 'unknown@example.test', DeviceId: 'orphan' }]],
    ['StudyLogs', [{ Email: 'fixture@example.test', DurationMinutes: 25, Timestamp: 1_800_000_000_000 }, { Email: 'unknown@example.test', DurationMinutes: 25, Timestamp: 1_800_000_000_000 }]],
  ]) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
  const inputPath = join(fixtureDirectory, 'fixture.xlsx');
  XLSX.writeFile(workbook, inputPath);
  const scriptPath = fileURLToPath(new URL('./migrate-legacy-to-supabase.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [scriptPath, inputPath], {
    cwd: fixtureDirectory,
    env: { ...process.env, SUPABASE_URL: '', VITE_SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
    encoding: 'utf8', timeout: 15_000,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(await readFile(join(fixtureDirectory, 'migration-report.json'), 'utf8'));
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.users.valid, 1);
  assert.equal(report.users.invalid, 1);
  assert.equal(report.users.duplicate, 1);
  assert.equal(report.users.decrypted, 1);
  assert.equal(report.users.decryptFailed, 0);
  assert.equal(report.sessions.valid, 1);
  assert.equal(report.sessions.orphaned, 1);
  assert.equal(report.studyLogs.valid, 1);
  assert.equal(report.studyLogs.orphaned, 1);
  assert.ok(Object.values(report.uploaded).every(count => count === 0));
  console.log('PASS: pnpm-only install guard and single lockfile; patched braces rejects deep strings and ASTs; normal globs remain compatible; patched selector parser resolves; SheetJS legacy-import dry-run reads and decrypts synthetic workbook correctly');
} finally {
  const target = resolve(fixtureDirectory);
  assert.equal(dirname(target), tempRoot);
  assert.ok(basename(target).startsWith('ceec-dependency-tests-'));
  await rm(target, { recursive: true, force: true });
}
