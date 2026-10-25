<#
Bluade v0.1.0 Windows x64 portable Electron runtime assembler.
No GitHub Actions or electron-builder required. This script runs on Windows.
Requires app.asar produced locally by `npm run build:asar` and the official Electron ZIP.
If -DownloadElectron is supplied, PowerShell downloads the upstream Electron ZIP.
#>
[CmdletBinding()]
param(
  [string]$AppAsar = (Join-Path $PSScriptRoot '..\dist\app.asar'),
  [string]$ElectronZip = (Join-Path $PSScriptRoot '..\dist\electron-v45.0.0-win32-x64.zip'),
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\dist\Bluade-win32-x64'),
  [switch]$DownloadElectron
)
$ErrorActionPreference = 'Stop'
$electronVersion = '45.0.0'
$upstreamURL = "https://github.com/electron/electron/releases/download/v$electronVersion/electron-v$electronVersion-win32-x64.zip"
$expectedSHA = 'AE53887A23BB640369C93DBD38C408A2AF5C0DEB86F2FA76C6C244CB444B7F47'
$expectedBytes = 158223852
$AppAsar = [System.IO.Path]::GetFullPath($AppAsar)
$ElectronZip = [System.IO.Path]::GetFullPath($ElectronZip)
$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)

if (!(Test-Path -LiteralPath $AppAsar -PathType Leaf)) {
  throw "Missing app.asar ($AppAsar). Build locally with: npm run build:asar"
}
if (!(Test-Path -LiteralPath $ElectronZip -PathType Leaf)) {
  if (!$DownloadElectron) {
    throw "Missing Electron runtime ($ElectronZip). Provide the official archive, or specify -DownloadElectron on a network-enabled Windows host."
  }
  New-Item -ItemType Directory -Path (Split-Path -Parent $ElectronZip) -Force | Out-Null
  Write-Host "Downloading official Electron $electronVersion x64 runtime ..."
  Invoke-WebRequest -Uri $upstreamURL -OutFile $ElectronZip -UseBasicParsing
}
$actualBytes = (Get-Item -LiteralPath $ElectronZip).Length
if ($actualBytes -ne $expectedBytes) {
  throw "Electron ZIP size mismatch: expected $expectedBytes bytes, got $actualBytes"
}
$actualSHA = (Get-FileHash -LiteralPath $ElectronZip -Algorithm SHA256).Hash
if ($actualSHA -ne $expectedSHA) {
  throw "Electron ZIP SHA256 mismatch. Expected $expectedSHA; got $actualSHA"
}
if (Test-Path -LiteralPath $OutputDirectory) {
  throw "Refusing to overwrite an existing output directory: $OutputDirectory"
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
try {
  Expand-Archive -LiteralPath $ElectronZip -DestinationPath $OutputDirectory -Force
  if (!(Test-Path -LiteralPath (Join-Path $OutputDirectory 'electron.exe'))) {
    throw 'Electron runtime executable missing from the official archive.'
  }
  New-Item -ItemType Directory -Path (Join-Path $OutputDirectory 'resources') -Force | Out-Null
  Copy-Item -LiteralPath $AppAsar -Destination (Join-Path $OutputDirectory 'resources\app.asar')
  Rename-Item -LiteralPath (Join-Path $OutputDirectory 'electron.exe') -NewName 'Bluade.exe'
  # Do not delete upstream LICENSE/NOTICE/Chromium resources.
  @'
Bluade v0.1.0 — Windows x64 portable preview
Run Bluade.exe in this folder. Keep all adjacent DLLs, locales, resources, and PAK files.
Electron runtime: v45.0.0 (downloaded from electron/electron official releases).
This build was assembled on Windows using a SHA256-verified official Electron runtime.
The executable uses Electron's stock icon until a separate signed/resource-edited build is created.
This preview is unsigned. Windows SmartScreen can warn about unknown publishers.
'@ | Set-Content -LiteralPath (Join-Path $OutputDirectory 'BLUADE-PORTABLE.txt') -Encoding UTF8
  $hash = (Get-FileHash -LiteralPath (Join-Path $OutputDirectory 'resources\app.asar') -Algorithm SHA256).Hash
  Write-Host "Built: $OutputDirectory\Bluade.exe"
  Write-Host "App ASAR SHA256: $hash"
  Write-Host 'Windows live execution/signature validation remains your responsibility.'
} catch {
  Remove-Item -LiteralPath $OutputDirectory -Force -Recurse -ErrorAction SilentlyContinue
  throw
}
