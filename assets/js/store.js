/* ============================================================
   STORE - Gọi API PHP thay vì localStorage
   ============================================================ */

const DB_KEY = 'bonsicola_user';
const SESS_KEY = 'bonsicola_session';
const AVATAR_KEY = 'bonsicola_avatar';
const MUSIC_ON_KEY = 'bonsicola_music';

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect fill='%23e0f2fe' width='200' height='200'/><text x='50%25' y='56%25' font-size='90' text-anchor='middle' dominant-baseline='middle'>🎀</text></svg>";

function now(){ return Date.now(); }
function fmt(n){ return Number(n||0).toLocaleString('vi-VN')+'đ'; }
function fmtDate(ts){ if(!ts)return '—';const d=new Date(ts),p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; }
function fmtDateShort(ts){ if(!ts)return '—';const d=new Date(ts),p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}/${p(d.getMonth()+1)}/${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`; }
function esc(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ============================================================
   API HELPER
   ============================================================ */
async function api(action, params = {}, method = 'POST'){
  const url = (window.API_URL || '/api/index.php') + '?action=' + encodeURIComponent(action);
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if(method === 'POST') opts.body = JSON.stringify(params);
  try{
    const r = await fetch(url, opts);
    const data = await r.json();
    return data;
  }catch(e){
    console.error('[API]', action, e);
    return { error: 'Không kết nối được server: ' + e.message };
  }
}

/* ============================================================
   USER SESSION
   ============================================================ */
function getSession(){
  try{
    const raw = localStorage.getItem(SESS_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}
function setSessionData(email, pass, user){
  localStorage.setItem(SESS_KEY, JSON.stringify({ email, password: pass, user }));
}
function clearSession(){ localStorage.removeItem(SESS_KEY); }
function currentUser(){ const s = getSession(); return s ? s.user : null; }
function setSession(email, pass){
  localStorage.setItem(SESS_KEY, JSON.stringify({ email, password: pass }));
}
function refreshUser(user){
  const s = getSession();
  if(s){ s.user = user; localStorage.setItem(SESS_KEY, JSON.stringify(s)); }
}

/* ============================================================
   WRAPPER API CALLS (frontend gọi gọn)
   ============================================================ */
async function apiLogin(email, password){
  const res = await api('login', { email, password });
  if(res.success){
    setSessionData(email, password, res.user);
  }
  return res;
}
async function apiRegister(email, password, name){
  return await api('register', { email, password, name });
}
async function apiGetUser(){
  const s = getSession();
  if(!s) return { error: 'Chưa đăng nhập' };
  const res = await api('get_user', { email: s.email, password: s.password });
  if(res.success){
    refreshUser(res.user);
  }
  return res;
}
async function apiDepositCreate(amount, note){
  const s = getSession();
  return await api('deposit_create', { email: s.email, password: s.password, amount, note });
}
async function apiDepositMy(){
  const s = getSession();
  return await api('deposit_my', { email: s.email, password: s.password });
}
async function apiHistory(){
  const s = getSession();
  return await api('history', { email: s.email, password: s.password });
}
async function apiKeyActivate(code){
  const s = getSession();
  return await api('key_activate', { email: s.email, password: s.password, code });
}
async function apiBuyPackage(packageId, days, price){
  const s = getSession();
  return await api('buy_package', { email: s.email, password: s.password, package_id: packageId, days, price });
}
async function apiUpdateLastApi(apiUrl, toolName){
  const s = getSession();
  if(!s) return;
  await api('update_last_api', { email: s.email, password: s.password, api: apiUrl, tool: toolName });
}

/* ============================================================
   ADMIN API
   ============================================================ */
async function adminApi(action, params = {}){
  const s = getSession();
  if(!s) return { error: 'Chưa đăng nhập' };
  return await api(action, { email: s.email, password: s.password, ...params });
}

/* ============================================================
   CONFIG LOCAL (packages + tools vẫn lưu localStorage để tối ưu)
   ============================================================ */
const CFG_KEY = 'bonsicola_config';
function loadConfig(){
  try{
    const raw = localStorage.getItem(CFG_KEY);
    if(!raw){ const c = JSON.parse(JSON.stringify(window.APP_CONFIG)); localStorage.setItem(CFG_KEY, JSON.stringify(c)); return c; }
    const c = JSON.parse(raw), d = window.APP_CONFIG;
    if(!c.packages) c.packages = d.packages;
    if(!c.tools) c.tools = d.tools;
    if(!c.notice) c.notice = d.notice;
    if(!c.notice_title) c.notice_title = d.notice_title;
    if(!c.marquee) c.marquee = d.marquee;
    if(!c.bank) c.bank = d.bank;
    if(!c.site_name) c.site_name = d.site_name;
    if(c.login_avatar === undefined) c.login_avatar = '';
    if(c.bg_music === undefined) c.bg_music = '';
    if(c.bg_music_enabled === undefined) c.bg_music_enabled = 1;
    return c;
  }catch(e){ return JSON.parse(JSON.stringify(window.APP_CONFIG)); }
}
function saveConfig(c){
  localStorage.setItem(CFG_KEY, JSON.stringify(c));
  // Đồng thời lưu lên server
  adminApi('config_save', { key: 'packages', value: c.packages }).catch(()=>{});
  adminApi('config_save', { key: 'tools', value: c.tools }).catch(()=>{});
  adminApi('config_save', { key: 'site', value: { site_name: c.site_name, marquee: c.marquee, notice: c.notice, notice_title: c.notice_title, bank: c.bank, login_avatar: c.login_avatar, bg_music: c.bg_music, bg_music_enabled: c.bg_music_enabled } }).catch(()=>{});
}

/* ============================================================
   AVATAR (vẫn local vì là ảnh của từng user)
   ============================================================ */
function normalizeAvatar(raw){
  if(!raw) return null; raw = raw.trim(); if(!raw) return null;
  if(/^data:image\//i.test(raw)) return raw;
  let mime = 'image/jpeg';
  if(raw.startsWith('iVBOR')) mime = 'image/png';
  else if(raw.startsWith('R0lGOD')) mime = 'image/gif';
  else if(raw.startsWith('UklGR')) mime = 'image/webp';
  return `data:${mime};base64,${raw}`;
}
function applyAvatarEverywhere(src){
  ['loginAvatarImg','hdrAvatar','profAvatar','drawerAvatar'].forEach(id=>{
    const el = document.getElementById(id); if(el && src) el.src = src;
  });
}
