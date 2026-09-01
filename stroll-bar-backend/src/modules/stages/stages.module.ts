import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';
import { StageEntity } from './entities/stage.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { AdventureEntity } from '../adventures/entities/adventure.entity';

@Module({
	imports: [TypeOrmModule.forFeature([StageEntity, StrollEntity, AdventureEntity])],
	controllers: [StagesController],
	providers: [StagesService],
	exports: [StagesService]
})
export class StagesModule {}
