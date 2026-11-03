import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { StructuredExceptionFilter } from '../../common/filters/structured-exception.filter';
import { VersionedResponseInterceptor } from '../../common/interceptors/versioned-response.interceptor';
import { RedisCacheService } from '../../common/services/redis-cache.service';
import { ACTIVE_ADVENTURE_STATUSES } from '../adventures/adventures.service';
import { AdventureEntity, AdventureProgressStatus } from '../adventures/entities/adventure.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { BadgesService } from '../badges/badges.service';
import { EmailService } from '../email/email.service';
import { StageEntity } from '../stages/entities/stage.entity';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from './entities/stroll.entity';
import { StrollsController } from './strolls.controller';
import { StrollsService } from './strolls.service';

describe('StrollsController detail serialization (SEC-04)', () => {
	let app: INestApplication;
	let stroll: StrollEntity;
	let stages: StageEntity[];
	const secret = 'stroll-detail-test-secret';
	const jwt = new JwtService({ secret });
	const answers = ['sec-04-first-secret', 'sec-04-second-secret'];
	const viewer = { role: UserRole.SIMPLE, email: 'viewer@example.com', username: 'viewer', authVersion: 0 };
	const stagesRepository = { find: jest.fn(async () => stages) };
	const adventuresRepository = { findOne: jest.fn() };
	const envelopes = [
		{ version: 'v1', accept: 'application/json' },
		{ version: 'v2', accept: 'application/vnd.strollbar.v2+json' }
	];
	const visibility = [StrollPublicityFlag.PUBLIC, StrollPublicityFlag.PRIVATE, StrollPublicityFlag.UNLISTED];

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
			controllers: [StrollsController],
			providers: [
				StrollsService, JwtStrategy, JwtAuthGuard, OptionalJwtAuthGuard,
				{ provide: ConfigService, useValue: new ConfigService({ JWT_SECRET: secret }) },
				{ provide: getRepositoryToken(StrollEntity), useValue: { findOne: jest.fn(async () => stroll) } },
				{ provide: getRepositoryToken(StageEntity), useValue: stagesRepository },
				{ provide: getRepositoryToken(AdventureEntity), useValue: adventuresRepository },
				{
					provide: getRepositoryToken(UserEntity),
					useValue: {
						findOne: jest.fn(async ({ where }) => ({
							...viewer, id: where.id, role: where.id === 'admin' ? UserRole.ADMIN : UserRole.SIMPLE
						}))
					}
				},
				{ provide: RedisCacheService, useValue: {} },
				{ provide: BadgesService, useValue: {} },
				{ provide: EmailService, useValue: {} },
				{ provide: DataSource, useValue: {} }
			]
		}).compile();
		app = moduleRef.createNestApplication({ logger: false });
		app.setGlobalPrefix('v1');
		app.useGlobalFilters(new StructuredExceptionFilter());
		app.useGlobalInterceptors(new VersionedResponseInterceptor());
		await app.init();
	});

	afterAll(async () => {
		await app?.close();
	});

	beforeEach(() => {
		jest.clearAllMocks();
		stroll = Object.assign(new StrollEntity(), {
			id: 'stroll-1', authorId: 'owner', name: 'A stroll',
			activeStatus: StrollActiveStatus.PUBLISHED, publicityFlag: StrollPublicityFlag.PUBLIC
		});
		stages = [...answers, null].map((riddleAnswer, index) => Object.assign(new StageEntity(), {
			id: `stage-${index + 1}`, strollId: stroll.id, orderIndex: index + 1,
			name: `Stage ${index + 1}`, description: 'Solve this riddle.', riddleAnswer
		}));
		adventuresRepository.findOne.mockImplementation(async ({ where }) => {
			expect(where.progressStatus.value).toEqual(ACTIVE_ADVENTURE_STATUSES);
			return where.ownerUserId === 'player' ? { id: 'purchase', progressStatus: AdventureProgressStatus.IN_PROGRESS } : null;
		});
	});

	async function getDetail(accept: string, userId?: string, owned = false) {
		const call = request(app.getHttpServer())
			.get(`/v1/strolls/${owned ? 'mine/' : ''}${stroll.id}`)
			.set('Accept', accept);
		if (userId) call.set('Authorization', `Bearer ${jwt.sign({ sub: userId, authVersion: 0 })}`);
		return call;
	}

	describe.each(envelopes)('$version envelope', ({ version, accept }) => {
		function unwrap(body: any) {
			if (version === 'v2') {
				expect(body).toMatchObject({
					status: 'success',
					meta: { version: 'v2', requestId: expect.any(String), timestamp: expect.any(String) }
				});
				return body.data;
			}
			expect(body).not.toHaveProperty('data');
			return body;
		}

		it.each([undefined, 'ordinary', 'player'])('omits all answers from public detail for %s', async (userId) => {
			const response = await getDetail(accept, userId);
			expect(response.status).toBe(200);
			const detail = unwrap(response.body);
			expect(detail.stages).toHaveLength(3);
			expect(detail.stages.map((stage: StageEntity) => stage.id)).toEqual(stages.map((stage) => stage.id));
			expect(response.text).not.toContain('riddleAnswer');
			for (const answer of answers) expect(response.text).not.toContain(answer);
			expect(stages[0].riddleAnswer).toBe(answers[0]);
			expect(stagesRepository.find).toHaveBeenCalledWith({ where: { strollId: stroll.id }, order: { orderIndex: 'ASC' } });
		});

		it.each([StrollPublicityFlag.PRIVATE, StrollPublicityFlag.UNLISTED])(
			'omits all answers from entitled player detail for %s strolls', async (publicityFlag) => {
				stroll.publicityFlag = publicityFlag;
				const response = await getDetail(accept, 'player');
				expect(response.status).toBe(200);
				expect(unwrap(response.body).stages).toHaveLength(3);
				expect(response.text).not.toContain('riddleAnswer');
				for (const answer of answers) expect(response.text).not.toContain(answer);
			}
		);

		it.each(visibility)('retains owner/admin answers on detail and editing routes for %s strolls', async (publicityFlag) => {
			stroll.publicityFlag = publicityFlag;
			for (const userId of ['owner', 'admin']) {
				for (const owned of [false, true]) {
					const response = await getDetail(accept, userId, owned);
					expect(response.status).toBe(200);
					expect(unwrap(response.body).stages.map((stage: StageEntity) => stage.riddleAnswer)).toEqual([...answers, null]);
					for (const answer of answers) expect(response.text).toContain(answer);
				}
			}
			expect(adventuresRepository.findOne).not.toHaveBeenCalled();
		});

		it.each([StrollPublicityFlag.PRIVATE, StrollPublicityFlag.UNLISTED])(
			'still denies anonymous and unentitled reads of %s strolls', async (publicityFlag) => {
				stroll.publicityFlag = publicityFlag;
				for (const userId of [undefined, 'ordinary']) {
					const response = await getDetail(accept, userId);
					expect(response.status).toBe(403);
					if (version === 'v2') expect(response.body).toMatchObject({ status: 'error', error: { code: 'HTTP_403' } });
					else expect(response.body).toHaveProperty('statusCode', 403);
					expect(response.text).not.toContain('riddleAnswer');
					for (const answer of answers) expect(response.text).not.toContain(answer);
				}
				expect(stagesRepository.find).not.toHaveBeenCalled();
			}
		);

		it.each(['ordinary', 'player'])('still denies editing detail to %s', async (userId) => {
			const response = await getDetail(accept, userId, true);
			expect(response.status).toBe(403);
			expect(response.text).not.toContain('riddleAnswer');
			for (const answer of answers) expect(response.text).not.toContain(answer);
			expect(stagesRepository.find).not.toHaveBeenCalled();
		});
	});
});
