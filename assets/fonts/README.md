# Custom font / 커스텀 폰트

원본 캡처 화면에는 `DancingPeoples-TTF.zip`이 보이지만 **폰트 파일 자체는 첨부되어 있지 않았습니다**. 그러므로 폰트를 추출하거나 임의로 재배포하지 않습니다.

앱의 기본 폰트는 Windows에서 가용한 한글 시스템 폰트(Pretendard, Wanted Sans, Noto Sans KR, 맑은 고딕 등)입니다. 사용 허가를 확보한 웹폰트 파일이 있다면 `assets/fonts/custom.woff2` 로 넣고 `src/ui/styles.css` 상단에 아래 규칙을 추가하세요:

```css
@font-face { font-family: 'Bluade Custom'; src: url('../../assets/fonts/custom.woff2') format('woff2'); font-display: swap; }
```

사용자 제공 폰트의 라이선스, 앱 배포/임베딩 허가, OFL Reserved Font Name 등의 준수 여부는 별도 검증이 필요합니다. `custom.*`는 기본적으로 `.gitignore`에 포함됩니다.
