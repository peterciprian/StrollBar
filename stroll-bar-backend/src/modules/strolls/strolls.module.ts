import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StrollsController } from './strolls.controller';
import { StrollsService } from './strolls.service';
import { StrollReviewsController, MyReviewsController } from './stroll-reviews.controller';
import { StrollReviewsService } from './stroll-reviews.service';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollEntity } from './entities/stroll.entity';
import { StrollReviewEntity } from './entities/stroll-review.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AdventureEntity } from '../adventures/entities/adventure.entity';
import { BadgesModule } from '../badges/badges.module';
import { EmailModule } from '../email/email.module';
import { RedisCacheService } from '../../common/services/redis-cache.service';

@Module({
	imports: [TypeOrmModule.forFeature([StrollEntity, StrollReviewEntity, StageEntity, UserEntity, AdventureEntity]), BadgesModule, EmailModule],
	controllers: [StrollsController, StrollReviewsController, MyReviewsController],
	providers: [StrollsService, StrollReviewsService, RedisCacheService],
	exports: [StrollsService]
})
export class StrollsModule {}
