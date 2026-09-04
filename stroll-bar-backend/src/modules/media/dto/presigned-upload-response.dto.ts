import { ApiProperty } from '@nestjs/swagger';

class UploadHeadersDto {
	@ApiProperty({ example: 'image/jpeg' })
	'Content-Type'!: string;
}

export class PresignedUploadResponseDto {
	@ApiProperty({ example: 'c91661e0-d73d-473c-a4b3-4752f9d8ca0e' })
	assetId!: string;

	@ApiProperty({ example: 'stroll/f7f3eb6a-711b-49e8-ae60-b7af77fa35c6/2026/07/18/3d7cc2cf-cover.jpg' })
	objectKey!: string;

	@ApiProperty({ example: 'https://storage.example.com/presigned-upload-url' })
	uploadUrl!: string;

	@ApiProperty({ example: 'https://api.example.com/v1/media/files/c3Ryb2xsL2ZpbGUuanBn' })
	publicUrl!: string;

	@ApiProperty({ example: 'PUT' })
	method!: 'PUT';

	@ApiProperty({ example: 900 })
	expiresInSeconds!: number;

	@ApiProperty({ type: UploadHeadersDto })
	headers!: UploadHeadersDto;
}
