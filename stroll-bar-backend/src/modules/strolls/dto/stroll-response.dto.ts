import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StrollActiveStatus, StrollPublicityFlag } from '../entities/stroll.entity';
import { StrollCategory } from './stroll-category.enum';
import { StrollPriceDto } from './stroll-price.dto';

class StrollMediaUrlsResponseDto {
	@ApiProperty({ type: [String], example: ['https://example.com/cover.jpg'] })
	imageUrls!: string[];

	@ApiProperty({ type: [String], example: ['https://example.com/intro.mp4'] })
	videoUrls!: string[];
}

export class StrollResponseDto {
	@ApiProperty({ example: '0e86308f-78cd-4929-a7d8-9db9c3307ee6' })
	id!: string;

	@ApiProperty({ example: 'Budapest Highlights' })
	name!: string;

	@ApiProperty({ example: 'f7f3eb6a-711b-49e8-ae60-b7af77fa35c6' })
	authorId!: string;

	@ApiProperty({ enum: StrollActiveStatus, example: StrollActiveStatus.PUBLISHED })
	activeStatus!: StrollActiveStatus;

	@ApiProperty({ type: [String], example: ['city', 'architecture'] })
	labels!: string[];

	@ApiProperty({ enum: StrollCategory })
	category!: StrollCategory;

	@ApiProperty({ example: 'A short guided route through the city center.' })
	description!: string;

	@ApiPropertyOptional({ example: 'Curated by locals.', nullable: true })
	proposerText?: string | null;

	@ApiPropertyOptional({ type: StrollMediaUrlsResponseDto, nullable: true })
	mediaUrls?: StrollMediaUrlsResponseDto | null;

	@ApiPropertyOptional({ type: StrollPriceDto, nullable: true })
	price?: StrollPriceDto | null;

	@ApiProperty({ example: 2.4 })
	length!: number;

	@ApiProperty({ enum: StrollPublicityFlag, example: StrollPublicityFlag.PUBLIC })
	publicityFlag!: StrollPublicityFlag;

	@ApiProperty({ example: 4 })
	stageCount!: number;

	@ApiProperty({ example: '2026-07-18T16:00:00.000Z' })
	createdAt!: string;

	@ApiProperty({ example: '2026-07-18T16:05:00.000Z' })
	updatedAt!: string;
}
