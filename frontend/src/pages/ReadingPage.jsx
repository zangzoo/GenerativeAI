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

  // ⭐ 드래그 팝업 상태
  const [selectedText, setSelectedText] = useState("");
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);

  const measureRef = useRef(null);
  const pageRef = useRef(null);

  const titleMap = {
    romeoandjuliet: "로미오와 줄리엣",
  };
  const displayTitle = titleMap[id] || id;

  // 텍스트 정리
  function cleanText(raw) {
    return raw
      .replace(/\\n/g, "\n")
      .replace(/\n{2,}/g, "\n\n")
      .trim();
  }

  // 책 불러오기
  useEffect(() => {
    async function load() {
      const res = await fetch(`http://localhost:8000/api/book/${id}`);
      const text = cleanText(await res.text());
      setRawText(text);
      setLoading(false);
    }
    load();
  }, [id]);

  // 페이지 나누기
  useEffect(() => {
    if (!rawText) return;

    const pageBox = pageRef.current;
    if (!pageBox) return;

    const availableHeight = pageBox.clientHeight;

    const measurer = measureRef.current;
    measurer.style.fontSize = `${fontSize}px`;
    measurer.style.width = `${pageBox.clientWidth}px`;

    const chars = rawText.split("");
    let currentChunk = "";
    const newPages = [];

    for (let i = 0; i < chars.length; i++) {
      const next = currentChunk + chars[i];
      measurer.innerText = next;

      if (measurer.clientHeight > availableHeight) {
        newPages.push(currentChunk);
        currentChunk = chars[i];
      } else {
        currentChunk = next;
      }
    }

    if (currentChunk.trim().length > 0) newPages.push(currentChunk);
    setPages(newPages);
    setCurrentPage(0);
  }, [rawText, fontSize]);

  // ⭐ 드래그 메뉴 팝업 제어
  useEffect(() => {
    function handleMouseUp(e) {
      const sel = window.getSelection();
      const text = sel.toString().trim();

      if (text.length === 0) {
        setShowMenu(false);
        return;
      }

      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setMenuPos({ x: rect.left + window.scrollX, y: rect.top + window.scrollY - 40 });
      setSelectedText(text);
      setShowMenu(true);
    }

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p className="loading-text">📚 책을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="reading-layout">

      {/* LEFT */}
      <div className="reader-left">

        <div className="reader-header">
          <h1 className="book-title">{displayTitle}</h1>

          <div className="font-controls">
            <button onClick={() => setFontSize(s => Math.max(14, s - 2))}>A-</button>
            <span>{fontSize}px</span>
            <button onClick={() => setFontSize(s => Math.min(36, s + 2))}>A+</button>
          </div>
        </div>

        {/* 본문 */}
        <div ref={pageRef} className="reader-page" style={{ fontSize: `${fontSize}px` }}>
          {pages[currentPage]}
        </div>

        <div className="reader-controls">
          <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
            ◀ 이전
          </button>

          <span>{currentPage + 1} / {pages.length}</span>

          <button
            disabled={currentPage === pages.length - 1}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            다음 ▶
          </button>
        </div>

        <div ref={measureRef} className="measure-box"></div>
      </div>

      {/* RIGHT: Chat */}
      <ChatPanel selectedText={selectedText} docId={id} />

      {/* ⭐ 드래그 팝업 */}
      {showMenu && (
        <div className="selection-menu" style={{ top: menuPos.y, left: menuPos.x }}>
          <button>요약하기</button>
          <button>이미지 생성</button>
        </div>
      )}
    </div>
  );
}
