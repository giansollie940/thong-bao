// In-browser stand-in for supabase-js, served in place of the jsDelivr script by harness.cjs.
// Ten weeks with week 4 ("w4") always the current week, so the data never goes stale.
// Writes are recorded in window.__FAKE_WRITES; set window.__FAKE_ADMIN = true for a signed-in session.
(() => {
  const iso = d => d.toISOString().slice(0, 10);
  const weeks = [];
  const now = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date()) + "T00:00:00Z");
  const monday = new Date(now.getTime() - ((now.getUTCDay() + 6) % 7) * 864e5);
  const start = new Date(monday.getTime() - 3 * 7 * 864e5);
  const rel = days => iso(new Date(monday.getTime() + days * 864e5));
  for (let i = 0; i < 10; i++) {
    const s = new Date(start.getTime() + i * 7 * 864e5);
    const e = new Date(s.getTime() + 5 * 864e5);
    weeks.push({ id: "w" + (i + 1), week_number: String(i + 1).padStart(2, "0"), title: null,
      school_year: "2026-2027", sequence_number: i + 1, start_date: iso(s), end_date: iso(e),
      summary: i === 3 ? "Tuần kiểm tra giữa kỳ I và họp phụ huynh." : null, status: "active", created_at: "2026-09-01T00:00:00Z" });
  }
  const html = `<!--weekly-html:v1--><p>Nhà trường thông báo lịch <strong>kiểm tra giữa học kỳ I</strong> như sau:</p>
<table><thead><tr><th>Ngày</th><th>Môn</th><th>Thời gian</th></tr></thead>
<tbody><tr><td>05/10</td><td>Toán</td><td>90 phút</td></tr><tr><td>06/10</td><td>Ngữ văn</td><td>90 phút</td></tr><tr><td>07/10</td><td>Tiếng Anh</td><td>60 phút</td></tr></tbody></table>
<p>Học sinh có mặt trước giờ thi <em>15 phút</em>, mang theo thẻ học sinh.</p>`;
  const A = (id, week, title, content, category, extra = {}) => ({ id, week_id: week, title, content, category,
    event_date: rel(3), valid_from: rel(0), valid_until: rel(5), image_path: null, image_alt: null,
    priority: "normal", is_pinned: false, created_at: "2026-09-27T0" + id.length + ":00:00Z", ...extra });
  const announcements = [
    A("a1", "w4", "Lịch kiểm tra giữa học kỳ I", html, "Học tập", { priority: "important", is_pinned: true, event_date: rel(7) }),
    A("a2", "w4", "Họp phụ huynh học sinh đầu năm", "- **Thời gian:** 7h30, Chủ nhật 04/10/2026.\n- **Địa điểm:** Phòng học của lớp.\n- **Nội dung:** Báo cáo kết quả tháng 9, kế hoạch năm học, bầu Ban đại diện CMHS.\n- Phụ huynh vui lòng đến đúng giờ.", "Hoạt động", { event_date: rel(6), priority: "important" }),
    A("a3", "w4", "Nộp Bản cam kết học đường", "- **Yêu cầu:** Học sinh cùng Phụ huynh đọc kỹ và ký tên.\n- **Hạn nộp:** chậm nhất ngày 02/10/2026 cho GVCN.", "Nội quy", { event_date: rel(4) }),
    A("a4", "w4", "Đăng ký câu lạc bộ thể thao", "Học sinh đăng ký tham gia CLB bóng đá, cầu lông, bóng rổ qua Bí thư chi đoàn trước thứ Sáu.", "Hoạt động", { event_date: rel(3) }),
    A("a5", "w3", "Thu học phí tháng 9", "Phụ huynh nộp học phí qua ứng dụng ngân hàng theo hướng dẫn trong thông báo gửi về Zalo lớp.", "Học tập", { event_date: rel(2) }),
    A("a6", "w2", "Khám sức khỏe định kỳ", "Học sinh mặc đồng phục thể dục, có mặt tại phòng y tế theo lịch của lớp.", "Hoạt động", { event_date: rel(0) }),
    A("a7", "w1", "Sinh hoạt dưới cờ chủ đề An toàn giao thông", "Toàn trường chào cờ lúc 7h00 thứ Bảy. Học sinh mặc đồng phục, đội mũ bảo hiểm mẫu.", "Hoạt động", { event_date: rel(5) }),
  ];
  (window.__FAKE_PATCH || (() => {}))({ weeks, announcements, A, iso, rel, now });
  const data = { weeks, announcements, categories: null };
  function q(table) {
    const rows = data[table];
    const res = { data: rows ? rows.slice() : [], error: null };
    const log = (op, payload) => (window.__FAKE_WRITES ||= []).push({ table, op, payload });
    const b = { select: () => b, order: () => b, eq: () => b, in: () => b, neq: () => b, limit: () => b, single: () => b, maybeSingle: () => b,
      insert: x => (log('insert', x), b), update: x => (log('update', x), b), delete: () => (log('delete'), b), upsert: x => (log('upsert', x), b),
      then: (ok, bad) => Promise.resolve(res).then(ok, bad) };
    return b;
  }
  window.supabase = { createClient: () => ({
    from: t => q(t),
    auth: { signInWithPassword: async () => ({ data: { user: { id: "u", email: "a@b" }, session: {} }, error: null }), signOut: async () => ({ error: null }), getSession: async () => ({ data: { session: window.__FAKE_ADMIN ? { user: { id: "u", email: "a@b" } } : null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: "" } }), upload: async () => ({ data: {}, error: null }), remove: async () => ({ error: null }) }) }
  }) };
})();
