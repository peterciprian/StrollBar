import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PasswordResetRequestResponseDto {
  @ApiProperty({ example: 'If the account exists, a password reset token has been issued.' })
  message!: string;

  @ApiPropertyOptional({ example: 'f3b91791b6e7d8f565d7d8f565f3b91791b6e7d8f565d7d8f565f3b91791b6' })
  resetToken?: string;
}
