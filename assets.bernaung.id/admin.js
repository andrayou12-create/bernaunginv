window.__ADMIN_JS_V2 = true;
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

  /* ================= GITHUB API =================
     Penulisan file memakai Git Data API (blobs -> tree -> commit -> ref)
     sehingga SEMUA file tersimpan dalam SATU commit atomik.
     Jauh lebih andal dibanding Contents API per-file (dulu sering gagal
     di tengah jalan karena sha conflict / file besar > 1 MB). */
  function ghHeaders() {
    return {
      'Authorization': 'Bearer ' + S.settings.token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }
  function ghUrl(endpoint) {
    return 'https://api.github.com/repos/' + S.settings.repo + endpoint;
  }
  async function ghApi(endpoint, opts) {
    opts = opts || {};
    var r = await fetch(ghUrl(endpoint), {
      method: opts.method || 'GET',
      headers: ghHeaders(),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!r.ok) {
      var msg = '';
      try { msg = (await r.json()).message; } catch (e) {}
      var err = new Error('GitHub API ' + r.status + (msg ? ': ' + msg : '') + ' (' + endpoint + ')');
      err.status = r.status;
      throw err;
    }
    return r.json();
  }
  async function ghGetFile(path) {
    var branch = S.settings.branch || 'main';
    try {
      var j = await ghApi('/contents/' + path + '?ref=' + encodeURIComponent(branch));
      var content = '';
      if (j.content) content = decodeURIComponent(escape(atob(j.content.replace(/\n/g, ''))));
      return { sha: j.sha, content: content };
    } catch (e) {
      if (e.status === 404) return null;
      /* Fallback: file > 1 MB tidak bisa lewat Contents API — coba raw
         (repo publik). Mencegah gagal simpan saat catalog.json membesar. */
      try {
        var r2 = await fetch('https://raw.githubusercontent.com/' + S.settings.repo + '/' + branch + '/' + path, { cache: 'no-store' });
        if (r2.ok) return { sha: null, content: await r2.text() };
      } catch (e2) {}
      if (e.status === 401) throw new Error('Token GitHub tidak valid (401). Periksa tab Pengaturan.');
      throw e;
    }
  }
  /* Satu commit untuk banyak file. Ulangi 1x bila terjadi konflik
     (branch berubah di tengah jalan). */
  async function ghCommitBatch(files, message, onProgress) {
    var branch = S.settings.branch || 'main';
    var MAX_TRIES = 3;
    for (var attempt = 1; attempt <= MAX_TRIES; attempt++) {
      try {
        var ref = await ghApi('/git/ref/heads/' + encodeURIComponent(branch));
        var baseSha = ref.object.sha;
        var baseCommit = await ghApi('/git/commits/' + baseSha);
        var items = [];
        for (var i = 0; i < files.length; i++) {
          if (onProgress) onProgress(i + 1, files.length);
          var enc = files[i].encoding === 'base64' ? 'base64' : 'utf-8';
          var payload = String(files[i].content);
          if (enc === 'base64') payload = payload.replace(/^data:[^,]*,/, '');
          var blob = await ghApi('/git/blobs', { method: 'POST', body: { content: payload, encoding: enc } });
          items.push({ path: files[i].path, mode: '100644', type: 'blob', sha: blob.sha });
        }
        var tree = await ghApi('/git/trees', { method: 'POST', body: { base_tree: baseCommit.tree.sha, tree: items } });
        var commit = await ghApi('/git/commits', { method: 'POST', body: { message: message, tree: tree.sha, parents: [baseSha] } });
        await ghApi('/git/refs/heads/' + encodeURIComponent(branch), { method: 'PATCH', body: { sha: commit.sha, force: false } });
        return commit.sha;
      } catch (e) {
        /* 409 = ref berubah (dipicu commit lain) — coba ulang; error lain lempar */
        if (e.status === 409 && attempt < MAX_TRIES) continue;
        throw e;
      }
    }
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
    /* files: [{path, content, encoding?}] — token atau manual.
       Mode token: semua file dalam SATU commit atomik (Git Data API). */
    if (hasToken()) {
      busy(true, 'MENYIMPAN ' + files.length + ' FILE KE GITHUB (1 COMMIT)...');
      try {
        await ghCommitBatch(files, msgPrefix + ' ' + files.length + ' file via Panel Admin',
          function (i, n) { busy(true, 'MENYIAPKAN FILE ' + i + '/' + n + '...'); });
      } finally { busy(false); }
      toast(files.length + ' file tersimpan ke GitHub ✓ (1 commit atomik)');
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
    var mode = ($('c_fotoMode') && $('c_fotoMode').value) || 'all';
    var cur = sel.value;
    sel.innerHTML = '';
    S.catalog.themes.forEach(function (t) {
      if (mode === 'dengan' && t.foto === false) return;
      if (mode === 'tanpa' && t.foto !== false) return;
      var o = document.createElement('option');
      o.value = t.id; o.textContent = t.name + ' (' + t.classification + ')';
      sel.appendChild(o);
    });
    if (cur && sel.querySelector('option[value="' + cur + '"]')) sel.value = cur;
    updateGalleryHint();
  }

  function gallerySlots(theme) {
    var cfg = (S.themeMap && S.themeMap.themes && S.themeMap.themes[theme]) || {};
    var n = 0;
    (cfg.map || []).forEach(function (m) {
      if (/^fotoGallery\d+$/.test(m.k || '')) n = Math.max(n, parseInt(m.k.replace('fotoGallery', ''), 10));
    });
    return n;
  }
  function updateGalleryHint() {
    var el = $('gallerySlots');
    if (!el) return;
    var n = gallerySlots($('c_theme').value);
    el.textContent = n ? ('Tema ini punya ' + n + ' slot foto galeri — isi ' + n + ' baris (urutan slot sama dengan urutan baris).')
      : 'Tema ini tidak punya galeri foto khusus.';
  }

  /* ---------- unggah foto (file -> GitHub / dataURL) ---------- */
  function readAsDataURL(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  function extOf(name) {
    var m = String(name || '').toLowerCase().match(/\.(jpe?g|png|webp|gif)$/);
    return m ? m[1] : 'jpg';
  }
  /* hasil: { value: 'url', upload: {path, content(base64)} | null } */
  async function resolvePhoto(file, slug, base) {
    if (!file) return null;
    var dataUrl = await readAsDataURL(file);
    if (hasToken()) {
      var path = 'customer/' + slug + '/foto/' + base + '.' + extOf(file.name);
      return { value: '/' + path, upload: { path: path, content: dataUrl, encoding: 'base64' } };
    }
    if (file.size > 400 * 1024) {
      toast('File ' + file.name + ' cukup besar (' + Math.round(file.size / 1024) + ' KB) — mode manual akan menyematkannya langsung ke halaman. Pasang Token agar diunggah sebagai file.', true);
    }
    return { value: dataUrl, upload: null };
  }

  ['c_fotoMode'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      fillThemeSelect();
      autoFillDefaults();
    });
  });

  $('c_theme').addEventListener('change', function () {
    autoFillDefaults();
    updateGalleryHint();
  });

  /* ---------- AUTO-ISI DARI NAMA PANGGILAN ----------
     Nama pasangan (hero) & Nama Customer (slug) otomatis mengikuti nama
     panggilan mempelai pria & wanita — tidak perlu mengisi berkali-kali.
     Bila admin menulis manual di salah satu kolom itu, auto-isi berhenti
     untuk kolom tersebut (flag _manual) agar tulisan admin tidak ditimpa. */
  function autoFillDefaults() {
    var g = $('c_groomNick').value.trim(), b = $('c_brideNick').value.trim();
    var hero = $('c_heroNames'), slug = $('c_slug');
    if ((g || b) && hero && !hero._manual) {
      hero.value = (g && b) ? g + ' & ' + b : (g || b);
    }
    if ((g || b) && slug && !slug.disabled && !slug._manual) {
      slug.value = slugify([g, b].filter(function (x) { return x; }).join('-'));
    }
  }
  ['c_groomNick', 'c_brideNick'].forEach(function (id) {
    $(id).addEventListener('input', autoFillDefaults);
    $(id).addEventListener('blur', autoFillDefaults);
  });
  ['c_heroNames', 'c_slug'].forEach(function (id) {
    $(id).addEventListener('input', function () { this._manual = true; });
  });

  /* toggle tampilan form RSVP sesuai metode (hanya Spreadsheet / tanpa RSVP) */
  function updateRsvpFields() {
    var m = $('c_rsvpMode').value;
    $('sheetFields').style.display = (m === 'sheet') ? '' : 'none';
  }
  $('c_rsvpMode').addEventListener('change', updateRsvpFields);
  updateRsvpFields();

  /* ================= LOVE STORY DINAMIS ================= */
  function addStoryRow(findVal, repVal) {
    var box = document.createElement('div');
    box.className = 'grid2';
    box.style.cssText = 'align-items:start;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px';
    box.innerHTML =
      '<div><label class="f">Teks di tema (yang diganti)</label>' +
      '<input class="f ls-find" placeholder="mis. Episode 1: Pertemuan tak terduga" value="' + esc(findVal || '') + '"></div>' +
      '<div><label class="f">Cerita / judul baru</label>' +
      '<textarea class="f ls-rep" placeholder="mis. Episode 1: Dipertemukan di kampus pada 2022" style="min-height:56px">' + esc(repVal || '') + '</textarea>' +
      '<button type="button" class="btn btn-red btn-sm" style="margin-top:6px">HAPUS</button></div>';
    box.querySelector('button').addEventListener('click', function () { box.remove(); });
    $('loveStoryList').appendChild(box);
  }
  $('btnAddStory').addEventListener('click', function () { addStoryRow('', ''); });
  function collectLoveStories() {
    var out = [];
    document.querySelectorAll('#loveStoryList .grid2').forEach(function (row) {
      var f = row.querySelector('.ls-find').value.trim();
      var r = row.querySelector('.ls-rep').value.trim();
      if (f && r) out.push({ find: f, rep: r });
    });
    return out;
  }
  function fillLoveStories(arr) {
    $('loveStoryList').innerHTML = '';
    (arr || []).forEach(function (s) { addStoryRow(s.find, s.rep); });
  }
  addStoryRow('', ''); /* satu baris awal */

  /* ================= MUSIK ================= */
  function musicExtOf(name) {
    var m = String(name || '').toLowerCase().match(/\.(mp3|ogg|m4a|wav)$/);
    return m ? m[1] : 'mp3';
  }
  async function resolveMusic(file, slug) {
    if (!file) return null;
    if (!hasToken() && file.size > 4 * 1024 * 1024) {
      toast('File musik ' + Math.round(file.size / 1048576) + ' MB — tanpa Token maks 4 MB (disematkan ke halaman). Pasang Token agar diunggah sebagai file.', true);
      return null;
    }
    var dataUrl = await readAsDataURL(file);
    if (hasToken()) {
      var path = 'customer/' + slug + '/music.' + musicExtOf(file.name);
      return { value: '/' + path, upload: { path: path, content: dataUrl, encoding: 'base64' } };
    }
    return { value: dataUrl, upload: null };
  }
  function applyMusic(html, musicVal) {
    if (!musicVal) return html;
    /* ganti src tag audio & source mp3 */
    html = html.replace(/(<audio[^>]*\ssrc=")[^"]+(")/i, '$1' + musicVal + '$2');
    html = html.replace(/(<source[^>]*\ssrc=")[^"]*\.mp3(")/i, '$1' + musicVal + '$2');
    /* tema dengan player JS: new Audio('...') / MUSIC_FILE */
    html = html.replace(/(new\s+Audio\(\s*['"])[^'"]+\.mp3(['"])/i, '$1' + musicVal + '$2');
    return html;
  }

  /* ================= PRATINJAU LIVE ================= */
  async function buildPreviewHTML() {
    var data = collectCustomerData();
    if (!data.values.groomNick && !data.values.brideNick) { toast('Isi minimal nama mempelai untuk pratinjau.'); return null; }
    var themeCfg = (S.themeMap.themes || {})[data.theme] || {};
    var raw = await fetchThemeFile(data.theme + '/index.html');
    if (!data.values.heroNames) data.values.heroNames = ((data.values.brideNick || '') + ' & ' + (data.values.groomNick || '')).trim();
    /* judul situs (tab browser) otomatis = nama customer (nama pasangan) */
    if (!data.values.title) data.values.title = data.values.heroNames;
    /* musik dari file yang dipilih (tanpa unggah) */
    var mfile = $('c_musicFile').files && $('c_musicFile').files[0];
    var musicVal = $('c_musicUrl').value.trim();
    if (mfile && !hasToken() && mfile.size <= 4 * 1024 * 1024) musicVal = await readAsDataURL(mfile);
    var res = applyReplacements(raw, themeCfg, data);
    var html = remapPaths(res.html, data.theme);
    html = applyMusic(html, musicVal);
    /* <base> agar path absolut (/tema/..., /_cdn/...) termuat dari server */
    if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, function (m) { return m + '\n<base href="/">'; });
    return html;
  }
  function isBusy() { return !$('busy').classList.contains('hidden'); }
  var liveTimer = null;
  async function renderLiveView() {
    busy(true, 'MEMBANGUN PRATINJAU LIVE...');
    try {
      var html = await buildPreviewHTML();
      busy(false);
      if (html == null) return;
      $('liveWrap').classList.remove('hidden');
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var fr = $('liveFrame');
      if (fr._objUrl) URL.revokeObjectURL(fr._objUrl);
      fr._objUrl = url; fr.src = url;
      $('liveWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { busy(false); toast('Pratinjau gagal: ' + e.message, true); }
  }
  function startLiveAuto() {
    clearInterval(liveTimer);
    if ($('liveAuto').checked) {
      liveTimer = setInterval(function () {
        if (!$('liveWrap').classList.contains('hidden') && !isBusy()) renderLiveView();
      }, 2500);
    }
  }
  $('btnLiveView').addEventListener('click', function () {
    renderLiveView().then(function () { startLiveAuto(); });
  });
  $('liveAuto').addEventListener('change', function () {
    startLiveAuto();
    if (this.checked) renderLiveView();
  });

  /* ---------- GENERATOR ----------
     Mesin penggantian teks berbasis DOM.
     Alasan: regex lama (markRegex) mengizinkan frasa "melompat" melewati
     tag HTML apa pun tanpa batas, sehingga satu frasa bisa menelan puluhan
     baris markup antara dua kata dan merusak layout tema dengan foto.
     Pendekatan baru: frasa dicari pada TEKS ELEMEN (teks yang diratakan),
     lalu hanya karakter teks di dalam rentang frasa yang diubah — tag
     pembungkus, <div>, <p>, dan gambar TIDAK tersentuh. */

  var BLOCK_RE = /^(DIV|P|H[1-6]|SECTION|ARTICLE|HEADER|FOOTER|LI|UL|OL|TR|TD|TH|TABLE|BLOCKQUOTE|FIGURE|FIGCAPTION|MAIN|ASIDE|NAV|PRE|ADDRESS|DL|DT|DD)$/;

  /* Ratakan teks elemen menjadi string normal (spasi tunggal).
     Hasil: { norm: teks, segs: [{ch, node, off, br}] per karakter norm —
     node=null untuk spasi sintetis (batas <br>/blok), br=elemen <br>. } */
  function buildNormMap(el) {
    var norm = '', segs = [], lastWasSpace = true;
    function emit(ch, node, off, br) {
      norm += ch; segs.push({ ch: ch, node: node || null, off: off, br: br || null });
    }
    function walk(n) {
      if (n.nodeType === 3) {
        var v = n.nodeValue;
        for (var i = 0; i < v.length; i++) {
          if (/\s/.test(v[i])) {
            if (!lastWasSpace) { emit(' ', n, i); lastWasSpace = true; }
          } else { emit(v[i], n, i); lastWasSpace = false; }
        }
        return;
      }
      if (n.nodeType !== 1) return;
      if (SKIP_RE.test(n.tagName)) return; /* kode program bukan teks tampilan */
      if (n.tagName === 'BR' || n.tagName === 'HR') {
        if (!lastWasSpace) { emit(' ', n, -1, n); lastWasSpace = true; }
        return;
      }
      var block = BLOCK_RE.test(n.tagName);
      if (block && !lastWasSpace) { emit(' ', null, -1); lastWasSpace = true; }
      Array.prototype.forEach.call(n.childNodes, walk);
      if (block && !lastWasSpace) { emit(' ', null, -1); lastWasSpace = true; }
    }
    Array.prototype.forEach.call(el.childNodes, walk);
    return { norm: norm, segs: segs };
  }

  /* Ganti seluruh isi elemen dengan teks baru (\n menjadi <br>) */
  function setElementText(el, value) {
    while (el.firstChild) el.removeChild(el.firstChild);
    var doc = el.ownerDocument;
    String(value).split('\n').forEach(function (p, i) {
      if (i) el.appendChild(doc.createElement('br'));
      if (p) el.appendChild(doc.createTextNode(p));
    });
  }

  /* Splice: ganti rentang [at, at+len) pada norm dengan value.
     Hanya karakter teks yang disentuh; <br> di dalam rentang dihapus;
     elemen pembungkus dan struktur blok dipertahankan. */
  function spliceSpanApply(mm, at, len, value) {
    var end = at + len;
    var firstNode = null, firstOff = 0;
    var nodeRanges = [], brs = [];
    for (var i = at; i < end; i++) {
      var s = mm.segs[i];
      if (s.br) { brs.push(s.br); continue; }
      if (!s.node) continue;
      var r = null;
      for (var j = 0; j < nodeRanges.length; j++) if (nodeRanges[j].node === s.node) { r = nodeRanges[j]; break; }
      if (!r) { r = { node: s.node, start: s.off, end: s.off + 1 }; nodeRanges.push(r); }
      else { r.start = Math.min(r.start, s.off); r.end = Math.max(r.end, s.off + 1); }
      if (!firstNode) { firstNode = s.node; firstOff = s.off; }
    }
    if (!firstNode) return false;
    /* prefix node pertama */
    var prefix = firstNode.nodeValue.slice(0, firstOff);
    /* suffix: node terakhir */
    var lastRange = nodeRanges[nodeRanges.length - 1];
    var suffix = (lastRange.node === firstNode)
      ? firstNode.nodeValue.slice(lastRange.end)
      : lastRange.node.nodeValue.slice(lastRange.end);
    /* kosongkan semua node tersentuh */
    nodeRanges.forEach(function (r) { r.node.nodeValue = ''; });
    /* hapus <br> di dalam rentang */
    brs.forEach(function (b) { if (b.parentElement) b.parentElement.removeChild(b); });
    /* tulis nilai: prefix + value(\n → <br>) + suffix pada node pertama */
    var doc = firstNode.ownerDocument;
    var frag = doc.createDocumentFragment();
    frag.appendChild(doc.createTextNode(prefix));
    String(value).split('\n').forEach(function (p, i) {
      if (i) frag.appendChild(doc.createElement('br'));
      if (p) frag.appendChild(doc.createTextNode(p));
    });
    frag.appendChild(doc.createTextNode(suffix));
    firstNode.parentElement.insertBefore(frag, firstNode);
    firstNode.parentElement.removeChild(firstNode);
    return true;
  }

  /* Ganti SATU kemunculan frasa pada satu elemen (whole atau part) */
  function replaceInElement(el, findNorm, value) {
    for (var guard = 0; guard < 20; guard++) {
      var mm = buildNormMap(el);
      var lower = mm.norm.toLowerCase();
      var whole = lower === findNorm;
      var at = lower.indexOf(findNorm);
      if (at === -1) return 0;
      /* frasa murni angka: tolak kecocokan di tengah deretan digit lain
         (mis. "12345678" di dalam "081234567890") supaya nomor kado/rekening
         tidak saling merusak. Juga tolak bagian bilangan desimal
         (mis. "11" di dalam "11.21049" — radius ikon SVG tidak boleh
         ikut terganti oleh nomor hari/bulan). */
      if (/^\d+$/.test(findNorm)) {
        var bch = at > 0 ? lower.charAt(at - 1) : '';
        var ach = lower.charAt(at + findNorm.length) || '';
        if (/\d/.test(bch) || /\d/.test(ach)) return 0;
        if ((ach === '.' || ach === ',') && /\d/.test(lower.charAt(at + findNorm.length + 1) || '')) return 0;
        if ((bch === '.' || bch === ',') && /\d/.test(lower.charAt(at - 2) || '')) return 0;
      }
      if (whole) { setElementText(el, value); return 1; }
      if (spliceSpanApply(mm, at, findNorm.length, value)) return 1;
    }
    return 0;
  }

  /* Ganti frasa di seluruh dokumen — teks saja, markup aman.
     maxTake: batas jumlah kemunculan yang diganti (untuk pembagian slot
     yang memakai frasa demo sama, mis. tanggal akad vs resepsi). */
  /* /i penting: <style> di dalam <svg> ber-tagName huruf kecil ("style").
     Elemen kode program & teks non-tampilan (script/style dsb.) tidak boleh
     terganti data customer — teks demo di dalamnya (string i18n "a11y...",
     koordinat SVG, angka JS) sering mengandung frasa demo secara kebetulan. */
  var SKIP_RE = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|PRE|CODE|TEXTAREA)$/i;

  function domReplacePhrase(dom, find, value, maxTake) {
    var findNorm = htmlUnescape(String(find)).replace(/\s+/g, ' ').trim().toLowerCase();
    if (!findNorm || value == null || String(value).length === 0) return 0;
    if (maxTake == null) maxTake = Infinity;
    var count = 0;
    /* elemen urut dari TERDALAM ke terluar agar elemen terkecil yang menangani */
    var all = Array.prototype.slice.call(dom.querySelectorAll('*'));
    var byDepth = {};
    all.forEach(function (el) {
      if (SKIP_RE.test(el.tagName)) return;
      var d = 0, n = el;
      while (n.parentElement) { d++; n = n.parentElement; }
      (byDepth[d] = byDepth[d] || []).push(el);
    });
    var depths = Object.keys(byDepth).map(Number).sort(function (a, b) { return b - a; });
    for (var di = 0; di < depths.length && count < maxTake; di++) {
      var bucket = byDepth[depths[di]];
      for (var ei = 0; ei < bucket.length && count < maxTake; ei++) {
        count += replaceInElement(bucket[ei], findNorm, String(value));
      }
    }
    return count;
  }

  /* Ganti frasa pada NILAI ATRIBUT (meta og:title, alt, title, dsb.) —
     pencocokan persis, tidak menyentuh markup */
  function domReplaceAttrs(dom, find, value, maxTake) {
    var findStr = htmlUnescape(String(find));
    if (!findStr || value == null || String(value).length === 0) return 0;
    if (maxTake == null) maxTake = Infinity;
    var count = 0;
    var els = Array.prototype.slice.call(dom.querySelectorAll('*'));
    var isDigit = /^\d+$/.test(findStr);
    for (var i = 0; i < els.length && count < maxTake; i++) {
      var attrs = Array.prototype.slice.call(els[i].attributes);
      for (var j = 0; j < attrs.length && count < maxTake; j++) {
        var a = attrs[j];
        if (a.nodeValue && a.nodeValue.indexOf(findStr) !== -1) {
          if (isDigit) {
            /* angka: hanya nilai atribut yang PERSIS sama (mis. data-end="28")
               — menjaga nama class/URL/ID yang kebetulan memuat digit demo */
            if (a.nodeValue !== findStr) continue;
            a.nodeValue = String(value);
            count++;
          } else {
            a.nodeValue = a.nodeValue.split(findStr).join(String(value));
            count++;
          }
        }
      }
    }
    return count;
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
    var v = function (id) { var el = $(id); return el ? el.value.trim() : ''; };
    var vals = {
      title: v('c_title'), heroNames: v('c_heroNames'),
      groomNick: v('c_groomNick'), groomFull: v('c_groomFull'),
      groomFather: v('c_groomFather'), groomMother: v('c_groomMother'), groomParents: v('c_groomParents'),
      groomIg: v('c_groomIg'),
      brideNick: v('c_brideNick'), brideFull: v('c_brideFull'),
      brideFather: v('c_brideFather'), brideMother: v('c_brideMother'), brideParents: v('c_brideParents'),
      brideIg: v('c_brideIg'),
      akadDayDate: v('c_akadDayDate'), akadTime: v('c_akadTime'), akadPlace: v('c_akadPlace'),
      resDayDate: v('c_resDayDate'), resTime: v('c_resTime'), resPlace: v('c_resPlace'),
      akadAddress: v('c_akadAddress'), resAddress: v('c_resAddress'),
      akadMaps: v('c_akadMaps'), resMaps: v('c_resMaps'),
      address: v('c_address'), gmaps: v('c_gmaps'), countdownDate: v('c_countdown'),
      gift1Number: v('c_gift1Number'), gift1Name: v('c_gift1Name'), gift1Bank: v('c_gift1Bank'),
      gift2Number: v('c_gift2Number'), gift2Name: v('c_gift2Name'), gift3Number: v('c_gift3Number'),
      kadoName: v('c_kadoName'), kadoPhone: v('c_kadoPhone'), kadoAddress: v('c_kadoAddress'),
      rsvpUrl: v('c_appscript'),
      fotoCover: v('c_fotoCover'), fotoCouple: v('c_fotoCouple'),
      fotoGroom: v('c_fotoGroom'), fotoBride: v('c_fotoBride')
    };
    /* metode RSVP WhatsApp sudah dihapus — data.wa tidak lagi dipakai */

    /* komposisi otomatis "Putra/Putri dari ..." bila kolom orang tua terisi
       tetapi frasa gabungan tema kosong — supaya bagian detail pengantin
       selalu sesuai tema */
    if (!vals.groomParents && (vals.groomFather || vals.groomMother)) {
      vals.groomParents = 'Putra dari ' + [vals.groomFather, vals.groomMother]
        .filter(function (x) { return x; }).join(' dan ');
    }
    if (!vals.brideParents && (vals.brideFather || vals.brideMother)) {
      vals.brideParents = 'Putri dari ' + [vals.brideFather, vals.brideMother]
        .filter(function (x) { return x; }).join(' dan ');
    }

    /* turunan tanggal untuk slot hero/countdown tema:
       heroDateLong  -> "Minggu, 07 Februari 2027"
       heroDateShort -> "07 . 02 . 2027" ; heroDateShort2 -> "07 . 02 . 27"
       countdownText -> tanggal bahasa Indonesia untuk countdown HTML
       (countdownDate tetap apa adanya dari form untuk kebutuhan ISO tema modern) */
    var HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
    var BULAN_NAMA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
      'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    function dateParts(y, m, d) {
      var dt = new Date(Date.UTC(y, m - 1, d));
      return {
        dayName: HARI_ID[dt.getUTCDay()],
        dayNum: String(d),
        monthName: BULAN_NAMA[m - 1],
        yearNum: String(y),
        monthYear: BULAN_NAMA[m - 1] + ' ' + y
      };
    }
    var heroDate = vals.resDayDate || vals.akadDayDate;
    if (heroDate) vals.heroDateLong = heroDate;
    var pd = parseDateID(vals.akadDayDate || vals.resDayDate);
    if (pd) {
      vals.heroDateShort = pad(pd.d) + ' . ' + pad(pd.m) + ' . ' + pd.y;
      vals.heroDateShort2 = pad(pd.d) + ' . ' + pad(pd.m) + ' . ' + String(pd.y).slice(-2);
      /* tanggal tanpa nama hari (teks naratif, mis. kalimat cerita:
         "ditanggal 09 juni 2026 ini") */
      vals.tanggalPendek = String(pd.d) + ' ' + BULAN_NAMA[pd.m - 1] + ' ' + pd.y;
    }

    /* --- pecahan tanggal per elemen (tema dgn slot hari/tanggal/bulan terpisah) --- */
    var pak = parseDateID(vals.akadDayDate);
    if (pak) {
      var pa = dateParts(pak.y, pak.m, pak.d);
      vals.akadDayName = pa.dayName; vals.akadDayNum = pa.dayNum;
      vals.akadMonthName = pa.monthName; vals.akadYearNum = pa.yearNum;
      vals.akadMonthYear = pa.monthYear;
    }
    var prs = parseDateID(vals.resDayDate || vals.akadDayDate);
    if (prs) {
      var pr = dateParts(prs.y, prs.m, prs.d);
      vals.resDayName = pr.dayName; vals.resDayNum = pr.dayNum;
      vals.resMonthName = pr.monthName; vals.resYearNum = pr.yearNum;
      vals.resMonthYear = pr.monthYear;
    }

    /* --- HITUNG MUNDUR ---
       Input tanggal hitung mundur (datetime-local) bila diisi; kalau kosong
       otomatis dari tanggal Akad/Resepsi jam 08.00 WIB.
       Menghasilkan countdownUnix (detik), countdownMs (milidetik),
       countdownIso (ISO +07:00) + teks tanggal Indonesia. */
    var cdText = null;
    if (vals.countdownDate) {
      var dtc = new Date(vals.countdownDate);
      if (!isNaN(dtc.getTime())) cdText = dtc;
    }
    var cdBase = null;
    if (cdText) {
      cdBase = { y: cdText.getFullYear(), m: cdText.getMonth() + 1, d: cdText.getDate(), hh: cdText.getHours(), mm: cdText.getMinutes() };
    } else if (pd) {
      cdBase = { y: pd.y, m: pd.m, d: pd.d, hh: 8, mm: 0 };
    }
    if (cdBase) {
      var epoch = Math.floor(Date.UTC(cdBase.y, cdBase.m - 1, cdBase.d, cdBase.hh, cdBase.mm, 0) / 1000) - 7 * 3600; /* WIB = UTC+7 */
      vals.countdownUnix = String(epoch);
      vals.countdownMs = String(epoch * 1000);
      vals.countdownIso = cdBase.y + '-' + pad(cdBase.m) + '-' + pad(cdBase.d) + 'T' + pad(cdBase.hh) + ':' + pad(cdBase.mm) + ':00+07:00';
      var tanggalCD = cdBase.d + ' ' + BULAN_NAMA[cdBase.m - 1] + ' ' + cdBase.y;
      vals.countdownText = tanggalCD;
      vals.countdownDate = tanggalCD; /* tema berteks (mis. tema-jawa) selalu dapat teks Indonesia */
    }
    /* --- alamat & link Google Maps per acara ---
       Bila kolom per acara kosong, otomatis memakai Alamat/Google Maps umum
       supaya undangan tetap lengkap tanpa mengisi dua kali. */
    if (!vals.akadAddress) vals.akadAddress = vals.address;
    if (!vals.resAddress) vals.resAddress = vals.address;
    if (!vals.akadMaps) vals.akadMaps = vals.gmaps;
    if (!vals.resMaps) vals.resMaps = vals.gmaps;

    /* judul & nama hero otomatis bila kosong */
    if (!vals.heroNames) vals.heroNames = ((vals.brideNick || '') + ' & ' + (vals.groomNick || '')).trim();
    /* judul situs (tab browser) otomatis = nama customer */
    if (!vals.title && vals.heroNames) vals.title = vals.heroNames;

    return {
      slug: slugify(v('c_slug')),
      theme: $('c_theme').value,
      name: v('c_heroNames') || (v('c_groomNick') + ' & ' + v('c_brideNick')),
      values: vals,
      fotoGallery: v('c_fotoGallery'),
      sheet: v('c_sheet'),
      rsvpMode: $('c_rsvpMode').value,
      wa: '',
      extra: v('c_extra'),
      musicUrl: v('c_musicUrl'),
      loveStories: collectLoveStories()
    };
  }

  /* ================= SEMBUNYIKAN BAGIAN OPSIONAL YANG KOSONG =================
     Bagian opsional tema (amplop digital/wedding gift, kado, love story, dsb.)
     tidak boleh tampil dengan data demo bila admin tidak mengisinya di panel.
     Konfigurasi per tema ada di theme-map.json (array "hide"):
       { k: [kunci form], f: [frasa penanda bagian], sec: [selector opsional] }
     Bila SEMUA kunci kosong, elemen bagian (data-id / hasil mencari frasa)
     disembunyikan dengan style display:none. */
  function hideSectionOf(dom, el) {
    /* naik ke ancestor blok terluar yang hanya membungkus bagian ini */
    var cls = function (e) { return ' ' + ((e && e.className) || '').toString() + ' '; };
    var s = el, guard = 0;
    while (s && s !== dom.body && guard++ < 12) {
      /* satumomen_slide/container-mobile = 1 slide utuh tema satumomen
         (netflix, spotify, simple2) — setara 1 section elementor */
      if (s.tagName === 'SECTION' || /elementor-section|e-parent|satumomen_slide|container-mobile/.test(cls(s))) break;
      s = s.parentElement;
    }
    if (!s || s === dom.body) { el.style.display = 'none'; return; }
    /* cek apakah ancestor di atasnya hanya pembungkus bagian ini saja */
    var up = 0;
    while (up++ < 8) {
      var p = s.parentElement, found = null;
      while (p && p !== dom.body) {
        if (p.tagName === 'SECTION' || /elementor-section|e-parent|satumomen_slide|container-mobile/.test(cls(p))) { found = p; break; }
        p = p.parentElement;
      }
      if (!found) break;
      var inner = found.querySelectorAll('.elementor-section, section');
      /* inner mencakup found sendiri -> bila hanya 1 berarti found tak punya
         bagian lain, jadi aman naik (membawa dekorasi latar ikut disembunyikan) */
      if (inner.length === 1) s = found; else break;
    }
    s.style.display = 'none';
  }
  function applyHideRules(dom, themeCfg, data) {
    var rules = (themeCfg && themeCfg.hide) || [];
    if (!rules.length) return;
    rules.forEach(function (rule) {
      var ks = Array.isArray(rule.k) ? rule.k : [rule.k];
      var kosong = ks.every(function (k) {
        if (k === '_love') return !(data.loveStories || []).length;
        var v = data.values[k];
        return v == null || String(v).trim() === '';
      });
      if (!kosong) return;
      /* penanda berdasarkan data-id / selector eksplisit */
      var done = false;
      (Array.isArray(rule.sec) ? rule.sec : (rule.sec ? [rule.sec] : [])).forEach(function (sel) {
        try {
          var el = dom.querySelector(sel) || dom.querySelector('[data-id="' + sel + '"]');
          if (el) { el.style.display = 'none'; done = true; }
        } catch (e) {}
      });
      if (done) return;
      /* penanda berdasarkan frasa demo -> temukan elemen terkecil lalu naik ke blok */
      (Array.isArray(rule.f) ? rule.f : [rule.f]).forEach(function (phrase) {
        var norm = htmlUnescape(String(phrase)).replace(/\s+/g, ' ').trim().toLowerCase();
        if (!norm) return;
        var best = null, bestLen = 1e9;
        var all = Array.prototype.slice.call(dom.querySelectorAll('h1,h2,h3,h4,p,span,div,li,button,a'));
        all = all.filter(function (e) { return !SKIP_RE.test(e.tagName); });
        for (var i = 0; i < all.length; i++) {
          var t = normText(all[i].textContent);
          if (t && t.indexOf(norm) !== -1 && t.length < bestLen) {
            best = all[i]; bestLen = t.length;
            if (t.length <= norm.length + 4) break;
          }
        }
        if (best) hideSectionOf(dom, best);
      });
    });
  }

  function applyReplacements(html, themeCfg, data) {
    var report = { ok: [], miss: [] };
    var map = (themeCfg && themeCfg.map) || [];
    var textRules = [], photoRules = [];

    /* susun rules dari theme-map + nilai form */
    map.forEach(function (m) {
      var val = data.values[m.k];
      if (val == null) val = '';
      if (m.k === 'rsvpUrl') return; /* regex khusus, di bawah */
      if (m.attr) return; /* aturan atribut terarah — PASS 1.2 */
      if (/^foto/.test(m.k)) {
        /* foto: penggantian path/URL persis (bukan regex) */
        photoRules.push({ find: m.f, val: String(val).trim(), k: m.k });
        return;
      }
      if (!val) return;
      textRules.push({ find: m.f, val: (m.p || '') + val, k: m.k });
    });

    /* foto galeri: baris ke-i form -> slot fotoGalleryN tema */
    var galleryLines = String(data.fotoGallery || '').split('\n').map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length; });
    var gslot = 0;
    map.forEach(function (m) {
      if (!/^fotoGallery\d+$/.test(m.k || '')) return;
      gslot++;
      var val = galleryLines[gslot - 1];
      if (val) photoRules.push({ find: m.f, val: val, k: m.k });
    });

    /* penggantian tambahan dari admin */
    (data.extra || '').split('\n').forEach(function (line) {
      var parts = line.split('|');
      if (parts.length >= 2 && parts[0].trim()) {
        textRules.push({ find: parts[0].trim(), val: parts.slice(1).join('|').trim(), k: '_extra' });
      }
    });

    /* love story dinamis (form) */
    (data.loveStories || []).forEach(function (s, i) {
      textRules.push({ find: s.find, val: s.rep, k: '_story' + (i + 1) });
    });

    /* urutkan: frasa terpanjang dulu (stabil — urutan map dipertahankan
       untuk frasa sama panjang) */
    textRules.sort(function (a, b) { return b.find.length - a.find.length; });
    photoRules.sort(function (a, b) { return b.find.length - a.find.length; });

    /* kelompokkan aturan teks yang memakai frasa demo yang sama (mis.
       tanggal akad = tanggal resepsi, IG pria = IG wanita). Kemunculan
       dibagi rata sesuai urutan: aturan awal mengambil kemunculan awal,
       aturan terakhir mengambil sisanya — label Akad/Resepsi tidak lagi
       tertukar dan data tidak menyebar ke slot lain. */
    var textByFind = {};
    textRules.forEach(function (r) {
      /* awali 'k' agar kunci murni angka (mis. "12345678") tidak diurutkan
         ulang JS sebagai kunci indeks integer — urutan sort terpanjang dulu
         harus tetap terjaga (nomor kado vs nomor rekening). */
      var key = 'k' + htmlUnescape(String(r.find)).replace(/\s+/g, ' ').trim().toLowerCase();
      (textByFind[key] = textByFind[key] || []).push(r);
    });

    /* --- PASS 0: varian URL-encoded (URL kalender, og:image, dsb.) —
           berjalan di string MENTAH SEBELUM parse DOM supaya penggantian
           teks berikutnya (mis. "Selasa" -> "Jum'at") tidak merusak frasa
           encoded di dalam URL kalender.
           HANYA untuk frasa yang benar-benar BERUBAH saat di-encode; frasa
           polos (enc == find) tetap lewat pass akhir agar pembagian
           kemunculan antar-aturan (akad vs resepsi) tidak rusak. --- */
    var pass0Hits = {};
    textRules.concat(photoRules).forEach(function (r) {
      var val = data.values[r.k];
      if (!val) return;
      /* frasa murni angka: encodeURIComponent() tidak mengubahnya, dan
         replace global di sini dapat menyentuh nomor kado/rekening lain
         yang mengandung digit demo di tengah — lewati (tidak butuh encoded). */
      if (/^\d+$/.test(String(r.find))) return;
      var enc = encodeURIComponent(r.find);
      if (enc === String(r.find)) return; /* frasa polos — pass akhir */
      if (html.indexOf(enc) !== -1 && r.k !== '_extra' && !/^_story/.test(r.k)) {
        var m = (map || []).find(function (x) { return x.k === r.k && x.f === r.find; });
        var rep = encodeURIComponent((m && m.p ? m.p : '') + val);
        var n0 = html.split(enc).length - 1;
        if (n0) {
          html = html.split(enc).join(rep);
          pass0Hits[r.k + '|' + r.find] = (pass0Hits[r.k + '|' + r.find] || 0) + n0;
        }
      }
    });

    /* --- PASS 1: teks berbasis DOM — frasa hanya diganti pada TEKS,
           tag/struktur markup tidak pernah ikut terhapus --- */
    var dom = new DOMParser().parseFromString(html, 'text/html');
    Object.keys(textByFind).forEach(function (key) {
      var rs = textByFind[key];
      rs.forEach(function (r, i) {
        var maxTake = (rs.length > 1 && i < rs.length - 1) ? 1 : Infinity;
        var n = domReplacePhrase(dom, r.find, r.val, maxTake) +
                domReplaceAttrs(dom, r.find, r.val, maxTake);
        var n0 = pass0Hits[r.k + '|' + r.find] || 0;
        if (n || n0) {
          if (n0) report.ok.push({ k: r.k, find: r.find + ' (URL)', n: n0 });
          if (n) report.ok.push({ k: r.k, find: r.find, n: n });
        } else report.miss.push({ k: r.k, find: r.find });
      });
    });
    /* --- PASS 1.2: aturan atribut terarah { k, f, attr } ---
       Untuk nilai yang TIDAK berupa teks tampilan, mis. counter hari tema
       pmotion07 (data-end="28"): nilai atribut yang PERSIS sama dengan f
       diganti nilai form. Kemunculan dibagi rata seperti aturan teks
       (aturan awal ambil kemunculan awal, aturan terakhir ambil sisanya). */
    var attrRules = {};
    map.forEach(function (m) {
      if (!m.attr || !m.f) return;
      var val = data.values[m.k];
      if (val == null || String(val).trim() === '') return;
      var key = m.attr + '===' + m.f;
      (attrRules[key] = attrRules[key] || []).push({ k: m.k, val: String(val) });
    });
    Object.keys(attrRules).forEach(function (key) {
      var rs = attrRules[key];
      var sep = key.indexOf('===');
      var attrName = key.slice(0, sep), fval = key.slice(sep + 3);
      var els = Array.prototype.filter.call(
        dom.querySelectorAll('[' + attrName + ']'),
        function (e2) { return e2.getAttribute(attrName) === fval; });
      els.forEach(function (e2, ei) {
        var r = (ei < els.length - 1 && rs.length > 1) ? rs[0] : rs[rs.length - 1];
        e2.setAttribute(attrName, r.val);
        report.ok.push({ k: r.k, find: fval + ' @' + attrName, n: 1 });
      });
    });
    /* --- PASS 1.5: sembunyikan bagian opsional yang tidak diisi --- */
    applyHideRules(dom, themeCfg, data);
    html = '<!DOCTYPE html>\n' + dom.documentElement.outerHTML;

    /* --- PASS 2: foto (path persis). Bila beberapa slot memakai file demo
           yang sama (mis. foto pria = galeri 1), kemunculan dibagi rata:
           slot pertama mengambil kemunculan pertama, slot terakhir mengambil
           sisanya — foto tidak lagi tertukar/menyebar ke slot lain. --- */
    var photoByFind = {};
    photoRules.forEach(function (r) { if (r.val) (photoByFind[r.find] = photoByFind[r.find] || []).push(r); });
    Object.keys(photoByFind).forEach(function (find) {
      var rs = photoByFind[find];
      var pos = 0;
      rs.forEach(function (r, i) {
        if (i < rs.length - 1) {
          var idx = html.indexOf(find, pos);
          if (idx === -1) { report.miss.push({ k: r.k, find: find }); return; }
          html = html.slice(0, idx) + r.val + html.slice(idx + find.length);
          pos = idx + r.val.length;
          report.ok.push({ k: r.k, find: find, n: 1 });
        } else {
          var seg = html.slice(pos);
          var n2 = seg.split(find).length - 1;
          if (n2) html = html.slice(0, pos) + seg.split(find).join(r.val);
          if (n2) report.ok.push({ k: r.k, find: find, n: n2 });
          else report.miss.push({ k: r.k, find: find });
        }
      });
    });

    /* --- aturan khusus --- */
    /* URL-encoded variant per rule dipindah ke PASS 0 (sebelum DOM). */

    /* RSVP URL (semua tema; no-op bila tidak ada) */
    if (data.values.rsvpUrl && /^https:\/\/script\.google\.com\/macros\/s\//.test(data.values.rsvpUrl)) {
      html = html.replace(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+/g, data.values.rsvpUrl);
    }
    /* Google Maps (termasuk varian /_cdn/ hasil konversi tema) */
    if (data.values.gmaps && /^https:\/\//.test(data.values.gmaps)) {
      /* URL Maps per-acara (akad/resepsi) yang sudah terganti di PASS teks
         tidak boleh ditimpa URL umum — biarkan apa adanya. */
      var keepMaps = [data.values.akadMaps, data.values.resMaps];
      html = html.replace(/https:\/\/maps\.app\.goo\.gl\/[A-Za-z0-9_-]+(\?g_st=[a-z]+)?/g, function (m0) {
        return keepMaps.indexOf(m0) !== -1 ? m0 : data.values.gmaps;
      });
      html = html.replace(/\/_cdn\/maps\.app\.goo\.gl\/[A-Za-z0-9_-]+(\?g_st=[a-z]+)?/g, function (m0) {
        return keepMaps.indexOf(m0.replace(/^\/_cdn\//, 'https://')) !== -1 ? m0 : data.values.gmaps;
      });
      html = html.replace(/https:\/\/www\.google\.com\/maps\/\?hl=[A-Za-z]+/g, data.values.gmaps);
    }
    /* Simpan tanggal kalender */
    var cal = calDates(data.values.akadDayDate || data.values.resDayDate);
    if (cal) {
      html = html.replace(/dates=\d{8}T\d{6}Z(?:%2F|\/)\d{8}T\d{6}Z/g, 'dates=' + cal);
    }
    /* Clipboard: nomor demo -> nomor customer (tanpa format).
       Ganti hanya jika demo berdiri sendiri (bukan potongan deretan angka
       lain — mis. "12345678" tidak boleh mengganti isi "081234567890"). */
    ['gift1Number', 'gift2Number', 'gift3Number', 'kadoPhone'].forEach(function (k) {
      var demo = (map || []).find(function (m) { return m.k === k; });
      var val = data.values[k];
      if (!demo || !val) return;
      var demoPlain = demo.f.replace(/\D/g, '');
      var valPlain = String(val).replace(/\D/g, '');
      if (demoPlain && valPlain && demoPlain !== valPlain) {
        var out = '', i = 0;
        while (true) {
          var at = html.indexOf(demoPlain, i);
          if (at === -1) { out += html.slice(i); break; }
          var bch = at > 0 ? html.charAt(at - 1) : '';
          var ach = html.charAt(at + demoPlain.length) || '';
          if (!/\d/.test(bch) && !/\d/.test(ach)) {
            out += html.slice(i, at) + valPlain;
            i = at + demoPlain.length;
          } else {
            out += html.slice(i, at + 1);
            i = at + 1;
          }
        }
        html = out;
      }
    });
    /* Bank khusus (teks) — bila tema punya frasa bank terpisah, admin
       dapat memakai Penggantian Tambahan. */
    return { html: html, report: report };
  }

  function remapPaths(html, theme) {
    /* kutip ganda & tunggal (master tema Elementor kerap memakai href='...') */
    html = html.replace(/(src|href)=("([^"]*)"|'([^']*)')/g,
      function (m0, attr, q2, d, s) {
        var path = (d !== undefined) ? d : s;
        if (/^(https?:|\/|#|data:|javascript:|mailto:|tel:)/i.test(path)) return m0;
        return attr + '="/' + theme + '/' + path + '"';
      });
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
        akad: { kapan: vals.akadDayDate, jam: vals.akadTime, tempat: vals.akadPlace,
                alamat: vals.akadAddress || '', gmaps: vals.akadMaps || '' },
        resepsi: { kapan: vals.resDayDate, jam: vals.resTime, tempat: vals.resPlace,
                   alamat: vals.resAddress || '', gmaps: vals.resMaps || '' },
        alamat: vals.address, gmaps: vals.gmaps
      },
      gift: [
        { bank: vals.gift1Bank || '', nomor: vals.gift1Number, atasNama: vals.gift1Name },
        { nomor: vals.gift2Number, atasNama: vals.gift2Name },
        { nomor: vals.gift3Number }
      ],
      kado: { nama: vals.kadoName, hp: vals.kadoPhone, alamat: vals.kadoAddress },
      rsvp: { mode: mode, wa: '', appscript: vals.rsvpUrl, sheet: data.sheet, hide: mode !== 'sheet' }
    }, null, 2) + ';\n';
    return js;
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
    /* validasi RSVP (metode WhatsApp sudah dihapus — hanya Spreadsheet / demo) */
    if (data.rsvpMode === 'sheet') {
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

      /* nilai otomatis: heroNames & title (judul situs = nama customer) */
      if (!data.values.heroNames) {
        data.values.heroNames = ((data.values.brideNick || '') + ' & ' + (data.values.groomNick || '')).trim();
      }
      if (!data.values.title) {
        data.values.title = data.values.heroNames;
      }

      /* --- unggah foto dari file picker (opsional) --- */
      var photoUploads = [];
      var fMap = [
        ['c_fotoCoverFile', 'c_fotoCover', 'cover'],
        ['c_fotoCoupleFile', 'c_fotoCouple', 'berdua'],
        ['c_fotoGroomFile', 'c_fotoGroom', 'mempelai-pria'],
        ['c_fotoBrideFile', 'c_fotoBride', 'mempelai-wanita']
      ];
      for (var fi = 0; fi < fMap.length; fi++) {
        var finp = $(fMap[fi][0]);
        var f = finp && finp.files && finp.files[0];
        if (f) {
          busy(true, 'MENGUNGGAH FOTO ' + f.name.toUpperCase() + '...');
          var r1 = await resolvePhoto(f, data.slug, fMap[fi][2]);
          if (r1) {
            data.values[fMap[fi][1].replace('c_', '')] = r1.value;
            if (r1.upload) photoUploads.push(r1.upload);
          }
        }
      }
      var ginp = $('c_fotoGalleryFiles');
      if (ginp && ginp.files && ginp.files.length) {
        var gLines = [];
        for (var gi = 0; gi < ginp.files.length; gi++) {
          busy(true, 'MENGUNGGAH GALERI ' + (gi + 1) + '/' + ginp.files.length + '...');
          var r2 = await resolvePhoto(ginp.files[gi], data.slug, 'galeri-' + (gi + 1));
          if (r2) { gLines.push(r2.value); if (r2.upload) photoUploads.push(r2.upload); }
        }
        if (gLines.length) data.fotoGallery = gLines.join('\n');
      }

      var res = applyReplacements(raw, themeCfg, data);
      var html = remapPaths(res.html, data.theme);

      /* --- musik (file picker / URL) --- */
      var musicUpload = null;
      var mFile = $('c_musicFile').files && $('c_musicFile').files[0];
      var musicVal = data.musicUrl || data.values.musicUrl || '';
      if (mFile) {
        busy(true, 'MENGUNGGAH MUSIK ' + mFile.name.toUpperCase() + '...');
        var rm = await resolveMusic(mFile, data.slug);
        if (rm) { musicVal = rm.value; if (rm.upload) musicUpload = rm.upload; }
      }
      html = applyMusic(html, musicVal);
      if (musicUpload) photoUploads.push(musicUpload);

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
        var cdISO = data.values.countdownIso || '';
        if (!cdISO) {
          var cd = data.values.countdownDate;
          if (cd) {
            var dt = new Date(cd);
            if (!isNaN(dt.getTime())) cdISO = dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()) +
              'T' + pad(dt.getHours()) + ':' + pad(dt.getMinutes()) + ':00+07:00';
          }
          if (!cdISO) {
            var pd = parseDateID(data.values.akadDayDate);
            if (pd) cdISO = pd.y + '-' + pad(pd.m) + '-' + pad(pd.d) + 'T08:00:00+07:00';
          }
        }
        var apiOverride = '';
        if (data.rsvpMode === 'sheet' && data.values.rsvpUrl) apiOverride = data.values.rsvpUrl;
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
      /* foto terunggah disertakan dulu agar link foto valid saat halaman dibuka */
      photoUploads.forEach(function (u) { files.unshift(u); });

      /* catat ke catalog.customers.
         PENTING: nilai foto/musik berupa dataURL (mode tanpa token) JANGAN
         ikut disimpan — catalog.json membengkak > 1 MB dan GitHub Contents
         API gagal membacanya saat simpan berikutnya (penyebab "gagal
         menambah customer"). Data tetap utuh di halaman undangannya. */
      var storedValues = {};
      Object.keys(data.values).forEach(function (k) {
        var v = data.values[k];
        storedValues[k] = (typeof v === 'string' && v.indexOf('data:') === 0) ? '' : v;
      });
      var storedGallery = String(data.fotoGallery || '').split('\n')
        .map(function (s) { return s.indexOf('data:') === 0 ? '' : s; }).join('\n');
      var entry = {
        slug: data.slug, theme: data.theme, name: data.values.heroNames,
        title: data.values.title, status: 'unpaid', createdAt: new Date().toISOString(),
        eventDate: data.values.akadDayDate || data.values.resDayDate || '',
        rsvp: { mode: data.rsvpMode || 'demo', wa: '', appscript: data.values.rsvpUrl, sheet: data.sheet },
        values: storedValues, fotoGallery: storedGallery, extra: data.extra,
        loveStories: data.loveStories,
        music: (musicVal && String(musicVal).indexOf('data:') !== 0) ? musicVal : undefined
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
      var rsvpInfo = data.rsvpMode === 'sheet' ? 'RSVP: Google Spreadsheet' : 'RSVP: demo';
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
          (c.rsvp && c.rsvp.appscript ? '<br><span style="font-size:10.5px;color:var(--muted)">AppScript OK</span>' : '') +
          '<br><button class="btn btn-line btn-sm" data-rsvp="' + i + '" style="margin-top:5px">LIHAT RSVP</button></td>' +
        '<td><span class="status ' + (c.status === 'paid' ? 'st-paid' : 'st-unpaid') + '">' +
          (c.status === 'paid' ? 'TERBAYAR' : 'BELUM BAYAR') + '</span><br>' + guestLink + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button class="btn btn-green btn-sm" data-pay="' + i + '">' + (c.status === 'paid' ? 'UNDANGAN LUNAS' : 'TANDAI TERBAYAR') + '</button> ' +
          '<button class="btn btn-line btn-sm" data-edit="' + i + '">EDIT</button> ' +
          '<button class="btn btn-red btn-sm" data-del="' + i + '">HAPUS</button>' +
        '</td>';
      tb.appendChild(tr);
    });
    tb.querySelectorAll('button[data-rsvp]').forEach(function (b) {
      b.addEventListener('click', function () { openRsvpModal(+b.getAttribute('data-rsvp')); });
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
    /* nama tema lama yang sudah diarsipkan/hapus dari katalog */
    var ARCHIVE = { 'tema-elegan': 'Tema Elegan (arsip)', 'tema-3dmotion': 'Tema 3D Motion (arsip)',
      'tema-jawanopict2': 'Tema Jawa Tanpa Foto 2 (arsip)' };
    var t = S.catalog.themes.find(function (x) { return x.id === id; });
    if (t) return t.name;
    return ARCHIVE[id] || id;
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

  /* ================= EDIT: MUAT DATA YANG SUDAH ADA (tanpa input ulang) =================
     Customer lama belum menyimpan kolom "values" di catalog.json. Agar form
     EDIT terisi otomatis, data dibaca mundur:
       1. customer/<slug>/data.js  -> window.BERNAUNG_DATA (terstruktur)
       2. customer/<slug>/index.html dipetakan balik memakai frasa demo di
          theme-map.json: struktur HTML customer identik dengan tema demonya,
          jadi teks customer pada posisi (elemen ber-data-id sama) frasa demo
          itulah nilai aslinya.
     Hasilnya diisi ke form — admin tinggal mengubah bagian yang salah. */
  function normText(s) {
    return htmlUnescape(String(s == null ? '' : s)).replace(/\s+/g, ' ').trim().toLowerCase();
  }
  /* teks customer dgn huruf asli (nilai terbaca dgn kapital yang benar) */
  function normCase(s) {
    return htmlUnescape(String(s == null ? '' : s)).replace(/\s+/g, ' ').trim();
  }
  /* filter kewarasan: buang nilai hasil pemetaan balik yang tampak salah
     (kalimat panjang / campur label lain) agar tidak jadi data sampah */
  function looksSane(k, v) {
    if (!v) return false;
    var s = String(v).trim();
    if (!s) return false;
    if (k === 'akadDayDate' || k === 'resDayDate') {
      return /^(senin|selasa|rabu|kamis|jumat|sabtu|minggu)/i.test(s) &&
        /20\d\d/.test(s) && s.length < 60 && !/pukul|wib|lokasi|google maps/i.test(s);
    }
    if (k === 'akadTime' || k === 'resTime') {
      return /\d{1,2}[.:]\d{2}/.test(s) && s.length < 40;
    }
    if (k === 'groomNick' || k === 'brideNick') {
      return s.length <= 25 && s.split(' ').length <= 2 && s.indexOf('&') === -1;
    }
    if (k === 'groomFull' || k === 'brideFull') {
      return s.length <= 60 && !/putra|putri/i.test(s) && s.split(' ').length <= 6;
    }
    if (k === 'groomParents' || k === 'brideParents') {
      return /^putra dari|^putri dari/i.test(s) && s.length <= 220;
    }
    if (/^gift\dNumber$/.test(k) || k === 'kadoPhone') {
      var digits = s.replace(/^no\. ?hp :?/i, '').replace(/\D/g, '');
      return digits.length >= 8 && digits.length <= 16;
    }
    if (k === 'address' || k === 'kadoAddress' || k === 'akadPlace' || k === 'resPlace' ||
        k === 'akadAddress' || k === 'resAddress') {
      return s.length <= 220 && !/akad nikah|resepsi|pukul|google maps/i.test(s);
    }
    if (k === 'gmaps' || k === 'akadMaps' || k === 'resMaps') return /^https?:\/\//.test(s);
    if (k === 'heroNames') return s.length <= 80 && s.split(' ').length <= 6;
    if (k === 'groomIg' || k === 'brideIg') return s.length <= 40 && !/http/i.test(s);
    if (/^foto/.test(k)) return /^(https?:|\/|data:)/.test(s) || /\.(jpe?g|png|webp|gif)$/i.test(s);
    if (k === 'kadoName') return s.length <= 80 && !/akad|resepsi/i.test(s);
    if (/^gift\dName$/.test(k)) return s.length <= 60;
    return s.length <= 300;
  }
  function stripCtx(text, a, b) {
    var t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    var lo = t.toLowerCase(), s = 0, e = t.length;
    if (a) { var ia = lo.indexOf(a.toLowerCase()); if (ia === 0) s = a.length; }
    if (b) { var ib = lo.lastIndexOf(b.toLowerCase()); if (ib !== -1 && ib + b.length === e) e = ib; }
    return t.slice(s, e).trim();
  }
  function elPathOf(el) {
    var p = [];
    while (el && el.nodeType === 1 && el.tagName !== 'BODY') {
      var i = 1, s = el;
      while (s.previousElementSibling) { i++; s = s.previousElementSibling; }
      p.unshift(i);
      el = el.parentElement;
    }
    return p.join('-');
  }
  function elByPath(doc, path) {
    if (!path) return null;
    var el = doc.body, parts = path.split('-');
    for (var i = 0; i < parts.length; i++) {
      el = el.children[+parts[i]];
      if (!el) return null;
    }
    return el;
  }
  /* elemen customer yang sejajar dengan elemen demo:
     utamakan atribut data-id Elementor (stabil), fallback ke jalur anak */
  function resolveCustomerEl(cd, demoEl) {
    var n = demoEl;
    while (n && n.nodeType === 1) {
      var did = n.getAttribute && n.getAttribute('data-id');
      if (did) {
        var ce = cd.querySelector('[data-id="' + did + '"]');
        if (ce) return ce;
      }
      n = n.parentElement;
    }
    return elByPath(cd, elPathOf(demoEl));
  }
  function parseDataJS(text) {
    var m = String(text || '').match(/window\.BERNAUNG_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
  }
  async function backfillFromHtml(c, fillFn) {
    busy(true, 'MEMUAT DATA "' + c.slug.toUpperCase() + '" DARI HALAMAN UNDANGAN...');
    try {
      var vals = {}, gallery = {}, galleryN = [];
      var rsvpUrl = '', sheet = '', musicUrl = '';
      /* --- 1. data.js terstruktur (paling akurat bila ada) --- */
      try {
        var djs = await fetchThemeFile('customer/' + c.slug + '/data.js');
        var D = parseDataJS(djs);
        if (D) {
          var P = D.pasangan || {}, A = D.acara || {};
          if (P.groom) { vals.groomNick = P.groom.nick || ''; vals.groomFull = P.groom.full || ''; }
          if (P.bride) { vals.brideNick = P.bride.nick || ''; vals.brideFull = P.bride.full || ''; }
          if (A.akad) { vals.akadDayDate = A.akad.kapan || ''; vals.akadTime = A.akad.jam || ''; vals.akadPlace = A.akad.tempat || '';
            vals.akadAddress = A.akad.alamat || ''; vals.akadMaps = A.akad.gmaps || ''; }
          if (A.resepsi) { vals.resDayDate = A.resepsi.kapan || ''; vals.resTime = A.resepsi.jam || ''; vals.resPlace = A.resepsi.tempat || '';
            vals.resAddress = A.resepsi.alamat || ''; vals.resMaps = A.resepsi.gmaps || ''; }
          vals.address = A.alamat || ''; vals.gmaps = A.gmaps || '';
          /* fallback data lama: alamat/maps umum dipakai bila per acara kosong */
          if (!vals.akadAddress) vals.akadAddress = vals.address;
          if (!vals.resAddress) vals.resAddress = vals.address;
          if (!vals.akadMaps) vals.akadMaps = vals.gmaps;
          if (!vals.resMaps) vals.resMaps = vals.gmaps;
          var G = D.gift || [];
          if (G[0]) { vals.gift1Bank = G[0].bank || ''; vals.gift1Number = G[0].nomor || ''; vals.gift1Name = G[0].atasNama || ''; }
          if (G[1]) { vals.gift2Number = G[1].nomor || ''; vals.gift2Name = G[1].atasNama || ''; }
          if (G[2]) { vals.gift3Number = G[2].nomor || ''; }
          if (D.kado) { vals.kadoName = D.kado.nama || ''; vals.kadoPhone = D.kado.hp || ''; vals.kadoAddress = D.kado.alamat || ''; }
          if (D.rsvp) {
            var ap = String(D.rsvp.appscript || '');
            if (ap && ap.indexOf('DISABLED') === -1 && ap.indexOf('__BERNAUNG_WA__') === -1) rsvpUrl = ap;
            sheet = D.rsvp.sheet || '';
          }
        }
      } catch (e) { /* data.js tidak ada — lanjut ke pemetaan HTML */ }

      /* --- 2. pemetaan balik frasa demo -> halaman customer --- */
      var demoRaw = await fetchThemeFile(c.theme + '/index.html');
      var custRaw = await fetchThemeFile('customer/' + c.slug + '/index.html');
      var dd = new DOMParser().parseFromString(demoRaw, 'text/html');
      var cd = new DOMParser().parseFromString(custRaw, 'text/html');
      var rules = ((S.themeMap.themes || {})[c.theme] || {}).map || [];
      var demoEls = Array.prototype.slice.call(dd.querySelectorAll('*'));
      function candidateFor(fNorm) {
        var best = null, bestLen = 1e9;
        for (var i = 0; i < demoEls.length; i++) {
          var t = normText(demoEls[i].textContent);
          if (t && t.indexOf(fNorm) !== -1 && t.length < bestLen) {
            best = demoEls[i]; bestLen = t.length;
            if (t.length <= fNorm.length + 4) break; /* cukup spesifik */
          }
        }
        return best;
      }
      function attrCandidateFor(fStr) {
        for (var i = 0; i < demoEls.length; i++) {
          var el = demoEls[i], attrs = el.attributes;
          if (!attrs) continue;
          for (var j = 0; j < attrs.length; j++) {
            if (attrs[j].nodeValue && attrs[j].nodeValue.indexOf(fStr) !== -1) {
              return { el: el, attr: attrs[j].name, value: attrs[j].nodeValue };
            }
          }
        }
        return null;
      }
      rules.forEach(function (m) {
        var f = String(m.f || '');
        if (!f || m.k === 'rsvpUrl' || m.k === 'title') return;
        if (/^foto/.test(m.k)) {
          var c1 = attrCandidateFor(f);
          if (c1) {
            var ce1 = resolveCustomerEl(cd, c1.el);
            if (ce1 && ce1.getAttribute(c1.attr)) {
              var cv = ce1.getAttribute(c1.attr);
              var at = c1.value.indexOf(f);
              var a = c1.value.slice(0, at), b = c1.value.slice(at + f.length);
              var val = stripCtx(cv, a, b);
              if (/^fotoGallery\d+$/.test(m.k)) { if (looksSane(m.k, val)) gallery[m.k] = val; }
              else if (!vals[m.k] && looksSane(m.k, val)) vals[m.k] = val;
            }
          }
          return;
        }
        var fNorm = normText(f);
        var cand = candidateFor(fNorm);
        if (!cand) return;
        var ce2 = resolveCustomerEl(cd, cand);
        if (!ce2) return;
        var dn = normText(cand.textContent), cn = normCase(ce2.textContent);
        if (!cn) return;
        var at2 = dn.indexOf(fNorm);
        var a2 = dn.slice(0, at2), b2 = dn.slice(at2 + fNorm.length);
        var val2 = stripCtx(cn, a2, b2);
        if (val2 && looksSane(m.k, val2) && !vals[m.k]) vals[m.k] = val2;
      });
      /* galeri urut slot */
      Object.keys(gallery).sort(function (x, y) {
        return (+x.replace('fotoGallery', '')) - (+y.replace('fotoGallery', ''));
      }).forEach(function (k) { galleryN.push(gallery[k]); });
      /* musik & RSVP dari HTML customer */
      var am = custRaw.match(/<audio[^>]*\ssrc="([^"]+)"/i) || custRaw.match(/<source[^>]*\ssrc="([^"]+)"/i);
      if (am && am[1] && am[1].indexOf('data:') !== 0 && am[1].indexOf('assets.bernaung.id') === -1 &&
          /\.(mp3|ogg|m4a|wav)(\?|$)/.test(am[1])) {
        musicUrl = am[1].indexOf('http') === 0 ? am[1] : (am[1].charAt(0) === '/' ? am[1] : '/' + am[1]);
      }
      if (!rsvpUrl) {
        var ar = custRaw.match(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/);
        if (ar && ar[0].indexOf('DISABLED') === -1 && ar[0].indexOf('__BERNAUNG_WA__') === -1) rsvpUrl = ar[0];
      }
      var matched = Object.keys(vals).length + Object.keys(gallery).length;
      if (!matched) {
        throw new Error('struktur undangan lama tidak cocok dengan tema saat ini — isi manual');
      }
      busy(false);
      fillFn(vals, galleryN.join('\n'), rsvpUrl, sheet, musicUrl);
      /* simpan sementara di memori agar generasi ulang langsung memakainya */
      c.values = Object.assign({}, c.values || {}, vals);
      if (galleryN.length) c.fotoGallery = galleryN.join('\n');
      c.rsvp = Object.assign({}, c.rsvp || {}, { appscript: rsvpUrl || (c.rsvp && c.rsvp.appscript) || '', sheet: sheet || (c.rsvp && c.rsvp.sheet) || '' });
      if (musicUrl) c.music = musicUrl;
      toast('Data "' + c.slug + '" dimuat dari halaman undangannya — cek & ubah bagian yang salah, lalu klik BUAT UNDANGAN.', true);
    } catch (e) {
      busy(false);
      toast('Gagal memuat data otomatis (' + e.message + ') — isi manual atau pilih tema lain lalu kembali.', true);
    }
  }

  function fillCustomerForm(v, c) {
    var map = { c_title: 'title', c_heroNames: 'heroNames', c_groomNick: 'groomNick', c_groomFull: 'groomFull',
      c_groomFather: 'groomFather', c_groomMother: 'groomMother', c_groomParents: 'groomParents', c_groomIg: 'groomIg',
      c_brideNick: 'brideNick', c_brideFull: 'brideFull', c_brideFather: 'brideFather',
      c_brideMother: 'brideMother', c_brideParents: 'brideParents', c_brideIg: 'brideIg',
      c_akadDayDate: 'akadDayDate', c_akadTime: 'akadTime', c_akadPlace: 'akadPlace', c_resDayDate: 'resDayDate',
      c_resTime: 'resTime', c_resPlace: 'resPlace',
      c_akadAddress: 'akadAddress', c_resAddress: 'resAddress', c_akadMaps: 'akadMaps', c_resMaps: 'resMaps',
      c_address: 'address', c_gmaps: 'gmaps',
      c_gift1Number: 'gift1Number', c_gift1Name: 'gift1Name', c_gift1Bank: 'gift1Bank',
      c_gift2Number: 'gift2Number', c_gift2Name: 'gift2Name', c_gift3Number: 'gift3Number',
      c_kadoName: 'kadoName', c_kadoPhone: 'kadoPhone', c_kadoAddress: 'kadoAddress' };
    Object.keys(map).forEach(function (id) { if ($(id)) $(id).value = v[map[id]] || ''; });
    $('c_fotoCover').value = v.fotoCover || '';
    $('c_fotoCouple').value = v.fotoCouple || '';
    $('c_fotoGroom').value = v.fotoGroom || '';
    $('c_fotoBride').value = v.fotoBride || '';
    $('c_fotoGallery').value = (c && c.fotoGallery) || '';
    ['c_fotoCoverFile', 'c_fotoCoupleFile', 'c_fotoGroomFile', 'c_fotoBrideFile', 'c_fotoGalleryFiles'].forEach(function (id) { if ($(id)) $(id).value = ''; });
    $('c_appscript').value = (c && c.rsvpAppscript) || '';
    $('c_sheet').value = (c && c.rsvpSheet) || '';
    updateRsvpFields();
    $('c_extra').value = (c && c.extra) || '';
    fillLoveStories(c && c.loveStories && c.loveStories.length ? c.loveStories : [{ find: '', rep: '' }]);
    $('c_musicUrl').value = (c && c.musicUrl) || '';
    if ($('c_musicFile')) $('c_musicFile').value = '';
    $('c_slug')._manual = true;
    $('c_heroNames')._manual = true;
  }

  function editCustomer(i) {
    var c = S.catalog.customers[i];
    S.editingCustomer = c.slug;
    switchTab('baru');
    $('c_slug').value = c.slug; $('c_slug').disabled = true;
    /* pilihan tema lama yang sudah diarsipkan tetap tampil sebagai opsi */
    var sel = $('c_theme');
    if (!sel.querySelector('option[value="' + c.theme + '"]')) {
      var o = document.createElement('option');
      o.value = c.theme; o.textContent = themeName(c.theme) + ' (arsip)';
      sel.appendChild(o);
    }
    sel.value = c.theme;
    updateGalleryHint();
    var v = c.values || {};
    var rsvpMode = (c.rsvp && c.rsvp.mode) || 'demo';
    if (rsvpMode === 'wa') rsvpMode = 'sheet'; /* metode WhatsApp sudah dihapus */
    var hasValues = v && (v.groomNick || v.brideNick || v.akadDayDate || v.resDayDate || v.heroNames);
    fillCustomerForm(v, {
      fotoGallery: c.fotoGallery,
      rsvpAppscript: (c.rsvp && c.rsvp.appscript && c.rsvp.appscript.indexOf('DISABLED') === -1 && c.rsvp.appscript.indexOf('__BERNAUNG_WA__') === -1) ? c.rsvp.appscript : '',
      rsvpSheet: (c.rsvp && c.rsvp.sheet) || '',
      rsvpMode: rsvpMode,
      extra: c.extra,
      loveStories: c.loveStories,
      musicUrl: (c.music && String(c.music).indexOf('data:') !== 0) ? c.music : ''
    });
    $('c_rsvpMode').value = rsvpMode;
    updateRsvpFields();
    if (hasValues) {
      toast('Mengedit "' + c.slug + '" — data sudah dimuat. Ubah bagian yang salah, lalu klik BUAT UNDANGAN.', true);
    } else {
      /* customer lama tanpa data values -> muat otomatis dari halamannya */
      if (!v.heroNames && c.name) $('c_heroNames').value = c.name;
      backfillFromHtml(c, function (vals, gallery, rsvpUrl, sheet, musicUrl) {
        v = Object.assign({}, v, vals);
        var ctx = {
          fotoGallery: gallery || c.fotoGallery,
          rsvpAppscript: rsvpUrl || '',
          rsvpSheet: sheet || (c.rsvp && c.rsvp.sheet) || '',
          extra: c.extra,
          loveStories: c.loveStories,
          musicUrl: musicUrl || ''
        };
        fillCustomerForm(v, ctx);
        $('c_rsvpMode').value = rsvpMode;
        updateRsvpFields();
      });
    }
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

  /* ================= RSVP MANAGER =================
     RSVP tersimpan di Google Spreadsheet (pusat: 1 tab per customer,
     dibuat otomatis oleh Code.gs versi pusat). Panel dapat:
     - melihat daftar RSVP per customer (Lihat RSVP)
     - mengunduh Excel per customer / semua customer (BNG_XLSX)
     - membackup JSON ke repo: rsvp/<slug>.json (token admin). */
  function rsvpApiOf(c) {
    var ap = String((c && c.rsvp && c.rsvp.appscript) || '');
    if (/^https:\/\/script\.google\.com\/macros\/s\//.test(ap) && ap.indexOf('DISABLED') === -1) return ap;
    return String(S.settings.rsvpCenter || '').trim();
  }
  async function fetchRsvpList(api, slug) {
    var url = api + (api.indexOf('?') === -1 ? '?' : '&') + 'action=list' +
      (slug ? '&slug=' + encodeURIComponent(slug) : '');
    var r = await fetch(url);
    var txt = await r.text();
    var j = null;
    try { j = JSON.parse(txt); } catch (e) {}
    if (!j) throw new Error('Respons bukan JSON — Apps Script masih versi lama, deploy ulang Code.gs versi pusat');
    if (j.status !== 'success') throw new Error(j.message || 'Apps Script error');
    return j.data || [];
  }
  function rsvpWaktu(t) {
    if (!t) return '—';
    try {
      var d = new Date(t);
      if (isNaN(d.getTime())) return String(t);
      return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(t); }
  }
  function rsvpToRows(list) {
    var rows = [['Waktu', 'Nama', 'Kehadiran', 'Ucapan']];
    (list || []).forEach(function (it) {
      rows.push([rsvpWaktu(it.waktu), it.nama || '', it.kehadiran || '', it.ucapan || '']);
    });
    return rows;
  }
  var RSVP_CURRENT = null; /* { customer, list } yang tampil di modal */
  var RSVP_LAST_IDX = -1;  /* customer terakhir dibuka (untuk MUAT ULANG walau gagal) */

  function renderRsvpRows(list) {
    var tb = $('rsvpTable').querySelector('tbody');
    if (!list || !list.length) {
      tb.innerHTML = '<tr><td colspan="4" style="color:var(--muted)">Belum ada RSVP masuk.</td></tr>';
      return;
    }
    var hadir = 0;
    tb.innerHTML = list.map(function (it) {
      if (it.kehadiran === 'Hadir') hadir++;
      return '<tr><td style="white-space:nowrap">' + esc(rsvpWaktu(it.waktu)) + '</td><td><b>' + esc(it.nama) + '</b></td><td>' +
        esc(it.kehadiran) + '</td><td>' + esc(it.ucapan).replace(/\n/g, '<br>') + '</td></tr>';
    }).join('');
    $('rsvpMeta').textContent = list.length + ' RSVP (' + hadir + ' hadir, ' + (list.length - hadir) + ' tidak hadir).';
  }

  function openRsvpModal(i) {
    var c = S.catalog.customers[i];
    if (!c) return;
    RSVP_LAST_IDX = i;
    var api = rsvpApiOf(c);
    $('rsvpTitle').textContent = (c.name || c.slug) + ' (' + c.slug + ')';
    $('rsvpMeta').textContent = api ? 'Sumber: spreadsheet RSVP (slug ' + c.slug + ')' : 'URL Apps Script belum terpasang.';
    $('rsvpTable').querySelector('tbody').innerHTML = '<tr><td colspan="4" style="color:var(--muted)">Memuat daftar RSVP...</td></tr>';
    $('rsvpModal').classList.remove('hidden');
    RSVP_CURRENT = null;
    if (!api) {
      $('rsvpTable').querySelector('tbody').innerHTML = '<tr><td colspan="4" style="color:var(--red)">' +
        'URL Apps Script belum ada. Isi URL RSVP pusat di tab Pengaturan, atau URL Apps Script pada form customer.</td></tr>';
      return;
    }
    fetchRsvpList(api, c.slug).then(function (list) {
      RSVP_CURRENT = { customer: c, list: list };
      renderRsvpRows(list);
    }).catch(function (e) {
      $('rsvpTable').querySelector('tbody').innerHTML = '<tr><td colspan="4" style="color:var(--red)">' + esc(e.message) + '</td></tr>';
    });
  }

  $('rsvpClose').addEventListener('click', function () { $('rsvpModal').classList.add('hidden'); });
  $('rsvpRefresh').addEventListener('click', function () {
    if (RSVP_LAST_IDX === -1) return;
    var idx = S.catalog.customers.indexOf(S.catalog.customers[RSVP_LAST_IDX]);
    if (idx === -1) { $('rsvpModal').classList.add('hidden'); return; }
    openRsvpModal(idx);
  });
  $('rsvpExcel').addEventListener('click', function () {
    if (!RSVP_CURRENT || !window.BNG_XLSX) return;
    var c = RSVP_CURRENT.customer;
    BNG_XLSX.download('rsvp-' + c.slug + '.xlsx', [{ name: c.slug, rows: rsvpToRows(RSVP_CURRENT.list) }]);
  });
  $('rsvpBackup').addEventListener('click', async function () {
    if (!RSVP_CURRENT) return;
    var c = RSVP_CURRENT.customer, list = RSVP_CURRENT.list || [];
    var content = JSON.stringify({ slug: c.slug, customer: c.name || c.slug,
      dibackup: new Date().toISOString(), jumlah: list.length, data: list }, null, 2);
    try {
      var mode = await commitFiles([{ path: 'rsvp/' + c.slug + '.json', content: content }], 'Backup RSVP ' + c.slug + ':');
      if (mode === 'manual') toast('Unduh rsvp/' + c.slug + '.json lalu unggah ke repo (folder rsvp/).', true);
    } catch (e) { toast(e.message, true); }
  });
  $('btnRsvpAll').addEventListener('click', async function () {
    var b = $('btnRsvpAll'); b.disabled = true;
    try {
      if (!window.BNG_XLSX) { toast('Pustaka Excel belum termuat.'); return; }
      var custs = S.catalog.customers.filter(function (c) { return rsvpApiOf(c); });
      if (!custs.length) { toast('Tidak ada customer dengan URL Apps Script terpasang.'); return; }
      var sheets = [], gagal = [];
      for (var i = 0; i < custs.length; i++) {
        var c = custs[i];
        busy(true, 'MENGAMBIL RSVP ' + (i + 1) + '/' + custs.length + ': ' + String(c.slug).toUpperCase() + '...');
        try {
          var list = await fetchRsvpList(rsvpApiOf(c), c.slug);
          sheets.push({ name: c.slug, rows: rsvpToRows(list) });
        } catch (e) { gagal.push(c.slug + ' (' + e.message + ')'); }
      }
      busy(false);
      if (sheets.length) BNG_XLSX.download('rsvp-semua-customer.xlsx', sheets);
      if (gagal.length) toast('Selesai — gagal: ' + gagal.join('; '), true);
      else toast('Excel RSVP ' + sheets.length + ' customer diunduh ✓');
    } catch (e) { busy(false); toast(e.message, true); }
    b.disabled = false;
  });

  /* ================= TAB PENGATURAN ================= */
  $('saveSettings').addEventListener('click', function () {
    S.settings.repo = $('s_repo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '');
    S.settings.branch = $('s_branch').value.trim() || 'main';
    S.settings.token = $('s_token').value.trim();
    S.settings.rsvpCenter = $('s_rsvpCenter').value.trim();
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
    $('s_rsvpCenter').value = S.settings.rsvpCenter || '';
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
