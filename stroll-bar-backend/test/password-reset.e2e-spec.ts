import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import request from 'supertest';
import { createHash } from 'node:crypto';
import { UserEntity } from '../src/modules/users/entities/user.entity';
import { UsersService } from '../src/modules/users/users.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { AppThrottlerGuard } from '../src/common/guards/app-throttler.guard';
import { configureIsolatedTestDatabase } from './isolated-test-database';

const mailbox: { to: { email: string }[]; subject: string; textContent: string; htmlContent: string }[] = [];
const sendTransacEmail = jest.fn(async (email: typeof mailbox[number]) => {
	mailbox.push(email);
	return { messageId: 'test-message' };
});
jest.mock('@getbrevo/brevo', () => ({
	BrevoClient: jest.fn(() => ({ transactionalEmails: { sendTransacEmail }, account: { getAccount: jest.fn() } }))
}));

jest.setTimeout(120_000);

describe('Password reset API lifecycle (isolated PostgreSQL)', () => {
	let app: INestApplication;
	let users: Repository<UserEntity>;
	let tracker = '';
	let sequence = 0;
	const runId = Date.now().toString(36);
	const password = 'InitialPassword123!';
	const newPassword = 'RecoveredPassword456!';

	beforeAll(async () => {
		await configureIsolatedTestDatabase();
		Object.assign(process.env, {
			JWT_SECRET: 'reset-test-secret',
			JWT_REFRESH_SECRET: 'reset-test-refresh-secret',
			AUTH_EXPOSE_RESET_TOKEN: 'false',
			AUTH_EXPOSE_VERIFICATION_TOKEN: 'false',
			RECAPTCHA_ENABLED: 'false',
			EMAIL_DELIVERY_ENABLED: 'true',
			BREVO_API_KEY: 'test-only-mocked-key',
			EMAIL_FROM: 'StrollBar <no-reply@example.com>',
			PASSWORD_RESET_URL: 'https://strollbar.app/auth/reset-password',
			PASSWORD_RESET_TOKEN_TTL_MINUTES: '15'
		});
		jest.spyOn(AppThrottlerGuard.prototype as any, 'getTracker').mockImplementation(async () => tracker);
		const { AppModule } = await import('../src/app.module');
		const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
		app = moduleRef.createNestApplication();
		app.setGlobalPrefix('v1');
		app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
		await app.init();
		users = moduleRef.get(DataSource).getRepository(UserEntity);
	});

	beforeEach(() => {
		tracker = `${runId}-${++sequence}`;
		mailbox.length = 0;
		sendTransacEmail.mockClear();
	});

	afterAll(async () => {
		jest.restoreAllMocks();
		if (app) await app.close();
	});

	async function register() {
		const email = `reset-${runId}-${sequence}@example.com`;
		const response = await request(app.getHttpServer()).post('/v1/auth/register').send({
			email, username: `reset-${runId}-${sequence}`, password, preferredLanguage: 'hu'
		}).expect(201);
		mailbox.length = 0;
		return { email, ...response.body };
	}

	async function requestReset(email: string, preferredLanguage = 'hu') {
		const response = await request(app.getHttpServer()).post('/v1/auth/password-reset/request').send({ email, preferredLanguage }).expect(201);
		expect(Object.keys(response.body)).toEqual(['message']);
		const message = mailbox.find((item) => item.to[0].email === email);
		const token = message?.textContent.match(/token=([a-f0-9]{64})/)?.[1];
		return { response, message, token };
	}

	function confirm(token: string, nextPassword = newPassword) {
		return request(app.getHttpServer()).post('/v1/auth/password-reset/confirm').send({ resetToken: token, newPassword: nextPassword });
	}

	it('emails a trusted localized link, stores only its hash, consumes once and invalidates old credentials/sessions without login', async () => {
		const account = await register();
		const { token, message } = await requestReset(account.email, 'en');
		expect(message!.subject).toBe('Reset your StrollBar password');
		expect(message!.textContent).toContain(`https://strollbar.app/auth/reset-password?token=${token}`);
		expect(message!.htmlContent).toContain(`href="https://strollbar.app/auth/reset-password?token=${token}"`);
		const stored = await users.findOneByOrFail({ id: account.user.id });
		expect(stored.resetPasswordTokenHash).toBe(createHash('sha256').update(token!).digest('hex'));
		expect(stored.resetPasswordExpiresAt!.getTime()).toBeGreaterThan(Date.now() + 14 * 60_000);
		const response = await confirm(token!).expect(201);
		expect(response.body).toEqual({ message: 'Password updated successfully.' });
		await confirm(token!).expect(401);
		await request(app.getHttpServer()).get('/v1/auth/me').set('Authorization', `Bearer ${account.accessToken}`).expect(401);
		await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken: account.refreshToken }).expect(401);
		await request(app.getHttpServer()).post('/v1/auth/login').send({ email: account.email, password }).expect(401);
		const loggedIn = await request(app.getHttpServer()).post('/v1/auth/login').send({ email: account.email, password: newPassword }).expect(201);
		for (const field of ['passwordHash', 'refreshTokenHash', 'resetPasswordTokenHash', 'resetPasswordExpiresAt', 'authVersion']) {
			expect(loggedIn.body.user).not.toHaveProperty(field);
		}
		await request(app.getHttpServer()).get('/v1/auth/me').set('Authorization', `Bearer ${loggedIn.body.accessToken}`).expect(200);
		const consumed = await users.findOneByOrFail({ id: account.user.id });
		expect(consumed.authVersion).toBe(1);
		expect(consumed.resetPasswordTokenHash).toBeNull();
	});

	it('allows exactly one of two simultaneous confirmations', async () => {
		const account = await register();
		const { token } = await requestReset(account.email);
		const responses = await Promise.all([confirm(token!), confirm(token!)]);
		expect(responses.map((item) => item.status).sort()).toEqual([201, 401]);
		expect((await users.findOneByOrFail({ id: account.user.id })).authVersion).toBe(1);
	});

	it('rejects expired and well-formed invalid tokens without changing credentials', async () => {
		const account = await register();
		const { token } = await requestReset(account.email);
		await users.update(account.user.id, { resetPasswordExpiresAt: new Date(Date.now() - 1000) });
		await confirm(token!).expect(401);
		await confirm('a'.repeat(64)).expect(401);
		expect((await users.findOneByOrFail({ id: account.user.id })).authVersion).toBe(0);
		await request(app.getHttpServer()).post('/v1/auth/login').send({ email: account.email, password }).expect(201);
	});

	it('reissuing a link invalidates the previous link and preserves existing sessions until confirmation', async () => {
		const account = await register();
		const first = await requestReset(account.email);
		mailbox.length = 0;
		const second = await requestReset(account.email);
		expect(second.message!.subject).toBe('StrollBar jelszó visszaállítása');
		expect(first.token).not.toBe(second.token);
		await confirm(first.token!).expect(401);
		await request(app.getHttpServer()).get('/v1/auth/me').set('Authorization', `Bearer ${account.accessToken}`).expect(200);
		await confirm(second.token!).expect(201);
	});

	it('invalidates an already-issued reset link after a normal authenticated password change', async () => {
		const account = await register();
		const { token } = await requestReset(account.email);
		expect(token).toMatch(/^[a-f0-9]{64}$/);

		await request(app.getHttpServer())
			.post('/v1/auth/change-password')
			.set('Authorization', `Bearer ${account.accessToken}`)
			.send({ currentPassword: password, newPassword: 'ChangedPassword789!' })
			.expect(201);

		await confirm(token!).expect(401);
		const stored = await users.findOneByOrFail({ id: account.user.id });
		expect(stored.resetPasswordTokenHash).toBeNull();
		expect(stored.resetPasswordExpiresAt).toBeNull();
		expect(stored.authVersion).toBe(0);
		await request(app.getHttpServer())
			.post('/v1/auth/login')
			.send({ email: account.email, password: 'ChangedPassword789!' })
			.expect(201);
		await request(app.getHttpServer())
			.post('/v1/auth/login')
			.send({ email: account.email, password })
			.expect(401);
	});

	it('returns identical results for unknown and inactive accounts without email', async () => {
		const account = await register();
		await users.update(account.user.id, { isActive: false });
		const inactive = await requestReset(account.email);
		const unknown = await requestReset(`unknown-${runId}@example.com`);
		expect(inactive.response.body).toEqual(unknown.response.body);
		expect(mailbox).toHaveLength(0);
	});

	it('delivery failure is generic and revokes the failed token', async () => {
		const account = await register();
		sendTransacEmail.mockRejectedValueOnce(new Error('provider unavailable'));
		const failed = await requestReset(account.email);
		const unknown = await requestReset(`unknown-${runId}@example.com`);
		expect(failed.response.body).toEqual(unknown.response.body);
		expect((await users.findOneByOrFail({ id: account.user.id })).resetPasswordTokenHash).toBeNull();
	});

	it('cannot consume a previously issued token after deactivation', async () => {
		const account = await register();
		const { token } = await requestReset(account.email);
		await users.update(account.user.id, { isActive: false });
		await confirm(token!).expect(401);
		expect((await users.findOneByOrFail({ id: account.user.id })).authVersion).toBe(0);
	});

	it('supports path routing and trimmed email input', async () => {
		const account = await register();
		const { ConfigService } = await import('@nestjs/config');
		app.get(ConfigService).set('PASSWORD_RESET_URL', 'https://frontend.example.com/auth/reset-password');
		try {
			await requestReset(`  ${account.email}  `, 'en');
			// The DTO trims the input; the mailbox uses the normalized address.
			const sent = mailbox[0];
			const actualToken = sent.textContent.match(/token=([a-f0-9]{64})/)![1];
			expect(sent.textContent).toContain(`https://frontend.example.com/auth/reset-password?token=${actualToken}`);
			await confirm(actualToken).expect(201);
			await request(app.getHttpServer()).get('/v1/auth/me').set('Authorization', `Bearer ${account.accessToken}`).expect(401);
		} finally {
			app.get(ConfigService).set('PASSWORD_RESET_URL', 'https://strollbar.app/auth/reset-password');
		}
	});

	it('an in-flight profile save cannot restore reset hashes, old password or authVersion', async () => {
		const account = await register();
		const { token } = await requestReset(account.email);
		const service = app.get(UsersService);
		const repository = (service as any).usersRepository as Repository<UserEntity>;
		const original = repository.findOne.bind(repository);
		let release!: () => void;
		let loaded!: () => void;
		const snapshotLoaded = new Promise<void>((resolve) => { loaded = resolve; });
		const continueSave = new Promise<void>((resolve) => { release = resolve; });
		const spy = jest.spyOn(repository, 'findOne').mockImplementationOnce(async (options) => {
			const snapshot = await original(options);
			loaded();
			await continueSave;
			return snapshot;
		});
		const update = service.updateMe(account.user.id, { profileImageUrl: 'https://example.com/profile.png' });
		await snapshotLoaded;
		try {
			await confirm(token!).expect(201);
		} finally {
			release();
		}
		await update;
		spy.mockRestore();
		const stored = await users.findOneByOrFail({ id: account.user.id });
		expect(stored.authVersion).toBe(1);
		expect(stored.resetPasswordTokenHash).toBeNull();
		expect(stored.refreshTokenHash).toBeNull();
		await request(app.getHttpServer()).post('/v1/auth/login').send({ email: account.email, password }).expect(401);
	});

	it('a login already in progress cannot issue usable sessions or overwrite reset invalidation', async () => {
		const account = await register();
		const { token } = await requestReset(account.email);
		const service = app.get(AuthService);
		const repository = (service as any).usersRepository as Repository<UserEntity>;
		const original = repository.update.bind(repository);
		let release!: () => void;
		let reached!: () => void;
		const issuanceReached = new Promise<void>((resolve) => { reached = resolve; });
		const continueIssuance = new Promise<void>((resolve) => { release = resolve; });
		const spy = jest.spyOn(repository, 'update').mockImplementationOnce(async (criteria, changes) => {
			reached();
			await continueIssuance;
			return original(criteria, changes);
		});
		const login = service.login({ email: account.email, password }).catch((error: Error) => error);
		await issuanceReached;
		try {
			await confirm(token!).expect(201);
		} finally {
			release();
		}
		expect(await login).toBeInstanceOf(Error);
		spy.mockRestore();
		const stored = await users.findOneByOrFail({ id: account.user.id });
		expect(stored.authVersion).toBe(1);
		expect(stored.refreshTokenHash).toBeNull();
		expect(stored.resetPasswordTokenHash).toBeNull();
	});

	it.each([
		{ email: 'not-email' },
		{ email: ['walker@example.com'] },
		{ email: 'walker@example.com', preferredLanguage: 'de' },
		{ email: 'walker@example.com', resetToken: 'inject' }
	])('rejects invalid request input %j', async (body) => {
		await request(app.getHttpServer()).post('/v1/auth/password-reset/request').send(body).expect(400);
	});

	it.each([
		{ resetToken: '', newPassword },
		{ resetToken: 'x'.repeat(64), newPassword },
		{ resetToken: 'a'.repeat(64), newPassword: 'weak' },
		{ resetToken: 'a'.repeat(64), newPassword: 'a'.repeat(129) },
		{ resetToken: 'a'.repeat(64), newPassword: { password: newPassword } }
	])('rejects invalid confirmation input %j', async (body) => {
		await request(app.getHttpServer()).post('/v1/auth/password-reset/confirm').send(body).expect(400);
	});

	it('keeps request throttling at three per minute even for unknown accounts', async () => {
		for (let index = 0; index < 3; index++) await requestReset('unknown@example.com');
		await request(app.getHttpServer()).post('/v1/auth/password-reset/request').send({ email: 'unknown@example.com' }).expect(429);
	});

	it('keeps confirmation throttling at five per minute', async () => {
		for (let index = 0; index < 5; index++) await confirm('b'.repeat(64)).expect(401);
		await confirm('b'.repeat(64)).expect(429);
	});
});
