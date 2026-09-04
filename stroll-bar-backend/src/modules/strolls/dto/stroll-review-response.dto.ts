import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StrollReviewResponseDto {
	@ApiProperty({ example: '0e86308f-78cd-4929-a7d8-9db9c3307ee6' })
	id!: string;

	@ApiProperty({ example: 'f7f3eb6a-711b-49e8-ae60-b7af77fa35c6' })
	strollId!: string;

	@ApiProperty({ example: 'b1826c26-6352-4bb9-9a31-b4ecf2f40ab8' })
	userId!: string;

	@ApiProperty({ example: 'Wanderer' })
	authorName!: string;

	@ApiProperty({ example: 5 })
	rating!: number;

	@ApiPropertyOptional({ example: 'Loved the riddles around the castle.', nullable: true })
	comment?: string | null;

	@ApiProperty()
	createdAt!: Date;
}

export class StrollReviewListResponseDto {
	@ApiProperty({ type: [StrollReviewResponseDto] })
	items!: StrollReviewResponseDto[];

	@ApiProperty({ example: 4.5 })
	ratingAverage!: number;

	@ApiProperty({ example: 12 })
	ratingCount!: number;
}
