import { Module } from '@nestjs/common';
import { AchivementsService } from './achivements.service';
import { AchivementsController } from './achivements.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Achivement, AchivementSchema } from './entities/achivement.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Achivement.name, schema: AchivementSchema },
    ]),
  ],
  controllers: [AchivementsController],
  providers: [AchivementsService],
})
export class AchivementsModule {}
