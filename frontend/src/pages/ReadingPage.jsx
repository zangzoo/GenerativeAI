// ReadingPage.jsx
import { useParams, useNavigate } from "react-router-dom"; // ★ useNavigate 추가
import { useEffect, useRef, useState } from "react";
import "../styles/ReadingPage.css";
import ChatPanel from "../pages/ChatPanel";

export default function ReadingPage() {
  const { id } = useParams();
  const navigate = useNavigate(); // ★ 추가

  const [rawText, setRawText] = useState("");
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [pdfSrc, setPdfSrc] = useState(null);
  const [pdfTextError, setPdfTextError] = useState("");
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [textAvailable, setTextAvailable] = useState(false);
  const [viewMode, setViewMode] = useState("text"); // "pdf" | "text"
  const pdfjsLoaderRef = useRef(null);

  // 드래그된 텍스트 & 플로팅 메뉴 위치
  const [selectedText, setSelectedText] = useState("");
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [displayTitle, setDisplayTitle] = useState(id || "");

  // 페이지 계산용 숨은 박스
  const measureRef = useRef(null);
  const chatRef = useRef(null);

  // 줄바꿈 정리
  function cleanText(raw) {
    return raw
      .replace(/\\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // pdf.js 로더 (필요 시)
  const loadPdfJs = () => {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsLoaderRef.current) return pdfjsLoaderRef.current;

    pdfjsLoaderRef.current = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.min.js";
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.6.82/build/pdf.worker.min.js";
          resolve(window.pdfjsLib);
        } else {
          reject(new Error("pdfjsLib not available after load"));
        }
      };
      script.onerror = () => reject(new Error("Failed to load pdf.js"));
      document.body.appendChild(script);
    }).catch((err) => {
      console.error(err);
      return null;
    });

    return pdfjsLoaderRef.current;
  };

  const extractPdfText = async (src) => {
    const pdfjsLib = await loadPdfJs();
    if (!pdfjsLib) throw new Error("pdf.js unavailable");
    const arrayBuffer = await fetch(src).then((res) => res.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => item.str).join(" ");
      text += strings + "\n\n";
    }
    return text.trim();
  };

  // 책 불러오기
  useEffect(() => {
    setLoading(true);
    setRawText("");
    setPdfSrc(null);
    setPdfTextError("");
    setIsExtractingPdf(false);
    setTextAvailable(false);
    setViewMode("text");

    // 1) 로컬에 저장된 사용자 책이면 바로 사용
    try {
      const raw = localStorage.getItem("userBooks");
      const parsed = raw ? JSON.parse(raw) : [];
      const found = Array.isArray(parsed)
        ? parsed.find((b) => b.id?.toString() === id)
        : null;

      if (found) {
        setDisplayTitle(found.title || id);

        if (found.fileType === "pdf") {
          const pdfData = found.pdfDataUrl || found.content || "";
          if (pdfData) {
            setPdfSrc(pdfData || null);
            setViewMode("pdf");
            setLoading(false);
            return;
          }
          // pdf 데이터가 비어있으면 다음 로직으로 넘어가 텍스트라도 보여줌
        }

        const textContent = found.content || found.plainText || "";
        if (textContent) {
          setRawText(cleanText(textContent));
          setLoading(false);
          return;
        }
        // 로컬에 있지만 내용이 없으면 로딩만 끄고 종료
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Failed to load local book", err);
    }

    const titleMap = {
      romeoandjuliet: "로미오와 줄리엣",
    };
    setDisplayTitle(titleMap[id] || id);

    async function load() {
      try {
        const res = await fetch(`http://localhost:8000/api/book/${id}`);
        const text = cleanText(await res.text());
        setRawText(text);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // PDF 텍스트 추출 시도 (뷰어에서 요약/이미지 생성을 위해 텍스트 모드 제공)
  useEffect(() => {
    if (!pdfSrc) return;
    if (rawText) {
      setTextAvailable(true);
      return;
    }

    let canceled = false;
    setIsExtractingPdf(true);
    setPdfTextError("");

    extractPdfText(pdfSrc)
      .then((text) => {
        if (canceled) return;
        if (text) {
          setRawText(cleanText(text));
          setTextAvailable(true);
        } else {
          setPdfTextError("PDF에서 텍스트를 찾지 못했어요.");
        }
      })
      .catch((err) => {
        console.error(err);
        if (!canceled) {
          setPdfTextError("PDF 텍스트 추출에 실패했어요.");
        }
      })
      .finally(() => {
        if (!canceled) setIsExtractingPdf(false);
      });

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfSrc]);

  useEffect(() => {
    if (pdfSrc && rawText) {
      setTextAvailable(true);
    }
  }, [pdfSrc, rawText]);

  // 페이지 나누기 (DOM 기반, 글자 크기 반영)
  useEffect(() => {
    if (!rawText || (pdfSrc && viewMode === "pdf")) return;

    const pageContainer = document.querySelector(".reader-page-inner");
    if (!pageContainer) return;

    const containerHeight = pageContainer.clientHeight;

    const measurer = measureRef.current;
    if (!measurer) return;

    measurer.style.fontSize = `${fontSize}px`;
    measurer.style.lineHeight =
      window.getComputedStyle(pageContainer).lineHeight;
    measurer.style.width = `${pageContainer.clientWidth}px`;

    const chars = rawText.split("");
    let currentChunk = "";
    const newPages = [];

    for (let i = 0; i < chars.length; i++) {
      const nextChunk = currentChunk + chars[i];
      measurer.innerText = nextChunk;

      if (measurer.clientHeight > containerHeight) {
        newPages.push(currentChunk);
        currentChunk = chars[i];
      } else {
        currentChunk = nextChunk;
      }
    }

    if (currentChunk.trim().length > 0) {
      newPages.push(currentChunk);
    }

    setPages(newPages);
    setCurrentPage(0);
  }, [rawText, fontSize, pdfSrc]);

  // 드래그 메뉴
  useEffect(() => {
    function handleMouseUp(e) {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";

      if (text.length > 0) {
        setSelectedText(text);
        setMenuPos({ x: e.pageX, y: e.pageY - 40 });
        setShowMenu(true);
      } else {
        setShowMenu(false);
      }
    }

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  const handleSummaryClick = () => {
    if (!selectedText) return;
    chatRef.current?.summarizeSelection(selectedText);
    setShowMenu(false);
  };

  const handleImageClick = () => {
    if (!selectedText) return;
    chatRef.current?.generateImageFromSelection(selectedText);
    setShowMenu(false);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p className="loading-text">📚 책을 불러오는 중...</p>
      </div>
    );
  }

  const isPdf = Boolean(pdfSrc);

  return (
    <div className="reading-layout">
      {/* ---------- LEFT : 리더 영역 ---------- */}
      <div className="reader-left">
        {/* ★ 상단 헤더: 뒤로가기 + 제목 + 폰트 조절 */}
        <div className="reader-header">
          <div className="header-left-group">
            <button onClick={() => navigate("/")} className="back-button">
              ←
            </button>
            <h1 className="book-title">{displayTitle}</h1>
          </div>

          <div className="header-actions">
            {isPdf && (
              <div className="view-toggle">
                <button
                  className={viewMode === "pdf" ? "active" : ""}
                  onClick={() => setViewMode("pdf")}
                >
                  PDF 보기
                </button>
                <button
                  className={viewMode === "text" ? "active" : ""}
                  onClick={() => setViewMode("text")}
                  disabled={!textAvailable && !rawText && isExtractingPdf}
                  title={
                    textAvailable
                      ? "텍스트 보기"
                      : isExtractingPdf
                        ? "텍스트 추출 중..."
                        : "텍스트를 준비할 수 없어요"
                  }
                >
                  텍스트 보기
                </button>
              </div>
            )}
            <div className="font-controls">
              <button onClick={() => setFontSize((s) => Math.max(14, s - 2))}>
                A-
              </button>
              <span>{fontSize}px</span>
              <button onClick={() => setFontSize((s) => Math.min(36, s + 2))}>
                A+
              </button>
            </div>
          </div>
        </div>

        {/* 본문 페이지 (실제 보여지는 영역) */}
        <div className="reader-page">
          {isPdf && viewMode === "pdf" ? (
            <div className="pdf-viewer">
              {pdfSrc ? (
                <iframe
                  title={`${displayTitle} PDF`}
                  src={pdfSrc}
                  className="pdf-frame"
                />
              ) : (
                <div className="pdf-fallback">PDF 파일을 불러올 수 없어요.</div>
              )}
            </div>
          ) : (
            <div
              className="reader-page-inner"
              style={{ fontSize: `${fontSize}px` }}
            >
              {pages[currentPage]}
            </div>
          )}
        </div>

        {/* 페이지 네비 (PDF면 안내 문구) */}
        {isPdf && viewMode === "pdf" ? (
          <div className="pdf-notice">
            PDF는 스크롤로 읽어주세요.
            {isExtractingPdf && <span className="pdf-status">텍스트 추출 중...</span>}
            {pdfTextError && <span className="pdf-status error">{pdfTextError}</span>}
            {textAvailable && (
              <>
                <span className="pdf-status">텍스트 보기로 전환해 요약/이미지 생성 가능</span>
                <button
                  className="pdf-switch-btn"
                  type="button"
                  onClick={() => setViewMode("text")}
                >
                  텍스트 보기로 이동
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="reader-controls">
            <button
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              ◀ 이전
            </button>

            <span>
              {currentPage + 1} / {pages.length}
            </span>

            <button
              disabled={currentPage === pages.length - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              다음 ▶
            </button>
          </div>
        )}

        {/* 화면과 동일 스타일의 숨겨진 측정 박스 */}
        <div ref={measureRef} className="measure-box" />
      </div>

      {/* ---------- RIGHT : 채팅 패널 ---------- */}
      <ChatPanel ref={chatRef} docId={id} />

      {/* 드래그 플로팅 메뉴 (요약 / 이미지 생성만) */}
      {showMenu && (
        <div
          className="selection-menu"
          style={{ top: menuPos.y, left: menuPos.x }}
        >
          <button onClick={handleSummaryClick}>요약하기</button>
          <button onClick={handleImageClick}>이미지 생성</button>
        </div>
      )}
    </div>
  );
}
