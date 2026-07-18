import { ApiProperty } from '@nestjs/swagger';
import { MediaAssetResponseDto } from './media-asset-response.dto';

export class MultipartUploadStatusResponseDto {
  @ApiProperty({ example: 'Multipart upload completed successfully.' })
  message!: string;

  @ApiProperty({ type: MediaAssetResponseDto })
  asset!: MediaAssetResponseDto;
}
