/* ============================================================
   AUTH.JS - BONSICOLA (Fix Forbidden)
   ============================================================ */

function shakeEl(el){ el.classList.add('shake'); setTimeout(()=>el.classList.remove('shake'),500); }

function switchTab(t){
  const tl = document.getElementById('tabLogin'), tr = document.getElementById('tabReg');
  const fl = document.getElementById('formLogin'), fr = document.getElementById('formReg');
  const sub = document.getElementById('subText');
  const err = document.getElementById('loginError');
  if(err) err.textContent = '';
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
  const pass  = document.getElementById('loginPass').value;
  const err   = document.getElementById('loginError');
  const btn   = document.getElementById('btnLogin');
  const sp    = document.getElementById('loginSpinner');
  const bt    = document.getElementById('btnLoginText');

  err.textContent = '';
  err.style.color = '#ef4444';

  if(!email){
    err.textContent = '⚠️ Vui lòng nhập Email!';
    shakeEl(document.getElementById('loginEmail'));
    return;
  }
  if(!pass){
    err.textContent = '⚠️ Vui lòng nhập Mật khẩu!';
    shakeEl(document.getElementById('loginPass'));
    return;
  }

  sp.style.display = 'inline-block';
  bt.innerHTML = 'ĐANG KIỂM TRA...';
  btn.disabled = true;

  try{
    const res = await apiLogin(email, pass);

    sp.style.display = 'none';
    btn.disabled = false;
    bt.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP';

    if(!res || !res.success){
      let msg = 'Sai email hoặc mật khẩu!';
      if(res && res.error){
        msg = (typeof res.error === 'object') ? (res.error.message || 'Lỗi') : res.error;
      }
      err.textContent = '❌ ' + msg;
      shakeEl(document.getElementById('loginPass'));
      return;
    }

    err.style.color = '#10b981';
    err.textContent = '✅ Đăng nhập thành công!';

    setTimeout(() => {
      err.textContent = '';
      enterApp();
    }, 400);

  } catch(e){
    sp.style.display = 'none';
    btn.disabled = false;
    bt.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP';
    err.textContent = '❌ Lỗi: ' + (e.message || 'Không xác định');
  }
}

async function doRegister(){
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  const err   = document.getElementById('loginError');
  const btn   = document.getElementById('btnReg');
  const sp    = document.getElementById('regSpinner');
  const bt    = document.getElementById('btnRegText');

  err.textContent = '';
  err.style.color = '#ef4444';

  if(!name){ err.textContent = '⚠️ Vui lòng nhập Tên!'; return; }
  if(!email){ err.textContent = '⚠️ Vui lòng nhập Email!'; return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
    err.textContent = '⚠️ Email không đúng định dạng!';
    return;
  }
  if(!pass || pass.length < 6){
    err.textContent = '⚠️ Mật khẩu phải từ 6 ký tự!';
    return;
  }
  if(pass !== pass2){
    err.textContent = '⚠️ Mật khẩu nhập lại không khớp!';
    shakeEl(document.getElementById('regPass2'));
    return;
  }

  sp.style.display = 'inline-block';
  bt.innerHTML = 'ĐANG TẠO...';
  btn.disabled = true;

  try{
    const res = await apiRegister(email, pass, name);

    sp.style.display = 'none';
    btn.disabled = false;
    bt.innerHTML = '<i class="fa-solid fa-user-plus"></i> ĐĂNG KÝ';

    if(!res || !res.success){
      let msg = 'Đăng ký thất bại!';
      if(res && res.error){
        msg = (typeof res.error === 'object') ? (res.error.message || 'Lỗi') : res.error;
      }
      err.textContent = '❌ ' + msg;
      return;
    }

    err.style.color = '#10b981';
    err.textContent = '✅ Đăng ký thành công!';

    ['regName','regEmail','regPass','regPass2'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.value = '';
    });

    setTimeout(() => {
      switchTab('login');
      document.getElementById('loginEmail').value = email;
      err.style.color = '#ef4444';
      err.textContent = '';
    }, 900);

  } catch(e){
    sp.style.display = 'none';
    btn.disabled = false;
    bt.innerHTML = '<i class="fa-solid fa-user-plus"></i> ĐĂNG KÝ';
    err.textContent = '❌ Lỗi: ' + (e.message || 'Không xác định');
  }
}

function enterApp(){
  const u = currentUser();
  if(!u){ doLogout(); return; }

  // Force admin session
  if(u.email === 'leminhdz@gmail.com'){
    u.is_admin = 1;
    refreshUser(u);
  }

  document.getElementById('login-screen').classList.add('hide');
  document.getElementById('app').classList.add('show');

  if(isRealAdmin(u)){
    const af = document.getElementById('adminFloat');
    if(af) af.classList.add('show');
  }

  if(typeof renderAll === 'function') renderAll();
  if(typeof showPage === 'function') showPage('home');
  if(typeof startClock === 'function') startClock();
  if(typeof initMusic === 'function') initMusic();

  if(window._userPoller) clearInterval(window._userPoller);
  window._userPoller = setInterval(async () => {
    const uu = currentUser();
    if(!uu) return;
    const r = await apiGetUser();
    if(r && r.success){
      renderAll();
      const p = document.querySelector('.page.active');
      if(p && p.id === 'page-vip') renderVIPPage();
      if(p && p.id === 'page-deposit') renderDeposit();
      if(p && p.id === 'page-profile') renderProfile();
    }
  }, 8000);
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
  if(!res || !res.success){
    err.textContent = '❌ ' + (res?.error || 'Key lỗi');
    return;
  }

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

/* Keyboard */
document.addEventListener('DOMContentLoaded', () => {
  const lp = document.getElementById('loginPass');
  const rp = document.getElementById('regPass2');
  const ki = document.getElementById('keyInput');
  if(lp) lp.addEventListener('keypress', e => { if(e.key === 'Enter') doLogin(); });
  if(rp) rp.addEventListener('keypress', e => { if(e.key === 'Enter') doRegister(); });
  if(ki) ki.addEventListener('keypress', e => { if(e.key === 'Enter') activateKey(); });
});
