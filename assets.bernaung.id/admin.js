/* ============================================================
   BERNAUNG INVITATION — admin.js
   ------------------------------------------------------------
   Logika Panel Admin:
   - Login PIN (SHA-256 via crypto.subtle, hash di admin-auth.js)
   - Kelola katalog: nama, klasifikasi (pemisah otomatis), harga,
     urutan, tampil/sembunyi + tambah tema baru
   - Generator undangan customer baru dari tema pilihan
     (theme-map.json) + RSVP Spreadsheet/Apps Script
   - Daftar customer + status terbayar -> generator tamu otomatis
   - Penyimpanan: GitHub Contents API (token) atau unduh manual
   ============================================================ */
(function () {
  'use strict';

  /* ================= STATE & UTIL ================= */
  var S = {
    catalog: null,          // {brand, themes, customers}
    themeMap: null,         // theme-map.json
    settings: loadSettings(),
    editingCustomer: null   // slug yang sedang diedit
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg, long) {
    var t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('show'); }, long ? 5200 : 2400);
  }
  function busy(on, text) {
    $('busy').classList.toggle('hidden', !on);
    if (text) $('busyText').textContent = text;
  }
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem('bng_admin_set') || '{}'); }
    catch (e) { return {}; }
  }
  function saveSettingsLocal() {
    localStorage.setItem('bng_admin_set', JSON.stringify(S.settings));
    renderModeBadge();
  }
  function rp(n) {
    try { return 'Rp ' + Number(n).toLocaleString('id-ID'); } catch (e) { return 'Rp ' + n; }
  }
  function slugify(s) {
    return String(s).toLowerCase().normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }
  function htmlUnescape(s) {
    return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ');
  }
  function hasToken() { return !!(S.settings.token && S.settings.repo); }

  async function sha256Hex(text) {
    var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  /* ================= GITHUB API ================= */
  function ghHeaders() {
    return {
      'Authorization': 'Bearer ' + S.settings.token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }
  async function ghGetFile(path) {
    var url = 'https://api.github.com/repos/' + S.settings.repo + '/contents/' + path +
      '?ref=' + encodeURIComponent(S.settings.branch || 'main');
    var r = await fetch(url, { headers: ghHeaders() });
    if (r.status === 404) return null;
    if (r.status === 401) throw new Error('Token GitHub tidak valid (401). Periksa tab Pengaturan.');
    if (!r.ok) throw new Error('GitHub API ' + r.status + ' saat membaca ' + path);
    var j = await r.json();
    var content = '';
    if (j.content) content = decodeURIComponent(escape(atob(j.content.replace(/\n/g, ''))));
    return { sha: j.sha, content: content };
  }
  async function ghPutFile(path, text, message) {
    var existing = null;
    try { existing = await ghGetFile(path); } catch (e) {}
    var b64 = btoa(unescape(encodeURIComponent(text)));
    var body = {
      message: message || 'Update ' + path + ' via Panel Admin',
      content: b64,
      branch: S.settings.branch || 'main'
    };
    if (existing && existing.sha) body.sha = existing.sha;
    var r = await fetch('https://api.github.com/repos/' + S.settings.repo + '/contents/' + path, {
      method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body)
    });
    if (!r.ok) {
      var errText = '';
      try { errText = (await r.json()).message; } catch (e) {}
      throw new Error('Gagal menulis ' + path + ' (' + r.status + ' ' + errText + ')');
    }
    return true;
  }
  function downloadText(filename, text) {
    var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function manualFiles(files) {
    var ul = $('dlList'); ul.innerHTML = '';
    files.forEach(function (f) {
      var li = document.createElement('li');
      var code = document.createElement('code'); code.textContent = f.path;
      var b = document.createElement('button'); b.className = 'btn btn-gold btn-sm';
      b.textContent = 'UNDUH';
      b.addEventListener('click', function () {
        downloadText(f.path.split('/').pop(), f.content);
      });
      li.appendChild(code); li.appendChild(b); ul.appendChild(li);
    });
    $('manualModal').classList.remove('hidden');
  }
  async function commitFiles(files, msgPrefix) {
    /* files: [{path, content}] — token atau manual */
    if (hasToken()) {
      for (var i = 0; i < files.length; i++) {
        busy(true, 'MENYIMPAN ' + files[i].path + ' (' + (i + 1) + '/' + files.length + ')');
        await ghPutFile(files[i].path, files[i].content, msgPrefix + ' ' + files[i].path);
      }
      busy(false);
      toast(files.length + ' file tersimpan ke GitHub ✓');
      return 'committed';
    } else {
      busy(false);
      manualFiles(files);
      return 'manual';
    }
  }

  /* ================= LOGIN ================= */
  async function tryLogin() {
    var pin = $('pin').value || '';
    if (!window.BERNAUNG_ADMIN_SHA256) { $('pinErr').textContent = 'File auth tidak termuat.'; return; }
    var h = await sha256Hex(pin);
    if (h === window.BERNAUNG_ADMIN_SHA256) {
      sessionStorage.setItem('bng_admin_ok', '1');
      showApp();
    } else {
      $('pinErr').textContent = 'PIN salah. Coba lagi.';
      $('pin').value = '';
    }
  }
  function showApp() {
    $('login').classList.add('hidden');
    $('app').classList.remove('hidden');
    initApp();
  }

  /* ================= TABS ================= */
  function switchTab(name) {
    ['katalog', 'baru', 'daftar', 'set'].forEach(function (t) {
      $('tab-' + t).classList.toggle('hidden', t !== name);
    });
    document.querySelectorAll('nav.tabs button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === name);
    });
    if (name === 'daftar') renderCustomers();
    if (name === 'katalog') renderCustMini();
  }

  /* ================= LOAD DATA ================= */
  async function loadCatalogFromGitHub() {
    var f = await ghGetFile('catalog.json');
    return JSON.parse(f.content);
  }
  async function fetchLocal(url) {
    var r = await fetch(url);
    if (!r.ok) throw new Error('Gagal memuat ' + url + ' (HTTP ' + r.status + ')');
    return r.json();
  }

  /* ================= TAB KATALOG ================= */
  function renderThemes() {
    var tb = $('themeTable').querySelector('tbody');
    tb.innerHTML = '';
    S.catalog.themes.forEach(function (t, i) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><a href="' + esc(t.path) + '" target="_blank" class="thumb">LIHAT</a></td>' +
        '<td><input data-i="' + i + '" data-k="name" value="' + esc(t.name) + '"></td>' +
        '<td><input data-i="' + i + '" data-k="classification" value="' + esc(t.classification) + '" list="clsList"></td>' +
        '<td><input data-i="' + i + '" data-k="price" type="number" min="0" step="1000" value="' + Number(t.price || 0) + '"></td>' +
        '<td><input data-i="' + i + '" data-k="order" type="number" step="1" value="' + Number(t.order || 99) + '" style="width:70px"></td>' +
        '<td style="text-align:center"><input data-i="' + i + '" data-k="visible" type="checkbox" ' + (t.visible === false ? '' : 'checked') + '></td>' +
        '<td><code style="font-size:11px;color:var(--muted)">' + esc(t.id) + '</code></td>';
      tb.appendChild(tr);
    });
    /* kumpulkan input ke model saat berubah */
    tb.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var i = +inp.getAttribute('data-i'), k = inp.getAttribute('data-k');
        if (k === 'visible') S.catalog.themes[i][k] = inp.checked;
        else if (k === 'price' || k === 'order') S.catalog.themes[i][k] = +inp.value;
        else S.catalog.themes[i][k] = inp.value;
      });
    });
  }

  function currentClassifications() {
    var set = {};
    S.catalog.themes.forEach(function (t) { set[t.classification] = 1; });
    return Object.keys(set);
  }

  $('saveCatalog').addEventListener('click', async function () {
    var b = $('saveCatalog'); b.disabled = true;
    try {
      var files = [{ path: 'catalog.json', content: JSON.stringify(S.catalog, null, 2) }];
      var mode = await commitFiles(files, 'Katalog diperbarui:');
      if (mode === 'manual') toast('Unduh catalog.json lalu unggah ke repo.');
    } catch (e) { busy(false); toast(e.message, true); }
    b.disabled = false;
  });

  $('addTheme').addEventListener('click', function () {
    var id = prompt('ID folder tema (nama folder di repo, mis. tema-punakawan01):');
    if (!id) return;
    id = slugify(id);
    if (S.catalog.themes.some(function (t) { return t.id === id; })) { toast('ID tema sudah ada.'); return; }
    S.catalog.themes.push({
      id: id, name: 'Tema ' + id.replace(/^tema-/, '').replace(/-/g, ' ').toUpperCase(),
      classification: 'Baru', price: 150000,
      path: id + '/index.html', order: S.catalog.themes.length + 1, visible: true, note: ''
    });
    renderThemes();
    toast('Tema ditambahkan — simpan katalog, lalu unggah folder temanya (salinan tema).', true);
  });

  function renderCustMini() {
    var box = $('custMini');
    if (!S.catalog.customers.length) { box.innerHTML = '<p class="desc">Belum ada customer.</p>'; return; }
    box.innerHTML = S.catalog.customers.map(function (c) {
      return '<p class="desc">' + esc(c.slug) + ' — ' + esc(c.name) + ' — <b>' +
        (c.status === 'paid' ? 'TERBAYAR' : 'BELUM BAYAR') + '</b></p>';
    }).join('');
  }

  /* ================= TAB CUSTOMER BARU ================= */
  function fillThemeSelect() {
    var sel = $('c_theme');
    sel.innerHTML = '';
    S.catalog.themes.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t.id; o.textContent = t.name + ' (' + t.classification + ')';
      sel.appendChild(o);
    });
  }

  $('c_theme').addEventListener('change', function () {
    autoFillDefaults();
  });
  function autoFillDefaults() {
    var g = $('c_groomNick').value.trim(), b = $('c_brideNick').value.trim();
    if (!$('c_heroNames').value && (g || b)) $('c_heroNames').value = (b && g) ? b + ' & ' + g : (b || g);
    if (!$('c_title').value && (g || b)) $('c_title').value = 'Wedding - ' + (b && g ? b + ' & ' + g : (b || g));
  }
  ['c_groomNick', 'c_brideNick'].forEach(function (id) {
    $(id).addEventListener('blur', autoFillDefaults);
  });

  /* toggle tampilan form RSVP sesuai metode */
  function updateRsvpFields() {
    var m = $('c_rsvpMode').value;
    $('waField').style.display = (m === 'wa') ? '' : 'none';
    $('sheetFields').style.display = (m === 'sheet') ? '' : 'none';
    $('waHint').style.display = (m === 'wa') ? '' : 'none';
  }
  $('c_rsvpMode').addEventListener('change', updateRsvpFields);
  if (!$('c_wa').value) $('c_wa').value = '6282324137816';
  updateRsvpFields();

  $('btnPreviewTheme').addEventListener('click', function () {
    var theme = $('c_theme').value;
    $('genPreview').innerHTML = '<iframe class="iframe-prev" src="/' + theme + '/index.html"></iframe>';
  });

  /* ---------- GENERATOR ---------- */
  function markRegex(phrase) {
    /* regex toleran markup antar kata; '&' cocok dengan &amp; */
    var words = phrase.trim().split(/\s+/).map(function (w) {
      var e = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      e = e.replace(/&/g, '(?:&amp;|&#0?38;|&)').replace(/'/g, "(?:'|&#0?39;|&#8217;|&rsquo;|&lsquo;)");
      return e;
    });
    var SEP = '(?:\\s|&nbsp;|<br\\s*\\/?>|<[^>]+>)*';
    return new RegExp(words.join(SEP), 'gi');
  }
  function htmlEsc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function parseDateID(text) {
    var BULAN = { januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5, juli: 6,
      agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
      jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, agu: 7, agt: 7, sep: 8, okt: 9, nov: 10, des: 11,
      may: 4, aug: 7, oct: 9, dec: 11 };
    var m = String(text || '').match(/(\d{1,2})\s*\.?\s*([A-Za-z]+)\.?\s*(\d{4})/);
    if (!m) return null;
    var mo = BULAN[m[2].toLowerCase()];
    if (mo == null) return null;
    return { y: +m[3], m: mo + 1, d: +m[1] };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function calDates(dateText) {
    var d = parseDateID(dateText);
    if (!d) return null;
    var base = d.y + pad(d.m) + pad(d.d);
    var dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
    dt.setUTCDate(dt.getUTCDate() + 1);
    var next = dt.getUTCFullYear() + pad(dt.getUTCMonth() + 1) + pad(dt.getUTCDate());
    return base + 'T010000Z%2F' + next + 'T010000Z';
  }

  function collectCustomerData() {
    var v = function (id) { return $(id).value.trim(); };
    return {
      slug: slugify(v('c_slug')),
      theme: $('c_theme').value,
      name: v('c_heroNames') || (v('c_brideNick') + ' & ' + v('c_groomNick')),
      values: {
        title: v('c_title'), heroNames: v('c_heroNames'),
        groomNick: v('c_groomNick'), groomFull: v('c_groomFull'),
        groomFather: v('c_groomFather'), groomMother: v('c_groomMother'), groomParents: v('c_groomParents'),
        groomIg: v('c_groomIg'), groom2Full: v('c_groom2Full'),
        brideNick: v('c_brideNick'), brideFull: v('c_brideFull'),
        brideFather: v('c_brideFather'), brideMother: v('c_brideMother'), brideParents: v('c_brideParents'),
        brideIg: v('c_brideIg'), bride2Full: v('c_bride2Full'),
        akadDayDate: v('c_akadDayDate'), akadTime: v('c_akadTime'), akadPlace: v('c_akadPlace'),
        resDayDate: v('c_resDayDate'), resTime: v('c_resTime'), resPlace: v('c_resPlace'),
        address: v('c_address'), gmaps: v('c_gmaps'), countdownDate: v('c_countdown'),
        gift1Number: v('c_gift1Number'), gift1Name: v('c_gift1Name'), gift1Bank: v('c_gift1Bank'),
        gift2Number: v('c_gift2Number'), gift2Name: v('c_gift2Name'), gift3Number: v('c_gift3Number'),
        kadoName: v('c_kadoName'), kadoPhone: v('c_kadoPhone'), kadoAddress: v('c_kadoAddress'),
        rsvpUrl: v('c_appscript')
      },
      sheet: v('c_sheet'),
      rsvpMode: $('c_rsvpMode').value,
      wa: v('c_wa').replace(/\D/g, ''),
      extra: v('c_extra')
    };
  }

  function applyReplacements(html, themeCfg, data) {
    var report = { ok: [], miss: [] };
    var rules = [];
    var map = (themeCfg && themeCfg.map) || [];

    /* susun rules dari theme-map + nilai form */
    map.forEach(function (m) {
      var val = data.values[m.k];
      if (!val) return;
      if (m.k === 'rsvpUrl') return; /* regex khusus, di bawah */
      rules.push({ find: m.f, val: (m.p || '') + htmlEsc(val), k: m.k });
    });

    /* penggantian tambahan dari admin */
    (data.extra || '').split('\n').forEach(function (line) {
      var parts = line.split('|');
      if (parts.length >= 2 && parts[0].trim()) {
        rules.push({ find: parts[0].trim(), val: htmlEsc(parts.slice(1).join('|').trim()), k: '_extra' });
      }
    });

    /* urutkan: frasa terpanjang dulu */
    rules.sort(function (a, b) { return b.find.length - a.find.length; });

    rules.forEach(function (r) {
      var re = markRegex(r.find);
      var n = 0;
      html = html.replace(re, function () { n++; return r.val; });
      if (n) report.ok.push({ k: r.k, find: r.find, n: n });
      else report.miss.push({ k: r.k, find: r.find });
    });

    /* --- aturan khusus --- */
    /* URL-encoded variant per rule (untuk calendar URL, og:image, dsb.) */
    rules.forEach(function (r) {
      var val = data.values[r.k];
      if (!val) return;
      var enc = encodeURIComponent(r.find);
      if (html.indexOf(enc) !== -1 && r.k !== '_extra') {
        var m = (map || []).find(function (x) { return x.k === r.k && x.f === r.find; });
        html = html.split(enc).join(encodeURIComponent((m && m.p ? m.p : '') + val));
      }
    });

    /* RSVP URL (semua tema; no-op bila tidak ada) */
    if (data.values.rsvpUrl && /^https:\/\/script\.google\.com\/macros\/s\//.test(data.values.rsvpUrl)) {
      html = html.replace(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+/g, data.values.rsvpUrl);
    }
    /* Google Maps */
    if (data.values.gmaps && /^https:\/\//.test(data.values.gmaps)) {
      html = html.replace(/https:\/\/maps\.app\.goo\.gl\/[A-Za-z0-9_-]+(\?g_st=[a-z]+)?/g, data.values.gmaps);
      html = html.replace(/https:\/\/www\.google\.com\/maps\/\?hl=[A-Za-z]+/g, data.values.gmaps);
    }
    /* Simpan tanggal kalender */
    var cal = calDates(data.values.akadDayDate || data.values.resDayDate);
    if (cal) {
      html = html.replace(/dates=\d{8}T\d{6}Z(?:%2F|\/)\d{8}T\d{6}Z/g, 'dates=' + cal);
    }
    /* Clipboard: nomor demo -> nomor customer (tanpa format) */
    ['gift1Number', 'gift2Number', 'gift3Number', 'kadoPhone'].forEach(function (k) {
      var demo = (map || []).find(function (m) { return m.k === k; });
      var val = data.values[k];
      if (!demo || !val) return;
      var demoPlain = demo.f.replace(/\D/g, '');
      var valPlain = String(val).replace(/\D/g, '');
      if (demoPlain && valPlain && demoPlain !== valPlain) {
        html = html.split(demoPlain).join(valPlain);
      }
    });
    /* Bank khusus (teks) — bila tema punya frasa bank terpisah, admin
       dapat memakai Penggantian Tambahan. */
    return { html: html, report: report };
  }

  function remapPaths(html, theme) {
    html = html.replace(/(src|href)="(?!https?:|\/|#|data:|javascript:|mailto:|tel:)([^"]+)"/g,
      function (m0, attr, path) { return attr + '="/' + theme + '/' + path + '"'; });
    html = html.replace(/url\(\s*'([^']+)'\s*\)/g, function (m0, path) {
      if (/^(https?:|\/|data:|#)/.test(path)) return m0;
      return "url('/" + theme + '/' + path + "')";
    });
    html = html.replace(/url\(\s*"([^"]+)"\s*\)/g, function (m0, path) {
      if (/^(https?:|\/|data:|#)/.test(path)) return m0;
      return 'url("/' + theme + '/' + path + '")';
    });
    return html;
  }

  function buildDataJS(data) {
    var vals = data.values;
    var mode = data.rsvpMode || 'demo';
    var js = 'window.BERNAUNG_DATA = ' + JSON.stringify({
      slug: data.slug,
      tema: data.theme,
      pasangan: {
        groom: { nick: vals.groomNick, full: vals.groomFull },
        bride: { nick: vals.brideNick, full: vals.brideFull }
      },
      acara: {
        akad: { kapan: vals.akadDayDate, jam: vals.akadTime, tempat: vals.akadPlace },
        resepsi: { kapan: vals.resDayDate, jam: vals.resTime, tempat: vals.resPlace },
        alamat: vals.address, gmaps: vals.gmaps
      },
      gift: [
        { bank: vals.gift1Bank || '', nomor: vals.gift1Number, atasNama: vals.gift1Name },
        { nomor: vals.gift2Number, atasNama: vals.gift2Name },
        { nomor: vals.gift3Number }
      ],
      kado: { nama: vals.kadoName, hp: vals.kadoPhone, alamat: vals.kadoAddress },
      rsvp: { mode: mode, wa: data.wa || '', appscript: vals.rsvpUrl, sheet: data.sheet }
    }, null, 2) + ';\n';
    return js;
  }

  /* Snippet pengalihan RSVP tema (form bawaan tema) ke WhatsApp — mode internal */
  function waRedirectSnippet(data) {
    var nama = (data.values.heroNames || data.slug).replace(/["<>\\]/g, '');
    return '<script>\n' +
      '/* RSVP internal Bernaung: ucapan form tema dialihkan ke WhatsApp */\n' +
      '(function(){\n' +
      '  var WA = "' + data.wa + '";\n' +
      '  var NAMA = "' + nama + '";\n' +
      '  var _f = window.fetch;\n' +
      '  window.fetch = function(u, o){\n' +
      '    var s = String(u || "");\n' +
      '    if (s.indexOf("script.google.com/macros") !== -1){\n' +
      '      var b = {};\n' +
      '      try { b = JSON.parse((o && o.body) || "{}"); } catch(e){}\n' +
      '      if (String(s).indexOf("action=list") !== -1){\n' +
      '        return Promise.resolve(new Response(JSON.stringify({status:"success",data:[]}),{headers:{"Content-Type":"application/json"}}));\n' +
      '      }\n' +
      '      var t = "RSVP UNDANGAN " + NAMA + "\\\\n\\\\nNama: " + (b.nama||"-") + "\\\\nKehadiran: " + (b.kehadiran||"-") + "\\\\n\\\\nUcapan:\\\\n" + (b.ucapan||"-");\n' +
      '      window.open("https://api.whatsapp.com/send/?phone=" + WA + "&text=" + encodeURIComponent(t), "_blank");\n' +
      '      return Promise.resolve(new Response(JSON.stringify({status:"success"}),{headers:{"Content-Type":"application/json"}}));\n' +
      '    }\n' +
      '    return _f.apply(this, arguments);\n' +
      '  };\n' +
      '})();\n' +
      '<\/script>';
  }

  async function fetchThemeFile(path) {
    var r = await fetch('/' + path);
    if (!r.ok) throw new Error('Gagal memuat file tema ' + path + ' (HTTP ' + r.status + ')');
    return r.text();
  }

  $('btnGenerate').addEventListener('click', async function () {
    var data = collectCustomerData();
    if (!data.slug) { toast('Isi dulu Nama Customer / Folder (slug).'); return; }
    if (!/^[a-z0-9-]+$/.test(data.slug)) { toast('Slug hanya huruf kecil, angka, dan minus.'); return; }
    var exists = S.catalog.customers.some(function (c) { return c.slug === data.slug; });
    if (exists && !S.editingCustomer) { toast('Slug sudah dipakai customer lain.'); return; }
    if (!data.values.groomNick && !data.values.brideNick) { toast('Isi minimal nama mempelai.'); return; }
    /* validasi RSVP */
    if (data.rsvpMode === 'wa') {
      if (!/^\d{8,16}$/.test(data.wa)) { toast('Isi nomor WhatsApp tujuan RSVP (format 62...).'); return; }
      /* URL appscript lama tidak dipakai — kirim ke WA via redirect */
      data.values.rsvpUrl = '';
    } else if (data.rsvpMode === 'sheet') {
      if (!data.values.rsvpUrl) {
        if (!confirm('URL Apps Script kosong — RSVP customer akan NONAKTIF. Lanjutkan?')) return;
        data.values.rsvpUrl = 'https://script.google.com/macros/s/DISABLED/exec';
      }
    } else {
      data.values.rsvpUrl = 'https://script.google.com/macros/s/DISABLED/exec';
    }

    busy(true, 'MEMBANGUN UNDANGAN ' + data.slug.toUpperCase() + '...');
    try {
      var themeCfg = (S.themeMap.themes || {})[data.theme] || {};
      var raw = await fetchThemeFile(data.theme + '/index.html');

      /* nilai otomatis: heroNames & title */
      if (!data.values.heroNames) {
        data.values.heroNames = ((data.values.brideNick || '') + ' & ' + (data.values.groomNick || '')).trim();
      }
      if (!data.values.title) {
        data.values.title = 'Wedding - ' + data.values.heroNames;
      }

      var res = applyReplacements(raw, themeCfg, data);
      var html = remapPaths(res.html, data.theme);

      /* --- RSVP mode --- */
      var hasUniversalRsvp = html.indexOf('/assets.bernaung.id/rsvp.js') !== -1;
      if (data.rsvpMode === 'wa' && !hasUniversalRsvp && data.wa) {
        /* tema dengan form bawaan: alihkan kirim RSVP ke WhatsApp (internal) */
        html = html.replace('</body>', waRedirectSnippet(data) + '\n</body>');
      }

      /* sisipkan data.js sebelum rsvp.js global (bila ada) */
      var dataTag = '<script src="data.js"><\/script>';
      var rsvpTag = '<script src="/assets.bernaung.id/rsvp.js">';
      if (html.indexOf(rsvpTag) !== -1) {
        html = html.replace(rsvpTag, dataTag + '\n' + rsvpTag);
      } else {
        html = html.replace('</body>', dataTag + '\n</body>');
      }
      /* tema modern (config-driven): override CONFIG */
      if (themeCfg.configOverride) {
        var cd = data.values.countdownDate;
        var cdISO = '';
        if (cd) {
          var dt = new Date(cd);
          cdISO = dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) +
            'T' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':00+07:00';
        } else {
          var pd = parseDateID(data.values.akadDayDate);
          if (pd) cdISO = pd.y + '-' + pad(pd.m) + '-' + pad(pd.d) + 'T08:00:00+07:00';
        }
        var apiOverride = '';
        if (data.rsvpMode === 'sheet' && data.values.rsvpUrl) apiOverride = data.values.rsvpUrl;
        else if (data.rsvpMode === 'wa') apiOverride = 'https://script.google.com/macros/s/__BERNAUNG_WA__/exec';
        else apiOverride = 'https://script.google.com/macros/s/DISABLED/exec';
        var override = '<script>window.CONFIG = Object.assign(window.CONFIG || {}, {' +
          "RSVP_API_URL: '" + apiOverride + "'," +
          (cdISO ? "COUNTDOWN_TARGET: '" + cdISO + "'," : '') +
          "MUSIC_FILE: '/" + data.theme + "/assets/audio/music.mp3'});<\/script>";
        html = html.replace('<script src="/' + data.theme + '/js/main.js">',
          override + '\n<script src="/' + data.theme + '/js/main.js">');
      }

      /* susun file */
      var files = [
        { path: 'customer/' + data.slug + '/index.html', content: html },
        { path: 'customer/' + data.slug + '/data.js', content: buildDataJS(data) },
        { path: 'customer/' + data.slug + '/Code.gs', content: await fetchThemeFile('assets.bernaung.id/Code.gs') }
      ];

      /* catat ke catalog.customers */
      var entry = {
        slug: data.slug, theme: data.theme, name: data.values.heroNames,
        title: data.values.title, status: 'unpaid', createdAt: new Date().toISOString(),
        eventDate: data.values.akadDayDate || data.values.resDayDate || '',
        rsvp: { mode: data.rsvpMode || 'demo', wa: data.wa || '', appscript: data.values.rsvpUrl, sheet: data.sheet },
        values: data.values, extra: data.extra
      };
      if (S.editingCustomer) {
        var idx = S.catalog.customers.findIndex(function (c) { return c.slug === S.editingCustomer; });
        if (idx !== -1) entry.status = S.catalog.customers[idx].status;
        S.catalog.customers[idx !== -1 ? idx : S.catalog.customers.length] = entry;
      } else {
        S.catalog.customers.push(entry);
      }
      files.push({ path: 'catalog.json', content: JSON.stringify(S.catalog, null, 2) });

      window.__BNG_LAST_FILES = files; /* untuk inspeksi/unduhan ulang */
      var commitMode = await commitFiles(files, 'Undangan ' + data.slug + ':');
      busy(false);
      showReport(res.report);
      var url = location.origin + '/customer/' + data.slug + '/index.html';
      var rsvpInfo = data.rsvpMode === 'wa' ? 'RSVP: WhatsApp internal (' + data.wa + ')'
        : data.rsvpMode === 'sheet' ? 'RSVP: Google Spreadsheet'
        : 'RSVP: demo';
      $('genReport').innerHTML += '<p class="hint">URL undangan: <a href="' + url + '" target="_blank">' + url + '</a><br>' +
        rsvpInfo + '<br>Status: <b>BELUM BAYAR</b> — tandai Terbayar di tab Daftar Customer untuk membuat Generator Link Tamu.</p>';
      S.editingCustomer = data.slug;
      $('c_slug').disabled = true;
      if (commitMode === 'committed') renderCustomers();
    } catch (e) {
      busy(false); toast(e.message, true);
    }
  });

  function showReport(rep) {
    var box = $('genReport');
    var okHtml = rep.ok.map(function (o) { return '<li>' + esc(o.k) + ' → "' + esc(o.find) + '" (' + o.n + '×</li>'; }).join('');
    var missHtml = rep.miss.map(function (o) { return '<li>' + esc(o.k) + ' → "' + esc(o.find) + '"</li>'; }).join('');
    box.innerHTML =
      '<div class="card" style="margin-top:14px"><h2>LAPORAN PENGGANTIAN DATA</h2>' +
      '<p class="desc"><b style="color:var(--green)">Berhasil diganti:</b> ' + rep.ok.length + ' frasa.</p>' +
      (okHtml ? '<ul class="hint">' + okHtml + '</ul>' : '') +
      (missHtml ? '<p class="desc" style="margin-top:10px"><b style="color:var(--red)">Tidak ditemukan (data tema masih demo):</b></p><ul class="hint">' + missHtml + '</ul>' +
        '<p class="hint">Isi bagian <b>Penggantian Tambahan</b> di form dengan format <code>teks demo | teks baru</code> lalu buat ulang undangan.</p>' : '') +
      '</div>';
  }

  /* ================= TAB DAFTAR CUSTOMER ================= */
  function renderCustomers() {
    var tb = $('custTable').querySelector('tbody');
    tb.innerHTML = '';
    if (!S.catalog.customers.length) {
      tb.innerHTML = '<tr><td colspan="6" style="color:var(--muted)">Belum ada customer. Buat di tab <b>Customer Baru</b>.</td></tr>';
      return;
    }
    S.catalog.customers.forEach(function (c, i) {
      var tr = document.createElement('tr');
      var guestLink = c.status === 'paid' ? '<a href="/customer/' + esc(c.slug) + '/tamu.html" target="_blank">Generator Tamu</a>' : '—';
      tr.innerHTML =
        '<td><b>' + esc(c.name || c.slug) + '</b><br><code style="font-size:11px;color:var(--muted)">/customer/' + esc(c.slug) + '</code><br>' +
          '<a href="/customer/' + esc(c.slug) + '/index.html" target="_blank">Buka Undangan</a></td>' +
        '<td>' + esc(themeName(c.theme)) + '</td>' +
        '<td>' + esc(c.eventDate || '') + '</td>' +
        '<td>' + (c.rsvp && c.rsvp.sheet ? '<a href="' + esc(c.rsvp.sheet) + '" target="_blank">Spreadsheet</a>' : '—') +
          (c.rsvp && c.rsvp.appscript ? '<br><span style="font-size:10.5px;color:var(--muted)">AppScript OK</span>' : '') + '</td>' +
        '<td><span class="status ' + (c.status === 'paid' ? 'st-paid' : 'st-unpaid') + '">' +
          (c.status === 'paid' ? 'TERBAYAR' : 'BELUM BAYAR') + '</span><br>' + guestLink + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button class="btn btn-green btn-sm" data-pay="' + i + '">' + (c.status === 'paid' ? 'UNDANGAN LUNAS' : 'TANDAI TERBAYAR') + '</button> ' +
          '<button class="btn btn-line btn-sm" data-edit="' + i + '">EDIT</button> ' +
          '<button class="btn btn-red btn-sm" data-del="' + i + '">HAPUS</button>' +
        '</td>';
      tb.appendChild(tr);
    });
    tb.querySelectorAll('button[data-pay]').forEach(function (b) {
      b.addEventListener('click', function () { markPaid(+b.getAttribute('data-pay')); });
    });
    tb.querySelectorAll('button[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () { editCustomer(+b.getAttribute('data-edit')); });
    });
    tb.querySelectorAll('button[data-del]').forEach(function (b) {
      b.addEventListener('click', function () { deleteCustomer(+b.getAttribute('data-del')); });
    });
  }
  function themeName(id) {
    var t = S.catalog.themes.find(function (x) { return x.id === id; });
    return t ? t.name : id;
  }

  async function markPaid(i) {
    var c = S.catalog.customers[i];
    if (!confirm('Tandai "' + c.slug + '" TERBAYAR? Generator Link Tamu (tamu.html) akan dibuat otomatis.')) return;
    busy(true, 'MEMBUAT GENERATOR LINK TAMU...');
    try {
      var tpl = await fetchThemeFile('assets.bernaung.id/tamu-template.html');
      var base = location.origin + '/customer/' + c.slug + '/index.html';
      var html = tpl.replace(/__NAMA__/g, esc(c.name || c.slug)).replace(/__BASEURL__/g, base);
      var files = [
        { path: 'customer/' + c.slug + '/tamu.html', content: html },
        { path: 'catalog.json', content: JSON.stringify(S.catalog, null, 2) }
      ];
      c.status = 'paid';
      files[1].content = JSON.stringify(S.catalog, null, 2);
      await commitFiles(files, 'Customer ' + c.slug + ' terbayar:');
      busy(false);
      renderCustomers();
      toast('Tandai terbayar ✓ Generator tamu: /customer/' + c.slug + '/tamu.html', true);
    } catch (e) { busy(false); toast(e.message, true); }
  }

  function editCustomer(i) {
    var c = S.catalog.customers[i];
    S.editingCustomer = c.slug;
    switchTab('baru');
    $('c_slug').value = c.slug; $('c_slug').disabled = true;
    $('c_theme').value = c.theme;
    var v = c.values || {};
    var map = { c_title: 'title', c_heroNames: 'heroNames', c_groomNick: 'groomNick', c_groomFull: 'groomFull',
      c_groomFather: 'groomFather', c_groomMother: 'groomMother', c_groomParents: 'groomParents', c_groomIg: 'groomIg',
      c_groom2Full: 'groom2Full', c_brideNick: 'brideNick', c_brideFull: 'brideFull', c_brideFather: 'brideFather',
      c_brideMother: 'brideMother', c_brideParents: 'brideParents', c_brideIg: 'brideIg', c_bride2Full: 'bride2Full',
      c_akadDayDate: 'akadDayDate', c_akadTime: 'akadTime', c_akadPlace: 'akadPlace', c_resDayDate: 'resDayDate',
      c_resTime: 'resTime', c_resPlace: 'resPlace', c_address: 'address', c_gmaps: 'gmaps',
      c_gift1Number: 'gift1Number', c_gift1Name: 'gift1Name', c_gift1Bank: 'gift1Bank',
      c_gift2Number: 'gift2Number', c_gift2Name: 'gift2Name', c_gift3Number: 'gift3Number',
      c_kadoName: 'kadoName', c_kadoPhone: 'kadoPhone', c_kadoAddress: 'kadoAddress' };
    Object.keys(map).forEach(function (id) { if ($(id)) $(id).value = v[map[id]] || ''; });
    $('c_appscript').value = (c.rsvp && c.rsvp.appscript && c.rsvp.appscript.indexOf('DISABLED') === -1 && c.rsvp.appscript.indexOf('__BERNAUNG_WA__') === -1) ? c.rsvp.appscript : '';
    $('c_sheet').value = (c.rsvp && c.rsvp.sheet) || '';
    $('c_rsvpMode').value = (c.rsvp && c.rsvp.mode) || 'demo';
    $('c_wa').value = (c.rsvp && c.rsvp.wa) || '6282324137816';
    updateRsvpFields();
    $('c_extra').value = c.extra || '';
    toast('Mengedit "' + c.slug + '" — ubah data lalu klik BUAT UNDANGAN untuk membuat ulang filenya.', true);
  }

  async function deleteCustomer(i) {
    var c = S.catalog.customers[i];
    if (!confirm('Hapus "' + c.slug + '" dari daftar? (File di repo tidak ikut terhapus — hapus manual bila perlu.)')) return;
    S.catalog.customers.splice(i, 1);
    try {
      await commitFiles([{ path: 'catalog.json', content: JSON.stringify(S.catalog, null, 2) }], 'Hapus customer dari katalog:');
      renderCustomers(); renderCustMini();
    } catch (e) { toast(e.message, true); }
  }

  /* ================= TAB PENGATURAN ================= */
  $('saveSettings').addEventListener('click', function () {
    S.settings.repo = $('s_repo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    S.settings.branch = $('s_branch').value.trim() || 'main';
    S.settings.token = $('s_token').value.trim();
    saveSettingsLocal();
    renderModeBadge();
    toast('Pengaturan disimpan di browser ini.');
  });
  $('testToken').addEventListener('click', async function () {
    if (!S.settings.token || !S.settings.repo) { toast('Isi repo dan token dulu.'); return; }
    busy(true, 'MENGUJI KONEKSI...');
    try {
      await ghGetFile('catalog.json');
      busy(false); toast('Koneksi GitHub OK ✓ — panel siap menyimpan langsung.');
    } catch (e) { busy(false); toast(e.message, true); }
  });
  $('btnPin').addEventListener('click', async function () {
    var a = $('p1').value, b = $('p2').value;
    if (!a || a.length < 6) { toast('PIN minimal 6 karakter.'); return; }
    if (a !== b) { toast('PIN tidak sama.'); return; }
    var h = await sha256Hex(a);
    var file = 'window.BERNAUNG_ADMIN_SHA256 = "' + h + '";\n';
    try {
      await commitFiles([{ path: 'assets.bernaung.id/admin-auth.js', content: file }], 'Ganti PIN admin:');
      $('p1').value = $('p2').value = '';
      toast('PIN diganti ✓ (mode manual: unduh file lalu unggah ke repo).', true);
    } catch (e) { toast(e.message, true); }
  });
  $('dlCode').addEventListener('click', function () {
    fetchThemeFile('assets.bernaung.id/Code.gs').then(function (t) { downloadText('Code.gs', t); });
  });

  function renderModeBadge() {
    var b = $('modeBadge');
    if (hasToken()) { b.className = 'status st-paid'; b.textContent = 'MODE: SIMPAN LANGSUNG'; }
    else { b.className = 'status st-unpaid'; b.textContent = 'MODE: UNDUH MANUAL'; }
  }

  /* ================= INIT ================= */
  async function initApp() {
    $('s_repo').value = S.settings.repo || 'andrayou12-create/bernaunginv';
    $('s_branch').value = S.settings.branch || 'main';
    $('s_token').value = S.settings.token || '';
    renderModeBadge();

    busy(true, 'MEMUAT DATA...');
    try {
      if (hasToken()) {
        S.catalog = await loadCatalogFromGitHub();
      } else {
        S.catalog = await fetchLocal('/catalog.json');
      }
      S.themeMap = await fetchLocal('/assets.bernaung.id/theme-map.json');
      busy(false);
      renderThemes();
      fillThemeSelect();
      renderCustomers();
      renderCustMini();
      toast('Panel siap ✓');
    } catch (e) {
      busy(false);
      toast('Gagal memuat data: ' + e.message, true);
    }
  }

  /* ================= EVENT GLOBAL ================= */
  $('pinBtn').addEventListener('click', tryLogin);
  $('pin').addEventListener('keydown', function (e) { if (e.key === 'Enter') tryLogin(); });
  $('logout').addEventListener('click', function () {
    sessionStorage.removeItem('bng_admin_ok');
    location.reload();
  });
  document.querySelectorAll('nav.tabs button').forEach(function (b) {
    b.addEventListener('click', function () { switchTab(b.getAttribute('data-tab')); });
  });
  $('closeManual').addEventListener('click', function () {
    $('manualModal').classList.add('hidden');
  });

  if (sessionStorage.getItem('bng_admin_ok') === '1') showApp();
})();
