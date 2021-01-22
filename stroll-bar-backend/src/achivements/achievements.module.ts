import { Module } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Achivement, AchivementSchema } from './entities/achivement.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Achivement.name, schema: AchivementSchema },
    ]),
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
})
export class AchievementsModule {}
