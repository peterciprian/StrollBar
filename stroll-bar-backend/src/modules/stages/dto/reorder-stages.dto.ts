import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { ApiProperty } from '@nestjs/swagger';
export class StageOrderItemDto {
  @ApiProperty({ example: '53fd478b-8cc2-4d1c-91ca-9f69ea9d5037' })
  @IsUUID()
  stageId!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  orderIndex!: number;
}

export class ReorderStagesDto {
  @ApiProperty({ type: [StageOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StageOrderItemDto)
  items!: StageOrderItemDto[];
}
