/* ============================================================
   STORE.JS - BONSICOLA (API PHP + Full Fix)
   ============================================================ */

/* ============================================================
   CONSTANTS
   ============================================================ */
const DB_KEY       = 'bonsicola_user';
const SESS_KEY     = 'bonsicola_session';
const AVATAR_KEY   = 'bonsicola_avatar';
const MUSIC_ON_KEY = 'bonsicola_music';
const CFG_KEY      = 'bonsicola_config';

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%25' stop-color='%23e0f2fe'/><stop offset='100%25' stop-color='%23bae6fd'/></linearGradient></defs><rect fill='url(%23g)' width='200' height='200'/><text x='50%25' y='56%25' font-size='90' text-anchor='middle' dominant-baseline='middle'>🎀</text></svg>";

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */
function now(){ 
  return Date.now(); 
}

function fmt(n){ 
  const num = Number(n) || 0;
  return num.toLocaleString('vi-VN') + 'đ';
}

function fmtDate(ts){ 
  if(!ts) return '—';
  const d = new Date(Number(ts));
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtDateShort(ts){ 
  if(!ts) return '—';
  const d = new Date(Number(ts));
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth()+1)}/${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function esc(s){ 
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c])); 
}

function getToolImage(t){ 
  if(!t) return '';
  return t.image_base64 || t.image || ''; 
}

/* ============================================================
   TRANSLATE ERROR SANG TIẾNG VIỆT
   ============================================================ */
function translateError(msg){
  if(!msg) return 'Lỗi không xác định';
  
  // Nếu là object → lấy message
  if(typeof msg === 'object'){
    msg = msg.message || msg.msg || msg.error || JSON.stringify(msg);
  }
  
  const m = String(msg).toLowerCase().trim();
  
  // Đăng nhập
  if(m.includes('wrong password') || m.includes('sai mật khẩu') || m === 'sai tài khoản') 
    return 'Sai mật khẩu!';
  if(m.includes('user not found') || m.includes('không tồn tại') || m.includes('user does not exist')) 
    return 'Tài khoản không tồn tại!';
  if(m.includes('wrong email') || m.includes('sai email') || m.includes('email not found')) 
    return 'Email không đúng!';
  if(m.includes('invalid credentials') || m.includes('sai email hoặc mật khẩu')) 
    return 'Sai email hoặc mật khẩu!';
  if(m.includes('not logged in') || m.includes('chưa đăng nhập')) 
    return 'Bạn chưa đăng nhập!';
  if(m.includes('session expired') || m.includes('hết hạn')) 
    return 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!';
  
  // Đăng ký
  if(m.includes('email already') || m.includes('đã tồn tại') || m.includes('already exists') || m.includes('duplicate'))
    return 'Email đã được đăng ký!';
  if(m.includes('invalid email') || m.includes('email không hợp lệ'))
    return 'Email không đúng định dạng!';
  if(m.includes('password') && (m.includes('short') || m.includes('6 ký tự')))
    return 'Mật khẩu phải từ 6 ký tự!';
  if(m.includes('password') && m.includes('mismatch'))
    return 'Mật khẩu nhập lại không khớp!';
  if(m.includes('missing') || m.includes('thiếu thông tin'))
    return 'Vui lòng nhập đầy đủ thông tin!';
  
  // Quyền
  if(m.includes('unauthorized') || m.includes('401'))
    return 'Chưa đăng nhập hoặc phiên hết hạn!';
  if(m.includes('forbidden') || m.includes('403') || m.includes('không có quyền'))
    return 'Bạn không có quyền thực hiện!';
  if(m.includes('admin'))
    return 'Chỉ Admin mới được thực hiện!';
  
  // Dữ liệu
  if(m.includes('not found') || m.includes('404') || m.includes('không tìm thấy'))
    return 'Không tìm thấy dữ liệu!';
  if(m.includes('already used') || m.includes('đã sử dụng'))
    return 'Đã được sử dụng!';
  if(m.includes('invalid'))
    return 'Dữ liệu không hợp lệ!';
  
  // Nạp tiền / Key
  if(m.includes('số tiền') || m.includes('minimum') || m.includes('tối thiểu'))
    return 'Số tiền tối thiểu 10,000đ!';
  if(m.includes('số dư không đủ') || m.includes('insufficient'))
    return 'Số dư không đủ!';
  if(m.includes('key') && m.includes('không tồn tại'))
    return 'Key không tồn tại!';
  if(m.includes('key') && m.includes('đã sử dụng'))
    return 'Key đã được sử dụng!';
  if(m.includes('không hợp lệ'))
    return 'Dữ liệu không hợp lệ!';
  
  // Server / Network
  if(m.includes('server error') || m.includes('500'))
    return 'Lỗi server, vui lòng thử lại sau!';
  if(m.includes('network') || m.includes('failed to fetch') || m.includes('không kết nối'))
    return 'Không kết nối được server!';
  if(m.includes('timeout'))
    return 'Hết thời gian chờ, vui lòng thử lại!';
  if(m.includes('internal'))
    return 'Lỗi hệ thống, vui lòng thử lại!';
  
  // Database
  if(m.includes('database') || m.includes('db lỗi') || m.includes('mysql'))
    return 'Lỗi cơ sở dữ liệu, vui lòng liên hệ Admin!';
  
  // Trả về nguyên bản nếu không match
  return String(msg);
}

/* ============================================================
   API HELPER - FIX [object Object]
   ============================================================ */
async function api(action, params = {}, method = 'POST'){
  const url = (window.API_URL || '/api/index.php') + '?action=' + encodeURIComponent(action);
  const opts = { 
    method: method, 
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
  };
  if(method === 'POST') opts.body = JSON.stringify(params);
  
  try{
    const r = await fetch(url, opts);
    
    // Đọc text trước để kiểm tra
    const text = await r.text();
    
    // Nếu response rỗng
    if(!text || !text.trim()){
      console.error('[API] Response rỗng cho action:', action);
      return { success: false, error: 'Server không phản hồi (mã ' + r.status + ')' };
    }
    
    // Thử parse JSON
    let data;
    try{
      data = JSON.parse(text);
    }catch(parseErr){
      console.error('[API] Response không phải JSON:', text.slice(0, 300));
      
      // Nếu là HTML (thường do lỗi 404/500) → cảnh báo
      if(text.includes('<!DOCTYPE') || text.includes('<html')){
        return { 
          success: false, 
          error: 'Server trả về trang HTML (lỗi ' + r.status + '). Kiểm tra API_URL!' 
        };
      }
      
      return { 
        success: false, 
        error: 'Server trả về dữ liệu không hợp lệ (mã ' + r.status + ')' 
      };
    }
    
    // ⚠️ FIX CHÍNH: Nếu data.error là object → chuyển thành string tiếng Việt
    if(data && data.error !== undefined && data.error !== null){
      if(typeof data.error === 'object'){
        data.error = data.error.message || data.error.msg || JSON.stringify(data.error);
      }
      data.error = translateError(data.error);
    }
    
    // Nếu data là array hoặc null → đảm bảo luôn là object
    if(data === null || typeof data !== 'object'){
      return { success: false, error: 'Server trả về dữ liệu rỗng' };
    }
    
    // Nếu có success=true nhưng không có data → OK
    return data;
    
  }catch(e){
    console.error('[API] Lỗi fetch cho action "' + action + '":', e);
    
    let msg = e.message || 'Lỗi không xác định';
    
    if(msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network request failed')){
      msg = 'Không kết nối được server! Kiểm tra kết nối mạng hoặc API_URL.';
    } else if(msg.includes('JSON')){
      msg = 'Server trả về dữ liệu không hợp lệ!';
    } else if(msg.includes('aborted')){
      msg = 'Yêu cầu bị hủy!';
    }
    
    return { success: false, error: msg };
  }
}

/* ============================================================
   SESSION MANAGEMENT
   ============================================================ */
function getSession(){
  try{
    const raw = localStorage.getItem(SESS_KEY);
    if(!raw) return null;
    const s = JSON.parse(raw);
    // Validate session có đủ field
    if(!s || !s.email || !s.password) return null;
    return s;
  }catch(e){ 
    return null; 
  }
}

function setSessionData(email, pass, user){
  try{
    localStorage.setItem(SESS_KEY, JSON.stringify({ 
      email: email, 
      password: pass, 
      user: user,
      savedAt: Date.now()
    }));
  }catch(e){
    console.error('Lỗi lưu session:', e);
  }
}

function clearSession(){ 
  localStorage.removeItem(SESS_KEY); 
}

function currentUser(){ 
  const s = getSession(); 
  return s ? s.user : null; 
}

function refreshUser(user){
  const s = getSession();
  if(s){ 
    s.user = user; 
    localStorage.setItem(SESS_KEY, JSON.stringify(s)); 
  }
}

/* ============================================================
   USER API WRAPPERS
   ============================================================ */
async function apiLogin(email, password){
  const res = await api('login', { email, password });
  if(res && res.success && res.user){
    setSessionData(email, password, res.user);
  }
  return res;
}

async function apiRegister(email, password, name){
  return await api('register', { email, password, name });
}

async function apiGetUser(){
  const s = getSession();
  if(!s) return { success: false, error: 'Chưa đăng nhập' };
  const res = await api('get_user', { email: s.email, password: s.password });
  if(res && res.success && res.user){
    refreshUser(res.user);
  }
  return res;
}

async function apiDepositCreate(amount, note){
  const s = getSession();
  if(!s) return { success: false, error: 'Chưa đăng nhập' };
  return await api('deposit_create', { 
    email: s.email, 
    password: s.password, 
    amount: amount, 
    note: note || '' 
  });
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
  return await api('key_activate', { 
    email: s.email, 
    password: s.password, 
    code: code 
  });
}

async function apiBuyPackage(packageId, days, price){
  const s = getSession();
  if(!s) return { success: false, error: 'Chưa đăng nhập' };
  return await api('buy_package', { 
    email: s.email, 
    password: s.password, 
    package_id: packageId, 
    days: days, 
    price: price 
  });
}

async function apiUpdateLastApi(apiUrl, toolName){
  const s = getSession();
  if(!s) return;
  try{
    await api('update_last_api', { 
      email: s.email, 
      password: s.password, 
      api: apiUrl || '', 
      tool: toolName || '' 
    });
  }catch(e){
    console.warn('Update last api fail:', e);
  }
}

/* ============================================================
   ADMIN API WRAPPER
   ============================================================ */
async function adminApi(action, params = {}){
  const s = getSession();
  if(!s) return { success: false, error: 'Chưa đăng nhập' };
  return await api(action, { 
    email: s.email, 
    password: s.password, 
    ...params 
  });
}

/* ============================================================
   CONFIG MANAGEMENT
   ============================================================ */
function loadConfig(){
  try{
    const raw = localStorage.getItem(CFG_KEY);
    
    if(!raw){
      // Chưa có → dùng default
      const c = JSON.parse(JSON.stringify(window.APP_CONFIG));
      if(!c.tools) c.tools = [];
      localStorage.setItem(CFG_KEY, JSON.stringify(c));
      return c;
    }
    
    const c = JSON.parse(raw);
    const d = window.APP_CONFIG;
    
    // Merge missing fields
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
    console.warn('loadConfig error:', e);
    return JSON.parse(JSON.stringify(window.APP_CONFIG)); 
  }
}

function saveConfig(c){
  try{
    localStorage.setItem(CFG_KEY, JSON.stringify(c));
  }catch(e){
    console.error('saveConfig error:', e);
    return;
  }
  
  // Đẩy lên server nếu có session
  const s = getSession();
  if(s){
    // Push packages
    api('config_save', { 
      email: s.email, 
      password: s.password, 
      key: 'packages', 
      value: c.packages 
    }).catch(()=>{});
    
    // Push tools
    api('config_save', { 
      email: s.email, 
      password: s.password, 
      key: 'tools', 
      value: c.tools 
    }).catch(()=>{});
    
    // Push site info
    api('config_save', { 
      email: s.email, 
      password: s.password, 
      key: 'site', 
      value: {
        site_name: c.site_name,
        marquee: c.marquee,
        notice: c.notice,
        notice_title: c.notice_title,
        bank: c.bank,
        login_avatar: c.login_avatar,
        bg_music: c.bg_music,
        bg_music_enabled: c.bg_music_enabled
      }
    }).catch(()=>{});
  }
}

/* Tải config từ server (mọi máy thấy chung) */
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
  }catch(e){ 
    console.warn('loadConfigFromServer fail:', e);
    return false; 
  }
}

/* ============================================================
   AVATAR
   ============================================================ */
function normalizeAvatar(raw){
  if(!raw) return null;
  raw = String(raw).trim();
  if(!raw) return null;
  
  // Đã là data URL
  if(/^data:image\//i.test(raw)) return raw;
  
  // Detect mime
  let mime = 'image/jpeg';
  if(raw.startsWith('iVBOR')) mime = 'image/png';
  else if(raw.startsWith('R0lGOD')) mime = 'image/gif';
  else if(raw.startsWith('UklGR')) mime = 'image/webp';
  else if(raw.startsWith('/9j/')) mime = 'image/jpeg';
  
  return `data:${mime};base64,${raw}`;
}

function applyAvatarEverywhere(src){
  ['loginAvatarImg','hdrAvatar','profAvatar','drawerAvatar'].forEach(id => {
    const el = document.getElementById(id); 
    if(el && src) el.src = src;
  });
}

function getAvatarFromStorage(){
  try{
    return localStorage.getItem(AVATAR_KEY) || null;
  }catch(e){ 
    return null; 
  }
}

function setAvatarToStorage(src){
  try{
    if(src){
      localStorage.setItem(AVATAR_KEY, src);
    } else {
      localStorage.removeItem(AVATAR_KEY);
    }
  }catch(e){ 
    console.warn('Không lưu được avatar:', e); 
  }
}

/* ============================================================
   HELPER: Kiểm tra user có VIP không
   ============================================================ */
function userIsVIP(u){
  if(!u) return false;
  if(isRealAdmin && isRealAdmin(u)) return true;
  return u.key_expiry && Number(u.key_expiry) > now();
}

/* ============================================================
   EXPOSE ra window (phòng khi cần gọi từ console)
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
