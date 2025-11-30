// App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Album from "./pages/Album";
import AlbumDetail from "./pages/AlbumDetail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/album" element={<Album />} />
        <Route path="/album/:id" element={<AlbumDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
