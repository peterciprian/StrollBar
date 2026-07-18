import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsString, IsUUID, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CompletedPartDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  partNumber!: number;

  @ApiProperty({ example: '"etag-value"' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  etag!: string;
}

export class CompleteMultipartUploadDto {
  @ApiProperty({ example: 'c91661e0-d73d-473c-a4b3-4752f9d8ca0e' })
  @IsUUID()
  assetId!: string;

  @ApiProperty({ example: 'multipart-upload-id' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  uploadId!: string;

  @ApiProperty({ type: [CompletedPartDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompletedPartDto)
  parts!: CompletedPartDto[];
}
