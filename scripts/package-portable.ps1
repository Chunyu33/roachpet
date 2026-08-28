$ErrorActionPreference = "Stop"

chcp 65001 | Out-Null
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $projectRoot

# 便携版只需要 Tauri 可执行文件，Tauri 会通过 beforeBuildCommand 构建并嵌入前端资源。
npx tauri build --no-bundle
if ($LASTEXITCODE -ne 0) {
  throw "Tauri portable build failed with exit code $LASTEXITCODE"
}

$releaseDirectory = Join-Path $projectRoot "src-tauri\target\release"
$executablePath = Join-Path $releaseDirectory "roachpet.exe"
$frontendEntry = Join-Path $projectRoot "dist\index.html"

if (-not (Test-Path -LiteralPath $frontendEntry)) {
  throw "Frontend assets were not generated: $frontendEntry"
}

$portableDirectory = Join-Path $releaseDirectory "portable\RoachPet-1.0.0-windows-x64"
$bundleDirectory = Join-Path $releaseDirectory "bundle"
$archivePath = Join-Path $bundleDirectory "RoachPet-1.0.0-windows-x64-portable.zip"

if (-not (Test-Path $executablePath)) {
  throw "Release executable was not generated: $executablePath"
}

if (Test-Path $portableDirectory) {
  Remove-Item -LiteralPath $portableDirectory -Recurse -Force
}
if (Test-Path $archivePath) {
  Remove-Item -LiteralPath $archivePath -Force
}

# --no-bundle 不会创建 bundle 目录，先显式创建再写入便携 ZIP。
New-Item -ItemType Directory -Path $bundleDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $portableDirectory -Force | Out-Null
Copy-Item -LiteralPath $executablePath -Destination (Join-Path $portableDirectory "RoachPet.exe")

$portableReadme = @"
RoachPet 1.0.0 便携版

RoachPet 是一只会在桌面上乱爬的广东蟑螂桌宠。

使用方法：
1. 解压整个压缩包。
2. 双击 RoachPet.exe 启动。
3. 在系统托盘中右键 RoachPet 图标，可打开设置或退出程序。

运行要求：
- Windows 10 或更高版本
- 已安装 Microsoft Edge WebView2 Runtime

本版本无需安装，不包含自动更新功能。
"@
Set-Content -LiteralPath (Join-Path $portableDirectory "README.txt") -Value $portableReadme -Encoding utf8

Compress-Archive -Path (Join-Path $portableDirectory "*") -DestinationPath $archivePath -CompressionLevel Optimal
Write-Host "Portable archive created: $archivePath"
