// render.js — Hiển thị trang chính: thẻ thông báo, kiểu Danh sách, ô chọn tuần, Lịch năm học, Lưu trữ, tìm kiếm.

import {
  closeReader,
  renderViewStage
} from "./agenda.js";
import {
  activeCategories,
  categoryInfo,
  categoryStyle
} from "./categories.js";
import {
  $,
  contentInteractions,
  contentRenderer,
  el,
  isAdmin,
  isConfigured,
  state
} from "./core.js";
import {
  getImagePublicUrl
} from "./images.js";
import {
  escapeHtml,
  formatDate,
  formatShortDate,
  normalizeText,
  relativeDayLabel,
  todayIso,
  tone
} from "./utils.js";
import {
  chooseFeaturedWeek,
  defaultArchiveYearKey,
  defaultSchoolYearKey,
  displayedWeek,
  getItems,
  getSchoolYearGroups,
  newestFirst,
  normalizeYearFilter,
  schoolYearKey,
  schoolYearLabel,
  sortedWeeks,
  weeksForYearFilter,
  weekState
} from "./weeks.js";

let announcementCardUid = 0;

function renderGlobalSchoolYearSwitcher() {
  if (!el.globalSchoolYearFilter) return;

  const groups = getSchoolYearGroups();
  if (!groups.length) {
    el.globalSchoolYearFilter.innerHTML = '<option value="">Chưa có năm học</option>';
    el.globalSchoolYearFilter.disabled = true;
    state.activeSchoolYear = "";
    return;
  }

  const fallback = defaultSchoolYearKey(groups);
  if (!groups.some(group => group.key === state.activeSchoolYear)) {
    state.activeSchoolYear = fallback;
  }

  el.globalSchoolYearFilter.innerHTML = groups.map(group =>
    `<option value="${escapeHtml(group.key)}">${escapeHtml(group.label)}</option>`
  ).join("");
  el.globalSchoolYearFilter.disabled = false;
  el.globalSchoolYearFilter.value = state.activeSchoolYear;
}

export function applyGlobalSchoolYear(value) {
  const groups = getSchoolYearGroups();
  const fallback = defaultSchoolYearKey(groups);
  const next = groups.some(group => group.key === value) ? value : fallback;

  state.activeSchoolYear = next;
  state.yearFilter = state.activeSchoolYear;
  state.archiveYearFilter = state.activeSchoolYear;
  state.categoryFilter = "all";
  state.selectedWeekId = null;
  [state.currentWeek, state.currentWeekState] = chooseFeaturedWeek(state.activeSchoolYear);

  renderAll();

  if (el.searchInput?.value.trim() && !el.searchResultsSection?.classList.contains("hidden")) {
    runSearch(el.searchInput.value);
  }
}

function renderSchoolYearSelectors() {
  const groups = getSchoolYearGroups();

  if (!groups.length) {
    if (el.yearFilter) {
      el.yearFilter.innerHTML = '<option value="all">Tất cả năm học</option>';
      el.yearFilter.value = "all";
      el.yearFilter.disabled = true;
    }

    if (el.archiveYearFilter) {
      el.archiveYearFilter.innerHTML = '<option value="all">Tất cả năm học</option>';
      el.archiveYearFilter.value = "all";
      el.archiveYearFilter.disabled = true;
    }

    state.yearFilter = "all";
    state.archiveYearFilter = "all";
    return;
  }

  const options = [
    '<option value="all">Tất cả năm học</option>',
    ...groups.map(group =>
      `<option value="${escapeHtml(group.key)}">${escapeHtml(group.label)}</option>`
    )
  ].join("");

  const yearDefault = defaultSchoolYearKey(groups);
  const archiveDefault = defaultArchiveYearKey(groups);

  state.yearFilter = normalizeYearFilter(
    state.yearFilter,
    groups,
    yearDefault
  );

  state.archiveYearFilter = normalizeYearFilter(
    state.archiveYearFilter,
    groups,
    archiveDefault
  );

  if (el.yearFilter) {
    el.yearFilter.innerHTML = options;
    el.yearFilter.disabled = false;
    el.yearFilter.value = state.yearFilter;
  }

  if (el.archiveYearFilter) {
    el.archiveYearFilter.innerHTML = options;
    el.archiveYearFilter.disabled = false;
    el.archiveYearFilter.value = state.archiveYearFilter;
  }
}

function renderAdmin() {
  el.adminToolbar.classList.toggle("hidden", !isAdmin());
  el.loginButton.classList.toggle("hidden", isAdmin());
  el.logoutButton.classList.toggle("hidden", !isAdmin());

  const modeLabel = $("#sidebar-mode-label");
  if (modeLabel) {
    modeLabel.textContent = isAdmin() ? "Admin" : "Public";
  }
}

function renderConnection() {
  if (isConfigured) {
    el.connectionBanner.classList.add("hidden");
    return;
  }

  el.connectionBanner.className = "status-banner warning";
  el.connectionBanner.innerHTML =
    "<strong>Chế độ xem thử:</strong> chưa có cấu hình Supabase trong <code>config.js</code>.";
}

function renderCategoryDashboard(items) {
  if (!el.categoryDashboard) return;

  if (!items.length) {
    el.categoryDashboard.innerHTML = "";
    el.categoryDashboard.classList.add("hidden");
    state.categoryFilter = "all";
    return;
  }

  const counts = new Map();

  items.forEach(item => {
    const info = categoryInfo(item);
    counts.set(info.key, (counts.get(info.key) || 0) + 1);
  });

  if (
    state.categoryFilter !== "all" &&
    !counts.has(state.categoryFilter)
  ) {
    state.categoryFilter = "all";
  }

  const categoryButtons = activeCategories()
    .filter(category => counts.has(category.slug))
    .map(category => `
      <button
        class="category-filter ${state.categoryFilter === category.slug ? "active" : ""}"
        style="${categoryStyle(category)}"
        type="button"
        data-action="filter-category"
        data-category="${escapeHtml(category.slug)}"
        aria-pressed="${state.categoryFilter === category.slug}"
      >
        <span class="category-filter-icon" aria-hidden="true">
          ${escapeHtml(category.icon || "📌")}
        </span>
        <span>${escapeHtml(category.name)}</span>
        <strong>${counts.get(category.slug)}</strong>
      </button>
    `)
    .join("");

  el.categoryDashboard.classList.remove("hidden");
  el.categoryDashboard.innerHTML = `
    <button
      class="category-filter category-all ${state.categoryFilter === "all" ? "active" : ""}"
      type="button"
      data-action="filter-category"
      data-category="all"
      aria-pressed="${state.categoryFilter === "all"}"
    >
      <span class="category-filter-icon" aria-hidden="true">✨</span>
      <span>Tất cả</span>
      <strong>${items.length}</strong>
    </button>

    ${categoryButtons}
  `;
}

function announcementCard(item, showWeek = false) {
  const week = state.weeks.find(w => w.id === item.week_id);
  const category = categoryInfo(item);
  const contentMode = contentRenderer.getStoredMode(item.content);
  const renderedContent =
    contentRenderer.renderStoredContent(item.content);
  const adminButtons = isAdmin()
    ? `<button class="button button-ghost button-small card-command" data-action="edit-announcement" data-id="${escapeHtml(item.id)}">
         <span aria-hidden="true">✎</span><span>Sửa</span>
       </button>
       <button class="button button-danger button-small card-command" data-action="delete-announcement" data-id="${escapeHtml(item.id)}">
         <span aria-hidden="true">⌫</span><span>Xóa</span>
       </button>`
    : "";

  const expanded = isAnnouncementExpanded(item);
  const relativeDay = relativeDayLabel(item.event_date);
  const bodyId = `announcement-body-${++announcementCardUid}`;
  const preview = announcementPreview(renderedContent);

  return `
    <article class="announcement-card is-collapsible ${expanded ? "is-expanded" : ""} tone-${tone(item.title + item.id)} ${item.priority === "important" ? "important" : ""}" style="${categoryStyle(category)}">
      <div class="announcement-inner">
        <div class="announcement-title-row">
          ${item.is_pinned ? '<span class="pin" aria-label="Đã ghim">📌</span>' : ""}
          <h3>
            <button
              class="announcement-toggle"
              type="button"
              data-action="toggle-announcement"
              data-id="${escapeHtml(item.id)}"
              aria-expanded="${expanded}"
              aria-controls="${bodyId}"
            >${escapeHtml(item.title)}</button>
          </h3>
          <span class="category-chip" style="${categoryStyle(category)}">
            <span aria-hidden="true">${escapeHtml(category.icon || "📌")}</span>
            ${escapeHtml(category.name)}
          </span>
          ${item.priority === "important" ? '<span class="priority-chip">Quan trọng</span>' : ""}
          <span class="announcement-chevron" aria-hidden="true"></span>
        </div>

        ${preview ? `<p class="announcement-preview" aria-hidden="true">${escapeHtml(preview)}</p>` : ""}

        <div class="announcement-meta">
          <span class="meta-chip ${relativeDay ? `date-chip is-${relativeDay.tone}` : ""}">📅 ${escapeHtml(formatDate(item.event_date))}${relativeDay ? ` · <strong>${relativeDay.text}</strong>` : ""}</span>
          ${
            item.category && normalizeText(item.category) !== normalizeText(category.name)
              ? `<span class="meta-chip">🏷️ ${escapeHtml(item.category)}</span>`
              : ""
          }
          ${showWeek && week ? `<span class="meta-chip">Đăng tại Tuần ${escapeHtml(week.week_number)}</span>` : ""}
          ${
            item.valid_from || item.valid_until
              ? `<span class="meta-chip validity-chip">⏳ Hiệu lực ${escapeHtml(formatDate(item.valid_from || item.event_date))} → ${escapeHtml(formatDate(item.valid_until || item.valid_from || item.event_date))}</span>`
              : ""
          }
        </div>

        <div class="announcement-body" id="${bodyId}">
          <div class="announcement-body-inner">
            ${
              item.image_path
                ? `<button class="announcement-image-button" type="button" data-action="open-image" data-id="${escapeHtml(item.id)}" aria-label="Mở ảnh của thông báo ${escapeHtml(item.title)}">
                     <img
                       src="${escapeHtml(getImagePublicUrl(item.image_path))}"
                       alt="${escapeHtml(item.image_alt || item.title)}"
                       loading="lazy"
                       decoding="async"
                     >
                   </button>`
                : ""
            }

            <div class="announcement-content ${contentMode === "html" ? "html-content" : ""}">${renderedContent}</div>

            <div class="card-actions">
              <button class="button button-ghost button-small card-command" data-action="copy-announcement" data-id="${escapeHtml(item.id)}"><span aria-hidden="true">⧉</span><span>Sao chép</span></button>
              ${adminButtons}
            </div>
          </div>
        </div>
      </div>
    </article>`;
}

// Plain-text teaser for collapsed cards; block/cell boundaries become spaces so
// table cells and list items don't run together.
export function announcementPreview(renderedHtml) {
  const spaced = renderedHtml.replace(/<\/?(?:p|li|td|th|tr|div|h[1-6]|br|blockquote|summary)\b[^>]*>/gi, " $& ");
  const text = new DOMParser().parseFromString(spaced, "text/html").body.textContent || "";
  return text.replace(/\s+/g, " ").trim().slice(0, 220);
}

// Pinned and important announcements open by default so key information is visible at once.
function isAnnouncementExpanded(item) {
  const id = String(item.id);
  if (state.announcementOpen.has(id)) return state.announcementOpen.get(id);
  return Boolean(item.is_pinned) || item.priority === "important";
}

export function setAnnouncementExpanded(card, expanded) {
  const toggle = card.querySelector(".announcement-toggle");
  if (!toggle) return;

  card.classList.toggle("is-expanded", expanded);
  toggle.setAttribute("aria-expanded", String(expanded));
  state.announcementOpen.set(toggle.dataset.id, expanded);
}

export function syncToggleAllButton() {
  if (!el.toggleAllAnnouncements) return;

  const cards = [...el.currentAnnouncements.querySelectorAll(".announcement-card.is-collapsible")];
  const allExpanded = cards.length > 0 && cards.every(card => card.classList.contains("is-expanded"));

  el.toggleAllAnnouncements.classList.toggle("hidden", cards.length < 2);
  el.toggleAllAnnouncements.setAttribute("aria-pressed", String(allExpanded));
  el.toggleAllAnnouncements.querySelector("span:last-child").textContent =
    allExpanded ? "Thu gọn tất cả" : "Mở tất cả";
}

export function renderCurrent() {
  const week = state.currentWeek;

  const badgeLabels = {
    current: "Đang hoạt động",
    upcoming: "Sắp bắt đầu",
    past: "Tuần gần nhất",
    none: "Chưa có lịch"
  };

  const browsing = Boolean(state.selectedWeekId);
  if (browsing) {
    badgeLabels.past = "Đã kết thúc";
    badgeLabels.upcoming = "Sắp tới";
  }

  if (el.weekStateBadge) {
    el.weekStateBadge.innerHTML =
      `<span aria-hidden="true"></span> ${badgeLabels[state.currentWeekState] || badgeLabels.none}`;
  }

  if (el.currentHeading) {
    el.currentHeading.textContent = browsing ? "Tuần đang xem" : "Tuần hiện tại";
  }
  el.backToCurrentWeek?.classList.toggle("hidden", !browsing);

  if (!week) {
    el.currentWeekCard.innerHTML = '<div class="loading-card">Chưa có lịch tuần.</div>';
    el.currentAnnouncements.innerHTML = '<div class="empty-state">Chưa có thông báo.</div>';
    if (el.categoryDashboard) {
      el.categoryDashboard.innerHTML = "";
      el.categoryDashboard.classList.add("hidden");
    }
    renderViewStage(null, [], []);
    return;
  }

  const labels = {
    current: "Đang diễn ra",
    upcoming: browsing ? "Sắp tới" : "Chuẩn bị tuần tiếp theo",
    past: browsing ? "Đã kết thúc" : "Tuần gần nhất"
  };

  el.currentWeekCard.innerHTML = `
    <div class="week-hero-content">
      <div class="week-number">
        <div><small>Tuần</small><strong>${escapeHtml(week.week_number)}</strong></div>
      </div>
      <div class="week-details">
        <p class="eyebrow" style="color:rgba(255,255,255,.8)">${labels[state.currentWeekState] || ""}</p>
        <h3>${escapeHtml(week.title || `Tuần ${week.week_number}`)}</h3>
        <p>${escapeHtml(week.summary || "Theo dõi các thông báo quan trọng của tuần.")}</p>
        <span class="week-date">📅 ${formatDate(week.start_date)} — ${formatDate(week.end_date)}</span>
        <span class="week-school-year">📣 ${getItems(week.id).length} thông báo</span>
        ${(() => {
          const important = getItems(week.id).filter(item => item.priority === "important").length;
          return important ? `<span class="week-school-year week-important-count">⚠️ ${important} quan trọng</span>` : "";
        })()}
        ${isAdmin() ? `<div class="week-admin-actions">
          <button class="button button-glass button-small card-command" data-action="edit-week" data-id="${week.id}">
            <span aria-hidden="true">✎</span><span>Sửa tuần</span>
          </button>
          <button class="button button-glass-danger button-small card-command" data-action="delete-week" data-id="${week.id}">
            <span aria-hidden="true">⌫</span><span>Xóa tuần</span>
          </button>
        </div>` : ""}
      </div>
    </div>`;

  const items = getItems(week.id);
  renderCategoryDashboard(items);

  const visibleItems = state.categoryFilter === "all"
    ? items
    : items.filter(item => categoryInfo(item).key === state.categoryFilter);

  el.currentAnnouncements.innerHTML = visibleItems.length
    ? newestFirst(visibleItems).map(item => announcementCard(item)).join("")
    : `<div class="empty-state">${items.length ? "Không có thông báo trong chuyên mục này." : "Tuần này chưa có thông báo."}</div>`;

  syncToggleAllButton();
  renderViewStage(week, items, visibleItems);
}

function renderWeekPicker() {
  const select = el.globalWeekFilter;
  if (!select) return;

  const weeks = sortedWeeks().filter(week => schoolYearKey(week) === state.activeSchoolYear);
  if (!weeks.length) {
    select.innerHTML = '<option value="">Chưa có tuần</option>';
    select.disabled = true;
    return;
  }

  select.innerHTML = weeks.map(week => {
    // Short label so it fits the sidebar; "●" marks the week in progress.
    const isCurrent = weekState(week) === "current";
    const dayMonth = iso => iso.slice(8, 10) + "/" + iso.slice(5, 7);
    return `<option value="${escapeHtml(week.id)}"${isCurrent ? ' title="Tuần đang diễn ra"' : ""}>Tuần ${escapeHtml(week.week_number)} · ${dayMonth(week.start_date)}–${dayMonth(week.end_date)}${isCurrent ? " ●" : ""}</option>`;
  }).join("");
  select.disabled = false;
  select.value = state.currentWeek?.id || "";
}

// Show a week's announcements in the main panel (weekId null = back to the featured week).
export function selectWeek(weekId) {
  const week = weekId ? state.weeks.find(w => w.id === weekId) : null;
  const [featured] = chooseFeaturedWeek(state.activeSchoolYear);

  state.selectedWeekId = week && week.id !== featured?.id ? week.id : null;
  state.readerId = null;
  closeReader();
  state.categoryFilter = "all";
  [state.currentWeek, state.currentWeekState] = displayedWeek();

  renderWeekPicker();
  renderCurrent();
  renderYearStrip();
  enhanceRenderedContent();
  el.currentSection?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function renderYearStrip() {
  const groups = getSchoolYearGroups();
  const selected = state.yearFilter || defaultSchoolYearKey(groups);
  const weeks = weeksForYearFilter(selected)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));

  const selectedGroup = groups.find(group => group.key === selected);

  el.yearCount.textContent =
    selected === "all"
      ? `${weeks.length} tuần · ${groups.length} năm học`
      : `${weeks.length} tuần`;

  if (el.yearSummary) {
    if (selected === "all") {
      el.yearSummary.textContent = groups.length
        ? `Đang xem toàn bộ ${groups.length} năm học đã lưu.`
        : "Chưa có lịch năm học.";
    } else if (selectedGroup) {
      const stateText =
        selectedGroup.start_date <= todayIso() && selectedGroup.end_date >= todayIso()
          ? "Đang diễn ra"
          : selectedGroup.start_date > todayIso()
            ? "Sắp tới"
            : "Đã kết thúc";

      el.yearSummary.textContent =
        `${stateText} · ${formatDate(selectedGroup.start_date)} → ${formatDate(selectedGroup.end_date)}`;
    } else {
      el.yearSummary.textContent = "";
    }
  }

  if (!weeks.length) {
    el.yearStrip.innerHTML =
      '<div class="empty-state">Năm học này chưa có tuần nào được thiết lập.</div>';
    return;
  }

  el.yearStrip.innerHTML = weeks.map(week => {
    const s = weekState(week);
    const label = s === "current" ? "Hiện tại" : s === "upcoming" ? "Sắp tới" : "Đã qua";
    const count = getItems(week.id).length;
    const shown = week.id === state.currentWeek?.id;

    return `
      <article class="year-week-card ${s} ${shown ? "is-shown" : ""}">
        <button class="year-week-main" type="button" data-action="view-week" data-id="${week.id}"
          aria-label="Xem Tuần ${escapeHtml(week.week_number)}" ${shown ? 'aria-current="true"' : ""}>
          <span class="year-week-head">
            <strong>Tuần ${escapeHtml(week.week_number)}</strong>
            <span class="year-week-state">${label}</span>
          </span>
          <small>${formatShortDate(week.start_date)} → ${formatShortDate(week.end_date)}</small>
          <span class="week-count-badge ${count ? "has-items" : ""}">${count} thông báo</span>
        </button>
        ${isAdmin() ? `
          <span class="year-week-actions">
            <button class="mini-action" data-action="edit-week" data-id="${week.id}" aria-label="Sửa Tuần ${escapeHtml(week.week_number)}">✏️</button>
            <button class="mini-action mini-danger" data-action="delete-week" data-id="${week.id}" aria-label="Xóa Tuần ${escapeHtml(week.week_number)}">🗑️</button>
          </span>` : ""}
      </article>`;
  }).join("");

  scrollYearStripToCurrent();
}

// Bring the week shown above (else the current/next week) into view inside the horizontal strip.
// Only the strip scrolls, never the page.
function scrollYearStripToCurrent() {
  const strip = el.yearStrip;
  const card = strip.querySelector(".year-week-card.is-shown")
    || strip.querySelector(".year-week-card.current, .year-week-card.upcoming");
  if (!card) return;

  requestAnimationFrame(() => {
    const stripBox = strip.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();

    if (strip.scrollHeight > strip.clientHeight) {
      strip.scrollTop += cardBox.top - stripBox.top - (strip.clientHeight - cardBox.height) / 2;
    }
    if (strip.scrollWidth > strip.clientWidth) {
      strip.scrollLeft += cardBox.left - stripBox.left - (strip.clientWidth - cardBox.width) / 2;
    }
  });
}

export function renderArchives() {
  const today = todayIso();
  const groups = getSchoolYearGroups();
  const selected = state.archiveYearFilter || defaultArchiveYearKey(groups);

  const allPastWeeks = state.weeks
    .filter(week => week.end_date < today)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));

  const weeks = selected === "all"
    ? allPastWeeks
    : allPastWeeks.filter(week => schoolYearKey(week) === selected);

  const selectedGroup = groups.find(group => group.key === selected);

  el.archiveCount.textContent =
    selected === "all"
      ? `${weeks.length} tuần đã qua`
      : `${weeks.length} tuần đã qua`;

  if (el.archiveYearSummary) {
    if (selected === "all") {
      const yearsWithArchive = new Set(allPastWeeks.map(schoolYearKey)).size;
      el.archiveYearSummary.textContent =
        `${yearsWithArchive} năm học có dữ liệu lưu trữ.`;
    } else if (selectedGroup) {
      el.archiveYearSummary.textContent =
        `${schoolYearLabel(selected)} · dữ liệu được giữ nguyên, không tự xóa cuối năm.`;
    } else {
      el.archiveYearSummary.textContent = "";
    }
  }

  if (!weeks.length) {
    el.archiveGrid.innerHTML =
      '<div class="empty-state">Năm học này chưa có tuần nào đã kết thúc.</div>';
    return;
  }

  el.archiveGrid.innerHTML = weeks.map(week => {
    const items = getItems(week.id);

    return `
      <article class="archive-card">
        <button class="archive-main" type="button" data-action="open-archive" data-id="${week.id}"
          aria-label="Xem lại Tuần ${escapeHtml(week.week_number)}">
          <span class="archive-head">
            <strong class="archive-week-name">Tuần ${escapeHtml(week.week_number)}</strong>
            <span class="archive-count-chip ${items.length ? "has-items" : ""}">${items.length} thông báo</span>
          </span>
          <span class="archive-date">${formatDate(week.start_date)} — ${formatDate(week.end_date)}</span>
          ${items.length
            ? `<span class="archive-peek">${items.slice(0, 2).map(x => escapeHtml(x.title)).join(" · ")}${items.length > 2 ? ` · +${items.length - 2}` : ""}</span>`
            : ""}
        </button>
        ${isAdmin() ? `
          <span class="archive-admin-actions">
            <button class="text-button" data-action="edit-week" data-id="${week.id}">Sửa</button>
            <button class="text-button danger-text" data-action="delete-week" data-id="${week.id}">Xóa</button>
          </span>` : ""}
      </article>`;
  }).join("");
}

export function enhanceRenderedContent() {
  contentInteractions.enhance(document);
}

function renderAll() {
  renderAdmin();
  renderConnection();
  renderGlobalSchoolYearSwitcher();
  renderWeekPicker();
  renderCurrent();
  renderSchoolYearSelectors();
  renderYearStrip();
  renderArchives();
  enhanceRenderedContent();
}

let renderFrame = 0;

export function scheduleRenderAll() {
  if (renderFrame) return;

  renderFrame = window.requestAnimationFrame(() => {
    renderFrame = 0;
    renderAll();
  });
}

export function openArchive(weekId) {
  const week = state.weeks.find(w => w.id === weekId);
  if (!week) return;

  const items = getItems(week.id);
  el.archiveDialogTitle.textContent =
    `Tuần ${week.week_number} · ${formatDate(week.start_date)} — ${formatDate(week.end_date)}`;

  el.archiveDialogContent.innerHTML = `
    <p class="muted">${escapeHtml(week.summary || "Không có tóm tắt riêng.")}</p>
    <div class="announcement-list">
      ${items.length ? items.map(item => announcementCard(item)).join("") : '<div class="empty-state">Không có thông báo.</div>'}
    </div>`;

  el.archiveDialog.showModal();
}

export function runSearch(query) {
  const q = normalizeText(query);
  if (!q) {
    clearSearch();
    return;
  }

  const results = state.announcements.filter(item => {
    const week = state.weeks.find(w => w.id === item.week_id);
    if (state.activeSchoolYear && (!week || schoolYearKey(week) !== state.activeSchoolYear)) {
      return false;
    }
    const haystack = normalizeText([
      item.title,
      contentRenderer.toPlainText(item.content),
      item.category,
      item.event_date,
      week?.week_number,
      week?.title,
      week?.school_year,
      week?.summary
    ].filter(Boolean).join(" "));
    return haystack.includes(q);
  });

  el.searchResultsSection.classList.remove("hidden");
  el.searchResults.innerHTML = results.length
    ? results.map(item => announcementCard(item, true)).join("")
    : '<div class="empty-state">Không tìm thấy thông báo phù hợp.</div>';

  el.searchResultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function clearSearch() {
  el.searchInput.value = "";
  el.searchResultsSection.classList.add("hidden");
  el.searchResults.innerHTML = "";
}
