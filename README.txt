FIX RSVP NASIRIN-MILA — CUKUP UPLOAD 1 FILE
============================================

MASALAH:
- index.html, index1.html, index2.html semua load data.js
- data.js punya "appscript": ".../DISABLED/exec"
- rsvp.js deteksi DISABLED → mode demo → "Pengiriman RSVP belum aktif"

FIX:
- data.js diupdate: DISABLED → URL Apps Script rofif-aniq (sudah working)
- SEMUA 3 halaman (index, index1, index2) langsung aktif
- Tidak ubah index.html / index1.html / index2.html

CARA UPLOAD:
1. Upload customer/nasirin-mila/data.js ke repo (overwrite)
2. Commit + Push
3. Test: buka bernaunginv.my.id/customer/nasirin-mila/index.html
   → RSVP harus AKTIF (bukan "belum aktif")
   → Test submit → masuk spreadsheet

CATATAN:
- URL Apps Script dipakai: AKfycbwbVPXslEL-... (dari rofif-aniq, sudah working)
- Kalau URL ini tidak match dengan Apps Script Anda,
  edit data.js baris "appscript" → ganti dengan URL /exec Anda
- Index.html TIDAK diubah, manual fixes tetap aman
============================================
