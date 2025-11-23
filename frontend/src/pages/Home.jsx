import Header from "../components/Header";
import BookCard from "../components/BookCard";
import AlbumShortcut from "../components/AlbumShortcut";
import "../styles/Home.css";
import { useState } from "react";

export default function Home() {
  const [username] = useState("예린");

  const books = [
    { id: 1, cover: "/covers/book1.png" },
    { id: 2, cover: "/covers/book2.png" },
    { id: 3, cover: "/covers/book3.png" },
    { id: 4, cover: "/covers/book4.png" },
    { id: 5, cover: "/covers/book5.png" },
    { id: 6, cover: "/covers/book6.png" },
  ];

  return (
    <div className="home-container">
      <Header />

      <h2 className="section-title">{username}님의 책장</h2>

      <div className="main-section">
        {/* 왼쪽 책장 */}
        <div className="book-list-container">
          <div className="book-list">
            {books.map((b) => (
              <BookCard key={b.id} id={b.id} cover={b.cover} />
            ))}
          </div>
        </div>

        {/* 오른쪽 앨범 */}
        <AlbumShortcut />
      </div>
    </div>
  );
}
