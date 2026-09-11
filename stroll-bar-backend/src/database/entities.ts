import { AchievementEntity } from '../modules/achievements/entities/achievement.entity';
import { AdventureResultEntity } from '../modules/achievements/entities/adventure-result.entity';
import { AdventureEntity } from '../modules/adventures/entities/adventure.entity';
import { StageAttemptEntity } from '../modules/adventures/entities/stage-attempt.entity';
import { MediaAssetEntity } from '../modules/media/entities/media-asset.entity';
import { SocialIdentityEntity } from '../modules/auth/entities/social-identity.entity';
import { StageEntity } from '../modules/stages/entities/stage.entity';
import { StrollEntity } from '../modules/strolls/entities/stroll.entity';
import { StrollReviewEntity } from '../modules/strolls/entities/stroll-review.entity';
import { StrollReportEntity } from '../modules/stroll-reports/entities/stroll-report.entity';
import { UserEntity } from '../modules/users/entities/user.entity';
import { UserBadgeEntity } from '../modules/badges/entities/user-badge.entity';
import { BadgeDefinitionEntity } from '../modules/badges/entities/badge-definition.entity';
import { AuditEventEntity } from '../common/audit.entity';

export const DATABASE_ENTITIES = [
	AchievementEntity,
	AdventureResultEntity,
	UserEntity,
	StrollEntity,
	StrollReviewEntity,
	StrollReportEntity,
	StageEntity,
	AdventureEntity,
	StageAttemptEntity,
	MediaAssetEntity,
	SocialIdentityEntity,
	AuditEventEntity,
	UserBadgeEntity,
	BadgeDefinitionEntity
] as const;
