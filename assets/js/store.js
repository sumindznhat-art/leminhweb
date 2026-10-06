/* ============================================================
   STORE + CLOUD (JSONBin.io)
   ============================================================ */
const DB_KEY='bonsicola_users_v1',SESS_KEY='bonsicola_session_v1',AVATAR_KEY='bonsicola_avatar_v1',
      CFG_KEY='bonsicola_config_v1',KEYS_KEY='bonsicola_keys_v1',DEP_KEY='bonsicola_deposits_v1',
      MUSIC_ON_KEY='bonsicola_music_on',CLOUD_TS_KEY='bonsicola_cloud_ts';

const DEFAULT_AVATAR="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect fill='%23e0f2fe' width='200' height='200'/><text x='50%25' y='56%25' font-size='90' text-anchor='middle' dominant-baseline='middle'>🎀</text></svg>";

function now(){return Date.now();}
function fmt(n){return Number(n||0).toLocaleString('vi-VN')+'đ';}
function fmtDate(ts){if(!ts)return '—';const d=new Date(ts),p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;}
function fmtDateShort(ts){if(!ts)return '—';const d=new Date(ts),p=n=>String(n).padStart(2,'0');return `${p(d.getDate())}/${p(d.getMonth()+1)}/${String(d.getFullYear()).slice(2)} ${p(d.getHours())}:${p(d.getMinutes())}`;}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

/* ============================================================
   CLOUD JSONBin
   ============================================================ */
const CLOUD = {
  _pushing:false,_pending:false,_timer:null,_lastPull:0,_lastError:'',_pullCount:0,_pushCount:0,
  enabled(){
    const c=window.CLOUD_CONFIG||{};
    return !!(c.enabled && c.bin_id && c.bin_id.length>5 && c.master_key && c.master_key.length>10);
  },
  _url(){ return 'https://api.jsonbin.io/v3/b/' + window.CLOUD_CONFIG.bin_id; },
  _headers(){
    return {
      'Content-Type':'application/json',
      'X-Master-Key': window.CLOUD_CONFIG.master_key,
      'X-Bin-Meta':'false'
    };
  },
  async pull(silent){
    if(!this.enabled()) return false;
    try{
      const r = await fetch(this._url()+'/latest?t='+Date.now(), {headers:this._headers(), cache:'no-store'});
      if(!r.ok){ this._lastError='HTTP '+r.status; if(!silent)console.warn('[CLOUD] Pull HTTP',r.status); return false; }
      const data = await r.json();
      let content = data;
      if(data && data.record) content = data.record;
      if(!content || typeof content!=='object') return false;

      const localTs = parseInt(localStorage.getItem(CLOUD_TS_KEY)||'0',10);
      const cloudTs = parseInt(content.updated_at||'0',10);
      if(cloudTs && cloudTs<=localTs){ this._lastPull=Date.now(); return false; }

      if(content.config)   localStorage.setItem(CFG_KEY,  JSON.stringify(content.config));
      if(content.users)    localStorage.setItem(DB_KEY,   JSON.stringify({users:content.users}));
      if(content.keys)     localStorage.setItem(KEYS_KEY, JSON.stringify(content.keys));
      if(content.deposits) localStorage.setItem(DEP_KEY,  JSON.stringify(content.deposits));
      if(cloudTs) localStorage.setItem(CLOUD_TS_KEY, String(cloudTs));

      this._lastPull=Date.now();
      this._lastError='';
      this._pullCount++;
      if(!silent) console.log('[CLOUD] ✅ Pull OK', cloudTs);
      return true;
    }catch(e){
      this._lastError=e.message;
      if(!silent) console.warn('[CLOUD] Pull fail',e);
      return false;
    }
  },
  async push(force){
    if(!this.enabled()) return false;
    if(this._pushing && !force){ this._pending=true; return false; }
    this._pushing=true;
    try{
      let cfgData=null;
      try{ cfgData=JSON.parse(localStorage.getItem(CFG_KEY)||'null'); }catch(e){}
      if(!cfgData) cfgData=window.APP_CONFIG;

      let usersData={};
      try{ usersData=(JSON.parse(localStorage.getItem(DB_KEY)||'{"users":{}}')).users||{}; }catch(e){}
      let keysData=[];
      try{ keysData=JSON.parse(localStorage.getItem(KEYS_KEY)||'[]'); }catch(e){}
      let depData=[];
      try{ depData=JSON.parse(localStorage.getItem(DEP_KEY)||'[]'); }catch(e){}

      const ts = Date.now();
      const payload = {config:cfgData, users:usersData, keys:keysData, deposits:depData, updated_at:ts};

      const r = await fetch(this._url(), {
        method:'PUT',
        headers:this._headers(),
        body: JSON.stringify(payload)
      });
      this._pushing=false;
      if(r.ok){
        localStorage.setItem(CLOUD_TS_KEY, String(ts));
        this._lastError='';
        this._pushCount++;
        console.log('[CLOUD] ✅ Push OK ('+Object.keys(usersData).length+' users)');
        if(this._pending){ this._pending=false; setTimeout(()=>this.push(true),400); }
        return true;
      }else{
        const errTxt=await r.text();
        this._lastError='HTTP '+r.status;
        console.warn('[CLOUD] ❌ Push', r.status, errTxt.slice(0,200));
        return false;
      }
    }catch(e){
      this._pushing=false;
      this._lastError=e.message;
      console.warn('[CLOUD] ❌ Push fail',e);
      return false;
    }
  },
  schedule(){
    if(!this.enabled()) return;
    if(this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(()=>{ this._timer=null; this.push(); }, 700);
  },
  async test(){
    if(!this.enabled()) return {ok:false,msg:'Chưa cấu hình bin_id hoặc master_key'};
    try{
      const r = await fetch(this._url(), {headers:this._headers()});
      if(r.status===404) return {ok:false,msg:'Bin không tồn tại (kiểm tra bin_id)'};
      if(r.status===401) return {ok:false,msg:'Master Key sai'};
      if(!r.ok) return {ok:false,msg:'HTTP '+r.status};
      return {ok:true,msg:'Kết nối OK'};
    }catch(e){ return {ok:false,msg:'Lỗi: '+e.message}; }
  },
  status(){
    if(!this.enabled()) return {state:'off',label:'Chưa cấu hình',color:'#ef4444'};
    if(this._lastError) return {state:'err',label:'Lỗi: '+this._lastError,color:'#ef4444'};
    if(this._pushing) return {state:'push',label:'Đang đẩy...',color:'#f59e0b'};
    return {state:'ok',label:'Hoạt động ('+this._pullCount+' pull · '+this._pushCount+' push)',color:'#10b981'};
  }
};
window.CLOUD = CLOUD;

/* ===== USERS ===== */
function loadDB(){
  try{
    let raw=localStorage.getItem(DB_KEY);
    if(!raw){
      const a={email:'leminhdz@gmail.com',password:'admin123',name:'Admin BONSICOLA',balance:999999999,
        keyExpiry:now()+100*365*24*3600*1000,isAdmin:true,ip:'local',lastLogin:now(),createdAt:now(),
        history:[],keyHistory:[],lastApi:'',lastTool:'',lastToolAt:0};
      const db={users:{'leminhdz@gmail.com':a}};
      localStorage.setItem(DB_KEY,JSON.stringify(db));
      return db;
    }
    const db=JSON.parse(raw);
    if(!db.users) db.users={};
    if(!db.users['leminhdz@gmail.com']){
      db.users['leminhdz@gmail.com']={email:'leminhdz@gmail.com',password:'admin123',name:'Admin BONSICOLA',balance:999999999,
        keyExpiry:now()+100*365*24*3600*1000,isAdmin:true,ip:'local',lastLogin:now(),createdAt:now(),
        history:[],keyHistory:[],lastApi:'',lastTool:'',lastToolAt:0};
      localStorage.setItem(DB_KEY,JSON.stringify(db));
    }
    Object.values(db.users).forEach(u=>{
      if(!Array.isArray(u.history)) u.history=[];
      if(!Array.isArray(u.keyHistory)) u.keyHistory=[];
      if(u.lastApi===undefined) u.lastApi='';
      if(u.lastTool===undefined) u.lastTool='';
      if(u.lastToolAt===undefined) u.lastToolAt=0;
    });
    return db;
  }catch(e){ return {users:{}}; }
}
function saveDB(db){ localStorage.setItem(DB_KEY,JSON.stringify(db)); CLOUD.schedule(); }
function getUser(e){ return loadDB().users[e]||null; }
function setUser(e,d){ const db=loadDB(); db.users[e]=d; saveDB(db); }
function delUser(e){ const db=loadDB(); delete db.users[e]; saveDB(db); }
function currentUser(){ const e=localStorage.getItem(SESS_KEY); return e?getUser(e):null; }
function setSession(e){ localStorage.setItem(SESS_KEY,e); }
function clearSession(){ localStorage.removeItem(SESS_KEY); }

/* ===== CONFIG ===== */
function loadConfig(){
  try{
    const raw=localStorage.getItem(CFG_KEY);
    if(!raw){ const c=JSON.parse(JSON.stringify(window.APP_CONFIG)); localStorage.setItem(CFG_KEY,JSON.stringify(c)); return c; }
    const c=JSON.parse(raw),d=window.APP_CONFIG;
    if(!c.packages) c.packages=d.packages;
    if(!c.tools) c.tools=d.tools;
    if(!c.notice) c.notice=d.notice;
    if(!c.notice_title) c.notice_title=d.notice_title;
    if(!c.marquee) c.marquee=d.marquee;
    if(!c.bank) c.bank=d.bank;
    if(!c.site_name) c.site_name=d.site_name;
    if(c.login_avatar===undefined) c.login_avatar='';
    if(c.bg_music===undefined) c.bg_music='';
    if(c.bg_music_enabled===undefined) c.bg_music_enabled=1;
    return c;
  }catch(e){ return JSON.parse(JSON.stringify(window.APP_CONFIG)); }
}
function saveConfig(c){ localStorage.setItem(CFG_KEY,JSON.stringify(c)); CLOUD.schedule(); }

/* ===== KEYS ===== */
function loadKeys(){ try{ return JSON.parse(localStorage.getItem(KEYS_KEY)||'[]'); }catch(e){ return[]; } }
function saveKeys(a){ localStorage.setItem(KEYS_KEY,JSON.stringify(a)); CLOUD.schedule(); }
function genKey(){ const C='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; const g=()=>Array.from({length:4},()=>C[Math.floor(Math.random()*C.length)]).join(''); return `${g()}-${g()}-${g()}`; }
function createKey(days,note){
  const arr=loadKeys();
  const k={key:genKey(),days:days,note:note||'',used:false,usedBy:'',createdAt:now(),usedAt:0};
  arr.push(k); saveKeys(arr); return k;
}
function findKey(code){ return loadKeys().find(k=>k.key.toUpperCase()===String(code).toUpperCase().trim())||null; }
function markKeyUsed(code,email){
  const arr=loadKeys();
  const k=arr.find(x=>x.key.toUpperCase()===String(code).toUpperCase().trim());
  if(k){ k.used=true; k.usedBy=email; k.usedAt=now(); saveKeys(arr); }
}

/* ===== DEPOSITS ===== */
function loadDeposits(){ try{ return JSON.parse(localStorage.getItem(DEP_KEY)||'[]'); }catch(e){ return[]; } }
function saveDeposits(a){ localStorage.setItem(DEP_KEY,JSON.stringify(a)); CLOUD.schedule(); }
function addDeposit(email,amount,method,note){
  const arr=loadDeposits();
  const d={id:'dep_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),email,amount:Number(amount),
    method:method||'bank',status:'pending',createdAt:now(),approvedAt:0,rejectedAt:0,note:note||''};
  arr.push(d); saveDeposits(arr); return d;
}
function updateDeposit(id,status,note){
  const arr=loadDeposits(); const d=arr.find(x=>x.id===id); if(!d) return;
  d.status=status; if(note!==undefined) d.note=note;
  if(status==='approved') d.approvedAt=now();
  if(status==='rejected') d.rejectedAt=now();
  saveDeposits(arr);
}

/* ===== AVATAR ===== */
function normalizeAvatar(raw){
  if(!raw) return null; raw=raw.trim(); if(!raw) return null;
  if(/^data:image\//i.test(raw)) return raw;
  let mime='image/jpeg';
  if(raw.startsWith('iVBOR')) mime='image/png';
  else if(raw.startsWith('R0lGOD')) mime='image/gif';
  else if(raw.startsWith('UklGR')) mime='image/webp';
  return `data:${mime};base64,${raw}`;
}
function applyAvatarEverywhere(src){
  ['loginAvatarImg','hdrAvatar','profAvatar','drawerAvatar'].forEach(id=>{
    const el=document.getElementById(id); if(el&&src) el.src=src;
  });
}
