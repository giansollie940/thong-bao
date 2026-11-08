// Announcement form: pasting an image and keeping the form open.
//   node tests/browser/editor-paste.cjs
// Exits 1 on a JavaScript error or a failed check.
const { loadPlaywright, openApp } = require('./harness.cjs');

(async () => {
  const browser = await loadPlaywright().chromium.launch();
  const { page, errors } = await openApp(browser, { width: 1280 });
  const failures = [];
  const check = (ok, label) => { console.log(`${ok ? '  ok  ' : '  FAIL'} ${label}`); if (!ok) failures.push(label); };
  const dialogOpen = () => page.$eval('#announcement-dialog', dialog => dialog.open);
  const writes = () => page.evaluate(() => window.__FAKE_WRITES || []);

  await page.click('#login-button');
  await page.fill('#admin-email', 'admin@example.com');
  await page.fill('#admin-password', 'x');
  await page.click('#login-form [type=submit]');
  await page.waitForSelector('#admin-toolbar:not(.hidden)');

  // --- The form stays open until Hủy, × or Lưu. ---
  await page.click('#new-announcement-button');
  await page.fill('#announcement-title', 'Có ảnh dán');
  await page.mouse.click(5, 5); // the backdrop, outside the form card
  await page.waitForTimeout(200);
  check(await dialogOpen(), 'clicking outside the form keeps it open');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check(await dialogOpen(), 'Escape keeps it open');
  check(await page.inputValue('#announcement-title') === 'Có ảnh dán', 'what was typed is still there');

  // --- Paste a screenshot into the visual editor. ---
  // A 1x1 PNG, like a screenshot on the clipboard (no text/html).
  const pasteImage = target => page.evaluate(async selector => {
    const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), c => c.charCodeAt(0));
    const data = new DataTransfer();
    data.items.add(new File([bytes], 'image.png', { type: 'image/png' }));
    const element = document.querySelector(selector);
    element.focus();
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, target);

  await page.click('#announcement-visual-editor');
  await page.keyboard.type('Trước ảnh ');
  await pasteImage('#announcement-visual-editor');
  await page.waitForFunction(() => document.querySelector('#announcement-visual-editor img'), null, { timeout: 5000 }).catch(() => {});
  const src = await page.$eval('#announcement-visual-editor img', img => img.getAttribute('src')).catch(() => '');
  check(/^https:\/\/fake\.supabase\.co\/storage\/v1\/object\/public\/announcement-images\/.+\.(png|webp|jpg)$/.test(src), `pasted image is uploaded and shown (${src || 'no image'})`);
  check((await writes()).some(write => write.table === 'storage:announcement-images' && write.op === 'upload'), 'the image went to the announcement-images bucket');
  check(!(await page.$('#announcement-visual-editor .editor-image-uploading')), 'no upload placeholder left behind');
  check((await page.inputValue('#announcement-content')).includes(src), 'the HTML source contains the image');

  // --- A large screenshot is shrunk before upload. ---
  const bigBefore = (await writes()).length;
  const bigSize = await page.evaluate(async () => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 2400, height: 1600 });
    const context = canvas.getContext('2d');
    const pixels = context.createImageData(2400, 1600);
    for (let i = 0; i < pixels.data.length; i += 1) pixels.data[i] = (i * 2654435761) >>> 24;
    context.putImageData(pixels, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const data = new DataTransfer();
    data.items.add(new File([blob], 'screenshot.png', { type: 'image/png' }));
    const editor = document.querySelector('#announcement-visual-editor');
    editor.focus();
    editor.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    return blob.size;
  });
  await page.waitForFunction(count => (window.__FAKE_WRITES || []).length > count, bigBefore, { timeout: 8000 }).catch(() => {});
  const bigUpload = (await writes()).slice(bigBefore).find(write => write.op === 'upload');
  check(Boolean(bigUpload) && /image\/(webp|jpeg)/.test(bigUpload.payload.type) && bigUpload.payload.size < bigSize,
    `a ${Math.round(bigSize / 1024)} KB screenshot is uploaded as ${bigUpload?.payload.type} (${Math.round((bigUpload?.payload.size || 0) / 1024)} KB)`);
  await page.waitForFunction(() => !document.querySelector('#announcement-visual-editor .editor-image-uploading'), null, { timeout: 5000 });

  // --- Paste into the HTML view inserts an <img> tag at the cursor. ---
  await page.click('[data-editor-view="html"]');
  await page.click('#announcement-content');
  await page.keyboard.press('End');
  await pasteImage('#announcement-content');
  await page.waitForTimeout(800);
  const imgTags = ((await page.inputValue('#announcement-content')).match(/<img [^>]*src="https:\/\/fake\.supabase\.co[^"]+"/g) || []).length;
  check(imgTags === 3, `pasting in the HTML view adds another <img> tag (${imgTags})`);
  await page.click('[data-editor-view="visual"]');

  // --- Lưu saves the content with the images and closes the form. ---
  const before = (await writes()).length;
  await page.click('#announcement-submit-button');
  await page.waitForTimeout(800);
  const insert = (await writes()).slice(before).find(write => write.table === 'announcements' && write.op === 'insert');
  check(Boolean(insert) && /<img [^>]*src="https:\/\/fake\.supabase\.co/.test(String(insert.payload?.content)), 'saved content keeps the pasted images');
  check(!(await dialogOpen()), 'Lưu closes the form');

  // --- A slow upload: Lưu waits for it, and the HTML view cannot be opened meanwhile. ---
  await page.click('#new-announcement-button');
  await page.fill('#announcement-title', 'Ảnh tải chậm');
  await page.evaluate(() => { window.__FAKE_UPLOAD_DELAY = 1500; });
  await page.click('#announcement-visual-editor');
  await pasteImage('#announcement-visual-editor');
  await page.waitForTimeout(100);
  check(Boolean(await page.$('#announcement-visual-editor .editor-image-uploading')), 'a placeholder shows while the image uploads');
  const slowBefore = (await writes()).length;
  await page.click('#announcement-submit-button');
  await page.waitForTimeout(200);
  check(await dialogOpen() && /đang tải lên/.test(await page.textContent('#announcement-message')), 'Lưu during the upload asks to wait');
  check(!(await writes()).slice(slowBefore).some(write => write.table === 'announcements'), 'nothing is saved while the image uploads');
  await page.click('[data-editor-view="html"]');
  check(await page.$eval('#announcement-rich-editor', root => root.dataset.view) === 'visual', 'the HTML view waits for the upload');
  await page.waitForFunction(() => !document.querySelector('#announcement-visual-editor .editor-image-uploading'), null, { timeout: 5000 });
  await page.evaluate(() => { window.__FAKE_UPLOAD_DELAY = 0; });
  await page.click('#announcement-submit-button');
  await page.waitForTimeout(800);
  const slowInsert = (await writes()).slice(slowBefore).find(write => write.table === 'announcements' && write.op === 'insert');
  check(Boolean(slowInsert) && /<img /.test(String(slowInsert.payload?.content)) && !(await dialogOpen()), 'after the upload finishes, Lưu saves with the image');

  // --- Hủy closes it. ---
  await page.click('#new-announcement-button');
  await page.click('#announcement-dialog .close-dialog');
  await page.waitForTimeout(200);
  check(!(await dialogOpen()), '× closes the form');

  // Viewer dialogs still close on an outside click.
  await page.evaluate(() => document.querySelector('#archive-dialog').showModal());
  await page.mouse.click(5, 5);
  await page.waitForTimeout(200);
  check(!(await page.$eval('#archive-dialog', dialog => dialog.open)), 'the archive viewer still closes on an outside click');

  await browser.close();
  const problems = [...errors.map(e => 'JavaScript: ' + e), ...failures];
  console.log(problems.length ? `editor-paste: FAILED\n  ${problems.join('\n  ')}` : 'editor-paste: ok');
  process.exit(problems.length ? 1 : 0);
})();
