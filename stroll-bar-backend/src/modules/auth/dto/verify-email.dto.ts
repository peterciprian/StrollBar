import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyEmailDto {
	@ApiProperty({ example: 'f3b91791b6e7d8f565...' })
	@IsString()
	@MinLength(1)
	@MaxLength(1024)
	token!: string;
}
