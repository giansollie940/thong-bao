# QA V3.18.2 — Canonical HTML Formatting Normalizer

Nguồn: repo hiện tại V3.18.1 đã merge từ `thong-bao-main`.

Đã kiểm tra:
- [x] HTML lỗi thực tế người dùng gửi được chuẩn hóa.
- [x] Từ nhiều span style lồng nhau còn một style carrier chung cho đoạn.
- [x] `text-align:right` được chuyển từ span sang `<p style="text-align:right">`.
- [x] Màu xanh, font 18px, Times New Roman và bold vẫn được giữ.
- [x] Không còn `display:inline`, `letter-spacing:normal`,
      `white-space:normal`, `text-decoration-*:initial` dư trong case đó.
- [x] Sequential formatting vẫn merge đúng.
- [x] Multi-block formatting vẫn PASS.
- [x] Logical-offset selection vẫn PASS.
- [x] Word-like toolbar/dropdown vẫn PASS.
- [x] 6 Python regression tests PASS.
- [x] 8 Chromium HTML regression tests PASS.
- [x] Không xóa file/tính năng hiện có của repo.
- [x] `config.js` không thay đổi.
- [x] Không thay database / Supabase.
