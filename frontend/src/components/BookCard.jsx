import { useRef } from "react";
import "../styles/BookCard.css";

export default function BookCard({
  id,
  cover,
  title,
  onClick,
  isCustom = false,
  onCoverChange,
  selectMode = false,
  isSelected = false,
  onSelect,
}) {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    console.log("🖱️ BookCard clicked - ID:", id);
    if (selectMode && isCustom) {
      onSelect?.();
      return;
    }
    if (onClick) {
      onClick();
    } else {
      console.warn("⚠️ No onClick handler provided");
    }
  };

  const handleCoverButton = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleCoverFile = (e) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file && onCoverChange) {
      onCoverChange(file);
    }
    // allow reselecting same file
    e.target.value = "";
  };

  return (
    <div className="book-card" onClick={handleClick}>
      {isCustom && selectMode && (
        <button
          className={`book-select-badge ${isSelected ? "selected" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
          aria-label="책 선택"
        >
          {isSelected ? "✓" : ""}
        </button>
      )}
      {cover ? (
        <div className="cover-image-wrapper">
          <img src={cover} alt="book cover" className="book-cover" />
          {isCustom && (
            <button className="cover-edit-btn" onClick={handleCoverButton}>
              책 표지 수정
            </button>
          )}
        </div>
      ) : (
        <div className="blank-cover">
          <div className="cover-title">{title || "내 책"}</div>
          {isCustom && (
            <button className="cover-edit-btn" onClick={handleCoverButton}>
              책 표지 수정
            </button>
          )}
        </div>
      )}
      {isCustom && (
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="cover-file-input"
          onChange={handleCoverFile}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
}
