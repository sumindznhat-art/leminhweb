/* ============================================================
   STORE.JS - BONSICOLA
   Có FALLBACK localStorage khi PHP không chạy
   ============================================================ */

const DB_KEY       = 'bonsicola_user';
const SESS_KEY     = 'bonsicola_session';
const AVATAR_KEY   = 'bonsicola_avatar';
const MUSIC_ON_KEY = 'bonsicola_music';
const CFG_KEY      = 'bonsicola_config';

/* localStorage DB keys (khi PHP không chạy) */
const LS_USERS     = 'bonsicola_ls_users';
const LS_KEYS      = 'bonsicola_ls_keys';
const LS_DEPOSITS  = 'bonsicola_ls_deposits';
const LS_HISTORY   = 'bonsicola_ls_history';

const ADMIN_EMAIL  = 'leminhdz@gmail.com';
const ADMIN_PASS   = 'admin123';

/* Biến toàn cục đánh dấu có dùng PHP không */
let SERVER_AVAILABLE = null; // null = chưa check, true/false sau khi check

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%25' stop-color='%23e0f2fe'/><stop offset='100%25' stop-color='%23bae6fd'/></linearGradient></defs><rect fill='url(%23g)' width='200' height='200'/><text x='50%25' y='56%25' font-size='90' text-anchor='middle' dominant-baseline='middle'>🎀</text></svg>";

/* ============================================================
   UTILITY
   ============================================================ */
function now(){ return Date.now(); }
function fmt(n){ return (Number(n) || 0).toLocaleString('vi-VN') + 'đ'; }
function fmtDate(ts){ 
  if(!ts) return '—'; 
  const d = new Date(Number(ts)), p = n => String(n).padStart(2, '0'); 
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; 
}
function fmtDateShort(ts){ 
  if(!ts) return '—'; 
  const d = new Date(Number(ts)), p = n => String(n).padStart(2, '0'); 
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`; 
}
function esc(s){ 
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); 
}
function getToolImage(t){ 
  if(!t) return ''; 
  return t.image_base64 || t.image || ''; 
}

/* ============================================================
   TRANSLATE ERROR
   ============================================================ */
function translateError(msg){
  if(!msg) return 'Lỗi không xác định';
  if(typeof msg === 'object'){
    msg = msg.message || msg.msg || msg.error || JSON.stringify(msg);
  }
  const m = String(msg).toLowerCase().trim();
  
  if(m.includes('wrong password') || m.includes('sai mật khẩu') || m === 'sai tài khoản') return 'Sai mật khẩu!';
  if(m.includes('user not found') || m.includes('không tồn tại')) return 'Tài khoản không tồn tại!';
  if(m.includes('email already') || m.includes('đã tồn tại') || m.includes('already exists')) return 'Email đã được đăng ký!';
  if(m.includes('invalid email') || m.includes('email không hợp lệ')) return 'Email không đúng định dạng!';
  if(m.includes('password') && m.includes('short')) return 'Mật khẩu phải từ 6 ký tự!';
  if(m.includes('unauthorized') || m.includes('401')) return 'Chưa đăng nhập!';
  if(m.includes('forbidden') || m.includes('403') || m.includes('không có quyền')) return 'Bạn không có quyền thực hiện!';
  if(m.includes('not found') || m.includes('404')) return 'Không tìm thấy!';
  if(m.includes('server error') || m.includes('500')) return 'Lỗi server!';
  if(m.includes('network') || m.includes('failed to fetch')) return 'Không kết nối được server!';
  if(m.includes('sai email hoặc mật khẩu')) return 'Sai email hoặc mật khẩu!';
  if(m.includes('số dư không đủ')) return 'Số dư không đủ!';
  if(m.includes('key') && m.includes('không tồn tại')) return 'Key không tồn tại!';
  if(m.includes('key') && m.includes('đã sử dụng')) return 'Key đã sử dụng!';
  if(m.includes('thiếu thông tin')) return 'Vui lòng nhập đầy đủ!';
  
  return String(msg);
}

/* ============================================================
   LOCALSTORAGE DB (khi PHP không chạy)
   ============================================================ */
function lsGet(key, def){
  try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : def; }catch(e){ return def; }
}
function lsSet(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){ console.warn('lsSet fail', e); }
}

function lsInitUsers(){
  let users = lsGet(LS_USERS, null);
  if(!users){
    users = {
      [ADMIN_EMAIL]: {
        id: 1,
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
        name: 'Admin BONSICOLA',
        balance: 999999999,
        key_expiry: 9999999999999,
        is_admin: 1,
        ip: 'local',
        last_login: now(),
        created_at: now(),
        last_api: '',
        last_tool: '',
        last_tool_at: 0
      }
    };
    lsSet(LS_USERS, users);
  }
  return users;
}

/* Giả lập API bằng localStorage */
async function localApi(action, params = {}){
  const users = lsInitUsers();
  let keys = lsGet(LS_KEYS, []);
  let deposits = lsGet(LS_DEPOSITS, []);
  let history = lsGet(LS_HISTORY, []);
  
  const email = (params.email || '').toLowerCase().trim();
  const password = params.password || '';
  
  /* Check auth */
  function checkAuth(){
    if(!email || !password) return { success: false, error: 'Chưa đăng nhập' };
    const u = users[email];
    if(!u || u.password !== password) return { success: false, error: 'Sai tài khoản' };
    return { success: true, user: u };
  }
  
  function requireAdmin(){
    const a = checkAuth();
    if(!a.success) return a;
    if(!a.user.is_admin) return { success: false, error: 'forbidden' };
    return a;
  }
  
  /* ROUTER */
  switch(action){
    
    case 'register': {
      const em = (params.email || '').toLowerCase().trim();
      const pw = params.password || '';
      const nm = (params.name || '').trim() || em.split('@')[0];
      if(!em || !pw) return { success: false, error: 'Thiếu thông tin' };
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return { success: false, error: 'Email không hợp lệ' };
      if(pw.length < 6) return { success: false, error: 'Mật khẩu ≥ 6 ký tự' };
      if(users[em]) return { success: false, error: 'Email đã tồn tại' };
      
      users[em] = {
        id: Object.keys(users).length + 1,
        email: em,
        password: pw,
        name: nm,
        balance: 0,
        key_expiry: 0,
        is_admin: 0,
        ip: 'local',
        last_login: now(),
        created_at: now(),
        last_api: '',
        last_tool: '',
        last_tool_at: 0
      };
      lsSet(LS_USERS, users);
      return { success: true };
    }
    
    case 'login': {
      const u = users[email];
      if(!u || u.password !== password) return { success: false, error: 'Sai email hoặc mật khẩu' };
      u.ip = 'local';
      u.last_login = now();
      lsSet(LS_USERS, users);
      const safe = { ...u };
      delete safe.password;
      return { success: true, user: safe };
    }
    
    case 'get_user': {
      const a = checkAuth();
      if(!a.success) return a;
      const safe = { ...a.user };
      delete safe.password;
      return { success: true, user: safe };
    }
    
    case 'deposit_create': {
      const a = checkAuth();
      if(!a.success) return a;
      const amount = parseInt(params.amount, 10) || 0;
      if(amount < 10000) return { success: false, error: 'Tối thiểu 10,000đ' };
      
      const id = 'dep_' + now() + '_' + Math.random().toString(36).slice(2, 7);
      deposits.push({
        id, email: a.user.email, amount,
        method: 'bank',
        status: 'pending',
        note: params.note || '',
        ip: 'local',
        created_at: now(),
        approved_at: 0,
        rejected_at: 0
      });
      lsSet(LS_DEPOSITS, deposits);
      return { success: true, id };
    }
    
    case 'deposit_my': {
      const a = checkAuth();
      if(!a.success) return a;
      const list = deposits.filter(d => d.email === a.user.email).sort((x,y) => y.created_at - x.created_at);
      return { success: true, deposits: list };
    }
    
    case 'deposit_pending': {
      const a = requireAdmin();
      if(!a.success) return a;
      const list = deposits.filter(d => d.status === 'pending').sort((x,y) => y.created_at - x.created_at);
      return { success: true, deposits: list };
    }
    
    case 'deposit_approve': {
      const a = requireAdmin();
      if(!a.success) return a;
      const d = deposits.find(x => x.id === params.id && x.status === 'pending');
      if(!d) return { success: false, error: 'Không tìm thấy' };
      
      const u = users[d.email];
      if(!u) return { success: false, error: 'User không tồn tại' };
      
      u.balance = (Number(u.balance) || 0) + Number(d.amount);
      history.push({
        email: d.email, type: 'deposit',
        amount: d.amount, balance: u.balance,
        note: 'Nạp tiền', at: now()
      });
      d.status = 'approved';
      d.approved_at = now();
      
      /* Tự động mua key */
      localAutoBuyKey(users, history, d.email);
      
      lsSet(LS_USERS, users);
      lsSet(LS_DEPOSITS, deposits);
      lsSet(LS_HISTORY, history);
      return { success: true };
    }
    
    case 'deposit_reject': {
      const a = requireAdmin();
      if(!a.success) return a;
      const d = deposits.find(x => x.id === params.id && x.status === 'pending');
      if(!d) return { success: false, error: 'Không tìm thấy' };
      d.status = 'rejected';
      d.rejected_at = now();
      d.note = params.reason || 'Không hợp lệ';
      lsSet(LS_DEPOSITS, deposits);
      return { success: true };
    }
    
    case 'user_list': {
      const a = requireAdmin();
      if(!a.success) return a;
      const list = Object.values(users).map(u => {
        const safe = { ...u };
        delete safe.password;
        return safe;
      });
      return { success: true, users: list };
    }
    
    case 'user_update': {
      const a = requireAdmin();
      if(!a.success) return a;
      const em = (params.email || '').toLowerCase().trim();
      const u = users[em];
      if(!u) return { success: false, error: 'Không tìm thấy user' };
      
      if(params.balance !== undefined) u.balance = parseInt(params.balance, 10) || 0;
      if(params.key_expiry !== undefined) u.key_expiry = parseInt(params.key_expiry, 10) || 0;
      if(params.is_admin !== undefined) u.is_admin = parseInt(params.is_admin, 10) ? 1 : 0;
      if(params.name !== undefined) u.name = params.name;
      
      lsSet(LS_USERS, users);
      return { success: true };
    }
    
    case 'user_delete': {
      const a = requireAdmin();
      if(!a.success) return a;
      const em = (params.email || '').toLowerCase().trim();
      if(em === ADMIN_EMAIL) return { success: false, error: 'Không thể xoá admin tổng' };
      if(!users[em]) return { success: false, error: 'Không tìm thấy' };
      delete users[em];
      lsSet(LS_USERS, users);
      return { success: true };
    }
    
    case 'key_create': {
      const a = requireAdmin();
      if(!a.success) return a;
      const days = Math.max(1, parseInt(params.days, 10) || 1);
      const qty = Math.min(100, Math.max(1, parseInt(params.qty, 10) || 1));
      const note = params.note || '';
      const created = [];
      const C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const g = () => Array.from({ length: 4 }, () => C[Math.floor(Math.random() * C.length)]).join('');
      
      for(let i = 0; i < qty; i++){
        const code = g() + '-' + g() + '-' + g();
        keys.push({
          code, days, note,
          used: 0, used_by: '', used_at: 0,
          created_at: now()
        });
        created.push(code);
      }
      lsSet(LS_KEYS, keys);
      return { success: true, keys: created };
    }
    
    case 'key_activate': {
      const a = checkAuth();
      if(!a.success) return a;
      const code = String(params.code || '').toUpperCase().trim();
      if(!code) return { success: false, error: 'Nhập key' };
      
      const k = keys.find(x => x.code === code);
      if(!k) return { success: false, error: 'Key không tồn tại' };
      if(k.used) return { success: false, error: 'Key đã sử dụng' };
      
      const u = users[a.user.email];
      const base = (Number(u.key_expiry) > now()) ? Number(u.key_expiry) : now();
      const newExpiry = base + k.days * 24 * 3600 * 1000;
      
      u.key_expiry = newExpiry;
      k.used = 1;
      k.used_by = u.email;
      k.used_at = now();
      
      history.push({
        email: u.email, type: 'key',
        amount: 0, balance: u.balance,
        note: 'Kích hoạt key +' + k.days + ' ngày', at: now()
      });
      
      lsSet(LS_USERS, users);
      lsSet(LS_KEYS, keys);
      lsSet(LS_HISTORY, history);
      
      return { success: true, days: k.days, new_expiry: newExpiry };
    }
    
    case 'key_list': {
      const a = requireAdmin();
      if(!a.success) return a;
      return { success: true, keys };
    }
    
    case 'key_delete': {
      const a = requireAdmin();
      if(!a.success) return a;
      keys = keys.filter(x => x.code !== params.code);
      lsSet(LS_KEYS, keys);
      return { success: true };
    }
    
    case 'history': {
      const a = checkAuth();
      if(!a.success) return a;
      const list = history.filter(h => h.email === a.user.email).sort((x,y) => y.at - x.at).slice(0, 100);
      return { success: true, history: list };
    }
    
    case 'buy_package': {
      const a = checkAuth();
      if(!a.success) return a;
      const days = parseInt(params.days, 10) || 0;
      const price = parseInt(params.price, 10) || 0;
      if(days < 1 || price < 1) return { success: false, error: 'Gói không hợp lệ' };
      
      const u = users[a.user.email];
      if(Number(u.balance) < price) return { success: false, error: 'Số dư không đủ' };
      
      const base = (Number(u.key_expiry) > now()) ? Number(u.key_expiry) : now();
      const newExpiry = base + days * 24 * 3600 * 1000;
      u.balance = Number(u.balance) - price;
      u.key_expiry = newExpiry;
      
      history.push({
        email: u.email, type: 'buy',
        amount: -price, balance: u.balance,
        note: 'Mua gói VIP ' + days + ' ngày', at: now()
      });
      
      lsSet(LS_USERS, users);
      lsSet(LS_HISTORY, history);
      return { success: true, new_balance: u.balance, new_expiry: newExpiry };
    }
    
    case 'update_last_api': {
      const a = checkAuth();
      if(!a.success) return { success: false };
      const u = users[a.user.email];
      u.last_api = params.api || '';
      u.last_tool = params.tool || '';
      u.last_tool_at = now();
      lsSet(LS_USERS, users);
      return { success: true };
    }
    
    case 'config_get': {
      const cfg = lsGet(CFG_KEY, null);
      return { success: true, config: cfg };
    }
    
    case 'config_save': {
      const a = requireAdmin();
      if(!a.success) return a;
      const local = loadConfig();
      if(params.key === 'packages') local.packages = params.value;
      if(params.key === 'tools') local.tools = params.value;
      if(params.key === 'site') Object.assign(local, params.value || {});
      lsSet(CFG_KEY, local);
      return { success: true };
    }
    
    default:
      return { success: false, error: 'Action không hợp lệ: ' + action };
  }
}

/* Tự động mua key trong localStorage mode */
function localAutoBuyKey(users, history, email){
  const u = users[email];
  if(!u || u.is_admin) return;
  if(Number(u.key_expiry) > now()) return;
  
  const cfg = loadConfig();
  const packages = cfg.packages || [];
  const avail = packages.filter(p => p.price <= Number(u.balance));
  if(!avail.length) return;
  
  avail.sort((a, b) => a.days - b.days);
  const pkg = avail[avail.length - 1];
  
  u.balance = Number(u.balance) - pkg.price;
  u.key_expiry = now() + pkg.days * 24 * 3600 * 1000;
  history.push({
    email, type: 'auto-buy',
    amount: -pkg.price, balance: u.balance,
    note: 'Tự động mua ' + pkg.name, at: now()
  });
}

/* ============================================================
   API CHÍNH - TỰ ĐỘNG FALLBACK
   ============================================================ */
async function api(action, params = {}, method = 'POST'){
  /* Nếu đã biết server không có → dùng localStorage luôn */
  if(SERVER_AVAILABLE === false){
    return await localApi(action, params);
  }
  
  const url = (window.API_URL || '/api/index.php') + '?action=' + encodeURIComponent(action);
  const opts = { method, headers: { 'Content-Type': 'application/json' }, cache: 'no-store' };
  if(method === 'POST') opts.body = JSON.stringify(params);
  
  try{
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    opts.signal = ctrl.signal;
    
    const r = await fetch(url, opts);
    clearTimeout(timeout);
    
    const text = await r.text();
    
    /* Nếu response không phải JSON → PHP không chạy */
    if(!text || !text.trim() || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')){
      console.warn('[API] Server trả về HTML/empty → chuyển sang localStorage mode');
      SERVER_AVAILABLE = false;
      return await localApi(action, params);
    }
    
    let data;
    try{
      data = JSON.parse(text);
    }catch(parseErr){
      console.warn('[API] Response không phải JSON → fallback localStorage:', text.slice(0, 100));
      SERVER_AVAILABLE = false;
      return await localApi(action, params);
    }
    
    /* Nếu HTTP status không OK (404, 500) → PHP không chạy */
    if(!r.ok && (r.status === 404 || r.status === 500)){
      console.warn('[API] HTTP ' + r.status + ' → fallback localStorage');
      SERVER_AVAILABLE = false;
      return await localApi(action, params);
    }
    
    /* Server chạy OK */
    SERVER_AVAILABLE = true;
    
    /* Fix [object Object] */
    if(data && data.error !== undefined && data.error !== null){
      if(typeof data.error === 'object'){
        data.error = data.error.message || data.error.msg || JSON.stringify(data.error);
      }
      data.error = translateError(data.error);
    }
    
    if(data === null || typeof data !== 'object'){
      return { success: false, error: 'Server trả về dữ liệu rỗng' };
    }
    
    return data;
    
  }catch(e){
    /* Timeout, network error → fallback localStorage */
    console.warn('[API] Fetch lỗi (' + e.message + ') → fallback localStorage');
    SERVER_AVAILABLE = false;
    return await localApi(action, params);
  }
}

/* ============================================================
   SESSION
   ============================================================ */
function getSession(){
  try{
    const raw = localStorage.getItem(SESS_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    if(!s || !s.email || !s.password) return null;
    return s;
  }catch(e){ return null; }
}
function setSessionData(email, pass, user){
  try{
    localStorage.setItem(SESS_KEY, JSON.stringify({
      email, password: pass, user, savedAt: Date.now()
    }));
  }catch(e){ console.warn('setSession fail', e); }
}
function clearSession(){ localStorage.removeItem(SESS_KEY); }
function currentUser(){ const s = getSession(); return s ? s.user : null; }
function refreshUser(user){
  const s = getSession();
  if(s){ s.user = user; localStorage.setItem(SESS_KEY, JSON.stringify(s)); }
}

/* ============================================================
   API WRAPPERS
   ============================================================ */
async function apiLogin(email, password){
  const res = await api('login', { email, password });
  if(res && res.success && res.user) setSessionData(email, password, res.user);
  return res;
}
async function apiRegister(email, password, name){
  return await api('register', { email, password, name });
}
async function apiGetUser(){
  const s = getSession();
  if(!s) return { success: false, error: 'Chưa đăng nhập' };
  const res = await api('get_user', { email: s.email, password: s.password });
  if(res && res.success && res.user) refreshUser(res.user);
  return res;
}
async function apiDepositCreate(amount, note){
  const s = getSession();
  if(!s) return { success: false, error: 'Chưa đăng nhập' };
  return await api('deposit_create', { email: s.email, password: s.password, amount, note: note || '' });
}
async function apiDepositMy(){
  const s = getSession();
  if(!s) return { success: false, error: 'Chưa đăng nhập' };
  return await api('deposit_my', { email: s.email, password: s.password });
}
async function apiHistory(){
  const s = getSession();
  if(!s) return { success: false, error: 'Chưa đăng nhập' };
  return await api('history', { email: s.email, password: s.password });
}
async function apiKeyActivate(code){
  const s = getSession();
  if(!s) return { success: false, error: 'Chưa đăng nhập' };
  return await api('key_activate', { email: s.email, password: s.password, code });
}
async function apiBuyPackage(packageId, days, price){
  const s = getSession();
  if(!s) return { success: false, error: 'Chưa đăng nhập' };
  return await api('buy_package', { email: s.email, password: s.password, package_id: packageId, days, price });
}
async function apiUpdateLastApi(apiUrl, toolName){
  const s = getSession();
  if(!s) return;
  try{
    await api('update_last_api', { email: s.email, password: s.password, api: apiUrl || '', tool: toolName || '' });
  }catch(e){}
}
async function adminApi(action, params = {}){
  const s = getSession();
  if(!s) return { success: false, error: 'Chưa đăng nhập' };
  return await api(action, { email: s.email, password: s.password, ...params });
}

/* ============================================================
   CONFIG
   ============================================================ */
function loadConfig(){
  try{
    const raw = localStorage.getItem(CFG_KEY);
    if(!raw){
      const c = JSON.parse(JSON.stringify(window.APP_CONFIG));
      if(!c.tools) c.tools = [];
      localStorage.setItem(CFG_KEY, JSON.stringify(c));
      return c;
    }
    const c = JSON.parse(raw);
    const d = window.APP_CONFIG;
    if(!c.packages) c.packages = d.packages || [];
    if(!c.tools) c.tools = d.tools || [];
    if(!c.notice) c.notice = d.notice || '';
    if(!c.notice_title) c.notice_title = d.notice_title || '';
    if(!c.marquee) c.marquee = d.marquee || '';
    if(!c.bank) c.bank = d.bank || { name:'', acc:'', holder:'', qr:'' };
    if(!c.site_name) c.site_name = d.site_name || 'BONSICOLA';
    if(c.login_avatar === undefined) c.login_avatar = '';
    if(c.bg_music === undefined) c.bg_music = '';
    if(c.bg_music_enabled === undefined) c.bg_music_enabled = 1;
    return c;
  }catch(e){
    return JSON.parse(JSON.stringify(window.APP_CONFIG));
  }
}
function saveConfig(c){
  try{ localStorage.setItem(CFG_KEY, JSON.stringify(c)); }catch(e){}
  const s = getSession();
  if(s && SERVER_AVAILABLE !== false){
    api('config_save', { email: s.email, password: s.password, key: 'packages', value: c.packages }).catch(()=>{});
    api('config_save', { email: s.email, password: s.password, key: 'tools', value: c.tools }).catch(()=>{});
    api('config_save', { email: s.email, password: s.password, key: 'site', value: {
      site_name: c.site_name, marquee: c.marquee, notice: c.notice, notice_title: c.notice_title,
      bank: c.bank, login_avatar: c.login_avatar, bg_music: c.bg_music, bg_music_enabled: c.bg_music_enabled
    }}).catch(()=>{});
  }
}
async function loadConfigFromServer(){
  try{
    const res = await api('config_get');
    if(!res || !res.success || !res.config) return false;
    const local = loadConfig();
    const c = res.config;
    if(c.packages) local.packages = c.packages;
    if(c.tools) local.tools = c.tools;
    if(c.site) Object.assign(local, c.site);
    localStorage.setItem(CFG_KEY, JSON.stringify(local));
    return true;
  }catch(e){ return false; }
}

/* ============================================================
   AVATAR
   ============================================================ */
function normalizeAvatar(raw){
  if(!raw) return null;
  raw = String(raw).trim();
  if(!raw) return null;
  if(/^data:image\//i.test(raw)) return raw;
  let mime = 'image/jpeg';
  if(raw.startsWith('iVBOR')) mime = 'image/png';
  else if(raw.startsWith('R0lGOD')) mime = 'image/gif';
  else if(raw.startsWith('UklGR')) mime = 'image/webp';
  return `data:${mime};base64,${raw}`;
}
function applyAvatarEverywhere(src){
  ['loginAvatarImg','hdrAvatar','profAvatar','drawerAvatar'].forEach(id => {
    const el = document.getElementById(id);
    if(el && src) el.src = src;
  });
}
function getAvatarFromStorage(){
  try{ return localStorage.getItem(AVATAR_KEY); }catch(e){ return null; }
}
function setAvatarToStorage(src){
  try{
    if(src) localStorage.setItem(AVATAR_KEY, src);
    else localStorage.removeItem(AVATAR_KEY);
  }catch(e){}
}

/* ============================================================
   HELPER
   ============================================================ */
function userIsVIP(u){
  if(!u) return false;
  if(isRealAdmin && isRealAdmin(u)) return true;
  return Number(u.key_expiry) > now();
}

/* ============================================================
   EXPOSE
   ============================================================ */
window.api = api;
window.translateError = translateError;
window.apiLogin = apiLogin;
window.apiRegister = apiRegister;
window.apiGetUser = apiGetUser;
window.apiDepositCreate = apiDepositCreate;
window.apiDepositMy = apiDepositMy;
window.apiHistory = apiHistory;
window.apiKeyActivate = apiKeyActivate;
window.apiBuyPackage = apiBuyPackage;
window.apiUpdateLastApi = apiUpdateLastApi;
window.adminApi = adminApi;
window.loadConfig = loadConfig;
window.saveConfig = saveConfig;
window.loadConfigFromServer = loadConfigFromServer;
window.getSession = getSession;
window.currentUser = currentUser;
window.clearSession = clearSession;
window.refreshUser = refreshUser;
window.normalizeAvatar = normalizeAvatar;
window.applyAvatarEverywhere = applyAvatarEverywhere;
window.getAvatarFromStorage = getAvatarFromStorage;
window.setAvatarToStorage = setAvatarToStorage;
window.getToolImage = getToolImage;
window.fmt = fmt;
window.fmtDate = fmtDate;
window.fmtDateShort = fmtDateShort;
window.esc = esc;
window.now = now;
window.userIsVIP = userIsVIP;
window.DEFAULT_AVATAR = DEFAULT_AVATAR;
window.DB_KEY = DB_KEY;
window.SESS_KEY = SESS_KEY;
window.AVATAR_KEY = AVATAR_KEY;
window.MUSIC_ON_KEY = MUSIC_ON_KEY;
window.CFG_KEY = CFG_KEY;
