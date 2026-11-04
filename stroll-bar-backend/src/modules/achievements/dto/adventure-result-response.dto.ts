import { ApiProperty } from '@nestjs/swagger';
import { StrollResponseDto } from '../../strolls/dto/stroll-response.dto';

export class CompletedAdventureResultDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	userId!: string;

	@ApiProperty()
	strollId!: string;

	@ApiProperty()
	adventureId!: string;

	@ApiProperty()
	completedStageCount!: number;

	@ApiProperty()
	elapsedSeconds!: number;

	@ApiProperty()
	routeLengthKm!: number;

	@ApiProperty()
	completedAt!: Date;

	@ApiProperty()
	createdAt!: Date;
}

export class AchievementAdventureResultResponseDto {
	@ApiProperty({ type: CompletedAdventureResultDto })
	result!: CompletedAdventureResultDto;

	@ApiProperty({ type: StrollResponseDto, nullable: true })
	stroll!: StrollResponseDto | null;
}
