// main.js — Điểm khởi động: gắn sự kiện, giao diện sáng/tối, hộp thoại, init().

import {
  copyAnnouncement,
  deleteAnnouncement,
  deleteWeek,
  generateSchoolYearPreview,
  initEditors,
  openAnnouncementForm,
  openBulkDialog,
  openSchoolYear,
  openWeekForm,
  previewBulk,
  saveAnnouncement,
  saveBulk,
  saveSchoolYear,
  saveWeek
} from "./admin.js";
import {
  closeReader,
  initialViewMode,
  openReader,
  setViewMode
} from "./agenda.js";
import {
  deleteCategory,
  openCategoriesDialog,
  resetCategoryForm,
  saveCategory
} from "./categories.js";
import {
  $,
  appLoader,
  client,
  el,
  state
} from "./core.js";
import {
  handleLogin,
  handleLogout,
  loadData,
  loadSession
} from "./data.js";
import {
  openImageViewer,
  previewSelectedFile
} from "./images.js";
import {
  applyGlobalSchoolYear,
  clearSearch,
  openArchive,
  renderArchives,
  renderCurrent,
  renderYearStrip,
  runSearch,
  scheduleRenderAll,
  selectWeek,
  setAnnouncementExpanded,
  syncToggleAllButton
} from "./render.js";
import {
  setMessage
} from "./utils.js";
import {
  applyWeekDefaults
} from "./weeks.js";

function handleAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "filter-category") {
    state.categoryFilter = button.dataset.category || "all";
    renderCurrent();
    return;
  }

  if (action === "edit-category") {
    const category = state.categories.find(item => item.id === id);
    if (category) resetCategoryForm(category);
    return;
  }

  if (action === "delete-category") {
    deleteCategory(id);
    return;
  }

  if (action === "set-view") {
    setViewMode(button.dataset.view);
    return;
  }

  if (action === "open-reader") {
    openReader(id);
    return;
  }

  if (action === "close-reader") {
    closeReader();
    return;
  }

  if (action === "agenda-jump") {
    document.getElementById(`agenda-day-${button.dataset.day}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (action === "toggle-announcement") {
    const card = button.closest(".announcement-card");
    if (card) setAnnouncementExpanded(card, !card.classList.contains("is-expanded"));
    syncToggleAllButton();
    return;
  }

  if (action === "toggle-all-announcements") {
    const cards = [...el.currentAnnouncements.querySelectorAll(".announcement-card.is-collapsible")];
    const expand = !cards.every(card => card.classList.contains("is-expanded"));
    cards.forEach(card => setAnnouncementExpanded(card, expand));
    syncToggleAllButton();
    return;
  }

  if (action === "copy-announcement") copyAnnouncement(id);
  if (action === "open-image") openImageViewer(id);
  if (action === "delete-announcement") deleteAnnouncement(id);
  if (action === "delete-week") deleteWeek(id);
  if (action === "open-archive") openArchive(id);
  if (action === "view-week" || action === "select-week") selectWeek(id);
  if (action === "back-to-current-week") selectWeek(null);

  if (action === "edit-announcement") {
    const item = state.announcements.find(x => x.id === id);
    if (item) openAnnouncementForm(item);
  }

  if (action === "edit-week") {
    const week = state.weeks.find(x => x.id === id);
    if (week) openWeekForm(week);
  }
}

function initTheme() {
  const stored = localStorage.getItem("weekly-board-theme");
  if (stored) document.documentElement.dataset.theme = stored;

  el.themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("weekly-board-theme", next);
    el.themeToggle.querySelector("span").textContent = next === "dark" ? "☾" : "☼";
  });
}

function initDialogs() {
  const dialogs = [...document.querySelectorAll("dialog")];

  const updateDialogState = () => {
    document.documentElement.classList.toggle(
      "has-open-dialog",
      dialogs.some(dialog => dialog.open)
    );
  };

  const dialogObserver = new MutationObserver(updateDialogState);

  document.querySelectorAll(".close-dialog").forEach(button => {
    button.addEventListener("click", () => button.closest("dialog")?.close());
  });

  dialogs.forEach(dialog => {
    dialogObserver.observe(dialog, {
      attributes: true,
      attributeFilter: ["open"]
    });

    dialog.addEventListener("click", event => {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", updateDialogState);
    dialog.addEventListener("cancel", () => {
      window.requestAnimationFrame(updateDialogState);
    });
  });

  updateDialogState();
}

function initEvents() {
  el.loginButton.addEventListener("click", () => {
    setMessage(el.loginMessage, "");
    el.loginDialog.showModal();
  });

  el.logoutButton.addEventListener("click", handleLogout);
  el.loginForm.addEventListener("submit", handleLogin);

  $("#new-announcement-button").addEventListener("click", () => openAnnouncementForm());
  $("#new-week-button").addEventListener("click", () => openWeekForm());
  $("#quick-input-button").addEventListener("click", openBulkDialog);
  $("#categories-button").addEventListener("click", openCategoriesDialog);
  $("#school-year-button").addEventListener("click", openSchoolYear);

  el.yearFilter?.addEventListener("change", () => {
    state.yearFilter = el.yearFilter.value;
    renderYearStrip();
  });

  el.archiveYearFilter?.addEventListener("change", () => {
    state.archiveYearFilter = el.archiveYearFilter.value;
    renderArchives();
  });

  el.globalSchoolYearFilter?.addEventListener("change", () => {
    applyGlobalSchoolYear(el.globalSchoolYearFilter.value);
  });

  el.globalWeekFilter?.addEventListener("change", () => {
    selectWeek(el.globalWeekFilter.value);
  });

  el.announcementForm.addEventListener("submit", saveAnnouncement);
  el.weekForm.addEventListener("submit", saveWeek);
  el.bulkForm.addEventListener("submit", saveBulk);
  el.categoryForm.addEventListener("submit", saveCategory);
  el.schoolYearForm.addEventListener("submit", saveSchoolYear);

  $("#category-reset-button").addEventListener("click", () => resetCategoryForm());

  $("#bulk-preview-button").addEventListener("click", previewBulk);
  $("#school-year-preview-button").addEventListener("click", generateSchoolYearPreview);

  $("#announcement-image").addEventListener("change", () => {
    previewSelectedFile(
      $("#announcement-image"),
      $("#announcement-image-preview"),
      $("#announcement-image-alt")
    );
  });

  $("#bulk-image").addEventListener("change", () => {
    previewSelectedFile(
      $("#bulk-image"),
      $("#bulk-image-preview"),
      $("#bulk-image-alt")
    );
  });

  $("#announcement-week").addEventListener("change", () => {
    applyWeekDefaults("announcement");
  });

  $("#bulk-week").addEventListener("change", () => {
    applyWeekDefaults("bulk");
  });

  document.addEventListener("click", handleAction);

  el.searchForm.addEventListener("submit", event => {
    event.preventDefault();
    runSearch(el.searchInput.value);
  });

  el.clearSearchButton.addEventListener("click", clearSearch);

  $("#scroll-top-button").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  if (client) {
    client.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || null;
      scheduleRenderAll();
    });
  }
}

async function init() {
  state.viewMode = initialViewMode();
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && state.readerOpen) closeReader();
  });
  initTheme();

  initEditors();

  initDialogs();
  initEvents();
  await loadSession();
  await loadData();
  appLoader?.finishInitial?.();
}

init().catch(error => {
  appLoader?.hide?.({ minimum: 180 });
  console.error(error);
  el.connectionBanner.className = "status-banner warning";
  el.connectionBanner.textContent =
    "Ứng dụng gặp lỗi khi khởi động. Mở DevTools > Console để xem chi tiết.";
});
