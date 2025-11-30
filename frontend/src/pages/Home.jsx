// Home.jsx
import Header from "../components/Header";
import BookCard from "../components/BookCard";
import "../styles/Home.css";
import { useState } from "react";
import AlbumSidebar from "../components/AlbumSidebar";

export default function Home() {
  const [username] = useState("예린");

  const books = [
    { id: 1, cover: "/covers/book1.png" },
    { id: 2, cover: "/covers/book2.png" },
    { id: 3, cover: "/covers/book3.png" },
    { id: 4, cover: "/covers/book4.png" },
    { id: 5, cover: "/covers/book5.png" },
  ];

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
            <div className="book-list">
              {books.map((b) => (
                <BookCard key={b.id} id={b.id} cover={b.cover} />
              ))}
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
