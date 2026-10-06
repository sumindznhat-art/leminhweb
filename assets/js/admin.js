/* ============================================================
   ADMIN.JS - BONSICOLA (Fix quyền admin)
   ============================================================ */

function openAdmin(){
  const u = currentUser();

  console.log('[ADMIN] openAdmin called');
  console.log('[ADMIN] user:', u);
  console.log('[ADMIN] isRealAdmin:', isRealAdmin(u));

  if(!u){
    alert('❌ Vui lòng đăng nhập!');
    return;
  }

  if(!isRealAdmin(u)){
    alert('❌ Bạn không có quyền Admin!\n\nEmail: ' + u.email);
    return;
  }

  document.getElementById('adminPanel').classList.add('show');
  switchAdminTab('users');
}

function closeModal(id){
  const el = document.getElementById(id);
  if(el) el.classList.remove('show');
}

function switchAdminTab(tab){
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.atab === tab));
  ['users','pending','apis','cloud','config','keys','games'].forEach(k => {
    const el = document.getElementById('admin' + k.charAt(0).toUpperCase() + k.slice(1) + 'View');
    if(el) el.style.display = (k === tab) ? 'block' : 'none';
  });
  if(tab === 'users')   renderAdminUsers();
  if(tab === 'pending') renderAdminPending();
  if(tab === 'apis')    renderAdminApis();
  if(tab === 'cloud')   renderAdminCloud();
  if(tab === 'config')  renderAdminConfig();
  if(tab === 'keys')    renderAdminKeys();
  if(tab === 'games')   renderAdminGames();
}

/* ============ TAB USERS ============ */
async function renderAdminUsers(){
  const box = document.getElementById('adminUsersView');
  box.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-weight:700">Đang tải...</div>';

  const res = await adminApi('user_list');
  box.innerHTML = '';

  const add = document.createElement('div');
  add.className = 'adm-section';
  add.innerHTML = `<h4><i class="fa-solid fa-user-plus"></i> Tạo user mới</h4>
    <input class="adm-input" id="admNewEmail" placeholder="Email...">
    <input class="adm-input" id="admNewPass" placeholder="Mật khẩu...">
    <input class="adm-input" id="admNewName" placeholder="Tên hiển thị...">
    <button class="green" onclick="admCreateUser()">TẠO USER</button>`;
  box.appendChild(add);

  if(!res || !res.success || !res.users){
    box.innerHTML += '<div style="text-align:center;padding:20px;color:#ef4444;font-weight:700">❌ ' + esc(res?.error || 'Lỗi tải users') + '</div>';
    return;
  }

  res.users.forEach(u => {
    const isExpired = !u.is_admin && (!u.key_expiry || Number(u.key_expiry) <= now());
    const div = document.createElement('div');
    div.className = 'adm-user';
    const badges = [];
    if(u.is_admin) badges.push('<span class="badge badge-admin">ADMIN</span>');
    else if(isExpired) badges.push('<span class="badge badge-exp">HẾT HẠN</span>');
    else badges.push('<span class="badge badge-vip">VIP</span>');

    div.innerHTML = `
      <div class="r1"><div class="email">${esc(u.email)}</div><div>${badges.join(' ')}</div></div>
      <div class="info">
        Tên: <b>${esc(u.name||'—')}</b><br>
        Số dư: <b>${u.is_admin ? '∞' : fmt(u.balance)}</b><br>
        Hạn key: <b>${u.is_admin ? '∞' : (u.key_expiry ? fmtDate(u.key_expiry) : 'Chưa có')}</b><br>
        IP: <b style="color:#ef4444">${esc(u.ip||'—')}</b><br>
        Đăng nhập: <b>${u.last_login ? fmtDate(u.last_login) : '—'}</b>
      </div>
      <div class="acts">
        <button class="b1" onclick="admAddBalance('${esc(u.email)}')">+Tiền</button>
        <button class="b2" onclick="admSetKey('${esc(u.email)}')">+Key</button>
        <button class="b3" onclick="admResetKey('${esc(u.email)}')">Reset</button>
        <button class="b4" onclick="admToggleAdmin('${esc(u.email)}', ${u.is_admin ? 1 : 0})">${u.is_admin ? 'Gỡ Admin' : 'Cấp Admin'}</button>
        <button class="b5" onclick="admDelete('${esc(u.email)}')">Xoá</button>
      </div>`;
    box.appendChild(div);
  });
}

async function admCreateUser(){
  const email = document.getElementById('admNewEmail').value.trim().toLowerCase();
  const pass = document.getElementById('admNewPass').value;
  const name = document.getElementById('admNewName').value.trim() || email.split('@')[0];
  if(!email || !pass){ alert('⚠️ Nhập đủ!'); return; }
  const res = await apiRegister(email, pass, name);
  if(!res || !res.success){ alert('❌ ' + (res?.error || 'Lỗi')); return; }
  alert('✅ Đã tạo: ' + email);
  renderAdminUsers();
}

async function admAddBalance(email){
  const v = prompt('Cộng/trừ tiền cho ' + email + '\n(số dương = cộng, âm = trừ)', '50000');
  if(v === null) return;
  const n = parseInt(v, 10);
  if(isNaN(n)){ alert('❌ Số không hợp lệ!'); return; }
  const listRes = await adminApi('user_list');
  const user = listRes.users ? listRes.users.find(u => u.email === email) : null;
  if(!user){ alert('❌ Không tìm thấy user'); return; }
  const newBalance = Math.max(0, parseInt(user.balance) + n);
  const res = await adminApi('user_update', { email, balance: newBalance });
  if(!res || !res.success){ alert('❌ ' + (res?.error || 'Lỗi')); return; }
  alert('✅ Số dư mới: ' + fmt(newBalance));
  renderAdminUsers();
}

async function admSetKey(email){
  const v = prompt('Cấp thêm bao nhiêu NGÀY?', '7');
  if(v === null) return;
  const d = parseInt(v, 10);
  if(isNaN(d) || d <= 0){ alert('❌ Số ngày không hợp lệ!'); return; }
  const listRes = await adminApi('user_list');
  const user = listRes.users ? listRes.users.find(u => u.email === email) : null;
  if(!user){ alert('❌ Không tìm thấy user'); return; }
  const base = (Number(user.key_expiry) > now()) ? Number(user.key_expiry) : now();
  const newExpiry = base + d * 24 * 3600 * 1000;
  const res = await adminApi('user_update', { email, key_expiry: newExpiry });
  if(!res || !res.success){ alert('❌ ' + (res?.error || 'Lỗi')); return; }
  alert('✅ Đã cấp ' + d + ' ngày!\nHạn mới: ' + fmtDate(newExpiry));
  renderAdminUsers();
}

async function admResetKey(email){
  if(!confirm('Reset key của ' + email + '?')) return;
  const res = await adminApi('user_update', { email, key_expiry: 0 });
  if(!res || !res.success){ alert('❌ ' + (res?.error || 'Lỗi')); return; }
  alert('✅ Đã reset!');
  renderAdminUsers();
}

async function admToggleAdmin(email, current){
  const me = currentUser();
  if(email === me.email){ alert('❌ Không thể tự gỡ!'); return; }
  const newVal = current ? 0 : 1;
  if(!confirm((newVal ? 'Cấp' : 'Gỡ') + ' quyền ADMIN cho ' + email + '?')) return;
  const res = await adminApi('user_update', { email, is_admin: newVal });
  if(!res || !res.success){ alert('❌ ' + (res?.error || 'Lỗi')); return; }
  alert('✅ Đã cập nhật!');
  renderAdminUsers();
}

async function admDelete(email){
  const me = currentUser();
  if(email === me.email){ alert('❌ Không thể tự xoá!'); return; }
  if(email === 'leminhdz@gmail.com'){ alert('❌ Không thể xoá admin tổng!'); return; }
  if(!confirm('XOÁ: ' + email + '?')) return;
  const res = await adminApi('user_delete', { email });
  if(!res || !res.success){ alert('❌ ' + (res?.error || 'Lỗi')); return; }
  alert('✅ Đã xoá!');
  renderAdminUsers();
}

/* ============ TAB DUYỆT TIỀN ============ */
async function renderAdminPending(){
  const box = document.getElementById('adminPendingView');
  box.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-weight:700">Đang tải...</div>';
  const res = await adminApi('deposit_pending');
  box.innerHTML = '';
  if(!res || !res.success || !res.deposits || !res.deposits.length){
    box.innerHTML = '<div class="adm-section" style="text-align:center;color:#94a3b8;font-weight:700">✨ Không có yêu cầu nào</div>';
    return;
  }
  res.deposits.forEach(d => {
    const el = document.createElement('div');
    el.className = 'pending-item';
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
        <div style="font-weight:800;color:#3b5bfd;font-size:12.5px;word-break:break-all">${esc(d.email)}</div>
        <div class="amt">${fmt(d.amount)}</div>
      </div>
      <div style="font-size:11px;color:#64748b;font-weight:600">
        <b style="color:#ef4444">IP: ${esc(d.ip||'—')}</b><br>
        ${esc(d.method === 'bank' ? 'Ngân hàng' : 'Thẻ cào')} · ${fmtDate(d.created_at)}<br>
        Ghi chú: <b>${esc(d.note||'—')}</b>
      </div>
      <div class="acts">
        <button class="btn-approve" onclick="approveDeposit('${d.id}')"><i class="fa-solid fa-check"></i> DUYỆT</button>
        <button class="btn-reject" onclick="rejectDeposit('${d.id}')"><i class="fa-solid fa-xmark"></i> TỪ CHỐI</button>
      </div>`;
    box.appendChild(el);
  });
}

async function approveDeposit(id){
  const res = await adminApi('deposit_approve', { id });
  if(!res || !res.success){ alert('❌ ' + (res?.error || 'Lỗi duyệt')); return; }
  alert('✅ Đã duyệt! Tiền đã cộng + key tự động mua.');
  renderAdminPending();
}

async function rejectDeposit(id){
  const r = prompt('Lý do từ chối:', 'Không hợp lệ') || 'Không hợp lệ';
  const res = await adminApi('deposit_reject', { id, reason: r });
  if(!res || !res.success){ alert('❌ ' + (res?.error || 'Lỗi')); return; }
  alert('❌ Đã từ chối');
  renderAdminPending();
}

/* ============ TAB API USERS ============ */
async function renderAdminApis(){
  const box = document.getElementById('adminApisView');
  box.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-weight:700">Đang tải...</div>';
  const res = await adminApi('user_list');
  box.innerHTML = '';

  const intro = document.createElement('div');
  intro.className = 'adm-section';
  intro.innerHTML = '<h4><i class="fa-solid fa-code"></i> User đang dùng tool nào</h4>';
  box.appendChild(intro);

  const users = ((res && res.users) || []).filter(u => u.last_api);
  if(!users.length){
    box.innerHTML += '<div class="adm-section" style="text-align:center;color:#94a3b8;font-weight:700">Chưa có user dùng tool</div>';
    return;
  }
  users.sort((a, b) => (Number(b.last_tool_at) || 0) - (Number(a.last_tool_at) || 0));
  users.forEach(u => {
    const el = document.createElement('div');
    el.className = 'api-user';
    el.innerHTML = `
      <div class="em">${esc(u.email)}</div>
      <div style="font-size:11px;color:#64748b;font-weight:600">
        Tool: <b style="color:#3b5bfd">${esc(u.last_tool||'—')}</b><br>
        Lúc: <b>${u.last_tool_at ? fmtDate(u.last_tool_at) : '—'}</b><br>
        IP: <b style="color:#ef4444">${esc(u.ip||'—')}</b>
      </div>
      <div class="api-line"><span style="color:#f59e0b">API:</span> ${esc(u.last_api)}</div>`;
    box.appendChild(el);
  });
}

/* ============ TAB CLOUD ============ */
function renderAdminCloud(){
  const box = document.getElementById('adminCloudView');
  if(!box) return;
  box.innerHTML = `
    <div class="adm-section" style="text-align:center">
      <h4><i class="fa-solid fa-cloud"></i> Chế độ lưu trữ</h4>
      <p style="font-size:12px;color:#64748b;font-weight:600;line-height:1.6">
        Đang chạy chế độ <b>LocalStorage</b> (không cần server).<br>
        Mọi dữ liệu lưu trong trình duyệt.
      </p>
    </div>`;
}

/* ============ TAB CẤU HÌNH ============ */
function renderAdminConfig(){
  const cfg = loadConfig();
  const box = document.getElementById('adminConfigView');
  box.innerHTML = '';

  const site = document.createElement('div');
  site.className = 'adm-section';
  site.innerHTML = `<h4><i class="fa-solid fa-gear"></i> Cấu hình chung</h4>
    <input class="adm-input" id="cfgSiteName" value="${esc(cfg.site_name)}" placeholder="Tên site">
    <input class="adm-input" id="cfgMarquee" value="${esc(cfg.marquee)}" placeholder="Marquee">
    <input class="adm-input" id="cfgNoticeTitle" value="${esc(cfg.notice_title)}" placeholder="Tiêu đề TB">
    <textarea class="adm-textarea" id="cfgNotice" placeholder="Thông báo">${esc(cfg.notice)}</textarea>
    <button class="green" onclick="saveCfgSite()">💾 LƯU</button>`;
  box.appendChild(site);

  const bank = document.createElement('div');
  bank.className = 'adm-section';
  bank.innerHTML = `<h4><i class="fa-solid fa-building-columns"></i> Ngân hàng + QR</h4>
    <input class="adm-input" id="cfgBankName" value="${esc(cfg.bank.name)}" placeholder="Tên NH">
    <input class="adm-input" id="cfgBankAcc" value="${esc(cfg.bank.acc)}" placeholder="Số TK">
    <input class="adm-input" id="cfgBankHolder" value="${esc(cfg.bank.holder)}" placeholder="Chủ TK">
    <textarea class="adm-textarea" id="cfgBankQR" placeholder="Dán Base64 QR">${esc(cfg.bank.qr||'')}</textarea>
    <div style="text-align:center;margin:6px 0">${cfg.bank.qr ? `<img src="${cfg.bank.qr}" style="max-width:220px;border-radius:12px">` : '<span style="font-size:11px;color:#94a3b8">Chưa có QR</span>'}</div>
    <button class="green" onclick="saveCfgBank()">💾 LƯU BANK</button>
    <button class="red" onclick="clearCfgBankQR()">🗑 XOÁ QR</button>`;
  box.appendChild(bank);

  const music = document.createElement('div');
  music.className = 'adm-section';
  music.innerHTML = `<h4><i class="fa-solid fa-music"></i> Nhạc nền</h4>
    <textarea class="adm-textarea" id="cfgMusic" placeholder="URL hoặc Base64">${esc(cfg.bg_music||'')}</textarea>
    <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;margin:6px 0">
      <input type="checkbox" id="cfgMusicEnabled" ${cfg.bg_music_enabled?'checked':''}> Bật mặc định
    </label>
    <button class="green" onclick="saveCfgMusic()">💾 LƯU</button>
    <button class="orange" onclick="testMusic()">▶️ THỬ</button>
    <button class="red" onclick="clearCfgMusic()">🗑 XOÁ</button>`;
  box.appendChild(music);

  const lg = document.createElement('div');
  lg.className = 'adm-section';
  lg.innerHTML = `<h4><i class="fa-solid fa-image"></i> Avatar đăng nhập</h4>
    <textarea class="adm-textarea" id="cfgLoginAvatar" placeholder="Base64 avatar">${esc(cfg.login_avatar||'')}</textarea>
    <div style="text-align:center;margin:6px 0">${cfg.login_avatar ? `<img src="${cfg.login_avatar}" style="width:90px;height:90px;border-radius:50%;object-fit:cover">` : ''}</div>
    <button class="green" onclick="saveCfgLoginAvatar()">💾 LƯU</button>
    <button class="red" onclick="clearCfgLoginAvatar()">🗑 XOÁ</button>`;
  box.appendChild(lg);

  const tl = document.createElement('div');
  tl.className = 'adm-section';
  tl.innerHTML = `<h4><i class="fa-solid fa-cubes"></i> Tools (JSON)</h4>
    <textarea class="adm-textarea" id="cfgToolJson" style="min-height:200px">${esc(JSON.stringify(cfg.tools, null, 2))}</textarea>
    <button class="green" onclick="saveCfgTools()">💾 LƯU TOOL LIST</button>`;
  box.appendChild(tl);
}

function saveCfgSite(){
  const c = loadConfig();
  c.site_name = document.getElementById('cfgSiteName').value;
  c.marquee = document.getElementById('cfgMarquee').value;
  c.notice_title = document.getElementById('cfgNoticeTitle').value;
  c.notice = document.getElementById('cfgNotice').value;
  saveConfig(c);
  renderAll();
  document.getElementById('loginSiteName').textContent = c.site_name;
  alert('✅ Đã lưu!');
}

function saveCfgBank(){
  const c = loadConfig();
  c.bank.name = document.getElementById('cfgBankName').value;
  c.bank.acc = document.getElementById('cfgBankAcc').value;
  c.bank.holder = document.getElementById('cfgBankHolder').value;
  const qr = document.getElementById('cfgBankQR').value.trim();
  c.bank.qr = qr ? (normalizeAvatar(qr) || qr) : '';
  saveConfig(c);
  renderAdminConfig();
  alert('✅ Đã lưu bank!');
}

function clearCfgBankQR(){
  if(!confirm('Xoá QR?')) return;
  const c = loadConfig(); c.bank.qr = '';
  saveConfig(c);
  renderAdminConfig();
}

function saveCfgMusic(){
  const c = loadConfig();
  c.bg_music = document.getElementById('cfgMusic').value.trim() || '';
  c.bg_music_enabled = document.getElementById('cfgMusicEnabled').checked ? 1 : 0;
  saveConfig(c);
  alert('✅ Đã lưu nhạc!');
  if(typeof reloadMusic === 'function') reloadMusic();
}

function testMusic(){
  const m = document.getElementById('cfgMusic').value.trim();
  if(!m){ alert('⚠️ Chưa nhập nhạc!'); return; }
  const a = document.getElementById('bgMusic');
  a.src = m; a.volume = 0.5;
  a.play().catch(e => alert('❌ Không phát được: ' + e.message));
}

function clearCfgMusic(){
  if(!confirm('Xoá nhạc?')) return;
  const c = loadConfig(); c.bg_music = '';
  saveConfig(c);
  renderAdminConfig();
  if(typeof stopMusic === 'function') stopMusic();
}

function saveCfgLoginAvatar(){
  const c = loadConfig();
  const v = document.getElementById('cfgLoginAvatar').value.trim();
  c.login_avatar = v ? (normalizeAvatar(v) || v) : '';
  saveConfig(c);
  if(c.login_avatar) document.getElementById('loginAvatarImg').src = c.login_avatar;
  renderAdminConfig();
  alert('✅ Đã lưu avatar login!');
}

function clearCfgLoginAvatar(){
  if(!confirm('Xoá avatar login?')) return;
  const c = loadConfig(); c.login_avatar = '';
  saveConfig(c);
  document.getElementById('loginAvatarImg').src = DEFAULT_AVATAR;
  renderAdminConfig();
}

function saveCfgTools(){
  try{
    const c = loadConfig();
    const j = JSON.parse(document.getElementById('cfgToolJson').value);
    if(!Array.isArray(j)) throw new Error('Không phải mảng');
    c.tools = j;
    saveConfig(c);
    renderAdminConfig(); renderTools();
    alert('✅ Đã lưu!');
  }catch(e){ alert('❌ JSON lỗi: ' + e.message); }
}

/* ============ TAB GAMES ============ */
function renderAdminGames(){
  const cfg = loadConfig();
  const box = document.getElementById('adminGamesView');
  if(!box) return;
  box.innerHTML = '';

  const addForm = document.createElement('div');
  addForm.className = 'adm-section';
  addForm.style.background = '#f0fdf4';
  addForm.style.borderColor = '#86efac';
  addForm.style.borderStyle = 'solid';
  addForm.innerHTML = `
    <h4 style="color:#10b981"><i class="fa-solid fa-plus-circle"></i> THÊM GAME MỚI</h4>
    <input class="adm-input" id="newGameName" placeholder="📝 Tên game">
    <input class="adm-input" id="newGameSlug" placeholder="🔗 Slug (để trống = tự tạo)">
    <select class="adm-input" id="newGameCat">
      <option value="taixiu">Tài Xỉu</option>
      <option value="sicbo">Sicbo</option>
      <option value="baccarat">Baccarat</option>
      <option value="khac">Khác</option>
    </select>
    <select class="adm-input" id="newGamePanel">
      <option value="taixiu">Panel TÀI XỈU</option>
      <option value="md5">Panel MD5</option>
      <option value="none">Không panel</option>
    </select>
    <input class="adm-input" id="newGameImage" placeholder="🖼️ Logo URL">
    <textarea class="adm-textarea" id="newGameHtml" placeholder="📄 Dán HTML GAME vào đây" style="min-height:150px;font-size:11px"></textarea>
    <input class="adm-input" id="newGameApi" placeholder="🔌 API URL (tuỳ chọn)">
    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;font-weight:700;margin:8px 0">
      <label><input type="checkbox" id="newGameVip" checked> VIP</label>
      <label><input type="checkbox" id="newGameHot" checked> HOT</label>
      <label><input type="checkbox" id="newGameNew"> NEW</label>
    </div>
    <button class="green" style="width:100%;padding:12px" onclick="addGameByHtml()">➕ THÊM GAME</button>
    <div id="addGameResult" style="margin-top:10px;font-size:12px;font-weight:700;color:#3b5bfd;text-align:center"></div>`;
  box.appendChild(addForm);

  const listTitle = document.createElement('div');
  listTitle.className = 'adm-section';
  listTitle.innerHTML = `<h4><i class="fa-solid fa-list"></i> Danh sách game (${(cfg.tools || []).length})</h4>`;
  box.appendChild(listTitle);

  (cfg.tools || []).forEach((t, i) => {
    const tr = document.createElement('div');
    tr.className = 'adm-section';
    tr.style.background = '#fff';
    tr.style.borderStyle = 'solid';
    const img = getToolImage(t);
    tr.innerHTML = `
      <h4>${img ? `<img src="${img}" style="width:30px;height:30px;border-radius:6px;object-fit:cover;vertical-align:middle;margin-right:6px">` : '🎲 '} ${esc(t.name)}</h4>
      <input class="adm-input" data-f="name" data-i="${i}" value="${esc(t.name)}" placeholder="Tên game">
      <input class="adm-input" data-f="image" data-i="${i}" value="${esc(t.image || '')}" placeholder="Logo URL">
      <textarea class="adm-textarea" data-f="image_base64" data-i="${i}" placeholder="Hoặc Base64 logo">${esc(t.image_base64 || '')}</textarea>
      <input class="adm-input" data-f="api_url" data-i="${i}" value="${esc(t.api_url || '')}" placeholder="API URL">
      <textarea class="adm-textarea" data-f="html_content" data-i="${i}" placeholder="HTML game" style="min-height:80px;font-size:10px">${esc(t.html_content || '')}</textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px;font-weight:700;margin:6px 0">
        <label><input type="checkbox" data-f="vip" data-i="${i}" ${t.vip ? 'checked' : ''}> VIP</label>
        <label><input type="checkbox" data-f="hot" data-i="${i}" ${t.hot ? 'checked' : ''}> HOT</label>
        <label><input type="checkbox" data-f="is_new" data-i="${i}" ${t.is_new ? 'checked' : ''}> NEW</label>
        <label><input type="checkbox" data-f="maintenance" data-i="${i}" ${t.maintenance ? 'checked' : ''}> BẢO TRÌ</label>
      </div>
      <div style="display:flex;gap:6px">
        <button class="green" style="flex:1" onclick="saveGameAt(${i})">💾 LƯU</button>
        <button class="red" onclick="deleteGameAt(${i})">🗑 XOÁ</button>
      </div>`;
    box.appendChild(tr);
  });
}

function addGameByHtml(){
  const result = document.getElementById('addGameResult');
  const name = document.getElementById('newGameName').value.trim();
  const html = document.getElementById('newGameHtml').value.trim();
  const slugInput = document.getElementById('newGameSlug').value.trim();
  const cat = document.getElementById('newGameCat').value;
  const panel = document.getElementById('newGamePanel').value;
  const image = document.getElementById('newGameImage').value.trim();
  const api = document.getElementById('newGameApi').value.trim();
  const vip = document.getElementById('newGameVip').checked ? 1 : 0;
  const hot = document.getElementById('newGameHot').checked ? 1 : 0;
  const isNew = document.getElementById('newGameNew').checked ? 1 : 0;

  if(!name){ result.textContent = '❌ Chưa nhập tên!'; result.style.color = '#ef4444'; return; }
  if(!html || html.length < 20){ result.textContent = '❌ Chưa dán HTML!'; result.style.color = '#ef4444'; return; }

  let slug = slugInput;
  if(!slug){
    slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36).slice(-4);
  }

  const cfg = loadConfig();
  cfg.tools = cfg.tools || [];
  cfg.tools.push({
    name, slug, cat, panel,
    game_url: '', api_url: api || '',
    image: image || '', image_base64: '',
    html_content: html, hot, vip, is_new: isNew,
    enabled: 1, maintenance: 0
  });
  saveConfig(cfg);

  result.textContent = '✅ Đã thêm game: ' + name;
  result.style.color = '#10b981';

  document.getElementById('newGameName').value = '';
  document.getElementById('newGameSlug').value = '';
  document.getElementById('newGameImage').value = '';
  document.getElementById('newGameHtml').value = '';
  document.getElementById('newGameApi').value = '';

  setTimeout(() => {
    renderAdminGames();
    renderTools();
    alert('✅ Đã thêm game "' + name + '"!');
  }, 500);
}

function saveGameAt(i){
  const cfg = loadConfig();
  const t = cfg.tools[i]; if(!t) return;
  document.querySelectorAll(`[data-i="${i}"]`).forEach(el => {
    const f = el.dataset.f;
    if(!f) return;
    if(el.type === 'checkbox') t[f] = el.checked ? 1 : 0;
    else if(f === 'image_base64'){
      const v = el.value.trim();
      t[f] = v ? (normalizeAvatar(v) || v) : '';
    }
    else t[f] = el.value;
  });
  saveConfig(cfg);
  renderAdminGames(); renderTools();
  alert('✅ Đã lưu game!');
}

function deleteGameAt(i){
  const cfg = loadConfig();
  const t = cfg.tools[i]; if(!t) return;
  if(!confirm('XOÁ GAME: ' + t.name + '?')) return;
  cfg.tools.splice(i, 1);
  saveConfig(cfg);
  renderAdminGames(); renderTools();
  alert('✅ Đã xoá!');
}

/* ============ TAB KEYS ============ */
async function renderAdminKeys(){
  const box = document.getElementById('adminKeysView');
  box.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-weight:700">Đang tải...</div>';

  const add = document.createElement('div');
  add.className = 'adm-section';
  add.innerHTML = `<h4><i class="fa-solid fa-key"></i> Tạo key mới</h4>
    <input class="adm-input" type="number" id="keyDays" value="1" placeholder="Số ngày">
    <input class="adm-input" type="number" id="keyQty" value="1" placeholder="Số lượng">
    <input class="adm-input" id="keyNote" placeholder="Ghi chú">
    <button class="green" onclick="admGenKeys()">🔑 TẠO KEY</button>`;

  const res = await adminApi('key_list');
  box.innerHTML = '';
  box.appendChild(add);

  const list = document.createElement('div');
  list.className = 'adm-section';
  list.innerHTML = `<h4><i class="fa-solid fa-list"></i> Danh sách key (${(res && res.keys) ? res.keys.length : 0})</h4>`;

  ((res && res.keys) || []).forEach(k => {
    const d = document.createElement('div');
    d.style.cssText = 'padding:8px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:6px;background:#fff;font-size:11px';
    d.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
        <div style="font-family:monospace;font-weight:800;color:${k.used?'#94a3b8':'#3b5bfd'};font-size:12px">${esc(k.code)}</div>
        <div style="font-size:10px;font-weight:800;color:${k.used?'#ef4444':'#10b981'}">${k.used ? 'ĐÃ DÙNG' : 'CHƯA DÙNG'}</div>
      </div>
      <div style="color:#64748b;margin-top:3px">${k.days} ngày · ${esc(k.note||'—')}</div>
      ${k.used ? `<div style="color:#94a3b8;font-size:10px">→ ${esc(k.used_by||'')} (${fmtDate(k.used_at)})</div>` : ''}
      <button style="margin-top:5px;padding:4px 8px;border-radius:6px;border:none;background:#ef4444;color:#fff;font-size:10px;font-weight:700;cursor:pointer" onclick="admDelKey('${esc(k.code)}')">Xoá</button>`;
    list.appendChild(d);
  });
  box.appendChild(list);
}

async function admGenKeys(){
  const days = parseInt(document.getElementById('keyDays').value, 10) || 1;
  const qty  = parseInt(document.getElementById('keyQty').value, 10) || 1;
  const note = document.getElementById('keyNote').value.trim();
  const res = await adminApi('key_create', { days, qty, note });
  if(!res || !res.success){ alert('❌ ' + (res?.error || 'Lỗi')); return; }
  alert('✅ Đã tạo ' + qty + ' key:\n\n' + res.keys.join('\n'));
  renderAdminKeys();
}

async function admDelKey(code){
  if(!confirm('Xoá key: ' + code + '?')) return;
  const res = await adminApi('key_delete', { code });
  if(!res || !res.success){ alert('❌ ' + (res?.error || 'Lỗi')); return; }
  renderAdminKeys();
}
