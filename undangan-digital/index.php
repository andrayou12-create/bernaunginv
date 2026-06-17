<?php
/**
 * INDEX.PHP - Halaman Katalog Undangan
 */

require_once 'config/config.php';
require_once 'includes/functions.php';

$page_title = 'Katalog Undangan';

// Ambil semua paket undangan
$paket = getAllPaket($pdo);
?>

<?php include 'includes/header.php'; ?>

<!-- Hero Section -->
<section class="hero">
    <div class="container">
        <h1>Undangan Digital Elegan</h1>
        <p>Ciptakan momen spesial dengan undangan digital yang stunning dan interaktif</p>
        <div class="hero-buttons">
            <a href="#katalog" class="btn btn-primary">Lihat Katalog</a>
            <a href="checkout.php" class="btn btn-secondary">Pesan Sekarang</a>
        </div>
    </div>
</section>

<!-- Katalog Section -->
<section id="katalog">
    <div class="container">
        <h2 style="text-align: center; margin-bottom: 2rem;">Pilihan Paket Undangan</h2>
        
        <?php if ($paket): ?>
            <div class="catalog-grid">
                <?php foreach ($paket as $p): ?>
                    <div class="paket-card">
                        <div class="paket-image">
                            🎨
                        </div>
                        <div class="paket-content">
                            <h3 class="paket-name"><?php echo htmlspecialchars($p['nama_paket']); ?></h3>
                            <p class="paket-desc"><?php echo htmlspecialchars($p['deskripsi']); ?></p>
                            <div class="paket-harga"><?php echo rupiah($p['harga']); ?></div>
                            <a href="checkout.php?paket_id=<?php echo $p['id']; ?>" class="btn btn-primary btn-block">
                                Pesan Sekarang
                            </a>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <p style="text-align: center;">Tidak ada paket yang tersedia saat ini.</p>
        <?php endif; ?>
    </div>
</section>

<!-- Tentang Section -->
<section id="tentang" style="background-color: #f9f9f9;">
    <div class="container">
        <h2 style="text-align: center; margin-bottom: 2rem;">Mengapa Memilih Kami?</h2>
        
        <div class="catalog-grid" style="margin-top: 2rem;">
            <div class="paket-card">
                <div class="paket-image">✨</div>
                <div class="paket-content">
                    <h3>Desain Modern</h3>
                    <p>Template undangan yang dirancang dengan sempurna dan mengikuti tren desain terkini.</p>
                </div>
            </div>
            <div class="paket-card">
                <div class="paket-image">📱</div>
                <div class="paket-content">
                    <h3>Mobile Responsive</h3>
                    <p>Tampil sempurna di semua perangkat, dari smartphone hingga desktop.</p>
                </div>
            </div>
            <div class="paket-card">
                <div class="paket-image">⚡</div>
                <div class="paket-content">
                    <h3>Cepat & Ringan</h3>
                    <p>Loading cepat dan tidak memberatkan kuota data tamu Anda.</p>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Kontak Section -->
<section id="kontak">
    <div class="container" style="text-align: center;">
        <h2 style="margin-bottom: 2rem;">Ada Pertanyaan?</h2>
        <p style="margin-bottom: 1rem;">Hubungi kami melalui:</p>
        <p>
            <a href="https://wa.me/6282134567890" class="btn btn-primary">💬 WhatsApp Kami</a>
        </p>
    </div>
</section>

<?php include 'includes/footer.php'; ?>
