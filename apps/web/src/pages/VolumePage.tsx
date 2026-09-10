import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { ProgressMap, VolumeManifest } from "../types";
import { pad, volumeNumber } from "../ui/volumeMeta";

const STATUS_LABEL: Record<string, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  mastered: "Mastered",
};

export default function VolumePage() {
  const { volumeId } = useParams();
  const [volume, setVolume] = useState<VolumeManifest | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});

  useEffect(() => {
    if (!volumeId) return;
    api.getVolume(volumeId).then(setVolume).catch(() => {});
    api.getProgress().then(setProgress).catch(() => {});
  }, [volumeId]);

  if (!volume) return <div className="loading">Loading volume…</div>;

  let lastPart: string | null | undefined = undefined;

  return (
    <div>
      <div className="volume-hero">
        <div className="shape-triangle" />
        <div className="volume-hero-inner">
          <div className="numeral">{volumeNumber(volume.id, 0)}</div>
          <div>
            <div className="meta">
              Volume · phases {volume.phases} · {volume.chapterCount} chapters
            </div>
            <h1>{volume.title.toUpperCase()}</h1>
          </div>
        </div>
      </div>

      {volume.chapters.map((c) => {
        const showPart = c.part !== lastPart;
        lastPart = c.part;
        const status = progress[`${volume.id}/${c.id}`]?.status ?? "not-started";
        return (
          <div key={c.id}>
            {showPart && c.part && <div className="part-label">{c.part}</div>}
            <Link to={`/course/${volume.id}/${c.id}`} className="volume-chapter-row row">
              <span className="num">{pad(c.chapterNumber)}</span>
              <span className="title">{c.title.toUpperCase()}</span>
              <span className={`status-chip ${status}`}>{STATUS_LABEL[status]}</span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
