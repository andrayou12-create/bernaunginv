/**
 * ============================================================
 * KODE GOOGLE APPS SCRIPT — RSVP & UCAPAN UNDANGAN
 * (Dhina & Christo — Pernikahan 05 Desember 2026)
 * ------------------------------------------------------------
 * FUNGSI: Menyimpan form RSVP (nama, kehadiran, ucapan) dari
 * undangan ke Google Spreadsheet Anda, dan mengirim kembali
 * daftar ucapan untuk ditampilkan di undangan.
 *
 * CARA PASANG (ringkas — panduan lengkap di README.md):
 * 1. Buat Google Spreadsheet baru di sheets.google.com
 * 2. Ganti nama sheet1 menjadi "RSVP"
 * 3. Menu Extensions > Apps Script
 * 4. Hapus semua kode bawaan, tempel seluruh kode file ini
 * 5. Klik Save (ikon disket), lalu Deploy > New deployment
 * 6. Pilih tipe: Web app
 *    - Description: RSVP Undangan
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Klik Deploy > Authorize access > pilih akun > Allow
 * 8. Salin "Web app URL" (berakhiran /exec)
 * 9. Tempel URL itu ke js/config.js pada bagian RSVP_API_URL
 * ============================================================
 */

var SHEET_NAME = 'RSVP';
var HEADERS = ['Waktu', 'Nama', 'Kehadiran', 'Ucapan'];

/** Kembalikan sheet tujuan; buat otomatis + header bila belum ada. */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    // Format header: tebal + warna latar cokelat lembut
    var header = sheet.getRange(1, 1, 1, HEADERS.length);
    header.setFontWeight('bold').setBackground('#5d4a36').setFontColor('#f7f2ea');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 170);
    sheet.setColumnWidth(2, 190);
    sheet.setColumnWidth(3, 110);
    sheet.setColumnWidth(4, 480);
  }
  return sheet;
}

/**
 * Menerima data RSVP dari undangan (POST).
 * Body JSON: { nama, kehadiran, ucapan }
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // hindari tabrakan data saat banyak tamu kirim bersamaan

    var data = JSON.parse(e.postData.contents);
    var nama = String(data.nama || '').trim().substring(0, 60);
    var kehadiran = String(data.kehadiran || '').trim() === 'Hadir' ? 'Hadir' : 'Tidak Hadir';
    var ucapan = String(data.ucapan || '').trim().substring(0, 500);

    if (!nama || !ucapan) {
      return json_({ status: 'error', message: 'Nama dan ucapan wajib diisi.' });
    }

    var sheet = getSheet_();
    sheet.appendRow([new Date(), nama, kehadiran, ucapan]);

    return json_({ status: 'success' });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/**
 * Mengirim daftar ucapan untuk ditampilkan di undangan (GET).
 * URL: <web-app-url>?action=list
 * Balasan JSON: { status: "success", data: [{waktu,nama,kehadiran,ucapan}, ...] }
 * Ucapan terbaru berada paling awal.
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action !== 'list') {
      // Dipanggil tanpa parameter: hanya tes koneksi
      return json_({ status: 'success', message: 'API RSVP aktif', data: [] });
    }

    var sheet = getSheet_();
    var lastRow = sheet.getLastRow();
    var out = [];

    if (lastRow > 1) {
      var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      // Baca dari bawah → ucapan terbaru tampil paling atas
      for (var i = values.length - 1; i >= 0; i--) {
        var row = values[i];
        out.push({
          waktu: row[0] ? new Date(row[0]).toISOString() : '',
          nama: String(row[1] || ''),
          kehadiran: String(row[2] || ''),
          ucapan: String(row[3] || '')
        });
      }
    }

    return json_({ status: 'success', data: out });
  } catch (err) {
    return json_({ status: 'error', message: String(err), data: [] });
  }
}

/** Bungkus objek menjadi respons JSON dengan MIME type yang benar. */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
