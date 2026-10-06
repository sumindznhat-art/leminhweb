/* ============================================================
   SECURITY.JS - BẢO MẬT CHỐNG DEVTOOLS / F12 / CRACK
   Không cho xem source, không cho F12, không cho copy code
   ============================================================ */

(function(){
  'use strict';

  /* ============ CẤU HÌNH ============ */
  const CONFIG = {
    blockRightClick: true,       // Chặn chuột phải
    blockF12: true,              // Chặn F12
    blockCtrlShift: true,        // Chặn Ctrl+Shift+I/J/C/K
    blockCtrlU: true,            // Chặn Ctrl+U (view source)
    blockCtrlS: true,            // Chặn Ctrl+S (lưu trang)
    blockCtrlP: true,            // Chặn Ctrl+P (in trang)
    blockCtrlA: true,            // Chặn Ctrl+A (chọn tất cả)
    blockCtrlC: false,           // Chặn Ctrl+C (copy) - để false để không chặn user copy text
    blockDevtoolKey: true,       // Chặn phím tắt mở devtools
    detectDevtools: true,        // Phát hiện DevTools đang mở
    devtoolsAction: 'redirect',  // 'redirect' | 'block' | 'warn' | 'none'
    redirectURL: 'about:blank',  // URL chuyển khi phát hiện devtools
    antiDebug: true,             // Anti-debugging (chống breakpoint)
    disableConsole: false,       // Vô hiệu hóa console.log (tắt để không ảnh hưởng tool)
    warnMessage: '⛔ KHÔNG ĐƯỢC PHÉP XEM MÃ NGUỒN!\n\nHệ thống đã ghi nhận IP và thông tin thiết bị của bạn.\nVui lòng đóng DevTools ngay!'
  };

  /* ============ 1. CHẶN CHUỘT PHẢI ============ */
  if(CONFIG.blockRightClick){
    document.addEventListener('contextmenu', function(e){
      e.preventDefault();
      e.stopPropagation();
      return false;
    }, true);
  }

  /* ============ 2. CHẶN PHÍM TẮT ============ */
  document.addEventListener('keydown', function(e){
    const key = e.key;
    const code = e.keyCode || e.which;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;

    // F12
    if(CONFIG.blockF12 && code === 123){
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I/J/C/K (DevTools)
    if(CONFIG.blockCtrlShift && ctrl && shift && (
      code === 73 || // I
      code === 74 || // J
      code === 67 || // C
      code === 75    // K
    )){
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+R (hard reload - giữ để user reload được)
    // Không chặn

    // Ctrl+U (view source)
    if(CONFIG.blockCtrlU && ctrl && !shift && code === 85){
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S (save page)
    if(CONFIG.blockCtrlS && ctrl && !shift && code === 83){
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+P (print)
    if(CONFIG.blockCtrlP && ctrl && !shift && code === 80){
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+A (select all) - chỉ chặn ngoài input
    if(CONFIG.blockCtrlA && ctrl && !shift && code === 65){
      const tag = (e.target.tagName || '').toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if(!isInput){
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }

    // Ctrl+C (copy) - chỉ chặn ngoài input nếu bật
    if(CONFIG.blockCtrlC && ctrl && !shift && code === 67){
      const tag = (e.target.tagName || '').toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if(!isInput){
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }

  }, true);

  /* ============ 3. PHÁT HIỆN DEVTOOLS ============ */
  let devtoolsOpened = false;

  if(CONFIG.detectDevtools){
    const threshold = 160;
    let interval = null;

    const detect = function(){
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      if(widthDiff > threshold || heightDiff > threshold){
        if(!devtoolsOpened){
          devtoolsOpened = true;
          onDevtoolsOpen();
        }
      } else {
        devtoolsOpened = false;
      }
    };

    // Debugger timing detection
    const checkDebug = function(){
      const t0 = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const t1 = performance.now();
      if(t1 - t0 > 120){
        if(!devtoolsOpened){
          devtoolsOpened = true;
          onDevtoolsOpen();
        }
      }
    };

    interval = setInterval(function(){
      detect();
      if(CONFIG.antiDebug) checkDebug();
    }, 1000);
  }

  function onDevtoolsOpen(){
    console.log('%c⚠️ DEVTOOLS ĐANG MỞ!', 'color:red;font-size:20px;font-weight:bold');

    if(CONFIG.devtoolsAction === 'redirect'){
      // Chuyển trang khác
      try{
        document.body.innerHTML = `
          <div style="position:fixed;inset:0;z-index:999999;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;font-family:sans-serif">
            <div style="font-size:80px;margin-bottom:20px">⛔</div>
            <h1 style="font-size:28px;color:#ff4444;margin-bottom:15px">TRUY CẬP BỊ CHẶN</h1>
            <p style="font-size:16px;line-height:1.7;max-width:500px">
              Hệ thống phát hiện bạn đang mở <b style="color:#ff8c42">DevTools</b>.<br>
              Vui lòng đóng DevTools để tiếp tục sử dụng.
            </p>
            <p style="margin-top:20px;font-size:14px;color:#999">
              IP và thông tin thiết bị của bạn đã được ghi nhận.
            </p>
          </div>
        `;
      }catch(e){}
      setTimeout(function(){
        try{
          window.location.replace(CONFIG.redirectURL);
        }catch(e){
          window.location.href = CONFIG.redirectURL;
        }
      }, 2000);
    } else if(CONFIG.devtoolsAction === 'warn'){
      alert(CONFIG.warnMessage);
    }
  }

  /* ============ 4. ANTI-DEBUG (chống breakpoint) ============ */
  if(CONFIG.antiDebug){
    // Vô hiệu hóa console methods (nhẹ nhàng, không gây lỗi)
    const noop = function(){};
    try{
      const methods = ['log','warn','info','debug','dir','table','trace','profile','profileEnd'];
      // Chỉ vô hiệu nếu muốn chặn hoàn toàn
      // Object.defineProperty(window.console, 'log', {value: noop});
      // Object.defineProperty(window.console, 'warn', {value: noop});
      // Object.defineProperty(window.console, 'info', {value: noop});
      // Object.defineProperty(window.console, 'debug', {value: noop});
    }catch(e){}

    // Chặn debugger bằng cách override Function constructor
    try{
      const originalFunction = window.Function;
      window.Function = function(){
        const code = arguments[arguments.length - 1];
        if(typeof code === 'string' && code.indexOf('debugger') !== -1){
          return noop;
        }
        return originalFunction.apply(this, arguments);
      };
    }catch(e){}
  }

  /* ============ 5. CHẶN DRAG/DROP ẢNH ============ */
  document.addEventListener('dragstart', function(e){
    if(e.target.tagName === 'IMG'){
      e.preventDefault();
      return false;
    }
  }, true);

  /* ============ 6. CHẶN KÉO CHỌN VĂN BẢN ============ */
  // Nếu muốn chặn copy toàn bộ, bật dòng dưới
  // document.addEventListener('selectstart', function(e){
  //   const tag = (e.target.tagName || '').toLowerCase();
  //   const isInput = tag === 'input' || tag === 'textarea';
  //   if(!isInput) e.preventDefault();
  // }, true);

  /* ============ 7. PHÁT HIỆN IFRAME DEBUG ============ */
  try{
    if(window.top !== window.self){
      // Đang bị nhúng trong iframe → có thể bị debug
      const w = window.top;
    }
  }catch(e){}

  /* ============ 8. WATERMARK ẨN ============ */
  try{
    const wm = document.createElement('div');
    wm.style.cssText = 'position:fixed;bottom:5px;left:5px;font-size:9px;color:rgba(0,0,0,.08);z-index:0;pointer-events:none;user-select:none;font-family:monospace';
    wm.textContent = 'BONSICOLA © ' + new Date().getFullYear();
    document.body.appendChild(wm);
  }catch(e){}

  /* ============ 9. LOG CẢNH BÁO ============ */
  try{
    const styleBig = 'color:#ff0000;font-size:36px;font-weight:bold;text-shadow:0 2px 4px rgba(0,0,0,.3)';
    const styleMed = 'color:#ff4444;font-size:18px;font-weight:bold';
    const styleNor = 'color:#333;font-size:14px';

    console.log('%c⛔ STOP! ⛔', styleBig);
    console.log('%cĐây là vùng dành cho nhà phát triển!', styleMed);
    console.log('%cNếu ai đó yêu cầu bạn dán mã vào đây — đó là LỪA ĐẢO!', styleNor);
    console.log('%cViệc xem mã nguồn có thể bị ghi nhận IP.', styleNor);
  }catch(e){}

  /* ============ 10. BLOCK IFRAME EMBED ============ */
  try{
    if(window.top !== window.self){
      // Tự động phá iframe nếu bị nhúng
      const top = window.top;
      // top.location = window.self.location; // Nếu muốn phá
    }
  }catch(e){}

  /* ============ EXPORT ============ */
  window.Security = {
    CONFIG: CONFIG,
    isDevtoolsOpen: function(){ return devtoolsOpened; }
  };

})();
