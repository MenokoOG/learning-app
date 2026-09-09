import { useState } from "react";
import { streamTutorChat } from "../api/client";
import type { ChatMessage } from "../types";

interface Props {
  volumeId: string;
  chapterId: string;
  chapterTitle: string;
}

const SUGGESTIONS = [
  "Explain this chapter simply",
  "Give me a real-world example",
  "What's the hardest part here?",
  "Quiz me on the key ideas",
];

export default function TutorChat({ volumeId, chapterId, chapterTitle }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    let acc = "";
    try {
      await streamTutorChat(volumeId, chapterId, nextMessages, (delta) => {
        acc += delta;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      });
    } catch (err: any) {
      setError(err.message ?? String(err));
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tutor-panel">
      <div className="tutor-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            Ask your tutor about "{chapterTitle}" — every answer is explained at a plain, 9th-grade level.
          </div>
        )}
        {messages.map((m, i) => (
          <div className={`tutor-msg ${m.role}`} key={i}>
            {m.content || (busy && i === messages.length - 1 ? "…" : "")}
          </div>
        ))}
        {error && <div className="tutor-msg error">{error}</div>}
      </div>

      {messages.length === 0 && (
        <div className="tutor-suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="pill-btn" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="tutor-input-row">
        <textarea
          rows={2}
          placeholder="Ask a question about this chapter…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button disabled={busy} onClick={() => send(input)}>
          {busy ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
