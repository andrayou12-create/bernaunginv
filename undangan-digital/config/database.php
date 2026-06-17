<?php
/**
 * DATABASE.PHP - Konfigurasi Koneksi Database
 * Menggunakan PDO untuk keamanan dan fleksibilitas
 */

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'undangan_digital');

try {
    // Buat koneksi PDO
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    // Tampilkan error jika koneksi gagal
    die('Database Connection Error: ' . $e->getMessage());
}
