============================================================
BERNAUNG INVITATION — CATATAN UPDATE
============================================================

Isi ZIP ini adalah kondisi TERBARU seluruh situs. Cara pakai:
ekstrak, lalu salin SEMUA file/folder ke repo bernaunginv
(ganti file lama), commit & push. Folder Wedding TIDAK diubah.

1) TEMA
   - DIHAPUS   : tema-luxury02, tema-interaktif01, tema-nofoto01
                 (sesuai permintaan; 3D Motion Rose / tema-motion01 dipertahankan)
   - TETAP     : 13 tema lama + tema-motion01 (3D Motion Rose)
   - BARU      : tema-art01    "Tema Art Eksklusif"     (gaya Art pastel,
                 lottie burung, ornamen melayang, font signature)
                 tema-motion02 "Tema Motion Terracotta" (video motion di hero,
                 kelopak bunga jatuh, lottie mouse, gaya invisimple)
                 Keduanya sudah punya footer Bernaung, RSVP universal,
                 nama tamu (?to=), countdown, amplop, dan sudah terdaftar
                 di catalog.json + theme-map.json (siap dipakai panel admin).

2) KATALOG (katalog.html) — gaya rumahundangan.in
   - Pratinjau kini SCREENSHOT STATIS tanpa scroll (tanpa iframe).
   - Screenshot tiap tema: assets.bernaung.id/thumbs/<id>.jpg (15 file).
   - Tombol LIHAT PREVIEW / LIHAT UNDANGAN langsung menuju halaman tema.
   - Musik demo tidak lagi bisa berbunyi dari katalog (tidak ada iframe).

3) PANEL ADMIN (admin.html + assets.bernaung.id/admin.js)
   - Form Customer Baru diringkas jadi ACCORDION 10 langkah;
     wajib hanya langkah 1-4 (Identitas, Mempelai, Acara),
     sisanya opsional dan terlipat rapi.
   - Perbaikan gagal tambah customer:
     a. Penyimpanan kini 1 COMMIT ATOMIK via Git Data API
        (blobs -> tree -> commit -> ref) + auto-retry konflik;
        tidak lagi per-file Contents API yang sering 409/422.
     b. Foto/musik berbasis dataURL TIDAK lagi disimpan ke catalog.json
        (dulu membuat file > 1 MB sehingga simpan berikutnya gagal).
     c. Baca catalog.json punya fallback raw.githubusercontent bila
        file besar.

4) PERBAIKAN TEMA
   - tema-special03 (Premium Ilustrasi): footer ganda dihapus
     (footer Elementor bawaan dibuang, footer Bernaung tetap satu).
   - tema-punakawan-luxury01 (Luxury 01): widget social footer bawaan
     dihapus — kini hanya footer Bernaung.
   - tema-jawa2: duplikat CSS animasi dihapus; semua asset animasi
     master (bunga VINTAGE-09, video PREMIUM-VINTAGE-09, reveal)
     terverifikasi tersedia.
   - FOTO DEMO 404 DIPERBAIKI (penyebab tema dengan foto "kacau"):
     tema-jawa2, tema-netflix, tema-spotify memakai path
     assets.bernaung.id/images/galleries/... yang TIDAK ADA.
     Sekarang folder assets.bernaung.id/images/galleries/ dibuat
     lengkap (22 file demo) + semua path dibuat absolut.
     Path di customer/andra-khusna/index.html ikut diperbaiki.
   - Musik demo: assets.bernaung.id/Glory.mp3 (netflix),
     assets.bernaung.id/music.mp3 + music.mp3.mp3 (spotify & customer).
   - tema-art01 / tema-motion02 / tema-motion01: nomor kado demo dibuat
     unik (+6289876543210) agar tidak tertukar dengan nomor rekening.
   - theme-map.json: rule kadoPhone/groomParents diperbaiki
     (tema-jawanopict, tema-art01, tema-motion02, tema-motion01),
     rule mati address2 (tema-spotify) dihapus.
   - Uji otomatis: generator admin mengganti 23/23 frasa pada
     tema-art01 tanpa "miss".

5) LAIN-LAIN
   - index.html: teks jumlah tema diperbarui menjadi 15.
   - Folder Wedding: TIDAK ADA perubahan.
============================================================
