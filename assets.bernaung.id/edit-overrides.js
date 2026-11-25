window.__BNG_EDIT_OVERRIDES_V1 = true;
/* ============================================================
BERNAUNG INVITATION — edit-overrides.js
------------------------------------------------------------
Dua peran dalam 1 file:

1. RUNTIME (otomatis, untuk semua halaman customer baru):
   - Mengambil /customer/<slug>/overrides.json
   - Menerapkan override teks, foto, section tersembunyi, musik
     ke DOM sebelum tamu melihat halaman (efek instan)
   - File tidak ada (404) => diam-diam, tidak melakukan apa pun.

2. EDIT MODE (aktif jika panel admin mengirim postMessage
   {type:'BNG_ENABLE'} ke iframe, atau parameter ?bng-edit=1):
   - Klik elemen apa pun => toolbar muncul
     * Edit Teks (heading/paragraf/span)
     * Ganti Foto (elemen <img>)
     * Sembunyikan Bagian (section terdekat)
   - Tombol "Ganti Musik" muncul di pojok kanan bawah
   - Setiap perubahan dikirim balik ke panel via postMessage

Penting: file ini TIDAK mengubah file index.html asli customer.
Hanya override di memori / runtime. Override permanen disimpan
sebagai overrides.json oleh panel admin.
============================================================ */
(function () {
'use strict';

/* ---------- AUDIO MONKEY-PATCH (harus paling awal) ----------
   Tema sering memakai `new Audio('demo.mp3')` saat script dimuat.
   Agar override musik berlaku, kita lacak SEMUA instance Audio
   yang dibuat dan update src-nya begitu overrides.json dimuat. */
window.__BNG_AUDIO_INSTANCES = [];
window.__BNG_OVERRIDE_MUSIC = null;
var __OrigAudio = window.Audio;
function PatchedAudio(src) {
  var inst = new __OrigAudio(src);
  window.__BNG_AUDIO_INSTANCES.push(inst);
  if (window.__BNG_OVERRIDE_MUSIC) {
    try { inst.src = window.__BNG_OVERRIDE_MUSIC; } catch (e) {}
  }
  return inst;
}
PatchedAudio.prototype = __OrigAudio.prototype;
try { Object.defineProperty(PatchedAudio, 'name', { value: 'Audio' }); } catch (e) {}
window.Audio = PatchedAudio;

/* ---------- STATE ---------- */
var EDIT_HOVER = 'bng-edit-hover';
var EDIT_SEL = 'bng-edit-selected';
var editMode = false;
var currentToolbar = null;
var hoverEl = null;

/* ---------- UTIL ---------- */
function getSlug() {
  var parts = location.pathname.split('/').filter(Boolean);
  if (parts[0] === 'customer' && parts[1]) return parts[1];
  return null;
}
function toParent(msg) {
  try { window.parent.postMessage(msg, '*'); } catch (e) {}
}
function setTextPreservingBR(el, value) {
  while (el.firstChild) el.removeChild(el.firstChild);
  var doc = el.ownerDocument;
  String(value == null ? '' : value).split('\n').forEach(function (line, i) {
    if (i) el.appendChild(doc.createElement('br'));
    if (line) el.appendChild(doc.createTextNode(line));
  });
}

/* ---------- BUILD SELECTOR ----------
   Prioritas: [data-id="..."] (Elementor) > ancestor data-id + path >
   full CSS path dari body. */
function buildSelector(el) {
  if (!el || el === document.body) return 'body';
  if (el.dataset && el.dataset.id) return '[data-id="' + el.dataset.id + '"]';
  var anc = el.closest ? el.closest('[data-id]') : null;
  if (anc) {
    var path = [];
    var cur = el;
    while (cur && cur !== anc) {
      var idx = Array.prototype.indexOf.call(cur.parentElement.children, cur) + 1;
      path.unshift(cur.tagName.toLowerCase() + ':nth-child(' + idx + ')');
      cur = cur.parentElement;
    }
    return '[data-id="' + anc.dataset.id + '"] ' + path.join(' > ');
  }
  var path2 = [];
  var cur2 = el;
  while (cur2 && cur2 !== document.body && cur2.parentElement) {
    var idx2 = Array.prototype.indexOf.call(cur2.parentElement.children, cur2) + 1;
    path2.unshift(cur2.tagName.toLowerCase() + ':nth-child(' + idx2 + ')');
    cur2 = cur2.parentElement;
  }
  return 'body > ' + path2.join(' > ');
}

function getSection(el) {
  if (!el || !el.closest) return null;
  return el.closest('section, .elementor-section, .e-parent, .satumomen_slide, .container-mobile, [data-element_type="section"]');
}

/* ---------- APPLY OVERRIDES (dari JSON) ---------- */
function applyOverrides(ov) {
  if (!ov) return;

  (ov.textEdits || []).forEach(function (e) {
    try {
      var el = document.querySelector(e.sel);
      if (el) setTextPreservingBR(el, e.val);
    } catch (err) {}
  });

  (ov.imageEdits || []).forEach(function (e) {
    try {
      var el = document.querySelector(e.sel);
      if (!el) return;
      if (e.attr === 'bg') {
        /* eksplisit background-image (dipilih saat klik elemen bg) */
        el.style.backgroundImage = 'url("' + e.val + '")';
      } else if (e.attr === 'src' || el.tagName === 'IMG') {
        if (el.tagName === 'IMG') el.src = e.val;
        else {
          var inner = el.querySelector('img');
          if (inner) inner.src = e.val;
          else el.style.backgroundImage = 'url("' + e.val + '")';
        }
      } else {
        /* auto-detect: coba <img> dulu, lalu bg-image */
        var img = el.querySelector('img');
        if (img) img.src = e.val;
        else el.style.backgroundImage = 'url("' + e.val + '")';
      }
    } catch (err) {}
  });

  (ov.hiddenSections || []).forEach(function (sel) {
    try {
      var el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    } catch (err) {}
  });

  if (ov.music) applyMusicOverride(ov.music);
}

function applyMusicOverride(newSrc) {
  window.__BNG_OVERRIDE_MUSIC = newSrc;
  /* update instance Audio yang sudah dibuat tema */
  window.__BNG_AUDIO_INSTANCES.forEach(function (a) {
    try { a.src = newSrc; a.load(); } catch (e) {}
  });
  /* update <audio> dan <source> di DOM */
  document.querySelectorAll('audio').forEach(function (a) {
    a.src = newSrc;
    a.querySelectorAll('source').forEach(function (s) { s.src = newSrc; });
    try { a.load(); } catch (e) {}
  });
  document.querySelectorAll('source[src$=".mp3"], source[type="audio/mpeg"], source[src$=".ogg"], source[src$=".m4a"], source[src$=".wav"]').forEach(function (s) {
    s.src = newSrc;
  });
}

/* ---------- LOAD OVERRIDES.JSON ---------- */
function loadAndApply() {
  var slug = getSlug();
  if (!slug) return;
  fetch('/customer/' + encodeURIComponent(slug) + '/overrides.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (ov) {
      if (ov) {
        applyOverrides(ov);
        window.__BNG_OVERRIDES_LOADED = ov;
      }
    })
    .catch(function () {});
}

/* ---------- EDIT MODE ---------- */
function injectStyles() {
  if (document.getElementById('bng-edit-styles')) return;
  var s = document.createElement('style');
  s.id = 'bng-edit-styles';
  s.textContent = [
    '.bng-edit-hover { outline: 2px dashed #e8c687 !important; outline-offset: 1px; cursor: pointer !important; }',
    '.bng-edit-selected { outline: 2px solid #3ecf8e !important; outline-offset: 1px; }',
    '.bng-edit-toolbar { position:fixed; z-index:99999; background:#141d28; border:1px solid #e8c687; border-radius:8px; padding:6px; display:flex; gap:6px; box-shadow:0 6px 22px rgba(0,0,0,.5); font-family:Poppins,sans-serif; flex-wrap:wrap; max-width:340px; }',
    '.bng-edit-toolbar button { background:#e8c687; color:#16202c; border:0; border-radius:5px; padding:6px 11px; font-size:11px; font-weight:700; cursor:pointer; letter-spacing:.4px; }',
    '.bng-edit-toolbar button:hover { filter:brightness(1.08); }',
    '.bng-edit-toolbar button.danger { background:transparent; border:1px solid #ff6b6b; color:#ff6b6b; }',
    '.bng-edit-toolbar button.ghost { background:transparent; border:1px solid #93a5ba; color:#93a5ba; }',
    '.bng-edit-musicbtn { position:fixed; bottom:20px; right:20px; background:#6ea8fe; color:#fff; font-size:12px; padding:9px 16px; border-radius:999px; cursor:pointer; font-family:Poppins,sans-serif; font-weight:700; z-index:99998; box-shadow:0 4px 14px rgba(0,0,0,.5); letter-spacing:.5px; }',
    '.bng-edit-musicbtn:hover { filter:brightness(1.08); }'
  ].join('\n');
  (document.head || document.documentElement).appendChild(s);
}

function removeToolbar() {
  if (currentToolbar) { currentToolbar.remove(); currentToolbar = null; }
}

function showToolbarFor(el, x, y) {
  removeToolbar();
  var tb = document.createElement('div');
  tb.className = 'bng-edit-toolbar';
  tb.style.left = Math.min(x + 6, window.innerWidth - 260) + 'px';
  tb.style.top = (y + 6) + 'px';

  var sel = buildSelector(el);

  /* === DETEKSI GAMBAR ===
     Cari elemen gambar: bisa <img> itu sendiri, <img> di dalam
     elemen yang diklik, atau elemen dengan background-image
     (inline style atau computed). Background-image sering dipakai
     Elementor untuk foto cover/gallery di div pembungkus. */
  var imgEl = null;
  var bgEl = null;
  if (el.tagName === 'IMG') {
    imgEl = el;
  } else {
    var inner = el.querySelector('img');
    if (inner) imgEl = inner;
  }
  if (!imgEl) {
    var testEl = el;
    var guard = 0;
    while (testEl && testEl !== document.body && guard++ < 5) {
      var bg = null;
      try {
        bg = (testEl.style && testEl.style.backgroundImage) || '';
        if (!bg || bg === 'none') {
          var cs = getComputedStyle(testEl);
          bg = cs && cs.backgroundImage;
        }
      } catch (e) {}
      if (bg && bg !== 'none' && bg.indexOf('url(') !== -1) {
        bgEl = testEl;
        break;
      }
      testEl = testEl.parentElement;
    }
  }
  var isImg = !!(imgEl || bgEl);

  /* === DETEKSI TEKS ===
     Hanya elemen heading/paragraf/span/dsb yang punya teks langsung
     (direct text node) dan TIDAK punya <img>/<video>/<iframe> anak. */
  var isText = !isImg && /^(H[1-6]|P|SPAN|A|BUTTON|LI|TD|LABEL|EM|STRONG|B|I|U|DIV)$/.test(el.tagName);
  if (isText) {
    if (el.querySelector('img, video, iframe')) { isText = false; }
    else if (el.tagName === 'DIV') {
      /* DIV hanya dianggap teks kalau punya direct text content */
      var hasDirectText = false;
      Array.prototype.forEach.call(el.childNodes, function (n) {
        if (n.nodeType === 3 && n.nodeValue.trim()) hasDirectText = true;
      });
      if (!hasDirectText) isText = false;
    }
  }
  var section = getSection(el);

  if (isText) {
    var bEdit = document.createElement('button');
    bEdit.textContent = 'Edit Teks';
    bEdit.onclick = function () {
      el.contentEditable = true;
      el.classList.add(EDIT_SEL);
      el.focus();
      /* pilih semua teks */
      try {
        var r = document.createRange();
        r.selectNodeContents(el);
        var s = window.getSelection();
        s.removeAllRanges(); s.addRange(r);
      } catch (e) {}
      function onblur() {
        el.removeEventListener('blur', onblur);
        el.contentEditable = false;
        el.classList.remove(EDIT_SEL);
        var newVal = (el.innerText || el.textContent || '').replace(/\u00a0/g, ' ').trim();
        if (newVal) toParent({ type: 'BNG_TEXT_EDIT', sel: sel, val: newVal });
        removeToolbar();
      }
      el.addEventListener('blur', onblur);
      /* ESC batal */
      function onkey(e) {
        if (e.key === 'Escape') {
          el.removeEventListener('keydown', onkey);
          el.removeEventListener('blur', onblur);
          el.contentEditable = false;
          el.classList.remove(EDIT_SEL);
          el.blur();
          removeToolbar();
        }
      }
      el.addEventListener('keydown', onkey);
    };
    tb.appendChild(bEdit);
  }

  if (isImg) {
    var bImg = document.createElement('button');
    bImg.textContent = 'Ganti Foto';
    var imgTarget = imgEl || bgEl;
    var imgSelector = buildSelector(imgTarget);
    var imgType = imgEl ? 'src' : 'bg';
    bImg.onclick = function () {
      toParent({ type: 'BNG_IMG_REQUEST', sel: imgSelector, imgType: imgType });
      removeToolbar();
    };
    tb.appendChild(bImg);
  }

  if (section) {
    var secSel = buildSelector(section);
    var hidden = section.style.display === 'none';
    var bSec = document.createElement('button');
    bSec.textContent = hidden ? 'Tampilkan Bagian' : 'Sembunyikan Bagian';
    bSec.className = hidden ? 'ghost' : 'danger';
    bSec.onclick = function () {
      if (hidden) {
        section.style.display = '';
        toParent({ type: 'BNG_SHOW', sel: secSel });
      } else {
        section.style.display = 'none';
        toParent({ type: 'BNG_HIDE', sel: secSel });
      }
      removeToolbar();
    };
    tb.appendChild(bSec);
  }

  /* info selector (debug hint) */
  var info = document.createElement('span');
  info.style.cssText = 'font-size:10px;color:#93a5ba;padding:4px 6px;word-break:break-all;max-width:200px;font-family:monospace';
  info.textContent = sel.length > 60 ? sel.slice(0, 60) + '…' : sel;
  tb.appendChild(info);

  var bClose = document.createElement('button');
  bClose.textContent = 'X';
  bClose.className = 'ghost';
  bClose.style.padding = '6px 9px';
  bClose.onclick = function () { removeToolbar(); };
  tb.appendChild(bClose);

  document.body.appendChild(tb);
  currentToolbar = tb;
}

function enableEditMode() {
  if (editMode) return;
  editMode = true;
  injectStyles();

  /* tombol ganti musik floating */
  if (!document.getElementById('bng-music-btn')) {
    var mb = document.createElement('div');
    mb.id = 'bng-music-btn';
    mb.className = 'bng-edit-musicbtn';
    mb.textContent = 'Ganti Musik';
    mb.onclick = function () { toParent({ type: 'BNG_MUSIC_REQUEST' }); };
    document.body.appendChild(mb);
  }

  /* klik => tampilkan toolbar untuk elemen */
  document.body.addEventListener('click', function (e) {
    if (!editMode) return;
    if (e.target.closest && e.target.closest('.bng-edit-toolbar, #bng-music-btn')) return;
    if (e.target.tagName === 'SCRIPT' || e.target.tagName === 'STYLE') return;
    e.preventDefault();
    e.stopPropagation();
    showToolbarFor(e.target, e.clientX, e.clientY);
  }, true);

  /* hover => highlight */
  document.body.addEventListener('mouseover', function (e) {
    if (!editMode) return;
    if (e.target.closest && e.target.closest('.bng-edit-toolbar, #bng-music-btn')) return;
    if (hoverEl && hoverEl !== e.target) hoverEl.classList.remove(EDIT_HOVER);
    hoverEl = e.target;
    if (hoverEl && hoverEl !== document.body) hoverEl.classList.add(EDIT_HOVER);
  }, true);
  document.body.addEventListener('mouseout', function (e) {
    if (e.target === hoverEl) e.target.classList.remove(EDIT_HOVER);
  }, true);

  /* ESC => tutup toolbar */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') removeToolbar();
  }, true);

  /* deteksi section opsional (Amplop/Kado/Love Story/dsb) untuk
     chip hide cepat di panel admin */
  scanOptionalSections();

  /* === DISMISS "BUKA UNDANGAN" COVER + UNLOCK SCROLL ===
     Banyak tema wedding memakai pola "Buka Undangan" — sebuah
     overlay fullscreen yang mengunci scroll body sampai user klik
     tombol "Buka". Saat mode edit, kita auto-dismiss cover itu
     supaya admin bisa scroll & edit seluruh halaman. */
  dismissInvitationCover();

  toParent({ type: 'BNG_READY' });
}

/* ---------- DISMISS INVITATION COVER ----------
   Cari elemen yang terlihat seperti cover "Buka Undangan" lalu
   klik tombolnya (atau sembunyikan kalau tidak ada tombol). Force
   unlock scroll body di apa pun kondisinya. */
function dismissInvitationCover() {
  /* 1. Coba klik tombol "Buka Undangan" / "Buka" / "Mulai" / "Open" */
  var candidates = document.querySelectorAll('a, button, .elementor-button, .elementor-button-link, [role="button"], .btn');
  var clickables = ['buka undangan', 'buka', 'mulai', 'open invitation', 'open', 'buka sekarang'];
  var clicked = false;
  for (var i = 0; i < candidates.length && !clicked; i++) {
    var t = (candidates[i].textContent || '').trim().toLowerCase();
    if (t.length > 30) continue; /* skip tombol dgn teks panjang */
    for (var j = 0; j < clickables.length; j++) {
      if (t === clickables[j] || t.indexOf(clickables[j]) !== -1) {
        try { candidates[i].click(); clicked = true; break; } catch (e) {}
      }
    }
  }

  /* 2. Force unlock scroll pada html + body */
  try {
    document.documentElement.style.cssText += ';overflow:auto !important;height:auto !important;position:static !important;';
    document.body.style.cssText += ';overflow:auto !important;height:auto !important;position:static !important;max-height:none !important;';
  } catch (e) {}

  /* 3. Cari overlay fullscreen (position:fixed yang menutupi viewport)
     yang masih ada setelah klik. Sembunyikan kalau bukan toolbar kita. */
  setTimeout(function () {
    var allFixed = document.querySelectorAll('div, section, .elementor-section, .satumomen_slide, .container-mobile');
    allFixed.forEach(function (el) {
      if (el.id === 'bng-music-btn' || el.classList.contains('bng-edit-toolbar')) return;
      var cs = null;
      try { cs = getComputedStyle(el); } catch (e) { return; }
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (cs.position !== 'fixed') return;
      var r = el.getBoundingClientRect();
      /* hanya sembunyikan kalau cover mayoritas viewport */
      if (r.width > window.innerWidth * 0.6 && r.height > window.innerHeight * 0.6) {
        var txt = (el.textContent || '').toLowerCase();
        /* jangan sembunyikan kalau tidak ada tanda cover invitation */
        if (/buka|mulai|open|undangan|cover|welcome/i.test(txt) || r.top <= 0) {
          /* coba klik tombol di dalam dulu (lebih sopan) */
          var inner = el.querySelector('a, button, .elementor-button, [role="button"]');
          if (inner && !clicked) {
            try { inner.click(); return; } catch (e) {}
          }
          el.style.display = 'none';
        }
      }
    });
  }, 600);

  /* 4. Coba lagi setelah animasi tema selesai (1.5s) — beberapa tema
     delay cover removal sampai animasi opening selesai */
  setTimeout(function () {
    try {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    } catch (e) {}
  }, 1500);
}

/* ---------- SCAN OPTIONAL SECTIONS ----------
   Cari heading/paragraf yang memuat frasa opsional umum, lalu
   kirim list ke parent untuk ditampilkan sebagai chip "hide cepat". */
var OPTIONAL_PHRASES = [
  { re: /amplop\s*digital/i, label: 'Amplop Digital', keys: ['gift1Number', 'gift2Number', 'gift3Number'] },
  { re: /wedding\s*gift/i, label: 'Wedding Gift', keys: ['gift1Number', 'gift2Number', 'gift3Number'] },
  { re: /kado\s*digital/i, label: 'Kado Digital', keys: ['gift1Number', 'gift2Number', 'gift3Number'] },
  { re: /kirim\s*kado/i, label: 'Kirim Kado', keys: ['kadoName', 'kadoPhone', 'kadoAddress'] },
  { re: /kirim\s*hadiah/i, label: 'Kirim Hadiah', keys: ['kadoName', 'kadoPhone', 'kadoAddress'] },
  { re: /penerima\s*kado/i, label: 'Penerima Kado', keys: ['kadoName', 'kadoPhone', 'kadoAddress'] },
  { re: /our\s*love\s*story/i, label: 'Our Love Story', keys: ['_love'] },
  { re: /love\s*story/i, label: 'Love Story', keys: ['_love'] },
  { re: /cerita\s*cinta/i, label: 'Cerita Cinta', keys: ['_love'] },
  { re: /kisah\s*cinta/i, label: 'Kisah Cinta', keys: ['_love'] }
];

function scanOptionalSections() {
  var found = [];
  var seen = {};
  var headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, .elementor-heading-title');
  headings.forEach(function (el) {
    var txt = (el.textContent || '').trim();
    if (!txt || txt.length > 60) return; /* skip panjang */
    OPTIONAL_PHRASES.forEach(function (opt) {
      if (opt.re.test(txt)) {
        var sec = getSection(el);
        if (!sec) return;
        var sel = buildSelector(sec);
        if (seen[sel]) return;
        seen[sel] = 1;
        found.push({ sel: sel, label: opt.label, keys: opt.keys, phrase: txt });
      }
    });
  });
  if (found.length) toParent({ type: 'BNG_SECTIONS_LIST', sections: found });
}

function disableEditMode() {
  editMode = false;
  removeToolbar();
  var mb = document.getElementById('bng-music-btn');
  if (mb) mb.remove();
  document.querySelectorAll('.' + EDIT_HOVER + ', .' + EDIT_SEL).forEach(function (el) {
    el.classList.remove(EDIT_HOVER, EDIT_SEL);
  });
}

/* ---------- MESSAGE LISTENER (dari panel admin) ---------- */
window.addEventListener('message', function (e) {
  var msg = e.data || {};
  if (typeof msg !== 'object' || !msg.type) return;
  switch (msg.type) {
    case 'BNG_ENABLE':
      enableEditMode();
      break;
    case 'BNG_DISABLE':
      disableEditMode();
      break;
    case 'BNG_LOAD_OVERRIDES':
      applyOverrides(msg.overrides);
      break;
    case 'BNG_IMG_RESPONSE':
      try {
        var el = document.querySelector(msg.sel);
        if (el) {
          if (msg.imgType === 'bg') {
            el.style.backgroundImage = 'url("' + msg.val + '")';
          } else if (el.tagName === 'IMG') {
            el.src = msg.val;
          } else {
            var inner = el.querySelector('img');
            if (inner) inner.src = msg.val;
            else el.style.backgroundImage = 'url("' + msg.val + '")';
          }
        }
      } catch (err) {}
      break;
    case 'BNG_MUSIC_RESPONSE':
      applyMusicOverride(msg.val);
      break;
    case 'BNG_HIDE_APPLY':
      try { var el2 = document.querySelector(msg.sel); if (el2) el2.style.display = 'none'; } catch (err) {}
      break;
    case 'BNG_SHOW_APPLY':
      try { var el3 = document.querySelector(msg.sel); if (el3) el3.style.display = ''; } catch (err) {}
      break;
  }
});

/* ---------- AUTO INIT ----------
   - Selalu coba load overrides.json (silent kalau 404)
   - Aktifkan edit mode jika ?bng-edit=1 ada di URL */
function init() {
  loadAndApply();
  if (/[?&]bng-edit=1\b/.test(location.search)) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', enableEditMode);
    } else {
      enableEditMode();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
