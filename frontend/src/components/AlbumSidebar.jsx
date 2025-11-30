// src/components/AlbumSidebar.jsx
import { useNavigate } from "react-router-dom";
import "../styles/AlbumSidebar.css";

export default function AlbumSidebar() {
  const navigate = useNavigate();

  // 앨범 썸네일 3개 (이미지 경로는 네가 쓰는 걸로 맞춰도 됨)
  const thumbs = ["/album/img1.jpg", "/album/img2.png"];

  // 이번 주 읽은 시간 (임시 값)
  const progressPercent = 60; // 0~100 사이로 조절

  return (
    <aside className="album-sidebar">
      {/* 1. My Album 카드 */}
      <section
        className="album-card"
        onClick={() => navigate("/album")}
        style={{ cursor: "pointer" }}
      >
        <div className="album-pin" />
        <p className="album-card-title">My Album</p>
        <p className="album-card-sub">추억을 저장해요</p>

        <div className="album-thumb-column">
          {" "}
          {/* row → column */}
          {thumbs.map((src, idx) => (
            <div className="album-thumb" key={idx}>
              <img src={src} alt={`앨범 이미지 ${idx + 1}`} />
            </div>
          ))}
        </div>
      </section>

      {/* 2. 이번 주 독서 시간 */}
      <section className="weekly-card">
        <p className="weekly-title">이번 주 독서 시간</p>
        <p className="weekly-value">3h 20m</p>

        <div className="progress-track">
          <div
            className="progress-bar"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="weekly-scale">
          <span>0h</span>
          <span>10h</span>
        </div>
      </section>

      {/* 3. 포스트잇 메모 */}
      <section className="postit-card">
        <p className="postit-title">오늘의 한 줄</p>
        <p className="postit-text">“여기에 오늘의 문장을 남겨보세요.”</p>
        <div className="postit-heart">❤</div>
      </section>
    </aside>
  );
}
