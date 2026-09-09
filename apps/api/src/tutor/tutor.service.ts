import { Injectable } from "@nestjs/common";
import { ChatMessage } from "./openai.service";

const TUTOR_SYSTEM_PROMPT = `You are a patient, sharp personal tutor helping an adult learner master a technical
AI engineering course, one chapter at a time. The learner already has real engineering
experience but wants every explanation pitched at a clear 9th-grade reading level:

- Explain new terms the first time you use them, in plain words, before using jargon again.
- Prefer short sentences and concrete, everyday analogies over dense academic phrasing.
- Break multi-part ideas into small numbered or bulleted steps only when it truly helps.
- Use the CHAPTER CONTENT below as your source of truth for this lesson. Quote or
  paraphrase it rather than inventing facts, but you may add outside context if it helps
  understanding.
- Keep answers tight and focused — a few short paragraphs, not a lecture — unless the
  learner explicitly asks for more depth.
- When useful, offer a tiny check-your-understanding question at the end, but do not
  pad every answer with one.
- If asked to quiz them, generate questions strictly from the chapter content.

Never say "as an AI" or add filler disclaimers. Be direct and encouraging, not flattering.`;

@Injectable()
export class TutorService {
  buildChatMessages(params: {
    chapterTitle: string;
    volumeTitle: string;
    chapterContent: string;
    history: ChatMessage[];
  }): ChatMessage[] {
    const { chapterTitle, volumeTitle, chapterContent, history } = params;
    const grounded = chapterContent.length > 24000 ? chapterContent.slice(0, 24000) + "\n\n[...chapter truncated for length...]" : chapterContent;

    const system: ChatMessage = {
      role: "system",
      content: `${TUTOR_SYSTEM_PROMPT}\n\nCourse volume: ${volumeTitle}\nChapter: ${chapterTitle}\n\nCHAPTER CONTENT:\n"""\n${grounded}\n"""`,
    };

    return [system, ...history];
  }

  buildQuizMessages(params: {
    chapterTitle: string;
    chapterContent: string;
    questionCount: number;
  }): ChatMessage[] {
    const { chapterTitle, chapterContent, questionCount } = params;
    const grounded = chapterContent.length > 20000 ? chapterContent.slice(0, 20000) : chapterContent;

    return [
      {
        role: "system",
        content:
          "You write short mastery quizzes for a 9th-grade-level explanation of technical material. " +
          "Return ONLY a JSON object, no prose outside it.",
      },
      {
        role: "user",
        content:
          `Chapter: "${chapterTitle}"\n\nCHAPTER CONTENT:\n"""\n${grounded}\n"""\n\n` +
          `Write ${questionCount} multiple-choice questions that check real understanding of this ` +
          `chapter (not trivia). Each question has 4 options and exactly one correct answer. ` +
          `Explanations should be 9th-grade-level plain English.\n\n` +
          `Respond with JSON exactly in this shape:\n` +
          `{"questions": [{"question": "...", "options": ["...","...","...","..."], "correctIndex": 0, "explanation": "..."}]}`,
      },
    ];
  }
}
