import { ApiProperty } from '@nestjs/swagger';

export class MultipartUploadPartDto {
  @ApiProperty({ example: 1 })
  partNumber!: number;

  @ApiProperty({ example: 'https://storage.example.com/upload-part-url' })
  uploadUrl!: string;
}
