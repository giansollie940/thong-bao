// File attachments on announcements: node tests/browser/attachments.cjs
// Exits 1 on a JavaScript error or a failed check.
const { loadPlaywright, openApp } = require('./harness.cjs');

const BUCKET = 'announcement-files';
const kb = n => Buffer.alloc(n * 1024, 65);
const file = (name, mimeType, size = 12) => ({ name, mimeType, buffer: kb(size) });

// One announcement that already carries an attachment, posted just now so it opens in the reader.
const patch = `({ announcements, A, iso, now }) => {
  announcements.forEach(a => { a.created_at = '2026-09-01T00:00:00Z'; a.attachments = []; });
  announcements.push(A('withfiles', 'w4', 'Lịch thi có tệp', 'Xem tệp đính kèm.', 'Học tập', {
    event_date: iso(now), created_at: new Date().toISOString(),
    attachments: [
      { path: 'u/2026-11-08/abc-lich-thi.pdf', name: 'Lịch thi <HK1>.pdf', size: 245760, type: 'application/pdf' },
      { path: 'u/2026-11-08/def-danh-sach.xlsx', name: 'Danh sách lớp.xlsx', size: 18432, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    ]
  }));
}`;

(async () => {
  const browser = await loadPlaywright().chromium.launch();
  const failures = [];
  const allErrors = [];
  const check = (ok, label) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}`); if (!ok) failures.push(label); };

  async function signIn(page) {
    await page.click('#login-button');
    await page.fill('#admin-email', 'admin@example.com');
    await page.fill('#admin-password', 'x');
    await page.click('#login-form [type=submit]');
    await page.waitForSelector('#admin-toolbar:not(.hidden)');
  }
  const writes = page => page.evaluate(() => window.__FAKE_WRITES || []);

  // ---------- Readers see the attachment list ----------
  {
    console.log('reader');
    const { page, context, errors } = await openApp(browser, { patch });
    const reader = page.locator('#vm-reader .attachment-list');
    check(await reader.count() === 1, 'the reader shows an attachment list');
    const names = await reader.locator('.attachment-name').allTextContents();
    check(JSON.stringify(names) === JSON.stringify(['Lịch thi <HK1>.pdf', 'Danh sách lớp.xlsx']), `file names are shown as text (${names.join(' | ')})`);
    const href = await reader.locator('a.attachment-open').first().getAttribute('href');
    check(href === `https://fake.supabase.co/storage/v1/object/public/${BUCKET}/u/2026-11-08/abc-lich-thi.pdf`, 'open link points at the public file');
    check(await reader.locator('a.attachment-open').first().getAttribute('target') === '_blank', 'files open in a new tab');
    check(/240 KB/.test(await reader.innerText()) && /18 KB/.test(await reader.innerText()), 'sizes are readable');
    check(await page.locator('.vm-row', { hasText: 'Lịch thi có tệp' }).locator('.vm-row-files').count() === 1, 'the agenda row shows a paperclip count');
    await context.close();

    const list = await openApp(browser, { patch, view: 'list' });
    const card = list.page.locator('.announcement-card', { hasText: 'Lịch thi có tệp' });
    check(await card.locator('.attachment-list .attachment-item').count() === 2, 'the list view card lists both files');
    allErrors.push(...errors, ...list.errors);
    await list.context.close();
  }

  // ---------- Admin attaches, removes and saves ----------
  {
    console.log('admin');
    const { page, context, errors } = await openApp(browser, { patch });
    await signIn(page);
    await page.click('#new-announcement-button');
    await page.fill('#announcement-title', 'Thông báo có tài liệu');
    await page.click('#announcement-visual-editor');
    await page.keyboard.type('Nội dung');
    check(await page.isVisible('#announcement-attachments-field'), 'the attachments field is shown');

    await page.setInputFiles('#announcement-files', [
      file('Kế hoạch tuần.pdf', 'application/pdf'),
      file('Biểu mẫu.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      file('chay-thu.exe', 'application/x-msdownload'),
      file('quá lớn.pdf', 'application/pdf', 10 * 1024 + 1),
    ]);
    const rows = await page.locator('#announcement-attachment-list .attachment-name').allTextContents();
    check(JSON.stringify(rows) === JSON.stringify(['Kế hoạch tuần.pdf', 'Biểu mẫu.docx']), `only allowed files are queued (${rows.join(' | ')})`);
    const message = await page.textContent('#announcement-message');
    check(/chay-thu\.exe/.test(message) && /quá lớn\.pdf/.test(message), 'rejected files are named in the message');

    await page.locator('#announcement-attachment-list li', { hasText: 'Biểu mẫu.docx' }).locator('button').click();
    check(await page.locator('#announcement-attachment-list li').count() === 1, 'a queued file can be removed');

    const before = (await writes(page)).length;
    await page.click('#announcement-submit-button');
    await page.waitForTimeout(800);
    const made = (await writes(page)).slice(before);
    const uploads = made.filter(w => w.table === `storage:${BUCKET}` && w.op === 'upload');
    check(uploads.length === 1 && /\.pdf$/.test(uploads[0].payload.path) && uploads[0].payload.type === 'application/pdf', 'the file is uploaded to the announcement-files bucket');
    check(uploads.length === 1 && /^[\w./-]+$/.test(uploads[0].payload.path), `storage key is plain ASCII (${uploads[0]?.payload.path})`);
    const insert = made.find(w => w.table === 'announcements' && w.op === 'insert');
    const saved = insert?.payload?.attachments || [];
    check(saved.length === 1 && saved[0].name === 'Kế hoạch tuần.pdf' && saved[0].size === 12 * 1024 && saved[0].type === 'application/pdf' && saved[0].path === uploads[0]?.payload.path,
      'the announcement stores the attachment with its original name');
    check(!(await page.$eval('#announcement-dialog', d => d.open)), 'the form closes after saving');

    // Editing: remove an existing attachment; its file is deleted after saving.
    await page.evaluate(() => document.querySelector('#vm-reader [data-action="edit-announcement"]').click());
    const existing = await page.locator('#announcement-attachment-list .attachment-name').allTextContents();
    check(existing.length === 2, 'editing lists the existing attachments');
    await page.locator('#announcement-attachment-list li', { hasText: 'Danh sách lớp.xlsx' }).locator('button').click();
    const editBefore = (await writes(page)).length;
    await page.click('#announcement-submit-button');
    await page.waitForTimeout(800);
    const edited = (await writes(page)).slice(editBefore);
    const update = edited.find(w => w.table === 'announcements' && w.op === 'update');
    check(JSON.stringify((update?.payload?.attachments || []).map(a => a.name)) === JSON.stringify(['Lịch thi <HK1>.pdf']), 'the update keeps only the remaining file');
    check(edited.some(w => w.table === `storage:${BUCKET}` && w.op === 'remove' && JSON.stringify(w.payload) === JSON.stringify(['u/2026-11-08/def-danh-sach.xlsx'])), 'the removed file is deleted from storage');

    // Deleting the announcement deletes its files.
    const deleteBefore = (await writes(page)).length;
    await page.evaluate(() => document.querySelector('#vm-reader [data-action="delete-announcement"]').click());
    await page.waitForTimeout(800);
    const removed = (await writes(page)).slice(deleteBefore).filter(w => w.table === `storage:${BUCKET}` && w.op === 'remove').flatMap(w => w.payload);
    check(removed.includes('u/2026-11-08/abc-lich-thi.pdf') && removed.includes('u/2026-11-08/def-danh-sach.xlsx'), 'deleting the announcement deletes its files');
    allErrors.push(...errors);
    await context.close();
  }

  // ---------- Database not updated yet: the feature hides itself ----------
  {
    console.log('without the attachments column');
    const { page, context, errors } = await openApp(browser, {});
    await page.addInitScript(() => { window.__FAKE_NO_ATTACHMENTS = true; });
    await page.reload();
    await page.waitForSelector('.vm-agenda, #current-announcements');
    await page.waitForTimeout(500);
    await signIn(page);
    await page.click('#new-announcement-button');
    check(!(await page.isVisible('#announcement-attachments-field')), 'the attachments field is hidden');
    await page.fill('#announcement-title', 'Không có cột tệp');
    await page.click('#announcement-visual-editor');
    await page.keyboard.type('Nội dung');
    const before = (await writes(page)).length;
    await page.click('#announcement-submit-button');
    await page.waitForTimeout(800);
    const insert = (await writes(page)).slice(before).find(w => w.table === 'announcements' && w.op === 'insert');
    check(Boolean(insert) && !('attachments' in insert.payload) && !(await page.$eval('#announcement-dialog', d => d.open)), 'saving still works and sends no attachments field');
    allErrors.push(...errors);
    await context.close();
  }

  await browser.close();
  const problems = [...allErrors.map(e => 'JavaScript: ' + e), ...failures];
  console.log(problems.length ? `attachments: FAILED\n  ${problems.join('\n  ')}` : 'attachments: ok');
  process.exit(problems.length ? 1 : 0);
})();
