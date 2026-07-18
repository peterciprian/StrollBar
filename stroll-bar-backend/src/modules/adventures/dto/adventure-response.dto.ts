import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdventureProgressStatus } from '../entities/adventure.entity';

export class AdventureResponseDto {
  @ApiProperty({ example: '2d8f7a3e-4eb1-4181-b3fa-fc9e2fd80a57' })
  id!: string;

  @ApiProperty({ example: 'f7f3eb6a-711b-49e8-ae60-b7af77fa35c6' })
  ownerUserId!: string;

  @ApiProperty({ example: '0e86308f-78cd-4929-a7d8-9db9c3307ee6' })
  strollId!: string;

  @ApiProperty({ example: '2026-07-18T16:00:00.000Z' })
  purchaseTime!: string;

  @ApiPropertyOptional({ example: '2026-07-18T16:10:00.000Z', nullable: true })
  startDateTime?: string | null;

  @ApiPropertyOptional({ example: '2026-07-18T16:30:00.000Z', nullable: true })
  completionDateTime?: string | null;

  @ApiProperty({ enum: AdventureProgressStatus, example: AdventureProgressStatus.IN_PROGRESS })
  progressStatus!: AdventureProgressStatus;

  @ApiProperty({ example: 2 })
  currentStageIndex!: number;

  @ApiPropertyOptional({ example: '2026-07-18T16:00:00.000Z', nullable: true })
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-07-18T16:05:00.000Z', nullable: true })
  updatedAt?: string;
}
