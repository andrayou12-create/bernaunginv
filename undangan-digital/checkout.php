<?php
/**
 * CHECKOUT.PHP - Halaman Form Pemesanan Undangan
 */

require_once 'config/config.php';
require_once 'includes/functions.php';

$page_title = 'Form Pemesanan';
$paket_id = isset($_GET['paket_id']) ? (int)$_GET['paket_id'] : null;
$error = '';
$success = '';

// Ambil detail paket jika ada paket_id
$paket = null;
if ($paket_id) {
    $stmt = $pdo->prepare("SELECT * FROM paket_undangan WHERE id = ? AND status = 'aktif'");
    $stmt->execute([$paket_id]);
    $paket = $stmt->fetch();
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Sanitasi input
    $email_customer = sanitize($_POST['email_customer'] ?? '');
    $nama_pria = sanitize($_POST['nama_pria'] ?? '');
    $nama_wanita = sanitize($_POST['nama_wanita'] ?? '');
    $ayah_pria = sanitize($_POST['ayah_pria'] ?? '');
    $ibu_pria = sanitize($_POST['ibu_pria'] ?? '');
    $ayah_wanita = sanitize($_POST['ayah_wanita'] ?? '');
    $ibu_wanita = sanitize($_POST['ibu_wanita'] ?? '');
    $lokasi_akad = sanitize($_POST['lokasi_akad'] ?? '');
    $link_maps_akad = sanitize($_POST['link_maps_akad'] ?? '');
    $tanggal_akad = $_POST['tanggal_akad'] ?? '';
    $jam_akad = $_POST['jam_akad'] ?? '';
    $lokasi_resepsi = sanitize($_POST['lokasi_resepsi'] ?? '');
    $link_maps_resepsi = sanitize($_POST['link_maps_resepsi'] ?? '');
    $tanggal_resepsi = $_POST['tanggal_resepsi'] ?? '';
    $jam_resepsi = $_POST['jam_resepsi'] ?? '';
    $custom_notes = sanitize($_POST['custom_notes'] ?? '');
    $paket_id = (int)($_POST['paket_id'] ?? 0);

    // Validasi input
    $errors = [];

    if (empty($email_customer) || !filter_var($email_customer, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Email tidak valid';
    }
    if (empty($nama_pria)) $errors[] = 'Nama mempelai pria harus diisi';
    if (empty($nama_wanita)) $errors[] = 'Nama mempelai wanita harus diisi';
    if (empty($lokasi_akad)) $errors[] = 'Lokasi akad harus diisi';
    if (empty($tanggal_akad)) $errors[] = 'Tanggal akad harus diisi';
    if ($paket_id <= 0) $errors[] = 'Paket tidak valid';

    // Upload file foto
    $foto_pria = null;
    $foto_wanita = null;

    if (!empty($errors)) {
        $error = implode(', ', $errors);
    } else {
        // Upload foto pria
        if (isset($_FILES['foto_pria']) && $_FILES['foto_pria']['error'] === UPLOAD_ERR_OK) {
            $upload = uploadFoto($_FILES['foto_pria']);
            if ($upload['success']) {
                $foto_pria = $upload['filename'];
            } else {
                $error = $upload['message'];
            }
        }

        // Upload foto wanita
        if (empty($error) && isset($_FILES['foto_wanita']) && $_FILES['foto_wanita']['error'] === UPLOAD_ERR_OK) {
            $upload = uploadFoto($_FILES['foto_wanita']);
            if ($upload['success']) {
                $foto_wanita = $upload['filename'];
            } else {
                $error = $upload['message'];
            }
        }

        // Jika tidak ada error, simpan ke database
        if (empty($error)) {
            try {
                $order_number = generateOrderNumber();
                
                $stmt = $pdo->prepare("
                    INSERT INTO orders (
                        order_number, paket_id, email_customer, 
                        nama_pria, nama_wanita, ayah_pria, ibu_pria, 
                        ayah_wanita, ibu_wanita, lokasi_akad, link_maps_akad, 
                        tanggal_akad, jam_akad, lokasi_resepsi, link_maps_resepsi, 
                        tanggal_resepsi, jam_resepsi, foto_pria, foto_wanita, 
                        custom_notes, harga_total, status_pembayaran
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending'
                    )
                ");

                $paket_detail = $pdo->prepare("SELECT * FROM paket_undangan WHERE id = ?")->execute([$paket_id])->fetch();
                
                $stmt->execute([
                    $order_number, $paket_id, $email_customer,
                    $nama_pria, $nama_wanita, $ayah_pria, $ibu_pria,
                    $ayah_wanita, $ibu_wanita, $lokasi_akad, $link_maps_akad,
                    $tanggal_akad, $jam_akad, $lokasi_resepsi, $link_maps_resepsi,
                    $tanggal_resepsi, $jam_resepsi, $foto_pria, $foto_wanita,
                    $custom_notes, $paket['harga']
                ]);

                $order_id = $pdo->lastInsertId();

                // Kirim notifikasi WhatsApp
                if (WHATSAPP_ENABLED) {
                    $message = formatNotificationMessage([
                        'order_number' => $order_number,
                        'nama_pria' => $nama_pria,
                        'nama_wanita' => $nama_wanita,
                        'email_customer' => $email_customer
                    ], $paket);
                    
                    sendWhatsAppNotification(WHATSAPP_ADMIN_NUMBER, $message);
                }

                // Redirect ke halaman success
                header('Location: success.php?order_id=' . $order_id);
                exit;

            } catch (PDOException $e) {
                $error = 'Error menyimpan data: ' . $e->getMessage();
            }
        }
    }
}
?>

<?php include 'includes/header.php'; ?>

<!-- Checkout Section -->
<section>
    <div class="checkout-container">
        <div class="checkout-header">
            <h1>Form Pemesanan Undangan</h1>
            <p>Isi form di bawah untuk memesan undangan digital Anda</p>
        </div>

        <?php if ($error): ?>
            <div class="alert alert-danger"><?php echo $error; ?></div>
        <?php endif; ?>

        <form method="POST" enctype="multipart/form-data">
            <!-- Pilih Paket -->
            <div class="form-group">
                <label for="paket_id">Pilih Paket <span class="required">*</span></label>
                <select name="paket_id" id="paket_id" required>
                    <option value="">-- Pilih Paket --</option>
                    <?php
                    $all_paket = getAllPaket($pdo);
                    foreach ($all_paket as $p):
                    ?>
                        <option value="<?php echo $p['id']; ?>" <?php echo ($paket_id == $p['id']) ? 'selected' : ''; ?>>
                            <?php echo $p['nama_paket']; ?> - <?php echo rupiah($p['harga']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <!-- Email -->
            <div class="form-group">
                <label for="email_customer">Email <span class="required">*</span></label>
                <input type="email" name="email_customer" id="email_customer" required>
                <div class="file-info">Email akan digunakan untuk mengirim invoice</div>
            </div>

            <!-- Nama Mempelai -->
            <div class="form-row">
                <div class="form-group">
                    <label for="nama_pria">Nama Mempelai Pria <span class="required">*</span></label>
                    <input type="text" name="nama_pria" id="nama_pria" required>
                </div>
                <div class="form-group">
                    <label for="nama_wanita">Nama Mempelai Wanita <span class="required">*</span></label>
                    <input type="text" name="nama_wanita" id="nama_wanita" required>
                </div>
            </div>

            <!-- Nama Orang Tua -->
            <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Data Orang Tua</h3>
            <div class="form-row">
                <div class="form-group">
                    <label for="ayah_pria">Ayah Mempelai Pria</label>
                    <input type="text" name="ayah_pria" id="ayah_pria">
                </div>
                <div class="form-group">
                    <label for="ibu_pria">Ibu Mempelai Pria</label>
                    <input type="text" name="ibu_pria" id="ibu_pria">
                </div>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="ayah_wanita">Ayah Mempelai Wanita</label>
                    <input type="text" name="ayah_wanita" id="ayah_wanita">
                </div>
                <div class="form-group">
                    <label for="ibu_wanita">Ibu Mempelai Wanita</label>
                    <input type="text" name="ibu_wanita" id="ibu_wanita">
                </div>
            </div>

            <!-- Lokasi & Tanggal Akad -->
            <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Acara Akad</h3>
            <div class="form-group">
                <label for="lokasi_akad">Lokasi Akad <span class="required">*</span></label>
                <input type="text" name="lokasi_akad" id="lokasi_akad" placeholder="Contoh: Masjid Al-Ikhlas, Jl. Gajah Mada No.123, Jakarta" required>
            </div>

            <div class="form-group">
                <label for="link_maps_akad">Link Google Maps Akad</label>
                <input type="url" name="link_maps_akad" id="link_maps_akad" placeholder="https://maps.google.com/...">
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="tanggal_akad">Tanggal Akad <span class="required">*</span></label>
                    <input type="date" name="tanggal_akad" id="tanggal_akad" required>
                </div>
                <div class="form-group">
                    <label for="jam_akad">Jam Akad</label>
                    <input type="time" name="jam_akad" id="jam_akad">
                </div>
            </div>

            <!-- Lokasi & Tanggal Resepsi -->
            <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Acara Resepsi</h3>
            <div class="form-group">
                <label for="lokasi_resepsi">Lokasi Resepsi</label>
                <input type="text" name="lokasi_resepsi" id="lokasi_resepsi" placeholder="Contoh: Gedung Pertemuan ABC, Jl. Sudirman No.456, Jakarta">
            </div>

            <div class="form-group">
                <label for="link_maps_resepsi">Link Google Maps Resepsi</label>
                <input type="url" name="link_maps_resepsi" id="link_maps_resepsi" placeholder="https://maps.google.com/...">
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="tanggal_resepsi">Tanggal Resepsi</label>
                    <input type="date" name="tanggal_resepsi" id="tanggal_resepsi">
                </div>
                <div class="form-group">
                    <label for="jam_resepsi">Jam Resepsi</label>
                    <input type="time" name="jam_resepsi" id="jam_resepsi">
                </div>
            </div>

            <!-- Upload Foto -->
            <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Upload Foto</h3>
            <div class="form-row">
                <div class="form-group">
                    <label>Foto Mempelai Pria (Max 3MB)</label>
                    <div class="file-upload">
                        <input type="file" name="foto_pria" id="foto_pria" accept="image/*">
                        <label for="foto_pria" class="file-upload-label">
                            📷 Klik atau drag file foto di sini
                            <div class="file-info">Format: JPG, PNG, GIF | Ukuran: Max 3MB</div>
                        </label>
                    </div>
                    <div class="error-message" style="display: none;"></div>
                </div>

                <div class="form-group">
                    <label>Foto Mempelai Wanita (Max 3MB)</label>
                    <div class="file-upload">
                        <input type="file" name="foto_wanita" id="foto_wanita" accept="image/*">
                        <label for="foto_wanita" class="file-upload-label">
                            📷 Klik atau drag file foto di sini
                            <div class="file-info">Format: JPG, PNG, GIF | Ukuran: Max 3MB</div>
                        </label>
                    </div>
                    <div class="error-message" style="display: none;"></div>
                </div>
            </div>

            <!-- Custom Notes -->
            <div class="form-group">
                <label for="custom_notes">Catatan Khusus (Opsional)</label>
                <textarea name="custom_notes" id="custom_notes" placeholder="Tulis catatan atau kustomisasi khusus untuk undangan Anda..."></textarea>
            </div>

            <!-- Submit Button -->
            <div class="form-group">
                <button type="submit" class="btn btn-primary btn-block" style="padding: 1rem; font-size: 1.1rem;">
                    Lanjut ke Pembayaran
                </button>
            </div>
        </form>
    </div>
</section>

<?php include 'includes/footer.php'; ?>
