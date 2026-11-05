/* ============================================================
   MAIN.JS — Undangan Digital Dhina & Christo
   Fitur: cover pembuka, nama tamu dari URL, countdown,
   musik latar, animasi reveal, salin rekening, lightbox,
   RSVP & ucapan via Google Apps Script.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- 1. NAMA TAMU DARI URL (?to=Nama%20Tamu) ---------- */
  function setGuestName() {
    const params = new URLSearchParams(window.location.search);
    const guest =
      params.get('to') || params.get('kepada') || params.get('nama') || '';
    const el = document.getElementById('guest-name');
    if (guest.trim()) {
      el.textContent = guest
        .split(/[\s+]+/)
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  /* ---------- 2. COVER PEMBUKA ---------- */
  const cover = document.getElementById('cover');
  const btnOpen = document.getElementById('btn-open');
  const nav = document.getElementById('bottom-nav');
  const musicBtn = document.getElementById('music-btn');
  const audio = document.getElementById('bg-music');
  audio.src = CONFIG.MUSIC_FILE;

  document.body.classList.add('locked');

  function openInvitation() {
    cover.classList.add('opened');
    document.body.classList.remove('locked');
    nav.classList.add('show');
    musicBtn.classList.add('show');
    playMusic(); // musik otomatis setelah tombol ditekan (gestur pengguna)
  }

  btnOpen.addEventListener('click', openInvitation);

  /* ---------- 3. MUSIK LATAR ---------- */
  let musicOk = true;
  audio.addEventListener('error', () => {
    // File musik belum dipasang — sembunyikan tombol musik
    musicOk = false;
    musicBtn.classList.remove('show');
    console.warn('[Musik] File tidak ditemukan:', CONFIG.MUSIC_FILE);
  });

  function playMusic() {
    if (!musicOk) return;
    audio
      .play()
      .then(() => musicBtn.classList.add('playing'))
      .catch(() => musicBtn.classList.remove('playing'));
  }

  musicBtn.addEventListener('click', () => {
    if (!musicOk) return;
    if (audio.paused) {
      playMusic();
    } else {
      audio.pause();
      musicBtn.classList.remove('playing');
    }
  });

  /* ---------- 4. COUNTDOWN ---------- */
  const target = new Date(CONFIG.COUNTDOWN_TARGET).getTime();
  const cd = {
    d: document.getElementById('cd-days'),
    h: document.getElementById('cd-hours'),
    m: document.getElementById('cd-mins'),
    s: document.getElementById('cd-secs')
  };
  const pad = n => String(n).padStart(2, '0');

  function tick() {
    const diff = Math.max(0, target - Date.now());
    cd.d.textContent = pad(Math.floor(diff / 864e5));
    cd.h.textContent = pad(Math.floor(diff / 36e5) % 24);
    cd.m.textContent = pad(Math.floor(diff / 6e4) % 60);
    cd.s.textContent = pad(Math.floor(diff / 1e3) % 60);
  }
  tick();
  setInterval(tick, 1000);

  /* Tombol Simpan Tanggal → Google Calendar
     Pemberkatan: 05 Des 2026 08.00 WIB ; Resepsi: 06 Des 2026 13.00 WIB */
  (function setCalendarLink() {
    const detail =
      'Pemberkatan Nikah: Sabtu, 05 Desember 2026, 08.00 WIB\\n' +
      'Resepsi: Minggu, 06 Desember 2026, 13.00 WIB - Selesai\\n' +
      'Lokasi: Mranggen Kidul RT 05 RW 01, Bansari, Temanggung\\n\\n' +
      'Google Maps: /_cdn/maps.app.goo.gl/Yq513gMgsVoVvzsC8';
    const url =
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent('Pernikahan Dhina & Christo') +
      '&dates=20261205T010000Z/20261206T070000Z' +
      '&details=' + encodeURIComponent(detail) +
      '&location=' + encodeURIComponent('Mranggen Kidul RT 05 RW 01, Bansari, Temanggung');
    document.getElementById('btn-calendar').href = url;
  })();

  /* ---------- 5. ANIMASI REVEAL SAAT SCROLL ---------- */
  const io = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---------- 6. NAVIGASI BAWAH: status aktif ---------- */
  const navItems = [...document.querySelectorAll('.bottom-nav .nav-item')];
  const sections = navItems
    .map(item => document.querySelector(item.getAttribute('href')))
    .filter(Boolean);

  const navIO = new IntersectionObserver(
    entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          navItems.forEach(item =>
            item.classList.toggle(
              'active',
              item.getAttribute('href') === '#' + e.target.id
            )
          );
        }
      });
    },
    { rootMargin: '-45% 0px -45% 0px' }
  );
  sections.forEach(s => navIO.observe(s));

  /* ---------- 7. SALIN NOMOR REKENING ---------- */
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', async () => {
      const num = btn.dataset.rekening;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(num);
        } else {
          const ta = document.createElement('textarea');
          ta.value = num;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        showToast('Nomor rekening berhasil disalin ✓');
      } catch {
        showToast('Gagal menyalin. Salin manual: ' + num);
      }
    });
  });

  let toastTimer;
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- 8. LIGHTBOX GALERI ---------- */
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  document.querySelectorAll('.g-item').forEach(a => {
    a.addEventListener('click', ev => {
      ev.preventDefault();
      lbImg.src = a.getAttribute('href');
      lb.hidden = false;
      requestAnimationFrame(() => lb.classList.add('show'));
    });
  });
  function closeLb() {
    lb.classList.remove('show');
    setTimeout(() => (lb.hidden = true), 300);
  }
  lb.addEventListener('click', closeLb);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !lb.hidden) closeLb();
  });

  /* ============================================================
     9. RSVP & UCAPAN → GOOGLE APPS SCRIPT → SPREADSHEET
     ============================================================ */
  const API = CONFIG.RSVP_API_URL;
  const configured = API.startsWith('http');
  const form = document.getElementById('rsvp-form');
  const statusEl = document.getElementById('form-status');
  const btnSubmit = document.getElementById('btn-submit');
  const listEl = document.getElementById('ucapan-list');
  const countEl = document.getElementById('ucapan-count');
  const btnMore = document.getElementById('btn-more');

  let wishes = [];
  let shown = 0;

  function fmtTime(iso) {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  function renderWishes(reset) {
    if (reset) { listEl.innerHTML = ''; shown = 0; }
    const slice = wishes.slice(shown, shown + CONFIG.UCAPAN_PER_PAGE);
    slice.forEach(w => {
      const hadir = (w.kehadiran || '').toLowerCase() === 'hadir';
      const div = document.createElement('div');
      div.className = 'ucapan-item';
      div.innerHTML =
        '<div class="ucapan-item-head">' +
          '<span class="ucapan-nama"></span>' +
          '<span class="badge ' + (hadir ? 'hadir">Hadir' : 'tidak">Tidak Hadir') + '</span>' +
        '</div>' +
        '<p class="ucapan-isi"></p>' +
        '<p class="ucapan-waktu">' + fmtTime(w.waktu) + '</p>';
      div.querySelector('.ucapan-nama').textContent = w.nama || 'Tamu';
      div.querySelector('.ucapan-isi').textContent = w.ucapan || '';
      listEl.appendChild(div);
    });
    shown += slice.length;
    countEl.textContent = wishes.length ? '(' + wishes.length + ')' : '';
    btnMore.hidden = shown >= wishes.length;
    if (!wishes.length) {
      listEl.innerHTML =
        '<p class="ucapan-empty">Belum ada ucapan. Jadilah yang pertama! 🤍</p>';
    }
  }

  async function loadWishes() {
    if (!configured) {
      listEl.innerHTML =
        '<p class="ucapan-empty">⚠ RSVP belum terhubung.<br>Isi RSVP_API_URL di <b>js/config.js</b> — lihat README.md.</p>';
      return;
    }
    try {
      const res = await fetch(API + '?action=list');
      const json = await res.json();
      wishes = Array.isArray(json.data) ? json.data : [];
      renderWishes(true);
    } catch {
      listEl.innerHTML =
        '<p class="ucapan-empty">Gagal memuat ucapan. Periksa koneksi lalu muat ulang halaman.</p>';
    }
  }
  btnMore.addEventListener('click', () => renderWishes(false));

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!configured) {
      statusEl.textContent =
        'RSVP belum terhubung: isi RSVP_API_URL di js/config.js (lihat README.md).';
      statusEl.className = 'form-status err';
      return;
    }
    const data = {
      nama: form.nama.value.trim(),
      kehadiran: form.kehadiran.value,
      ucapan: form.ucapan.value.trim()
    };
    if (!data.nama || !data.kehadiran || !data.ucapan) {
      statusEl.textContent = 'Mohon lengkapi semua kolom terlebih dahulu.';
      statusEl.className = 'form-status err';
      return;
    }
    btnSubmit.disabled = true;
    btnSubmit.querySelector('.btn-submit-text').textContent = 'Mengirim…';
    statusEl.textContent = '';

    try {
      // Content-Type default text/plain → menghindari CORS preflight
      const res = await fetch(API, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      if (json.status === 'success') {
        showToast('Ucapan berhasil terkirim, terima kasih 🤍');
        statusEl.textContent = 'Terima kasih! Ucapan Anda telah kami terima.';
        statusEl.className = 'form-status ok';
        form.reset();
        if (wishes.length) {
          wishes.unshift({
            nama: data.nama,
            kehadiran: data.kehadiran,
            ucapan: data.ucapan,
            waktu: new Date().toISOString()
          });
          renderWishes(true);
        } else {
          loadWishes();
        }
      } else {
        throw new Error(json.message || 'Gagal');
      }
    } catch {
      statusEl.textContent =
        'Maaf, terjadi kendala saat mengirim. Silakan coba lagi.';
      statusEl.className = 'form-status err';
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.querySelector('.btn-submit-text').textContent = 'Kirim Ucapan';
    }
  });

  /* ---------- INISIALISASI ---------- */
  setGuestName();
  loadWishes();
})();
