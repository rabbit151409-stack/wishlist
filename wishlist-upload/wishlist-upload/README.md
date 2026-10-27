# 위시리스트

사고 싶은 상품을 담으면 내 세후 시급만큼 초 단위로 돈이 모이는 위시리스트 웹앱(PWA).

- 링크를 붙여넣으면 상품명·이미지·가격을 자동으로 불러온다
- 상품 사진은 브라우저 안의 AI로 누끼를 딴다 (직접 찍은 사진도 가능)
- 담는 순간부터 자동으로 카운트되고, 흐린 상품 이미지가 아래부터 차오른다
- 담은 순서대로 하나씩 모으고, 다 모은 상품은 달성 폴더로 간다
- 소득은 시급·월급·연봉(세전/세후)으로 입력할 수 있다
- 데이터는 기기(IndexedDB)에만 저장한다. 설정에서 JSON으로 백업할 수 있다

## 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:5173 을 연다. 개발 서버에서도 `/api/parse`(링크 파싱), `/api/image`(이미지 중계)가 동작한다.

## 테스트

```bash
npm test
```

## 배포 (Vercel)

1. 이 저장소를 GitHub에 올린다.
2. [vercel.com/new](https://vercel.com/new)에서 저장소를 가져온다(Import). 프레임워크는 Vite로 자동 인식되고, 설정은 바꿀 필요 없다.
3. `api/` 폴더의 파일이 서버리스 함수로 함께 배포된다.
4. 이후 `main` 브랜치에 푸시할 때마다 자동으로 다시 배포된다.

휴대폰에서 배포 주소를 열고 "홈 화면에 추가"하면 앱처럼 쓸 수 있다. 안드로이드 크롬에서는 쇼핑몰 앱의 "공유하기" 목록에도 나온다. iOS는 링크를 복사해 붙여넣는다.

## 구조

| 경로 | 내용 |
| --- | --- |
| `src/db.js` | IndexedDB 저장, 자동 카운트·순서대로 모으기·달성·포기 규칙 |
| `src/calc.js` | 필요 시간·세후 시급 등 계산 규칙 |
| `src/cutout.js` | 누끼 따기 |
| `src/stage.jsx` | 홈 화면의 도트 진열대 일러스트 |
| `src/screens/` | 시작, 홈, 상품 추가, 상품 상세, 달성, 달성 폴더, 설정 |
| `lib/parse.js` | 상품 페이지에서 상품명·이미지·가격 추출 |
| `api/parse.js` · `api/image.js` | 링크 파싱 · 쇼핑몰 이미지 중계 서버리스 함수 |
| `public/` | PWA 매니페스트, 서비스 워커, 아이콘 |

## 라이선스 참고

- 누끼에 쓰는 [@imgly/background-removal](https://github.com/imgly/background-removal-js)은 AGPL-3.0이다. 앱을 공개 서비스하면 이 앱의 소스 코드도 공개해야 한다(공개 저장소면 충족).
- 숫자 글꼴은 [갈무리](https://galmuri.quiple.dev)(SIL Open Font License 1.1)이고, 라이선스 전문은 `src/fonts/OFL.md`에 있다.
