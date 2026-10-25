# Roadmap

- [x] Single-window UI / 한글 검색·탐색·진행률
- [x] Local ZIP compression (DEFLATE) / extraction / verification
- [x] Drag & drop, per-file progress, cancellation request, speed and ETA
- [x] Safe path handling, file count and size limits, no-overwrite extraction
- [x] Windows build 설정 및 CI 워크플로 정의(현재 CI 전체 주석 처리), 에이전트 기여 규약
- [ ] Electron/electron-builder 의존성 확보 후 실제 Windows EXE/ZIP 빌드 및 기기 검증
- [ ] 실제 Windows PC 설치 / 압축·해제 / 대용량 부하 테스트
- [ ] ZIP64, 큰 파일용 disk-backed reader, 긴 경로 대응
- [ ] 타 포맷(TAR.GZ, 7z) 검토 및 암호화 ZIP 지원
- [ ] 지속 저장되는 작업 기록(사용자 선택 방식)
- [ ] 드래그 앤 드롭 폴더 포함 및 파일 바로보기
- [ ] 액세서빌리티 자동 측정, screen reader 사용자 테스트
- [ ] 코드 서명 / 보안 자동 업데이트

Issue는 재현 절차, 기대/실제 결과, OS, 파일 크기, 개인정보 제거된 로그가 있으면 처리 속도가 빨라집니다.
