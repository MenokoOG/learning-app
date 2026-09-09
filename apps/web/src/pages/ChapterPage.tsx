import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../api/client";
import type { ChapterDetail, ChapterStatus } from "../types";
import TutorChat from "../components/TutorChat";
import QuizPanel from "../components/QuizPanel";

type Tab = "lesson" | "tutor" | "quiz";

export default function ChapterPage() {
  const { volumeId, chapterId } = useParams();
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [status, setStatus] = useState<ChapterStatus>("not-started");
  const [tab, setTab] = useState<Tab>("lesson");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!volumeId || !chapterId) return;
    setLoading(true);
    setTab("lesson");
    api
      .getChapter(volumeId, chapterId)
      .then((c) => {
        setChapter(c);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    api
      .getProgress()
      .then((p) => setStatus(p[`${volumeId}/${chapterId}`]?.status ?? "not-started"))
      .catch(() => {});
  }, [volumeId, chapterId]);

  async function updateStatus(next: ChapterStatus) {
    if (!volumeId || !chapterId) return;
    setStatus(next);
    await api.setStatus(volumeId, chapterId, next).catch(() => {});
  }

  if (loading) return <div className="loading">Loading chapter…</div>;
  if (!chapter || !volumeId) return <div className="empty-state">Chapter not found.</div>;

  return (
    <div>
      <div className="chapter-header">
        <div className="eyebrow">
          {chapter.part ?? "Chapter"} · pages {chapter.sourcePages}
        </div>
        <h1>{chapter.title}</h1>
        <div className="status-controls">
          <button
            className={`pill-btn ${status === "in-progress" ? "active" : ""}`}
            onClick={() => updateStatus(status === "in-progress" ? "not-started" : "in-progress")}
          >
            In progress
          </button>
          <button
            className={`pill-btn mastered ${status === "mastered" ? "active" : ""}`}
            onClick={() => updateStatus(status === "mastered" ? "in-progress" : "mastered")}
          >
            ✓ Mastered
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === "lesson" ? "active" : ""}`} onClick={() => setTab("lesson")}>
          Lesson
        </button>
        <button className={`tab-btn ${tab === "tutor" ? "active" : ""}`} onClick={() => setTab("tutor")}>
          Ask the tutor
        </button>
        <button className={`tab-btn ${tab === "quiz" ? "active" : ""}`} onClick={() => setTab("quiz")}>
          Quiz
        </button>
      </div>

      {tab === "lesson" && (
        <div className="lesson-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{chapter.content}</ReactMarkdown>
        </div>
      )}

      {tab === "tutor" && (
        <TutorChat volumeId={volumeId} chapterId={chapter.id} chapterTitle={chapter.title} />
      )}

      {tab === "quiz" && (
        <QuizPanel
          volumeId={volumeId}
          chapterId={chapter.id}
          onScored={(score) => {
            if (score >= 80) setStatus("mastered");
            else setStatus("in-progress");
          }}
        />
      )}

      <div className="chapter-nav">
        {chapter.prevId ? (
          <Link to={`/course/${volumeId}/${chapter.prevId}`}>← Previous</Link>
        ) : (
          <span />
        )}
        {chapter.nextId ? (
          <Link to={`/course/${volumeId}/${chapter.nextId}`}>Next →</Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
