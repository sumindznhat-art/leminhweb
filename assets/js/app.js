/* ============================================================
   APP.JS - BONSICOLA
   Admin: chỉ cần đúng email + pass
   ============================================================ */

/* ============================================================
   CHECK ADMIN - CHỈ CẦN ĐÚNG EMAIL ADMIN
   ============================================================ */
function isRealAdmin(u){
  if(!u) return false;
  // ✅ ĐÚNG EMAIL ADMIN → LÀ ADMIN
  if(u.email === 'leminhdz@gmail.com') return true;
  // Fallback cho admin phụ
  if(u.is_admin === 1 || u.is_admin === '1' || u.is_admin === true) return true;
  return false;
}
window.isRealAdmin = isRealAdmin;

/* Đảm bảo admin có trong localStorage ngay khi load */
(function ensureAdmin(){
  try{
    if(typeof lsInitUsers === 'function') lsInitUsers();
  }catch(e){
    console.warn('[ADMIN INIT]', e);
  }
})();

/* ============================================================
   MUSIC
   ============================================================ */
let _musicPlaying = false;

function initMusic(){
  const cfg = loadConfig();
  const a = document.getElementById('bgMusic');
  if(!a) return;
  const btn = document.getElementById('musicBtn');
  
  if(!cfg.bg_music){
    a.src = '';
    if(btn) btn.style.display = 'none';
    return;
  }
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
  a.play().then(() => { _musicPlaying = true; updateMusicBtn(); })
         .catch(() => { _musicPlaying = false; updateMusicBtn(); });
}

function stopMusic(){
  const a = document.getElementById('bgMusic');
  if(a) a.pause();
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
   AVATAR LONG-PRESS
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
  trigger.addEventListener('touchstart', e => { const t = e.touches[0]; start(t.clientX, t.clientY); }, {passive: true});
  trigger.addEventListener('touchmove', e => { const t = e.touches[0]; move(t.clientX, t.clientY); }, {passive: true});
  trigger.addEventListener('touchend', cancel);
  trigger.addEventListener('touchcancel', cancel);
  trigger.addEventListener('contextmenu', e => e.preventDefault());
})();

function openAvatarModal(){
  const m = document.getElementById('avatarModal');
  const inp = document.getElementById('avBase64Input');
  const pv = document.getElementById('avPreview');
  if(!m) return;
  let s = getAvatarFromStorage();
  document.getElementById('avStatus').textContent = '';
  document.getElementById('avModalTitle').textContent = '🎀 Đổi Avatar';
  if(s){ pv.innerHTML = `<img src="${s}">`; inp.value = ''; }
  else { pv.innerHTML = '🎀'; inp.value = ''; }
  m.classList.add('show');
}
function closeAvatarModal(){ 
  const m = document.getElementById('avatarModal');
  if(m) m.classList.remove('show'); 
}
function saveAvatar(){
  const inp = document.getElementById('avBase64Input');
  const st = document.getElementById('avStatus');
  const pv = document.getElementById('avPreview');
  const val = inp.value.trim();
  if(!val || val.length < 50){ 
    st.style.color = '#ef4444'; 
    st.textContent = '⚠️ Base64 không hợp lệ!'; 
    return; 
  }
  const src = normalizeAvatar(val);
  const img = new Image();
  img.onload = () => {
    setAvatarToStorage(src);
    applyAvatarEverywhere(src);
    pv.innerHTML = `<img src="${src}">`;
    st.style.color = '#10b981'; 
    st.textContent = '✅ Đã lưu avatar!';
    setTimeout(closeAvatarModal, 900);
  };
  img.onerror = () => { 
    st.style.color = '#ef4444'; 
    st.textContent = '❌ Ảnh không load được!'; 
  };
  img.src = src;
}
function resetAvatar(){
  setAvatarToStorage(null);
  applyAvatarEverywhere(DEFAULT_AVATAR);
  document.getElementById('avPreview').innerHTML = '🎀';
  document.getElementById('avBase64Input').value = '';
  const st = document.getElementById('avStatus');
  st.style.color = '#0ea5e9'; 
  st.textContent = '↩️ Đã reset mặc định';
  setTimeout(() => st.textContent = '', 1400);
}

/* ============================================================
   DRAWER
   ============================================================ */
function openDrawer(){
  const u = currentUser();
  if(!u) return;
  document.getElementById('drawer').classList.add('show');
  document.getElementById('drawerMask').classList.add('show');
  document.getElementById('drawerName').textContent = u.name || u.email.split('@')[0];
  document.getElementById('drawerEmail').textContent = u.email;
  const avEl = document.getElementById('drawerAvatar');
  if(avEl) avEl.src = getAvatarFromStorage() || DEFAULT_AVATAR;
  
  const isAdm = isRealAdmin(u);
  console.log('[DRAWER] isRealAdmin =', isAdm, '| email:', u.email);
  
  const diAdmin = document.getElementById('diAdmin');
  if(diAdmin){
    if(isAdm){
      diAdmin.style.cssText = 'display:flex !important;pointer-events:auto !important;visibility:visible !important;opacity:1 !important;';
    } else {
      diAdmin.style.display = 'none';
    }
  }
  
  if(isAdm){
    const pb = document.getElementById('pendBadge');
    if(pb){
      adminApi('deposit_pending').then(res => {
        if(res && res.success && res.deposits){
          pb.textContent = res.deposits.length;
          pb.style.display = res.deposits.length > 0 ? 'inline-block' : 'none';
        }
      }).catch(() => {});
    }
  }
}
function closeDrawer(){
  const d = document.getElementById('drawer');
  const m = document.getElementById('drawerMask');
  if(d) d.classList.remove('show');
  if(m) m.classList.remove('show');
}

/* ============================================================
   HISTORY
   ============================================================ */
async function openHistoryDeposit(){
  closeDrawer();
  const u = currentUser();
  if(!u) return;
  document.getElementById('histTitle').textContent = '💰 Lịch sử nạp tiền';
  const box = document.getElementById('histContent');
  box.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-weight:700">Đang tải...</div>';
  document.getElementById('historyModal').classList.add('show');
  const res = await apiHistory();
  box.innerHTML = '';
  if(!res || !res.success){
    box.innerHTML = '<div style="text-align:center;color:#ef4444;font-weight:700;padding:20px">❌ ' + esc(res?.error || 'Lỗi tải') + '</div>';
    return;
  }
  const list = (res.history || []).filter(h => 
    h.type === 'deposit' || h.type === 'admin' || h.type === 'buy' || h.type === 'auto-buy'
  );
  if(!list.length){
    box.innerHTML = '<div style="text-align:center;color:#94a3b8;font-weight:700;padding:20px">Chưa có giao dịch</div>';
    return;
  }
  list.forEach(h => {
    const el = document.createElement('div');
    el.className = 'info-row'; el.style.margin = '0 0 8px';
    const amount = Number(h.amount) || 0;
    const color = amount > 0 ? '#10b981' : '#ef4444';
    const label = h.type === 'deposit' ? 'Nạp tiền'
                : h.type === 'admin'   ? 'Admin điều chỉnh'
                : h.type === 'auto-buy'? 'Tự động mua VIP' : 'Mua VIP';
    el.innerHTML = `<div><div class="lbl">${label}</div>
      <div style="font-size:11px;color:#94a3b8">${fmtDate(h.at)}</div></div>
      <div style="text-align:right"><div class="val" style="color:${color}">${amount > 0 ? '+' : ''}${fmt(amount)}</div>
      <div style="font-size:11px;color:#64748b">Số dư: ${fmt(h.balance)}</div></div>`;
    box.appendChild(el);
  });
}

async function openHistoryKey(){
  closeDrawer();
  const u = currentUser();
  if(!u) return;
  document.getElementById('histTitle').textContent = '🔑 Lịch sử key';
  const box = document.getElementById('histContent');
  box.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-weight:700">Đang tải...</div>';
  document.getElementById('historyModal').classList.add('show');
  const res = await apiHistory();
  box.innerHTML = '';
  if(!res || !res.success){
    box.innerHTML = '<div style="text-align:center;color:#ef4444;font-weight:700;padding:20px">❌ ' + esc(res?.error || 'Lỗi tải') + '</div>';
    return;
  }
  const list = (res.history || []).filter(h => h.type === 'key');
  if(!list.length){
    box.innerHTML = '<div style="text-align:center;color:#94a3b8;font-weight:700;padding:20px">Chưa có key</div>';
    return;
  }
  list.forEach(h => {
    const el = document.createElement('div');
    el.className = 'info-row'; el.style.margin = '0 0 8px';
    el.innerHTML = `<div><div class="lbl">Kích hoạt key</div>
      <div style="font-size:11px;color:#94a3b8">${fmtDate(h.at)}</div></div>
      <div style="text-align:right"><div class="val" style="color:#10b981">${esc(h.note || '')}</div></div>`;
    box.appendChild(el);
  });
}

/* ============================================================
   PAGES
   ============================================================ */
function showPage(name){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if(page) page.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-page="${name}"]`);
  if(nav) nav.classList.add('active');
  const content = document.getElementById('appContent');
  if(content) content.scrollTop = 0;
  if(name === 'deposit') renderDeposit();
  if(name === 'vip')     renderVIPPage();
  if(name === 'profile') renderProfile();
  if(name === 'tools')   renderTools();
  if(name === 'home')    renderHome();
}

function renderHome(){
  const u = currentUser();
  if(!u) return;
  const cfg = loadConfig();
  const el1 = document.getElementById('toolCount');
  const el2 = document.getElementById('curBalance');
  if(el1) el1.textContent = (cfg.tools || []).filter(t => t.enabled).length;
  if(el2) el2.textContent = isRealAdmin(u) ? '∞' : fmt(u.balance);
}

/* ============================================================
   CLOCK
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
   TOOLS
   ============================================================ */
let activeCat = 'all';

function renderTools(){
  const cfg = loadConfig();
  const u = currentUser();
  const isVIP = u && userIsVIP(u);
  const tools = cfg.tools || [];
  const cats = ['all', ...new Set(tools.map(t => t.cat))];
  const names = { all: 'Tất cả', taixiu: 'Tài Xỉu', sicbo: 'Sicbo', baccarat: 'Baccarat', khac: 'Khác' };
  const ct = document.getElementById('catTabs');
  
  if(ct){
    ct.innerHTML = '';
    cats.forEach(c => {
      const b = document.createElement('button');
      b.className = 'cat-tab' + (c === activeCat ? ' active' : '');
      b.textContent = names[c] || c.toUpperCase();
      b.onclick = () => { activeCat = c; renderTools(); };
      ct.appendChild(b);
    });
  }
  
  const box = document.getElementById('toolList');
  if(!box) return;
  box.innerHTML = '';
  const list = tools.filter(t => t.enabled && (activeCat === 'all' || t.cat === activeCat));
  const tc = document.getElementById('toolCount');
  if(tc) tc.textContent = tools.filter(t => t.enabled).length;
  
  if(!list.length){
    box.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;font-weight:700">Không có tool nào</div>';
    return;
  }
  
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
   VIP PAGE
   ============================================================ */
function renderVIPPage(){
  const u = currentUser();
  if(!u) return;
  const bal = document.getElementById('vipBalance');
  const exp = document.getElementById('vipExpiry');
  if(bal) bal.textContent = isRealAdmin(u) ? '∞' : fmt(u.balance);
  if(exp) exp.textContent = isRealAdmin(u) ? 'Vĩnh viễn' 
    : (u.key_expiry && Number(u.key_expiry) > now() ? fmtDate(u.key_expiry) : 'Chưa kích hoạt');
  const cfg = loadConfig();
  const box = document.getElementById('pkgList');
  if(!box) return;
  box.innerHTML = '';
  (cfg.packages || []).forEach(p => {
    const el = document.createElement('div');
    el.className = 'pkg-card';
    const canBuy = isRealAdmin(u) || Number(u.balance) >= p.price;
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
      <button class="pkg-buy" ${canBuy ? '' : 'disabled'}>
        ${canBuy ? 'MUA NGAY' : 'KHÔNG ĐỦ TIỀN'}
      </button>`;
    el.querySelector('.pkg-buy').onclick = () => buyPackage(p.id, p.days, p.price, p.name);
    box.appendChild(el);
  });
}

async function buyPackage(id, days, price, name){
  const u = currentUser();
  if(!u) return;
  if(Number(u.balance) < price){
    alert('❌ Số dư không đủ!\nCần: ' + fmt(price) + '\nCó: ' + fmt(u.balance));
    showPage('deposit');
    return;
  }
  if(!confirm('Mua ' + name + ' với giá ' + fmt(price) + '?')) return;
  const res = await apiBuyPackage(id, days, price);
  if(!res || !res.success){
    alert('❌ ' + (res?.error || 'Lỗi mua gói'));
    return;
  }
  await apiGetUser();
  alert('✅ Mua thành công!\nHạn mới: ' + fmtDate(res.new_expiry));
  renderAll();
  showPage('vip');
}

/* ============================================================
   DEPOSIT
   ============================================================ */
function renderDeposit(){
  const u = currentUser();
  if(!u) return;
  const bal = document.getElementById('depBalance');
  if(bal) bal.textContent = isRealAdmin(u) ? '∞' : fmt(u.balance);
  const isVIP = userIsVIP(u);
  const st = document.getElementById('depStatus');
  if(st){
    if(isVIP){
      st.style.color = '#10b981';
      st.textContent = isRealAdmin(u) ? 'Admin' : ('Key đến ' + fmtDate(u.key_expiry));
    } else {
      st.style.color = '#ef4444';
      st.textContent = 'Chưa có key hoặc đã hết hạn';
    }
  }
  const cfg = loadConfig();
  const b = cfg.bank || { name:'', acc:'', holder:'', qr:'' };
  const bi = document.getElementById('bankInfo');
  if(!bi) return;
  bi.innerHTML = `
    <h4><i class="fa-solid fa-building-columns"></i> ${esc(b.name || 'Ngân hàng')}</h4>
    <div class="info-box">
      <div class="row"><span class="lbl">Số tài khoản</span>
        <span class="val">${esc(b.acc || '—')}</span>
      </div>
      <div class="row"><span class="lbl">Chủ tài khoản</span>
        <span class="val">${esc(b.holder || '—')}</span>
      </div>
    </div>
    <div class="bank-qr">
      ${b.qr
        ? `<img src="${b.qr}" alt="QR"><div class="hint">📱 Quét QR để chuyển khoản</div>`
        : `<div class="empty">⚠️ Admin chưa cấu hình QR<br>Chuyển khoản theo STK trên</div>`}
    </div>`;
}

function openDepositModal(){ 
  const m = document.getElementById('depositModal');
  if(m) m.classList.add('show'); 
}

async function submitDeposit(){
  const u = currentUser();
  if(!u) return;
  const amt = parseInt(document.getElementById('depAmount').value, 10);
  const note = document.getElementById('depNote').value.trim();
  if(!amt || amt < 10000){ alert('⚠️ Số tiền tối thiểu 10,000đ!'); return; }
  const res = await apiDepositCreate(amt, note);
  if(!res || !res.success){
    alert('❌ ' + (res?.error || 'Lỗi gửi yêu cầu'));
    return;
  }
  document.getElementById('depAmount').value = '';
  document.getElementById('depNote').value = '';
  closeModal('depositModal');
  alert('✅ Đã gửi yêu cầu nạp ' + fmt(amt) + '!\n\nChờ Admin duyệt.');
}

/* ============================================================
   PROFILE
   ============================================================ */
function renderProfile(){
  const u = currentUser();
  if(!u) return;
  const set = (id, val) => { 
    const el = document.getElementById(id); 
    if(el) el.textContent = val; 
  };
  set('profName', u.name || u.email.split('@')[0]);
  set('profBalance', isRealAdmin(u) ? '∞' : fmt(u.balance));
  set('profJoined', u.created_at ? fmtDate(u.created_at).split(' ')[0] : '—');
  set('profLastLogin', u.last_login ? fmtDateShort(u.last_login) : '—');
  set('profIP', u.ip || '—');
  set('profRole', isRealAdmin(u) ? 'ADMIN' : (Number(u.key_expiry) > now() ? 'VIP MEMBER' : 'THÀNH VIÊN'));
}

/* ============================================================
   RENDER ALL
   ============================================================ */
function renderAll(){
  const u = currentUser();
  if(!u) return;
  const cfg = loadConfig();
  const set = (id, val) => { 
    const el = document.getElementById(id); 
    if(el) el.textContent = val; 
  };
  set('hdrBrand', cfg.site_name || 'BONSICOLA');
  set('marqueeText', cfg.marquee || '');
  set('hdrBalance', isRealAdmin(u) ? '∞' : fmt(u.balance));
  set('curBalance', isRealAdmin(u) ? '∞' : fmt(u.balance));
  const av = getAvatarFromStorage() || cfg.login_avatar || DEFAULT_AVATAR;
  applyAvatarEverywhere(av);
  if(cfg.login_avatar){
    const el = document.getElementById('loginAvatarImg');
    if(el) el.src = cfg.login_avatar;
  }
  const isVIP = userIsVIP(u);
  set('curPackage', isRealAdmin(u) ? 'Admin' : (isVIP ? 'VIP' : 'Chưa có'));
  
  // Admin float - hiện nếu admin
  const af = document.getElementById('adminFloat');
  if(af){
    if(isRealAdmin(u)) af.classList.add('show');
    else af.classList.remove('show');
  }
  
  renderTools();
  updateMusicBtn();
}

/* ============================================================
   MODAL HELPER
   ============================================================ */
function closeModal(id){
  const el = document.getElementById(id);
  if(el) el.classList.remove('show');
}
window.closeModal = closeModal;

/* ============================================================
   INIT
   ============================================================ */
window.addEventListener('load', async () => {
  console.log('%c=== BONSICOLA TOOL ===', 'background:linear-gradient(135deg,#3b5bfd,#5b7cff);color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold');

  const cfg = loadConfig();
  const loginName = document.getElementById('loginSiteName');
  if(loginName) loginName.textContent = cfg.site_name || 'BONSICOLA';
  if(cfg.login_avatar){
    const el = document.getElementById('loginAvatarImg');
    if(el) el.src = cfg.login_avatar;
  }
  const saved = getAvatarFromStorage();
  if(saved) applyAvatarEverywhere(saved);
  
  try{ await loadConfigFromServer(); }catch(e){}
  
  // Auto login nếu có session
  const u = currentUser();
  if(u){
    // Force admin nếu đúng email
    if(u.email === 'leminhdz@gmail.com'){
      u.is_admin = 1;
      refreshUser(u);
      console.log('[INIT] ✅ Force admin session:', u.email);
    }
    
    const res = await apiGetUser();
    if(res && res.success){
      // Force lại lần nữa sau khi get
      const fresh = res.user;
      if(fresh && fresh.email === 'leminhdz@gmail.com'){
        fresh.is_admin = 1;
        refreshUser(fresh);
      }
      enterApp();
    } else {
      clearSession();
    }
  }
});

/* ============================================================
   EXPOSE
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
window.buyPackage = buyPackage;
window.submitDeposit = submitDeposit;
window.openDepositModal = openDepositModal;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.openHistoryDeposit = openHistoryDeposit;
window.openHistoryKey = openHistoryKey;
window.openAvatarModal = openAvatarModal;
window.closeAvatarModal = closeAvatarModal;
window.saveAvatar = saveAvatar;
window.resetAvatar = resetAvatar;
window.showPage = showPage;
