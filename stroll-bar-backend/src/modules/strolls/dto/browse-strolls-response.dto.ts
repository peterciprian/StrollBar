import { ApiProperty } from '@nestjs/swagger';
import { StrollSummaryResponseDto } from './stroll-summary-response.dto';

export class BrowseStrollsResponseDto {
	@ApiProperty({ type: [StrollSummaryResponseDto] })
	items!: StrollSummaryResponseDto[];

	@ApiProperty({ example: 1, description: 'Requested one-based page. Out-of-range pages return an empty items array.' })
	page!: number;

	@ApiProperty({ example: 20 })
	limit!: number;

	@ApiProperty({ example: 3, description: 'Matching stroll count after server filters, before pagination. Category is a page-local UI filter only.' })
	total!: number;
}
