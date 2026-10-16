# Edusoft Course Registration — Thiết kế và giới hạn

Phiên bản 2.1.0, ngày 15/10/2026. Giữ riêng bản IU Safe 1.0 và RAR gốc để đối chiếu; không chạy JavaScript từ RAR.

## Các lớp mã

| Tệp | Trách nhiệm |
|---|---|
| `account.js` | Kiểm tra cấu trúc tài khoản/mật khẩu trước khi lưu hoặc dùng. Dữ liệu lưu cục bộ dạng rõ theo yêu cầu; không có mã hóa hoặc mật khẩu khóa. |
| `transport.js` | URL và method được cho phép, HTTP có cookie phiên, token AjaxPro, timeout, giới hạn phản hồi 4 MB, backoff cho đọc, một fetch cho ghi. Chỉ parse JSON, không eval response. |
| `parser.js` | Đọc dữ liệu HTML trong tài liệu tách rời, không chèn HTML phản hồi vào UI. Ánh xạ 13 trường môn và kiểm tra phản hồi điều kiện. Nhận diện kết quả bằng mã chính xác, không substring. |
| `session.js` | Form WebForms mới, token/hidden state và nhận danh tính từ phản hồi trường; giữ phiên trong bộ nhớ tối đa 15 phút để bắt đầu thao tác. |
| `engine.js` | Luồng đăng ký tuần tự, so sánh toàn bộ tập kết quả, khóa một lượt, nhật ký ghi trước khi gửi và giữ mọi trạng thái chưa được đối chiếu. |
| `dashboard.js` | Tab extension riêng, biểu mẫu tài khoản và kế hoạch, xác nhận người dùng, nhật ký và thao tác đối chiếu. Không đọc/bấm DOM ở tab trường. |

## Phần đã đối chiếu với cổng IU công khai

Các GET đã được đọc, không thực thi mã nhận được:

- [Runtime AjaxPro hiện tại](https://edusoftweb.hcmiu.edu.vn/ajaxpro/core.ashx): HTTP POST, `Content-Type: text/plain; charset=utf-8`, `X-AjaxPro-Method`, token tùy chọn `X-AjaxPro-Token`, body JSON của arguments.
- [Định nghĩa API đăng ký](https://edusoftweb.hcmiu.edu.vn/ajaxpro/EduSoft.Web.UC.DangKyMonHoc,EduSoft.Web.ashx): tên phương thức và tên tham số của luồng lọc/chọn/lưu/đọc kết quả còn trùng với bản gốc.
- [Form đăng nhập thường](https://edusoftweb.hcmiu.edu.vn/default.aspx?page=dangnhap): form multipart WebForms, các trường suffix `$txtTaiKhoa`, `$txtMatKhau`, `$btnDangNhap`; có hidden `__VIEWSTATE`.

Các GET công khai chỉ chứng minh mô tả giao thức và form được cung cấp ở thời điểm đọc. Chưa xác minh server chấp nhận Origin từ extension, form mật khẩu của tài khoản thật, token sau đăng nhập hoặc kết quả thực tế của bất kỳ POST nào.

## Các điều kiện kiểm soát

1. Username/password được lưu dạng rõ vào `account` trong `storage.local`, theo yêu cầu bỏ mật khẩu khóa. Trường mật khẩu trên UI vẫn dùng type=password; đây không phải mã hóa lưu trữ. `storage.local` đặt `TRUSTED_CONTEXTS`. Không có content script hay message bridge cho website gọi engine. Ai truy cập được dữ liệu profile vẫn có thể đọc thông tin đăng nhập.
2. CSP chặn script từ xa, eval, object, frame và form submit. Fetch chỉ được kết nối origin IU. Mọi URL/method request đều được so với danh sách cố định trong mã.
3. HTTP giữ TLS bình thường. Redirect bị chặn; login có thể gặp redirect thành công nên chỉ đọc lại trạng thái bằng GET, không gửi lại POST.
4. Không đọc cookie bằng JS hoặc cookies API. `credentials: include` nhờ trình duyệt gắn cookie theo quyền host và chính sách cookie của trình duyệt. Chính sách bên thứ ba vẫn có thể gây khác biệt theo cấu hình người dùng.
5. Kế hoạch trùng mã bị từ chối. Giá trị lớp nhập cũ phải khớp toàn bộ giá trị nhận lại từ API trước khi ghi; lớp bị khóa không được chọn.
6. Không tự chấp thuận các cảnh báo. Các flag điều kiện ngành/tín chỉ/tự chọn phải có giá trị đã nhận diện là cho phép; mọi cảnh báo lịch, môn hoặc đổi nhóm đều dừng. Chưa có tính năng tự xử lý những lớp đặc biệt đó.
7. Dữ liệu từ bước kiểm tra được dùng cho `LuuVaoKetQuaDangKy` với `isValidCoso=false`, `isValidTKB=false`, `oldMaDK` rỗng và `isCheck='true'`. Không tự đặt flag vượt điều kiện.
8. Người dùng phải đọc và duyệt danh sách phiên hiện tại trước khi bắt đầu; baseline đọc lại lúc chạy phải khớp chính xác bản vừa duyệt, nếu khác thì chưa ghi. Trước lưu, phải có đúng hợp của kết quả ban đầu và kế hoạch. Mã ngoài kế hoạch hoặc mất mã đều dừng. Kết quả sau lưu cũng phải đúng tập mã; trạng thái cuối vẫn yêu cầu kiểm tra chính thức.
9. Trước mỗi mutation, phải ghi thành công `MAYBE_SENT`. Crash hoặc timeout không tự tiếp tục. Nhật ký chưa đối chiếu chặn lượt kế tiếp kể cả sau khi tải lại tab/trình duyệt.
10. Web Locks ngăn hai tab của chính extension chạy đồng thời. Không có khả năng khóa phiên đối với website hay ứng dụng khác. Người dùng cần tránh đổi tài khoản/thao tác đăng ký từ nơi khác trong lúc chạy.

## Giới hạn quan trọng từ kiểm thử

Mã tầng ứng dụng không lặp lại fetch mutation. Tuy nhiên, khi test server đã đọc POST rồi đóng socket trước khi trả HTTP, Chromium đã có lần tự phát lại cùng POST trong một fetch. Không có chứng cứ endpoint IU hỗ trợ một idempotency key để máy chủ từ chối bản phát lại. Vì vậy không tuyên bố bảo đảm exactly-once hoặc tuyệt đối không phát sinh gửi trùng ở tầng mạng.

Timeout không có nghĩa máy chủ chưa thực hiện. `HELD` không có nghĩa các bước trước đã được hoàn tác. API read trả danh sách chứa mã cũng chưa chứng minh trạng thái chốt/đã lưu đúng trong cơ sở dữ liệu. Bản này giữ trạng thái thận trọng và yêu cầu đối chiếu.

Máy chủ web/API có thể dùng chung hạ tầng và khóa session. HTTP trực tiếp tránh sự phụ thuộc JavaScript/DOM của trang trường nhưng không sửa được lỗi phía máy chủ, giới hạn slot, thời gian đăng ký, mất mạng, máy ngủ hoặc browser bị dừng. Tab dashboard phải được giữ mở. Không có scheduler hay chạy ngầm khi đã đóng tab.

Kết quả fixture chỉ chứng minh mã vận hành đúng trên các mẫu đã kiểm thử. Các parser sau đăng nhập chưa được kiểm chứng bằng phản hồi thật của IU. Nếu response dùng cú pháp JavaScript không phải JSON nghiêm ngặt, bộ mã mới sẽ từ chối thay vì eval.

## Dữ liệu lưu trữ

- `account`: tài khoản và mật khẩu trường ở dạng rõ. Tự điền khi mở tab, không tự đăng nhập.
- `vault` cũ: chỉ được nhận diện để báo cần nhập lại; không giải mã tự động. Xóa sau khi lưu account mới thành công hoặc người dùng bấm xóa thông tin.
- `planValues`: danh sách lớp, tên môn và metadata lớp, dạng rõ, nội bộ.
- `journal`: UUID lượt, thời gian, fingerprint danh tính, mã môn/lớp và bước xử lý; không có mật khẩu, token, body HTTP hoặc cookie.
- `history`: tối đa 20 nhật ký đã được người dùng xác nhận đối chiếu.

Fingerprint chỉ là SHA-256 chuỗi danh tính, dùng đối chiếu nội bộ; không phải ẩn danh chống đoán. Không có dữ liệu nào được tool gửi tới analytics hoặc dịch vụ ngoài IU. Trình duyệt hoặc hệ điều hành vẫn có cơ chế sao lưu/telemetry riêng không do mã extension kiểm soát.

## Nguồn kỹ thuật chính thức

- [Chrome: yêu cầu mạng từ extension](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)
- [Chrome: storage.local và setAccessLevel](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Chrome: cookie và quyền host](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies)

Bản 2.1 bỏ mã hóa lưu trữ theo yêu cầu. Quyền truy cập, giới hạn host, luồng đăng ký và cơ chế giữ nhật ký khi kết quả chưa rõ tiếp tục được áp dụng. SHA-256 trong parser chỉ dùng làm fingerprint danh tính phiên; không dùng để mã hóa tài khoản.
