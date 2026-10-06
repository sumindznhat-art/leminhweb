/* ============================================================
   STORE.JS - BONSICOLA FULL
   ============================================================ */

const ADMIN_EMAIL = 'leminhdz@gmail.com';
const ADMIN_PASS = 'admin123';
const AVATAR_KEY = 'bonsicola_avatar';
const MUSIC_ON_KEY = 'bonsicola_music';
const CFG_KEY = 'bonsicola_config';
const SESS_KEY = 'bonsicola_session';
const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect fill='%23e0f2fe' width='200' height='200'/><text x='50%25' y='56%25' font-size='90' text-anchor='middle' dominant-baseline='middle'>🎀</text></svg>";

function now(){return Date.now();}
function fmt(n){return (Number(n)||0).toLocaleString('vi-VN')+'đ';}
function fmtDate(ts){if(!ts)return '—';const d=new Date(Number(ts)),p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;}
function fmtDateShort(ts){if(!ts)return '—';const d=new Date(Number(ts)),p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}/${p(d.getMonth()+1)}/${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`;}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function getToolImage(t){return t?(t.image_base64||t.image||''):'';}

/* ============ API ============ */
async function api(action, params = {}, method = 'POST'){
  const url = (window.API_URL||'/api/index.php')+'?action='+encodeURIComponent(action);
  const opts = {method, headers:{'Content-Type':'application/json'}, cache:'no-store'};
  if(method === 'POST') opts.body = JSON.stringify(params);
  try{
    const r = await fetch(url, opts);
    const data = await r.json();
    if(data && data.error && typeof data.error === 'object') data.error = data.error.message || 'Lỗi';
    return data;
  }catch(e){ return {success:false, error:'Không kết nối server: '+e.message}; }
}

/* ============ SESSION ============ */
function getSession(){try{const raw=localStorage.getItem(SESS_KEY);if(!raw)return null;const s=JSON.parse(raw);return (s&&s.email&&s.password)?s:null;}catch(e){return null;}}
function setSessionData(email,pass,user){try{localStorage.setItem(SESS_KEY,JSON.stringify({email,password:pass,user,savedAt:Date.now()}));}catch(e){}}
function clearSession(){localStorage.removeItem(SESS_KEY);}
function currentUser(){const s=getSession();return s?s.user:null;}
function refreshUser(user){const s=getSession();if(s){s.user=user;localStorage.setItem(SESS_KEY,JSON.stringify(s));}}

/* ============ API WRAPPERS ============ */
async function apiLogin(email,password){
  const res = await api('login',{email,password});
  if(res && res.success && res.user){
    if(email.toLowerCase() === ADMIN_EMAIL){res.user.is_admin = 1;}
    setSessionData(email,password,res.user);
  }
  return res;
}
async function apiRegister(email,password,name){return await api('register',{email,password,name});}
async function apiGetUser(){
  const s = getSession();if(!s)return {success:false,error:'Chưa đăng nhập'};
  const res = await api('get_user',{email:s.email,password:s.password});
  if(res && res.success && res.user){if(s.email.toLowerCase()===ADMIN_EMAIL)res.user.is_admin=1;refreshUser(res.user);}
  return res;
}
async function apiDepositCreate(amount,note){const s=getSession();if(!s)return{success:false};return await api('deposit_create',{email:s.email,password:s.password,amount,note:note||''});}
async function apiHistory(){const s=getSession();if(!s)return{success:false};return await api('history',{email:s.email,password:s.password});}
async function apiKeyActivate(code){const s=getSession();if(!s)return{success:false};return await api('key_activate',{email:s.email,password:s.password,code});}
async function apiBuyPackage(id,days,price){const s=getSession();if(!s)return{success:false};return await api('buy_package',{email:s.email,password:s.password,package_id:id,days,price});}
async function apiUpdateLastApi(apiUrl,toolName){const s=getSession();if(!s)return;try{await api('update_last_api',{email:s.email,password:s.password,api:apiUrl||'',tool:toolName||''});}catch(e){}}
async function adminApi(action,params={}){const s=getSession();if(!s)return{success:false,error:'Chưa đăng nhập'};return await api(action,{email:s.email,password:s.password,...params});}

/* ============ CONFIG ============ */
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

    /* Merge missing fields */
    if(!c.packages)c.packages=d.packages||[];
    if(!c.tools)c.tools=d.tools||[];
    if(!c.notice)c.notice=d.notice||'';
    if(!c.notice_title)c.notice_title=d.notice_title||'';
    if(!c.marquee)c.marquee=d.marquee||'';
    if(!c.bank)c.bank=d.bank||{name:'',acc:'',holder:'',qr:''};
    if(!c.bank.name)c.bank.name='';
    if(!c.bank.acc)c.bank.acc='';
    if(!c.bank.holder)c.bank.holder='';
    if(!c.bank.qr)c.bank.qr='';
    if(!c.site_name)c.site_name=d.site_name||'BONSICOLA';
    if(c.login_avatar===undefined)c.login_avatar='';
    if(c.bg_music===undefined)c.bg_music='';
    if(c.bg_music_enabled===undefined)c.bg_music_enabled=1;
    if(c.logo_web===undefined)c.logo_web='';
    if(c.admin_email===undefined)c.admin_email='leminhdz@gmail.com';

    return c;
  }catch(e){
    return JSON.parse(JSON.stringify(window.APP_CONFIG));
  }
}
function saveConfig(c){try{localStorage.setItem(CFG_KEY,JSON.stringify(c));}catch(e){}}
async function loadConfigFromServer(){return false;}

/* ============ AVATAR ============ */
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
function applyAvatarEverywhere(src){['loginAvatarImg','hdrAvatar','profAvatar','drawerAvatar'].forEach(id=>{const el=document.getElementById(id);if(el&&src)el.src=src;});}
function getAvatarFromStorage(){try{return localStorage.getItem(AVATAR_KEY);}catch(e){return null;}}
function setAvatarToStorage(src){try{if(src)localStorage.setItem(AVATAR_KEY,src);else localStorage.removeItem(AVATAR_KEY);}catch(e){}}
function userIsVIP(u){if(!u)return false;if(u.email===ADMIN_EMAIL)return true;return Number(u.key_expiry)>now();}

/* ============ EXPOSE ============ */
window.api=api;window.apiLogin=apiLogin;window.apiRegister=apiRegister;window.apiGetUser=apiGetUser;
window.apiDepositCreate=apiDepositCreate;window.apiHistory=apiHistory;window.apiKeyActivate=apiKeyActivate;
window.apiBuyPackage=apiBuyPackage;window.apiUpdateLastApi=apiUpdateLastApi;window.adminApi=adminApi;
window.loadConfig=loadConfig;window.saveConfig=saveConfig;window.loadConfigFromServer=loadConfigFromServer;
window.getSession=getSession;window.currentUser=currentUser;window.clearSession=clearSession;window.refreshUser=refreshUser;
window.normalizeAvatar=normalizeAvatar;window.applyAvatarEverywhere=applyAvatarEverywhere;
window.getAvatarFromStorage=getAvatarFromStorage;window.setAvatarToStorage=setAvatarToStorage;
window.getToolImage=getToolImage;window.fmt=fmt;window.fmtDate=fmtDate;window.fmtDateShort=fmtDateShort;
window.esc=esc;window.now=now;window.userIsVIP=userIsVIP;window.DEFAULT_AVATAR=DEFAULT_AVATAR;
window.ADMIN_EMAIL=ADMIN_EMAIL;window.ADMIN_PASS=ADMIN_PASS;window.SESS_KEY=SESS_KEY;window.CFG_KEY=CFG_KEY;
window.MUSIC_ON_KEY=MUSIC_ON_KEY;window.AVATAR_KEY=AVATAR_KEY;
