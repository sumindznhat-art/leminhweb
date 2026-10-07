/* ============================================================
   assets/js/config.js  —  CẤU HÌNH HỆ THỐNG
   ============================================================ */
window.CONFIG = {

  /* 🎯 CHẾ ĐỘ CHẠY
     true  = offline (localStorage, chạy ngay không cần server)
     false = online (gọi server backend) */
  OFFLINE_MODE: true,

  /* 🌐 Địa chỉ server backend (chỉ dùng khi OFFLINE_MODE = false)
     Ví dụ: 'https://api.kiemlua2026.site'  */
  API_BASE: 'https://api.toolkiemlua2026.site',

  /* Timeout mỗi request (ms) */
  API_TIMEOUT: 15000,

  /* 👑 ADMIN MẶC ĐỊNH — đổi ngay sau khi cài */
  adminEmail: 'leminhdz@tool.com',
  adminPass: 'leminh',
  adminName: 'Super Admin',

  /* 🏦 Ngân hàng */
  bank: {
    name: 'MB Bank',
    account: '0372834763',
    owner: 'BON SICOLA'
  },

  /* 💎 Gói VIP */
  packages: [
    { id: 'p1d',   name: 'VIP 1 Ngày',  price: 20000,   days: 1   },
    { id: 'p7d',   name: 'VIP 7 Ngày',  price: 100000,  days: 7   },
    { id: 'p30d',  name: 'VIP 30 Ngày', price: 300000,  days: 30  },
    { id: 'p365d', name: 'VIP 1 Năm',   price: 2000000, days: 365 }
  ],

  /* 🎮 Danh sách tool */
  tools: [
    { id: 't1', name: 'Tài Xỉu Sunwin',      url: 'https://google.com' },
    { id: 't2', name: 'Baccarat Kubet',      url: 'https://google.com' },
    { id: 't3', name: 'Tài Xỉu Go88',        url: 'https://google.com' },
    { id: 't4', name: 'Tool Đọc Vị Tài Xỉu', url: 'https://google.com' }
  ]
};
