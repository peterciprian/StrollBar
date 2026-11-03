import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import { AppThrottlerGuard } from '../src/common/guards/app-throttler.guard';
import { AuthService } from '../src/modules/auth/auth.service';
import { SocialTransactionEntity } from '../src/modules/auth/entities/social-transaction.entity';
import { OAuthProviderService } from '../src/modules/auth/services/oauth-provider.service';
import { UserEntity } from '../src/modules/users/entities/user.entity';
import { configureIsolatedTestDatabase } from './isolated-test-database';

jest.setTimeout(120_000);

describe('Browser-bound social transactions (isolated PostgreSQL, mocked provider only)', () => {
	let app: INestApplication;
	let transactions: Repository<SocialTransactionEntity>;
	let users: Repository<UserEntity>;
	let auth: AuthService;
	let sequence = 0;
	const runId = randomBytes(8).toString('hex');
	const provider = {
		createAuthorizationUrl: jest.fn((_provider, _redirect, _verifier, state) => `https://provider.example/?state=${state}`),
		fetchUserProfile: jest.fn()
	};

	beforeAll(async () => {
		await configureIsolatedTestDatabase();
		Object.assign(process.env, {
			JWT_SECRET: 'social-transaction-test-access-secret',
			JWT_REFRESH_SECRET: 'social-transaction-test-refresh-secret',
			AUTH_SOCIAL_STATE_SECRET: 'social-transaction-test-state-secret',
			AUTH_FRONTEND_REDIRECT_URL: 'http://localhost:4200/callback',
			AUTH_ALLOWED_REDIRECT_ORIGINS: 'http://localhost:4200',
			RECAPTCHA_ENABLED: 'false',
			EMAIL_DELIVERY_ENABLED: 'false'
		});
		const { AppModule } = await import('../src/app.module');
		const module = await Test.createTestingModule({ imports: [AppModule] })
			.overrideProvider(OAuthProviderService).useValue(provider)
			.overrideGuard(AppThrottlerGuard).useValue({ canActivate: () => true })
			.compile();
		app = module.createNestApplication();
		app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
		await app.init();
		const database = module.get(DataSource);
		transactions = database.getRepository(SocialTransactionEntity);
		users = database.getRepository(UserEntity);
		auth = module.get(AuthService);
	});

	beforeEach(() => {
		sequence++;
		provider.fetchUserProfile.mockReset().mockResolvedValue({
			provider: 'google', providerUserId: `sec05-${runId}-${sequence}`,
			email: `sec05-${runId}-${sequence}@example.test`, emailVerified: true
		});
	});

	afterAll(async () => { if (app) await app.close(); });

	async function initiate() {
		const verifier = randomBytes(32).toString('hex');
		const challenge = createHash('sha256').update(verifier).digest('base64url');
		const response = await request(app.getHttpServer()).get('/auth/social/google/start-url')
			.query({ browserChallenge: challenge }).expect(200);
		const state = new URL(response.body.url).searchParams.get('state')!;
		return { verifier, transactionId: response.body.transactionId as string, state };
	}

	async function callback(flow: Awaited<ReturnType<typeof initiate>>) {
		const response = await request(app.getHttpServer()).get('/auth/social/google/callback')
			.query({ code: 'provider-code', state: flow.state }).expect(302);
		const url = new URL(response.headers.location);
		expect(url.searchParams.has('accessToken')).toBe(false);
		expect(url.searchParams.has('refreshToken')).toBe(false);
		return { url, code: url.searchParams.get('code')! };
	}

	function exchange(flow: Awaited<ReturnType<typeof initiate>>, code: string, verifier = flow.verifier) {
		return request(app.getHttpServer()).post('/auth/social/exchange').send({
			code, transactionId: flow.transactionId, verifier
		});
	}

	it('exchanges once across concurrent requests, with no account/session issuance at the provider callback', async () => {
		const flow = await initiate();
		const count = await users.count();
		const { code } = await callback(flow);
		expect(await users.count()).toBe(count);
		const stored = await transactions.findOneByOrFail({ id: flow.transactionId });
		expect(stored.handoffCodeHash).toBe(createHash('sha256').update(code).digest('hex'));
		expect(stored.handoffCodeHash).not.toBe(code);
		const results = await Promise.all([exchange(flow, code), exchange(flow, code)]);
		expect(results.map((result) => result.status).sort()).toEqual([201, 401]);
		const success = results.find((result) => result.status === 201)!;
		expect(success.body.accessToken).toBeTruthy();
		expect(success.body.refreshToken).toBeTruthy();
		expect(await transactions.findOneBy({ id: flow.transactionId })).toBeNull();
		const user = await users.findOneByOrFail({ id: success.body.user.id });
		await exchange(flow, code).expect(401);
		expect((await users.findOneByOrFail({ id: user.id })).refreshTokenHash).toBe(user.refreshTokenHash);
	});

	it('a different browser or wrong code cannot consume the legitimate handoff', async () => {
		const flow = await initiate();
		const { code } = await callback(flow);
		await exchange(flow, code, randomBytes(32).toString('hex')).expect(401);
		await exchange(flow, randomBytes(32).toString('hex')).expect(401);
		expect(await transactions.findOneBy({ id: flow.transactionId })).not.toBeNull();
		await exchange(flow, code).expect(201);
	});

	it.each(['handoff', 'transaction'])('expired %s proof cannot change an existing session', async (kind) => {
		const existing = await auth.register({
			email: `existing-${runId}-${sequence}@example.test`, username: `old-${runId}-${sequence}`, password: 'ExistingSession!2026'
		});
		const before = await users.findOneByOrFail({ id: existing.user.id });
		const flow = await initiate();
		const { code } = await callback(flow);
		await transactions.update({ id: flow.transactionId }, kind === 'handoff'
			? { handoffExpiresAt: new Date(Date.now() - 1000) } : { expiresAt: new Date(Date.now() - 1000) });
		await exchange(flow, code).expect(401);
		expect(await users.findOneByOrFail({ id: before.id })).toEqual(before);
	});

	it('missing, tampered, expired and replayed callback state cannot produce another handoff', async () => {
		await request(app.getHttpServer()).get('/auth/social/google/start-url').expect(400);
		const flow = await initiate();
		for (const state of [undefined, `${flow.state}tampered`]) {
			const response = await request(app.getHttpServer()).get('/auth/social/google/callback')
				.query({ code: 'provider-code', ...(state ? { state } : {}) }).expect(302);
			expect(response.headers.location).toContain('error=');
		}
		expect(provider.fetchUserProfile).not.toHaveBeenCalled();
		const callbacks = await Promise.all([callback(flow), callback(flow)]);
		expect(callbacks.filter((result) => result.code)).toHaveLength(1);
		expect(provider.fetchUserProfile).toHaveBeenCalledTimes(1);
		const expired = await initiate();
		await transactions.update({ id: expired.transactionId }, { expiresAt: new Date(Date.now() - 1000) });
		expect((await callback(expired)).url.searchParams.has('error')).toBe(true);
		expect(provider.fetchUserProfile).toHaveBeenCalledTimes(1);
	});
});
