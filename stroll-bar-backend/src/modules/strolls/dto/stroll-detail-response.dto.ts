import { ApiProperty } from '@nestjs/swagger';
import { StageResponseDto } from '../../stages/dto/stage-response.dto';
import { StrollResponseDto } from './stroll-response.dto';

export class StrollDetailResponseDto {
  @ApiProperty({ type: StrollResponseDto })
  stroll!: StrollResponseDto;

  @ApiProperty({ type: [StageResponseDto] })
  stages!: StageResponseDto[];
}
