# Windows packaging / Windows 패키징

## Windows 네이티브 빌드 (권장)

Node 24 설치 후:

```powershell
npm install
npm run check
npm run dist:win
```

`dist/Bluade-0.1.0-x64.exe`와 ZIP 포터블 패키지가 생성됩니다(설정·버전별 파일명은 다를 수 있음). 코드 서명 인증서가 없다면 SmartScreen 경고가 표시될 수 있습니다. 서명 없이 신뢰된 배포물인 것처럼 안내하지 마세요.

## Linux에서 Windows x64 크로스 빌드

공식 electron-builder 권장 방식은 Wine이 있는 빌드 컨테이너 사용입니다.

```bash
docker run --rm -v "$PWD:/project" -v "$HOME/.cache/electron:/root/.cache/electron" \
  -v "$HOME/.cache/electron-builder:/root/.cache/electron-builder" \
  electronuserland/builder:wine bash -lc 'cd /project && npm install && npm run check && npm run dist:win'
```

CI `.github/workflows/ci.yml`은 **2026-10-25 유지관리자 요청으로 전 줄 주석 처리되어 현재 비활성 상태**입니다. 필요 시 검증을 마친 후 별도 승인 아래 복원해야 합니다. 이제 빌드/출시는 로컬 수동 절차만 사용합니다.

### 빌드가 가능한지 판단하는 체크리스트

- `node`, `npm` 사용 가능
- npm Registry와 Electron 바이너리 저장소 접근 가능
- Linux 크로스 빌드: Docker/Wine 설치 및 이미지 접근 가능
- CI는 일시 중단되어 사용하지 않습니다. 직접 로컬 빌드 후 SHA256 해시를 계산하여 파일과 함께 기록
- 빌드 아티팩트 사용 전 실제 Windows UI 스모크 테스트

이 개발 세션의 Linux 샌드박스에서는 `npm run dist:win` / 포터블 빌드 및 `npm install --offline`까지 직접 시도했습니다. `electron-builder: not found`, `ENOTCACHED`가 발생했고 Electron, Wine, Docker, x86_64 MinGW가 없어 `.exe`가 생성되지 않았습니다. 이는 **앱 코드 빌드 성공을 의미하지 않으며** `dist/`의 실제 파일로만 산출 여부를 확인합니다. 자세한 내용은 [검증 기록](BUILD_AND_VALIDATION.md)에 있습니다.
