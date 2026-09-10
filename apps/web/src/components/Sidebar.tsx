import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api/client";
import type { CourseManifest, ProgressMap, VolumeManifest } from "../types";
import { pad, volumeNumber, volumeShortName } from "../ui/volumeMeta";

export default function Sidebar() {
  // The sidebar sits outside <Routes>, so it reads the route off the location
  // rather than useParams (which only resolves inside a matched route).
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  const volumeId = segments[0] === "course" ? segments[1] : undefined;
  const chapterId = segments[0] === "course" ? segments[2] : undefined;

  const [course, setCourse] = useState<CourseManifest | null>(null);
  const [volumes, setVolumes] = useState<Record<string, VolumeManifest>>({});
  const [progress, setProgress] = useState<ProgressMap>({});
  const [openVolumes, setOpenVolumes] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.getCourse().then(setCourse).catch(() => {});
    api.getProgress().then(setProgress).catch(() => {});
  }, []);

  // Auto-open the volume that's currently active, and lazy-load its chapters.
  useEffect(() => {
    if (volumeId) {
      setOpenVolumes((prev) => ({ ...prev, [volumeId]: true }));
    }
  }, [volumeId]);

  useEffect(() => {
    if (!course) return;
    const toLoad = Object.entries(openVolumes)
      .filter(([id, open]) => open && !volumes[id])
      .map(([id]) => id);
    toLoad.forEach((id) => {
      api.getVolume(id).then((v) => setVolumes((prev) => ({ ...prev, [id]: v })));
    });
  }, [openVolumes, course, volumes]);

  const summary = useMemo(() => {
    const values = Object.values(progress);
    const mastered = values.filter((v) => v.status === "mastered").length;
    const inProgress = values.filter((v) => v.status === "in-progress").length;
    return { mastered, inProgress };
  }, [progress]);

  const totalChapters = course?.volumes.reduce((sum, v) => sum + v.chapterCount, 0) ?? 0;
  const masteredPct = totalChapters > 0 ? (summary.mastered / totalChapters) * 100 : 0;
  const inProgressPct = totalChapters > 0 ? (summary.inProgress / totalChapters) * 100 : 0;

  function toggleVolume(id: string) {
    setOpenVolumes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function statusFor(volId: string, chapId: string) {
    return progress[`${volId}/${chapId}`]?.status ?? "not-started";
  }

  return (
    <aside className="sidebar">
      <div className="wordmark">
        <div className="wedge" />
        <div className="wordmark-inner">
          <div className="kicker">Local · Private</div>
          <h1>
            AI Engineering
            <br />
            From Scratch
          </h1>
        </div>
      </div>

      <div className="mastery">
        <div className="mastery-head">
          <span className="muted">Mastered</span>
          <span>
            {pad(summary.mastered)} / {totalChapters || "…"}
          </span>
        </div>
        <div className="mastery-track">
          <div className="mastery-seg mastered" style={{ width: `${masteredPct}%` }} />
          <div
            className="mastery-seg in-progress"
            style={{ left: `${masteredPct}%`, width: `${inProgressPct}%` }}
          />
        </div>
      </div>

      <div className="sidebar-search">
        <span className="glyph">→</span>
        <input
          placeholder="Search chapters"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!course && <div className="sidebar-loading">Loading course…</div>}

      {course?.volumes.map((v, vi) => {
        const isOpen = !!openVolumes[v.id] || search.length > 0;
        const vol = volumes[v.id];
        if (search.length > 0 && !vol) {
          // Need chapters loaded to search within this volume; kick off load.
          api.getVolume(v.id).then((loaded) => setVolumes((prev) => ({ ...prev, [v.id]: loaded })));
        }

        const filteredChapters =
          vol && search
            ? vol.chapters.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
            : vol?.chapters ?? [];

        if (search && filteredChapters.length === 0) return null;

        let lastPart: string | null | undefined = undefined;

        return (
          <div key={v.id}>
            <button className="volume-row rowd" onClick={() => toggleVolume(v.id)}>
              <span className="num">{volumeNumber(v.id, vi)}</span>
              <span className="short">{volumeShortName(v.title)}</span>
              <span className="count">{v.chapterCount}</span>
            </button>
            {isOpen && (
              <div className="chapter-list">
                {filteredChapters.map((c) => {
                  const showPart = c.part !== lastPart;
                  lastPart = c.part;
                  const status = statusFor(v.id, c.id);
                  const active = volumeId === v.id && chapterId === c.id;
                  return (
                    <div key={c.id}>
                      {showPart && c.part && (
                        <div className="part-label">{c.part.replace(/^Part [IVX]+ — /, "")}</div>
                      )}
                      <Link
                        to={`/course/${v.id}/${c.id}`}
                        className={`chapter-link rowd ${active ? "active" : ""}`}
                      >
                        <span className="marker">
                          <span className={`status-swatch ${status}`} />
                          <span className="num">{pad(c.chapterNumber)}</span>
                        </span>
                        <span>{c.title}</span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
