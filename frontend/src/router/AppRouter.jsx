import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Album from "../pages/Album";
import AlbumDetail from "../pages/AlbumDetail";
import ReadingPage from "../pages/ReadingPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* 책 상세/읽기: /book/:id로 ReadingPage 렌더링 */}
        <Route path="/book/:id" element={<ReadingPage />} />
        {/* 기존 /reading 경로도 그대로 유지 */}
        <Route path="/album" element={<Album />} />
        <Route path="/album/:albumId" element={<AlbumDetail />} />
        <Route path="/reading/:id" element={<ReadingPage />} />
      </Routes>
    </BrowserRouter>
  );
}
