import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';
import { ListOwnedStrollsQueryDto, STROLL_SORT_OPTIONS, StrollSortOption } from './list-owned-strolls-query.dto';

export { STROLL_SORT_OPTIONS, StrollSortOption } from './list-owned-strolls-query.dto';

export class ListStrollsQueryDto extends ListOwnedStrollsQueryDto {
	@ApiPropertyOptional({
		example: 'Budapest',
		description: 'Trimmed, case-insensitive literal substring of name, description OR any stage address. Empty text is ignored.'
	})
	@Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
	override search?: string;

	@ApiPropertyOptional({
		example: 'Budapest',
		description:
			'Trimmed, case-insensitive literal substring of any stage address, ANDed with search. No separate city field or accent normalization.'
	})
	@Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
	override city?: string;

	@ApiPropertyOptional({
		enum: STROLL_SORT_OPTIONS,
		default: 'newest',
		description: 'Nearest falls back to newest unless both user coordinates are supplied.'
	})
	@IsIn(STROLL_SORT_OPTIONS)
	override sortBy?: StrollSortOption;
}
