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


## V3.16.3 — Safe YouTube Embed

Cho phép nhúng YouTube bằng `<iframe>` nhưng chỉ chấp nhận URL HTTPS dạng embed:

- `youtube.com/embed/...`
- `www.youtube.com/embed/...`
- `youtube-nocookie.com/embed/...`
- `www.youtube-nocookie.com/embed/...`

Iframe từ domain khác, HTTP, `javascript:` hoặc URL YouTube không phải `/embed/`
vẫn bị loại.

Embed legacy kiểu `padding-top:56.25%` + iframe `position:absolute` được tự
chuẩn hóa sang khung responsive `aspect-ratio:16/9`.

Iframe được chuẩn hóa thêm `loading="lazy"`, `allowfullscreen`,
`referrerpolicy="strict-origin-when-cross-origin"` và danh sách quyền media an toàn.


## V3.16.4 — Rich Formatting Toolbar

Trình **Soạn thảo** được bổ sung:

- Phông chữ: mặc định, Arial, Verdana, Trebuchet MS, Georgia,
  Times New Roman, Courier New.
- Cỡ chữ: 12–36 px.
- In đậm, in nghiêng, gạch chân, gạch ngang.
- Canh trái, giữa, phải, đều hai bên.
- Màu chữ.
- Màu nền/highlight chữ.
- Xóa định dạng.
- Giữ các chức năng tiêu đề, danh sách, trích dẫn, liên kết,
  tìm & thay thế.

Các định dạng mới sử dụng HTML/CSS an toàn mà sanitizer hiện có
đã cho phép (`font-family`, `font-size`, `color`,
`background-color`, `text-align`, `text-decoration`).

Phần điều khiển nâng cao được tách thành
`editor-formatting.js` và `editor-formatting.css`.


## V3.16.5 — Stable Selection Formatting

Sửa lỗi định dạng lúc được lúc không sau khi bôi đen:

- Editor lưu `selection snapshot` trước khi toolbar/select/color nhận focus.
- Sau khi áp dụng định dạng, selection được khôi phục để có thể bấm tiếp
  màu chữ → highlight → canh lề mà không phải bôi đen lại.
- Áp dụng cho cả Visual và source HTML selection.
- Font/cỡ chữ cũng dùng selection snapshot mới.

UI mới cho Màu & căn:

- Nút `🎨 Màu & căn` mở bảng rõ ràng bên dưới toolbar.
- 4 nút canh lề có icon + chữ: Trái / Giữa / Phải / Đều.
- Palette màu chữ có màu dùng nhanh + màu tùy chọn.
- Palette highlight có màu dùng nhanh + `Bỏ highlight` + màu tùy chọn.
- Mobile chuyển panel thành 1 cột.

Không thay đổi sanitizer, database hoặc Supabase.


## V3.18.1 — Style Merge Fix trên repo hiện tại

Bản này được ghép trực tiếp trên repo hiện tại, không thay repo bằng nhánh
V3.16.x cũ.

Giữ nguyên các tính năng đang có: macOS glossy, floating search island,
sidebar collapse/icon rail, toolbar 2 hàng, popup Màu/Căn kiểu Word,
logical-offset selection, multi-block formatting, Find & Replace,
Diamond Loading, YouTube embed, Tabs và Accordion.

Sửa riêng phần định dạng liên tiếp:

- `Màu → Highlight → Font → Cỡ chữ` trên cùng selection merge vào cùng
  `span[style]` của từng text segment, không tạo thêm lớp style lồng nhau.
- Khi selection chỉ phủ một phần của vùng đã có style, editor vẫn tạo span
  con khi thực sự cần để không làm style lan sang chữ ngoài vùng chọn.
- Chỉ flatten span style thuần có cùng phạm vi; span có class/data/ARIA
  của nội dung người dùng được giữ nguyên.
- Selection được restore đồng bộ ngay sau lệnh format để tránh race khi
  thao tác liên tiếp nhanh.

Không thay đổi `config.js`, database hoặc các tính năng giao diện hiện có.


## V3.18.2 — Canonical HTML Formatting Normalizer

Sửa trường hợp HTML copy/paste hoặc HTML cũ chứa nhiều style lồng nhau như:

`span style -> b -> span style -> br -> span style`.

Editor giờ tự chuẩn hóa trước khi lưu và khi chuyển HTML/Visual:

- Bọc prose inline ở cấp đầu thành block `<p>` khi cần.
- `text-align` được đưa về block (`p`, `li`, `blockquote`...) thay vì nằm trên `span`.
- Style giống nhau trên toàn bộ vùng text được đẩy lên một carrier chung.
- Style con trùng với style cha được bỏ.
- Loại các khai báo dư như `display:inline`,
  `letter-spacing:normal`, `white-space:normal` khi không tạo khác biệt.
- Span rỗng không còn thuộc tính được tháo bỏ.
- Không đụng vào cấu trúc đặc biệt: Tabs, Accordion, table, code,
  details và các interactive HTML hiện có.

Nếu chỉ định dạng một phần nhỏ khác với style chung, một span con vẫn có thể
xuất hiện vì đó là cách HTML cần thiết để override đúng phần chữ đó. Tuy nhiên
các thuộc tính tiếp theo sẽ merge vào chính span con đó, không tạo thêm tầng.


## V3.18.3 — Caret Typing Fix

Sửa lỗi caret trong **Soạn thảo** bị kéo về bên trái sau mỗi ký tự,
khiến ký tự mới có thể xuất hiện theo thứ tự ngược.

Nguyên nhân: HTML normalizer của V3.18.2 chạy trong mỗi `input`, có thể
split/merge/rebuild node rồi restore logical selection cũ.

Bản này:
- keystroke bình thường chỉ mirror HTML sang source;
- không normalize DOM trong từng `input`;
- lưu caret native ngay sau input;
- counter ký tự/từ không mutate Visual DOM;
- full normalizer vẫn chạy ở paste/format/save/chuyển tab;
- đặt base direction LTR rõ ràng cho editor tiếng Việt.
