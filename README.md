# Supplier Note

Extension Chrome (Manifest V3) cho Sapo Omni. Không cần API Sapo, không gửi dữ liệu ra máy chủ.

## Cài đặt

1. Tải repository về máy và giải nén nếu tải ZIP.
2. Mở `chrome://extensions`, bật **Chế độ dành cho nhà phát triển**.
3. Chọn **Tải tiện ích đã giải nén**, chọn thư mục `extension` (thư mục chứa `manifest.json`).
4. Tải lại trang quản trị Sapo. Bấm **Nhà cung cấp** ở góc dưới bên phải.

Hỗ trợ trang HTTPS `/admin/*` thuộc `*.mysapogo.com` và `*.mysapo.com`. Khuyến nghị Chrome phiên bản hiện hành. Không yêu cầu tài khoản hay database riêng.

## Sử dụng

### Liên kết sản phẩm

Mở trang chi tiết nhà cung cấp của Sapo, URL dạng `/admin/suppliers/123/...`. Bảng tiện ích hiện **Sản phẩm cung cấp**. Kiểm tra tên nhà cung cấp, nhập SKU chính xác và tên sản phẩm, bấm **Liên kết sản phẩm**. Có thể lọc danh sách và bỏ liên kết có xác nhận. Danh mục lớn hiển thị 100 sản phẩm mỗi lần; bấm **Xem thêm** hoặc dùng ô lọc.

Dùng SKU riêng cho từng biến thể. Một SKU có thể liên kết với nhiều nhà cung cấp. Tên nhà cung cấp được lấy thử từ tiêu đề trang; luôn kiểm tra lại trước khi lưu.

### Gợi ý khi nhập hàng

Trên trang tạo phiếu nhập, thêm sản phẩm rồi mở bảng tiện ích. Tiện ích thử đọc SKU từ các dòng bảng sản phẩm và cập nhật khoảng 1,2 giây/lần, ưu tiên nhà cung cấp bao phủ nhiều SKU nhất. Nếu giao diện Sapo không cung cấp SKU theo định dạng nhận diện được, mở **Nhập SKU để tra cứu**, nhập các SKU cách nhau bằng dấu `;` hoặc xuống dòng. Mỗi SKU tối đa 100 ký tự. Nội dung tra cứu được giữ lại để sửa nhanh.

Bấm **Sao chép tên** rồi dán vào ô tìm nhà cung cấp của Sapo. Extension không tự chọn nhà cung cấp hoặc tạo/sửa phiếu nhập. `2/3 sản phẩm` là số SKU có liên kết, không phải xác nhận tồn kho của nhà cung cấp.

### Sao lưu

Trong **Dữ liệu & sao lưu**, chọn **Xuất sao lưu** để tải JSON. **Khôi phục** thay thế dữ liệu hiện tại sau xác nhận; chỉ nhận tệp của đúng tên miền cửa hàng. Nên xuất sao lưu trước khi khôi phục, đổi máy hoặc gỡ tiện ích.

Dữ liệu nằm trong `chrome.storage.local`, tách theo tên miền. Các tab trên cùng trình duyệt dùng chung dữ liệu; thay đổi đồng thời được xếp hàng và áp dụng lên dữ liệu mới nhất. Nội dung đang nhập được giữ khi tab khác cập nhật; không đồng bộ giữa các máy, tài khoản Chrome hoặc tên miền khác nhau. Gỡ extension có thể làm mất dữ liệu. Tệp sao lưu chứa thông tin nhà cung cấp và sản phẩm: lưu giữ phù hợp.

## Giới hạn bản đầu

- Chưa nhập Excel, tự quét lịch sử phiếu nhập, đồng bộ database hoặc lấy giá nhập.
- Nhận diện giao diện là best effort; khi Sapo thay đổi DOM, dùng nhập SKU thủ công.
- Bảng nổi là giao diện của tiện ích, không phải tab gốc của Sapo.
- Chưa xác minh trên phiên đăng nhập Sapo thật. Bộ kiểm thử dùng trang mô phỏng và Chromium; cần thử trên cửa hàng trước khi dùng hàng ngày.

## Phát triển và kiểm thử

Node.js 24, npm:

```sh
npm ci --cache /tmp/supplier-note-npm
npm test
npm run check
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
CHROMIUM_PATH=/usr/bin/chromium npm run test:integration
CHROMIUM_PATH=/usr/bin/chromium npm run test:stress
CHROMIUM_PATH=/usr/bin/chromium npm run test:extension
```

Cần cài Chromium hoặc đặt `CHROMIUM_PATH` trỏ tới trình duyệt Chromium tương thích. `test:extension` cần trình duyệt cho phép tải extension unpacked; môi trường quản trị chặn extension sẽ không chạy được bài này.

Bộ kiểm thử trình duyệt bao gồm thêm/bỏ liên kết, chống trùng SKU, an toàn hiển thị văn bản, tra cứu, chuyển trang SPA, sao lưu/khôi phục và cách ly cửa hàng. Không cần tài khoản Sapo cho các kiểm thử này.

`test:integration` chạy 32 kịch bản trên trang Sapo giả lập. `test:stress` lặp toàn bộ 3 vòng, tổng cộng 96 lượt; mỗi vòng dùng seed độ trễ khác nhau. Mock storage có lỗi đọc/ghi, độ trễ và phát sự kiện liên tab. Web Locks dùng cơ chế thật của Chromium để kiểm tra việc ghi đồng thời. Chạy bằng 1 worker, mỗi kịch bản có browser context riêng để không dùng lại dữ liệu của bài trước. Không tự retry bài lỗi để che kết quả.

Kết quả JSON nằm tại `test-results/integration.json`; trace được giữ lại cho bài lỗi. Xem [VALIDATION.md](VALIDATION.md) để biết kết quả và các giới hạn kiểm thử.
