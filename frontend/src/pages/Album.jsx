// src/pages/Album.jsx
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "../styles/Album.css";

export default function Album() {
  const navigate = useNavigate();
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  // 앨범 데이터
  const photos = [
    {
      id: 1,
      src: "/album/img1.jpg",
      caption: "도서관에서의 평화로운 오후",
      bookTitle: "트렌드 코리아 2026",
      date: "2024.11.15",
      quote: "미래를 예측하는 가장 좋은 방법은 미래를 만드는 것이다.",
    },
    {
      id: 2,
      src: "/album/img2.png",
      caption: "좋아하는 책과 함께한 시간",
      bookTitle: "다정한 사람이 이긴다",
      date: "2024.11.20",
      quote: "작은 친절이 세상을 바꾼다.",
    },
    {
      id: 3,
      src: "/album/img3.jpg",
      caption: "카페에서 읽은 특별한 이야기",
      bookTitle: "MOMO",
      date: "2024.11.25",
      quote: "시간은 생명이다. 그리고 생명은 우리 마음속에 깃들어 있다.",
    },
    {
      id: 4,
      src: "/album/img4.jpg",
      caption: "따뜻한 햇살 아래 독서",
      bookTitle: "심리학의 이해",
      date: "2024.11.28",
      quote: "자신을 아는 것이 모든 지혜의 시작이다.",
    },
    {
      id: 5,
      src: "/album/img5.jpg",
      caption: "밤하늘을 보며 읽던 책",
      bookTitle: "달러구트 꿈 백화점",
      date: "2024.11.29",
      quote: "꿈은 우리가 진짜 원하는 것을 보여준다.",
    },
    {
      id: 6,
      src: "/album/img6.jpg",
      caption: "소중한 독서의 순간들",
      bookTitle: "제로 투 원",
      date: "2024.11.30",
      quote: "경쟁하지 말고, 독점하라.",
    },
  ];

  // 사진 클릭 - 상세 페이지로 이동
  const handlePhotoClick = (photo) => {
    if (!isSelectMode) {
      navigate(`/album/${photo.id}`, { state: { photo } });
    } else {
      toggleSelect(photo.id);
    }
  };

  // 사진 선택 토글
  const toggleSelect = (id) => {
    if (selectedPhotos.includes(id)) {
      setSelectedPhotos(selectedPhotos.filter((photoId) => photoId !== id));
    } else {
      setSelectedPhotos([...selectedPhotos, id]);
    }
  };

  // 선택 모드 토글
  const handleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) {
      setSelectedPhotos([]);
    }
  };

  // 저장
  const handleSave = () => {
    alert("선택한 사진을 저장했습니다!");
  };

  // 삭제
  const handleDelete = () => {
    if (selectedPhotos.length === 0) {
      alert("삭제할 사진을 선택해주세요!");
      return;
    }
    if (
      window.confirm(`${selectedPhotos.length}개의 사진을 삭제하시겠습니까?`)
    ) {
      alert("삭제되었습니다!");
      setSelectedPhotos([]);
      setIsSelectMode(false);
    }
  };

  return (
    <div className="album-page">
      {/* 헤더 */}
      <div className="album-header">
        <div className="header-left">
          <button onClick={() => navigate("/")} className="back-button">
            ←
          </button>
          <h1 className="album-title">예린님의 앨범</h1>
        </div>

        <div className="header-right">
          <button
            className={`action-button ${isSelectMode ? "active" : ""}`}
            onClick={handleSelectMode}
          >
            {isSelectMode ? "취소" : "선택"}
          </button>
          <button className="action-button" onClick={handleSave}>
            저장
          </button>
          <button className="action-button delete" onClick={handleDelete}>
            삭제
          </button>
        </div>
      </div>

      {/* 사진 그리드 */}
      <div className="photo-grid">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className={`photo-card ${
              selectedPhotos.includes(photo.id) ? "selected" : ""
            }`}
            onClick={() => handlePhotoClick(photo)}
          >
            {/* 선택 체크박스 */}
            {isSelectMode && (
              <div className="photo-checkbox">
                {selectedPhotos.includes(photo.id) && "✓"}
              </div>
            )}

            {/* 폴라로이드 사진 */}
            <div className="polaroid">
              <div className="photo-image">
                <img src={photo.src} alt={photo.caption} />
              </div>
              <p className="photo-caption">{photo.caption}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
