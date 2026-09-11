import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BadgeCatalogEntryDto {
	@ApiProperty({ example: 'FIRST_ADVENTURE' })
	code!: string;

	@ApiProperty({ example: 'hiking' })
	icon!: string;

	@ApiProperty({ example: 'First Steps' })
	title!: string;

	@ApiProperty({ example: 'Completed your first adventure.' })
	description!: string;

	@ApiProperty({ example: true })
	earned!: boolean;

	@ApiPropertyOptional({ nullable: true })
	earnedAt!: Date | null;
}
