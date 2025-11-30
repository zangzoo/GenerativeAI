// ReadingPage.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import "../styles/ReadingPage.css";
import ChatPanel from "../pages/ChatPanel";

export default function ReadingPage() {
  const { id } = useParams();

  const [rawText, setRawText] = useState("");
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(18);

  // 드래그된 텍스트 & 플로팅 메뉴 위치
  const [selectedText, setSelectedText] = useState("");
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);

  // 페이지 계산용 숨은 박스
  const measureRef = useRef(null);

  const titleMap = {
    romeoandjuliet: "로미오와 줄리엣",
  };
  const displayTitle = titleMap[id] || id;

  // 줄바꿈 정리
  function cleanText(raw) {
    return raw
      .replace(/\\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // 책 불러오기
  useEffect(() => {
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

  // 페이지 나누기 (DOM 기반, 글자 크기 반영)
  useEffect(() => {
    if (!rawText) return;

    const pageContainer = document.querySelector(".reader-page-inner");
    if (!pageContainer) return;

    const containerHeight = pageContainer.clientHeight;

    const measurer = measureRef.current;
    if (!measurer) return;

    // 화면에 보이는 본문과 스타일을 최대한 동일하게 맞춤
    measurer.style.fontSize = `${fontSize}px`;
    measurer.style.lineHeight = window
      .getComputedStyle(pageContainer)
      .lineHeight;
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
  }, [rawText, fontSize]);

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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p className="loading-text">📚 책을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="reading-layout">
      {/* ---------- LEFT : 리더 영역 ---------- */}
      <div className="reader-left">
        {/* 상단 제목 + 폰트 조절 */}
        <div className="reader-header">
          <h1 className="book-title">{displayTitle}</h1>

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

        {/* 본문 페이지 (실제 보여지는 영역) */}
        <div className="reader-page">
          <div
            className="reader-page-inner"
            style={{ fontSize: `${fontSize}px` }}
          >
            {pages[currentPage]}
          </div>
        </div>

        {/* 페이지 네비 */}
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

        {/* 화면과 동일 스타일의 숨겨진 측정 박스 */}
        <div ref={measureRef} className="measure-box" />
      </div>

      {/* ---------- RIGHT : 채팅 패널 ---------- */}
      <ChatPanel docId={id} selectedText={selectedText} />

      {/* 드래그 플로팅 메뉴 (요약 / 이미지 생성만) */}
      {showMenu && (
        <div
          className="selection-menu"
          style={{ top: menuPos.y, left: menuPos.x }}
        >
          <button>요약하기</button>
          <button>이미지 생성</button>
        </div>
      )}
    </div>
  );
}
