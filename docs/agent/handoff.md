# Bàn giao dự án (14/10/2026)

## Trạng thái hiện tại

- `main` đang ở **V3.27.2**. Đã merge PR #1, #2, #3, #4, #6, #7 (từ nhánh
  `claude/optimize-notification-app-ui-kdgabc`). Không còn PR nào đang mở.
- Mọi kiểm tra đều đạt: `node --test tests/agenda.test.cjs` (12/12), `tests/browser/smoke.cjs`,
  `tests/browser/admin-flow.cjs`.
- Trang thật sau khi merge V3.27.2 **chưa được kiểm chứng** vì agent không truy cập được.
  Người dùng được nhờ xem lại và chụp màn hình nếu còn sai.

## Việc còn mở và gợi ý (chưa ai yêu cầu, hãy hỏi người dùng trước)

1. **Schema Supabase không có trong repo.** Agent trước không vào được dự án Supabase của app
   (`bimpvjwcsccbogosodwm`). Nếu người dùng cấp quyền, nên xuất schema và policy (RLS) vào repo,
   ví dụ `supabase/schema.sql`, để thay đổi database có thể kiểm được.
2. **Chưa có CI.** Có thể thêm một GitHub Action chạy `node --test tests/agenda.test.cjs` và các
   test trình duyệt cho mỗi PR.
3. **README dài**, phần lớn là nhật ký phiên bản. Có thể tách ra `CHANGELOG.md` và giữ README
   cho phần giới thiệu, cấu trúc và deploy.
4. Thời gian giữ bài trong "Mới đăng" (24 giờ) do agent tự chọn. Người dùng có thể muốn đổi.

## Môi trường làm việc trước đây

- Agent làm trên một nhánh riêng, mở PR vào `main`, rồi hỏi người dùng trước khi merge.
- Chrome trong container không vào được Supabase hay CDN, nên mọi kiểm tra trên trình duyệt
  đều dùng `tests/browser/fake-supabase.js`.

## Lời nhắn mẫu để bắt đầu với AI mới

Người dùng có thể dán đoạn sau vào phiên làm việc mới:

> Đây là dự án "Bảng thông báo theo tuần" (repo giansollie940/thong-bao). Hãy đọc `AGENTS.md`
> và `docs/agent/handoff.md` trước khi làm gì. Sau đó chạy các lệnh kiểm tra trong `AGENTS.md`
> và báo cho mình kết quả bằng tiếng Việt. Không merge vào `main` khi mình chưa đồng ý.
