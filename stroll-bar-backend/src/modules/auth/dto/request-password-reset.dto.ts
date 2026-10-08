import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';
import { PreferredLanguage } from '../../users/entities/user.entity';

export class RequestPasswordResetDto {
	@ApiProperty({ example: 'walker@example.com', format: 'email' })
	@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
	@IsEmail()
	@MaxLength(254)
	email!: string;

	@ApiPropertyOptional({ enum: PreferredLanguage })
	@IsOptional()
	@IsIn(Object.values(PreferredLanguage))
	preferredLanguage?: PreferredLanguage;
}
