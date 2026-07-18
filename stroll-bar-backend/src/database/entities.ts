import { AdventureEntity } from '../modules/adventures/entities/adventure.entity';
import { StageAttemptEntity } from '../modules/adventures/entities/stage-attempt.entity';
import { MediaAssetEntity } from '../modules/media/entities/media-asset.entity';
import { StageEntity } from '../modules/stages/entities/stage.entity';
import { StrollEntity } from '../modules/strolls/entities/stroll.entity';
import { UserEntity } from '../modules/users/entities/user.entity';

export const DATABASE_ENTITIES = [
  UserEntity,
  StrollEntity,
  StageEntity,
  AdventureEntity,
  StageAttemptEntity,
  MediaAssetEntity,
] as const;
