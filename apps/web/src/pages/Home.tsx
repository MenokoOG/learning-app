import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { CourseManifest } from "../types";

export default function Home() {
  const [course, setCourse] = useState<CourseManifest | null>(null);
  const [summary, setSummary] = useState<{ totalChapters: number; started: number; mastered: number } | null>(null);

  useEffect(() => {
    api.getCourse().then(setCourse).catch(() => {});
    api.getProgressSummary().then(setSummary).catch(() => {});
  }, []);

  return (
    <div className="home-hero">
      <h1>AI Engineering From Scratch</h1>
      <p style={{ color: "var(--text-dim)" }}>
        Your local copy of the course, with a plain-English AI tutor for every chapter. Pick a volume
        below or search the sidebar for a specific chapter.
      </p>

      {summary && (
        <div className="progress-summary" style={{ maxWidth: 420 }}>
          {summary.mastered} mastered · {summary.started} in progress · {summary.totalChapters} chapters touched
        </div>
      )}

      <div className="volume-card-grid">
        {course?.volumes.map((v) => (
          <Link to={`/course/${v.id}`} className="volume-card" key={v.id}>
            <div className="vol-title">{v.title}</div>
            <div className="vol-meta">
              {v.chapterCount} chapters · phases {v.phases}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
