// data.js — Tải dữ liệu từ Supabase (hoặc dữ liệu mẫu khi chưa cấu hình) và đăng nhập Admin.

import {
  DEFAULT_CATEGORIES
} from "./categories.js";
import {
  appLoader,
  client,
  el,
  state
} from "./core.js";
import {
  scheduleRenderAll
} from "./render.js";
import {
  setMessage,
  showToast
} from "./utils.js";
import {
  defaultSchoolYearKey,
  displayedWeek,
  getSchoolYearGroups
} from "./weeks.js";

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

export async function loadData() {
  const endLoading = appLoader?.begin({
    title: "Đang tải bảng thông báo",
    message: "Đang đồng bộ tuần, thông báo và chuyên mục...",
    delay: 120,
    minimum: 260,
    blocking: false
  });

  try {
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

    const groups = getSchoolYearGroups();
    if (!groups.some(group => group.key === state.activeSchoolYear)) {
      state.activeSchoolYear = defaultSchoolYearKey(groups);
    }
    state.yearFilter = state.activeSchoolYear;
    state.archiveYearFilter = state.activeSchoolYear;
    [state.currentWeek, state.currentWeekState] = displayedWeek();
    scheduleRenderAll();
  } finally {
    endLoading?.();
  }
}

export async function loadSession() {
  if (!client) return;
  const { data, error } = await client.auth.getSession();
  if (error) console.error(error);
  state.user = data?.session?.user || null;
}

export async function handleLogin(event) {
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

export async function handleLogout() {
  if (!client) return;
  await client.auth.signOut();
  state.user = null;
  scheduleRenderAll();
  showToast("Đã đăng xuất.");
}
