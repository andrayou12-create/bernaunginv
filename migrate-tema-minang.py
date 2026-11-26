#!/usr/bin/env python3
"""
============================================================
BERNAUNG INVITATION — TEMA MINANG MIGRATION SCRIPT
============================================================
Ambil HTML tema Minang dari sumber eksternal (inviee.id /
temuwaktu.unweb.id), download SEMUA asset (CSS, JS, images,
fonts, video, audio, Lottie), rewrite URL ke path lokal,
hapus tracking + WordPress residual, inject script bernaung.

CARA PAKAI:
1. Simpan HTML tema Minang sebagai input.html di folder ini.
2. python3 migrate-tema-minang.py
3. Output: tema-minang/ folder siap upload ke repo.

PRASYARAT:
- Python 3.6+
- pip install requests (atau pakai urllib bawaan)
- Koneksi internet (untuk download asset)
- ~100-200 MB storage (untuk asset)
============================================================
"""
import os, re, sys, json, hashlib
from urllib.parse import urlparse, urljoin

# Coba import requests, fallback ke urllib
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    import urllib.request

# === KONFIGURASI ===
INPUT_FILE = 'input.html'              # file HTML tema Minang
OUTPUT_DIR = 'tema-minang'             # folder output
ASSETS_DIR = os.path.join(OUTPUT_DIR, 'assets')  # subfolder asset
OUTPUT_HTML = os.path.join(OUTPUT_DIR, 'index.html')

# Domain yang SKIP (link fungsional, bukan resource)
SKIP_DOMAINS = [
    'api.whatsapp.com', 'wa.me',
    'maps.app.goo.gl', 'maps.google.com', 'www.google.com/maps',
    'instagram.com', 'www.instagram.com',
    'youtube.com', 'www.youtube.com', 'youtu.be',
    'calendar.google.com', 'www.google.com/calendar',
    'facebook.com', 'www.facebook.com',
    'tiktok.com', 'www.tiktok.com',
    'temuwaktu.id', 'temuwaktu.unweb.id',  # WP site — skip semua
    'api.w.org', 's.w.org',               # WordPress emoji
    'ogp.me', 'rankmath.com', 'schema.org',
    'serif.com', 'www.serif.com',
    'googletagmanager.com',               # tracking
    'cloudflareinsights.com',             # tracking
    'ourevent.vip', 'app.ourevent.vip',   # barcode API (WP-specific)
]

# Pattern script block yang REMOVE sepenuhnya
REMOVE_SCRIPT_PATTERNS = [
    # Google Analytics
    r'<script\s+async[^>]*googletagmanager[^>]*></script>',
    r'<script>[^<]*gtag\([^<]*</script>',
    # Cloudflare beacon
    r'<script[^>]*cloudflareinsights[^>]*></script>',
    # WP emoji loader
    r'<script[^>]*wp-emoji[^>]*>.*?</script>',
    r'<script\s+type="module"[^>]*>.*?wpEmojiSettings.*?</script>',
    # Cloudflare challenge
    r'<script>\(function\(\)\{function c\(\).*?</script>',
    # WP speculation rules
    r'<script\s+type="speculationrules">.*?</script>',
]

# File extension yang DOWNLOAD
DOWNLOAD_EXTENSIONS = [
    '.css', '.js', '.mjs',
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp4', '.webm', '.ogg',
    '.mp3', '.wav', '.m4a',
    '.json',  # Lottie animations
]

# === UTIL ===
def fetch_url(url, timeout=30):
    """Download URL content, return bytes atau None."""
    try:
        if HAS_REQUESTS:
            r = requests.get(url, timeout=timeout, headers={
                'User-Agent': 'Mozilla/5.0 (BernaungMigration/1.0)'
            })
            if r.status_code == 200:
                return r.content
            return None
        else:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (BernaungMigration/1.0)'
            })
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.read()
    except Exception as e:
        print(f'  WARN: gagal download {url[:80]}: {e}')
        return None

def should_skip(url):
    """Cek apakah URL harus di-skip (link fungsional)."""
    url_lower = url.lower()
    for d in SKIP_DOMAINS:
        if d in url_lower:
            return True
    # skip data: URLs
    if url.startswith('data:'):
        return True
    # skip mailto/tel
    if url.startswith('mailto:') or url.startswith('tel:'):
        return True
    # skip # anchors
    if url.startswith('#'):
        return True
    return False

def should_download(url):
    """Cek apakah URL harus di-download (resource file)."""
    if should_skip(url):
        return False
    # cek extension
    url_lower = url.lower().split('?')[0].split('#')[0]
    for ext in DOWNLOAD_EXTENSIONS:
        if url_lower.endswith(ext):
            return True
    # URL tanpa extension tapi dari domain CDN (mungkin CSS/JS tanpa ext)
    parsed = urlparse(url)
    if any(d in parsed.netloc for d in ['inviee.id', 'unweb.id']):
        path = parsed.path.lower()
        if '/css/' in path or '/js/' in path or '/assets/' in path:
            return True
    return False

def url_to_local_path(url):
    """Konversi URL eksternal ke path lokal relatif.
    https://hi.inviee.id/wp-content/uploads/x.webp
    -> assets/hi.inviee.id/wp-content/uploads/x.webp
    """
    parsed = urlparse(url)
    domain = parsed.netloc
    path = parsed.path.lstrip('/')
    # gabungkan domain + path
    local = os.path.join(ASSETS_DIR, domain, path)
    return local

def url_to_local_url(url):
    """Konversi URL eksternal ke URL lokal untuk rewrite.
    https://hi.inviee.id/wp-content/uploads/x.webp
    -> assets/hi.inviee.id/wp-content/uploads/x.webp
    """
    parsed = urlparse(url)
    domain = parsed.netloc
    path = parsed.path.lstrip('/')
    # preserve query string untuk cache-busted URLs
    if parsed.query:
        return f'assets/{domain}/{path}?{parsed.query}'
    return f'assets/{domain}/{path}'

def ensure_dir(path):
    """Buat directory jika belum ada."""
    os.makedirs(path, exist_ok=True)

# === MAIN ===
def main():
    if not os.path.exists(INPUT_FILE):
        print(f'ERROR: {INPUT_FILE} tidak ditemukan.')
        print('Simpan HTML tema Minang sebagai input.html di folder ini.')
        sys.exit(1)

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        html = f.read()

    print(f'=== TEMA MINANG MIGRATION ===')
    print(f'Input: {INPUT_FILE} ({len(html)} bytes)')
    print()

    # 1. Hapus script blocks yang tidak perlu
    print('1. Menghapus tracking + WP residual scripts...')
    for pattern in REMOVE_SCRIPT_PATTERNS:
        html = re.sub(pattern, '', html, flags=re.DOTALL | re.IGNORECASE)
    # Hapus <link> ke wp-json, admin-ajax, dll
    html = re.sub(r'<link[^>]*wp-json[^>]*/>', '', html, flags=re.IGNORECASE)
    html = re.sub(r'<link[^>]*api\.w\.org[^>]*/>', '', html, flags=re.IGNORECASE)
    print('   OK')
    print()

    # 2. Ekstrak SEMUA URL dari HTML
    print('2. Mencari semua URL eksternal...')
    # Pattern: tangani \/ escaping di JSON (Elementor pakai \/)
    # Cari di: href, src, url(), data-*, JSON strings
    urls = set()

    # URL biasa (href="...", src="...", url(...))
    for m in re.finditer(r'https?://[^\s"\'<>\\)]+', html):
        urls.add(m.group(0))

    # URL dengan \/ escaping (di JSON data-settings)
    for m in re.finditer(r'https?:\\?/\\?/[^\s"\'<>\\,)]+', html):
        u = m.group(0).replace('\\/', '/').replace('\\/', '/')
        urls.add(u)

    # Filter: hanya yang perlu download
    to_download = sorted([u for u in urls if should_download(u)])
    to_skip = sorted([u for u in urls if should_skip(u)])

    print(f'   Total URL ditemukan: {len(urls)}')
    print(f'   Akan di-download: {len(to_download)}')
    print(f'   Skip (link fungsional): {len(to_skip)}')
    print()

    # 3. Download semua asset
    print('3. Download asset...')
    ensure_dir(ASSETS_DIR)
    downloaded = {}
    failed = []

    for i, url in enumerate(to_download):
        local_path = url_to_local_path(url)
        local_url = url_to_local_url(url)

        # Skip jika sudah ada (idempotent)
        if os.path.exists(local_path):
            downloaded[url] = local_url
            continue

        # Buat directory
        ensure_dir(os.path.dirname(local_path))

        # Download
        print(f'  [{i+1}/{len(to_download)}] {url[:80]}...', end=' ')
        data = fetch_url(url)
        if data:
            with open(local_path, 'wb') as f:
                f.write(data)
            downloaded[url] = local_url
            print(f'OK ({len(data)} bytes)')
        else:
            failed.append(url)
            print('FAIL')

    print(f'   Downloaded: {len(downloaded)}, Failed: {len(failed)}')
    print()

    # 4. Rewrite semua URL di HTML
    print('4. Rewrite URL ke path lokal...')
    rewrite_count = 0

    # Rewrite URL biasa (https://domain/path)
    for url, local_url in downloaded.items():
        # Handle both normal URL and \/ escaped version
        escaped_url = url.replace('/', '\\/')
        count = html.count(url)
        if count > 0:
            local_escaped = local_url.replace('/', '\\/')
            html = html.replace(url, local_url)
            html = html.replace(escaped_url, local_escaped)
            rewrite_count += count

    # Rewrite URL yang di-skip tapi tetap perlu local path?
    # Tidak — link fungsional (WA, Maps) tetap eksternal.

    print(f'   {rewrite_count} URL di-rewrite')
    print()

    # 5. Ganti footer branding ke Bernaung Invitation
    print('5. Ganti footer branding ke Bernaung Invitation...')
    footer_replacements = [
        # Logo Temu Waktu -> Bernaung logo
        ('Temu-Waktu-Logo-Official-White-1x.webp', '/assets.bernaung.id/loading-bernaung.jpeg'),
        # Link Temu Waktu -> Bernaung
        ('href="https://temuwaktu.id/"', 'href="https://bernaunginv.my.id/"'),
        ('href="https://temuwaktu.unweb.id/music-library"', 'href="#"'),
        # Teks "Made with ❤️ by Temu Waktu" -> Bernaung
        ('Made with', 'Made with'),
        ('by Temu Waktu', 'by Bernaung Invitation'),
        ('&#169; Temu Waktu', '&#169; Bernaung Invitation'),
        ('&copy; Temu Waktu', '&copy; Bernaung Invitation'),
        # Social media links -> Bernaung
        ('href="https://api.whatsapp.com/send?phone=628139299911"', 'href="https://api.whatsapp.com/send?phone=6282324137816"'),
        ('href="https://www.instagram.com/temu_waktu"', 'href="https://www.instagram.com/bernaung.inv/"'),
        ('href="https://www.tiktok.com/@temu.waktu"', 'href="https://www.instagram.com/bernaung.inv/"'),
        # Music credit text -> hapus link, jadi teks biasa
        ('Urang Minang Baralek Gadang - Randy Chow Ft. Yeyen Zymra lagu Minang', 'Musik Undangan'),
        ('https://temuwaktu.unweb.id/music-library', '#'),
        # Hapus "Temu Waktu" dari title credit
        ('>Temu Waktu<', '>Bernaung Invitation<'),
        # Favicon Temu Waktu -> Bernaung
        ('Temu-Waktu-Favicon.webp', '/assets.bernaung.id/favicon.png'),
    ]
    footer_count = 0
    for old, new in footer_replacements:
        c = html.count(old)
        if c > 0:
            html = html.replace(old, new)
            footer_count += c
    print(f'   {footer_count} replacement di-footer')
    print()

    # 6. Inject bernaung scripts
    print('6. Inject bernaung scripts...')
    # Tambah edit-overrides.js + data.js sebelum </body>
    bernaung_scripts = '''
<!-- === BERNAUNG INVITATION INTEGRATION === -->
<script src="data.js"></script>
<script src="/assets.bernaung.id/edit-overrides.js"></script>
<script src="/assets.bernaung.id/rsvp.js"></script>
<!-- === END BERNAUNG === -->
'''
    html = html.replace('</body>', bernaung_scripts + '\n</body>')
    print('   OK')
    print()

    # 7. Save output
    print('7. Save output...')
    ensure_dir(OUTPUT_DIR)
    with open(OUTPUT_HTML, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'   Saved: {OUTPUT_HTML} ({len(html)} bytes)')
    print()

    # Summary
    print('=== SUMMARY ===')
    print(f'Output folder: {OUTPUT_DIR}/')
    print(f'  index.html: {len(html)} bytes')
    total_size = 0
    for root, dirs, files in os.walk(OUTPUT_DIR):
        for fn in files:
            fp = os.path.join(root, fn)
            total_size += os.path.getsize(fp)
    print(f'  Total size: {total_size / 1024 / 1024:.1f} MB')
    print(f'  Assets downloaded: {len(downloaded)}')
    if failed:
        print(f'  Failed downloads: {len(failed)}')
        for f in failed[:5]:
            print(f'    - {f[:80]}')
    print()
    print('SELANJUTNYA:')
    print('1. Upload folder tema-minang/ ke repo GitHub')
    print('2. Buka panel admin → tab Katalog → + TAMBAH TEMA BARU')
    print('   ID: tema-minang')
    print('3. Klik EDIT MAPPING di baris tema-minang')
    print('   Pilih field untuk tiap frasa demo + path foto')
    print('4. SIMPAN KATALOG + SIMPAN MAPPING')
    print('5. Test: buat customer baru dengan tema-minang')

if __name__ == '__main__':
    main()
