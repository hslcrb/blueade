# Local Electron packaging / 직접 패키징 기록

**2026-10-25** · Bluade v0.1.0 · source-preview only

## What was actually produced here

- `npm run build:asar`: builds a deterministic Electron `app.asar` using only the local Node runtime and installed JSZip dependency. Includes app code, license-bearing JSZip dependencies, brand assets, and package.json. Includes SHA-256 metadata for each file, validated before publishing the artifact.
- `npm run check`: seven tests including deterministic package creation and single-byte corruption detection.
- `/mnt/data/Bluade-v0.1.0-Electron-app-bundle.zip`: an *application bundle*, **not** an executable or a Windows installer.

**This container cannot build a real `Bluade.exe`** with the current inputs. Its DNS resolution of `registry.npmjs.org`/`github.com` fails, and Electron, electron-builder, Wine, Windows SDK/MinGW and the Electron Windows runtime are not installed or cached. Attempting `npm run dist:win` fails with `electron-builder: not found`.

## How to assemble a real Windows portable EXE without GitHub Actions

The official Electron Windows x64 runtime is publicly available here:

https://github.com/electron/electron/releases/download/v45.0.0/electron-v45.0.0-win32-x64.zip

The exact upstream file was checked against the GitHub official release API, not downloaded or verified within this sandbox:

- Filename: `electron-v45.0.0-win32-x64.zip`
- Size: `158223852` bytes
- SHA-256: `ae53887a23bb640369c93dbd38c408a2af5c0deb86f2fa76c6c244cb444b7f47`

On Windows (PowerShell 5.1+), using **the offline-built `dist/app.asar`** and original source scripts:

```powershell
# If you haven't already built the ASAR (Node.js required):
npm ci
npm run build:asar

# Build the portable directory. Downloads official Electron only on Windows,
# verifies size & SHA-256 before use. No GitHub-hosted build is involved.
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/assemble-win32.ps1 -DownloadElectron

# Result: dist/Bluade-win32-x64/Bluade.exe
# To distribute, ZIP the *entire* Bluade-win32-x64 directory, not just the EXE.
```

Alternatively, download the official ZIP manually to `dist/electron-v45.0.0-win32-x64.zip` and omit `-DownloadElectron`. **Never run a runtime archive that fails hash verification.** The official Electron runtime is ~158MB compressed and is needed because `app.asar` is only the application payload.

The PowerShell script does not modify the stock Electron icon or digitally sign the executable. The portable result must be smoke-tested on a Windows PC before calling it a release. This workflow is independent of GitHub Actions and electron-builder. See `docs/WINDOWS_BUILD.md` for installer alternatives.

## Publishing policy

- No fake EXE, incomplete bootstrap stub, or ZIP mislabeled as a runnable Windows binary.
- CI remains fully commented out by request; the auto-merge gate must fail closed while CI is disabled.
- The GitHub integration available to this session can write repository files and PRs, **but cannot create a GitHub Release or upload binary release assets**. Do not claim a GitHub Release was published through it.
- The source and builder changes can be committed and merged; the local `app.asar` can be linked from the chat as a reproducible intermediate output.
