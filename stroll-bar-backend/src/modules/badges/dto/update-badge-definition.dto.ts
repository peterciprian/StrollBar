import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBadgeDefinitionDto } from './create-badge-definition.dto';

// The code is immutable after creation to keep earned UserBadge rows stable.
export class UpdateBadgeDefinitionDto extends PartialType(OmitType(CreateBadgeDefinitionDto, ['code'] as const)) {}
