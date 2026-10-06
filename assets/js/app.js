/* ============================================================
   APP.JS - TOOL LEMINH v5 (Cloud Sync)
   Bao gồm: Music, Avatar, Drawer, History, Pages, Clock,
   Tools, VIP, Deposit, Profile, Cloud Poller, Init
   ============================================================ */

/* ============================================================
   1. MUSIC (Nhạc nền)
   ============================================================ */
let _musicPlaying = false;

function initMusic(){
  const cfg = loadConfig();
  const a = document.getElementById('bgMusic');
  if(!a) return;
  if(!cfg.bg_music){
    a.src = '';
    const btn = document.getElementById('musicBtn');
    if(btn) btn.style.display = 'none';
    return;
  }
  const btn = document.getElementById('musicBtn');
  if(btn) btn.style.display = 'flex';
  a.src = cfg.bg_music;
  a.volume = 0.5;
  const saved = localStorage.getItem(MUSIC_ON_KEY);
  const shouldPlay = saved === null ? (cfg.bg_music_enabled == 1) : (saved === '1');
  if(shouldPlay) playMusic();
  updateMusicBtn();
}
function playMusic(){
  const a = document.getElementById('bgMusic');
  if(!a || !a.src) return;
  a.play()
    .then(() => { _musicPlaying = true; updateMusicBtn(); })
    .catch(() => { _musicPlaying = false; updateMusicBtn(); });
}
function stopMusic(){
  const a = document.getElementById('bgMusic');
  if(!a) return;
  a.pause();
  _musicPlaying = false;
  updateMusicBtn();
}
function toggleMusic(){
  if(_musicPlaying){
    stopMusic();
    localStorage.setItem(MUSIC_ON_KEY, '0');
  } else {
    playMusic();
    localStorage.setItem(MUSIC_ON_KEY, '1');
  }
}
function updateMusicBtn(){
  const b = document.getElementById('musicBtn');
  if(!b) return;
  if(_musicPlaying){
    b.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    b.classList.add('playing');
  } else {
    b.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
    b.classList.remove('playing');
  }
}
function reloadMusic(){
  const a = document.getElementById('bgMusic');
  if(a) a.pause();
  initMusic();
}

/* ============================================================
   2. AVATAR (Long-press đổi avatar)
   ============================================================ */
(function(){
  const trigger = document.getElementById('avatarTrigger');
  if(!trigger) return;
  const HOLD_MS = 1200;
  let timer = null, holding = false, sx = 0, sy = 0, moved = false;
  const TOL = 12;

  function start(x, y){
    sx = x; sy = y; moved = false; holding = true;
    timer = setTimeout(() => {
      if(!holding || moved) return;
      holding = false;
      openAvatarModal();
    }, HOLD_MS);
  }
  function cancel(){
    holding = false;
    if(timer){ clearTimeout(timer); timer = null; }
  }
  function move(x, y){
    if(!holding) return;
    if(Math.abs(x - sx) > TOL || Math.abs(y - sy) > TOL){ moved = true; cancel(); }
  }

  trigger.addEventListener('mousedown', e => { e.preventDefault(); start(e.clientX, e.clientY); });
  trigger.addEventListener('mousemove', e => move(e.clientX, e.clientY));
  trigger.addEventListener('mouseup', cancel);
  trigger.addEventListener('mouseleave', cancel);
  trigger.addEventListener('touchstart', e => { const t = e.touches[0]; start(t.clientX, t.clientY); }, {passive:true});
  trigger.addEventListener('touchmove', e => { const t = e.touches[0]; move(t.clientX, t.clientY); }, {passive:true});
  trigger.addEventListener('touchend', cancel);
  trigger.addEventListener('touchcancel', cancel);
  trigger.addEventListener('contextmenu', e => e.preventDefault());
})();

function openAvatarModal(){
  const m = document.getElementById('avatarModal');
  const inp = document.getElementById('avBase64Input');
  const pv = document.getElementById('avPreview');
  let s = null;
  try{ s = localStorage.getItem(AVATAR_KEY); }catch(e){}
  document.getElementById('avStatus').textContent = '';
  document.getElementById('avModalTitle').textContent = '🎀 Đổi Avatar của bạn';
  if(s){ pv.innerHTML = `<img src="${s}">`; inp.value = ''; }
  else { pv.innerHTML = '🎀'; inp.value = ''; }
  m.classList.add('show');
}
function closeAvatarModal(){ document.getElementById('avatarModal').classList.remove('show'); }
function saveAvatar(){
  const inp = document.getElementById('avBase64Input');
  const st = document.getElementById('avStatus');
  const pv = document.getElementById('avPreview');
  const val = inp.value.trim();
  if(!val || val.length < 50){
    st.style.color = '#ef4444'; st.textContent = '⚠️ Base64 không hợp lệ!'; return;
  }
  const src = normalizeAvatar(val);
  const img = new Image();
  img.onload = () => {
    try{ localStorage.setItem(AVATAR_KEY, src); }catch(e){}
    applyAvatarEverywhere(src);
    pv.innerHTML = `<img src="${src}">`;
    st.style.color = '#10b981'; st.textContent = '✅ Đã lưu!';
    setTimeout(closeAvatarModal, 900);
  };
  img.onerror = () => { st.style.color = '#ef4444'; st.textContent = '❌ Ảnh lỗi!'; };
  img.src = src;
}
function resetAvatar(){
  try{ localStorage.removeItem(AVATAR_KEY); }catch(e){}
  applyAvatarEverywhere(DEFAULT_AVATAR);
  document.getElementById('avPreview').innerHTML = '🎀';
  document.getElementById('avBase64Input').value = '';
  const st = document.getElementById('avStatus');
  st.style.color = '#0ea5e9'; st.textContent = '↩️ Reset mặc định';
  setTimeout(()=>st.textContent='', 1400);
}

/* ============================================================
   3. DRAWER (Menu 3 gạch)
   ============================================================ */
function openDrawer(){
  document.getElementById('drawer').classList.add('show');
  document.getElementById('drawerMask').classList.add('show');
  const u = currentUser();
  if(!u) return;
  document.getElementById('drawerName').textContent = u.name || u.email.split('@')[0];
  document.getElementById('drawerEmail').textContent = u.email;
  document.getElementById('drawerAvatar').src = localStorage.getItem(AVATAR_KEY) || DEFAULT_AVATAR;
  const diAdmin = document.getElementById('diAdmin');
  if(diAdmin) diAdmin.style.display = u.isAdmin ? 'flex' : 'none';
}
function closeDrawer(){
  document.getElementById('drawer').classList.remove('show');
  document.getElementById('drawerMask').classList.remove('show');
}

/* ============================================================
   4. HISTORY (Lịch sử nạp + lịch sử key)
   ============================================================ */
function openHistoryDeposit(){
  closeDrawer();
  const u = currentUser(); if(!u) return;
  const list = (u.history || []).slice().reverse();
  document.getElementById('histTitle').textContent = '💰 Lịch sử nạp tiền';
  const box = document.getElementById('histContent');
  if(!list.length){
    box.innerHTML = '<div style="text-align:center;color:#94a3b8;font-weight:700;padding:20px">Chưa có giao dịch</div>';
  } else {
    box.innerHTML = '';
    list.forEach(h => {
      const el = document.createElement('div');
      el.className = 'info-row';
      el.style.margin = '0 0 8px';
      const color = h.amount > 0 ? '#10b981' : '#ef4444';
      const label = h.type === 'deposit' ? 'Nạp tiền'
                  : h.type === 'admin'   ? 'Admin điều chỉnh'
                  : h.type === 'auto-buy'? 'Tự động mua VIP'
                  : 'Mua VIP';
      el.innerHTML = `
        <div>
          <div class="lbl">${label}</div>
          <div style="font-size:11px;color:#94a3b8">${fmtDate(h.at)}</div>
        </div>
        <div style="text-align:right">
          <div class="val" style="color:${color}">${h.amount > 0 ? '+' : ''}${fmt(h.amount)}</div>
          <div style="font-size:11px;color:#64748b">Số dư: ${fmt(h.balance)}</div>
        </div>`;
      box.appendChild(el);
    });
  }
  document.getElementById('historyModal').classList.add('show');
}
function openHistoryKey(){
  closeDrawer();
  const u = currentUser(); if(!u) return;
  const list = (u.keyHistory || []).slice().reverse();
  document.getElementById('histTitle').textContent = '🔑 Lịch sử mua key';
  const box = document.getElementById('histContent');
  if(!list.length){
    box.innerHTML = '<div style="text-align:center;color:#94a3b8;font-weight:700;padding:20px">Chưa có key</div>';
  } else {
    box.innerHTML = '';
    list.forEach(h => {
      const el = document.createElement('div');
      el.className = 'info-row';
      el.style.margin = '0 0 8px';
      const via = h.via === 'admin' ? 'Admin cấp'
                : h.via === 'auto'  ? 'Tự động mua'
                : h.via === 'buy'   ? 'Mua gói VIP'
                : 'Tự nhập';
      el.innerHTML = `
        <div>
          <div class="lbl">${via}</div>
          <div style="font-size:11px;font-family:monospace;color:#3b5bfd;font-weight:800">${esc(h.code)}</div>
          <div style="font-size:11px;color:#94a3b8">${fmtDate(h.at)}</div>
        </div>
        <div style="text-align:right">
          <div class="val" style="color:#10b981">+${h.days} ngày</div>
        </div>`;
      box.appendChild(el);
    });
  }
  document.getElementById('historyModal').classList.add('show');
}

/* ============================================================
   5. PAGES (Chuyển trang)
   ============================================================ */
function showPage(name){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if(page) page.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-page="${name}"]`);
  if(nav) nav.classList.add('active');
  document.getElementById('appContent').scrollTop = 0;
  if(name === 'deposit') renderDeposit();
  if(name === 'vip')     renderVIPPage();
  if(name === 'profile') renderProfile();
  if(name === 'tools')   renderTools();
  if(name === 'home')    renderHome();
}

function renderHome(){
  const u = currentUser(); if(!u) return;
  const cfg = loadConfig();
  const el1 = document.getElementById('toolCount');
  const el2 = document.getElementById('curBalance');
  if(el1) el1.textContent = cfg.tools.filter(t=>t.enabled).length;
  if(el2) el2.textContent = u.isAdmin ? '∞' : fmt(u.balance);
}

/* ============================================================
   6. CLOCK (Đồng hồ realtime)
   ============================================================ */
let clockStarted = false;
function startClock(){
  if(clockStarted) return;
  clockStarted = true;
  function tick(){
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    const clock = document.getElementById('liveClock');
    const date = document.getElementById('liveDate');
    if(clock) clock.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    if(date)  date.textContent  = `${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ============================================================
   7. TOOLS (Render danh sách công cụ)
   ============================================================ */
let activeCat = 'all';

function renderTools(){
  const cfg = loadConfig();
  const u = currentUser();
  const isVIP = u && (u.isAdmin || (u.keyExpiry && u.keyExpiry > now()));

  // Category tabs
  const cats = ['all', ...new Set(cfg.tools.map(t => t.cat))];
  const names = {all:'Tất cả', taixiu:'Tài Xỉu', sicbo:'Sicbo', baccarat:'Baccarat'};
  const ct = document.getElementById('catTabs');
  if(!ct) return;
  ct.innerHTML = '';
  cats.forEach(c => {
    const b = document.createElement('button');
    b.className = 'cat-tab' + (c === activeCat ? ' active' : '');
    b.textContent = names[c] || c;
    b.onclick = () => { activeCat = c; renderTools(); };
    ct.appendChild(b);
  });

  // Tool list
  const box = document.getElementById('toolList');
  if(!box) return;
  box.innerHTML = '';
  const list = cfg.tools.filter(t => t.enabled && (activeCat === 'all' || t.cat === activeCat));
  const tc = document.getElementById('toolCount');
  if(tc) tc.textContent = cfg.tools.filter(t => t.enabled).length;

  list.forEach(t => {
    const card = document.createElement('div');
    card.className = 'tool-card';
    const img = getToolImage(t);
    const tags = [];
    if(t.hot) tags.push('<span class="tool-badge-hot">HOT</span>');
    if(t.is_new) tags.push('<span class="tool-badge-new">NEW</span>');
    if(t.maintenance) tags.push('<span class="tool-badge-hot" style="background:#f1f5f9;color:#64748b;border-color:#cbd5e1">BẢO TRÌ</span>');

    card.innerHTML = `
      <div class="tool-head">
        <div class="tool-logo">${img ? `<img src="${img}" onerror="this.parentNode.innerHTML='🎲'">` : '🎲'}</div>
        <div class="tool-info">
          <div class="tool-name-row">
            <span class="tool-name">${esc(t.name)}</span>
            ${tags.join('')}
          </div>
          <div class="tool-desc">${esc(t.game_url || 'Nhấn để mở tool')}</div>
        </div>
      </div>
      <div class="tool-footer">
        <div class="vip-req ${isVIP ? 'ok' : ''}">
          <span class="dot"></span>${isVIP ? 'Đã mở khoá' : 'Yêu cầu VIP'}
        </div>
        <button class="tool-btn ${isVIP ? 'unlocked' : ''}">
          <i class="fa-solid ${isVIP ? 'fa-unlock' : 'fa-lock'}"></i> ${isVIP ? 'MỞ TOOL' : 'VIP'}
        </button>
      </div>`;
    card.querySelector('.tool-btn').onclick = () => openToolViewer(t);
    box.appendChild(card);
  });
}

/* ============================================================
   8. VIP (Trang mua gói)
   ============================================================ */
function renderVIPPage(){
  const u = currentUser(); if(!u) return;
  const bal = document.getElementById('vipBalance');
  const exp = document.getElementById('vipExpiry');
  if(bal) bal.textContent = u.isAdmin ? '∞' : fmt(u.balance);
  if(exp) exp.textContent = u.isAdmin ? 'Vĩnh viễn' : (u.keyExpiry ? fmtDate(u.keyExpiry) : 'Chưa kích hoạt');

  const cfg = loadConfig();
  const box = document.getElementById('pkgList');
  if(!box) return;
  box.innerHTML = '';

  cfg.packages.forEach(p => {
    const el = document.createElement('div');
    el.className = 'pkg-card';
    const canBuy = u.isAdmin || u.balance >= p.price;
    el.innerHTML = `
      <div class="pkg-discount">${esc(p.disc || '')}</div>
      <div class="pkg-head">
        <div class="pkg-ic"><i class="fa-solid fa-crown"></i></div>
        <div>
          <div class="pkg-name">${esc(p.name)}</div>
          <div class="pkg-sub">${esc(p.sub || '')}</div>
        </div>
      </div>
      <div class="pkg-desc">Sử dụng không giới hạn trong ${p.days} ngày</div>
      <div class="pkg-price-row">
        <div>
          <div class="pkg-price-lbl">Giá</div>
          <div class="pkg-price">${p.price.toLocaleString('vi-VN')}<span class="u">đ</span></div>
        </div>
        <div style="text-align:right">
          <div class="pkg-price-lbl">Cũ</div>
          <div class="pkg-old">${p.old.toLocaleString('vi-VN')}đ</div>
        </div>
      </div>
      <button class="pkg-buy" ${canBuy ? '' : 'disabled'}>${canBuy ? 'MUA NGAY' : 'KHÔNG ĐỦ TIỀN'}</button>`;
    el.querySelector('.pkg-buy').onclick = () => buyPackage(p.id);
    box.appendChild(el);
  });
}
function buyPackage(id){
  const u = currentUser(); if(!u) return;
  const cfg = loadConfig();
  const p = cfg.packages.find(x => x.id === id);
  if(!p) return;
  if(u.balance < p.price){
    alert('❌ Số dư không đủ!\nCần: ' + fmt(p.price) + '\nCó: ' + fmt(u.balance) + '\n\nVui lòng NẠP TIỀN trước!');
    showPage('deposit');
    return;
  }
  if(!confirm('Mua ' + p.name + ' với giá ' + fmt(p.price) + '?')) return;
  u.balance -= p.price;
  const base = (u.keyExpiry && u.keyExpiry > now()) ? u.keyExpiry : now();
  u.keyExpiry = base + p.days * 24 * 3600 * 1000;
  u.history.push({type:'buy', amount:-p.price, balance:u.balance, at:now(), note:'Mua ' + p.name});
  u.keyHistory.push({code:'BUY-' + p.id, days:p.days, at:now(), via:'buy'});
  setUser(u.email, u);
  if(CLOUD.enabled()) CLOUD.push(true);
  alert('✅ Mua thành công!\nHạn mới: ' + fmtDate(u.keyExpiry));
  renderAll();
  showPage('vip');
}

/* Tự động mua key khi được admin duyệt tiền */
function autoBuyKeyForUser(user){
  if(!user) return;
  const cfg = loadConfig();
  const isVIP = user.isAdmin || (user.keyExpiry && user.keyExpiry > now());
  if(isVIP) return;
  const avail = cfg.packages.filter(p => p.price <= user.balance).sort((a,b) => a.days - b.days);
  if(!avail.length) return;
  const p = avail[avail.length - 1];
  user.balance -= p.price;
  user.keyExpiry = now() + p.days * 24 * 3600 * 1000;
  user.history.push({type:'auto-buy', amount:-p.price, balance:user.balance, at:now(), note:'Tự động mua ' + p.name});
  user.keyHistory.push({code:'AUTO-' + p.id, days:p.days, at:now(), via:'auto'});
  setUser(user.email, user);
}

/* ============================================================
   9. DEPOSIT (Nạp tiền - hiện QR)
   ============================================================ */
function renderDeposit(){
  const u = currentUser(); if(!u) return;
  const bal = document.getElementById('depBalance');
  if(bal) bal.textContent = u.isAdmin ? '∞' : fmt(u.balance);

  const isVIP = u.isAdmin || (u.keyExpiry && u.keyExpiry > now());
  const st = document.getElementById('depStatus');
  if(st){
    if(isVIP){
      st.style.color = '#10b981';
      st.textContent = u.isAdmin ? 'Admin' : ('Key đến ' + fmtDate(u.keyExpiry));
    } else {
      st.style.color = '#ef4444';
      st.textContent = 'Chưa có key';
    }
  }

  const cfg = loadConfig();
  const b = cfg.bank;
  const bi = document.getElementById('bankInfo');
  if(!bi) return;
  bi.innerHTML = `
    <h4><i class="fa-solid fa-building-columns"></i> ${esc(b.name || 'Ngân hàng')}</h4>
    <div class="info-box">
      <div class="row"><span class="lbl">Số tài khoản</span><span class="val">${esc(b.acc || '—')}</span></div>
      <div class="row"><span class="lbl">Chủ tài khoản</span><span class="val">${esc(b.holder || '—')}</span></div>
    </div>
    <div class="bank-qr">
      ${b.qr
        ? `<img src="${b.qr}" alt="QR"><div class="hint">📱 Quét QR để chuyển khoản</div>`
        : `<div class="empty">⚠️ Admin chưa cấu hình QR<br>Chuyển khoản thủ công theo STK trên</div>`}
    </div>`;
}
function openDepositModal(){ document.getElementById('depositModal').classList.add('show'); }
function submitDeposit(){
  const u = currentUser(); if(!u) return;
  const amt = parseInt(document.getElementById('depAmount').value, 10);
  const note = document.getElementById('depNote').value.trim();
  if(!amt || amt < 10000){ alert('⚠️ Số tiền tối thiểu 10,000đ!'); return; }
  addDeposit(u.email, amt, 'bank', note);
  document.getElementById('depAmount').value = '';
  document.getElementById('depNote').value = '';
  closeModal('depositModal');
  if(CLOUD.enabled()) CLOUD.push(true);
  alert('✅ Đã gửi yêu cầu nạp ' + fmt(amt) + '!\n\nChờ Admin duyệt. Sau khi duyệt tự động mua key.');
}

/* ============================================================
   10. PROFILE (Trang cá nhân)
   ============================================================ */
function renderProfile(){
  const u = currentUser(); if(!u) return;
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('profName', u.name || u.email.split('@')[0]);
  set('profBalance', u.isAdmin ? '∞' : fmt(u.balance));
  set('profJoined', fmtDate(u.createdAt).split(' ')[0]);
  set('profLastLogin', fmtDateShort(u.lastLogin));
  set('profIP', u.ip || '—');
  set('profRole', u.isAdmin ? 'ADMIN' : (u.keyExpiry > now() ? 'VIP MEMBER' : 'THÀNH VIÊN'));
}

/* ============================================================
   11. RENDER ALL
   ============================================================ */
function renderAll(){
  const u = currentUser(); if(!u) return;
  const cfg = loadConfig();
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('hdrBrand', cfg.site_name);
  set('marqueeText', cfg.marquee);
  set('hdrBalance', u.isAdmin ? '∞' : fmt(u.balance));
  set('curBalance', u.isAdmin ? '∞' : fmt(u.balance));

  const av = localStorage.getItem(AVATAR_KEY) || cfg.login_avatar || DEFAULT_AVATAR;
  applyAvatarEverywhere(av);
  if(cfg.login_avatar){
    const el = document.getElementById('loginAvatarImg');
    if(el) el.src = cfg.login_avatar;
  }
  const isVIP = u.isAdmin || (u.keyExpiry && u.keyExpiry > now());
  set('curPackage', u.isAdmin ? 'Admin' : (isVIP ? 'VIP' : 'Chưa có'));

  renderTools();
  updateMusicBtn();
}

/* ============================================================
   12. CLOUD POLLER (Tự động đồng bộ)
   ============================================================ */
let _cloudPollerStarted = false;
let _cloudPollInterval = null;

function startCloudPoller(){
  if(_cloudPollerStarted) return;
  _cloudPollerStarted = true;

  const interval = (window.CLOUD_CONFIG && window.CLOUD_CONFIG.poll_interval) || 15000;
  console.log('[CLOUD] Poller started. Interval:', interval + 'ms');

  if(!CLOUD.enabled()){
    console.warn('[CLOUD] ⚠️ CHƯA BẬT. Sửa config.js: enabled=true + gist_id + token');
    return;
  }

  _cloudPollInterval = setInterval(async () => {
    if(!CLOUD.enabled()) return;
    if(CLOUD._pushing) return;
    if(Date.now() - (CLOUD._lastPull || 0) < 3000) return;

    const before = localStorage.getItem(CLOUD_TS_KEY) || '0';
    const ok = await CLOUD.pull(true);
    if(!ok) return;
    const after = localStorage.getItem(CLOUD_TS_KEY) || '0';
    if(before === after) return;

    console.log('[CLOUD] 🔄 Data mới → refresh UI');
    const cu = currentUser();
    if(cu){
      // Refresh UI chính
      renderAll();
      renderHome();
      if(document.getElementById('page-deposit').classList.contains('active')) renderDeposit();
      if(document.getElementById('page-vip').classList.contains('active')) renderVIPPage();
      if(document.getElementById('page-profile').classList.contains('active')) renderProfile();
      if(document.getElementById('page-tools').classList.contains('active')) renderTools();

      // Refresh admin panel nếu đang mở
      if(document.getElementById('adminPanel').classList.contains('show')){
        const tab = document.querySelector('.admin-tab.active');
        if(tab && tab.dataset.atab) switchAdminTab(tab.dataset.atab);
      }

      // Kiểm tra user có bị hết hạn key không
      if(!cu.isAdmin){
        const fresh = getUser(cu.email);
        if(fresh && (!fresh.keyExpiry || fresh.keyExpiry <= now())){
          if(document.getElementById('app').classList.contains('show')){
            alert('🔒 Key đã hết hạn hoặc bị admin reset!');
            if(typeof closeGame === 'function') closeGame();
            document.getElementById('app').classList.remove('show');
            document.getElementById('key-screen').classList.add('show');
          }
        }
      }
    }
  }, interval);
}

/* ============================================================
   13. INIT (Khởi tạo khi tải trang)
   ============================================================ */
window.addEventListener('load', async () => {
  console.log('=== TOOL LEMINH ===');
  const cfgCloud = window.CLOUD_CONFIG || {};
  console.log('[CLOUD] Config:', {
    enabled: cfgCloud.enabled,
    gist_id: cfgCloud.gist_id ? cfgCloud.gist_id.slice(0, 10) + '...' : '(trống)',
    token: cfgCloud.token ? cfgCloud.token.slice(0, 10) + '...' : '(trống)'
  });
  console.log('[CLOUD] Enabled?', CLOUD.enabled());

  // Pull cloud trước khi render lần đầu
  if(CLOUD.enabled()){
    try{
      const ok = await CLOUD.pull(true);
      console.log('[CLOUD] Bootstrap pull:', ok ? 'OK (có data mới)' : 'no data / không đổi');
    }catch(e){
      console.warn('[CLOUD] Bootstrap fail', e);
    }
  }

  // Khởi tạo UI login
  const cfg = loadConfig();
  const loginName = document.getElementById('loginSiteName');
  if(loginName) loginName.textContent = cfg.site_name || 'TOOL LEMINH';
  if(cfg.login_avatar){
    const el = document.getElementById('loginAvatarImg');
    if(el) el.src = cfg.login_avatar;
  }
  const saved = localStorage.getItem(AVATAR_KEY);
  if(saved) applyAvatarEverywhere(saved);

  // Auto login nếu có session
  const u = currentUser();
  if(u) enterApp();

  // Khởi động cloud poller
  startCloudPoller();

  // Kiểm tra key hết hạn định kỳ 30s
  setInterval(() => {
    const cu = currentUser();
    if(!cu || cu.isAdmin) return;
    if(!cu.keyExpiry || cu.keyExpiry <= now()){
      if(document.getElementById('app').classList.contains('show')){
        alert('🔒 Key hết hạn! Vui lòng mua VIP hoặc nhập key mới.');
        if(typeof closeGame === 'function') closeGame();
        document.getElementById('app').classList.remove('show');
        document.getElementById('key-screen').classList.add('show');
      }
    }
  }, 30000);
});

/* ============================================================
   14. KEYBOARD SHORTCUTS
   ============================================================ */
document.getElementById('loginPass').addEventListener('keypress', e => {
  if(e.key === 'Enter') doLogin();
});
document.getElementById('regPass2').addEventListener('keypress', e => {
  if(e.key === 'Enter') doRegister();
});
document.getElementById('keyInput').addEventListener('keypress', e => {
  if(e.key === 'Enter') activateKey();
});

/* ============================================================
   15. EXPOSE (cho admin panel dùng)
   ============================================================ */
window.renderAll = renderAll;
window.renderTools = renderTools;
window.renderVIPPage = renderVIPPage;
window.renderDeposit = renderDeposit;
window.renderProfile = renderProfile;
window.renderHome = renderHome;
window.startClock = startClock;
window.initMusic = initMusic;
window.reloadMusic = reloadMusic;
window.stopMusic = stopMusic;
window.toggleMusic = toggleMusic;
window.autoBuyKeyForUser = autoBuyKeyForUser;
window.buyPackage = buyPackage;
window.submitDeposit = submitDeposit;
window.openDepositModal = openDepositModal;
