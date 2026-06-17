-- Database untuk Sistem Undangan Digital
-- Import file ini ke phpMyAdmin atau MySQL CLI

CREATE DATABASE IF NOT EXISTS undangan_digital;
USE undangan_digital;

-- =============================================
-- TABEL: ADMINS (Data Admin/User)
-- =============================================
CREATE TABLE IF NOT EXISTS admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABEL: PAKET_UNDANGAN (Daftar Paket/Tema)
-- =============================================
CREATE TABLE IF NOT EXISTS paket_undangan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nama_paket VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  deskripsi TEXT,
  harga INT NOT NULL,
  thumbnail VARCHAR(255),
  folder_template VARCHAR(100) NOT NULL,
  status ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABEL: ORDERS (Data Pesanan)
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  paket_id INT NOT NULL,
  email_customer VARCHAR(100) NOT NULL,
  nama_pria VARCHAR(100) NOT NULL,
  nama_wanita VARCHAR(100) NOT NULL,
  ayah_pria VARCHAR(100),
  ibu_pria VARCHAR(100),
  ayah_wanita VARCHAR(100),
  ibu_wanita VARCHAR(100),
  lokasi_akad TEXT,
  link_maps_akad VARCHAR(500),
  tanggal_akad DATE,
  jam_akad TIME,
  lokasi_resepsi TEXT,
  link_maps_resepsi VARCHAR(500),
  tanggal_resepsi DATE,
  jam_resepsi TIME,
  foto_pria VARCHAR(255),
  foto_wanita VARCHAR(255),
  custom_notes TEXT,
  harga_total INT NOT NULL,
  status_pembayaran ENUM('pending', 'paid') DEFAULT 'pending',
  slug_undangan VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (paket_id) REFERENCES paket_undangan(id) ON DELETE CASCADE,
  INDEX idx_email (email_customer),
  INDEX idx_status (status_pembayaran),
  INDEX idx_slug (slug_undangan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INSERT DATA AWAL: ADMIN
-- =============================================
-- Username: admin, Password: admin123
INSERT INTO admins (username, email, password) VALUES 
('admin', 'admin@undangan.com', '$2y$10$dXjbSZ6d9.wL8Lz5Y3c0OuTJ8q0nY2k1X5m9p8vQ3rL4sN7tU6a0C');

-- =============================================
-- INSERT DATA AWAL: PAKET UNDANGAN
-- =============================================
INSERT INTO paket_undangan (nama_paket, slug, deskripsi, harga, folder_template, status) VALUES
(
  'Tema Bunga',
  'tema-bunga',
  'Tema undangan dengan konsep bunga yang elegan dan romantis. Cocok untuk pernikahan tradisional maupun modern.',
  150000,
  'tema-bunga',
  'aktif'
),
(
  'Tema Minimalis',
  'tema-minimalis',
  'Desain minimalis modern dengan warna netral. Sempurna untuk pasangan yang menyukai kesederhanaan.',
  125000,
  'tema-minimalis',
  'aktif'
),
(
  'Tema Elegant',
  'tema-elegant',
  'Tema mewah dengan gradien emas dan warna gelap. Memberikan kesan formal dan sophisticated.',
  200000,
  'tema-elegant',
  'aktif'
);
