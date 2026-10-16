// Local account storage deliberately has no encryption or unlock password.
export function accountData(data) {
  if(!data || typeof data.username!=='string' || !data.username.trim() || data.username.length>256 || typeof data.password!=='string' || !data.password || data.password.length>2048) throw new Error('Nhập tài khoản và mật khẩu trường hợp lệ.');
  return {username:data.username.trim(),password:data.password};
}
