import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateStageDto } from '../../stages/dto/create-stage.dto';
import { CreateStrollDto } from './create-stroll.dto';

export class BulkImportStrollDto {
	@ApiProperty({ type: () => CreateStrollDto })
	@ValidateNested()
	@Type(() => CreateStrollDto)
	stroll!: CreateStrollDto;

	@ApiProperty({ type: () => CreateStageDto, isArray: true })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => CreateStageDto)
	stages!: CreateStageDto[];
}
