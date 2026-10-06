/* ============================================================
   CLOUD - GitHub Gist
   ============================================================
   HƯỚNG DẪN:
   1. Vào https://gist.github.com tạo gist mới
      - Filename: leminh-data.json
      - Content: {}  (2 ký tự)
      - Create secret gist
      - Copy Gist ID từ URL
   2. Vào https://github.com/settings/tokens
      - Generate new token (classic)
      - Tick ô "gist" → Generate
      - Copy token
   3. Dán vào 2 dòng dưới + đổi enabled thành true
   ============================================================ */
window.CLOUD_CONFIG = {
  gist_id: "$2a$10$nom9gdEv9MB3iCWIKZ5CPuyPDCCTKVy7bBV3jsvEzCrE0jcy1MCdm",            // ← $2a$10$nom9gdEv9MB3iCWIKZ5CPuyPDCCTKVy7bBV3jsvEzCrE0jcy1MCdm
  token: "2b4ced53dc9e6a0425fb2c094eb8a9ac.js",              // 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
  enabled: true,         // ← ĐỔI THÀNH true sau khi dán
  poll_interval: 5000     // 5 giây (test nhanh). Sau đổi thành 15000
};

window.APP_CONFIG = {
  site_name: "TOOL BONSICOLA",
  marquee: "⚡ Hệ Thống AI Phân Tích Dữ Liệu Thế Hệ Mới ✦ 🔐 Nạp tiền → mua key → mở tool",
  notice_title: "📢 Thông báo",
  notice: "Chào mừng đến với TOOL BONSICOLA!\n• Nạp tiền → Admin duyệt → Tự động mua key\n• Có key mới mở được tool\n• Liên hệ: leminhdz@gmail.com",
  login_avatar: "",
  bg_music: "",
  bg_music_enabled: 1,
  bank: { name:"MB BANK", acc:"0123456789", holder:"LE HOANG MINH", qr:"" },
  packages: [
    {id:'p1',name:'VIP 1 Ngày',days:1,price:45000,old:55000,disc:'-18%',sub:'Gói đặc quyền'},
    {id:'p3',name:'VIP 3 Ngày',days:3,price:120000,old:150000,disc:'-20%',sub:'Gói đặc quyền'},
    {id:'p7',name:'VIP 1 Tuần',days:7,price:250000,old:300000,disc:'-17%',sub:'Gói đặc quyền'},
    {id:'p30',name:'VIP 1 Tháng',days:30,price:800000,old:1000000,disc:'-20%',sub:'Gói đặc quyền'}
  ],
  tools: [
    {name:"LC79 Tài Xỉu",slug:"lc79-tx",cat:"taixiu",panel:"taixiu",game_url:"https://lc79.bet",api_url:"https://wtx.tele68.com/v1/tx/sessions",image:"https://files.catbox.moe/ng8pg8.jfif",image_base64:"",hot:1,vip:1,is_new:0,enabled:1,maintenance:0},
    {name:"LC79 MD5",slug:"lc79-md5",cat:"taixiu",panel:"md5",game_url:"https://lc79.bet",api_url:"https://wtxmd52.tele68.com/v1/txmd5/sessions",image:"https://files.catbox.moe/ng8pg8.jfif",image_base64:"",hot:1,vip:1,is_new:0,enabled:1,maintenance:0},
    {name:"BetVip Hũ",slug:"betvip-hu",cat:"taixiu",panel:"taixiu",game_url:"https://play.betvip.hot/",api_url:"https://wtx.macminim6.online/v1/tx/sessions",image:"https://files.catbox.moe/2gu29f.jpg",image_base64:"",hot:1,vip:1,is_new:0,enabled:1,maintenance:0},
    {name:"BetVip MD5",slug:"betvip-md5",cat:"taixiu",panel:"md5",game_url:"https://play.betvip.hot/",api_url:"https://wtxmd52.macminim6.online/v1/txmd5/sessions",image:"https://files.catbox.moe/2gu29f.jpg",image_base64:"",hot:1,vip:1,is_new:0,enabled:1,maintenance:0},
    {name:"Sunwin Tài Xỉu",slug:"sunwin-tx",cat:"taixiu",panel:"taixiu",game_url:"https://web.sunwin.radio/?affId=Sunwin",api_url:"https://cancer-counted-board-dam.trycloudflare.com/api/taixiu/history",image:"https://files.catbox.moe/ny0ayd.jpg",image_base64:"",hot:1,vip:1,is_new:0,enabled:1,maintenance:0},
    {name:"Max789 Hũ",slug:"max789-hu",cat:"taixiu",panel:"taixiu",game_url:"https://play.max789.vin/",api_url:"https://taixiu.maksh3979madfw.com/api/luckydice/GetSoiCau",image:"https://files.catbox.moe/lsz8db.jpg",image_base64:"",hot:1,vip:1,is_new:1,enabled:1,maintenance:0},
    {name:"Max789 MD5",slug:"max789-md5",cat:"taixiu",panel:"md5",game_url:"https://play.max789.vin/",api_url:"https://max789-nqfd.onrender.com/api/taixiumd5/max789",image:"https://files.catbox.moe/lsz8db.jpg",image_base64:"",hot:1,vip:1,is_new:0,enabled:1,maintenance:0},
    {name:"Hitclub Tài Xỉu",slug:"hit-tx",cat:"taixiu",panel:"taixiu",game_url:"https://hitclub.bet",api_url:"https://draw-prisoner-bathroom-anthony.trycloudflare.com/api/hit_tx/history",image:"https://files.catbox.moe/w2lk5r.jpg",image_base64:"",hot:1,vip:1,is_new:0,enabled:1,maintenance:0},
    {name:"B52 Tài Xỉu",slug:"b52-tx",cat:"taixiu",panel:"taixiu",game_url:"https://b52.club",api_url:"https://draw-prisoner-bathroom-anthony.trycloudflare.com/api/b52_tx/history",image:"https://files.catbox.moe/yfwwxu.jpg",image_base64:"",hot:1,vip:1,is_new:0,enabled:1,maintenance:0},
    {name:"Baccarat Sảnh Sexy",slug:"baccarat",cat:"baccarat",panel:"taixiu",game_url:"https://fly88m.cc/",api_url:"https://apisieunhanh.lovable.app/api/public/bYoIEro5CgRHbfQ0qBgcYJYy1rfUTRafwqcZh0ta/apibaccarat",image:"https://files.catbox.moe/5ughb8.png",image_base64:"",hot:1,vip:1,is_new:1,enabled:1,maintenance:0},
    {name:"Xocdiax88 Hũ",slug:"Xocdiax88Hu",cat:"taixiu",panel:"taixiu",game_url:"https://play.xocdia88.news/",api_url:"https://taixiu.system32-cloudfare-356783752985678522.monster/api/luckydice/GetSoiCau",image:"https://files.catbox.moe/7eg34c.jpeg",image_base64:"",hot:0,vip:1,is_new:0,enabled:1,maintenance:0},
    {name:"SumClub TX",slug:"sumclub-tx",cat:"taixiu",panel:"taixiu",game_url:"https://play.sum1.vin/",api_url:"https://apisieunhanh.lovable.app/api/public/bYoIEro5CgRHbfQ0qBgcYJYy1rfUTRafwqcZh0ta/apisumclub",image:"https://files.catbox.moe/lnkimr.jfif",image_base64:"",hot:0,vip:1,is_new:0,enabled:1,maintenance:0}
  ]
};
