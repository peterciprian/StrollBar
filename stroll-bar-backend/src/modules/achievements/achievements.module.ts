import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { AdventureResultsService } from './adventure-results.service';
import { AchievementEntity } from './entities/achievement.entity';
import { AdventureResultEntity } from './entities/adventure-result.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';

@Module({
	imports: [TypeOrmModule.forFeature([AchievementEntity, AdventureResultEntity, StrollEntity])],
	controllers: [AchievementsController],
	providers: [AchievementsService, AdventureResultsService],
	exports: [AchievementsService, AdventureResultsService]
})
export class AchievementsModule {}
