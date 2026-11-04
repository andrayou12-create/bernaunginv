/* ============================================================
   KONFIGURASI UNDANGAN — DHINA & CHRISTO
   ------------------------------------------------------------
   File ini tempat Anda mengatur pengaturan penting undangan.
   Bagian yang HARUS diubah: RSVP_API_URL (lihat README.md)
   ============================================================ */

const CONFIG = {

  /* URL Web App Google Apps Script untuk RSVP & Ucapan.
     1. Buat Google Spreadsheet baru
     2. Extensions > Apps Script, salin isi apps-script/Code.gs
     3. Deploy > New deployment > Web app > Access: "Anyone"
     4. Salin URL yang diakhiri /exec dan tempel di bawah ini
     Contoh: 'https://script.google.com/macros/s/AKfycbx.../exec'   */
  RSVP_API_URL: 'PASTE_URL_APPS_SCRIPT_ANDA_DISINI',

  /* Tanggal & waktu acara untuk hitung mundur (WIB = UTC+7) */
  COUNTDOWN_TARGET: '2026-12-05T08:00:00+07:00',

  /* Nama file musik latar (letakkan di assets/audio/music.mp3) */
  MUSIC_FILE: 'assets/audio/music.mp3',

  /* Jumlah ucapan yang ditampilkan pertama kali */
  UCAPAN_PER_PAGE: 10
};
