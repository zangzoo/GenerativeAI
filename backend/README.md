# 🚀 ReadingMate Backend

AI 기반 문서 이해 시스템으로, **RAG(Retrieval Augmented Generation)** + **GPT Reasoning** + **Stable Diffusion 이미지 생성** 기능을 제공합니다.

Backend는 FastAPI 기반으로 동작하며, React 프론트엔드와 연결되어 사용됩니다.

---

## 📌 주요 기능

| 기능                  | 설명                                                         |
| ------------------- | ---------------------------------------------------------- |
| 📥 문서 분석(Ingest)    | 사용자가 업로드한 텍스트를 chunk → BM25 + Dense Embedding 기반 검색 인덱스 생성 |
| ❓ 질문 응답(Ask)        | 문서 내용을 기반으로 GPT가 근거 포함해 답변 생성                              |
| 📝 요약(Summarize)    | 문서 내용 핵심 요약 생성                                             |
| 🎨 이미지 생성(Generate) | Stable Diffusion 모델 기반 텍스트 → 이미지 생성                        |
| 🧪 Swagger 문서 제공    | `/docs` 또는 `/redoc`에서 API 테스트                              |

---

## 🧩 Project Structure

```
backend/
├── app.py              # FastAPI Main Server
├── requirements.txt
└── model/
    ├── generate/
    │   ├── run_generate.py
    │   └── models/stable_diffusion/...
    └── read_summarize/
        ├── mvp_reader.py
        └── storage/
```

---

## 🛠️ 설치 및 실행 방법

### 1️⃣ 가상환경(Optional)

```sh
conda create -n readingmate python=3.10
conda activate readingmate
```

---

### 2️⃣ Dependencies 설치

```sh
cd backend
pip install -r requirements.txt
```

---

### 3️⃣ 서버 실행

```sh
uvicorn app:app --reload
```

---

### 4️⃣ 실행 확인

| URL                                                        | 설명                     |
| ---------------------------------------------------------- | ---------------------- |
| [http://127.0.0.1:8000](http://127.0.0.1:8000)             | 서버 정상 동작 여부 확인         |
| [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)   | Swagger API UI (📌 추천) |
| [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc) | Redoc 문서               |

---

## 🔌 API Endpoints

### 📥 1. 문서 업로드 (Ingest)

```
POST /ingest
```

**Request Form:**

| 필드       | 타입     | 설명          |
| -------- | ------ | ----------- |
| `doc_id` | string | 저장될 문서 ID   |
| `file`   | file   | 업로드할 `.txt` |

**예시 (curl)**

```sh
curl -X POST "http://127.0.0.1:8000/ingest" \
 -F "doc_id=운수좋은날" \
 -F "file=@luckyday.txt"
```

---

### ❓ 2. 질문하기 (Ask)

```
POST /ask
```

| 필드         | 타입     | 설명                        |
| ---------- | ------ | ------------------------- |
| `doc_id`   | string | 대상 문서 ID                  |
| `question` | string | 질문 텍스트                    |
| `k`        | int    | 검색할 top chunks (Optional) |

**예시**

```sh
curl -X POST "http://127.0.0.1:8000/ask" \
 -F "doc_id=운수좋은날" \
 -F "question=주인공은 누구인가?"
```

---

### 📝 3. 문서 요약 (Summarize)

```
POST /summarize
```

| 필드          | 타입     | 설명       |
| ----------- | ------ | -------- |
| `doc_id`    | string | 문서 ID    |
| `sentences` | int    | 요약할 문장 수 |

```sh
curl -X POST "http://127.0.0.1:8000/summarize" \
 -F "doc_id=운수좋은날" \
 -F "sentences=5"
```

---

### 🎨 4. 이미지 생성 (Stable Diffusion)

```
POST /generate
```

| 필드       | 타입     | 설명                            |
| -------- | ------ | ----------------------------- |
| `prompt` | string | 이미지 설명 프롬프트                   |
| `steps`  | int    | Diffusion step count (기본: 30) |

```sh
curl -X POST "http://127.0.0.1:8000/generate" \
 -F "prompt=rainy korean street with umbrella" \
 -F "steps=40"
```

---

## 📁 모델 저장 위치

생성된 RAG 인덱스는 아래 경로에 저장됩니다:

```
backend/model/read_summarize/storage/{doc_id}/
```

예시:

```
storage/
 └── 운수좋은날
     ├── bm25.pkl
     ├── faiss.index
     ├── chunks.pkl
     └── meta.json
```

---

## 🧠 Roadmap (Next)

* [ ] 사용자별 저장 공간
* [ ] GPU 기반 모델 inference 지원
* [ ] Chunk 시각화 및 하이라이팅
* [ ] Docker 배포


