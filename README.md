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







## V3.15 — Canvas-style Rich Editor

Phần nhập thông báo được gộp thành một rich editor với 3 chế độ:

- `✏️ Soạn thảo`: `contenteditable`, nhập và định dạng trực quan.
- `</> HTML`: chỉnh HTML nguồn, có số dòng và syntax highlight nhẹ.
- `👁 Xem trước`: xem chính nội dung đã sanitize trước khi lưu.

Ba chế độ dùng cùng một nội dung và đồng bộ hai chiều.

### Toolbar

Toolbar hoạt động theo ngữ cảnh:

- In đậm
- In nghiêng
- Tiêu đề
- Danh sách chấm
- Danh sách số
- Trích dẫn
- Liên kết

Trong Visual mode, toolbar thao tác trực tiếp với vùng soạn thảo.
Trong HTML mode, toolbar chèn thẻ HTML vào source.

### An toàn

Vẫn dùng `content-renderer.js` từ V3.14:

- sanitize HTML khi chuyển chế độ / lưu / hiển thị;
- loại `script`, `style`, `iframe`, `object`, `embed`;
- loại thuộc tính sự kiện `on*`;
- chặn URL `javascript:`, `vbscript:` và `data:`.

Paste HTML vào Visual Editor cũng được sanitize trước khi chèn.

### Clean code

V3.15 tách trách nhiệm rõ hơn:

- `app.js`: workflow ứng dụng, Supabase, CRUD.
- `content-renderer.js`: sanitizer, Markdown cũ, render, plain text.
- `content-renderer.css`: style nội dung đã render.
- `rich-editor.js`: tabs, đồng bộ Visual ↔ HTML ↔ Preview, toolbar, line numbers.
- `rich-editor.css`: toàn bộ UI của trình soạn thảo.

Thông báo Markdown cũ vẫn đọc được. Khi mở và lưu lại trong V3.15,
nội dung được chuẩn hóa sang HTML an toàn.

Không cần migration database mới.


## V3.15.1 — Editor Fix + Cleanup

- `Soạn thảo | HTML` luôn nằm ngang.
- Bỏ `Xem trước` vì `Soạn thảo` đã là WYSIWYG trực quan.
- Bỏ syntax overlay trong HTML editor; code hiển thị trực tiếp và luôn nhìn thấy.
- Giữ số dòng, đồng bộ scroll và phím `Tab` = 2 spaces.
- Xóa các rule `#announcement-content` cũ gây nền textarea che lớp code.
- Xóa code Preview cũ còn sót trong `app.js`.
- Xóa selector `.format-preview-button` đã không còn dùng.

Không thay đổi database, RLS hoặc Edge Function.


## V3.15.2 — Form + HTML Layout Repair

Sửa nguyên nhân thật của lỗi giao diện đăng thông báo:

- `styles.css` có một selector bị đứt sau khi dọn `.format-preview-button`.
  Selector đó vô tình nối với rule `visibility: hidden` của Minty và làm
  input/select/textarea/format button trong dialog bị ẩn.
- Đã sửa selector hỏng và thêm `announcement-form.css` làm layout chuẩn,
  chỉ scope trong `#announcement-dialog`.

Sửa HTML đăng lên bị chuyển thành giao diện dọc:

- sanitizer trước đây bỏ `display`, `flex`, `grid`, `gap`, width/height...
- V3.15.2 cho phép các CSS layout an toàn này.
- Cho phép `<style>` nhưng CSS được sanitize và tự scope vào vùng nội dung,
  không được tác động lên toàn trang.
- Vẫn chặn script, iframe, form controls và mọi thuộc tính `on*`.
- Cho phép `<button>` an toàn (`type="button"`) để làm tab.
- Hỗ trợ tab không cần JavaScript tùy ý với các class/attribute phổ biến:
  `.tabs`, `.tab-buttons`, `.tab-content`, `[role="tab"]`,
  `[role="tabpanel"]`, `data-tab-target`, `aria-controls`.
- Nếu HTML cũ dùng `onclick`, thuộc tính đó vẫn bị bỏ; hệ thống tab nội bộ
  sẽ điều khiển các tab phổ biến theo target hoặc theo thứ tự.

Không thay đổi database, RLS hoặc Edge Function.


## V3.15.3 — Tab Compatibility Fix

Sửa tab dạng danh sách bị hiện thành các dòng dọc có dấu bullet.

Hỗ trợ thêm:

- `<ul class="tabs"><li><a href="#panel">...</a></li></ul>`
- `.nav-tabs`
- `.tab-links`
- `.tab-menu`
- `.tab-nav`
- `.tab-pane`
- `.tabs-content`
- anchor `href="#id"` dùng làm tab
- panel nằm cùng wrapper nhưng không nhất thiết nằm bên trong `<ul class="tabs">`

Editor tự thêm class nội bộ `weekly-tab-list`, `weekly-tab-item`,
`weekly-tab-button` để bỏ bullet và hiển thị thanh tab ngang.

JavaScript tùy ý trong HTML vẫn bị chặn; hệ thống tab nội bộ xử lý
click và bàn phím thay cho `onclick`.
