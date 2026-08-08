# BẢNG THÔNG BÁO THEO TUẦN — V2 UPDATE

Bản này dành cho website V1 của bạn đã kết nối Supabase.

## V2 có 3 nâng cấp chính

1. **Giao diện đa sắc hiện đại hơn**
   - 5 màu card thông báo tự động.
   - Danh sách gạch đầu dòng đẹp hơn.
   - Hỗ trợ `**chữ đậm**` và `*chữ nghiêng*`.

2. **⚡ Nhập nhanh nhiều thông báo**
   - Dán nguyên một khối văn bản.
   - Mỗi mục bắt đầu bằng `###` hoặc `####`.
   - Hệ thống tự tách thành nhiều thông báo.

3. **📅 Tạo tuần năm học hàng loạt**
   - Nhập tuần đầu.
   - Nhập ngày bắt đầu / kết thúc của tuần đầu.
   - Nhập số lượng tuần.
   - Các tuần sau tự tăng 7 ngày.
   - Dừng đúng số lượng bạn quy định.

Ví dụ:

- Tuần 01: 03/08/2026 → 08/08/2026
- Tuần 02: 10/08/2026 → 15/08/2026
- Tuần 03: 17/08/2026 → 22/08/2026

## Cách cập nhật

### Bước 1 — Supabase

Mở:

`Supabase -> SQL Editor -> New query`

Dán toàn bộ nội dung file:

`migration-v2.sql`

rồi nhấn **Run**.

Migration chỉ thêm:
- `school_year`
- `sequence_number`

Không xóa dữ liệu cũ.

### Bước 2 — GitHub

Trong repository website hiện tại, thay đúng 3 file:

- `index.html`
- `styles.css`
- `app.js`

**GIỮ NGUYÊN `config.js` hiện tại của bạn.**

Gói update V2 cố ý không chứa `config.js`, để tránh ghi đè Project URL / Publishable key thật.

### Bước 3 — GitHub Pages

Sau khi commit, GitHub Pages sẽ tự deploy.

Nếu vẫn thấy bản cũ:
- nhấn `Ctrl + F5`
- hoặc mở cửa sổ ẩn danh.

## Cách dùng “Nhập nhanh”

Ví dụ:

```md
#### 1. Hoàn thành Bản cam kết học đường

- **Nội dung:** Học sinh nhận bản cam kết từ GVCN.
- **Yêu cầu:** Phụ huynh và học sinh ký tên.
- **Hạn nộp:** chậm nhất ngày 19/08/2026.

#### 2. Quy định Căn tin

- **Thời gian:** Chỉ mua trong giờ ra chơi.
- **Khu vực:** Chỉ ăn uống tại căn tin.
```

Web sẽ tạo 2 thông báo riêng.

## Cách dùng “Tạo tuần năm học”

Ví dụ nhập:

- Năm học: `2026-2027`
- Tuần bắt đầu: `01`
- Ngày bắt đầu tuần đầu: `03/08/2026`
- Ngày kết thúc tuần đầu: `08/08/2026`
- Số tuần cần tạo: `35`

Nhấn **Xem trước** trước khi tạo.

## Tuần hiện tại tự động

V2 so sánh ngày hiện tại với ngày bắt đầu / kết thúc:

- nằm trong khoảng: **Hiện tại**
- chưa đến: **Sắp tới**
- đã qua: **Đã qua**

Nếu rơi vào Chủ nhật giữa 2 tuần, web sẽ hiển thị tuần kế tiếp.

## Bảo mật

V2 giữ nguyên RLS của V1.

Nâng cấp tiếp theo nên làm:
- khóa quyền ghi theo đúng UID Admin duy nhất của bạn.
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
