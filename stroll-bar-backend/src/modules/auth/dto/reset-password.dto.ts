import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'f3b91791b6e7d8f565...' })
  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  resetToken!: string;

  @ApiProperty({ example: 'EvenBetterPass123!', minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
