import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class AbortMultipartUploadDto {
  @ApiProperty({ example: 'c91661e0-d73d-473c-a4b3-4752f9d8ca0e' })
  @IsUUID()
  assetId!: string;

  @ApiProperty({ example: 'multipart-upload-id' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  uploadId!: string;
}
