<?php
/* ============================================================
   CẤU HÌNH DATABASE - THAY ĐỔI 4 DÒNG NÀY
   ============================================================ */
define('DB_HOST', 'localhost');           // Thường là 'localhost'
define('DB_NAME', 'toolkiemlua_bonsicola'); // Tên database đã tạo ở Bước 1
define('DB_USER', 'toolkiemlua_bonsicola_user'); // Tên user database đã tạo
define('DB_PASS', 'leminhdzios');    // Mật khẩu user database

/* ============================================================
   THÔNG TIN ADMIN - KHÔNG THAY ĐỔI
   ============================================================ */
define('ADMIN_EMAIL', 'leminhdz@gmail.com');
define('ADMIN_PASS', 'admin123');

/* ============================================================
   CẤU HÌNH HỆ THỐNG - KHÔNG THAY ĐỔI
   ============================================================ */
date_default_timezone_set('Asia/Ho_Chi_Minh');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
