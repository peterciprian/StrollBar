import { ApiProperty } from '@nestjs/swagger';
import { MultipartUploadPartDto } from './multipart-upload-part.dto';

export class InitiateMultipartUploadResponseDto {
	@ApiProperty({ example: 'c91661e0-d73d-473c-a4b3-4752f9d8ca0e' })
	assetId!: string;

	@ApiProperty({ example: 'multipart-upload-id' })
	uploadId!: string;

	@ApiProperty({ example: 'stage/f7f3eb6a-711b-49e8-ae60-b7af77fa35c6/2026/07/18/video.mp4' })
	objectKey!: string;

	@ApiProperty({ example: 'https://api.example.com/v1/media/files/c3RhZ2UvdmlkZW8ubXA0' })
	publicUrl!: string;

	@ApiProperty({ example: 10485760 })
	partSizeBytes!: number;

	@ApiProperty({ example: 6 })
	partCount!: number;

	@ApiProperty({ type: [MultipartUploadPartDto] })
	parts!: MultipartUploadPartDto[];

	@ApiProperty({ example: 900 })
	expiresInSeconds!: number;
}
