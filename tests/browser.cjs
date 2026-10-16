'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const https=require('node:https');
const {execFileSync}=require('node:child_process');
const ext=path.resolve(__dirname,'..');
const checks=[];let resetPostCount=0;
let ctx,server;
(async()=>{
 const scratch=path.resolve(process.env.IU_TEST_WORK||'work');fs.mkdirSync(scratch,{recursive:true});
 const profile=fs.mkdtempSync(path.join(scratch,'iu-direct-profile-'));
 const cert=path.join(profile,'test-cert.pem'),key=path.join(profile,'test-key.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=edusoftweb.hcmiu.edu.vn'],{stdio:'ignore'});
 const check=async(name,fn)=>{await fn();checks.push(name)};
 const A='REG01|IT001|Tin học|01|3|3|||||||';
 const B='REG02|MA001|Giải tích|02|3|3|||||||';
 let loggedIn=false,staged=false,failWrite=false;
 const rpcCalls=[],loginBodies=[],unexpected=[],cookieHeaders=[];
 const loginHTML=`<!doctype html><form action="./default.aspx?page=dangnhap" method="post" enctype="multipart/form-data"><input type="hidden" name="__VIEWSTATE" value="fresh-state"><input type="hidden" name="__EVENTVALIDATION" value="fresh-validation"><input name="ctl00$txtTaiKhoa"><input type="password" name="ctl00$txtMatKhau"><input type="submit" name="ctl00$btnDangNhap" value="Đăng Nhập"></form>`;
 const sessionHTML='<!doctype html><span id="Header1_Logout1_lblNguoiDung">Chào bạn TEST STUDENT (TEST001)</span><div id="divTDK"></div><div id="divKQ"></div><button id="btnLuu">Lưu</button><script>AjaxPro.token="TEST-TOKEN";<\/script>';
 const resultHTML=()=>staged?'<table><tr><td>1</td><td style="display:none">REG01</td><td>IT001</td><td>Tin học</td><td>01</td><td><input type="checkbox" name="chk_xoa" id="chk_REG01"></td></tr></table>':'';
 const classesHTML=`<div><input type="checkbox" value="${A}"><fieldset disabled><input type="checkbox" value="${B}"></fieldset></div>`;
 const selection=()=>{const f=Array(39).fill('');Object.assign(f,{0:'0',1:'REG01',2:'1',5:'0',9:'0',12:'IT001',13:'3',14:'Tin học',15:'01',16:'3',21:'0',30:'1',31:'1',32:'1',33:'1',34:'0',35:'1',36:'1'});return f.join('|')};
 server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},async(req,res)=>{
  try{
   const url=new URL(req.url,'https://edusoftweb.hcmiu.edu.vn');
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks).toString();
   cookieHeaders.push(req.headers.cookie||'');
   const send=(value,type='text/html')=>{res.writeHead(200,{'Content-Type':type});res.end(value)};
   if(url.pathname.toLowerCase()==='/default.aspx'){
    if(req.method==='POST'){loginBodies.push(body);loggedIn=true;return send(sessionHTML);}
    return send(loggedIn?sessionHTML:loginHTML);
   }
   if(url.pathname==='/ajaxpro/EduSoft.Web.UC.DangKyMonHoc,EduSoft.Web.ashx'){
    const method=req.headers['x-ajaxpro-method'];const args=JSON.parse(body);rpcCalls.push({method,args,token:req.headers['x-ajaxpro-token']});
    if(failWrite&&method==='DangKySelectedChange'){req.socket.destroy();return;}
    let value='';
    if(method==='LocTheoMonHoc')value=classesHTML;
    else if(method==='ShowDSDaDangKy')value=resultHTML();
    else if(method==='DangKySelectedChange')value=selection();
    else if(method==='LuuVaoKetQuaDangKy'){staged=true;value=resultHTML()+'|';}
    else if(method==='LuuDanhSachDangKy_HopLe')value='||';
    return send(JSON.stringify({value}),'text/plain');
   }
   if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();return;}
   unexpected.push(url.pathname);res.writeHead(404);res.end();
  }catch(error){res.writeHead(500);res.end('fixture error');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 ctx=await chromium.launchPersistentContext(profile,{headless:true,channel:'chromium',ignoreHTTPSErrors:true,args:[`--disable-extensions-except=${ext}`,`--load-extension=${ext}`,`--host-resolver-rules=MAP edusoftweb.hcmiu.edu.vn 127.0.0.1:${port}`,'--no-proxy-server','--ignore-certificate-errors']});
 await ctx.addCookies([{name:'IU_TEST_SESSION',value:'fixture-only',domain:'edusoftweb.hcmiu.edu.vn',path:'/',httpOnly:true,secure:true,sameSite:'Lax'}]);
 await ctx.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='chrome-extension:'||url.origin==='https://edusoftweb.hcmiu.edu.vn')return route.continue();
  unexpected.push(route.request().url());return route.abort();
 });
 const inspect=await ctx.newPage();await inspect.goto('chrome://extensions/');await inspect.locator('extensions-item').first().waitFor();
 const items=await inspect.locator('extensions-item').evaluateAll(els=>els.map(el=>({id:el.id,text:el.shadowRoot.textContent})));
 const item=items.find(x=>x.text.includes('Edusoft Course Registration'));assert.ok(item);
 const page=await ctx.newPage();const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(`chrome-extension://${item.id}/dashboard.html`);
 const status=page.locator('#notice');await status.filter({hasText:'Sẵn sàng.'}).waitFor();
 await check('real unpacked extension loads with exact runtime permissions and no automatic network',async()=>{
  const perms=await page.evaluate(()=>chrome.permissions.getAll());assert.deepEqual(perms.permissions,['storage']);assert.deepEqual(perms.origins,['https://edusoftweb.hcmiu.edu.vn/*']);assert.equal(cookieHeaders.length,0);
 });
 await check('legacy encrypted vault requests re-entry without attempting migration',async()=>{
  await page.evaluate(()=>chrome.storage.local.set({vault:{schema:'iu-local-vault-v1',ciphertext:'fixture-old-ciphertext'}}));
  await page.reload();await status.filter({hasText:'Sẵn sàng.'}).waitFor();
  assert.match(await page.locator('#accountState').textContent(),/Nhập tài khoản/);
  assert.equal(await page.locator('#vaultPassword').count(),0);assert.equal(loginBodies.length,0);
  const saved=await page.evaluate(()=>chrome.storage.local.get('vault'));assert.ok(saved.vault);
 });
 await check('save local account in plaintext and replace legacy vault only after explicit save',async()=>{
  await page.locator('#username').fill('fixture-account');await page.locator('#schoolPassword').fill('fixture-school-password');await page.locator('#saveAccount').click();
  await status.filter({hasText:'Đã lưu tài khoản/mật khẩu cục bộ'}).waitFor();
  const saved=await page.evaluate(()=>chrome.storage.local.get());assert.deepEqual(saved.account,{username:'fixture-account',password:'fixture-school-password'});assert.equal(saved.vault,undefined);
 });
 await check('reload restores masked credentials without unlock or automatic login',async()=>{
  const before=cookieHeaders.length;await page.reload();await status.filter({hasText:'Sẵn sàng.'}).waitFor();
  assert.equal(await page.locator('#username').inputValue(),'fixture-account');assert.equal(await page.locator('#schoolPassword').inputValue(),'fixture-school-password');assert.equal(await page.locator('#schoolPassword').getAttribute('type'),'password');assert.equal(await page.locator('#vaultPassword').count(),0);assert.equal(cookieHeaders.length,before);
 });
 await check('direct login uses fresh WebForms state and posts credentials only to mocked IU',async()=>{
  await page.locator('#login').click();await status.filter({hasText:'Đã nhận phiên từ trường'}).waitFor();assert.equal(loginBodies.length,1);for(const s of ['fixture-account','fixture-school-password','fresh-state','fresh-validation'])assert.ok(loginBodies[0].includes(s));assert.match(await page.locator('#identity').textContent(),/TEST STUDENT/);
 });
 await check('authenticated requests include browser cookie without cookie API permission',async()=>assert.ok(cookieHeaders.some(s=>s.includes('IU_TEST_SESSION=fixture-only'))));
 await check('API filter parses classes; fieldset-disabled class is not selectable',async()=>{
  await page.locator('#courseFilter').fill('IT001');await page.locator('#filterButton').click();await status.filter({hasText:'Đã đọc lớp trực tiếp'}).waitFor();const rows=page.locator('#classes .row');assert.equal(await rows.count(),2);assert.equal(await rows.nth(1).getByRole('button').isDisabled(),true);await rows.nth(0).getByRole('button').click();await page.locator('#planCount').filter({hasText:'1'}).waitFor();assert.equal(rpcCalls.some(c=>c.method==='DangKySelectedChange'),false);
 });
 if(process.env.SCREENSHOT_PATH)await page.screenshot({path:process.env.SCREENSHOT_PATH,fullPage:true});
 const school=await ctx.newPage();await school.goto('https://edusoftweb.hcmiu.edu.vn/default.aspx?page=dkmonhoc');const cdp=await ctx.newCDPSession(school);await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await page.bringToFront();
 await check('full API batch works while school tab lifecycle is frozen',async()=>{
  await page.locator('#readResults').click();await status.filter({hasText:'Đã đọc danh sách hiện tại'}).waitFor();
  await page.locator('#authorize').check();await page.locator('#run').click();await status.filter({hasText:'Máy chủ đã phản hồi các bước lưu'}).waitFor({timeout:25000});const writes=rpcCalls.filter(c=>['DangKySelectedChange','LuuVaoKetQuaDangKy','LuuDanhSachDangKy','LuuDanhSachDangKy_HopLe'].includes(c.method));assert.equal(writes.length,4);assert.ok(writes.every(c=>c.token==='TEST-TOKEN'));assert.equal(writes[1].args.isValidTKB,false);assert.equal(writes[1].args.isValidCoso,false);const j=await page.evaluate(async()=>(await chrome.storage.local.get('journal')).journal);assert.equal(j.phase,'COMPLETED_CHECK_REQUIRED');assert.match(await page.locator('#results').textContent(),/REG01/);
 });
 await check('a pending completion journal prevents another batch without sending requests',async()=>{
  await page.waitForFunction(()=>!document.getElementById('run').disabled);const count=rpcCalls.length;await page.locator('#authorize').check();await page.locator('#run').click();await status.filter({hasText:'PENDING'}).waitFor();assert.equal(rpcCalls.length,count);
 });
 await check('review acknowledgement clears journal without altering server selections',async()=>{
  await page.locator('#readResults').click();await status.filter({hasText:'Đã đọc danh sách hiện tại'}).waitFor();await page.locator('#ackJournal').click();await status.filter({hasText:'Đã lưu trữ nhật ký'}).waitFor();const d=await page.evaluate(()=>chrome.storage.local.get(['journal','history']));assert.equal(d.journal,undefined);assert.equal(d.history.length,1);assert.equal(staged,true);
 });
 staged=false;failWrite=true;
 await check('broken connection keeps UNKNOWN and never advances to stage/save (browser may replay POST)',async()=>{
  await page.locator('#readResults').click();await status.filter({hasText:'Đã đọc danh sách hiện tại'}).waitFor();const before=rpcCalls.length;await page.locator('#authorize').check();await page.locator('#run').click();await status.filter({hasText:'UNKNOWN'}).waitFor();const after=rpcCalls.slice(before);resetPostCount=after.filter(c=>c.method==='DangKySelectedChange').length;assert.ok(resetPostCount>=1);assert.equal(after.filter(c=>c.method==='LuuVaoKetQuaDangKy').length,0);const j=await page.evaluate(async()=>(await chrome.storage.local.get('journal')).journal);assert.equal(j.phase,'UNKNOWN');
 });
 await check('reload preserves unknown journal, plan and saved account without automatic requests',async()=>{
  const before=rpcCalls.length;await page.reload();await status.filter({hasText:'Sẵn sàng.'}).waitFor();assert.equal(rpcCalls.length,before);assert.match(await page.locator('#journal').textContent(),/UNKNOWN/);assert.equal(await page.locator('#schoolPassword').inputValue(),'fixture-school-password');assert.equal(await page.locator('#planCount').textContent(),'1');
 });
 await check('real DOM parser refuses hostile login targets and mismatched result rows',async()=>{
  const r=await page.evaluate(async()=>{const p=await import('./parser.js');const out=[];for(const html of ['<table><tr><td>1</td><td>WRONG</td><td>IT001</td><td>Tin học</td><td><input name="chk_xoa" type="checkbox" id="chk_REG01"></td></tr></table>']){try{p.resultFrom(html);out.push(false)}catch{out.push(true)}}return out});assert.deepEqual(r,[true]);
  const fail=await page.evaluate(async html=>{const p=await import('./parser.js');try{p.loginForm(html.replace('./default.aspx?page=dangnhap','https://evil.test/login'),'u','p');return false}catch{return true}},loginHTML);assert.equal(fail,true);
 });
 await check('deleting saved account clears credentials and preserves pending journal and plan',async()=>{
  await page.locator('#deleteAccount').click();await status.filter({hasText:'Đã xóa thông tin đăng nhập cục bộ'}).waitFor();
  const saved=await page.evaluate(()=>chrome.storage.local.get());assert.equal(saved.account,undefined);assert.equal(saved.vault,undefined);assert.equal(saved.journal.phase,'UNKNOWN');assert.equal(saved.planValues.length,1);assert.equal(await page.locator('#schoolPassword').inputValue(),'');
  await page.reload();await status.filter({hasText:'Sẵn sàng.'}).waitFor();assert.equal(await page.locator('#username').inputValue(),'');assert.equal(await page.locator('#schoolPassword').inputValue(),'');
 });
 await check('no script errors or unexpected network origins',async()=>{assert.deepEqual(pageErrors,[]);assert.deepEqual(unexpected,[])});
 await cdp.send('Page.setWebLifecycleState',{state:'active'});await ctx.close();ctx=null;await new Promise(resolve=>server.close(resolve));server=null;fs.rmSync(profile,{recursive:true,force:true});
 console.log(JSON.stringify({passed:checks.length,checks,observedPOSTsForOneFetchWhenSocketReset:resetPostCount,environment:'Real unpacked extension, Chromium headless, local TLS fixture with hostname mapped to 127.0.0.1; no real IU login or registration requests'},null,2));
})().catch(async error=>{console.error(error);if(ctx)await ctx.close();if(server)await new Promise(resolve=>server.close(resolve));process.exitCode=1});
