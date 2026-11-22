============================================================
BERNAUNG INVITATION — CATATAN UPDATE (6 BAGIAN ZIP)
============================================================

ZIP lama (320 MB / 33 MB) TIDAK BISA diunduh karena ukurannya.
Update ini dipecah jadi 6 ZIP KECIL. Cara pakai:

1) Unduh keenam file ZIP (1-6).
2) Ekstrak SEMUANYA ke folder repo bernaunginv di PC kamu
   (klik kanan -> Extract Here di dalam folder repo, atau
   seret isinya ke folder repo). Struktur folder akan
   menyatu otomatis, timpa file lama bila ditanya.
3) Buka GitHub Desktop -> commit & push.
4) Folder Wedding TIDAK disertakan karena TIDAK ADA
   perubahan isinya — biarkan apa adanya di GitHub.

ISI TIAP BAGIAN
---------------
1-root    : admin.html, katalog.html, index.html, catalog.json,
            assets.bernaung.id/admin.js, theme-map.json,
            screenshot katalog (assets.bernaung.id/thumbs/, 15 file)
2-foto    : foto demo (assets.bernaung.id/images/, 22 file) —
            mencegah tema dengan foto tampil kacau/404
3-musik   : musik demo (Glory.mp3, music.mp3, music.mp3.mp3)
4-tema    : tema baru (tema-art01, tema-motion01/3D Motion Rose,
            tema-motion02/Terracotta) + tema-jawa2/assets
5-tema    : perbaikan tema lama (tema-jawa2, tema-jawanopict,
            tema-netflix, tema-punakawan-luxury01, tema-special03,
            tema-spotify — index.html)
6-customer: perbaikan path foto halaman customer (8 index.html)

YANG BARU DI UPDATE INI
-----------------------
0) TEMA JAWA 2 DIGANTI -> TEMA PREMIUM MOTION 09 (ZIP BAGIAN 7)
   - Tema-jawa2 diganti total dengan master "Premium Motion 09"
     (video motion VINTAGE-09 di layar pembuka, bunga vintage,
     wayang gunungan, foto keluarga Habib & Adiba sebagai demo).
   - Semua asset diunduh & di-host lokal (folder tema sendiri);
     video & musik demo memakai /_cdn yang sudah ada.
   - Rebranding Bernaung: judul/og tags, watermark, sosial media,
     footer Bernaung; LOCK Rumah Undangan dihapus.
   - Nama tamu ?to=, RSVP Bernaung (WhatsApp/spreadsheet), amplop
     copy-rekening, kirim hadiah, love story, galeri 8 foto,
     live streaming YouTube, hitung mundur otomatis dari tanggal
     akad customer.
   - Terdaftar di panel admin (theme-map.json 30 aturan) + katalog
     (nama baru "Tema Premium Motion 09", klasifikasi Premium).
   - CATATAN: 2 customer lama (andra-khusna, fajar-rahma) masih
     memakai galeri demo lama di tema-jawa2/assets.bernaung.id/ —
     folder itu DIPERTAHANKAN supaya halaman mereka tidak rusak.

1) PANEL ADMIN — JUDUL SITUS OTOMATIS
   - Kolom "Judul Situs (tab browser)" DIHAPUS dari form.
   - Judul tab browser sekarang OTOMATIS = Nama Pasangan
     (customer), mis. "Budi & Sari" — tanpa perlu mengisi manual.
   - Kolom "Hitung Mundur" juga dihapus (otomatis dari tanggal
     akad). Form makin ringkas: langkah wajib tinggal 1-4.

2) KATALOG — SCREENSHOT SAJA
   - Kartu katalog kini HANYA screenshot tanpa teks/tombol di
     bawahnya. Mengetuk kartu langsung membuka halaman tema
     (tab baru). Nama tema muncul saat kartu disentuh/di-hover.
   - Tanpa iframe = musik demo tidak mungkin berbunyi dari
     katalog, halaman ringan, tidak perlu folder baru.

3) PERBAIKAN YANG SUDAH ADA DARI SEBELUMNYA (tetap berlaku)
   - Tema dengan foto tidak kacau lagi (mapping foto diperbaiki
     di theme-map.json + admin.js, foto demo dilengkapi).
   - Gagal tambah customer diperbaiki: penyimpanan 1 commit
     atomik via Git Data API + dataURL tidak lagi disimpan ke
     catalog.json (penyebab file >1 MB dan simpan berikutnya
     gagal).
   - Double footer tema-special03 (Premium Ilustrasi) dan
     tema-punakawan-luxury01 (Luxury 01) dihapus — kini hanya
     footer Bernaung.
   - Footer Bernaung ada di semua tema.

VERIFIKASI CEPAT
----------------
1. Panel admin -> Customer Baru: kolom Judul Situs sudah tidak
   ada; isi nama pasangan lalu PRATINJAU LIVE -> tab browser
   pratinjau ikut memakai nama pasangan.
2. Katalog: kartu hanya screenshot; klik membuka tema.
3. Tambah customer baru dengan tema berfoto -> undangan jadi
   tanpa laporan "tidak ditemukan".
