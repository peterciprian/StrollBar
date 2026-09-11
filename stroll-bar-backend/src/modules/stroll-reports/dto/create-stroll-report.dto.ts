import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStrollReportDto {
	@ApiProperty({ example: 'This stroll contains offensive language in one of its stages.', maxLength: 300 })
	@IsString()
	@MinLength(1)
	@MaxLength(300)
	message!: string;
}
