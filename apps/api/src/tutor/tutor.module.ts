import { Module } from "@nestjs/common";
import { CoursesModule } from "../courses/courses.module";
import { TutorController } from "./tutor.controller";
import { TutorService } from "./tutor.service";
import { OpenAiService } from "./openai.service";

@Module({
  imports: [CoursesModule],
  controllers: [TutorController],
  providers: [TutorService, OpenAiService],
})
export class TutorModule {}
