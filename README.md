# Bảng Thông Báo Theo Tuần — V3.26

Ứng dụng web tĩnh (GitHub Pages) hiển thị thông báo của trường theo tuần,
dữ liệu lưu trên Supabase. Giao diện mặc định là **Lịch tuần**: tuần chia theo ngày,
khối "Cần chú ý" và khung đọc nội dung; **Danh sách** là kiểu hiển thị phụ.

## Cấu trúc frontend

```text
index.html                    khung trang, hộp thoại, thứ tự nạp CSS/JS
config.js                     URL + publishable key của Supabase (không chứa secret)

app.js                        dữ liệu, Supabase, CRUD, render; Lịch tuần (mục "View modes")
content-renderer.js / .css    sanitize + render nội dung thông báo (HTML/Markdown)
content-interactions.js / .css  Tabs + Accordion trong nội dung
rich-editor.js / .css         trình soạn thảo Soạn thảo ↔ HTML
editor-formatting.js / .css   thanh định dạng (font, cỡ, màu, căn lề, B/I/U/S)
editor-find-replace.js / .css Tìm & thay thế trong trình soạn thảo
loading-diamond.js / .css     hiệu ứng tải
sidebar-collapse.js           thu gọn thanh bên, ô tìm kiếm nổi
pet-companion.js / .css       Minty

styles.css                    lớp giao diện gốc (V2.x–V3.x)
controls.css                  nút, ô nhập
announcement-form.css         form đăng/sửa thông báo
macos-glossy.css              lớp giao diện macOS (V3.17–V3.18)
app-layout.css                bố cục hiện tại (V3.19+), nạp sau cùng

mint-garden-hero.webp         ảnh khung tuần
mint-garden-pattern.webp      nền lặp
favicon.ico / favicon.png / favicon-64.png
docs/qa/                      danh sách kiểm thử từng phiên bản
```

CSS được nạp theo thứ tự trong `index.html`; file sau ghi đè file trước.
Chỉnh giao diện hiện tại trong `app-layout.css`.

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

Dùng các bảng `weeks`, `announcements`, `categories` và bucket ảnh
`announcement-images` trên Supabase. Từ V3.16 đến V3.26 **không thay đổi schema**.

## Deploy GitHub Pages

1. Giữ nguyên `config.js` đang chạy.
2. Gộp nhánh vào `main`; GitHub Pages tự cập nhật.
3. Không đưa service-role key, admin password hoặc secret key lên GitHub.

Mỗi lần đổi CSS/JS, tăng số `?v=` trong `index.html` để trình duyệt tải bản mới.

## QA

Danh sách kiểm thử từng phiên bản nằm trong `docs/qa/`.


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


## V3.19 — UI Polish

Sửa các lỗi giao diện còn sót lại do nhiều lớp CSS chồng nhau.
Phần sửa được tách riêng vào `ui-polish.css` (nạp sau cùng), không đổi JS,
database hay `config.js`.

- **Hero tuần hiện tại:** thêm lớp phủ xanh đậm phía sau chữ để chữ trắng
  đọc rõ trên nền Mint Garden sáng; chip ngày/năm học/số thông báo dùng nền tối hơn.
- **Minty:** chuyển xuống góc phải dưới, không còn đè lên badge "Tuần gần nhất",
  ô tìm kiếm hay tiêu đề mục; footer chừa chỗ cho Minty.
- **Header tablet/điện thoại:** gọn lại một hàng (logo · điều hướng · năm học ·
  giao diện/đăng nhập); dưới 480px năm học xuống hàng riêng toàn chiều rộng.
  Header không còn sticky để ô tìm kiếm nổi luôn hiển thị khi cuộn
  (trước đây bị header che mất).
- **Hero trên điện thoại:** ô số tuần nhỏ lại (72px) để tiêu đề và mô tả có đủ chỗ.
- **Dark mode:** số đếm trên chip chuyên mục đọc được (trước là chữ sáng trên nền sáng).


## V3.20 — Dashboard Layout

Bố cục mới theo dạng dashboard, phần lớn bằng CSS trong `dashboard-layout.css`;
`app.js` chỉ thêm phần thu gọn/mở rộng thẻ thông báo. Không đổi database hay `config.js`.

- **Máy tính (≥1180px) chia 2 cột:** bên trái là tuần hiện tại và danh sách thông báo,
  có độ rộng vừa phải nên dễ đọc. Bên phải là **Lịch năm học**, dính theo khi cuộn,
  hiển thị mỗi tuần thành một dòng gọn, tuần hiện tại được tô nổi bật và tự cuộn vào giữa.
  **Lưu trữ** nằm bên dưới, dạng lưới gọn hơn.
- **Thẻ thông báo thu gọn:** mặc định chỉ hiện tiêu đề, chuyên mục, 2 dòng xem trước
  và ngày/hiệu lực. Bấm vào tiêu đề (hoặc Enter/Space) để mở đầy đủ nội dung, ảnh và nút
  Sao chép/Sửa/Xóa. Nút **Mở tất cả / Thu gọn tất cả** ở đầu danh sách. Trạng thái mở
  được giữ khi đổi bộ lọc chuyên mục.
- **Một ô Năm học duy nhất:** chỉ còn ô ở thanh bên; ô trùng ở Lịch năm học và Lưu trữ
  được ẩn (vẫn đồng bộ theo ô thanh bên).
- Điện thoại/tablet giữ thứ tự một cột; dải tuần ngang tự cuộn tới tuần hiện tại.
- Sửa lỗi cũ: `map(announcementCard)` truyền nhầm chỉ số làm `showWeek`, khiến các
  thẻ (trừ thẻ đầu) hiện thừa chip "Đăng tại Tuần …".


## V3.21 — Ưu tiên thông tin

- Thông báo **được ghim** hoặc **Quan trọng** mở sẵn; các thông báo khác thu gọn.
  Người xem vẫn mở/thu gọn tùy ý, trạng thái được giữ khi đổi bộ lọc.
- Chip ngày ghi thêm **Hôm nay / Ngày mai / Còn N ngày** (trong 7 ngày tới),
  tô đỏ, cam hoặc xanh theo mức gấp.
- Thẻ Quan trọng có viền cam để nổi bật ngay cả khi đang thu gọn.
- Khung tuần hiện tại thấp hơn trên máy tính, có thêm chip **⚠️ N quan trọng**.
  Bỏ chip năm học vì đã có ô Năm học ở thanh bên; trên điện thoại bỏ dòng trạng thái
  trùng với nhãn cạnh tiêu đề.


## V3.22 — Chọn tuần bằng dropdown

Bỏ cột "Lịch năm học" bên phải của V3.20; trang chính quay lại một cột.

- Dưới ô **Năm học** ở thanh bên có ô **Tuần** dạng dropdown, liệt kê các tuần của năm học
  đang chọn (`Tuần 04 · 28/09–03/10`, dấu `●` là tuần đang diễn ra).
- Chọn một tuần thì phần chính hiển thị tuần đó: tiêu đề đổi thành **Tuần đang xem**,
  nhãn trạng thái đổi theo ("Đã kết thúc" / "Sắp tới"), và có nút **↩ Về tuần hiện tại**.
- Trên tablet, hai ô Năm học và Tuần nằm cùng hàng trên thanh trên cùng; trên điện thoại,
  chúng nằm cạnh nhau ở hàng thứ hai.
- Nút **Xem** trong mục Lịch năm học cũng chọn tuần theo cách này (không mở hộp thoại nữa).
- Tuần đang chọn được giữ khi dữ liệu tải lại; đổi năm học sẽ quay về tuần hiện tại.
- Mục **Lưu trữ** vẫn mở hộp thoại "Xem lại" như trước.


## V3.23 — Bản mẫu hai kiểu hiển thị mới (để chọn)

Nút **☰ Danh sách · 🗓 Lịch tuần · ▦ Bảng ô** ở đầu mục Tuần hiện tại. Mặc định vẫn là
Danh sách; lựa chọn được nhớ trên máy người xem (có thể mở thẳng bằng `?view=agenda` hoặc
`?view=bento`). Code nằm trong `app.js` (mục "V3.23 — View modes") và `view-modes.css`.

**🗓 Lịch tuần** (hướng 2 + 1):
- Thanh **‹ Tuần 04 ›** để chuyển tuần; dải ngày T2 → T7, hôm nay tô xanh, chấm màu theo chuyên mục.
- Khối **⚠ Cần chú ý**: thông báo quan trọng/ghim và sự kiện trong 3 ngày tới.
- Danh sách gọn nhóm theo ngày diễn ra ("Đang có hiệu lực", từng ngày, "Sắp tới") và
  **khung đọc** bên phải với nút Trước/Sau. Trên điện thoại khung đọc mở toàn màn hình.
- Chấm xanh **chưa đọc**: lưu trên trình duyệt của người xem (localStorage), không lưu lên Supabase.

**▦ Bảng ô** (hướng 3):
- Ô tuần có ‹ › chuyển tuần, thanh tiến độ "Ngày 4/6", số thông báo / quan trọng.
- Ô **Quan trọng nhất**, ô **Sắp diễn ra** (7 ngày tới, đếm ngược), ô **Mới đăng**.
- Ô chuyên mục có số lượng, bấm để lọc danh sách thẻ bên dưới; "Đọc ngay" mở và cuộn tới thẻ.

Sửa thêm: trên điện thoại/tablet, khung Quản trị trước đây luôn mở đè lên đầu trang;
giờ là một hàng nút gọn dưới thanh trên cùng.


## V3.24 — Lịch tuần là giao diện mặc định

Chọn hướng **Lịch tuần theo ngày + khung đọc** sau khi so sánh hai bản mẫu của V3.23.

- Mặc định mở **🗓 Lịch tuần**; **☰ Danh sách** (thẻ thu gọn như V3.21) vẫn là lựa chọn phụ,
  được nhớ trên máy người xem. Link cũ `?view=bento` tự chuyển về Lịch tuần.
- Bỏ chế độ **Bảng ô**; chỉ giữ thanh tiến độ tuần **"Ngày 4/6 · còn 2 ngày"**, đặt cạnh ‹ Tuần ›.
- Khối "Cần chú ý" chia 2 cột trên màn hình rộng; tuần không có thông báo không hiện chip đã đọc.


## V3.25 — Khung đọc rộng hơn trên laptop

- Cột danh sách trong Lịch tuần co theo màn hình (≈32%, 280–420px) thay vì cố định 400px.
- Lề trang mỏng hơn; giới hạn chiều rộng nội dung tăng từ 1260px lên 1480px.
- Khung đọc: 1280px 525 → 644px, 1366px 611 → 700px, 1440px 685 → 748px, 1920px 772 → 990px.


## V3.26 — Tối ưu giao diện và làm sạch code

**Giao diện**
- Lịch năm học: thẻ tuần gọn (tuần, trạng thái, ngày, số thông báo), bấm cả thẻ để xem;
  tuần đang xem được viền xanh và dải tự cuộn tới.
- Lưu trữ: thẻ gọn một khối (tuần, ngày, 2 tiêu đề đầu), bấm cả thẻ để "Xem lại";
  trên điện thoại cao khoảng 70px thay vì khoảng 350px.
- Tuần không có thông báo: chỉ hiện một dòng "Tuần này chưa có thông báo.",
  không còn chip "Tất cả 0" và khung đọc trống.
- Chân trang có màu nền cho chế độ tối; bỏ dải nền thừa sau dải thẻ tuần.
- Trình soạn thảo: nút B / I / U / S sáng theo định dạng tại vị trí con trỏ
  (hàm đã có nhưng trước đây chưa được gọi).

**Hiệu năng**
- Ảnh nền SVG (2,6 MB + 110 KB) đổi sang WebP (71 KB + 4 KB).
- Favicon 512px (412 KB × 2) thu về 192px/64px; `favicon.ico` 232 KB → 9 KB.
- Tổng dung lượng ảnh khoảng 3,8 MB → 140 KB.

**Làm sạch code**
- CSS: bỏ khoảng 4.100 dòng: rule cho giao diện cũ không còn phần tử nào dùng
  (header, hero, search-panel, toolbar V2.x…) và khai báo bị ghi đè hoàn toàn
  bởi rule cùng selector nạp sau. Kiểm chứng bằng ảnh chụp 17 trạng thái trước/sau.
- Gộp `ui-polish.css`, `dashboard-layout.css`, `view-modes.css`,
  `floating-search-island.css` thành `app-layout.css`; CSS ô tìm kiếm nạp tĩnh thay vì bằng JS.
- Bỏ inline style trong thẻ Lưu trữ; bỏ hàm `currentHtml` không dùng.
- Dùng chung một số phiên bản `?v=3.26.0` cho mọi file CSS/JS; QA chuyển vào `docs/qa/`.
