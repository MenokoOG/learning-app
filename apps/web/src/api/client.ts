import type {
  ChapterDetail,
  ChapterStatus,
  ChatMessage,
  CourseManifest,
  ProgressMap,
  Quiz,
  VolumeManifest,
} from "../types";

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${text}`);
  }
  return res.json();
}

export const api = {
  getCourse: () => json<CourseManifest>("/courses"),
  getVolume: (volumeId: string) => json<VolumeManifest>(`/courses/${volumeId}`),
  getChapter: (volumeId: string, chapterId: string) =>
    json<ChapterDetail>(`/courses/${volumeId}/${chapterId}`),

  getProgress: () => json<ProgressMap>("/progress"),
  getProgressSummary: () =>
    json<{ totalChapters: number; started: number; mastered: number }>("/progress/summary"),
  setStatus: (volumeId: string, chapterId: string, status: ChapterStatus) =>
    json(`/progress/${volumeId}/${chapterId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  recordQuizScore: (volumeId: string, chapterId: string, score: number) =>
    json(`/progress/${volumeId}/${chapterId}/quiz-score`, {
      method: "POST",
      body: JSON.stringify({ score }),
    }),

  requestQuiz: (volumeId: string, chapterId: string, questionCount = 5) =>
    json<Quiz>("/tutor/quiz", {
      method: "POST",
      body: JSON.stringify({ volumeId, chapterId, questionCount }),
    }),
};

/**
 * Streams a tutor chat response via SSE, calling onDelta for each text chunk.
 * Resolves when the stream completes, rejects if the server reports an error.
 */
export async function streamTutorChat(
  volumeId: string,
  chapterId: string,
  messages: ChatMessage[],
  onDelta: (text: string) => void,
): Promise<void> {
  const res = await fetch("/api/tutor/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ volumeId, chapterId, messages }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tutor request failed (${res.status}): ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
      const parsed = JSON.parse(payload);
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.delta) onDelta(parsed.delta);
      if (parsed.done) return;
    }
  }
}
