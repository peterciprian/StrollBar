import { AchievementEntity } from '../modules/achievements/entities/achievement.entity';
import { AdventureEntity } from '../modules/adventures/entities/adventure.entity';
import { StageAttemptEntity } from '../modules/adventures/entities/stage-attempt.entity';
import { MediaAssetEntity } from '../modules/media/entities/media-asset.entity';
import { SocialIdentityEntity } from '../modules/auth/entities/social-identity.entity';
import { StageEntity } from '../modules/stages/entities/stage.entity';
import { StrollEntity } from '../modules/strolls/entities/stroll.entity';
import { UserEntity } from '../modules/users/entities/user.entity';
import { AuditEventEntity } from '../common/audit.entity';

export const DATABASE_ENTITIES = [
	AchievementEntity,
	UserEntity,
	StrollEntity,
	StageEntity,
	AdventureEntity,
	StageAttemptEntity,
	MediaAssetEntity,
	SocialIdentityEntity,
	AuditEventEntity
] as const;
