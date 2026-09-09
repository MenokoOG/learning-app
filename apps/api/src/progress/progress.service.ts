import { Injectable } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { dataDir } from "../common/paths";

export type ChapterStatus = "not-started" | "in-progress" | "mastered";

export interface ChapterProgress {
  status: ChapterStatus;
  quizBestScore: number | null;
  updatedAt: string;
}

export type ProgressMap = Record<string, ChapterProgress>;

@Injectable()
export class ProgressService {
  private file = path.join(dataDir(), "progress.json");

  private ensureFile(): void {
    const dir = path.dirname(this.file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.file)) fs.writeFileSync(this.file, "{}", "utf-8");
  }

  private key(volumeId: string, chapterId: string): string {
    return `${volumeId}/${chapterId}`;
  }

  getAll(): ProgressMap {
    this.ensureFile();
    return JSON.parse(fs.readFileSync(this.file, "utf-8"));
  }

  private save(data: ProgressMap): void {
    this.ensureFile();
    fs.writeFileSync(this.file, JSON.stringify(data, null, 2), "utf-8");
  }

  setStatus(volumeId: string, chapterId: string, status: ChapterStatus): ChapterProgress {
    const data = this.getAll();
    const key = this.key(volumeId, chapterId);
    const existing = data[key] ?? { status: "not-started", quizBestScore: null, updatedAt: "" };
    const entry: ChapterProgress = { ...existing, status, updatedAt: new Date().toISOString() };
    data[key] = entry;
    this.save(data);
    return entry;
  }

  recordQuizScore(volumeId: string, chapterId: string, score: number): ChapterProgress {
    const data = this.getAll();
    const key = this.key(volumeId, chapterId);
    const existing = data[key] ?? { status: "not-started", quizBestScore: null, updatedAt: "" };
    const best = existing.quizBestScore === null ? score : Math.max(existing.quizBestScore, score);
    const status: ChapterStatus = best >= 80 ? "mastered" : "in-progress";
    const entry: ChapterProgress = { status, quizBestScore: best, updatedAt: new Date().toISOString() };
    data[key] = entry;
    this.save(data);
    return entry;
  }

  summary(): { totalChapters: number; started: number; mastered: number } {
    const data = this.getAll();
    const values = Object.values(data);
    return {
      totalChapters: values.length,
      started: values.filter((v) => v.status !== "not-started").length,
      mastered: values.filter((v) => v.status === "mastered").length,
    };
  }
}
