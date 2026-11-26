#!/usr/bin/env python3
"""
Fix tema-modern theme-map: tambah foto keys yang missing.
Foto paths di tema-modern sudah lokal (assets/img/) tapi
theme-map.json tidak punya fotoGroom/fotoBride/fotoGallery keys,
sehingga upload foto via panel admin tidak ter-apply ke HTML.

CARA PAKAI:
  python3 fix-tema-modern-mapping.py

Script ini akan:
1. Fetch theme-map.json dari repo GitHub
2. Tambah foto keys ke entry tema-modern
3. Simpan sebagai assets.bernaung.id/theme-map-fixed.json
4. Upload file itu ke repo (overwrite theme-map.json lama)
"""
import json, sys, os

try:
    import requests
except ImportError:
    print('ERROR: pip install requests')
    sys.exit(1)

REPO = 'andrayou12-create/bernaunginv'
BRANCH = 'main'
THEME_MAP_URL = f'https://raw.githubusercontent.com/{REPO}/{BRANCH}/assets.bernaung.id/theme-map.json'

# Foto paths di tema-modern/index.html (sudah lokal)
FOTO_ENTRIES = [
    { "k": "fotoGroom", "f": "assets/img/groom.jpg" },
    { "k": "fotoBride", "f": "assets/img/bride.jpg" },
    { "k": "fotoGallery1", "f": "assets/img/gallery-1.jpg" },
    { "k": "fotoGallery2", "f": "assets/img/gallery-2.jpg" },
    { "k": "fotoGallery3", "f": "assets/img/gallery-3.jpg" },
    { "k": "fotoGallery4", "f": "assets/img/gallery-4.jpg" },
]

def main():
    print('=== FIX TEMA-MODERN THEME-MAP ===')
    print()

    # 1. Fetch current theme-map.json
    print(f'1. Fetch {THEME_MAP_URL}...')
    r = requests.get(THEME_MAP_URL, timeout=30)
    if r.status_code != 200:
        print(f'ERROR: HTTP {r.status_code}')
        sys.exit(1)
    tm = r.json()
    print(f'   OK ({len(tm.get("themes", {}))} tema)')

    # 2. Check tema-modern entry
    themes = tm.get('themes', {})
    if 'tema-modern' not in themes:
        print('ERROR: tema-modern tidak ditemukan di theme-map.json')
        sys.exit(1)

    modern = themes['tema-modern']
    print(f'2. Entry tema-modern saat ini:')
    print(f'   map: {len(modern.get("map", []))} entries')
    print(f'   hide: {len(modern.get("hide", []))} entries')

    # Check if foto keys already exist
    existing_foto = [m for m in modern.get('map', []) if m.get('k', '').startswith('foto')]
    if existing_foto:
        print(f'   foto keys sudah ada: {len(existing_foto)} — tidak perlu fix.')
        return

    # 3. Add foto entries
    print(f'3. Menambah {len(FOTO_ENTRIES)} foto keys...')
    if 'map' not in modern:
        modern['map'] = []
    modern['map'].extend(FOTO_ENTRIES)

    print(f'   map sekarang: {len(modern["map"])} entries')

    # 4. Save
    output = 'assets.bernaung.id/theme-map.json'
    os.makedirs('assets.bernaung.id', exist_ok=True)
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(tm, f, indent=2, ensure_ascii=False)
    print(f'4. Saved: {output}')
    print()

    print('SELANJUTNYA:')
    print(f'1. Upload {output} ke repo, overwrite file lama')
    print(f'   (atau pakai panel: tab Pengaturan → tidak ada editor theme-map,')
    print(f'    jadi manual upload via GitHub Desktop)')
    print(f'2. Atau pakai panel: tab Katalog → EDIT MAPPING di baris tema-modern')
    print(f'   → foto paths akan terdeteksi otomatis → pilih slot → SIMPAN MAPPING')
    print()
    print('Setelah fix, upload foto di form Customer Baru (tema-modern)')
    print('akan otomatis ter-apply ke HTML undangan.')

if __name__ == '__main__':
    main()
