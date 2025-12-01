from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, Field
from typing import List, Optional

from pathlib import Path
import shutil
import base64
from io import BytesIO
from fastapi.responses import PlainTextResponse


# === Import Model Logic ===
from model.read_summarize.mvp_reader import (
    hybrid_retrieve,
    build_answer_prompt,
    gpt4omini_chat,
    cmd_ingest
)

pipe = None


app = FastAPI(
    title="📚 ReadingMate API",
    description="Hybrid Retrieval + GPT + Stable Diffusion Backend",
    version="1.0.0"
)


# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프론트 배포 시 도메인만 허용 가능
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# 📌 Pydantic Schemas
# =========================================================
class AskRequest(BaseModel):
    doc_id: str = Field(..., example="운수좋은날")
    question: str = Field(..., example="주인공은 결국 어디로 갔나요?")
    k: int = Field(6, description="검색할 문맥 수")


class AskResponse(BaseModel):
    answer: str
    retrieved_chunks: List[str]
    scores: List[float]


class SummarizeRequest(BaseModel):
    doc_id: str = Field(..., example="운수좋은날")
    sentences: int = Field(5)


class SummarizeResponse(BaseModel):
    summary: str


class GenerateImageRequest(BaseModel):
    prompt: str = Field(..., example="rainy alley in seoul, watercolor style")
    steps: int = Field(40)


class GenerateImageResponse(BaseModel):
    preview_base64: str


# =========================================================
# 1️⃣ Document Ingest
# =========================================================
@app.post("/ingest", tags=["📄 Document"])
async def ingest(doc_id: str = Form(...), file: UploadFile = File(...)):
    """
    업로드한 텍스트 파일을 분할/임베딩하고 검색 가능한 DB로 저장합니다.
    """
    temp_path = Path("temp_upload.txt")

    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    class NS: pass
    ns = NS()
    ns.doc_id = doc_id
    ns.path = str(temp_path)
    ns.unit = "para"
    ns.window = 1
    ns.stride = 1

    try:
        cmd_ingest(ns)
        return {"status": "success", "doc_id": doc_id}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# =========================================================
# 2️⃣ Ask (RAG + GPT)
# =========================================================
@app.post("/ask", response_model=AskResponse, tags=["🤖 Q&A"])
async def ask(request: AskRequest):
    """문서 기반 실시간 Retrieval + GPT reasoning"""
    try:
        # 👉 질문이 비어있으면 400 에러 응답
        if not request.question.strip():
            raise HTTPException(status_code=400, detail="질문을 입력해주세요.")

        # 👉 문서 ID가 존재하는지 확인
        storage_path = Path("model/read_summarize/storage") / request.doc_id
        if not storage_path.exists():
            raise HTTPException(status_code=404, detail=f"문서 ID '{request.doc_id}'에 해당하는 데이터가 없습니다.")

        # 🔍 검색 + 프롬프트 생성 + GPT 호출
        ids, scores, chunks = hybrid_retrieve(request.doc_id, request.question, k=request.k)
        prompt = build_answer_prompt(request.question, chunks)
        answer = gpt4omini_chat(prompt)

        return AskResponse(answer=answer, retrieved_chunks=chunks, scores=scores)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# =========================================================
# 3️⃣ Summarization
# =========================================================
@app.post("/summarize", response_model=SummarizeResponse, tags=["📌 Summary"])
async def summarize(request: SummarizeRequest):
    """전체 문서 기반 GPT 요약 생성"""
    try:
        _, _, chunks = hybrid_retrieve(request.doc_id, "전체 줄거리")
        text = "\n".join(chunks)

        prompt = f"아래 내용을 {request.sentences} 문장으로 요약해줘:\n\n{text}"
        answer = gpt4omini_chat(prompt)

        return SummarizeResponse(summary=answer)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# =========================================================
# 4️⃣ Image Generation (Lazy Stable Diffusion)
# =========================================================
@app.post("/generate", response_model=GenerateImageResponse, tags=["🎨 Image"])
async def generate(prompt: str = Form(...), steps: int = Form(30)):
    """입력 텍스트 기반 이미지 생성"""

    global pipe
    from diffusers import StableDiffusionPipeline, DDIMScheduler
    import torch

    try:
        # 최초 요청 시 로딩
        if pipe is None:
            print("🚀 Loading Stable Diffusion...")
            model_path = "./model/generate/models/stable_diffusion"
            pipe = StableDiffusionPipeline.from_pretrained(
                model_path,
                torch_dtype=torch.float32,
                safety_checker=None
            )
            pipe.scheduler = DDIMScheduler.from_config(pipe.scheduler.config)
            pipe.to("cpu")
            print("✅ Ready.")

        img = pipe(prompt, num_inference_steps=steps).images[0]

        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()

        return GenerateImageResponse(preview_base64=img_str)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


BASE_DIR = Path(__file__).resolve().parent
BOOK_DIR = BASE_DIR / "model" / "read_summarize"

@app.get("/api/book/{book_id}")
def get_book(book_id: str):
    # print(f"📖 요청 들어온 book_id: {book_id}")
    book_path = BOOK_DIR / f"{book_id}.txt"
    # print(f"➡️ 찾는 파일 경로: {book_path}")

    try:
        with open(book_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"파일을 불러올 수 없습니다: {e}"
    
# =========================================================
# Health Check
# =========================================================
@app.get("/", tags=["🩺 Health"])
async def root():
    return {"message": "🚀 ReadingMate API is running!"}
