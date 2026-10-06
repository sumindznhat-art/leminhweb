-- Tạo database (chạy 1 lần)
CREATE DATABASE IF NOT EXISTS bonsicola CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bonsicola;

-- Bảng users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  balance BIGINT DEFAULT 0,
  key_expiry BIGINT DEFAULT 0,
  is_admin TINYINT DEFAULT 0,
  ip VARCHAR(50),
  last_login BIGINT DEFAULT 0,
  created_at BIGINT DEFAULT 0,
  last_api TEXT,
  last_tool VARCHAR(100),
  last_tool_at BIGINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng keys
CREATE TABLE IF NOT EXISTS `keys` (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  days INT DEFAULT 1,
  note VARCHAR(255),
  used TINYINT DEFAULT 0,
  used_by VARCHAR(150),
  created_at BIGINT DEFAULT 0,
  used_at BIGINT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng deposits
CREATE TABLE IF NOT EXISTS deposits (
  id VARCHAR(50) PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  amount BIGINT DEFAULT 0,
  method VARCHAR(50) DEFAULT 'bank',
  status VARCHAR(20) DEFAULT 'pending',
  note TEXT,
  ip VARCHAR(50),
  created_at BIGINT DEFAULT 0,
  approved_at BIGINT DEFAULT 0,
  rejected_at BIGINT DEFAULT 0,
  INDEX idx_email (email),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng history
CREATE TABLE IF NOT EXISTS history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  type VARCHAR(30),
  amount BIGINT DEFAULT 0,
  balance BIGINT DEFAULT 0,
  note VARCHAR(255),
  at BIGINT DEFAULT 0,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bảng config (lưu config toàn site)
CREATE TABLE IF NOT EXISTS config (
  k VARCHAR(100) PRIMARY KEY,
  v LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tạo admin mặc định
INSERT IGNORE INTO users (email, password, name, balance, key_expiry, is_admin, ip, last_login, created_at)
VALUES (
  'leminhdz@gmail.com',
  'admin123',
  'Admin BONSICOLA',
  999999999,
  9999999999999,
  1,
  'local',
  UNIX_TIMESTAMP()*1000,
  UNIX_TIMESTAMP()*1000
);
