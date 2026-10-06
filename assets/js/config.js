/* ============================================================
   BONSICOLA - CONFIG.JS
   API Server: http://toolkiemlua2026.site
   ============================================================ */

/* URL API SERVER (PHP) */
window.API_URL = "http://toolkiemlua2026.site/api/index.php";

/* ============================================================
   CONFIG MẶC ĐỊNH
   ============================================================ */
window.APP_CONFIG = {
  /* ==== CẤU HÌNH CHUNG ==== */
  site_name: "BONSICOLA TOOL",
  marquee: "⚡ Hệ Thống AI Phân Tích Dữ Liệu Thế Hệ Mới ✦ 🔐 Nạp tiền → Mua key → Mở tool",
  notice_title: "📢 Thông báo",
  notice: "Chào mừng đến với BONSICOLA TOOL!\n\n• Nạp tiền → Admin duyệt → Tự động mua key\n• Có key mới mở được tool\n• Liên hệ Admin: leminhdz@gmail.com\n\nChúc bạn thắng lớn! 🎉",

  /* ==== AVATAR ĐĂNG NHẬP MẶC ĐỊNH (Base64) ==== */
  login_avatar: "",

  /* ==== NHẠC NỀN ==== */
  bg_music: "",
  bg_music_enabled: 1,

  /* ==== NGÂN HÀNG NHẬN TIỀN ==== */
  bank: {
    name: "MB BANK",
    acc: "0123456789",
    holder: "LE HOANG MINH",
    qr: ""
  },

  /* ==== GÓI VIP ==== */
  packages: [
    {
      id: 'p1',
      name: 'VIP 1 Ngày',
      days: 1,
      price: 10000,
      old: 15000,
      disc: '-33%',
      sub: 'Gói đặc quyền'
    },
    {
      id: 'p3',
      name: 'VIP 3 Ngày',
      days: 3,
      price: 30000,
      old: 45000,
      disc: '-33%',
      sub: 'Gói đặc quyền'
    },
    {
      id: 'p7',
      name: 'VIP 1 Tuần',
      days: 7,
      price: 80000,
      old: 120000,
      disc: '-33%',
      sub: 'Gói đặc quyền'
    },
    {
      id: 'p30',
      name: 'VIP 1 Tháng',
      days: 30,
      price: 200000,
      old: 300000,
      disc: '-33%',
      sub: 'Gói đặc quyền'
    }
  ],

  /* ==== DANH SÁCH TOOL ==== */
  tools: [
    {
      name: "LC79 Tài Xỉu",
      slug: "lc79-tx",
      cat: "taixiu",
      panel: "taixiu",
      game_url: "https://lc79.bet",
      api_url: "https://wtx.tele68.com/v1/tx/sessions",
      image: "https://files.catbox.moe/ng8pg8.jfif",
      image_base64: "",
      html_content: "",
      hot: 1,
      vip: 1,
      is_new: 0,
      enabled: 1,
      maintenance: 0
    },
    {
      name: "LC79 MD5",
      slug: "lc79-md5",
      cat: "taixiu",
      panel: "md5",
      game_url: "https://lc79.bet",
      api_url: "https://wtxmd52.tele68.com/v1/txmd5/sessions",
      image: "https://files.catbox.moe/ng8pg8.jfif",
      image_base64: "",
      html_content: "",
      hot: 1,
      vip: 1,
      is_new: 0,
      enabled: 1,
      maintenance: 0
    },
    {
      name: "BetVip Hũ",
      slug: "betvip-hu",
      cat: "taixiu",
      panel: "taixiu",
      game_url: "https://play.betvip.hot/",
      api_url: "https://wtx.macminim6.online/v1/tx/sessions",
      image: "https://files.catbox.moe/2gu29f.jpg",
      image_base64: "",
      html_content: "",
      hot: 1,
      vip: 1,
      is_new: 0,
      enabled: 1,
      maintenance: 0
    },
    {
      name: "BetVip MD5",
      slug: "betvip-md5",
      cat: "taixiu",
      panel: "md5",
      game_url: "https://play.betvip.hot/",
      api_url: "https://wtxmd52.macminim6.online/v1/txmd5/sessions",
      image: "https://files.catbox.moe/2gu29f.jpg",
      image_base64: "",
      html_content: "",
      hot: 1,
      vip: 1,
      is_new: 0,
      enabled: 1,
      maintenance: 0
    },
    {
      name: "Sunwin Tài Xỉu",
      slug: "sunwin-tx",
      cat: "taixiu",
      panel: "taixiu",
      game_url: "https://web.sunwin.radio/?affId=Sunwin",
      api_url: "https://cancer-counted-board-dam.trycloudflare.com/api/taixiu/history",
      image: "https://files.catbox.moe/ny0ayd.jpg",
      image_base64: "",
      html_content: "",
      hot: 1,
      vip: 1,
      is_new: 0,
      enabled: 1,
      maintenance: 0
    },
    {
      name: "Max789 Hũ",
      slug: "max789-hu",
      cat: "taixiu",
      panel: "taixiu",
      game_url: "https://play.max789.vin/",
      api_url: "https://taixiu.maksh3979madfw.com/api/luckydice/GetSoiCau",
      image: "https://files.catbox.moe/lsz8db.jpg",
      image_base64: "",
      html_content: "",
      hot: 1,
      vip: 1,
      is_new: 1,
      enabled: 1,
      maintenance: 0
    },
    {
      name: "Max789 MD5",
      slug: "max789-md5",
      cat: "taixiu",
      panel: "md5",
      game_url: "https://play.max789.vin/",
      api_url: "https://max789-nqfd.onrender.com/api/taixiumd5/max789",
      image: "https://files.catbox.moe/lsz8db.jpg",
      image_base64: "",
      html_content: "",
      hot: 1,
      vip: 1,
      is_new: 0,
      enabled: 1,
      maintenance: 0
    },
    {
      name: "Hitclub Tài Xỉu",
      slug: "hit-tx",
      cat: "taixiu",
      panel: "taixiu",
      game_url: "https://hitclub.bet",
      api_url: "https://draw-prisoner-bathroom-anthony.trycloudflare.com/api/hit_tx/history",
      image: "https://files.catbox.moe/w2lk5r.jpg",
      image_base64: "",
      html_content: "",
      hot: 1,
      vip: 1,
      is_new: 0,
      enabled: 1,
      maintenance: 0
    },
    {
      name: "B52 Tài Xỉu",
      slug: "b52-tx",
      cat: "taixiu",
      panel: "taixiu",
      game_url: "https://b52.club",
      api_url: "https://draw-prisoner-bathroom-anthony.trycloudflare.com/api/b52_tx/history",
      image: "https://files.catbox.moe/yfwwxu.jpg",
      image_base64: "",
      html_content: "",
      hot: 1,
      vip: 1,
      is_new: 0,
      enabled: 1,
      maintenance: 0
    },
    {
      name: "Baccarat Sảnh Sexy",
      slug: "baccarat",
      cat: "baccarat",
      panel: "taixiu",
      game_url: "https://fly88m.cc/",
      api_url: "https://apisieunhanh.lovable.app/api/public/bYoIEro5CgRHbfQ0qBgcYJYy1rfUTRafwqcZh0ta/apibaccarat",
      image: "https://files.catbox.moe/5ughb8.png",
      image_base64: "",
      html_content: "",
      hot: 1,
      vip: 1,
      is_new: 1,
      enabled: 1,
      maintenance: 0
    },
    {
      name: "Xocdiax88 Hũ",
      slug: "Xocdiax88Hu",
      cat: "taixiu",
      panel: "taixiu",
      game_url: "https://play.xocdia88.news/",
      api_url: "https://taixiu.system32-cloudfare-356783752985678522.monster/api/luckydice/GetSoiCau",
      image: "https://files.catbox.moe/7eg34c.jpeg",
      image_base64: "",
      html_content: "",
      hot: 0,
      vip: 1,
      is_new: 0,
      enabled: 1,
      maintenance: 0
    },
    {
      name: "SumClub TX",
      slug: "sumclub-tx",
      cat: "taixiu",
      panel: "taixiu",
      game_url: "https://play.sum1.vin/",
      api_url: "https://apisieunhanh.lovable.app/api/public/bYoIEro5CgRHbfQ0qBgcYJYy1rfUTRafwqcZh0ta/apisumclub",
      image: "https://files.catbox.moe/lnkimr.jfif",
      image_base64: "",
      html_content: "",
      hot: 0,
      vip: 1,
      is_new: 0,
      enabled: 1,
      maintenance: 0
    }
  ]
};

/* ============================================================
   ADMIN CONSTANTS (không sửa)
   ============================================================ */
window.ADMIN_EMAIL = "leminhdz@gmail.com";
window.ADMIN_PASS  = "admin123";

/* ============================================================
   DEBUG - In ra Console khi load
   ============================================================ */
console.log('%c=== BONSICOLA CONFIG ===', 'background:linear-gradient(135deg,#3b5bfd,#5b7cff);color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold');
console.log('[CONFIG] API_URL:', window.API_URL);
console.log('[CONFIG] Site name:', window.APP_CONFIG.site_name);
console.log('[CONFIG] Số tool:', window.APP_CONFIG.tools.length);
console.log('[CONFIG] Số gói VIP:', window.APP_CONFIG.packages.length);
