# QA V3.28 — Banner gọn trên Lịch tuần

- [x] Viết kiểm thử trước (thất bại), sau khi sửa: `node --test tests/agenda.test.cjs` 13/13 đạt.
      Banner hiện tóm tắt tuần (đã escape HTML); tuần không có tóm tắt thì không có dòng trống.
- [x] 1440px: banner cao 113px, hình trường thấy rõ bên phải; thông báo đầu tiên xuống 48px so với V3.27.2.
- [x] 390px: banner cao 107px; thông báo đầu tiên xuống 12px.
- [x] Chế độ tối: nền banner đậm hơn, chữ trắng đọc rõ.
- [x] Admin: nút Sửa tuần / Xóa tuần có nền đậm, đọc rõ trên phần ảnh sáng (1440px và 390px).
- [x] `tests/browser/smoke.cjs` và `tests/browser/admin-flow.cjs` đạt, không lỗi JavaScript.
- [x] Kiểu Danh sách không đổi (banner đầy đủ như cũ).
