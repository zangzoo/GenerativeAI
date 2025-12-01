#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RAG MVP: Hybrid Search (BM25 + Dense) + Llama
- BM25: 키워드 정확 매칭 (sparse)
- Dense: 의미 유사도 (FAISS)
- Hybrid: 두 점수 결합 → 더 정확한 retrieval

설치:
  pip install rank-bm25 faiss-cpu sentence-transformers transformers torch --upgrade python-dotenv numpy openai gradio


예시:
  .venv/Scripts/activate 
  (1)cli 모드  ... doc_id는 임의 지정 가능, txt 파일 경로 지정
  python backend/model/read_summarize/mvp_reader.py ingest --doc_id rng --path backend/model/read_summarize/romeoandjuliet.txt --unit para --window 2 --stride 1
  python backend/model/read_summarize/mvp_reader.py ask --doc_id rng -q "로미오는 왜 죽었어?" -k 6
  python backend/model/read_summarize/mvp_reader.py summarize --doc_id rng --sentences 7


  python mvp_reader.py ingest --doc_id novel --path luckyday.txt --unit para
  python mvp_reader.py ask --doc_id novel -q "주인공은 어디 갔어?" -k 6
  python mvp_reader.py summarize --doc_id novel --sentences 7

  (2)gradio UI 모드
  python backend/model/read_summarize/mvp_reader.py ui

  python mvp_reader.py ui

  로미오는 무슨 가문의 딸이었지?
  티볼트 죽었어? 줄리엣과 무슨 사이길래 슬퍼하지?
  머큐리 죽었어? 로미오와 무슨 사이길래 슬퍼하지?
  로미오는 왜 추방됐어?
  

1️⃣ 김 첨지는 왜 오늘을 “운수 좋은 날”이라고 생각했나요?
2️⃣ 김 첨지가 설렁탕을 사가려 한 이유는 무엇인가요?
3️⃣ 김 첨지의 아내가 병이 악화된 원인은 무엇이라고 나오나요?
4️⃣ 김 첨지가 집에 돌아가기 싫어했던 이유는 무엇인가요?
5️⃣ 마지막 장면에서 김 첨지는 왜 울다가 웃다가 반복하나요?
"""

from __future__ import annotations
import argparse, os, re, json, pickle
from pathlib import Path
from dataclasses import dataclass

from typing import List, Tuple

from dotenv import load_dotenv
load_dotenv()  # .env 파일 자동 로드


import numpy as np
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------- 저장 루트 ----------
STORAGE_ROOT = Path(__file__).parent / "storage"

# ---------- 임베딩 모델 ----------
_EMB_MODEL_NAME = os.getenv("EMB_MODEL", "dragonkue/BGE-m3-ko")


# ---------- 라이브러리 체크 ----------
try:
    import faiss
except ImportError as e:
    raise SystemExit("[ERROR] pip install faiss-cpu") from e

try:
    from rank_bm25 import BM25Okapi
except ImportError as e:
    raise SystemExit("[ERROR] pip install rank-bm25") from e

# =========================================================
# 유틸
# =========================================================
def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")

def split_sentences(text: str) -> List[str]:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\u3000|\xa0", " ", text)
    parts = re.split(r"(?<=[\.!?？！。…])\s+|\n+", text)
    return [p.strip() for p in parts if p and p.strip()]

def split_paragraphs(text: str) -> List[str]:
    paras = re.split(r"\n{2,}", text.replace("\r\n", "\n"))
    return [p.strip() for p in paras if p.strip()]

def make_chunks(text: str, unit: str = "para", window:int=1, stride:int=1) -> List[str]:
    items = split_paragraphs(text) if unit == "para" else split_sentences(text)
    if window <= 1: 
        return items
    out = []
    i, n = 0, len(items)
    while i < n:
        j = min(n, i+window)
        out.append(" ".join(items[i:j]))
        if j == n: break
        i += max(1, stride)
    return out

# =========================================================
# 한국어 토크나이저 (BM25용)
# =========================================================
def simple_tokenize(text: str) -> List[str]:
    """간단한 한국어/영어 토크나이저 (형태소 분석 없이)"""
    # 공백 + 특수문자 기준 분리
    text = re.sub(r'[^\w\s]', ' ', text)
    tokens = text.lower().split()
    # 한글은 음절 단위로도 추가 (짧은 단어 매칭 강화)
    result = []
    for t in tokens:
        result.append(t)
        if re.search(r'[가-힣]', t) and len(t) > 1:
            result.extend(list(t))  # 음절 분리
    return result

# =========================================================
# 저장 스키마
# =========================================================
@dataclass
class RAGStore:
    doc_id: str
    chunks: List[str]
    emb_dim: int
    index_path: Path
    bm25_path: Path
    meta_path: Path

    @property
    def base_dir(self) -> Path:
        return STORAGE_ROOT / self.doc_id

    def save_meta(self):
        self.base_dir.mkdir(parents=True, exist_ok=True)
        meta = {"doc_id": self.doc_id, "emb_dim": self.emb_dim, "chunks": len(self.chunks)}
        self.meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        with open(self.base_dir / "chunks.pkl", "wb") as f:
            pickle.dump(self.chunks, f)

    @staticmethod
    def load(doc_id: str) -> "RAGStore":
        base = STORAGE_ROOT / doc_id
        if not base.exists():
            raise FileNotFoundError(f"[RAG] storage not found: {base}")
        with open(base / "chunks.pkl", "rb") as f:
            chunks = pickle.load(f)
        meta = json.loads((base / "meta.json").read_text(encoding="utf-8"))
        return RAGStore(
            doc_id=doc_id,
            chunks=chunks,
            emb_dim=meta["emb_dim"],
            index_path=base / "faiss.index",
            bm25_path=base / "bm25.pkl",
            meta_path=base / "meta.json",
        )

# =========================================================
# Dense 임베딩 (FAISS)
# =========================================================
_emb_model = None
def get_emb_model():
    global _emb_model
    if _emb_model is None:
        from sentence_transformers import SentenceTransformer
        _emb_model = SentenceTransformer(_EMB_MODEL_NAME)
    return _emb_model

def embed_texts(texts: List[str]) -> np.ndarray:
    model = get_emb_model()
    vecs = model.encode(texts, batch_size=64, convert_to_numpy=True, normalize_embeddings=True)
    return vecs.astype("float32")

def build_faiss_index(vectors: np.ndarray) -> faiss.IndexFlatIP:
    dim = vectors.shape[1]
    idx = faiss.IndexFlatIP(dim)
    idx.add(vectors)
    return idx

def save_faiss(index: faiss.Index, path: Path):
    faiss.write_index(index, str(path))

def load_faiss(path: Path) -> faiss.Index:
    return faiss.read_index(str(path))

# =========================================================
# Sparse 검색 (BM25)
# =========================================================
def build_bm25_index(chunks: List[str]) -> BM25Okapi:
    tokenized = [simple_tokenize(c) for c in chunks]
    return BM25Okapi(tokenized)

def save_bm25(bm25: BM25Okapi, path: Path):
    with open(path, "wb") as f:
        pickle.dump(bm25, f)

def load_bm25(path: Path) -> BM25Okapi:
    with open(path, "rb") as f:
        return pickle.load(f)

# =========================================================
# Hybrid Retrieval
# =========================================================
def hybrid_retrieve(doc_id: str, query: str, k: int = 6, 
                   alpha: float = 0.5) -> Tuple[List[int], List[float], List[str]]:
    """
    Hybrid search: BM25 + Dense
    alpha: BM25 가중치 (0~1), 1-alpha: Dense 가중치
    alpha=0.5: 균형, alpha=0.7: BM25 중시, alpha=0.3: Dense 중시
    """
    store = RAGStore.load(doc_id)
    
    # 1. BM25 점수
    bm25 = load_bm25(store.bm25_path)
    query_tokens = simple_tokenize(query)
    bm25_scores = bm25.get_scores(query_tokens)
    bm25_scores = np.array(bm25_scores)
    
    # 2. Dense 점수 (FAISS)
    idx = load_faiss(store.index_path)
    qv = embed_texts([query])
    dense_sims, dense_ids = idx.search(qv, len(store.chunks))  # 전체 검색
    dense_scores = np.zeros(len(store.chunks))
    for i, (chunk_id, sim) in enumerate(zip(dense_ids[0], dense_sims[0])):
        dense_scores[chunk_id] = sim
    
    # 3. 정규화 (0~1 범위로)
    if bm25_scores.max() > 0:
        bm25_scores = bm25_scores / bm25_scores.max()
    if dense_scores.max() > 0:
        dense_scores = dense_scores / dense_scores.max()
    
    # 4. 하이브리드 점수
    hybrid_scores = alpha * bm25_scores + (1 - alpha) * dense_scores
    
    # 5. Top-k 선택
    top_indices = np.argsort(-hybrid_scores)[:k]
    top_scores = hybrid_scores[top_indices]
    top_chunks = [store.chunks[i] for i in top_indices]
    
    return top_indices.tolist(), top_scores.tolist(), top_chunks


# =========================================================
# 파이프라인
# =========================================================
def cmd_ingest(ns: argparse.Namespace):
    path = Path(ns.path)
    if not path.exists():
        raise SystemExit(f"[ERROR] File not found: {path}")

    raw = read_text(path)
    chunks = make_chunks(raw, unit=ns.unit, window=ns.window, stride=ns.stride)
    if not chunks:
        raise SystemExit("[ERROR] 빈 문서")

    print(f"[INFO] chunks: {len(chunks)} (unit={ns.unit})")

    # Dense 임베딩 + FAISS
    print("[INFO] Building dense embeddings...")
    vecs = embed_texts(chunks)
    dense_idx = build_faiss_index(vecs)

    # BM25 인덱스
    print("[INFO] Building BM25 index...")
    bm25 = build_bm25_index(chunks)

    # 저장
    base = STORAGE_ROOT / ns.doc_id
    base.mkdir(parents=True, exist_ok=True)
    
    save_faiss(dense_idx, base / "faiss.index")
    save_bm25(bm25, base / "bm25.pkl")

    store = RAGStore(
        doc_id=ns.doc_id, 
        chunks=chunks, 
        emb_dim=vecs.shape[1],
        index_path=base / "faiss.index",
        bm25_path=base / "bm25.pkl",
        meta_path=base / "meta.json"
    )
    store.save_meta()

    print(f"[OK] Ingested: {ns.doc_id} | chunks={len(chunks)} | dim={vecs.shape[1]}")

def build_answer_prompt(question: str, contexts: list[str]) -> str:
    ctx_joined = "\n\n---\n\n".join(contexts)
    return f"""너는 한국어 독서 도우미다. 아래 '근거 문맥'만 사용해 질문에 답하라.

규칙:
- 답변은 📌 이모지로 시작하는 1문단 요약, 첫 줄에 질문에 대한 답을 **직접 답변** 
- 이어서 📝 이모지로 핵심 인용 1줄만 보여줘 (따옴표로 감싸기)
- 불확실하면 "본문에 명확한 근거 없음"이라고 말해

[질문]
{question}

[근거 문맥]
{ctx_joined}
"""

def cmd_ask(ns: argparse.Namespace):
    ids, scores, hits = hybrid_retrieve(ns.doc_id, ns.q, k=ns.k, alpha=ns.alpha)
    
    context_text = "\n\n---\n\n".join(hits)

    prompt = f"""
독서 Q/A 과제입니다.
오로지 아래 문맥만 활용해 질문에 답하세요.

[문맥]
{context_text}

[질문]
{ns.q}


규칙:
- 답변은 📌 이모지로 시작하는 1문단 요약, 첫 줄에 질문에 대한 답을 **직접 답변** 
- 이어서 📝 이모지로 핵심 인용 1줄만 보여줘 (따옴표로 감싸기)
- 불확실하면 "본문에 명확한 근거 없음"이라고 말해
"""
    answer = gpt4omini_chat(prompt, max_tokens=400)

    print(f"\n❓ {ns.q}\n")
    print(f"🧠 답변:\n{answer}\n")


def cmd_summarize(ns: argparse.Namespace):
    store = RAGStore.load(ns.doc_id)
    text = "\n\n".join(store.chunks)
    
    # 긴 텍스트는 나눠서 요약
    step = 1500
    parts = [text[i:i+step] for i in range(0, len(text), step)]
    
    partials = []
    for i, chunk in enumerate(parts, 1):
        p = f"""아래 텍스트를 한국어로 핵심만 3~5문장 bullet 요약:

{chunk}
"""
        partials.append(gpt4omini_chat(p, max_tokens=200))
    
    reduce_prompt = f"""다음 부분 요약들을 통합해 최종 {ns.sentences}문장 요약 작성:

구성:
- 📌 한줄 요약 (1문장)
- ✅ 줄거리 핵심 (번호)
- 👥 주요 인물 관계
- 🧠 주제/정서

부분 요약:
{chr(10).join('- ' + s for s in partials)}
"""
    final = gpt4omini_chat(reduce_prompt, max_tokens=400)
    print(final)

# =========================================================
# CLI
# =========================================================
def build_parser():
    ap = argparse.ArgumentParser(description="RAG MVP: Hybrid Search (BM25+Dense) + Llama")
    sub = ap.add_subparsers(dest="cmd", required=True)

    ap_i = sub.add_parser("ingest")
    ap_i.add_argument("--doc_id", required=True)
    ap_i.add_argument("--path", required=True)
    ap_i.add_argument("--unit", choices=["para","sent"], default="para")
    ap_i.add_argument("--window", type=int, default=1)
    ap_i.add_argument("--stride", type=int, default=1)
    ap_i.set_defaults(func=cmd_ingest)

    ap_a = sub.add_parser("ask")
    ap_a.add_argument("--doc_id", required=True)
    ap_a.add_argument("-q", required=True)
    ap_a.add_argument("-k", type=int, default=6)
    ap_a.add_argument("--alpha", type=float, default=0.5, 
                     help="BM25 가중치 (0~1). 0.5=균형, 0.7=키워드 중시, 0.3=의미 중시")
    ap_a.set_defaults(func=cmd_ask)

    ap_s = sub.add_parser("summarize")
    ap_s.add_argument("--doc_id", required=True)
    ap_s.add_argument("--sentences", type=int, default=7)
    ap_s.set_defaults(func=cmd_summarize)

    return ap



# =========================================================
# Gradio UI
# =========================================================
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
def gpt4omini_chat(prompt: str, max_tokens=300):
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.2,
            top_p=0.9,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"[ERROR: GPT-4o-mini] {e}"

def run_gradio():
    import gradio as gr
    from pathlib import Path

    # ------------------------
    # 1) Functions (정의 먼저)
    # ------------------------

    # ---- ingest ----
    def ui_ingest(doc_id, file_obj, unit, window, stride):
        if file_obj is None:
            return "[ERROR] 텍스트 파일을 업로드하세요."

        try:
            # ------------------------------
            # 1) file_obj가 bytes인 경우 (Gradio type="binary")
            # ------------------------------
            if isinstance(file_obj, bytes):
                try:
                    text = file_obj.decode("utf-8")
                except UnicodeDecodeError:
                    text = file_obj.decode("cp949")  # 한글 윈도우 txt 대응

            # ------------------------------
            # 2) file_obj가 dict 형태인 경우 (data 필드 존재)
            # ------------------------------
            elif isinstance(file_obj, dict):
                data = file_obj.get("data")
                if data is None:
                    return "[ERROR] 업로드된 파일 데이터가 비어 있습니다."
                try:
                    text = data.decode("utf-8")
                except UnicodeDecodeError:
                    text = data.decode("cp949")

            # ------------------------------
            # 3) file_obj가 temp파일 객체인 경우
            # ------------------------------
            elif hasattr(file_obj, "read"):
                raw = file_obj.read()
                try:
                    text = raw.decode("utf-8")
                except UnicodeDecodeError:
                    text = raw.decode("cp949")

            else:
                return "[ERROR] 지원하지 않는 파일 형식입니다."

            # ------------------------------
            # 4) 내용이 진짜 비었는지 확인
            # ------------------------------
            if len(text.strip()) == 0:
                return "[ERROR] 업로드된 파일이 비어있습니다."

            # ------------------------------
            # 5) 텍스트를 임시 파일로 저장
            # ------------------------------
            temp_path = Path("temp_upload.txt")
            temp_path.write_text(text, encoding="utf-8")

        except Exception as e:
            return f"[ERROR] 파일 처리 실패: {e}"

        # ingest 실행
        class Ns: pass
        ns = Ns()
        ns.doc_id = doc_id
        ns.path = str(temp_path)
        ns.unit = unit
        ns.window = window
        ns.stride = stride

        try:
            cmd_ingest(ns)
            return f"[OK] {doc_id} ingest 완료!"
        except Exception as e:
            return f"[ERROR] {e}"



    # ---- ask ----
    def ui_ask(doc_id, question, k, alpha):
        try:
            ids, scores, chunks = hybrid_retrieve(doc_id, question, k=k, alpha=alpha)
            ctx = "\n\n---\n\n".join(chunks)

            prompt = f"""
    독서 Q/A 과제입니다.
    오로지 아래 문맥만 활용해 질문에 답하세요.

    [문맥]
    {ctx}

    [질문]
    {question}

    출력 형식:
    - 첫 문단: 정답 (직접)
    - 다음: 2~4개 bullet 근거 요약
    - 마지막: 핵심 인용 1줄(따옴표)
    """

            answer = gpt4omini_chat(prompt, max_tokens=400)

            preview = "\n\n".join(
                [f"[{i+1}] score={scores[i]:.3f}\n{chunks[i][:200]}"
                for i in range(len(chunks))]
            )
            return answer, preview

        except Exception as e:
            return f"[ERROR] {e}", ""


    # ---- summarize ----
    # def ui_summarize(doc_id, sentences):
    #     try:
    #         store = RAGStore.load(doc_id)
    #         text = "\n\n".join(store.chunks)
    #         step = 5000
    #         parts = [text[i:i + step] for i in range(0, len(text), step)]
    #         partials = []
    #         for ch in parts:
    #             p = f"아래 텍스트를 한국어로 핵심만 요약:\n{ch}"
    #             partials.append(llama_chat(p, max_new_tokens=200))

    #         reduce_prompt = (
    #             f"다음 부분 요약을 {sentences}문장으로 통합:\n" +
    #             "\n".join('- ' + s for s in partials)
    #         )
    #         return llama_chat(reduce_prompt)

    #     except Exception as e:
    #         return f"[ERROR] {e}"
    def ui_summarize(doc_id, sentences):
        try:
            store = RAGStore.load(doc_id)
            text = "\n\n".join(store.chunks)

            # 길게 쪼개기
            step = 5000
            parts = [text[i:i + step] for i in range(0, len(text), step)]

            partials = []
            for ch in parts:
                prompt = f"아래 텍스트를 한국어로 핵심만 요약:\n{ch}"
                mini = gpt4omini_chat(prompt, max_tokens=300)
                partials.append(mini)

            reduce_prompt = (
                f"다음 부분 요약을 {sentences}문장으로 통합:\n" +
                "\n".join('- ' + s for s in partials)
            )

            final = gpt4omini_chat(reduce_prompt, max_tokens=300)
            return final

        except Exception as e:
            return f"[ERROR] {e}"

    # -----------------------------------
    # 2) Gradio UI Layout (함수 아래에)
    # -----------------------------------

    with gr.Blocks(title="ReadMate RAG MVP (Hybrid Search)") as demo:
        gr.Markdown("# 📚 ReadMate RAG MVP (Hybrid Search)")

        # ---- ingest tab ----
        with gr.Tab("📥 Ingest"):
            doc_id = gr.Textbox(label="Doc ID")
            file_upload = gr.File(label="Upload TXT File", type="binary")
            unit = gr.Radio(["para", "sent"], value="para", label="Chunk unit")
            window = gr.Slider(1, 5, value=1, label="Window")
            stride = gr.Slider(1, 5, value=1, label="Stride")
            ingest_btn = gr.Button("Ingest!")
            ingest_out = gr.Textbox(label="Result")
            ingest_btn.click(ui_ingest,
                             [doc_id, file_upload, unit, window, stride],
                             ingest_out)

        # ---- ask tab ----
        with gr.Tab("❓ Ask"):
            doc_id2 = gr.Textbox(label="Doc ID")
            question = gr.Textbox(label="Question")
            k = gr.Slider(1, 10, value=6, label="k (chunks)")
            alpha = gr.Slider(0.0, 1.0, value=0.5, label="alpha")
            ask_btn = gr.Button("Ask!")
            answer_out = gr.Textbox(label="LLM Answer")
            passage_out = gr.Textbox(label="Retrieved Chunks Preview")
            ask_btn.click(ui_ask, [doc_id2, question, k, alpha],
                          [answer_out, passage_out])

        # ---- summarize tab ----
        with gr.Tab("📝 Summarize"):
            doc_id3 = gr.Textbox(label="Doc ID")
            sent_num = gr.Slider(3, 20, value=7, label="Summary sentences")
            sum_btn = gr.Button("Summarize!")
            sum_out = gr.Textbox(label="Summary")
            sum_btn.click(ui_summarize, [doc_id3, sent_num], sum_out)

    demo.launch(server_name="127.0.0.1", share=False)



if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "ui":
        run_gradio()  # ← 그냥 이렇게 실행
    else:
        parser = build_parser()
        ns = parser.parse_args()
        ns.func(ns)

