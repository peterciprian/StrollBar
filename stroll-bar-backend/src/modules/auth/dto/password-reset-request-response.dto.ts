import { ApiProperty } from '@nestjs/swagger';

export class PasswordResetRequestResponseDto {
	@ApiProperty({ example: 'If the account exists, a password reset token has been issued.' })
	message!: string;
}
