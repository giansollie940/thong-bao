// agenda.js — Kiểu hiển thị Lịch tuần: dải ngày, "Cần chú ý", danh sách theo ngày, khung đọc, chưa đọc.

import {
  activeCategories,
  categoryDisplayColor,
  categoryInfo,
  categoryStyle
} from "./categories.js";
import {
  contentInteractions,
  contentRenderer,
  el,
  isAdmin,
  state
} from "./core.js";
import {
  getImagePublicUrl
} from "./images.js";
import {
  announcementPreview,
  enhanceRenderedContent,
  renderCurrent
} from "./render.js";
import {
  dateObj,
  dayMonth,
  daysFromToday,
  escapeHtml,
  formatDate,
  readStorage,
  relativeDayLabel,
  todayIso,
  writeStorage
} from "./utils.js";
import {
  schoolYearKey,
  sortedWeeks,
  weekDays,
  weekState
} from "./weeks.js";

/* =========================================================
   V3.24 — View modes: Lịch tuần (mặc định) / Danh sách
   ========================================================= */

const VIEW_MODES = ["agenda", "list"];

const VIEW_STORAGE_KEY = "weekly-board-view";

const READ_STORAGE_KEY = "weekly-board-read-v1";

const WEEKDAY_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const WEEKDAY_LONG = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export function initialViewMode() {
  const fromUrl = new URLSearchParams(location.search).get("view");
  const stored = readStorage(VIEW_STORAGE_KEY);
  return VIEW_MODES.find(mode => mode === fromUrl) || VIEW_MODES.find(mode => mode === stored) || "agenda";
}

// Announcements this browser has opened (agenda reader). Stored per viewer only.
export const readIds = new Set((() => {
  try { return JSON.parse(readStorage(READ_STORAGE_KEY) || "[]"); } catch { return []; }
})());

function markRead(id) {
  const key = String(id);
  if (readIds.has(key)) return;
  readIds.add(key);
  writeStorage(READ_STORAGE_KEY, JSON.stringify([...readIds].slice(-500)));
}

function relativeChip(item) {
  const rel = relativeDayLabel(item.event_date);
  return rel ? `<span class="vm-chip is-${rel.tone}">${rel.text}</span>` : "";
}

function weekNavHtml(week) {
  const weeks = sortedWeeks().filter(w => schoolYearKey(w) === state.activeSchoolYear);
  const index = weeks.findIndex(w => w.id === week.id);
  const prev = weeks[index - 1];
  const next = weeks[index + 1];

  return `
    <div class="vm-weeknav">
      <button type="button" class="vm-weeknav-step" data-action="select-week" data-id="${escapeHtml(prev?.id || "")}" ${prev ? "" : "disabled"} aria-label="Tuần trước">‹</button>
      <strong>Tuần ${escapeHtml(week.week_number)}</strong>
      <span>${dayMonth(week.start_date)} – ${dayMonth(week.end_date)}</span>
      <button type="button" class="vm-weeknav-step" data-action="select-week" data-id="${escapeHtml(next?.id || "")}" ${next ? "" : "disabled"} aria-label="Tuần sau">›</button>
    </div>`;
}

// "Ngày 4/6 · còn 2 ngày" for the running week; a short status otherwise.
function weekProgressHtml(week) {
  const today = todayIso();
  const s = weekState(week);

  if (s === "upcoming") return `<span class="vm-progress-text">Bắt đầu sau ${daysFromToday(week.start_date)} ngày</span>`;
  if (s === "past") return '<span class="vm-progress-text">Đã kết thúc</span>';

  const days = weekDays(week);
  const index = Math.max(1, days.filter(day => day <= today).length);
  const left = days.length - index;

  return `
    <span class="vm-progress-wrap" title="Ngày ${index} trên ${days.length} của tuần">
      <span class="vm-progress" aria-hidden="true"><i style="width:${Math.round(index / days.length * 100)}%"></i></span>
      <span class="vm-progress-text">Ngày ${index}/${days.length}${left ? ` · còn ${left} ngày` : " · ngày cuối"}</span>
    </span>`;
}

function weekAdminHtml(week) {
  return isAdmin() ? `
    <span class="vm-admin">
      <button class="button button-ghost button-small" data-action="edit-week" data-id="${week.id}">✎ Sửa tuần</button>
      <button class="button button-danger button-small" data-action="delete-week" data-id="${week.id}">⌫ Xóa tuần</button>
    </span>` : "";
}

function categoryChipsHtml(items) {
  const counts = new Map();
  items.forEach(item => {
    const key = categoryInfo(item).key;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const chip = (key, label, icon, count, style = "") => `
    <button type="button" class="vm-cat ${state.categoryFilter === key ? "is-active" : ""}" style="${style}"
      data-action="filter-category" data-category="${escapeHtml(key)}" aria-pressed="${state.categoryFilter === key}">
      <span aria-hidden="true">${escapeHtml(icon)}</span>${escapeHtml(label)}<b>${count}</b>
    </button>`;

  return chip("all", "Tất cả", "✨", items.length) + activeCategories()
    .filter(category => counts.has(category.slug))
    .map(category => chip(category.slug, category.name, category.icon || "📌", counts.get(category.slug), categoryStyle(category)))
    .join("");
}

export function renderViewStage(week, items, visibleItems) {
  if (el.currentSection) el.currentSection.dataset.view = state.viewMode;

  el.viewSwitcher?.querySelectorAll("[data-view]").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.view === state.viewMode));
  });

  if (!el.viewStage) return;

  if (state.viewMode === "list" || !week) {
    el.viewStage.innerHTML = "";
    return;
  }

  el.viewStage.innerHTML = agendaHtml(week, items, visibleItems);

  contentInteractions.enhance(el.viewStage);
}

/* ---------- Lịch tuần theo ngày + khung đọc ---------- */

export function agendaHtml(week, items, visibleItems) {
  const today = todayIso();
  const days = weekDays(week);
  const groups = new Map(days.map(day => [day, []]));
  const before = [];
  const after = [];

  visibleItems.forEach(item => {
    const day = item.event_date;
    if (day && groups.has(day)) groups.get(day).push(item);
    else if (day && day > week.end_date) after.push(item);
    else before.push(item);
  });

  // Keep selection and reader navigation in the same order as the calendar.
  const agendaItems = [...days.flatMap(day => groups.get(day)), ...before, ...after];

  const attention = items
    .filter(item => {
      const diff = daysFromToday(item.event_date);
      return item.is_pinned || item.priority === "important" || (diff !== null && diff >= 0 && diff <= 3);
    })
    .sort((a, b) => String(a.event_date || "9").localeCompare(String(b.event_date || "9")));

  if (!items.some(item => String(item.id) === state.readerId)) {
    const first = agendaItems.find(item => !readIds.has(String(item.id))) || agendaItems[0];
    state.readerId = first ? String(first.id) : null;
  }

  const strip = days.map(day => {
    const dayItems = items.filter(item => item.event_date === day);
    const dots = dayItems.slice(0, 4).map(item =>
      `<i style="background:${escapeHtml(categoryDisplayColor(categoryInfo(item)))}"></i>`).join("");
    const weekday = WEEKDAY_SHORT[dateObj(day).getDay()];

    return `
      <button type="button" class="vm-day ${day === today ? "is-today" : ""} ${day < today ? "is-past" : ""}"
        data-action="agenda-jump" data-day="${day}" ${dayItems.length ? "" : "disabled"}
        aria-label="${WEEKDAY_LONG[dateObj(day).getDay()]} ${dayMonth(day)}, ${dayItems.length} thông báo">
        <small>${day === today ? "Hôm nay" : weekday}</small>
        <b>${day.slice(8, 10)}</b>
        <span class="vm-dots">${dots}</span>
      </button>`;
  }).join("");

  const row = item => {
    const category = categoryInfo(item);
    const id = String(item.id);
    return `
      <button type="button" class="vm-row ${id === state.readerId ? "is-selected" : ""} ${readIds.has(id) ? "is-read" : ""} ${item.priority === "important" ? "is-important" : ""}"
        style="${categoryStyle(category)}" data-action="open-reader" data-id="${escapeHtml(id)}" aria-pressed="${id === state.readerId}">
        <span class="vm-unread" aria-label="${readIds.has(id) ? "" : "Chưa đọc"}"></span>
        <span class="vm-row-main">
          <span class="vm-row-title">${item.is_pinned ? "📌 " : ""}${escapeHtml(item.title)}</span>
          <span class="vm-row-preview">${escapeHtml(announcementPreview(contentRenderer.renderStoredContent(item.content)))}</span>
        </span>
        <span class="vm-row-side">
          ${relativeChip(item) || `<span class="vm-row-date">${item.event_date ? dayMonth(item.event_date) : ""}</span>`}
          <span class="vm-row-cat">${escapeHtml(category.icon || "📌")}</span>
        </span>
      </button>`;
  };

  const group = (id, title, list) => list.length ? `
    <section class="vm-group" id="${id}">
      <h4>${title}</h4>
      ${list.map(row).join("")}
    </section>` : "";

  const dayTitle = day => {
    const label = `${WEEKDAY_LONG[dateObj(day).getDay()]} ${dayMonth(day)}`;
    return day === today ? `Hôm nay · ${label}` : label;
  };

  const selected = items.find(item => String(item.id) === state.readerId);
  // Counts as read once it is actually on screen: always on desktop, on phones only when opened.
  if (selected && (state.readerOpen || !window.matchMedia("(max-width: 900px)").matches)) {
    markRead(selected.id);
  }
  const unread = items.filter(item => !readIds.has(String(item.id))).length;

  return `
    <div class="vm-agenda">
      <header class="vm-agenda-head">
        ${weekNavHtml(week)}
        ${weekProgressHtml(week)}
        ${items.length ? `<span class="vm-chip ${unread ? "is-unread" : ""}">${unread ? `${unread} chưa đọc` : "Đã đọc hết"}</span>` : ""}
        ${weekAdminHtml(week)}
      </header>

      <div class="vm-days">${strip}</div>

      ${attention.length ? `
        <div class="vm-attention">
          <strong>⚠ Cần chú ý</strong>
          ${attention.slice(0, 5).map(item => `
            <button type="button" class="vm-attention-row" data-action="open-reader" data-id="${escapeHtml(item.id)}">
              ${relativeChip(item) || (item.priority === "important" ? '<span class="vm-chip is-soon">Quan trọng</span>' : "")}
              <span>${escapeHtml(item.title)}</span>
            </button>`).join("")}
        </div>` : ""}

      ${items.length ? `
        <div class="vm-cats">${categoryChipsHtml(items)}</div>

        <div class="vm-split">
          <div class="vm-list">
            ${visibleItems.length ? "" : '<div class="empty-state">Không có thông báo trong chuyên mục này.</div>'}
            ${days.map(day => group(`agenda-day-${day}`, dayTitle(day), groups.get(day))).join("")}
            ${group("agenda-before", "Đang có hiệu lực", before)}
            ${group("agenda-after", "Sắp tới (sau tuần này)", after)}
          </div>

          <aside class="vm-reader ${state.readerOpen ? "is-open" : ""}" id="vm-reader" aria-label="Nội dung thông báo">
            ${selected ? readerHtml(selected, agendaItems) : '<p class="vm-reader-empty">Chọn một thông báo để đọc.</p>'}
          </aside>
        </div>` : '<div class="empty-state">Tuần này chưa có thông báo.</div>'}
    </div>`;
}

function readerHtml(item, list) {
  const category = categoryInfo(item);
  const contentMode = contentRenderer.getStoredMode(item.content);
  const index = list.findIndex(x => String(x.id) === String(item.id));
  const prev = list[index - 1];
  const next = list[index + 1];

  return `
    <div class="vm-reader-bar">
      <button type="button" class="vm-reader-close" data-action="close-reader">‹ Danh sách</button>
      <span>
        <button type="button" class="vm-step" data-action="open-reader" data-id="${escapeHtml(prev?.id || "")}" ${prev ? "" : "disabled"} aria-label="Thông báo trước">‹ Trước</button>
        <button type="button" class="vm-step" data-action="open-reader" data-id="${escapeHtml(next?.id || "")}" ${next ? "" : "disabled"} aria-label="Thông báo sau">Sau ›</button>
      </span>
    </div>
    <article class="vm-reader-body" style="${categoryStyle(category)}">
      <div class="vm-reader-chips">
        <span class="category-chip" style="${categoryStyle(category)}"><span aria-hidden="true">${escapeHtml(category.icon || "📌")}</span> ${escapeHtml(category.name)}</span>
        ${item.priority === "important" ? '<span class="priority-chip">Quan trọng</span>' : ""}
      </div>
      <h3>${item.is_pinned ? "📌 " : ""}${escapeHtml(item.title)}</h3>
      <p class="vm-reader-meta">📅 ${escapeHtml(formatDate(item.event_date))}${(() => {
        const rel = relativeDayLabel(item.event_date);
        return rel ? ` · <strong>${rel.text}</strong>` : "";
      })()}${item.valid_from || item.valid_until ? ` · Hiệu lực ${escapeHtml(formatDate(item.valid_from || item.event_date))} → ${escapeHtml(formatDate(item.valid_until || item.valid_from || item.event_date))}` : ""}</p>
      ${item.image_path ? `<button class="announcement-image-button" type="button" data-action="open-image" data-id="${escapeHtml(item.id)}"><img src="${escapeHtml(getImagePublicUrl(item.image_path))}" alt="${escapeHtml(item.image_alt || item.title)}" loading="lazy" decoding="async"></button>` : ""}
      <div class="announcement-content ${contentMode === "html" ? "html-content" : ""}">${contentRenderer.renderStoredContent(item.content)}</div>
      <div class="card-actions">
        <button class="button button-ghost button-small card-command" data-action="copy-announcement" data-id="${escapeHtml(item.id)}"><span aria-hidden="true">⧉</span><span>Sao chép</span></button>
        ${isAdmin() ? `
          <button class="button button-ghost button-small card-command" data-action="edit-announcement" data-id="${escapeHtml(item.id)}"><span aria-hidden="true">✎</span><span>Sửa</span></button>
          <button class="button button-danger button-small card-command" data-action="delete-announcement" data-id="${escapeHtml(item.id)}"><span aria-hidden="true">⌫</span><span>Xóa</span></button>` : ""}
      </div>
    </article>`;
}

export function openReader(id) {
  if (!id) return;
  state.readerId = String(id);
  state.readerOpen = true;
  renderCurrent();
  document.body.classList.toggle("vm-reader-locked", window.matchMedia("(max-width: 900px)").matches);
  const reader = document.getElementById("vm-reader");
  reader?.scrollTo({ top: 0 });
  if (!window.matchMedia("(max-width: 900px)").matches) {
    const box = reader?.getBoundingClientRect();
    if (box && (box.top < 0 || box.top > window.innerHeight * .6)) {
      reader.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
}

export function closeReader() {
  state.readerOpen = false;
  document.body.classList.remove("vm-reader-locked");
  document.getElementById("vm-reader")?.classList.remove("is-open");
}

export function setViewMode(mode) {
  if (!VIEW_MODES.includes(mode)) return;
  state.viewMode = mode;
  writeStorage(VIEW_STORAGE_KEY, mode);
  closeReader();
  renderCurrent();
  enhanceRenderedContent();
}
