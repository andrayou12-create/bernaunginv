/**
 * ============================================================
 * KODE GOOGLE APPS SCRIPT — RSVP & UCAPAN PUSAT (BERNAUNG INVITATION)
 * ------------------------------------------------------------
 * SATU deployment untuk SEMUA customer undangan.
 * - Data tiap customer disimpan pada TAB terpisah di spreadsheet
 *   (nama tab = slug customer, mis. "nasirin-mila").
 * - Tab customer dibuat OTOMATIS saat RSVP pertama customer itu masuk.
 * - RSVP tanpa slug (pratinjau tema / customer lama tanpa data.js)
 *   masuk ke tab "RSVP".
 *
 * CARA PASANG (sekali saja untuk semua customer):
 * 1. Buat Google Spreadsheet baru di sheets.google.com
 *    (spreadsheet ini menjadi database RSVP pusat)
 * 2. Extensions > Apps Script, hapus kode bawaan, tempel file ini
 * 3. Save, lalu Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Authorize, salin URL yang berakhiran /exec
 * 5. Tempel URL tersebut di kolom "URL Apps Script" pada Panel Admin
 *    (URL yang SAMA dipakai untuk semua customer).
 *
 * Kompatibel dengan skrip lama: parameter slug diabaikan oleh
 * deployment per-customer lama, dan tanpa slug data tetap masuk
 * ke tab "RSVP" seperti sebelumnya.
 * ============================================================
 */

var DEFAULT_SHEET = 'RSVP';
var HEADERS = ['Waktu', 'Nama', 'Kehadiran', 'Ucapan'];
/* slug customer valid: huruf kecil, angka, minus (sama dengan folder customer) */
var SLUG_RE = /^[a-z0-9-]{1,60}$/;

/** Ambil/buat tab untuk slug customer. Tanpa slug valid -> tab RSVP umum. */
function getSheet_(slug, createIfMissing) {
  var name = SLUG_RE.test(String(slug || '')) ? String(slug) : DEFAULT_SHEET;
  name = name.substring(0, 31); /* batas nama tab Google Sheets */
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    if (!createIfMissing) return null;
    sheet = ss.insertSheet(name);
  }
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

/** POST { nama, kehadiran, ucapan, slug } — JSON atau parameter form (kompatibel dua format) */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var nama = '', kehadiran = '', ucapan = '', slug = '';
    /* format 1: body JSON  { nama, kehadiran, ucapan, slug } */
    try {
      if (e && e.postData && e.postData.contents) {
        var data = JSON.parse(e.postData.contents);
        if (data && typeof data === 'object') {
          nama = data.nama || data.author || '';
          kehadiran = data.kehadiran || data.attendance || '';
          ucapan = data.ucapan || data.comment || '';
          slug = data.slug || data.customer || '';
        }
      }
    } catch (ignored) { /* bukan JSON — lanjut ke parameter form */ }
    /* format 2: parameter form (URLSearchParams) — nama/kehadiran/ucapan
       atau alias vendor author/attendance/comment.
       Inilah format yang dipakai rsvp.js; versi lama skrip yang hanya
       membaca JSON inilah penyebab "hanya tanggal terinput". */
    if (!nama && e && e.parameter) {
      nama = e.parameter.nama || e.parameter.author || '';
      kehadiran = e.parameter.kehadiran || e.parameter.attendance || '';
      ucapan = e.parameter.ucapan || e.parameter.comment || '';
      slug = e.parameter.slug || e.parameter.customer || slug;
    }
    nama = String(nama).trim().substring(0, 60);
    var h = String(kehadiran).trim();
    kehadiran = /tidak/i.test(h) ? 'Tidak Hadir' : (/hadir/i.test(h) ? 'Hadir' : 'Tidak Hadir');
    ucapan = String(ucapan).trim().substring(0, 500);
    slug = String(slug).trim().toLowerCase();
    if (!nama || !ucapan) {
      return json_({ status: 'error', message: 'Nama dan ucapan wajib diisi.' });
    }
    var sheet = getSheet_(slug, true);
    sheet.appendRow([new Date(), nama, kehadiran, ucapan]);
    return json_({ status: 'success', tab: sheet.getName() });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/**
 * GET ?action=list&slug=nasirin-mila  -> { status, data: [{waktu,nama,kehadiran,ucapan}] }
 * GET ?action=sheets                  -> { status, data: [nama semua tab customer] }
 * Tanpa slug pada action=list -> daftar tab "RSVP" umum.
 * Tab yang belum ada TIDAK dibuat saat listing (hanya dibuat saat POST).
 */
function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    var action = p.action || '';
    if (action === 'list') {
      var sheet = getSheet_(p.slug || '', false);
      var out = [];
      if (sheet && sheet.getLastRow() > 1) {
        var lastRow = sheet.getLastRow();
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
      return json_({ status: 'success', slug: String(p.slug || ''), data: out });
    }
    if (action === 'sheets') {
      var names = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function (s) {
        return s.getName();
      });
      return json_({ status: 'success', data: names });
    }
    return json_({ status: 'success', message: 'API RSVP pusat aktif', data: [] });
  } catch (err) {
    return json_({ status: 'error', message: String(err), data: [] });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
