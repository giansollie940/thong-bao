# Bảng Thông Báo Theo Tuần — V3.16

V3.16 là bản gom ổn định sau chuỗi V3.15.x, tập trung vào ba phần:
**Rich Editor**, **Tabs** và **Accordion**.

## Cấu trúc frontend

```text
index.html
styles.css
controls.css
announcement-form.css
rich-editor.css
rich-editor.js
content-renderer.css
content-renderer.js
content-interactions.css
content-interactions.js
app.js
pet-companion.css
pet-companion.js
favicon.ico
favicon.png
favicon-64.png
mint-garden-hero.svg
mint-garden-pattern.svg
config.example.js
schema.sql
supabase/
```

### Phân trách nhiệm

- `app.js`: dữ liệu, Supabase, CRUD, render ứng dụng.
- `content-renderer.js`: sanitize HTML, Markdown cũ, render và plain text.
- `content-interactions.js`: tabs + accordion sau khi nội dung đã render.
- `content-renderer.css`: kiểu chữ/bảng/ảnh của nội dung.
- `content-interactions.css`: giao diện tabs + accordion.
- `rich-editor.js`: editor Soạn thảo ↔ HTML.
- `rich-editor.css`: giao diện editor.
- `announcement-form.css`: layout riêng của form đăng/chỉnh sửa thông báo.

V3.16 không còn nhét Tabs/Accordion vào `content-renderer.js`, nên phần
sanitize và phần tương tác không phụ thuộc lẫn nhau.

## Rich Editor

Editor có hai chế độ nằm ngang:

```text
✏️ Soạn thảo | </> HTML
```

- Visual và HTML đồng bộ hai chiều.
- HTML luôn sanitize khi đổi chế độ và khi lưu.
- Code HTML hiển thị trực tiếp, không dùng lớp text trong suốt.
- Có số dòng và Tab = 2 spaces.
- Heading trong Visual được đổi theo block, tránh tạo `<h3>` nằm sai bên trong `<p>`.

## Tabs

V3.16 dùng một adapter runtime riêng và scope từng `.announcement-content`.
Mỗi khung thông báo hoạt động độc lập, kể cả khi nhiều khung dùng cùng ID
`#fragment-1`, `#fragment-2`...

Đã hỗ trợ:

- Canvas LMS legacy `.enhanceable_content.tabs`
- Bootstrap `.nav-tabs`, `.nav-pills`, `.tab-pane`
- WAI-ARIA `role="tablist"`, `role="tab"`, `aria-controls`
- Foundation `.tabs-title`, `.tabs-panel`
- Generic `data-tab-target`, `data-target`
- Semantic-style `data-tab`

Mobile giữ tab trên một hàng và cho cuộn ngang.

## Accordion

Đã hỗ trợ:

- Native `<details><summary>`
- `<details name="...">`
- WAI-ARIA accordion/disclosure
- Bootstrap Collapse / Accordion
- Foundation Accordion
- Generic `data-collapse-target`, `data-accordion-target`
- Single-open bằng `data-accordion-single` hoặc `data-accordion-mode="single"`

Tên nhóm `details[name]` được namespace theo từng khung thông báo ở runtime,
nên mở accordion trong thông báo A không làm đóng accordion cùng tên ở thông báo B.

## HTML an toàn

Sanitizer vẫn chặn:

- `<script>`, iframe, object, embed, form controls nguy hiểm
- thuộc tính `onclick`, `onerror`, các thuộc tính `on*`
- URL `javascript:`, `vbscript:`, `data:`
- CSS nguy hiểm như `url(...)`, `expression(...)`, `@import`

Các thuộc tính layout an toàn như `display`, flex/grid, gap, width/height,
alignment... được giữ để giao diện HTML không bị biến từ ngang thành dọc.

`<style>` được sanitize và scope trong nội dung thông báo.

## Database

V3.16 **không thay đổi schema**. Tiếp tục dùng:

```text
schema.sql
```

Không cần chạy migration mới khi nâng từ V3.15.8.

## Deploy GitHub Pages

1. Giữ lại `config.js` đang chạy trên repo hiện tại.
2. Thay các file frontend bằng bản V3.16.
3. Đảm bảo có thêm:
   - `content-interactions.js`
   - `content-interactions.css`
4. Không đưa service-role key, admin password hoặc secret key lên GitHub.

`config.example.js` chỉ là file mẫu; `config.js` thật không nằm trong ZIP này.

## QA

Xem `QA-V3.16.md` để biết các bài kiểm thử đã chạy.


## V3.16.1 — Find & Replace

Trình đăng thông báo có thêm `🔎 Tìm & thay thế`.

- `Ctrl/Cmd + F`: mở Tìm & thay thế.
- `Ctrl/Cmd + H`: mở và chuyển thẳng đến ô Thay bằng.
- `Enter`: kết quả tiếp theo; `Shift + Enter`: kết quả trước.
- Soạn thảo trực quan: tìm/thay chữ hiển thị và giữ nguyên các thẻ định dạng xung quanh.
- HTML: tìm/thay trực tiếp trong source HTML.
- Hỗ trợ phân biệt hoa/thường, Thay một kết quả và Thay tất cả.

Tính năng được tách riêng thành `editor-find-replace.js/css` để không làm phình `rich-editor.js`.


## V3.16.2 — Diamond Loading Animation

- Loader kim cương xuất hiện khi app khởi động và khi `loadData()` mất đủ lâu để người dùng nhận thấy.
- Lần tải sau có delay ngắn để tránh nhấp nháy nếu dữ liệu trả về rất nhanh.
- Có thời gian hiển thị tối thiểu để animation không bị giật.
- Hỗ trợ light/dark theme và `prefers-reduced-motion`.
- `role="status"`, `aria-live="polite"`, `aria-busy` được dùng cho accessibility.
- Tách riêng `loading-diamond.js/css`, không đưa animation vào `app.js`.
