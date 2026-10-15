// Admin flows against the fake Supabase: node tests/browser/admin-flow.cjs
// Each step prints the database writes it made and the toast it showed;
// exits 1 on a JavaScript error, a failed step, or a step missing its expected write.
const { loadPlaywright, openApp } = require('./harness.cjs');

(async () => {
  const browser = await loadPlaywright().chromium.launch();
  const { page, errors } = await openApp(browser, { width: 1440 });
  const failures = [];
  const writes = () => page.evaluate(() => (window.__FAKE_WRITES || []).map(w => `${w.table}:${w.op}`));
  const toast = () => page.$eval('#toast', el => el.textContent.trim()).catch(() => '');
  const click = selector => page.evaluate(s => document.querySelector(s).click(), selector);

  async function step(name, expected, run) {
    const before = (await writes()).length;
    try {
      await run();
      await page.waitForTimeout(500);
    } catch (error) {
      failures.push(`${name}: ${error.message.split('\n')[0]}`);
    }
    const made = (await writes()).slice(before);
    if (expected && !made.includes(expected)) failures.push(`${name}: expected write ${expected}`);
    console.log(`${name.padEnd(22)} writes: ${made.join(' ') || '-'} | toast: ${await toast()}`);
  }

  await step('login', null, async () => {
    await page.click('#login-button');
    await page.fill('#admin-email', 'admin@example.com');
    await page.fill('#admin-password', 'x');
    await page.click('#login-form [type=submit]');
    await page.waitForSelector('#admin-toolbar:not(.hidden)', { timeout: 3000 });
  });
  await step('new announcement', 'announcements:insert', async () => {
    await page.click('#new-announcement-button');
    await page.fill('#announcement-title', 'Thử nghiệm');
    await page.click('#announcement-visual-editor');
    await page.keyboard.type('Nội dung thử');
    await page.click('#announcement-submit-button');
  });
  await step('edit announcement', 'announcements:update', async () => {
    await click('[data-action="edit-announcement"]');
    await page.fill('#announcement-title', 'Sửa');
    await page.click('#announcement-submit-button');
  });
  await step('delete announcement', 'announcements:delete', () => click('[data-action="delete-announcement"]'));
  await step('copy announcement', null, () => click('#current-announcements [data-action="copy-announcement"]'));
  await step('new week', 'weeks:insert', async () => {
    await page.click('#new-week-button');
    await page.fill('#week-number', '11');
    await page.fill('#week-start', '2026-12-07');
    await page.fill('#week-end', '2026-12-12');
    await page.click('#week-form [type=submit]');
  });
  await step('delete week', 'weeks:delete', () => click('[data-action="delete-week"]'));
  await step('quick input', 'announcements:insert', async () => {
    await page.click('#quick-input-button');
    await page.fill('#bulk-raw', '### Mục A\nNội dung A\n### Mục B\nNội dung B');
    await page.click('#bulk-preview-button');
    await page.click('#bulk-form [type=submit]');
  });
  await step('category save', 'categories:insert', async () => {
    await page.click('#categories-button');
    await page.fill('#category-name', 'Thư viện');
    await page.fill('#category-icon', '📚');
    await page.click('#category-form [type=submit]');
  });
  await page.keyboard.press('Escape');
  await step('school year', 'weeks:insert', async () => {
    await page.click('#school-year-button');
    await page.fill('#school-year-name', '2027-2028');
    await page.fill('#school-year-first-start', '2027-09-06');
    await page.fill('#school-year-first-end', '2027-09-11');
    await page.fill('#school-year-count-input', '3');
    await page.click('#school-year-preview-button');
    await page.click('#school-year-form [type=submit]');
  });
  await page.keyboard.press('Escape');
  await step('theme toggle', null, () => page.click('#theme-toggle'));
  await step('logout', null, async () => {
    await page.click('#logout-button');
    await page.waitForSelector('#admin-toolbar.hidden', { state: 'attached', timeout: 3000 });
  });

  await browser.close();
  const problems = [...errors.map(e => 'JavaScript: ' + e), ...failures];
  console.log(problems.length ? `admin-flow: FAILED\n  ${problems.join('\n  ')}` : 'admin-flow: ok');
  process.exit(problems.length ? 1 : 0);
})();
