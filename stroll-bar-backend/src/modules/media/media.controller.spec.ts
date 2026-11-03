import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import request from 'supertest';
import { StructuredExceptionFilter } from '../../common/filters/structured-exception.filter';
import { ACTIVE_ADVENTURE_STATUSES } from '../adventures/adventures.service';
import { AdventureEntity, AdventureProgressStatus } from '../adventures/entities/adventure.entity';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { StageEntity } from '../stages/entities/stage.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from '../strolls/entities/stroll.entity';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { MediaUploadPurpose } from './dto/create-presigned-upload.dto';
import { MediaAssetEntity, MediaUploadMode, MediaUploadStatus } from './entities/media-asset.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }));

describe('MediaController download API', () => {
	let app: INestApplication;
	let asset: MediaAssetEntity | null;
	let stroll: StrollEntity | null;
	let stage: StageEntity | null;
	let profile: UserEntity | null;
	let progressStatus: AdventureProgressStatus | null;
	const secret = 'media-controller-test-secret';
	const jwt = new JwtService({ secret });
	const objectKey = 'stage/owner/retained-private-object.jpg';
	const encodedKey = Buffer.from(objectKey).toString('base64url');
	const path = `/media/files/${encodedKey}`;
	const signedDownload = 'https://storage.example.com/temporary-download';
	const signer = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;
	const adventuresRepository = { findOne: jest.fn() };
	const viewer = { id: 'viewer', role: UserRole.SIMPLE, email: 'viewer@example.com', username: 'viewer', authVersion: 0 };
	const tokenFor = (id: string, options = {}) => jwt.sign({ sub: id, authVersion: 0 }, options);

	beforeAll(async () => {
		const config = new ConfigService({
			JWT_SECRET: secret,
			S3_BUCKET_NAME: 'media-test',
			S3_REGION: 'auto',
			S3_ACCESS_KEY_ID: 'test-key',
			S3_SECRET_ACCESS_KEY: 'test-secret',
			MEDIA_PUBLIC_BASE_URL: 'https://api.example.com/v1'
		});
		const moduleRef = await Test.createTestingModule({
			imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
			controllers: [MediaController],
			providers: [
				MediaService, JwtStrategy, OptionalJwtAuthGuard, JwtAuthGuard,
				{ provide: ConfigService, useValue: config },
				{ provide: getRepositoryToken(MediaAssetEntity), useValue: { findOne: jest.fn(async () => asset) } },
				{ provide: getRepositoryToken(StrollEntity), useValue: { findOne: jest.fn(async () => stroll) } },
				{ provide: getRepositoryToken(StageEntity), useValue: { findOne: jest.fn(async () => stage) } },
				{ provide: getRepositoryToken(AdventureEntity), useValue: adventuresRepository },
				{
					provide: getRepositoryToken(UserEntity),
					useValue: {
						findOne: jest.fn(async ({ where }) => {
							if (where.id === 'profile') return profile;
							if (where.id === 'viewer') return viewer;
							if (where.id === 'owner') return { ...viewer, id: 'owner' };
							if (where.id === 'admin') return { ...viewer, id: 'admin', role: UserRole.ADMIN };
							return null;
						})
					}
				}
			]
		}).compile();
		app = moduleRef.createNestApplication({ logger: false });
		app.useGlobalFilters(new StructuredExceptionFilter());
		await app.init();
	});

	afterAll(async () => {
		await app?.close();
	});

	beforeEach(() => {
		asset = Object.assign(new MediaAssetEntity(), {
			id: 'asset-1', uploadedByUserId: 'owner', strollId: 'stroll-1', stageId: 'stage-1',
			profileUserId: null, purpose: MediaUploadPurpose.STAGE, storageKey: objectKey,
			publicUrl: `https://api.example.com/v1${path}`, contentType: 'image/jpeg',
			uploadStatus: MediaUploadStatus.UPLOADED, uploadMode: MediaUploadMode.MULTIPART
		});
		stroll = Object.assign(new StrollEntity(), {
			id: 'stroll-1', authorId: 'owner', activeStatus: StrollActiveStatus.PUBLISHED,
			publicityFlag: StrollPublicityFlag.PRIVATE, mediaUrls: { imageUrls: [], videoUrls: [] }
		});
		stage = Object.assign(new StageEntity(), { id: 'stage-1', strollId: 'stroll-1' });
		profile = Object.assign(new UserEntity(), { id: 'profile', isActive: true });
		progressStatus = null;
		signer.mockReset().mockResolvedValue(signedDownload);
		adventuresRepository.findOne.mockReset().mockImplementation(async ({ where }) => {
			expect(where.progressStatus.value).toEqual(ACTIVE_ADVENTURE_STATUSES);
			return where.progressStatus.value.includes(progressStatus) ? { id: 'purchase' } : null;
		});
	});

	async function expectSafeFailure(status: number, token?: string) {
		const call = request(app.getHttpServer()).get(path);
		if (token) call.set('Authorization', `Bearer ${token}`);
		const response = await call.expect(status);
		expect(response.headers.location).toBeUndefined();
		expect(JSON.stringify(response.body)).not.toContain(objectKey);
		expect(JSON.stringify(response.body)).not.toContain(encodedKey);
		return response;
	}

	it.each(['anonymous', 'unentitled', 'revoked', 'invalid token', 'expired token', 'deleted user'])(
		'refuses new protected URLs for %s', async (kind) => {
			let token: string | undefined;
			if (kind === 'unentitled' || kind === 'revoked') token = tokenFor('viewer');
			if (kind === 'revoked') progressStatus = AdventureProgressStatus.REVOKED;
			if (kind === 'invalid token') token = 'invalid-token';
			if (kind === 'expired token') token = tokenFor('viewer', { expiresIn: -1 });
			if (kind === 'deleted user') token = tokenFor('deleted');
			await expectSafeFailure(403, token);
			expect(signer).not.toHaveBeenCalled();
		}
	);

	it.each(ACTIVE_ADVENTURE_STATUSES)('allows %s entitlement, then refuses the retained URL after revocation', async (status) => {
		progressStatus = status;
		const token = tokenFor('viewer');
		await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`)
			.expect(302).expect('Location', signedDownload);
		progressStatus = AdventureProgressStatus.REVOKED;
		await expectSafeFailure(403, token);
		expect(signer).toHaveBeenCalledTimes(1);
	});

	it.each(['owner', 'admin'])('preserves %s access to an existing restricted parent', async (id) => {
		stroll!.activeStatus = StrollActiveStatus.SUSPENDED;
		await request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${tokenFor(id)}`)
			.expect(302).expect('Location', signedDownload);
		expect(adventuresRepository.findOne).not.toHaveBeenCalled();
	});

	it.each(['public stage', 'public stroll', 'private preview', 'profile'])('explicitly allows anonymous %s media', async (kind) => {
		if (kind === 'profile') {
			Object.assign(asset!, { purpose: MediaUploadPurpose.PROFILE, profileUserId: 'profile', strollId: null, stageId: null });
		} else if (kind === 'public stage') {
			stroll!.publicityFlag = StrollPublicityFlag.PUBLIC;
		} else {
			Object.assign(asset!, { purpose: MediaUploadPurpose.STROLL, stageId: null });
			if (kind === 'public stroll') stroll!.publicityFlag = StrollPublicityFlag.PUBLIC;
			else stroll!.mediaUrls = { imageUrls: [asset!.publicUrl], videoUrls: [] };
		}
		await request(app.getHttpServer()).get(path).expect(302).expect('Location', signedDownload);
		expect(adventuresRepository.findOne).not.toHaveBeenCalled();
	});

	it.each(['private', 'unlisted', 'draft', 'archived', 'suspended'])(
		'rechecks a previously public parent after it becomes %s', async (kind) => {
			stroll!.publicityFlag = StrollPublicityFlag.PUBLIC;
			await request(app.getHttpServer()).get(path).expect(302);
			if (kind === 'private') stroll!.publicityFlag = StrollPublicityFlag.PRIVATE;
			else if (kind === 'unlisted') stroll!.publicityFlag = StrollPublicityFlag.UNLISTED;
			else stroll!.activeStatus = kind as StrollActiveStatus;
			await expectSafeFailure(403);
			expect(signer).toHaveBeenCalledTimes(1);
		}
	);

	it('stops issuing public URLs when a private preview is replaced', async () => {
		Object.assign(asset!, { purpose: MediaUploadPurpose.STROLL, stageId: null });
		stroll!.mediaUrls = { imageUrls: [asset!.publicUrl], videoUrls: [] };
		await request(app.getHttpServer()).get(path).expect(302);
		stroll!.mediaUrls.imageUrls = ['https://api.example.com/different-cover'];
		await expectSafeFailure(403);
		expect(signer).toHaveBeenCalledTimes(1);
	});

	it('stops issuing public URLs after a profile is removed', async () => {
		Object.assign(asset!, { purpose: MediaUploadPurpose.PROFILE, profileUserId: 'profile', strollId: null, stageId: null });
		await request(app.getHttpServer()).get(path).expect(302);
		profile = null;
		await expectSafeFailure(404);
		expect(signer).toHaveBeenCalledTimes(1);
	});

	it.each(['unknown', 'failed', 'aborted', 'pending multipart', 'deleted stroll', 'deleted stage', 'deleted profile'])(
		'returns a safe error for %s media without signing', async (kind) => {
			if (kind === 'unknown') asset = null;
			if (kind === 'failed') asset!.uploadStatus = MediaUploadStatus.FAILED;
			if (kind === 'aborted') asset!.uploadStatus = MediaUploadStatus.ABORTED;
			if (kind === 'pending multipart') asset!.uploadStatus = MediaUploadStatus.PENDING;
			if (kind === 'deleted stroll') stroll = null;
			if (kind === 'deleted stage') stage = null;
			if (kind === 'deleted profile') {
				Object.assign(asset!, { purpose: MediaUploadPurpose.PROFILE, profileUserId: 'profile', strollId: null, stageId: null });
				profile = null;
			}
			await expectSafeFailure(404, tokenFor('admin'));
			expect(signer).not.toHaveBeenCalled();
		}
	);

	it('does not disclose storage keys in a signing failure', async () => {
		stroll!.publicityFlag = StrollPublicityFlag.PUBLIC;
		signer.mockRejectedValueOnce(new Error(`Storage failed for ${objectKey}`));
		await expectSafeFailure(503);
	});

	it('returns a safe bad request for an invalid encoded key', async () => {
		const response = await request(app.getHttpServer()).get('/media/files/!!!').expect(400);
		expect(response.body.message).toBe('Invalid media key.');
		expect(signer).not.toHaveBeenCalled();
	});
});
