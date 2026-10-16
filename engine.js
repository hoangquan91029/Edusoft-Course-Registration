import './core.js';
import {ProtocolError} from './transport.js';
import {selectionArgs,stageArgs,classesFrom,resultFrom,stageResult,commitResult} from './parser.js';
const core=globalThis.EdusoftIUSafeCore;
export class Engine {
  constructor({transport,session,store,lock,onEvent=()=>{},parsers={classesFrom,resultFrom,stageResult}}) {
    this.transport=transport;this.session=session;this.store=store;this.lock=lock;this.onEvent=onEvent;this.parsers=parsers;this.controller=null;
  }
  async exclusive(fn) {
    return this.lock(async acquired=> {
      if(!acquired) throw new ProtocolError('BUSY','Một tab Edusoft Course Registration khác đang sử dụng phiên.');
      if(this.controller) throw new ProtocolError('BUSY','Đang có thao tác chạy.');
      this.controller=new AbortController();
      try { return await fn(this.controller.signal); }
      finally { this.controller=null; }
    });
  }
  stop(){this.controller?.abort();}
  async assertNoPending() {
    if(await this.store.getJournal()) throw new ProtocolError('PENDING','Có lượt trước cần đối chiếu. Không tự gửi lại.');
  }
  async rpcWrite(method,args,journal,signal) {
    signal.throwIfAborted();
    journal.phase='MAYBE_SENT';journal.method=method;journal.updatedAt=new Date().toISOString();
    await this.store.setJournal({...journal}); // Persistence must succeed BEFORE dispatch.
    const value=await this.transport.rpc(method,args,signal);
    journal.phase='RECEIVED';journal.updatedAt=new Date().toISOString();
    await this.store.setJournal({...journal});
    return value;
  }
  async run(values,expectedFingerprint,expectedBaseline=[]) {
    const plan=core.uniquePlan(values);
    if(!Array.isArray(expectedBaseline)||expectedBaseline.length>500||expectedBaseline.some(r=>!r||typeof r.registration!=='string'||typeof r.course!=='string')) throw new ProtocolError('REVIEW','Danh sách hiện tại chưa được duyệt.');
    const approvedBaseline=new Map(expectedBaseline.map(r=>[r.registration,r.course]));
    if(approvedBaseline.size!==expectedBaseline.length) throw new ProtocolError('REVIEW','Danh sách đã duyệt có mã trùng.');
    if(!plan.length) throw new ProtocolError('PLAN','Kế hoạch trống.');
    return this.exclusive(async signal=> {
      await this.assertNoPending();
      const session=this.session.require();
      if(session.fingerprint!==expectedFingerprint) throw new ProtocolError('ACCOUNT','Tài khoản chưa được bạn đối chiếu.');
      const journal={schema:'iu-run-v1',id:crypto.randomUUID(),phase:'PREPARING',fingerprint:session.fingerprint,plan:plan.map(p=>({registration:p.registration,course:p.course})),method:null,updatedAt:new Date().toISOString()};
      let started=false;
      try {
        const baseline=this.parsers.resultFrom(await this.transport.rpc('ShowDSDaDangKy',{},signal));
        assertExact(baseline,approvedBaseline);
        const wanted=new Map(baseline.map(r=>[r.registration,r.course]));
        const todo=plan.filter(item=>!baseline.some(r=>r.registration===item.registration&&r.course===item.course));
        if(!todo.length) return {phase:'ALREADY_PRESENT',rows:baseline,message:'Đã thấy tất cả mã trong danh sách máy chủ; chưa gửi lệnh lưu mới. Kiểm tra trạng thái chính thức trên trường.'};
        if(baseline.some(r=>plan.some(p=>p.course===r.course&&p.registration!==r.registration))) throw new ProtocolError('HOLD','Có môn cùng mã nhưng khác nhóm trong phiên. Không tự đổi nhóm.');
        // No writes until all target classes have fresh server data and are enabled.
        for(const item of todo) {
          const classes=this.parsers.classesFrom(await this.transport.rpc('LocTheoMonHoc',{dkLoc:item.course},signal));
          const matches=classes.filter(c=>c.value===item.value);
          if(matches.length!==1||!matches[0].enabled) throw new ProtocolError('HOLD',`Lớp ${item.registration} không khớp duy nhất hoặc đang bị khóa. Chưa bắt đầu ghi.`);
          wanted.set(item.registration,item.course);
        }
        for(const item of todo) {
          this.onEvent(`Kiểm tra và chọn lớp ${item.registration} qua API.`);
          started=true;
          journal.registration=item.registration;
          const checked=await this.rpcWrite('DangKySelectedChange',selectionArgs(item),journal,signal);
          const args=stageArgs(checked,item);
          const staged=await this.rpcWrite('LuuVaoKetQuaDangKy',args,journal,signal);
          this.parsers.stageResult(staged,item);
        }
        const beforeSave=this.parsers.resultFrom(await this.transport.rpc('ShowDSDaDangKy',{},signal));
        assertExact(beforeSave,wanted);
        const duplicates=await this.transport.rpc('KiemTraTrungNhom',{},signal);
        if(duplicates!=='') throw new ProtocolError('HOLD','Máy chủ báo trùng nhóm hoặc thông báo kiểm tra.');
        this.onEvent('Gửi bước lưu danh sách qua API.');
        const first=await this.rpcWrite('LuuDanhSachDangKy',{},journal,signal);
        if(first!==''&&first!=='true'&&first!=='1') throw new ProtocolError('HOLD','Bước lưu đầu có phản hồi chưa được hỗ trợ. Dừng để đối chiếu.');
        commitResult(await this.rpcWrite('LuuDanhSachDangKy_HopLe',{isCheckSongHanh:true,ChiaHP:false},journal,signal));
        const rows=this.parsers.resultFrom(await this.transport.rpc('ShowDSDaDangKy',{},signal));
        assertExact(rows,wanted);
        journal.phase='COMPLETED_CHECK_REQUIRED';journal.updatedAt=new Date().toISOString();
        await this.store.setJournal({...journal});
        return {phase:journal.phase,rows,message:'Máy chủ đã phản hồi các bước lưu và trả đủ mã lớp. Đối chiếu trạng thái đăng ký chính thức trên cổng trường.'};
      } catch(error) {
        if(started) {
          journal.phase=(error.code==='UNKNOWN'||signal.aborted)?'UNKNOWN':'HELD';
          journal.updatedAt=new Date().toISOString();
          try { await this.store.setJournal({...journal}); } catch { /* Previous MAYBE_SENT/RECEIVED record still blocks future runs. */ }
          this.onEvent('Đã giữ nhật ký. Phải đối chiếu trước khi chạy lượt khác.');
        }
        throw error;
      }
    });
  }
}
function assertExact(rows,wanted) {
  if(rows.length!==wanted.size||rows.some(row=>wanted.get(row.registration)!==row.course)) throw new ProtocolError('HOLD','Danh sách trên máy chủ khác tập mã đã duyệt. Có thể phiên bị thay đổi từ tab khác.');
}
