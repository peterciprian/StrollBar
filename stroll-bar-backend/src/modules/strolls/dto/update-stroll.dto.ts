import { IsArray, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StrollActiveStatus, StrollPublicityFlag } from '../entities/stroll.entity';
import { StrollCategory } from './stroll-category.enum';
import { StrollPriceDto } from './stroll-price.dto';
import { Type } from 'class-transformer';
import { ValidateIf, ValidateNested } from 'class-validator';

export class UpdateStrollDto {
	@ApiPropertyOptional({ example: 'Budapest Highlights', minLength: 3, maxLength: 150 })
	@IsOptional()
	@IsString()
	@MinLength(3)
	@MaxLength(150)
	name?: string;

	@ApiPropertyOptional({ example: 'A short guided route through the city center.', minLength: 10 })
	@IsOptional()
	@IsString()
	@MinLength(10)
	description?: string;

	@ApiPropertyOptional({ example: 'Curated by locals.' })
	@IsOptional()
	@IsString()
	proposerText?: string;

	@ApiPropertyOptional({ example: ['city', 'architecture'], type: [String] })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	labels?: string[];

	@ApiPropertyOptional({ enum: StrollCategory, isArray: true })
	@IsOptional()
	@IsArray()
	@IsEnum(StrollCategory, { each: true })
	category?: StrollCategory[];

	@ApiPropertyOptional({ type: [String], example: ['https://example.com/cover.jpg'] })
	@IsOptional()
	@IsArray()
	@IsUrl({}, { each: true })
	imageUrls?: string[];

	@ApiPropertyOptional({ type: [String], example: ['https://example.com/intro.mp4'] })
	@IsOptional()
	@IsArray()
	@IsUrl({}, { each: true })
	videoUrls?: string[];

	@ApiPropertyOptional({ type: StrollPriceDto, nullable: true })
	@IsOptional()
	@ValidateIf((dto) => dto.price === null || dto.publicityFlag === StrollPublicityFlag.PRIVATE || dto.publicityFlag === undefined)
	@ValidateNested()
	@Type(() => StrollPriceDto)
	price?: StrollPriceDto | null;

	@ApiPropertyOptional({ enum: StrollActiveStatus, example: StrollActiveStatus.PUBLISHED })
	@IsOptional()
	@IsEnum(StrollActiveStatus)
	activeStatus?: StrollActiveStatus;

	@ApiPropertyOptional({ enum: StrollPublicityFlag, example: StrollPublicityFlag.PUBLIC })
	@IsOptional()
	@IsEnum(StrollPublicityFlag)
	publicityFlag?: StrollPublicityFlag;
}
