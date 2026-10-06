/* ============================================================
   assets/js/auth.js  —  BẢN HOÀN CHỈNH
   Có ô nhập SERVER URL + tự động chuyển server dự phòng
   ============================================================ */

/* ============================================================
   ╔══════════════════════════════════════════════════════════╗
   ║         🔧 CẤU HÌNH SERVER — SỬA Ở ĐÂY DUY NHẤT         ║
   ╚══════════════════════════════════════════════════════════╝
   ============================================================ */

/* 👉 SERVER CHÍNH — Nhập URL backend của bạn vào đây
   Ví dụ:
     'https://api.kiemlua2026.site'   ← nếu có subdomain riêng
     'https://kiemlua2026.site/api'   ← nếu API cùng domain
     'https://api.tenmiencuaban.com'  ← nếu dùng domain khác
     ''                               ← để trống nếu dùng localStorage (offline)
*/
const API_BASE = 'https://api.kiemlua2026.site';

/* 👉 SERVER DỰ PHÒNG — Nếu server chính chết sẽ tự chuyển sang đây
   Để trống mảng rỗng nếu không có server phụ
*/
const API_FALLBACKS = [
  // 'https://api2.kiemlua2026.site',
  // 'https://backup.tooolkiemlua2026.site'
];

/* 👉 TIMEOUT mỗi request (mili giây) */
const API_TIMEOUT = 15000;

/* 👉 BẬT/TẮT chế độ offline (dùng localStorage khi server chết)
   true  = luôn dùng localStorage, không cần server
   false = luôn gọi server, không dùng localStorage
*/
const OFFLINE_MODE = false;

/* ============================================================
   HẾT PHẦN CẤU HÌNH — KHÔNG SỬA BÊN DƯỚI
   ============================================================ */

/* ============================================================
   BIẾN TOÀN CỤC
   ============================================================ */
let _cachedIP    = null;
let _ipFetching  = null;
let _authToken   = null;
let _activeBase  = API_BASE;   // Server đang được dùng (chính hoặc phụ)

/* ============================================================
   HÀM TIỆN ÍCH
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

function _hashPassword(p) {
  let h = 5381;
  for (let i = 0; i < p.length; i++) h = ((h << 5) + h) + p.charCodeAt(i);
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
      'https://ipapi.co/json/',
      'https://api.my-ip.io/ip.json'
    ];

    for (const url of apis) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal, mode: 'cors' });
        clearTimeout(timer);
        if (!res.ok) continue;
        const data = await res.json();
        const ip = data.ip || data.query || data.IPv4 || data.address;
        if (ip && typeof ip === 'string' && ip.length > 3) {
          _cachedIP = ip;
          console.log('✅ IP:', ip);
          return ip;
        }
      } catch (e) {
        console.warn('⚠️ Bỏ qua API IP:', url);
      }
    }

    /* Fallback: device fingerprint */
    let device = localStorage.getItem('bs_device');
    if (!device) {
      device = 'device-' + Math.random().toString(36).slice(2, 12);
      localStorage.setItem('bs_device', device);
    }
    _cachedIP = device;
    console.warn('⚠️ Không lấy được IP — dùng device ID:', device);
    return _cachedIP;
  })();

  return _ipFetching;
}

/* ============================================================
   ╔══════════════════════════════════════════════════════════╗
   ║            HÀM GỌI API TRUNG TÂM                        ║
   ║   Tự động thử server chính → nếu fail thì thử server phụ║
   ╚══════════════════════════════════════════════════════════╝
   ============================================================ */
async function apiCall(endpoint, method = 'GET', body = null) {
  /* ============ CHẾ ĐỘ OFFLINE — Không gọi server ============ */
  if (OFFLINE_MODE || !_activeBase) {
    return _offlineCall(endpoint, method, body);
  }

  const servers = [_activeBase, ...API_FALLBACKS].filter(Boolean);
  let lastError = null;

  for (const base of servers) {
    const url = base.replace(/\/$/, '') + '/' + endpoint.replace(/^\//, '');

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT);

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (_authToken) headers['Authorization'] = 'Bearer ' + _authToken;

      const options = {
        method: method,
        headers: headers,
        signal: ctrl.signal,
        mode: 'cors',
        cache: 'no-store'
      };
      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      console.log('🌐 ' + method + ' → ' + url);

      const res = await fetch(url, options);
      clearTimeout(timer);

      let data = null;
      try { data = await res.json(); }
      catch (e) { data = { message: 'Phản hồi không hợp lệ' }; }

      if (!res.ok) {
        const err = new Error(data.message || ('Lỗi HTTP ' + res.status));
        err.status = res.status;
        err.data = data;
        throw err;
      }

      /* Thành công → lưu server này làm server chính */
      _activeBase = base;
      return data;

    } catch (err) {
      clearTimeout(err.name === 'AbortError' ? 0 : 0);
      lastError = err;

      /* Nếu lỗi logic (401, 403, 409...) → không thử server khác */
      if (err.status && err.status < 500) {
        throw err;
      }

      /* Nếu lỗi mạng → thử server tiếp theo */
      console.warn('⚠️ Server ' + base + ' lỗi, thử server tiếp theo...');
    }
  }

  /* Hết server → throw lỗi cuối cùng */
  const finalErr = new Error(
    'Không kết nối được server.\n\n' +
    'Vui lòng kiểm tra:\n' +
    '• Backend đã chạy chưa?\n' +
    '• Domain đúng chưa? (' + _activeBase + ')\n' +
    '• Backend có bật CORS chưa?'
  );
  finalErr.original = lastError;
  throw finalErr;
}

/* ============================================================
   OFFLINE MODE — Dùng localStorage thay server
   ============================================================ */
const _OfflineDB = {
  users() { try { return JSON.parse(localStorage.getItem('bs_off_users') || '{}'); } catch(e) { return {}; } },
  setUsers(u) { localStorage.setItem('bs_off_users', JSON.stringify(u)); },
  keys() { try { return JSON.parse(localStorage.getItem('bs_off_keys') || '{}'); } catch(e) { return {}; } },
  setKeys(k) { localStorage.setItem('bs_off_keys', JSON.stringify(k)); },
  deps() { try { return JSON.parse(localStorage.getItem('bs_off_deps') || '[]'); } catch(e) { return []; } },
  setDeps(d) { localStorage.setItem('bs_off_deps', JSON.stringify(d)); }
};

async function _offlineCall(endpoint, method, body) {
  await new Promise(r => setTimeout(r, 200));  // giả lập độ trễ

  const users = _OfflineDB.users();
  const keys = _OfflineDB.keys();
  const deps = _OfflineDB.deps();
  const ip = await getIP();

  /* ---- REGISTER ---- */
  if (endpoint === '/auth/register') {
    if (users[body.email]) throw new Error('Email đã tồn tại');
    users[body.email] = {
      email: body.email, name: body.name,
      password: _hashPassword(body.password),
      balance: 0, role: 'user', ip: body.ip || ip,
      joined: Date.now(), lastLogin: Date.now(), expiry: 0
    };
    _OfflineDB.setUsers(users);
    return { message: 'Đăng ký thành công' };
  }

  /* ---- LOGIN ---- */
  if (endpoint === '/auth/login') {
    const u = users[body.email];
    if (!u) throw new Error('Tài khoản không tồn tại');
    if (u.password !== _hashPassword(body.password)) throw new Error('Sai mật khẩu');
    if (u.role !== 'admin' && u.ip && body.ip && u.ip !== body.ip && !u.ip.startsWith('device-')) {
      throw new Error('Tài khoản đã khóa vào thiết bị khác');
    }
    u.lastLogin = Date.now();
    if (!u.ip) u.ip = body.ip || ip;
    _OfflineDB.setUsers(users);
    return { token: 'offline-' + Date.now(), user: u };
  }

  /* ---- ME ---- */
  if (endpoint === '/user/me') {
    const email = body && body.email;
    if (email && users[email]) return { user: users[email] };
    throw new Error('Không tìm thấy user');
  }

  /* ---- ACTIVATE KEY ---- */
  if (endpoint === '/key/activate') {
    const k = keys[body.key];
    if (!k) throw new Error('Key không tồn tại');
    if (k.used && k.boundIP && k.boundIP !== body.ip) {
      throw new Error('Key đã dùng trên máy khác');
    }
    k.used = true; k.boundIP = body.ip; k.usedBy = body.email; k.usedAt = Date.now();
    _OfflineDB.setKeys(keys);

    const u = Object.values(users).find(x => x.email === body.email);
    if (u) {
      const now = Date.now();
      const base = (u.expiry && u.expiry > now) ? u.expiry : now;
      u.expiry = base + (k.days || 30) * 86400000;
      _OfflineDB.setUsers(users);
      return { message: 'Kích hoạt thành công', user: u, days: k.days, expiry: u.expiry };
    }
    throw new Error('Không tìm thấy user');
  }

  /* ---- DEPOSIT CREATE ---- */
  if (endpoint === '/deposit/create') {
    deps.push({
      id: 'D' + Date.now(),
      email: body.email,
      amount: body.amount,
      note: body.note,
      ip: body.ip || ip,
      time: Date.now(),
      status: 'pending'
    });
    _OfflineDB.setDeps(deps);
    return { message: 'Đã gửi yêu cầu' };
  }

  /* ---- ADMIN DEPOSITS ---- */
  if (endpoint.startsWith('/admin/deposits')) {
    return { deposits: deps };
  }

  /* ---- ADMIN APPROVE ---- */
  if (endpoint === '/admin/deposit/approve') {
    const d = deps.find(x => x.id === body.id);
    if (!d) throw new Error('Không tìm thấy');
    d.status = 'approved'; d.approvedAt = Date.now();
    _OfflineDB.setDeps(deps);
    if (users[d.email]) {
      users[d.email].balance = (users[d.email].balance || 0) + Number(d.amount);
      _OfflineDB.setUsers(users);
    }
    return { message: 'Đã duyệt' };
  }

  /* ---- ADMIN REJECT ---- */
  if (endpoint === '/admin/deposit/reject') {
    const d = deps.find(x => x.id === body.id);
    if (!d) throw new Error('Không tìm thấy');
    d.status = 'rejected'; d.rejectedAt = Date.now();
    _OfflineDB.setDeps(deps);
    return { message: 'Đã từ chối' };
  }

  /* ---- ADMIN USERS ---- */
  if (endpoint === '/admin/users') {
    return { users: Object.values(users) };
  }

  /* ---- ADMIN RESET IP ---- */
  if (endpoint === '/admin/user/reset-ip') {
    if (!users[body.email]) throw new Error('Không tìm thấy');
    users[body.email].ip = '';
    _OfflineDB.setUsers(users);
    return { message: 'Đã reset IP' };
  }

  /* ---- ADMIN KEYS ---- */
  if (endpoint === '/admin/keys') {
    return { keys: Object.entries(keys).map(([k, v]) => ({ key: k, ...v })) };
  }

  /* ---- ADMIN GEN KEY ---- */
  if (endpoint === '/admin/key/generate') {
    const newKeys = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    for (let i = 0; i < (body.quantity || 1); i++) {
      const k = seg() + '-' + seg() + '-' + seg();
      keys[k] = {
        days: body.days || 30, used: false, boundIP: '',
        usedBy: '', usedAt: 0, createdAt: Date.now()
      };
      newKeys.push(k);
    }
    _OfflineDB.setKeys(keys);
    return { message: 'Đã tạo', keys: newKeys };
  }

  /* ---- ADMIN UNBIND KEY ---- */
  if (endpoint === '/admin/key/unbind') {
    if (!keys[body.key]) throw new Error('Không tìm thấy');
    keys[body.key].used = false;
    keys[body.key].boundIP = '';
    keys[body.key].usedBy = '';
    _OfflineDB.setKeys(keys);
    return { message: 'Đã gỡ' };
  }

  throw new Error('Endpoint không hỗ trợ offline: ' + endpoint);
}

/* ============================================================
   TOKEN MANAGEMENT
   ============================================================ */
function saveToken(token) {
  _authToken = token;
  if (token) localStorage.setItem('bs_token', token);
  else localStorage.removeItem('bs_token');
}

function loadToken() {
  _authToken = localStorage.getItem('bs_token') || null;
  return _authToken;
}

/* ============================================================
   CHUYỂN TAB
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
   ĐĂNG KÝ — POST /auth/register
   ============================================================ */
async function doRegister() {
  _setError('');

  try {
    const name  = (_$('regName')  ? _$('regName').value  : '').trim();
    const email = (_$('regEmail') ? _$('regEmail').value : '').trim().toLowerCase();
    const p1    = _$('regPass')  ? _$('regPass').value  : '';
    const p2    = _$('regPass2') ? _$('regPass2').value : '';

    if (!name || !email || !p1 || !p2)  { _setError('⚠️ Vui lòng nhập đầy đủ thông tin!'); return; }
    if (name.length < 2)                { _setError('⚠️ Tên hiển thị phải từ 2 ký tự!'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { _setError('⚠️ Email không hợp lệ!'); return; }
    if (p1.length < 6)                  { _setError('⚠️ Mật khẩu phải từ 6 ký tự!'); return; }
    if (p1 !== p2)                      { _setError('⚠️ Mật khẩu nhập lại không khớp!'); return; }

    _setLoading('regSpinner', 'btnRegText',
      '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG XỬ LÝ...', true);

    let ip = 'unknown';
    try { ip = await getIP(); } catch (e) {}

    const data = await apiCall('/auth/register', 'POST', {
      name: name, email: email, password: p1, ip: ip
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
   ĐĂNG NHẬP — POST /auth/login
   ============================================================ */
async function doLogin() {
  _setError('');

  try {
    const email = (_$('loginEmail') ? _$('loginEmail').value : '').trim().toLowerCase();
    const pass  = _$('loginPass') ? _$('loginPass').value : '';

    if (!email || !pass) { _setError('⚠️ Vui lòng nhập Email và Mật khẩu!'); return; }

    _setLoading('loginSpinner', 'btnLoginText',
      '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG ĐĂNG NHẬP...', true);

    let ip = 'unknown';
    try { ip = await getIP(); } catch (e) {}

    /* Gọi API — với OFFLINE_MODE gửi thêm email để _offlineCall xử lý */
    const body = { email: email, password: pass, ip: ip };
    const data = await apiCall('/auth/login', 'POST', body);

    if (data.token) saveToken(data.token);
    if (data.user) {
      localStorage.setItem('bs_current', JSON.stringify(data.user));
      /* Đồng bộ vào Store nếu có */
      if (typeof Store !== 'undefined' && Store.setCurrent) Store.setCurrent(data.user);
    } else {
      localStorage.setItem('bs_current', JSON.stringify({ email: email }));
    }

    if (typeof enterApp === 'function') {
      enterApp();
    } else {
      location.reload();
    }

  } catch (err) {
    console.error('[Login]', err);
    _setError('❌ ' + err.message);
  } finally {
    _setLoading('loginSpinner', 'btnLoginText',
      '<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP', false);
  }
}

/* ============================================================
   ĐĂNG XUẤT — POST /auth/logout
   ============================================================ */
async function doLogout() {
  if (!confirm('Bạn chắc chắn muốn đăng xuất?')) return;

  try {
    await apiCall('/auth/logout', 'POST', {});
  } catch (e) {
    console.warn('Logout API lỗi:', e.message);
  }

  saveToken(null);
  localStorage.removeItem('bs_current');
  if (typeof Store !== 'undefined' && Store.clearCurrent) Store.clearCurrent();
  location.reload();
}

/* ============================================================
   KÍCH HOẠT KEY — POST /key/activate
   ============================================================ */
async function activateKey() {
  _setKeyError('');

  try {
    const keyInput = _$('keyInput');
    const key = (keyInput ? keyInput.value : '').trim().toUpperCase();

    if (!key) { _setKeyError('⚠️ Vui lòng nhập Key!'); return; }

    let ip = 'unknown';
    try { ip = await getIP(); } catch (e) {}

    const cur = JSON.parse(localStorage.getItem('bs_current') || 'null');
    const email = cur ? cur.email : '';

    const data = await apiCall('/key/activate', 'POST', {
      key: key, ip: ip, email: email
    });

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
   GỬI YÊU CẦU NẠP TIỀN — POST /deposit/create
   ============================================================ */
async function submitDeposit() {
  try {
    const amount = Number(_$('depAmount') ? _$('depAmount').value : 0);
    const note   = _$('depNote') ? _$('depNote').value.trim() : '';

    if (!amount || amount < 10000) { alert('Số tiền tối thiểu 10.000đ'); return; }

    let ip = 'unknown';
    try { ip = await getIP(); } catch (e) {}

    const cur = JSON.parse(localStorage.getItem('bs_current') || 'null');
    const email = cur ? cur.email : '';

    const data = await apiCall('/deposit/create', 'POST', {
      amount: amount, note: note, ip: ip, email: email
    });

    alert('✅ ' + (data.message || 'Đã gửi yêu cầu. Chờ admin duyệt!'));
    if (typeof closeModal === 'function') closeModal('depositModal');
    if (typeof renderAll === 'function') renderAll();

  } catch (err) {
    console.error('[Deposit]', err);
    alert('❌ ' + err.message);
  }
}

/* ============================================================
   LẤY THÔNG TIN USER HIỆN TẠI — GET /user/me
   ============================================================ */
async function fetchCurrentUser() {
  try {
    loadToken();
    if (!_authToken && !OFFLINE_MODE) return null;

    const cur = JSON.parse(localStorage.getItem('bs_current') || 'null');
    const email = cur ? cur.email : '';

    const data = await apiCall('/user/me', 'GET', { email: email });
    if (data.user) {
      localStorage.setItem('bs_current', JSON.stringify(data.user));
      if (typeof Store !== 'undefined' && Store.setCurrent) Store.setCurrent(data.user);
      return data.user;
    }
    return null;

  } catch (err) {
    console.warn('[FetchMe]', err.message);
    if (err.status === 401) {
      saveToken(null);
      localStorage.removeItem('bs_current');
    }
    return null;
  }
}

/* ============================================================
   AUTO LOGIN
   ============================================================ */
async function autoLogin() {
  try {
    loadToken();
    const cur = JSON.parse(localStorage.getItem('bs_current') || 'null');
    if (!cur && !_authToken) return false;

    const user = await fetchCurrentUser();
    if (!user) return false;

    if (typeof enterApp === 'function') {
      enterApp();
      return true;
    }
    return false;

  } catch (err) {
    console.error('[AutoLogin]', err);
    return false;
  }
}

/* ============================================================
   CHECK VIP
   ============================================================ */
function hasValidVip() {
  try {
    const u = JSON.parse(localStorage.getItem('bs_current') || 'null');
    if (!u) return false;
    if (u.role === 'admin') return true;
    return !!(u.expiry && u.expiry > Date.now());
  } catch (err) {
    return false;
  }
}

/* ============================================================
   LẤY USER HIỆN TẠI
   ============================================================ */
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('bs_current') || 'null');
  } catch (err) {
    return null;
  }
}

/* ============================================================
   ╔══════════════════════════════════════════════════════════╗
   ║           ADMIN — GỌI API DUYỆT TIỀN                    ║
   ╚══════════════════════════════════════════════════════════╝
   ============================================================ */

/* ADMIN: Lấy danh sách nạp chờ duyệt */
async function adminFetchDeposits(status = 'pending') {
  const data = await apiCall('/admin/deposits?status=' + encodeURIComponent(status), 'GET');
  return data.deposits || [];
}

/* ADMIN: DUYỆT NẠP */
async function adminApproveDeposit(id) {
  if (!confirm('Xác nhận ĐÃ NHẬN ĐƯỢC TIỀN và duyệt yêu cầu ' + id + '?')) return false;
  try {
    const data = await apiCall('/admin/deposit/approve', 'POST', { id: id });
    alert('✅ ' + (data.message || 'Đã duyệt!'));

    if (typeof renderAdminPending === 'function') {
      try { await renderAdminPending(); } catch (e) {}
    }
    if (typeof renderAdminUsers === 'function') {
      try { await renderAdminUsers(); } catch (e) {}
    }
    if (typeof renderAll === 'function') {
      try { renderAll(); } catch (e) {}
    }
    return true;
  } catch (err) {
    alert('❌ ' + err.message);
    return false;
  }
}

/* ADMIN: TỪ CHỐI NẠP */
async function adminRejectDeposit(id, reason = '') {
  if (!confirm('Từ chối yêu cầu ' + id + '?')) return false;
  try {
    const data = await apiCall('/admin/deposit/reject', 'POST', { id: id, reason: reason });
    alert('❌ ' + (data.message || 'Đã từ chối!'));

    if (typeof renderAdminPending === 'function') {
      try { await renderAdminPending(); } catch (e) {}
    }
    return true;
  } catch (err) {
    alert('❌ ' + err.message);
    return false;
  }
}

/* ADMIN: Lấy danh sách user */
async function adminFetchUsers() {
  const data = await apiCall('/admin/users', 'GET');
  return data.users || [];
}

/* ADMIN: RESET IP user */
async function adminResetIP(email) {
  if (!confirm('Reset IP cho ' + email + '?\nUser sẽ khóa vào thiết bị mới.')) return false;
  try {
    const data = await apiCall('/admin/user/reset-ip', 'POST', { email: email });
    alert('✅ ' + (data.message || 'Đã reset IP!'));
    if (typeof renderAdminUsers === 'function') {
      try { await renderAdminUsers(); } catch (e) {}
    }
    return true;
  } catch (err) {
    alert('❌ ' + err.message);
    return false;
  }
}

/* ADMIN: Lấy danh sách key */
async function adminFetchKeys() {
  const data = await apiCall('/admin/keys', 'GET');
  return data.keys || [];
}

/* ADMIN: Tạo key mới */
async function adminGenKey(days = 30, quantity = 1) {
  if (!confirm('Tạo ' + quantity + ' key loại ' + days + ' ngày?')) return false;
  try {
    const data = await apiCall('/admin/key/generate', 'POST', {
      days: days, quantity: quantity
    });
    const keys = data.keys || [];
    alert('✅ Đã tạo ' + keys.length + ' key:\n\n' + keys.join('\n'));
    if (typeof renderAdminKeys === 'function') {
      try { await renderAdminKeys(); } catch (e) {}
    }
    return keys;
  } catch (err) {
    alert('❌ ' + err.message);
    return [];
  }
}

/* ADMIN: Gỡ key khỏi máy */
async function adminUnbindKey(key) {
  if (!confirm('Gỡ key ' + key + ' khỏi máy?')) return false;
  try {
    const data = await apiCall('/admin/key/unbind', 'POST', { key: key });
    alert('✅ ' + (data.message || 'Đã gỡ key!'));
    if (typeof renderAdminKeys === 'function') {
      try { await renderAdminKeys(); } catch (e) {}
    }
    return true;
  } catch (err) {
    alert('❌ ' + err.message);
    return false;
  }
}

/* ADMIN: Số yêu cầu chờ duyệt */
async function adminPendingCount() {
  try {
    const data = await apiCall('/admin/deposits?status=pending', 'GET');
    return (data.deposits || []).length;
  } catch (err) {
    return 0;
  }
}

/* ============================================================
   KIỂM TRA CẤU HÌNH
   ============================================================ */
function checkApiConfig() {
  if (OFFLINE_MODE) {
    console.log('%c🔌 CHẾ ĐỘ OFFLINE — Dùng localStorage', 'color:#f59e0b;font-weight:bold');
    return true;
  }
  if (!API_BASE) {
    console.error('%c⚠️ CHƯA CẤU HÌNH API_BASE!', 'color:#dc2626;font-size:16px;font-weight:bold');
    console.error('Mở file assets/js/auth.js và sửa dòng:');
    console.error("  const API_BASE = 'https://api.tenmiencuaban.com';");
    return false;
  }
  console.log('%c✅ API Server: ' + API_BASE, 'color:#22c55e;font-weight:bold');
  if (API_FALLBACKS.length) {
    console.log('%c✅ Fallback servers: ' + API_FALLBACKS.join(', '), 'color:#22c55e');
  }
  return true;
}

/* Chạy kiểm tra khi load */
if (typeof window !== 'undefined') {
  setTimeout(checkApiConfig, 100);
}

/* ============================================================
   EXPORT
   ============================================================ */
if (typeof window !== 'undefined') {
  /* Auth */
  window.getIP              = getIP;
  window.switchTab          = switchTab;
  window.doRegister         = doRegister;
  window.doLogin            = doLogin;
  window.doLogout           = doLogout;
  window.autoLogin          = autoLogin;
  window.fetchCurrentUser   = fetchCurrentUser;
  window.hasValidVip        = hasValidVip;
  window.getCurrentUser     = getCurrentUser;

  /* Key + Deposit */
  window.activateKey        = activateKey;
  window.submitDeposit      = submitDeposit;

  /* Admin */
  window.adminFetchDeposits     = adminFetchDeposits;
  window.adminApproveDeposit    = adminApproveDeposit;
  window.adminRejectDeposit     = adminRejectDeposit;
  window.adminFetchUsers        = adminFetchUsers;
  window.adminResetIP           = adminResetIP;
  window.adminFetchKeys         = adminFetchKeys;
  window.adminGenKey            = adminGenKey;
  window.adminUnbindKey         = adminUnbindKey;
  window.adminPendingCount      = adminPendingCount;

  /* Utils */
  window.apiCall            = apiCall;
  window.saveToken          = saveToken;
  window.loadToken          = loadToken;
  window.checkApiConfig     = checkApiConfig;

  /* Config info */
  window.__API_CONFIG__ = {
    base: API_BASE,
    fallbacks: API_FALLBACKS,
    timeout: API_TIMEOUT,
    offlineMode: OFFLINE_MODE
  };
}
