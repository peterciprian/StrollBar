import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdventureResultEntity } from '../achievements/entities/adventure-result.entity';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { StrollReviewEntity } from '../strolls/entities/stroll-review.entity';
import { BadgesModule } from '../badges/badges.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
	imports: [TypeOrmModule.forFeature([StrollEntity, AdventureEntity, AdventureResultEntity, StrollReviewEntity]), BadgesModule],
	controllers: [AnalyticsController],
	providers: [AnalyticsService]
})
export class AnalyticsModule {}
