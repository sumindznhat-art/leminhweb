/* ============================================================
   assets/js/app.js — KHỞI ĐỘNG APP
   ============================================================ */

/* ============ RENDER ALL ============ */
function renderAll() {
  const u = DB.cur();
  if (!u) return;
  const cur = DB.users()[u.email];
  if (!cur) return;

  const av = cur.avatar || defaultAvatar();
  const bal = fmt(cur.balance || 0);

  ['hdrAvatar','profAvatar','drawerAvatar','loginAvatarImg'].forEach(id => { const e = $(id); if (e) e.src = av; });
  ['hdrBalance','curBalance','depBalance','vipBalance','profBalance'].forEach(id => { const e = $(id); if (e) e.textContent = bal; });

  $('drawerName').textContent = cur.name;
  $('drawerEmail').textContent = cur.email;
  $('profName').textContent = cur.name;
  $('profEmail').textContent = cur.email;
  $('profRole').textContent = cur.role === 'admin' ? 'ADMIN' : 'THÀNH VIÊN';
  $('profIP').textContent = cur.ip || '—';
  $('profJoined').textContent = new Date(cur.joined).toLocaleDateString('vi-VN');

  const hasVip = cur.expiry && cur.expiry > Date.now();
  $('curPackage').textContent = hasVip ? 'VIP Active' : 'Chưa có';
  $('vipExpiry').textContent = hasVip ? new Date(cur.expiry).toLocaleDateString('vi-VN') : 'Chưa kích hoạt';
  $('profExpiry').textContent = hasVip ? new Date(cur.expiry).toLocaleString('vi-VN') : 'Chưa kích hoạt';
  $('depStatus').textContent = hasVip ? 'VIP đến ' + new Date(cur.expiry).toLocaleDateString('vi-VN') : 'Chưa có VIP';

  /* Bank info */
  $('bankName').textContent = CONFIG.bank.name;
  $('bankAcc').textContent = CONFIG.bank.account;
  $('bankOwner').textContent = CONFIG.bank.owner;

  const isAdmin = cur.role === 'admin';
  $('diAdmin').style.display = isAdmin ? '' : 'none';
  $('adminFloat').style.display = isAdmin ? 'block' : 'none';

  if (isAdmin) {
    const pend = DB.deps().filter(d => d.status === 'pending').length;
    $('pendBadge').textContent = pend;
    $('pendBadge').style.display = pend ? 'inline-block' : 'none';
  }
}

/* ============ ENTER APP ============ */
function enterApp() {
  $('loginScreen').style.display = 'none';
  $('app').style.display = 'block';
  buildTools();
  buildPackages();
  renderAll();
  showPage('home');
}

function showPage(p) {
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  const el = $('page-' + p);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.p === p));
  window.scrollTo(0, 0);
}

/* ============ MODAL / DRAWER ============ */
function openModal(id) { $(id).classList.add('show'); }
function closeModal(id) { $(id).classList.remove('show'); }
function openDrawer() { $('drawer').classList.add('show'); $('drawerMask').classList.add('show'); }
function closeDrawer() { $('drawer').classList.remove('show'); $('drawerMask').classList.remove('show'); }

/* ============ AVATAR ============ */
function saveAvatar() {
  const v = $('avInput').value.trim();
  if (!v) { $('avStatus').textContent = 'Chưa có dữ liệu'; return; }
  const src = v.startsWith('data:') ? v : (v.startsWith('http') ? v : 'data:image/png;base64,' + v);
  const u = DB.cur();
  const users = DB.users();
  users[u.email].avatar = src;
  DB.setUsers(users);
  DB.setCur(users[u.email]);
  $('avStatus').textContent = '✅ Đã lưu';
  renderAll();
  setTimeout(() => { closeModal('avatarModal'); $('avStatus').textContent = ''; }, 800);
}
function resetAvatar() {
  const u = DB.cur();
  const users = DB.users();
  users[u.email].avatar = '';
  DB.setUsers(users);
  DB.setCur(users[u.email]);
  renderAll();
  $('avStatus').textContent = '✅ Đã reset';
  setTimeout(() => { closeModal('avatarModal'); $('avStatus').textContent = ''; }, 800);
}

/* ============ ĐỒNG HỒ ============ */
setInterval(() => {
  const d = new Date();
  const t = d.toLocaleTimeString('vi-VN', { hour12: false });
  const dt = d.toLocaleDateString('vi-VN');
  if ($('liveClock')) $('liveClock').textContent = t;
  if ($('liveDate')) $('liveDate').textContent = dt;
}, 1000);

/* ============ AUTO LOGIN + ENTER KEY ============ */
document.addEventListener('DOMContentLoaded', () => {
  /* Enter để đăng nhập */
  ['loginEmail','loginPass'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  });
  ['regName','regEmail','regPass','regPass2'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
  });

  /* Auto login nếu đã có session */
  const u = DB.cur();
  if (u && DB.users()[u.email]) {
    enterApp();
  }
});

/* ============ LOG ============ */
console.log('%c🔌 CHẾ ĐỘ: ' + (CONFIG.OFFLINE_MODE ? 'OFFLINE (localStorage)' : 'ONLINE (' + CONFIG.API_BASE + ')'),
  'color:#f59e0b;font-weight:bold;font-size:13px');
console.log('%c👑 Admin: ' + CONFIG.adminEmail + ' / ' + CONFIG.adminPass, 'color:#dc2626;font-weight:bold');
