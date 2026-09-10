import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { CourseManifest } from "../types";
import { pad, volumeBlurb, volumeNumber } from "../ui/volumeMeta";

export default function Home() {
  const [course, setCourse] = useState<CourseManifest | null>(null);
  const [summary, setSummary] = useState<{
    totalChapters: number;
    started: number;
    mastered: number;
  } | null>(null);

  useEffect(() => {
    api.getCourse().then(setCourse).catch(() => {});
    api.getProgressSummary().then(setSummary).catch(() => {});
  }, []);

  const totalChapters = course?.volumes.reduce((sum, v) => sum + v.chapterCount, 0) ?? 0;
  const mastered = summary?.mastered ?? 0;
  const inProgress = summary ? summary.started - summary.mastered : 0;

  return (
    <div>
      <div className="home-hero">
        <div className="shape-square" />
        <div className="shape-triangle" />
        <div className="home-hero-inner">
          <div>
            <div className="eyebrow">
              {totalChapters || "509"} chapters · {course?.volumes.length ?? 6} volumes · runs on
              your machine
            </div>
            <h1>
              AI Engineering
              <br />
              <span className="accent">From Scratch</span>
            </h1>
            <p>
              Your local copy of the course, with a plain-English AI tutor for every chapter. Pick a
              volume below or search for a specific chapter.
            </p>
          </div>
          <div className="stat-stack">
            <div className="stat-block mastered">
              <span className="label">Mastered</span>
              <span className="value">{pad(mastered)}</span>
            </div>
            <div className="stat-block in-progress">
              <span className="label">In progress</span>
              <span className="value">{pad(inProgress)}</span>
            </div>
            <div className="stat-block total">
              <span className="label">Chapters</span>
              <span className="value">{totalChapters || "…"}</span>
            </div>
          </div>
        </div>
      </div>

      {course?.volumes.map((v, i) => (
        <Link to={`/course/${v.id}`} className="home-volume-row row" key={v.id}>
          <span className={`numeral ${i % 2 === 0 ? "a" : "b"}`}>{volumeNumber(v.id, i)}</span>
          <span>
            <span className="title">{v.title.toUpperCase()}</span>
            <span className="blurb">{volumeBlurb(v.id)}</span>
          </span>
          <span className="meta">
            {v.chapterCount} chapters
            <br />
            Phases {v.phases}
          </span>
        </Link>
      ))}
    </div>
  );
}
