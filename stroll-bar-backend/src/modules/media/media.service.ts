import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { Repository } from 'typeorm';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollEntity } from '../strolls/entities/stroll.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreatePresignedUploadDto } from './dto/create-presigned-upload.dto';
import { AbortMultipartUploadDto } from './dto/abort-multipart-upload.dto';
import { CompleteMultipartUploadDto } from './dto/complete-multipart-upload.dto';
import { MediaAssetEntity, MediaUploadMode, MediaUploadStatus } from './entities/media-asset.entity';

@Injectable()
export class MediaService {
  private readonly bucketName: string;
  private readonly publicBaseUrl: string;
  private readonly uploadExpirySeconds: number;
  private readonly allowedImageMimeTypes: string[];
  private readonly allowedVideoMimeTypes: string[];
  private readonly maxImageSizeBytes: number;
  private readonly maxVideoSizeBytes: number;
  private readonly multipartThresholdBytes: number;
  private readonly multipartPartSizeBytes: number;
  private readonly multipartMaxParts: number;
  private readonly s3Client: S3Client;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(MediaAssetEntity)
    private readonly mediaAssetsRepository: Repository<MediaAssetEntity>,
    @InjectRepository(StrollEntity)
    private readonly strollsRepository: Repository<StrollEntity>,
    @InjectRepository(StageEntity)
    private readonly stagesRepository: Repository<StageEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {
    this.bucketName = this.requireConfig('S3_BUCKET_NAME');
    this.publicBaseUrl = this.requireConfig('S3_PUBLIC_BASE_URL');
    this.uploadExpirySeconds = Number(this.configService.get<string>('S3_PRESIGN_EXPIRES_SECONDS') ?? '900');
    this.allowedImageMimeTypes = this.readMimeList(
      'MEDIA_ALLOWED_IMAGE_MIME_TYPES',
      'image/jpeg,image/png,image/webp,image/gif',
    );
    this.allowedVideoMimeTypes = this.readMimeList(
      'MEDIA_ALLOWED_VIDEO_MIME_TYPES',
      'video/mp4,video/webm,video/quicktime',
    );
    this.maxImageSizeBytes = Number(this.configService.get<string>('MEDIA_MAX_IMAGE_SIZE_BYTES') ?? '10485760');
    this.maxVideoSizeBytes = Number(this.configService.get<string>('MEDIA_MAX_VIDEO_SIZE_BYTES') ?? '104857600');
    this.multipartThresholdBytes = Number(this.configService.get<string>('MEDIA_MULTIPART_THRESHOLD_BYTES') ?? '26214400');
    this.multipartPartSizeBytes = Number(this.configService.get<string>('MEDIA_MULTIPART_PART_SIZE_BYTES') ?? '10485760');
    this.multipartMaxParts = Number(this.configService.get<string>('MEDIA_MULTIPART_MAX_PARTS') ?? '1000');

    this.s3Client = new S3Client({
      region: this.requireConfig('S3_REGION'),
      endpoint: this.configService.get<string>('S3_ENDPOINT'),
      forcePathStyle: (this.configService.get<string>('S3_FORCE_PATH_STYLE') ?? 'false').toLowerCase() === 'true',
      credentials: {
        accessKeyId: this.requireConfig('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.requireConfig('S3_SECRET_ACCESS_KEY'),
      },
    });
  }

  async createPresignedUpload(dto: CreatePresignedUploadDto, userId: string) {
    this.assertUploadPolicy(dto.contentType, dto.sizeBytes);

    const links = await this.resolveLinks(dto, userId);
    const objectKey = this.buildObjectKey(dto, userId);
    const publicUrl = `${this.publicBaseUrl.replace(/\/$/, '')}/${objectKey}`;
    const asset = await this.mediaAssetsRepository.save(
      this.mediaAssetsRepository.create({
        uploadedByUserId: userId,
        strollId: links.strollId,
        stageId: links.stageId,
        profileUserId: links.profileUserId,
        storageKey: objectKey,
        publicUrl,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        purpose: dto.purpose,
        uploadStatus: MediaUploadStatus.PENDING,
        uploadMode: MediaUploadMode.SINGLE_PART,
      }),
    );

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: this.uploadExpirySeconds,
    });

    return {
      assetId: asset.id,
      objectKey,
      uploadUrl,
      publicUrl,
      method: 'PUT' as const,
      expiresInSeconds: this.uploadExpirySeconds,
      headers: {
        'Content-Type': dto.contentType,
      },
    };
  }

  async initiateMultipartUpload(dto: CreatePresignedUploadDto, userId: string) {
    this.assertUploadPolicy(dto.contentType, dto.sizeBytes);

    if (dto.sizeBytes < this.multipartThresholdBytes) {
      throw new BadRequestException(
        `Use the single-part upload endpoint for files smaller than ${this.multipartThresholdBytes} bytes.`,
      );
    }

    const partCount = Math.ceil(dto.sizeBytes / this.multipartPartSizeBytes);

    if (partCount > this.multipartMaxParts) {
      throw new BadRequestException(
        `Multipart uploads may not exceed ${this.multipartMaxParts} parts with the current part size.`,
      );
    }

    const links = await this.resolveLinks(dto, userId);
    const objectKey = this.buildObjectKey(dto, userId);
    const publicUrl = `${this.publicBaseUrl.replace(/\/$/, '')}/${objectKey}`;

    const multipartUpload = await this.s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: objectKey,
        ContentType: dto.contentType,
      }),
    );

    if (!multipartUpload.UploadId) {
      throw new Error('Failed to initialize multipart upload.');
    }

    const asset = await this.mediaAssetsRepository.save(
      this.mediaAssetsRepository.create({
        uploadedByUserId: userId,
        strollId: links.strollId,
        stageId: links.stageId,
        profileUserId: links.profileUserId,
        storageKey: objectKey,
        publicUrl,
        contentType: dto.contentType,
        sizeBytes: dto.sizeBytes,
        purpose: dto.purpose,
        uploadStatus: MediaUploadStatus.PENDING,
        uploadMode: MediaUploadMode.MULTIPART,
        multipartUploadId: multipartUpload.UploadId,
      }),
    );

    const parts = await Promise.all(
      Array.from({ length: partCount }, async (_value, index) => {
        const partNumber = index + 1;
        const uploadUrl = await getSignedUrl(
          this.s3Client,
          new UploadPartCommand({
            Bucket: this.bucketName,
            Key: objectKey,
            UploadId: multipartUpload.UploadId,
            PartNumber: partNumber,
          }),
          { expiresIn: this.uploadExpirySeconds },
        );

        return { partNumber, uploadUrl };
      }),
    );

    return {
      assetId: asset.id,
      uploadId: multipartUpload.UploadId,
      objectKey,
      publicUrl,
      partSizeBytes: this.multipartPartSizeBytes,
      partCount,
      parts,
      expiresInSeconds: this.uploadExpirySeconds,
    };
  }

  async completeMultipartUpload(dto: CompleteMultipartUploadDto, userId: string) {
    const asset = await this.getOwnedMediaAssetOrThrow(dto.assetId, userId, MediaUploadMode.MULTIPART);

    if (asset.multipartUploadId !== dto.uploadId) {
      throw new BadRequestException('Multipart upload id does not match the persisted media asset.');
    }

    await this.s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: asset.storageKey,
        UploadId: dto.uploadId,
        MultipartUpload: {
          Parts: dto.parts
            .map((part) => ({ ETag: part.etag, PartNumber: part.partNumber }))
            .sort((left, right) => left.PartNumber - right.PartNumber),
        },
      }),
    );

    asset.uploadStatus = MediaUploadStatus.UPLOADED;
    asset.multipartUploadId = null;
    const savedAsset = await this.mediaAssetsRepository.save(asset);

    return {
      message: 'Multipart upload completed successfully.',
      asset: savedAsset,
    };
  }

  async abortMultipartUpload(dto: AbortMultipartUploadDto, userId: string) {
    const asset = await this.getOwnedMediaAssetOrThrow(dto.assetId, userId, MediaUploadMode.MULTIPART);

    if (asset.multipartUploadId !== dto.uploadId) {
      throw new BadRequestException('Multipart upload id does not match the persisted media asset.');
    }

    await this.s3Client.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: asset.storageKey,
        UploadId: dto.uploadId,
      }),
    );

    asset.uploadStatus = MediaUploadStatus.ABORTED;
    asset.multipartUploadId = null;
    const savedAsset = await this.mediaAssetsRepository.save(asset);

    return {
      message: 'Multipart upload aborted successfully.',
      asset: savedAsset,
    };
  }

  async checkStorageConnectivity() {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      return {
        status: 'up' as const,
        provider: 's3-compatible',
        detail: `Bucket ${this.bucketName} is reachable.`,
      };
    } catch (error) {
      return {
        status: 'down' as const,
        provider: 's3-compatible',
        detail: error instanceof Error ? error.message : 'S3 connectivity failed.',
      };
    }
  }

  private buildObjectKey(dto: CreatePresignedUploadDto, userId: string): string {
    const timestamp = new Date();
    const safeFileName = basename(dto.fileName).replace(/[^a-zA-Z0-9._-]/g, '-');
    const entitySegment = dto.entityId ? `${dto.entityId}/` : '';

    return `${dto.purpose}/${userId}/${entitySegment}${timestamp.getUTCFullYear()}/${String(timestamp.getUTCMonth() + 1).padStart(2, '0')}/${String(timestamp.getUTCDate()).padStart(2, '0')}/${randomUUID()}-${safeFileName}`;
  }

  private assertUploadPolicy(contentType: string, sizeBytes: number): void {
    if (contentType.startsWith('image/')) {
      if (!this.allowedImageMimeTypes.includes(contentType)) {
        throw new BadRequestException(`Unsupported image content type: ${contentType}.`);
      }

      if (sizeBytes > this.maxImageSizeBytes) {
        throw new BadRequestException(
          `Image uploads may not exceed ${this.maxImageSizeBytes} bytes.`,
        );
      }

      return;
    }

    if (contentType.startsWith('video/')) {
      if (!this.allowedVideoMimeTypes.includes(contentType)) {
        throw new BadRequestException(`Unsupported video content type: ${contentType}.`);
      }

      if (sizeBytes > this.maxVideoSizeBytes) {
        throw new BadRequestException(
          `Video uploads may not exceed ${this.maxVideoSizeBytes} bytes.`,
        );
      }

      return;
    }

    throw new BadRequestException('Only configured image/* and video/* content types are supported.');
  }

  private readMimeList(key: string, fallback: string): string[] {
    return (this.configService.get<string>(key) ?? fallback)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`${key} must be configured for the media module.`);
    }

    return value;
  }

  private async resolveLinks(dto: CreatePresignedUploadDto, userId: string): Promise<{
    strollId: string | null;
    stageId: string | null;
    profileUserId: string | null;
  }> {
    switch (dto.purpose) {
      case 'stroll': {
        if (!dto.entityId) {
          throw new BadRequestException('entityId is required for stroll media uploads.');
        }

        const stroll = await this.strollsRepository.findOne({ where: { id: dto.entityId, authorId: userId } });

        if (!stroll) {
          throw new ForbiddenException('The referenced stroll does not exist or is not owned by the current user.');
        }

        return { strollId: stroll.id, stageId: null, profileUserId: null };
      }
      case 'stage': {
        if (!dto.entityId) {
          throw new BadRequestException('entityId is required for stage media uploads.');
        }

        const [stage, stroll] = await Promise.all([
          this.stagesRepository.findOne({ where: { id: dto.entityId } }),
          null // Placeholder; we'll load stroll only if stage exists
        ]);

        if (!stage) {
          throw new NotFoundException('The referenced stage does not exist.');
        }

        const strollOwned = await this.strollsRepository.findOne({ where: { id: stage.strollId, authorId: userId } });

        if (!strollOwned) {
          throw new ForbiddenException('The referenced stage is not attached to a stroll owned by the current user.');
        }

        return { strollId: strollOwned.id, stageId: stage.id, profileUserId: null };
      }
      case 'profile': {
        const targetUserId = dto.entityId ?? userId;

        if (targetUserId !== userId) {
          throw new ForbiddenException('You may only upload media for your own profile.');
        }

        return { strollId: null, stageId: null, profileUserId: targetUserId };
      }
      default:
        throw new BadRequestException('Unsupported media upload purpose.');
    }
  }

  private async getOwnedMediaAssetOrThrow(assetId: string, userId: string, uploadMode: MediaUploadMode): Promise<MediaAssetEntity> {
    const asset = await this.mediaAssetsRepository.findOne({ where: { id: assetId } });

    if (!asset) {
      throw new NotFoundException(`Media asset ${assetId} was not found.`);
    }

    if (asset.uploadedByUserId !== userId) {
      throw new ForbiddenException('You are not allowed to access this media asset.');
    }

    if (asset.uploadMode !== uploadMode) {
      throw new BadRequestException(`Media asset ${assetId} is not a ${uploadMode} upload.`);
    }

    return asset;
  }
}
