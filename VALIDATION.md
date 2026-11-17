# Kết quả kiểm tra — 2026-11-17

## Đã chạy

- `npm test`: 4 bài kiểm thử logic xếp hạng, chuẩn hóa SKU, kiểm tra sao lưu và dữ liệu không hợp lệ.
- `npm run check`: kiểm tra cú pháp JavaScript.
- `npm run test:browser`: Chromium, trang mô phỏng Sapo, Chrome storage được giả lập. Kiểm tra thêm/bỏ liên kết, SKU trùng, hiển thị an toàn, giữ dữ liệu qua tải trang, gợi ý nhiều SKU, nhận diện bảng sản phẩm, điều hướng SPA, xuất/khôi phục JSON, chặn sao lưu khác cửa hàng, lỗi ghi dữ liệu và đóng/mở bảng. Đã xem ảnh giao diện ở kích thước 390 × 844.
- `npm audit --omit=dev`: không có lỗ hổng được báo cáo; extension không có dependency runtime.

## Chưa xác minh

- `npm run test:extension`: không qua bước tải extension. Chromium được quản trị trong môi trường này chặn extension unpacked. CDP trả về “Loading of unpacked extensions is disabled by the administrator.” Đây không phải kết quả kiểm thử extension thành công. Không thay đổi chính sách quản trị để vượt giới hạn.
- Chưa có phiên đăng nhập cửa hàng Sapo để thử nhận diện DOM thực tế. Không cam kết tự nhận SKU với mọi phiên bản giao diện; có nhập SKU thủ công.
- Chưa xác minh trên máy người dùng hoặc phiên bản Chrome khác.

## Kiểm tra khi cài tại cửa hàng

1. Nạp thư mục `extension` trong Chrome, tải lại Sapo và mở bảng Nhà cung cấp.
2. Trên trang một nhà cung cấp, kiểm tra tên, liên kết một SKU; tải lại trang, xác minh còn dữ liệu.
3. Tạo phiếu nhập thử, chọn sản phẩm đó; kiểm tra gợi ý. Nếu không tự đọc được SKU, nhập SKU thủ công và tra cứu.
4. Sao chép tên vào ô chọn nhà cung cấp của Sapo; xác minh đúng nhà cung cấp trước khi xử lý phiếu.
5. Xuất sao lưu, thử khôi phục và kiểm tra trên tab thứ hai. Không cần tạo phiếu nhập thật để kiểm tra extension.
