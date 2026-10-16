# Edusoft Course Registration 2.1.0

Bản cải tiến theo yêu cầu ngày 15/10/2026: lưu tài khoản/mật khẩu cục bộ không cần mật khẩu khóa, đăng nhập WebForms và đăng ký bằng HTTP AjaxPro trong tab riêng của extension. Không điều khiển DOM hoặc bấm checkbox trên tab trường.

## Cài đặt

1. Tắt bản Edusoft cũ và bản IU Safe 1.0 nếu có. Tải lại tab cổng trường để loại bỏ mã đã được chèn trước đó.
2. Giải nén `Edusoft Course Registration.zip` vào một thư mục cố định.
3. Mở `chrome://extensions` hoặc `edge://extensions`, bật **Developer mode**, chọn **Load unpacked** và chọn thư mục `Edusoft Course Registration` có `manifest.json`.
4. Bấm biểu tượng extension → **Mở bảng điều khiển**. Giữ tab này mở trong khi chạy.

Yêu cầu Chrome/Edge 120 trở lên trên máy tính. Không cần npm hay máy chủ cục bộ để sử dụng. Quyền là `storage` và truy cập duy nhất `https://edusoftweb.hcmiu.edu.vn/*`: quyền host là cần thiết để gửi HTTP trực tiếp từ extension, ngay cả khi tab trường treo hoặc đã đóng. Không có quyền mọi website, cookies API, scripting hoặc content script.

## Lưu tài khoản và mật khẩu nội bộ

- Nhập **Tài khoản trường** và **Mật khẩu trường**, bấm **Lưu tài khoản**. Không có mật khẩu khóa hoặc bước mở khóa.
- Thông tin lưu trực tiếp, không mã hóa trong `chrome.storage.local`; mã không dùng `storage.sync`.
- Lần sau mở tool, hai ô được tự điền; ô mật khẩu vẫn hiển thị dạng che ký tự. Bấm **Đăng nhập bằng mật khẩu** để gửi thông tin tới IU. Tool không tự đăng nhập chỉ vì bạn mở tab.
- Bấm **Xóa thông tin đã lưu** để xóa tài khoản/mật khẩu cục bộ và các ô nhập. Kế hoạch, nhật ký và cookie phiên của trường vẫn được giữ; thao tác này không đăng xuất khỏi trường.
- Có thể nhập thông tin để đăng nhập một lần mà không bấm Lưu, hoặc dùng phiên đã đăng nhập trên cổng trường.

**Thông tin không được mã hóa:** người hoặc phần mềm đọc được dữ liệu profile trình duyệt có thể đọc mật khẩu. Che ký tự trong ô nhập chỉ che phần hiển thị. Sao lưu/copy profile có thể sao chép cả tài khoản và mật khẩu.

### Nâng cấp từ bản 2.0

Giải nén đè vào đúng thư mục đã Load unpacked rồi bấm **Reload** ở trang quản lý extension; đóng tab điều khiển cũ và mở lại. Giữ cùng đường dẫn thư mục để giữ định danh và dữ liệu extension.

Kho mã hóa cũ không thể tự chuyển sang thông tin rõ khi không có khóa. Nếu phát hiện kho cũ, tool báo nhập tài khoản/mật khẩu lại một lần. Chỉ sau khi bạn lưu mới thành công hoặc bấm xóa thông tin, bản mã cũ mới được xóa. Bản mới không có ô yêu cầu mật khẩu khóa.

## Đăng nhập và nhận phiên

Có hai cách:

1. **Đăng nhập bằng mật khẩu:** dùng thông tin tự điền hoặc nhập thông tin một lần. Tool lấy form WebForms mới, giữ các hidden field như `__VIEWSTATE`/`__EVENTVALIDATION`, gửi thông tin đến đúng form HTTPS của IU rồi đọc trang đăng ký để nhận diện tài khoản.
2. **Nhận phiên hiện tại:** đăng nhập bình thường tại [cổng IU](https://edusoftweb.hcmiu.edu.vn/), sau đó bấm nút này. Trình duyệt tự gắn cookie phù hợp vào yêu cầu; tool không đọc hoặc sao chép cookie qua cookies API.

Đối chiếu tài khoản hiển thị trước khi chạy. Nếu có CAPTCHA, SSO Microsoft/Google hoặc form khác cấu trúc đã hỗ trợ, đăng nhập qua cổng trường rồi nhận phiên. Không tự giải CAPTCHA hay tự chạy SSO.

Một phiên được ghi nhận trong tool có hiệu lực tối đa 15 phút để bắt đầu một thao tác mới. Nhận phiên trước giờ cao điểm nếu cần. Khi đã có phiên, lượt đăng ký dùng API và không tải lại giao diện trường ở từng bước. Không đổi tài khoản/đăng xuất hoặc đăng ký từ tab khác khi đang sử dụng tool: các tab cùng profile dùng chung phiên máy chủ. Tool không có endpoint xác minh danh tính tài khoản ở từng RPC, vì vậy không thể phát hiện chắc chắn việc tài khoản bị đổi bên ngoài giữa lượt chạy.

Nếu cài đặt cookie của trình duyệt khiến phiên không được gửi, thao tác có thể báo hết phiên. Không tắt hàng loạt bảo vệ trình duyệt để khắc phục; cần kiểm tra cụ thể cấu hình và phản hồi của cổng trường.

## Lập kế hoạch và chạy API

1. Nhận phiên và kiểm tra tài khoản hiển thị.
2. Nhập mã môn → **Lấy lớp**. Tool gọi `LocTheoMonHoc` trực tiếp. Lớp bị trường khóa không có nút Thêm hoạt động.
3. Thêm đúng nhóm vào kế hoạch. Có thể nhập JSON đã xuất bằng bản IU Safe 1.0; định dạng kế hoạch được giữ tương thích. Tối đa 30 lớp; không cho trùng mã đăng ký. Kế hoạch được lưu cục bộ, không chứa thông tin đăng nhập.
4. Bấm **Đọc kết quả từ máy chủ** để duyệt cả danh sách đã có trong phiên. Lệnh lưu của Edusoft có thể chốt cả những lớp này, không chỉ lớp mới trong kế hoạch. Đối chiếu tài khoản, danh sách hiện tại và kế hoạch, đánh dấu ô cho phép, rồi bấm **Đăng ký và lưu qua API** và xác nhận. Nếu danh sách hiện tại thay đổi so với lúc bạn đọc, tool dừng trước khi ghi.
5. Tool đọc kết quả hiện tại, lọc lại dữ liệu các lớp trên máy chủ, kiểm tra giá trị khớp chính xác và trạng thái khả dụng trước khi bắt đầu các bước thay đổi.
6. Với lớp thông thường thỏa điều kiện, tool gọi `DangKySelectedChange` → `LuuVaoKetQuaDangKy`, rồi đối chiếu toàn bộ tập mã, gọi `KiemTraTrungNhom` → `LuuDanhSachDangKy` → `LuuDanhSachDangKy_HopLe` → `ShowDSDaDangKy`.
7. Đọc kết quả và kiểm tra trạng thái đăng ký chính thức trên cổng trường. Thông báo nhận đủ mã sau chuỗi lưu không thay thế xác nhận chính thức của trường.

Các cảnh báo lịch trùng, tín chỉ, điều kiện học, học cải thiện, đổi nhóm, lớp trực tuyến có luồng riêng hoặc phản hồi khác cấu trúc đều dừng lượt. Bản này không tự phê duyệt các ngoại lệ và không tự gỡ môn đã có. Khi tất cả lớp đã xuất hiện trong danh sách ngay từ đầu, tool báo cần kiểm tra trạng thái và không gửi lại chuỗi lưu chỉ dựa trên việc nhìn thấy mã.

## Khi máy chủ bận hoặc tab trường treo

Tab điều khiển extension thuộc một origin khác với trang trường, chạy các yêu cầu HTTP riêng. Không cần chờ AjaxPro/JavaScript hoặc thao tác UI trong tab trường. Điều này giúp tránh một phần vấn đề giao diện treo hoặc chậm.

API và trang web vẫn có thể dùng chung máy chủ, cơ sở dữ liệu và khóa phiên. Nếu máy chủ không xử lý yêu cầu, hết slot, hết thời gian đăng ký, mạng mất, trình duyệt bị đóng hoặc máy ngủ thì không bảo đảm đăng ký được. Cần đăng nhập/ghi nhận phiên hợp lệ trước; việc nhận phiên và đăng nhập ban đầu vẫn phải đọc phản hồi từ máy chủ.

- Timeout mỗi HTTP là 15 giây.
- Lệnh đọc được thử tối đa 3 lần khi lỗi mạng hoặc HTTP 429/502/503/504; có chờ tăng dần, jitter và tôn trọng `Retry-After` trong giới hạn 60 giây.
- Lệnh làm thay đổi trạng thái chỉ có **một lần gọi fetch ở tầng ứng dụng**, không có vòng lặp retry. Khoảng cách tối thiểu 3 giây giữa các lệnh thay đổi.
- **Giới hạn đã quan sát thực tế:** Chromium có thể tự phát lại một POST khi kết nối TCP bị ngắt, dù JavaScript chỉ gọi fetch một lần. API IU chưa có khóa idempotency được xác minh. Không thể bảo đảm một yêu cầu chỉ được máy chủ nhận đúng một lần. Kiểm thử mô phỏng ngắt socket đã ghi nhận hành vi này; xem `KET_QUA_KIEM_THU.txt`.
- Không tăng số luồng để tranh slot, không chạy găm môn vô hạn. Khóa Web Locks chỉ cho một tab của extension này thực hiện thao tác mạng tại một thời điểm; không khóa được tab trường hoặc extension khác.

## Nhật ký và khôi phục sau lỗi

Trước mỗi lệnh thay đổi, tool phải ghi được nhật ký cục bộ; nếu ghi thất bại thì chưa gửi lệnh đó. Nếu tab đóng hoặc kết quả không rõ, nhật ký giữ lại và chặn lượt mới.

- `UNKNOWN`: yêu cầu có thể đã được xử lý, chưa xác định được kết quả.
- `HELD`: có phản hồi/cảnh báo hoặc cấu trúc chưa hỗ trợ sau khi lượt đã bắt đầu; có thể đã chọn một phần.
- `MAYBE_SENT` / `RECEIVED`: tab có thể đã bị đóng giữa các bước. Đều phải đối chiếu.
- `COMPLETED_CHECK_REQUIRED`: chuỗi lưu đã có phản hồi được hỗ trợ và danh sách trả đúng tập mã, nhưng vẫn cần đối chiếu trạng thái chính thức.

Bấm **Đọc kết quả từ máy chủ**, kiểm tra trực tiếp trên trường, rồi dùng **Đã đối chiếu ở trường — mở lượt mới** để lưu trữ nhật ký và cho phép bạn chủ động chạy lượt khác. Tool không tự tiếp tục, hoàn tác hoặc gửi lại lượt trước. Nếu chưa có đúng phiên tài khoản, hãy đăng nhập trên cổng trường rồi nhận lại phiên. Bấm **Dừng** không hoàn tác một yêu cầu máy chủ đã nhận.

## Mức kiểm chứng hiện tại

Đã đọc GET các mô tả AjaxPro đang được IU công khai và form đăng nhập công khai ngày 15/10/2026. Chưa nhập tài khoản thật, chưa gửi POST đăng nhập/đăng ký thật tới trường. Parser các phản hồi sau đăng nhập hiện dựa trên logic bản gốc và các fixture mô phỏng; các mẫu phản hồi thật, token, cookie và quy tắc máy chủ vẫn cần kiểm chứng trên phiên thực của bạn. Bản này có đường gửi API hoàn chỉnh, nhưng chưa được xem là đã chứng minh đăng ký thành công tại IU.

Nếu API trả cấu trúc khác, tool dừng và giữ nhật ký. Không sửa mã để bỏ điều kiện chỉ nhằm cho nó chạy tiếp. Phải đối chiếu phản hồi đúng trước khi hiệu chỉnh adapter.

## Tự kiểm thử mã nguồn (không cần khi sử dụng)

- `node --test tests/unit.test.mjs`
- `node tests/browser.cjs`: cần Playwright, Chromium và OpenSSL. Bài test dùng profile tạm, TLS server loopback và quy tắc DNS **chỉ trong trình duyệt kiểm thử** để ánh xạ hostname IU về `127.0.0.1`. Không sử dụng tài khoản thật. Cờ bỏ kiểm tra chứng chỉ chỉ dùng trong bài test với chứng chỉ tự ký; mã extension sử dụng bình thường vẫn giữ kiểm tra TLS của trình duyệt.

Nguồn kỹ thuật và thiết kế chi tiết nằm trong `THIET_KE_VA_GIOI_HAN.md`. Kết quả tự động nằm trong `KET_QUA_KIEM_THU.txt`.
