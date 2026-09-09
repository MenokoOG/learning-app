import { useState } from "react";
import { api } from "../api/client";
import type { Quiz } from "../types";

interface Props {
  volumeId: string;
  chapterId: string;
  onScored: (score: number) => void;
}

export default function QuizPanel({ volumeId, chapterId, onScored }: Props) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    setSubmitted(false);
    setAnswers({});
    try {
      const q = await api.requestQuiz(volumeId, chapterId, 5);
      setQuiz(q);
    } catch (err: any) {
      setError(err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    if (!quiz) return;
    setSubmitted(true);
    const correct = quiz.questions.filter((q, i) => answers[i] === q.correctIndex).length;
    const score = Math.round((correct / quiz.questions.length) * 100);
    api.recordQuizScore(volumeId, chapterId, score).catch(() => {});
    onScored(score);
  }

  if (!quiz) {
    return (
      <div className="empty-state">
        <p>Generate a short quiz from this chapter to check mastery.</p>
        <button className="pill-btn" onClick={start} disabled={loading}>
          {loading ? "Building quiz…" : "Start quiz"}
        </button>
        {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      </div>
    );
  }

  const correctCount = quiz.questions.filter((q, i) => answers[i] === q.correctIndex).length;

  return (
    <div>
      {submitted && (
        <div className="quiz-score-banner">
          Score: {correctCount} / {quiz.questions.length} (
          {Math.round((correctCount / quiz.questions.length) * 100)}%)
          {" — "}
          <button className="pill-btn" onClick={start}>
            Try another quiz
          </button>
        </div>
      )}
      {quiz.questions.map((q, qi) => (
        <div className="quiz-question" key={qi}>
          <div>
            {qi + 1}. {q.question}
          </div>
          {q.options.map((opt, oi) => {
            let cls = "quiz-option";
            if (submitted) {
              if (oi === q.correctIndex) cls += " correct";
              else if (answers[qi] === oi) cls += " incorrect";
            } else if (answers[qi] === oi) {
              cls += " active";
            }
            return (
              <button
                key={oi}
                className={cls}
                disabled={submitted}
                onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
              >
                {opt}
              </button>
            );
          })}
          {submitted && <div className="quiz-explanation">{q.explanation}</div>}
        </div>
      ))}
      {!submitted && (
        <button
          className="pill-btn active"
          onClick={submit}
          disabled={Object.keys(answers).length < quiz.questions.length}
        >
          Submit answers
        </button>
      )}
    </div>
  );
}
