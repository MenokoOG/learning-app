import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../api/client";
import type { ChapterDetail, ChapterStatus, CourseManifest, VolumeManifest } from "../types";
import TutorChat from "../components/TutorChat";
import QuizPanel from "../components/QuizPanel";
import { usePublishCrumb } from "../ui/crumb";
import { pad, volumeNumber } from "../ui/volumeMeta";
import { extractHeadings, parseLesson, slugify } from "../ui/lesson";

type Tab = "lesson" | "tutor" | "quiz";

/** Flattens a markdown heading's children back to plain text so it can be slugged. */
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "props" in (node as never)) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

const HEADING_COMPONENTS = {
  h1: ({ children }: { children?: ReactNode }) => <h1 id={slugify(textOf(children))}>{children}</h1>,
  h2: ({ children }: { children?: ReactNode }) => <h2 id={slugify(textOf(children))}>{children}</h2>,
  h3: ({ children }: { children?: ReactNode }) => <h3 id={slugify(textOf(children))}>{children}</h3>,
};

export default function ChapterPage() {
  const { volumeId, chapterId } = useParams();
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [volume, setVolume] = useState<VolumeManifest | null>(null);
  const [course, setCourse] = useState<CourseManifest | null>(null);
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

  // Volume manifest supplies the neighbouring chapter titles and the position rail.
  useEffect(() => {
    if (!volumeId) return;
    api.getVolume(volumeId).then(setVolume).catch(() => {});
    api.getCourse().then(setCourse).catch(() => {});
  }, [volumeId]);

  const lesson = useMemo(
    () => (chapter ? parseLesson(chapter.content, chapter.title) : null),
    [chapter],
  );
  const headings = useMemo(() => (lesson ? extractHeadings(lesson.body) : []), [lesson]);

  usePublishCrumb(chapter?.title);

  async function updateStatus(next: ChapterStatus) {
    if (!volumeId || !chapterId) return;
    setStatus(next);
    await api.setStatus(volumeId, chapterId, next).catch(() => {});
  }

  if (loading) return <div className="loading">Loading chapter…</div>;
  if (!chapter || !volumeId || !lesson) return <div className="empty-state">Chapter not found.</div>;

  const prev = volume?.chapters.find((c) => c.id === chapter.prevId) ?? null;
  const next = volume?.chapters.find((c) => c.id === chapter.nextId) ?? null;
  const chapterCount = volume?.chapterCount ?? 0;
  const volumeTotal = course?.volumes.length ?? 0;
  const readPct = chapterCount > 0 ? Math.round((chapter.chapterNumber / chapterCount) * 100) : 0;

  return (
    <div>
      <div className="chapter-hero">
        <div className="shape-square-a" />
        <div className="shape-square-b" />
        <div className="chapter-hero-inner">
          <div className="numeral">{pad(chapter.chapterNumber)}</div>
          <div>
            <div className="meta">
              {chapter.part ?? "Chapter"} · pages {chapter.sourcePages}
            </div>
            <h1>{chapter.title.toUpperCase()}</h1>
            <div className="status-controls">
              <button
                className={`btn status-btn in-progress ${status === "in-progress" ? "active" : ""}`}
                onClick={() => updateStatus(status === "in-progress" ? "not-started" : "in-progress")}
              >
                In progress
              </button>
              <button
                className={`btn status-btn mastered ${status === "mastered" ? "active" : ""}`}
                onClick={() => updateStatus(status === "mastered" ? "in-progress" : "mastered")}
              >
                Mastered
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn ${tab === "lesson" ? "active" : ""}`}
          onClick={() => setTab("lesson")}
        >
          01 Lesson
        </button>
        <button
          className={`tab-btn ${tab === "tutor" ? "active" : ""}`}
          onClick={() => setTab("tutor")}
        >
          02 Ask the tutor
        </button>
        <button
          className={`tab-btn ${tab === "quiz" ? "active" : ""}`}
          onClick={() => setTab("quiz")}
        >
          03 Quiz
        </button>
      </div>

      {tab === "lesson" && (
        <>
          <div className="lesson-layout">
            <article className="lesson-article">
              {lesson.epigraph && <p className="epigraph">{lesson.epigraph.toUpperCase()}</p>}
              {lesson.chips.length > 0 && (
                <div className="chip-row">
                  {lesson.chips.map((chip, i) => (
                    <span className={`chip ${i === 0 ? "lead" : ""}`} key={chip}>
                      {chip}
                    </span>
                  ))}
                </div>
              )}
              <div className="lesson-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={HEADING_COMPONENTS}>
                  {lesson.body}
                </ReactMarkdown>
              </div>
            </article>
            <aside className="lesson-rail">
              {headings.length > 0 && (
                <>
                  <div className="rail-heading">On this page</div>
                  <div className="rail-links">
                    {headings.map((h, i) => (
                      <a href={`#${h.id}`} key={`${h.id}-${i}`}>
                        {h.text}
                      </a>
                    ))}
                  </div>
                </>
              )}
              <div className="rail-heading">Position</div>
              <div className="rail-position">
                <div>
                  Vol {volumeNumber(volumeId, 0)} / {volumeTotal ? pad(volumeTotal) : "…"}
                </div>
                <div>
                  Chapter {chapter.chapterNumber} / {chapterCount || "…"}
                </div>
              </div>
              <div className="rail-track">
                <div style={{ width: `${readPct}%` }} />
              </div>
              <div className="rail-caption">{readPct}% of volume read</div>
            </aside>
          </div>

          <div className="chapter-nav">
            {chapter.prevId && (
              <Link to={`/course/${volumeId}/${chapter.prevId}`} className="row prev">
                <span className="direction">← Previous{prev ? ` · ${pad(prev.chapterNumber)}` : ""}</span>
                <span className="title">{(prev?.title ?? "Previous chapter").toUpperCase()}</span>
              </Link>
            )}
            {chapter.nextId && (
              <Link to={`/course/${volumeId}/${chapter.nextId}`} className="row next">
                <span className="direction">Next{next ? ` · ${pad(next.chapterNumber)}` : ""} →</span>
                <span className="title">{(next?.title ?? "Next chapter").toUpperCase()}</span>
              </Link>
            )}
          </div>
        </>
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
    </div>
  );
}
