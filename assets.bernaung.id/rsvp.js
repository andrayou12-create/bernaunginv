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
  var LIVE = /^https:\/\/script\.google\.com\/macros\/s\//.test(API);
  /* Mode RSVP:
     - 'wa'    : INTERNAL — ucapan terkirim ke WhatsApp keluarga (tanpa spreadsheet)
     - 'sheet' : Google Spreadsheet via Apps Script
     - 'demo'  : pratinjau tema (tidak mengirim ke mana pun) */
  var MODE = (CFG.mode === 'wa' && /^\d{8,16}$/.test(String(CFG.wa || ''))) ? 'wa'
           : (LIVE ? 'sheet' : 'demo');
  var WA = String(CFG.wa || '');

  /* ---------------- CSS ---------------- */
  var css = document.createElement('style');
  css.textContent = [
    '.bng-rsvp{max-width:560px;margin:36px auto;padding:26px 22px;border-radius:16px;',
    'background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25);',
    'backdrop-filter:blur(6px);color:#fff;font-family:inherit;box-sizing:border-box;}',
    '.bng-rsvp *,.bng-rsvp *::before,.bng-rsvp *::after{box-sizing:border-box;}',
    '.bng-rsvp h3{margin:0 0 4px;font-size:22px;letter-spacing:1px;text-align:center;color:#fff;}',
    '.bng-rsvp .bng-sub{margin:0 0 18px;font-size:12.5px;text-align:center;opacity:.85;}',
    '.bng-rsvp label{display:block;font-size:12px;letter-spacing:1px;opacity:.9;margin:12px 0 5px;}',
    '.bng-rsvp input[type=text],.bng-rsvp textarea{width:100%;padding:11px 13px;border-radius:10px;',
    'border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);color:#fff;',
    'font-family:inherit;font-size:14px;outline:none;}',
    '.bng-rsvp input::placeholder,.bng-rsvp textarea::placeholder{color:rgba(255,255,255,.55);}',
    '.bng-rsvp textarea{min-height:84px;resize:vertical;}',
    '.bng-rsvp .bng-radio{display:flex;gap:10px;flex-wrap:wrap;}',
    '.bng-rsvp .bng-radio label{flex:1;min-width:140px;margin:0;cursor:pointer;}',
    '.bng-rsvp .bng-radio input{display:none;}',
    '.bng-rsvp .bng-radio span{display:block;text-align:center;padding:10px 8px;border-radius:10px;',
    'border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);font-size:13.5px;}',
    '.bng-rsvp .bng-radio input:checked+span{background:#fff;color:#111;border-color:#fff;font-weight:600;}',
    '.bng-rsvp button.bng-send{width:100%;margin-top:18px;padding:13px;border:0;border-radius:10px;',
    'background:#fff;color:#111;font-family:inherit;font-weight:700;font-size:14px;',
    'letter-spacing:1.5px;cursor:pointer;transition:transform .15s ease,opacity .15s;}',
    '.bng-rsvp button.bng-send:hover{transform:translateY(-1px);}',
    '.bng-rsvp button.bng-send:disabled{opacity:.55;cursor:wait;transform:none;}',
    '.bng-rsvp .bng-note{margin-top:10px;font-size:12px;text-align:center;opacity:.85;min-height:15px;}',
    '.bng-rsvp .bng-list{margin-top:22px;max-height:340px;overflow-y:auto;scrollbar-width:thin;}',
    '.bng-rsvp .bng-card{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);',
    'border-radius:12px;padding:12px 14px;margin-bottom:10px;}',
    '.bng-rsvp .bng-card .bng-head{display:flex;justify-content:space-between;gap:8px;align-items:center;}',
    '.bng-rsvp .bng-card .bng-nm{font-weight:700;font-size:14px;}',
    '.bng-rsvp .bng-card .bng-badge{font-size:10px;padding:2px 8px;border-radius:999px;',
    'border:1px solid rgba(255,255,255,.4);opacity:.9;white-space:nowrap;}',
    '.bng-rsvp .bng-card .bng-msg{font-size:13px;opacity:.92;margin-top:6px;line-height:1.5;word-wrap:break-word;}',
    '.bng-rsvp .bng-empty{text-align:center;font-size:13px;opacity:.75;padding:14px 0;}',
    '[data-theme=light] .bng-rsvp,.bng-rsvp.bng-light{background:rgba(0,0,0,.55);}'
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
      fetch(API + '?action=list').then(function (r) { return r.json(); }).then(function (j) {
        if (!j || j.status !== 'success' || !j.data || !j.data.length) {
          list.innerHTML = '<div class="bng-empty">Belum ada ucapan. Jadilah yang pertama!</div>';
          return;
        }
        list.innerHTML = '';
        j.data.slice(0, 50).forEach(function (it) { list.appendChild(card(it)); });
      }).catch(function () {
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
      btn.disabled = true;
      note.textContent = 'Mengirim...';
      fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ nama: nama, kehadiran: hadir, ucapan: ucapan })
      }).then(function (r) { return r.json(); }).then(function (j) {
        btn.disabled = false;
        if (j && j.status === 'success') {
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
  function isLightBg() {
    try {
      var bg = getComputedStyle(document.body).backgroundColor || '';
      var m = bg.match(/(\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return false;
      var lum = 0.299 * (+m[1]) + 0.587 * (+m[2]) + 0.114 * (+m[3]);
      return lum > 140;
    } catch (e) { return false; }
  }

  function place() {
    var root = buildForm();
    if (isLightBg()) root.classList.add('bng-light');

    /* 1) slot eksplisit */
    var slot = document.querySelector('[data-bernaung-rsvp]');
    if (slot) { slot.innerHTML = ''; slot.appendChild(root); return; }

    /* 2) widget vendor Elementor/Bisdev yang rusak (wds_rsvp, rsvp-comments-wrap) */
    var vendor = document.querySelector('.wds_rsvp, [data-widget_type*="wds_rsvp"], .rsvp-comments-wrap');
    if (vendor) {
      /* widget Elementor: bersihkan isi widget, sisakan wrapper */
      vendor.innerHTML = '';
      vendor.style.cssText += ';padding:10px 0;';
      vendor.appendChild(root);
      return;
    }

    /* 3) sisipkan section baru sebelum footer Bernaung / </body> */
    var footer = document.querySelector('footer.py-10');
    var wrap = el('div');
    wrap.setAttribute('data-bernaung-rsvp-auto', '1');
    wrap.appendChild(root);
    if (footer) footer.parentNode.insertBefore(wrap, footer);
    else document.body.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', place);
  } else {
    place();
  }
})();
