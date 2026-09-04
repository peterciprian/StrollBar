import { ApiProperty } from '@nestjs/swagger';

export class AdventureResultResponseDto {
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
