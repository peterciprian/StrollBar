import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StageResponseDto {
  @ApiProperty({ example: '53fd478b-8cc2-4d1c-91ca-9f69ea9d5037' })
  id!: string;

  @ApiProperty({ example: '0e86308f-78cd-4929-a7d8-9db9c3307ee6' })
  strollId!: string;

  @ApiProperty({ example: 1 })
  orderIndex!: number;

  @ApiProperty({ example: 'Parliament' })
  name!: string;

  @ApiProperty({ example: 'Solve the riddle to continue.' })
  description!: string;

  @ApiPropertyOptional({ example: 'Best visited at sunset.', nullable: true })
  notes?: string | null;

  @ApiProperty({ type: [String], example: ['https://example.com/stage.jpg'] })
  imageUrls!: string[];

  @ApiProperty({ type: [String], example: ['https://example.com/stage.mp4'] })
  videoUrls!: string[];

  @ApiPropertyOptional({ example: 'Kossuth Lajos ter 1-3', nullable: true })
  address?: string | null;

  @ApiPropertyOptional({ example: 47.5072, nullable: true })
  latitude?: number | null;

  @ApiPropertyOptional({ example: 19.0456, nullable: true })
  longitude?: number | null;

  @ApiPropertyOptional({ example: '2026-07-18T16:00:00.000Z', nullable: true })
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-07-18T16:05:00.000Z', nullable: true })
  updatedAt?: string;
}
