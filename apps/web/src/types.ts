export interface VolumeSummary {
  id: string;
  title: string;
  phases: string;
  chapterCount: number;
}

export interface CourseManifest {
  course: string;
  volumes: VolumeSummary[];
}

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

export interface ChapterDetail {
  id: string;
  title: string;
  part: string | null;
  volume: string;
  chapterNumber: number;
  sourcePages: string;
  content: string;
  prevId: string | null;
  nextId: string | null;
}

export type ChapterStatus = "not-started" | "in-progress" | "mastered";

export interface ChapterProgress {
  status: ChapterStatus;
  quizBestScore: number | null;
  updatedAt: string;
}

export type ProgressMap = Record<string, ChapterProgress>;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  questions: QuizQuestion[];
}
