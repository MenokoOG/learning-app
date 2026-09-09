import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ChapterStatus, ProgressService } from "./progress.service";

@Controller("api/progress")
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  getAll() {
    return this.progress.getAll();
  }

  @Get("summary")
  getSummary() {
    return this.progress.summary();
  }

  @Post(":volumeId/:chapterId/status")
  setStatus(
    @Param("volumeId") volumeId: string,
    @Param("chapterId") chapterId: string,
    @Body("status") status: ChapterStatus,
  ) {
    return this.progress.setStatus(volumeId, chapterId, status);
  }

  @Post(":volumeId/:chapterId/quiz-score")
  recordQuizScore(
    @Param("volumeId") volumeId: string,
    @Param("chapterId") chapterId: string,
    @Body("score") score: number,
  ) {
    return this.progress.recordQuizScore(volumeId, chapterId, score);
  }
}
