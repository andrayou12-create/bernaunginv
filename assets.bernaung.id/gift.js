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
  if (!gifts.length) return;

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

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    /* tunggu sejenak: beberapa tema merender bagian gift lewat JS */
    setTimeout(function () { gifts.forEach(inject); }, 600);
    setTimeout(function () { gifts.forEach(inject); }, 1800);
  });
})();
