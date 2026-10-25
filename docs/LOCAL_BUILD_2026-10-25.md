# Bluade 로컬 패키징 실행 기록 · 2026-10-25

> **결과: 앱 번들(app.asar) 생성 성공 / Windows EXE 생성 불가**. CI 원본 주석 상태 유지.

## 검증된 실행 환경

- Linux x86_64, Node.js 22.16.0, npm 10.9.2
- JSZip 및 순수 JS 런타임 의존성 설치됨
- Electron, electron-builder, Wine, Docker, Windows cross compiler 미설치
- `registry.npmjs.org`, `github.com`: 호스트 이름 확인 실패 (DNS)
- `npm run dist:win`: `electron-builder: not found` (실패)
- GitHub Actions는 호출하지 않았음

## 이번 실행에서 생성한 산출물

| 구분 | 상태 |
| --- | --- |
| `dist/app.asar` | **생성 성공**, 1,968,321 bytes |
| ASAR 포함 파일 | **177/177 SHA256 확인** |
| Node 기능·패키징 검사 | **8/8 통과** |
| 앱 번들 SHA256 | `643bf1c8b1b63d1b5fe4b9989b28b588c21d7da1f0d032ca1fedf48fc2c4afce` |
| Windows 설치 EXE/포터블 EXE | **미생성** |
| Windows Electron 실제 실행 테스트 | **미수행** |

앱 번들은 Electron의 Pickle+JSON 헤더 형식을 사용하여 **이 Linux 컨테이너 안에서 직접 생성**한 산출물입니다. ASAR 자체가 실행파일은 아닙니다.

## 공식 Windows Electron 런타임

- Upstream release: [electron v45.0.0](https://github.com/electron/electron/releases/tag/v45.0.0)
- Archive: `electron-v45.0.0-win32-x64.zip`
- Size: `158223852` bytes
- Release SHA256: `ae53887a23bb640369c93dbd38c408a2af5c0deb86f2fa76c6c244cb444b7f47`

해당 해시는 GitHub 공식 Release API의 `digest` 값에서 확인했습니다. **현재 환경에서 바이너리 원본을 다운로드하거나 자체 해시 비교하지는 못했습니다.**

## 실행 명령

```bash
npm run check
npm run build:asar
```

Windows에서 공식 Electron 런타임을 설치 없이 검증·조립하는 방법은 [OFFLINE_ELECTRON_BUNDLE.md](OFFLINE_ELECTRON_BUNDLE.md)를 참조하세요. 이 문서는 **성공하지 않은 Windows EXE를 업로드했다고 주장하지 않기 위한** 증빙입니다.

GitHub Releases에 바이너리를 업로드하려면 실제 바이너리와 Release 생성·업로드 권한이 필요하며, 현 연결된 GitHub 도구에는 해당 바이너리 업로드 기능이 제공되지 않습니다.

## Linux 순수 조립 경로 추가

- `scripts/assemble-win32-from-zip.cjs`: **Wine·electron-builder 없이도** 공식 Electron Windows ZIP + 본 환경에서 빌드한 `app.asar`만 있으면 `Bluade.exe`를 조립하도록 구현했습니다.
- `test/offline-runtime.test.js`: 공식 ZIP이 없거나 잘못된 크기일 경우 산출 디렉터리를 만들지 않고 실패하는 테스트. 총 **8/8 통과**.
- 실제 조립 실패 원인은 Electron ZIP `dist/electron-v45.0.0-win32-x64.zip`의 부재입니다. 다운로드 서버 DNS 실패로 이 세션에서 확보하지 못했습니다. **EXE/설치파일이 생성됐다는 의미가 아닙니다.**
