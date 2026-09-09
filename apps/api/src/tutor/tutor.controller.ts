import { Body, Controller, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { CoursesService } from "../courses/courses.service";
import { ChatMessage, OpenAiService } from "./openai.service";
import { TutorService } from "./tutor.service";

interface ChatRequestBody {
  volumeId: string;
  chapterId: string;
  messages: ChatMessage[];
}

interface QuizRequestBody {
  volumeId: string;
  chapterId: string;
  questionCount?: number;
}

@Controller("api/tutor")
export class TutorController {
  constructor(
    private readonly courses: CoursesService,
    private readonly tutor: TutorService,
    private readonly openai: OpenAiService,
  ) {}

  @Post("chat")
  async chat(@Body() body: ChatRequestBody, @Res() res: Response) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    try {
      const chapter = this.courses.getChapter(body.volumeId, body.chapterId);
      const volume = this.courses.getVolume(body.volumeId);
      const messages = this.tutor.buildChatMessages({
        chapterTitle: chapter.title,
        volumeTitle: volume.title,
        chapterContent: chapter.content,
        history: body.messages ?? [],
      });

      await this.openai.streamChat(messages, (delta) => {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message ?? String(err) })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post("quiz")
  async quiz(@Body() body: QuizRequestBody) {
    const chapter = this.courses.getChapter(body.volumeId, body.chapterId);
    const messages = this.tutor.buildQuizMessages({
      chapterTitle: chapter.title,
      chapterContent: chapter.content,
      questionCount: body.questionCount ?? 5,
    });
    return this.openai.completeJson(messages);
  }
}
