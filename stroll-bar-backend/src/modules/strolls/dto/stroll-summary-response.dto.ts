import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StrollPublicityFlag } from '../entities/stroll.entity';

export class StrollSummaryResponseDto {
	@ApiProperty({ example: '0e86308f-78cd-4929-a7d8-9db9c3307ee6' })
	id!: string;

	@ApiProperty({ example: 'Castle District Highlights' })
	name!: string;

	@ApiProperty({ example: 'f7f3eb6a-711b-49e8-ae60-b7af77fa35c6' })
	authorId!: string;

	@ApiProperty({ type: [String], example: ['historical', 'budapest'] })
	labels!: string[];

	@ApiProperty({ description: 'Advertising extract, limited to 240 characters.' })
	description!: string;

	@ApiPropertyOptional({
		example: { imageUrls: ['https://example.com/cover.jpg'], videoUrls: [] },
		nullable: true
	})
	mediaUrls?: { imageUrls: string[]; videoUrls: [] } | null;

	@ApiProperty({ enum: StrollPublicityFlag })
	publicityFlag!: StrollPublicityFlag;

	@ApiProperty({ example: 5 })
	stageCount!: number;
}
