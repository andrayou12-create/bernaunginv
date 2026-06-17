# Script reorganisasi proyek HTML
# Mengorganisir folder tema, assets, dan admin

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
cd $scriptDir

# Create necessary directories if they don't exist
if (-not (Test-Path ".\tema")) { New-Item -ItemType Directory -Name "tema" -Force | Out-Null }
if (-not (Test-Path ".\assets")) { New-Item -ItemType Directory -Name "assets" -Force | Out-Null }
if (-not (Test-Path ".\assets\images")) { New-Item -ItemType Directory -Path ".\assets\images" -Force | Out-Null }

Write-Host "=== Memulai Reorganisasi Proyek HTML ===" -ForegroundColor Green

# Move template folders to tema/
$themefolders = @("tema-jawa", "tema-jawa2", "tema-jawanopict", "tema-netflix", "tema-spotify", "tema-deluxe", "tema-simple", "latif-erna", "pengecekan1", "Tes Tanpafoto")

foreach ($folder in $themefolders) {
    if (Test-Path ".\$folder") {
        Write-Host "Memindahkan $folder ke tema/" -ForegroundColor Yellow
        Move-Item -Path ".\$folder" -Destination ".\tema\$folder" -Force -ErrorAction SilentlyContinue
    }
}

# Move images to assets/
if (Test-Path ".\images") {
    Write-Host "Memindahkan images/ ke assets/" -ForegroundColor Yellow
    Get-ChildItem ".\images" | Move-Item -Destination ".\assets\images" -Force
}

Write-Host "=== Reorganisasi Selesai ===" -ForegroundColor Green
Write-Host "Struktur baru telah dibuat. Sekarang perlu update HTML paths..." -ForegroundColor Cyan
