<div align="center">

# Edusoft Course Registration

**A dedicated dashboard for planning and submitting IU course registrations.**

![Version 2.1.0](https://img.shields.io/badge/version-2.1.0-2563eb)
![Manifest V3](https://img.shields.io/badge/extension-Manifest_V3-7c3aed)
![Chrome and Edge 120+](https://img.shields.io/badge/Chrome_%26_Edge-120%2B-059669)
![Vanilla JavaScript](https://img.shields.io/badge/built_with-JavaScript-f7df1e?logo=javascript&logoColor=111827)

[Get started](#get-started) · [Workflow](#workflow) · [Safety](#safety) · [Development](#development)

</div>

---

Edusoft Course Registration is a Manifest V3 browser extension scoped to **`https://edusoftweb.hcmiu.edu.vn/`**. It communicates with the portal’s AjaxPro API from its own tab, so registration does not depend on interacting with the school’s page. The dashboard interface is in Vietnamese.

> [!IMPORTANT]
> **Verification status:** unit tests and a local browser fixture do not demonstrate successful login or course registration against IU. Always confirm the final registration status on the official portal.

## Features

| Feature | Description |
|---|---|
| Dedicated dashboard | Work in a separate extension tab, independently of the portal UI. |
| Session options | Sign in from the dashboard or capture an existing portal session. |
| Course planning | Fetch classes by course code and create a local plan of up to 30 classes. |
| Portable plans | Import and export JSON plans, including the IU Safe 1.0 format. |
| Reviewed submissions | Review the account, existing server results, and plan before confirming. |
| Persistent journal | An unreviewed run blocks another submission, including after a reload. |
| Narrow permissions | Uses `storage` and access to the IU portal only. |

## Get started

**Requirements:** desktop Chrome or Edge **120+**. No build step, npm installation, or local server is needed to use the extension.

1. Download or clone this repository. If you downloaded a ZIP, extract it to a permanent folder.
2. Open `chrome://extensions` or `edge://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.
4. Click the extension icon, then choose **Mở bảng điều khiển** (Open dashboard). Keep the dashboard tab open while using the extension.

Disable older Edusoft extensions before use and reload any portal tabs to remove previously injected scripts. For updates, keep the same installation folder, click **Reload** on the extensions page, and reopen the dashboard.

## Workflow

### 1. Connect your account

Use **Đăng nhập bằng mật khẩu** (Sign in with password) from the dashboard, or sign in on the IU portal and choose **Nhận phiên hiện tại** (Capture current session). Check the displayed account identity. A captured session can start a new operation for up to **15 minutes** before you need to capture it again.

For CAPTCHA, SSO, or an unsupported login form, sign in through the official portal and capture that session.

### 2. Build your plan

Enter a course code, click **Lấy lớp** (Fetch classes), and add the intended groups. Locked classes cannot be added. Plans are saved locally; use **Xuất JSON** (Export JSON) or the JSON import control to move a plan between installations.

### 3. Review and submit

Click **Đọc kết quả từ máy chủ** (Read results from server). Review the account, the complete existing list, and your plan. Check the authorization box, click **Đăng ký và lưu qua API** (Register and save via API), and confirm. The extension refreshes class data and checks the reviewed baseline before writing.

> The portal’s save operation may finalize **existing session entries as well as newly added classes**. Avoid registering, switching accounts, or signing out in other tabs during a run.

### 4. Verify the result

Check the official registration status on the IU portal, even after the dashboard receives all expected class codes. Then read server results and choose **Đã đối chiếu ở trường — mở lượt mới** (Reviewed on portal — start a new run) to archive the journal and allow another run.

## Safety

### Credentials and local data

> [!WARNING]
> **Saved passwords are unencrypted in `chrome.storage.local`.** Anyone who can read the browser profile may be able to read them. Password masking only hides the on-screen text. Saving credentials is optional; you can sign in without saving them.

Credentials are stored only when you choose **Lưu tài khoản** (Save account). Reopening the dashboard fills the fields but does not sign you in automatically. **Xóa thông tin đã lưu** (Delete saved credentials) removes the saved account while preserving plans and journals; it does not sign you out of the portal.

The extension uses local storage rather than Chrome Sync, includes no analytics or remote scripts, and does not read cookies through the cookies API. The browser attaches eligible session cookies to portal requests.

### Uncertain results

Before each state-changing request, the extension persists a journal entry. It does not automatically retry write requests or resume an interrupted run. Read requests have bounded retries; writes run sequentially and are spaced at least three seconds apart.

| Journal state | Meaning |
|---|---|
| `UNKNOWN` | The request may have been processed, but the outcome is uncertain. |
| `HELD` | A warning or unsupported response stopped the run; earlier steps may have taken effect. |
| `MAYBE_SENT` / `RECEIVED` | An interrupted checkpoint requires review. |
| `COMPLETED_CHECK_REQUIRED` | Supported save responses and expected codes were received; official status still needs checking. |

**Recovery:** read server results, verify the correct account and official portal status, then acknowledge the journal. **Dừng** (Stop) halts further work but cannot undo a request the server already received.

Chromium may replay a POST internally after a connection reset, even when the application calls `fetch` once. The existing browser fixture observed this behavior. The extension therefore cannot guarantee exactly-once delivery. See [design and limitations](THIET_KE_VA_GIOI_HAN.md).

## Limits

- **Portal availability:** direct requests avoid dependence on the portal UI, but still depend on IU’s servers, session rules, available seats, and registration windows.
- **Manual exceptions:** conflicts, prerequisites, credit warnings, group changes, and unsupported special cases stop the run for review.
- **Dashboard lifecycle:** keep the tab open; there is no background scheduler after it closes.
- **Session coordination:** the extension locks its own tabs, but cannot lock the school’s page or another extension.

## Development

The extension uses plain HTML, CSS, and JavaScript modules, with no runtime package dependencies or build pipeline. Node.js is needed only for local tests.

### Unit tests

From the repository root, use a recent Node.js release with built-in `fetch` support:

```sh
npm test
```

### Browser fixture

The optional browser suite requires **Playwright, its Chromium browser, and OpenSSL**. To prepare a local test environment:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser.cjs
```

The suite loads the unpacked extension in a temporary browser profile and maps the IU hostname to a local TLS fixture **inside the test browser only**. Test certificate exceptions apply to that browser; normal extension use retains browser TLS checks. It uses synthetic credentials and makes no real IU login or registration requests.

The checked-in [test report](KET_QUA_KIEM_THU.txt) records **42 passing unit tests and 15 passing browser scenarios**. These fixture results do not prove compatibility with a live portal session.

### Source map

| File | Responsibility |
|---|---|
| `manifest.json` | Manifest V3, permissions, and content security policy |
| `popup.html` · `popup.js` | Dashboard entry point |
| `dashboard.html` · `dashboard.js` · `style.css` | Account, plan, results, and journal UI |
| `account.js` | Credential validation |
| `core.js` | Class values and plan import/export |
| `session.js` | WebForms login and session capture |
| `transport.js` | Allowed endpoints, timeouts, read retries, and write pacing |
| `parser.js` | Session, class, and response validation |
| `engine.js` | Sequential registration, locking, and persistent journal |
| `tests/` | Unit tests and local browser fixture |

## Documentation

| Document | Contents |
|---|---|
| [Vietnamese user guide](HUONG_DAN.md) | Installation, usage, upgrades, and recovery instructions |
| [Design and limitations](THIET_KE_VA_GIOI_HAN.md) | Architecture, storage, protocol assumptions, and safety boundaries |
| [Protocol observations](PROTOCOL_OBSERVED.json) | Recorded public protocol observations |
| [Test results](KET_QUA_KIEM_THU.txt) | Automated test output and browser replay observation |

---

<div align="center">

**Plan carefully. Confirm deliberately. Verify on the portal.**

</div>
