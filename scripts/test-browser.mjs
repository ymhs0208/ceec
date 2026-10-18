import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const port = 4175;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [join(dirname(require.resolve('vite/package.json')), 'bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
let browser;
let checks = 0;
const failures = [];
const runtimeErrors = [];
const check = async (name, run) => {
  try { await run(); checks++; console.log(`PASS: ${name}`); }
  catch (error) { failures.push({ name, message: error.stack || String(error) }); console.error(`FAIL: ${name}\n${error.message}`); }
};
const openPage = async ({ width = 375, seed = {} } = {}) => {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', timezoneId: 'Asia/Taipei' });
  // Exercise local flows without sending emails, analytics or writes to live services.
  await context.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  await context.addInitScript(values => {
    localStorage.setItem('focus_space_analytics_consent', 'rejected');
    localStorage.setItem('gsat_login_suggestion_seen', 'true');
    const marker = 'ceec_browser_test_seeded';
    if (!sessionStorage.getItem(marker)) {
      for (const [key, value] of Object.entries(values)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      sessionStorage.setItem(marker, 'true');
    }
  }, seed);
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  page.on('pageerror', error => runtimeErrors.push({ url: page.url(), message: error.message }));
  page.on('dialog', dialog => dialog.accept());
  return page;
};
const visit = async (page, path = '/116gsat') => {
  await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('root')?.textContent.length > 30);
  await page.waitForTimeout(100);
};
const assertFits = async page => {
  const size = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  assert.equal(size.content, size.viewport, `${page.url()} overflows: ${JSON.stringify(size)}`);
};

try {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(`Preview failed: ${serverOutput}`);
    if (await fetch(origin).then(r => r.ok).catch(() => false)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : process.platform === 'win32' ? { channel: 'msedge' } : {}) });

  await check('all public pages render on mobile and desktop without horizontal overflow', async () => {
    const pages = ['', 'ranking', 'community', 'learning', 'achievements', 'temple', 'settings', 'account', 'instructions', 'privacy', 'terms', 'schedule', 'donation', 'announcements', 'exam-checklist', 'support', 'refund-policy', 'auth/login', 'auth/signup', 'auth/forgot', 'auth/reset'];
    const page = await openPage();
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of pages) {
        await visit(page, `/116gsat${path ? `/${path}` : ''}`);
        await assertFits(page);
      }
    }
    await page.context().close();
  });

  await check('every exam homepage supports narrow screens', async () => {
    const page = await openPage({ width: 320 });
    for (const exam of ['117gsat', '116gsat', '116cap', '116ast', '116tvet', '115tvet', '117cap', '115ast']) {
      await visit(page, `/${exam}`);
      await assertFits(page);
      assert.equal(await page.locator('.countdown-switcher').count(), 1);
    }
    await page.context().close();
  });

  await check('mobile menu, keyboard close, navigation and browser history', async () => {
    const page = await openPage();
    await visit(page);
    assert.equal(await page.locator('.header-account span').innerText(), '登入');
    assert.notEqual(await page.locator('.header-account span').evaluate(e => getComputedStyle(e).display), 'none');
    await page.getByRole('button', { name: '開啟功能選單' }).click();
    assert.equal(await page.locator('#header-mobile-menu').evaluate(e => e.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#header-mobile-menu').evaluate(e => e.open), false);
    await page.getByRole('button', { name: '開啟功能選單' }).click();
    await page.locator('#header-mobile-menu').getByRole('link', { name: /個人設定/ }).click();
    await page.waitForURL('**/116gsat/settings');
    assert.equal(await page.locator('#header-mobile-menu').evaluate(e => e.open), false);
    await page.goBack();
    await page.waitForURL('**/116gsat');
    await assertFits(page);
    await page.context().close();
  });

  await check('task preview, validation, completion, deletion and reload persistence', async () => {
    const tasks = Array.from({ length: 5 }, (_, i) => ({ id: `test-${i}`, text: `任務${i + 1}`, category: 'math', completed: i === 0, updatedAt: Date.now() }));
    const page = await openPage({ seed: { gsat_tasks: tasks } });
    await visit(page);
    assert.equal(await page.locator('.task-list-items > .group').count(), 3);
    assert.match(await page.locator('.task-list-items > .group').first().innerText(), /任務2/);
    await page.getByRole('button', { name: '查看全部 5 件任務' }).click();
    assert.equal(await page.locator('.task-list-items > .group').count(), 5);
    await page.getByRole('button', { name: '收合任務' }).click();
    assert.equal(await page.getByRole('textbox', { name: '任務內容', exact: true }).count(), 0);
    await page.getByRole('button', { name: '展開新增任務', exact: true }).click();
    await page.getByRole('textbox', { name: '任務內容', exact: true }).fill('<不合法>');
    await page.getByRole('button', { name: '新增任務', exact: true }).click();
    assert.match(await page.getByRole('alert').innerText(), /特殊符號/);
    await page.getByRole('textbox', { name: '任務內容', exact: true }).fill('新增讀書任務');
    await page.getByLabel('任務到期日', { exact: true }).fill('2027-01-01');
    await page.getByRole('button', { name: '新增任務', exact: true }).click();
    assert.equal(await page.locator('.task-list-items > .group').count(), 6);
    assert.equal(await page.getByRole('textbox', { name: '任務內容', exact: true }).count(), 0);
    await page.getByRole('button', { name: '標記完成：新增讀書任務', exact: true }).click();
    const readTasks = () => page.evaluate(() => JSON.parse(localStorage.getItem('gsat_tasks')));
    assert.equal((await readTasks()).find(t => t.text === '新增讀書任務').completed, true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '查看全部 6 件任務' }).click();
    assert.equal(await page.getByRole('button', { name: '標記未完成：新增讀書任務', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: '刪除任務：新增讀書任務', exact: true }).click();
    assert.equal((await readTasks()).length, 5);
    await page.context().close();
  });

  await check('timer start/pause/reset, all modes and navigation keep elapsed time', async () => {
    const page = await openPage();
    await page.clock.install();
    await visit(page);
    await page.getByRole('button', { name: '開始專注', exact: true }).click();
    await page.clock.runFor(3100);
    assert.equal((await page.locator('.study-timer-digits').innerText()).trim(), '24:57');
    await page.getByRole('button', { name: '暫停專注', exact: true }).click();
    await page.clock.runFor(2100);
    assert.equal((await page.locator('.study-timer-digits').innerText()).trim(), '24:57');
    await page.getByRole('button', { name: '重設計時器', exact: true }).click();
    assert.equal((await page.locator('.study-timer-digits').innerText()).trim(), '25:00');
    for (const mode of ['正數', '模擬考', '挑戰', '倒數']) {
      await page.locator('.study-timer-tabs').getByRole('button', { name: mode, exact: true }).click();
      await assertFits(page);
    }
    await page.getByRole('button', { name: '開始專注', exact: true }).click();
    await page.locator('.home-progress button').click();
    await page.waitForURL('**/learning');
    await page.clock.runFor(5100);
    await page.goBack();
    assert.equal((await page.locator('.study-timer-digits').innerText()).trim(), '24:55');
    await page.getByRole('button', { name: '暫停專注', exact: true }).click();
    await page.context().close();
  });

  await check('fullscreen focus, responsive controls, dialogs, challenge scoring and exit preserve timer', async () => {
    const page = await openPage({ width: 375, seed: { gsat_tasks: [{ id: 'fullscreen-task', text: '全螢幕挑戰任務', category: 'math', completed: false, updatedAt: Date.now() }] } });
    // Exercise the in-page fallback without changing the test runner's display.
    await page.addInitScript(() => { Element.prototype.requestFullscreen = async () => {}; });
    await page.clock.install({ time: new Date('2026-10-18T12:00:00+08:00') });
    await visit(page);
    await page.getByRole('button', { name: '進入全螢幕專注', exact: true }).click();
    const room = page.getByRole('dialog', { name: '全螢幕專注模式', exact: true });
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await room.getByRole('button', { name: '開始專注', exact: true }).click();
    await page.clock.runFor(3100);
    assert.equal((await room.getByRole('timer').innerText()).trim(), '24:57');
    for (const [width, height] of [[320, 568], [375, 812], [768, 1024], [1440, 900], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.clock.runFor(300);
      assert.equal(await room.evaluate(el => el.scrollWidth <= el.clientWidth), true);
    }
    await room.getByRole('button', { name: '計時設定', exact: true }).click();
    await page.getByRole('dialog', { name: '計時設定', exact: true }).waitFor();
    await page.getByRole('button', { name: '關閉計時設定', exact: true }).click();
    await room.getByRole('button', { name: '更換風景', exact: true }).click();
    await page.getByRole('dialog', { name: '專注背景選擇', exact: true }).waitFor();
    await page.getByRole('button', { name: '關閉背景選擇', exact: true }).click();
    await room.getByRole('button', { name: '暫停專注', exact: true }).click();
    await room.getByRole('button', { name: '退出全螢幕專注', exact: true }).click();
    await room.waitFor({ state: 'detached' });
    assert.equal(await room.count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.notEqual((await page.locator('.study-timer-digits').innerText()).trim(), '25:00');
    await page.locator('.study-timer-tabs').getByRole('button', { name: '挑戰', exact: true }).click();
    await page.getByRole('button', { name: '進入全螢幕專注', exact: true }).click();
    await room.getByRole('button', { name: '開始專注', exact: true }).click();
    await page.clock.runFor(1100);
    await room.getByRole('button', { name: '完成挑戰任務：全螢幕挑戰任務', exact: true }).click();
    await page.clock.runFor(300);
    assert.match(await room.locator('.focus-room-state').innerText(), /已完成 1 件任務/);
    await page.keyboard.press('Escape');
    await room.waitFor({ state: 'detached' });
    assert.equal(await room.count(), 0);
    await page.context().close();
  });

  await check('custom exam date and goals survive reload; other exams use their own date', async () => {
    const page = await openPage({ width: 320 });
    await visit(page, '/116gsat/settings');
    await page.getByLabel('考試日期', { exact: true }).fill('2027-02-01T10:00');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.getByLabel('考試日期', { exact: true }).inputValue(), '2027-02-01T10:00');
    await page.getByRole('button', { name: /目標與節奏/ }).click();
    await page.getByLabel('目標學校', { exact: true }).fill('測試目標大學');
    await page.getByLabel('目標科系或班別', { exact: true }).fill('測試科系');
    await page.getByRole('button', { name: '儲存目標', exact: true }).click();
    await page.getByLabel('每日讀書目標（分鐘）', { exact: true }).fill('180');
    await page.getByRole('button', { name: '回到首頁', exact: true }).click();
    assert.equal(await page.locator('.home-target').count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('gsat_target_school')), '測試目標大學');
    assert.equal(await page.evaluate(() => localStorage.getItem('gsat_target_major')), '測試科系');
    assert.match(await page.locator('.focus-summary-value').innerText(), /180/);
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('.home-target').count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('gsat_target_school')), '測試目標大學');
    assert.equal(await page.evaluate(() => localStorage.getItem('gsat_target_major')), '測試科系');
    assert.match(await page.locator('.home-countdown time').innerText(), /2027\/02\/01/);
    await visit(page, '/116cap/settings');
    assert.notEqual(await page.getByLabel('考試日期', { exact: true }).inputValue(), '2027-02-01T10:00');
    await page.context().close();
  });

  await check('invalid saved tasks, dates, countdown and daily goal recover without losing valid records', async () => {
    const page = await openPage({ seed: {
      gsat_tasks: [42, {}, { id: 'broken' }, { id: 'legacy', text: '保留舊任務', category: 99 }],
      gsat_custom_dates: [42, {}, { id: 'broken', title: '錯誤日期', date: 'bad' }, { id: 'valid', title: '保留日程', date: '2027-01-01' }],
      gsat_target_date: 'invalid', gsat_daily_goal: 'invalid',
    } });
    await visit(page, '/');
    assert.equal(await page.locator('.task-list-items > .group').count(), 1);
    assert.match(await page.locator('.task-list-items').innerText(), /保留舊任務/);
    assert.equal(await page.getByText('NaN', { exact: false }).count(), 0);
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('gsat_custom_dates')))).length, 1);
    assert.equal(await page.locator('.home-countdown time').count(), 1);
    await page.context().close();
  });

  await check('important dates add/delete, mobile controls and midnight refresh', async () => {
    const page = await openPage({ width: 320, seed: { gsat_custom_dates: [{ id: 'midnight', title: '跨日測試', date: '2026-10-18' }] } });
    await page.clock.install({ time: new Date('2026-10-17T23:59:30+08:00') });
    await visit(page);
    const highlight = page.locator('.important-date-highlight').filter({ hasText: '跨日測試' });
    assert.equal(await highlight.locator('.text-4xl').innerText(), '1');
    await page.clock.runFor(61_000);
    assert.equal(await highlight.locator('.text-4xl').innerText(), '0');
    await page.getByTitle('新增日程', { exact: true }).click();
    await page.getByLabel('日程名稱', { exact: true }).fill('新增日程測試');
    await page.getByLabel('日程日期', { exact: true }).fill('2027-01-01');
    await assertFits(page);
    await page.locator('.home-important-dates').getByRole('button', { name: '儲存', exact: true }).click();
    const remove = page.getByRole('button', { name: '刪除日程：新增日程測試', exact: true });
    assert.equal(await remove.evaluate(e => getComputedStyle(e).opacity), '1');
    await remove.click();
    assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem('gsat_custom_dates')))).length, 1);
    await page.context().close();
  });

  await check('stopwatch saves once and immediately updates daily progress and history', async () => {
    const page = await openPage();
    await page.clock.install();
    await visit(page);
    await page.locator('.study-timer-tabs').getByRole('button', { name: '正數', exact: true }).click();
    await page.getByRole('button', { name: '開始專注', exact: true }).click();
    await page.clock.runFor(61_100);
    await page.getByRole('button', { name: '儲存專注紀錄', exact: true }).click();
    const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('gsat_study_history')));
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0].durationMinutes, 1);
    assert.equal(await page.locator('.focus-summary-value > strong').innerText(), '1');
    assert.equal((await page.locator('.study-timer-digits').innerText()).trim(), '00:00');
    await page.context().close();
  });

  await check('login form validation, password visibility and recovery/signup routes', async () => {
    const page = await openPage({ width: 320 });
    await visit(page, '/116gsat/auth/login');
    const email = page.locator('#auth-login-email');
    await email.fill('invalid-email');
    assert.equal(await email.evaluate(e => e.checkValidity()), false);
    await page.locator('#auth-login-password').fill('ExamplePass123');
    await page.getByRole('button', { name: '顯示密碼', exact: true }).click();
    assert.equal(await page.locator('#auth-login-password').getAttribute('type'), 'text');
    await page.getByRole('button', { name: '隱藏密碼', exact: true }).click();
    assert.equal(await page.locator('#auth-login-password').getAttribute('type'), 'password');
    await page.getByRole('button', { name: '忘記密碼？', exact: true }).click();
    await page.waitForURL('**/auth/forgot');
    await page.getByRole('button', { name: '返回登入', exact: true }).click();
    await page.getByRole('button', { name: '立即註冊', exact: true }).click();
    await page.waitForURL('**/auth/signup');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('#auth-signup-email').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#auth-signup-email').count(), 1);
    await assertFits(page);
    await page.context().close();
  });

  await check('timer preferences and nested subject selector preserve settings', async () => {
    const page = await openPage({ width: 320 });
    await visit(page);
    await page.locator('.home-timer button:has(.lucide-settings)').click();
    const settings = page.getByRole('dialog', { name: '計時設定', exact: true });
    await settings.getByRole('switch', { name: '提示音效', exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('gsat_sound_enabled'))), false);
    await settings.getByRole('switch', { name: '嚴格模式', exact: true }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('gsat_strict_mode'))), true);
    await settings.locator('.timer-settings-subject').click();
    await page.getByRole('dialog', { name: '選擇科目', exact: true }).getByRole('button', { name: '英文', exact: true }).click();
    await settings.locator('.timer-settings-durations button').filter({ hasText: '50' }).click();
    assert.equal((await page.locator('.study-timer-digits').innerText()).trim(), '50:00');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.home-timer button:has(.lucide-settings)').click();
    assert.equal(await settings.getByRole('switch', { name: '提示音效', exact: true }).getAttribute('aria-checked'), 'false');
    assert.equal(await settings.getByRole('switch', { name: '嚴格模式', exact: true }).getAttribute('aria-checked'), 'true');
    await page.getByRole('button', { name: '關閉計時設定', exact: true }).click();
    await page.context().close();
  });

  await check('music playlists persist and adding the first song initializes playback', async () => {
    const page = await openPage({ width: 320 });
    await page.addInitScript(() => {
      window.__musicPlayerCount = 0;
      window.__musicPlaybackCount = 0;
      window.YT = { Player: class {
        constructor(id, options) { window.__musicPlayerCount++; setTimeout(() => options.events.onReady({ target: this }), 0); }
        setVolume() {} loadVideoById() {} pauseVideo() {} destroy() {}
        playVideo() { window.__musicPlaybackCount++; }
        getCurrentTime() { return 0; } getDuration() { return 0; }
      } };
    });
    await visit(page);
    await page.getByRole('button', { name: '開啟專注音樂播放器', exact: true }).click();
    await page.locator('.focus-music-playlist-trigger').click();
    await page.getByRole('button', { name: '建立新歌單', exact: true }).click();
    await page.getByLabel('歌單名稱', { exact: true }).fill('測試歌單');
    await page.getByRole('button', { name: '建立歌單', exact: true }).click();
    await page.getByRole('button', { name: /測試歌單.*0 首音樂/ }).click();
    await page.getByRole('button', { name: '新增歌曲', exact: true }).click();
    await page.getByLabel('YouTube 連結', { exact: true }).fill('https://www.youtube.com/watch?v=jfKfPfyJRdk');
    await page.getByPlaceholder('替這首音樂取個名字').fill('測試音樂');
    await page.getByRole('button', { name: '加入歌單', exact: true }).click();
    await page.waitForFunction(() => window.__musicPlayerCount > 0 && window.__musicPlaybackCount > 0);
    const lists = await page.evaluate(() => JSON.parse(localStorage.getItem('gsat_playlists')));
    assert.equal(lists.find(list => list.name === '測試歌單').tracks[0].name, '測試音樂');
    await page.getByRole('button', { name: '關閉音樂播放器', exact: true }).click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '開啟專注音樂播放器', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '播放 測試音樂', exact: true }).count(), 1);
    await page.getByRole('button', { name: '靜音', exact: true }).click();
    assert.equal(await page.getByLabel('音量', { exact: true }).inputValue(), '0');
    await page.getByRole('button', { name: '關閉音樂播放器', exact: true }).click();
    await page.context().close();
  });

  await check('community unavailable state, retry, personal history and focus shortcut', async () => {
    const page = await openPage({ width: 320, seed: { gsat_study_history: [{ id: 'community-test', subjectId: 'math', subjectName: '數學', durationMinutes: 45, timestamp: Date.now() }] } });
    await visit(page, '/116gsat/community');
    await page.getByRole('button', { name: '重試共讀統計', exact: true }).waitFor();
    assert.match(await page.locator('.community-total-value').innerText(), /等待更新/);
    assert.equal(await page.locator('.community-my-time > strong').innerText(), '45 分鐘');
    assert.equal(await page.locator('.community-chart-row--average .community-chart-track > span').evaluate(e => e.style.width), '0%');
    await page.getByRole('button', { name: '重試共讀統計', exact: true }).click();
    await page.getByRole('button', { name: '重試共讀統計', exact: true }).waitFor({ state: 'visible' });
    await assertFits(page);
    await page.getByRole('button', { name: '再留一段時間，給自己', exact: true }).click();
    await page.waitForURL('**/116gsat');
    assert.equal(await page.locator('.home-workspace').isVisible(), true);
    await page.context().close();
  });

  await check('temple ritual tabs, mobile layout and unverified balance protection', async () => {
    const page = await openPage({ width: 320 });
    await visit(page, '/116gsat/temple');
    assert.equal(await page.locator('.temple-wallet-balance strong').innerText(), '—');
    await page.getByRole('button', { name: '檢查並補傳', exact: true }).click();
    await page.getByText('請先登入，才能核對這個裝置與雲端的紀錄。', { exact: true }).waitFor();
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(1000);
      for (let tab = 0; tab < 4; tab++) {
        await page.locator('.temple-tab').nth(tab).click();
        await page.waitForTimeout(250);
        assert.equal(await page.locator('.temple-tab').nth(tab).getAttribute('aria-pressed'), 'true');
        await assertFits(page);
      }
    }
    await page.locator('.temple-tab').first().click();
    await page.getByRole('button', { name: '點亮光明燈 · 100 香火幣', exact: true }).click();
    await page.getByText('點數尚未核對。請先登入，再到學習歷程檢查同步。', { exact: true }).waitFor();
    await page.getByRole('button', { name: '關閉提醒', exact: true }).click();
    await page.getByRole('button', { name: '回到首頁', exact: true }).click();
    await page.waitForURL('**/116gsat');
    await page.context().close();
  });

  await check('no uncaught browser errors', async () => assert.deepEqual(runtimeErrors, []));
  console.log(`\nBrowser groups passed: ${checks}; failed: ${failures.length}`);
  if (failures.length) throw new Error(failures.map(failure => `${failure.name}\n${failure.message}`).join('\n\n'));
} finally {
  await browser?.close();
  server.kill();
}
