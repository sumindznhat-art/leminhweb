let activeTool=null,toolInterval=null,apiInfoVisible=false;
let _engine=null,_lastSid=null,_lastGy=null,_im=false;

function getToolImage(t){return t.image_base64||t.image||'';}

function openToolViewer(tool){
  const u=currentUser();if(!u)return;
  const isVIP=u.isAdmin||(u.keyExpiry&&u.keyExpiry>now());
  if(tool.vip&&!isVIP){
    alert('🔒 Tool yêu cầu VIP!\n\nSố dư: '+fmt(u.balance)+'\nNạp tiền để mua key sử dụng.');
    showPage('vip');return;
  }
  if(tool.maintenance){alert('🚧 Tool đang bảo trì!');return;}
  activeTool=tool;
  _engine=new TEEngine.Yq();_lastSid=null;_lastGy=null;_im=false;
  document.getElementById('gsName').textContent=tool.name;
  document.getElementById('gsLogo').src=getToolImage(tool);
  document.getElementById('gsApiUrl').textContent=tool.api_url;
  document.getElementById('gsApiStatus').textContent='Đang kết nối...';
  document.getElementById('gsApiStatus').style.color='#fbbf24';
  document.getElementById('gsSession').textContent='#---';
  document.getElementById('gsResult').textContent='—';
  document.getElementById('gsTime').textContent='—';
  // TỰ ĐỘNG VÀO GAME
  const frame=document.getElementById('gameFrame');
  frame.src=tool.game_url||'about:blank';
  document.getElementById('game-screen').classList.add('show');
  // Lưu vào user
  u.lastApi=tool.api_url;u.lastTool=tool.name;u.lastToolAt=now();
  setUser(u.email,u);
  if(toolInterval){clearInterval(toolInterval);toolInterval=null;}
  resetPanel();
  tickApi();
  toolInterval=setInterval(tickApi,4000);
}
function closeGame(){
  document.getElementById('game-screen').classList.remove('show');
  document.getElementById('gameFrame').src='about:blank';
  if(toolInterval){clearInterval(toolInterval);toolInterval=null;}
  activeTool=null;
}
function toggleApiInfo(){
  apiInfoVisible=!apiInfoVisible;
  document.getElementById('gsApiInfo').classList.toggle('show',apiInfoVisible);
}
function togglePanel(){document.querySelector('.predict-card').classList.toggle('collapsed');}
function resetPanel(){
  document.getElementById('taiCircle').className='tx-circle tai';
  document.getElementById('xiuCircle').className='tx-circle xiu';
  document.getElementById('taiCircle').textContent='--%';
  document.getElementById('xiuCircle').textContent='--%';
  document.getElementById('confBox').classList.remove('show','mid','ok','high');
  document.getElementById('confBar').style.width='0%';
  document.getElementById('sidValue').textContent='#@hk';
  document.getElementById('statusText').textContent='Đang kết nối...';
}
function setCircles(gy,active,rt,rx){
  const tc=document.getElementById('taiCircle'),xc=document.getElementById('xiuCircle');
  tc.className='tx-circle tai';xc.className='tx-circle xiu';
  if(rt!=null&&rx!=null){tc.textContent=Math.round(rt)+'%';xc.textContent=Math.round(rx)+'%';}
  else{tc.textContent='--%';xc.textContent='--%';}
  if(gy){const el=gy==='TAI'?tc:xc;el.classList.add(active?'active':'resting');}
}
function setConf(d,show){
  const cb=document.getElementById('confBox'),bar=document.getElementById('confBar');
  if(!show||d<50){cb.classList.remove('show');bar.style.width='0%';return;}
  let lv='',cls='';
  if(d>=80){lv='CAO';cls='high';}else if(d>=70){lv='ỔN';cls='ok';}else{lv='TRUNG BÌNH';cls='mid';}
  cb.querySelector('.conf-level').textContent=lv;
  cb.querySelector('.conf-num').textContent=d+'%';
  cb.className='conf-box show '+cls;
  bar.style.width=Math.min(100,d)+'%';
}
async function tickApi(){
  if(!activeTool)return;
  try{
    const r=await fetch(activeTool.api_url,{cache:'no-store'});
    if(!r.ok)throw 0;
    const data=await r.json();
    let list=data.list||data.data||data.sessions||data.result||data.history||data.items||data.soicau;
    if(!Array.isArray(list)&&data.data&&typeof data.data==='object'){
      const first=Object.values(data.data).find(v=>Array.isArray(v));if(first)list=first;
    }
    if(!Array.isArray(list)||!list.length)throw 0;
    const asc=[...list].sort((a,b)=>(a.id||0)-(b.id||0));
    const nid=list[0].id??asc[asc.length-1].id??Date.now();
    document.getElementById('gsApiStatus').textContent='✅ OK';
    document.getElementById('gsApiStatus').style.color='#10b981';
    document.getElementById('gsSession').textContent='#'+(nid+1);
    document.getElementById('gsTime').textContent=new Date().toLocaleTimeString('vi-VN');
    if(_lastSid!==null&&nid!==_lastSid){
      const last=asc[asc.length-1];
      const kq=last.resultTruyenThong||last.result||last.ketQua;
      if(_lastGy&&kq)_engine.nap(asc);
      _im=true;
      setCircles(null,false,null,null);setConf(0,false);
      document.getElementById('statusText').textContent='Chờ ván mới...';
      document.getElementById('gsResult').textContent='Đang chờ...';
      setTimeout(()=>{_im=false;analyze(asc,nid);},5000);
      _lastSid=nid;return;
    }
    _lastSid=nid;
    if(!_im)analyze(asc,nid);
  }catch(e){
    document.getElementById('gsApiStatus').textContent='❌ Lỗi kết nối';
    document.getElementById('gsApiStatus').style.color='#ef4444';
    document.getElementById('statusText').textContent='Đang kết nối lại...';
  }
}
function analyze(asc,nid){
  _engine.nap(asc);
  const qs=TEEngine.predict(_engine);
  document.getElementById('sidValue').textContent='#'+(nid+1);
  if(qs.g){
    setCircles(qs.g,true,qs.rt,qs.rx);
    setConf(qs.conf,true);
    document.getElementById('statusText').textContent='Sẵn sàng';
    document.getElementById('statusText').classList.add('analyzing');
    _lastGy=qs.g;
    document.getElementById('gsResult').textContent=qs.g+' ('+qs.conf+'%)';
  }else{
    setCircles(null,false,null,null);setConf(0,false);
    document.getElementById('statusText').textContent='Chờ dữ liệu...';
    _lastGy=null;
  }
}
/* Drag panel */
(function(){
  const el=document.getElementById('dragPanel');if(!el)return;
  let drag=false,sx,sy,ix,iy;
  el.addEventListener('pointerdown',e=>{
    if(e.target.closest('.toggle-btn'))return;
    drag=true;sx=e.clientX;sy=e.clientY;ix=el.offsetLeft;iy=el.offsetTop;
    try{el.setPointerCapture(e.pointerId);}catch(_){}
  });
  el.addEventListener('pointermove',e=>{
    if(!drag)return;
    const dx=e.clientX-sx,dy=e.clientY-sy;
    requestAnimationFrame(()=>{el.style.left=(ix+dx)+'px';el.style.top=(iy+dy)+'px';el.style.right='auto';});
  });
  const stop=()=>drag=false;
  el.addEventListener('pointerup',stop);el.addEventListener('pointercancel',stop);
})();
