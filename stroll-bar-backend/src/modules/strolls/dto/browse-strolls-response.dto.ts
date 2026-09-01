import { ApiProperty } from '@nestjs/swagger';
import { StrollSummaryResponseDto } from './stroll-summary-response.dto';

export class BrowseStrollsResponseDto {
	@ApiProperty({ type: [StrollSummaryResponseDto] })
	items!: StrollSummaryResponseDto[];

	@ApiProperty({ example: 1 })
	page!: number;

	@ApiProperty({ example: 20 })
	limit!: number;

	@ApiProperty({ example: 3 })
	total!: number;
}
