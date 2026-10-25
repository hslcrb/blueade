# Security model / 보안 설계

## Threats

1. **Zip Slip**: 절대 경로, `..`, 드라이브 문자/UNC, Windows 예약 이름을 거부. 압축 엔진이 원래 이름을 정제했더라도 원본 `unsafeOriginalName`을 별도로 검증.
2. **Symlink escape**: ZIP의 Unix 심볼릭 링크를 거부, 해제 대상의 부모 폴더에 기존 심볼릭 링크가 있으면 거부, 입력 원본 파일 symlink도 거부.
3. **Overwrite**: 일반 파일은 임시 파일에 먼저 스트리밍한 후 `link()`로 단일 원자적 no-clobber 퍼블리시. 이미 존재하는 파일은 절대 교체/삭제하지 않음.
4. **Zip bomb**: 항목 수/총 해제 크기/파일별 크기 제한 및 CRC 검증, 제한된 동시 작업. 메모리 리소스는 파일 크기 상한과 함께 보수적으로 관리.
5. **Renderer compromise**: `contextIsolation:true`, `sandbox:true`, `nodeIntegration:false`, CSP, 외부 탐색/새 창 차단. 승인된 IPC만 허용.
6. **Privacy**: 네트워크 연결/계정/파일 업로드/텔레메트리 없음. 작업 기록은 앱 실행 메모리 내에서만 보관.

## Known limitations and review points

- 심볼릭 링크 교체(TOCTOU)는 파일 시스템 경쟁 조건 하에서 추가 보강 필요. 고위험 공유 폴더나 관리자 권한으로 작업하지 마세요.
- Node 스트리밍 처리와 JSZip 자체의 메모리 사용량을 분리해 고려할 필요가 있습니다. 1GiB ZIP을 한 번에 메모리로 읽을 수 있으므로 RAM 적은 PC에서는 OOM 가능성이 있습니다.
- 앱 바이너리 서명 미적용 상태의 릴리스는 서명 인증서·자동 업데이트 무결성 검증을 추가해야 합니다.
- Windows 실행파일은 해당 플랫폼에서 통합 테스트를 완료한 뒤 안정 릴리스로 표시해야 합니다.

악성 ZIP 사례를 발견했다면 공개 Issue가 아니라 `SECURITY.md`의 비공개 신고 절차를 사용하세요.
