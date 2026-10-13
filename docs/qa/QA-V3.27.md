# QA V3.27 — Ngày diễn ra, gộp CSS, tách app.js

Chromium (Playwright), Supabase giả lập có hỗ trợ ghi (ghi lại mọi thao tác insert/update/delete).

**Ngày diễn ra**
- [x] Form đăng bài: nhãn "Ngày diễn ra" + hướng dẫn; mặc định hôm nay khi hôm nay thuộc tuần được chọn.
- [x] Chọn tuần khác: ngày mặc định là ngày đầu tuần đó. Nhập nhanh: cùng quy tắc.

**Gộp styles.css + macos-glossy.css → theme.css**
- [x] Computed style của mọi phần tử (kể cả ::before/::after) trong 28 trạng thái
      (Lịch tuần, Danh sách, sáng/tối, Admin, thu gọn thanh bên, đăng nhập, form đăng bài
      + HTML + bảng định dạng + Tìm & thay thế, Chuyên mục, Tuần, Nhập nhanh, Năm học,
      Lưu trữ, tìm kiếm, tablet, điện thoại, khung đọc, form trên điện thoại): 0/32.536 khác.
- [x] Ảnh chụp 17 màn hình + 8 hộp thoại: lệch ≤ 0,002%.

**Tách app.js → js/**
- [x] `node --test tests/agenda.test.cjs`: 7/7 đạt.
- [x] Computed style 0/32.536 khác so với trước khi tách.
- [x] Lịch tuần, Danh sách, khung đọc, chưa đọc, đổi tuần, tìm kiếm, `?view=bento` → Lịch tuần.
- [x] Lịch năm học / Lưu trữ / Sửa tuần; nút B/I/U/S theo con trỏ.
- [x] Luồng Admin cho cùng kết quả như bản cũ: đăng nhập, đăng/sửa/xóa thông báo, sao chép,
      thêm/xóa tuần, nhập nhanh, thêm chuyên mục, tạo năm học, đổi giao diện, đăng xuất.
- [x] Không lỗi JavaScript (ngoài yêu cầu mạng bị chặn trong môi trường thử, giống bản cũ).
- [ ] Chưa thử với dữ liệu Supabase thật.
