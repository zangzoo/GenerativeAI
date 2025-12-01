// Home.jsx
import Header from "../components/Header";
import BookCard from "../components/BookCard";
import "../styles/Home.css";
import { useCallback, useEffect, useRef, useState } from "react";
import AlbumSidebar from "../components/AlbumSidebar";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [username] = useState("수정");
  const navigate = useNavigate();
  const bookListRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const books = [
    { id: "romeoandjuliet", cover: "/covers/book7.png" },
    { id: 1, cover: "/covers/book1.png" },
    { id: 2, cover: "/covers/book2.png" },
    { id: 3, cover: "/covers/book3.png" },
    { id: 4, cover: "/covers/book4.png" },
    { id: 5, cover: "/covers/book5.png" },
  ];

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

  return (
    <div className="layout-container">
      {/* 왼쪽 메인 페이지 */}
      <div className="main-left">
        <Header />
        <h2 className="section-title">{username}님의 책장</h2>

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
                {books.map((b) => (
                  <BookCard
                    key={b.id}
                    id={b.id}
                    cover={b.cover}
                    onClick={() => navigate(`/book/${b.id}`)}
                  />
                ))}
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
        </div>
      </div>

      {/* 오른쪽 사이드 패널 */}
      <AlbumSidebar />
    </div>
  );
}
