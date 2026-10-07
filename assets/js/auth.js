/* ============================================================
   assets/js/auth.js  —  BẢN TỰ CHỨA (KHÔNG CẦN CONFIG.JS)
   Tự động chuyển sang OFFLINE nếu không có server
   ============================================================ */

/* ============================================================
   ╔══════════════════════════════════════════════════════════╗
   ║              🔧 SỬA 1 DÒNG DUY NHẤT Ở ĐÂY                ║
   ╚══════════════════════════════════════════════════════════╝
   ============================================================ */

/* Nếu bạn CÓ server → điền URL (VD: 'https://api.kiemlua2026.site')
   Nếu bạn KHÔNG có server → để trống '' và bật OFFLINE_MODE = true */
const API_BASE = 'https://toolkiemlua2026.site';

/* true  = dùng localStorage (chạy ngay, không cần server)
   false = gọi server (cần backend đã chạy) */
const OFFLINE_MODE = true;

/* Timeout mỗi request (ms) */
const API_TIMEOUT = 15000;

/* ============================================================
   HẾT PHẦN SỬA — KHÔNG ĐỘNG VÀO BÊN DƯỚI
   ============================================================ */

/* ============================================================
   BIẾN TOÀN CỤC
   ============================================================ */
let _cachedIP   = null;
let _ipFetching = null;
let _authToken  = null;

/* ============================================================
   HELPERS
   ============================================================ */
function _$(id) { return document.getElementById(id); }

function _setLoading(spinnerId, btnTextId, text, loading) {
  const sp = _$(spinnerId);
  const bt = _$(btnTextId);
  if (sp) sp.style.display = loading ? 'inline-block' : 'none';
  if (bt) bt.innerHTML = text;
}

function _setError(msg) {
  const box = _$('loginError');
  if (box) box.textContent = msg || '';
}

function _setKeyError(msg) {
  const box = _$('keyErr');
  if (box) box.textContent = msg || '';
}

function _hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return 'h' + (h >>> 0).toString(36);
}

/* ============================================================
   LẤY IP PUBLIC — KHÔNG BAO GIỜ THROW
   ============================================================ */
async function getIP() {
  if (_cachedIP) return _cachedIP;
  if (_ipFetching) return _ipFetching;

  _ipFetching = (async () => {
    const apis = [
      'https://api.ipify.org?format=json',
      'https://api64.ipify.org?format=json',
      'https://ipapi.co/json/'
    ];

    for (const url of apis) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2500);
        const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        const data = await res.json();
        const ip = data.ip || data.query || data.IPv4;
        if (ip && typeof ip === 'string' && ip.length > 3) {
          _cachedIP = ip;
          return ip;
        }
      } catch (e) {}
    }

    let device = localStorage.getItem('bs_device');
    if (!device) {
      device = 'device-' + Math.random().toString(36).slice(2, 12);
      localStorage.setItem('bs_device', device);
    }
    _cachedIP = device;
    return _cachedIP;
  })();

  return _ipFetching;
}

/* ============================================================
   ╔══════════════════════════════════════════════════════════╗
   ║              OFFLINE DB (localStorage)                   ║
   ╚══════════════════════════════════════════════════════════╝
   ============================================================ */
const _DB = {
  users() { try { return JSON.parse(localStorage.getItem('bs_users') || '{}'); } catch(e) { return {}; } },
  setUsers(v) { localStorage.setItem('bs_users', JSON.stringify(v)); },
  keys() { try { return JSON.parse(localStorage.getItem('bs_keys') || '{}'); } catch(e) { return {}; } },
  setKeys(v) { localStorage.setItem('bs_keys', JSON.stringify(v)); },
  deps() { try { return JSON.parse(localStorage.getItem('bs_deps') || '[]'); } catch(e) { return []; } },
  setDeps(v) { localStorage.setItem('bs_deps', JSON.stringify(v)); },
  hist() { try { return JSON.parse(localStorage.getItem('bs_hist') || '[]'); } catch(e) { return []; } },
  setHist(v) { localStorage.setItem('bs_hist', JSON.stringify(v)); }
};

/* Tạo admin mặc định lần đầu */
(function initAdmin() {
  if (localStorage.getItem('bs_inited')) return;
  const users = _DB.users();
  if (!users['admin@tool.com']) {
    users['admin@tool.com'] = {
      email: 'admin@tool.com', name: 'Super Admin',
      pass: _hash('admin123'), balance: 0, role: 'admin',
      ip: '', joined: Date.now(), lastLogin: Date.now(), expiry: 0, avatar: ''
    };
    _DB.setUsers(users);
  }
  localStorage.setItem('bs_inited', '1');
})();

/* ============================================================
   ╔══════════════════════════════════════════════════════════╗
   ║              HÀM GỌI API TRUNG TÂM                       ║
   ╚══════════════════════════════════════════════════════════╝
   ============================================================ */
async function apiCall(endpoint, method = 'GET', body = null) {
  /* Nếu OFFLINE hoặc chưa cấu hình server → dùng localStorage */
  if (OFFLINE_MODE || !API_BASE) {
    return _offlineCall(endpoint, method, body);
  }

  const url = API_BASE.replace(/\/$/, '') + '/' + endpoint.replace(/^\//, '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (_authToken) headers['Authorization'] = 'Bearer ' + _authToken;

  const options = {
    method, headers,
    signal: ctrl.signal,
    mode: 'cors',
    cache: 'no-store'
  };
  if (body && method !== 'GET') options.body = JSON.stringify(body);

  try {
    const res = await fetch(url, options);
    clearTimeout(timer);
    let data = null;
    try { data = await res.json(); } catch (e) { data = { message: 'Phản hồi không hợp lệ' }; }

    if (!res.ok) {
      const err = new Error(data.message || ('Lỗi HTTP ' + res.status));
      err.status = res.status;
      throw err;
    }
    return data;

  } catch (err) {
    clearTimeout(timer);

    /* Nếu server fail → tự động chuyển sang offline */
    if (!err.status) {
      console.warn('⚠️ Server không phản hồi — chuyển sang OFFLINE MODE');
      return _offlineCall(endpoint, method, body);
    }
    throw err;
  }
}

/* ============================================================
   OFFLINE — XỬ LÝ LOCALSTORAGE
   ============================================================ */
async function _offlineCall(endpoint, method, body) {
  await new Promise(r => setTimeout(r, 150));

  const users = _DB.users();
  const keys = _DB.keys();
  const deps = _DB.deps();
  const ip = await getIP();

  /* -------- REGISTER -------- */
  if (endpoint === '/auth/register') {
    if (users[body.email]) throw new Error('Email đã tồn tại');
    users[body.email] = {
      email: body.email, name: body.name,
      pass: _hash(body.password),
      balance: 0, role: 'user', ip: body.ip || ip,
      joined: Date.now(), lastLogin: Date.now(), expiry: 0, avatar: ''
    };
    _DB.setUsers(users);
    return { message: 'Đăng ký thành công' };
  }

  /* -------- LOGIN -------- */
  if (endpoint === '/auth/login') {
    const u = users[body.email];
    if (!u) throw new Error('Tài khoản không tồn tại');
    if (u.pass !== _hash(body.password)) throw new Error('Sai mật khẩu');
    if (u.role !== 'admin' && u.ip && body.ip && u.ip !== body.ip && !u.ip.startsWith('device-')) {
      throw new Error('Tài khoản đã khóa vào thiết bị khác');
    }
    u.lastLogin = Date.now();
    if (!u.ip) u.ip = body.ip || ip;
    _DB.setUsers(users);
    return { token: 'offline-' + Date.now(), user: u };
  }

  /* -------- LOGOUT -------- */
  if (endpoint === '/auth/logout') {
    return { message: 'Đã đăng xuất' };
  }

  /* -------- ME -------- */
  if (endpoint === '/user/me') {
    const email = body && body.email;
    if (email && users[email]) return { user: users[email] };
    throw new Error('Không tìm thấy user');
  }

  /* -------- KEY ACTIVATE -------- */
  if (endpoint === '/key/activate') {
    const k = keys[body.key];
    if (!k) throw new Error('Key không tồn tại');

    if (k.used && k.boundIP && k.boundIP !== body.ip) {
      throw new Error('Key đã kích hoạt trên thiết bị khác');
    }
    if (k.used && k.boundIP === body.ip) {
      throw new Error('Key đã kích hoạt trên máy này rồi');
    }

    k.used = true;
    k.boundIP = body.ip;
    k.usedBy = body.email;
    k.usedAt = Date.now();
    _DB.setKeys(keys);

    const u = users[body.email];
    if (!u) throw new Error('Không tìm thấy user');

    const now = Date.now();
    const base = (u.expiry && u.expiry > now) ? u.expiry : now;
    const days = k.days || 30;
    u.expiry = base + days * 86400000;
    _DB.setUsers(users);

    const hist = _DB.hist();
    hist.unshift({ type: 'key', email: u.email, key: body.key, ip: body.ip, days, time: Date.now() });
    _DB.setHist(hist);

    return { message: 'Kích hoạt thành công', user: u, days: days, expiry: u.expiry };
  }

  /* -------- DEPOSIT CREATE -------- */
  if (endpoint === '/deposit/create') {
    deps.push({
      id: 'D' + Date.now() + Math.floor(Math.random() * 1000),
      email: body.email,
      amount: Number(body.amount),
      note: body.note || '',
      ip: body.ip || ip,
      time: Date.now(),
      status: 'pending'
    });
    _DB.setDeps(deps);
    return { message: 'Đã gửi yêu cầu nạp tiền' };
  }

  /* -------- DEPOSIT HISTORY -------- */
  if (endpoint === '/deposit/history') {
    const email = body && body.email;
    return { deposits: deps.filter(d => d.email === email) };
  }

  /* -------- ADMIN DEPOSITS -------- */
  if (endpoint.startsWith('/admin/deposits')) {
    const statusMatch = endpoint.match(/status=(\w+)/);
    const status = statusMatch ? statusMatch[1] : 'all';
    const list = status === 'all' ? deps : deps.filter(d => d.status === status);
    return { deposits: list };
  }

  /* -------- ADMIN APPROVE -------- */
  if (endpoint === '/admin/deposit/approve') {
    const d = deps.find(x => x.id === body.id);
    if (!d) throw new Error('Không tìm thấy yêu cầu');
    if (d.status !== 'pending') throw new Error('Yêu cầu đã xử lý rồi');

    d.status = 'approved';
    d.approvedAt = Date.now();
    _DB.setDeps(deps);

    if (users[d.email]) {
      users[d.email].balance = (users[d.email].balance || 0) + Number(d.amount);
      _DB.setUsers(users);
    }
    return { message: 'Đã duyệt +' + d.amount + 'đ cho ' + d.email };
  }

  /* -------- ADMIN REJECT -------- */
  if (endpoint === '/admin/deposit/reject') {
    const d = deps.find(x => x.id === body.id);
    if (!d) throw new Error('Không tìm thấy');
    d.status = 'rejected';
    d.rejectedAt = Date.now();
    _DB.setDeps(deps);
    return { message: 'Đã từ chối yêu cầu' };
  }

  /* -------- ADMIN USERS -------- */
  if (endpoint === '/admin/users') {
    return { users: Object.values(users).map(u => {
      const { pass, ...safe } = u;
      return safe;
    }) };
  }

  /* -------- ADMIN RESET IP -------- */
  if (endpoint === '/admin/user/reset-ip') {
    if (!users[body.email]) throw new Error('Không tìm thấy user');
    users[body.email].ip = '';
    _DB.setUsers(users);
    return { message: 'Đã reset IP cho ' + body.email };
  }

  /* -------- ADMIN ADJUST BALANCE -------- */
  if (endpoint === '/admin/user/adjust-balance') {
    if (!users[body.email]) throw new Error('Không tìm thấy user');
    users[body.email].balance = (users[body.email].balance || 0) + Number(body.amount);
    _DB.setUsers(users);
    return { message: 'Đã cập nhật số dư' };
  }

  /* -------- ADMIN KEYS -------- */
  if (endpoint === '/admin/keys') {
    return { keys: Object.entries(keys).map(([k, v]) => ({ key: k, ...v })) };
  }

  /* -------- ADMIN GENERATE KEY -------- */
  if (endpoint === '/admin/key/generate') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const newKeys = [];
    for (let i = 0; i < (body.quantity || 1); i++) {
      const k = seg() + '-' + seg() + '-' + seg();
      keys[k] = {
        days: body.days || 30, used: false, boundIP: '',
        usedBy: '', usedAt: 0, createdAt: Date.now()
      };
      newKeys.push(k);
    }
    _DB.setKeys(keys);
    return { message: 'Đã tạo ' + newKeys.length + ' key', keys: newKeys };
  }

  /* -------- ADMIN UNBIND KEY -------- */
  if (endpoint === '/admin/key/unbind') {
    if (!keys[body.key]) throw new Error('Không tìm thấy key');
    keys[body.key].used = false;
    keys[body.key].boundIP = '';
    keys[body.key].usedBy = '';
    _DB.setKeys(keys);
    return { message: 'Đã gỡ key khỏi máy' };
  }

  throw new Error('Endpoint không hỗ trợ: ' + endpoint);
}

/* ============================================================
   TOKEN
   ============================================================ */
function saveToken(t) {
  _authToken = t;
  if (t) localStorage.setItem('bs_token', t);
  else localStorage.removeItem('bs_token');
}
function loadToken() {
  _authToken = localStorage.getItem('bs_token') || null;
  return _authToken;
}

/* ============================================================
   TAB
   ============================================================ */
function switchTab(tab) {
  _setError('');
  const tl = _$('tabLogin'), tr = _$('tabReg');
  const fl = _$('formLogin'), fr = _$('formReg');
  if (tab === 'login') {
    if (tl) tl.classList.add('active');
    if (tr) tr.classList.remove('active');
    if (fl) fl.style.display = '';
    if (fr) fr.style.display = 'none';
  } else {
    if (tr) tr.classList.add('active');
    if (tl) tl.classList.remove('active');
    if (fr) fr.style.display = '';
    if (fl) fl.style.display = 'none';
  }
}

/* ============================================================
   ĐĂNG KÝ
   ============================================================ */
async function doRegister() {
  _setError('');
  try {
    const name  = (_$('regName')  ? _$('regName').value  : '').trim();
    const email = (_$('regEmail') ? _$('regEmail').value : '').trim().toLowerCase();
    const p1    = _$('regPass')  ? _$('regPass').value  : '';
    const p2    = _$('regPass2') ? _$('regPass2').value : '';

    if (!name || !email || !p1 || !p2)  return _setError('⚠️ Vui lòng nhập đầy đủ thông tin!');
    if (name.length < 2)                return _setError('⚠️ Tên hiển thị phải từ 2 ký tự!');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return _setError('⚠️ Email không hợp lệ!');
    if (p1.length < 6)                  return _setError('⚠️ Mật khẩu phải từ 6 ký tự!');
    if (p1 !== p2)                      return _setError('⚠️ Mật khẩu nhập lại không khớp!');

    _setLoading('regSpinner', 'btnRegText',
      '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG XỬ LÝ...', true);

    let ip = 'unknown';
    try { ip = await getIP(); } catch (e) {}

    const data = await apiCall('/auth/register', 'POST', {
      name, email, password: p1, ip
    });

    if (_$('regName'))  _$('regName').value  = '';
    if (_$('regEmail')) _$('regEmail').value = '';
    if (_$('regPass'))  _$('regPass').value  = '';
    if (_$('regPass2')) _$('regPass2').value = '';

    alert('✅ ĐĂNG KÝ THÀNH CÔNG!\n\n📧 ' + email + '\n🖥 IP: ' + ip +
      '\n\n⚠️ Tài khoản đã khóa vào thiết bị này.');
    switchTab('login');

  } catch (err) {
    console.error('[Register]', err);
    _setError('❌ ' + err.message);
  } finally {
    _setLoading('regSpinner', 'btnRegText',
      '<i class="fa-solid fa-user-plus"></i> ĐĂNG KÝ', false);
  }
}

/* ============================================================
   ĐĂNG NHẬP
   ============================================================ */
async function doLogin() {
  _setError('');
  try {
    const email = (_$('loginEmail') ? _$('loginEmail').value : '').trim().toLowerCase();
    const pass  = _$('loginPass') ? _$('loginPass').value : '';

    if (!email || !pass) return _setError('⚠️ Vui lòng nhập Email và Mật khẩu!');

    _setLoading('loginSpinner', 'btnLoginText',
      '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG ĐĂNG NHẬP...', true);

    let ip = 'unknown';
    try { ip = await getIP(); } catch (e) {}

    const data = await apiCall('/auth/login', 'POST', {
      email, password: pass, ip
    });

    if (data.token) saveToken(data.token);
    if (data.user) {
      localStorage.setItem('bs_current', JSON.stringify(data.user));
      if (typeof Store !== 'undefined' && Store.setCurrent) Store.setCurrent(data.user);
    } else {
      localStorage.setItem('bs_current', JSON.stringify({ email }));
    }

    if (typeof enterApp === 'function') enterApp();
    else location.reload();

  } catch (err) {
    console.error('[Login]', err);
    _setError('❌ ' + err.message);
  } finally {
    _setLoading('loginSpinner', 'btnLoginText',
      '<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP', false);
  }
}

/* ============================================================
   ĐĂNG XUẤT
   ============================================================ */
async function doLogout() {
  if (!confirm('Bạn chắc chắn muốn đăng xuất?')) return;
  try { await apiCall('/auth/logout', 'POST', {}); } catch (e) {}
  saveToken(null);
  localStorage.removeItem('bs_current');
  if (typeof Store !== 'undefined' && Store.clearCurrent) Store.clearCurrent();
  location.reload();
}

/* ============================================================
   KÍCH HOẠT KEY
   ============================================================ */
async function activateKey() {
  _setKeyError('');
  try {
    const keyInput = _$('keyInput');
    const key = (keyInput ? keyInput.value : '').trim().toUpperCase();
    if (!key) return _setKeyError('⚠️ Vui lòng nhập Key!');

    let ip = 'unknown';
    try { ip = await getIP(); } catch (e) {}

    const cur = JSON.parse(localStorage.getItem('bs_current') || 'null');
    const email = cur ? cur.email : '';

    const data = await apiCall('/key/activate', 'POST', { key, ip, email });

    if (data.user) {
      localStorage.setItem('bs_current', JSON.stringify(data.user));
      if (typeof Store !== 'undefined' && Store.setCurrent) Store.setCurrent(data.user);
    }

    alert(
      '✅ KÍCH HOẠT THÀNH CÔNG!\n\n' +
      '🔑 Key: ' + key + '\n' +
      (data.days ? '⏱ +' + data.days + ' ngày\n' : '') +
      (data.expiry ? '📅 Hạn mới: ' + new Date(data.expiry).toLocaleString('vi-VN') + '\n' : '') +
      '🖥 Thiết bị (IP): ' + ip
    );

    if (typeof closeModal === 'function') closeModal('keyModal');
    if (typeof renderAll === 'function') renderAll();

  } catch (err) {
    console.error('[ActivateKey]', err);
    _setKeyError('❌ ' + err.message);
  }
}

/* ============================================================
   NẠP TIỀN
   ============================================================ */
async function submitDeposit() {
  try {
    const amount = Number(_$('depAmount') ? _$('depAmount catch').value : 0);
    const note   = _$(' (depNote') ? _$err('depNote').value.trim() : '';
    if (!amount ||) amount < 10000) return alert('Số {
 tiền tối thiểu 10.000đ   ');

    let ip = 'unknown';
    try { ip = await getIP(); } catch (e) {}

    const cur = JSON.parse(localStorage.getItem('bs_current') || 'null');
    const email = cur ? cur.email : '';

    const data = await apiCall('/deposit/create', 'POST', { amount, note, ip, email });

    alert('✅ ' + (data.message || 'Đã gửi yêu cầu. Chờ admin duyệt!'));
    if (typeof closeModal === 'function') closeModal('depositModal');
    if (typeof renderAll === 'function') renderAll();

  } console.error('[Deposit]', err);
    alert('❌ ' + err.message);
  }
}

/* ============================================================
   LẤY USER HIỆN TẠI
   ============================================================ */
async function fetchCurrentUser() {
  try {
    loadToken();
    const cur = JSON.parse(localStorage.getItem('bs_current') || 'null');
    if (!cur && !_authToken && !OFFLINE_MODE) return null;
    const email = cur ? cur.email : '';

    const data = await apiCall('/user/me', 'GET', { email });
    if (data.user) {
      localStorage.setItem('bs_current', JSON.stringify(data.user));
      if (typeof Store !== 'undefined' && Store.setCurrent) Store.setCurrent(data.user);
      return data.user;
    }
    return null;
  } catch (err) {
    if (err.status === 401) {
      saveToken(null);
      localStorage.removeItem('bs_current');
    }
    return null;
  }
}

async function autoLogin() {
  try {
    loadToken();
    const cur = JSON.parse(localStorage.getItem('bs_current') || 'null');
    if (!cur && !_authToken) return false;
    const user = await fetchCurrentUser();
    if (!user) return false;
    if (typeof enterApp === 'function') { enterApp(); return true; }
    return false;
  } catch (err) { return false; }
}

function hasValidVip() {
  try {
    const u = JSON.parse(localStorage.getItem('bs_current') || 'null');
    if (!u) return false;
    if (u.role === 'admin') return true;
    return !!(u.expiry && u.expiry > Date.now());
  } catch (e) { return false; }
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('bs_current') || 'null'); }
  catch (e) { return null; }
}

/* ============================================================
   ADMIN
   ============================================================ */
async function adminFetchDeposits(status = 'pending') {
  const data = await apiCall('/admin/deposits?status=' + status, 'GET');
  return data.deposits || [];
}

async function adminApproveDeposit(id) {
  if (!confirm('Xác nhận ĐÃ NHẬN ĐƯỢC TIỀN và duyệt?')) return false;
  try {
    const data = await apiCall('/admin/deposit/approve', 'POST', { id });
    alert('✅ ' + (data.message || 'Đã duyệt!'));
    if (typeof renderAdminPending === 'function') { try { await renderAdminPending(); } catch(e){} }
    if (typeof renderAdminUsers === 'function') { try { await renderAdminUsers(); } catch(e){} }
    if (typeof renderAll === 'function') { try { renderAll(); } catch(e){} }
    return true;
  } catch (err) { alert('❌ ' + err.message); return false; }
}

async function adminRejectDeposit(id, reason = '') {
  if (!confirm('Từ chối yêu cầu này?')) return false;
  try {
    const data = await apiCall('/admin/deposit/reject', 'POST', { id, reason });
    alert('❌ ' + (data.message || 'Đã từ chối!'));
    if (typeof renderAdminPending === 'function') { try { await renderAdminPending(); } catch(e){} }
    return true;
  } catch (err) { alert('❌ ' + err.message); return false; }
}

async function adminFetchUsers() {
  const data = await apiCall('/admin/users', 'GET');
  return data.users || [];
}

async function adminResetIP(email) {
  if (!confirm('Reset IP cho ' + email + '?')) return false;
  try {
    const data = await apiCall('/admin/user/reset-ip', 'POST', { email });
    alert('✅ ' + (data.message || 'Đã reset IP!'));
    if (typeof renderAdminUsers === 'function') { try { await renderAdminUsers(); } catch(e){} }
    return true;
  } catch (err) { alert('❌ ' + err.message); return false; }
}

async function adminAdjustBalance(email, amount) {
  try {
    const data = await apiCall('/admin/user/adjust-balance', 'POST', { email, amount: Number(amount) });
    alert('✅ ' + (data.message || 'Đã cập nhật số dư!'));
    if (typeof renderAdminUsers === 'function') { try { await renderAdminUsers(); } catch(e){} }
    return true;
  } catch (err) { alert('❌ ' + err.message); return false; }
}

async function adminFetchKeys() {
  const data = await apiCall('/admin/keys', 'GET');
  return data.keys || [];
}

async function adminGenKey(days = 30, quantity = 1) {
  if (!confirm('Tạo ' + quantity + ' key loại ' + days + ' ngày?')) return false;
  try {
    const data = await apiCall('/admin/key/generate', 'POST', { days, quantity });
    const keys = data.keys || [];
    alert('✅ Đã tạo ' + keys.length + ' key:\n\n' + keys.join('\n'));
    if (typeof renderAdminKeys === 'function') { try { await renderAdminKeys(); } catch(e){} }
    return keys;
  } catch (err) { alert('❌ ' + err.message); return []; }
}

async function adminUnbindKey(key) {
  if (!confirm('Gỡ key ' + key + ' khỏi máy?')) return false;
  try {
    const data = await apiCall('/admin/key/unbind', 'POST', { key });
    alert('✅ ' + (data.message || 'Đã gỡ key!'));
    if (typeof renderAdminKeys === 'function') { try { await renderAdminKeys(); } catch(e){} }
    return true;
  } catch (err) { alert('❌ ' + err.message); return false; }
}

async function adminPendingCount() {
  try {
    const data = await apiCall('/admin/deposits?status=pending', 'GET');
    return (data.deposits || []).length;
  } catch (e) { return 0; }
}

/* ============================================================
   EXPORT
   ============================================================ */
if (typeof window !== 'undefined') {
  window.getIP = getIP;
  window.switchTab = switchTab;
  window.doRegister = doRegister;
  window.doLogin = doLogin;
  window.doLogout = doLogout;
  window.autoLogin = autoLogin;
  window.fetchCurrentUser = fetchCurrentUser;
  window.hasValidVip = hasValidVip;
  window.getCurrentUser = getCurrentUser;
  window.activateKey = activateKey;
  window.submitDeposit = submitDeposit;
  window.adminFetchDeposits = adminFetchDeposits;
  window.adminApproveDeposit = adminApproveDeposit;
  window.adminRejectDeposit = adminRejectDeposit;
  window.adminFetchUsers = adminFetchUsers;
  window.adminResetIP = adminResetIP;
  window.adminAdjustBalance = adminAdjustBalance;
  window.adminFetchKeys = adminFetchKeys;
  window.adminGenKey = adminGenKey;
  window.adminUnbindKey = adminUnbindKey;
  window.adminPendingCount = adminPendingCount;
  window.apiCall = apiCall;
  window.saveToken = saveToken;
  window.loadToken = loadToken;

  /* Log trạng thái */
  setTimeout(() => {
    if (OFFLINE_MODE || !API_BASE) {
      console.log('%c🔌 OFFLINE MODE — Dùng localStorage, không cần server', 'color:#f59e0b;font-weight:bold;font-size:13px');
    } else {
      console.log('%c✅ API Server: ' + API_BASE, 'color:#22c55e;font-weight:bold;font-size:13px');
    }
  }, 100);
}
