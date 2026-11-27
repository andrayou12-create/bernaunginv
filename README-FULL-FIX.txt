============================================================
FULL FIX — Nasirin-Mila RSVP + Tema Minang + Admin Settings
============================================================

FILE DI ZIP INI (upload semua, overwrite):

1. customer/nasirin-mila/data.js
   → Fix: RSVP URL DISABLED → URL Apps Script asli
   → RSVP nasirin-mila sekarang AKTIF (mode: sheet)
   → Tidak ubah index.html nasirin-mila (manual fixes tetap aman)

2. catalog.json
   → Fix: nasirin-mila RSVP mode demo → sheet + URL asli
   → Fix: tema-minang foto None → True

3. assets.bernaung.id/admin.js
   → Fix: settings lock/unlock (Pengaturan terkunci setelah simpan)
   → WAJIB: edit admin.html, ganti ?v=16 → ?v=17

4. assets.bernaung.id/theme-map.json
   → Fix: tema-minang 41 map entries + 6 hide rules

5. tema-minang/index.html
   → Fix: 14 URL escaped di data-settings di-rewrite ke lokal

6. tema-minang/assets/.../webfonts/*.woff2 (3 file)
   → Fix: Font Awesome icons (daun, gift, home) tidak lagi kotak

============================================================
CARA UPLOAD:
============================================================

1. Upload SEMUA file di ZIP ini ke repo (overwrite)
2. Edit admin.html: ganti admin.js?v=16 → admin.js?v=17
3. Commit + Push
4. Panel admin → Ctrl+Shift+R

============================================================
CEK SETELAH UPLOAD:
============================================================

A. Nasirin-Mila RSVP:
   - Buka: bernaunginv.my.id/customer/nasirin-mila/index.html
   - Klik Buka Undangan → scroll ke RSVP
   - Form RSVP harus AKTIF (bukan "belum aktif")
   - Test submit → masuk ke spreadsheet

B. Tema Minang icons:
   - Buka tema-minang preview
   - Icon daun, gift, home harus tampil (bukan kotak)

C. Settings Lock:
   - Panel admin → Pengaturan
   - Input harus TERKUNCI (disabled)
   - Klik UBAH PENGATURAN → input terbuka
   - Klik SIMPAN → input terkunci lagi

D. Spreadsheet auto-create:
   - Code.gs SUDAH auto-create sheet per customer
   - Tidak perlu buat sheet manual
   - Saat RSVP pertama masuk untuk customer baru,
     tab baru otomatis dibuat dengan nama = slug customer

============================================================
CATATAN:
============================================================
- nasirin-mila/index.html TIDAK diubah (hanya data.js)
- URL Apps Script yang dipakai adalah URL LAMA nasirin-mila
  (AKfycbzm788qxF0...). Kalau URL ini masih mati (403),
  ganti dengan URL Apps Script baru Anda di:
  - customer/nasirin-mila/data.js (baris "appscript")
  - catalog.json (nasirin-mila rsvp.appscript)
- Kalau sudah set RSVP Pusat di Pengaturan (URL baru),
  customer BARU akan otomatis pakai URL itu.
  Customer LAMA (seperti nasirin-mila) perlu update data.js manual.
============================================================
