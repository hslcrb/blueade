<div align="center">

<img src="assets/logo.svg" alt="Bluade — 블루에이드" width="370" />

### 압축을 맑게, 작업은 가볍게. 💙

**파일을 열고, 압축하고, 풀고, 검사하는 모든 순간을 하나의 창에서.**

[![CI](https://github.com/hslcrb/blueade/actions/workflows/ci.yml/badge.svg)](https://github.com/hslcrb/blueade/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-2c74de)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-45-1b4db9)](https://www.electronjs.org/)

🌊 [설치 및 실행](#-설치하고-실행하기) · ✨ [기능](#-무엇을-할-수-있나요) · 🧩 [기여](#-사람과-에이전트가-함께-만들어요) · 🛡️ [보안](#-파일은-소중하니까요)

</div>

---

## 👋 안녕, Bluade!

ZIP을 푸는데 갑자기 다른 창이 튀어나오고, 얼마나 걸릴지 모르겠고, 완료 뒤 어디에 저장됐는지 다시 찾아야 했던 적 있나요?

Bluade는 그 작고 성가신 순간들을 정리하는, **차분한 데스크톱 압축 동반자**예요.

- 🗂️ **왼쪽**: 압축파일의 폴더 구조와 빠른 이동
- 📃 **가운데**: 한글 이름까지 자연스럽게 탐색하는 파일 목록과 검색
- 📈 **오른쪽**: 자세한 진행률, 처리량, 속도, 남은 시간, 로그, 결과 폴더 열기
- 🎨 **아래 광고 영역**: 광고를 숨기거나 실제 콘텐츠인 척하지 않고 *"이곳은 / 광고입니다"*라고 명확히 표시하는 **자리표시자**. 현재 광고 추적 코드가 없어요.

> **현재 v0.1.0은 실험적 소스 프리뷰입니다.** ZIP 중심 MVP이며 실제 Windows 설치파일은 CI 빌드가 성공한 후 `Actions`의 아티팩트에서 확인해야 합니다. 검증되지 않은 릴리스를 완성품인 척 배포하지 않아요.

## ✨ 무엇을 할 수 있나요?

| 기능 | 현재 상태 |
| --- | --- |
| ZIP 열기, 한글 파일명 표시, 폴더/파일 탐색 | ✅ |
| 다중 파일·폴더를 ZIP으로 압축 | ✅ |
| 전체 또는 선택 파일 ZIP 해제 | ✅ |
| CRC 무결성 검사 | ✅ |
| 현재 파일, 처리량, 속도, ETA, 백분율 | ✅ |
| 취소, 로그, 결과 폴더 열기 | ✅ |
| 데스크톱 드래그 앤 드롭 | ✅ 파일 기준 · 폴더 드롭은 환경별 점검 예정 |
| TAR / 7z / RAR / 암호화 ZIP | ⏳ 계획 중 |
| ZIP64 / 초대형 아카이브 | ⏳ 계획 중 |

## 🚀 설치하고 실행하기

**개발자 실행** — Node.js 24와 npm이 필요해요.

```bash
git clone https://github.com/hslcrb/blueade.git
cd blueade
npm install
npm run check
npm start
```

**Windows 실행파일 만들기** (Windows x64, 네이티브):

```powershell
npm install
npm run dist:win
```

성공하면 `dist/`에 설치 EXE와 포터블 ZIP이 만들어집니다. Windows 미서명 앱은 SmartScreen 경고가 발생할 수 있어요. GitHub Actions에서 자동으로 생성된 아티팩트는 [Actions · CI](https://github.com/hslcrb/blueade/actions/workflows/ci.yml)에서 확인합니다. 빌드가 실패했다면 실행파일은 생성되지 않은 것입니다. Linux에서 Windows 교차 빌드는 [빌드 가이드](docs/WINDOWS_BUILD.md)를 읽어주세요.

## 🧭 1분 사용법

1. **열기** → `.zip` 파일 선택 → 가운데 목록과 왼쪽 폴더 트리 탐색
2. **압축 풀기** → 위치 지정 → 오른쪽 작업 센터에서 진행률과 현재 파일 확인
3. **새 압축** → `파일 추가` 또는 `폴더 추가` → `저장 위치` 선택 → 압축 수준 선택 → `작업 시작`
4. **파일 검사** → CRC 및 안전 규칙 확인 → 결과를 작업 센터에서 확인
5. **완료** → `결과 폴더 열기`로 바로 이동 (별도 완료 모달이 필요 없어요)

파일명은 검색할 수 있고, 탐색 리스트에서 선택한 파일만 해제할 수도 있습니다. 오류는 창 내부에 표시되며, 압축 작업을 한 번에 하나씩 수행합니다.

## 🛡️ 파일은 소중하니까요

압축파일은 외부에서 받은 프로그램처럼 신뢰하지 않아요. 상대 경로 검증, ZIP Slip 차단, 입력/해제 단계 symlink 차단, 원자적 *덮어쓰기 방지*, 파일 개수와 해제 용량 제한을 적용합니다. 렌더러는 Node 권한과 분리되며, 사용자 파일을 서버로 전송하지 않습니다.

ZIP 파일 크기 최대 **1GiB**, 항목 하나 **512MiB**, 전체 **2GiB**, 최대 **20,000개** 제한을 적용합니다. 큰 압축파일은 메모리 사용량이 높을 수 있어요. 모든 보안 보장은 범위가 있으며 [보안 설계](docs/SECURITY.md)와 [취약점 제보](SECURITY.md)를 참고해주세요.

## 🎨 브랜드 그리고 폰트

"Bluade"는 블루 계열의 시원함과 사용자를 돕는 아카이브 도구를 떠올리게 하는 이름이에요. 아이콘은 **B를 관통하는 푸른 리본**. 시각 디자인은 [브랜드 가이드](docs/BRAND.md)에 명시했어요.

참조 화면의 ZIP 파일 **스크린샷은 폰트 파일 자체가 아닙니다**. 따라서 실제 폰트가 전달되지 않은 상태에서는 무단 임베딩하지 않고, 가용한 한국어 시스템 폰트로 표시해요. 적법한 폰트 제공 시 [폰트 적용 안내](assets/fonts/README.md)에 따라 넣을 수 있습니다.

## 🧩 사람과 에이전트가 함께 만들어요

Bluade의 오픈소스 이니셔티브는 **Human × Agent**입니다.

- 커밋은 `feat: 압축 미리보기 개선`처럼 **영어 접두어 + 한국어 메시지**를 사용해요.
- 변경은 아주 작게 나누고 **커밋 즉시 푸시**해서 사고에도 코드를 잃지 않도록 합니다.
- AI는 diff의 위험을 검토하지만 **사람의 승인으로 둔갑하지 않아요**. CI, AI 리뷰, 최신 SHA에 대한 관리자 승인, `safe-to-merge` 레이블을 통과해야 merge commit 방식(no-ff)으로 자동 병합되도록 설계했습니다.
- `BLUADE_AI_REVIEW_KEY`가 없다면 AI 검토는 실패-차단(fail closed)되며 자동 병합되지 않습니다. 설정 없이 AI 검토했다고 표시하지 않습니다.

[CONTRIBUTING.md](CONTRIBUTING.md) · [AGENTS.md](AGENTS.md) · [아키텍처](docs/ARCHITECTURE.md) · [로드맵](docs/ROADMAP.md) · [행동 강령](CODE_OF_CONDUCT.md)

## 📜 라이선스

MIT License. Contributions are welcome! 💙

<div align="center"><i>From tangled archives to clearer days. — Bluade ✦</i></div>
