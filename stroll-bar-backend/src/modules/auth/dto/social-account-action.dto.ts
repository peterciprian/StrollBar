import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

class SocialRedirectDto {
	@ApiPropertyOptional({ description: 'Allowed frontend redirect URI.' })
	@IsOptional()
	@IsString()
	@MaxLength(2048)
	redirectUri?: string;
}

export class SocialReclaimDto extends SocialRedirectDto {
	@ApiProperty({ description: 'Email of the unverified registration to reclaim.' })
	@IsEmail()
	@MaxLength(255)
	email!: string;
}

export class SocialLinkDto extends SocialRedirectDto {
	@ApiProperty({ description: 'Current password for explicit account-link reauthentication.' })
	@IsString()
	@MinLength(1)
	@MaxLength(128)
	currentPassword!: string;
}
