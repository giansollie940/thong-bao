# 📢 Bảng Thông Báo Theo Tuần

Ứng dụng web quản lý và công bố **thông báo theo tuần** dành cho trường học, lớp học, câu lạc bộ hoặc nhóm nội bộ.

Web được xây dựng theo hướng **nhẹ, dễ dùng, chạy trực tiếp trên trình duyệt**, giao diện responsive và lưu dữ liệu bằng **Supabase**.

> Phiên bản giao diện hiện tại: **V3.4 — Mint Garden App Shell**

---

## ✨ Tổng quan

Ứng dụng giúp quản trị viên:

- tạo và quản lý tuần;
- đăng thông báo theo từng tuần;
- nhập nhanh nhiều thông báo cùng lúc;
- tự phân loại nội dung;
- tạo thêm chuyên mục khi cần;
- thêm ảnh minh họa;
- định dạng nội dung;
- đặt thời gian hiệu lực;
- tìm kiếm và xem lại thông báo cũ;
- quản lý toàn bộ dữ liệu qua Supabase.

Người xem công khai có thể:

- đọc thông báo;
- lọc theo chuyên mục;
- tìm kiếm;
- xem ảnh;
- sao chép nội dung;
- xem tuần hiện tại, tuần sắp tới và các tuần đã lưu trữ.

---

# 👥 Phân quyền

## 👑 Admin

Admin có quyền cao nhất:

- đăng nhập;
- tạo tuần;
- sửa tuần;
- xóa tuần;
- đăng thông báo;
- sửa thông báo;
- xóa thông báo;
- nhập nhanh nhiều mục;
- tải ảnh lên;
- quản lý chuyên mục;
- đặt thời gian hiệu lực;
- ghim thông báo;
- đánh dấu thông báo quan trọng;
- tạo lịch năm học.

## 👀 Người xem công khai

Không cần đăng nhập.

Có thể:

- đọc thông báo;
- xem ảnh;
- lọc chuyên mục;
- tìm kiếm;
- sao chép nội dung;
- xem các tuần cũ.

Không thể sửa hoặc xóa dữ liệu.

---

# 📅 Quản lý tuần

Mỗi tuần có thể lưu:

- số tuần;
- tiêu đề;
- ngày bắt đầu;
- ngày kết thúc;
- mô tả / tóm tắt;
- năm học;
- thứ tự tuần.

Ứng dụng tự xác định:

- tuần hiện tại;
- tuần sắp tới;
- tuần đã qua.

### Thứ Bảy tự chuyển sang tuần kế tiếp

Từ **Thứ Bảy**, nếu đã có tuần tiếp theo, trang chính sẽ ưu tiên hiển thị nội dung của tuần kế tiếp để người dùng chuẩn bị sớm.

---

# 🗓️ Tạo lịch năm học tự động

Admin có thể tạo hàng loạt các tuần của năm học.

Ứng dụng tự:

- tạo các tuần liên tiếp;
- mỗi tuần cách nhau 7 ngày;
- đánh số thứ tự;
- lưu năm học;
- hiển thị toàn bộ trong thanh lịch năm học.

Mỗi tuần còn hiển thị:

- trạng thái;
- số lượng thông báo đang có hiệu lực.

---

# 📝 Quản lý thông báo

Mỗi thông báo hỗ trợ:

- tiêu đề;
- nội dung;
- chuyên mục;
- ngày sự kiện;
- tuần chính;
- ngày bắt đầu hiệu lực;
- ngày kết thúc hiệu lực;
- mức độ ưu tiên;
- ghim lên đầu;
- ảnh minh họa;
- mô tả ảnh.

---

# ⏳ Thời gian hiệu lực

Một thông báo không nhất thiết chỉ xuất hiện trong tuần được tạo.

Ví dụ:

```text
Hiệu lực từ: 18/08/2026
Hiệu lực đến: 30/08/2026
```

Thông báo sẽ xuất hiện ở tất cả các tuần có khoảng ngày giao với thời gian hiệu lực đó.

Tính năng này phù hợp với:

- thông báo kéo dài nhiều tuần;
- lịch thi;
- hoạt động dài ngày;
- nội quy áp dụng trong một khoảng thời gian;
- sự kiện cần nhắc nhiều tuần.

---

# ⚡ Nhập nhanh nhiều thông báo

Admin có thể dán nhiều nội dung cùng lúc.

Ví dụ:

```markdown
#### 1. Hoàn thành Bản cam kết học đường
- **Hạn nộp:** 19/08/2026
- **Yêu cầu:** Nộp tại lớp

#### 2. Hoạt động trải nghiệm
- **Thời gian:** 07:00
- **Địa điểm:** Sân trường
```

Ứng dụng sẽ tự:

- tách từng mục;
- lấy tiêu đề;
- lấy nội dung;
- nhận diện ngày;
- tạo nhiều thông báo cùng lúc.

Có thể chọn:

```text
✨ Tự động phân loại từng mục
```

hoặc chọn một chuyên mục chung cho toàn bộ danh sách.

---

# 🧠 Tự động phân loại thông báo

Ứng dụng có bộ phân loại nội bộ bằng JavaScript.

Nó đọc:

- tiêu đề;
- nội dung;
- chuyên mục;
- từ khóa do Admin cấu hình.

Ví dụ:

```text
bài tập
kiểm tra
ôn tập
nộp bài
```

có thể được nhận diện là:

```text
📘 Học tập
```

Không cần AI API bên ngoài.

---

# 🏷️ Chuyên mục động

Admin có thể tự tạo chuyên mục mới mà không cần sửa code.

Mỗi chuyên mục hỗ trợ:

- tên;
- icon;
- màu;
- từ khóa;
- thứ tự hiển thị;
- trạng thái bật / tắt.

Ví dụ:

```text
📘 Học tập
🛡️ Nội quy
🎉 Hoạt động
🌟 Đoàn–Đội
🍱 Căn tin
🚨 Cần lưu ý
👨‍👩‍👧 Phụ huynh
🏥 Y tế học đường
🚌 Xe đưa đón
📚 Thư viện
```

Các chuyên mục được lưu trực tiếp trong Supabase.

---

# 🎨 Lọc theo chuyên mục

Ngay dưới tuần nổi bật có thanh lọc.

Ví dụ:

```text
✨ Tất cả
📘 Học tập
🛡️ Nội quy
🎉 Hoạt động
🍱 Căn tin
🚨 Cần lưu ý
```

Mỗi nút hiển thị luôn số lượng thông báo trong chuyên mục.

---

# ✍️ Thanh định dạng văn bản

Trong form đăng / sửa thông báo có thanh công cụ:

```text
B   I   T   •   1.   ❝   🔗   </>   👁 Xem trước
```

Hỗ trợ:

- **in đậm**;
- *in nghiêng*;
- tiêu đề nhỏ;
- danh sách chấm;
- danh sách số;
- trích dẫn / ghi chú;
- liên kết;
- mã / ký hiệu ngắn;
- xem trước nội dung.

Ví dụ:

```markdown
### Lưu ý quan trọng

**Thời gian:** 07:00

- Học sinh mặc đồng phục
- Có mặt đúng giờ

1. Tập trung tại sân trường
2. Điểm danh theo lớp

> Không đi trễ.

[Xem tài liệu](https://example.com)
```

Dữ liệu vẫn chỉ được lưu dưới dạng text nên đơn giản và nhẹ.

---

# 🖼️ Ảnh đính kèm

Thông báo có thể kèm một ảnh.

Hỗ trợ:

- JPG;
- PNG;
- WEBP;
- tối đa 5 MB.

Ảnh được lưu bằng **Supabase Storage**.

Admin có thể:

- tải ảnh mới;
- xem trước;
- thay ảnh;
- xóa ảnh.

Người xem có thể bấm vào ảnh để xem lớn hơn.

---

# 📌 Thông báo quan trọng và ghim

Thông báo có thể:

- đánh dấu **Quan trọng**;
- ghim lên đầu tuần.

Điều này giúp các nội dung quan trọng dễ được chú ý hơn.

---

# 🔎 Tìm kiếm

Ứng dụng có ô tìm kiếm toàn bộ thông báo.

Có thể tìm theo:

- tiêu đề;
- nội dung;
- chuyên mục.

Kết quả có thể hiển thị cả thông báo thuộc các tuần khác.

---

# 🗂️ Lưu trữ tuần cũ

Các tuần đã qua được đưa vào khu vực lưu trữ.

Người dùng vẫn có thể:

- mở lại tuần cũ;
- xem thông báo;
- tìm kiếm;
- sao chép nội dung.

Nhờ đó trang chính không bị quá dài nhưng lịch sử vẫn được giữ lại.

---

# 📋 Sao chép thông báo

Người xem có thể sao chép nội dung thông báo để gửi qua:

- Messenger;
- Zalo;
- email;
- nhóm lớp;
- tài liệu khác.

Nếu thông báo có ảnh, đường dẫn ảnh cũng có thể được đưa vào nội dung sao chép.

---

# 🌞 Giao diện Sunlit Campus

Phong cách hiện tại ưu tiên:

- nền kem / trắng;
- terracotta làm màu chính;
- saffron làm điểm sáng;
- sage cho trạng thái tích cực;
- coral cho nội dung cần chú ý.

Mục tiêu:

- dễ đọc;
- sáng;
- không quá nhiều màu;
- màu chỉ xuất hiện khi có ý nghĩa;
- phù hợp với môi trường trường học.

---

# 🌙 Dark Mode

Ứng dụng có chế độ tối.

Dark mode được phối theo tông nâu ấm thay vì xanh đen lạnh.

Người dùng có thể chuyển đổi trực tiếp trên giao diện.

---

# 📱 Responsive

Giao diện hoạt động tốt trên:

- điện thoại;
- máy tính bảng;
- laptop;
- máy tính để bàn.

Các thành phần tự điều chỉnh:

- cột;
- kích thước chữ;
- nút;
- card;
- toolbar;
- modal;
- lịch tuần.

---

# ♿ Accessibility

Ứng dụng có các hỗ trợ cơ bản về accessibility:

- `label` cho form;
- `alt` cho ảnh;
- trạng thái focus rõ;
- điều khiển bằng bàn phím;
- `aria-label` khi cần;
- `aria-live` cho thông báo trạng thái;
- tương phản màu được ưu tiên;
- hỗ trợ `prefers-reduced-motion`.

---

# 🧰 Công nghệ sử dụng

Frontend:

```text
HTML5
CSS3
JavaScript thuần
```

Backend / Database:

```text
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
Row Level Security
```

Hosting:

```text
GitHub Pages
```

Không sử dụng framework nặng.

---

# 🗄️ Cấu trúc dữ liệu chính

## `weeks`

Lưu thông tin tuần.

Ví dụ:

```text
id
week_number
title
start_date
end_date
summary
school_year
sequence_number
status
```

## `announcements`

Lưu thông báo.

Ví dụ:

```text
id
week_id
title
content
category
category_id
event_date
valid_from
valid_until
priority
is_pinned
image_path
image_alt
```

## `categories`

Lưu chuyên mục động.

Ví dụ:

```text
id
name
slug
icon
color
keywords
sort_order
active
```

---

# 🔐 Bảo mật

Website sử dụng:

- Supabase Auth;
- Row Level Security;
- publishable key ở frontend;
- Storage policy.

Không đưa:

```text
service_role key
```

vào frontend hoặc GitHub public.

> Khi triển khai thực tế, nên giới hạn quyền ghi dữ liệu đúng tài khoản Admin thay vì cho toàn bộ tài khoản `authenticated`.

---

# 🚀 Cài đặt

## 1. Supabase

Tạo project Supabase.

Chạy các migration SQL của ứng dụng.

Nếu đang dùng bản hiện tại thì database cần có:

```text
weeks
announcements
categories
```

và Storage bucket:

```text
announcement-images
```

---

## 2. Cấu hình `config.js`

Ví dụ:

```javascript
window.APP_CONFIG = {
  supabaseUrl: "YOUR_SUPABASE_URL",
  supabaseAnonKey: "YOUR_PUBLISHABLE_KEY"
};
```

Không sử dụng `service_role` key.

---

## 3. Đưa lên GitHub

Các file chính:

```text
index.html
styles.css
app.js
config.js
```

Sau đó bật:

```text
Settings
→ Pages
→ Deploy from branch
```

---

# 📂 Cấu trúc project

```text
/
├── index.html
├── styles.css
├── app.js
├── config.js
├── README.md
└── migration-v2-8.sql
```

---

# ✅ Một số tình huống sử dụng

Ứng dụng có thể dùng cho:

- bảng thông báo trường học;
- thông báo lớp;
- kế hoạch tuần;
- lịch công tác;
- câu lạc bộ;
- trung tâm học tập;
- nhóm nội bộ;
- tổ chuyên môn;
- thông báo hoạt động;
- lịch sự kiện.

---

# 🧭 Luồng sử dụng gợi ý

```text
Admin đăng nhập
      ↓
Chọn / tạo tuần
      ↓
Đăng thông báo
      ↓
Tự phân loại chuyên mục
      ↓
Đặt thời gian hiệu lực
      ↓
Đính kèm ảnh nếu cần
      ↓
Xem trước
      ↓
Lưu vào Supabase
      ↓
Người dùng đọc trên web
```

---

# ⭐ Điểm nổi bật

Ứng dụng hướng đến sự cân bằng giữa:

```text
Đơn giản
+
Dễ quản lý
+
Đẹp
+
Nhanh
+
Không phụ thuộc framework
+
Dữ liệu thật trên server
```

Toàn bộ frontend vẫn chỉ là:

```text
HTML + CSS + JavaScript
```

nên dễ học, dễ chỉnh sửa và dễ triển khai.

---

# 📌 Phiên bản hiện tại

```text
V3.4 — Mint Garden App Shell
```

Bao gồm:

- giao diện Sunlit Campus;
- chuyên mục động;
- tự động phân loại;
- nhập nhanh;
- định dạng văn bản;
- xem trước nội dung;
- ảnh đính kèm;
- thời gian hiệu lực;
- tuần năm học;
- lưu trữ;
- tìm kiếm;
- dark mode;
- responsive;
- Supabase backend.

---

## ❤️ Mục tiêu của dự án

Tạo một bảng thông báo trường học:

> **dễ đăng — dễ đọc — dễ quản lý — đẹp trên mọi thiết bị.**
