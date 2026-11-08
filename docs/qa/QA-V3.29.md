# QA V3.29 — Dán ảnh vào thông báo, hộp nhập liệu không tự đóng

- [x] Viết `tests/browser/editor-paste.cjs` trước; chạy trên code cũ thì thất bại (bấm ra ngoài / Esc làm đóng hộp).
- [x] Bấm ra ngoài và nhấn Esc: hộp đăng thông báo vẫn mở, phần đã nhập còn nguyên.
- [x] Dán ảnh trong chế độ Soạn thảo: ảnh tải lên bucket `announcement-images`, chèn `<img>` đúng chỗ, không còn ô chờ.
- [x] Ảnh chụp màn hình 5 MB (2400×1600) được đổi thành WebP khoảng 0,9 MB trước khi tải lên.
- [x] Dán ảnh trong chế độ HTML: chèn thẻ `<img>` tại con trỏ.
- [x] Ảnh tải chậm: có ô "Đang tải ảnh…"; bấm Lưu thì được nhắc chờ và không lưu; không đổi được sang HTML; tải xong thì Lưu được.
- [x] Lưu: nội dung có ảnh, hộp đóng. ×: hộp đóng. Hộp Lưu trữ (chỉ xem) vẫn đóng khi bấm ra ngoài.
- [x] Người đọc thấy ảnh đã dán ở Lịch tuần và Danh sách.
- [x] `node --test tests/agenda.test.cjs` 13/13; `smoke.cjs`, `admin-flow.cjs`, `editor-paste.cjs` đạt, không lỗi JavaScript.
- [x] Sửa dữ liệu giả của test cho Chủ nhật (trước đó `smoke.cjs` thất bại vào Chủ nhật ngay cả trên `main`).
