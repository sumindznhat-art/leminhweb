<?php
require_once __DIR__ . '/config.php';

function db(){
  static $pdo = null;
  if($pdo) return $pdo;
  try{
    $pdo = new PDO(
      'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
      DB_USER, DB_PASS,
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    return $pdo;
  }catch(Exception $e){ out(['error' => 'DB: ' . $e->getMessage()], 500); }
}
function out($data, $code = 200){
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}
function input(){
  $raw = file_get_contents('php://input');
  $j = json_decode($raw, true);
  return is_array($j) ? $j : array_merge($_GET, $_POST);
}
function nowMs(){ return round(microtime(true) * 1000); }
function getIP(){
  if(!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) return trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
  if(!empty($_SERVER['HTTP_X_REAL_IP'])) return $_SERVER['HTTP_X_REAL_IP'];
  if(!empty($_SERVER['HTTP_CLIENT_IP'])) return $_SERVER['HTTP_CLIENT_IP'];
  return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}
function auth(){
  $in = input();
  $email = strtolower(trim($in['email'] ?? ''));
  $pass = $in['password'] ?? '';
  if(!$email) out(['error' => 'Chưa đăng nhập'], 401);
  $s = db()->prepare('SELECT * FROM users WHERE email = ?');
  $s->execute([$email]);
  $u = $s->fetch();
  if(!$u || $u['password'] !== $pass) out(['error' => 'Sai tài khoản'], 401);
  return $u;
}
function adminOnly(){
  $u = auth();
  if($u['email'] !== ADMIN_EMAIL && !$u['is_admin']) out(['error' => 'Không có quyền'], 403);
  return $u;
}
function genKey(){
  $C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  $g = function() use ($C){
    $s = '';
    for($i = 0; $i < 4; $i++) $s .= $C[random_int(0, strlen($C) - 1)];
    return $s;
  };
  return $g() . '-' . $g() . '-' . $g();
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$in = input();

switch($action){

  /* ===== PING TEST ===== */
  case 'ping':
    out(['success' => true, 'message' => 'API đang chạy', 'time' => nowMs()]);
    break;

  case 'config_get':
    out(['success' => true, 'config' => null]);
    break;

  case 'config_save':
    adminOnly();
    out(['success' => true]);
    break;

  /* ===== ĐĂNG KÝ ===== */
  case 'register': {
    $em = strtolower(trim($in['email'] ?? ''));
    $pw = $in['password'] ?? '';
    $nm = trim($in['name'] ?? '') ?: explode('@', $em)[0];
    if(!$em || !$pw) out(['error' => 'Vui lòng nhập đầy đủ!']);
    if(!filter_var($em, FILTER_VALIDATE_EMAIL)) out(['error' => 'Email không hợp lệ!']);
    if(strlen($pw) < 6) out(['error' => 'Mật khẩu từ 6 ký tự!']);
    $s = db()->prepare('SELECT id FROM users WHERE email = ?');
    $s->execute([$em]);
    if($s->fetch()) out(['error' => 'Email đã được đăng ký!']);
    $ip = getIP();
    $now = nowMs();
    db()->prepare('INSERT INTO users (email, password, name, balance, key_expiry, is_admin, ip, last_login, created_at) VALUES (?, ?, ?, 0, 0, 0, ?, ?, ?)')
      ->execute([$em, $pw, $nm, $ip, $now, $now]);
    out(['success' => true]);
  }

  /* ===== ĐĂNG NHẬP ===== */
  case 'login': {
    $em = strtolower(trim($in['email'] ?? ''));
    $pw = $in['password'] ?? '';
    if(!$em || !$pw) out(['error' => 'Vui lòng nhập đầy đủ!']);
    $s = db()->prepare('SELECT * FROM users WHERE email = ?');
    $s->execute([$em]);
    $u = $s->fetch();
    if(!$u && $em === ADMIN_EMAIL && $pw === ADMIN_PASS){
      db()->prepare('INSERT INTO users (email, password, name, balance, key_expiry, is_admin, ip, last_login, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)')
        ->execute([ADMIN_EMAIL, ADMIN_PASS, 'Admin BONSICOLA', 999999999, 9999999999999, 'local', nowMs(), nowMs()]);
      $s->execute([$em]);
      $u = $s->fetch();
    }
    if(!$u || $u['password'] !== $pw) out(['error' => 'Sai email hoặc mật khẩu!']);
    if($em === ADMIN_EMAIL){
      db()->prepare('UPDATE users SET is_admin = 1 WHERE email = ?')->execute([$em]);
      $u['is_admin'] = 1;
    }
    $ip = getIP();
    $now = nowMs();
    db()->prepare('UPDATE users SET ip = ?, last_login = ? WHERE email = ?')->execute([$ip, $now, $em]);
    $u['ip'] = $ip;
    $u['last_login'] = $now;
    unset($u['password']);
    out(['success' => true, 'user' => $u]);
  }

  /* ===== LẤY USER ===== */
  case 'get_user': {
    $u = auth();
    unset($u['password']);
    out(['success' => true, 'user' => $u]);
  }

  /* ============================================================
     USER B: GỬI YÊU CẦU NẠP TIỀN
     → Lưu vào MySQL với email + tên + IP + số tiền
     ============================================================ */
  case 'deposit_create': {
    $u = auth();
    $amount = intval($in['amount'] ?? 0);
    $note = trim($in['note'] ?? '');
    $method = $in['method'] ?? 'bank';
    if($amount < 10000) out(['error' => 'Số tiền tối thiểu 10,000đ!']);
    
    $id = 'dep_' . nowMs() . '_' . bin2hex(random_bytes(3));
    $ip = getIP();
    $name = $u['name'] ?? explode('@', $u['email'])[0];
    
    db()->prepare('INSERT INTO deposits (id, email, amount, method, status, note, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      ->execute([$id, $u['email'], $amount, $method, 'pending', $note, $ip, nowMs()]);
    
    out(['success' => true, 'id' => $id, 'message' => 'Đã gửi yêu cầu nạp ' . number_format($amount) . 'đ']);
  }

  /* ============================================================
     ADMIN A: XEM DANH SÁCH CHỜ DUYỆT (có tên user + số tiền + IP)
     ============================================================ */
  case 'deposit_pending': {
    adminOnly();
    $s = db()->query("
      SELECT 
        d.id,
        d.email,
        d.amount,
        d.method,
        d.status,
        d.note,
        d.ip,
        d.created_at,
        u.name AS user_name,
        u.balance AS user_balance,
        u.ip AS user_ip
      FROM deposits d
      LEFT JOIN users u ON d.email = u.email
      WHERE d.status = 'pending'
      ORDER BY d.created_at DESC
    ");
    $rows = $s->fetchAll();
    // Chuẩn hóa tên user
    foreach($rows as &$r){
      if(empty($r['user_name'])){
        $r['user_name'] = explode('@', $r['email'])[0];
      }
    }
    out(['success' => true, 'deposits' => $rows]);
  }

  /* ============================================================
     ADMIN A: DUYỆT TIỀN → Tự động cộng + mua key
     ============================================================ */
  case 'deposit_approve': {
    adminOnly();
    $id = $in['id'] ?? '';
    $s = db()->prepare('SELECT * FROM deposits WHERE id = ? AND status = ?');
    $s->execute([$id, 'pending']);
    $d = $s->fetch();
    if(!$d) out(['error' => 'Không tìm thấy yêu cầu']);
    
    $pdo = db();
    $pdo->beginTransaction();
    try{
      $s = $pdo->prepare('SELECT * FROM users WHERE email = ?');
      $s->execute([$d['email']]);
      $u = $s->fetch();
      if(!$u) throw new Exception('User không tồn tại');
      
      $newBalance = $u['balance'] + $d['amount'];
      $pdo->prepare('UPDATE users SET balance = ? WHERE email = ?')->execute([$newBalance, $d['email']]);
      $pdo->prepare('INSERT INTO history (email, type, amount, balance, note, at) VALUES (?, ?, ?, ?, ?, ?)')
        ->execute([$d['email'], 'deposit', $d['amount'], $newBalance, 'Nạp tiền', nowMs()]);
      $pdo->prepare('UPDATE deposits SET status = ?, approved_at = ? WHERE id = ?')
        ->execute(['approved', nowMs(), $id]);
      
      // Tự động mua key nếu chưa có key
      autoBuyKey($d['email']);
      
      $pdo->commit();
      out(['success' => true, 'new_balance' => $newBalance]);
    }catch(Exception $e){
      $pdo->rollBack();
      out(['error' => $e->getMessage()], 500);
    }
  }

  case 'deposit_reject': {
    adminOnly();
    $id = $in['id'] ?? '';
    $reason = $in['reason'] ?? 'Không hợp lệ';
    db()->prepare('UPDATE deposits SET status = ?, rejected_at = ?, note = ? WHERE id = ?')
      ->execute(['rejected', nowMs(), $reason, $id]);
    out(['success' => true]);
  }

  /* ============================================================
     ADMIN: DANH SÁCH USER
     ============================================================ */
  case 'user_list': {
    adminOnly();
    $s = db()->query('SELECT id, email, name, balance, key_expiry, is_admin, ip, last_login, created_at FROM users ORDER BY is_admin DESC, last_login DESC');
    out(['success' => true, 'users' => $s->fetchAll()]);
  }

  case 'user_update': {
    adminOnly();
    $em = strtolower($in['email'] ?? '');
    $sets = []; $vals = [];
    if(isset($in['balance'])){ $sets[] = 'balance = ?'; $vals[] = intval($in['balance']); }
    if(isset($in['key_expiry'])){ $sets[] = 'key_expiry = ?'; $vals[] = intval($in['key_expiry']); }
    if(isset($in['is_admin'])){ $sets[] = 'is_admin = ?'; $vals[] = intval($in['is_admin']); }
    if(isset($in['name'])){ $sets[] = 'name = ?'; $vals[] = $in['name']; }
    if(!$sets) out(['error' => 'Không có gì cập nhật']);
    $vals[] = $em;
    db()->prepare('UPDATE users SET ' . implode(', ', $sets) . ' WHERE email = ?')->execute($vals);
    out(['success' => true]);
  }

  case 'user_delete': {
    adminOnly();
    $em = strtolower($in['email'] ?? '');
    if($em === ADMIN_EMAIL) out(['error' => 'Không thể xoá admin tổng']);
    db()->prepare('DELETE FROM users WHERE email = ?')->execute([$em]);
    out(['success' => true]);
  }

  /* ===== KEY ===== */
  case 'key_create': {
    adminOnly();
    $days = max(1, intval($in['days'] ?? 1));
    $qty = min(100, max(1, intval($in['qty'] ?? 1)));
    $note = trim($in['note'] ?? '');
    $created = [];
    $pdo = db();
    for($i = 0; $i < $qty; $i++){
      $code = genKey();
      $pdo->prepare('INSERT INTO `keys` (code, days, note, created_at) VALUES (?, ?, ?, ?)')
        ->execute([$code, $days, $note, nowMs()]);
      $created[] = $code;
    }
    out(['success' => true, 'keys' => $created]);
  }

  case 'key_activate': {
    $u = auth();
    $code = strtoupper(trim($in['code'] ?? ''));
    if(!$code) out(['error' => 'Vui lòng nhập key!']);
    $s = db()->prepare('SELECT * FROM `keys` WHERE code = ?');
    $s->execute([$code]);
    $k = $s->fetch();
    if(!$k) out(['error' => 'Key không tồn tại!']);
    if($k['used']) out(['error' => 'Key đã sử dụng!']);
    $base = ($u['key_expiry'] > nowMs()) ? $u['key_expiry'] : nowMs();
    $newExpiry = $base + ($k['days'] * 24 * 3600 * 1000);
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->prepare('UPDATE users SET key_expiry = ? WHERE email = ?')->execute([$newExpiry, $u['email']]);
    $pdo->prepare('UPDATE `keys` SET used = 1, used_by = ?, used_at = ? WHERE code = ?')
      ->execute([$u['email'], nowMs(), $code]);
    $pdo->prepare('INSERT INTO history (email, type, amount, balance, note, at) VALUES (?, ?, ?, ?, ?, ?)')
      ->execute([$u['email'], 'key', 0, $u['balance'], 'Kích hoạt key +' . $k['days'] . ' ngày', nowMs()]);
    $pdo->commit();
    out(['success' => true, 'days' => $k['days'], 'new_expiry' => $newExpiry]);
  }

  case 'key_list': {
    adminOnly();
    $s = db()->query('SELECT * FROM `keys` ORDER BY created_at DESC LIMIT 200');
    out(['success' => true, 'keys' => $s->fetchAll()]);
  }

  case 'key_delete': {
    adminOnly();
    $code = $in['code'] ?? '';
    db()->prepare('DELETE FROM `keys` WHERE code = ?')->execute([$code]);
    out(['success' => true]);
  }

  case 'history': {
    $u = auth();
    $s = db()->prepare('SELECT * FROM history WHERE email = ? ORDER BY at DESC LIMIT 100');
    $s->execute([$u['email']]);
    out(['success' => true, 'history' => $s->fetchAll()]);
  }

  case 'buy_package': {
    $u = auth();
    $days = intval($in['days'] ?? 0);
    $price = intval($in['price'] ?? 0);
    if($days < 1 || $price < 1) out(['error' => 'Gói không hợp lệ!']);
    if($u['balance'] < $price) out(['error' => 'Số dư không đủ!']);
    $base = ($u['key_expiry'] > nowMs()) ? $u['key_expiry'] : nowMs();
    $newExpiry = $base + ($days * 24 * 3600 * 1000);
    $newBalance = $u['balance'] - $price;
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->prepare('UPDATE users SET balance = ?, key_expiry = ? WHERE email = ?')
      ->execute([$newBalance, $newExpiry, $u['email']]);
    $pdo->prepare('INSERT INTO history (email, type, amount, balance, note, at) VALUES (?, ?, ?, ?, ?, ?)')
      ->execute([$u['email'], 'buy', -$price, $newBalance, 'Mua gói VIP ' . $days . ' ngày', nowMs()]);
    $pdo->commit();
    out(['success' => true, 'new_balance' => $newBalance, 'new_expiry' => $newExpiry]);
  }

  case 'update_last_api': {
    $u = auth();
    db()->prepare('UPDATE users SET last_api = ?, last_tool = ?, last_tool_at = ? WHERE email = ?')
      ->execute([$in['api'] ?? '', $in['tool'] ?? '', nowMs(), $u['email']]);
    out(['success' => true]);
  }

  /* ============================================================
     ADMIN: SAO LƯU TOÀN BỘ DỮ LIỆU
     Trả về file JSON chứa tất cả user + deposit + key + history
     ============================================================ */
  case 'backup_data': {
    adminOnly();
    
    $users = db()->query('SELECT * FROM users')->fetchAll();
    $deposits = db()->query('SELECT * FROM deposits ORDER BY created_at DESC LIMIT 1000')->fetchAll();
    $keys = db()->query('SELECT * FROM `keys` ORDER BY created_at DESC LIMIT 1000')->fetchAll();
    $history = db()->query('SELECT * FROM history ORDER BY at DESC LIMIT 2000')->fetchAll();
    
    // Ẩn password khi backup
    foreach($users as &$u){ unset($u['password']); }
    
    $backup = [
      'version' => '1.0',
      'exported_at' => date('Y-m-d H:i:s'),
      'exported_by' => ADMIN_EMAIL,
      'summary' => [
        'total_users' => count($users),
        'total_deposits' => count($deposits),
        'total_keys' => count($keys),
        'total_history' => count($history)
      ],
      'data' => [
        'users' => $users,
        'deposits' => $deposits,
        'keys' => $keys,
        'history' => $history
      ]
    ];
    
    // Cho phép tải file JSON
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="bonsicola-backup-' . date('Ymd-His') . '.json"');
    echo json_encode($backup, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
  }

  /* ============================================================
     ADMIN: XEM CHI TIẾT 1 USER (bao gồm cả lịch sử)
     ============================================================ */
  case 'user_detail': {
    adminOnly();
    $em = strtolower($in['email'] ?? '');
    if(!$em) out(['error' => 'Thiếu email']);
    
    $s = db()->prepare('SELECT id, email, name, balance, key_expiry, is_admin, ip, last_login, created_at FROM users WHERE email = ?');
    $s->execute([$em]);
    $user = $s->fetch();
    if(!$user) out(['error' => 'Không tìm thấy user']);
    
    $s = db()->prepare('SELECT * FROM deposits WHERE email = ? ORDER BY created_at DESC LIMIT 100');
    $s->execute([$em]);
    $deposits = $s->fetchAll();
    
    $s = db()->prepare('SELECT * FROM history WHERE email = ? ORDER BY at DESC LIMIT 100');
    $s->execute([$em]);
    $history = $s->fetchAll();
    
    out(['success' => true, 'user' => $user, 'deposits' => $deposits, 'history' => $history]);
  }

  default:
    out([
      'error' => 'Action không hợp lệ',
      'received' => $action,
      'hint' => 'Dùng ?action=config_get để test kết nối'
    ], 400);
}

/* ============================================================
   TỰ ĐỘNG MUA KEY KHI ĐƯỢC DUYỆT TIỀN
   ============================================================ */
function autoBuyKey($email){
  $pdo = db();
  $s = $pdo->prepare('SELECT * FROM users WHERE email = ?');
  $s->execute([$email]);
  $u = $s->fetch();
  if(!$u) return;
  if($u['is_admin']) return;
  if($u['key_expiry'] > nowMs()) return;
  
  $packages = [
    ['name' => 'VIP 1 Ngày', 'days' => 1, 'price' => 10000],
    ['name' => 'VIP 3 Ngày', 'days' => 3, 'price' => 30000],
    ['name' => 'VIP 1 Tuần', 'days' => 7, 'price' => 80000],
    ['name' => 'VIP 1 Tháng', 'days' => 30, 'price' => 200000]
  ];
  
  $avail = array_filter($packages, function($p) use ($u){
    return $p['price'] <= $u['balance'];
  });
  
  if(!$avail) return;
  usort($avail, function($a, $b){ return $a['days'] - $b['days']; });
  $pkg = end($avail);
  
  $newExpiry = nowMs() + ($pkg['days'] * 24 * 3600 * 1000);
  $newBalance = $u['balance'] - $pkg['price'];
  
  $pdo->prepare('UPDATE users SET balance = ?, key_expiry = ? WHERE email = ?')
    ->execute([$newBalance, $newExpiry, $email]);
  $pdo->prepare('INSERT INTO history (email, type, amount, balance, note, at) VALUES (?, ?, ?, ?, ?, ?)')
    ->execute([$email, 'auto-buy', -$pkg['price'], $newBalance, 'Tự động mua ' . $pkg['name'], nowMs()]);
}
?>
