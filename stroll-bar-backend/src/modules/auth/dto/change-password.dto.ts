import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
	@ApiProperty({ example: 'CurrentPass123!' })
	@IsString()
	@MinLength(1)
	@MaxLength(128)
	currentPassword!: string;

	@ApiProperty({ example: 'EvenBetterPass123!', minLength: 8, maxLength: 128 })
	@IsString()
	@MinLength(8)
	@MaxLength(128)
	newPassword!: string;
}
