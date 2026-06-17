<?php
/**
 * CONFIG.PHP - Konfigurasi Umum Aplikasi
 */

// Koneksi Database
require_once __DIR__ . '/database.php';

// =============================================
// KONFIGURASI UMUM
// =============================================
define('SITE_NAME', 'Undangan Digital');
define('SITE_URL', 'http://localhost/undangan-digital');
define('SITE_EMAIL', 'admin@undangan.com');

// =============================================
// KONFIGURASI UPLOAD
// =============================================
define('MAX_UPLOAD_SIZE', 3 * 1024 * 1024); // 3MB dalam bytes
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif']);
define('ALLOWED_MIME_TYPES', ['image/jpeg', 'image/png', 'image/gif']);
define('UPLOAD_FOLDER', __DIR__ . '/../uploads/foto-mempelai/');
define('UPLOAD_FOLDER_VIDEO', __DIR__ . '/../uploads/video/');

// Pastikan folder upload ada
if (!is_dir(UPLOAD_FOLDER)) {
    mkdir(UPLOAD_FOLDER, 0755, true);
}
if (!is_dir(UPLOAD_FOLDER_VIDEO)) {
    mkdir(UPLOAD_FOLDER_VIDEO, 0755, true);
}

// =============================================
// KONFIGURASI WHATSAPP API (FONNTE)
// =============================================
define('WHATSAPP_API_KEY', 'YOUR_FONNTE_API_KEY_HERE');
define('WHATSAPP_ADMIN_NUMBER', '628xx-xxx-xxxxx'); // Nomor admin (tanpa 0, pakai 62)
define('WHATSAPP_ENABLED', false); // Set true jika sudah punya API key

// =============================================
// KONFIGURASI SESSION
// =============================================
session_start();
define('SESSION_TIMEOUT', 3600); // 1 jam dalam detik

// =============================================
// TIMEZONE
// =============================================
date_default_timezone_set('Asia/Jakarta');

// =============================================
// HELPER FUNCTION: Format Rupiah
// =============================================
if (!function_exists('rupiah')) {
    function rupiah($value) {
        return 'Rp ' . number_format($value, 0, ',', '.');
    }
}

// =============================================
// HELPER FUNCTION: Format Tanggal Indonesia
// =============================================
if (!function_exists('tgl_indo')) {
    function tgl_indo($date) {
        $bulan = [
            1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        $split = explode('-', $date);
        return $split[2] . ' ' . $bulan[(int)$split[1]] . ' ' . $split[0];
    }
}

// =============================================
// HELPER FUNCTION: Check Admin Login
// =============================================
if (!function_exists('checkAdminLogin')) {
    function checkAdminLogin() {
        if (!isset($_SESSION['admin_id'])) {
            header('Location: ' . SITE_URL . '/admin/login.php');
            exit;
        }
        
        // Check session timeout
        if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > SESSION_TIMEOUT)) {
            session_destroy();
            header('Location: ' . SITE_URL . '/admin/login.php?expired=1');
            exit;
        }
        
        $_SESSION['last_activity'] = time();
    }
}

// =============================================
// HELPER FUNCTION: Sanitasi Input
// =============================================
if (!function_exists('sanitize')) {
    function sanitize($input) {
        return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
    }
}
