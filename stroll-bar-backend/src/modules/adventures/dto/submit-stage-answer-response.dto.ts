import { ApiProperty } from '@nestjs/swagger';
import { AdventureResponseDto } from './adventure-response.dto';

export class SubmitStageAnswerResponseDto {
  @ApiProperty({ example: true })
  isCorrect!: boolean;

  @ApiProperty({ type: AdventureResponseDto })
  adventure!: AdventureResponseDto;

  @ApiProperty({ example: '53fd478b-8cc2-4d1c-91ca-9f69ea9d5037' })
  stageId!: string;
}
