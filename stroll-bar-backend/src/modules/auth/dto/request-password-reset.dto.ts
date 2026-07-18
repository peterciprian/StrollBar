import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'walker@example.com', format: 'email' })
  @IsEmail()
  email!: string;
}
