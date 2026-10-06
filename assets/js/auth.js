/* ============================================================
   AUTH.JS - Login / Register / Key
   ============================================================ */
function shakeEl(el){ el.classList.add('shake'); setTimeout(()=>el.classList.remove('shake'),500); }

function switchTab(t){
  const tl = document.getElementById('tabLogin'), tr = document.getElementById('tabReg');
  const fl = document.getElementById('formLogin'), fr = document.getElementById('formReg');
  const sub = document.getElementById('subText');
  document.getElementById('loginError').textContent = '';
  if(t === 'login'){ tl.classList.add('active'); tr.classList.remove('active'); fl.style.display='block'; fr.style.display='none'; sub.textContent='Đăng nhập hệ thống'; }
  else { tr.classList.add('active'); tl.classList.remove('active'); fl.style.display='none'; fr.style.display='block'; sub.textContent='Tạo tài khoản mới'; }
}
async function fetchIP(){
  try{
    const ctrl = new AbortController(); const t = setTimeout(()=>ctrl.abort(),4000);
    const r = await fetch('https://api.ipify.org?format=json', {signal:ctrl.signal});
    clearTimeout(t); const d = await r.json(); return d.ip || 'unknown';
  }catch(e){ return 'unknown'; }
}
function doLogin(){
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;
  const err = document.getElementById('loginError');
  const btn = document.getElementById('btnLogin'), sp = document.getElementById('loginSpinner'), bt = document.getElementById('btnLoginText');
  err.textContent = ''; err.style.color = '#ef4444';
  if(!email || !pass){ err.textContent = '⚠️ Nhập đầy đủ!'; return; }
  sp.style.display = 'inline-block'; bt.innerHTML = 'ĐANG KIỂM TRA...'; btn.disabled = true;
  setTimeout(async () => {
    const u = getUser(email);
    if(!u || u.password !== pass){
      sp.style.display='none'; bt.innerHTML='<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP'; btn.disabled=false;
      err.textContent='❌ Sai email hoặc mật khẩu!'; shakeEl(document.getElementById('loginPass')); return;
    }
    const ip = await fetchIP();
    u.ip = ip; u.lastLogin = now();
    setUser(email, u); setSession(email);
    bt.innerHTML = '<i class="fa-solid fa-check"></i> OK';
    err.style.color = '#10b981'; err.textContent = '✅ Đang vào...';
    setTimeout(enterApp, 500);
  }, 400);
}
function doRegister(){
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  const err = document.getElementById('loginError');
  const btn = document.getElementById('btnReg'), sp = document.getElementById('regSpinner'), bt = document.getElementById('btnRegText');
  err.textContent = ''; err.style.color = '#ef4444';
  if(!name || !email || !pass || !pass2){ err.textContent='⚠️ Điền đầy đủ!'; return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ err.textContent='⚠️ Email không hợp lệ!'; return; }
  if(pass.length < 6){ err.textContent='⚠️ Mật khẩu ≥6 ký tự!'; return; }
  if(pass !== pass2){ err.textContent='⚠️ Không khớp!'; return; }
  if(getUser(email)){ err.textContent='⚠️ Email đã tồn tại!'; return; }
  sp.style.display='inline-block'; bt.innerHTML='ĐANG TẠO...'; btn.disabled=true;
  setTimeout(async () => {
    const ip = await fetchIP();
    setUser(email, {email, password:pass, name, balance:0, keyExpiry:0, isAdmin:false, ip, lastLogin:now(),
      createdAt:now(), history:[], keyHistory:[], lastApi:'', lastTool:'', lastToolAt:0});
    if(CLOUD.enabled()) CLOUD.push(true);
    sp.style.display='none'; bt.innerHTML='<i class="fa-solid fa-user-plus"></i> ĐĂNG KÝ'; btn.disabled=false;
    err.style.color = '#10b981'; err.textContent = '✅ Đăng ký thành công!';
    ['regName','regEmail','regPass','regPass2'].forEach(id => document.getElementById(id).value = '');
    setTimeout(()=>{ switchTab('login'); document.getElementById('loginEmail').value = email; err.style.color='#ef4444'; err.textContent=''; }, 900);
  }, 400);
}
function enterApp(){
  const u = currentUser();
  if(!u){ doLogout(); return; }
  document.getElementById('login-screen').classList.add('hide');
  const isVIP = isRealAdmin(u) || (u.keyExpiry && u.keyExpiry > now());
  if(!isVIP){ document.getElementById('key-screen').classList.add('show'); return; }
  document.getElementById('key-screen').classList.remove('show');
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
}
function doLogout(){
  clearSession();
  document.getElementById('login-screen').classList.remove('hide');
  document.getElementById('app').classList.remove('show');
  document.getElementById('key-screen').classList.remove('show');
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
function activateKey(){
  const u = currentUser(); if(!u) return;
  const code = document.getElementById('keyInput').value.trim().toUpperCase();
  const err = document.getElementById('keyErr'); err.textContent = '';
  if(!code){ err.textContent = '⚠️ Nhập key!'; return; }
  const k = findKey(code);
  if(!k){ err.textContent = '❌ Key không tồn tại!'; return; }
  if(k.used){ err.textContent = '❌ Key đã sử dụng!'; return; }
  const base = (u.keyExpiry && u.keyExpiry > now()) ? u.keyExpiry : now();
  u.keyExpiry = base + k.days * 24 * 3600 * 1000;
  u.keyHistory.push({code, days:k.days, at:now(), via:'manual'});
  setUser(u.email, u);
  markKeyUsed(code, u.email);
  if(CLOUD.enabled()) CLOUD.push(true);
  document.getElementById('keyInput').value = '';
  err.style.color = '#10b981'; err.textContent = '✅ Kích hoạt! +' + k.days + ' ngày';
  setTimeout(() => enterApp(), 700);
}
function openVipFromKey(){
  const u = currentUser(); if(!u) return;
  document.getElementById('key-screen').classList.remove('show');
  document.getElementById('app').classList.add('show');
  if(typeof renderAll === 'function') renderAll();
  if(typeof showPage === 'function') showPage('vip');
  if(typeof startClock === 'function') startClock();
  if(typeof initMusic === 'function') initMusic();
}
function openDepositFromKey(){
  const u = currentUser(); if(!u) return;
  document.getElementById('key-screen').classList.remove('show');
  document.getElementById('app').classList.add('show');
  if(typeof renderAll === 'function') renderAll();
  if(typeof showPage === 'function') showPage('deposit');
  if(typeof startClock === 'function') startClock();
  if(typeof initMusic === 'function') initMusic();
}
