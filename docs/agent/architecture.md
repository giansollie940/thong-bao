# Kiến trúc và các bẫy

Bản đồ từng file nằm ở README, mục **"Cấu trúc frontend"**. Tài liệu này ghi những gì
không tự đọc ra được từ cấu trúc thư mục.

## Cách trang chạy

1. `index.html` nạp lần lượt: supabase-js từ jsDelivr, `config.js`, các script thường
   (`content-renderer.js`, `content-interactions.js`, `rich-editor.js`, `editor-*.js`,
   `loading-diamond.js`, `sidebar-collapse.js`), sau đó `js/main.js` dạng module, cuối cùng
   `pet-companion.js`. Các script thường gắn biến toàn cục `window.WeeklyContent`,
   `window.WeeklyInteractions`, `window.WeeklyLoader`, và `js/core.js` dừng ngay nếu thiếu chúng.
2. `js/main.js` gọi `init()`: gắn sự kiện, `initEditors()`, rồi `js/data.js` tải **toàn bộ**
   ba bảng (`weeks` theo `start_date`, `announcements` theo `created_at` giảm dần, `categories`
   theo `sort_order`) vào `state` trong `js/core.js`.
   Nếu `config.js` chưa điền, app dùng dữ liệu mẫu `demoData` trong `data.js`.
3. Mọi thao tác render đều đọc từ `state`. Thêm, sửa hay xóa xong thì tải lại dữ liệu và render lại toàn bộ.
4. Nút bấm dùng `data-action="…"`. Tất cả đi qua một hàm `handleAction` trong `main.js`.

Session Admin lưu trong `sessionStorage` (`core.js` xóa token cũ còn sót trong `localStorage`).
Cột của bảng thì xem payload ghi trong `js/admin.js` (thông báo, tuần) và `js/categories.js`.
Ảnh được lưu ở bucket `announcement-images`.

## Ngày tháng

- Ngày lưu dạng chuỗi `YYYY-MM-DD` và được so sánh như chuỗi. `created_at` là timestamp ISO.
- "Hôm nay" luôn lấy từ `todayIso()` trong `js/utils.js`, theo múi giờ **Asia/Ho_Chi_Minh**,
  không theo giờ của máy.
- Tuần chính hiển thị trên trang được chọn bằng `chooseFeaturedWeek()` trong `js/weeks.js`.
  **Từ thứ Bảy, nếu đã có tuần kế tiếp thì trang hiện tuần kế tiếp.** Lúc đó hôm nay không nằm
  trong tuần đang xem, nên Lịch tuần không có nhóm "Hôm nay".

## Thông báo nào thuộc tuần nào: `getItems(weekId)` trong `js/weeks.js`

- Thông báo có `valid_from` hoặc `valid_until` sẽ hiện ở **mọi tuần** có khoảng ngày giao với
  khoảng hiệu lực, miễn là cùng năm học với tuần gốc. Thông báo không có hai cột này chỉ hiện
  ở tuần có `week_id` của nó.
- Thứ tự cơ bản: ghim → quan trọng (`priority === "important"`) → `created_at` mới nhất.

## Thứ tự hiển thị

Lịch tuần (`agendaHtml` trong `js/agenda.js`). Người dùng đã yêu cầu thứ tự này, xem `decisions.md`:

1. **🆕 Mới đăng**: bài có `created_at` trong 24 giờ qua (`isFreshlyPosted` trong `weeks.js`),
   bài mới nhất trước. Những bài này không lặp lại ở nhóm ngày.
2. Các nhóm ngày. Với tuần đang diễn ra: **hôm nay**, rồi các ngày sắp tới, rồi các ngày đã qua
   (ngày gần nhất trước). Với tuần đã qua hoặc tuần sắp tới: thứ Hai → thứ Bảy.
   Một thông báo thuộc nhóm ngày theo `event_date` ("Ngày diễn ra").
3. **Đang có hiệu lực**: `event_date` trước tuần hoặc để trống.
4. **Sắp tới (sau tuần này)**: `event_date` sau tuần.

Trong mỗi nhóm, giữ nguyên thứ tự của `getItems`. Khung đọc và nút Trước/Sau đi theo đúng
thứ tự trên (mảng `agendaItems`). Dải ngày ở trên cùng luôn theo thứ tự lịch.

Danh sách (`renderCurrent` trong `js/render.js`) dùng `newestFirst()`: ghim trước, sau đó bài mới đăng nhất.

## CSS

Thứ tự nạp trong `index.html`: controls → content-renderer → content-interactions →
rich-editor → editor-formatting → editor-find-replace → loading-diamond → announcement-form →
**theme.css** → pet-companion → **app-layout.css**. File nạp sau ghi đè file nạp trước.

- Giao diện hiện tại sửa trong `app-layout.css` (V3.19 trở đi), vì file này nạp sau cùng.
- `theme.css` là lớp giao diện cũ, gộp từ `styles.css` và `macos-glossy.css`.
- Phần **đầu** của `controls.css`, `rich-editor.css` và `content-renderer.css` chứa các rule nền
  được chuyển từ theme.css sang. Phải để chúng ở đầu file thì rule phía sau mới ghi đè được như trước.
- Màu dùng biến CSS. Chế độ tối dùng `:root[data-theme="dark"]`.
- Hai kiểu xem: `.vm-*` là Lịch tuần (agenda.js). `.announcement-*` là thẻ của Danh sách (render.js).

## Nội dung thông báo và bảo mật

`content-renderer.js` sanitize mọi nội dung trước khi render (chặn script, `on*`, `javascript:`,
CSS nguy hiểm). Nội dung bắt đầu bằng `<!--weekly-html:v1-->` là HTML, còn lại là Markdown.
Khi sửa sanitizer, kiểm lại các mục trong README: "HTML an toàn", "Tabs", "Accordion".

## Lưu trên trình duyệt (localStorage)

`weekly-board-view` (agenda | list), `weekly-board-read-v1` (các bài đã đọc), `weekly-board-theme`,
`weeklyBoardPetHidden` (ẩn Minty), `weekly-sidebar-collapsed` (thu gọn thanh bên).
Mọi lệnh đọc/ghi đều bọc try/catch (chế độ ẩn danh).

## Kiểm thử

- `tests/agenda.test.cjs` (`node --test`): giả lập `window`/`document` rồi `import()` các module.
  **Không import `js/main.js`**, vì file đó gọi `init()`. Hàm cần test phải được `export`.
- `tests/browser/` (Playwright, Chromium):
  - `harness.cjs` phục vụ repo tại `http://app.local/`, thay supabase-js bằng `fake-supabase.js`
    và chặn mọi host khác.
  - Dữ liệu giả có 10 tuần, tuần `w4` luôn là tuần hiện tại. Lệnh ghi được **ghi lại** trong
    `window.__FAKE_WRITES` nhưng không được áp vào dữ liệu.
  - Muốn thêm kịch bản, truyền `patch` cho `openApp()` (xem `smoke.cjs`).
  - Cài Playwright: `npm i -g playwright && npx playwright install chromium`
    (bỏ qua bước này nếu máy đã có sẵn).
  - Muốn có ảnh chụp: `node tests/browser/smoke.cjs <thư-mục>`.
- Khi refactor CSS hoặc cấu trúc mà không định đổi giao diện, cách kiểm chứng đã dùng là:
  chụp computed style của mọi phần tử trong nhiều trạng thái trước và sau khi sửa, rồi so sánh.
  Mục tiêu là 0 khác biệt. Chụp cả hai bản trong cùng một ngày, vì giao diện thay đổi theo ngày.
