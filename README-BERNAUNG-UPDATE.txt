================================================================
BERNAUNG INVITATION — PAKET PERBAIKAN & TEMA BARU
Tanggal: 22 November 2026
================================================================

ISI PAKET (semua file mengikuti struktur repo — tinggal
diekstrak di atas salinan repo Anda, lalu commit & push):

1. PERBAIKAN TEMA DENGAN FOTO DI PANEL ADMIN  (assets.bernaung.id/admin.js)
   Sebelumnya: regex pengganti teks bisa "melompat" melewati tag
   HTML apa pun, sehingga satu frasa demo (mis. "Putra dari Bapak
   Andi dan Ibu Rina") menelan ratusan karakter markup di antara
   dua kata — elemen <div>/<h2>/<p> terhapus dan layout tema foto
   jadi kacau (detail pengantin sampai acara).
   Sekarang: penggantian berbasis DOM. Frasa hanya diganti pada
   TEKS, struktur markup dijamin utuh (diuji otomatis pada 10 tema:
   div/section/h2/p/img tidak ada yang hilang).

2. DATA DETAIL PENGANTIN & ACARA LEBIH LENGKAP (admin.js + theme-map.json)
   - Tanggal hero (heroDateLong/Short) kini ikut terganti otomatis
     dari tanggal acara yang Anda isi.
   - "Putra/Putri dari Bapak ... dan Ibu ..." dirangkai otomatis
     dari kolom Ayah/Ibu bila kolom gabungan kosong.
   - Slot yang memakai frasa demo sama (tanggal akad vs resepsi,
     IG pria vs IG wanita, foto mempelai vs galeri) kini dibagi
     rata sesuai urutan — label Akad/Resepsi tidak lagi tertukar
     dan foto tidak menyebar ke slot lain.
   - theme-map.json: path foto demo tema-vintage diperbaiki
     (sebelumnya menunjuk file yang tidak ada) + aturan tanggal
     bagian akad/resepsi tema-special03 ditambahkan.

3. MUSIK KATALOG TIDAK BERBUNYI LAGI (katalog.html)
   Kartu pratinjau tema kini memakai iframe sandbox tanpa script
   dan semua audio/video di dalamnya dibisukan. Musik demo tidak
   akan berbunyi serentak saat katalog dibuka.

4. KATALOG BISA DIBUKA DI HALAMAN YANG SAMA (index.html)
   Tombol LIHAT KATALOG tidak lagi pindah halaman. Katalog
   tersembunyi dulu; setelah ditekan, katalog muncul di bawah
   tombol (pola yang sama seperti "kirim hadiah" di undangan).
   Tombol berubah menjadi TUTUP KATALOG. Link "Buka katalog
   dalam halaman penuh" tetap tersedia.

5. FOOTER BERNAUNG DI SEMUA UNDANGAN
   - 12 tema existing sudah ber-footer (tidak diubah).
   - 8 undangan customer lama yang belum ber-footer kini
     ditambahkan footer (folder customer/...).
   - Folder Wedding TIDAK disentuh sama sekali.

6. 4 TEMA BARU TERHUBUNG PENUH KE PANEL ADMIN
   (terinspirasi kategori populer, dibuat orisinal — aset foto demo
   memakai file yang sudah ada di repo):
   - tema-luxury02     : Luxury Gold 2 (Premium, dengan foto)
   - tema-motion01     : 3D Motion Rose (Tema Baru, foto + kelopak 3D)
   - tema-interaktif01 : Interaktif Amplop (Tema Baru, sampul amplop terbuka)
   - tema-nofoto01     : Elegan Tanpa Foto (Minimalis, monogram)
   Semuanya sudah punya: nama tamu (?to=), hitung mundur, detail
   mempelai, waktu & tempat + Google Maps + Simpan Tanggal, love
   story, galeri, amplop digital + salin rekening, kirim kado,
   RSVP otomatis (rsvp.js), musik + tombol musik, dan footer.
   Sudah terdaftar di catalog.json + theme-map.json — langsung
   bisa dipilih di tab Customer Baru.

CARA UPLOAD KE GITHUB (GitHub Desktop):
   1. Buka GitHub Desktop > File > Clone repository > bernaunginv
      (atau buka folder repo yang sudah ada).
   2. Ekstrak ZIP ini di dalam folder repo, timpa file lama.
   3. Kembali ke GitHub Desktop: semua perubahan akan terlihat.
   4. Isi ringkasan commit, mis. "Fix tema foto + katalog + 4 tema baru".
   5. Klik "Commit to main", lalu "Push origin".

TANPA GITHUB DESKTOP (upload web):
   1. Ekstrak ZIP ini di komputer.
   2. Di github.com > repo bernaunginv > Add file > Upload files.
   3. Seret SEMUA folder/file hasil ekstraksi (folder customer,
      tema-..., assets.bernaung.id, index.html, katalog.html,
      catalog.json) ke area upload — file yang sama otomatis
      menimpa yang lama.
   4. Commit changes.

CATATAN:
   - Demo foto tema baru menunjuk gambar yang sudah ada di repo
     (tema-deluxe, assets.bernaung.id). Saat generate undangan
     customer, foto demo otomatis diganti foto customer.
   - Musik demo tema baru menunjuk /tema-deluxe/nuca-masaini.mp3.
     Bisa diganti musik sendiri lewat form admin saat generate.
================================================================
