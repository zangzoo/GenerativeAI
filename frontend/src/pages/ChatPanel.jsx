// ChatPanel.jsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ChatPanel.css";

const ChatPanel = forwardRef(function ChatPanel({ docId }, ref) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const progressTimerRef = useRef(null);
  const [modalImage, setModalImage] = useState(null);
  const navigate = useNavigate();

  useImperativeHandle(ref, () => ({
    summarizeSelection,
    generateImageFromSelection,
  }));

  // 항상 최신 메시지로 스크롤
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const pushUserMessage = (text) => {
    setMessages((prev) => [...prev, { sender: "user", text }]);
  };

  const pushBotMessage = (payload) => {
    setMessages((prev) => [...prev, { sender: "bot", ...payload }]);
  };

  const startImageProgress = () => {
    setIsImageGenerating(true);
    setImageProgress(1);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    const targetMs = 60 * 1000; // 1분 동안 기다릴 수 있게 진행 바를 천천히 올림
    const tickMs = 1000;
    const increment = 85 / (targetMs / tickMs); // 약 85%까지 서서히

    progressTimerRef.current = setInterval(() => {
      setImageProgress((prev) => {
        if (prev >= 85) return prev; // 최대 85%까지만 가짜 진행
        return prev + increment;
      });
    }, tickMs);
  };

  const finishImageProgress = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setImageProgress(100);
    setTimeout(() => {
      setIsImageGenerating(false);
      setImageProgress(0);
    }, 600);
  };

  // 🔥 백엔드 /ask 호출 (일반 질문)
  async function sendMessage(text) {
    const question = (text ?? input).trim();
    if (!question) return;

    // 사용자 메시지 추가
    pushUserMessage(question);
    setInput("");
    setIsLoading(true); // ★ 로딩 시작

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

      pushBotMessage({ text: answer });
    } catch (err) {
      pushBotMessage({ text: "❌ 서버 오류가 발생했습니다." });
    } finally {
      setIsLoading(false); // ★ 로딩 종료
    }
  }

  // 선택 텍스트 요약
  async function summarizeSelection(text) {
    const selection = text?.trim();
    if (!selection) return;

    const promptText = `${selection} 요약해줘`;
    pushUserMessage(promptText);
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/summarize_text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selection, sentences: 2 }),
      });

      const data = await res.json();
      const summary = data?.summary || "요약을 가져오지 못했어요.";
      pushBotMessage({ text: summary });
    } catch (err) {
      pushBotMessage({ text: "❌ 요약 생성 중 오류가 발생했습니다." });
    } finally {
      setIsLoading(false);
    }
  }

  const saveImageToAlbum = (imageSrc, captionText, promptText) => {
    try {
      const key = "customAlbumPhotos";
      const raw = localStorage.getItem(key);
      const existing = raw ? JSON.parse(raw) : [];

      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

      const newPhoto = {
        id: `gen-${Date.now()}`,
        src: imageSrc,
        caption: captionText || "AI 생성 이미지",
        bookTitle: docId || "AI 이미지",
        date: dateStr,
        quote: promptText || captionText || "",
      };

      const next = [newPhoto, ...existing];
      localStorage.setItem(key, JSON.stringify(next));
      pushBotMessage({ text: "📸 생성된 이미지를 앨범에 저장했어요." });
    } catch (err) {
      pushBotMessage({ text: "⚠️ 앨범 저장에 실패했어요." });
    }
  };

  // 선택 텍스트로 이미지 생성
  async function generateImageFromSelection(text) {
    const prompt = text?.trim();
    if (!prompt) return;

    const promptText = `${prompt} 이미지 생성해줘`;
    pushUserMessage(promptText);
    setIsLoading(true);
    startImageProgress();

    try {
      const formData = new FormData();
      let finalPrompt = prompt;

      // 입력이 길면 75토큰 이하로 요약 요청 후 사용
      const tokenCount = prompt.split(/\s+/).filter(Boolean).length;
      if (tokenCount > 75) {
        const resSummary = await fetch("http://localhost:8000/summarize_text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: prompt, sentences: 2 }),
        });

        if (resSummary.ok) {
          const data = await resSummary.json();
          finalPrompt = data?.summary || prompt;
          pushBotMessage({
            text: `입력 문장이 길어 75토큰 이하로 요약해 생성합니다:\n${finalPrompt}`,
          });
        } else {
          pushBotMessage({
            text: "요약에 실패했어요. 원문으로 이미지를 생성합니다.",
          });
        }
      }

      formData.append("prompt", finalPrompt);
      formData.append("steps", "40");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60 * 1000); // 최대 대기 1분

      const res = await fetch("http://localhost:8000/generate", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (res.ok) {
        const data = await res.json();
        const base64 = data?.preview_base64;

        if (base64) {
          const src = `data:image/png;base64,${base64}`;
          pushBotMessage({ text: "이미지를 생성했어요.", image: src });
          saveImageToAlbum(src, finalPrompt, promptText);
        } else {
          pushBotMessage({ text: "❌ 이미지를 가져오지 못했어요." });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        const detail =
          err?.error ||
          "이미지 생성 서버가 준비되지 않았습니다. 모델 파일을 확인해주세요.";
        pushBotMessage({ text: `❌ ${detail}` });
      }
    } catch (err) {
      pushBotMessage({ text: "❌ 이미지 생성 중 오류가 발생했습니다." });
    } finally {
      finishImageProgress();
      setIsLoading(false);
    }
  }

  return (
    <div className="chat-panel">
      <h2 className="chat-title">🤖 AI 독서 도우미</h2>

      {/* 채팅 메시지 박스 */}
      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className={`chat-message ${m.sender}`}>
          {m.text && <div className="chat-text">{m.text}</div>}
          {m.image && (
            <div className="chat-image-wrapper">
              <img
                src={m.image}
                alt="생성 이미지"
                className="chat-image"
                onClick={() => setModalImage(m.image)}
              />
              <div className="chat-image-actions">
                <button onClick={() => setModalImage(m.image)}>전체보기</button>
                <button onClick={() => navigate("/album")}>앨범으로 이동</button>
              </div>
            </div>
          )}
        </div>
      ))}

        {/* ★ 로딩 중 메시지 */}
        {isLoading && !isImageGenerating && (
          <div className="chat-message bot loading">
            <div className="spinner"></div>
            <span>답변을 생성 중입니다</span>
            <span className="dots">...</span>
          </div>
        )}
        {isImageGenerating && (
          <div className="image-progress">
            <div className="image-progress-header">
              <span>이미지 생성 중... (최대 1분 소요)</span>
              <span>{Math.round(imageProgress)}%</span>
            </div>
            <div className="image-progress-track">
              <div
                className="image-progress-bar"
                style={{ width: `${Math.min(imageProgress, 100)}%` }}
              />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {modalImage && (
        <div className="image-modal" onClick={() => setModalImage(null)}>
          <div className="image-modal-inner" onClick={(e) => e.stopPropagation()}>
            <img src={modalImage} alt="확대 이미지" />
            <button className="close-modal" onClick={() => setModalImage(null)}>
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 입력창 */}
      <div className="chat-input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="질문 입력..."
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          disabled={isLoading} // ★ 로딩 중엔 입력 비활성화
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading} // ★ 로딩 중엔 버튼 비활성화
        >
          {isLoading ? "⏳" : "전송"}
        </button>
      </div>
    </div>
  );
});

export default ChatPanel;
