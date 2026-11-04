# 🤍 Undangan Digital — The Wedding of Dhina & Christo

Undangan pernikahan digital bergaya **vintage cream** (terinspirasi tema premium-08)
dengan RSVP & Ucapan yang tersimpan otomatis ke **Google Spreadsheet** Anda.

**Data acara di undangan ini:**

| | |
|---|---|
| Mempelai Wanita | Dhina Christi Aprilia (Putri dari Bp. Mugiarto & Ibu. Jupriyati) — IG @dhinachristii |
| Mempelai Pria | Christopha Matica Timothy (Putra dari (Alm.) Bp. Yochanan & Ibu. Lastri Wulaningrum) — IG @christo_timoty |
| Pemberkatan Nikah | Sabtu, 05 Desember 2026, Pukul 08.00 WIB |
| Resepsi | Minggu, 06 Desember 2026, Pukul 13.00 WIB - Selesai |
| Alamat | Mranggen Kidul RT 05 RW 01, Bansari, Temanggung |
| Rekening | BCA 1550358961 a.n. Christopha Matica Timothy |
| Musik | Adele – Make You Feel My Love |

---

## 📁 Struktur File

```
undangan-dhina-christo/
├── index.html            ← halaman utama undangan
├── css/
│   └── style.css         ← seluruh desain & warna tema
├── js/
│   ├── config.js         ← ⭐ PENGATURAN WAJIB (URL RSVP, musik, countdown)
│   └── main.js           ← logika undangan (tidak perlu diubah)
├── assets/
│   ├── img/              ← ⭐ GANTI foto di sini
│   │   ├── cover.jpg     ← latar sampul
│   │   ├── bride.jpg     ← foto mempelai wanita
│   │   ├── groom.jpg     ← foto mempelai pria
│   │   └── gallery-1.jpg … gallery-4.jpg ← galeri foto
│   └── audio/
│       └── music.mp3     ← ⭐ musik latar (lihat BACA-SAYA.txt)
├── apps-script/
│   └── Code.gs           ← kode untuk Google Spreadsheet (RSVP)
├── .nojekyll             ← wajib ada agar GitHub Pages berjalan baik
└── README.md             ← file panduan ini
```

---

## 1️⃣ Ganti Foto Mempelai & Galeri

1. Siapkan foto Anda (format JPG).
2. Ganti file di folder `assets/img/`:
   - `bride.jpg` → foto mempelai wanita (idealnya potret rasio 3:4)
   - `groom.jpg` → foto mempelai pria (potret 3:4)
   - `gallery-1.jpg` s/d `gallery-4.jpg` → foto galeri
   - `cover.jpg` → latar sampul (opsional, boleh tetap)
3. Pertahankan **nama file tetap sama** agar tidak perlu mengubah kode.

---

## 2️⃣ Pasang Musik Latar

Lagu yang diminta: **Adele – Make You Feel My Love**.

1. Siapkan file MP3 dari koleksi pribadi Anda.
2. Beri nama `music.mp3` dan letakkan di folder `assets/audio/`.
3. Selesai — musik otomatis berputar saat tamu membuka undangan.
   Instruksi lengkap ada di `assets/audio/BACA-SAYA.txt`.

---

## 3️⃣ Hubungkan RSVP ke Google Spreadsheet Anda ⭐ PENTING

### A. Buat Spreadsheet

1. Buka [sheets.google.com](https://sheets.google.com) dan buat **Spreadsheet baru**,
   beri nama misalnya `RSVP Dhina & Christo`.
2. Biarkan nama sheet default (`Sheet1`) — script akan otomatis membuat sheet
   bernama `RSVP` beserta kolomnya saat data pertama masuk.

### B. Pasang Kode Apps Script

1. Di Spreadsheet tersebut, menu **Extensions (Ekstensi) > Apps Script**.
2. Hapus semua kode bawaan di editor.
3. Buka file **`apps-script/Code.gs`** dari folder ini (bisa dengan Notepad /
   VS Code), **salin seluruh isinya**, tempel ke editor Apps Script.
4. Klik ikon **💾 Save**.

### C. Deploy (Terbitkan)

1. Klik **Deploy > New deployment**.
2. Di ikon roda gigi "Select type", pilih **Web app**.
3. Isi:
   - Description: `RSVP Undangan`
   - **Execute as: Me** (akun Google Anda)
   - **Who has access: Anyone** ← wajib, agar bisa diakses tamu
4. Klik **Deploy** → **Authorize access** → pilih akun Anda →
   klik **Advanced > Go to ... (unsafe) > Allow** (ini aman, karena kode
   hanya mengakses spreadsheet milik Anda sendiri).
5. Muncul **Web app URL**, salin URL tersebut (diakhiri `/exec`).

### D. Sambungkan ke Undangan

1. Buka file **`js/config.js`** dengan text editor.
2. Tempel URL ke bagian ini:
   ```js
   RSVP_API_URL: 'https://script.google.com/macros/s/XXXX.../exec',
   ```
3. Simpan. Selesai! 🎉

**Hasilnya:** setiap tamu yang mengisi form RSVP akan otomatis tersimpan ke
spreadsheet Anda dengan kolom: `Waktu | Nama | Kehadiran | Ucapan`,
dan daftar ucapan langsung tampil di undangan.

> 💡 **Catatan:** Jika nanti Anda mengedit kode di Apps Script, lakukan
> **Deploy > Manage deployments > Edit (pensil) > Version: New version > Deploy**
> agar perubahan aktif tanpa mengubah URL.

---

## 4️⃣ Upload ke GitHub & Aktifkan GitHub Pages

### A. Upload

1. Buat akun di [github.com](https://github.com) (jika belum punya).
2. Klik **+** (kanan atas) > **New repository**.
   - Repository name: `undangan-dhina-christo`
   - Pilih **Public** (wajib untuk GitHub Pages gratis)
   - Klik **Create repository**.
3. Di halaman repo, klik **uploading an existing file**.
4. **Seret SEMUA isi folder** `undangan-dhina-christo/` (index.html, css, js,
   assets, apps-script, .nojekyll) ke area upload.
   > ⚠ Pastikan yang di-drag adalah **ISI folder**, bukan foldernya,
   > supaya `index.html` berada langsung di akar repository.
5. Ketik commit message, misalnya `Undangan pernikahan`, lalu klik
   **Commit changes**. Tunggu sampai upload selesai.

> File `.nojekyll` tidak bisa di-drag lewat browser karena namanya diawali
> titik. Jika tidak ikut terupload, buat manual: **Add file > Create new file**,
> ketik `.nojekyll` pada nama file, biarkan isinya kosong, lalu Commit.

### B. Aktifkan GitHub Pages

1. Di repository Anda, buka **Settings > Pages** (menu kiri).
2. Pada **Branch**, pilih `main` (atau `master`) dan folder `/ (root)`.
3. Klik **Save**.
4. Tunggu 1–2 menit, lalu muat ulang halaman. Akan muncul alamat undangan:

   ```
   https://username-anda.github.io/undangan-dhina-christo/
   ```

### C. Kirim Undangan dengan Nama Tamu

Tambahkan parameter `?to=` di akhir link untuk menampilkan nama tamu di
amplop pembuka:

```
https://username-anda.github.io/undangan-dhina-christo/?to=Bapak Budi Santoso
```

Contoh broadcast WhatsApp:

```
Bapak/Ibu/Saudara/i 🤍

Tanpa mengurangi rasa hormat, kami mengundang Anda ke pernikahan kami:
🤍 Dhina & Christo
📅 Sabtu, 05 Desember 2026

Undangan lengkap:
https://username-anda.github.io/undangan-dhina-christo/?to=Bapak Budi Santoso

Merupakan kehormatan bagi kami apabila Anda berkenan hadir. Terima kasih 🤍
```

---

## 5️⃣ Mengubah Isi Teks Undangan

Semua teks (nama, tanggal, alamat, love story, rekening) sudah terisi sesuai
data Anda dan ditulis langsung di `index.html`. Untuk mengedit:

1. Buka `index.html` dengan text editor (Notepad / VS Code).
2. Cari bagian dengan komentar `<!-- ============ -->` yang menandai tiap
   seksi undangan.
3. Ubah teksnya, simpan, lalu upload ulang file ke GitHub (Add file > Upload
   files > Commit changes). Perubahan aktif dalam ± 1 menit.

**Ubah warna tema?** Buka `css/style.css`, edit variabel warna di bagian atas
(`:root { --gold: #b08d57; ... }`).

**Ubah lagu / tanggal countdown / jumlah ucapan?** Semua ada di `js/config.js`.

---

## ❓ Masalah Umum

| Masalah | Solusi |
|---|---|
| Halaman 404 di GitHub Pages | Pastikan nama file `index.html` (huruf kecil semua) berada di akar repo, dan Pages diatur ke branch `main` / `(root)`. |
| Ucapan "Gagal memuat ucapan" | `RSVP_API_URL` belum diisi / deployment belum "Anyone". Ulangi langkah 3. |
| Ucapan tidak terkirim | Pastikan deploy Apps Script **Execute as: Me** dan **Who has access: Anyone**. Coba buka URL `/exec` langsung di browser — harus muncul tulisan `{"status":"success",...}`. |
| Musik tidak berputar | File `assets/audio/music.mp3` belum ada. Lihat bagian 2️⃣. |
| Nama tamu tidak muncul | Pastikan link memakai `?to=Nama Tamu` (spasi diperbolehkan, ganti spasi dengan `%20` bila perlu). |
| Edit Apps Script tidak berefek | Buat **New version** di Manage deployments (lihat 💡 catatan di bagian 3️⃣). |

---

Semoga hari bahagia Dhina & Christo berjalan lancar dan penuh berkat 🤍
