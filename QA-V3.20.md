# QA V3.20 — Dashboard Layout

Kiểm thử bằng Chromium (Playwright) với Supabase giả lập (10 tuần, 7 thông báo, có bảng HTML).

- [x] 1440px và 1280px, sáng/tối: 2 cột; cột Lịch năm học dính khi cuộn, chỉ danh sách tuần cuộn, tuần hiện tại nằm giữa.
- [x] Minty không che cột lịch (cột ngắn lại khi Minty đang hiện).
- [x] 820px / 390px: một cột như cũ, không tràn ngang; dải tuần cuộn tới tuần hiện tại.
- [x] Thẻ mặc định thu gọn; nội dung ẩn có `visibility: hidden` (không lọt Tab).
- [x] Bấm chuột và phím Enter mở/thu gọn; `aria-expanded` cập nhật đúng.
- [x] Mở tất cả ↔ Thu gọn tất cả; nút ẩn khi danh sách có dưới 2 thẻ.
- [x] Trạng thái mở giữ nguyên khi đổi bộ lọc chuyên mục.
- [x] Kết quả tìm kiếm và hộp thoại lưu trữ dùng cùng thẻ thu gọn; không trùng `id`.
- [x] Đoạn xem trước của nội dung HTML có bảng không bị dính chữ.
- [x] Chế độ Admin: nút Sửa/Xóa nằm trong phần mở rộng của thẻ.
- [x] Chỉ còn ô Năm học ở thanh bên hiển thị.
- [x] Không có lỗi JavaScript.
