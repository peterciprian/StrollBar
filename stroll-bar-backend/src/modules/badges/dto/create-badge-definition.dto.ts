import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BadgeRuleConditionDto } from './badge-rule-condition.dto';

export class CreateBadgeDefinitionDto {
	@ApiProperty({ example: 'NIGHT_OWL', description: 'Unique, stable identifier. Uppercase letters, numbers, and underscores only.' })
	@IsString()
	@MinLength(2)
	@MaxLength(64)
	@Matches(/^[A-Z0-9_]+$/, { message: 'code must contain only uppercase letters, numbers, and underscores.' })
	code!: string;

	@ApiProperty({ example: 'dark_mode', description: 'Material icon name.' })
	@IsString()
	@MinLength(1)
	@MaxLength(64)
	icon!: string;

	@ApiProperty({ example: 'Night Owl' })
	@IsString()
	@MinLength(1)
	@MaxLength(150)
	title!: string;

	@ApiProperty({ example: 'Completed an adventure between 10 PM and 5 AM.' })
	@IsString()
	@MinLength(1)
	description!: string;

	@ApiPropertyOptional({ default: true })
	@IsOptional()
	@IsBoolean()
	active?: boolean;

	@ApiProperty({ type: [BadgeRuleConditionDto] })
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => BadgeRuleConditionDto)
	rules!: BadgeRuleConditionDto[];
}
