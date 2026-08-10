# V3.1 — MANGO MINT UI

## Bảng màu
- Mango: `#FFB703`
- Orange: `#FB8500`
- Coral: `#FF6B6B`
- Mint: `#6EE7B7`
- Cream: `#FFFDF4`
- Text: `#493528`

## Cách phối
- 70% nền kem / trắng
- 20% mango + orange
- 10% coral + mint

Màu đậm chỉ tập trung ở hero, nút chính, badge, trạng thái và mép card.
Các vùng đọc nội dung vẫn chủ yếu là trắng/kem.

## Giữ nguyên
- thanh định dạng nội dung V3.0;
- chuyên mục động;
- tự phân loại;
- ảnh đính kèm;
- Supabase;
- logic tuần;
- dark mode.

## Cập nhật
Không cần SQL mới.

Trên GitHub thay:
- `index.html`
- `styles.css`
- `app.js`

Giữ nguyên:
- `config.js`

Sau deploy phải thấy `V3.1`.

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
