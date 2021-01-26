import { Module } from '@nestjs/common';
import { StagesService } from './stages.service';
import { StagesController } from './stages.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Stage, StageSchema } from './entities/stage.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Stage.name, schema: StageSchema }]),
  ],
  controllers: [StagesController],
  providers: [StagesService],
  exports: [StagesService]
})
export class StagesModule { }
