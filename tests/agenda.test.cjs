const test = require('node:test');
const assert = require('node:assert/strict');

// Exercise the renderer modules without starting auth or fetching live data:
// js/main.js (which calls init()) is never imported.
const path = require('node:path');
const { pathToFileURL } = require('node:url');

globalThis.window = {
  WeeklyContent: { renderStoredContent: text => text, toPlainText: text => text, getStoredMode: () => 'markdown' },
  WeeklyInteractions: {},
  matchMedia: () => ({ matches: true })
};
globalThis.document = {
  querySelector: () => null,
  createElement: () => ({ set innerHTML(value) { this.textContent = value; } })
};
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.DOMParser = class {
  parseFromString(text) { return { body: { textContent: text } }; }
};

const load = name => import(pathToFileURL(path.join(__dirname, '..', 'js', name)).href);

// Modules are cached between tests, so reset the shared state each time.
async function app() {
  const [{ state }, { agendaHtml, readIds }, { getItems }] =
    await Promise.all([load('core.js'), load('agenda.js'), load('weeks.js')]);
  Object.assign(state, {
    weeks: [], announcements: [], categories: [], categoryFilter: 'all',
    readerId: null, readerOpen: false, selectedWeekId: null
  });
  state.announcementOpen.clear();
  readIds.clear();
  return { state, agendaHtml, getItems, readIds };
}

const week = {
  id: 'week', week_number: '10', school_year: '2026-2027',
  start_date: '2026-10-05', end_date: '2026-10-10'
};
const item = (id, event_date, extra = {}) => ({
  id, title: id, content: id, week_id: week.id, event_date,
  priority: 'normal', is_pinned: false, created_at: '2026-10-04T08:00:00Z', ...extra
});
const fixtures = [
  item('ongoing', '2026-09-21', { valid_from: '2026-09-21', valid_until: '2026-12-31', is_pinned: true }),
  item('tuesday', '2026-10-06'),
  item('monday', '2026-10-05'),
  item('future', '2026-10-12', { valid_from: '2026-10-05', valid_until: '2026-10-12' })
];

async function render(items = fixtures, visible = items, selected = null) {
  const api = await app();
  api.state.weeks = [week];
  api.state.readerId = selected;
  return { api, html: api.agendaHtml(week, items, visible) };
}

function rowIds(html) {
  const list = html.split('<div class="vm-list">')[1].split('<aside')[0];
  return [...list.matchAll(/data-action="open-reader" data-id="([^"]+)"/g)].map(match => match[1]);
}

test('current-week dates come before older ongoing notices and future events', async () => {
  const { html } = await render();
  assert.deepEqual(rowIds(html), ['monday', 'tuesday', 'ongoing', 'future']);
  assert.ok(html.includes('id="agenda-day-2026-10-05"'));
  assert.ok(html.includes('id="agenda-day-2026-10-06"'));
});

test('the initial reader selects the first unread notice in visible calendar order', async () => {
  const { api } = await render();
  assert.equal(api.state.readerId, 'monday');
});

test('reader next/previous follow the displayed order across group boundaries', async () => {
  const { html } = await render(fixtures, fixtures, 'tuesday');
  const reader = html.split('<aside')[1];
  assert.match(reader, /data-id="monday"[^>]*aria-label="Thông báo trước"/);
  assert.match(reader, /data-id="ongoing"[^>]*aria-label="Thông báo sau"/);
});

test('an active category retains only its notices in the same order', async () => {
  const visible = fixtures.filter(entry => entry.id === 'ongoing' || entry.id === 'monday');
  const { html } = await render(fixtures, visible);
  assert.deepEqual(rowIds(html), ['monday', 'ongoing']);
});

test('undated and ongoing-only notices remain visible without duplicate rows', async () => {
  const items = [fixtures[0], item('undated', null)];
  const { html } = await render(items);
  assert.deepEqual(rowIds(html), ['ongoing', 'undated']);
});

test('empty weeks and empty category results show their existing empty states', async () => {
  assert.match((await render([])).html, /Tuần này chưa có thông báo/);
  assert.match((await render(fixtures, [])).html, /Không có thông báo trong chuyên mục này/);
});

test('the same-day pinned/important ordering and source data are preserved', async () => {
  const api = await app();
  api.state.weeks = [week];
  const entries = [
    item('old', '2026-10-05', { created_at: '2026-10-01T00:00:00Z' }),
    item('new', '2026-10-05'),
    item('important', '2026-10-05', { priority: 'important' }),
    item('pinned', '2026-10-05', { is_pinned: true })
  ];
  api.state.announcements = entries;
  const original = JSON.stringify(entries);
  const items = api.getItems(week.id);
  assert.deepEqual(rowIds(api.agendaHtml(week, items, items)), ['pinned', 'important', 'new', 'old']);
  assert.equal(JSON.stringify(entries), original);
});

// "Mới đăng": notices posted in the last 24 hours lead the weekly calendar.
const justNow = (hoursAgo = 1) => new Date(Date.now() - hoursAgo * 3600e3).toISOString();

test('notices posted in the last 24 hours lead in a "Mới đăng" group without repeating in their day', async () => {
  const fresh = item('demo', '2026-10-07', { created_at: justNow(2) });
  const { html } = await render([...fixtures, fresh]);
  assert.deepEqual(rowIds(html), ['demo', 'monday', 'tuesday', 'ongoing', 'future']);
  assert.ok(html.includes('id="agenda-fresh"'));
  assert.ok(html.indexOf('id="agenda-fresh"') < html.indexOf('id="agenda-day-2026-10-05"'));
});

test('several fresh notices are newest first, and older ones never enter the group', async () => {
  const items = [...fixtures, item('older-new', '2026-10-05', { created_at: justNow(20) }), item('newest', '2026-10-08', { created_at: justNow(1) })];
  assert.deepEqual(rowIds((await render(items)).html).slice(0, 2), ['newest', 'older-new']);
  assert.ok(!(await render(fixtures)).html.includes('id="agenda-fresh"'));
  const stale = item('stale', '2026-10-05', { created_at: justNow(30) });
  assert.ok(!(await render([...fixtures, stale])).html.includes('id="agenda-fresh"'));
});

test('the reader starts at the newest unread post and steps on into the day groups', async () => {
  const fresh = item('demo', '2026-10-07', { created_at: justNow(2) });
  const { api, html } = await render([...fixtures, fresh]);
  assert.equal(api.state.readerId, 'demo');
  const reader = html.split('<aside')[1];
  assert.match(reader, /data-id="monday"[^>]*aria-label="Thông báo sau"/);
});

test('the list view puts pinned notices first, then the newest posts', async () => {
  const { newestFirst } = await load('weeks.js');
  const entries = [
    item('important-old', '2026-10-05', { priority: 'important', created_at: '2026-10-01T00:00:00Z' }),
    item('normal-new', '2026-10-05', { created_at: '2026-10-04T00:00:00Z' }),
    item('pinned-old', '2026-10-05', { is_pinned: true, created_at: '2026-09-01T00:00:00Z' })
  ];
  assert.deepEqual(newestFirst(entries).map(e => e.id), ['pinned-old', 'normal-new', 'important-old']);
  assert.deepEqual(entries.map(e => e.id), ['important-old', 'normal-new', 'pinned-old']);
});

// In the current week, today's group leads; later days follow, then the days already past.
async function currentWeek() {
  const { todayIso } = await load('utils.js');
  const shift = n => new Date(Date.parse(todayIso()) + n * 86400e3).toISOString().slice(0, 10);
  const days = { yesterday: shift(-1), before: shift(-2), today: shift(0), tomorrow: shift(1) };
  const current = { ...week, id: 'current', start_date: days.before, end_date: shift(3) };
  return { days, current };
}

test("today's notices lead the current week, then upcoming days, then past days (most recent first)", async () => {
  const { days, current } = await currentWeek();
  const items = [
    item('before', days.before), item('yesterday', days.yesterday),
    item('today', days.today), item('tomorrow', days.tomorrow)
  ].map(entry => ({ ...entry, week_id: current.id }));
  const api = await app();
  api.state.weeks = [current];
  const html = api.agendaHtml(current, items, items);
  assert.deepEqual(rowIds(html), ['today', 'tomorrow', 'yesterday', 'before']);
  assert.equal(api.state.readerId, 'today');
  assert.ok(html.indexOf(`id="agenda-day-${days.today}"`) < html.indexOf(`id="agenda-day-${days.before}"`));
  // The day strip stays in calendar order.
  const strip = [...html.split('<div class="vm-days">')[1].split('</div>')[0].matchAll(/data-day="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(strip, [...strip].sort());
});
