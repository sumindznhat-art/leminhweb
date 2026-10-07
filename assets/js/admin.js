/* ============================================================
   assets/js/admin.js — ADMIN PANEL
   ============================================================ */

function openAdmin() {
  const u = DB.cur();
  const cur = DB.users()[u.email];
  if (!cur || cur.role !== 'admin') { alert('Không có quyền!'); return; }
  switchAdminTab('pending');
  openModal('adminPanel');
}

function switchAdminTab(t) {
  document.querySelectorAll('.admin-tab').forEach(x => x.classList.toggle('active', x.dataset.atab === t));
  ['pending','users','keys','history'].forEach(x => {
    $('admin' + x.charAt(0).toUpperCase() + x.slice(1) + 'View').classList.toggle('hide', x !== t);
  });
  if (t === 'pending') renderAdminPending();
  if (t === 'users')   renderAdminUsers();
  if (t === 'keys')    renderAdminKeys();
  if (t === 'history') renderAdminHistory();
}

/* DUYỆT TIỀN */
function renderAdminPending() {
  const deps = DB.deps().filter(d => d.status === 'pending').reverse();
  const el = $('adminPendingView');
  if (!deps.length) { el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px">✅ Không có yêu cầu nào</p>'; return; }
  el.innerHTML = `<p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Có <b style="color:#dc2626">${deps.length}</b> yêu cầu chờ duyệt</p>` +
    deps.map(d => `<div class="adm-row" style="border-left:4px solid #f59e0b">
      <b>${esc(d.email)}</b>
      <div style="font-size:18px;color:#dc2626;font-weight:800;margin:4px 0">${fmt(d.amount)}</div>
      <div style="font-size:12px;color:#64748b">🌐 IP: <code>${esc(d.ip)}</code></div>
      <div style="font-size:12px;color:#64748b">📝 ${esc(d.note || '(không có ghi chú)')}</div>
      <div style="font-size:11px;color:#94a3b8">🕐 ${new Date(d.time).toLocaleString('vi-VN')}</div>
      <div style="margin-top:8px">
        <button class="btn-sm btn-ok" onclick="approveDep('${d.id}')">✓ DUYỆT</button>
        <button class="btn-sm btn-no" onclick="rejectDep('${d.id}')">✕ TỪ CHỐI</button>
      </div>
    </div>`).join('');
}

function approveDep(id) {
  if (!confirm('Xác nhận ĐÃ NHẬN ĐƯỢC TIỀN và duyệt?')) return;
  const deps = DB.deps();
  const d = deps.find(x => x.id === id);
  if (!d || d.status !== 'pending') return;

  d.status = 'approved'; d.approvedAt = Date.now();
  DB.setDeps(deps);

  const users = DB.users();
  if (users[d.email]) {
    users[d.email].balance = (users[d.email].balance || 0) + Number(d.amount);
    DB.setUsers(users);
  }

  alert('✅ Đã duyệt +' + fmt(d.amount) + ' cho ' + d.email);
  renderAdminPending();
  renderAll();
}

function rejectDep(id) {
  if (!confirm('Từ chối yêu cầu này?')) return;
  const deps = DB.deps();
  const d = deps.find(x => x.id === id);
  if (!d) return;
  d.status = 'rejected'; d.rejectedAt = Date.now();
  DB.setDeps(deps);
  alert('❌ Đã từ chối');
  renderAdminPending();
}

/* USERS + IP */
function renderAdminUsers() {
  const users = DB.users();
  const list = Object.values(users);
  $('adminUsersView').innerHTML = `<p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Tổng: <b>${list.length}</b> user</p>` +
    list.map(u => `<div class="adm-row">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b>${esc(u.name)}</b>
        <span class="badge ${u.role==='admin'?'b-no':'b-ok'}">${u.role.toUpperCase()}</span>
      </div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">📧 ${esc(u.email)}</div>
      <div style="font-size:12px;color:#64748b">🌐 IP: <code>${esc(u.ip||'—')}</code></div>
      <div style="font-size:12px;color:#64748b">💰 Số dư: <b style="color:#16a34a">${fmt(u.balance)}</b></div>
      <div style="font-size:12px;color:#64748b">⏰ VIP: ${u.expiry && u.expiry > Date.now() ? new Date(u.expiry).toLocaleDateString('vi-VN') : '—'}</div>
      <div style="margin-top:6px">
        <button class="btn-sm btn-wr" onclick="adminResetIP('${u.email}')">🔄 Reset IP</button>
        <button class="btn-sm btn-bl" onclick="adminAddBalance('${u.email}')">💰 Cộng tiền</button>
      </div>
    </div>`).join('');
}

function adminResetIP(email) {
  if (!confirm('Reset IP cho ' + email + '?')) return;
  const users = DB.users();
  users[email].ip = '';
  DB.setUsers(users);
  alert('✅ Đã reset IP. User cần đăng nhập lại.');
  renderAdminUsers();
}

function adminAddBalance(email) {
  const amt = prompt('Nhập số tiền muốn cộng (âm để trừ):', '50000');
  if (!amt) return;
  const n = Number(amt);
  if (isNaN(n)) return alert('Số không hợp lệ');

  const users = DB.users();
  users[email].balance = (users[email].balance || 0) + n;
  DB.setUsers(users);
  alert('✅ Đã ' + (n > 0 ? 'cộng' : 'trừ') + ' ' + fmt(Math.abs(n)) + ' cho ' + email);
  renderAdminUsers();
  renderAll();
}

/* KEYS + MÁY */
function renderAdminKeys() {
  const keys = DB.keys();
  const list = Object.entries(keys);
  $('adminKeysView').innerHTML = `
    <div style="margin-bottom:10px;text-align:center">
      <button class="btn-sm btn-ok" onclick="adminGenKey()">➕ Tạo Key mới</button>
    </div>
    <p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Tổng: <b>${list.length}</b> key</p>` +
    (list.length ? list.map(([k, v]) => `<div class="adm-row">
      <b style="font-family:monospace;color:#0284c7">${esc(k)}</b>
      <div style="font-size:12px;color:#64748b;margin-top:4px">⏱ ${v.days} ngày • ${v.used ? '🔴 Đã dùng' : '🟢 Chưa dùng'}</div>
      ${v.boundIP ? `<div style="font-size:12px;color:#64748b">🖥 Máy (IP): <code>${esc(v.boundIP)}</code></div>` : ''}
      ${v.usedBy ? `<div style="font-size:12px;color:#64748b">👤 Bởi: ${esc(v.usedBy)}</div>` : ''}
      ${v.boundIP ? `<button class="btn-sm btn-wr" style="margin-top:6px" onclick="adminUnbindKey('${k}')">🔓 Gỡ khỏi máy</button>` : ''}
    </div>`).join('') : '<p style="text-align:center;color:#94a3b8">Chưa có key</p>');
}

function adminGenKey() {
  const days = Number(prompt('Số ngày của key:', '30'));
  if (!days || days < 1) return;
  const qty = Number(prompt('Số lượng key:', '1'));
  if (!qty || qty < 1) return;

  const keys = DB.keys();
  const newKeys = [];
  for (let i = 0; i < qty; i++) {
    const k = genKey();
    keys[k] = { days, used: false, boundIP: '', usedBy: '', usedAt: 0, createdAt: Date.now() };
    newKeys.push(k);
  }
  DB.setKeys(keys);

  alert('✅ Đã tạo ' + newKeys.length + ' key ' + days + ' ngày:\n\n' + newKeys.join('\n'));
  navigator.clipboard.writeText(newKeys.join('\n')).catch(() => {});
  renderAdminKeys();
}

function adminUnbindKey(k) {
  if (!confirm('Gỡ key ' + k + ' khỏi máy?')) return;
  const keys = DB.keys();
  keys[k].used = false;
  keys[k].boundIP = '';
  keys[k].usedBy = '';
  DB.setKeys(keys);
  alert('✅ Đã gỡ');
  renderAdminKeys();
}

/* LỊCH SỬ */
function renderAdminHistory() {
  const deps = DB.deps().slice().reverse();
  const keyHist = DB.hist();
  let all = [];
  deps.forEach(d => all.push({ type: 'deposit', ...d }));
  keyHist.forEach(h => { if (h.type === 'key') all.push({ type: 'key', ...h }); });
  all.sort((a, b) => b.time - a.time);

  const el = $('adminHistoryView');
  if (!all.length) { el.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px">Chưa có giao dịch</p>'; return; }

  el.innerHTML = all.slice(0, 50).map(h => {
    if (h.type === 'deposit') {
      const color = h.status === 'approved' ? '#16a34a' : (h.status === 'rejected' ? '#dc2626' : '#f59e0b');
      const icon = h.status === 'approved' ? '✅' : (h.status === 'rejected' ? '❌' : '⏳');
      return `<div class="adm-row" style="border-left:3px solid ${color}">
        <b>${icon} NẠP TIỀN</b> — ${esc(h.email)}
        <div style="font-size:12px;margin-top:2px">Số tiền: <b style="color:${color}">${fmt(h.amount)}</b></div>
        <div style="font-size:11px;color:#94a3b8">IP: ${esc(h.ip)} • ${new Date(h.time).toLocaleString('vi-VN')}</div>
      </div>`;
    } else {
      return `<div class="adm-row" style="border-left:3px solid #8b5cf6">
        <b>🔑 KÍCH HOẠT KEY</b> — ${esc(h.email)}
        <div style="font-size:12px;margin-top:2px">Key: <code>${esc(h.key)}</code> (+${h.days} ngày)</div>
        <div style="font-size:11px;color:#94a3b8">IP: ${esc(h.ip)} • ${new Date(h.time).toLocaleString('vi-VN')}</div>
      </div>`;
    }
  }).join('');
}
