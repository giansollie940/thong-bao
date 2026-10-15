# Các quyết định đã chốt với người dùng

Đây là các quyết định người dùng đã chọn hoặc đồng ý. Không tự đảo ngược. Nếu thấy cần đổi,
trình bày lý do và hỏi người dùng trước. Chi tiết của từng phiên bản ghi trong README
(mục `## V…`) và `docs/qa/`.

| Phiên bản | Quyết định | Lý do / lời người dùng |
|---|---|---|
| V3.20 | Thẻ thông báo thu gọn, bấm vào mới mở đủ nội dung. Ô Năm học chỉ đặt ở thanh bên. | "với mỗi thẻ thông tin thu lại khi bấm vào thì hiện đủ thông tin" |
| V3.21 | Bố cục ưu tiên thông tin: thẻ quan trọng mở sẵn, ngày hiển thị tương đối ("Còn 2 ngày"), phần đầu trang gọn. | "quan trọng thông tin, bố cục theo hướng đó" |
| V3.22 | Bỏ cột tuần bên phải. Chọn tuần bằng **dropdown** ở thanh bên trái, ngay dưới ô Năm học. | "thôi bỏ cột tuần đi", "dạng dropdown tuần được không?" |
| V3.23–V3.24 | Làm mẫu hai hướng "đột phá" là Lịch tuần (agenda) và Bảng ô (bento). Người dùng chọn **Lịch tuần làm mặc định**, Danh sách là kiểu phụ, bỏ Bảng ô. | Người dùng thấy giao diện cứ "quay về bố cục ban đầu" và muốn hướng mới. Họ chọn theo đề xuất. |
| V3.25 | Trên laptop, khung đọc rộng hơn và cột danh sách co theo màn hình. | "phần thông tin có thể rộng hơn không?" |
| V3.27 | Trường "Ngày diễn ra" mặc định là **hôm nay** nếu hôm nay thuộc tuần được chọn, nếu không thì là đầu tuần. | Trước đây mặc định thứ Hai, nên bài mới bị dồn vào nhóm thứ Hai. |
| V3.27 (sửa) | Trong Lịch tuần, thông báo của tuần đang xem đứng trước nhóm "Đang có hiệu lực" từ các tuần cũ. | Bài cũ có hiệu lực dài từng đẩy bài của tuần xuống dưới. |
| V3.27.1 | Nhóm **"🆕 Mới đăng"** đứng trên cùng Lịch tuần. Danh sách xếp ghim trước, rồi bài mới đăng nhất. | "thông báo mới trong tuần phải hiện lên trên". Người dùng chọn phương án "Nhóm Mới đăng trên cùng (Khuyên dùng)". |
| V3.27.2 | Tuần đang diễn ra: **hôm nay lên đầu**, rồi các ngày sắp tới, rồi các ngày đã qua. | "hôm nay là thứ 4 thì thông báo của thứ tư phải xếp đầu chứ" |
| V3.27.2 | "Mới đăng" giữ bài trong **24 giờ** (ban đầu là 3 ngày). | Agent tự đề xuất và đã báo người dùng: với 3 ngày, bài đăng từ thứ Hai làm trống các nhóm ngày. Người dùng có thể muốn đổi lại; hằng số là `FRESH_POST_MS` trong `js/weeks.js`. |
| V3.28 | Lịch tuần có **banner gọn** (khoảng 110px) với hình trường, ‹ Tuần ›, tóm tắt tuần, tiến độ. Không dùng banner đầy đủ. | "tôi muốn vẫn còn banner hình phía trên trong giao diện theo tuần". Người dùng chọn "Banner gọn (Khuyên dùng)" để danh sách không bị đẩy xuống. |

## Nguyên tắc rút ra

- Người dùng đặt **"việc của hôm nay / mới nhất"** lên trên cùng. Họ phản hồi nhanh bằng ảnh chụp
  khi thứ tự không đúng với cách họ đọc trong ngày.
- Họ thích thay đổi lớn được làm mẫu trước rồi mới chọn ("làm mẫu hướng 3 và 4 sau đó mới lựa chọn").
- Mọi bản dọn dẹp code đều phải giữ giao diện **giống hệt** bản trước. Bản làm sạch V3.26–V3.27
  đã kiểm chứng điều này bằng ảnh chụp và so sánh computed style.
