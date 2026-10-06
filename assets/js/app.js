/* ============ APP MAIN ============ */

document.addEventListener('DOMContentLoaded', () => {
  Store.initAdmin();

  const cur = Store.getCurrent();
  if (cur && Store.getUsers()[cur.email]) {
    enterApp();
  } else {
    document.getElementById('login-screen').style.display = '';
    document.getElementById('app').style.display = 'none';
  }

  // Enter để đăng nhập
  ['loginEmail','loginPass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });
  ['regName','regEmail','regPass','regPass2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
  });

  startClock();
});

/* ===== VÀO APP ===== */
function enterApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = '';

  const users = Store.getUsers();
  const cur = Store.getCurrent();
  const u = users[cur.email];
  if (!u) { doLogout(); return; }

  // Hiện/ẩn nút admin
  const isAdmin = u.role === 'admin';
  const float = document.getElementById('adminFloat');
  const diAdm = document.getElementById('diAdmin');
  if (float) float.style.display = isAdmin ? '' : 'none';
  if (diAdm) diAdm.style.display = isAdmin ? '' : 'none';

  // Avatar
  const av = u.avatar || defaultAvatar();
  document.getElementById('hdrAvatar').src = av;
  document.getElementById('profAvatar').src = av;
  document.getElementById('drawerAvatar').src = av;
  document.getElementById('loginAvatarImg').src = av;

  document.getElementById('drawerName').textContent = u.name;
  document.getElementById('drawerEmail').textContent = u.email;

  // Badge pending cho admin
  if (isAdmin) {
    const pending = Store.getDeposits().filter(d => d.status === 'pending').length;
    const b = document.getElementById('pendBadge');
    if (b) { b.textContent = pending; b.style.display = pending ? 'inline-block' : 'none'; }
  }

  buildBankInfo();
  buildPackages();
  buildTools();
  renderAll();
  showPage('home');
}

/* ===== ĐIỀU HƯỚNG ===== */
function showPage(p) {
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  const el = document.getElementById('page-' + p);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.page === p));
  document.getElementById('appContent').scrollTop = 0;
}

/* ===== ĐỒNG HỒ ===== */
function startClock() {
  setInterval(() => {
    const d = new Date();
    const t = d.toLocaleTimeString('vi-VN', { hour12: false });
    const dt = d.toLocaleDateString('vi-VN');
    const a = document.getElementById('liveClock'); if (a) a.textContent = t;
    const b = document.getElementById('liveDate'); if (b) b.textContent = dt;
  }, 1000);
}

/* ===== RENDER ===== */
function renderAll() {
  const cur = Store.getCurrent();
  if (!cur) return;
  const users = Store.getUsers();
  const u = users[cur.email];
  if (!u) return;

  const bal = fmtVnd(u.balance || 0);
  ['hdrBalance','curBalance','depBalance','vipBalance','profBalance'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = bal;
  });

  document.getElementById('profName').textContent = u.name;
  document.getElementById('profRole').textContent = u.role === 'admin' ? 'ADMIN' : 'THÀNH VIÊN';
  document.getElementById('profJoined').textContent = new Date(u.joined).toLocaleDateString('vi-VN');
  document.getElementById('profLastLogin').textContent = new Date(u.lastLogin).toLocaleString('vi-VN');
  document.getElementById('profIP').textContent = u.ip || '—';

  const hasVip = u.expiry && u.expiry > Date.now();
  document.getElementById('curPackage').textContent = hasVip ? 'VIP' : 'Chưa có';
  document.getElementById('vipExpiry').textContent = hasVip ? new Date(u.expiry).toLocaleString('vi-VN') : 'Chưa kích hoạt';
  document.getElementById('depStatus').textContent = hasVip ? 'VIP đến ' + new Date(u.expiry).toLocaleDateString('vi-VN') : 'Chưa có key';
}

/* ===== BANK INFO ===== */
function buildBankInfo() {
  const b = CONFIG.bank;
  document.getElementById('bankInfo').innerHTML = `
    <div class="section-title">Thông tin chuyển khoản</div>
    <div class="pay-method" style="cursor:default">
      <div class="pay-icon"><i class="fa-solid fa-building-columns"></i></div>
      <div class="pay-info">
        <div class="name">${b.name}</div>
        <div class="desc">STK: <b>${b.account}</b> — ${b.owner}</div>
      </div>
    </div>
  `;
}

/* ===== PACKAGES ===== */
function buildPackages() {
  const el = document.getElementById('pkgList');
  if (!el) return;
  el.innerHTML = CONFIG.packages.map(p => `
    <div class="pay-method" onclick="buyPackage('${p.id}')">
      <div class="pay-icon yellow"><i class="fa-solid fa-crown"></i></div>
      <div class="pay-info">
        <div class="name">${p.name}</div>
        <div class="desc">${p.days} ngày • <b>${fmtVnd(p.price)}</b></div>
      </div>
      <i class="fa-solid fa-chevron-right pay-arrow"></i>
    </div>
  `).join('');
}

async function buyPackage(id) {
  const pkg = CONFIG.packages.find(x => x.id === id);
  if (!pkg) return;
  const cur = Store.getCurrent();
  const users = Store.getUsers();
  const u = users[cur.email];
  if ((u.balance || 0) < pkg.price) { alert('Số dư không đủ! Vui lòng nạp thêm.'); showPage('deposit'); return; }
  if (!confirm('Mua ' + pkg.name + ' với giá ' + fmtVnd(pkg.price) + '?')) return;

  u.balance -= pkg.price;
  Store.saveUsers(users);

  // Sinh key tự động
  const keyCode = genKey();
  const keys = Store.getKeys();
  keys[keyCode] = { days: pkg.days, used: false, boundIP: '', createdAt: Date.now(), createdBy: cur.email };
  Store.saveKeys(keys);

  alert('✅ Mua thành công!\nKey của bạn: ' + keyCode + '\nSao chép và nhập vào "Nhập Key kích hoạt".');
  renderAll();
}

function genKey() {
  const s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({length:4}, () => s[Math.floor(Math.random()*s.length)]).join('');
  return seg() + '-' + seg() + '-' + seg();
}

/* ===== TOOLS ===== */
function buildTools() {
  const el = document.getElementById('toolList');
  if (!el) return;
  document.getElementById('toolCount').textContent = CONFIG.tools.length;
  el.innerHTML = CONFIG.tools.map(t => `
    <div class="pay-method" onclick="openTool('${t.id}')">
      <div class="pay-icon purple"><i class="fa-solid fa-cube"></i></div>
      <div class="pay-info"><div class="name">${t.name}</div><div class="desc">${t.cat}</div></div>
      <i class="fa-solid fa-chevron-right pay-arrow"></i>
    </div>
  `).join('');
}

function openTool(id) {
  const t = CONFIG.tools.find(x => x.id === id);
  if (!t) return;
  const cur = Store.getCurrent();
  const u = Store.getUsers()[cur.email];
  const hasVip = u.expiry && u.expiry > Date.now();
  if (!hasVip && u.role !== 'admin') { alert('Cần kích hoạt VIP để dùng tool!'); openKeyModal(); return; }
  document.getElementById('gameFrame').src = t.url;
  document.getElementById('gsName').textContent = t.name;
  document.getElementById('game-screen').style.display = 'flex';
}

function closeGame() {
  document.getElementById('game-screen').style.display = 'none';
  document.getElementById('gameFrame').src = 'about:blank';
}

/* ===== NẠP TIỀN ===== */
function openDepositModal() {
  document.getElementById('depAmount').value = '';
  document.getElementById('depNote').value = '';
  openModal('depositModal');
}

async function submitDeposit() {
  const amount = Number(document.getElementById('depAmount').value);
  const note = document.getElementById('depNote').value.trim();
  if (!amount || amount < 10000) { alert('Số tiền tối thiểu 10.000đ'); return; }

  const cur = Store.getCurrent();
  const ip = await getIP();

  const deps = Store.getDeposits();
  deps.push({
    id: 'D' + Date.now() + Math.floor(Math.random()*1000),
    email: cur.email,
    amount: amount,
    note: note,
    ip: ip,
    time: Date.now(),
    status: 'pending'
  });
  Store.saveDeposits(deps);

  alert('✅ Đã gửi yêu cầu nạp ' + fmtVnd(amount) + '\nAdmin sẽ duyệt trong 24h.');
  closeModal('depositModal');
  renderAll();
}

/* ===== LỊCH SỬ ===== */
function openHistoryDeposit() {
  const cur = Store.getCurrent();
  const deps = Store.getDeposits().filter(d => d.email === cur.email).reverse();
  let html = deps.length ? '' : '<p style="text-align:center;color:#94a3b8">Chưa có giao dịch</p>';
  deps.forEach(d => {
    const color = d.status === 'pending' ? '#f59e0b' : (d.status === 'approved' ? '#16a34a' : '#dc2626');
    const txt = d.status === 'pending' ? '⏳ Chờ duyệt' : (d.status === 'approved' ? '✅ Đã duyệt' : '❌ Từ chối');
    html += `<div style="border-left:3px solid ${color};padding:8px;margin-bottom:6px;background:#f8fafc;border-radius:6px">
      <div style="font-weight:700;color:${color}">${txt}</div>
      <div>${fmtVnd(d.amount)}</div>
      <div style="font-size:11px;color:#94a3b8">${new Date(d.time).toLocaleString('vi-VN')}</div>
    </div>`;
  });
  document.getElementById('histTitle').textContent = 'Lịch sử nạp tiền';
  document.getElementById('histContent').innerHTML = html;
  openModal('historyModal');
}

function openHistoryKey() {
  const cur = Store.getCurrent();
  const hist = Store.getHistory().filter(h => h.type === 'key' && h.email === cur.email);
  let html = hist.length ? '' : '<p style="text-align:center;color:#94a3b8">Chưa có lịch sử</p>';
  hist.forEach(h => {
    html += `<div style="border-left:3px solid #8b5cf6;padding:8px;margin-bottom:6px;background:#f8fafc;border-radius:6px">
      <div style="font-family:monospace;font-weight:700">${esc(h.key)}</div>
      <div>+${h.days} ngày</div>
      <div style="font-size:11px;color:#94a3b8">${new Date(h.time).toLocaleString('vi-VN')}</div>
    </div>`;
  });
  document.getElementById('histTitle').textContent = 'Lịch sử mua key';
  document.getElementById('histContent').innerHTML = html;
  openModal('historyModal');
}

/* ===== MODAL HELPERS ===== */
function openModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

function openKeyModal() {
  document.getElementById('keyInput').value = '';
  document.getElementById('keyErr').textContent = '';
  openModal('keyModal');
}

function openAvatarModal() {
  document.getElementById('avStatus').textContent = '';
  document.getElementById('avBase64Input').value = '';
  openModal('avatarModal');
}

function saveAvatar() {
  const val = document.getElementById('avBase64Input').value.trim();
  if (!val) { document.getElementById('avStatus').textContent = 'Chưa có dữ liệu'; return; }
  const src = val.startsWith('data:') ? val : 'data:image/png;base64,' + val;
  const cur = Store.getCurrent();
  const users = Store.getUsers();
  users[cur.email].avatar = src;
  Store.saveUsers(users);
  document.getElementById('hdrAvatar').src = src;
  document.getElementById('profAvatar').src = src;
  document.getElementById('drawerAvatar').src = src;
  document.getElementById('avStatus').textContent = '✅ Đã lưu';
  setTimeout(() => closeModal('avatarModal'), 800);
}

function resetAvatar() {
  const cur = Store.getCurrent();
  const users = Store.getUsers();
  users[cur.email].avatar = '';
  Store.saveUsers(users);
  const av = defaultAvatar();
  document.getElementById('hdrAvatar').src = av;
  document.getElementById('profAvatar').src = av;
  document.getElementById('drawerAvatar').src = av;
  document.getElementById('avStatus').textContent = '✅ Đã reset';
}

function defaultAvatar() {
  return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect fill='%23e0f2fe' width='200' height='200'/><text x='50%25' y='56%25' font-size='90' text-anchor='middle' dominant-baseline='middle'>🎀</text></svg>";
}

/* ===== DRAWER ===== */
function openDrawer() {
  document.getElementById('drawer').classList.add('show');
  document.getElementById('drawerMask').classList.add('show');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('show');
  document.getElementById('drawerMask').classList.remove('show');
}

/* ===== MUSIC (đơn giản) ===== */
let _musicOn = false;
function toggleMusic() {
  _musicOn = !_musicOn;
  document.getElementById('musicBtn').innerHTML = _musicOn
    ? '<i class="fa-solid fa-volume-high"></i>'
    : '<i class="fa-solid fa-volume-xmark"></i>';
}

/* ===== UTILS ===== */
function fmtVnd(n) { return (Number(n) || 0).toLocaleString('vi-VN') + 'đ'; }
function esc(s) { return String(s == null ? '' : s).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }

/* ===== DRAG PANEL ===== */
(function initDrag() {
  document.addEventListener('DOMContentLoaded', () => {
    const p = document.getElementById('dragPanel');
    if (!p) return;
    let sx, sy, ox, oy, dragging = false;
    p.addEventListener('mousedown', e => {
      if (e.target.tagName === 'BUTTON') return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      const r = p.getBoundingClientRect();
      ox = r.left; oy = r.top;
      p.style.left = ox + 'px'; p.style.top = oy + 'px';
      p.style.right = 'auto';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      p.style.left = (ox + e.clientX - sx) + 'px';
      p.style.top = (oy + e.clientY - sy) + 'px';
    });
    document.addEventListener('mouseup', () => dragging = false);
  });
})();
