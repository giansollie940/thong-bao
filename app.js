(() => {
  "use strict";

  const config = window.APP_CONFIG || {};
  const isConfigured =
    config.SUPABASE_URL &&
    config.SUPABASE_KEY &&
    !config.SUPABASE_URL.includes("YOUR_") &&
    !config.SUPABASE_KEY.includes("YOUR_");

  const client = isConfigured
    ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_KEY)
    : null;

  const state = {
    user: null,
    weeks: [],
    announcements: [],
    currentWeek: null,
    currentWeekState: "none",
    schoolYearPreview: []
  };

  const $ = selector => document.querySelector(selector);

  const el = {
    currentWeekCard: $("#current-week-card"),
    currentAnnouncements: $("#current-announcements"),
    archiveGrid: $("#archive-grid"),
    archiveCount: $("#archive-count"),
    yearStrip: $("#year-strip"),
    yearCount: $("#year-count"),
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

    // V2.3:
    // Từ Thứ Bảy, nếu đã có tuần kế tiếp thì trang chính bắt đầu
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
        // V2.3: nếu có thời gian hiệu lực, thông báo xuất hiện ở mọi tuần
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

  function fillWeekSelect(select, selectedId = "") {
    if (!select) return;

    const weeks = sortedWeeks();
    select.innerHTML = weeks.map(week =>
      `<option value="${escapeHtml(week.id)}">${escapeHtml(
        `Tuần ${week.week_number} · ${formatDate(week.start_date)} – ${formatDate(week.end_date)}`
      )}</option>`
    ).join("");

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

  function inlineMarkdown(text = "") {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  }

  function richContent(raw = "") {
    const lines = String(raw).replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let list = [];

    const flush = () => {
      if (!list.length) return;
      out.push(`<ul>${list.map(x => `<li>${inlineMarkdown(x)}</li>`).join("")}</ul>`);
      list = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        flush();
      } else if (/^-\s+/.test(line)) {
        list.push(line.replace(/^-\s+/, ""));
      } else {
        flush();
        out.push(`<p>${inlineMarkdown(line)}</p>`);
      }
    }

    flush();
    return out.join("");
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

  function announcementCard(item, showWeek = false) {
    const week = state.weeks.find(w => w.id === item.week_id);
    const adminButtons = isAdmin()
      ? `<button class="button button-secondary button-small" data-action="edit-announcement" data-id="${escapeHtml(item.id)}">Sửa</button>
         <button class="button button-danger button-small" data-action="delete-announcement" data-id="${escapeHtml(item.id)}">Xóa</button>`
      : "";

    return `
      <article class="announcement-card tone-${tone(item.title + item.id)} ${item.priority === "important" ? "important" : ""}">
        <div class="announcement-inner">
          <div class="announcement-title-row">
            ${item.is_pinned ? '<span class="pin" aria-label="Đã ghim">📌</span>' : ""}
            <h3>${escapeHtml(item.title)}</h3>
            ${item.priority === "important" ? '<span class="priority-chip">Quan trọng</span>' : ""}
          </div>

          <div class="announcement-content">${richContent(item.content)}</div>

          <div class="announcement-meta">
            <span class="meta-chip">📅 ${escapeHtml(formatDate(item.event_date))}</span>
            ${item.category ? `<span class="meta-chip">${escapeHtml(item.category)}</span>` : ""}
            ${showWeek && week ? `<span class="meta-chip">Đăng tại Tuần ${escapeHtml(week.week_number)}</span>` : ""}
            ${
              item.valid_from || item.valid_until
                ? `<span class="meta-chip validity-chip">⏳ Hiệu lực ${escapeHtml(formatDate(item.valid_from || item.event_date))} → ${escapeHtml(formatDate(item.valid_until || item.valid_from || item.event_date))}</span>`
                : ""
            }
          </div>

          <div class="card-actions">
            <button class="button button-secondary button-small" data-action="copy-announcement" data-id="${escapeHtml(item.id)}">📋 Sao chép</button>
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
          ${isAdmin() ? `<div class="week-admin-actions">
            <button class="button button-secondary button-small" data-action="edit-week" data-id="${week.id}">✏️ Sửa tuần</button>
            <button class="button button-danger button-small" data-action="delete-week" data-id="${week.id}">🗑️ Xóa tuần</button>
          </div>` : ""}
        </div>
      </div>`;

    const items = getItems(week.id);
    el.currentAnnouncements.innerHTML = items.length
      ? items.map(announcementCard).join("")
      : '<div class="empty-state">Tuần này chưa có thông báo.</div>';
  }

  function renderYearStrip() {
    const weeks = [...state.weeks].sort((a, b) => a.start_date.localeCompare(b.start_date));
    el.yearCount.textContent = `${weeks.length} tuần`;

    if (!weeks.length) {
      el.yearStrip.innerHTML = '<div class="empty-state">Chưa có lịch năm học.</div>';
      return;
    }

    el.yearStrip.innerHTML = weeks.map(week => {
      const s = weekState(week);
      const label = s === "current" ? "● Hiện tại" : s === "upcoming" ? "Sắp tới" : "✓ Đã qua";
      return `
        <article class="year-week-card ${s}">
          <strong>Tuần ${escapeHtml(week.week_number)}</strong>
          <small>${formatShortDate(week.start_date)} → ${formatShortDate(week.end_date)}</small>
          ${week.school_year ? `<small>${escapeHtml(week.school_year)}</small>` : ""}
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
    const weeks = state.weeks
      .filter(w => w.end_date < today)
      .sort((a, b) => b.start_date.localeCompare(a.start_date));

    el.archiveCount.textContent = `${weeks.length} tuần đã qua`;

    if (!weeks.length) {
      el.archiveGrid.innerHTML = '<div class="empty-state">Chưa có tuần cũ.</div>';
      return;
    }

    el.archiveGrid.innerHTML = weeks.map(week => {
      const items = getItems(week.id);
      return `
        <article class="archive-card">
          <div style="padding:20px 20px 0" class="archive-summary-head">
            <div>
              <h3 class="archive-week-name">Tuần ${escapeHtml(week.week_number)}</h3>
              <span class="archive-date">${formatDate(week.start_date)} — ${formatDate(week.end_date)}</span>
            </div>
            <span class="archive-count-chip">${items.length} thông báo</span>
          </div>
          <div style="padding:0 20px">
            <p class="archive-summary-text">${escapeHtml(week.summary || "Tuần đã qua.")}</p>
            ${items.length ? `<ul class="archive-peek">${items.slice(0,3).map(x => `<li>${escapeHtml(x.title)}</li>`).join("")}</ul>` : '<p class="muted">Không có thông báo.</p>'}
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

  function renderAll() {
    renderAdmin();
    renderConnection();
    renderCurrent();
    renderYearStrip();
    renderArchives();
  }


  async function loadData() {
    if (!client) {
      state.weeks = demoData.weeks;
      state.announcements = demoData.announcements;
    } else {
      const [{ data: weeks, error: weekError }, { data: items, error: itemError }] = await Promise.all([
        client.from("weeks").select("*").order("start_date", { ascending: true }),
        client.from("announcements").select("*").order("created_at", { ascending: false })
      ]);

      if (weekError || itemError) {
        console.error(weekError || itemError);
        el.connectionBanner.className = "status-banner warning";
        el.connectionBanner.textContent =
          "Không tải được dữ liệu. Hãy kiểm tra config.js và chạy migration-v2.sql.";
        return;
      }

      state.weeks = weeks || [];
      state.announcements = items || [];
    }

    [state.currentWeek, state.currentWeekState] = chooseFeaturedWeek();
    renderAll();
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
    renderAll();
    showToast("Đã vào chế độ quản trị.");
  }

  async function handleLogout() {
    if (!client) return;
    await client.auth.signOut();
    state.user = null;
    renderAll();
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
    $("#announcement-category").value = item?.category || "";
    $("#announcement-priority").value = item?.priority || "normal";
    $("#announcement-pinned").checked = Boolean(item?.is_pinned);
    $("#announcement-content").value = item?.content || "";

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

    const payload = {
      // V2.3: week_id lấy từ tuần admin chọn, không còn ép vào tuần hiện tại.
      week_id: targetWeek.id,
      title: $("#announcement-title").value.trim(),
      content: $("#announcement-content").value.trim(),
      category: $("#announcement-category").value.trim() || null,
      event_date: $("#announcement-date").value,
      valid_from: validFrom,
      valid_until: validUntil,
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
      setMessage(el.announcementMessage, "Không lưu được. Hãy chạy migration-v2-2.sql và kiểm tra RLS.");
      return;
    }

    el.announcementDialog.close();
    await loadData();
    showToast(`${id ? "Đã cập nhật" : "Đã đăng"} vào Tuần ${targetWeek.week_number}.`);
  }

  async function deleteAnnouncement(id) {
    if (!client || !isAdmin()) return;
    if (!confirm("Bạn chắc chắn muốn xóa thông báo này?")) return;

    const { error } = await client.from("announcements").delete().eq("id", id);
    if (error) {
      console.error(error);
      showToast("Không xóa được thông báo.");
      return;
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

    const targetWeekId = state.currentWeek?.id || sortedWeeks()[0]?.id || "";
    fillWeekSelect($("#bulk-week"), targetWeekId);
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
    const category = $("#bulk-category").value.trim() || null;
    const priority = $("#bulk-priority").value;
    const pinFirst = $("#bulk-pin-first").checked;

    const payload = items.map((item, index) => ({
      week_id: targetWeek.id,
      title: item.title,
      content: item.content,
      category,
      event_date: extractDate(item.content, fallbackDate),
      valid_from: validFrom,
      valid_until: validUntil,
      priority,
      is_pinned: pinFirst && index === 0,
      updated_at: new Date().toISOString()
    }));

    setMessage(el.bulkMessage, `Đang tạo ${payload.length} thông báo cho Tuần ${targetWeek.week_number}...`);

    const { error } = await client.from("announcements").insert(payload);
    if (error) {
      console.error(error);
      setMessage(el.bulkMessage, "Không tạo được danh sách. Hãy chạy migration-v2-2.sql.");
      return;
    }

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
    el.schoolYearDialog.close();
    await loadData();
    showToast(`Đã tạo ${preview.length} tuần cho năm học ${schoolYear}.`);
  }

  async function deleteWeek(id) {
    if (!client || !isAdmin()) return;

    const week = state.weeks.find(w => w.id === id);
    if (!week) return;

    const itemCount = state.announcements.filter(item => item.week_id === id).length;
    const detail = itemCount
      ? `\n\nTuần này đang có ${itemCount} thông báo. Khi xóa tuần, các thông báo thuộc tuần cũng sẽ bị xóa.`
      : "";

    const ok = window.confirm(
      `Bạn chắc chắn muốn xóa Tuần ${week.week_number} (${formatDate(week.start_date)} — ${formatDate(week.end_date)})?${detail}\n\nThao tác này không thể hoàn tác.`
    );

    if (!ok) return;

    const { error } = await client.from("weeks").delete().eq("id", id);

    if (error) {
      console.error(error);
      showToast("Không xóa được tuần. Hãy kiểm tra quyền RLS.");
      return;
    }

    await loadData();
    showToast(`Đã xóa Tuần ${week.week_number}.`);
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
      "",
      item.content
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
        item.content,
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

    if (action === "copy-announcement") copyAnnouncement(id);
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
    document.querySelectorAll(".close-dialog").forEach(button => {
      button.addEventListener("click", () => button.closest("dialog")?.close());
    });

    document.querySelectorAll("dialog").forEach(dialog => {
      dialog.addEventListener("click", event => {
        if (event.target === dialog) dialog.close();
      });
    });
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
    $("#school-year-button").addEventListener("click", openSchoolYear);

    el.announcementForm.addEventListener("submit", saveAnnouncement);
    el.weekForm.addEventListener("submit", saveWeek);
    el.bulkForm.addEventListener("submit", saveBulk);
    el.schoolYearForm.addEventListener("submit", saveSchoolYear);

    $("#bulk-preview-button").addEventListener("click", previewBulk);
    $("#school-year-preview-button").addEventListener("click", generateSchoolYearPreview);

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
        renderAll();
      });
    }
  }

  async function init() {
    initTheme();
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
