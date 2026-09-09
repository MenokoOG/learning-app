import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CoursesModule } from "./courses/courses.module";
import { TutorModule } from "./tutor/tutor.module";
import { ProgressModule } from "./progress/progress.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CoursesModule,
    TutorModule,
    ProgressModule,
  ],
})
export class AppModule {}
