import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { CourseManifest, ProgressMap, VolumeManifest } from "../types";

export default function Sidebar() {
  const { volumeId, chapterId } = useParams();
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
    const totalKnown = values.length;
    const mastered = values.filter((v) => v.status === "mastered").length;
    return { totalKnown, mastered };
  }, [progress]);

  const totalChapters = course?.volumes.reduce((sum, v) => sum + v.chapterCount, 0) ?? 0;
  const pct = totalChapters > 0 ? Math.round((summary.mastered / totalChapters) * 100) : 0;

  function toggleVolume(id: string) {
    setOpenVolumes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function statusFor(volId: string, chapId: string) {
    return progress[`${volId}/${chapId}`]?.status ?? "not-started";
  }

  return (
    <aside className="sidebar">
      <h1>AI Engineering From Scratch</h1>
      <div className="subtitle">Your local course &amp; tutor</div>

      <div className="progress-summary">
        {summary.mastered} / {totalChapters || "…"} chapters mastered
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <input
        className="search-box"
        placeholder="Search chapters…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {!course && <div className="loading">Loading course…</div>}

      {course?.volumes.map((v) => {
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
          <div className="volume-block" key={v.id}>
            <div className="volume-header" onClick={() => toggleVolume(v.id)}>
              <span>{isOpen ? "▾" : "▸"} {v.title.split(":")[0]}</span>
              <span className="count">{v.chapterCount}</span>
            </div>
            {isOpen &&
              filteredChapters.map((c) => {
                const showPart = c.part !== lastPart;
                lastPart = c.part;
                const status = statusFor(v.id, c.id);
                return (
                  <div key={c.id}>
                    {showPart && c.part && <div className="part-label">{c.part.replace(/^Part [IVX]+ — /, "")}</div>}
                    <Link
                      to={`/course/${v.id}/${c.id}`}
                      className={`chapter-link ${volumeId === v.id && chapterId === c.id ? "active" : ""}`}
                    >
                      <span className={`status-dot ${status}`} />
                      {c.chapterNumber}. {c.title}
                    </Link>
                  </div>
                );
              })}
          </div>
        );
      })}
    </aside>
  );
}
