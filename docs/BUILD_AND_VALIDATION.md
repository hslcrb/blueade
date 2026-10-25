# Implementation & verification log — 2026-10-25

## Implemented / 구현 사항

1. User-provided Alzip screenshot was used for UX reference **only**; no screenshots, proprietary ads, or third-party icons were included in application assets.
2. Electron 45 + JSZip 3.10.1; safe preload-only IPC, no Node APIs in renderer, no network requests in app.
3. Korean ZIP navigation, create/extract/CRC verify, staged files, Windows-safe archive names, no-overwrite atomic publish, cancellation, in-window progress (percent/bytes/speed/ETA/current filename/file count).
4. Bluade B ribbon icon SVG/PNG/ICO + brand guidelines, ad placeholder with light-to-dark gradient and explicit `이곳은 / 광고입니다` labeling.
5. Human + AI contributor documentation, git micro-commit and immediate remote push, semantic branch ancestry, PR/no-ff merge model; CI, optional API-key gated AI review, guarded automatic merge.

## Verified locally

| Check | Result |
| --- | --- |
| `npm test` (Node 22.16, Linux) | **PASS: 6 / 6** |
| `node --check` (main, preload, ZIP engine, UI, CI scripts) | **PASS** |
| ZIP Unicode round-trip and CRC verification | **PASS** |
| ZIP Slip, Windows reserved paths, symlink, no-overwrite | **PASS (covered cases)** |
| CRC tampering: reject and do not leave output | **PASS** |
| Actual Electron window launch | **NOT TESTED** (Electron runtime unavailable locally) |
| Windows executable packaging | **NOT BUILT** (cross-build attempted; blocker below) |
| Windows real-device integration | **NOT TESTED** |

### Linux cross-build attempt

```console
> npm run dist:win
> electron-builder --win nsis zip --x64 --publish never
sh: 1: electron-builder: not found
```

The sandbox has Node/npm but lacks downloaded Electron/electron-builder, Docker/Wine and outbound npm/GitHub DNS; this is an **environment blocker**, not confirmation of an application compile issue. The Windows workflow definition is preserved in `.github/workflows/ci.yml` but **all lines are commented out** by explicit maintainer request; no hosted build is currently scheduled.

### GitHub CI on PR #7

[CI run #40191925227](https://github.com/hslcrb/blueade/actions/runs/40191925227): on 2026-10-25 the `Windows build` and `Node tests` jobs both reported **failure before any steps executed** (empty `steps`, `runner_id=0`); job log download also returned 404. This means there is **no evidence of actual code test/compile failure from that run**, but also **no successful hosted Windows artifact**. Cause is not verified: inspect repository Actions settings, runner availability, billing/limits, and rerun after resolving.

### Local rebuild attempt — maintainer request (2026-10-25)

The Linux x86_64 sandbox was used to directly attempt a Windows build without the GitHub Actions runner. Full terminal output is saved as `Bluade-direct-Windows-build.log` in the downloadable session artifacts, not claimed as a repository binary release.

```text
node v22.16.0 · npm 10.9.2 · Linux x86_64
npm run dist:win: electron-builder: not found (exit 127)
npm run dist:win:portable: electron-builder: not found (exit 127)
npm install --offline --no-audit --no-fund --ignore-scripts: ENOTCACHED
  registry.npmjs.org/electron — package metadata not in cache
Wine / Docker / electron / electron-builder / MinGW: unavailable
dist/: no output files
npm run check: PASS (6 Node regression tests)
```

This is a **blocked cross-build**, not a successfully built Windows program. GitHub CI was disabled by commenting each line, as requested; AI review and merge guard stay fail-closed and cannot treat unavailable CI as passed. No fake or untested EXE is published.

## Release criteria not met yet

- A real native or cross-platform Windows build producing a verifiable EXE/portable ZIP (CI is paused; build must be manual).
- Manual launch, compression/extraction, file association and accessibility check on Windows 11.
- Signing strategy and third-party font license confirmation if a custom font is requested.
- GitHub `main` branch protection and human reviewers; reinstate CI before claiming automated review/merge gates. Optional `BLUADE_AI_REVIEW_KEY` enables real model-driven review; without the key, bot cannot set `ai-reviewed`.

## Git history / PR topology

- PR #1: ZIP engine and IPC
- PR #2: One-window UI
- PR #3: brand, tests and docs
- PR #4: governance + workflow automation
- PR #5: ICO/PNG assets
- PR #6: streaming CRC hardening
- PR #7: initial mainline integration

Each PR #1–#6 was **merge-committed** into `chatgpt/blueade-foundation` (not squash merged). The source files were added in small commits directly to feature branches via the GitHub connector (each remote write equals an immediately pushed commit). The initial PR #7 merge, if carried out despite runner-level CI unavailability, must be documented as an explicit **one-time bootstrap exception**, not evidence that review gates passed.
