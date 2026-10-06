/* ============================================================
   ADMIN.JS - BONSICOLA FULL
   Quản lý user, duyệt tiền (có tên + số tiền + IP), sao lưu
   ============================================================ */

function openAdmin(){
  const u = currentUser();
  if(!u){ alert('❌ Chưa đăng nhập!'); return; }
  if(!isRealAdmin(u)){ alert('❌ Không có quyền Admin!'); return; }
  document.getElementById('adminPanel').classList.add('show');
  switchAdminTab('users');
}

function switchAdminTab(tab){
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.atab === tab));
  ['users','pending','config','keys'].forEach(k => {
    const el = document.getElementById('admin' + k.charAt(0).toUpperCase() + k.slice(1) + 'View');
    if(el) el.style.display = (k === tab) ? 'block' : 'none';
  });
  if(tab === 'users')   renderAdminUsers();
  if(tab === 'pending') renderAdminPending();
  if(tab === 'config')  renderAdminConfig();
  if(tab === 'keys')    renderAdminKeys();
}

/* ============================================================
   HELPER
   ============================================================ */
function nowMs(){ return Date.now(); }

function getTimeAgo(ts){
  const diff = nowMs() - Number(ts);
  const sec = Math.floor(diff / 1000);
  if(sec < 60) return 'Vừa xong';
  const min = Math.floor(sec / 60);
  if(min < 60) return min + ' phút trước';
  const hr = Math.floor(min / 60);
  if(hr < 24) return hr + ' giờ trước';
  const day = Math.floor(hr / 24);
  return day + ' ngày trước';
}

/* ============================================================
   TAB USERS
   ============================================================ */
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
    box.innerHTML += '<div style="text-align:center;padding:20px;color:#ef4444;font-weight:700">❌ ' + ((res && res.error) || 'Lỗi tải users') + '</div>';
    return;
  }

  res.users.forEach(u => {
    const isExpired = !u.is_admin && (!u.key_expiry || Number(u.key_expiry) <= nowMs());
    const div = document.createElement('div');
    div.className = 'adm-user';
    const badges = [];
    if(u.is_admin) badges.push('<span class="badge badge-admin">ADMIN</span>');
    else if(isExpired) badges.push('<span class="badge badge-exp">HẾT HẠN</span>');
    else badges.push('<span class="badge badge-vip">VIP</span>');

    div.innerHTML = `
      <div class="r1">
        <div class="email">${esc(u.email)}</div>
        <div>${badges.join(' ')}</div>
      </div>
      <div class="info">
        Tên: <b>${esc(u.name || '—')}</b><br>
        Số dư: <b>${u.is_admin ? '∞' : fmt(u.balance)}</b><br>
        Hạn key: <b>${u.is_admin ? '∞' : (u.key_expiry ? fmtDate(u.key_expiry) : 'Chưa có')}</b><br>
        <b style="color:#ef4444">IP: ${esc(u.ip || '—')}</b><br>
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
  if(!email || !pass){ alert('⚠️ Nhập đủ email và mật khẩu!'); return; }
  const res = await apiRegister(email, pass, name);
  if(!res || !res.success){ alert('❌ ' + ((res && res.error) || 'Lỗi')); return; }
  alert('✅ Đã tạo: ' + email);
  renderAdminUsers();
}

async function admAddBalance(email){
  const v = prompt('Cộng/trừ tiền cho ' + email + '\n(số dương = cộng, âm = trừ)', '50000');
  if(v === null) return;
  const n = parseInt(v, 10);
  if(isNaN(n)){ alert('❌ Số không hợp lệ!'); return; }
  const listRes = await adminApi('user_list');
  const user = (listRes.users || []).find(u => u.email === email);
  if(!user){ alert('❌ Không tìm thấy user'); return; }
  const newBalance = Math.max(0, parseInt(user.balance) + n);
  const res = await adminApi('user_update', { email, balance: newBalance });
  if(!res || !res.success){ alert('❌ ' + ((res && res.error) || 'Lỗi')); return; }
  alert('✅ Số dư mới: ' + fmt(newBalance));
  renderAdminUsers();
}

async function admSetKey(email){
  const v = prompt('Cấp thêm bao nhiêu NGÀY cho ' + email + '?', '7');
  if(v === null) return;
  const d = parseInt(v, 10);
  if(isNaN(d) || d <= 0){ alert('❌ Số ngày không hợp lệ!'); return; }
  const listRes = await adminApi('user_list');
  const user = (listRes.users || []).find(u => u.email === email);
  if(!user){ alert('❌ Không tìm thấy user'); return; }
  const base = (Number(user.key_expiry) > nowMs()) ? Number(user.key_expiry) : nowMs();
  const newExpiry = base + d * 24 * 3600 * 1000;
  const res = await adminApi('user_update', { email, key_expiry: newExpiry });
  if(!res || !res.success){ alert('❌ ' + ((res && res.error) || 'Lỗi')); return; }
  alert('✅ Đã cấp ' + d + ' ngày!\nHạn mới: ' + fmtDate(newExpiry));
  renderAdminUsers();
}

async function admResetKey(email){
  if(!confirm('Reset key của ' + email + '?')) return;
  const res = await adminApi('user_update', { email, key_expiry: 0 });
  if(!res || !res.success){ alert('❌ ' + ((res && res.error) || 'Lỗi')); return; }
  alert('✅ Đã reset!');
  renderAdminUsers();
}

async function admToggleAdmin(email, current){
  const me = currentUser();
  if(email === me.email){ alert('❌ Không thể tự gỡ!'); return; }
  const newVal = current ? 0 : 1;
  if(!confirm((newVal ? 'Cấp' : 'Gỡ') + ' quyền ADMIN cho ' + email + '?')) return;
  const res = await adminApi('user_update', { email, is_admin: newVal });
  if(!res || !res.success){ alert('❌ ' + ((res && res.error) || 'Lỗi')); return; }
  alert('✅ Đã cập nhật!');
  renderAdminUsers();
}

async function admDelete(email){
  const me = currentUser();
  if(email === me.email){ alert('❌ Không thể tự xoá!'); return; }
  if(email === 'leminhdz@gmail.com'){ alert('❌ Không thể xoá admin tổng!'); return; }
  if(!confirm('XOÁ: ' + email + '?')) return;
  const res = await adminApi('user_delete', { email });
  if(!res || !res.success){ alert('❌ ' + ((res && res.error) || 'Lỗi')); return; }
  alert('✅ Đã xoá!');
  renderAdminUsers();
}

/* ============================================================
   TAB DUYỆT TIỀN — Hiện tên user + số tiền + IP
   ============================================================ */
async function renderAdminPending(){
  const box = document.getElementById('adminPendingView');
  box.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;font-weight:700">Đang tải...</div>';

  const res = await adminApi('deposit_pending');
  box.innerHTML = '';

  /* Toolbar */
  const toolbar = document.createElement('div');
  toolbar.className = 'adm-section';
  toolbar.style.background = '#eff6ff';
  toolbar.style.borderColor = '#bfdbfe';
  toolbar.style.borderStyle = 'solid';
  toolbar.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between">
      <div style="font-size:12.5px;font-weight:800;color:#1e40af">
        📋 YÊU CẦU NẠP TIỀN
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="green" onclick="renderAdminPending()">
          <i class="fa-solid fa-rotate"></i> LÀM MỚI
        </button>
        <button class="orange" onclick="downloadBackup()">
          <i class="fa-solid fa-download"></i> SAO LƯU
        </button>
      </div>
    </div>
    <div style="font-size:10.5px;color:#64748b;font-weight:600;margin-top:8px;text-align:center">
      🔄 Tự động cập nhật mỗi 10 giây
    </div>`;
  box.appendChild(toolbar);

  if(!res || !res.success || !res.deposits || !res.deposits.length){
    const empty = document.createElement('div');
    empty.className = 'adm-section';
    empty.style.textAlign = 'center';
    empty.style.color = '#94a3b8';
    empty.style.fontWeight = '700';
    empty.style.padding = '30px 20px';
    empty.innerHTML = '✨ Không có yêu cầu nạp tiền nào<br><small style="font-size:11px;font-weight:600">Khi user nạp tiền, yêu cầu sẽ hiện ở đây</small>';
    box.appendChild(empty);
    return;
  }

  /* Tổng tiền cần duyệt */
  const total = res.deposits.reduce((s, d) => s + Number(d.amount), 0);
  const summary = document.createElement('div');
  summary.className = 'adm-section';
  summary.style.background = 'linear-gradient(135deg,#fef3c7,#fde68a)';
  summary.style.borderColor = '#fbbf24';
  summary.style.borderStyle = 'solid';
  summary.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <div>
        <div style="font-size:11px;font-weight:800;color:#78350f;letter-spacing:.5px">💰 TỔNG CHỜ DUYỆT</div>
        <div style="font-family:'Baloo 2',sans-serif;font-size:26px;font-weight:800;color:#b45309;margin-top:2px">
          ${total.toLocaleString('vi-VN')}đ
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;font-weight:800;color:#78350f">📋 SỐ YÊU CẦU</div>
        <div style="font-family:'Baloo 2',sans-serif;font-size:26px;font-weight:800;color:#b45309;margin-top:2px">
          ${res.deposits.length}
        </div>
      </div>
    </div>`;
  box.appendChild(summary);

  /* Danh sách yêu cầu */
  res.deposits.forEach(d => {
    const el = document.createElement('div');
    el.className = 'pending-item';

    const userName = d.user_name || d.email.split('@')[0];
    const timeAgo = getTimeAgo(d.created_at);
    const amount = Number(d.amount) || 0;
    const balance = Number(d.user_balance) || 0;
    const ip = d.ip || d.user_ip || '—';

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px">
        <div style="flex:1;min-width:0">
          <div style="font-family:'Baloo 2',sans-serif;font-size:16px;font-weight:800;color:#1e293b;margin-bottom:2px">
            👤 ${esc(userName)}
          </div>
          <div style="font-size:11.5px;color:#64748b;font-weight:700;word-break:break-all">
            ${esc(d.email)}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-family:'Baloo 2',sans-serif;font-size:22px;font-weight:800;color:#f59e0b;line-height:1">
            ${amount.toLocaleString('vi-VN')}đ
          </div>
          <div style="font-size:10px;color:#94a3b8;font-weight:700;margin-top:4px">
            ${timeAgo}
          </div>
        </div>
      </div>

      <div style="background:#fff;border-radius:10px;padding:12px;font-size:11.5px;color:#475569;font-weight:600;line-height:1.8;border:1px solid #fde68a">
        <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px">
          <span>🌐 IP User:</span>
          <b style="color:#ef4444">${esc(ip)}</b>
        </div>
        <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px">
          <span>💵 Số dư hiện tại:</span>
          <b style="color:#10b981">${balance.toLocaleString('vi-VN')}đ</b>
        </div>
        <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:4px">
          <span>💳 Phương thức:</span>
          <b>${d.method === 'bank' ? 'Chuyển khoản' : 'Thẻ cào'}</b>
        </div>
        <div style="display:flex;justify-content:space-between;gap:8px">
          <span>🕐 Thời gian:</span>
          <b>${fmtDate(d.created_at)}</b>
        </div>
        ${d.note ? `
        <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #e2e8f0">
          <span>📝 Ghi chú:</span> <b style="color:#3b5bfd">${esc(d.note)}</b>
        </div>` : ''}
      </div>

      <div class="acts" style="margin-top:10px">
        <button class="btn-approve" style="padding:12px;font-size:12px" onclick="approveDeposit('${d.id}')">
          <i class="fa-solid fa-check"></i> DUYỆT +${amount.toLocaleString('vi-VN')}đ
        </button>
        <button class="btn-reject" style="padding:12px;font-size:12px" onclick="rejectDeposit('${d.id}')">
          <i class="fa-solid fa-xmark"></i> TỪ CHỐI
        </button>
      </div>`;
    box.appendChild(el);
  });
}

async function approveDeposit(id){
  if(!confirm('Duyệt yêu cầu nạp tiền này?\n\nTiền sẽ được cộng và hệ thống tự động mua key cho user.')) return;
  const res = await adminApi('deposit_approve', { id });
  if(!res || !res.success){ alert('❌ ' + ((res && res.error) || 'Lỗi duyệt')); return; }
  alert('✅ Đã duyệt! Tiền đã cộng + key tự động mua (nếu đủ tiền).');
  renderAdminPending();
}

async function rejectDeposit(id){
  const r = prompt('Lý do từ chối:', 'Không hợp lệ') || 'Không hợp lệ';
  const res = await adminApi('deposit_reject', { id, reason: r });
  if(!res || !res.success){ alert('❌ ' + ((res && res.error) || 'Lỗi')); return; }
  alert('❌ Đã từ chối');
  renderAdminPending();
}

/* ============================================================
   SAO LƯU — Tải file JSON
   ============================================================ */
async function downloadBackup(){
  const s = getSession();
  if(!s) return alert('❌ Chưa đăng nhập!');

  if(!confirm('📥 Tải xuống file sao lưu toàn bộ dữ liệu?\n\nBao gồm:\n• Users\n• Deposits\n• Keys\n• History')) return;

  try{
    const url = (window.API_URL || '/api/index.php')
      + '?action=backup_data'
      + '&email=' + encodeURIComponent(s.email)
      + '&password=' + encodeURIComponent(s.password);

    const r = await fetch(url);
    if(!r.ok){
      const txt = await r.text();
      alert('❌ Lỗi sao lưu (HTTP ' + r.status + ')\n\n' + txt.slice(0, 300));
      return;
    }

    const blob = await r.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bonsicola-backup-'
      + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);

    alert('✅ Đã tải file sao lưu thành công!');
  }catch(e){
    alert('❌ Lỗi: ' + e.message);
  }
}

/* ============================================================
   TAB CẤU HÌNH
   ============================================================ */
function renderAdminConfig(){
  const cfg = loadConfig();
  const box = document.getElementById('adminConfigView');
  box.innerHTML = '';

  const site = document.createElement('div');
  site.className = 'adm-section';
  site.innerHTML = `<h4><i class="fa-solid fa-gear"></i> Cấu hình chung</h4>
    <input class="adm-input" id="cfgSiteName" value="${esc(cfg.site_name)}" placeholder="Tên site">
    <input class="adm-input" id="cfgMarquee" value="${esc(cfg.marquee)}" placeholder="Marquee">
    <textarea class="adm-textarea" id="cfgNotice" placeholder="Thông báo">${esc(cfg.notice)}</textarea>
    <button class="green" onclick="saveCfgSite()">💾 LƯU</button>`;
  box.appendChild(site);

  const bank = document.createElement('div');
  bank.className = 'adm-section';
  bank.innerHTML = `<h4><i class="fa-solid fa-building-columns"></i> Ngân hàng</h4>
    <input class="adm-input" id="cfgBankName" value="${esc(cfg.bank.name)}" placeholder="Tên NH">
    <input class="adm-input" id="cfgBankAcc" value="${esc(cfg.bank.acc)}" placeholder="Số TK">
    <input class="adm-input" id="cfgBankHolder" value="${esc(cfg.bank.holder)}" placeholder="Chủ TK">
    <button class="green" onclick="saveCfgBank()">💾 LƯU BANK</button>`;
  box.appendChild(bank);

  const backup = document.createElement('div');
  backup.className = 'adm-section';
  backup.style.background = 'linear-gradient(135deg,#fef3c7,#fde68a)';
  backup.style.borderColor = '#fbbf24';
  backup.style.borderStyle = 'solid';
  backup.innerHTML = `<h4 style="color:#78350f"><i class="fa-solid fa-database"></i> Sao lưu dữ liệu</h4>
    <p style="font-size:11.5px;color:#92400e;font-weight:600;margin-bottom:8px;line-height:1.6">
      Tải file JSON chứa toàn bộ Users, Deposits, Keys, History.<br>
      Dùng để backup hoặc khôi phục khi cần.
    </p>
    <button class="orange" onclick="downloadBackup()" style="width:100%;padding:12px">
      <i class="fa-solid fa-download"></i> 📥 TẢI FILE SAO LƯU (.JSON)
    </button>`;
  box.appendChild(backup);
}

function saveCfgSite(){
  const c = loadConfig();
  c.site_name = document.getElementById('cfgSiteName').value;
  c.marquee = document.getElementById('cfgMarquee').value;
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
  saveConfig(c);
  renderAdminConfig();
  alert('✅ Đã lưu bank!');
}

/* ============================================================
   TAB KEYS
   ============================================================ */
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
        <div style="font-family:monospace;font-weight:800;color:${k.used ? '#94a3b8' : '#3b5bfd'};font-size:12px">${esc(k.code)}</div>
        <div style="font-size:10px;font-weight:800;color:${k.used ? '#ef4444' : '#10b981'}">${k.used ? 'ĐÃ DÙNG' : 'CHƯA DÙNG'}</div>
      </div>
      <div style="color:#64748b;margin-top:3px">${k.days} ngày · ${esc(k.note || '—')}</div>
      ${k.used ? `<div style="color:#94a3b8;font-size:10px">→ ${esc(k.used_by || '')} (${fmtDate(k.used_at)})</div>` : ''}
      <button style="margin-top:5px;padding:4px 8px;border-radius:6px;border:none;background:#ef4444;color:#fff;font-size:10px;font-weight:700;cursor:pointer" onclick="admDelKey('${esc(k.code)}')">Xoá</button>`;
    list.appendChild(d);
  });
  box.appendChild(list);
}

async function admGenKeys(){
  const days = parseInt(document.getElementById('keyDays').value, 10) || 1;
  const qty = parseInt(document.getElementById('keyQty').value, 10) || 1;
  const note = document.getElementById('keyNote').value.trim();
  const res = await adminApi('key_create', { days, qty, note });
  if(!res || !res.success){ alert('❌ ' + ((res && res.error) || 'Lỗi')); return; }
  alert('✅ Đã tạo ' + qty + ' key:\n\n' + res.keys.join('\n'));
  renderAdminKeys();
}

async function admDelKey(code){
  if(!confirm('Xoá key: ' + code + '?')) return;
  const res = await adminApi('key_delete', { code });
  if(!res || !res.success){ alert('❌ ' + ((res && res.error) || 'Lỗi')); return; }
  renderAdminKeys();
}
