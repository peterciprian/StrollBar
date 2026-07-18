import { ApiProperty } from '@nestjs/swagger';

export class ReorderStagesResponseDto {
  @ApiProperty({ example: '0e86308f-78cd-4929-a7d8-9db9c3307ee6' })
  strollId!: string;

  @ApiProperty({ example: 3 })
  reordered!: number;
}
