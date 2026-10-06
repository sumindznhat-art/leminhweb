/* ============================================================
   TOOLS.JS - Hỗ trợ GAME HTML động
   ============================================================ */
let activeTool = null, toolInterval = null;
let _engine = null, _lastSid = null, _lastGy = null, _im = false;
let _blobUrl = null;

function getToolImage(t){ return t.image_base64 || t.image || ''; }

function setStatus(state, text){
  const el = document.getElementById('gsStatus');
  const txt = document.getElementById('gsStatusText');
  if(!el || !txt) return;
  el.classList.remove('err','wait');
  if(state === 'err') el.classList.add('err');
  else if(state === 'wait') el.classList.add('wait');
  txt.textContent = text;
}

function openToolViewer(tool){
  const u = currentUser(); if(!u) return;
  const admin = isRealAdmin(u);
  const isVIP = admin || (u.key_expiry && Number(u.key_expiry) > now());

  if(!isVIP){
    const hasMoney = u.balance > 0;
    const msg = '🔒 CẦN KÍCH HOẠT KEY ĐỂ MỞ TOOL\n\n' +
                '💰 Số dư: ' + fmt(u.balance) + '\n' +
                '📅 Key: ' + (u.key_expiry ? 'ĐÃ HẾT HẠN ' + fmtDate(u.key_expiry) : 'Chưa kích hoạt') + '\n\n' +
                'Bạn muốn làm gì?\n' +
                '• OK → ' + (hasMoney ? 'Mua gói VIP ngay' : 'Nạp tiền vào ví') + '\n' +
                '• Cancel → Nhập key có sẵn';
    const goBuy = confirm(msg);
    if(goBuy){
      if(hasMoney) showPage('vip');
      else showPage('deposit');
    } else {
      openKeyModal();
    }
    return;
  }

  if(tool.maintenance){ alert('🚧 Tool đang bảo trì!'); return; }

  activeTool = tool;
  _engine = new TEEngine.Yq();
  _lastSid = null; _lastGy = null; _im = false;

  document.getElementById('gsName').textContent = tool.name;
  document.getElementById('gsLogo').src = getToolImage(tool);
  document.getElementById('panelTitle').textContent = (tool.panel === 'md5') ? 'MD5' : 'TÀI XỈU';

  const card = document.querySelector('.predict-card');
  if(card){
    card.classList.toggle('md5', tool.panel === 'md5');
    // Ẩn panel nếu tool.panel === 'none'
    card.style.display = (tool.panel === 'none') ? 'none' : '';
  }

  setStatus('wait', 'Đang kết nối');

  // Ưu tiên load HTML nếu có, ngược lại load URL
  const frame = document.getElementById('gameFrame');
  if(_blobUrl){ try{ URL.revokeObjectURL(_blobUrl); }catch(e){} _blobUrl = null; }

  if(tool.html_content && tool.html_content.length > 20){
    // Load HTML từ Blob (chạy được script + iframe bên trong)
    try{
      const blob = new Blob([tool.html_content], {type: 'text/html;charset=utf-8'});
      _blobUrl = URL.createObjectURL(blob);
      frame.src = _blobUrl;
    }catch(e){
      console.error('Load HTML fail', e);
      frame.srcdoc = tool.html_content;
    }
  } else if(tool.game_url){
    frame.src = tool.game_url;
  } else {
    frame.src = 'about:blank';
    document.getElementById('gameFrame').srcdoc = '<html><body style="background:#111;color:#fff;font-family:sans-serif;text-align:center;padding:40px"><h1>⚠️ Chưa cấu hình</h1><p>Game này chưa có HTML hoặc URL</p></body></html>';
  }

  document.getElementById('game-screen').classList.add('show');

  // Báo server
  if(tool.api_url) apiUpdateLastApi(tool.api_url, tool.name).catch(()=>{});

  // Chỉ chạy phân tích nếu có api_url
  if(toolInterval){ clearInterval(toolInterval); toolInterval = null; }
  resetPanel();

  if(tool.api_url && tool.panel !== 'none'){
    tickApi();
    toolInterval = setInterval(tickApi, 4000);
  } else {
    setStatus('ok', 'OK');
    document.getElementById('statusText').textContent = 'Chế độ HTML';
  }
}

function closeGame(){
  document.getElementById('game-screen').classList.remove('show');
  const frame = document.getElementById('gameFrame');
  frame.src = 'about:blank';
  if(_blobUrl){ try{ URL.revokeObjectURL(_blobUrl); }catch(e){} _blobUrl = null; }
  if(toolInterval){ clearInterval(toolInterval); toolInterval = null; }
  activeTool = null;
}

function togglePanel(){ document.querySelector('.predict-card').classList.toggle('collapsed'); }

function resetPanel(){
  document.getElementById('taiCircle').className = 'tx-circle tai';
  document.getElementById('xiuCircle').className = 'tx-circle xiu';
  document.getElementById('taiCircle').textContent = '--%';
  document.getElementById('xiuCircle').textContent = '--%';
  document.getElementById('sidValue').textContent = '#@hk';
  document.getElementById('statusText').textContent = 'Đang kết nối...';
  document.getElementById('statusText').classList.remove('analyzing');
}
function setCircles(gy, active, rt, rx){
  const tc = document.getElementById('taiCircle'), xc = document.getElementById('xiuCircle');
  tc.className = 'tx-circle tai'; xc.className = 'tx-circle xiu';
  if(rt != null && rx != null){
    tc.textContent = Math.round(rt) + '%';
    xc.textContent = Math.round(rx) + '%';
  } else {
    tc.textContent = '--%'; xc.textContent = '--%';
  }
  if(gy){ const el = gy === 'TAI' ? tc : xc; el.classList.add(active ? 'active' : 'resting'); }
}

async function tickApi(){
  if(!activeTool || !activeTool.api_url) return;
  try{
    const r = await fetch(activeTool.api_url, {cache: 'no-store'});
    if(!r.ok) throw 0;
    const data = await r.json();
    let list = data.list || data.data || data.sessions || data.result || data.history || data.items || data.soicau;
    if(!Array.isArray(list) && data.data && typeof data.data === 'object'){
      const first = Object.values(data.data).find(v => Array.isArray(v));
      if(first) list = first;
    }
    if(!Array.isArray(list) || !list.length) throw 0;
    const asc = [...list].sort((a,b) => (a.id||0) - (b.id||0));
    const nid = list[0].id ?? asc[asc.length-1].id ?? Date.now();

    setStatus('ok', 'OK');
    document.getElementById('sidValue').textContent = '#' + (nid + 1);

    if(_lastSid !== null && nid !== _lastSid){
      _im = true;
      setCircles(null, false, null, null);
      document.getElementById('statusText').textContent = 'Chờ ván mới...';
      setTimeout(() => { _im = false; analyze(asc, nid); }, 5000);
      _lastSid = nid; return;
    }
    _lastSid = nid;
    if(!_im) analyze(asc, nid);
  }catch(e){
    setStatus('err', 'Lỗi');
    document.getElementById('statusText').textContent = 'Đang kết nối lại...';
  }
}
function analyze(asc, nid){
  _engine.nap(asc);
  const qs = TEEngine.predict(_engine);
  document.getElementById('sidValue').textContent = '#' + (nid + 1);
  if(qs.g){
    setCircles(qs.g, true, qs.rt, qs.rx);
    document.getElementById('statusText').textContent = 'Sẵn sàng';
    document.getElementById('statusText').classList.add('analyzing');
    _lastGy = qs.g;
  } else {
    setCircles(null, false, null, null);
    document.getElementById('statusText').textContent = 'Chờ dữ liệu...';
    _lastGy = null;
  }
}

(function(){
  const el = document.getElementById('dragPanel'); if(!el) return;
  let drag = false, sx, sy, ix, iy;
  el.addEventListener('pointerdown', e => {
    if(e.target.closest('.toggle-btn')) return;
    drag = true; sx = e.clientX; sy = e.clientY; ix = el.offsetLeft; iy = el.offsetTop;
    try{ el.setPointerCapture(e.pointerId); }catch(_){}
  });
  el.addEventListener('pointermove', e => {
    if(!drag) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    requestAnimationFrame(() => {
      el.style.left = (ix + dx) + 'px';
      el.style.top = (iy + dy) + 'px';
      el.style.right = 'auto';
    });
  });
  const stop = () => drag = false;
  el.addEventListener('pointerup', stop);
  el.addEventListener('pointercancel', stop);
})();
