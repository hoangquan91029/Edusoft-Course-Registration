import './core.js';
import {ORIGIN, ProtocolError} from './transport.js';
const core=globalThis.EdusoftIUSafeCore;
function docOf(html) {
  if(typeof html!=='string'||html.length>4_000_000) throw new ProtocolError('FORMAT','HTML phản hồi không hợp lệ.');
  return new DOMParser().parseFromString(html,'text/html');
}
export function classesFrom(html) {
  const doc=docOf(html);
  const boxes=[...doc.querySelectorAll('input[type="checkbox"]')];
  if(boxes.length>500) throw new ProtocolError('FORMAT','Hãy lọc phạm vi môn hẹp hơn.');
  const items=[];
  for(const box of boxes) {
    try {
      const item=core.parseValue(box.value);
      items.push({...item,enabled:!box.disabled&&!box.closest('fieldset[disabled]')&&box.getAttribute('aria-disabled')!=='true'});
    } catch { /* Ignore unrelated checkboxes. */ }
  }
  return items;
}
export function resultFrom(html) {
  const doc=docOf(html);const out=[];const seen=new Set();
  for(const box of doc.querySelectorAll('input[type="checkbox"][name="chk_xoa"]')) {
    if(!box.id.startsWith('chk_')||box.id.length<=4) throw new ProtocolError('FORMAT','Chưa hỗ trợ mã lớp trong phản hồi kết quả.');
    const registration=box.id.slice(4);
    if(seen.has(registration)) throw new ProtocolError('FORMAT','Phản hồi kết quả có mã đăng ký trùng.');
    seen.add(registration);
    const cells=[...(box.closest('tr')?.querySelectorAll('td')||[])];
    if(cells.length<4) throw new ProtocolError('FORMAT','Chưa nhận diện được hàng kết quả.');
    // Original Edusoft table: STT, hidden registration ID, course, name, group...
    if(cells[1].textContent.trim()!==registration) throw new ProtocolError('FORMAT','Mã lớp trong bảng kết quả không khớp checkbox.');
    out.push({registration,course:cells[2].textContent.trim(),name:cells[3].textContent.trim()});
  }
  if(!out.length && doc.querySelector('table') && doc.body.textContent.trim()) {
    // A new table shape must be reviewed rather than misclassified as an empty list.
    const rows=[...doc.querySelectorAll('tr')].filter(row=>row.querySelector('td'));
    if(rows.some(row=>row.querySelectorAll('td').length>=4)) throw new ProtocolError('FORMAT','Bảng kết quả có cấu trúc khác. Chưa thể đối chiếu tự động.');
  }
  return out;
}
export function sessionFrom(html) {
  const doc=docOf(html);
  if(doc.querySelector('input[type="password"]') || !doc.getElementById('divTDK') || !doc.getElementById('divKQ') || !doc.getElementById('btnLuu')) throw new ProtocolError('AUTH','Phiên chưa đăng nhập hoặc trang đăng ký chưa sẵn sàng.');
  const label=doc.querySelector('[id$="lblNguoiDung"]');
  const identity=label?.textContent.replace(/\s+/g,' ').trim();
  if(!identity||!identity.replace(/chào\s*bạn|hello|welcome/ig,'').trim()) throw new ProtocolError('AUTH','Chưa xác định được tài khoản từ phản hồi trường.');
  let token='';
  for(const script of doc.querySelectorAll('script:not([src])')) {
    const matches=[...script.textContent.matchAll(/AjaxPro\.token\s*=\s*(["'])([^"'\r\n]*)\1/g)];
    for(const match of matches) {
      if(!/^[A-Za-z0-9+/_=.:-]{0,1024}$/.test(match[2])) throw new ProtocolError('TOKEN','Định dạng token phiên chưa được hỗ trợ.');
      token=match[2];
    }
  }
  return {identity,token};
}
export function loginForm(html,username,password) {
  const doc=docOf(html);
  const pass=doc.querySelector('input[type="password"][name$="$txtMatKhau"]');
  const form=pass?.closest('form');
  if(!form) throw new ProtocolError('LOGIN_FORM','Không có form mật khẩu thường. Nếu đã đăng nhập, dùng “Nhận phiên hiện tại”; nếu dùng SSO, đăng nhập qua cổng trường.');
  if(/recaptcha|hcaptcha|turnstile/i.test(form.outerHTML)||form.querySelector('[name*="captcha" i],[id*="captcha" i]')) throw new ProtocolError('CAPTCHA','Có CAPTCHA; hãy đăng nhập trên cổng trường.');
  const user=form.querySelector('input[name$="$txtTaiKhoa"]');
  const submit=form.querySelector('input[type="submit"][name$="$btnDangNhap"]');
  const action=new URL(form.getAttribute('action')||'/default.aspx?page=dangnhap',ORIGIN+'/default.aspx?page=dangnhap');
  if(action.href!==ORIGIN+'/default.aspx?page=dangnhap'||!user||!submit) throw new ProtocolError('LOGIN_FORM','Cấu trúc form đăng nhập thay đổi; chưa gửi tài khoản.');
  const body=new FormData();
  for(const input of form.querySelectorAll('input[type="hidden"][name]')) body.append(input.name,input.value);
  if(!body.has('__VIEWSTATE')) throw new ProtocolError('LOGIN_FORM','Thiếu trạng thái WebForms; chưa gửi thông tin đăng nhập.');
  body.set(user.name,username);body.set(pass.name,password);body.set(submit.name,submit.value);
  return body;
}
export function selectionArgs(item) {
  const f=core.parseValue(item.value).value.split('|');
  const keys=['maDK','maMH','tenMH','maNh','sotc','strSoTCHP','ngaythistr','tietbd','sotiet','soTCTichLuyToiThieuMonYeuCau','choTrung','soTCMinMonYeuCau','maKhoiSinhVien'];
  return Object.fromEntries([['check',true],...keys.map((key,i)=>[key,f[i]])]);
}
export function stageArgs(value,item) {
  if(typeof value!=='string') throw new ProtocolError('HOLD','Không nhận diện được phản hồi kiểm tra điều kiện.');
  const f=value.split('|');
  if(f.length<39||f.length>60) throw new ProtocolError('HOLD','Phản hồi kiểm tra khác cấu trúc đã biết; cần đối chiếu.');
  if(f[1]!==item.registration||f[12]!==item.course||f[15]!==item.group) throw new ProtocolError('HOLD','Máy chủ trả về lớp khác kế hoạch.');
  if(f[2]!=='1'||f[0]!=='0') throw new ProtocolError('HOLD','Máy chủ yêu cầu xử lý hoặc xác nhận riêng cho lớp này.');
  if(f[4]) throw new ProtocolError('HOLD','Lựa chọn này có thể thay thế nhóm đã đăng ký. Dừng để kiểm tra.');
  if(!['0',''].includes(f[5])||!['0',''].includes(f[34])) throw new ProtocolError('HOLD','Có giới hạn số tín chỉ.');
  if([30,31,32,33,36].some(i=>f[i]!=='1')) throw new ProtocolError('HOLD','Điều kiện ngành, tín chỉ hoặc nhóm tự chọn chưa được máy chủ xác nhận.');
  if(!['0',''].includes(f[21]) && !(f[21]==='1'&&f[22]==='1')) throw new ProtocolError('HOLD','Điều kiện học cải thiện chưa rõ.');
  if([6,8,10,24,29,38].some(i=>f[i]!=='')) throw new ProtocolError('HOLD','Có cảnh báo môn học/lịch thi/điều kiện cần bạn xem trên trường.');
  if(!['0',''].includes(f[9])) throw new ProtocolError('HOLD','Có cảnh báo trùng thời khóa biểu.');
  return {isValidCoso:false,isValidTKB:false,maDK:f[1],maMH:f[12],sotc:f[13],tenMH:f[14],maNh:f[15],strsoTCHP:f[16],isCheck:'true',oldMaDK:f[4],strngayThi:f[25],tietBD:f[26],soTiet:f[27],isMHDangKyCungKhoiSV:f[35]};
}
export function stageResult(value,item) {
  const index=value.indexOf('|');
  if(index<0) throw new ProtocolError('HOLD','Phản hồi đưa lớp vào kết quả khác cấu trúc.');
  const html=value.slice(0,index);
  const rows=resultFrom(html);
  if(!rows.some(r=>r.registration===item.registration&&r.course===item.course)) throw new ProtocolError('HOLD','Chưa thấy chính xác lớp vừa chọn trong kết quả máy chủ.');
  return rows;
}
export function commitResult(value) {
  if(!value.includes('||')||value.split('||')[0]!=='') throw new ProtocolError('HOLD','Phản hồi lưu có thông báo hoặc khác cấu trúc; cần đối chiếu trên trường.');
}
export async function fingerprint(identity) {
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity));
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
