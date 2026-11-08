# QA V3.30 — Tệp đính kèm cho thông báo

- [x] Viết `tests/browser/attachments.cjs` trước; chạy trên code cũ thì thất bại (chưa có danh sách tệp).
- [x] Người đọc (Lịch tuần, Danh sách): thấy 📎 Tệp đính kèm, tên hiện như chữ (đã escape `<HK1>`), dung lượng, link mở tab mới đúng địa chỉ công khai; dòng Lịch tuần có "📎 2".
- [x] Admin: chọn PDF + DOCX + EXE + PDF 10 MB+1 KB → chỉ nhận 2 tệp hợp lệ, báo tên 2 tệp bị từ chối; bỏ được 1 tệp.
- [x] Lưu: tải tệp lên bucket `announcement-files`, khóa Storage chỉ ASCII, dữ liệu lưu tên gốc/dung lượng/loại.
- [x] Sửa: thấy tệp đã lưu; bỏ 1 tệp rồi lưu → dữ liệu còn 1 tệp, tệp bị bỏ được xóa khỏi Storage.
- [x] Xóa thông báo → xóa luôn các tệp của nó.
- [x] Database chưa có cột `attachments`: mục Tệp đính kèm ẩn, đăng bài vẫn lưu được và không gửi trường đó.
- [x] `node --test tests/agenda.test.cjs`, `smoke.cjs`, `admin-flow.cjs`, `editor-paste.cjs`, `attachments.cjs` đạt, không lỗi JavaScript.
- [ ] Chưa thử với Supabase thật: cần người dùng chạy `docs/sql/V3.30-attachments.sql` rồi thử đăng một tệp.
