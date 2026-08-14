# Bảng Thông Báo Theo Tuần

Ứng dụng web HTML/CSS/JavaScript + Supabase để quản lý thông báo theo tuần.

## Tính năng

- Thông báo theo tuần và nhiều năm học
- Lưu trữ năm học cũ
- Chuyên mục, tìm kiếm, ảnh đính kèm
- Admin quản lý; Public chỉ đọc
- Responsive + dark mode
- Minty theo dõi chuột, cử động nhẹ khi cuộn
- Click Minty để xem danh ngôn ngay từ thư viện local
- Danh ngôn tự hiện mỗi 60 giây
- Edge Function cập nhật thư viện danh ngôn ở nền
- Không lặp câu đến khi xem hết kho
- Mọi câu đều có nguồn

## Cấu trúc chính

```text
index.html
styles.css
pet-companion.css
app.js
pet-companion.js
config.js
mint-garden-hero.svg
mint-garden-pattern.svg
quote-cache.sql
supabase/
```

## Cấu hình frontend

Sao chép `config.example.js` thành `config.js` và điền:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_KEY: "YOUR_PUBLISHABLE_OR_ANON_KEY"
};
```

Không đưa `service_role` hoặc secret key vào frontend.

## Danh ngôn

Frontend lấy danh ngôn trực tiếp từ `localStorage`, nên click Minty không phải chờ mạng.

Edge Function `learning-quote` chỉ đồng bộ thư viện ở nền:

```text
localStorage
    ↑
learning-quote
    ↑
quote_cache
    ↑
Từ điển danh ngôn
```

Nếu nguồn online lỗi, app tiếp tục dùng cache hoặc thư viện fallback.

## Supabase

Chạy `quote-cache.sql` một lần nếu project chưa có bảng `quote_cache`.

Edge Function nằm tại:

```text
supabase/functions/learning-quote/
```

Function được cấu hình public trong:

```text
supabase/config.toml
```

## Deploy

Frontend có thể chạy trên GitHub Pages.

Phiên bản: **V3.10 Clean Complete**
