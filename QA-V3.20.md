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

## V3.21 — Ưu tiên thông tin

- [x] Thẻ ghim/Quan trọng mở sẵn; thẻ thường thu gọn; bấm để đảo trạng thái.
- [x] Chip ngày: "Hôm nay" (đỏ), "Ngày mai"/"Còn 2–3 ngày" (cam), "Còn 4–7 ngày" (xanh); ngày đã qua không gắn nhãn.
- [x] Khung tuần có chip "⚠️ N quan trọng" khi N > 0.
- [x] 1440 / 1280 / 820 / 390px, sáng/tối: không tràn ngang, không lỗi JavaScript.

## V3.22 — Chọn tuần bằng dropdown

- [x] Không còn cột bên phải; Lịch năm học là dải ngang như trước.
- [x] Dropdown Tuần có đủ tuần của năm học đang chọn; tuần đang diễn ra có `●`; nhãn không bị cắt ở thanh bên.
- [x] Chọn tuần đã qua / sắp tới: tiêu đề "Tuần đang xem", nhãn "Đã kết thúc" / "Sắp tới", có nút "Về tuần hiện tại".
- [x] "Về tuần hiện tại", nút "Xem" ở Lịch năm học và đổi năm học đều cập nhật dropdown đúng.
- [x] Tablet: 2 ô cùng hàng trên thanh trên cùng; điện thoại: 2 ô cạnh nhau ở hàng 2.
- [x] Thanh bên thu gọn chỉ hiện biểu tượng 📅.
- [x] 1440 / 820 / 390px, sáng/tối: không tràn ngang, không lỗi JavaScript.

## V3.23 — Bản mẫu Lịch tuần / Bảng ô

- [x] Nút chuyển kiểu hiển thị; lựa chọn được nhớ sau khi tải lại; `?view=` hoạt động.
- [x] Lịch tuần: dải ngày, Cần chú ý (tối đa 5), lọc chuyên mục, nhóm theo ngày, khung đọc, Trước/Sau.
- [x] Chưa đọc: đếm đúng; trên điện thoại chỉ tính đã đọc khi mở khung đọc; Esc / "‹ Danh sách" đóng khung đọc.
- [x] ‹ › đổi tuần, đồng bộ với dropdown Tuần.
- [x] Bảng ô: 8 ô; lọc theo ô chuyên mục; "Đọc ngay" / ô Mới đăng mở đúng thẻ (tự bỏ lọc nếu cần).
- [x] Admin: Sửa/Xóa trong khung đọc và ô tuần; hàng nút Quản trị trên điện thoại không đè nội dung.
- [x] 1440 / 820 / 390px, sáng/tối: không tràn ngang, không lỗi JavaScript.

## V3.24 — Lịch tuần mặc định

- [x] Mở trang vào Lịch tuần; nút chuyển chỉ còn Lịch tuần / Danh sách; `?view=bento` → Lịch tuần.
- [x] Thanh tiến độ: "Ngày 4/6 · còn 2 ngày"; tuần sắp tới "Bắt đầu sau N ngày"; tuần đã qua "Đã kết thúc".
- [x] Khung đọc, Trước/Sau, chưa đọc, lọc chuyên mục, đổi tuần (‹ › và dropdown), tìm kiếm.
- [x] Danh sách: khung tuần + thẻ thu gọn như trước.
- [x] Admin (máy tính và điện thoại): Sửa/Xóa trong khung đọc và đầu tuần; hàng nút Quản trị không đè nội dung.
- [x] 1440 / 820 / 390px, sáng/tối: không tràn ngang, không lỗi JavaScript.
