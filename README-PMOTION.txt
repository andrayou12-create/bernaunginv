=====================================================
 BERNAUNG INVITATION - 3 TEMA PREMIUM MOTION BARU
 (Premium Motion 01, 04, 07)
=====================================================

Isi paket:
  1. pmotion01-tema.zip  -> folder tema-pmotion01/
  2. pmotion04-tema.zip  -> folder tema-pmotion04/
  3. pmotion07-tema.zip  -> folder tema-pmotion07/
  4. pmotion-cdn01.zip   -> video & musik & lottie untuk tema 01 (folder _cdn/)
  5. pmotion-cdn04.zip   -> video & musik & lottie untuk tema 04 (folder _cdn/)
  6. pmotion-cdn07.zip   -> video & musik & lottie untuk tema 07 (folder _cdn/)
  7. pmotion-root.zip    -> catalog.json, theme-map.json, thumbs baru,
                            admin.html + admin.js (ada perbaikan bug)

CARA UPLOAD KE GITHUB (semua diekstrak di ROOT repo, sama dengan
struktur folder bernaunginv yang sudah ada):
  1. Upload isi pmotion01-tema.zip  -> tema-pmotion01/
  2. Upload isi pmotion04-tema.zip  -> tema-pmotion04/
  3. Upload isi pmotion07-tema.zip  -> tema-pmotion07/
  4. Upload isi pmotion-cdn01.zip   -> _cdn/  (menambah folder inv.nikustory.id)
  5. Upload isi pmotion-cdn04.zip   -> _cdn/
  6. Upload isi pmotion-cdn07.zip   -> _cdn/
  7. Upload isi pmotion-root.zip    -> file di root + assets.bernaung.id/thumbs/

URUTAN UPLOAD BEBAS, tapi paling praktis: tema dulu, lalu _cdn,
lalu root (root paling akhir supaya katalog langsung menunjukkan tema baru).

APA YANG DILAKUKAN PADA TEMA:
  - Desain 100% sama dengan file master Premium Motion 01/04/07
    (video motion latar, lottie burung, galeri lightbox, amplop,
    hitung mundur, musik otomatis).
  - Footer diganti menjadi footer Bernaung (Instagram + logo + WhatsApp
    Bernaung, tulisan "HUBUNGI KAMI" & "(c) 2026 Bernaung Invitation").
  - Watermark dalam halaman diganti "Made with (c) by Bernaung Invitation".
  - Sosial ikon penutup diarahkan ke Bernaung (IG bernaung.inv, WA 6282324137816).
  - Script browser-protection Rumah Undangan (redirect/lock) DIHAPUS.
  - Logo/favicon Rumah Undangan diganti favicon Bernaung.
  - RSVP Bernaung (data-bernaung-rsvp) ditambahkan sebelum footer.
  - Nama tamu otomatis via link ?to=Nama%20Tamu (guest.js Bernaung).
  - Hitung mundur otomatis mengikuti tanggal akad customer (sinkron data.js).

PANEL ADMIN:
  - 3 tema sudah terdaftar di catalog.json (Tema Premium Motion 01/04/07,
    klasifikasi Premium, Rp100.000) sehingga otomatis muncul di dropdown
    "Tema Undangan" dan di katalog (thumb screenshot sudah dibuat).
  - theme-map.json berisi mapping lengkap: judul situs, nama pasangan,
    ortu, tanggal/jam/tempat akad & resepsi, alamat, no. rekening, kado,
    foto cover/pria/wanita/couple/galeri (6-12 slot per tema).
  - admin.js mendapat PERBAIKAN BUG nomor rekening/kado: saat nomor demo
    rekening (12345678) adalah bagian dari nomor demo kado (1234567890),
    sebelumnya nomor kado ikut rusak (mis. menjadi 555012345690).
    Sekarang penggantian nomor hanya menyentuh nomor yang berdiri sendiri.
    Perbaikan ini juga berlaku untuk tema lama (termasuk Tema Premium Motion 09).
  - admin.html hanya menambah versi cache (?v=3) pada admin.js.

CATATAN:
  - Folder Wedding TIDAK disentuh (0 perubahan isi).
  - Video di _cdn memakai file asli dari sumber (tanpa rekompresi).
  - Setelah upload, buka /katalog.html untuk memastikan 3 kartu tema baru
    muncul, dan /admin.html untuk membuat undangan customer pertama.
