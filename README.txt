FIX TEMA MINANG — Favicon + Footer Bernaung + Gallery
======================================================

PERUBAHAN:

1. FAVICON
   SEBELUM: Temu-Waktu-Favicon.webp
   SESUDAH: /assets.bernaung.id/favicon.png

2. FOOTER LOGO
   SEBELUM: Temu-Waktu-Logo-Official-White-1x.webp
   SESUDAH: /assets.bernaung.id/loading-bernaung.jpeg

3. FOOTER TEXT
   SEBELUM: "Made with ❤️ by Temu Waktu"
   SESUDAH: "Made with ❤️ by Bernaung Invitation"

4. COPYRIGHT
   SEBELUM: "© Temu Waktu"
   SESUDAH: "© Bernaung Invitation"

5. SOCIAL LINKS
   SEBELUM: WA 628139299911, IG @temu_waktu, TikTok @temu.waktu
   SESUDAH: WA 6282324137816, IG @bernaung.inv

6. MUSIC CREDIT
   SEBELUM: "Urang Minang Baralek Gadang..." + link ke temuwaktu
   SESUDAH: "Musik Undangan" (link dihapus)

7. WP RESIDUAL DIBERSIHKAN
   - temuwaktu.unweb.id URLs → bernaunginv.my.id
   - wp-json, xmlrpc, shortlink links → dihapus/diganti
   - jQuery dari temuwaktu → dihapus (jQuery lokal sudah ada)

8. GALLERY FOTO (12 slot)
   - 12 e-gallery-item di HTML
   - 12 fotoGallery entries di theme-map (sudah ada)
   - Paths MATCH antara HTML dan theme-map:
     fotoGallery1 → Balinese-1.webp ✓
     fotoGallery2 → Balinese-2.webp ✓
     ...sampai fotoGallery12 → Balinese-17.webp ✓
   - Upload foto galeri via panel admin → auto-replace

TOTAL: 41 replacements (favicon + footer + social + WP residual)

CARA UPLOAD:
1. Upload tema-minang/index.html ke repo (overwrite)
2. Commit + Push
3. Buka bernaunginv.my.id/tema-minang/index.html
   → Favicon: Bernaung ✓
   → Footer: "Made with ❤️ by Bernaung Invitation" ✓
   → Copyright: "© Bernaung Invitation" ✓
   → Social: WA/IG Bernaung ✓
   → Gallery: 12 foto slots ready ✓
======================================================
