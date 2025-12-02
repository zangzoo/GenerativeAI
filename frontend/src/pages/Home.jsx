// Home.jsx
import Header from "../components/Header";
import BookCard from "../components/BookCard";
import "../styles/Home.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AlbumSidebar from "../components/AlbumSidebar";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [username] = useState("수정");
  const navigate = useNavigate();
  const bookListRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [userBooks, setUserBooks] = useState([]);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookFile, setNewBookFile] = useState(null);
  const [addError, setAddError] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [persistError, setPersistError] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [addWarning, setAddWarning] = useState("");
  const pdfjsLoaderRef = useRef(null);

  const baseBooks = useMemo(
    () => [
      { id: "romeoandjuliet", cover: "/covers/book7.png", title: "로미오와 줄리엣" },
      { id: 1, cover: "/covers/book1.png", title: "기본 책 1" },
      { id: 2, cover: "/covers/book2.png", title: "기본 책 2" },
      { id: 3, cover: "/covers/book3.png", title: "기본 책 3" },
      { id: 4, cover: "/covers/book4.png", title: "기본 책 4" },
      { id: 5, cover: "/covers/book5.png", title: "기본 책 5" },
    ],
    []
  );

  const books = useMemo(
    () => [...baseBooks, ...userBooks],
    [baseBooks, userBooks]
  );

  const updateScrollState = useCallback(() => {
    const el = bookListRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  const scrollBooks = (direction) => {
    const el = bookListRef.current;
    if (!el) return;

    const amount = Math.max(el.clientWidth * 0.8, 260);
    const delta = direction === "left" ? -amount : amount;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  useEffect(() => {
    updateScrollState();
    const el = bookListRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  useEffect(() => {
    updateScrollState();
  }, [books.length, updateScrollState]);

  useEffect(() => {
    try {
      const readKey = (key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      };

      const primary = readKey("userBooks");
      const fallback = readKey("userBooksBackup");
      if (primary.length > 0) {
        setUserBooks(primary);
      } else if (fallback.length > 0) {
        setUserBooks(fallback);
      }
    } catch (err) {
      console.error("Failed to load local books", err);
    }
  }, []);

  useEffect(() => {
    try {
      const payload = JSON.stringify(userBooks);
      localStorage.setItem("userBooks", payload);
      localStorage.setItem("userBooksBackup", payload);
      setPersistError("");
    } catch (err) {
      console.error("Failed to save local books", err);
      setPersistError("로컬 저장공간이 부족해 저장하지 못했어요. 불필요한 데이터를 지워주세요.");
    }
  }, [userBooks]);

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

  const extractPdfText = async (file) => {
    const pdfjsLib = await loadPdfJs();
    if (!pdfjsLib) throw new Error("pdf.js unavailable");
    const arrayBuffer = await file.arrayBuffer();
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

  const handleAddBook = async (e) => {
    e.preventDefault();
    setAddError("");
    setAddWarning("");

    if (!newBookTitle.trim()) {
      setAddError("책 제목을 입력해주세요.");
      return;
    }
    if (!newBookFile) {
      setAddError("TXT 또는 PDF 파일을 업로드해주세요.");
      return;
    }

    const ext = newBookFile.name.split(".").pop().toLowerCase();
    if (!["txt", "pdf"].includes(ext)) {
      setAddError("TXT 또는 PDF 파일만 업로드할 수 있어요.");
      return;
    }

    try {
      let content = "";
      let pdfDataUrl = "";

      if (ext === "pdf") {
        try {
          content = await extractPdfText(newBookFile);
        } catch (err) {
          console.error("PDF 텍스트 추출 실패", err);
          setAddWarning("PDF 텍스트를 읽지 못했습니다. PDF 보기만 가능합니다.");
        }
        const toDataUrl = (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        pdfDataUrl = await toDataUrl(newBookFile);
      } else {
        content = await newBookFile.text();
      }

      const newBook = {
        id: `user-${Date.now()}`,
        title: newBookTitle.trim(),
        cover: "",
        fileType: ext,
        content,
        pdfDataUrl,
      };

      setUserBooks((prev) => [newBook, ...prev]);
      setNewBookTitle("");
      setNewBookFile(null);
      setIsAddOpen(false);
    } catch (err) {
      console.error(err);
      setAddError("파일을 읽는 중 문제가 발생했습니다.");
    }
  };

  const handleToggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds([]);
  };

  const handleSelectToggle = (bookId) => {
    setSelectedIds((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId]
    );
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setUserBooks((prev) => prev.filter((b) => !selectedIds.includes(b.id)));
    setSelectedIds([]);
    setSelectMode(false);
  };

  const handleCoverChange = (bookId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUserBooks((prev) =>
        prev.map((b) =>
          b.id === bookId
            ? {
                ...b,
                cover: typeof reader.result === "string" ? reader.result : b.cover,
              }
            : b
        )
      );
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="layout-container">
      {/* 왼쪽 메인 페이지 */}
      <div className="main-left">
        <Header />
        <div className="section-header">
          <h2 className="section-title">{username}님의 책장</h2>
          <div className="shelf-actions">
            <button
              type="button"
              className={`select-toggle ${selectMode ? "active" : ""}`}
              onClick={handleToggleSelectMode}
            >
              선택
            </button>
            <button
              type="button"
              className="delete-selected"
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0}
            >
              삭제
            </button>
          </div>
        </div>

        {/* ★ 선반 전체 영역 */}
        <div className="shelf-row">
          {/* ★ 선반 위에 올라가는 아이템들 (화분 + 책들) */}
          <div className="shelf-items">
            {/* 화분 */}
            <img src="/decor/plant.png" alt="" className="plant-image" />

            {/* 책 리스트 */}
            <div className="book-scroll-wrapper">
              <button
                type="button"
                className="scroll-button left"
                onClick={() => scrollBooks("left")}
                disabled={!canScrollLeft}
                aria-label="왼쪽으로 넘기기"
              >
                {"<"}
              </button>

              <div className="book-list" ref={bookListRef}>
                {books.map((b) => {
                  const isCustom = b.id?.toString().startsWith("user-");
                  return (
                    <BookCard
                      key={b.id}
                      id={b.id}
                      title={b.title}
                      cover={b.cover}
                      isCustom={isCustom}
                      selectMode={selectMode}
                      isSelected={selectedIds.includes(b.id)}
                      onSelect={
                        isCustom ? () => handleSelectToggle(b.id) : undefined
                      }
                      onCoverChange={
                        isCustom
                          ? (file) => handleCoverChange(b.id, file)
                          : undefined
                      }
                      onClick={() => navigate(`/book/${b.id}`)}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                className="scroll-button right"
                onClick={() => scrollBooks("right")}
                disabled={!canScrollRight}
                aria-label="오른쪽으로 넘기기"
              >
                {">"}
              </button>
            </div>
          </div>

          {/* ★ 나무 선반 (화분과 책 모두 아래) */}
          <div className="wood-shelf"></div>

          {/* 책 추가 */}
          <div className="add-book-panel">
            <button
              type="button"
              className="add-book-toggle"
              onClick={() => setIsAddOpen((v) => !v)}
            >
              책 추가하기
            </button>
            {isAddOpen && (
              <form className="add-book-form" onSubmit={handleAddBook}>
                <input
                  type="text"
                  placeholder="책 제목"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                />
                <label className="file-label">
                  <span>{newBookFile ? newBookFile.name : "TXT 또는 PDF 업로드"}</span>
                  <input
                    type="file"
                    accept=".txt,.pdf,text/plain,application/pdf"
                    onChange={(e) => setNewBookFile(e.target.files?.[0] || null)}
                  />
                </label>
                <button type="submit" className="submit-book">
                  책장에 추가
                </button>
              </form>
            )}
            {addError && <div className="add-book-error">{addError}</div>}
            {addWarning && <div className="add-book-warning">{addWarning}</div>}
            {persistError && <div className="add-book-error">{persistError}</div>}
          </div>
        </div>
      </div>

      {/* 오른쪽 사이드 패널 */}
      <AlbumSidebar />
    </div>
  );
}
