import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdventureResponseDto } from './adventure-response.dto';
import { StrollResponseDto } from '../../strolls/dto/stroll-response.dto';

export class AdventureResultResponseDto {
	@ApiProperty({ type: AdventureResponseDto })
	adventure!: AdventureResponseDto;

	@ApiPropertyOptional({ type: StrollResponseDto, nullable: true })
	stroll?: StrollResponseDto | null;

	@ApiProperty()
	completedStageCount!: number;

	@ApiProperty()
	elapsedSeconds!: number;

	@ApiProperty()
	routeLengthKm!: number;

	@ApiProperty({ description: 'Compatibility alias for solvedRiddleCount.' })
	correctAnswerCount!: number;

	@ApiProperty({ description: 'Compatibility count of all stages in the stroll.' })
	totalStageCount!: number;

	@ApiProperty()
	solvedRiddleCount!: number;

	@ApiProperty()
	totalRiddleCount!: number;

	@ApiProperty()
	unresolvedRiddleCount!: number;
}
