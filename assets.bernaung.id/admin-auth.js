/* ============================================================
   BERNAUNG INVITATION — admin-auth.js
   ------------------------------------------------------------
   Proteksi Panel Admin (client-side, untuk GitHub Pages statis).
   PIN disimpan sebagai hash SHA-256 — tidak ada PIN polos di file.
   PIN DEFAULT: bernaung2026
   CARA GANTI PIN:
   - Dari Panel Admin (tab Pengaturan > Ganti PIN) bila GitHub
     Token sudah terpasang, ATAU
   - Manual: buka situs https://sha256-calculator.com, masukkan PIN
     baru, lalu ganti isi ADMIN_HASH di file ini dengan hash tersebut.
   ============================================================ */
window.BERNAUNG_ADMIN_SHA256 = "bc57f763130a2449de79a707b7741cecd34c7ca8c17afaa54d52ecc8236ab3c8";
