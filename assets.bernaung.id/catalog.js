/* ============================================================
   BERNAUNG INVITATION — catalog.js (aset global)
   ------------------------------------------------------------
   Modul katalog undangan yang dipakai bersama:
     - katalog.html (halaman katalog penuh)
     - index.html   (katalog yang muncul di halaman yang sama
                     setelah pengunjung menekan "Lihat Katalog")

   Fitur penting: PRATINJAU TANPA MUSIK.
   Kartu katalog menampilkan pratinjau undangan via <iframe>.
   Semua audio/video di dalam iframe pratinjau dibisukan
   (atribut allow + sweep JS), sehingga membuka katalog tidak
   membuat musik dari banyak undangan berbunyi serempak.
   Pengunjung tetap bisa mendengar musik lewat tombol
   "LIHAT UNDANGAN" yang membuka undangan asli di tab baru.
   ============================================================ */
(function () {
  'use strict';

  var DATA = null;
  var mounted = {};

  function rp(n) {
    try { return 'Rp ' + Number(n).toLocaleString('id-ID'); }
    catch (e) { return 'Rp ' + n; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- bisukan media di dalam iframe pratinjau ---------- */
  function silenceMedia(win, doc) {
    if (win && !win.__bngSilent) {
      win.__bngSilent = true;
      try {
        /* play() di dalam pratinjau -> selalu dibatalkan (audio tetap diam) */
        win.HTMLMediaElement.prototype.play = function () {
          try { this.muted = true; this.pause(); } catch (e) {}
          return (win.Promise && win.Promise.resolve) ? win.Promise.resolve() : null;
        };
        var AC = win.AudioContext || win.webkitAudioContext;
        if (AC) {
          win.__origAudioContext = AC;
          win.AudioContext = function () {
            var ctx = new win.__origAudioContext();
            try { ctx.suspend(); } catch (e) {}
            return ctx;
          };
          win.AudioContext.prototype = win.__origAudioContext.prototype;
        }
      } catch (e) { /* abaikan */ }
    }
    if (doc) {
      var els = doc.querySelectorAll('audio, video');
      for (var i = 0; i < els.length; i++) {
        try {
          els[i].muted = true; els[i].pause();
          els[i].removeAttribute('autoplay');
        } catch (e) {}
      }
    }
  }

  function makeMutedPreview(path) {
    var frame = document.createElement('iframe');
    frame.loading = 'lazy';
    frame.setAttribute('tabindex', '-1');
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('title', 'Pratinjau tema (tanpa musik)');
    /* kebijakan autoplay: blokir segala autoplay di dalam pratinjau */
    frame.setAttribute('allow', "autoplay 'none'");
    frame.style.transform = 'scale(0.86)';
    frame.src = path;

    /* sweep: tema menyiapkan audio dengan js -> bisukan berulang beberapa saat */
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var doc = null;
      try { doc = frame.contentDocument; } catch (e) { doc = null; }
      if (doc) silenceMedia(frame.contentWindow, doc);
      if (tries > 120) clearInterval(timer); /* cukup ~60 detik */
    }, 500);
    frame.addEventListener('load', function () {
      tries = 0;
      var doc = null;
      try { doc = frame.contentDocument; } catch (e) { doc = null; }
      if (doc) silenceMedia(frame.contentWindow, doc);
    });

    return frame;
  }

  /* ---------- render katalog ---------- */
  function waLink(t) {
    var brand = (DATA && DATA.brand) || {};
    var phone = brand.wa || '6282324137816';
    var txt = 'Halo, saya tertarik pesan undangan digital "' + t.name + '" (' + rp(t.price) + '). Apakah masih tersedia?';
    return 'https://api.whatsapp.com/send/?phone=' + phone + '&text=' + encodeURIComponent(txt);
  }

  function card(t) {
    var el = document.createElement('div');
    el.className = 'card-theme';
    el.innerHTML =
      '<div class="preview" data-path="' + esc(t.path) + '"><div class="skeleton"><div class="shim"></div></div></div>' +
      '<div class="body">' +
      '  <div class="row1"><h3>' + esc(t.name) + '</h3><span class="badge">' + esc(t.classification) + '</span></div>' +
      '  <div class="note">' + esc(t.note || '') + '</div>' +
      '  <div class="price">' + rp(t.price) + '</div>' +
      '  <div class="actions">' +
      '    <a class="btn btn-primary" target="_blank" rel="noopener" href="' + esc(t.path) + '">LIHAT UNDANGAN</a>' +
      '    <a class="btn btn-wa" target="_blank" rel="noopener" href="' + esc(waLink(t)) + '">PESAN</a>' +
      '  </div>' +
      '</div>';
    return el;
  }

  function lazyPreview(box) {
    var path = box.getAttribute('data-path');
    if (!path || path === 'undefined') return;
    var frame = makeMutedPreview(path);
    frame.addEventListener('load', function () {
      var sk = box.querySelector('.skeleton');
      if (sk) sk.remove();
    });
    frame.addEventListener('error', function () { box.innerHTML = '<div class="skeleton"></div>'; });
    box.appendChild(frame);
  }

  function render(opts) {
    var main = opts.main;
    var activeCls = opts.getActiveCls();
    var q = opts.getQ();
    main.innerHTML = '';
    var themes = DATA.themes.filter(function (t) {
      if (t.visible === false) return false;
      if (activeCls !== 'Semua' && t.classification !== activeCls) return false;
      if (q && (t.name + ' ' + t.classification + ' ' + (t.note || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (a, b) { return (a.order || 99) - (b.order || 99); });

    if (!themes.length) {
      main.innerHTML = '<div class="empty">Tidak ada tema yang cocok dengan pencarian.</div>';
      return;
    }

    /* pemisah otomatis: kelompokkan berdasarkan klasifikasi (urutan kemunculan) */
    var groups = [];
    themes.forEach(function (t) {
      var g = groups.find(function (x) { return x.cls === t.classification; });
      if (!g) { g = { cls: t.classification, items: [] }; groups.push(g); }
      g.items.push(t);
    });

    var lazyBoxes = [];
    groups.forEach(function (g) {
      var sec = document.createElement('section');
      sec.className = 'group';
      sec.innerHTML = '<div class="group-head"><h2>' + esc(g.cls.toUpperCase()) + '</h2><div class="rule"></div></div>';
      var grid = document.createElement('div');
      grid.className = 'grid';
      g.items.forEach(function (t) { grid.appendChild(card(t)); });
      sec.appendChild(grid);
      main.appendChild(sec);
      grid.querySelectorAll('.preview').forEach(function (b) { lazyBoxes.push(b); });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { lazyPreview(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '600px 0px' });
    lazyBoxes.forEach(function (b) { io.observe(b); });
  }

  /* ---------- API publik ---------- */
  window.BernaungCatalog = {
    /**
     * mount(opts)
     *   opts.main   : elemen kontainer daftar tema (wajib)
     *   opts.q      : elemen input pencarian (opsional)
     *   opts.chips  : elemen kontainer chip klasifikasi (opsional)
     *   opts.sticky : filterbar menempel di atas (default true)
     */
    mount: function (opts) {
      opts = opts || {};
      var key = (opts.main && opts.main.id) || 'default';
      if (mounted[key]) return; /* cegah mount ganda */
      mounted[key] = true;

      var state = { cls: 'Semua', q: '' };

      function renderChips() {
        if (!opts.chips) return;
        var cls = ['Semua'];
        DATA.themes.forEach(function (t) {
          if (t.visible === false) return;
          if (cls.indexOf(t.classification) === -1) cls.push(t.classification);
        });
        opts.chips.innerHTML = '';
        cls.forEach(function (c) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'chip' + (c === state.cls ? ' active' : '');
          b.textContent = c;
          b.addEventListener('click', function () {
            state.cls = c;
            opts.chips.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active');
            render(opts2);
          });
          opts.chips.appendChild(b);
        });
      }

      var opts2 = {
        main: opts.main,
        getActiveCls: function () { return state.cls; },
        getQ: function () { return state.q; }
      };

      if (opts.q) {
        opts.q.addEventListener('input', function (e) {
          state.q = e.target.value.trim().toLowerCase();
          render(opts2);
        });
      }

      fetch('/catalog.json')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (j) {
          DATA = j;
          renderChips();
          render(opts2);
        })
        .catch(function (e) {
          opts.main.innerHTML =
            '<div class="empty">Katalog gagal dimuat (' + esc(e.message) + ').<br>Buka halaman ini melalui alamat situs (GitHub Pages), bukan file lokal.</div>';
        });
    }
  };
})();
