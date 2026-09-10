import { useState } from "react";
import { api } from "../api/client";
import type { Quiz } from "../types";
import { pad } from "../ui/volumeMeta";

interface Props {
  volumeId: string;
  chapterId: string;
  onScored: (score: number) => void;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

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
      <div className="quiz-start">
        <p>Generate a short quiz from this chapter to check mastery.</p>
        <button className="btn chip-btn" onClick={start} disabled={loading}>
          {loading ? "Building quiz…" : "Start quiz"}
        </button>
        {error && <div className="quiz-error">{error}</div>}
      </div>
    );
  }

  const correctCount = quiz.questions.filter((q, i) => answers[i] === q.correctIndex).length;
  const score = Math.round((correctCount / quiz.questions.length) * 100);

  return (
    <div>
      {submitted && (
        <div className="quiz-score-banner">
          <div className="pct">{score}%</div>
          <div className="detail">
            {correctCount} of {quiz.questions.length} correct · chapter marked{" "}
            {score >= 80 ? "mastered" : "in progress"}
          </div>
          <button className="btn quiz-retry" onClick={start}>
            Try another quiz
          </button>
        </div>
      )}

      {quiz.questions.map((q, qi) => (
        <div className="quiz-question" key={qi}>
          <div className="quiz-question-inner">
            <span className="qnum">Q{pad(qi + 1)}</span>
            <div>
              <div className="prompt">{q.question.toUpperCase()}</div>
              <div className="quiz-options">
                {q.options.map((opt, oi) => {
                  let cls = "quiz-option";
                  if (submitted) {
                    if (oi === q.correctIndex) cls += " correct";
                    else if (answers[qi] === oi) cls += " incorrect";
                  } else if (answers[qi] === oi) {
                    cls += " chosen";
                  }
                  return (
                    <button
                      key={oi}
                      className={cls}
                      disabled={submitted}
                      onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                    >
                      <span className="letter">{LETTERS[oi] ?? oi + 1}</span>
                      <span className="text">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {submitted && <div className="quiz-explanation">{q.explanation}</div>}
            </div>
          </div>
        </div>
      ))}

      {!submitted && (
        <div className="quiz-submit-row">
          <button
            className="btn chip-btn"
            onClick={submit}
            disabled={Object.keys(answers).length < quiz.questions.length}
          >
            Submit answers
          </button>
        </div>
      )}
    </div>
  );
}
