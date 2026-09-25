import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MediaUploadPurpose } from './dto/create-presigned-upload.dto';
import { MediaAssetEntity, MediaUploadMode, MediaUploadStatus } from './entities/media-asset.entity';
import { MediaService } from './media.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
	getSignedUrl: jest.fn()
}));

jest.mock('@aws-sdk/client-s3', () => {
	class MockS3Command {
		constructor(readonly input: Record<string, unknown>) {}
	}

	return {
		AbortMultipartUploadCommand: MockS3Command,
		CompleteMultipartUploadCommand: MockS3Command,
		CreateMultipartUploadCommand: MockS3Command,
		GetObjectCommand: MockS3Command,
		HeadBucketCommand: MockS3Command,
		PutObjectCommand: MockS3Command,
		S3Client: jest.fn(() => ({ send: jest.fn(), destroy: jest.fn() })),
		UploadPartCommand: MockS3Command
	};
});

jest.mock('@smithy/node-http-handler', () => ({
	NodeHttpHandler: jest.fn(() => ({}))
}));

describe('MediaService', () => {
	let mediaAssetsRepository: {
		create: jest.Mock;
		save: jest.Mock;
		delete: jest.Mock;
		findOne: jest.Mock;
	};
	let strollsRepository: { findOne: jest.Mock };
	let stagesRepository: { findOne: jest.Mock };
	let usersRepository: { findOne: jest.Mock };
	let s3Send: jest.Mock;
	let service: MediaService;
	const signedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

	beforeEach(() => {
		mediaAssetsRepository = {
			create: jest.fn((value) => value),
			save: jest.fn(async (value) => ({ id: 'asset-1', ...value })),
			delete: jest.fn().mockResolvedValue(undefined),
			findOne: jest.fn()
		};
		strollsRepository = { findOne: jest.fn() };
		stagesRepository = { findOne: jest.fn() };
		usersRepository = { findOne: jest.fn() };
		s3Send = jest.fn();
		signedUrl.mockReset();
		signedUrl.mockResolvedValue('https://storage.example.com/upload-url');

		service = new MediaService(
			buildConfigService(),
			mediaAssetsRepository as never,
			strollsRepository as never,
			stagesRepository as never,
			usersRepository as never
		);
		(service as unknown as { s3Client: { destroy?: () => void } }).s3Client.destroy?.();
		(service as unknown as { s3Client: { send: jest.Mock } }).s3Client = { send: s3Send };
	});

	afterEach(() => {
		const client = (service as unknown as { s3Client?: { destroy?: () => void } }).s3Client;
		client?.destroy?.();
	});

	it('rejects unsupported MIME types before creating media assets', async () => {
		await expect(
			service.createPresignedUpload(
				{ fileName: 'payload.svg', contentType: 'image/svg+xml', sizeBytes: 512, purpose: MediaUploadPurpose.STROLL, entityId: 'stroll-1' },
				'user-1'
			)
		).rejects.toThrow(BadRequestException);
		expect(mediaAssetsRepository.save).not.toHaveBeenCalled();
	});

	it('rejects image uploads above the configured size limit', async () => {
		await expect(
			service.createPresignedUpload(
				{ fileName: 'cover.jpg', contentType: 'image/jpeg', sizeBytes: 4_194_305, purpose: MediaUploadPurpose.STROLL, entityId: 'stroll-1' },
				'user-1'
			)
		).rejects.toThrow('Image uploads may not exceed 4194304 bytes.');
		expect(mediaAssetsRepository.save).not.toHaveBeenCalled();
	});

	it('creates a single-part presigned upload for an owned stroll and exposes it through the API media URL', async () => {
		strollsRepository.findOne.mockResolvedValue({ id: 'stroll-1', authorId: 'user-1' });

		const result = await service.createPresignedUpload(
			{ fileName: 'cover image.jpg', contentType: 'image/jpeg', sizeBytes: 1024, purpose: MediaUploadPurpose.STROLL, entityId: 'stroll-1' },
			'user-1'
		);

		expect(strollsRepository.findOne).toHaveBeenCalledWith({ where: { id: 'stroll-1', authorId: 'user-1' } });
		expect(mediaAssetsRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				uploadedByUserId: 'user-1',
				strollId: 'stroll-1',
				stageId: null,
				profileUserId: null,
				contentType: 'image/jpeg',
				sizeBytes: 1024,
				purpose: MediaUploadPurpose.STROLL,
				uploadStatus: MediaUploadStatus.PENDING,
				uploadMode: MediaUploadMode.SINGLE_PART
			})
		);
		const savedAsset = mediaAssetsRepository.create.mock.calls[0][0] as MediaAssetEntity;
		expect(savedAsset.storageKey).toContain('stroll/user-1/stroll-1/');
		expect(savedAsset.storageKey).toContain('cover-image.jpg');
		expect(savedAsset.publicUrl).toMatch(/^https:\/\/api.example.com\/v1\/media\/files\//);
		expect(result).toMatchObject({
			assetId: 'asset-1',
			objectKey: savedAsset.storageKey,
			uploadUrl: 'https://storage.example.com/upload-url',
			publicUrl: savedAsset.publicUrl,
			method: 'PUT',
			expiresInSeconds: 900,
			headers: { 'Content-Type': 'image/jpeg' }
		});
	});

	it("rejects stage uploads when the stage is attached to another user's stroll", async () => {
		stagesRepository.findOne.mockResolvedValue({ id: 'stage-1', strollId: 'stroll-1' });
		strollsRepository.findOne.mockResolvedValue(null);

		await expect(
			service.createPresignedUpload(
				{ fileName: 'stage.jpg', contentType: 'image/jpeg', sizeBytes: 1024, purpose: MediaUploadPurpose.STAGE, entityId: 'stage-1' },
				'user-1'
			)
		).rejects.toThrow(ForbiddenException);
		expect(mediaAssetsRepository.save).not.toHaveBeenCalled();
	});

	it('rejects multipart initiation for files below the configured threshold', async () => {
		await expect(
			service.initiateMultipartUpload(
				{ fileName: 'clip.mp4', contentType: 'video/mp4', sizeBytes: 1024, purpose: MediaUploadPurpose.STAGE, entityId: 'stage-1' },
				'user-1'
			)
		).rejects.toThrow('Use the single-part upload endpoint for files smaller than 10485760 bytes.');
		expect(s3Send).not.toHaveBeenCalled();
	});

	it('sorts multipart parts before completing an owned upload', async () => {
		const asset = buildMultipartAsset();
		mediaAssetsRepository.findOne.mockResolvedValue(asset);
		mediaAssetsRepository.save.mockImplementationOnce(async (value) => value);
		s3Send.mockResolvedValue({});

		const result = await service.completeMultipartUpload(
			{
				assetId: asset.id,
				uploadId: 'upload-1',
				parts: [
					{ partNumber: 2, etag: 'etag-2' },
					{ partNumber: 1, etag: 'etag-1' }
				]
			},
			'user-1'
		);

		const command = s3Send.mock.calls[0][0] as { input: { MultipartUpload: { Parts: Array<{ ETag: string; PartNumber: number }> } } };
		expect(command.input.MultipartUpload.Parts).toEqual([
			{ ETag: 'etag-1', PartNumber: 1 },
			{ ETag: 'etag-2', PartNumber: 2 }
		]);
		expect(asset.uploadStatus).toBe(MediaUploadStatus.UPLOADED);
		expect(asset.multipartUploadId).toBeNull();
		expect(result).toEqual({ message: 'Multipart upload completed successfully.', asset });
	});
});

function buildConfigService(): ConfigService {
	const values: Record<string, string> = {
		S3_BUCKET_NAME: 'strollbar-media-test',
		S3_REGION: 'auto',
		S3_ENDPOINT: 'https://storage.example.com',
		S3_ACCESS_KEY_ID: 'access-key',
		S3_SECRET_ACCESS_KEY: 'secret-key',
		S3_FORCE_PATH_STYLE: 'true',
		MEDIA_PUBLIC_BASE_URL: 'https://api.example.com/v1',
		S3_PRESIGN_EXPIRES_SECONDS: '900',
		MEDIA_ALLOWED_IMAGE_MIME_TYPES: 'image/jpeg,image/png,image/webp',
		MEDIA_ALLOWED_VIDEO_MIME_TYPES: 'video/mp4,video/webm',
		MEDIA_MAX_IMAGE_SIZE_BYTES: '4194304',
		MEDIA_MAX_VIDEO_SIZE_BYTES: '20971520',
		MEDIA_MULTIPART_THRESHOLD_BYTES: '10485760',
		MEDIA_MULTIPART_PART_SIZE_BYTES: '5242880',
		MEDIA_MULTIPART_MAX_PARTS: '1000',
		S3_REQUEST_TIMEOUT_MS: '30000',
		S3_RETRY_ATTEMPTS: '1'
	};

	return { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
}

function buildMultipartAsset(): MediaAssetEntity {
	return {
		id: 'asset-1',
		uploadedByUserId: 'user-1',
		strollId: 'stroll-1',
		stageId: null,
		profileUserId: null,
		storageKey: 'stage/user-1/stage-1/2026/09/25/video.mp4',
		publicUrl: 'https://api.example.com/v1/media/files/encoded-key',
		contentType: 'video/mp4',
		sizeBytes: 15_000_000,
		purpose: MediaUploadPurpose.STAGE,
		uploadStatus: MediaUploadStatus.PENDING,
		uploadMode: MediaUploadMode.MULTIPART,
		multipartUploadId: 'upload-1',
		createdAt: new Date(),
		updatedAt: new Date(),
		setIdIfMissing: jest.fn()
	};
}
