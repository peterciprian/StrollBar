import { BadRequestException, ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MediaUploadPurpose } from './dto/create-presigned-upload.dto';
import { MediaAssetEntity, MediaUploadMode, MediaUploadStatus } from './entities/media-asset.entity';
import { MediaService } from './media.service';
import { ACTIVE_ADVENTURE_STATUSES } from '../adventures/adventures.service';
import { AdventureProgressStatus } from '../adventures/entities/adventure.entity';
import { StrollActiveStatus, StrollPublicityFlag } from '../strolls/entities/stroll.entity';
import { UserRole } from '../users/entities/user.entity';

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
	let adventuresRepository: { findOne: jest.Mock };
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
		adventuresRepository = { findOne: jest.fn() };
		s3Send = jest.fn();
		signedUrl.mockReset();
		signedUrl.mockResolvedValue('https://storage.example.com/upload-url');

		service = new MediaService(
			buildConfigService(),
			mediaAssetsRepository as never,
			strollsRepository as never,
			stagesRepository as never,
			usersRepository as never,
			adventuresRepository as never
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

	describe('download authorization', () => {
		const viewer = { userId: 'viewer', role: UserRole.SIMPLE, email: 'viewer@example.com', username: 'viewer' };
		const key = 'stage/owner/private-object.jpg';
		const encodedKey = Buffer.from(key).toString('base64url');
		let asset: MediaAssetEntity;
		let stroll: {
			id: string;
			authorId: string;
			activeStatus: StrollActiveStatus;
			publicityFlag: StrollPublicityFlag;
			mediaUrls: { imageUrls: string[]; videoUrls: string[] };
		};

		beforeEach(() => {
			asset = Object.assign(buildMultipartAsset(), {
				storageKey: key, purpose: MediaUploadPurpose.STAGE,
				stageId: 'stage-1', uploadStatus: MediaUploadStatus.UPLOADED
			});
			stroll = {
				id: 'stroll-1', authorId: 'owner', activeStatus: StrollActiveStatus.PUBLISHED,
				publicityFlag: StrollPublicityFlag.PRIVATE, mediaUrls: { imageUrls: [], videoUrls: [] }
			};
			mediaAssetsRepository.findOne.mockImplementation(async () => asset);
			strollsRepository.findOne.mockImplementation(async () => stroll);
			stagesRepository.findOne.mockResolvedValue({ id: 'stage-1' });
		});

		it.each([undefined, viewer])('denies protected media without current entitlement (%j)', async (user) => {
			await expect(service.createPresignedDownloadRedirect(encodedKey, user)).rejects.toThrow(ForbiddenException);
			expect(signedUrl).not.toHaveBeenCalled();
		});

		it.each(ACTIVE_ADVENTURE_STATUSES)('uses SEC-02 entitlement for %s and rechecks after revocation', async (status) => {
			let progressStatus: AdventureProgressStatus = status;
			adventuresRepository.findOne.mockImplementation(async ({ where }) => {
				expect(where).toMatchObject({ strollId: stroll.id, ownerUserId: viewer.userId });
				expect(where.progressStatus.value).toEqual(ACTIVE_ADVENTURE_STATUSES);
				return where.progressStatus.value.includes(progressStatus) ? { id: 'purchase' } : null;
			});
			await expect(service.createPresignedDownloadRedirect(encodedKey, viewer)).resolves.toEqual({
				url: 'https://storage.example.com/upload-url', statusCode: 302
			});
			expect(signedUrl).toHaveBeenCalledWith(
				expect.anything(), expect.objectContaining({ input: { Bucket: 'strollbar-media-test', Key: key } }), { expiresIn: 900 }
			);
			progressStatus = AdventureProgressStatus.REVOKED;
			await expect(service.createPresignedDownloadRedirect(encodedKey, viewer)).rejects.toThrow(ForbiddenException);
			expect(signedUrl).toHaveBeenCalledTimes(1);
		});

		it.each([StrollActiveStatus.DRAFT, StrollActiveStatus.ARCHIVED, StrollActiveStatus.SUSPENDED])(
			'rejects an entitled viewer after the parent becomes %s', async (status) => {
				adventuresRepository.findOne.mockResolvedValue({ id: 'purchase' });
				await service.createPresignedDownloadRedirect(encodedKey, viewer);
				stroll.activeStatus = status;
				await expect(service.createPresignedDownloadRedirect(encodedKey, viewer)).rejects.toThrow(ForbiddenException);
				expect(signedUrl).toHaveBeenCalledTimes(1);
			}
		);

		it.each([{ ...viewer, userId: 'owner' }, { ...viewer, role: UserRole.ADMIN }])(
			'allows owner/admin support access to existing restricted media (%j)', async (user) => {
				stroll.activeStatus = StrollActiveStatus.SUSPENDED;
				await expect(service.createPresignedDownloadRedirect(encodedKey, user)).resolves.toHaveProperty('statusCode', 302);
				expect(adventuresRepository.findOne).not.toHaveBeenCalled();
			}
		);

		it.each([MediaUploadPurpose.STROLL, MediaUploadPurpose.STAGE])('allows published public %s media anonymously', async (purpose) => {
			asset.purpose = purpose;
			asset.stageId = purpose === MediaUploadPurpose.STAGE ? 'stage-1' : null;
			stroll.publicityFlag = StrollPublicityFlag.PUBLIC;
			await service.createPresignedDownloadRedirect(encodedKey);
			stroll.publicityFlag = StrollPublicityFlag.PRIVATE;
			await expect(service.createPresignedDownloadRedirect(encodedKey)).rejects.toThrow(ForbiddenException);
			expect(signedUrl).toHaveBeenCalledTimes(1);
		});

		it('keeps only the current first-image preview of a published private stroll public', async () => {
			asset.purpose = MediaUploadPurpose.STROLL;
			asset.stageId = null;
			asset.contentType = 'image/jpeg';
			stroll.mediaUrls.imageUrls = [asset.publicUrl];
			await service.createPresignedDownloadRedirect(encodedKey);
			stroll.mediaUrls.imageUrls.unshift('https://api.example.com/different-cover');
			await expect(service.createPresignedDownloadRedirect(encodedKey)).rejects.toThrow(ForbiddenException);
			expect(signedUrl).toHaveBeenCalledTimes(1);
		});

		it.each(['video', 'stage', 'unlisted', 'draft'])('does not make %s media public via the preview policy', async (kind) => {
			asset.purpose = MediaUploadPurpose.STROLL;
			asset.stageId = null;
			asset.contentType = 'image/jpeg';
			stroll.mediaUrls.imageUrls = [asset.publicUrl];
			if (kind === 'video') asset.contentType = 'video/mp4';
			if (kind === 'stage') { asset.purpose = MediaUploadPurpose.STAGE; asset.stageId = 'stage-1'; }
			if (kind === 'unlisted') stroll.publicityFlag = StrollPublicityFlag.UNLISTED;
			if (kind === 'draft') stroll.activeStatus = StrollActiveStatus.DRAFT;
			await expect(service.createPresignedDownloadRedirect(encodedKey)).rejects.toThrow(ForbiddenException);
			expect(signedUrl).not.toHaveBeenCalled();
		});

		it('allows entitled unlisted media without treating it as public', async () => {
			stroll.publicityFlag = StrollPublicityFlag.UNLISTED;
			adventuresRepository.findOne.mockResolvedValue({ id: 'purchase' });
			await service.createPresignedDownloadRedirect(encodedKey, viewer);
			await expect(service.createPresignedDownloadRedirect(encodedKey)).rejects.toThrow(ForbiddenException);
			expect(signedUrl).toHaveBeenCalledTimes(1);
		});

		it('makes profile-purpose media public only while the profile exists and is active', async () => {
			asset.purpose = MediaUploadPurpose.PROFILE;
			asset.strollId = null;
			asset.stageId = null;
			asset.profileUserId = 'profile-1';
			usersRepository.findOne.mockResolvedValueOnce({ id: 'profile-1' }).mockResolvedValue(null);
			await service.createPresignedDownloadRedirect(encodedKey);
			expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { id: 'profile-1', isActive: true }, select: { id: true } });
			await expect(service.createPresignedDownloadRedirect(encodedKey)).rejects.toThrow(NotFoundException);
			expect(signedUrl).toHaveBeenCalledTimes(1);
		});

		it.each([MediaUploadStatus.ABORTED, MediaUploadStatus.FAILED, MediaUploadStatus.PENDING, 'unknown'])(
			'rejects unavailable multipart media (%s) before signing', async (status) => {
				asset.uploadStatus = status as MediaUploadStatus;
				await expect(service.createPresignedDownloadRedirect(encodedKey, { ...viewer, role: UserRole.ADMIN }))
					.rejects.toThrow('Media asset not found.');
				expect(signedUrl).not.toHaveBeenCalled();
			}
		);

		it('preserves pending single-part downloads after authorization', async () => {
			asset.uploadMode = MediaUploadMode.SINGLE_PART;
			asset.uploadStatus = MediaUploadStatus.PENDING;
			stroll.publicityFlag = StrollPublicityFlag.PUBLIC;
			await expect(service.createPresignedDownloadRedirect(encodedKey)).resolves.toHaveProperty('statusCode', 302);
		});

		it.each(['unknown asset', 'deleted stroll', 'deleted stage', 'wrong stage parent', 'missing stroll link', 'unknown purpose', 'mixed links'])(
			'rejects %s without disclosing keys even to administrators', async (kind) => {
				if (kind === 'unknown asset') mediaAssetsRepository.findOne.mockResolvedValue(null);
				if (kind === 'deleted stroll') strollsRepository.findOne.mockResolvedValue(null);
				if (kind === 'deleted stage' || kind === 'wrong stage parent') {
					stagesRepository.findOne.mockResolvedValue(null);
				}
				if (kind === 'missing stroll link') asset.strollId = null;
				if (kind === 'unknown purpose') asset.purpose = 'unknown' as MediaUploadPurpose;
				if (kind === 'mixed links') asset.profileUserId = 'profile-1';
				await expect(service.createPresignedDownloadRedirect(encodedKey, { ...viewer, role: UserRole.ADMIN }))
					.rejects.toThrow('Media asset not found.');
				if (kind === 'wrong stage parent') {
					expect(stagesRepository.findOne).toHaveBeenCalledWith({
						where: { id: 'stage-1', strollId: 'stroll-1' }, select: { id: true }
					});
				}
				expect(signedUrl).not.toHaveBeenCalled();
			}
		);

		it('returns safe malformed-key and signer errors', async () => {
			await expect(service.createPresignedDownloadRedirect('!!!')).rejects.toThrow('Invalid media key.');
			stroll.publicityFlag = StrollPublicityFlag.PUBLIC;
			signedUrl.mockRejectedValueOnce(new Error(`Storage failed for ${key}`));
			await expect(service.createPresignedDownloadRedirect(encodedKey)).rejects.toThrow(ServiceUnavailableException);
			await expect(service.createPresignedDownloadRedirect(encodedKey)).resolves.toHaveProperty('statusCode', 302);
		});
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
