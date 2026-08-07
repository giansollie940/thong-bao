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
