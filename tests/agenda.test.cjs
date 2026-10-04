const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the existing renderer without starting auth or fetching live data.
function app() {
  const source = fs.readFileSync(require.resolve('../app.js'), 'utf8');
  const sandbox = {
    window: {
      WeeklyContent: { renderStoredContent: text => text, toPlainText: text => text, getStoredMode: () => 'markdown' },
      WeeklyInteractions: {},
      matchMedia: () => ({ matches: true })
    },
    document: {
      querySelector: () => null,
      createElement: () => ({ set innerHTML(value) { this.textContent = value; } })
    },
    localStorage: { getItem: () => null, setItem() {} },
    DOMParser: class {
      parseFromString(text) { return { body: { textContent: text } }; }
    },
    console
  };
  vm.runInNewContext(source.slice(0, source.lastIndexOf('  init().catch')) +
    '  globalThis.app = { state, agendaHtml, getItems, readIds };\n})();', sandbox);
  return sandbox.app;
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

function render(items = fixtures, visible = items, selected = null) {
  const api = app();
  api.state.weeks = [week];
  api.state.readerId = selected;
  return { api, html: api.agendaHtml(week, items, visible) };
}

function rowIds(html) {
  const list = html.split('<div class="vm-list">')[1].split('<aside')[0];
  return [...list.matchAll(/data-action="open-reader" data-id="([^"]+)"/g)].map(match => match[1]);
}

test('current-week dates come before older ongoing notices and future events', () => {
  const { html } = render();
  assert.deepEqual(rowIds(html), ['monday', 'tuesday', 'ongoing', 'future']);
  assert.ok(html.includes('id="agenda-day-2026-10-05"'));
  assert.ok(html.includes('id="agenda-day-2026-10-06"'));
});

test('the initial reader selects the first unread notice in visible calendar order', () => {
  const { api } = render();
  assert.equal(api.state.readerId, 'monday');
});

test('reader next/previous follow the displayed order across group boundaries', () => {
  const { html } = render(fixtures, fixtures, 'tuesday');
  const reader = html.split('<aside')[1];
  assert.match(reader, /data-id="monday"[^>]*aria-label="Thông báo trước"/);
  assert.match(reader, /data-id="ongoing"[^>]*aria-label="Thông báo sau"/);
});

test('an active category retains only its notices in the same order', () => {
  const visible = fixtures.filter(entry => entry.id === 'ongoing' || entry.id === 'monday');
  const { html } = render(fixtures, visible);
  assert.deepEqual(rowIds(html), ['monday', 'ongoing']);
});

test('undated and ongoing-only notices remain visible without duplicate rows', () => {
  const items = [fixtures[0], item('undated', null)];
  const { html } = render(items);
  assert.deepEqual(rowIds(html), ['ongoing', 'undated']);
});

test('empty weeks and empty category results show their existing empty states', () => {
  assert.match(render([]).html, /Tuần này chưa có thông báo/);
  assert.match(render(fixtures, []).html, /Không có thông báo trong chuyên mục này/);
});

test('the same-day pinned/important ordering and source data are preserved', () => {
  const api = app();
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
