# Kiểm thử bản 0.1.1 — 2026-11-17

## Kết quả cuối cùng

Môi trường: Node.js 24.22.1, Playwright 1.58.2, Chromium 156.0.8078.79 trên Linux.

| Kiểm tra | Kết quả |
|---|---|
| `npm run check` | Qua kiểm tra cú pháp |
| `npm test` | 7/7 qua; bao gồm đối chiếu xếp hạng trên 200 danh mục sinh bằng seed |
| `npm run test:browser` | Qua luồng smoke: thêm/bỏ, tải lại, gợi ý, xuất/khôi phục, lỗi ghi |
| `npm run test:stress` | **96/96 qua: 32 kịch bản × 3 vòng** |
| Retry / flaky / skip trong lần chạy stress cuối | **0 / 0 / 0** |
| `npm audit --omit=dev` | Không báo lỗ hổng dependency runtime |
| `npm run test:extension` | **Bị chặn; không tính là qua** |

Các lần chạy chẩn đoán trước khi sửa có bài thất bại. Bảng trên ghi kết quả của lần chạy đầy đủ cuối trên bản sửa 0.1.1. JSON của runner đã được kiểm tra: expected=96, unexpected=0, flaky=0, skipped=0.

## Môi trường giả lập

- HTML trang nhà cung cấp và phiếu nhập chạy trong Chromium thật qua HTTPS được Playwright route thành dữ liệu giả. Không gọi cửa hàng Sapo thật.
- `chrome.storage.local` được giả lập ở biên API: dữ liệu dùng chung giữa các tab trong từng bài, có lỗi đọc/ghi, độ trễ và sự kiện `onChanged`.
- Web Locks dùng cơ chế thật của Chromium, không giả lập khóa. Các vòng dùng seed độ trễ khác nhau, tối đa 5 tab cùng ghi.
- Mỗi bài có browser context và kho dữ liệu riêng; không dùng lại kết quả bài trước, không tự retry bài lỗi.
- Mọi bài kiểm tra không có lỗi JavaScript chưa được xử lý.
- Kích thước giao diện kiểm tra: 320×568, 390×844 và 1366×768; có kiểm tra không tràn ngang khi SKU dài.

## Phạm vi 32 kịch bản

| Nhóm | Nội dung |
|---|---|
| Tra cứu | Nhiều SKU trên 100 ký tự tổng, nhiều dòng, giữ nội dung tra cứu, bỏ sản phẩm khỏi phiếu, chặn SKU dài gây khớp nhầm |
| Nhận diện DOM | `data-sku`, `data-product-sku`, CSS SKU, liên kết sản phẩm nhiều dòng; loại dòng ẩn, kết quả tìm kiếm trong dialog và bảng ngoài trang nhập hàng |
| Ghi đồng thời | Hai tab thêm khác SKU; năm tab thêm đồng thời; hai tab thêm cùng SKU chỉ tạo một liên kết và cả hai tab cập nhật |
| Đổi tên / bản nháp | Đổi tên rồi thêm ngay; đổi tên hai lần về tên ban đầu; giữ sản phẩm đang nhập và bộ lọc khi tab khác cập nhật |
| Lỗi lưu trữ | Lỗi đọc không ghi đè dữ liệu; lỗi ghi giữ nguyên dữ liệu và bản nháp; thử lại thành công |
| Sao lưu | JSON hỏng/null, sai cửa hàng, trùng nhà cung cấp, sai version, tệp hơn 5 MB, hủy khôi phục, khôi phục rỗng, phục hồi kho dữ liệu hỏng |
| Chuyển trang | Chuyển nhà cung cấp qua SPA; chặn form của trang cũ ghi nhầm; hoàn tất lưu chậm không xóa bản nháp của nhà cung cấp mới |
| Giao diện | Đóng/mở, Escape và trả focus; không tạo hai bảng khi inject lại; danh mục 1.200 sản phẩm phân trang 100 dòng và lọc đến SKU cuối |
| An toàn thao tác | Tách dữ liệu cửa hàng, hủy bỏ liên kết, nội dung HTML chỉ là chữ, SKU/tên toàn khoảng trắng không lưu, lỗi clipboard không thay đổi ô nhà cung cấp Sapo |

## Những lỗi đã sửa

- Thao tác bị bỏ qua khi đang lưu tên hoặc khi tab khác vừa ghi dữ liệu.
- Tab thua trong cuộc đua thêm cùng SKU không hiển thị liên kết mới nhất.
- Mất bản nháp và bộ lọc do dữ liệu từ tab khác cập nhật.
- Đổi tên trở về tên ban đầu nhưng không được lưu.
- Ô tra cứu bị giới hạn tổng 100 ký tự và bị xóa nội dung sau tra cứu.
- Dòng ẩn hoặc bảng không liên quan bị đưa vào gợi ý; thiếu hỗ trợ `data-product-sku` trên dòng.
- SKU dài bị cắt dẫn đến trùng hoặc khớp nhầm.
- Không thể khôi phục khi dữ liệu lưu ban đầu bị hỏng.
- Form cũ có thể thao tác nhầm khi vừa chuyển trang; lưu chậm có thể xóa bản nháp mới.
- Danh mục lớn tạo quá nhiều dòng cùng lúc; SKU dài có thể làm tràn ngang.

## Giới hạn chưa xác minh

`npm run test:extension` không tìm thấy nút vì extension không được nạp. Kiểm tra trực tiếp bằng Chrome DevTools Protocol trả về:

> Loading of unpacked extensions is disabled by the administrator.

Không thay đổi chính sách để vượt giới hạn. Vì vậy chưa xác minh content script trong isolated world, `chrome.storage` thật, hoặc khôi phục dữ liệu sau khi đóng/mở trình duyệt thật. Các kiểm thử mô phỏng không thay thế được những kiểm tra này.

Chưa có phiên đăng nhập Sapo thật. Nhận diện DOM thật và các URL khác ngoài những mẫu được hỗ trợ vẫn cần thử tại cửa hàng. Khi không nhận diện được SKU, dùng tra cứu thủ công. Chưa kiểm tra trên các hệ điều hành hoặc phiên bản Chrome khác.

## Kiểm tra tại cửa hàng khi cập nhật

1. Sao lưu dữ liệu extension hiện tại. Tải bản mới về đúng thư mục extension.
2. Trong `chrome://extensions`, bấm tải lại Supplier Note và tải lại trang Sapo.
3. Xác minh một liên kết vẫn còn sau khi tải lại; mở hai tab và thêm hai SKU khác nhau.
4. Tạo phiếu nhập thử, chọn một sản phẩm đã liên kết; kiểm tra gợi ý hoặc nhập SKU thủ công.
5. Sao chép tên vào ô của Sapo và kiểm tra đúng nhà cung cấp. Không cần tạo phiếu nhập thật để thử extension.
