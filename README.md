# Bảng Thông Báo Theo Tuần

Ứng dụng web đơn giản để đăng và xem thông báo theo tuần, phù hợp cho lớp học hoặc trường học.

## Tính năng chính

- Xem thông báo theo tuần
- Tạo nhiều năm học và chọn năm học để xem
- Lưu trữ các tuần cũ, không tự xóa dữ liệu
- Tìm kiếm thông báo
- Phân loại theo chuyên mục
- Đính kèm hình ảnh
- Nhập nhanh nhiều thông báo
- Định dạng nội dung cơ bản
- Giao diện responsive, hỗ trợ dark mode
- Thú cưng Minty theo dõi chuột, chuyển động khi cuộn và thỉnh thoảng hiện danh ngôn học tập
- Admin có thể thêm, sửa, xóa tuần, thông báo và chuyên mục
- Public chỉ xem nội dung

## Công nghệ

- HTML
- CSS
- JavaScript thuần
- Supabase Database
- Supabase Auth
- Supabase Storage
- GitHub Pages

## Cấu hình

Tạo file `config.js` bên cạnh `index.html`:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "YOUR_SUPABASE_URL",
  SUPABASE_KEY: "YOUR_SUPABASE_PUBLISHABLE_KEY"
};
```

Chỉ dùng **publishable/anon key** ở frontend.

Không đưa `service_role` hoặc secret key lên GitHub.

## Chạy ứng dụng

Có thể mở bằng local server hoặc deploy trực tiếp lên GitHub Pages.

Các file chính:

```text
index.html
styles.css
app.js
pet-companion.js
config.js
mint-garden-hero.svg
mint-garden-pattern.svg
```

## Cập nhật GitHub

Khi sửa giao diện hoặc chức năng, chỉ cần thay các file tương ứng trong repository rồi chờ GitHub Pages cập nhật.

## Dữ liệu

Dữ liệu được lưu trên Supabase.

- Năm học cũ vẫn được giữ lại
- Tuần cũ chuyển sang phần Lưu trữ
- Tạo năm học mới không làm mất dữ liệu năm trước
- Không nên xóa tuần cũ nếu muốn giữ lịch sử thông báo

## Bảo mật

Ứng dụng sử dụng Supabase RLS.

Khuyến nghị:

- Public chỉ có quyền đọc
- Chỉ đúng Admin UID được thêm, sửa, xóa
- Tắt public signup nếu chỉ có một Admin
- Không dùng `service_role` ở frontend
- Kiểm tra Security Advisor định kỳ

---

Phiên bản hiện tại: **V3.8**
