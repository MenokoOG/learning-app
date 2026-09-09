import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { VolumeManifest } from "../types";

export default function VolumePage() {
  const { volumeId } = useParams();
  const [volume, setVolume] = useState<VolumeManifest | null>(null);

  useEffect(() => {
    if (!volumeId) return;
    api.getVolume(volumeId).then(setVolume).catch(() => {});
  }, [volumeId]);

  if (!volume) return <div className="loading">Loading volume…</div>;

  let lastPart: string | null | undefined = undefined;

  return (
    <div>
      <div className="chapter-header">
        <div className="eyebrow">Volume · phases {volume.phases}</div>
        <h1>{volume.title}</h1>
        <div style={{ color: "var(--text-dim)" }}>{volume.chapterCount} chapters</div>
      </div>
      {volume.chapters.map((c) => {
        const showPart = c.part !== lastPart;
        lastPart = c.part;
        return (
          <div key={c.id}>
            {showPart && c.part && (
              <div className="part-label" style={{ marginTop: 16 }}>
                {c.part}
              </div>
            )}
            <Link to={`/course/${volume.id}/${c.id}`} className="chapter-link">
              {c.chapterNumber}. {c.title}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
