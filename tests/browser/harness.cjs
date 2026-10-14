// Shared Playwright setup: serves the repo as http://app.local/, swaps supabase-js for
// fake-supabase.js and a dummy config.js, and blocks every other host (fonts, CDNs).
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const FAKE = fs.readFileSync(path.join(__dirname, 'fake-supabase.js'), 'utf8');
const CONFIG = 'window.APP_CONFIG={SUPABASE_URL:"https://fake.supabase.co",SUPABASE_KEY:"fake"};';

function loadPlaywright() {
  try { return require('playwright'); } catch {}
  try { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } catch {}
  throw new Error('Playwright not found: run `npm i -g playwright` (or `npm i playwright`) first.');
}

// patch: optional function source run inside fake-supabase.js as
// ({ weeks, announcements, A, iso, rel, now }) => { ... } to add or change data.
async function openApp(browser, { width = 1440, height = 900, view = 'agenda', patch = '' } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    permissions: ['clipboard-read', 'clipboard-write']
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // "Failed to load resource" comes from the hosts blocked below, not from the app.
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
      errors.push('console: ' + message.text());
    }
  });
  page.on('dialog', dialog => dialog.accept());

  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'cdn.jsdelivr.net') return route.fulfill({ contentType: 'text/javascript', body: FAKE });
    if (url.hostname !== 'app.local') return route.abort();
    const file = url.pathname === '/' ? '/index.html' : url.pathname;
    if (file === '/config.js') return route.fulfill({ contentType: 'text/javascript', body: CONFIG });
    const full = path.join(ROOT, file);
    return fs.existsSync(full) ? route.fulfill({ path: full }) : route.fulfill({ status: 404, body: '' });
  });
  await page.addInitScript(`
    try {
      localStorage.setItem('weekly-board-view', ${JSON.stringify(view)});
      localStorage.setItem('weeklyBoardPetHidden', '1');
    } catch {}
    ${patch ? `window.__FAKE_PATCH = ${patch};` : ''}
  `);
  await page.goto('http://app.local/');
  await page.waitForSelector('.vm-agenda, #current-announcements', { timeout: 10000 });
  await page.waitForTimeout(500);
  return { page, context, errors };
}

module.exports = { ROOT, loadPlaywright, openApp };
