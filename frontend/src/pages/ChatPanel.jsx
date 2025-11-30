// ChatPanel.jsx
import { useState } from "react";
import "../styles/ChatPanel.css";

export default function ChatPanel({ docId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // 🔥 백엔드 /ask 호출
  async function sendMessage(text) {
    const question = (text ?? input).trim();
    if (!question) return;

    // 사용자 메시지 추가
    setMessages(prev => [...prev, { sender: "user", text: question }]);
    setInput("");

    try {
      const res = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: docId,
          question,
          k: 4,
        }),
      });

      const data = await res.json();
      const answer = data?.answer || "응답을 가져오지 못했어요.";

      setMessages(prev => [...prev, { sender: "bot", text: answer }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { sender: "bot", text: "❌ 서버 오류가 발생했습니다." },
      ]);
    }
  }

  return (
    <div className="chat-panel">
      <h2 className="chat-title">🤖 AI 독서 도우미</h2>

      {/* 채팅 메시지 박스 */}
      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className={`chat-message ${m.sender}`}>
            {m.text}
          </div>
        ))}
      </div>

      {/* 입력창 */}
      <div className="chat-input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문 입력..."
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button onClick={() => sendMessage()}>전송</button>
      </div>
    </div>
  );
}
