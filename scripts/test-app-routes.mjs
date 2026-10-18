import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const tempRoot = resolve(tmpdir());
const directory = await mkdtemp(join(tempRoot, 'ceec-route-tests-'));
try {
  for (const [input, output] of [['constants.ts', 'constants.mjs'], ['utils/appRoutes.ts', 'appRoutes.mjs']]) {
    const source = (await readFile(new URL(`../${input}`, import.meta.url), 'utf8')).replace("'../constants'", "'./constants.mjs'");
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
    await writeFile(join(directory, output), compiled.outputText);
  }
  const { EXAM_PRESETS } = await import(pathToFileURL(join(directory, 'constants.mjs')).href);
  const { PAGE_ROUTES, AUTH_ROUTE_MODES, readAppRoute, buildAppRoute, buildAuthRoute, hasAuthCallback, isActivePage } = await import(pathToFileURL(join(directory, 'appRoutes.mjs')).href);
  const read = path => readAppRoute(new URL(path, 'https://route-test.invalid'));
  assert.equal(EXAM_PRESETS.some(exam => exam.id === '115cap'), false);
  const cap117 = EXAM_PRESETS.find(exam => exam.id === '117cap');
  assert.equal(cap117.year, 117);
  assert.equal(cap117.isEstimated, true);
  assert.ok(cap117.schedule.every(day => day.date.startsWith('2028-')));
  assert.equal(read('/115cap').examId, '117cap');
  assert.equal(read('/115cap/learning').page, 'learning');
  assert.equal(read('/115cap/learning').examId, '117cap');
  assert.equal(read('/?exam=115cap').examId, '117cap');
  assert.equal(buildAppRoute('learning', '115cap'), '/117cap/learning');
  assert.equal(buildAuthRoute('learning', '115cap', 'login'), '/117cap/auth/login?returnTo=learning');

  for (const exam of EXAM_PRESETS) {
    for (const page of Object.keys(PAGE_ROUTES)) {
      const path = buildAppRoute(page, exam.id);
      assert.deepEqual(read(path), { examId: exam.id, page, isAuth: false, authMode: undefined });
      assert.equal(read(`${path}/?exam=not-an-exam&page=unknown`).page, page);
      assert.equal(read(`/?exam=${exam.id}&page=${page}`).page, page);
      assert.equal(read(`/${exam.id}?page=${page}`).page, page);
      for (const mode of AUTH_ROUTE_MODES) {
        assert.deepEqual(read(buildAuthRoute(page, exam.id, mode)), { examId: exam.id, page, isAuth: true, authMode: mode });
      }
    }
  }
  assert.equal(read('/spare/support').page, 'support');
  assert.equal(read('/spare/refund-cancellation-policy?exam=116cap').examId, '116cap');
  assert.equal(read('/spare/refund-cancellation-policy').page, 'refund');
  assert.equal(read('/auth/signup?exam=116gsat&returnTo=ranking').authMode, 'signup');
  assert.equal(read('/116GSAT/ACHIEVEMENTS/').page, 'achievements');
  assert.equal(read('/116gsat/ranking?exam=116cap&page=privacy').examId, '116gsat');
  assert.equal(read('/116gsat/ranking?exam=116cap&page=privacy').page, 'ranking');
  assert.equal(read('/anything/else').page, 'home');
  assert.equal(isActivePage('constructor'), false);
  assert.equal(isActivePage('__proto__'), false);
  assert.equal(buildAppRoute('ranking', 'bad/exam'), '/116gsat/ranking');
  assert.equal(buildAppRoute('achievements', '116gsat', '?exam=116cap&page=ranking&utm_source=test&fireworksTest=1', '#main-content'), '/116gsat/achievements?utm_source=test&fireworksTest=1#main-content');
  assert.equal(buildAuthRoute('home', '116gsat', 'https://evil.invalid'), '/116gsat/auth/login?authMode=https%3A%2F%2Fevil.invalid');
  assert.equal(read('/116gsat/auth/login?returnTo=https://evil.invalid').page, 'home');
  for (const path of ['/?reset=true', '/?login=otp', '/?code=fixture', '/#access_token=fixture', '/#route?type=recovery', '/?error_description=fixture']) {
    assert.equal(hasAuthCallback(new URL(path, 'https://route-test.invalid')), true);
  }
  assert.equal(hasAuthCallback(new URL('https://route-test.invalid/?utm_source=code=fixture')), false);
  console.log('PASS: all exam/page/auth route round trips, old links, URL precedence, invalid input, unrelated parameters and auth callback preservation');
} finally {
  const target = resolve(directory);
  assert.equal(dirname(target), tempRoot);
  assert.ok(basename(target).startsWith('ceec-route-tests-'));
  await rm(target, { recursive: true, force: true });
}
