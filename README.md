# Bảng Thông Báo Theo Tuần — V3.11

Bản hoàn chỉnh tập trung vào **độ mượt** và **một file SQL duy nhất**.

## Frontend

- `index.html`
- `styles.css`
- `pet-companion.css`
- `app.js`
- `pet-companion.js`
- `config.js` của project hiện tại
- `mint-garden-hero.svg`
- `mint-garden-pattern.svg`

## SQL

Chỉ dùng:

```text
schema.sql
```

`schema.sql` đã gom:

- Schema V1
- Multi-year V2
- Hiệu lực V2.2
- Ảnh V2.4
- Chuyên mục V2.8
- Security hardening Admin-only
- Storage policies
- `quote_cache`

Admin UID hiện được cấu hình là:

```text
fd4c41d6-d19d-4ba4-b708-643094d1e671
```

File được viết theo hướng chạy lại không xóa dữ liệu hiện có.

## Smooth UI

V3.11:

- giảm `backdrop-filter` ở các thành phần lặp/fixed;
- bỏ blur trên card thông báo;
- dùng `content-visibility: auto` cho khu vực năm học/lưu trữ;
- gom nhiều lần `renderAll()` trong cùng frame bằng `requestAnimationFrame`;
- throttle phản ứng cuộn của Minty bằng `requestAnimationFrame`;
- bỏ `filter` toàn khối trên Minty nhưng giữ shadow SVG.

## Auth

Admin tiếp tục dùng `sessionStorage` như V3.10.1.

## Edge Function

Danh ngôn vẫn lấy từ thư viện local; Edge Function cập nhật thư viện ở nền.

Phiên bản: **V3.11.1 Smooth Modal + One SQL**


## V3.11.1 — Smooth Modal

Tối ưu riêng cửa sổ đăng/chỉnh sửa thông báo:

- Chỉ còn một vùng cuộn trong `.modal-card`
- Bỏ blur của backdrop khi cuộn
- Giảm shadow của modal
- `overscroll-behavior: contain`
- Dừng Minty trong lúc dialog mở
- Preview nội dung được gom theo `requestAnimationFrame`
- Mobile giảm thêm shadow để cuộn nhẹ hơn





## V3.14 — Safe HTML Editor

Nút `</> HTML` giờ là chế độ soạn HTML thật:

- Markdown cũ vẫn hoạt động bình thường.
- HTML được đánh dấu nội bộ trong chính cột `content`, nên không cần thêm cột database.
- HTML được sanitize khi lưu và sanitize lần nữa khi render.
- Cho phép bố cục, heading, list, table, link, ảnh, class và style nội tuyến cơ bản.
- Chặn `script`, `style`, `iframe`, `object`, `embed`, form controls, SVG/MathML.
- Chặn mọi thuộc tính sự kiện `on*` như `onclick`, `onerror`, `onload`.
- Chặn URL `javascript:`, `vbscript:` và `data:`.
- Bold / Italic / Heading / List / Quote / Link tự dùng Markdown hoặc HTML theo chế độ editor.
- Search, tự phân loại và Sao chép chỉ dùng plain text, không lấy HTML thô.

### Clean code

Phần nội dung được tách khỏi `app.js`:

- `content-renderer.js`: Markdown, HTML marker, sanitizer, render và plain text.
- `content-renderer.css`: giao diện HTML editor và nội dung HTML.
- `app.js`: workflow ứng dụng và trạng thái editor.

Không cần chạy migration database mới.
