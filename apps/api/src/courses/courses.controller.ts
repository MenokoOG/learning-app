import { Controller, Get, Param } from "@nestjs/common";
import { CoursesService } from "./courses.service";

@Controller("api/courses")
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  getCourse() {
    return this.courses.getCourseManifest();
  }

  @Get(":volumeId")
  getVolume(@Param("volumeId") volumeId: string) {
    return this.courses.getVolume(volumeId);
  }

  @Get(":volumeId/:chapterId")
  getChapter(@Param("volumeId") volumeId: string, @Param("chapterId") chapterId: string) {
    return this.courses.getChapter(volumeId, chapterId);
  }
}
