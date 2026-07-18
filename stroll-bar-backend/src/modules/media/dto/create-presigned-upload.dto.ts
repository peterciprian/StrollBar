import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export enum MediaUploadPurpose {
  STROLL = 'stroll',
  STAGE = 'stage',
  PROFILE = 'profile',
}

export class CreatePresignedUploadDto {
  @ApiProperty({ example: 'cover.jpg', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  contentType!: string;

  @ApiProperty({ example: 5242880, minimum: 1, description: 'Expected file size in bytes.' })
  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @ApiProperty({ enum: MediaUploadPurpose, example: MediaUploadPurpose.STROLL })
  @IsEnum(MediaUploadPurpose)
  purpose!: MediaUploadPurpose;

  @ApiPropertyOptional({ example: '0e86308f-78cd-4929-a7d8-9db9c3307ee6' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  entityId?: string;
}
