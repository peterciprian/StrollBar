import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
	@ApiPropertyOptional({ example: 'walker', minLength: 3, maxLength: 50 })
	@IsOptional()
	@IsString()
	@MinLength(3)
	@MaxLength(50)
	username?: string;

	@ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', nullable: true })
	@IsOptional()
	@IsUrl()
	profileImageUrl?: string;
}
