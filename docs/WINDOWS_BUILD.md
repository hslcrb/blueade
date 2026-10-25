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

CI `.github/workflows/ci.yml`은 Windows GitHub runner에서 빌드를 수행하고 테스트 성공 후 설치파일과 ZIP을 Actions 아티팩트로 공개하도록 설정됩니다.

### 빌드가 가능한지 판단하는 체크리스트

- `node`, `npm` 사용 가능
- npm Registry와 Electron 바이너리 저장소 접근 가능
- Linux 크로스 빌드: Docker/Wine 설치 및 이미지 접근 가능
- GitHub Actions: repository Actions 사용 허가 및 성공한 CI run
- 빌드 아티팩트 사용 전 실제 Windows UI 스모크 테스트

이 개발 세션의 Linux 샌드박스에는 Electron/Wine 및 외부 바이너리 다운로드 경로가 없으므로 `.exe`를 실제 생산했다고 주장하지 않습니다. 산출물의 생성 여부는 Actions 로그와 `dist/`의 실제 파일로 확인하세요.
