import { IsInt, IsLatitude, IsLongitude, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const STROLL_SORT_OPTIONS = ['newest', 'most_popular', 'top_rated', 'nearest'] as const;
export type StrollSortOption = (typeof STROLL_SORT_OPTIONS)[number];

export class ListStrollsQueryDto {
	@ApiPropertyOptional({ example: 'Budapest' })
	@IsOptional()
	@IsString()
	search?: string;

	@ApiPropertyOptional({ example: 'city' })
	@IsOptional()
	@IsString()
	labels?: string;

	@ApiPropertyOptional({ example: 'b1826c26-6352-4bb9-9a31-b4ecf2f40ab8' })
	@IsOptional()
	@IsString()
	authorId?: string;

	@ApiPropertyOptional({ example: 'Budapest' })
	@IsOptional()
	@IsString()
	city?: string;

	@ApiPropertyOptional({ enum: STROLL_SORT_OPTIONS, example: 'newest' })
	@IsOptional()
	@IsString()
	sortBy?: StrollSortOption;

	@ApiPropertyOptional({ example: 47.4979, description: 'Required for the nearest sort option.' })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@IsLatitude()
	userLatitude?: number;

	@ApiPropertyOptional({ example: 19.0402, description: 'Required for the nearest sort option.' })
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@IsLongitude()
	userLongitude?: number;

	@ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = 1;

	@ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number = 20;
}
