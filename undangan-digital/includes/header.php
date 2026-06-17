<?php
/**
 * HEADER.PHP - Template Header untuk Semua Halaman Publik
 */
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo isset($page_title) ? $page_title . ' - ' . SITE_NAME : SITE_NAME; ?></title>
    <link rel="stylesheet" href="<?php echo SITE_URL; ?>/assets/css/style.css">
</head>
<body>
    <!-- Navigation -->
    <nav class="navbar">
        <div class="navbar-container">
            <div class="navbar-brand">
                <a href="<?php echo SITE_URL; ?>">
                    <h1><?php echo SITE_NAME; ?></h1>
                </a>
            </div>
            <ul class="navbar-menu">
                <li><a href="<?php echo SITE_URL; ?>">Katalog</a></li>
                <li><a href="<?php echo SITE_URL; ?>/index.php#tentang">Tentang</a></li>
                <li><a href="<?php echo SITE_URL; ?>/index.php#kontak">Kontak</a></li>
            </ul>
        </div>
    </nav>
