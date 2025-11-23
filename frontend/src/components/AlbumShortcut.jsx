import { useEffect, useState } from "react";
import "../styles/AlbumShortcut.css";

export default function AlbumShortcut() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const albumImages = [
    "/album/img1.jpg",
    "/album/img2.png",
    "/album/img3.jpg",
    "/album/img4.jpg",
    "/album/img5.jpg",
    "/album/img6.jpg",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % albumImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []); // 여기 빈 배열 유지해도 됨 — 내부에서 setCurrentIndex가 state를 제대로 바꾸기 때문

  return (
    <div className="album-shortcut">
      <h3>My Album</h3>
      <div className="album-box">
        <img
          src={albumImages[currentIndex]}
          className="album-img"
          alt="album"
        />
      </div>
    </div>
  );
}
