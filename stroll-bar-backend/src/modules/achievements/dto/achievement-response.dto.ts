import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AchievementResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  strollId!: string;

  @ApiProperty()
  score!: number;

  @ApiProperty()
  timeSeconds!: number;

  @ApiProperty()
  hintsUsed!: number;

  @ApiProperty()
  completed!: boolean;

  @ApiPropertyOptional({ nullable: true })
  completedAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
