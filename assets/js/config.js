/* ============================================================
   assets/js/config.js
   CẤU HÌNH HỆ THỐNG
   ============================================================ */

const CONFIG = {

  /* ============================================================
     🌐 SERVER URL — SỬA DUY NHẤT DÒNG NÀY
     ============================================================
     Điền URL backend của bạn (KHÔNG có dấu / ở cuối)

     Ví dụ:
       'https://api.kiemlua2026.site'   ← subdomain riêng
       'https://kiemlua2026.site/api'   ← cùng domain
       'http://123.45.67.89:3000'       ← VPS IP + port
  */
  API_BASE: 'https://toolkiemlua2026.site',

  /* Thời gian chờ tối đa mỗi request (mili giây) */
  API_TIMEOUT: 15000,

  /* Fallback servers (tuỳ chọn) — nếu server chính sập sẽ thử server này */
  API_FALLBACKS: [
    // 'https://api2.kiemlua2026.site'
  ],

  /* ============================================================
     🏦 THÔNG TIN NGÂN HÀNG
     ============================================================ */
  bank: {
    name: 'MB Bank',
    account: '0372834763',
    owner: 'BON SICOLA',
    qr: 'https://img.vietqr.io/image/MB-0123456789-compact2.png'
  },

  /* ============================================================
     💎 GÓI VIP
     ============================================================ */
  packages: [
    { id: 'p1d',   name: 'VIP 1 Ngày',  price: 20000,   days: 1   },
    { id: 'p7d',   name: 'VIP 7 Ngày',  price: 100000,  days: 7   },
    { id: 'p30d',  name: 'VIP 30 Ngày', price: 300000,  days: 30  },
    { id: 'p365d', name: 'VIP 1 Năm',   price: 2000000, days: 365 }
  ],

  /* ============================================================
     🎮 DANH SÁCH TOOL
     ============================================================ */
  tools: [
    { id: 't1', name: 'Tài Xỉu Sunwin', cat: 'game', url: 'https://google.com' },
    { id: 't2', name: 'Baccarat Kubet', cat: 'game', url: 'https://google.com' },
    { id: 't3', name: 'Tài Xỉu Go88',   cat: 'game', url: 'https://google.com' },
    { id: 't4', name: 'Tool Đọc Vị',    cat: 'tool', url: 'https://google.com' }
  ]
};
