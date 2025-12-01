// src/components/AlbumSidebar.jsx
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import "../styles/AlbumSidebar.css";

export default function AlbumSidebar() {
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [weeklySeconds, setWeeklySeconds] = useState(0);
  const secondsRef = useRef(0);

  useEffect(() => {
    try {
      const savedNote = localStorage.getItem("dailyNote") || "";
      const savedSeconds = Number(localStorage.getItem("weeklySeconds") || 0);
      setNote(savedNote);
      const initial = Number.isFinite(savedSeconds) ? savedSeconds : 0;
      setWeeklySeconds(initial);
      secondsRef.current = initial;
    } catch (err) {
      setNote("");
      setWeeklySeconds(0);
      secondsRef.current = 0;
    }

    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - last) / 1000;
      last = now;
      setWeeklySeconds((prev) => {
        const next = prev + deltaSec;
        secondsRef.current = next;
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      try {
        localStorage.setItem(
          "weeklySeconds",
          Math.round(secondsRef.current).toString()
        );
      } catch (err) {
        console.error(err);
      }
    };
  }, []);

  const handleNoteSave = () => {
    try {
      localStorage.setItem("dailyNote", note);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(
        "weeklySeconds",
        Math.round(weeklySeconds).toString()
      );
    } catch (err) {
      console.error(err);
    }
  }, [weeklySeconds]);

  // 앨범 썸네일 3개 (최근 저장 순)
  let thumbs = ["/album/img1.jpg", "/album/img2.png"];
  try {
    const raw = localStorage.getItem("customAlbumPhotos");
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed) && parsed.length > 0) {
      thumbs = parsed.slice(0, 3).map((p) => p.src);
    }
  } catch (err) {
    // ignore parse error
  }

  // 이번 주 읽은 시간 (임시 값)
  const progressPercent = Math.min(
    100,
    Math.round((weeklySeconds / (10 * 3600)) * 100)
  ); // 10시간 기준

  const totalMinutes = Math.floor(weeklySeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

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
        <p className="weekly-value">
          {hours}h {minutes}m
        </p>

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
        <textarea
          className="postit-textarea"
          placeholder="“여기에 오늘의 문장을 남겨보세요.”"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleNoteSave}
          maxLength={140}
        />
        <button className="postit-save" onClick={handleNoteSave}>
          저장
        </button>
        <div className="postit-heart">❤</div>
      </section>
    </aside>
  );
}
