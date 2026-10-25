# Architecture / 아키텍처

```mermaid
flowchart LR
  Person[사용자 / AI 조작] --> UI[Renderer: HTML · CSS · JS]
  UI -->|contextBridge| P[Preload: 좁은 타입별 API]
  P -->|ipcRenderer.invoke| M[Electron Main IPC]
  M --> Archive[ZIP engine: JSZip / Node stream]
  Archive --> Safety[Safe path + limits + no-clobber]
  Safety --> Disk[(로컬 파일 시스템)]
  M -->|webContents.send| P
```

- `src/main.js`: **유일한 권한 소유자**. 메뉴, 파일 선택, 작업 큐(동시 1개), 진행률, 오류/취소, 결과 폴더 열기를 관리합니다.
- `src/preload.js`: 접근 가능한 IPC 메서드만 `window.blueade`로 노출합니다. Node API/임의 shell 실행은 렌더러에 노출하지 않습니다.
- `src/zip/archive.js`: 독립적으로 테스트 가능한 ZIP 생성·열기·검사·해제 및 스트리밍 압축 엔진.
- `src/zip/safety.js`: 파일 경계, Windows 호환 파일명, 개수/크기 제한, 심볼릭 링크 탐지.
- `src/ui/`: 외부 네트워크/프레임워크 런타임이 필요 없는 단일 창 뷰. 오류/진행률/기록을 같은 창에서 표시합니다.

## IPC API (human & agent 계약)

| Name | Args | Return |
|---|---|---|
| `chooseArchive()` | none | zip 경로 혹은 null |
| `chooseFiles()` / `chooseFolder()` | none | 파일 경로 배열 |
| `chooseDestination()` / `chooseSave()` | none | 경로 혹은 null |
| `inspectArchive(path)` | `.zip` | `{path, entries, totalBytes, compressedBytes}` |
| `inspectSources(paths)` | 경로 배열 | `{entries, totalBytes}` |
| `compress({sources,destination,level})` | level 1/3/6/9 | 결과 요약 |
| `extract({archive,destination,selected})` | selected는 선택적 항목 이름 목록 | 결과 요약 |
| `verify(path)` | `.zip` | 검사 요약 |
| `cancel()` | none | 취소 요청 여부 |
| `reveal(path)` | 결과 경로 | 시스템 탐색기 열기 |
| `onProgress(fn)` | 콜백 | unsubscribe 함수 |

`onProgress` 이벤트에는 `id`, `kind`, `status`, `percent`, `processedBytes`, `totalBytes`, `currentFile`, `fileIndex`, `fileCount`, `speed`, `etaSeconds`, `outputBytes`, `destination`, `error` 등 **단위가 분명한** 필드가 전달됩니다. 프런트 UI는 이 값을 사용하는 소비자이고, 임의 셸 명령을 실행하지 않습니다.

## 지원 범위와 제약

현재 ZIP 생성/검사/해제만 지원합니다. TAR/7z/RAR, ZIP 암호, 솔리드 압축, 대용량 다중볼륨 아카이브는 지원하지 않습니다. 현재 최대 ZIP 파일 크기 1GiB, 파일당 해제 512MiB, 총 2GiB, 항목 20,000개, 경로 깊이 40입니다. 압축 입력/기존 압축파일을 전부 읽는 구간은 메모리 압박이 있을 수 있으므로 초대형 파일은 차기 버전의 스트리밍 ZIP parser로 개선합니다.
