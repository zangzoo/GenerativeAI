// src/pages/AlbumDetail.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/AlbumDetail.css";

export default function AlbumDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { photo } = location.state || {};

  const stripGenerateSuffix = (text = "") =>
    text.replace(/\s*이미지 생성해줘\s*$/g, "").trim();

  const titleMap = {
    romeoandjuliet: "로미오와 줄리엣",
  };

  const isCustom = String(photo?.id || "").startsWith("gen-");
  const displayTitle =
    titleMap[photo?.bookTitle] || photo?.bookTitle || "알 수 없는 책";
  const [caption, setCaption] = useState(photo?.caption || "");
  const [quote, setQuote] = useState(stripGenerateSuffix(photo?.quote || ""));
  const [isEditMode, setIsEditMode] = useState(false);

  // 데이터가 없으면 앨범 페이지로 리다이렉트
  useEffect(() => {
    if (!photo) {
      navigate("/album");
    }
  }, [photo, navigate]);

  if (!photo) {
    return null;
  }

  const handleSave = () => {
    if (isCustom && isEditMode) {
      try {
        const key = "customAlbumPhotos";
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        const updated = parsed.map((p) =>
          p.id === photo.id ? { ...p, caption, quote } : p
        );
        localStorage.setItem(key, JSON.stringify(updated));
        alert("수정 내용을 저장했어요.");
      } catch (err) {
        alert("저장 중 오류가 발생했습니다.");
      }
      return;
    }
    alert("사진이 저장되었습니다!");
  };

  const handleDelete = () => {
    if (window.confirm("이 사진을 삭제하시겠습니까?")) {
      alert("삭제되었습니다!");
      navigate("/album");
    }
  };

  return (
    <div className="album-detail-page">
      {/* 헤더 */}
      <div className="detail-header">
        <div className="header-left">
          <button onClick={() => navigate("/album")} className="back-button">
            ←
          </button>
          <div className="book-info">
            <h1 className="book-title">{displayTitle}</h1>
            <p className="save-date">저장한 날짜: {photo.date}</p>
          </div>
        </div>

        <div className="header-right">
          {isCustom && (
            <button
              className={`action-button ${isEditMode ? "active" : ""}`}
              onClick={() => setIsEditMode((v) => !v)}
            >
              {isEditMode ? "편집 종료" : "수정"}
            </button>
          )}
          <button className="action-button" onClick={handleSave}>
            저장
          </button>
          <button className="action-button delete" onClick={handleDelete}>
            삭제
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="detail-content">
        {/* 사진 */}
        <div className="detail-photo">
          <img src={photo.src} alt={photo.caption} />
        </div>

        {/* 구절 */}
        <div className="detail-quote">
          <div className="quote-mark">"</div>
          {isEditMode && isCustom ? (
            <>
              <textarea
                className="quote-text edit"
                placeholder="메모를 입력하세요"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
              />
              <div className="quote-divider"></div>
              <input
                className="quote-caption edit"
                placeholder="캡션을 입력하세요"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </>
          ) : (
            <>
              <p className="quote-text">{quote}</p>
              <div className="quote-divider"></div>
              <p className="quote-caption">{caption}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
