/* ============================================================
   assets/js/auth.js — ĐĂNG NHẬP / ĐĂNG KÝ / KÍCH HOẠT KEY
   ============================================================ */

/* Fallback nếu CONFIG chưa load */
if (typeof window.CONFIG === 'undefined') {
  window.CONFIG = { OFFLINE_MODE: true, adminEmail: 'admin@tool.com', adminPass: 'admin123', adminName: 'Super Admin' };
}

/* ============ HELPERS ============ */
function $(id) { return document.getElementById(id); }
function fmt(n) { return (Number(n) || 0).toLocaleString('vi-VN') + 'đ'; }
function esc(s) { return String(s || '').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return 'h' + (h >>> 0).toString(36);
}
function setErr(m) { const e = $('loginError'); if (e) e.textContent = m || ''; }

function defaultAvatar() {
  return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect fill='%23e0f2fe' width='200' height='200'/><text x='50%25' y='56%25' font-size='100' text-anchor='middle' dominant-baseline='middle'>🎀</text></svg>";
}

/* ============ LẤY IP (không bao giờ throw) ============ */
let _ip = null;
async function getIP() {
  if (_ip) return _ip;
  const apis = ['https://api.ipify.org?format=json', 'https://api64.ipify.org?format=json', 'https://ipapi.co/json/'];
  for (const url of apis) {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 2500);
      const r = await fetch(url, { cache: 'no-store', signal: c.signal });
      clearTimeout(t);
      if (!r.ok) continue;
      const j = await r.json();
      const ip = j.ip || j.query || j.IPv4;
      if (ip) { _ip = ip; return ip; }
    } catch (e) {}
  }
  let dev = localStorage.getItem('bs_device');
  if (!dev) { dev = 'device-' + Math.random().toString(36).slice(2, 12); localStorage.setItem('bs_device', dev); }
  _ip = dev;
  return dev;
}

/* ============ KHỞI TẠO ADMIN ============ */
(function initAdmin() {
  if (localStorage.getItem('bs_inited')) return;
  const users = DB.users();
  const email = CONFIG.adminEmail.toLowerCase();
  if (!users[email]) {
    users[email] = {
      email, name: CONFIG.adminName,
      pass: hash(CONFIG.adminPass),
      balance: 0, role: 'admin', ip: '',
      joined: Date.now(), lastLogin: Date.now(), expiry: 0, avatar: ''
    };
    DB.setUsers(users);
  }
  localStorage.setItem('bs_inited', '1');
})();

/* ============ TAB ============ */
function switchTab(t) {
  setErr('');
  $('tabLogin').classList.toggle('active', t === 'login');
  $('tabReg').classList.toggle('active', t === 'reg');
  $('formLogin').classList.toggle('hide', t !== 'login');
  $('formReg').classList.toggle('hide', t !== 'reg');
}

/* ============ ĐĂNG KÝ ============ */
async function doRegister() {
  setErr('');
  const name = $('regName').value.trim();
  const email = $('regEmail').value.trim().toLowerCase();
  const p1 = $('regPass').value;
  const p2 = $('regPass2').value;

  if (!name || !email || !p1 || !p2) return setErr('⚠️ Vui lòng nhập đầy đủ thông tin!');
  if (name.length < 2) return setErr('⚠️ Tên hiển thị phải từ 2 ký tự!');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('⚠️ Email không hợp lệ!');
  if (p1.length < 6) return setErr('⚠️ Mật khẩu phải từ 6 ký tự!');
  if (p1 !== p2) return setErr('⚠️ Mật khẩu nhập lại không khớp!');

  const users = DB.users();
  if (users[email]) return setErr('⚠️ Email đã được đăng ký!');

  const ip = await getIP();
  users[email] = {
    email, name, pass: hash(p1),
    balance: 0, role: 'user', ip,
    joined: Date.now(), lastLogin: Date.now(),
    expiry: 0, avatar: ''
  };
  DB.setUsers(users);

  $('regName').value = $('regEmail').value = $('regPass').value = $('regPass2').value = '';
  alert('✅ ĐĂNG KÝ THÀNH CÔNG!\n\n📧 ' + email + '\n🖥 IP: ' + ip + '\n\n⚠️ Tài khoản đã khóa vào thiết bị này.');
  switchTab('login');
}

/* ============ ĐĂNG NHẬP ============ */
async function doLogin() {
  setErr('');
  const email = $('loginEmail').value.trim().toLowerCase();
  const pass = $('loginPass').value;

  if (!email || !pass) return setErr('⚠️ Vui lòng nhập Email và Mật khẩu!');

  const users = DB.users();
  const u = users[email];

  if (!u) return setErr('⚠️ Tài khoản không tồn tại!');
  if (u.pass !== hash(pass)) return setErr('⚠️ Sai mật khẩu!');

  const ip = await getIP();

  if (u.role !== 'admin' && u.ip && !u.ip.startsWith('device-') && !ip.startsWith('device-') && u.ip !== ip) {
    return setErr('🔒 Tài khoản đã bị khóa vào thiết bị khác!\nVui lòng liên hệ Admin để reset.');
  }

  u.lastLogin = Date.now();
  if (!u.ip || u.ip.startsWith('device-')) u.ip = ip;
  users[email] = u;
  DB.setUsers(users);

  DB.setCur(u);
  if (typeof enterApp === 'function') enterApp();
  else location.reload();
}

function doLogout() {
  if (!confirm('Bạn chắc chắn muốn đăng xuất?')) return;
  DB.delCur();
  location.reload();
}

/* ============ KÍCH HOẠT KEY ============ */
async function activateKey() {
  const box = $('keyErr'); box.textContent = '';
  const key = $('keyInput').value.trim().toUpperCase();
  if (!key) { box.textContent = '⚠️ Vui lòng nhập Key!'; return; }

  const keys = DB.keys();
  const k = keys[key];
  if (!k) { box.textContent = '⚠️ Key không tồn tại!'; return; }

  const ip = await getIP();

  if (k.used && k.boundIP) {
    if (k.boundIP === ip) { box.textContent = '⚠️ Key đã kích hoạt trên máy này rồi!'; return; }
    box.textContent = '🔒 Key đã kích hoạt trên thiết bị khác!\n(' + k.boundIP + ')';
    return;
  }

  const u = DB.cur();
  if (!u) { box.textContent = '⚠️ Chưa đăng nhập!'; return; }

  k.used = true; k.boundIP = ip; k.usedBy = u.email; k.usedAt = Date.now();
  DB.setKeys(keys);

  const users = DB.users();
  const cur = users[u.email];
  const now = Date.now();
  const base = (cur.expiry && cur.expiry > now) ? cur.expiry : now;
  const days = k.days || 30;
  cur.expiry = base + days * 86400000;
  users[u.email] = cur;
  DB.setUsers(users);
  DB.setCur(cur);

  const hist = DB.hist();
  hist.unshift({ type: 'key', email: u.email, key, ip, days, time: Date.now() });
  DB.setHist(hist);

  alert('✅ KÍCH HOẠT THÀNH CÔNG!\n\n🔑 Key: ' + key + '\n⏱ +' + days + ' ngày\n📅 Hạn mới: ' + new Date(cur.expiry).toLocaleString('vi-VN') + '\n🖥 IP: ' + ip);
  $('keyInput').value = '';
  closeModal('keyModal');
  if (typeof renderAll === 'function') renderAll();
}
