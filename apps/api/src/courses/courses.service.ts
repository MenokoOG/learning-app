import { Injectable, NotFoundException } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import { contentDir } from "../common/paths";

export interface ChapterSummary {
  id: string;
  title: string;
  part: string | null;
  chapterNumber: number;
  file: string;
  wordCount: number;
}

export interface VolumeManifest {
  id: string;
  title: string;
  phases: string;
  chapterCount: number;
  chapters: ChapterSummary[];
}

export interface CourseManifest {
  course: string;
  volumes: {
    id: string;
    title: string;
    phases: string;
    chapterCount: number;
  }[];
}

@Injectable()
export class CoursesService {
  private root = contentDir();

  private readJson<T>(relPath: string): T {
    const full = path.join(this.root, relPath);
    if (!fs.existsSync(full)) {
      throw new NotFoundException(`Not found: ${relPath}`);
    }
    return JSON.parse(fs.readFileSync(full, "utf-8"));
  }

  getCourseManifest(): CourseManifest {
    const raw = this.readJson<{
      course: string;
      volumes: { id: string; title: string; phases: string; chapter_count: number }[];
    }>("course-manifest.json");
    return {
      course: raw.course,
      volumes: raw.volumes.map((v) => ({
        id: v.id,
        title: v.title,
        phases: v.phases,
        chapterCount: v.chapter_count,
      })),
    };
  }

  getVolume(volumeId: string): VolumeManifest {
    const raw = this.readJson<{
      id: string;
      title: string;
      phases: string;
      chapter_count: number;
      chapters: {
        id: string;
        title: string;
        part: string | null;
        chapter_number: number;
        file: string;
        word_count: number;
      }[];
    }>(`${volumeId}/manifest.json`);
    return {
      id: raw.id,
      title: raw.title,
      phases: raw.phases,
      chapterCount: raw.chapter_count,
      chapters: raw.chapters.map((c) => ({
        id: c.id,
        title: c.title,
        part: c.part,
        chapterNumber: c.chapter_number,
        file: c.file,
        wordCount: c.word_count,
      })),
    };
  }

  getChapter(volumeId: string, chapterId: string): {
    id: string;
    title: string;
    part: string | null;
    volume: string;
    chapterNumber: number;
    sourcePages: string;
    content: string;
    prevId: string | null;
    nextId: string | null;
  } {
    const volume = this.getVolume(volumeId);
    const idx = volume.chapters.findIndex((c) => c.id === chapterId);
    if (idx === -1) {
      throw new NotFoundException(`Chapter not found: ${volumeId}/${chapterId}`);
    }
    const summary = volume.chapters[idx];
    const full = path.join(this.root, summary.file);
    if (!fs.existsSync(full)) {
      throw new NotFoundException(`Chapter file missing: ${summary.file}`);
    }
    const raw = fs.readFileSync(full, "utf-8");
    const parsed = matter(raw);
    return {
      id: summary.id,
      title: summary.title,
      part: summary.part,
      volume: volumeId,
      chapterNumber: summary.chapterNumber,
      sourcePages: (parsed.data.source_pages as string) ?? "",
      content: parsed.content.trim(),
      prevId: idx > 0 ? volume.chapters[idx - 1].id : null,
      nextId: idx < volume.chapters.length - 1 ? volume.chapters[idx + 1].id : null,
    };
  }
}
