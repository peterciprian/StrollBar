import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaUploadPurpose } from './create-presigned-upload.dto';
import { MediaUploadMode, MediaUploadStatus } from '../entities/media-asset.entity';

export class MediaAssetResponseDto {
  @ApiProperty({ example: 'c91661e0-d73d-473c-a4b3-4752f9d8ca0e' })
  id!: string;

  @ApiProperty({ example: 'f7f3eb6a-711b-49e8-ae60-b7af77fa35c6' })
  uploadedByUserId!: string;

  @ApiPropertyOptional({ example: '0e86308f-78cd-4929-a7d8-9db9c3307ee6', nullable: true })
  strollId?: string | null;

  @ApiPropertyOptional({ example: '53fd478b-8cc2-4d1c-91ca-9f69ea9d5037', nullable: true })
  stageId?: string | null;

  @ApiPropertyOptional({ example: 'f7f3eb6a-711b-49e8-ae60-b7af77fa35c6', nullable: true })
  profileUserId?: string | null;

  @ApiProperty({ example: 'stroll/f7f3eb6a-711b-49e8-ae60-b7af77fa35c6/2026/07/18/uuid-cover.jpg' })
  storageKey!: string;

  @ApiProperty({ example: 'https://cdn.example.com/stroll/f7f3eb6a-711b-49e8-ae60-b7af77fa35c6/2026/07/18/uuid-cover.jpg' })
  publicUrl!: string;

  @ApiProperty({ example: 'image/jpeg' })
  contentType!: string;

  @ApiProperty({ example: 5242880 })
  sizeBytes!: number;

  @ApiProperty({ enum: MediaUploadPurpose, example: MediaUploadPurpose.STROLL })
  purpose!: MediaUploadPurpose;

  @ApiProperty({ enum: MediaUploadStatus, example: MediaUploadStatus.PENDING })
  uploadStatus!: MediaUploadStatus;

  @ApiProperty({ enum: MediaUploadMode, example: MediaUploadMode.SINGLE_PART })
  uploadMode!: MediaUploadMode;

  @ApiPropertyOptional({ example: 'multipart-upload-id', nullable: true })
  multipartUploadId?: string | null;

  @ApiProperty({ example: '2026-07-18T16:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-07-18T16:05:00.000Z' })
  updatedAt!: string;
}
