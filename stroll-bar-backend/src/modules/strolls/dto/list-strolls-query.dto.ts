import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListStrollsQueryDto {
  @ApiPropertyOptional({ example: 'Budapest' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'city' })
  @IsOptional()
  @IsString()
  labels?: string;

  @ApiPropertyOptional({ example: 'b1826c26-6352-4bb9-9a31-b4ecf2f40ab8' })
  @IsOptional()
  @IsString()
  authorId?: string;

  @ApiPropertyOptional({ example: 'Budapest' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: ['newest', 'most_used', 'best_rated'], example: 'newest' })
  @IsOptional()
  @IsString()
  sortBy?: 'newest' | 'most_used' | 'best_rated';

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
