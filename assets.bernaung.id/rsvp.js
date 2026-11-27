/* ============================================================
   BERNAUNG INVITATION — rsvp.js (aset global)
   ------------------------------------------------------------
   Form RSVP & ucapan universal untuk semua tema undangan.

   Sumber konfigurasi (opsional, dari data.js milik customer):
     window.BERNAUNG_DATA = {
       rsvp: { appscript: 'https://script.google.com/macros/s/.../exec' }
     }
   - Tanpa config  -> mode DEMO (submit tidak mengirim ke mana pun).
   - Dengan config -> mode LIVE: POST {nama, kehadiran, ucapan}
     dan GET ?action=list (format Apps Script Bernaung).

   Prioritas target penempatan:
   1. Elemen [data-bernaung-rsvp]                 -> form diisi di situ
   2. Widget RSVP vendor Elementor (.wds_rsvp)    -> digantikan
   3. Tidak ada keduanya                          -> section baru
      disisipkan sebelum footer Bernaung / sebelum </body>
   ============================================================ */
(function () {
  if (window.__BERNAUNG_RSVP_LOADED__) return;
  window.__BERNAUNG_RSVP_LOADED__ = true;

  var CFG = (window.BERNAUNG_DATA && window.BERNAUNG_DATA.rsvp) || {};
  var API = (CFG.appscript || '').trim();
  /* URL placeholder .../s/DISABLED/exec dianggap belum terpasang -> mode demo,
     bukan mode sheet yang memfetch URL mati. */
  var LIVE = /^https:\/\/script\.google\.com\/macros\/s\//.test(API) && API.indexOf('DISABLED') === -1;
  /* Link spreadsheet customer (data.js kolom "sheet") — sumber RSVP cadangan
     via endpoint gviz publik bila Apps Script belum terpasang / gagal. */
  var SHEET_URL = String(CFG.sheet || '').trim();
  /* Mode RSVP:
     - 'wa'    : INTERNAL — ucapan terkirim ke WhatsApp keluarga (tanpa spreadsheet)
     - 'sheet' : Google Spreadsheet via Apps Script / gviz langsung
     - 'demo'  : pratinjau tema (tidak mengirim ke mana pun) */
  var MODE = (CFG.mode === 'wa' && /^\d{8,16}$/.test(String(CFG.wa || ''))) ? 'wa'
           : ((LIVE || SHEET_URL) ? 'sheet' : 'demo');
  var WA = String(CFG.wa || '');
  /* Slug customer (dari data.js): pemisah tab RSVP pada spreadsheet pusat.
     Deployment lama per-customer mengabaikan parameter ini — aman. */
  var SLUG = String((window.BERNAUNG_DATA && window.BERNAUNG_DATA.slug) || '').trim();

  /* ---------------- CSS ----------------
     Warna widget memakai CSS variables yang DIISI sesuai warna tema
     di sekitar posisi widget (terang/gelap) — lihat applyWidgetTheme(). */
  var css = document.createElement('style');
  css.textContent = [
    '.bng-rsvp{max-width:560px;margin:36px auto;padding:26px 22px;border-radius:16px;',
    'background:var(--bng-w-bg,rgba(255,255,255,.08));border:1px solid var(--bng-w-border,rgba(255,255,255,.25));',
    'backdrop-filter:blur(6px);color:var(--bng-w-text,#fff);font-family:inherit;box-sizing:border-box;}',
    '.bng-rsvp *,.bng-rsvp *::before,.bng-rsvp *::after{box-sizing:border-box;}',
    '.bng-rsvp h3{margin:0 0 4px;font-size:22px;letter-spacing:1px;text-align:center;color:var(--bng-w-text,#fff);}',
    '.bng-rsvp .bng-sub{margin:0 0 18px;font-size:12.5px;text-align:center;color:var(--bng-w-muted,rgba(255,255,255,.85));}',
    '.bng-rsvp label{display:block;font-size:12px;letter-spacing:1px;opacity:.9;margin:12px 0 5px;}',
    '.bng-rsvp input[type=text],.bng-rsvp textarea{width:100%;padding:11px 13px;border-radius:10px;',
    'border:1px solid var(--bng-w-input-border,rgba(255,255,255,.35));background:var(--bng-w-input-bg,rgba(255,255,255,.1));color:var(--bng-w-input-text,#fff);',
    'font-family:inherit;font-size:14px;outline:none;}',
    '.bng-rsvp input::placeholder,.bng-rsvp textarea::placeholder{color:var(--bng-w-placeholder,rgba(255,255,255,.55));}',
    '.bng-rsvp textarea{min-height:84px;resize:vertical;}',
    '.bng-rsvp .bng-radio{display:flex;gap:10px;flex-wrap:wrap;}',
    '.bng-rsvp .bng-radio label{flex:1;min-width:140px;margin:0;cursor:pointer;}',
    '.bng-rsvp .bng-radio input{display:none;}',
    '.bng-rsvp .bng-radio span{display:block;text-align:center;padding:10px 8px;border-radius:10px;',
    'border:1px solid var(--bng-w-input-border,rgba(255,255,255,.35));background:var(--bng-w-input-bg,rgba(255,255,255,.08));font-size:13.5px;}',
    '.bng-rsvp .bng-radio input:checked+span{background:var(--bng-w-checked-bg,#fff);color:var(--bng-w-checked-text,#111);border-color:var(--bng-w-checked-bg,#fff);font-weight:600;}',
    '.bng-rsvp button.bng-send{width:100%;margin-top:18px;padding:13px;border:0;border-radius:10px;',
    'background:var(--bng-w-btn-bg,#fff);color:var(--bng-w-btn-text,#111);font-family:inherit;font-weight:700;font-size:14px;',
    'letter-spacing:1.5px;cursor:pointer;transition:transform .15s ease,opacity .15s;}',
    '.bng-rsvp button.bng-send:hover{transform:translateY(-1px);}',
    '.bng-rsvp button.bng-send:disabled{opacity:.55;cursor:wait;transform:none;}',
    '.bng-rsvp .bng-note{margin-top:10px;font-size:12px;text-align:center;color:var(--bng-w-muted,rgba(255,255,255,.85));min-height:15px;}',
    '.bng-rsvp .bng-list{margin-top:22px;max-height:340px;overflow-y:auto;scrollbar-width:thin;}',
    '.bng-rsvp .bng-card{border:1px solid var(--bng-w-card-border,rgba(255,255,255,.18));background:var(--bng-w-card-bg,rgba(255,255,255,.06));',
    'border-radius:12px;padding:12px 14px;margin-bottom:10px;}',
    '.bng-rsvp .bng-card .bng-head{display:flex;justify-content:space-between;gap:8px;align-items:center;}',
    '.bng-rsvp .bng-card .bng-nm{font-weight:700;font-size:14px;}',
    '.bng-rsvp .bng-card .bng-badge{font-size:10px;padding:2px 8px;border-radius:999px;',
    'border:1px solid var(--bng-w-badge-border,rgba(255,255,255,.4));opacity:.9;white-space:nowrap;}',
    '.bng-rsvp .bng-card .bng-msg{font-size:13px;opacity:.92;margin-top:6px;line-height:1.5;word-wrap:break-word;}',
    '.bng-rsvp .bng-empty{text-align:center;font-size:13px;opacity:.75;padding:14px 0;}'
  ].join('');
  document.head.appendChild(css);

  var SUB = MODE === 'wa'
    ? 'Ucapan & konfirmasi kehadiran terkirim langsung ke keluarga via WhatsApp'
    : 'Berikan doa dan ucapan terbaik untuk kami';

  /* ---------------- Builder ---------------- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function buildForm() {
    var root = el('div', 'bng-rsvp');
    root.innerHTML =
      '<h3>Ucapan &amp; RSVP</h3>' +
      '<p class="bng-sub">' + SUB + '</p>' +
      '<label for="bng-nama">Nama</label>' +
      '<input type="text" id="bng-nama" maxlength="60" placeholder="Nama Anda">' +
      '<label>Konfirmasi Kehadiran</label>' +
      '<div class="bng-radio">' +
      '  <label><input type="radio" name="bng-hadir" value="Hadir" checked><span>Hadir</span></label>' +
      '  <label><input type="radio" name="bng-hadir" value="Tidak Hadir"><span>Tidak Hadir</span></label>' +
      '</div>' +
      '<label for="bng-ucapan">Ucapan &amp; Doa</label>' +
      '<textarea id="bng-ucapan" maxlength="500" placeholder="Tulis ucapan dan doa restu..."></textarea>' +
      '<button class="bng-send" type="button">KIRIM UCAPAN</button>' +
      '<div class="bng-note"></div>' +
      '<div class="bng-list"><div class="bng-empty">Memuat daftar ucapan...</div></div>';

    var btn = root.querySelector('.bng-send');
    var note = root.querySelector('.bng-note');
    var list = root.querySelector('.bng-list');

    function esc(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function card(it) {
      var badge = it.kehadiran === 'Hadir' ? 'Hadir' : 'Tidak Hadir';
      return el('div', 'bng-card',
        '<div class="bng-head"><span class="bng-nm">' + esc(it.nama) + '</span>' +
        '<span class="bng-badge">' + esc(badge) + '</span></div>' +
        '<div class="bng-msg">' + esc(it.ucapan).replace(/\n/g, '<br>') + '</div>');
    }

    /* ------- Sumber cadangan: baca langsung spreadsheet (gviz publik) -------
       Urutan tab yang dicoba: tab bernama slug customer -> tab "RSVP" -> gid. */
    function renderItems(rows) {
      list.innerHTML = '';
      rows.slice(0, 50).forEach(function (it) { list.appendChild(card(it)); });
    }
    function emptyList() {
      list.innerHTML = '<div class="bng-empty">Belum ada ucapan. Jadilah yang pertama!</div>';
    }
    function gvizToItems(j) {
      var cols = (j.table.cols || []).map(function (c) {
        return String(c.label || c.id || '').toLowerCase();
      });
      function findIdx(names) {
        for (var i = 0; i < cols.length; i++) { if (names.indexOf(cols[i]) !== -1) return i; }
        return -1;
      }
      var idx = {
        waktu: findIdx(['waktu', 'timestamp']),
        nama: findIdx(['nama', 'author']),
        kehadiran: findIdx(['kehadiran', 'attendance']),
        ucapan: findIdx(['ucapan', 'pesan', 'comment'])
      };
      return (j.table.rows || []).map(function (r) {
        var c = r.c || [];
        function g(i) {
          if (i < 0 || !c[i]) return '';
          if (c[i].f != null) return String(c[i].f);
          return c[i].v != null ? String(c[i].v) : '';
        }
        return { waktu: g(idx.waktu), nama: g(idx.nama), kehadiran: g(idx.kehadiran), ucapan: g(idx.ucapan) };
      }).filter(function (it) { return it.nama; }).reverse();
    }
    function loadFromSheet() {
      var m = SHEET_URL.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (!m) { emptyList(); return; }
      var gidMatch = SHEET_URL.match(/[#&?]gid=([0-9]+)/);
      var tries = [];
      if (SLUG) tries.push('sheet=' + encodeURIComponent(SLUG));
      tries.push('sheet=' + encodeURIComponent('RSVP'));
      if (gidMatch) tries.push('gid=' + gidMatch[1]);
      var i = 0;
      (function next() {
        if (i >= tries.length) { emptyList(); return; }
        fetch('https://docs.google.com/spreadsheets/d/' + m[1] +
              '/gviz/tq?tqx=out:json&headers=1&' + tries[i++])
          .then(function (r) { return r.text(); })
          .then(function (txt) {
            var mm = txt.match(/setResponse\(([\s\S]*)\);?\s*$/);
            if (!mm) throw new Error('format gviz tidak dikenali');
            var j = JSON.parse(mm[1]);
            if (j.status === 'error') throw new Error('tab tidak ditemukan');
            var rows = gvizToItems(j);
            if (!rows.length) throw new Error('tab kosong');
            renderItems(rows);
          })
          .catch(next);
      })();
    }

    function loadList() {
      if (MODE === 'wa') {
        list.innerHTML = '<div class="bng-empty">Ucapan Anda akan terkirim langsung<br>ke keluarga melalui WhatsApp.<br>Silakan isi form di atas ya.</div>';
        return;
      }
      if (MODE !== 'sheet') {
        list.innerHTML = '<div class="bng-empty">Contoh ucapan — RSVP demo aktif pada pratinjau tema.<br>' +
          'Undangan customer terhubung ke WhatsApp keluarga / Spreadsheet.</div>';
        var demo = card({ nama: 'Keluarga Besar', kehadiran: 'Hadir', ucapan: 'Selamat menempuh hidup baru! Semoga samawa.' });
        list.innerHTML = ''; list.appendChild(demo);
        return;
      }
      if (!LIVE) {
        /* Apps Script belum terpasang (kosong/DISABLED): tampilkan RSVP
           langsung dari link spreadsheet di data.js */
        loadFromSheet();
        return;
      }
      fetch(API + '?action=list' + (SLUG ? '&slug=' + encodeURIComponent(SLUG) : '')).then(function (r) { return r.text(); }).then(function (txt) {
        var j = null;
        try { j = JSON.parse(txt); } catch (e) { /* script lama balas teks biasa */ }
        if (!j || j.status !== 'success' || !j.data || !j.data.length) {
          if (SHEET_URL) { loadFromSheet(); return; }
          emptyList();
          return;
        }
        renderItems(j.data);
      }).catch(function () {
        if (SHEET_URL) { loadFromSheet(); return; }
        list.innerHTML = '<div class="bng-empty">Daftar ucapan belum tersedia.</div>';
      });
    }

    btn.addEventListener('click', function () {
      var nama = root.querySelector('#bng-nama').value.trim();
      var ucapan = root.querySelector('#bng-ucapan').value.trim();
      var hadir = root.querySelector('input[name=bng-hadir]:checked').value;
      if (!nama || !ucapan) {
        note.textContent = 'Nama dan ucapan wajib diisi ya.';
        return;
      }
      if (MODE === 'wa') {
        var teks = 'RSVP UNDANGAN' +
          '\n\nNama: ' + nama +
          '\nKehadiran: ' + hadir +
          '\n\nUcapan:' + '\n' + ucapan;
        window.open('https://api.whatsapp.com/send/?phone=' + WA + '&text=' + encodeURIComponent(teks), '_blank');
        note.textContent = 'Terima kasih! Lanjutkan kirim pesan WhatsApp yang terbuka ya.';
        root.querySelector('#bng-nama').value = '';
        root.querySelector('#bng-ucapan').value = '';
        return;
      }
      if (MODE !== 'sheet') {
        note.textContent = 'Terima kasih! (Mode demo — undangan resmi customer terhubung ke WhatsApp keluarga / Spreadsheet.)';
        root.querySelector('#bng-nama').value = '';
        root.querySelector('#bng-ucapan').value = '';
        return;
      }
      if (!LIVE) {
        /* Tanpa Apps Script ucapan tidak bisa disimpan — jangan beri pesan
           sukses palsu (dulu fetch ke '' dianggap sukses padahal tidak tersimpan). */
        note.textContent = 'Pengiriman RSVP belum aktif: URL Apps Script belum terpasang di panel admin.';
        return;
      }
      btn.disabled = true;
      note.textContent = 'Mengirim...';
      /* Kirim sebagai parameter form (bukan JSON) supaya kompatibel dengan
         SEMUA versi Apps Script: yang baru membaca parameter, yang lama
         (format vendor: author/attendance/comment) juga mendapat nilai. */
      var params = new URLSearchParams();
      params.append('nama', nama);
      params.append('kehadiran', hadir);
      params.append('ucapan', ucapan);
      params.append('author', nama);
      params.append('attendance', hadir);
      params.append('comment', ucapan);
      if (SLUG) params.append('slug', SLUG);
      fetch(API, {
        method: 'POST',
        body: params
      }).then(function (r) { return r.text(); }).then(function (txt) {
        var j = null;
        try { j = JSON.parse(txt); } catch (e) {
          /* Response bukan JSON (kemungkinan HTML login page dari /dev endpoint).
             Coba fallback ke spreadsheet untuk menampilkan ucapan. */
          if (SHEET_URL) { loadFromSheet(); return; }
        }
        btn.disabled = false;
        if (!j || j.status !== 'error') {
          note.textContent = 'Terima kasih! Ucapan Anda sudah terkirim.';
          root.querySelector('#bng-nama').value = '';
          root.querySelector('#bng-ucapan').value = '';
          loadList();
        } else {
          note.textContent = (j && j.message) || 'Gagal mengirim, coba lagi.';
        }
      }).catch(function () {
        btn.disabled = false;
        note.textContent = 'Gagal mengirim, periksa koneksi lalu coba lagi.';
      });
    });

    loadList();
    return root;
  }

  /* ---------------- Penempatan ---------------- */
  /* ---------------- WARNA MENGIKUTI TEMA ----------------
     Ukur warna latar efektif di sekitar posisi (section di atas footer /
     widget terdekat / body), lalu pilih varian terang / gelap supaya
     kolom input, daftar ucapan, dan footer menyatu dengan tema
     (beberapa tema berlatar hitam, beberapa terang/krem). */
  function parseRgb(bg) {
    var m = String(bg || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    var a = m[4] == null ? 1 : parseFloat(m[4]);
    if (a === 0) return null; /* transparan penuh — lanjut ke leluhur */
    return { r: +m[1], g: +m[2], b: +m[3], a: a };
  }
  function luminanceOf(bg) {
    var c = parseRgb(bg);
    if (!c) return 255;
    /* alpha < 1: campur dengan putih (kasus umum overlay tema terang) */
    var mix = function (v) { return Math.round(v * c.a + 255 * (1 - c.a)); };
    return 0.299 * mix(c.r) + 0.587 * mix(c.g) + 0.114 * mix(c.b);
  }
  function effectiveBg(el) {
    var n = el, guard = 0;
    while (n && n !== document.documentElement && guard++ < 12) {
      if (!/^(SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(n.tagName)) {
        var bg = '';
        try { bg = getComputedStyle(n).backgroundColor || ''; } catch (e) {}
        if (parseRgb(bg)) return bg;
      }
      n = n.parentElement;
    }
    return '';
  }
  function findFooterBg(footer) {
    var el = footer.previousElementSibling, guard = 0;
    while (el && guard++ < 10) {
      if (!/^(SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(el.tagName)) {
        var bg = effectiveBg(el);
        if (bg) return bg;
      }
      el = el.previousElementSibling;
    }
    return effectiveBg(document.body) || 'rgb(255,255,255)';
  }
  function adaptFooter() {
    /* Footer Bernaung (footer.py-10) mengikuti warna bagian tema di atasnya:
       hitam hanya pada tema gelap; tema terang dapat footer terang. */
    try {
      var footers = document.querySelectorAll('footer.py-10');
      Array.prototype.forEach.call(footers, function (f) {
        if (f.getAttribute('data-bng-adapted')) return;
        f.setAttribute('data-bng-adapted', '1');
        var bg = findFooterBg(f);
        if (bg) f.style.backgroundColor = bg;
        f.classList.toggle('bng-footer-light', luminanceOf(bg) > 140);
      });
    } catch (e) {}
  }
  function applyWidgetTheme(root, bg) {
    var light = luminanceOf(bg) > 140;
    var v;
    if (light) {
      v = {
        '--bng-w-bg': 'rgba(255,255,255,.6)',
        '--bng-w-border': 'rgba(61,55,48,.30)',
        '--bng-w-text': '#3d3730',
        '--bng-w-muted': 'rgba(61,55,48,.72)',
        '--bng-w-input-bg': 'rgba(255,255,255,.78)',
        '--bng-w-input-border': 'rgba(61,55,48,.32)',
        '--bng-w-input-text': '#3d3730',
        '--bng-w-placeholder': 'rgba(61,55,48,.45)',
        '--bng-w-checked-bg': '#3d3730',
        '--bng-w-checked-text': '#fff',
        '--bng-w-btn-bg': '#3d3730',
        '--bng-w-btn-text': '#fff',
        '--bng-w-card-bg': 'rgba(255,255,255,.62)',
        '--bng-w-card-border': 'rgba(61,55,48,.22)',
        '--bng-w-badge-border': 'rgba(61,55,48,.45)'
      };
    } else {
      v = {
        '--bng-w-bg': 'rgba(255,255,255,.08)',
        '--bng-w-border': 'rgba(255,255,255,.25)',
        '--bng-w-text': '#fff',
        '--bng-w-muted': 'rgba(255,255,255,.85)',
        '--bng-w-input-bg': 'rgba(255,255,255,.1)',
        '--bng-w-input-border': 'rgba(255,255,255,.35)',
        '--bng-w-input-text': '#fff',
        '--bng-w-placeholder': 'rgba(255,255,255,.55)',
        '--bng-w-checked-bg': '#fff',
        '--bng-w-checked-text': '#111',
        '--bng-w-btn-bg': '#fff',
        '--bng-w-btn-text': '#111',
        '--bng-w-card-bg': 'rgba(255,255,255,.06)',
        '--bng-w-card-border': 'rgba(255,255,255,.18)',
        '--bng-w-badge-border': 'rgba(255,255,255,.4)'
      };
    }
    for (var k in v) root.style.setProperty(k, v[k]);
    root.setAttribute('data-bng-scheme', light ? 'light' : 'dark');
  }
  function contextBgFor(root) {
    /* latar di sekitar posisi widget: section/slot terdekat di atas & bawah */
    var cands = [root.parentElement, root.previousElementSibling, root.nextElementSibling];
    for (var i = 0; i < cands.length; i++) {
      var el2 = cands[i];
      if (!el2 || el2 === root || el2 === document.body) continue;
      if (/^(SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(el2.tagName)) continue;
      var bg = effectiveBg(el2);
      if (bg) return bg;
    }
    return effectiveBg(document.body) || 'rgb(255,255,255)';
  }

  function place() {
    /* Footer selalu diadaptasi dulu (jadi acuan warna konteks widget) */
    adaptFooter();

    /* Mode tanpa RSVP (data.js rsvp.hide=true): sembunyikan widget RSVP vendor
       dan jangan tampilkan form apa pun — bagian RSVP hilang dari undangan. */
    if (CFG.hide) {
      try {
        document.querySelectorAll('.wds_rsvp, [data-widget_type*="wds_rsvp"], [data-widget_type*="niku-rsvp"], .rsvp-comments-wrap, [data-widget_type*="ev-rsvp"], .ev-rsvp-wrapper, #ev-rsvp-form, .ev-rsvp-sticker-modal-overlay')
          .forEach(function (el) { el.style.display = 'none'; });
      } catch (e) {}
      return;
    }

    var root = buildForm();

    /* 1) slot eksplisit */
    var slot = document.querySelector('[data-bernaung-rsvp]');
    if (slot) { slot.innerHTML = ''; slot.appendChild(root); applyWidgetTheme(root, contextBgFor(root)); return; }

    /* 2) widget vendor Elementor/Bisdev yang rusak (wds_rsvp, ev-rsvp, rsvp-comments-wrap)
       Termasuk form eveent (ev-rsvp) dari tema WordPress yang di-migrasi.
       Form vendor diganti dengan form bernaung yang terhubung ke spreadsheet pusat. */
    var vendor = document.querySelector('.wds_rsvp, [data-widget_type*="wds_rsvp"], .rsvp-comments-wrap, [data-widget_type*="ev-rsvp"], .ev-rsvp-wrapper, #ev-rsvp-form');
    if (vendor) {
      /* widget Elementor: bersihkan isi widget, sisakan wrapper */
      vendor.innerHTML = '';
      vendor.style.cssText += ';padding:10px 0;';
      vendor.appendChild(root);
      /* Tema biasanya sudah punya judul & subjudul bagian RSVP di atas widget
         (mis. "Ucapan & RSVP" / "Wishes" + "Berikan doa dan ucapan...").
         Bila ada, buang judul bawaan form supaya tidak tampil dua kali. */
      try {
        var host = vendor.closest('section.elementor-section, section, .elementor-widget-wrap') || vendor.parentElement;
        if (host) {
          var hasHeading = Array.prototype.some.call(host.querySelectorAll('h1,h2,h3'), function (h) {
            return !vendor.contains(h) && /ucapan|rsvp|wishes|doa/i.test(h.textContent || '');
          });
          if (hasHeading) {
            var bh = root.querySelector('h3');
            if (bh) bh.parentElement.removeChild(bh);
            var bsub = root.querySelector('.bng-sub');
            if (bsub && Array.prototype.some.call(host.querySelectorAll('p'), function (p) {
              return !vendor.contains(p) && /doa dan ucapan/i.test(p.textContent || '');
            })) bsub.parentElement.removeChild(bsub);
          }
        }
      } catch (e) {}
      applyWidgetTheme(root, contextBgFor(root));
      return;
    }

    /* 3) sisipkan section baru sebelum footer Bernaung / </body> */
    var footer = document.querySelector('footer.py-10');
    var wrap = el('div');
    wrap.setAttribute('data-bernaung-rsvp-auto', '1');
    wrap.appendChild(root);
    if (footer) footer.parentNode.insertBefore(wrap, footer);
    else document.body.appendChild(wrap);
    applyWidgetTheme(root, contextBgFor(root));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', place);
  } else {
    place();
  }
})();
