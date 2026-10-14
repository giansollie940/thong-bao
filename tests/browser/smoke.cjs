// Smoke test of the reader views: node tests/browser/smoke.cjs [screenshot-dir]
// Prints the Lịch tuần group order and the Danh sách order at 1440px and 390px,
// and exits 1 on a JavaScript error or an ordering regression.
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadPlaywright, openApp } = require('./harness.cjs');

// Today's notice posted an hour ago ("Mới đăng"), another for today posted two days ago,
// and one for Monday posted two days ago; every other notice is old.
const patch = `({ announcements, A, iso, now, rel }) => {
  const ago = hours => new Date(Date.now() - hours * 3600e3).toISOString();
  announcements.forEach(a => { a.created_at = '2026-09-01T00:00:00Z'; });
  announcements.push(
    A('demo', 'w4', 'Thông báo demo vừa đăng', 'Nội dung demo', 'Hoạt động', { event_date: iso(now), created_at: ago(1) }),
    A('today', 'w4', 'Việc của hôm nay', 'x', 'Học tập', { event_date: iso(now), created_at: ago(48) }),
    A('monday', 'w4', 'Việc thứ Hai', 'x', 'Học tập', { event_date: rel(0), created_at: ago(48) })
  );
}`;

(async () => {
  const shots = process.argv[2];
  const browser = await loadPlaywright().chromium.launch();
  let failed = false;
  try {
    for (const [width, view] of [[1440, 'agenda'], [1440, 'list'], [390, 'agenda']]) {
      const { page, context, errors } = await openApp(browser, { width, view, patch });
      const order = view === 'agenda'
        ? await page.$$eval('.vm-list .vm-group', groups => groups.map(group =>
            group.querySelector('h4').textContent.trim() + ': ' +
            [...group.querySelectorAll('.vm-row-title')].map(title => title.textContent.trim()).join(' | ')))
        : await page.$$eval('#current-announcements .announcement-toggle', toggles => toggles.map(t => t.textContent.trim()));
      console.log(`${width}px ${view}:\n  ${order.join('\n  ')}`);
      try {
        assert.deepEqual(errors, [], 'JavaScript errors');
        if (view === 'agenda') {
          assert.match(order[0], /^🆕 Mới đăng: Thông báo demo vừa đăng$/);
          // The fake current week runs Monday–Saturday, so on Sunday there is no "Hôm nay" group.
          const sunday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short' })
            .format(new Date()) === 'Sun';
          if (!sunday) assert.match(order[1], /^Hôm nay · /);
          const reader = await page.$eval('#vm-reader h3', el => el.textContent.trim());
          assert.equal(reader, 'Thông báo demo vừa đăng');
          console.log('  reader:', reader);
        } else {
          assert.ok(order.length > 0, 'list view shows notices');
        }
      } catch (error) {
        failed = true;
        console.error('  FAIL:', error.message);
      }
      if (shots) await page.screenshot({ path: path.join(shots, `smoke-${width}-${view}.png`), fullPage: true });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(failed ? 'smoke: FAILED' : 'smoke: ok');
  process.exit(failed ? 1 : 0);
})();
