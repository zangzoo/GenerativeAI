# 📚 ReadMate Frontend (React)

ReadMate는 사용자의 독서 경험을 확장하기 위한 웹 인터페이스로,  
책 기반 문장 요약, 질문/답변, 이미지 생성 기능을 제공합니다.

이 레포는 **React 기반 프론트엔드**만 포함하며  
백엔드(FastAPI 서버)는 별도 폴더에서 관리됩니다.

---

## 📁 프로젝트 구조

frontend/
├── public/
│ ├── covers/ # 책 표지 이미지
│ ├── album/ # 앨범 이미지 슬라이드용 정적 이미지
│ └── index.html
│
├── src/
│ ├── components/
│ │ ├── Header.jsx # 상단 고정 헤더
│ │ ├── BookCard.jsx # 책 카드
│ │ ├── AlbumShortcut.jsx # 홈 오른쪽 앨범 미리보기 박스
│ │ └── ChatbotPanel.jsx # 책 상세의 AI 챗봇 영역(추가 예정)
│ │
│ ├── pages/
│ │ ├── Home.jsx # 홈 화면
│ │ ├── BookDetail.jsx # 책 내용 + 챗봇
│ │ ├── Album.jsx # 전체 앨범
│ │ ├── AlbumDetail.jsx # 앨범 상세
│ │ └── NotFound.jsx
│ │
│ ├── styles/
│ │ ├── Home.css
│ │ ├── Header.css
│ │ ├── AlbumShortcut.css
│ │ ├── BookCard.css
│ │ └── ...
│ │
│ ├── App.jsx # 전체 라우팅
│ ├── index.js # 렌더링 시작점
│ └── api.js # 백엔드와 통신용 모듈 (추가 예정)
│
├── .gitignore
├── package.json
└── README.md

---

## 🚀 실행 방법

```bash
npm install
npm start

```

✨ 주요 기능 요약
🏠 Home Page

[사용자 이름]님의 책장

책 표지(BookCard)를 가로 스크롤로 표시

오른쪽 "My Album" 박스에서

public/album 이미지들이 10초 간격 자동 슬라이드

📖 Book Detail

책 내용 표시

오른쪽 AI 챗봇(요약/질문/이미지 생성 → 추후 백엔드 연결)

🖼 Album

생성 이미지 전체 조회

클릭 시 AlbumDetail 페이지로 이동
