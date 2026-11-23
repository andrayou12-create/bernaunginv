/* ============================================================
   BERNAUNG INVITATION — bng-xlsx.js
   ------------------------------------------------------------
   Generator file Excel (.xlsx) murni JavaScript untuk Panel
   Admin (tombol UNDUH EXCEL pada data RSVP). Tanpa pustaka
   eksternal: .xlsx disusun sebagai ZIP (metode store) berisi
   XML OpenXML standar — dibuka normal oleh Excel/Google Sheets.

   Pemakaian:
     var u8  = BNG_XLSX.build([{ name: 'nasirin-mila', rows: [[...], ...] }]);
     BNG_XLSX.download('rsvp-nasirin-mila.xlsx', [...sheet...]);
   rows: array baris; tiap baris array sel (string/number).
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- CRC32 ---------------- */
  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(u8) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* ---------------- ZIP (store) ---------------- */
  function dosDateTime(d) {
    d = d || new Date();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2));
    var date = (((d.getFullYear() - 1980) & 0x7F) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time: time & 0xFFFF, date: date & 0xFFFF };
  }

  function zipStore(files) {
    /* files: [{ name: string, data: Uint8Array }] */
    var enc = new TextEncoder();
    var dt = dosDateTime();
    var locals = [], centrals = [], offset = 0;
    files.forEach(function (f) {
      var nameU8 = enc.encode(f.name);
      var data = f.data;
      var crc = crc32(data);
      var lh = new Uint8Array(30 + nameU8.length);
      var v = new DataView(lh.buffer);
      v.setUint32(0, 0x04034b50, true);
      v.setUint16(4, 20, true);
      v.setUint16(6, 0x0800, true); /* flag UTF-8 */
      v.setUint16(8, 0, true);      /* store */
      v.setUint16(10, dt.time, true);
      v.setUint16(12, dt.date, true);
      v.setUint32(14, crc, true);
      v.setUint32(18, data.length, true);
      v.setUint32(22, data.length, true);
      v.setUint16(26, nameU8.length, true);
      v.setUint16(28, 0, true);
      lh.set(nameU8, 30);
      locals.push(lh, data);

      var ch = new Uint8Array(46 + nameU8.length);
      var cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, dt.time, true);
      cv.setUint16(14, dt.date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameU8.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      ch.set(nameU8, 46);
      centrals.push(ch);

      offset += lh.length + data.length;
    });
    var cdSize = centrals.reduce(function (s, c) { return s + c.length; }, 0);
    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);
    var total = locals.concat(centrals).concat([eocd]);
    var len = total.reduce(function (s, a) { return s + a.length; }, 0);
    var out = new Uint8Array(len);
    var pos = 0;
    total.forEach(function (a) { out.set(a, pos); pos += a.length; });
    return out;
  }

  /* ---------------- XML helpers ---------------- */
  function escXml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
      .replace(/\r\n/g, '\n').replace(/\n/g, '&#10;');
  }
  function colLetter(i) {
    var s = '';
    i++;
    while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }
  function sheetXml(rows) {
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
    for (var r = 0; r < rows.length; r++) {
      xml += '<row r="' + (r + 1) + '">';
      var row = rows[r] || [];
      for (var c = 0; c < row.length; c++) {
        var ref = colLetter(c) + (r + 1);
        var val = row[c];
        if (val == null || val === '') { xml += '<c r="' + ref + '"/>'; continue; }
        if (typeof val === 'number' && isFinite(val)) {
          xml += '<c r="' + ref + '"><v>' + val + '</v></c>';
        } else {
          xml += '<c r="' + ref + '" t="inlineStr" s="0"><is><t xml:space="preserve">' + escXml(val) + '</t></is></c>';
        }
      }
      xml += '</row>';
    }
    xml += '</sheetData></worksheet>';
    return xml;
  }
  function safeSheetName(name, used, idx) {
    var s = String(name || '').replace(/[:\\\/\?\*\[\]']/g, ' ').trim() || ('Sheet ' + idx);
    if (s.length > 31) s = s.substring(0, 31);
    var base = s, n = 2;
    while (used[s.toLowerCase()]) { s = (base.substring(0, 28)) + ' ' + (n++); }
    used[s.toLowerCase()] = 1;
    return s;
  }

  var STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
    '</styleSheet>';

  /* ---------------- build ---------------- */
  function build(sheets) {
    sheets = sheets || [];
    var enc = new TextEncoder();
    var used = {};
    var sheetNames = sheets.map(function (s, i) { return safeSheetName(s.name, used, i + 1); });

    var files = [];

    /* [Content_Types].xml */
    var overrides = sheets.map(function (s, i) {
      return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    }).join('');
    files.push({ name: '[Content_Types].xml', data: enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      overrides + '</Types>') });

    files.push({ name: '_rels/.rels', data: enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>') });

    /* workbook.xml */
    var sheetTags = sheetNames.map(function (n, i) {
      return '<sheet name="' + escXml(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
    }).join('');
    files.push({ name: 'xl/workbook.xml', data: enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets>' + sheetTags + '</sheets></workbook>') });

    /* rels workbook -> sheets + styles */
    var rels = sheetNames.map(function (n, i) {
      return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
    }).join('');
    rels += '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';
    files.push({ name: 'xl/_rels/workbook.xml.rels', data: enc.encode(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels + '</Relationships>') });

    files.push({ name: 'xl/styles.xml', data: enc.encode(STYLES_XML) });

    sheets.forEach(function (s, i) {
      files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: enc.encode(sheetXml(s.rows || [])) });
    });

    return zipStore(files);
  }

  /* ---------------- download ---------------- */
  function download(filename, sheets) {
    var u8 = build(sheets);
    var blob = new Blob([u8], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  window.BNG_XLSX = { build: build, download: download };
})();
