/* ============================================================
   BERNAUNG INVITATION — guest.js (aset global)
   ------------------------------------------------------------
   Personalisasi nama tamu via parameter URL:
     index.html?to=Nama%20Tamu
   Alias yang didukung: to, kepada, untuk, nama, guest
   ------------------------------------------------------------
   Cara kerja:
   1. Bila halaman punya elemen [data-guest] / #guest-name /
      #nama-tamu / .nama-tamu  -> teks elemen diganti nama tamu.
   2. Bila tidak ada, panel sapaan "Kepada Yth." disisipkan
      otomatis di atas tombol pembuka undangan
      (Buka Undangan / Open Wedding Details / dsb.).
   3. Bila tamu menekan tombol tanpa parameter, panel disembunyikan.
   ============================================================ */
(function () {
  try {
    var params = new URLSearchParams(location.search);
    var name = params.get('to') || params.get('kepada') || params.get('untuk') ||
               params.get('nama') || params.get('guest') || '';
    name = name.trim().slice(0, 60);
    if (!name) return;

    /* 1) Slot bawaan tema */
    var slots = document.querySelectorAll('[data-guest], #guest-name, #nama-tamu, .nama-tamu, #tamu');
    if (slots.length) {
      slots.forEach(function (el) { el.textContent = name; });
      return;
    }

    /* 2) Sisipkan panel sapaan di atas tombol pembuka */
    var OPEN_RE = /(buka\s*undangan|open\s*undangan|open\s*invitation|open\s*the\s*invitation|open\s*wedding\s*details|buka\s*detail|lihat\s*undangan|mulai)/i;
    var candidates = Array.prototype.slice.call(
      document.querySelectorAll('a, button, div, span, h2, h3, p')
    ).filter(function (el) {
      var t = (el.textContent || '').trim();
      return t && t.length < 60 && OPEN_RE.test(t);
    });
    var anchor = candidates.length ? candidates[candidates.length - 1] : null;
    /* naik ke container cover */
    var host = anchor;
    for (var i = 0; i < 3 && host && host.parentElement; i++) {
      var p = host.parentElement;
      if (p.clientHeight > 200 || getComputedStyle(p).position === 'fixed') break;
      host = p;
    }
    if (!host) host = document.body;

    var panel = document.createElement('div');
    panel.id = 'bernaung-guest-panel';
    panel.style.cssText = 'text-align:center;margin:10px auto 14px;padding:10px 18px;' +
      'background:rgba(0,0,0,.25);backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,.35);' +
      'border-radius:12px;color:#fff;font-family:inherit;max-width:88%;';
    panel.innerHTML =
      '<div style="font-size:12px;letter-spacing:2px;opacity:.9;">KEPADA YTH.</div>' +
      '<div style="font-size:18px;font-weight:700;margin:4px 0 2px;" id="bernaung-guest-name"></div>' +
      '<div style="font-size:11px;opacity:.85;">Bapak/Ibu/Saudara/i</div>';
    panel.querySelector('#bernaung-guest-name').textContent = name;

    /* posisikan tepat sebelum anchor kalau ada, kalau tidak di awal host */
    if (anchor && anchor.parentElement === host) {
      host.insertBefore(panel, anchor);
    } else {
      host.insertBefore(panel, host.firstChild);
    }
  } catch (e) {
    /* diam — personalisasi tidak boleh merusak undangan */
  }
})();
