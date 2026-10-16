/* New implementation. No code from the original archive is executed. */
(() => {
  'use strict';
  const ORIGIN = 'https://edusoftweb.hcmiu.edu.vn';
  function allowedURL(raw) {
    try {
      const u = new URL(raw);
      return u.origin === ORIGIN && !u.username && !u.password;
    } catch { return false; }
  }
  function registrationURL(raw) {
    if (!allowedURL(raw)) return false;
    const u = new URL(raw);
    return [...u.searchParams].some(([key, value]) =>
      key.toLowerCase() === 'page' && value.toLowerCase() === 'dkmonhoc');
  }
  function parseValue(value) {
    if (typeof value !== 'string' || value.length > 4096 || /[\x00-\x1f\x7f]/.test(value)) {
      throw new Error('Giá trị lớp không hợp lệ.');
    }
    const raw = value.trim();
    const f = raw.split('|');
    if (f.length < 13 || f.length > 40 || !f[0].trim() || !f[1].trim() || !f[2].trim()) {
      throw new Error('Không nhận diện được lớp Edusoft (cần ít nhất 13 trường).');
    }
    return Object.freeze({value: raw, registration: f[0].trim(), course: f[1].trim(), name: f[2].trim(), group: f[3].trim()});
  }
  function uniquePlan(values) {
    if (!Array.isArray(values) || values.length > 30) throw new Error('Tối đa 30 lớp trong kế hoạch.');
    const seen = new Set();
    return values.map(parseValue).filter(item => {
      if (seen.has(item.registration)) throw new Error('Trùng mã đăng ký: ' + item.registration);
      seen.add(item.registration);
      return true;
    });
  }
  function importPlan(text) {
    if (typeof text !== 'string' || text.length > 150000) throw new Error('Tệp quá lớn.');
    const data = JSON.parse(text);
    if (!data || data.schema !== 'edusoft-iu-plan-v1' || data.origin !== ORIGIN) {
      throw new Error('Tệp không phải kế hoạch Edusoft IU của bản này.');
    }
    return uniquePlan(data.values);
  }
  function exportPlan(plan) {
    const checked = uniquePlan(plan.map(item => item.value));
    return JSON.stringify({schema: 'edusoft-iu-plan-v1', origin: ORIGIN, values: checked.map(item => item.value)}, null, 2);
  }
  globalThis.EdusoftIUSafeCore = Object.freeze({ORIGIN, allowedURL, registrationURL, parseValue, uniquePlan, importPlan, exportPlan});
})();
