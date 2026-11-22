BERNAUNG INVITATION - PAKET 1: PANEL ADMIN + KATALOG
=====================================================
Isi:
  admin.html
  assets.bernaung.id/admin.js
  assets.bernaung.id/theme-map.json
  catalog.json

PERUBAHAN:
  1. Tema Art Eksklusif & Motion Terracotta DIHAPUS dari katalog & panel
     (tinggal 16 tema; kartu kategori Art tidak tampil lagi).
  2. Panel admin - Nama Customer & Nama Pasangan (hero) otomatis terisi
     dari Nama Panggilan mempelai PRIA & WANITA (tidak perlu input berkali-
     kali). Isi manual tetap bisa - auto-isi berhenti bila Anda mengubahnya.
  3. Metode RSVP WhatsApp DIHAPUS (dibuat tanpa sengaja). Sekarang hanya
     Google Spreadsheet (Apps Script) + opsi "Tanpa RSVP (pratinjau)".
     Undangan lama yang sudah berjalan TIDAK terpengaruh.
  4. Pratinjau dibuat SATU saja: tombol "PRATINJAU UNDANGAN (SESUAI DATA)"
     menampilkan undangan persis dengan data yang Anda isi; auto-perbarui
     aktif secara default.
  5. TOMBOL EDIT KINI MEMUAT DATA: customer yang dibuat sebelum fitur ini
     tidak punya data tersimpan, jadi saat EDIT panel membaca mundur data
     dari file undangannya (data.js + pemetaan frasa tema). Nilai yang
     tidak yakin dibiarkan kosong - isi manual bagian itu. Customer baru
     otomatis menyimpan data sehingga EDIT berikutnya selalu penuh.
  6. theme-map.json disinkronkan dengan demo baru 4 tema (pmotion01/04/07,
     jawa2) - generator undangan tetap bekerja normal.

CARA UPLOAD KE GITHUB:
  Ekstrak ZIP di root repo (pertahankan struktur folder), commit/push.
  Atau upload file satu per satu via Add file -> Upload files.
  Setelah upload: buka admin.html dengan HARD REFRESH (Ctrl+F5 / bersihkan
  cache browser) agar admin.js?v=4 terbaru terpakai.
