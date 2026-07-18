import {
	IsArray,
	IsInt,
	IsNumber,
	IsOptional,
	IsString,
	IsUrl,
	Max,
	MaxLength,
	Min,
	MinLength,
} from 'class-validator';

export class UpdateStageDto {
	@IsOptional()
	@IsInt()
	@Min(1)
	orderIndex?: number;

	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(150)
	name?: string;

	@IsOptional()
	@IsString()
	@MinLength(10)
	description?: string;

	@IsOptional()
	@IsString()
	notes?: string;

	@IsOptional()
	@IsArray()
	@IsUrl({}, { each: true })
	imageUrls?: string[];

	@IsOptional()
	@IsArray()
	@IsUrl({}, { each: true })
	videoUrls?: string[];

	@IsOptional()
	@IsString()
	@MaxLength(255)
	address?: string;

	@IsOptional()
	@IsNumber()
	@Min(-90)
	@Max(90)
	latitude?: number;

	@IsOptional()
	@IsNumber()
	@Min(-180)
	@Max(180)
	longitude?: number;

	@IsOptional()
	@IsString()
	@MaxLength(255)
	riddleAnswer?: string;
}
