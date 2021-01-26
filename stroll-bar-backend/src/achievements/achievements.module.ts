import { Module } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Achievement, AchievementSchema } from './entities/achievement.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Achievement.name, schema: AchievementSchema },
    ]),
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService]
})
export class AchievementsModule { }
