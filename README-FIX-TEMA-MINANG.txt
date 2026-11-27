============================================================
FIX TEMA-MINANG — Theme-Map + Catalog Correction
============================================================

MASALAH YANG DIPERBAIKI:

1. MAPPING SALAH (dihapus):
   - groomFull → "Olga Kuswoyo" (sebenarnya gift2Name)
   - brideFull → "Anita Safitri" (sebenarnya gift1Name)
   - resDayDate → "15 Februari 2020" (sebenarnya tanggal love story)
   - resPlace → "Kediaman Mempelai Pria" (sebenarnya Ngunduh Mantu)
   - 3x fotoCouple (seharusnya 1, lainnya fotoCover/fotoCouple)

2. MAPPING HILANG (ditambah):
   - title → "Minang Elegance"
   - resDayDate → "31 Desember 2026"
   - address → "Jalan Raya Bojongsari No.5,"
   - gift1Name → "Anita Safitri"
   - gift2Name → "Olga Kuswoyo"
   - countdownDate → "Dec 31 2026 8:00:00"
   - fotoCover → Minang-14-fi.webp
   - fotoGallery1-12 → correct gallery paths (sebelumnya salah hash)

3. HIDE RULES (0 → 6):
   - "Our Story" → hide kalau love story kosong
   - "Wedding Gift" → hide kalau rekening kosong
   - "KIRIM KADO" → hide kalau kado kosong
   - "Ngunduh Mantu" → always hide (jarang dipakai)
   - "Dress Code" → always hide
   - "Live Streaming" → always hide

4. CATALOG FIX:
   - foto: None → True (tema-minang punya foto)

============================================================
CARA UPDATE
============================================================

Upload 2 file ini ke repo, overwrite file lama:
1. assets.bernaung.id/theme-map.json
2. catalog.json

Commit + Push ke GitHub.
Buka panel admin → Ctrl+Shift+R.

Setelah update:
- Generate ulang customer yani-redzlan:
  Tab Daftar Customer → EDIT → BUAT UNDANGAN
- Semua text, foto, love story, gift akan terganti dengan benar
- RSVP form akan ter-replace dengan form bernaung (rsvp.js sudah updated)
- Section Ngunduh Mantu, Dress Code, Live Streaming auto-hidden

============================================================
TENTANG "SIMBOL KOTAK"
============================================================
Kalau ada simbol/icon yang tampil sebagai kotak, itu karena
file font (woff2) atau Font Awesome CSS gagal di-download
saat migrasi. Solusi:

1. Cek file font di tema-minang/assets/hi.inviee.id/wp-content/
   uploads/useanyfont/ — harus ada ~45 file .woff2
2. Cek Font Awesome CSS di tema-minang/assets/hi.inviee.id/
   wp-content/plugins/elementor/assets/lib/font-awesome/css/
3. Kalau ada yang hilang, jalankan ulang migrate-tema-minang.py
   (script skip file yang sudah ada, hanya download yang gagal)

============================================================
