FIX RSVP NASIRIN-MILA — Submit + Tampil Ucapan
================================================

MASALAH:
- URL Apps Script pakai /dev (development) → tamu tidak bisa akses
- Submit "terkirim" tapi ucapan tidak tampil (false success)
- /dev endpoint butuh login Google, /exec endpoint public

FIX:

1. data.js: URL /dev → /exec
   SEBELUM: .../AKfycbyU3FPfTvd2Wrbaa5XaPJmlvX2UE16gcSbdS47gKlY/dev
   SESUDAH: .../AKfycbyU3FPfTvd2Wrbaa5XaPJmlvX2UE16gcSbdS47gKlY/exec
   + sheet URL ditambah untuk fallback

2. rsvp.js: fallback ke spreadsheet kalau Apps Script gagal
   - Jika GET ?action=list gagal → coba baca langsung dari spreadsheet (gviz)
   - Jika response bukan JSON → coba loadFromSheet()
   - Ini memastikan ucapan SELALU tampil walau Apps Script bermasalah

CARA UPLOAD:
1. Upload 2 file ke repo (overwrite):
   - customer/nasirin-mila/data.js
   - assets.bernaung.id/rsvp.js
2. Commit + Push
3. Test: buka bernaunginv.my.id/customer/nasirin-mila/index.html
   → RSVP form aktif → submit → ucapan tampil di list

PENTING — DEPLOY APPS SCRIPT ANDA:
URL /exec hanya bekerja kalau Apps Script sudah di-DEPLOY:
1. Buka script.google.com → Apps Script Anda
2. Deploy → New deployment → Web app
3. Execute as: Me
4. Who has access: Anyone
5. Deploy → Allow
6. Copy URL berakhiran /exec
7. Jika URL /exec BERBEDA dari yang di data.js,
   edit data.js baris "appscript" → ganti dengan URL /exec Anda

Kalau /exec URL Anda berbeda dari AKfycbyU3FPfTvd2...,
beritahu saya URL /exec yang baru — saya update data.js lagi.
================================================
