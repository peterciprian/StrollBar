import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StrollActiveStatus, StrollPublicityFlag } from '../entities/stroll.entity';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class CreateStrollDto {
  @ApiProperty({ example: 'Budapest Highlights', minLength: 3, maxLength: 150 })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'A short guided route through the city center.', minLength: 10 })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiPropertyOptional({ example: 'Curated by locals.' })
  @IsOptional()
  @IsString()
  proposerText?: string;

  @ApiPropertyOptional({ example: ['city', 'architecture'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

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

  @ApiPropertyOptional({ enum: StrollActiveStatus, example: StrollActiveStatus.DRAFT })
  @IsOptional()
  @IsEnum(StrollActiveStatus)
  activeStatus?: StrollActiveStatus;

  @ApiPropertyOptional({ enum: StrollPublicityFlag, example: StrollPublicityFlag.PRIVATE })
  @IsOptional()
  @IsEnum(StrollPublicityFlag)
  publicityFlag?: StrollPublicityFlag;
}
