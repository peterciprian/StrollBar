import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StageResponseDto } from '../../stages/dto/stage-response.dto';
import { StrollResponseDto } from '../../strolls/dto/stroll-response.dto';
import { AdventureResponseDto } from './adventure-response.dto';

export class AdventureDetailResponseDto {
  @ApiProperty({ type: AdventureResponseDto })
  adventure!: AdventureResponseDto;

  @ApiPropertyOptional({ type: StrollResponseDto, nullable: true })
  stroll?: StrollResponseDto | null;

  @ApiPropertyOptional({ type: StageResponseDto, nullable: true })
  currentStage?: StageResponseDto | null;
}
