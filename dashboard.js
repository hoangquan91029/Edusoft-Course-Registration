import "./core.js";
import { accountData } from "./account.js";
import { Transport, ProtocolError } from "./transport.js";
import { Session } from "./session.js";
import { Engine } from "./engine.js";
import { classesFrom, resultFrom } from "./parser.js";
const core = globalThis.EdusoftIUSafeCore;
const $ = (id) => document.getElementById(id);
let plan = [],
  classes = [],
  busy = false,
  reviewedFingerprint = null,
  approvedBaseline = null,
  ready = false;
const message = (text) => {
  $("notice").textContent = text;
};
function log(text) {
  const li = document.createElement("li");
  li.textContent = new Date().toLocaleTimeString("vi-VN") + " · " + text;
  $("events").prepend(li);
  while ($("events").children.length > 100)
    $("events").lastElementChild.remove();
}
const local = chrome.storage.local;
const store = {
  getJournal: async () => (await local.get("journal")).journal || null,
  setJournal: async (j) => local.set({ journal: j }),
};
const transport = new Transport({ onEvent: log });
const session = new Session(transport);
const engine = new Engine({
  transport,
  session,
  store,
  lock: (fn) =>
    navigator.locks.request(
      "edusoft-iu-direct-operation",
      { mode: "exclusive", ifAvailable: true },
      (lock) => fn(Boolean(lock)),
    ),
  onEvent: log,
});
function currentCredentials() {
  return accountData({
    username: $("username").value,
    password: $("schoolPassword").value,
  });
}
function textNode(tag, text, parent) {
  const node = document.createElement(tag);
  node.textContent = text;
  parent.appendChild(node);
  return node;
}
async function persistPlan() {
  await local.set({ planValues: plan.map((p) => p.value) });
}
function renderPlan() {
  $("planCount").textContent = plan.length;
  $("plan").replaceChildren();
  if (!plan.length)
    textNode("p", "Chưa có lớp trong kế hoạch.", $("plan")).className = "muted";
  for (const item of plan) {
    const row = document.createElement("div");
    row.className = "row";
    const info = document.createElement("div");
    textNode("strong", item.course + " · " + item.name, info);
    textNode(
      "div",
      "Mã ĐK " + item.registration + " · Nhóm " + (item.group || "—"),
      info,
    ).className = "meta";
    row.appendChild(info);
    const remove = textNode("button", "Bỏ", row);
    remove.className = "ghost";
    remove.disabled = busy;
    remove.addEventListener("click", () =>
      operate(async () => {
        plan = plan.filter((p) => p.value !== item.value);
        $("authorize").checked = false;
        await persistPlan();
        renderPlan();
        renderClasses();
      }, false),
    );
    $("plan").appendChild(row);
  }
}
function renderClasses() {
  $("classes").replaceChildren();
  if (!classes.length)
    textNode(
      "p",
      "Chưa có lớp tương thích trong kết quả lọc.",
      $("classes"),
    ).className = "muted";
  for (const item of classes) {
    const row = document.createElement("div");
    row.className = "row";
    const info = document.createElement("div");
    textNode("strong", item.course + " · " + item.name, info);
    textNode(
      "div",
      "Mã ĐK " +
        item.registration +
        " · Nhóm " +
        (item.group || "—") +
        " · " +
        (item.enabled
          ? "Máy chủ cho phép chọn trên danh sách"
          : "Đang bị khóa"),
      info,
    ).className = "meta";
    row.appendChild(info);
    const add = textNode("button", "Thêm", row);
    add.className = "secondary";
    add.disabled =
      busy ||
      !item.enabled ||
      plan.some((p) => p.registration === item.registration);
    add.addEventListener("click", () =>
      operate(async () => {
        plan = core.uniquePlan([...plan.map((p) => p.value), item.value]);
        $("authorize").checked = false;
        await persistPlan();
        renderPlan();
        renderClasses();
      }, false),
    );
    $("classes").appendChild(row);
  }
}
function renderResults(rows) {
  $("results").replaceChildren();
  if (!rows.length) {
    textNode(
      "p",
      "Máy chủ trả danh sách rỗng theo cấu trúc được hỗ trợ. Đây không phải bằng chứng hoàn tác một yêu cầu trước đó.",
      $("results"),
    );
    return;
  }
  const table = document.createElement("table");
  const header = document.createElement("tr");
  for (const name of ["Mã đăng ký", "Mã môn", "Tên môn"])
    textNode("th", name, header);
  table.appendChild(header);
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const value of [row.registration, row.course, row.name])
      textNode("td", value || "—", tr);
    table.appendChild(tr);
  }
  $("results").appendChild(table);
}
async function renderJournal() {
  const j = await store.getJournal();
  $("journal").hidden = !j;
  $("ackJournal").hidden = !j;
  if (j)
    $("journal").textContent =
      "Lượt cần đối chiếu: " +
      j.phase +
      "\nBước gần nhất: " +
      (j.method || "—") +
      "\nCập nhật: " +
      j.updatedAt +
      "\nTool sẽ không chạy lượt mới cho tới khi bạn đọc kết quả và xác nhận đã đối chiếu trên cổng trường.";
}
function renderSession(s) {
  $("identity").textContent = s.identity;
  $("authorize").checked = false;
  reviewedFingerprint = null;
  approvedBaseline = null;
}
function setBusy(value) {
  busy = value;
  for (const b of document.querySelectorAll("[data-idle]"))
    b.disabled = value || !ready;
  $("stop").disabled = !value;
  $("authorize").disabled = value;
  for (const id of ["saveAccount", "deleteAccount"])
    $(id).disabled = value || !ready;
  renderPlan();
  renderClasses();
}
async function operate(fn, network = true) {
  if (!ready) {
    message("Chưa khởi tạo xong hoặc lưu trữ cục bộ không sẵn sàng.");
    return;
  }
  if (busy) {
    message("Đang có thao tác chạy.");
    return;
  }
  setBusy(true);
  try {
    await fn();
  } catch (error) {
    message(
      (error.code ? error.code + " · " : "") +
        (error.message || "Thao tác thất bại."),
    );
    log(
      error.code ||
        "Thao tác thất bại; không ghi thông tin đăng nhập vào nhật ký.",
    );
  } finally {
    setBusy(false);
    try {
      await renderJournal();
    } catch {
      message(
        "Không đọc được nhật ký cục bộ. Dừng và kiểm tra trước khi chạy lại.",
      );
      ready = false;
      setBusy(false);
    }
  }
}
$("accountForm").addEventListener("submit", (e) => e.preventDefault());
$("saveAccount").addEventListener("click", () =>
  operate(async () => {
    const account = currentCredentials();
    await local.set({ account });
    await local.remove("vault");
    $("accountState").textContent =
      "Đã lưu tài khoản trên máy. Thông tin sẽ tự điền khi mở lại tool.";
    message("Đã lưu tài khoản/mật khẩu cục bộ, không mã hóa.");
  }, false),
);
$("deleteAccount").addEventListener("click", () =>
  operate(async () => {
    if (
      !window.confirm(
        "Xóa thông tin đăng nhập đã lưu trên máy? Kế hoạch và nhật ký đăng ký vẫn được giữ.",
      )
    )
      return;
    await local.remove(["account", "vault"]);
    $("username").value = "";
    $("schoolPassword").value = "";
    $("accountState").textContent = "Chưa lưu thông tin đăng nhập.";
    message(
      "Đã xóa thông tin đăng nhập cục bộ. Phiên đăng nhập trường vẫn do trình duyệt quản lý.",
    );
  }, false),
);
$("login").addEventListener("click", () =>
  operate(async () =>
    engine.exclusive(async (signal) => {
      await engine.assertNoPending();
      const credentials = currentCredentials();
      try {
        const s = await session.login(credentials, signal);
        renderSession(s);
        message(
          "Đã nhận phiên từ trường. Hãy đối chiếu tài khoản hiển thị trước khi đăng ký.",
        );
      } finally {
        credentials.password = "";
        credentials.username = "";
      }
    }),
  ),
);
$("capture").addEventListener("click", () =>
  operate(async () =>
    engine.exclusive(async (signal) => {
      const s = await session.capture(signal);
      renderSession(s);
      message(
        "Đã ghi nhận phiên hiện tại trong 15 phút. Tài khoản hiển thị lấy từ phản hồi trường.",
      );
    }),
  ),
);
$("filterForm").addEventListener("submit", (event) => {
  event.preventDefault();
  operate(async () =>
    engine.exclusive(async (signal) => {
      session.require();
      const code = $("courseFilter").value.trim();
      if (!code || code.length > 100) throw new Error("Nhập mã môn hợp lệ.");
      const html = await transport.rpc(
        "LocTheoMonHoc",
        { dkLoc: code },
        signal,
      );
      classes = classesFrom(html);
      renderClasses();
      message(
        "Đã đọc lớp trực tiếp từ máy chủ. Chưa gửi yêu cầu chọn hoặc lưu.",
      );
    }),
  );
});
$("clearPlan").addEventListener("click", () =>
  operate(async () => {
    if (
      !window.confirm("Xóa kế hoạch cục bộ? Không thay đổi môn trên máy chủ.")
    )
      return;
    plan = [];
    await persistPlan();
    $("authorize").checked = false;
    renderPlan();
    renderClasses();
  }, false),
);
$("exportPlan").addEventListener("click", () => {
  try {
    const url = URL.createObjectURL(
      new Blob([core.exportPlan(plan)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "ke-hoach-edusoft-iu.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) {
    message(e.message);
  }
});
$("importPlan").addEventListener("change", () =>
  operate(async () => {
    const file = $("importPlan").files?.[0];
    try {
      if (!file) return;
      if (file.size > 150000) throw new Error("Tệp vượt 150 KB.");
      plan = core.importPlan(await file.text());
      await persistPlan();
      $("authorize").checked = false;
      renderPlan();
      renderClasses();
      message("Đã nhập kế hoạch; chưa gửi yêu cầu đăng ký.");
    } finally {
      $("importPlan").value = "";
    }
  }, false),
);
$("run").addEventListener("click", () =>
  operate(async () => {
    await engine.assertNoPending();
    if (!$("authorize").checked)
      throw new Error(
        "Hãy đối chiếu tài khoản/kế hoạch và đánh dấu cho phép trước.",
      );
    const s = session.require();
    if (!approvedBaseline || approvedBaseline.fingerprint !== s.fingerprint)
      throw new ProtocolError(
        "REVIEW",
        "Bấm “Đọc kết quả từ máy chủ” và đối chiếu cả danh sách hiện tại trước.",
      );
    if (!plan.length) throw new Error("Kế hoạch trống.");
    if (
      !window.confirm(
        "Cho phép CHỌN VÀ LƯU " +
          plan.length +
          " lớp bằng tài khoản đang hiển thị?\n" +
          s.identity +
          "\n\nLệnh lưu có thể chốt cả " +
          approvedBaseline.rows.length +
          " lớp đã có trong danh sách phiên mà bạn vừa đọc." +
          "\n\nKhông thao tác đăng ký/đổi tài khoản ở tab khác trong lúc chạy.",
      )
    )
      return;
    $("authorize").checked = false;
    reviewedFingerprint = null;
    const baseline = approvedBaseline.rows;
    approvedBaseline = null;
    const result = await engine.run(
      plan.map((p) => p.value),
      s.fingerprint,
      baseline,
    );
    renderResults(result.rows);
    message(result.message);
    log(result.phase);
  }),
);
$("stop").addEventListener("click", () => {
  engine.stop();
  message(
    "Đã yêu cầu dừng. Một yêu cầu đang gửi vẫn có thể đã được máy chủ xử lý; kiểm tra nhật ký và kết quả.",
  );
});
$("readResults").addEventListener("click", () =>
  operate(async () =>
    engine.exclusive(async (signal) => {
      const s = session.require();
      const rows = resultFrom(
        await transport.rpc("ShowDSDaDangKy", {}, signal),
      );
      renderResults(rows);
      reviewedFingerprint = s.fingerprint;
      approvedBaseline = {
        fingerprint: s.fingerprint,
        rows: rows.map((r) => ({
          registration: r.registration,
          course: r.course,
        })),
      };
      message(
        "Đã đọc danh sách hiện tại từ máy chủ. Đối chiếu thêm trạng thái đăng ký chính thức trên cổng trường.",
      );
    }),
  ),
);
$("ackJournal").addEventListener("click", () =>
  operate(async () =>
    engine.exclusive(async () => {
      const j = await store.getJournal();
      if (!j) return;
      const s = session.require();
      if (
        j.fingerprint !== s.fingerprint ||
        reviewedFingerprint !== s.fingerprint
      )
        throw new ProtocolError(
          "REVIEW",
          "Nhận đúng phiên tài khoản và bấm “Đọc kết quả từ máy chủ” trước.",
        );
      if (
        !window.confirm(
          "Bạn đã kiểm tra kết quả và trạng thái chính thức trên cổng trường?\nXác nhận này chỉ lưu trữ nhật ký lượt trước và cho phép một lượt mới; không hoàn tác hay tự gửi lại.",
        )
      )
        return;
      const history = (await local.get("history")).history || [];
      await local.set({ history: [...history, j].slice(-20) });
      await local.remove("journal");
      reviewedFingerprint = null;
      approvedBaseline = null;
      message(
        "Đã lưu trữ nhật ký sau xác nhận của bạn. Không gửi thêm yêu cầu đăng ký.",
      );
    }),
  ),
);
window.addEventListener("beforeunload", (event) => {
  if (busy) {
    event.preventDefault();
    event.returnValue = "";
  }
});
async function init() {
  try {
    await local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
    const data = await local.get(["planValues", "account", "vault"]);
    plan = core.uniquePlan(data.planValues || []);
    ready = true;
    if (data.account) {
      try {
        const saved = accountData(data.account);
        $("username").value = saved.username;
        $("schoolPassword").value = saved.password;
        $("accountState").textContent =
          "Đã tự điền thông tin lưu trên máy. Bấm Đăng nhập để sử dụng.";
      } catch {
        $("accountState").textContent =
          "Thông tin lưu không hợp lệ. Hãy nhập và lưu lại.";
      }
    } else {
      $("accountState").textContent = data.vault
        ? "Có kho mã hóa từ bản cũ. Nhập tài khoản/mật khẩu và lưu lại một lần; không cần mật khẩu khóa."
        : "Chưa lưu thông tin. Có thể đăng nhập một lần hoặc bấm Lưu tài khoản.";
    }
    renderPlan();
    renderClasses();
    await renderJournal();
    message("Sẵn sàng. Nhận phiên hiện tại hoặc bấm Đăng nhập bằng mật khẩu.");
  } catch (error) {
    ready = false;
    message("Không khởi tạo được lưu trữ an toàn: " + error.message);
  }
  setBusy(false);
}
init();
