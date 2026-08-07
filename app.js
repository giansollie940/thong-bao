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
    currentWeek: null
  };

  const el = {
    currentWeekCard: document.querySelector("#current-week-card"),
    currentAnnouncements: document.querySelector("#current-announcements"),
    archiveGrid: document.querySelector("#archive-grid"),
    archiveCount: document.querySelector("#archive-count"),
    adminToolbar: document.querySelector("#admin-toolbar"),
    loginButton: document.querySelector("#login-button"),
    logoutButton: document.querySelector("#logout-button"),
    connectionBanner: document.querySelector("#connection-banner"),
    searchForm: document.querySelector("#search-form"),
    searchInput: document.querySelector("#search-input"),
    searchResultsSection: document.querySelector("#search-results-section"),
    searchResults: document.querySelector("#search-results"),
    clearSearchButton: document.querySelector("#clear-search-button"),
    themeToggle: document.querySelector("#theme-toggle"),
    toast: document.querySelector("#toast"),

    loginDialog: document.querySelector("#login-dialog"),
    loginForm: document.querySelector("#login-form"),
    loginMessage: document.querySelector("#login-message"),

    announcementDialog: document.querySelector("#announcement-dialog"),
    announcementForm: document.querySelector("#announcement-form"),
    announcementDialogTitle: document.querySelector("#announcement-dialog-title"),
    announcementMessage: document.querySelector("#announcement-message"),

    weekDialog: document.querySelector("#week-dialog"),
    weekForm: document.querySelector("#week-form"),
    weekDialogTitle: document.querySelector("#week-dialog-title"),
    weekMessage: document.querySelector("#week-message"),

    archiveDialog: document.querySelector("#archive-dialog"),
    archiveDialogTitle: document.querySelector("#archive-dialog-title"),
    archiveDialogContent: document.querySelector("#archive-dialog-content")
  };

  const demoData = {
    weeks: [
      {
        id: "demo-week-3",
        week_number: "03",
        title: "Tuần hiện tại",
        start_date: "2026-08-10",
        end_date: "2026-08-16",
        summary: "Các lịch quan trọng và công việc cần lưu ý trong tuần.",
        status: "current",
        created_at: "2026-08-07T12:00:00Z"
      },
      {
        id: "demo-week-2",
        week_number: "02",
        title: "Tuần trước",
        start_date: "2026-08-03",
        end_date: "2026-08-09",
        summary: "Đã hoàn thành lịch họp, kiểm tra tài liệu và hoạt động đầu tháng.",
        status: "archived",
        created_at: "2026-08-01T12:00:00Z"
      }
    ],
    announcements: [
      {
        id: "demo-a1",
        week_id: "demo-week-3",
        title: "Lịch tập trung đầu tuần",
        content: "Có mặt đúng giờ và chuẩn bị đầy đủ tài liệu cần thiết.",
        category: "Lịch chung",
        event_date: "2026-08-10",
        priority: "important",
        is_pinned: true,
        created_at: "2026-08-07T12:20:00Z"
      },
      {
        id: "demo-a2",
        week_id: "demo-week-3",
        title: "Chuẩn bị tài liệu",
        content: "Kiểm tra và hoàn thiện các tài liệu trước chiều thứ Tư.",
        category: "Công việc",
        event_date: "2026-08-12",
        priority: "normal",
        is_pinned: false,
        created_at: "2026-08-07T12:10:00Z"
      },
      {
        id: "demo-a3",
        week_id: "demo-week-2",
        title: "Tổng hợp công việc đầu tháng",
        content: "Các đầu việc đầu tháng đã được tổng hợp và lưu lại.",
        category: "Tổng hợp",
        event_date: "2026-08-05",
        priority: "normal",
        is_pinned: false,
        created_at: "2026-08-05T09:10:00Z"
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

  function formatDate(dateString) {
    if (!dateString) return "Chưa đặt ngày";
    const date = new Date(`${dateString}T00:00:00`);
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  function formatDateRange(start, end) {
    return `${formatDate(start)} — ${formatDate(end)}`;
  }

  function getAnnouncementsForWeek(weekId) {
    return state.announcements
      .filter(item => item.week_id === weekId)
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        if (a.priority !== b.priority) return a.priority === "important" ? -1 : 1;
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => el.toast.classList.remove("show"), 2200);
  }

  function setMessage(element, message = "") {
    element.textContent = message;
  }

  function isAdmin() {
    return Boolean(state.user);
  }

  function renderAdminState() {
    el.adminToolbar.classList.toggle("hidden", !isAdmin());
    el.loginButton.classList.toggle("hidden", isAdmin());
    el.logoutButton.classList.toggle("hidden", !isAdmin());
  }

  function renderConnectionState() {
    if (isConfigured) {
      el.connectionBanner.classList.add("hidden");
      return;
    }

    el.connectionBanner.className = "status-banner warning";
    el.connectionBanner.innerHTML =
      "<strong>Chế độ xem thử:</strong> chưa điền thông tin Supabase trong <code>config.js</code>. " +
      "Dữ liệu bên dưới chỉ là mẫu để xem giao diện.";
  }

  function renderCurrentWeek() {
    const week = state.currentWeek;

    if (!week) {
      el.currentWeekCard.innerHTML =
        '<div class="loading-card">Chưa có tuần hiện tại. Quản trị viên có thể tạo tuần mới.</div>';
      el.currentAnnouncements.innerHTML =
        '<div class="empty-state">Chưa có thông báo nào để hiển thị.</div>';
      return;
    }

    const adminActions = isAdmin()
      ? `<div class="week-admin-actions">
           <button class="button button-secondary button-small" data-action="edit-week" data-id="${escapeHtml(week.id)}">Sửa thông tin tuần</button>
         </div>`
      : "";

    el.currentWeekCard.innerHTML = `
      <div class="week-hero-content">
        <div class="week-number">
          <div>
            <small>Tuần</small>
            <strong>${escapeHtml(week.week_number)}</strong>
          </div>
        </div>
        <div class="week-details">
          <h3>${escapeHtml(week.title || `Tuần ${week.week_number}`)}</h3>
          <p>${escapeHtml(week.summary || "Theo dõi các thông báo mới nhất của tuần này.")}</p>
          <span class="week-date" aria-label="Khoảng thời gian">
            📅 ${escapeHtml(formatDateRange(week.start_date, week.end_date))}
          </span>
          ${adminActions}
        </div>
      </div>
    `;

    const announcements = getAnnouncementsForWeek(week.id);
    el.currentAnnouncements.innerHTML = announcements.length
      ? announcements.map(renderAnnouncementCard).join("")
      : '<div class="empty-state">Tuần này chưa có thông báo. Nội dung mới sẽ xuất hiện tại đây.</div>';
  }

  function renderAnnouncementCard(item, showWeek = false) {
    const week = state.weeks.find(w => w.id === item.week_id);
    const priority = item.priority === "important";
    const weekChip = showWeek && week
      ? `<span class="meta-chip">Tuần ${escapeHtml(week.week_number)}</span>`
      : "";

    const adminButtons = isAdmin()
      ? `
        <button class="button button-secondary button-small" data-action="edit-announcement" data-id="${escapeHtml(item.id)}">Sửa</button>
        <button class="button button-danger button-small" data-action="delete-announcement" data-id="${escapeHtml(item.id)}">Xóa</button>
      `
      : "";

    return `
      <article class="announcement-card ${priority ? "important" : ""}">
        <div class="announcement-inner">
          <div class="announcement-top">
            <div>
              <div class="announcement-title-row">
                ${item.is_pinned ? '<span class="pin" title="Đã ghim" aria-label="Đã ghim">📌</span>' : ""}
                <h3>${escapeHtml(item.title)}</h3>
                ${priority ? '<span class="priority-chip">Quan trọng</span>' : ""}
              </div>
            </div>
          </div>

          <p class="announcement-content">${escapeHtml(item.content)}</p>

          <div class="announcement-meta">
            <span class="meta-chip">📅 ${escapeHtml(formatDate(item.event_date))}</span>
            ${item.category ? `<span class="meta-chip">${escapeHtml(item.category)}</span>` : ""}
            ${weekChip}
          </div>

          <div class="card-actions">
            <button class="button button-secondary button-small" data-action="copy-announcement" data-id="${escapeHtml(item.id)}">Sao chép</button>
            ${adminButtons}
          </div>
        </div>
      </article>
    `;
  }

  function renderArchives() {
    const archivedWeeks = state.weeks
      .filter(week => week.status !== "current")
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

    el.archiveCount.textContent = `${archivedWeeks.length} tuần đã lưu`;

    if (!archivedWeeks.length) {
      el.archiveGrid.innerHTML =
        '<div class="empty-state">Chưa có tuần cũ. Khi tạo tuần mới, các tuần trước sẽ xuất hiện ở đây.</div>';
      return;
    }

    el.archiveGrid.innerHTML = archivedWeeks.map(week => {
      const items = getAnnouncementsForWeek(week.id);
      const preview = items.slice(0, 3);

      return `
        <article class="archive-card">
          <div>
            <div class="archive-summary-head" style="padding:20px 20px 0;">
              <div>
                <h3 class="archive-week-name">Tuần ${escapeHtml(week.week_number)}</h3>
                <span class="archive-date">${escapeHtml(formatDateRange(week.start_date, week.end_date))}</span>
              </div>
              <span class="archive-count-chip">${items.length} thông báo</span>
            </div>

            <div style="padding:0 20px;">
              <p class="archive-summary-text">${escapeHtml(week.summary || "Tuần đã được lưu trữ.")}</p>
              ${
                preview.length
                  ? `<ul class="archive-peek">${preview.map(item => `<li>${escapeHtml(item.title)}</li>`).join("")}</ul>`
                  : '<p class="muted">Không có thông báo trong tuần này.</p>'
              }
            </div>

            <div class="archive-card-footer">
              <button class="text-button" data-action="open-archive" data-id="${escapeHtml(week.id)}">Xem lại →</button>
              ${
                isAdmin()
                  ? `<button class="text-button" data-action="edit-week" data-id="${escapeHtml(week.id)}">Sửa tuần</button>`
                  : ""
              }
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderAll() {
    renderAdminState();
    renderConnectionState();
    renderCurrentWeek();
    renderArchives();
  }

  async function loadData() {
    if (!client) {
      state.weeks = demoData.weeks;
      state.announcements = demoData.announcements;
      state.currentWeek = state.weeks.find(week => week.status === "current") || null;
      renderAll();
      return;
    }

    const [{ data: weeks, error: weeksError }, { data: announcements, error: announcementsError }] =
      await Promise.all([
        client.from("weeks").select("*").order("start_date", { ascending: false }),
        client.from("announcements").select("*").order("created_at", { ascending: false })
      ]);

    if (weeksError || announcementsError) {
      console.error(weeksError || announcementsError);
      el.connectionBanner.className = "status-banner warning";
      el.connectionBanner.textContent =
        "Không tải được dữ liệu. Hãy kiểm tra config.js, bảng dữ liệu và chính sách RLS trong Supabase.";
      return;
    }

    state.weeks = weeks || [];
    state.announcements = announcements || [];
    state.currentWeek = state.weeks.find(week => week.status === "current") || null;
    renderAll();
  }

  async function loadSession() {
    if (!client) {
      state.user = null;
      return;
    }

    const { data, error } = await client.auth.getSession();
    if (error) console.error(error);
    state.user = data?.session?.user || null;
  }

  async function handleLogin(event) {
    event.preventDefault();

    if (!client) {
      setMessage(el.loginMessage, "Hãy kết nối Supabase trước khi đăng nhập.");
      return;
    }

    const formData = new FormData(el.loginForm);
    setMessage(el.loginMessage, "Đang đăng nhập...");

    const { data, error } = await client.auth.signInWithPassword({
      email: formData.get("email"),
      password: formData.get("password")
    });

    if (error) {
      setMessage(el.loginMessage, "Đăng nhập không thành công. Hãy kiểm tra email và mật khẩu.");
      return;
    }

    state.user = data.user;
    setMessage(el.loginMessage, "");
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

    el.announcementForm.reset();
    setMessage(el.announcementMessage, "");

    document.querySelector("#announcement-id").value = item?.id || "";
    document.querySelector("#announcement-title").value = item?.title || "";
    document.querySelector("#announcement-date").value =
      item?.event_date || state.currentWeek?.start_date || new Date().toISOString().slice(0, 10);
    document.querySelector("#announcement-category").value = item?.category || "";
    document.querySelector("#announcement-priority").value = item?.priority || "normal";
    document.querySelector("#announcement-pinned").checked = Boolean(item?.is_pinned);
    document.querySelector("#announcement-content").value = item?.content || "";

    el.announcementDialogTitle.textContent = item ? "Sửa thông báo" : "Đăng thông báo mới";
    el.announcementDialog.showModal();
  }

  async function saveAnnouncement(event) {
    event.preventDefault();

    if (!client || !isAdmin()) {
      setMessage(el.announcementMessage, "Bạn chưa đăng nhập quản trị.");
      return;
    }

    const id = document.querySelector("#announcement-id").value;
    const existing = id ? state.announcements.find(item => item.id === id) : null;

    if (!id && !state.currentWeek) {
      setMessage(el.announcementMessage, "Hãy tạo tuần hiện tại trước khi đăng thông báo.");
      return;
    }

    const payload = {
      week_id: existing?.week_id || state.currentWeek.id,
      title: document.querySelector("#announcement-title").value.trim(),
      content: document.querySelector("#announcement-content").value.trim(),
      category: document.querySelector("#announcement-category").value.trim() || null,
      event_date: document.querySelector("#announcement-date").value,
      priority: document.querySelector("#announcement-priority").value,
      is_pinned: document.querySelector("#announcement-pinned").checked,
      updated_at: new Date().toISOString()
    };

    setMessage(el.announcementMessage, "Đang lưu...");

    const request = id
      ? client.from("announcements").update(payload).eq("id", id)
      : client.from("announcements").insert(payload);

    const { error } = await request;

    if (error) {
      console.error(error);
      setMessage(el.announcementMessage, "Không lưu được. Hãy kiểm tra quyền RLS và dữ liệu.");
      return;
    }

    el.announcementDialog.close();
    if (el.archiveDialog.open) el.archiveDialog.close();
    await loadData();
    showToast(id ? "Đã cập nhật thông báo." : "Đã đăng thông báo.");
  }

  async function deleteAnnouncement(id) {
    if (!client || !isAdmin()) return;
    if (!window.confirm("Bạn chắc chắn muốn xóa thông báo này?")) return;

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

    document.querySelector("#week-id").value = week?.id || "";
    document.querySelector("#week-number").value = week?.week_number || "";
    document.querySelector("#week-title").value = week?.title || "";
    document.querySelector("#week-start").value = week?.start_date || "";
    document.querySelector("#week-end").value = week?.end_date || "";
    document.querySelector("#week-summary").value = week?.summary || "";
    document.querySelector("#week-current").checked = week ? week.status === "current" : true;

    el.weekDialogTitle.textContent = week ? "Sửa thông tin tuần" : "Tạo tuần mới";
    el.weekDialog.showModal();
  }

  async function saveWeek(event) {
    event.preventDefault();

    if (!client || !isAdmin()) {
      setMessage(el.weekMessage, "Bạn chưa đăng nhập quản trị.");
      return;
    }

    const id = document.querySelector("#week-id").value;
    const startDate = document.querySelector("#week-start").value;
    const endDate = document.querySelector("#week-end").value;
    const makeCurrent = document.querySelector("#week-current").checked;

    if (new Date(endDate) < new Date(startDate)) {
      setMessage(el.weekMessage, "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.");
      return;
    }

    const payload = {
      week_number: document.querySelector("#week-number").value.trim(),
      title: document.querySelector("#week-title").value.trim() || null,
      start_date: startDate,
      end_date: endDate,
      summary: document.querySelector("#week-summary").value.trim() || null,
      status: makeCurrent ? "current" : "archived",
      updated_at: new Date().toISOString()
    };

    setMessage(el.weekMessage, "Đang lưu...");

    if (makeCurrent) {
      let archiveQuery = client
        .from("weeks")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("status", "current");

      if (id) archiveQuery = archiveQuery.neq("id", id);

      const { error: archiveError } = await archiveQuery;
      if (archiveError) {
        console.error(archiveError);
        setMessage(el.weekMessage, "Không thể lưu trữ tuần hiện tại.");
        return;
      }
    }

    const request = id
      ? client.from("weeks").update(payload).eq("id", id)
      : client.from("weeks").insert(payload);

    const { error } = await request;

    if (error) {
      console.error(error);
      setMessage(el.weekMessage, "Không lưu được tuần. Hãy kiểm tra dữ liệu và quyền RLS.");
      return;
    }

    el.weekDialog.close();
    await loadData();
    showToast(id ? "Đã cập nhật tuần." : "Đã tạo tuần mới.");
  }

  async function copyAnnouncement(id) {
    const item = state.announcements.find(a => a.id === id);
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

    const items = getAnnouncementsForWeek(week.id);
    el.archiveDialogTitle.textContent = `Tuần ${week.week_number} · ${formatDateRange(week.start_date, week.end_date)}`;
    el.archiveDialogContent.innerHTML = `
      <p class="muted">${escapeHtml(week.summary || "Không có tóm tắt riêng cho tuần này.")}</p>
      <div class="announcement-list">
        ${
          items.length
            ? items.map(item => renderAnnouncementCard(item)).join("")
            : '<div class="empty-state">Tuần này không có thông báo.</div>'
        }
      </div>
    `;
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
        week?.summary
      ].filter(Boolean).join(" "));

      return haystack.includes(q);
    });

    el.searchResultsSection.classList.remove("hidden");
    el.searchResults.innerHTML = results.length
      ? results.map(item => renderAnnouncementCard(item, true)).join("")
      : '<div class="empty-state">Không tìm thấy thông báo phù hợp. Thử một từ khóa ngắn hơn.</div>';

    el.searchResultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearSearch() {
    el.searchInput.value = "";
    el.searchResultsSection.classList.add("hidden");
    el.searchResults.innerHTML = "";
  }

  function handleActionClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "copy-announcement") copyAnnouncement(id);
    if (action === "edit-announcement") {
      const item = state.announcements.find(a => a.id === id);
      if (item) openAnnouncementForm(item);
    }
    if (action === "delete-announcement") deleteAnnouncement(id);
    if (action === "open-archive") openArchive(id);
    if (action === "edit-week") {
      const week = state.weeks.find(w => w.id === id);
      if (week) openWeekForm(week);
    }
  }

  function initTheme() {
    const stored = localStorage.getItem("weekly-board-theme");
    if (stored) document.documentElement.dataset.theme = stored;
    el.themeToggle.querySelector("span").textContent =
      document.documentElement.dataset.theme === "dark" ? "☾" : "☼";

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

    document.querySelector("#new-announcement-button").addEventListener("click", () => openAnnouncementForm());
    document.querySelector("#new-week-button").addEventListener("click", () => openWeekForm());

    el.announcementForm.addEventListener("submit", saveAnnouncement);
    el.weekForm.addEventListener("submit", saveWeek);

    document.addEventListener("click", handleActionClick);

    el.searchForm.addEventListener("submit", event => {
      event.preventDefault();
      runSearch(el.searchInput.value);
    });

    el.clearSearchButton.addEventListener("click", clearSearch);
    document.querySelector("#scroll-top-button").addEventListener("click", () => {
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
    el.connectionBanner.textContent = "Ứng dụng gặp lỗi khi khởi động. Mở DevTools > Console để xem chi tiết.";
  });
})();
