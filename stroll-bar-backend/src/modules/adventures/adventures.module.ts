import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdventuresController } from './adventures.controller';
import { AdventuresService } from './adventures.service';
import { AchievementsModule } from '../achievements/achievements.module';
import { BadgesModule } from '../badges/badges.module';
import { EmailModule } from '../email/email.module';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AdventureEntity } from './entities/adventure.entity';
import { StageAttemptEntity } from './entities/stage-attempt.entity';

@Module({
	imports: [
		TypeOrmModule.forFeature([AdventureEntity, StageAttemptEntity, StrollEntity, StageEntity, UserEntity]),
		AchievementsModule,
		BadgesModule,
		EmailModule
	],
	controllers: [AdventuresController],
	providers: [AdventuresService],
	exports: [AdventuresService]
})
export class AdventuresModule {}
