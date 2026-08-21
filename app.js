(() => {
  "use strict";

  const config = window.APP_CONFIG || {};
  const isConfigured =
    config.SUPABASE_URL &&
    config.SUPABASE_KEY &&
    !config.SUPABASE_URL.includes("YOUR_") &&
    !config.SUPABASE_KEY.includes("YOUR_");

  function clearLegacyPersistentAuth() {
    if (!isConfigured) return;

    try {
      const projectRef = new URL(config.SUPABASE_URL).hostname.split(".")[0];
      const legacyKey = `sb-${projectRef}-auth-token`;
      localStorage.removeItem(legacyKey);
    } catch (error) {
      console.warn("Không thể dọn session Supabase cũ trong localStorage.", error);
    }
  }

  clearLegacyPersistentAuth();

  const client = isConfigured
    ? window.supabase.createClient(
        config.SUPABASE_URL,
        config.SUPABASE_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.sessionStorage
          }
        }
      )
    : null;

  const IMAGE_BUCKET = "announcement-images";

  const contentRenderer = window.WeeklyContent;
  if (!contentRenderer) {
    throw new Error("Thiếu content-renderer.js.");
  }

  const contentInteractions = window.WeeklyInteractions;
  if (!contentInteractions) {
    throw new Error("Thiếu content-interactions.js.");
  }

  let announcementEditor = null;

  const state = {
    user: null,
    weeks: [],
    announcements: [],
    categories: [],
    currentWeek: null,
    currentWeekState: "none",
    categoryFilter: "all",
    schoolYearPreview: [],
    yearFilter: "",
    archiveYearFilter: ""
  };

  const $ = selector => document.querySelector(selector);

  const el = {
    currentWeekCard: $("#current-week-card"),
    currentAnnouncements: $("#current-announcements"),
    categoryDashboard: $("#category-dashboard"),
    categoryDialog: $("#categories-dialog"),
    categoryForm: $("#category-form"),
    categoryManagerList: $("#category-manager-list"),
    categoryMessage: $("#category-message"),
    archiveGrid: $("#archive-grid"),
    archiveCount: $("#archive-count"),
    archiveYearFilter: $("#archive-year-filter"),
    archiveYearSummary: $("#archive-year-summary"),
    yearStrip: $("#year-strip"),
    yearCount: $("#year-count"),
    yearFilter: $("#year-filter"),
    yearSummary: $("#year-summary"),
    weekStateBadge: $("#week-state-badge"),
    adminToolbar: $("#admin-toolbar"),
    loginButton: $("#login-button"),
    logoutButton: $("#logout-button"),
    connectionBanner: $("#connection-banner"),
    searchForm: $("#search-form"),
    searchInput: $("#search-input"),
    searchResultsSection: $("#search-results-section"),
    searchResults: $("#search-results"),
    clearSearchButton: $("#clear-search-button"),
    themeToggle: $("#theme-toggle"),
    toast: $("#toast"),

    loginDialog: $("#login-dialog"),
    loginForm: $("#login-form"),
    loginMessage: $("#login-message"),

    announcementDialog: $("#announcement-dialog"),
    announcementForm: $("#announcement-form"),
    announcementDialogTitle: $("#announcement-dialog-title"),
    announcementMessage: $("#announcement-message"),

    weekDialog: $("#week-dialog"),
    weekForm: $("#week-form"),
    weekDialogTitle: $("#week-dialog-title"),
    weekMessage: $("#week-message"),

    bulkDialog: $("#bulk-dialog"),
    bulkForm: $("#bulk-form"),
    bulkMessage: $("#bulk-message"),
    bulkPreviewCount: $("#bulk-preview-count"),

    schoolYearDialog: $("#school-year-dialog"),
    schoolYearForm: $("#school-year-form"),
    schoolYearMessage: $("#school-year-message"),
    schoolYearPreview: $("#school-year-preview"),
    schoolYearPreviewSummary: $("#school-year-preview-summary"),

    archiveDialog: $("#archive-dialog"),
    archiveDialogTitle: $("#archive-dialog-title"),
    archiveDialogContent: $("#archive-dialog-content")
  };

  const demoData = {
    weeks: [
      {
        id: "demo-week-1",
        week_number: "01",
        title: "Tuần đầu năm học",
        school_year: "2026-2027",
        sequence_number: 1,
        start_date: "2026-08-03",
        end_date: "2026-08-08",
        summary: "Các nội dung quan trọng trong tuần đầu.",
        status: "current",
        created_at: "2026-08-01T12:00:00Z"
      },
      {
        id: "demo-week-2",
        week_number: "02",
        title: "Tuần 02",
        school_year: "2026-2027",
        sequence_number: 2,
        start_date: "2026-08-10",
        end_date: "2026-08-15",
        summary: null,
        status: "archived",
        created_at: "2026-08-01T12:01:00Z"
      }
    ],
    announcements: [
      {
        id: "demo-a1",
        week_id: "demo-week-1",
        title: "Hoàn thành Bản cam kết học đường",
        content: "- **Nội dung:** Học sinh nhận Bản cam kết học đường từ GVCN.\n- **Yêu cầu:** Học sinh cùng Phụ huynh đọc kỹ và ký tên.\n- **Hạn nộp:** chậm nhất ngày 19/08/2026.",
        category: "Nội quy",
        event_date: "2026-08-08",
        valid_from: "2026-08-03",
        valid_until: "2026-08-15",
        image_path: null,
        image_alt: null,
        priority: "important",
        is_pinned: true,
        created_at: "2026-08-07T12:20:00Z"
      }
    ]
  };

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeText(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function todayIso() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  }

  function dateObj(iso) {
    return new Date(`${iso}T00:00:00`);
  }

  function addDays(iso, days) {
    const d = dateObj(iso);
    d.setDate(d.getDate() + days);
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(d);
  }

  function formatDate(iso) {
    if (!iso) return "Chưa đặt ngày";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(dateObj(iso));
  }

  function formatShortDate(iso) {
    if (!iso) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit"
    }).format(dateObj(iso));
  }

  function weekState(week, today = todayIso()) {
    if (!week) return "none";
    if (today >= week.start_date && today <= week.end_date) return "current";
    return today < week.start_date ? "upcoming" : "past";
  }

  function chooseFeaturedWeek() {
    const weeks = [...state.weeks].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const today = todayIso();

    const current = weeks.find(w => weekState(w, today) === "current");

    //     // Từ Thứ Bảy, nếu đã có tuần kế tiếp thì trang chính bắt đầu
    // hiển thị nội dung của tuần kế tiếp để chuẩn bị sớm.
    if (current) {
      const todayDate = dateObj(today);
      const dayOfWeek = todayDate.getDay(); // 0 CN ... 6 Thứ Bảy

      if (dayOfWeek === 6) {
        const next = weeks.find(w => w.start_date > current.end_date);
        if (next) return [next, "upcoming"];
      }

      return [current, "current"];
    }

    const upcoming = weeks.find(w => w.start_date > today);
    if (upcoming) return [upcoming, "upcoming"];

    const past = [...weeks].reverse().find(w => w.end_date < today);
    return past ? [past, "past"] : [null, "none"];
  }

  function getItems(weekId) {
    const week = state.weeks.find(w => w.id === weekId);
    if (!week) return [];

    return state.announcements
      .filter(item => {
        // nếu có thời gian hiệu lực, thông báo xuất hiện ở mọi tuần
        // mà khoảng hiệu lực giao với khoảng thời gian của tuần đó.
        if (item.valid_from || item.valid_until) {
          const from = item.valid_from || item.event_date || week.start_date;
          const until = item.valid_until || item.valid_from || item.event_date || week.end_date;
          return from <= week.end_date && until >= week.start_date;
        }

        // Dữ liệu cũ chưa có cột hiệu lực: vẫn hiển thị theo week_id.
        return item.week_id === weekId;
      })
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        if (a.priority !== b.priority) return a.priority === "important" ? -1 : 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }

  function sortedWeeks() {
    return [...state.weeks].sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  function schoolYearKey(week) {
    const value = String(week?.school_year || "").trim();
    return value || "__legacy__";
  }

  function schoolYearLabel(key) {
    return key === "__legacy__" ? "Chưa phân loại" : key;
  }

  function getSchoolYearGroups() {
    const groups = new Map();

    sortedWeeks().forEach(week => {
      const key = schoolYearKey(week);

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: schoolYearLabel(key),
          weeks: [],
          start_date: week.start_date,
          end_date: week.end_date
        });
      }

      const group = groups.get(key);
      group.weeks.push(week);

      if (week.start_date < group.start_date) group.start_date = week.start_date;
      if (week.end_date > group.end_date) group.end_date = week.end_date;
    });

    return [...groups.values()].sort((a, b) =>
      b.start_date.localeCompare(a.start_date)
    );
  }

  function defaultSchoolYearKey(groups = getSchoolYearGroups()) {
    if (!groups.length) return "all";

    const today = todayIso();

    // Ưu tiên năm học thật sự chứa ngày hôm nay.
    const active = groups.find(group =>
      group.start_date <= today && group.end_date >= today
    );
    if (active) return active.key;

    // Nếu trang đang giới thiệu một tuần sắp tới/gần nhất thì ưu tiên năm của tuần đó.
    if (state.currentWeek) {
      const featuredKey = schoolYearKey(state.currentWeek);
      if (groups.some(group => group.key === featuredKey)) return featuredKey;
    }

    // Chưa tới năm học nào: lấy năm gần nhất sắp bắt đầu.
    const upcoming = [...groups]
      .filter(group => group.start_date > today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
    if (upcoming) return upcoming.key;

    // Đã qua tất cả: lấy năm học mới nhất.
    return groups[0].key;
  }

  function defaultArchiveYearKey(groups = getSchoolYearGroups()) {
    if (!groups.length) return "all";

    const today = todayIso();
    const currentDefault = defaultSchoolYearKey(groups);
    const currentGroup = groups.find(group => group.key === currentDefault);

    if (currentGroup?.weeks.some(week => week.end_date < today)) {
      return currentDefault;
    }

    const latestWithPastWeeks = groups.find(group =>
      group.weeks.some(week => week.end_date < today)
    );

    return latestWithPastWeeks?.key || currentDefault;
  }

  function normalizeYearFilter(value, groups, fallback) {
    if (value === "all") return "all";
    if (groups.some(group => group.key === value)) return value;
    return fallback;
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

  function weeksForYearFilter(filterValue) {
    if (!filterValue || filterValue === "all") return [...state.weeks];
    return state.weeks.filter(week => schoolYearKey(week) === filterValue);
  }

  function fillWeekSelect(select, selectedId = "") {
    if (!select) return;

    const groups = [...getSchoolYearGroups()].reverse();

    select.innerHTML = groups.map(group => `
      <optgroup label="${escapeHtml(group.label)}">
        ${group.weeks.map(week =>
          `<option value="${escapeHtml(week.id)}">${escapeHtml(
            `Tuần ${week.week_number} · ${formatDate(week.start_date)} – ${formatDate(week.end_date)}`
          )}</option>`
        ).join("")}
      </optgroup>
    `).join("");

    const weeks = sortedWeeks();

    if (selectedId && weeks.some(w => w.id === selectedId)) {
      select.value = selectedId;
    } else if (state.currentWeek) {
      select.value = state.currentWeek.id;
    }
  }

  function getSelectedWeek(selectId) {
    const id = $(selectId)?.value;
    return state.weeks.find(w => w.id === id) || null;
  }

  function applyWeekDefaults(prefix) {
    const week = getSelectedWeek(`#${prefix}-week`);
    if (!week) return;

    const dateInput = $(`#${prefix}-date`);
    const fromInput = $(`#${prefix}-valid-from`);
    const untilInput = $(`#${prefix}-valid-until`);

    if (dateInput) dateInput.value = week.start_date;
    if (fromInput) fromInput.value = week.start_date;
    if (untilInput) untilInput.value = week.end_date;
  }

  function tone(seed = "") {
    let total = 0;
    for (const ch of String(seed)) total += ch.charCodeAt(0);
    return (total % 5) + 1;
  }

  function parseQuickInput(raw = "") {
    const source = String(raw).replace(/\r\n/g, "\n").trim();
    const matches = [...source.matchAll(/^#{3,4}\s*(.+)$/gm)];
    if (!matches.length) return [];

    return matches.map((match, i) => {
      const next = matches[i + 1];
      const title = match[1].replace(/^\d+\.\s*/, "").trim();
      const start = match.index + match[0].length;
      const end = next ? next.index : source.length;
      const content = source.slice(start, end)
        .replace(/^\s*---+\s*$/gm, "")
        .trim();
      return { title, content };
    }).filter(x => x.title && x.content);
  }

  function extractDate(text, fallback) {
    const match = String(text).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return fallback;
    const [, d, m, y] = match;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  function setMessage(node, message = "") {
    if (node) node.textContent = message;
  }

  function validateImageFile(file) {
    if (!file) return "";

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.";
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      return "Ảnh vượt quá 5 MB.";
    }

    return "";
  }

  function imageExtension(file) {
    const map = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp"
    };
    return map[file?.type] || "jpg";
  }

  function getImagePublicUrl(path) {
    if (!client || !path) return "";
    const { data } = client.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    return data?.publicUrl || "";
  }

  async function uploadAnnouncementImage(file) {
    const validation = validateImageFile(file);
    if (validation) throw new Error(validation);

    const randomId = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const owner = state.user?.id || "admin";
    const day = todayIso();
    const path = `${owner}/${day}/${randomId}.${imageExtension(file)}`;

    const { error } = await client.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (error) throw error;
    return path;
  }

  async function removeStorageImage(path) {
    if (!client || !path) return;
    const { error } = await client.storage.from(IMAGE_BUCKET).remove([path]);
    if (error) console.error("Không xóa được ảnh Storage:", error);
  }

  async function cleanupImageIfUnused(path, excludedIds = []) {
    if (!path) return;

    const excluded = new Set(excludedIds.filter(Boolean));
    const stillUsed = state.announcements.some(
      item => item.image_path === path && !excluded.has(item.id)
    );

    if (!stillUsed) {
      await removeStorageImage(path);
    }
  }

  function clearImagePreview(container) {
    if (!container) return;

    if (container.dataset.objectUrl) {
      URL.revokeObjectURL(container.dataset.objectUrl);
      delete container.dataset.objectUrl;
    }

    container.innerHTML = "";
    container.classList.add("hidden");
  }

  function showImagePreview(container, src, alt = "", label = "") {
    if (!container || !src) {
      clearImagePreview(container);
      return;
    }

    container.innerHTML = `
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">
      ${label ? `<span>${escapeHtml(label)}</span>` : ""}
    `;
    container.classList.remove("hidden");
  }

  function previewSelectedFile(input, container, altInput) {
    clearImagePreview(container);

    const file = input?.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (validation) {
      input.value = "";
      showToast(validation);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    container.dataset.objectUrl = objectUrl;
    showImagePreview(container, objectUrl, altInput?.value || "Ảnh xem trước", "Ảnh mới");
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 2300);
  }

  function isAdmin() {
    return Boolean(state.user);
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

  function normalizeText(value = "") {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  const DEFAULT_CATEGORIES = [
    {
      slug: "study",
      name: "Học tập",
      icon: "📘",
      color: "#4f8fe8",
      keywords: ["học tập", "bài tập", "kiểm tra", "ôn tập", "thi", "môn học", "nộp bài"],
      sort_order: 10,
      active: true
    },
    {
      slug: "rules",
      name: "Nội quy",
      icon: "🛡️",
      color: "#7e72d8",
      keywords: ["nội quy", "quy định", "cam kết", "kỷ luật", "đồng phục", "nề nếp"],
      sort_order: 20,
      active: true
    },
    {
      slug: "activity",
      name: "Hoạt động",
      icon: "🎉",
      color: "#2fae9a",
      keywords: ["hoạt động", "ngoại khóa", "sự kiện", "văn nghệ", "thể thao", "trải nghiệm"],
      sort_order: 30,
      active: true
    },
    {
      slug: "youth",
      name: "Đoàn–Đội",
      icon: "🌟",
      color: "#e3a83b",
      keywords: ["đoàn", "đội", "liên đội", "chi đoàn", "đoàn trường"],
      sort_order: 40,
      active: true
    },
    {
      slug: "canteen",
      name: "Căn tin",
      icon: "🍱",
      color: "#58b985",
      keywords: ["căn tin", "ăn uống", "thực phẩm", "mua bán"],
      sort_order: 50,
      active: true
    },
    {
      slug: "urgent",
      name: "Cần lưu ý",
      icon: "🚨",
      color: "#e56b73",
      keywords: ["khẩn cấp", "gấp", "đặc biệt", "cần lưu ý", "lưu ý"],
      sort_order: 60,
      active: true
    },
    {
      slug: "general",
      name: "Thông báo chung",
      icon: "📌",
      color: "#6f8795",
      keywords: [],
      sort_order: 999,
      active: true
    }
  ];

  function slugify(value = "") {
    return normalizeText(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || `category-${Date.now()}`;
  }

  function activeCategories() {
    const source = state.categories.length ? state.categories : DEFAULT_CATEGORIES;

    return [...source]
      .filter(category => category.active !== false)
      .sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100));
  }

  function categoryById(id) {
    return state.categories.find(category => category.id === id) || null;
  }

  function categoryInfo(item) {
    if (item.category_id) {
      const saved = categoryById(item.category_id);
      if (saved) {
        return { key: saved.slug, ...saved };
      }
    }

    const source = normalizeText(
      `${item.category || ""} ${item.title || ""} ${contentRenderer.toPlainText(item.content || "")}`
    );

    const categories = activeCategories();
    const general =
      categories.find(category => category.slug === "general") ||
      DEFAULT_CATEGORIES.find(category => category.slug === "general");

    for (const category of categories) {
      if (category.slug === "general") continue;

      const keywords = Array.isArray(category.keywords)
        ? category.keywords
        : String(category.keywords || "")
            .split(",")
            .map(value => value.trim())
            .filter(Boolean);

      if (
        keywords.some(keyword =>
          source.includes(normalizeText(keyword))
        )
      ) {
        return { key: category.slug, ...category };
      }
    }

    return { key: general.slug, ...general };
  }

  function categoryDisplayColor(category) {
    const color = String(category?.color || "").toLowerCase();

    const coolRemap = {
      "#2f80ed": "#4f8fe8",
      "#8b5cf6": "#7e72d8",
      "#f07a3e": "#2fae9a",
      "#e8a312": "#e3a83b",
      "#20a779": "#58b985",
      "#df4d62": "#e56b73",
      "#59728d": "#6f8795",

      "#fb8500": "#4f8fe8",
      "#d99a00": "#7e72d8",
      "#ff6b6b": "#2fae9a",
      "#ffb703": "#e3a83b",
      "#2fbf8f": "#58b985",
      "#e74f4f": "#e56b73",
      "#8a6a55": "#6f8795",

      "#c2410c": "#4f8fe8",
      "#a16207": "#7e72d8",
      "#be123c": "#2fae9a",
      "#b45309": "#e3a83b",
      "#3f7d58": "#58b985",
      "#b91c1c": "#e56b73",
      "#7c5c46": "#6f8795"
    };

    return coolRemap[color] || color || "#6f8795";
  }

  function categoryStyle(category) {
    const color = categoryDisplayColor(category);
    return `--category-color:${escapeHtml(color)};`;
  }

  function fillCategorySelect(select, selected = "auto") {
    if (!select) return;

    const options = activeCategories()
      .map(category => `
        <option value="${escapeHtml(category.id || category.slug)}">
          ${escapeHtml(category.icon || "📌")} ${escapeHtml(category.name)}
        </option>
      `)
      .join("");

    select.innerHTML = `
      <option value="auto">✨ Tự động phân loại</option>
      ${options}
    `;

    select.value = selected || "auto";
    if (select.value !== (selected || "auto")) {
      select.value = "auto";
    }
  }

  function categorySelectionToPayload(value, itemForAuto = null) {
    if (!value || value === "auto") {
      if (!itemForAuto) {
        return { category_id: null, category: null };
      }

      const guessed = categoryInfo(itemForAuto);
      const dbCategory = state.categories.find(
        category => category.slug === guessed.slug
      );

      return {
        category_id: dbCategory?.id || null,
        category: guessed.name || null
      };
    }

    const category = state.categories.find(
      item => item.id === value || item.slug === value
    );

    return {
      category_id: category?.id || null,
      category: category?.name || null
    };
  }

  function resetCategoryForm(category = null) {
    if (!el.categoryForm) return;

    el.categoryForm.reset();
    $("#category-id").value = category?.id || "";
    $("#category-name").value = category?.name || "";
    $("#category-icon").value = category?.icon || "📌";
    $("#category-color").value = category?.color || "#4f8fe8";
    $("#category-order").value = category?.sort_order ?? 100;
    $("#category-keywords").value = Array.isArray(category?.keywords)
      ? category.keywords.join(", ")
      : (category?.keywords || "");
    $("#category-active").checked = category ? category.active !== false : true;
    setMessage(el.categoryMessage, "");
  }

  function renderCategoryManager() {
    if (!el.categoryManagerList) return;

    const categories = [...state.categories]
      .sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100));

    el.categoryManagerList.innerHTML = categories.length
      ? categories.map(category => `
          <article
            class="category-manager-item ${category.active === false ? "inactive" : ""}"
            style="${categoryStyle(category)}"
          >
            <div class="category-manager-icon" aria-hidden="true">
              ${escapeHtml(category.icon || "📌")}
            </div>

            <div class="category-manager-info">
              <strong>${escapeHtml(category.name)}</strong>
              <small>
                ${escapeHtml((category.keywords || []).join(", ") || "Chưa có từ khóa")}
              </small>
            </div>

            <div class="category-manager-actions">
              <button
                class="mini-action"
                type="button"
                data-action="edit-category"
                data-id="${escapeHtml(category.id)}"
                aria-label="Sửa ${escapeHtml(category.name)}"
              >✏️</button>

              <button
                class="mini-action mini-danger"
                type="button"
                data-action="delete-category"
                data-id="${escapeHtml(category.id)}"
                aria-label="Xóa ${escapeHtml(category.name)}"
              >🗑️</button>
            </div>
          </article>
        `).join("")
      : '<div class="empty-state">Chưa có chuyên mục. Hãy kiểm tra schema.sql.</div>';
  }

  function openCategoriesDialog() {
    if (!isAdmin()) return;

    renderCategoryManager();
    resetCategoryForm();
    el.categoryDialog.showModal();
  }

  async function saveCategory(event) {
    event.preventDefault();

    if (!client || !isAdmin()) return;

    const id = $("#category-id").value;
    const name = $("#category-name").value.trim();

    if (!name) {
      setMessage(el.categoryMessage, "Hãy nhập tên chuyên mục.");
      return;
    }

    const keywords = $("#category-keywords").value
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);

    const payload = {
      name,
      slug: slugify(name),
      icon: $("#category-icon").value.trim() || "📌",
      color: $("#category-color").value || "#4f8fe8",
      keywords,
      sort_order: Number($("#category-order").value) || 100,
      active: $("#category-active").checked,
      updated_at: new Date().toISOString()
    };

    setMessage(el.categoryMessage, "Đang lưu...");

    const request = id
      ? client.from("categories").update(payload).eq("id", id)
      : client.from("categories").insert(payload);

    const { error } = await request;

    if (error) {
      console.error(error);
      setMessage(
        el.categoryMessage,
        "Không lưu được chuyên mục. Có thể tên/slug đã tồn tại."
      );
      return;
    }

    await loadData();
    renderCategoryManager();
    resetCategoryForm();
    showToast(id ? "Đã cập nhật chuyên mục." : "Đã thêm chuyên mục.");
  }

  async function deleteCategory(id) {
    if (!client || !isAdmin()) return;

    const category = state.categories.find(item => item.id === id);
    if (!category) return;

    const ok = confirm(
      `Xóa chuyên mục "${category.name}"? Các thông báo cũ sẽ chuyển về phân loại tự động/chung.`
    );

    if (!ok) return;

    const { error } = await client
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      showToast("Không xóa được chuyên mục.");
      return;
    }

    await loadData();
    renderCategoryManager();
    resetCategoryForm();
    showToast("Đã xóa chuyên mục.");
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

    return `
      <article class="announcement-card tone-${tone(item.title + item.id)} ${item.priority === "important" ? "important" : ""}" style="${categoryStyle(category)}">
        <div class="announcement-inner">
          <div class="announcement-title-row">
            ${item.is_pinned ? '<span class="pin" aria-label="Đã ghim">📌</span>' : ""}
            <h3>${escapeHtml(item.title)}</h3>
            <span class="category-chip" style="${categoryStyle(category)}">
              <span aria-hidden="true">${escapeHtml(category.icon || "📌")}</span>
              ${escapeHtml(category.name)}
            </span>
            ${item.priority === "important" ? '<span class="priority-chip">Quan trọng</span>' : ""}
          </div>

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

          <div class="announcement-meta">
            <span class="meta-chip">📅 ${escapeHtml(formatDate(item.event_date))}</span>
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

          <div class="card-actions">
            <button class="button button-ghost button-small card-command" data-action="copy-announcement" data-id="${escapeHtml(item.id)}"><span aria-hidden="true">⧉</span><span>Sao chép</span></button>
            ${adminButtons}
          </div>
        </div>
      </article>`;
  }

  function renderCurrent() {
    const week = state.currentWeek;

    const badgeLabels = {
      current: "Đang hoạt động",
      upcoming: "Sắp bắt đầu",
      past: "Tuần gần nhất",
      none: "Chưa có lịch"
    };

    if (el.weekStateBadge) {
      el.weekStateBadge.innerHTML =
        `<span aria-hidden="true"></span> ${badgeLabels[state.currentWeekState] || badgeLabels.none}`;
    }

    if (!week) {
      el.currentWeekCard.innerHTML = '<div class="loading-card">Chưa có lịch tuần.</div>';
      el.currentAnnouncements.innerHTML = '<div class="empty-state">Chưa có thông báo.</div>';
      if (el.categoryDashboard) {
        el.categoryDashboard.innerHTML = "";
        el.categoryDashboard.classList.add("hidden");
      }
      return;
    }

    const labels = {
      current: "Đang diễn ra",
      upcoming: "Chuẩn bị tuần tiếp theo",
      past: "Tuần gần nhất"
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
          ${week.school_year ? `<span class="week-school-year">🎓 ${escapeHtml(week.school_year)}</span>` : ""}
          <span class="week-school-year">📣 ${getItems(week.id).length} thông báo</span>
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
      ? visibleItems.map(announcementCard).join("")
      : '<div class="empty-state">Không có thông báo trong chuyên mục này.</div>';
  }

  function renderYearStrip() {
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
      const label =
        s === "current" ? "● Hiện tại" :
        s === "upcoming" ? "Sắp tới" :
        "✓ Đã qua";
      const announcementCount = getItems(week.id).length;

      return `
        <article class="year-week-card ${s}">
          <div class="year-week-head">
            <strong>Tuần ${escapeHtml(week.week_number)}</strong>
            <span class="week-count-badge">${announcementCount} thông báo</span>
          </div>
          <small>${formatShortDate(week.start_date)} → ${formatShortDate(week.end_date)}</small>
          ${week.school_year ? `<small class="year-week-school-year">${escapeHtml(week.school_year)}</small>` : ""}
          <span class="year-week-state">${label}</span>
          <div class="year-week-actions">
            <button class="mini-action mini-view" data-action="view-week" data-id="${week.id}" aria-label="Xem Tuần ${escapeHtml(week.week_number)}">Xem</button>
            ${isAdmin() ? `
              <button class="mini-action" data-action="edit-week" data-id="${week.id}" aria-label="Sửa Tuần ${escapeHtml(week.week_number)}">✏️</button>
              <button class="mini-action mini-danger" data-action="delete-week" data-id="${week.id}" aria-label="Xóa Tuần ${escapeHtml(week.week_number)}">🗑️</button>
            ` : ""}
          </div>
        </article>`;
    }).join("");
  }

  function renderArchives() {
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
          <div style="padding:20px 20px 0" class="archive-summary-head">
            <div>
              <div class="archive-year-kicker">${escapeHtml(schoolYearLabel(schoolYearKey(week)))}</div>
              <h3 class="archive-week-name">Tuần ${escapeHtml(week.week_number)}</h3>
              <span class="archive-date">${formatDate(week.start_date)} — ${formatDate(week.end_date)}</span>
            </div>
            <span class="archive-count-chip">${items.length} thông báo</span>
          </div>
          <div style="padding:0 20px">
            <p class="archive-summary-text">${escapeHtml(week.summary || "Tuần đã qua.")}</p>
            ${items.length
              ? `<ul class="archive-peek">${items.slice(0,3).map(x => `<li>${escapeHtml(x.title)}</li>`).join("")}</ul>`
              : '<p class="muted">Không có thông báo.</p>'}
          </div>
          <div class="archive-card-footer">
            <button class="text-button" data-action="open-archive" data-id="${week.id}">Xem lại →</button>
            ${isAdmin() ? `<span class="archive-admin-actions">
              <button class="text-button" data-action="edit-week" data-id="${week.id}">Sửa tuần</button>
              <button class="text-button danger-text" data-action="delete-week" data-id="${week.id}">Xóa tuần</button>
            </span>` : ""}
          </div>
        </article>`;
    }).join("");
  }

  function enhanceRenderedContent() {
    contentInteractions.enhance(document);
  }

  function renderAll() {
    renderAdmin();
    renderConnection();
    renderCurrent();
    renderSchoolYearSelectors();
    renderYearStrip();
    renderArchives();
    enhanceRenderedContent();
  }

  let renderFrame = 0;

  function scheduleRenderAll() {
    if (renderFrame) return;

    renderFrame = window.requestAnimationFrame(() => {
      renderFrame = 0;
      renderAll();
    });
  }


  async function loadData() {
    if (!client) {
      state.weeks = demoData.weeks;
      state.announcements = demoData.announcements;
      state.categories = DEFAULT_CATEGORIES;
    } else {
      const [
        { data: weeks, error: weekError },
        { data: items, error: itemError },
        { data: categories, error: categoryError }
      ] = await Promise.all([
        client.from("weeks").select("*").order("start_date", { ascending: true }),
        client.from("announcements").select("*").order("created_at", { ascending: false }),
        client.from("categories").select("*").order("sort_order", { ascending: true })
      ]);

      if (weekError || itemError || categoryError) {
        console.error(weekError || itemError || categoryError);
        el.connectionBanner.className = "status-banner warning";
        el.connectionBanner.textContent =
          "Không tải được dữ liệu. Hãy kiểm tra config.js và schema.sql.";
        return;
      }

      state.weeks = weeks || [];
      state.announcements = items || [];
      state.categories = categories || [];
    }

    [state.currentWeek, state.currentWeekState] = chooseFeaturedWeek();
    scheduleRenderAll();
  }

  async function loadSession() {
    if (!client) return;
    const { data, error } = await client.auth.getSession();
    if (error) console.error(error);
    state.user = data?.session?.user || null;
  }

  async function handleLogin(event) {
    event.preventDefault();

    if (!client) {
      setMessage(el.loginMessage, "Hãy kết nối Supabase trước.");
      return;
    }

    const form = new FormData(el.loginForm);
    setMessage(el.loginMessage, "Đang đăng nhập...");

    const { data, error } = await client.auth.signInWithPassword({
      email: form.get("email"),
      password: form.get("password")
    });

    if (error) {
      setMessage(el.loginMessage, "Email hoặc mật khẩu chưa đúng.");
      return;
    }

    state.user = data.user;
    el.loginForm.reset();
    el.loginDialog.close();
    scheduleRenderAll();
    showToast("Đã vào chế độ quản trị.");
  }

  async function handleLogout() {
    if (!client) return;
    await client.auth.signOut();
    state.user = null;
    scheduleRenderAll();
    showToast("Đã đăng xuất.");
  }

  function openAnnouncementForm(item = null) {
    if (!isAdmin()) return;

    if (!state.weeks.length) {
      showToast("Hãy tạo lịch tuần trước.");
      return;
    }

    el.announcementForm.reset();
    setMessage(el.announcementMessage, "");

    const targetWeekId = item?.week_id || state.currentWeek?.id || sortedWeeks()[0]?.id || "";
    fillWeekSelect($("#announcement-week"), targetWeekId);

    const targetWeek = state.weeks.find(w => w.id === targetWeekId) || state.currentWeek;

    $("#announcement-id").value = item?.id || "";
    $("#announcement-title").value = item?.title || "";
    $("#announcement-date").value =
      item?.event_date || targetWeek?.start_date || todayIso();
    $("#announcement-valid-from").value =
      item?.valid_from || targetWeek?.start_date || todayIso();
    $("#announcement-valid-until").value =
      item?.valid_until || targetWeek?.end_date || todayIso();
    fillCategorySelect(
      $("#announcement-category-select"),
      item?.category_id || "auto"
    );
    $("#announcement-category").value = item?.category || "";
    $("#announcement-priority").value = item?.priority || "normal";
    $("#announcement-pinned").checked = Boolean(item?.is_pinned);
    const storedContent = item?.content || "";
    const storedMode =
      contentRenderer.getStoredMode(storedContent);
    const editorSource =
      contentRenderer.getEditorContent(storedContent);

    const editorHtml = storedMode === "html"
      ? contentRenderer.sanitizeHtml(editorSource)
      : contentRenderer.renderMarkdown(editorSource);

    announcementEditor.setHtml(
      editorHtml,
      {
        view: "visual",
        focus: false
      }
    );
    $("#announcement-image-alt").value = item?.image_alt || item?.title || "";
    $("#announcement-remove-image").checked = false;

    const preview = $("#announcement-image-preview");
    const removeRow = $("#announcement-remove-image-row");

    if (item?.image_path) {
      showImagePreview(
        preview,
        getImagePublicUrl(item.image_path),
        item.image_alt || item.title,
        "Ảnh hiện tại"
      );
      removeRow.classList.remove("hidden");
    } else {
      clearImagePreview(preview);
      removeRow.classList.add("hidden");
    }

    el.announcementDialogTitle.textContent = item ? "Sửa thông báo" : "Đăng thông báo mới";
    el.announcementDialog.showModal();
  }

  async function saveAnnouncement(event) {
    event.preventDefault();

    if (!client || !isAdmin()) {
      setMessage(el.announcementMessage, "Bạn chưa đăng nhập quản trị.");
      return;
    }

    const targetWeek = getSelectedWeek("#announcement-week");
    if (!targetWeek) {
      setMessage(el.announcementMessage, "Hãy chọn đúng tuần cần đăng.");
      return;
    }

    const validFrom = $("#announcement-valid-from").value;
    const validUntil = $("#announcement-valid-until").value;

    if (!validFrom || !validUntil || validUntil < validFrom) {
      setMessage(el.announcementMessage, "Thời gian hiệu lực chưa hợp lệ.");
      return;
    }

    const id = $("#announcement-id").value;
    const existing = state.announcements.find(item => item.id === id) || null;
    const title = $("#announcement-title").value.trim();
    const rawEditorContent =
      announcementEditor.getHtml().trim();

    const cleanedEditorContent =
      contentRenderer.sanitizeHtml(rawEditorContent);

    if (!cleanedEditorContent) {
      setMessage(
        el.announcementMessage,
        "Nội dung trống hoặc chỉ chứa HTML không được phép."
      );
      return;
    }

    const storedContent =
      contentRenderer.serializeEditorContent(
        cleanedEditorContent,
        "html"
      );

    const categoryContent =
      contentRenderer.toPlainText(
        cleanedEditorContent,
        "html"
      );

    const newFile = $("#announcement-image").files?.[0] || null;
    const removeCurrent = $("#announcement-remove-image").checked;

    let imagePath = existing?.image_path || null;
    let uploadedPath = null;

    try {
      if (newFile) {
        setMessage(el.announcementMessage, "Đang tải ảnh lên...");
        uploadedPath = await uploadAnnouncementImage(newFile);
        imagePath = uploadedPath;
      } else if (removeCurrent) {
        imagePath = null;
      }
    } catch (error) {
      console.error(error);
      setMessage(
        el.announcementMessage,
        error?.message || "Không tải được ảnh. Hãy kiểm tra Storage."
      );
      return;
    }

    const imageAlt = imagePath
      ? ($("#announcement-image-alt").value.trim() || title)
      : null;

    const payload = {
      week_id: targetWeek.id,
      title,
      content: storedContent,
      ...categorySelectionToPayload(
        $("#announcement-category-select").value,
        {
          title,
          content: categoryContent,
          category: $("#announcement-category").value.trim()
        }
      ),
      event_date: $("#announcement-date").value,
      valid_from: validFrom,
      valid_until: validUntil,
      image_path: imagePath,
      image_alt: imageAlt,
      priority: $("#announcement-priority").value,
      is_pinned: $("#announcement-pinned").checked,
      updated_at: new Date().toISOString()
    };

    setMessage(el.announcementMessage, "Đang lưu...");

    const request = id
      ? client.from("announcements").update(payload).eq("id", id)
      : client.from("announcements").insert(payload);

    const { error } = await request;

    if (error) {
      console.error(error);
      if (uploadedPath) await removeStorageImage(uploadedPath);
      setMessage(
        el.announcementMessage,
        "Không lưu được. Hãy kiểm tra kết nối Supabase, Storage và quyền RLS."
      );
      return;
    }

    if (existing?.image_path && existing.image_path !== imagePath) {
      await cleanupImageIfUnused(existing.image_path, [existing.id]);
    }

    clearImagePreview($("#announcement-image-preview"));
    el.announcementDialog.close();
    await loadData();
    showToast(`${id ? "Đã cập nhật" : "Đã đăng"} vào Tuần ${targetWeek.week_number}.`);
  }

  async function deleteAnnouncement(id) {
    if (!client || !isAdmin()) return;

    const item = state.announcements.find(x => x.id === id);
    if (!item) return;

    if (!confirm("Bạn chắc chắn muốn xóa thông báo này?")) return;

    const { error } = await client.from("announcements").delete().eq("id", id);
    if (error) {
      console.error(error);
      showToast("Không xóa được thông báo.");
      return;
    }

    if (item.image_path) {
      await cleanupImageIfUnused(item.image_path, [id]);
    }

    await loadData();
    showToast("Đã xóa thông báo.");
  }

  function openWeekForm(week = null) {
    if (!isAdmin()) return;

    el.weekForm.reset();
    setMessage(el.weekMessage, "");

    $("#week-id").value = week?.id || "";
    $("#week-number").value = week?.week_number || "";
    $("#week-title").value = week?.title || "";
    $("#week-school-year").value = week?.school_year || "";
    $("#week-start").value = week?.start_date || "";
    $("#week-end").value = week?.end_date || "";
    $("#week-summary").value = week?.summary || "";
    $("#week-current").checked = week ? week.status === "current" : true;

    el.weekDialogTitle.textContent = week ? `Sửa Tuần ${week.week_number}` : "Tạo một tuần";
    el.weekDialog.showModal();
  }

  async function saveWeek(event) {
    event.preventDefault();

    if (!client || !isAdmin()) {
      setMessage(el.weekMessage, "Bạn chưa đăng nhập quản trị.");
      return;
    }

    const id = $("#week-id").value;
    const start = $("#week-start").value;
    const end = $("#week-end").value;
    const makeCurrent = $("#week-current").checked;

    if (dateObj(end) < dateObj(start)) {
      setMessage(el.weekMessage, "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
      return;
    }

    if (makeCurrent) {
      let query = client.from("weeks")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("status", "current");
      if (id) query = query.neq("id", id);

      const { error } = await query;
      if (error) {
        setMessage(el.weekMessage, "Không thể cập nhật tuần hiện tại.");
        return;
      }
    }

    const payload = {
      week_number: $("#week-number").value.trim(),
      title: $("#week-title").value.trim() || null,
      school_year: $("#week-school-year").value.trim() || null,
      start_date: start,
      end_date: end,
      summary: $("#week-summary").value.trim() || null,
      status: makeCurrent ? "current" : "archived",
      updated_at: new Date().toISOString()
    };

    const request = id
      ? client.from("weeks").update(payload).eq("id", id)
      : client.from("weeks").insert(payload);

    const { error } = await request;

    if (error) {
      console.error(error);
      setMessage(el.weekMessage, "Không lưu được tuần. Hãy chạy migration V2 nếu chưa chạy.");
      return;
    }

    el.weekDialog.close();
    await loadData();
    showToast(id ? "Đã cập nhật tuần." : "Đã tạo tuần.");
  }

  function openBulkDialog() {
    if (!isAdmin()) return;

    if (!state.weeks.length) {
      showToast("Hãy tạo lịch tuần trước.");
      return;
    }

    el.bulkForm.reset();
    setMessage(el.bulkMessage, "");
    el.bulkPreviewCount.textContent = "Chưa có mục nào";
    clearImagePreview($("#bulk-image-preview"));

    const targetWeekId = state.currentWeek?.id || sortedWeeks()[0]?.id || "";
    fillWeekSelect($("#bulk-week"), targetWeekId);
    fillCategorySelect($("#bulk-category-select"), "auto");
    applyWeekDefaults("bulk");

    el.bulkDialog.showModal();
  }

  function previewBulk() {
    const items = parseQuickInput($("#bulk-raw").value);
    el.bulkPreviewCount.textContent = items.length
      ? `Đã nhận diện ${items.length} thông báo`
      : "Chưa nhận diện được mục nào";
  }

  async function saveBulk(event) {
    event.preventDefault();

    if (!client || !isAdmin()) return;

    const targetWeek = getSelectedWeek("#bulk-week");
    if (!targetWeek) {
      setMessage(el.bulkMessage, "Hãy chọn tuần cần đăng.");
      return;
    }

    const items = parseQuickInput($("#bulk-raw").value);
    if (!items.length) {
      setMessage(el.bulkMessage, "Mỗi mục cần bắt đầu bằng ### hoặc ####.");
      return;
    }

    const validFrom = $("#bulk-valid-from").value;
    const validUntil = $("#bulk-valid-until").value;

    if (!validFrom || !validUntil || validUntil < validFrom) {
      setMessage(el.bulkMessage, "Thời gian hiệu lực chưa hợp lệ.");
      return;
    }

    const fallbackDate = $("#bulk-date").value;
    const categorySelection = $("#bulk-category-select").value;
    const priority = $("#bulk-priority").value;
    const pinFirst = $("#bulk-pin-first").checked;
    const imageFile = $("#bulk-image").files?.[0] || null;
    const imageAlt = $("#bulk-image-alt").value.trim() || null;

    let uploadedPath = null;

    if (imageFile) {
      try {
        setMessage(el.bulkMessage, "Đang tải ảnh chung lên...");
        uploadedPath = await uploadAnnouncementImage(imageFile);
      } catch (error) {
        console.error(error);
        setMessage(el.bulkMessage, error?.message || "Không tải được ảnh.");
        return;
      }
    }

    const payload = items.map((item, index) => ({
      week_id: targetWeek.id,
      title: item.title,
      content: item.content,
      ...categorySelectionToPayload(
        categorySelection,
        {
          title: item.title,
          content: item.content,
          category: ""
        }
      ),
      event_date: extractDate(item.content, fallbackDate),
      valid_from: validFrom,
      valid_until: validUntil,
      image_path: uploadedPath,
      image_alt: uploadedPath ? (imageAlt || item.title) : null,
      priority,
      is_pinned: pinFirst && index === 0,
      updated_at: new Date().toISOString()
    }));

    setMessage(el.bulkMessage, `Đang tạo ${payload.length} thông báo cho Tuần ${targetWeek.week_number}...`);

    const { error } = await client.from("announcements").insert(payload);

    if (error) {
      console.error(error);
      if (uploadedPath) await removeStorageImage(uploadedPath);
      setMessage(el.bulkMessage, "Không tạo được danh sách. Hãy chạy migration-v2-4.sql.");
      return;
    }

    clearImagePreview($("#bulk-image-preview"));
    el.bulkDialog.close();
    await loadData();
    showToast(`Đã tạo ${payload.length} thông báo tại Tuần ${targetWeek.week_number}.`);
  }

  function openSchoolYear() {
    if (!isAdmin()) return;

    el.schoolYearForm.reset();
    state.schoolYearPreview = [];
    el.schoolYearPreview.innerHTML = "";
    el.schoolYearPreviewSummary.textContent = "Chưa tạo bản xem trước.";
    setMessage(el.schoolYearMessage, "");

    $("#school-year-start-number").value = "01";
    $("#school-year-count-input").value = "35";
    el.schoolYearDialog.showModal();
  }

  function generateSchoolYearPreview() {
    setMessage(el.schoolYearMessage, "");

    const schoolYear = $("#school-year-name").value.trim();
    const startRaw = $("#school-year-start-number").value.trim();
    const firstStart = $("#school-year-first-start").value;
    const firstEnd = $("#school-year-first-end").value;
    const count = Number($("#school-year-count-input").value);
    const titlePrefix = $("#school-year-title-prefix").value.trim();

    if (!schoolYear || !startRaw || !firstStart || !firstEnd || !count) {
      setMessage(el.schoolYearMessage, "Hãy nhập đủ thông tin.");
      return [];
    }

    if (dateObj(firstEnd) < dateObj(firstStart)) {
      setMessage(el.schoolYearMessage, "Ngày kết thúc tuần đầu không hợp lệ.");
      return [];
    }

    if (count < 1 || count > 60) {
      setMessage(el.schoolYearMessage, "Số tuần phải từ 1 đến 60.");
      return [];
    }

    const numeric = /^\d+$/.test(startRaw);
    const startNumber = Number(startRaw);
    const width = Math.max(2, startRaw.length);

    const preview = Array.from({ length: count }, (_, index) => {
      const weekNumber = numeric
        ? String(startNumber + index).padStart(width, "0")
        : index === 0 ? startRaw : `${startRaw}-${index + 1}`;

      return {
        week_number: weekNumber,
        title: titlePrefix ? `${titlePrefix} ${weekNumber}` : `Tuần ${weekNumber}`,
        school_year: schoolYear,
        sequence_number: numeric ? startNumber + index : index + 1,
        start_date: addDays(firstStart, index * 7),
        end_date: addDays(firstEnd, index * 7),
        summary: null,
        status: "archived"
      };
    });

    state.schoolYearPreview = preview;

    el.schoolYearPreviewSummary.textContent =
      `${preview.length} tuần · ${formatDate(preview[0].start_date)} → ${formatDate(preview.at(-1).end_date)}`;

    el.schoolYearPreview.innerHTML = preview.map(week => `
      <div class="week-preview-item">
        <strong>Tuần ${escapeHtml(week.week_number)}</strong>
        <small>${formatShortDate(week.start_date)} → ${formatShortDate(week.end_date)}</small>
      </div>`).join("");

    return preview;
  }

  async function saveSchoolYear(event) {
    event.preventDefault();

    if (!client || !isAdmin()) return;

    const preview = generateSchoolYearPreview();
    if (!preview.length) return;

    const duplicates = preview.filter(candidate =>
      state.weeks.some(existing =>
        existing.school_year === candidate.school_year &&
        (
          existing.week_number === candidate.week_number ||
          existing.sequence_number === candidate.sequence_number ||
          existing.start_date === candidate.start_date
        )
      )
    );

    if (duplicates.length) {
      setMessage(
        el.schoolYearMessage,
        `Có ${duplicates.length} tuần bị trùng với lịch đã có. Hãy kiểm tra lịch cũ trước.`
      );
      return;
    }

    const today = todayIso();
    const currentIndex = preview.findIndex(w => today >= w.start_date && today <= w.end_date);

    if (currentIndex >= 0) {
      preview[currentIndex].status = "current";
      const { error } = await client.from("weeks")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("status", "current");

      if (error) {
        setMessage(el.schoolYearMessage, "Không thể chuẩn bị trạng thái tuần hiện tại.");
        return;
      }
    }

    setMessage(el.schoolYearMessage, `Đang tạo ${preview.length} tuần...`);

    const payload = preview.map(w => ({
      ...w,
      updated_at: new Date().toISOString()
    }));

    const { error } = await client.from("weeks").insert(payload);

    if (error) {
      console.error(error);
      setMessage(el.schoolYearMessage, "Không tạo được lịch. Hãy chạy migration-v2.sql rồi thử lại.");
      return;
    }

    const schoolYear = preview[0].school_year;
    state.yearFilter = schoolYear;
    state.archiveYearFilter = schoolYear;
    el.schoolYearDialog.close();
    await loadData();
    showToast(`Đã tạo ${preview.length} tuần cho năm học ${schoolYear}.`);
  }

  async function deleteWeek(id) {
    if (!client || !isAdmin()) return;

    const week = state.weeks.find(w => w.id === id);
    if (!week) return;

    const weekItems = state.announcements.filter(item => item.week_id === id);
    const itemCount = weekItems.length;
    const detail = itemCount
      ? `\n\nTuần này đang có ${itemCount} thông báo. Khi xóa tuần, các thông báo thuộc tuần cũng sẽ bị xóa.`
      : "";

    const ok = window.confirm(
      `Bạn chắc chắn muốn xóa Tuần ${week.week_number} (${formatDate(week.start_date)} — ${formatDate(week.end_date)})?${detail}\n\nThao tác này không thể hoàn tác.`
    );

    if (!ok) return;

    const removedIds = weekItems.map(item => item.id);
    const imagePaths = [...new Set(
      weekItems.map(item => item.image_path).filter(Boolean)
    )];

    const { error } = await client.from("weeks").delete().eq("id", id);

    if (error) {
      console.error(error);
      showToast("Không xóa được tuần. Hãy kiểm tra quyền RLS.");
      return;
    }

    for (const path of imagePaths) {
      await cleanupImageIfUnused(path, removedIds);
    }

    await loadData();
    showToast(`Đã xóa Tuần ${week.week_number}.`);
  }

  function openImageViewer(id) {
    const item = state.announcements.find(x => x.id === id);
    if (!item?.image_path) return;

    const url = getImagePublicUrl(item.image_path);
    if (!url) return;

    $("#image-dialog-title").textContent = item.title;
    $("#image-dialog-image").src = url;
    $("#image-dialog-image").alt = item.image_alt || item.title;
    $("#image-dialog-caption").textContent = item.image_alt || item.title;
    $("#image-dialog").showModal();
  }

  async function copyAnnouncement(id) {
    const item = state.announcements.find(x => x.id === id);
    if (!item) return;

    const week = state.weeks.find(w => w.id === item.week_id);
    const text = [
      item.title,
      `Ngày: ${formatDate(item.event_date)}`,
      week ? `Tuần: ${week.week_number}` : "",
      item.category ? `Chuyên mục: ${item.category}` : "",
      item.image_path ? `Ảnh: ${getImagePublicUrl(item.image_path)}` : "",
      "",
      contentRenderer.toPlainText(item.content)
    ].filter(Boolean).join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
    }

    showToast("Đã sao chép thông báo.");
  }

  function openArchive(weekId) {
    const week = state.weeks.find(w => w.id === weekId);
    if (!week) return;

    const items = getItems(week.id);
    el.archiveDialogTitle.textContent =
      `Tuần ${week.week_number} · ${formatDate(week.start_date)} — ${formatDate(week.end_date)}`;

    el.archiveDialogContent.innerHTML = `
      <p class="muted">${escapeHtml(week.summary || "Không có tóm tắt riêng.")}</p>
      <div class="announcement-list">
        ${items.length ? items.map(announcementCard).join("") : '<div class="empty-state">Không có thông báo.</div>'}
      </div>`;

    el.archiveDialog.showModal();
  }

  function runSearch(query) {
    const q = normalizeText(query);
    if (!q) {
      clearSearch();
      return;
    }

    const results = state.announcements.filter(item => {
      const week = state.weeks.find(w => w.id === item.week_id);
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

  function clearSearch() {
    el.searchInput.value = "";
    el.searchResultsSection.classList.add("hidden");
    el.searchResults.innerHTML = "";
  }

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

    if (action === "copy-announcement") copyAnnouncement(id);
    if (action === "open-image") openImageViewer(id);
    if (action === "delete-announcement") deleteAnnouncement(id);
    if (action === "delete-week") deleteWeek(id);
    if (action === "open-archive" || action === "view-week") openArchive(id);

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
    initTheme();

    announcementEditor =
      window.WeeklyRichEditor?.create({
        root: $("#announcement-rich-editor"),
        renderer: contentRenderer,
        onToast: showToast
      });

    if (!announcementEditor) {
      throw new Error("Không khởi tạo được rich editor.");
    }

    initDialogs();
    initEvents();
    await loadSession();
    await loadData();
  }

  init().catch(error => {
    console.error(error);
    el.connectionBanner.className = "status-banner warning";
    el.connectionBanner.textContent =
      "Ứng dụng gặp lỗi khi khởi động. Mở DevTools > Console để xem chi tiết.";
  });
})();
