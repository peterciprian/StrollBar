import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
import { EmailVerifiedGuard } from '../auth/guards/email-verified.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { BadgesService } from '../badges/badges.service';
import { EmailService } from '../email/email.service';
import { StageEntity } from '../stages/entities/stage.entity';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { StrollActiveStatus, StrollEntity, StrollPublicityFlag } from './entities/stroll.entity';
import { StrollsController } from './strolls.controller';
import { StrollsService } from './strolls.service';
import { EffectiveRoleService } from '../users/effective-role.service';

describe('StrollsController browse query contract (PROD-04)', () => {
	let app: INestApplication;
	const service = { list: jest.fn(), listOwned: jest.fn() };

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [StrollsController],
			providers: [{ provide: StrollsService, useValue: service }]
		})
			.overrideGuard(OptionalJwtAuthGuard).useValue({ canActivate: () => true })
			.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
			.overrideGuard(EmailVerifiedGuard).useValue({ canActivate: () => true })
			.compile();
		app = moduleRef.createNestApplication({ logger: false });
		app.setGlobalPrefix('v1');
		app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
		app.useGlobalInterceptors(new VersionedResponseInterceptor());
		await app.init();
	});

	afterAll(async () => { await app?.close(); });
	beforeEach(() => {
		jest.clearAllMocks();
		service.list.mockImplementation(async (query) => ({ items: [], page: query.page, limit: query.limit, total: 45 }));
		service.listOwned.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });
	});

	it.each(['application/json', 'application/vnd.strollbar.v2+json'])('returns page metadata for %s', async (accept) => {
		const response = await request(app.getHttpServer()).get('/v1/strolls')
			.query({ search: '  Mixed %_!  ', city: '  Budapest ', page: 3, limit: 20, sortBy: 'top_rated' }).set('Accept', accept);
		expect(response.status).toBe(200);
		expect(service.list).toHaveBeenCalledWith(expect.objectContaining({
			search: 'Mixed %_!', city: 'Budapest', page: 3, limit: 20, sortBy: 'top_rated'
		}));
		expect(accept === 'application/json' ? response.body : response.body.data)
			.toEqual({ items: [], page: 3, limit: 20, total: 45 });
	});

	it.each([
		{ sortBy: 'most_used' }, { page: 0 }, { page: 1.5 }, { limit: 101 }, { limit: 0 },
		{ userLatitude: 91 }, { userLongitude: -181 }, { category: 'HISTORY' }, { unknown: 'value' }
	])('rejects invalid/unsupported query %j before reaching the service', async (query) => {
		await request(app.getHttpServer()).get('/v1/strolls').query(query).expect(400);
		expect(service.list).not.toHaveBeenCalled();
	});

	it('keeps owner listing query transformations and sort acceptance unchanged', async () => {
		await request(app.getHttpServer()).get('/v1/strolls/mine').query({ search: ' A ', sortBy: 'legacy' }).expect(200);
		expect(service.listOwned).toHaveBeenCalledWith(expect.objectContaining({ search: ' A ', sortBy: 'legacy' }), undefined);
	});

	it('documents search fields, the sort enum, query bounds and pagination response', () => {
		const doc = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		const operation = doc.paths['/v1/strolls'].get!;
		const parameters = operation.parameters as unknown as { name: string; description?: string; schema: Record<string, unknown> }[];
		expect(parameters.find((param) => param.name === 'search')?.description).toContain('name, description OR any stage address');
		expect(parameters.find((param) => param.name === 'city')?.description).toContain('ANDed with search');
		expect(parameters.find((param) => param.name === 'sortBy')?.schema.enum).toEqual(['newest', 'most_popular', 'top_rated', 'nearest']);
		expect(parameters.find((param) => param.name === 'page')?.schema).toMatchObject({ minimum: 1, default: 1 });
		expect(parameters.find((param) => param.name === 'limit')?.schema).toMatchObject({ minimum: 1, maximum: 100, default: 20 });
		expect(doc.components?.schemas?.BrowseStrollsResponseDto).toMatchObject({
			properties: { total: { description: expect.stringContaining('before pagination') } }
		});
	});
});

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
				{ provide: EffectiveRoleService, useValue: new EffectiveRoleService({ find: async () => [] } as never) },
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
