# AGENTS.md — Bảng Thông Báo Theo Tuần

Ứng dụng web tĩnh hiển thị thông báo của một trường theo từng tuần học. Gồm HTML, CSS và
JavaScript ES modules, không có bước build và không có dependency npm. Dữ liệu và đăng nhập
Admin dùng Supabase. Trang thật chạy trên GitHub Pages từ nhánh `main`.

Khi mới nhận dự án, đọc [`docs/agent/handoff.md`](docs/agent/handoff.md) trước: trạng thái
hiện tại, việc còn mở và lịch sử làm việc với người dùng.

## Người dùng

- Chủ dự án là người làm giáo dục, không phải lập trình viên. Luôn trả lời bằng **tiếng Việt**,
  câu ngắn, ít thuật ngữ. Nói rõ phần nào đã kiểm chứng, phần nào chưa.
- Họ thường gửi ảnh chụp trang thật. Trang thật luôn là `main`; nhánh chưa merge thì chưa lên trang.
- Với yêu cầu giao diện còn mơ hồ, đưa 2–3 phương án và đánh dấu một phương án "(Khuyên dùng)".
  Khi họ đã chọn, làm theo lựa chọn đó.

## Quy tắc cứng

- **Bí mật:** `config.js` chỉ được chứa Supabase URL và publishable/anon key.
  Không đưa service_role key, mật khẩu admin hay secret key nào vào repo.
- **Merge = phát hành:** merge PR vào `main` là đưa lên trang thật ngay. Chỉ merge khi người dùng
  đồng ý rõ ràng với chính PR đó. Mọi thay đổi đi qua nhánh và PR.
- **Phiên bản tài nguyên:** khi sửa file CSS hoặc JS, tăng số `?v=` của file đó trong `index.html`
  để trình duyệt không dùng bản cũ trong cache. Với các file trong `js/`, tăng **cả 10 dòng**
  trong `<script type="importmap">` **và** thẻ `<script type="module" src="./js/main.js?v=…">`,
  dùng cùng một số. Số này cũng là số phiên bản trên tiêu đề README.
  Các file CSS và JS ở thư mục gốc có số riêng; chỉ tăng số của file đã sửa.
- **Database:** schema và policy (RLS) của Supabase không nằm trong repo mà được quản lý trên
  dashboard Supabase của người dùng. Thay đổi cần cột hoặc bảng mới thì phải hỏi người dùng trước
  và hướng dẫn họ thao tác (đến 14/10/2026 chưa agent nào được cấp quyền vào dự án Supabase này).
- Phải chạy app qua máy chủ HTTP (ES modules không chạy được khi mở bằng `file://`):
  `python3 -m http.server 8000` rồi mở `http://localhost:8000/`.

## Quy trình cho mỗi thay đổi

1. Đọc [`docs/agent/architecture.md`](docs/agent/architecture.md) trước khi sửa JS hoặc CSS:
   bản đồ module, các quy tắc sắp xếp, thứ tự nạp CSS và các bẫy đã gặp.
   Trước khi đổi thứ tự, bố cục hay hành vi đã có, đọc
   [`docs/agent/decisions.md`](docs/agent/decisions.md) để biết người dùng đã chọn gì và vì sao.
2. Với thay đổi về logic, viết test trước và thấy nó **red**, sau đó mới sửa code.
3. Mọi kiểm tra sau phải đạt (cách cài Playwright và đọc kết quả: xem `architecture.md`, mục Kiểm thử):
   ```sh
   node --test tests/agenda.test.cjs     # logic Lịch tuần, không cần trình duyệt
   node tests/browser/smoke.cjs          # Lịch tuần + Danh sách ở 1440px/390px, có Supabase giả
   node tests/browser/admin-flow.cjs     # đăng nhập, đăng/sửa/xóa, tuần, chuyên mục, năm học
   ```
4. Tăng phiên bản (`?v=` và tiêu đề README). Thêm một mục `## V…` ngắn vào README và tạo
   `docs/qa/QA-V….md` liệt kê những gì đã kiểm.
5. Commit, push lên nhánh làm việc, mở PR bằng tiếng Việt, rồi hỏi người dùng có muốn merge không.
