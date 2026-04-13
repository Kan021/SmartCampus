# Smart Campus Launcher
# Starts backend + frontend, then opens Electron window.

$AppDir      = "C:\Users\skani\Desktop\SmartCampus"
$ServerDir   = "$AppDir\server"
$ClientDir   = "$AppDir\client"
$ElectronExe = "$AppDir\node_modules\electron\dist\electron.exe"
$LogDir      = "$AppDir\logs"

# Ensure logs folder exists
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

# ── 1. Kill any stale instances ───────────────────────────────────
Get-NetTCPConnection -LocalPort 5000,5173 -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

# ── 2. Start backend ──────────────────────────────────────────────
$backLog = "$LogDir\server.log"
$back = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm run dev > `"$backLog`" 2>&1" `
    -WorkingDirectory $ServerDir `
    -WindowStyle Hidden `
    -PassThru

# ── 3. Wait for backend to be healthy (up to 45s) ─────────────────
$ready = $false
for ($i = 0; $i -lt 45; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -lt 500) { $ready = $true; break }
    } catch { }
    Start-Sleep -Seconds 1
}

if (-not $ready) {
    [System.Windows.Forms.MessageBox]::Show(
        "Backend server failed to start.`nCheck logs\server.log for details.",
        "Smart Campus Error", 0, 16)
    exit 1
}

# ── 4. Start Vite frontend ────────────────────────────────────────
$frontLog = "$LogDir\client.log"
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npm run dev > `"$frontLog`" 2>&1" `
    -WorkingDirectory $ClientDir `
    -WindowStyle Hidden

# Give Vite 3 seconds to boot
Start-Sleep -Seconds 3

# ── 5. Launch Electron ────────────────────────────────────────────
Start-Process -FilePath $ElectronExe -ArgumentList "`"$AppDir`"" -WorkingDirectory $AppDir
