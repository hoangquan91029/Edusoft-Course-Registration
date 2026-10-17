<div align="center">

# Edusoft Course Registration

**A dedicated dashboard for planning and submitting IU course registrations.**  
*Bảng điều khiển riêng để lập kế hoạch và gửi đăng ký môn học tại IU.*

![Version 2.1.0](https://img.shields.io/badge/version-2.1.0-2563eb)
![Manifest V3](https://img.shields.io/badge/extension-Manifest_V3-7c3aed)
![Chrome and Edge 120+](https://img.shields.io/badge/Chrome_%26_Edge-120%2B-059669)
![Vanilla JavaScript](https://img.shields.io/badge/built_with-JavaScript-f7df1e?logo=javascript&logoColor=111827)

[Get started / Cài đặt](#get-started--cài-đặt) · [Workflow / Sử dụng](#workflow--sử-dụng) · [Safety / An toàn](#safety--an-toàn) · [Development / Phát triển](#development--phát-triển)

</div>

---

Edusoft Course Registration is a Manifest V3 browser extension scoped to **`https://edusoftweb.hcmiu.edu.vn/`**. It communicates with the portal’s AjaxPro API from its own tab, so registration does not depend on clicking checkboxes or running JavaScript in the school’s page. The dashboard interface is in Vietnamese.

Đây là tiện ích trình duyệt Manifest V3 dành riêng cho cổng IU. Tiện ích gửi yêu cầu trực tiếp đến API AjaxPro từ tab riêng, giúp thao tác độc lập với giao diện trang trường. Bảng điều khiển sử dụng tiếng Việt.

> [!IMPORTANT]
> **Verification status:** the repository includes unit tests and a local browser fixture. The existing test report does **not** demonstrate a successful real IU login or course registration. Always verify the final registration status on the official portal.
>
> **Mức kiểm chứng:** kiểm thử đơn vị và mô phỏng trình duyệt chưa chứng minh đăng nhập hoặc đăng ký thành công trên IU thật. Luôn đối chiếu trạng thái đăng ký chính thức trên cổng trường.

## Features / Tính năng

| | English | Tiếng Việt |
|---|---|---|
| **Dedicated dashboard** | Work in a separate extension tab, independently of the portal UI. | Thao tác từ tab tiện ích riêng, độc lập với giao diện cổng trường. |
| **Session options** | Sign in with a password or capture an existing portal session. | Đăng nhập bằng mật khẩu hoặc nhận phiên đã đăng nhập trên cổng trường. |
| **Course planning** | Fetch classes by course code; build a local plan of up to 30 classes. | Lấy lớp theo mã môn; lập kế hoạch cục bộ tối đa 30 lớp. |
| **Portable plans** | Import and export JSON plans, including the IU Safe 1.0 format. | Nhập, xuất kế hoạch JSON, tương thích định dạng IU Safe 1.0. |
| **Reviewed submissions** | Review the account, existing server results, and plan before confirming. | Đối chiếu tài khoản, danh sách trên máy chủ và kế hoạch trước khi xác nhận. |
| **Persistent journal** | Unreviewed runs block another submission, including after a reload. | Nhật ký chưa đối chiếu chặn lượt mới, kể cả sau khi tải lại. |
| **Narrow permissions** | Uses `storage` and access to the IU portal only. | Chỉ dùng quyền `storage` và truy cập cổng IU. |

## Get started / Cài đặt

**Requirements / Yêu cầu:** desktop Chrome or Edge **120+**. No build step, npm installation, or local server is needed to use the extension.  
Chrome hoặc Edge **120+** trên máy tính. Không cần biên dịch, cài npm hay chạy máy chủ cục bộ để sử dụng.

1. **Download or clone this repository.** If you downloaded a ZIP, extract it to a permanent folder.  
   **Tải hoặc clone mã nguồn.** Nếu tải ZIP, giải nén vào một thư mục cố định.
2. **Open `chrome://extensions` or `edge://extensions`** and enable **Developer mode**.  
   **Mở trang quản lý tiện ích** và bật **Chế độ dành cho nhà phát triển**.
3. **Choose “Load unpacked”** and select the folder containing `manifest.json`.  
   **Chọn “Tải tiện ích đã giải nén”** và chọn thư mục chứa `manifest.json`.
4. **Click the extension icon → “Mở bảng điều khiển”.** Keep the dashboard tab open during use.  
   **Bấm biểu tượng tiện ích → “Mở bảng điều khiển”.** Giữ tab này mở khi thao tác.

Disable older Edusoft extensions before use and reload any portal tabs to remove previously injected scripts. For updates, keep the same installation folder, click **Reload** on the extensions page, and reopen the dashboard.

Tắt các tiện ích Edusoft cũ và tải lại tab trường trước khi dùng. Khi cập nhật, giữ nguyên thư mục cài đặt, bấm **Tải lại** ở trang quản lý tiện ích rồi mở lại bảng điều khiển.

## Workflow / Sử dụng

### 1. Connect your account / Kết nối tài khoản

Use **Đăng nhập bằng mật khẩu** to sign in from the dashboard, or sign in on the IU portal and choose **Nhận phiên hiện tại**. Check the displayed account identity. Captured sessions can be used to start a new operation for up to **15 minutes** before recapture is required.

Chọn **Đăng nhập bằng mật khẩu**, hoặc đăng nhập trên cổng IU rồi bấm **Nhận phiên hiện tại**. Đối chiếu đúng tài khoản hiển thị. Phiên ghi nhận được dùng để bắt đầu thao tác mới trong tối đa **15 phút**, sau đó cần nhận lại phiên.

For CAPTCHA, SSO, or an unsupported login form, sign in through the official portal and capture that session.  
Nếu gặp CAPTCHA, SSO hoặc form đăng nhập chưa hỗ trợ, đăng nhập trên cổng chính thức rồi nhận phiên.

### 2. Build your plan / Lập kế hoạch

Enter a course code, click **Lấy lớp**, and add the intended groups. Locked classes cannot be added. Plans are saved locally; use **Xuất JSON** or the JSON import control to move a plan between installations.

Nhập mã môn, bấm **Lấy lớp** và thêm đúng nhóm cần đăng ký. Lớp bị khóa không thể thêm. Kế hoạch được lưu cục bộ; dùng **Xuất JSON** hoặc nhập JSON để chuyển kế hoạch giữa các bản cài đặt.

### 3. Review and submit / Đối chiếu và gửi

Click **Đọc kết quả từ máy chủ**. Review the account, the complete existing list, and your plan. Tick the authorization checkbox, click **Đăng ký và lưu qua API**, and confirm. The engine refreshes class data and checks the reviewed baseline before writing.

Bấm **Đọc kết quả từ máy chủ**. Đối chiếu tài khoản, toàn bộ danh sách hiện tại và kế hoạch. Đánh dấu ô cho phép, bấm **Đăng ký và lưu qua API** rồi xác nhận. Engine lấy lại dữ liệu lớp và kiểm tra danh sách đã duyệt trước khi ghi.

> The portal’s save operation may finalize **existing session entries as well as newly added classes**. Avoid registering, switching accounts, or signing out in other tabs during a run.
>
> Lệnh lưu có thể chốt **cả các lớp đã có trong phiên và lớp vừa thêm**. Tránh đăng ký, đổi tài khoản hoặc đăng xuất ở tab khác trong khi chạy.

### 4. Verify the result / Kiểm tra kết quả

Check the official registration status on the IU portal, even after the dashboard receives all expected class codes. Then read server results and use **Đã đối chiếu ở trường — mở lượt mới** to archive the journal and allow another run.

Kiểm tra trạng thái đăng ký chính thức trên cổng IU, kể cả khi bảng điều khiển đã nhận đủ mã lớp. Sau đó đọc kết quả từ máy chủ và bấm **Đã đối chiếu ở trường — mở lượt mới** để lưu trữ nhật ký, cho phép lượt tiếp theo.

## Safety / An toàn

### Credentials and local data / Thông tin đăng nhập và dữ liệu cục bộ

> [!WARNING]
> **Saved passwords are unencrypted in `chrome.storage.local`.** Anyone able to read the browser profile may be able to read them. Password masking only hides the on-screen text. Saving credentials is optional; you can sign in once without saving them.
>
> **Mật khẩu được lưu không mã hóa trong `chrome.storage.local`.** Người đọc được dữ liệu profile trình duyệt có thể đọc mật khẩu. Che ký tự chỉ bảo vệ phần hiển thị. Có thể đăng nhập một lần mà không lưu thông tin.

Credentials are saved only when you choose **Lưu tài khoản**. Reopening the dashboard fills the fields but does not sign you in automatically. **Xóa thông tin đã lưu** removes saved credentials while preserving plans and journals; it does not sign you out of the portal.

Thông tin chỉ được lưu khi bấm **Lưu tài khoản**. Mở lại bảng điều khiển sẽ tự điền các ô, không tự đăng nhập. **Xóa thông tin đã lưu** xóa tài khoản/mật khẩu đã lưu, giữ kế hoạch và nhật ký; thao tác này không đăng xuất khỏi cổng trường.

The extension uses local storage rather than Chrome sync, includes no analytics or remote scripts, and does not read cookies through the cookies API. The browser attaches eligible session cookies to portal requests.

Tiện ích dùng lưu trữ cục bộ thay vì đồng bộ Chrome, không chứa analytics hay script từ xa và không đọc cookie qua cookies API. Trình duyệt tự gắn cookie phiên phù hợp vào yêu cầu đến trường.

### Uncertain results / Kết quả chưa rõ

Before each state-changing request, the engine persists a journal entry. It does not automatically retry those requests or resume an interrupted run. Read requests have bounded retries; writes are sequential and spaced at least three seconds apart.

Trước mỗi yêu cầu thay đổi trạng thái, engine ghi nhật ký cục bộ. Tiện ích không tự thử lại yêu cầu ghi hoặc tiếp tục lượt bị gián đoạn. Yêu cầu đọc có số lần thử giới hạn; lệnh ghi chạy tuần tự, cách nhau tối thiểu ba giây.

| Journal state | Meaning / Ý nghĩa |
|---|---|
| `UNKNOWN` | The request may have been processed; the outcome is uncertain. / Máy chủ có thể đã xử lý; chưa xác định được kết quả. |
| `HELD` | A warning or unsupported response stopped the run; earlier steps may have taken effect. / Cảnh báo hoặc phản hồi chưa hỗ trợ làm dừng lượt; bước trước có thể đã có hiệu lực. |
| `MAYBE_SENT` / `RECEIVED` | An interrupted checkpoint requires review. / Cần đối chiếu sau khi gián đoạn ở một bước xử lý. |
| `COMPLETED_CHECK_REQUIRED` | Supported save responses and expected codes were received; official status still needs checking. / Đã nhận phản hồi lưu được hỗ trợ và đủ mã; vẫn phải kiểm tra trạng thái chính thức. |

**Recovery:** read server results, verify the correct account and official portal status, then acknowledge the journal. **Dừng** stops further work but cannot undo a request the server already received.

**Khôi phục:** đọc kết quả máy chủ, kiểm tra đúng tài khoản và trạng thái chính thức, rồi xác nhận đối chiếu nhật ký. **Dừng** ngừng các bước tiếp theo nhưng không hoàn tác yêu cầu máy chủ đã nhận.

Chromium may replay a POST internally after a connection reset, even when the application calls `fetch` once. The existing browser fixture observed this behavior. The project therefore cannot guarantee exactly-once delivery. See [design and limitations](THIET_KE_VA_GIOI_HAN.md).

Chromium có thể tự phát lại POST sau khi kết nối bị ngắt dù ứng dụng chỉ gọi `fetch` một lần; kiểm thử mô phỏng đã ghi nhận hành vi này. Vì vậy không thể bảo đảm máy chủ chỉ nhận đúng một lần. Xem [thiết kế và giới hạn](THIET_KE_VA_GIOI_HAN.md).

## Limits / Giới hạn

- **Portal availability:** direct requests avoid dependence on the portal UI, but still depend on IU’s servers, session rules, available seats, and registration windows. / Gửi trực tiếp vẫn phụ thuộc máy chủ IU, phiên, chỗ trống và thời gian đăng ký.
- **Manual exceptions:** conflicts, prerequisites, credit warnings, group changes, and unsupported special cases stop the run for review. / Trùng lịch, điều kiện học, cảnh báo tín chỉ, đổi nhóm và trường hợp đặc biệt chưa hỗ trợ sẽ dừng lượt để kiểm tra.
- **Dashboard lifecycle:** keep the tab open; there is no background scheduler after it closes. / Giữ tab điều khiển mở; tiện ích không có bộ lập lịch chạy ngầm sau khi đóng tab.
- **Session coordination:** the extension locks its own tabs, but cannot lock the school’s page or another extension. / Khóa chỉ phối hợp các tab của tiện ích này, không khóa được trang trường hoặc tiện ích khác.

## Development / Phát triển

The extension uses plain HTML, CSS, and JavaScript modules, with no runtime package dependencies or build pipeline. Node.js is needed only for local tests.

Tiện ích dùng HTML, CSS và JavaScript module, không cần gói phụ thuộc khi chạy hay quy trình build. Node.js chỉ cần cho kiểm thử cục bộ.

### Unit tests / Kiểm thử đơn vị

From the repository root, use a recent Node.js release with built-in `fetch` support:  
Chạy tại thư mục gốc bằng Node.js phiên bản mới có hỗ trợ `fetch` tích hợp:

```sh
npm test
```

### Browser fixture / Mô phỏng trình duyệt

The optional browser suite requires **Playwright, its Chromium browser, and OpenSSL**. To prepare a local test environment:  
Bộ kiểm thử tùy chọn cần **Playwright, Chromium của Playwright và OpenSSL**. Chuẩn bị môi trường kiểm thử:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser.cjs
```

The suite loads the unpacked extension in a temporary browser profile and maps the IU hostname to a local TLS fixture **inside the test browser only**. Test certificate exceptions apply to that browser; normal extension use retains browser TLS checks. It uses synthetic credentials and makes no real IU login or registration requests.

Bộ kiểm thử tải tiện ích vào profile tạm và ánh xạ hostname IU đến máy chủ TLS cục bộ **chỉ trong trình duyệt kiểm thử**. Ngoại lệ chứng chỉ chỉ dành cho trình duyệt đó; tiện ích khi dùng bình thường vẫn kiểm tra TLS. Bộ test dùng tài khoản giả, không gửi đăng nhập hoặc đăng ký thật đến IU.

The checked-in [test report](KET_QUA_KIEM_THU.txt) records **42 passing unit tests and 15 passing browser scenarios**. These are fixture results, not proof of live portal compatibility.

[Báo cáo kiểm thử đã lưu](KET_QUA_KIEM_THU.txt) ghi nhận **42 kiểm thử đơn vị và 15 tình huống trình duyệt đạt**. Kết quả mô phỏng không chứng minh tương thích với phiên thật trên cổng trường.

### Source map / Cấu trúc mã nguồn

| File | Responsibility / Vai trò |
|---|---|
| `manifest.json` | Manifest V3, permissions, and content security policy / Khai báo tiện ích, quyền và CSP |
| `popup.html` · `popup.js` | Dashboard entry point / Mở bảng điều khiển |
| `dashboard.html` · `dashboard.js` · `style.css` | Account, plan, results, and journal UI / Giao diện tài khoản, kế hoạch, kết quả và nhật ký |
| `account.js` | Credential validation / Kiểm tra thông tin đăng nhập |
| `core.js` | Class values and plan import/export / Dữ liệu lớp và nhập, xuất kế hoạch |
| `session.js` | WebForms login and session capture / Đăng nhập WebForms và nhận phiên |
| `transport.js` | Allowed endpoints, timeouts, read retries, and write pacing / Endpoint cho phép, timeout, thử lại lệnh đọc và giãn cách lệnh ghi |
| `parser.js` | Session, class, and response validation / Phân tích và kiểm tra phiên, lớp, phản hồi |
| `engine.js` | Sequential registration, locking, and persistent journal / Đăng ký tuần tự, khóa và nhật ký bền vững |
| `tests/` | Unit tests and local browser fixture / Kiểm thử đơn vị và mô phỏng trình duyệt |

## Documentation / Tài liệu

| Document | Contents / Nội dung |
|---|---|
| [Hướng dẫn sử dụng](HUONG_DAN.md) | Detailed Vietnamese installation, usage, upgrades, and recovery guide / Hướng dẫn chi tiết bằng tiếng Việt |
| [Thiết kế và giới hạn](THIET_KE_VA_GIOI_HAN.md) | Architecture, storage, protocol assumptions, and safety boundaries / Kiến trúc, lưu trữ, giả định giao thức và giới hạn an toàn |
| [Protocol observations](PROTOCOL_OBSERVED.json) | Recorded public protocol observations / Ghi nhận giao thức công khai |
| [Test results](KET_QUA_KIEM_THU.txt) | Saved automated test output and browser replay observation / Kết quả tự động và ghi nhận POST phát lại |

---

<div align="center">

**Plan carefully. Confirm deliberately. Verify on the portal.**  
*Lập kế hoạch kỹ. Xác nhận rõ ràng. Đối chiếu trên cổng trường.*

</div>
