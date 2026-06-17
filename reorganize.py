#!/usr/bin/env python3
"""
Script reorganisasi proyek HTML
Mengorganisir folder tema, assets, dan admin
"""

import os
import shutil
from pathlib import Path

def reorganize():
    """Reorganisasi struktur proyek"""
    
    # Dapatkan direktori kerja saat ini
    base_path = Path.cwd()
    
    print("=== Memulai Reorganisasi Proyek HTML ===")
    print(f"Lokasi proyek: {base_path}")
    
    # Buat direktori jika belum ada
    tema_dir = base_path / "tema"
    assets_dir = base_path / "assets"
    assets_images_dir = assets_dir / "images"
    
    tema_dir.mkdir(exist_ok=True)
    assets_dir.mkdir(exist_ok=True)
    assets_images_dir.mkdir(exist_ok=True)
    
    print("\n✅ Direktori dibuat:")
    print(f"  - {tema_dir}")
    print(f"  - {assets_dir}")
    
    # List template folders yang akan dipindahkan
    theme_folders = [
        "tema-jawa", "tema-jawa2", "tema-jawanopict", 
        "tema-netflix", "tema-spotify", "tema-deluxe", 
        "tema-simple", "latif-erna", "pengecekan1", "Tes Tanpafoto"
    ]
    
    # Pindahkan folder tema
    print("\n📦 Memindahkan folder tema...")
    for folder in theme_folders:
        src = base_path / folder
        if src.exists():
            dst = tema_dir / folder
            if not dst.exists():
                shutil.move(str(src), str(dst))
                print(f"  ✓ {folder} → tema/{folder}")
            else:
                print(f"  ⚠ {folder} sudah ada di tema/")
    
    # Pindahkan file gambar dari images ke assets
    print("\n🖼️  Memindahkan gambar ke assets...")
    images_dir = base_path / "images"
    if images_dir.exists():
        for img_file in images_dir.glob("*"):
            if img_file.is_file():
                dst = assets_images_dir / img_file.name
                shutil.move(str(img_file), str(dst))
                print(f"  ✓ {img_file.name} → assets/images/")
        
        # Hapus folder images jika kosong
        try:
            images_dir.rmdir()
            print("  ✓ Folder images dihapus (sudah kosong)")
        except OSError:
            print("  ⚠ Folder images tidak kosong atau masih ada file")
    
    print("\n=== Reorganisasi Selesai ===")
    print("\n📋 Struktur baru telah dibuat!")
    print("Pastikan melakukan test semua link di index.html")

if __name__ == "__main__":
    try:
        reorganize()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
