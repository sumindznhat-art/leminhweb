/* ============ ADMIN — CHỈ DUYỆT + XEM ============ */

function openAdmin() {
  const cur = Store.getCurrent();
  if (!cur) { alert('Chưa đăng nhập'); return; }
  const users = Store.getUsers();
  const u = users[cur.email];
  if (!u || u.role !== 'admin') { alert('Không có quyền Admin!'); return; }

  renderAdminUsers();
  renderAdminPending();
  renderAdminKeys();
  renderAdminHistory();
  openModal('adminPanel');
}

function switchAdminTab(t) {
  document.querySelectorAll('.admin-tab').forEach(x => x.classList.toggle('active', x.dataset.atab === t));
  const map = { users: 'adminUsersView', pending: 'adminPendingView', keys: 'adminKeysView', history: 'adminHistoryView' };
  Object.values(map).forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById(map[t]).style.display = '';
}

/* ===== DANH SÁCH USER + IP ===== */
function renderAdminUsers() {
  const users = Store.getUsers();
  const list = Object.values(users);
  if (!list.length) { document.getElementById('adminUsersView').innerHTML = '<p>Không có user</p>'; return; }

  let html = `<p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Tổng: <b>${list.length}</b> user</p>`;
  list.forEach(u => {
    const exp = u.expiry ? new Date(u.expiry).toLocaleDateString('vi-VN') : '—';
    html += `
      <div class="adm-row" style="border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin-bottom:8px;background:#fff">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b>${esc(u.name)}</b>
          <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${u.role==='admin'?'#fee2e2':'#dbeafe'};color:${u.role==='admin'?'#dc2626':'#0284c7'};font-weight:700">${(u.role||'user').toUpperCase()}</span>
        </div>
        <div style="font-size:12px;color:#64748b;margin-top:4px">📧 ${esc(u.email)}</div>
        <div style="font-size:12px;color:#64748b">🌐 IP: <code>${esc(u.ip||'—')}</code></div>
        <div style="font-size:12px;color:#64748b">💰 Số dư: <b style="color:#16a34a">${fmtVnd(u.balance||0)}</b></div>
        <div style="font-size:12px;color:#64748b">⏰ Hạn VIP: ${exp}</div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="adm-btn" style="padding:6px;font-size:11px" onclick="adminResetIP('${u.email}')"><i class="fa-solid fa-rotate"></i> Reset IP (đổi máy)</button>
        </div>
      </div>`;
  });
  document.getElementById('adminUsersView').innerHTML = html;
}

/* ===== RESET IP — cho phép user đổi thiết bị ===== */
function adminResetIP(email) {
  if (!confirm('Reset IP cho ' + email + '?\nUser sẽ phải đăng nhập lại và khóa vào IP mới.')) return;
  const users = Store.getUsers();
  if (!users[email]) return;
  users[email].ip = '';
  Store.saveUsers(users);
  alert('Đã reset IP cho ' + email);
  renderAdminUsers();
}

/* ===== DUYỆT TIỀN ===== */
function renderAdminPending() {
  const deps = Store.getDeposits().filter(d => d.status === 'pending');
  if (!deps.length) { document.getElementById('adminPendingView').innerHTML = '<p style="text-align:center;color:#94a3b8">Không có yêu cầu nào</p>'; return; }

  let html = `<p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Có <b style="color:#dc2626">${deps.length}</b> yêu cầu chờ duyệt</p>`;
  deps.reverse().forEach(d => {
    html += `
      <div class="adm-row" style="border:2px solid #fde68a;border-radius:10px;padding:10px;margin-bottom:8px;background:#fffbeb">
        <div><b>${esc(d.email)}</b></div>
        <div style="font-size:14px;color:#dc2626;font-weight:800;margin:4px 0">💵 ${fmtVnd(d.amount)}</div>
        <div style="font-size:12px;color:#64748b">🌐 IP yêu cầu: <code>${esc(d.ip||'—')}</code></div>
        <div style="font-size:12px;color:#64748b">📝 ${esc(d.note||'(không có ghi chú)')}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:2px">🕐 ${new Date(d.time).toLocaleString('vi-VN')}</div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <button class="adm-btn" style="background:linear-gradient(135deg,#22c55e,#16a34a);flex:1" onclick="approveDeposit('${d.id}')"><i class="fa-solid fa-check"></i> DUYỆT</button>
          <button class="adm-btn" style="background:linear-gradient(135deg,#ef4444,#dc2626);flex:1" onclick="rejectDeposit('${d.id}')"><i class="fa-solid fa-xmark"></i> TỪ CHỐI</button>
        </div>
      </div>`;
  });
  document.getElementById('adminPendingView').innerHTML = html;

  // Cập nhật badge
  const badge = document.getElementById('pendBadge');
  if (badge) { badge.textContent = deps.length; badge.style.display = deps.length ? 'inline-block' : 'none'; }
}

function approveDeposit(id) {
  if (!confirm('Xác nhận ĐÃ NHẬN ĐƯỢC TIỀN và duyệt?')) return;
  const deps = Store.getDeposits();
  const d = deps.find(x => x.id === id);
  if (!d || d.status !== 'pending') return;

  d.status = 'approved';
  d.approvedAt = Date.now();
  Store.saveDeposits(deps);

  const users = Store.getUsers();
  if (users[d.email]) {
    users[d.email].balance = (users[d.email].balance || 0) + Number(d.amount);
    Store.saveUsers(users);
  }

  // Lịch sử
  const hist = Store.getHistory();
  hist.unshift({ type: 'deposit', email: d.email, amount: d.amount, ip: d.ip, time: Date.now(), status: 'approved' });
  Store.saveHistory(hist);

  alert('✅ Đã duyệt! +' + fmtVnd(d.amount) + ' cho ' + d.email);
  renderAdminPending();
  renderAdminUsers();
  renderAdminHistory();
  if (typeof renderAll === 'function') renderAll();
}

function rejectDeposit(id) {
  if (!confirm('Từ chối yêu cầu này?')) return;
  const deps = Store.getDeposits();
  const d = deps.find(x => x.id === id);
  if (!d) return;

  d.status = 'rejected';
  d.rejectedAt = Date.now();
  Store.saveDeposits(deps);

  const hist = Store.getHistory();
  hist.unshift({ type: 'deposit', email: d.email, amount: d.amount, ip: d.ip, time: Date.now(), status: 'rejected' });
  Store.saveHistory(hist);

  alert('❌ Đã từ chối');
  renderAdminPending();
  renderAdminHistory();
}

/* ===== KEYS + MÁY ===== */
function renderAdminKeys() {
  const keys = Store.getKeys();
  const list = Object.entries(keys);
  let html = `<p style="text-align:center;font-size:12px;color:#64748b;margin-bottom:8px">Tổng: <b>${list.length}</b> key</p>`;

  if (!list.length) {
    html += '<p style="text-align:center;color:#94a3b8">Chưa có key nào</p>';
  } else {
    list.forEach(([k, v]) => {
      const used = v.used ? '🔴 Đã dùng' : '🟢 Chưa dùng';
      html += `
        <div class="adm-row" style="border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin-bottom:8px;background:#fff">
          <div><b style="font-family:monospace;color:#0284c7">${esc(k)}</b></div>
          <div style="font-size:12px;color:#64748b">⏱ ${v.days} ngày • ${used}</div>
          ${v.boundIP ? `<div style="font-size:12px;color:#64748b">🖥 Máy (IP): <code>${esc(v.boundIP)}</code></div>` : ''}
          ${v.usedBy ? `<div style="font-size:12px;color:#64748b">👤 Dùng bởi: ${esc(v.usedBy)}</div>` : ''}
          ${v.usedAt ? `<div style="font-size:11px;color:#94a3b8">🕐 ${new Date(v.usedAt).toLocaleString('vi-VN')}</div>` : ''}
          ${v.boundIP ? `<button class="adm-btn" style="padding:6px;font-size:11px;margin-top:6px;background:linear-gradient(135deg,#f59e0b,#f97316)" onclick="adminUnbindKey('${k}')"><i class="fa-solid fa-unlink"></i> Gỡ khỏi máy (cho dùng lại)</button>` : ''}
        </div>`;
    });
  }
  document.getElementById('adminKeysView').innerHTML = html;
}

function adminUnbindKey(k) {
  if (!confirm('Gỡ key ' + k + ' khỏi máy?\nKey sẽ có thể kích hoạt lại trên máy khác.')) return;
  const keys = Store.getKeys();
  if (!keys[k]) return;
  keys[k].used = false;
  keys[k].boundIP = '';
  keys[k].usedBy = '';
  keys[k].usedAt = 0;
  Store.saveKeys(keys);
  alert('Đã gỡ key');
  renderAdminKeys();
}

/* ===== LỊCH SỬ ===== */
function renderAdminHistory() {
  const hist = Store.getHistory();
  if (!hist.length) { document.getElementById('adminHistoryView').innerHTML = '<p style="text-align:center;color:#94a3b8">Chưa có giao dịch</p>'; return; }

  let html = '';
  hist.slice(0, 50).forEach(h => {
    if (h.type === 'deposit') {
      const color = h.status === 'approved' ? '#16a34a' : '#dc2626';
      const icon = h.status === 'approved' ? '✅' : '❌';
      html += `<div class="adm-row" style="border-left:3px solid ${color};padding:8px;margin-bottom:6px;background:#f8fafc">
        <div><b>${icon} NẠP TIỀN</b> — ${esc(h.email)}</div>
        <div style="font-size:12px">Số tiền: <b style="color:${color}">${fmtVnd(h.amount)}</b></div>
        <div style="font-size:11px;color:#94a3b8">IP: ${esc(h.ip||'—')} • ${new Date(h.time).toLocaleString('vi-VN')}</div>
      </div>`;
    } else if (h.type === 'key') {
      html += `<div class="adm-row" style="border-left:3px solid #8b5cf6;padding:8px;margin-bottom:6px;background:#f8fafc">
        <div><b>🔑 KÍCH HOẠT KEY</b> — ${esc(h.email)}</div>
        <div style="font-size:12px">Key: <code>${esc(h.key)}</code> (+${h.days} ngày)</div>
        <div style="font-size:11px;color:#94a3b8">IP: ${esc(h.ip||'—')} • ${new Date(h.time).toLocaleString('vi-VN')}</div>
      </div>`;
    }
  });
  document.getElementById('adminHistoryView').innerHTML = html;
}
