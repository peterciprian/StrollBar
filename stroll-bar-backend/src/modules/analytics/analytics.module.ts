import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AchievementEntity } from '../achievements/entities/achievement.entity';
import { AdventureResultEntity } from '../achievements/entities/adventure-result.entity';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { StrollReviewEntity } from '../strolls/entities/stroll-review.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
	imports: [TypeOrmModule.forFeature([StrollEntity, AdventureEntity, AdventureResultEntity, AchievementEntity, StrollReviewEntity])],
	controllers: [AnalyticsController],
	providers: [AnalyticsService]
})
export class AnalyticsModule {}
