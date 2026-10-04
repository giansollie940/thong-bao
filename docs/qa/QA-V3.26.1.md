# QA V3.26.1 — Thông báo của tuần lên trước

- [x] `node --test tests/agenda.test.cjs`: 7/7 kiểm thử đạt. Thứ tự nhóm, lựa chọn
      ban đầu, Trước/Sau, lọc chuyên mục, thông báo không ngày, trạng thái trống,
      ưu tiên ghim/quan trọng và dữ liệu nguồn không bị thay đổi.
- [x] Trước khi sửa, 4 kiểm thử thất bại tái hiện thứ tự cũ và điều hướng lệch.
- [x] `node --check app.js` và `git diff --check` đạt.
- [x] Trình duyệt dùng dữ liệu công khai thực tế: Tuần 10 có 2 thông báo 05/10
      đứng trước 7 thông báo cũ còn hiệu lực; không mất hay nhân đôi dòng.
- [x] Đọc tiếp từ thông báo đầu sang thông báo thứ hai, rồi sang nhóm còn hiệu lực.
- [x] Lọc Thư viện chỉ còn 1 dòng; bỏ lọc khôi phục 9 dòng.
- [x] Tuần sau chuyển sang Tuần 11; quay lại Tuần 10 khôi phục đúng thứ tự.
- [x] 320 / 390 / 768 / 1024px: không tràn ngang toàn trang.
- [x] Điện thoại 390px: mở và đóng khung đọc hoạt động.
- [x] Không có lỗi hoặc cảnh báo JavaScript trong phiên kiểm tra.

Phạm vi: `app.js`, phiên bản tải `app.js` trong `index.html`, tài liệu và kiểm thử.
Không thay đổi schema hoặc nội dung thông báo. GitHub Pages tự cập nhật sau khi
gộp vào `main`. Có thể hoàn tác commit này để khôi phục cách hiển thị trước đó.
