$ErrorActionPreference = "Stop"

chcp 65001 | Out-Null
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $projectRoot

# 便携版只需要 Tauri 可执行文件，Tauri 会通过 beforeBuildCommand 构建并嵌入前端资源。
npx tauri build --no-bundle

$releaseDirectory = Join-Path $projectRoot "src-tauri\target\release"
$executablePath = Join-Path $releaseDirectory "roachpet.exe"
$frontendEntry = Join-Path $projectRoot "dist\index.html"

if (-not (Test-Path -LiteralPath $frontendEntry)) {
  throw "Frontend assets were not generated: $frontendEntry"
}

$portableDirectory = Join-Path $releaseDirectory "portable\RoachPet-1.0.0-windows-x64"
$archivePath = Join-Path $releaseDirectory "bundle\RoachPet-1.0.0-windows-x64-portable.zip"

if (-not (Test-Path $executablePath)) {
  throw "Release executable was not generated: $executablePath"
}

if (Test-Path $portableDirectory) {
  Remove-Item -LiteralPath $portableDirectory -Recurse -Force
}
if (Test-Path $archivePath) {
  Remove-Item -LiteralPath $archivePath -Force
}

New-Item -ItemType Directory -Path $portableDirectory -Force | Out-Null
Copy-Item -LiteralPath $executablePath -Destination (Join-Path $portableDirectory "RoachPet.exe")

$portableReadme = @"
RoachPet 1.0.0 - Portable Windows build

Run RoachPet.exe directly. No installation is required.

Requirements:
- Windows 10 or later
- Microsoft Edge WebView2 Runtime

RoachPet does not include automatic updates.
"@
Set-Content -LiteralPath (Join-Path $portableDirectory "README.txt") -Value $portableReadme -Encoding utf8

Compress-Archive -Path (Join-Path $portableDirectory "*") -DestinationPath $archivePath -CompressionLevel Optimal
Write-Host "Portable archive created: $archivePath"
