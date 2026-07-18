import { ApiProperty } from '@nestjs/swagger';
import { StrollResponseDto } from './stroll-response.dto';

export class StrollListResponseDto {
  @ApiProperty({ type: [StrollResponseDto] })
  items!: StrollResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}
