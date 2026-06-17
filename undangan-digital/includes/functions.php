<?php
/**
 * FUNCTIONS.PHP - Fungsi Helper untuk Aplikasi
 */

// =============================================
// GENERATE ORDER ID
// =============================================
function generateOrderNumber() {
    $date = date('Ymd');
    $rand = rand(1000, 9999);
    return 'ORD-' . $date . '-' . $rand;
}

// =============================================
// GENERATE SLUG UNDANGAN (UNIK)
// =============================================
function generateSlugUndangan($order_id) {
    return 'INV-' . strtoupper(bin2hex(random_bytes(4)));
}

// =============================================
// UPLOAD FILE FOTO
// =============================================
function uploadFoto($file) {
    // Validasi file ada
    if (!isset($file) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return [
            'success' => false,
            'message' => 'File tidak ditemukan'
        ];
    }

    // Validasi error upload
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return [
            'success' => false,
            'message' => 'Error saat upload file'
        ];
    }

    // Validasi ukuran file
    if ($file['size'] > MAX_UPLOAD_SIZE) {
        return [
            'success' => false,
            'message' => 'Ukuran file terlalu besar. Maksimal 3MB'
        ];
    }

    // Validasi tipe file
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, ALLOWED_MIME_TYPES)) {
        return [
            'success' => false,
            'message' => 'Format file tidak diizinkan. Gunakan JPG, PNG, atau GIF'
        ];
    }

    // Generate nama file unik
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid() . '_' . time() . '.' . $ext;
    $filepath = UPLOAD_FOLDER . $filename;

    // Pindahkan file
    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        return [
            'success' => true,
            'filename' => $filename,
            'path' => $filepath
        ];
    } else {
        return [
            'success' => false,
            'message' => 'Gagal menyimpan file'
        ];
    }
}

// =============================================
// KIRIM NOTIFIKASI WHATSAPP
// =============================================
function sendWhatsAppNotification($phone, $message) {
    if (!WHATSAPP_ENABLED) {
        return ['success' => false, 'message' => 'WhatsApp API belum dikonfigurasi'];
    }

    $curl = curl_init();

    curl_setopt_array($curl, [
        CURLOPT_URL => 'https://api.fonnte.com/send',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 0,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => [
            'target' => $phone,
            'message' => $message
        ],
        CURLOPT_HTTPHEADER => [
            'Authorization: ' . WHATSAPP_API_KEY
        ],
    ]);

    $response = curl_exec($curl);
    curl_close($curl);

    return json_decode($response, true);
}

// =============================================
// FORMAT NOTIFIKASI ORDER BARU
// =============================================
function formatNotificationMessage($order_data, $paket_data) {
    $message = "🎉 *ADA PESANAN BARU!*\n\n";
    $message .= "📝 *Order ID:* " . $order_data['order_number'] . "\n";
    $message .= "👰 *Mempelai Wanita:* " . $order_data['nama_wanita'] . "\n";
    $message .= "🤵 *Mempelai Pria:* " . $order_data['nama_pria'] . "\n";
    $message .= "📦 *Paket:* " . $paket_data['nama_paket'] . "\n";
    $message .= "💰 *Harga:* " . rupiah($paket_data['harga']) . "\n";
    $message .= "📧 *Email:* " . $order_data['email_customer'] . "\n\n";
    $message .= "Silakan cek dashboard admin untuk detail lebih lanjut.";

    return $message;
}

// =============================================
// GET DETAIL ORDER
// =============================================
function getOrderDetail($pdo, $order_id) {
    $stmt = $pdo->prepare("
        SELECT o.*, p.nama_paket, p.folder_template
        FROM orders o
        JOIN paket_undangan p ON o.paket_id = p.id
        WHERE o.id = ?
    ");
    $stmt->execute([$order_id]);
    return $stmt->fetch();
}

// =============================================
// GET SEMUA PAKET UNDANGAN
// =============================================
function getAllPaket($pdo) {
    $stmt = $pdo->query("SELECT * FROM paket_undangan WHERE status = 'aktif' ORDER BY id");
    return $stmt->fetchAll();
}

// =============================================
// GET PAKET BY SLUG
// =============================================
function getPaketBySlug($pdo, $slug) {
    $stmt = $pdo->prepare("SELECT * FROM paket_undangan WHERE slug = ? AND status = 'aktif'");
    $stmt->execute([$slug]);
    return $stmt->fetch();
}

// =============================================
// VERIFIKASI PASSWORD ADMIN
// =============================================
function verifyAdminPassword($plain_password, $hashed_password) {
    return password_verify($plain_password, $hashed_password);
}

// =============================================
// HASH PASSWORD (untuk buat admin baru)
// =============================================
function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
}

// =============================================
// GET ADMIN BY USERNAME
// =============================================
function getAdminByUsername($pdo, $username) {
    $stmt = $pdo->prepare("SELECT * FROM admins WHERE username = ?");
    $stmt->execute([$username]);
    return $stmt->fetch();
}

// =============================================
// UPDATE STATUS PEMBAYARAN
// =============================================
function updatePaymentStatus($pdo, $order_id) {
    $stmt = $pdo->prepare("UPDATE orders SET status_pembayaran = 'paid', slug_undangan = ? WHERE id = ?");
    $slug = generateSlugUndangan($order_id);
    $result = $stmt->execute([$slug, $order_id]);
    return $result;
}

// =============================================
// GET ORDER BY SLUG
// =============================================
function getOrderBySlug($pdo, $slug) {
    $stmt = $pdo->prepare("
        SELECT o.*, p.folder_template
        FROM orders o
        JOIN paket_undangan p ON o.paket_id = p.id
        WHERE o.slug_undangan = ? AND o.status_pembayaran = 'paid'
    ");
    $stmt->execute([$slug]);
    return $stmt->fetch();
}

// =============================================
// DELETE FILE
// =============================================
function deleteFile($filepath) {
    if (file_exists($filepath)) {
        return unlink($filepath);
    }
    return false;
}
