#!/usr/bin/env python3
"""
Fix tema-minang theme-map entry + catalog foto flag.
Corrects wrong mappings, adds missing fields, adds hide rules.
"""
import json, sys, os

try:
    import requests
except ImportError:
    print('pip install requests'); sys.exit(1)

REPO = 'andrayou12-create/bernaunginv'
BRANCH = 'main'

# === CORRECTED tema-minang theme-map entry ===
MINANG_ENTRY = {
    "label": "Tema Minang",
    "map": [
        # Identity
        {"k": "title", "f": "Minang Elegance"},
        {"k": "heroNames", "f": "Yunita & Riyan"},
        {"k": "heroDateShort", "f": "31 . 12 . 2026"},
        {"k": "heroDateLong", "f": "31 Desember 2026"},

        # Bride
        {"k": "brideNick", "f": "Yunita"},
        {"k": "brideFull", "f": "Yunita Safitri, S.Pd."},
        {"k": "brideParents", "f": "Bapak Adi Nugroho & Ibu Gani"},
        {"k": "brideIg", "f": "mempelai"},

        # Groom
        {"k": "groomNick", "f": "Riyan"},
        {"k": "groomFull", "f": "Riyan Kuswoyo, S.T."},
        {"k": "groomParents", "f": "Bapak Sufian Jamal & Ibu Elmira"},
        {"k": "groomIg", "f": "mempelai"},

        # Akad
        {"k": "akadDayName", "f": "Kamis"},
        {"k": "akadDayDate", "f": "31 Desember 2026"},
        {"k": "akadTime", "f": "08.00 WIB"},
        {"k": "akadPlace", "f": "Auditorium Masjid"},

        # Resepsi (same date/place as akad)
        {"k": "resDayName", "f": "Kamis"},
        {"k": "resDayDate", "f": "31 Desember 2026"},
        {"k": "resTime", "f": "09.00 - Selesai"},

        # Address (appears in both Akad & Resepsi sections)
        {"k": "address", "f": "Jalan Raya Bojongsari No.5,"},

        # Countdown
        {"k": "countdownDate", "f": "Dec 31 2026 8:00:00"},

        # Gift / Bank
        {"k": "gift1Name", "f": "Anita Safitri"},
        {"k": "gift1Number", "f": "0123456789"},
        {"k": "gift2Name", "f": "Olga Kuswoyo"},
        {"k": "gift2Number", "f": "0987654321"},

        # Photos — bride/groom/closing
        {"k": "fotoBride", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/2130c1eb94bf7767173970321cca0a89/2025/02/Minang-1-cpw.webp"},
        {"k": "fotoGroom", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/2130c1eb94bf7767173970321cca0a89/2025/02/Minang-1-cpp.webp"},
        {"k": "fotoCouple", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/2130c1eb94bf7767173970321cca0a89/2025/02/Minang-8.webp"},
        {"k": "fotoCover", "f": "assets/hi.inviee.id/wp-content/uploads/2024/08/Minang-14-fi.webp"},

        # Gallery (12 images in Elementor gallery widget)
        {"k": "fotoGallery1", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/84cb229c89ffc48c997467fdcc5c262d/2025/02/Balinese-1.webp"},
        {"k": "fotoGallery2", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/84cb229c89ffc48c997467fdcc5c262d/2025/02/Balinese-2.webp"},
        {"k": "fotoGallery3", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/84cb229c89ffc48c997467fdcc5c262d/2025/02/Balinese-3.webp"},
        {"k": "fotoGallery4", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/84cb229c89ffc48c997467fdcc5c262d/2025/02/Balinese-7.webp"},
        {"k": "fotoGallery5", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/84cb229c89ffc48c997467fdcc5c262d/2025/02/Balinese-8.webp"},
        {"k": "fotoGallery6", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/84cb229c89ffc48c997467fdcc5c262d/2025/02/Balinese-9.webp"},
        {"k": "fotoGallery7", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/84cb229c89ffc48c997467fdcc5c262d/2025/02/Balinese-10.webp"},
        {"k": "fotoGallery8", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/84cb229c89ffc48c997467fdcc5c262d/2025/02/Balinese-11.webp"},
        {"k": "fotoGallery9", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/84cb229c89ffc48c997467fdcc5c262d/2025/02/Balinese-12.webp"},
        {"k": "fotoGallery10", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/84cb229c89ffc48c997467fdcc5c262d/2025/02/Balinese-13.webp"},
        {"k": "fotoGallery11", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/84cb229c89ffc48c997467fdcc5c262d/2025/02/Balinese-14.webp"},
        {"k": "fotoGallery12", "f": "assets/hi.inviee.id/wp-content/uploads/jet-form-builder/84cb229c89ffc48c997467fdcc5c262d/2025/02/Balinese-17.webp"},
    ],
    "hide": [
        # Love story — hide when no love stories filled
        {"k": ["_love"], "f": ["Our Story"]},
        # Wedding Gift — hide when both gift numbers empty
        {"k": ["gift1Number", "gift2Number"], "f": ["Wedding Gift"]},
        # Kirim Kado — hide when kado fields empty
        {"k": ["kadoName", "kadoPhone", "kadoAddress"], "f": ["KIRIM KADO"]},
        # Ngunduh Mantu — always hide (field doesn't exist in form → always empty)
        {"k": ["ngunduhMantu"], "f": ["Ngunduh Mantu"]},
        # Dress Code — always hide
        {"k": ["dressCode"], "f": ["Dress Code"]},
        # Live Streaming — always hide
        {"k": ["liveStreaming"], "f": ["Live Streaming"]},
    ]
}

def main():
    print('=== FIX TEMA-MINANG ===')

    # 1. Fetch theme-map.json
    url = f'https://raw.githubusercontent.com/{REPO}/{BRANCH}/assets.bernaung.id/theme-map.json'
    print(f'1. Fetch theme-map.json...')
    r = requests.get(url, timeout=30)
    tm = r.json()
    print(f'   OK ({len(tm.get("themes", {}))} tema)')

    # 2. Replace tema-minang entry
    old = tm['themes'].get('tema-minang', {})
    print(f'2. Old tema-minang: {len(old.get("map",[]))} map, {len(old.get("hide",[]))} hide')
    tm['themes']['tema-minang'] = MINANG_ENTRY
    print(f'   New tema-minang: {len(MINANG_ENTRY["map"])} map, {len(MINANG_ENTRY["hide"])} hide')

    # 3. Save theme-map.json
    os.makedirs('assets.bernaung.id', exist_ok=True)
    with open('assets.bernaung.id/theme-map.json', 'w', encoding='utf-8') as f:
        json.dump(tm, f, indent=2, ensure_ascii=False)
    print(f'3. Saved: assets.bernaung.id/theme-map.json')

    # 4. Fetch catalog.json
    cat_url = f'https://raw.githubusercontent.com/{REPO}/{BRANCH}/catalog.json'
    print(f'4. Fetch catalog.json...')
    r2 = requests.get(cat_url, timeout=30)
    cat = r2.json()

    # 5. Fix tema-minang catalog entry (foto: true)
    for t in cat.get('themes', []):
        if t['id'] == 'tema-minang':
            old_foto = t.get('foto')
            t['foto'] = True
            t['note'] = 'Dengan foto, video motion, galeri'
            print(f'5. Fixed catalog: foto {old_foto} -> True')
            break

    # 6. Save catalog.json
    with open('catalog.json', 'w', encoding='utf-8') as f:
        json.dump(cat, f, indent=2, ensure_ascii=False)
    print(f'6. Saved: catalog.json')

    print()
    print('=== SUMMARY ===')
    print(f'theme-map: tema-minang {len(MINANG_ENTRY["map"])} map + {len(MINANG_ENTRY["hide"])} hide')
    print(f'catalog: tema-minang foto=True')
    print()
    print('FIXES:')
    print('- Removed WRONG: groomFull->Olga Kuswoyo, brideFull->Anita Safitri')
    print('- Removed WRONG: resDayDate->15 Februari 2020 (love story date)')
    print('- Removed WRONG: resPlace->Kediaman Mempelai Pria (Ngunduh Mantu)')
    print('- Removed WRONG: 3x fotoCouple (now 1)')
    print('- Removed WRONG: fotoGallery1-5 pointed to love story photos')
    print('- Added: gift1Name, gift2Name, resDayDate, resPlace, address')
    print('- Added: countdownDate, title, fotoCover')
    print('- Added: fotoGallery1-12 (correct gallery paths)')
    print('- Added: 6 hide rules (Our Story, Wedding Gift, KIRIM KADO,')
    print('  Ngunduh Mantu, Dress Code, Live Streaming)')
    print('- Fixed: catalog foto None -> True')
    print()
    print('UPLOAD:')
    print('1. assets.bernaung.id/theme-map.json -> overwrite')
    print('2. catalog.json -> overwrite')
    print('3. Commit + Push')

if __name__ == '__main__':
    main()
