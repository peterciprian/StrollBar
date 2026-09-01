import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResendVerificationResponseDto {
	@ApiProperty({ example: 'A new verification email has been issued.' })
	message!: string;

	@ApiPropertyOptional({ example: 'f3b91791b6e7d8f565d7d8f565f3b91791b6e7d8f565d7d8f565f3b91791b6' })
	verificationToken?: string;
}
