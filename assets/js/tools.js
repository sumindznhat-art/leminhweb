/* ============================================================
   assets/js/tools.js — TOOLS + PACKAGES + NẠP TIỀN
   ============================================================ */

function buildTools() {
  const el = $('toolList'); if (!el) return;
  $('toolCount').textContent = CONFIG.tools.length;
  el.innerHTML = CONFIG.tools.map(t => `
    <div class="pay-method" onclick="openTool('${t.id}')">
      <div class="pay-icon purple"><i class="fa-solid fa-cube"></i></div>
      <div class="pay-info">
        <div class="name">${esc(t.name)}</div>
        <div class="desc">Nhấn để mở tool</div>
      </div>
      <i class="fa-solid fa-chevron-right pay-arrow"></i>
    </div>
  `).join('');
}

function openTool(id) {
  const t = CONFIG.tools.find(x => x.id === id);
  if (!t) return;
  const u = DB.cur();
  const cur = DB.users()[u.email];
  const hasVip = cur.expiry && cur.expiry > Date.now();
  if (!hasVip && cur.role !== 'admin') {
    alert('⚠️ Cần kích hoạt VIP để dùng tool!');
    openModal('keyModal');
    return;
  }
  window.open(t.url, '_blank');
}

function buildPackages() {
  const el = $('pkgList'); if (!el) return;
  el.innerHTML = CONFIG.packages.map(p => `
    <div class="pay-method" onclick="buyPackage('${p.id}')">
      <div class="pay-icon yellow"><i class="fa-solid fa-crown"></i></div>
      <div class="pay-info">
        <div class="name">${esc(p.name)}</div>
        <div class="desc">${p.days} ngày • <b>${fmt(p.price)}</b></div>
      </div>
      <i class="fa-solid fa-chevron-right pay-arrow"></i>
    </div>
  `).join('');
}

function buyPackage(id) {
  const pkg = CONFIG.packages.find(x => x.id === id);
  if (!pkg) return;
  const u = DB.cur();
  const users = DB.users();
  const cur = users[u.email];

  if ((cur.balance || 0) < pkg.price) {
    alert('❌ Số dư không đủ!\nCần ' + fmt(pkg.price) + ', hiện có ' + fmt(cur.balance));
    showPage('deposit');
    return;
  }
  if (!confirm('Mua ' + pkg.name + ' với giá ' + fmt(pkg.price) + '?')) return;

  cur.balance -= pkg.price;
  users[u.email] = cur;
  DB.setUsers(users);

  const key = genKey();
  const keys = DB.keys();
  keys[key] = { days: pkg.days, used: false, boundIP: '', usedBy: '', usedAt: 0, createdAt: Date.now() };
  DB.setKeys(keys);

  alert('✅ MUA THÀNH CÔNG!\n\n🔑 Key: ' + key + '\n📅 ' + pkg.days + ' ngày\n\nVào "Cá nhân → Nhập Key" để kích hoạt.');
  renderAll();
}

function genKey() {
  const s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({length:4}, () => s[Math.floor(Math.random()*s.length)]).join('');
  return seg() + '-' + seg() + '-' + seg();
}

/* ============ NẠP TIỀN ============ */
async function submitDeposit() {
  const amount = Number($('depAmount').value);
  const note = $('depNote').value.trim();
  if (!amount || amount < 10000) return alert('Số tiền tối thiểu 10.000đ');

  const u = DB.cur();
  const ip = await getIP();

  const deps = DB.deps();
  deps.push({
    id: 'D' + Date.now() + Math.floor(Math.random() * 1000),
    email: u.email, amount, note, ip,
    time: Date.now(), status: 'pending'
  });
  DB.setDeps(deps);

  $('depAmount').value = '';
  $('depNote').value = '';
  alert('✅ Đã gửi yêu cầu nạp ' + fmt(amount) + '\nChờ Admin duyệt!');
  closeModal('depositModal');
}

function openHistoryDeposit() {
  const u = DB.cur();
  const deps = DB.deps().filter(d => d.email === u.email).reverse();
  let html = deps.length ? '' : '<p style="text-align:center;color:#94a3b8;font-size:13px">Chưa có giao dịch</p>';
  deps.forEach(d => {
    const cls = d.status==='pending'?'b-pending':(d.status==='approved'?'b-ok':'b-no');
    const txt = d.status==='pending'?'⏳ Chờ duyệt':(d.status==='approved'?'✅ Đã duyệt':'❌ Từ chối');
    html += `<div class="adm-row">
      <span class="badge ${cls}">${txt}</span>
      <div style="font-size:16px;font-weight:800;color:#dc2626;margin:6px 0">${fmt(d.amount)}</div>
      <div style="font-size:11px;color:#94a3b8">${new Date(d.time).toLocaleString('vi-VN')}</div>
    </div>`;
  });
  $('histTitle').textContent = 'Lịch sử nạp tiền';
  $('histContent').innerHTML = html;
  openModal('historyModal');
}

function openHistoryKey() {
  const u = DB.cur();
  const hist = DB.hist().filter(h => h.type === 'key' && h.email === u.email);
  let html = hist.length ? '' : '<p style="text-align:center;color:#94a3b8;font-size:13px">Chưa có lịch sử</p>';
  hist.forEach(h => {
    html += `<div class="adm-row">
      <b style="font-family:monospace;color:#0284c7">${esc(h.key)}</b>
      <div style="font-size:12px;color:#64748b;margin-top:4px">+${h.days} ngày • IP: <code>${esc(h.ip)}</code></div>
      <div style="font-size:11px;color:#94a3b8">${new Date(h.time).toLocaleString('vi-VN')}</div>
    </div>`;
  });
  $('histTitle').textContent = 'Lịch sử mua Key';
  $('histContent').innerHTML = html;
  openModal('historyModal');
}
