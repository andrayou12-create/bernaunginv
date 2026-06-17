<?php
/**
 * FOOTER.PHP - Template Footer untuk Semua Halaman Publik
 */
?>
    <!-- Footer -->
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-section">
                <h3><?php echo SITE_NAME; ?></h3>
                <p>Buat undangan digital yang elegan dan menarik untuk hari istimewa Anda.</p>
            </div>
            <div class="footer-section">
                <h4>Link Penting</h4>
                <ul>
                    <li><a href="<?php echo SITE_URL; ?>">Beranda</a></li>
                    <li><a href="<?php echo SITE_URL; ?>/index.php#katalog">Katalog</a></li>
                    <li><a href="<?php echo SITE_URL; ?>">Harga</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h4>Kontak</h4>
                <p>📧 Email: <?php echo SITE_EMAIL; ?></p>
                <p>📱 WhatsApp: +62 821 3456 7890</p>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; <?php echo date('Y'); ?> <?php echo SITE_NAME; ?>. All rights reserved.</p>
        </div>
    </footer>

    <script src="<?php echo SITE_URL; ?>/assets/js/checkout.js"></script>
</body>
</html>
