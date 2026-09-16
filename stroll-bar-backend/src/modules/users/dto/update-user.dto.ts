import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { PreferredLanguage } from '../entities/user.entity';

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

	@ApiPropertyOptional({ enum: PreferredLanguage, example: PreferredLanguage.HU })
	@IsOptional()
	@IsIn(Object.values(PreferredLanguage))
	preferredLanguage?: PreferredLanguage;
}
