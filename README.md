# Bảng thông báo theo tuần — V1

Ứng dụng web HTML/CSS/JavaScript thuần, dùng Supabase để lưu dữ liệu lâu dài.

## Có gì trong V1?

- Tuần hiện tại với số tuần do bạn tự đặt.
- Hiển thị ngày bắt đầu và ngày kết thúc.
- Đăng / sửa / xóa thông báo khi đăng nhập quản trị.
- Khách chỉ xem và sao chép.
- Ghim thông báo và đánh dấu "Quan trọng".
- Khi tạo tuần mới và chọn "Đặt làm tuần hiện tại", tuần hiện tại cũ chuyển thành lưu trữ.
- Tuần cũ có tóm tắt + 3 tiêu đề gần nhất.
- Có cửa sổ xem lại toàn bộ nội dung tuần cũ.
- Tìm kiếm theo tiêu đề, nội dung, chuyên mục, tuần và ngày.
- Giao diện responsive, sáng/tối, có focus bàn phím và reduced motion.
- Nếu chưa cấu hình Supabase, web tự chạy ở chế độ dữ liệu mẫu để xem giao diện.

## Các file

- `index.html`: cấu trúc trang.
- `styles.css`: toàn bộ giao diện.
- `app.js`: logic tuần, thông báo, tìm kiếm, sao chép và đăng nhập.
- `config.js`: nơi điền URL + Publishable/anon key của Supabase.
- `schema.sql`: tạo bảng, index và chính sách RLS.

## Thiết lập Supabase

### 1. Tạo project

Tạo một project mới trên Supabase.

### 2. Chạy database schema

Mở:

`SQL Editor -> New query`

Dán toàn bộ nội dung `schema.sql` và chạy.

### 3. Tạo tài khoản quản trị

Trong Supabase Dashboard, tạo **một tài khoản duy nhất** cho bạn ở phần Authentication / Users.

Bản V1 coi mọi tài khoản `authenticated` là quản trị viên, vì vậy:

**Hãy tắt đăng ký công khai (public sign-up)** và không tạo tài khoản cho người xem.

Người xem không cần đăng nhập.

### 4. Điền thông tin kết nối

Mở `config.js` và thay:

```js
SUPABASE_URL: "YOUR_SUPABASE_URL",
SUPABASE_KEY: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
```

bằng Project URL và **Publishable key / anon key** của project.

Không bao giờ dùng `service_role` key trong mã chạy trên trình duyệt.

### 5. Chạy thử

Có thể mở `index.html`, nhưng cách ổn định hơn là dùng một web server local.

Ví dụ với VS Code:
- cài extension **Live Server**
- mở `index.html`
- chọn **Open with Live Server**

Sau đó đăng nhập bằng nút **Quản trị**.

## Đưa lên Internet

Bạn có thể deploy nguyên thư mục này lên:
- Netlify
- Vercel
- Cloudflare Pages

Không cần backend Node/PHP riêng vì Supabase đảm nhiệm Auth + database.

## Lưu ý bảo mật

Quyền chỉnh sửa không dựa vào việc "ẩn nút" trên HTML.

`schema.sql` bật **Row Level Security (RLS)**:
- `anon`: chỉ SELECT
- `authenticated`: SELECT / INSERT / UPDATE / DELETE

Do đó người xem dù mở DevTools cũng không thể sửa dữ liệu nếu không có phiên đăng nhập hợp lệ.

## Nâng cấp V2 gợi ý

1. Chỉ định chính xác UUID của tài khoản admin trong RLS, thay vì coi mọi authenticated user là admin.
2. Tìm kiếm Full Text Search trên PostgreSQL nếu có hàng nghìn thông báo.
3. Thêm upload file / ảnh minh họa bằng Supabase Storage.
4. Thêm lịch xem theo tháng.
5. Thêm lịch sử phiên bản để khôi phục nội dung đã sửa.
6. Thêm chức năng xuất tuần thành PDF.
