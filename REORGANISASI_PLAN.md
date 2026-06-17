# 📋 RENCANA REORGANISASI PROYEK HTML

## Status: Reorganisasi Struktur Folder

### ✅ Langkah yang Sudah Dilakukan:

1. **Buat Folder Baru:**
   - ✅ `/assets` - folder untuk menyimpan semua aset
   - ✅ `/tema` - folder untuk menyimpan semua template

2. **Update Root index.html:**
   - ✅ Ubah `images/cover-adat.gif` → `assets/cover-adat.gif`
   - ✅ Ubah `images/cover-jawa2.gif` → `assets/cover-jawa2.gif`  
   - ✅ Ubah `images/cover-netflix.gif` → `assets/cover-netflix.gif`
   - ✅ Ubah `images/cover-spotify.gif` → `assets/cover-spotify.gif`
   - ✅ Ubah `tema-jawa/index.html` → `tema/tema-jawa/index.html`
   - ✅ Ubah `tema-jawa2/index.html` → `tema/tema-jawa2/index.html`
   - ✅ Ubah `tema-netflix/index.html` → `tema/tema-netflix/index.html`
   - ✅ Ubah `tema-spotify/index.html` → `tema/tema-spotify/index.html`

### ⚠️ Langkah-Langkah Selanjutnya:

Untuk menyelesaikan reorganisasi, jalankan perintah berikut di terminal/command prompt:

```powershell
# Navigasi ke folder proyek
cd "path-to-bernaunginv-folder"

# 1. Pindahkan semua folder tema
Move-Item -Path "tema-jawa" -Destination "tema\tema-jawa" -Force
Move-Item -Path "tema-jawa2" -Destination "tema\tema-jawa2" -Force
Move-Item -Path "tema-jawanopict" -Destination "tema\tema-jawanopict" -Force
Move-Item -Path "tema-netflix" -Destination "tema\tema-netflix" -Force
Move-Item -Path "tema-spotify" -Destination "tema\tema-spotify" -Force
Move-Item -Path "tema-deluxe" -Destination "tema\tema-deluxe" -Force
Move-Item -Path "tema-simple" -Destination "tema\tema-simple" -Force
Move-Item -Path "latif-erna" -Destination "tema\latif-erna" -Force
Move-Item -Path "pengecekan1" -Destination "tema\pengecekan1" -Force
Move-Item -Path "Tes Tanpafoto" -Destination "tema\Tes Tanpafoto" -Force

# 2. Pindahkan file gambar ke assets
Get-ChildItem "images\*" | Move-Item -Destination "assets\" -Force

# 3. Hapus folder images yang sudah kosong
Remove-Item -Path "images" -Force
```

### 📁 Struktur Folder Target:

```
bernaunginv/
├── CNAME
├── index.html (halaman katalog utama)
├── assets/
│   ├── cover-adat.gif
│   ├── cover-jawa2.gif
│   ├── cover-netflix.gif
│   └── cover-spotify.gif
├── tema/
│   ├── tema-jawa/
│   ├── tema-jawa2/
│   ├── tema-jawanopict/
│   ├── tema-netflix/
│   ├── tema-spotify/
│   ├── tema-deluxe/
│   ├── tema-simple/
│   ├── latif-erna/
│   ├── pengecekan1/
│   └── Tes Tanpafoto/
└── reorganize.ps1 (script ini)
```

### 📝 Catatan Penting:

- ✅ Jalur relatif di dalam setiap folder tema sudah internal dan tidak perlu diubah
- ✅ Root index.html sudah diupdate dengan jalur baru
- ⚠️ Pastikan admin/ folder hanya dibuat jika ada file admin
- ⚠️ Setelah move, test semua link untuk memastikan tidak ada yang putus

### 🔗 Links yang Sudah Diupdate:

- Semua link template di index.html sudah mengarah ke `tema/tema-*/`
- Semua referensi gambar sudah mengarah ke `assets/`

---
Generated: 2026-06-18
