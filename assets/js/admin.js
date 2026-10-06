function openAdmin(){
  const u=currentUser();
  if(!u||!u.isAdmin){alert('❌ Không có quyền Admin!');return;}
  document.getElementById('adminPanel').classList.add('show');
  switchAdminTab('users');
}
function closeModal(id){document.getElementById(id).classList.remove('show');}
function switchAdminTab(tab){
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.toggle('active',t.dataset.atab===tab));
  ['users','pending','apis','config','keys'].forEach(k=>{
    document.getElementById('admin'+k.charAt(0).toUpperCase()+k.slice(1)+'View').style.display=(k===tab)?'block':'none';
  });
  if(tab==='users')renderAdminUsers();
  if(tab==='pending')renderAdminPending();
  if(tab==='apis')renderAdminApis();
  if(tab==='config')renderAdminConfig();
  if(tab==='keys')renderAdminKeys();
}
function renderAdminUsers(){
  const db=loadDB();const box=document.getElementById('adminUsersView');box.innerHTML='';
  const emails=Object.keys(db.users).sort((a,b)=>{
    const A=db.users[a],B=db.users[b];
    if(A.isAdmin&&!B.isAdmin)return -1;if(!A.isAdmin&&B.isAdmin)return 1;
    return (B.lastLogin||0)-(A.lastLogin||0);
  });
  const add=document.createElement('div');add.className='adm-section';
  add.innerHTML=`<h4><i class="fa-solid fa-user-plus"></i> Tạo user</h4>
    <input class="adm-input" id="admNewEmail" placeholder="Email...">
    <input class="adm-input" id="admNewPass" placeholder="Mật khẩu...">
    <input class="adm-input" id="admNewName" placeholder="Tên...">
    <button class="green" onclick="admCreateUser()">TẠO</button>`;
  box.appendChild(add);
  emails.forEach(email=>{
    const u=db.users[email];
    const isExpired=!u.isAdmin&&(!u.keyExpiry||u.keyExpiry<=now());
    const div=document.createElement('div');div.className='adm-user';
    const badges=[];
    if(u.isAdmin)badges.push('<span class="badge badge-admin">ADMIN</span>');
    else if(isExpired)badges.push('<span class="badge badge-exp">HẾT HẠN</span>');
    else badges.push('<span class="badge badge-vip">VIP</span>');
    div.innerHTML=`
      <div class="r1"><div class="email">${esc(email)}</div><div>${badges.join(' ')}</div></div>
      <div class="info">
        Tên: <b>${esc(u.name||'—')}</b><br>
        Số dư: <b>${u.isAdmin?'∞':fmt(u.balance)}</b><br>
        Hạn key: <b>${u.isAdmin?'∞':(u.keyExpiry?fmtDate(u.keyExpiry):'Chưa có')}</b><br>
        IP: <b>${esc(u.ip||'—')}</b><br>
        Đăng nhập: <b>${u.lastLogin?fmtDate(u.lastLogin):'—'}</b>
      </div>
      <div class="acts">
        <button class="b1" onclick="admAddBalance('${email}')">+Tiền</button>
        <button class="b2" onclick="admSetKey('${email}')">+Key</button>
        <button class="b3" onclick="admResetKey('${email}')">Reset</button>
        <button class="b4" onclick="admToggleAdmin('${email}')">${u.isAdmin?'Gỡ':'Cấp'} Admin</button>
        <button class="b5" onclick="admDelete('${email}')">Xoá</button>
      </div>`;
    box.appendChild(div);
  });
}
function admCreateUser(){
  const email=document.getElementById('admNewEmail').value.trim().toLowerCase();
  const pass=document.getElementById('admNewPass').value;
  const name=document.getElementById('admNewName').value.trim()||email.split('@')[0];
  if(!email||!pass){alert('⚠️ Nhập đủ!');return;}
  if(getUser(email)){alert('⚠️ Đã tồn tại!');return;}
  setUser(email,{email,password:pass,name,balance:0,keyExpiry:0,isAdmin:false,ip:'—',lastLogin:0,createdAt:now(),
    history:[],keyHistory:[],lastApi:'',lastTool:'',lastToolAt:0});
  renderAdminUsers();alert('✅ Đã tạo: '+email);
}
function admAddBalance(email){
  const u=getUser(email);if(!u)return;
  const v=prompt('Cộng/trừ tiền cho '+email+'\n(số dương = cộng, âm = trừ)','50000');
  if(v===null)return;const n=parseInt(v,10);
  if(isNaN(n)){alert('❌ Số không hợp lệ!');return;}
  u.balance=Math.max(0,(u.balance||0)+n);
  u.history.push({type:'admin',amount:n,balance:u.balance,at:now(),note:'Admin điều chỉnh'});
  setUser(email,u);renderAdminUsers();
  alert('✅ Số dư mới: '+fmt(u.balance));
}
function admSetKey(email){
  const u=getUser(email);if(!u)return;
  const v=prompt('Cấp thêm bao nhiêu NGÀY?','7');
  if(v===null)return;const d=parseInt(v,10);
  if(isNaN(d)||d<=0){alert('❌ Số ngày không hợp lệ!');return;}
  const base=(u.keyExpiry&&u.keyExpiry>now())?u.keyExpiry:now();
  u.keyExpiry=base+d*24*3600*1000;
  u.keyHistory.push({code:'ADMIN-GRANT',days:d,at:now(),via:'admin'});
  setUser(email,u);renderAdminUsers();alert('✅ Đã cấp '+d+' ngày!');
}
function admResetKey(email){
  const u=getUser(email);if(!u)return;
  if(!confirm('Reset key của '+email+'?'))return;
  u.keyExpiry=0;setUser(email,u);renderAdminUsers();alert('✅ Đã reset!');
}
function admToggleAdmin(email){
  const me=currentUser();
  if(email===me.email){alert('❌ Không thể tự gỡ!');return;}
  const u=getUser(email);if(!u)return;
  if(u.isAdmin){if(!confirm('Gỡ admin?'))return;u.isAdmin=false;}
  else{if(!confirm('Cấp admin?'))return;u.isAdmin=true;}
  setUser(email,u);renderAdminUsers();alert('✅ Đã cập nhật!');
}
function admDelete(email){
  const me=currentUser();
  if(email===me.email){alert('❌ Không thể tự xoá!');return;}
  if(email==='leminhdz@gmail.com'){alert('❌ Không thể xoá admin tổng!');return;}
  if(!confirm('XOÁ: '+email+'?'))return;
  delUser(email);renderAdminUsers();alert('✅ Đã xoá!');
}
function renderAdminPending(){
  const arr=loadDeposits().filter(d=>d.status==='pending').sort((a,b)=>b.createdAt-a.createdAt);
  const box=document.getElementById('adminPendingView');box.innerHTML='';
  if(!arr.length){box.innerHTML='<div class="adm-section" style="text-align:center;color:#94a3b8;font-weight:700">✨ Không có yêu cầu</div>';return;}
  arr.forEach(d=>{
    const el=document.createElement('div');el.className='pending-item';
    el.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
        <div style="font-weight:800;color:#3b5bfd;font-size:12.5px;word-break:break-all">${esc(d.email)}</div>
        <div class="amt">${fmt(d.amount)}</div>
      </div>
      <div style="font-size:11px;color:#64748b;font-weight:600">
        ${esc(d.method==='bank'?'Ngân hàng':'Thẻ cào')} · ${fmtDate(d.createdAt)}<br>
        Ghi chú: <b>${esc(d.note||'—')}</b>
      </div>
      <div class="acts">
        <button class="btn-approve" onclick="approveDeposit('${d.id}')"><i class="fa-solid fa-check"></i> DUYỆT</button>
        <button class="btn-reject" onclick="rejectDeposit('${d.id}')"><i class="fa-solid fa-xmark"></i> TỪ CHỐI</button>
      </div>`;
    box.appendChild(el);
  });
}
function approveDeposit(id){
  const arr=loadDeposits();const d=arr.find(x=>x.id===id);if(!d)return;
  const u=getUser(d.email);if(!u){alert('❌ User không tồn tại!');return;}
  u.balance=(u.balance||0)+d.amount;
  u.history.push({type:'deposit',amount:d.amount,balance:u.balance,at:now(),note:'Nạp '+(d.method||'bank')});
  setUser(d.email,u);
  updateDeposit(id,'approved','Admin duyệt');
  autoBuyKeyForUser(u);
  renderAdminPending();alert('✅ Đã duyệt '+fmt(d.amount)+' cho '+d.email);
}
function rejectDeposit(id){
  const arr=loadDeposits();const d=arr.find(x=>x.id===id);if(!d)return;
  const r=prompt('Lý do từ chối:','Không hợp lệ')||'Không hợp lệ';
  updateDeposit(id,'rejected',r);renderAdminPending();alert('❌ Đã từ chối');
}
function renderAdminApis(){
  const db=loadDB();const box=document.getElementById('adminApisView');box.innerHTML='';
  const intro=document.createElement('div');intro.className='adm-section';
  intro.innerHTML='<h4><i class="fa-solid fa-code"></i> API user đã truy cập</h4><p style="font-size:11px;color:#64748b;font-weight:600">Xem user đang dùng tool nào và API tương ứng</p>';
  box.appendChild(intro);
  const users=Object.values(db.users).filter(u=>u.lastApi).sort((a,b)=>(b.lastToolAt||0)-(a.lastToolAt||0));
  if(!users.length){
    const d=document.createElement('div');d.className='adm-section';d.style.textAlign='center';
    d.style.color='#94a3b8';d.style.fontWeight='700';d.textContent='Chưa có user dùng tool';box.appendChild(d);return;
  }
  users.forEach(u=>{
    const el=document.createElement('div');el.className='api-user';
    el.innerHTML=`
      <div class="em">${esc(u.email)}</div>
      <div style="font-size:11px;color:#64748b;font-weight:600">
        Tool: <b style="color:#3b5bfd">${esc(u.lastTool||'—')}</b><br>
        Lúc: <b>${u.lastToolAt?fmtDate(u.lastToolAt):'—'}</b><br>
        IP: <b>${esc(u.ip||'—')}</b>
      </div>
      <div class="api-line"><span style="color:#f59e0b">API:</span> ${esc(u.lastApi)}</div>`;
    box.appendChild(el);
  });
}
function renderAdminConfig(){
  const cfg=loadConfig();const box=document.getElementById('adminConfigView');box.innerHTML='';
  /* CHUNG */
  const site=document.createElement('div');site.className='adm-section';
  site.innerHTML=`<h4><i class="fa-solid fa-gear"></i> Chung</h4>
    <input class="adm-input" id="cfgSiteName" value="${esc(cfg.site_name)}" placeholder="Tên site">
    <input class="adm-input" id="cfgMarquee" value="${esc(cfg.marquee)}" placeholder="Marquee">
    <input class="adm-input" id="cfgNoticeTitle" value="${esc(cfg.notice_title)}" placeholder="Tiêu đề TB">
    <textarea class="adm-textarea" id="cfgNotice" placeholder="Thông báo">${esc(cfg.notice)}</textarea>
    <button class="green" onclick="saveCfgSite()">💾 LƯU</button>`;
  box.appendChild(site);
  /* NGÂN HÀNG + QR */
  const bank=document.createElement('div');bank.className='adm-section';
  bank.innerHTML=`<h4><i class="fa-solid fa-building-columns"></i> Ngân hàng + QR nạp tiền</h4>
    <input class="adm-input" id="cfgBankName" value="${esc(cfg.bank.name)}" placeholder="Tên NH (VD: VPBank)">
    <input class="adm-input" id="cfgBankAcc" value="${esc(cfg.bank.acc)}" placeholder="Số TK">
    <input class="adm-input" id="cfgBankHolder" value="${esc(cfg.bank.holder)}" placeholder="Chủ TK">
    <textarea class="adm-textarea" id="cfgBankQR" placeholder="Dán Base64 ảnh QR (data:image/png;base64,...)">${esc(cfg.bank.qr||'')}</textarea>
    <div style="text-align:center;margin:6px 0">${cfg.bank.qr?`<img src="${cfg.bank.qr}" style="max-width:220px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.15)">`:'<span style="font-size:11px;color:#94a3b8">Chưa có QR</span>'}</div>
    <button class="green" onclick="saveCfgBank()">💾 LƯU BANK</button>
    <button class="red" onclick="clearCfgBankQR()">🗑 XOÁ QR</button>`;
  box.appendChild(bank);
  /* NHẠC */
  const music=document.createElement('div');music.className='adm-section';
  music.innerHTML=`<h4><i class="fa-solid fa-music"></i> Nhạc nền</h4>
    <p style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:6px">Dán URL nhạc (.mp3) hoặc Base64 (data:audio/mpeg;base64,...)</p>
    <textarea class="adm-textarea" id="cfgMusic" placeholder="URL hoặc Base64 nhạc">${esc(cfg.bg_music||'')}</textarea>
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;margin:6px 0">
      <input type="checkbox" id="cfgMusicEnabled" ${cfg.bg_music_enabled?'checked':''}> Bật nhạc mặc định
    </label>
    <button class="green" onclick="saveCfgMusic()">💾 LƯU NHẠC</button>
    <button class="orange" onclick="testMusic()">▶️ THỬ</button>
    <button class="red" onclick="clearCfgMusic()">🗑 XOÁ</button>`;
  box.appendChild(music);
  /* AVATAR LOGIN */
  const lg=document.createElement('div');lg.className='adm-section';
  lg.innerHTML=`<h4><i class="fa-solid fa-image"></i> Avatar mặc định trang ĐĂNG NHẬP</h4>
    <p style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:6px">Avatar này hiện ở màn đăng nhập/đăng ký (khác avatar trong tool)</p>
    <textarea class="adm-textarea" id="cfgLoginAvatar" placeholder="Dán Base64 ảnh đăng nhập">${esc(cfg.login_avatar||'')}</textarea>
    <div style="text-align:center;margin:6px 0">${cfg.login_avatar?`<img src="${cfg.login_avatar}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid #fff;box-shadow:0 0 0 3px rgba(56,189,248,.4)">`:''}</div>
    <button class="green" onclick="saveCfgLoginAvatar()">💾 LƯU AVATAR LOGIN</button>
    <button class="red" onclick="clearCfgLoginAvatar()">🗑 XOÁ</button>`;
  box.appendChild(lg);
  /* TOOLS */
  const tl=document.createElement('div');tl.className='adm-section';
  tl.innerHTML=`<h4><i class="fa-solid fa-cubes"></i> Tools (JSON)</h4>
    <textarea class="adm-textarea" id="cfgToolJson" style="min-height:200px">${esc(JSON.stringify(cfg.tools,null,2))}</textarea>
    <button class="green" onclick="saveCfgTools()">💾 LƯU TOOL LIST</button>`;
  box.appendChild(tl);
  /* TOOL chỉnh lẻ */
  cfg.tools.forEach((t,i)=>{
    const tr=document.createElement('div');tr.className='adm-section';tr.style.background='#fff';tr.style.borderStyle='solid';
    const img=getToolImage(t);
    tr.innerHTML=`
      <h4>${img?`<img src="${img}" style="width:26px;height:26px;border-radius:6px;object-fit:cover">`:''} ${esc(t.name)} <span style="font-size:10px;color:#94a3b8">${esc(t.slug)}</span></h4>
      <input class="adm-input" data-f="name" data-i="${i}" value="${esc(t.name)}" placeholder="Tên tool">
      <input class="adm-input" data-f="game_url" data-i="${i}" value="${esc(t.game_url)}" placeholder="Game URL (iframe mở)">
      <input class="adm-input" data-f="api_url" data-i="${i}" value="${esc(t.api_url)}" placeholder="API URL (đọc KQ)">
      <input class="adm-input" data-f="image" data-i="${i}" value="${esc(t.image)}" placeholder="Ảnh URL">
      <textarea class="adm-textarea" data-f="image_base64" data-i="${i}" placeholder="Hoặc Base64 ảnh TOOL (khác avatar login)">${esc(t.image_base64||'')}</textarea>
      <button class="green" onclick="saveCfgToolAt(${i})">💾 LƯU</button>
      <button class="orange" onclick="toggleToolVip(${i})">${t.vip?'Gỡ VIP':'Set VIP'}</button>
      <button class="red" onclick="deleteToolAt(${i})">Xoá</button>`;
    box.appendChild(tr);
  });
  const addT=document.createElement('div');addT.className='adm-section';
  addT.innerHTML=`<h4><i class="fa-solid fa-plus"></i> Thêm tool</h4><button class="green" onclick="addNewTool()">➕ THÊM</button>`;
  box.appendChild(addT);
}
function saveCfgSite(){
  const c=loadConfig();
  c.site_name=document.getElementById('cfgSiteName').value;
  c.marquee=document.getElementById('cfgMarquee').value;
  c.notice_title=document.getElementById('cfgNoticeTitle').value;
  c.notice=document.getElementById('cfgNotice').value;
  saveConfig(c);renderAll();
  document.getElementById('loginSiteName').textContent=c.site_name;
  alert('✅ Đã lưu!');
}
function saveCfgBank(){
  const c=loadConfig();
  c.bank.name=document.getElementById('cfgBankName').value;
  c.bank.acc=document.getElementById('cfgBankAcc').value;
  c.bank.holder=document.getElementById('cfgBankHolder').value;
  const qr=document.getElementById('cfgBankQR').value.trim();
  c.bank.qr=qr?(normalizeAvatar(qr)||qr):'';
  saveConfig(c);renderAdminConfig();alert('✅ Đã lưu bank!');
}
function clearCfgBankQR(){if(!confirm('Xoá QR?'))return;const c=loadConfig();c.bank.qr='';saveConfig(c);renderAdminConfig();}
function saveCfgMusic(){
  const c=loadConfig();
  const m=document.getElementById('cfgMusic').value.trim();
  c.bg_music=m||'';
  c.bg_music_enabled=document.getElementById('cfgMusicEnabled').checked?1:0;
  saveConfig(c);alert('✅ Đã lưu nhạc!');
  if(typeof reloadMusic==='function')reloadMusic();
}
function testMusic(){
  const m=document.getElementById('cfgMusic').value.trim();
  if(!m){alert('⚠️ Chưa nhập nhạc!');return;}
  const a=document.getElementById('bgMusic');
  a.src=m;a.volume=0.5;a.play().catch(e=>alert('❌ Không phát được: '+e.message));
}
function clearCfgMusic(){if(!confirm('Xoá nhạc?'))return;const c=loadConfig();c.bg_music='';saveConfig(c);renderAdminConfig();if(typeof stopMusic==='function')stopMusic();}
function saveCfgLoginAvatar(){
  const c=loadConfig();
  const v=document.getElementById('cfgLoginAvatar').value.trim();
  c.login_avatar=v?(normalizeAvatar(v)||v):'';
  saveConfig(c);
  if(c.login_avatar)document.getElementById('loginAvatarImg').src=c.login_avatar;
  renderAdminConfig();
  alert('✅ Đã lưu avatar login!');
}
function clearCfgLoginAvatar(){if(!confirm('Xoá avatar login?'))return;const c=loadConfig();c.login_avatar='';saveConfig(c);document.getElementById('loginAvatarImg').src=DEFAULT_AVATAR;renderAdminConfig();}
function saveCfgTools(){
  try{
    const c=loadConfig();const j=JSON.parse(document.getElementById('cfgToolJson').value);
    if(!Array.isArray(j))throw new Error('Không phải mảng');
    c.tools=j;saveConfig(c);renderAdminConfig();renderTools();alert('✅ Đã lưu!');
  }catch(e){alert('❌ JSON lỗi: '+e.message);}
}
function saveCfgToolAt(i){
  const c=loadConfig();const t=c.tools[i];if(!t)return;
  document.querySelectorAll(`[data-i="${i}"]`).forEach(el=>{
    const f=el.dataset.f;
    if(f==='image_base64'){const v=el.value.trim();t[f]=v?(normalizeAvatar(v)||v):'';}
    else t[f]=el.value;
  });
  saveConfig(c);renderAdminConfig();renderTools();alert('✅ Đã lưu tool!');
}
function toggleToolVip(i){const c=loadConfig();c.tools[i].vip=c.tools[i].vip?0:1;saveConfig(c);renderAdminConfig();}
function deleteToolAt(i){if(!confirm('Xoá tool?'))return;const c=loadConfig();c.tools.splice(i,1);saveConfig(c);renderAdminConfig();renderTools();}
function addNewTool(){
  const c=loadConfig();
  c.tools.push({name:'Tool mới',slug:'tool-'+Date.now(),cat:'taixiu',panel:'taixiu',game_url:'',api_url:'',image:'',image_base64:'',hot:0,vip:1,is_new:1,enabled:1,maintenance:0});
  saveConfig(c);renderAdminConfig();
}
function renderAdminKeys(){
  const arr=loadKeys();const box=document.getElementById('adminKeysView');box.innerHTML='';
  const add=document.createElement('div');add.className='adm-section';
  add.innerHTML=`<h4><i class="fa-solid fa-key"></i> Tạo key</h4>
    <input class="adm-input" type="number" id="keyDays" value="1" placeholder="Số ngày">
    <input class="adm-input" type="number" id="keyQty" value="1" placeholder="Số lượng">
    <input class="adm-input" id="keyNote" placeholder="Ghi chú">
    <button class="green" onclick="admGenKeys()">🔑 TẠO</button>`;
  box.appendChild(add);
  const list=document.createElement('div');list.className='adm-section';
  list.innerHTML=`<h4><i class="fa-solid fa-list"></i> Keys (${arr.length})</h4>`;
  arr.slice().reverse().forEach(k=>{
    const d=document.createElement('div');
    d.style.cssText='padding:8px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:6px;background:#fff;font-size:11px';
    d.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
        <div style="font-family:monospace;font-weight:800;color:${k.used?'#94a3b8':'#3b5bfd'};font-size:12px">${esc(k.key)}</div>
        <div style="font-size:10px;font-weight:800;color:${k.used?'#ef4444':'#10b981'}">${k.used?'ĐÃ DÙNG':'CHƯA DÙNG'}</div>
      </div>
      <div style="color:#64748b;margin-top:3px">${k.days} ngày · ${esc(k.note||'—')}</div>
      ${k.used?`<div style="color:#94a3b8;font-size:10px">→ ${esc(k.usedBy)} (${fmtDate(k.usedAt)})</div>`:''}
      <button style="margin-top:5px;padding:4px 8px;border-radius:6px;border:none;background:#ef4444;color:#fff;font-size:10px;font-weight:700;cursor:pointer" onclick="admDelKey('${k.key}')">Xoá</button>`;
    list.appendChild(d);
  });
  box.appendChild(list);
}
function admGenKeys(){
  const days=parseInt(document.getElementById('keyDays').value,10)||1;
  const qty=parseInt(document.getElementById('keyQty').value,10)||1;
  const note=document.getElementById('keyNote').value.trim();
  const arr=[];
  for(let i=0;i<qty;i++)arr.push(createKey(days,note).key);
  alert('✅ Đã tạo '+qty+' key:\n\n'+arr.join('\n'));
