/* ============================================================
   BERNAUNG INVITATION — gift.js (aset global)
   ------------------------------------------------------------
   Menampilkan logo rekening & nama bank customer di bagian
   Wedding Gift / Amplop Digital SEMUA tema — tanpa aturan
   per-tema. Cara kerja:
     1. Baca window.BERNAUNG_DATA.gift (data.js customer).
     2. Cari teks nomor rekening di halaman (pencocokan digit,
        tahan format spasi/titik).
     3. Sisipkan <img> logo bank tepat di atas baris nomor.
     4. Ganti teks nama bank demo di sekitar nomor dengan nama
        bank customer (jika diisi di panel).
   Logo: /assets.bernaung.id/bank/<bank>.svg atau URL khusus.
   Bila file logo tidak ada, gambar otomatis dihapus (onerror).
   ============================================================ */
(function () {
  if (window.__BERNAUNG_GIFT_LOADED__) return;
  window.__BERNAUNG_GIFT_LOADED__ = true;

  var D = window.BERNAUNG_DATA || {};
  var gifts = (D.gift || []).filter(function (g) {
    return g && g.nomor && (g.logo || g.bank);
  });
  /* TANPA early-return: bila tidak ada logo untuk diinjeksi pun,
     self-heal (sembunyikan kartu kosong) tetap harus berjalan. */

  /* label nama bank dari nama file logo (rekening 2/3 tak punya kolom bank) */
  var BANK_LABELS = { bca: 'BCA', bri: 'BRI', mandiri: 'MANDIRI', bni: 'BNI', bsi: 'BSI',
    seabank: 'SeaBank', jenius: 'Jenius', jago: 'Bank Jago', gopay: 'GoPay', ovo: 'OVO',
    dana: 'DANA', shopeepay: 'ShopeePay', linkaja: 'LinkAja', qris: 'QRIS', cimb: 'CIMB Niaga',
    danamon: 'Danamon', permata: 'Permata', maybank: 'Maybank', uob: 'UOB', panin: 'Panin',
    bjb: 'Bank BJB', sinarmas: 'Bank Sinarmas' };
  function bankNameOf(g) {
    if (g.bank) return g.bank;
    var m = String(g.logo || '').match(/\/bank\/([a-z0-9-]+)\.svg/i);
    return m ? (BANK_LABELS[m[1]] || '') : '';
  }

  /* nama bank demo yang dikenali (untuk penggantian teks) */
  var BANK_RE = /^(bank\s+)?(bca|bri|bsi|bni|mandiri|seabank|sea ?bank|permata|cimb(\s*niaga)?|danamon|jago|bank jago|jenius|gopay|go pay|ovo|dana|shopee ?pay|linkaja|link aja|qris|maybank|uob|panin|mega|bjb|sinarmas|artos|halo|neo|nobu|sampoerna|bsnb|bpn|btn|mualamat|ina|hijra|sahabat ?sampoerna|krom|neo commerce)$/i;

  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isSkipped(el) {
    return /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|PRE|CODE|TEXTAREA)$/i.test(el.tagName);
  }

  function findNumberEl(target) {
    /* elemen TERKECIL yang teksnya memuat nomor rekening (digit saja) */
    var best = null, bestLen = 1e9;
    var all = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div,li,td,th,b,strong,a,small');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (isSkipped(el)) continue;
      if (el.children.length > 3) continue;
      var t = (el.textContent || '').trim();
      if (!t || t.length > 140) continue;
      if (digits(t).indexOf(target) !== -1 && t.length < bestLen) {
        best = el; bestLen = t.length;
        if (t.replace(/\D/g, '').length === target.length && t.length <= target.length + 8) break;
      }
    }
    return best;
  }

  function mountBlock(el) {
    /* naik maksimal 2 tingkat ke blok kecil yang membungkus nomor */
    var mount = el, up = 0;
    while (up++ < 2 && mount.parentElement && mount.parentElement !== document.body) {
      var p = mount.parentElement;
      if ((p.textContent || '').trim().length > 140) break;
      mount = p;
    }
    return mount;
  }

  function replaceBankName(container, bankName, used) {
    /* cari elemen teks pendek di sekitar nomor yang isinya nama bank demo */
    var all = container.querySelectorAll('p,span,h1,h2,h3,h4,h5,h6,b,strong,div,li,small');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (isSkipped(el)) continue;
      if (el.children.length > 2) continue;
      var t = (el.textContent || '').trim();
      if (!t || t.length > 30) continue;
      if (used.indexOf(el) !== -1) continue;
      if (BANK_RE.test(t)) {
        el.textContent = bankName;
        used.push(el);
        return true;
      }
    }
    return false;
  }

  function inject(g) {
    var target = digits(g.nomor);
    if (target.length < 5) return;
    var el = findNumberEl(target);
    if (!el) return;
    var used = [];

    /* logo di atas blok nomor — TIDAK diduplikasi bila tema sudah menampilkan
       logo yang sama di tempatnya (hasil penggantian gambar demo via panel) */
    if (g.logo) {
      var base = String(g.logo).split('/').pop();
      var scope = el;
      var sUp = 0;
      while (sUp++ < 4 && scope.parentElement && scope.parentElement !== document.body) scope = scope.parentElement;
      var twin = scope.querySelector('img[src$="' + base + '"]');
      if (!twin) {
        var mount = mountBlock(el);
        if (mount.parentElement && !mount.parentElement.querySelector('.bng-banklogo')) {
          var wrap = document.createElement('div');
          wrap.className = 'bng-banklogo';
          wrap.style.cssText = 'text-align:center;margin:10px 0 4px;line-height:0;';
          var img = document.createElement('img');
          img.src = g.logo;
          img.alt = 'Logo ' + (g.bank || 'bank');
          img.style.cssText = 'max-height:38px;max-width:160px;width:auto;display:inline-block;' +
            'border-radius:10px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.22));';
          img.onerror = function () { if (wrap.parentElement) wrap.parentElement.removeChild(wrap); };
          wrap.appendChild(img);
          mount.parentElement.insertBefore(wrap, mount);
          used.push(wrap);
        }
      }
    }

    /* nama bank customer menggantikan nama bank demo */
    var bankName = bankNameOf(g);
    if (bankName) {
      var container = el;
      var up = 0;
      while (up++ < 4 && container.parentElement && container.parentElement !== document.body) {
        container = container.parentElement;
        if ((container.textContent || '').trim().length > 400) break;
      }
      replaceBankName(container, bankName, used);
    }
  }

  /* ================= SELF-HEAL PER SECTION =================
     Menyembunyikan kartu rekening / kado yang datanya KOSONG di panel,
     di SEMUA tema, tanpa perlu generate ulang:
       1. Nomor rekening di halaman yang tidak ada di BERNAUNG_DATA.gift
          dianggap sisa data demo -> kartunya disembunyikan.
       2. Kado kosong semua (nama/hp/alamat) -> blok kado disembunyikan.
       3. Semua rekening DAN kado kosong -> seluruh area gift disembunyikan.
     Tanpa BERNAUNG_DATA.gift (array) script tidak menyentuh halaman. */
  function clsOf(e) { return ' ' + ((e && e.className) || '') + ' '; }
  /* teks ternormalisasi (spasi/newline ganda dirapatkan) — ukuran blok
     dihitung dari teks NYATA, bukan whitespace HTML Elementor */
  function normText(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function hideBlock(el) {
    var s = el, guard = 0;
    while (s && s !== document.body && guard++ < 12) {
      if (s.tagName === 'SECTION' || /elementor-section|e-parent|satumomen_slide|container-mobile/.test(clsOf(s))) break;
      s = s.parentElement;
    }
    if (!s || s === document.body) { el.style.display = 'none'; return; }
    var up = 0;
    while (up++ < 8) {
      var p = s.parentElement, found = null;
      while (p && p !== document.body) {
        if (p.tagName === 'SECTION' || /elementor-section|e-parent|satumomen_slide|container-mobile/.test(clsOf(p))) { found = p; break; }
        p = p.parentElement;
      }
      if (!found) break;
      var inner = found.querySelectorAll('.elementor-section, section');
      if (inner.length === 1 && normText(found.textContent).length < 500) s = found; else break;
    }
    s.style.display = 'none';
  }

  function blockOf(el) {
    /* blok kecil yang membungkus elemen (untuk uji konteks kartu) */
    var s = el, up = 0;
    while (up++ < 5 && s.parentElement && s.parentElement !== document.body) {
      if (normText(s.parentElement.textContent).length > 220) break;
      s = s.parentElement;
    }
    return s;
  }

  function healRekening() {
    if (!Array.isArray(D.gift)) return; /* tak ada data gift -> jangan sentuh halaman */
    var valid = [];
    D.gift.forEach(function (g) {
      var d = digits(g && g.nomor);
      if (d.length >= 5) valid.push(d);
    });
    var all = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div,li,td,th,b,strong,a,small,button');
    var hidden = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (isSkipped(el)) continue;
      if (el.children.length > 3) continue;
      var t = (el.textContent || '').trim();
      if (!t || t.length > 140) continue;
      var runs = String(t).match(/\d[\d .\-\u2013\u2014]{7,}\d/g) || [];
      for (var j = 0; j < runs.length; j++) {
        /* buang run berpola tanggal: ada grup 1-2 digit di antara pemisah
           (mis. "04 . 12 . 2026" -> 04122026) */
        var parts = runs[j].trim().split(/[\s.\-\u2013\u2014]+/);
        var dateLike = parts.length > 1 && parts.some(function (p) {
          return p.length > 0 && p.length < 3;
        });
        if (dateLike) continue;
        var d = digits(runs[j]);
        if (d.length < 8) continue;
        if (valid.indexOf(d) !== -1) break;            /* nomor sah -> biarkan */
        var blk = blockOf(el);
        var bt = normText(blk.textContent);
        if (bt.length > 700) break;                    /* terlalu besar, bukan kartu */
        if (!/rekening|atas\s*nama/i.test(bt)) break;  /* bukan kartu rekening */
        if (/penerima/i.test(bt)) break;               /* kartu kado, jangan sentuh */
        if (hidden.indexOf(blk) === -1) { hidden.push(blk); hideBlock(blk); }
        break;
      }
    }
    return valid.length;
  }

  function kadoEmpty() {
    var kd = D.kado;
    if (!kd || typeof kd !== 'object') return null;
    return !String(kd.nama || '').trim() && !String(kd.hp || '').trim() &&
           !String(kd.alamat || '').trim();
  }

  function healKado() {
    if (kadoEmpty() !== true) return;
    var all = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div');
    for (var i = 0; i < all.length; i++) {
      if (isSkipped(all[i])) continue;
      var t = (all[i].textContent || '').trim().toLowerCase();
      if (t === 'kado' || t === 'kado digital' || t === 'kirim hadiah' ||
          t === 'pengiriman hadiah' || t === 'alamat penerima') {
        hideBlock(all[i]);
        return;
      }
    }
  }

  function healAll() {
    var nValid = -1;
    try { nValid = healRekening(); } catch (e) {}
    try { healKado(); } catch (e) {}
    /* semua kosong: sembunyikan seluruh area gift (judul, tombol, kartu) */
    if (Array.isArray(D.gift) && nValid === 0 && kadoEmpty() === true) {
      var all = document.querySelectorAll('h1,h2,h3,h4,h5,h6,p');
      for (var i = 0; i < all.length; i++) {
        if (isSkipped(all[i])) continue;
        var t = (all[i].textContent || '').trim().toLowerCase();
        if (t === 'wedding gift' || t === 'amplop digital' || t === 'kado digital') {
          hideBlock(all[i]);
          break;
        }
      }
    }
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    /* tunggu sejenak: beberapa tema merender bagian gift lewat JS */
    setTimeout(function () { gifts.forEach(inject); healAll(); }, 600);
    setTimeout(function () { gifts.forEach(inject); healAll(); }, 1800);
    setTimeout(function () { gifts.forEach(inject); healAll(); }, 3200);
  });
})();
