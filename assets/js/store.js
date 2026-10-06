const DB_KEY='leminh_users_v2',SESS_KEY='leminh_session_v2',AVATAR_KEY='leminh_avatar_v2',
      CFG_KEY='leminh_config_v2',KEYS_KEY='leminh_keys_v2',DEP_KEY='leminh_deposits_v2',
      MUSIC_ON_KEY='leminh_music_on';

const DEFAULT_AVATAR="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect fill='%23e0f2fe' width='200' height='200'/><text x='50%25' y='56%25' font-size='90' text-anchor='middle' dominant-baseline='middle'>🎀</text></svg>";

function now(){return Date.now();}
function fmt(n){return Number(n||0).toLocaleString('vi-VN')+'đ';}
function fmtDate(ts){if(!ts)return '—';const d=new Date(ts),p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;}
function fmtDateShort(ts){if(!ts)return '—';const d=new Date(ts),p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}/${p(d.getMonth()+1)}/${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`;}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function loadDB(){
  try{
    let raw=localStorage.getItem(DB_KEY);
    if(!raw){
      const a={email:'leminhdz@gmail.com',password:'admin123',name:'Admin LEMINH',balance:999999999,
        keyExpiry:now()+100*365*24*3600*1000,isAdmin:true,ip:'local',lastLogin:now(),createdAt:now(),
        history:[],keyHistory:[],lastApi:'',lastTool:'',lastToolAt:0};
      const db={users:{'leminhdz@gmail.com':a}};
      localStorage.setItem(DB_KEY,JSON.stringify(db));return db;
    }
    const db=JSON.parse(raw);
    if(!db.users)db.users={};
    if(!db.users['leminhdz@gmail.com']){
      db.users['leminhdz@gmail.com']={email:'leminhdz@gmail.com',password:'admin123',name:'Admin LEMINH',balance:999999999,
        keyExpiry:now()+100*365*24*3600*1000,isAdmin:true,ip:'local',lastLogin:now(),createdAt:now(),
        history:[],keyHistory:[],lastApi:'',lastTool:'',lastToolAt:0};
      localStorage.setItem(DB_KEY,JSON.stringify(db));
    }
    Object.values(db.users).forEach(u=>{
      if(!Array.isArray(u.history))u.history=[];
      if(!Array.isArray(u.keyHistory))u.keyHistory=[];
      if(u.lastApi===undefined)u.lastApi='';
      if(u.lastTool===undefined)u.lastTool='';
      if(u.lastToolAt===undefined)u.lastToolAt=0;
    });
    return db;
  }catch(e){return {users:{}};}
}
function saveDB(db){localStorage.setItem(DB_KEY,JSON.stringify(db));}
function getUser(e){return loadDB().users[e]||null;}
function setUser(e,d){const db=loadDB();db.users[e]=d;saveDB(db);}
function delUser(e){const db=loadDB();delete db.users[e];saveDB(db);}
function currentUser(){const e=localStorage.getItem(SESS_KEY);return e?getUser(e):null;}
function setSession(e){localStorage.setItem(SESS_KEY,e);}
function clearSession(){localStorage.removeItem(SESS_KEY);}

function loadConfig(){
  try{
    const raw=localStorage.getItem(CFG_KEY);
    if(!raw){const c=JSON.parse(JSON.stringify(window.APP_CONFIG));localStorage.setItem(CFG_KEY,JSON.stringify(c));return c;}
    const c=JSON.parse(raw),d=window.APP_CONFIG;
    if(!c.packages)c.packages=d.packages;
    if(!c.tools)c.tools=d.tools;
    if(!c.notice)c.notice=d.notice;
    if(!c.notice_title)c.notice_title=d.notice_title;
    if(!c.marquee)c.marquee=d.marquee;
    if(!c.bank)c.bank=d.bank;
    if(!c.site_name)c.site_name=d.site_name;
    if(c.login_avatar===undefined)c.login_avatar='';
    if(c.bg_music===undefined)c.bg_music='';
    if(c.bg_music_enabled===undefined)c.bg_music_enabled=1;
    return c;
  }catch(e){return JSON.parse(JSON.stringify(window.APP_CONFIG));}
}
function saveConfig(c){localStorage.setItem(CFG_KEY,JSON.stringify(c));}

function loadKeys(){try{return JSON.parse(localStorage.getItem(KEYS_KEY)||'[]');}catch(e){return[];}}
function saveKeys(a){localStorage.setItem(KEYS_KEY,JSON.stringify(a));}
function genKey(){const C='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const g=()=>Array.from({length:4},()=>C[Math.floor(Math.random()*C.length)]).join('');return `${g()}-${g()}-${g()}`;}
function createKey(days,note){const arr=loadKeys();const k={key:genKey(),days:days,note:note||'',used:false,usedBy:'',createdAt:now(),usedAt:0};arr.push(k);saveKeys(arr);return k;}
function findKey(code){return loadKeys().find(k=>k.key.toUpperCase()===String(code).toUpperCase().trim())||null;}
function markKeyUsed(code,email){const arr=loadKeys();const k=arr.find(x=>x.key.toUpperCase()===String(code).toUpperCase().trim());if(k){k.used=true;k.usedBy=email;k.usedAt=now();saveKeys(arr);}}

function loadDeposits(){try{return JSON.parse(localStorage.getItem(DEP_KEY)||'[]');}catch(e){return[];}}
function saveDeposits(a){localStorage.setItem(DEP_KEY,JSON.stringify(a));}
function addDeposit(email,amount,method,note){
  const arr=loadDeposits();
  const d={id:'dep_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),email,amount:Number(amount),
    method:method||'bank',status:'pending',createdAt:now(),approvedAt:0,rejectedAt:0,note:note||''};
  arr.push(d);saveDeposits(arr);return d;
}
function updateDeposit(id,status,note){
  const arr=loadDeposits();const d=arr.find(x=>x.id===id);if(!d)return;
  d.status=status;if(note!==undefined)d.note=note;
  if(status==='approved')d.approvedAt=now();
  if(status==='rejected')d.rejectedAt=now();
  saveDeposits(arr);
}

function normalizeAvatar(raw){
  if(!raw)return null;raw=raw.trim();if(!raw)return null;
  if(/^data:image\//i.test(raw))return raw;
  let mime='image/jpeg';
  if(raw.startsWith('iVBOR'))mime='image/png';
  else if(raw.startsWith('R0lGOD'))mime='image/gif';
  else if(raw.startsWith('UklGR'))mime='image/webp';
  return `data:${mime};base64,${raw}`;
}
function applyAvatarEverywhere(src){
  ['loginAvatarImg','hdrAvatar','profAvatar','drawerAvatar'].forEach(id=>{
    const el=document.getElementById(id);if(el&&src)el.src=src;
  });
}
