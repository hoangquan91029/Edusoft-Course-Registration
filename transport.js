export const ORIGIN = 'https://edusoftweb.hcmiu.edu.vn';
export const API = '/ajaxpro/EduSoft.Web.UC.DangKyMonHoc,EduSoft.Web.ashx';
export const READ_METHODS = new Set(['LocTheoMonHoc','ShowDSDaDangKy','KiemTraTrungNhom']);
export const WRITE_METHODS = new Set(['DangKySelectedChange','LuuVaoKetQuaDangKy','LuuDanhSachDangKy','LuuDanhSachDangKy_HopLe']);
export class ProtocolError extends Error {
  constructor(code, message) { super(message); this.name='ProtocolError'; this.code=code; }
}
export function endpoint(path, method) {
  if (method === 'GET' && ['/default.aspx?page=dangnhap','/default.aspx?page=dkmonhoc'].includes(path)) return ORIGIN+path;
  if (method === 'POST' && [API,'/default.aspx?page=dangnhap'].includes(path)) return ORIGIN+path;
  throw new ProtocolError('BLOCKED_URL','Địa chỉ yêu cầu không nằm trong danh sách cho phép.');
}
export function parseEnvelope(text) {
  let value;
  try { value=JSON.parse(text.replace(/^\uFEFF/,'')); }
  catch { throw new ProtocolError('FORMAT','Phản hồi không phải JSON AjaxPro. Không thực thi mã trong phản hồi.'); }
  if (!value || typeof value!=='object' || Array.isArray(value)) throw new ProtocolError('FORMAT','Phong bì AjaxPro không hợp lệ.');
  if (value.error != null) throw new ProtocolError('SERVER_ERROR','Máy chủ trả lỗi AjaxPro. Kiểm tra phiên hoặc điều kiện đăng ký trên cổng trường.');
  if (!Object.hasOwn(value,'value') || typeof value.value!=='string') throw new ProtocolError('FORMAT','Giá trị phản hồi AjaxPro chưa được hỗ trợ.');
  return value.value;
}
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
export class Transport {
  constructor({fetchImpl=globalThis.fetch.bind(globalThis),sleep=delay,timeout=15000,clock=Date.now,random=Math.random,onEvent=()=>{}}={}) {
    this.fetchImpl=fetchImpl;this.sleep=sleep;this.timeout=timeout;this.clock=clock;this.random=random;this.onEvent=onEvent;
    this.lastWrite=-Infinity;this.token='';
  }
  async wait(ms,signal) {
    signal?.throwIfAborted();
    if(!signal)return this.sleep(ms);
    return new Promise((resolve,reject)=>{
      const abort=()=>{signal.removeEventListener('abort',abort);reject(new ProtocolError('STOPPED','Đã dừng trong lúc chờ.'));};
      signal.addEventListener('abort',abort,{once:true});
      Promise.resolve(this.sleep(ms)).then(()=>{signal.removeEventListener('abort',abort);resolve();},error=>{signal.removeEventListener('abort',abort);reject(error);});
    });
  }
  async request(path,{method='GET',body,headers={},write=false,signal}={}) {
    const url=endpoint(path,method);
    const attempts=write?1:3;
    for(let attempt=0;attempt<attempts;attempt++) {
      signal?.throwIfAborted();
      if(write) {
        const gap=3000-(this.clock()-this.lastWrite);
        if(gap>0) await this.wait(gap,signal);
        signal?.throwIfAborted();
        this.lastWrite=this.clock();
      }
      const controller=new AbortController();
      const abort=()=>controller.abort();
      signal?.addEventListener('abort',abort,{once:true});
      const timer=setTimeout(()=>controller.abort(),this.timeout);
      let retryAfter=0;
      try {
        const response=await this.fetchImpl(url,{method,body,headers,credentials:'include',redirect:'error',cache:'no-store',signal:controller.signal});
        if(response.url && !response.url.startsWith(ORIGIN+'/')) throw new ProtocolError('REDIRECT','Phản hồi rời cổng IU.');
        if(!response.ok) {
          const retryable=[429,502,503,504].includes(response.status);
          const raw=response.headers.get('Retry-After');
          if(raw) {
            const seconds=Number(raw);
            retryAfter=Number.isFinite(seconds)?seconds*1000:Math.max(0,Date.parse(raw)-this.clock());
          }
          if(write) throw new ProtocolError('UNKNOWN',`HTTP ${response.status} sau yêu cầu thay đổi. Chưa rõ máy chủ đã xử lý hay chưa.`);
          if(!retryable) throw new ProtocolError('HTTP',`Máy chủ trả HTTP ${response.status}.`);
          throw new ProtocolError('RETRYABLE',`Máy chủ bận: HTTP ${response.status}.`);
        }
        const length=Number(response.headers.get('Content-Length'));
        if(length>4_000_000) throw new ProtocolError('SIZE','Phản hồi vượt giới hạn 4 MB.');
        // Bound memory before parsing, even when Content-Length is absent.
        const reader=response.body?.getReader();
        let text='';
        if(reader) {
          const decoder=new TextDecoder();let bytes=0;
          try {
            while(true) {
              const {done,value}=await reader.read();if(done)break;
              bytes+=value.byteLength;
              if(bytes>4_000_000) { await reader.cancel(); throw new ProtocolError('SIZE','Phản hồi vượt giới hạn 4 MB.'); }
              text+=decoder.decode(value,{stream:true});
            }
            text+=decoder.decode();
          } finally { reader.releaseLock(); }
        } else {
          text=await response.text();
          if(text.length>4_000_000) throw new ProtocolError('SIZE','Phản hồi quá lớn.');
        }
        return text;
      } catch(error) {
        if(write) {
          if(error instanceof ProtocolError && error.code==='BLOCKED_URL') throw error;
          throw new ProtocolError('UNKNOWN','Yêu cầu thay đổi đã được gửi hoặc có thể đã được gửi; kết quả chưa rõ. Không tự gửi lại.');
        }
        if(signal?.aborted) throw new ProtocolError('STOPPED','Đã dừng.');
        if(error instanceof ProtocolError && !['RETRYABLE'].includes(error.code)) throw error;
        if(attempt===attempts-1) throw new ProtocolError('UNAVAILABLE','Không đọc được máy chủ sau 3 lần thử.');
        if(retryAfter>60000) throw new ProtocolError('BACKOFF','Máy chủ yêu cầu chờ hơn 60 giây; dừng lượt này.');
        const wait=Math.max(Number.isFinite(retryAfter)?retryAfter:0,1500*(2**attempt)+Math.floor(this.random()*500));
        this.onEvent(`Máy chủ bận; thử lại yêu cầu đọc sau ${Math.ceil(wait/1000)} giây (${attempt+2}/${attempts}).`);
        await this.wait(wait,signal);
      } finally { clearTimeout(timer);signal?.removeEventListener('abort',abort); }
    }
  }
  async rpc(method,args={},signal) {
    if(!READ_METHODS.has(method)&&!WRITE_METHODS.has(method)) throw new ProtocolError('METHOD','Phương thức không được phép.');
    const headers={'Content-Type':'text/plain; charset=utf-8','X-AjaxPro-Method':method};
    if(this.token) headers['X-AjaxPro-Token']=this.token;
    const text=await this.request(API,{method:'POST',body:JSON.stringify(args),headers,write:WRITE_METHODS.has(method),signal});
    return parseEnvelope(text);
  }
}
