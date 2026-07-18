import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AbortMultipartUploadDto } from './dto/abort-multipart-upload.dto';
import { CompleteMultipartUploadDto } from './dto/complete-multipart-upload.dto';
import { CreatePresignedUploadDto } from './dto/create-presigned-upload.dto';
import { InitiateMultipartUploadResponseDto } from './dto/initiate-multipart-upload-response.dto';
import { MultipartUploadStatusResponseDto } from './dto/multipart-upload-status-response.dto';
import { PresignedUploadResponseDto } from './dto/presigned-upload-response.dto';
import { MediaService } from './media.service';

@ApiTags('Media')
@ApiBearerAuth('bearer')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({ summary: 'Create a presigned upload URL for S3-compatible object storage' })
  @ApiCreatedResponse({ type: PresignedUploadResponseDto, description: 'Presigned upload URL created successfully.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Unsupported content type or invalid request.' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Referenced target entity is not accessible.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Referenced stage or profile user was not found.' })
  @UseGuards(JwtAuthGuard)
  @Post('presign-upload')
  createPresignedUpload(@Body() dto: CreatePresignedUploadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.createPresignedUpload(dto, user.userId);
  }

  @ApiOperation({ summary: 'Initiate a multipart upload for large media files' })
  @ApiCreatedResponse({
    type: InitiateMultipartUploadResponseDto,
    description: 'Multipart upload initiated and signed part URLs created.',
  })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Unsupported content type, invalid size, or file too small for multipart.' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Referenced target entity is not accessible.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Referenced stage or profile user was not found.' })
  @UseGuards(JwtAuthGuard)
  @Post('multipart/initiate')
  initiateMultipartUpload(@Body() dto: CreatePresignedUploadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.initiateMultipartUpload(dto, user.userId);
  }

  @ApiOperation({ summary: 'Complete a multipart upload after all parts are uploaded' })
  @ApiCreatedResponse({ type: MultipartUploadStatusResponseDto, description: 'Multipart upload completed successfully.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Multipart payload is invalid.' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'The media asset is not owned by the current user.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Media asset not found.' })
  @UseGuards(JwtAuthGuard)
  @Post('multipart/complete')
  completeMultipartUpload(@Body() dto: CompleteMultipartUploadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.completeMultipartUpload(dto, user.userId);
  }

  @ApiOperation({ summary: 'Abort an in-progress multipart upload' })
  @ApiCreatedResponse({ type: MultipartUploadStatusResponseDto, description: 'Multipart upload aborted successfully.' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Multipart payload is invalid.' })
  @ApiForbiddenResponse({ type: ErrorResponseDto, description: 'The media asset is not owned by the current user.' })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Media asset not found.' })
  @UseGuards(JwtAuthGuard)
  @Post('multipart/abort')
  abortMultipartUpload(@Body() dto: AbortMultipartUploadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.mediaService.abortMultipartUpload(dto, user.userId);
  }
}
