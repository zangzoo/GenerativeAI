# 📚 ReadingMate Frontend (React)

사용자 책장을 꾸미고, 업로드한 TXT/PDF를 읽으면서 AI 요약/Q&A/이미지 생성을 사용할 수 있는 CRA 기반 프론트엔드입니다. 업로드한 책과 커스텀 표지는 브라우저 `localStorage`에만 저장됩니다(서버 업로드 없음).

## ⚡ 실행
```bash
cd frontend
npm install
npm start   # http://localhost:3000
```
백엔드(FastAPI)는 `http://localhost:8000`에서 실행되어 있어야 RAG/이미지 생성 요청이 동작합니다.

## 🗺️ 주요 화면
- Home (`/`): 책장, 기본 샘플 + 사용자 업로드 TXT/PDF 추가, 표지 수정, 선택 삭제, 선반 아래 “책 추가하기” 폼.
- Reader (`/book/:id`): 텍스트 페이지 나눔, PDF 보기/텍스트 보기 토글, 드래그 선택 후 요약/이미지 생성, 글꼴 크기 조절, 채팅 패널.
- Album (`/album`, `/album/:albumId`): 생성 이미지 리스트 및 상세.

## 🧭 라우팅
`src/router/AppRouter.jsx`
- `/` → Home
- `/book/:id` 및 `/reading/:id` → ReadingPage
- `/album` → Album
- `/album/:albumId` → AlbumDetail

## 📂 폴더 개요
```
public/
  covers/, album/      # 정적 이미지
src/
  components/          # Header, BookCard, AlbumSidebar, ChatPanel 등
  pages/               # Home, ReadingPage, Album, AlbumDetail
  styles/              # CSS
```

## 📝 책 업로드 & 저장 방식
- 지원 파일: TXT, PDF. PDF는 pdf.js(CDN)로 텍스트를 추출해 “텍스트 보기”로 읽을 수 있고, 추출 실패 시에도 원본 PDF 보기 가능.
- 저장 위치: `localStorage`의 `userBooks`, `userBooksBackup` 키에 책 메타/텍스트/PDF data URL/커스텀 표지 저장. 브라우저에만 남고 서버에는 업로드되지 않습니다.
- 삭제: 상단 “선택” → 책 클릭(체크) → “삭제”.

## 🤖 백엔드 연동 포인트
- `/ask`, `/summarize_text`, `/generate` 등 FastAPI 엔드포인트를 사용합니다. 백엔드가 켜져 있어야 채팅/요약/이미지 생성이 동작합니다.
- Stable Diffusion은 로컬 모델이 필요하며, 모델이 없으면 `/generate`가 실패합니다.

## 🔍 PDF 텍스트 추출 주의
- 첫 PDF 업로드/열람 시 pdf.js를 CDN(jsDelivr)에서 로드합니다. 네트워크 차단 시 텍스트 추출이 실패할 수 있으나 PDF 보기 자체는 유지됩니다.
- 텍스트 추출 성공 후 “텍스트 보기로 이동” 버튼으로 전환하면 드래그 선택 요약/이미지 생성이 가능해집니다.
