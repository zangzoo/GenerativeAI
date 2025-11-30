// src/pages/AlbumDetail.jsx
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/AlbumDetail.css";

export default function AlbumDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { photo } = location.state || {};

  // 데이터가 없으면 앨범 페이지로 리다이렉트
  if (!photo) {
    navigate("/album");
    return null;
  }

  const handleSave = () => {
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
            <h1 className="book-title">{photo.bookTitle}</h1>
            <p className="save-date">저장한 날짜: {photo.date}</p>
          </div>
        </div>

        <div className="header-right">
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
          <p className="quote-text">{photo.quote}</p>
          <div className="quote-divider"></div>
          <p className="quote-caption">{photo.caption}</p>
        </div>
      </div>
    </div>
  );
}
