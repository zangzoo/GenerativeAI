import "../styles/BookCard.css";

export default function BookCard({ id, cover, onClick }) {
  const handleClick = () => {
    console.log("🖱️ BookCard clicked - ID:", id);
    if (onClick) {
      onClick();
    } else {
      console.warn("⚠️ No onClick handler provided");
    }
  };

  return (
    <div
      className="book-card"
      onClick={handleClick}
    >
      <img src={cover} alt="book cover" className="book-cover" />
    </div>
  );
}