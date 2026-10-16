import {ProtocolError} from './transport.js';
import {sessionFrom,loginForm,fingerprint} from './parser.js';
export class Session {
  constructor(transport){this.transport=transport;this.current=null;}
  async capture(signal) {
    const html=await this.transport.request('/default.aspx?page=dkmonhoc',{signal});
    const session=sessionFrom(html);
    this.current={...session,fingerprint:await fingerprint(session.identity),capturedAt:Date.now()};
    this.transport.token=session.token;
    return this.current;
  }
  async login(credentials,signal) {
    const html=await this.transport.request('/default.aspx?page=dangnhap',{signal});
    const body=loginForm(html,credentials.username,credentials.password);
    let uncertain=false;
    try { await this.transport.request('/default.aspx?page=dangnhap',{method:'POST',body,write:true,signal}); }
    catch(error) { if(error.code!=='UNKNOWN')throw error;uncertain=true; }
    finally {
      for(const name of [...body.keys()]) body.delete(name);
    }
    // A WebForms success may redirect. Never repeat POST; inspect session with GET.
    try { return {...await this.capture(signal),loginResponseUncertain:uncertain}; }
    catch { this.current=null;this.transport.token='';throw new ProtocolError('AUTH','Chưa xác nhận được đăng nhập. Không tự thử lại mật khẩu. Hãy kiểm tra trên cổng trường.'); }
  }
  require() {
    if(!this.current||Date.now()-this.current.capturedAt>15*60*1000) throw new ProtocolError('AUTH','Hãy nhận lại phiên đăng nhập (phiên ghi nhận có hiệu lực tối đa 15 phút trong tool).');
    return this.current;
  }
  clear(){this.current=null;this.transport.token='';}
}
