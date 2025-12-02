## ReadingMate
AI 독서 도우미 웹앱. React 프론트에서 책장을 관리하며, FastAPI 백엔드로 RAG 기반 Q&A와 Stable Diffusion 이미지를 제공합니다. 사용자가 업로드한 TXT/PDF는 브라우저 `localStorage`에 저장되고, PDF는 텍스트 추출 후 텍스트/원본 PDF 보기 둘 다 지원합니다.

### 주요 기능
- 책장: 기본 샘플 책 + 사용자가 업로드한 TXT/PDF 추가, 표지 수정, 선택 삭제, 로컬 영구 저장(localStorage 백업 포함)
- 리더: 텍스트 페이지 나눔, PDF 뷰/텍스트 뷰 토글, 드래그 선택 후 요약/이미지 생성, 글꼴 크기 조절
- 앨범: 생성 이미지 저장/보기, 책별 앨범 상세
- AI: RAG(QA/요약), 선택 텍스트 요약, Stable Diffusion 이미지 생성 (로컬 모델 필요)

### 구조
```
backend/   # FastAPI + RAG + Stable Diffusion
frontend/  # React (CRA) 웹앱
output/    # 산출물(예: 이미지) 폴더
```

### 빠른 실행
1) 백엔드
```sh
cd backend
python -m venv .venv && source .venv/bin/activate  # 선택
pip install -r requirements.txt

# OpenAI 사용 시 .env에 OPENAI_API_KEY, EMB_MODEL 등 설정
# Stable Diffusion 모델을 backend/model/generate/models/stable_diffusion 에 배치
uvicorn app:app --reload
```

2) 프론트엔드
```sh
cd frontend
npm install
npm start    # http://localhost:3000
```

### 사용법 메모
- 책 추가: 홈 상단 선반 아래 "책 추가하기" → 제목 입력 + TXT/PDF 업로드. PDF는 pdf.js(CDN)로 텍스트를 추출하고, 추출 실패 시에도 PDF 원본을 저장/보기 가능.
- 저장 위치: 브라우저 `localStorage`의 `userBooks`, `userBooksBackup` 키에 책 메타, 텍스트, PDF data URL, 커스텀 표지 데이터가 저장됩니다(서버로 업로드되지 않음).
- 삭제: 상단 "선택" → 책 클릭해 체크 → "삭제".
- 읽기: 책 클릭 → 리더. PDF일 때 상단 "텍스트 보기로 이동"으로 전환하면 드래그 요약/이미지 생성 사용 가능.
- AI 기능: 채팅 패널에서 질문(QA) / 선택 텍스트 요약 / 이미지 생성. 이미지 생성은 로컬 Stable Diffusion 모델이 필요합니다.

### 백엔드 API 요약
- `POST /ingest` 텍스트 파일을 RAG 인덱스로 적재
- `POST /ask` 문서 기반 Q&A
- `POST /summarize` 문서 요약
- `POST /summarize_text` 선택 텍스트 요약
- `POST /generate` Stable Diffusion 이미지 생성
- `GET /api/book/{book_id}` 사전 배포된 TXT 반환 (프론트 기본 샘플용)
자세한 설명은 `backend/README.md` 참고.
