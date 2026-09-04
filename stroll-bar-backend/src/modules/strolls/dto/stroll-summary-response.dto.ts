import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StrollPublicityFlag } from '../entities/stroll.entity';
import { StrollCategory } from './stroll-category.enum';
import { StrollPriceDto } from './stroll-price.dto';

export class StrollSummaryResponseDto {
	@ApiProperty({ example: '0e86308f-78cd-4929-a7d8-9db9c3307ee6' })
	id!: string;

	@ApiProperty({ example: 'Castle District Highlights' })
	name!: string;

	@ApiProperty({ example: 'f7f3eb6a-711b-49e8-ae60-b7af77fa35c6' })
	authorId!: string;

	@ApiProperty({ type: [String], example: ['historical', 'budapest'] })
	labels!: string[];

	@ApiProperty({ enum: StrollCategory })
	category!: StrollCategory;

	@ApiProperty({ description: 'Advertising extract, limited to 240 characters.' })
	description!: string;

	@ApiPropertyOptional({
		example: { imageUrls: ['https://example.com/cover.jpg'], videoUrls: [] },
		nullable: true
	})
	mediaUrls?: { imageUrls: string[]; videoUrls: [] } | null;

	@ApiPropertyOptional({ type: StrollPriceDto, nullable: true })
	price?: StrollPriceDto | null;

	@ApiProperty({ example: 2.4 })
	length!: number;

	@ApiProperty({ enum: StrollPublicityFlag })
	publicityFlag!: StrollPublicityFlag;

	@ApiProperty({ example: 5 })
	stageCount!: number;

	@ApiProperty({ example: 4.5, description: 'Average of all submitted reviews, 0 when the stroll has none.' })
	ratingAverage!: number;

	@ApiProperty({ example: 12 })
	ratingCount!: number;
}
