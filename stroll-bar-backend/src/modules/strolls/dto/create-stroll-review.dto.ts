import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const STROLL_REVIEW_COMMENT_MAX_LENGTH = 1000;

export class CreateStrollReviewDto {
	@ApiProperty({ example: 5, minimum: 1, maximum: 5 })
	@IsInt()
	@Min(1)
	@Max(5)
	rating!: number;

	@ApiPropertyOptional({ example: 'Loved the riddles around the castle.', maxLength: STROLL_REVIEW_COMMENT_MAX_LENGTH })
	@IsOptional()
	@IsString()
	@MaxLength(STROLL_REVIEW_COMMENT_MAX_LENGTH)
	comment?: string;
}
