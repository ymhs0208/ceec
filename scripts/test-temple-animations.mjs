import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const origin = 'http://127.0.0.1:4176';
const server = spawn(process.execPath, [join(dirname(require.resolve('vite/package.json')), 'bin/vite.js'), '--host', '127.0.0.1', '--port', '4176', '--strictPort'], { stdio: 'pipe' });
let output = '';
server.stdout.on('data', data => { output += data; });
server.stderr.on('data', data => { output += data; });
let browser;
try {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(output);
    if (await fetch(origin).then(r => r.ok).catch(() => false)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  const page = await browser.newPage({ viewport: { width: 375, height: 900 }, reducedMotion: 'no-preference' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('focus_space_analytics_consent', 'rejected');
    localStorage.setItem('gsat_login_suggestion_seen', 'true');
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  });
  await page.goto(`${origin}/116gsat/temple`);
  // Render the real component with a controlled, local ledger. No live account or paid writes.
  await page.evaluate(async () => {
    const React = (await import('/node_modules/.vite/deps/react.js')).default;
    const { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
    const Temple = (await import('/components/TempleModal.tsx')).default;
    document.getElementById('root').remove();
    const host = document.createElement('div');
    host.style.cssText = 'padding:16px;background:#f9f7f2;min-height:100vh';
    document.body.append(host);
    const root = createRoot(host);
    let generation = 0;
    window.ritualTest = { calls: [], pending: null };
    function Harness() {
      const [state, setState] = React.useState({ lamps: [], fortunes: [], ticketOffered: false });
      const [coins, setCoins] = React.useState(1000);
      const [open, setOpen] = React.useState(true);
      window.ritualTest.setOpen = setOpen;
      return React.createElement(Temple, {
        isOpen: open, isVerified: true, variant: 'page', onClose: () => {},
        incenseCoins: coins, incenseRecords: [], templeState: state,
        userName: '認真讀書的考生', targetSchool: '國立臺灣大學',
        onPerformRitual: async kind => {
          window.ritualTest.calls.push(kind);
          await new Promise((resolve, reject) => { window.ritualTest.pending = { resolve, reject }; });
          setCoins(value => value - ({ lamp: 100, fortune: 30, ticket: 500 })[kind]);
          setState(value => ({ ...value,
            ...(kind === 'lamp' ? { lamps: [{ id: 'test-lamp', expireAt: Date.now() + 86400000 }] } : {}),
            ...(kind === 'ticket' ? { ticketOffered: true } : {}),
          }));
          return kind === 'fortune' ? { type: '上吉', text: '靜心勤學\n循序漸進，自有所成。' } : undefined;
        },
      });
    }
    window.ritualTest.reset = () => {
      window.ritualTest.calls = [];
      root.render(React.createElement(Harness, { key: ++generation }));
    };
    window.ritualTest.reset();
  });
  const phase = async value => page.waitForSelector(`.ritual-scene[data-phase="${value}"]`);
  const calls = () => page.evaluate(() => window.ritualTest.calls);
  const finish = () => page.evaluate(() => window.ritualTest.pending.resolve());
  const reset = async () => { await page.evaluate(() => window.ritualTest.reset()); await phase('idle'); };
  const snap = async name => {
    if (process.env.TEMPLE_PREVIEW_DIR) await page.locator('.temple-stage').screenshot({ path: join(process.env.TEMPLE_PREVIEW_DIR, `temple-${name}.png`), animations: 'allow' });
  };
  const doubleClick = locator => locator.evaluate(el => { el.click(); el.click(); });

  await doubleClick(page.getByRole('button', { name: '點亮光明燈 · 100 香火幣', exact: true }));
  await phase('prepare');
  assert.match(await page.locator('.ritual-moment h4').textContent(), /清香/);
  assert.equal(await page.locator('.ritual-lotus-petal').count(), 7);
  await snap('lamp-prepare');
  assert.deepEqual(await calls(), []);
  assert.equal(await page.getByRole('button', { name: /供奉准考證/ }).first().isDisabled(), true);
  await phase('kindle'); await snap('lamp-kindle');
  await page.waitForFunction(() => window.ritualTest.calls.length === 1);
  assert.deepEqual(await calls(), ['lamp']);
  assert.equal(await page.locator('.ritual-scene').getAttribute('data-complete'), 'false');
  assert.equal(await page.locator('.ritual-keepsake').count(), 0);
  await finish(); await phase('blessing');
  assert.match(await page.locator('.ritual-moment h4').textContent(), /心燈長明/);
  await page.waitForTimeout(1100); await snap('lamp-blessing');
  assert.match(await page.locator('.ritual-keepsake').textContent(), /認真讀書的考生/);
  assert.match(await page.locator('.ritual-keepsake').textContent(), /國立臺灣大學/);
  await page.waitForFunction(() => document.querySelector('.ritual-scene').getAttribute('aria-busy') === 'false');
  assert.match(await page.locator('.ritual-live-status').textContent(), /已點亮/);

  await page.getByRole('button', { name: /求籤 30/ }).click();
  await doubleClick(page.getByRole('button', { name: '求一支籤 · 30 香火幣', exact: true }));
  await phase('shake'); await snap('fortune-shake'); await phase('choose'); await snap('fortune-choose');
  assert.match(await page.locator('.ritual-moment h4').textContent(), /七支籤/);
  assert.deepEqual(await calls(), ['lamp']);
  assert.equal(await page.getByRole('button', { name: /^抽第/ }).count(), 7);
  await doubleClick(page.getByRole('button', { name: '抽第 4 支籤', exact: true }));
  await phase('reveal'); await snap('fortune-reveal');
  assert.match(await page.locator('.ritual-fortune-wings').textContent(), /靜候回響/);
  await page.waitForFunction(() => window.ritualTest.calls.length === 2);
  assert.deepEqual(await calls(), ['lamp', 'fortune']);
  await finish(); await page.getByText('循序漸進，自有所成。', { exact: true }).waitFor();
  await page.waitForTimeout(1100); await snap('fortune-result');

  await page.getByRole('button', { name: /供奉准考證 500/ }).click();
  await doubleClick(page.getByRole('button', { name: '供奉准考證 · 500 香火幣', exact: true }));
  await phase('purify'); await snap('ticket-purify'); await phase('ascend'); await snap('ticket-ascend');
  assert.equal(await page.locator('.ritual-offering-door').count(), 2);
  await page.waitForFunction(() => window.ritualTest.calls.length === 3);
  assert.equal(await page.locator('.ritual-scene').getAttribute('data-complete'), 'false');
  await finish(); await phase('seal'); await page.waitForTimeout(500); await snap('ticket-seal');
  assert.match(await page.locator('.ritual-moment h4').textContent(), /心願安放/);
  assert.equal(await page.locator('.ritual-seal-ripples i').count(), 3);
  await page.waitForFunction(() => document.querySelector('.ritual-scene').getAttribute('aria-busy') === 'false');
  assert.match(await page.locator('.ritual-live-status').textContent(), /已安放/);
  assert.match(await page.locator('.ritual-keepsake-ticket').textContent(), /心願安放/);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.waitForTimeout(350);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Personalized keepsake fits mobile');

  // Failed requests return to a usable idle state, without a success stamp or message.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await reset();
  await page.getByRole('button', { name: '點亮光明燈 · 100 香火幣', exact: true }).click();
  await page.waitForFunction(() => window.ritualTest.calls.length === 1);
  await page.evaluate(() => window.ritualTest.pending.reject(new Error('測試連線失敗')));
  await phase('idle');
  assert.equal(await page.locator('.ritual-moment').evaluate(el => getComputedStyle(el).animationName), 'none');
  assert.equal(await page.locator('.ritual-scene').getAttribute('data-complete'), 'false');
  assert.equal(await page.locator('.ritual-live-status').textContent(), '');
  assert.equal(await page.locator('.ritual-keepsake').count(), 0);
  assert.equal(await page.getByRole('button', { name: '點亮光明燈 · 100 香火幣', exact: true }).isEnabled(), true);

  // Closing before submission cancels timers; reopening does not replay the payment.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await reset();
  await page.getByRole('button', { name: '點亮光明燈 · 100 香火幣', exact: true }).click();
  await phase('prepare');
  await page.evaluate(() => window.ritualTest.setOpen(false));
  await page.waitForTimeout(2300);
  assert.deepEqual(await calls(), []);
  await page.evaluate(() => window.ritualTest.setOpen(true)); await phase('idle');

  // Every scene and the seven touch targets fit the narrowest supported width.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    for (const name of [/點光明燈 100/, /求籤 30/, /供奉准考證 500/, /香火紀錄/]) {
      await page.getByRole('button', { name }).click();
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}`);
    }
  }
  await page.goto(`${origin}/116gsat/temple`);
  await page.getByRole('heading', { name: '線上文昌廟。' }).waitFor();
  assert.equal(await page.getByRole('button', { name: '測試動畫', exact: true }).count(), 0);
  assert.equal(await page.getByRole('region', { name: '免費動畫測試' }).count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: all ritual phases, delayed confirmations, single payments, failure recovery, cancellation, reduced motion and responsive scenes');
} finally {
  await browser?.close();
  server.kill();
}
