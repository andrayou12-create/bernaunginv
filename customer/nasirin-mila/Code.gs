/**
 * ============================================================
 * KODE GOOGLE APPS SCRIPT — RSVP & UCAPAN (BERNAUNG INVITATION)
 * ------------------------------------------------------------
 * Fungsi: menyimpan RSVP (nama, kehadiran, ucapan) dari undangan
 * ke Google Spreadsheet Anda dan mengirim kembali daftar ucapan.
 *
 * CARA PASANG:
 * 1. Buat Google Spreadsheet baru di sheets.google.com
 * 2. Extensions > Apps Script, hapus kode bawaan, tempel file ini
 * 3. Save, lalu Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Authorize, salin URL yang berakhiran /exec
 * 5. Tempel URL tersebut di Panel Admin Bernaung (form RSVP customer)
 * ============================================================
 */

var SHEET_NAME = 'RSVP';
var HEADERS = ['Waktu', 'Nama', 'Kehadiran', 'Ucapan'];

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
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

/** POST { nama, kehadiran, ucapan } */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var data = JSON.parse(e.postData.contents);
    var nama = String(data.nama || '').trim().substring(0, 60);
    var kehadiran = String(data.kehadiran || '').trim() === 'Hadir' ? 'Hadir' : 'Tidak Hadir';
    var ucapan = String(data.ucapan || '').trim().substring(0, 500);
    if (!nama || !ucapan) {
      return json_({ status: 'error', message: 'Nama dan ucapan wajib diisi.' });
    }
    getSheet_().appendRow([new Date(), nama, kehadiran, ucapan]);
    return json_({ status: 'success' });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/** GET ?action=list -> { status, data: [{waktu,nama,kehadiran,ucapan}] } */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || '';
    if (action !== 'list') {
      return json_({ status: 'success', message: 'API RSVP aktif', data: [] });
    }
    var sheet = getSheet_();
    var lastRow = sheet.getLastRow();
    var out = [];
    if (lastRow > 1) {
      var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
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

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
