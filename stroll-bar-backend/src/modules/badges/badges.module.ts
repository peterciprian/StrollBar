import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdventureResultEntity } from '../achievements/entities/adventure-result.entity';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { StageAttemptEntity } from '../adventures/entities/stage-attempt.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { StrollReviewEntity } from '../strolls/entities/stroll-review.entity';
import { BadgesController } from './badges.controller';
import { BadgesService } from './badges.service';
import { UserBadgeEntity } from './entities/user-badge.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([UserBadgeEntity, StrollEntity, AdventureEntity, AdventureResultEntity, StageAttemptEntity, StrollReviewEntity])
	],
	controllers: [BadgesController],
	providers: [BadgesService],
	exports: [BadgesService]
})
export class BadgesModule {}
