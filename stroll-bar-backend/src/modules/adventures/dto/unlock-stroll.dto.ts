import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UnlockStrollDto {
  @ApiProperty({ example: '0e86308f-78cd-4929-a7d8-9db9c3307ee6' })
  @IsUUID()
  strollId!: string;
}
