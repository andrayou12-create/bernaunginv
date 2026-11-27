============================================================
FIX TEMA-MINANG BATCH 2 — Icons + Slideshow + Settings Lock
============================================================

ISI PAKET & CARA UPLOAD:

1. assets.bernaung.id/admin.js
   → Overwrite file lama
   → Fix: settings lock/unlock (Pengaturan terkunci setelah simpan,
     klik UBAH PENGATURAN untuk membuka)
   → PENTING: edit admin.html, ganti admin.js?v=16 menjadi admin.js?v=17

2. assets.bernaung.id/theme-map.json
   → Overwrite file lama (dari fix sebelumnya)
   → Fix: 41 map entries + 6 hide rules untuk tema-minang

3. tema-minang/index.html
   → Overwrite file lama
   → Fix: 14 URL eksternal di data-settings JSON di-rewrite ke lokal
   → Slideshow background sekarang load dari assets/ lokal

4. tema-minang/assets/.../font-awesome/webfonts/
   → 3 file woff2 (fa-solid-900, fa-regular-400, fa-brands-400)
   → Fix: icon Font Awesome (daun, gift, home, dll) tidak lagi kotak
   → Upload ke: tema-minang/assets/hi.inviee.id/wp-content/plugins/
     elementor/assets/lib/font-awesome/webfonts/

============================================================
MASALAH YANG DIPERBAIKI:
============================================================

A. SIMBOL KOTAK (Font Awesome icons)
   Penyebab: file webfont (woff2) Font Awesome tidak ter-download
   saat migrasi. CSS ada tapi font tidak ada → icon jadi kotak.
   Fix: download 3 file woff2 dari cdnjs, upload ke folder webfonts.

B. FOTO SLIDESHOW TIDAK TERGANTI
   Penyebab: URL di data-settings JSON masih https:\/\/hi.inviee.id\/...
   (belum di-rewrite ke lokal oleh migration script).
   Fix: rewrite 14 URL escaped ke assets\/ paths.

C. SETTINGS LOCK (Pengaturan tidak terkunci)
   Penyebab: saveSettings simpan ke localStorage tapi TIDAK disable
   input. Input selalu editable → salah pencet bisa ubah.
   Fix: tambah lockSettings() (disable input setelah simpan) +
   unlockSettings() (enable saat klik UBAH PENGATURAN).

D. TANGGAL "KAMIS" TETAP MUNCUL
   Penyebab: customer isi "Selasa, 19 Januari" TANPA tahun.
   Parser admin.js (parseDateID) butuh format "DD Bulan YYYY"
   untuk ekstrak nama hari. Tanpa tahun → parser gagal →
   akadDayName kosong → "Kamis" tidak terganti.
   Fix: ISI TANGGAL DENGAN TAHUN, mis:
   "Selasa, 19 Januari 2027" ← parser berhasil → "Kamis" diganti "Selasa"

E. COUNTDOWN BELUM BERJALAN
   Penyebab: customer isi "Menyusul" untuk tanggal → bukan format
   tanggal valid → countdown tidak ter-update.
   Fix: saat customer dapat tanggal pasti (dengan tahun),
   generate ulang → countdown jalan.

F. GOOGLE SPREADSHEET AUTO-CREATE SHEET
   Code.gs SUDAH auto-create sheet per customer:
   - Saat RSVP pertama masuk untuk customer baru,
     Code.gs otomatis buat tab baru dengan nama = slug customer
   - Tidak perlu buat sheet manual
   - Cukup pastikan URL Apps Script terisi di Pengaturan

============================================================
LANGKAH UPLOAD:
============================================================

1. Upload file berikut ke repo (overwrite file lama):
   a. assets.bernaung.id/admin.js
   b. assets.bernaung.id/theme-map.json
   c. tema-minang/index.html
   d. tema-minang/assets/hi.inviee.id/wp-content/plugins/elementor/
      assets/lib/font-awesome/webfonts/fa-solid-900.woff2
   e. tema-minang/assets/hi.inviee.id/wp-content/plugins/elementor/
      assets/lib/font-awesome/webfonts/fa-regular-400.woff2
   f. tema-minang/assets/hi.inviee.id/wp-content/plugins/elementor/
      assets/lib/font-awesome/webfonts/fa-brands-400.woff2

2. Edit admin.html di repo:
   Ganti: <script src="/assets.bernaung.id/admin.js?v=16"></script>
   Jadi:  <script src="/assets.bernaung.id/admin.js?v=17"></script>

3. Commit + Push ke GitHub

4. Buka panel admin → Ctrl+Shift+R

5. Tab Pengaturan:
   - Klik UBAH PENGATURAN (input terbuka)
   - Isi URL Apps Script + Link Spreadsheet
   - Klik SIMPAN PENGATURAN (input terkunci kembali)

6. Tab Daftar Customer → EDIT yani-redzlan → BUAT UNDANGAN
   - Isi tanggal DENGAN TAHUN: "Selasa, 19 Januari 2027"
   - Generate ulang → semua fix aktif

============================================================
