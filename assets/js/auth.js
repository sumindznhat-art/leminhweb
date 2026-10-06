/* ============================================================
   AUTH.JS - FULL (gọi API PHP)
   ============================================================ */
function shakeEl(el){ el.classList.add('shake'); setTimeout(()=>el.classList.remove('shake'),500); }

function switchTab(t){
  const tl = document.getElementById('tabLogin'), tr = document.getElementById('tabReg');
  const fl = document.getElementById('formLogin'), fr = document.getElementById('formReg');
  const sub = document.getElementById('subText');
  document.getElementById('loginError').textContent = '';
  if(t === 'login'){
    tl.classList.add('active'); tr.classList.remove('active');
    fl.style.display = 'block'; fr.style.display = 'none';
    sub.textContent = 'Đăng nhập hệ thống';
  } else {
    tr.classList.add('active'); tl.classList.remove('active');
    fl.style.display = 'none'; fr.style.display = 'block';
    sub.textContent = 'Tạo tài khoản mới';
  }
}

async function doLogin(){
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;
  const err = document.getElementById('loginError');
  const btn = document.getElementById('btnLogin'), sp = document.getElementById('loginSpinner'), bt = document.getElementById('btnLoginText');
  err.textContent = ''; err.style.color = '#ef4444';
  if(!email || !pass){ err.textContent = '⚠️ Nhập đầy đủ!'; return; }
  sp.style.display = 'inline-block'; bt.innerHTML = 'ĐANG KIỂM TRA...'; btn.disabled = true;

  const res = await apiLogin(email, pass);
  sp.style.display = 'none'; btn.disabled = false;
  bt.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP';

  if(!res.success){
    err.textContent = '❌ ' + (res.error || 'Đăng nhập thất bại');
    shakeEl(document.getElementById('loginPass'));
    return;
  }
  err.style.color = '#10b981'; err.textContent = '✅ Đang vào...';
  setTimeout(enterApp, 400);
}

async function doRegister(){
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  const err = document.getElementById('loginError');
  const btn = document.getElementById('btnReg'), sp = document.getElementById('regSpinner'), bt = document.getElementById('btnRegText');
  err.textContent = ''; err.style.color = '#ef4444';
  if(!name || !email || !pass || !pass2){ err.textContent = '⚠️ Điền đầy đủ!'; return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ err.textContent = '⚠️ Email không hợp lệ!'; return; }
  if(pass.length < 6){ err.textContent = '⚠️ Mật khẩu ≥6 ký tự!'; return; }
  if(pass !== pass2){ err.textContent = '⚠️ Không khớp!'; return; }

  sp.style.display = 'inline-block'; bt.innerHTML = 'ĐANG TẠO...'; btn.disabled = true;
  const res = await apiRegister(email, pass, name);
  sp.style.display = 'none'; btn.disabled = false;
  bt.innerHTML = '<i class="fa-solid fa-user-plus"></i> ĐĂNG KÝ';

  if(!res.success){
    err.textContent = '⚠️ ' + (res.error || 'Đăng ký thất bại');
    return;
  }
  err.style.color = '#10b981'; err.textContent = '✅ Đăng ký thành công!';
  ['regName','regEmail','regPass','regPass2'].forEach(id => document.getElementById(id).value = '');
  setTimeout(() => {
    switchTab('login');
    document.getElementById('loginEmail').value = email;
    err.style.color = '#ef4444'; err.textContent = '';
  }, 900);
}

function enterApp(){
  const u = currentUser();
  if(!u){ doLogout(); return; }
  document.getElementById('login-screen').classList.add('hide');
  document.getElementById('app').classList.add('show');

  // Force admin float
  const af = document.getElementById('adminFloat');
  if(af){
    if(isRealAdmin(u)) af.classList.add('show');
    else af.classList.remove('show');
  }

  if(typeof renderAll === 'function') renderAll();
  if(typeof showPage === 'function') showPage('home');
  if(typeof startClock === 'function') startClock();
  if(typeof initMusic === 'function') initMusic();

  // Lấy data mới nhất từ server
  apiGetUser().then(res => {
    if(res.success){
      const fresh = res.user;
      if(isRealAdmin(fresh)) document.getElementById('adminFloat').classList.add('show');
      else document.getElementById('adminFloat').classList.remove('show');
      renderAll(); renderHome();
    }
  });

  // Poll user mỗi 5s để cập nhật số dư + key
  if(window._userPoller) clearInterval(window._userPoller);
  window._userPoller = setInterval(async () => {
    const uu = currentUser();
    if(!uu) return;
    const r = await apiGetUser();
    if(r.success){
      renderAll(); renderHome();
      const p = document.querySelector('.page.active');
      if(p && p.id === 'page-vip') renderVIPPage();
      if(p && p.id === 'page-deposit') renderDeposit();
      if(p && p.id === 'page-profile') renderProfile();
      if(!isRealAdmin(r.user) && (!r.user.key_expiry || r.user.key_expiry <= now())){
        if(document.getElementById('game-screen').classList.contains('show')){
          alert('🔒 Key đã hết hạn!');
          closeGame();
          showPage('vip');
        }
      }
    }
  }, 5000);
}

function doLogout(){
  if(window._userPoller){ clearInterval(window._userPoller); window._userPoller = null; }
  clearSession();
  document.getElementById('login-screen').classList.remove('hide');
  document.getElementById('app').classList.remove('show');
  document.getElementById('game-screen').classList.remove('show');
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('show'));
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginSpinner').style.display = 'none';
  document.getElementById('btnLoginText').innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP';
  document.getElementById('btnLogin').disabled = false;
  if(typeof closeGame === 'function') closeGame();
  if(typeof stopMusic === 'function') stopMusic();
  switchTab('login');
}

function openKeyModal(){
  const u = currentUser(); if(!u) return;
  document.getElementById('keyInput').value = '';
  document.getElementById('keyErr').textContent = '';
  document.getElementById('keyModal').classList.add('show');
  setTimeout(()=>document.getElementById('keyInput').focus(), 200);
}

async function activateKey(){
  const code = document.getElementById('keyInput').value.trim().toUpperCase();
  const err = document.getElementById('keyErr');
  err.textContent = ''; err.style.color = '#ef4444';
  if(!code){ err.textContent = '⚠️ Nhập key!'; return; }

  const res = await apiKeyActivate(code);
  if(!res.success){ err.textContent = '❌ ' + (res.error || 'Key lỗi'); return; }

  document.getElementById('keyInput').value = '';
  err.style.color = '#10b981';
  err.textContent = '✅ Kích hoạt thành công! +' + res.days + ' ngày';

  await apiGetUser();
  setTimeout(() => {
    closeModal('keyModal');
    renderAll();
  }, 900);
}

function openVipFromKey(){ closeModal('keyModal'); showPage('vip'); }
function openDepositFromKey(){ closeModal('keyModal'); showPage('deposit'); }

document.getElementById('loginPass').addEventListener('keypress', e => { if(e.key === 'Enter') doLogin(); });
document.getElementById('regPass2').addEventListener('keypress', e => { if(e.key === 'Enter') doRegister(); });
document.getElementById('keyInput').addEventListener('keypress', e => { if(e.key === 'Enter') activateKey(); });
