import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class NavigateAdventureDto {
	@ApiProperty({ enum: ['next', 'previous'], example: 'next' })
	@IsIn(['next', 'previous'])
	direction!: 'next' | 'previous';
}
