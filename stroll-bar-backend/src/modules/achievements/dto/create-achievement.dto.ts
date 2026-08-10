import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateAchievementDto {
  @ApiProperty({ description: 'ID of the stroll this achievement belongs to.' })
  @IsUUID()
  strollId!: string;

  @ApiPropertyOptional({ description: 'Score earned.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;

  @ApiPropertyOptional({ description: 'Time taken in seconds.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeSeconds?: number;

  @ApiPropertyOptional({ description: 'Number of hints used.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  hintsUsed?: number;

  @ApiPropertyOptional({ description: 'Whether the stroll was fully completed.' })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
