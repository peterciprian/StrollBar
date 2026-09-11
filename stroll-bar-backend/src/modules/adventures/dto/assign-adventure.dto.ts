import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignAdventureDto {
	@ApiProperty({ example: 'b1826c26-6352-4bb9-9a31-b4ecf2f40ab8' })
	@IsString()
	@IsUUID()
	userId!: string;

	@ApiProperty({ example: 'f7f3eb6a-711b-49e8-ae60-b7af77fa35c6' })
	@IsString()
	@IsUUID()
	strollId!: string;
}
