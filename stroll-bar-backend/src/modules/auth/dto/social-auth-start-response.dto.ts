import { ApiProperty } from '@nestjs/swagger';

export class SocialAuthStartResponseDto {
	@ApiProperty({ description: 'Browser transaction identifier; not a credential.' })
	transactionId!: string;

	@ApiProperty({ example: 'https://accounts.google.com/o/oauth2/v2/auth?...' })
	url!: string;
}
