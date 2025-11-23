import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import BookDetail from "../pages/BookDetail";
import Album from "../pages/Album";
import AlbumDetail from "../pages/AlbumDetail";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/book/:bookId" element={<BookDetail />} />
        <Route path="/album" element={<Album />} />
        <Route path="/album/:albumId" element={<AlbumDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
