<?php
/* ============================================================
   BONSICOLA TOOL - CONFIG DATABASE
   ============================================================
   
   HƯỚNG DẪN SỬA 4 DÒNG BÊN DƯỚI:
   
   Bước 1: Vào cPanel → MySQL Databases
   Bước 2: Tạo Database mới (VD: bonsicola)
           → Hệ thống tạo tên: toolkiemlua_bonsicola
   Bước 3: Tạo User Database (VD: admin)
           → Hệ thống tạo tên: toolkiemlua_admin
   Bước 4: Gán User vào Database với ALL PRIVILEGES
   Bước 5: Điền 4 thông tin vào bên dưới
   
   ============================================================ */

/* ============================================================
   ⚠️ SỬA 4 DÒNG NÀY — THAY BẰNG THÔNG TIN CỦA BẠN
   ============================================================ */

/* DB_HOST: Luôn là 'localhost' (99% trường hợp) */
define('DB_HOST', 'localhost');

/* DB_NAME: Tên database có prefix username cPanel
   VD: Nếu username cPanel là 'toolkiemlua' và bạn đặt tên 'bonsicola'
   → Tên đầy đủ: 'toolkiemlua_bonsicola' */
define('DB_NAME', 'toolkiemlua_bonsicola');

/* DB_USER: Tên user database có prefix username cPanel
   VD: Nếu username cPanel là 'toolkiemlua' và bạn đặt tên user 'admin'
   → Tên đầy đủ: 'toolkiemlua_admin' */
define('DB_USER', 'toolkiemlua_admin');

/* DB_PASS: Mật khẩu của user database bạn vừa tạo */
define('DB_PASS', 'leminhdz');

/* ============================================================
   ⚠️ KHÔNG SỬA TỪ ĐÂY TRỞ XUỐNG
   ============================================================ */

/* Tài khoản admin mặc định */
define('ADMIN_EMAIL', 'leminhdz@gmail.com');
define('ADMIN_PASS', 'admin123');

/* Cấu hình hệ thống */
date_default_timezone_set('Asia/Ho_Chi_Minh');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

/* Xử lý preflight request */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* Bật hiển thị lỗi (tắt khi chạy production) */
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

/* ============================================================
   KIỂM TRA NHANH
   ============================================================
   Sau khi sửa xong 4 dòng trên, mở trình duyệt và gõ:
   
   https://toolkiemlua2026.site/api/index.php?action=config_get
   
   Kết quả mong đợi: {"success":true,"config":null}
   
   Nếu thấy kết quả trên → DB kết nối thành công ✅
   Nếu thấy lỗi → đọc thông báo lỗi để biết sai chỗ nào
   ============================================================ */
