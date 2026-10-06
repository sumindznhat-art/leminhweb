/* ============================================================
   assets/js/auth.js — BẢN GỌI API RIÊNG (FULL)
   Auth + Key + Deposit + Admin duyệt tiền
   ============================================================ */

/* ============================================================
   BIẾN TOÀN CỤC
   ============================================================ */
let _cachedIP   = null;
let _ipFetching = null;
let _authToken  = null;

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

/* ============================================================
   LẤY IP PUBLIC
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
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) continue;
        const data = await res.json();
        const ip = data.ip || data.query || data.IPv4;
        if (ip && typeof ip === 'string') {
          _cachedIP = ip;
          return ip;
        }
      } catch (e) {
        console.warn('Bỏ qua API IP:', url);
      }
    }

    _cachedIP = 'unknown';
    return _cachedIP;
  })();

  return _ipFetching;
}

/* ============================================================
   HÀM GỌI API TRUNG TÂM — TIMEOUT + XỬ LÝ LỖI
   ============================================================ */
async function apiCall(endpoint, method = 'GET', body = null) {
  const base = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE) ? CONFIG.API_BASE : '';
  if (!base) {
    throw new Error('Chưa cấu hình CONFIG.API_BASE trong config.js');
  }

  const url = base.replace(/\/$/, '') + '/' + endpoint.replace(/^\//, '');
  const timeout = (CONFIG.API_TIMEOUT || 10000);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);

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

  try {
    const res = await fetch(url, options);
    clearTimeout(timer);

    let data = null;
    try { data = await res.json(); } catch (e) { data = { message: 'Phản hồi không hợp lệ' }; }

    if (!res.ok) {
      const err = new Error(data.message || ('Lỗi HTTP ' + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;

  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Server không phản hồi (timeout ' + timeout + 'ms)');
    }
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      throw new Error('Không kết nối được server. Kiểm tra:\n• Server đã chạy chưa\n• Domain đúng chưa (CONFIG.API_BASE)\n• Backend bật CORS chưa');
    }
    throw err;
  }
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

    if (!name || !email || !p1 || !p2) { _setError('⚠️ Vui lòng nhập đầy đủ thông tin!'); return; }
    if (name.length < 2)               { _setError('⚠️ Tên hiển thị phải từ 2 ký tự!'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { _setError('⚠️ Email không hợp lệ!'); return; }
    if (p1.length < 6)                 { _setError('⚠️ Mật khẩu phải từ 6 ký tự!'); return; }
    if (p1 !== p2)                     { _setError('⚠️ Mật khẩu nhập lại không khớp!'); return; }

    _setLoading('regSpinner', 'btnRegText',
      '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG XỬ LÝ...', true);

    let ip = 'unknown';
    try { ip = await getIP(); } catch (e) {}

    const data = await apiCall('/auth/register', 'POST', {
      name: name,
      email: email,
      password: p1,
      ip: ip
    });

    if (_$('regName'))  _$('regName').value  = '';
    if (_$('regEmail')) _$('regEmail').value = '';
    if (_$('regPass'))  _$('regPass').value  = '';
    if (_$('regPass2')) _$('regPass2').value = '';

    alert('✅ ĐĂNG KÝ THÀNH CÔNG!\n\n' + (data.message || 'Vui lòng đăng nhập.'));
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

    const data = await apiCall('/auth/login', 'POST', {
      email: email,
      password: pass,
      ip: ip
    });

    if (data.token) saveToken(data.token);
    if (data.user) Store.setCurrent(data.user);
    else Store.setCurrent({ email: email });

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
  Store.clearCurrent();
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

    const data = await apiCall('/key/activate', 'POST', {
      key: key,
      ip: ip
    });

    if (data.user) Store.setCurrent(data.user);

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
    const note = _$('depNote') ? _$('depNote').value.trim() : '';

    if (!amount || amount < 10000) { alert('Số tiền tối thiểu 10.000đ'); return; }

    let ip = 'unknown';
    try { ip = await getIP(); } catch (e) {}

    const data = await apiCall('/deposit/create', 'POST', {
      amount: amount,
      note: note,
      ip: ip
    });

    alert('✅ ' + (data.message || 'Đã gửi yêu cầu nạp tiền. Chờ admin duyệt!'));
    if (typeof closeModal === 'function') closeModal('depositModal');
    if (typeof renderAll === 'function') renderAll();

  } catch (err) {
    console.error('[Deposit]', err);
    alert('❌ ' + err.message);
  }
}

/* ============================================================
   LỊCH SỬ NẠP CỦA USER — GET /deposit/history
   ============================================================ */
async function fetchMyDeposits() {
  try {
    const data = await apiCall('/deposit/history', 'GET');
    return data.deposits || [];
  } catch (err) {
    console.warn('[MyDeposits]', err.message);
    return [];
  }
}

/* ============================================================
   LỊCH SỬ MUA KEY CỦA USER — GET /key/history
   ============================================================ */
async function fetchMyKeyHistory() {
  try {
    const data = await apiCall('/key/history', 'GET');
    return data.history || [];
  } catch (err) {
    console.warn('[MyKeyHistory]', err.message);
    return [];
  }
}

/* ============================================================
   LẤY THÔNG TIN USER HIỆN TẠI TỪ SERVER — GET /user/me
   ============================================================ */
async function fetchCurrentUser() {
  try {
    loadToken();
    if (!_authToken) return null;

    const data = await apiCall('/user/me', 'GET');
    if (data.user) {
      Store.setCurrent(data.user);
      return data.user;
    }
    return null;

  } catch (err) {
    console.warn('[FetchMe]', err.message);
    if (err.status === 401) {
      saveToken(null);
      Store.clearCurrent();
    }
    return null;
  }
}

/* ============================================================
   AUTO LOGIN — DÙNG TOKEN ĐÃ LƯU
   ============================================================ */
async function autoLogin() {
  try {
    loadToken();
    if (!_authToken) return false;

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
   CHECK VIP (client-side nhanh)
   ============================================================ */
function hasValidVip() {
  try {
    const current = Store.getCurrent();
    if (!current) return false;

    if (current.role === 'admin') return true;
    return !!(current.expiry && current.expiry > Date.now());

  } catch (err) {
    return false;
  }
}

/* ============================================================
   LẤY USER HIỆN TẠI TỪ STORE
   ============================================================ */
function getCurrentUser() {
  try { return Store.getCurrent(); }
  catch (err) { return null; }
}

/* ============================================================
   ╔══════════════════════════════════════════════════════════╗
   ║                ADMIN — GỌI API DUYỆT TIỀN                ║
   ╚══════════════════════════════════════════════════════════╝
   ============================================================ */

/* ============================================================
   ADMIN: LẤY DANH SÁCH NẠP CHỜ DUYỆT — GET /admin/deposits
   ============================================================ */
async function adminFetchDeposits(status = 'pending') {
  try {
    const data = await apiCall('/admin/deposits?status=' + encodeURIComponent(status), 'GET');
    return data.deposits || [];
  } catch (err) {
    console.error('[AdminDeposits]', err);
    throw err;
  }
}

/* ============================================================
   ADMIN: DUYỆT NẠP — POST /admin/deposit/approve
   Body: { id }
   ============================================================ */
async function adminApproveDeposit(id) {
  if (!confirm('Xác nhận ĐÃ NHẬN ĐƯỢC TIỀN và duyệt yêu cầu ' + id + '?')) {
    return false;
  }
  try {
    const data = await apiCall('/admin/deposit/approve', 'POST', { id: id });
    alert('✅ ' + (data.message || 'Đã duyệt!'));

    // Refresh giao diện
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
    console.error('[Approve]', err);
    alert('❌ ' + err.message);
    return false;
  }
}

/* ============================================================
   ADMIN: TỪ CHỐI NẠP — POST /admin/deposit/reject
   Body: { id, reason }
   ============================================================ */
async function adminRejectDeposit(id, reason = '') {
  if (!confirm('Từ chối yêu cầu ' + id + '?')) return false;
  try {
    const data = await apiCall('/admin/deposit/reject', 'POST', {
      id: id,
      reason: reason
    });
    alert('❌ ' + (data.message || 'Đã từ chối!'));

    if (typeof renderAdminPending === 'function') {
      try { await renderAdminPending(); } catch (e) {}
    }
    return true;

  } catch (err) {
    console.error('[Reject]', err);
    alert('❌ ' + err.message);
    return false;
  }
}

/* ============================================================
   ADMIN: LẤY DANH SÁCH USER — GET /admin/users
   ============================================================ */
async function adminFetchUsers() {
  try {
    const data = await apiCall('/admin/users', 'GET');
    return data.users || [];
  } catch (err) {
    console.error('[AdminUsers]', err);
    throw err;
  }
}

/* ============================================================
   ADMIN: RESET IP USER — POST /admin/user/reset-ip
   Body: { email }
   ============================================================ */
async function adminResetIP(email) {
  if (!confirm('Reset IP cho user ' + email + '?\nUser sẽ khóa vào thiết bị mới khi đăng nhập lại.')) {
    return false;
  }
  try {
    const data = await apiCall('/admin/user/reset-ip', 'POST', { email: email });
    alert('✅ ' + (data.message || 'Đã reset IP!'));

    if (typeof renderAdminUsers === 'function') {
      try { await renderAdminUsers(); } catch (e) {}
    }
    return true;

  } catch (err) {
    console.error('[ResetIP]', err);
    alert('❌ ' + err.message);
    return false;
  }
}

/* ============================================================
   ADMIN: ĐỔI ROLE USER — POST /admin/user/set-role
   Body: { email, role: 'user' | 'admin' }
   ============================================================ */
async function adminSetRole(email, role) {
  if (!['user', 'admin'].includes(role)) {
    alert('Role không hợp lệ!');
    return false;
  }
  if (!confirm('Đổi role của ' + email + ' thành "' + role + '"?')) return false;

  try {
    const data = await apiCall('/admin/user/set-role', 'POST', {
      email: email,
      role: role
    });
    alert('✅ ' + (data.message || 'Đã đổi role!'));

    if (typeof renderAdminUsers === 'function') {
      try { await renderAdminUsers(); } catch (e) {}
    }
    return true;

  } catch (err) {
    console.error('[SetRole]', err);
    alert('❌ ' + err.message);
    return false;
  }
}

/* ============================================================
   ADMIN: CỘNG / TRỪ SỐ DƯ — POST /admin/user/adjust-balance
   Body: { email, amount } (amount có thể âm)
   ============================================================ */
async function adminAdjustBalance(email, amount) {
  if (!amount || isNaN(amount)) { alert('Số tiền không hợp lệ!'); return false; }
  if (!confirm((amount > 0 ? 'Cộng ' : 'Trừ ') + Math.abs(amount).toLocaleString('vi-VN') + 'đ cho ' + email + '?')) return false;

  try {
    const data = await apiCall('/admin/user/adjust-balance', 'POST', {
      email: email,
      amount: Number(amount)
    });
    alert('✅ ' + (data.message || 'Đã cập nhật số dư!'));

    if (typeof renderAdminUsers === 'function') {
      try { await renderAdminUsers(); } catch (e) {}
    }
    return true;

  } catch (err) {
    console.error('[AdjustBalance]', err);
    alert('❌ ' + err.message);
    return false;
  }
}

/* ============================================================
   ADMIN: LẤY DANH SÁCH KEY — GET /admin/keys
   ============================================================ */
async function adminFetchKeys() {
  try {
    const data = await apiCall('/admin/keys', 'GET');
    return data.keys || [];
  } catch (err) {
    console.error('[AdminKeys]', err);
    throw err;
  }
}

/* ============================================================
   ADMIN: TẠO KEY MỚI — POST /admin/key/generate
   Body: { days, quantity }
   ============================================================ */
async function adminGenKey(days = 30, quantity = 1) {
  if (!confirm('Tạo ' + quantity + ' key loại ' + days + ' ngày?')) return false;

  try {
    const data = await apiCall('/admin/key/generate', 'POST', {
      days: days,
      quantity: quantity
    });

    const keys = data.keys || [];
    alert('✅ Đã tạo ' + keys.length + ' key:\n\n' + keys.join('\n'));

    if (typeof renderAdminKeys === 'function') {
      try { await renderAdminKeys(); } catch (e) {}
    }
    return keys;

  } catch (err) {
    console.error('[GenKey]', err);
    alert('❌ ' + err.message);
    return [];
  }
}

/* ============================================================
   ADMIN: GỠ KEY KHỎI MÁY — POST /admin/key/unbind
   Body: { key }
   ============================================================ */
async function adminUnbindKey(key) {
  if (!confirm('Gỡ key ' + key + ' khỏi máy?\nKey sẽ dùng lại được trên thiết bị khác.')) return false;

  try {
    const data = await apiCall('/admin/key/unbind', 'POST', { key: key });
    alert('✅ ' + (data.message || 'Đã gỡ key!'));

    if (typeof renderAdminKeys === 'function') {
      try { await renderAdminKeys(); } catch (e) {}
    }
    return true;

  } catch (err) {
    console.error('[UnbindKey]', err);
    alert('❌ ' + err.message);
    return false;
  }
}

/* ============================================================
   ADMIN: LỊCH SỬ GIAO DỊCH — GET /admin/history
   ============================================================ */
async function adminFetchHistory(limit = 50) {
  try {
    const data = await apiCall('/admin/history?limit=' + limit, 'GET');
    return data.history || [];
  } catch (err) {
    console.error('[AdminHistory]', err);
    throw err;
  }
}

/* ============================================================
   ADMIN: THỐNG KÊ TỔNG QUAN — GET /admin/stats
   ============================================================ */
async function adminFetchStats() {
  try {
    const data = await apiCall('/admin/stats', 'GET');
    return data.stats || {};
  } catch (err) {
    console.error('[AdminStats]', err);
    return {};
  }
}

/* ============================================================
   ADMIN: LẤY BADGE SỐ YÊU CẦU PENDING
   ============================================================ */
async function adminPendingCount() {
  try {
    const data = await apiCall('/admin/deposits?status=pending', 'GET');
    return (data.deposits || []).length;
  } catch (err) {
    return 0;
  }
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
  window.fetchMyDeposits    = fetchMyDeposits;
  window.fetchMyKeyHistory  = fetchMyKeyHistory;

  /* Admin */
  window.adminFetchDeposits     = adminFetchDeposits;
  window.adminApproveDeposit    = adminApproveDeposit;
  window.adminRejectDeposit     = adminRejectDeposit;
  window.adminFetchUsers        = adminFetchUsers;
  window.adminResetIP           = adminResetIP;
  window.adminSetRole           = adminSetRole;
  window.adminAdjustBalance     = adminAdjustBalance;
  window.adminFetchKeys         = adminFetchKeys;
  window.adminGenKey            = adminGenKey;
  window.adminUnbindKey         = adminUnbindKey;
  window.adminFetchHistory      = adminFetchHistory;
  window.adminFetchStats        = adminFetchStats;
  window.adminPendingCount      = adminPendingCount;

  /* Utils */
  window.apiCall            = apiCall;
  window.saveToken          = saveToken;
  window.loadToken          = loadToken;
}
