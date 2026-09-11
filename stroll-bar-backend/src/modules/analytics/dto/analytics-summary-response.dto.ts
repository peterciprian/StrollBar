import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShortestCompletionDto {
	@ApiProperty({ example: 'f7f3eb6a-711b-49e8-ae60-b7af77fa35c6' })
	strollId!: string;

	@ApiProperty({ example: "Fisherman's Bastion Mystery" })
	strollName!: string;

	@ApiProperty({ example: 720 })
	elapsedSeconds!: number;
}

export class AnalyticsSummaryResponseDto {
	@ApiProperty({ example: 4, description: 'Strolls authored by the current user.' })
	createdStrollsCount!: number;

	@ApiProperty({ example: 12, description: 'Adventures purchased/unlocked by the current user.' })
	purchasedStrollsCount!: number;

	@ApiProperty({ example: 3, description: 'Adventures currently purchased or in progress.' })
	activeStrollsCount!: number;

	@ApiProperty({ example: 9, description: 'Adventures marked as completed.' })
	completedStrollsCount!: number;

	@ApiProperty({ example: 75, description: 'Completed adventures as a percentage of purchased adventures.' })
	completionRate!: number;

	@ApiPropertyOptional({ type: ShortestCompletionDto, nullable: true })
	shortestCompletion!: ShortestCompletionDto | null;

	@ApiProperty({ example: 1840, description: 'Average completion time across all completed adventures, in seconds.' })
	avgCompletionSeconds!: number;

	@ApiProperty({ example: 6, description: 'Reviews submitted by the current user.' })
	reviewsCount!: number;

	@ApiProperty({ example: 4, description: 'Badges (completed achievements) earned by the current user.' })
	badgesCount!: number;
}
