import { useNavigate } from "react-router-dom";
import "../styles/BookCard.css";

export default function BookCard({ id, cover }) {
  const navigate = useNavigate();

  return (
    <div className="book-card" onClick={() => navigate(`/book/${id}`)}>
      <img src={cover} alt="book cover" className="book-cover" />
    </div>
  );
}
