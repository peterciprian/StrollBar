import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUrl, IsNumber, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { StrollActiveStatus, StrollPublicityFlag } from '../entities/stroll.entity';
import { StrollCategory } from './stroll-category.enum';
import { StrollPriceDto } from './stroll-price.dto';

class BulkMediaUrlsDto {
	@IsOptional()
	@IsArray()
	@IsUrl({}, { each: true })
	imageUrls?: string[];

	@IsOptional()
	@IsArray()
	@IsUrl({}, { each: true })
	videoUrls?: string[];
}

export class BulkImportStrollRecordDto {
	@IsOptional()
	@IsString()
	id?: string;

	@IsString()
	@MinLength(3)
	@MaxLength(150)
	name!: string;

	@IsOptional()
	@IsString()
	authorId?: string;

	@IsString()
	@MinLength(10)
	description!: string;

	@IsOptional()
	@IsString()
	proposerText?: string | null;

	@IsArray()
	@IsString({ each: true })
	labels!: string[];

	@IsOptional()
	@IsEnum(StrollCategory)
	category?: StrollCategory;

	@IsOptional()
	@ValidateNested()
	@Type(() => BulkMediaUrlsDto)
	mediaUrls?: BulkMediaUrlsDto | null;

	@IsOptional()
	@ValidateNested()
	@Type(() => StrollPriceDto)
	price?: StrollPriceDto | null;

	@IsOptional()
	@IsEnum(StrollActiveStatus)
	activeStatus?: StrollActiveStatus;

	@IsOptional()
	@IsEnum(StrollPublicityFlag)
	publicityFlag?: StrollPublicityFlag;

	@IsOptional()
	@IsInt()
	stageCount?: number;

	@IsOptional()
	@IsString()
	createdAt?: string;

	@IsOptional()
	@IsString()
	updatedAt?: string;
}

export class BulkImportStageDto {
	@IsOptional()
	@IsString()
	id?: string;

	@IsOptional()
	@IsString()
	strollId?: string;

	@IsInt()
	@Min(0)
	orderIndex!: number;

	@IsString()
	@MinLength(2)
	@MaxLength(150)
	name!: string;

	@IsString()
	@MinLength(10)
	description!: string;

	@IsOptional()
	@IsString()
	notes?: string | null;

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
	address?: string | null;

	@IsOptional()
	@IsNumber()
	@Min(-90)
	@Max(90)
	latitude?: number | null;

	@IsOptional()
	@IsNumber()
	@Min(-180)
	@Max(180)
	longitude?: number | null;

	@IsOptional()
	@IsString()
	createdAt?: string;

	@IsOptional()
	@IsString()
	updatedAt?: string;
}

export class BulkImportStrollDto {
	@ValidateNested()
	@Type(() => BulkImportStrollRecordDto)
	stroll!: BulkImportStrollRecordDto;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => BulkImportStageDto)
	stages!: BulkImportStageDto[];
}
