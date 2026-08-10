# V3.0 — WARM SCHOOL UI + FORMATTING TOOLBAR

## 1. Giao diện tông ấm

Bản này giảm gần như toàn bộ cảm giác xanh/tím.

Bảng màu chính:
- Cam tươi: `#F97316`
- Cam đào: `#FB923C`
- Vàng nắng: `#FBBF24`
- Coral / hồng ấm: `#FB7185`
- Xanh lá tươi: `#34D399`
- Nền kem: `#FFFAF2`
- Chữ nâu đậm: `#4A2D24`

Các màu chuyên mục mặc định cũ cũng được tự đổi sang tông ấm ở giao diện, **không cần sửa database**.

## 2. Thanh định dạng nội dung

Trong form **Đăng thông báo / Sửa thông báo**, phía trên ô Nội dung có toolbar:

- **B** — in đậm
- *I* — in nghiêng
- **T** — tiêu đề nhỏ
- **•** — danh sách chấm
- **1.** — danh sách số
- **❝** — trích dẫn / ghi chú
- **🔗** — liên kết
- **</>** — mã / ký hiệu ngắn
- **👁 Xem trước** — xem nội dung sau khi định dạng

Cách dùng:
1. Bôi đen đoạn chữ.
2. Bấm nút định dạng.
3. Có thể bấm `👁 Xem trước` trước khi lưu.

App lưu nội dung dạng Markdown nhẹ, nên dữ liệu vẫn chỉ là text và tương thích với Supabase hiện tại.

## 3. Cú pháp được hỗ trợ

```text
**chữ đậm**
*chữ nghiêng*
### Tiêu đề nhỏ

- Danh sách chấm
- Mục thứ hai

1. Bước một
2. Bước hai

> Ghi chú quan trọng

[Tên liên kết](https://example.com)

`ký hiệu`
```

## 4. Cập nhật

**Không cần chạy SQL mới.**

Trên GitHub thay:
- `index.html`
- `styles.css`
- `app.js`

Giữ nguyên:
- `config.js`
- database Supabase hiện tại

Nếu đã chạy `migration-v2-8.sql` thì không chạy lại.

Sau deploy, cạnh tên app phải hiện `V3.0`.

# V2.9 — HAPPY SCHOOL UI

## Mục tiêu
Làm giao diện sáng, vui, bắt mắt hơn nhưng vẫn dễ đọc và phù hợp môi trường học đường.

## Bảng màu
- Xanh chính: `#2563EB`
- Sky: `#60A5FA`
- Mint: `#34D399`
- Coral: `#FF7A66`
- Vàng nắng: `#FBBF24`
- Lavender: `#A78BFA`
- Nền kem: `#FFFDF7`
- Chữ xanh đen: `#20324A`

## Thay đổi chính
- Header có dải màu mảnh nhiều sắc.
- Hero giới thiệu sáng hơn, có pastel blob mềm.
- Tuần nổi bật chuyển sang gradient “bầu trời buổi sáng”.
- Card thông báo có nền pastel cực nhẹ theo màu chuyên mục.
- Lịch năm học có điểm nhấn sky/mint/yellow/lavender.
- Nút, form, badge và modal đồng bộ bo tròn + shadow mềm.
- Dark mode được chỉnh lại để giữ cảm giác vui nhưng không chói.
- Giữ `prefers-reduced-motion`.

## Không đổi logic
V2.9 giữ nguyên:
- Supabase;
- chuyên mục động V2.8;
- tự phân loại khi nhập nhanh;
- ảnh đính kèm;
- tuần năm học;
- số thông báo mỗi tuần;
- hiệu lực thông báo;
- chuyển tuần từ Thứ Bảy.

## Cập nhật
Không cần chạy SQL mới.

Trên GitHub chỉ cần thay:
- `index.html`
- `styles.css`

Có thể giữ nguyên:
- `app.js`
- `config.js`

Sau deploy, cạnh tên app phải hiện `V2.9`.
