import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

class SocialRedirectDto {
	@ApiProperty({ description: 'S256 challenge for the initiating browser verifier.' })
	@IsString()
	@Matches(/^[A-Za-z0-9_-]{43}$/)
	browserChallenge!: string;

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
