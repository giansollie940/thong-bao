# V2.8 — DYNAMIC CATEGORIES

## Tính năng mới

Admin có nút **🏷️ Chuyên mục** để:
- thêm chuyên mục mới;
- sửa tên;
- chọn icon;
- chọn màu;
- nhập từ khóa tự phân loại;
- sắp xếp thứ tự;
- bật/tắt chuyên mục;
- xóa chuyên mục.

Ví dụ có thể tạo thêm:
- 👨‍👩‍👧 Phụ huynh
- 🚌 Xe đưa đón
- 💻 Công nghệ
- 🏥 Y tế học đường
- 📚 Thư viện

## Nhập nhanh

Trong **⚡ Nhập nhanh** có trường **Phân loại chuyên mục**.

Có thể chọn:
- **✨ Tự động phân loại từng mục**
- hoặc chọn một chuyên mục cụ thể cho toàn bộ danh sách.

Khi tự động, app đọc:
- tiêu đề;
- nội dung;
- từ khóa do Admin cấu hình.

Sau đó lưu `category_id` tương ứng.

## Cập nhật

### Bước 1
Supabase -> SQL Editor -> chạy:

`migration-v2-8.sql`

### Bước 2
Trên GitHub thay:
- `index.html`
- `styles.css`
- `app.js`

Giữ nguyên:
- `config.js`

### Bước 3
Sau deploy phải thấy:
- nhãn `V2.8`
- nút `🏷️ Chuyên mục` khi đăng nhập Admin.

## Lưu ý
Bản này vẫn giữ cột `category` cũ để tương thích dữ liệu trước đây.
