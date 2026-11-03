import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { RecaptchaGuard } from '../../common/guards/recaptcha.guard';
import { UserEntity, UserRole } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

describe('Social account action HTTP boundary', () => {
	let app: INestApplication;
	let auth: {
		createSocialLinkAuthorizationUrl: jest.Mock;
		createSocialReclaimAuthorizationUrl: jest.Mock;
		createSocialAuthorizationUrl: jest.Mock;
		completeSocialLogin: jest.Mock;
	};
	const secret = 'sec-01-http-test-secret';
	const user = { id: 'user-1', email: 'owner@example.com', username: 'owner', role: UserRole.SIMPLE, authVersion: 4 };
	const jwt = new JwtService({ secret });
	let accessToken: string;

	beforeAll(async () => {
		auth = {
			createSocialLinkAuthorizationUrl: jest.fn().mockResolvedValue({ url: 'https://provider.example/link' }),
			createSocialReclaimAuthorizationUrl: jest.fn().mockResolvedValue({ url: 'https://provider.example/reclaim' }),
			createSocialAuthorizationUrl: jest.fn().mockResolvedValue({ url: 'https://provider.example/login' }),
			completeSocialLogin: jest.fn().mockResolvedValue('http://localhost:4200/callback?error=Use%20recovery')
		};
		const module = await Test.createTestingModule({
			imports: [PassportModule],
			controllers: [AuthController],
			providers: [
				{ provide: AuthService, useValue: auth },
				JwtStrategy,
				{ provide: ConfigService, useValue: { getOrThrow: () => secret } },
				{ provide: getRepositoryToken(UserEntity), useValue: { findOne: jest.fn().mockResolvedValue(user) } }
			]
		}).overrideGuard(RecaptchaGuard).useValue({ canActivate: () => true }).compile();
		app = module.createNestApplication();
		app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
		await app.init();
		accessToken = jwt.sign({ sub: user.id, authVersion: user.authVersion });
	});

	beforeEach(() => jest.clearAllMocks());
	afterAll(async () => { if (app) await app.close(); });

	it('unauthenticated linking never reaches the account service', async () => {
		await request(app.getHttpServer()).post('/auth/social/google/link/start-url')
			.send({ currentPassword: 'Password123!' }).expect(401);
		expect(auth.createSocialLinkAuthorizationUrl).not.toHaveBeenCalled();
	});

	it('a revoked preparer JWT cannot start explicit linking', async () => {
		const stale = jwt.sign({ sub: user.id, authVersion: 3 });
		await request(app.getHttpServer()).post('/auth/social/google/link/start-url')
			.auth(stale, { type: 'bearer' }).send({ currentPassword: 'Password123!' }).expect(401);
		expect(auth.createSocialLinkAuthorizationUrl).not.toHaveBeenCalled();
	});

	it('authenticated linking still requires a password, not just a JWT', async () => {
		await request(app.getHttpServer()).post('/auth/social/google/link/start-url')
			.auth(accessToken, { type: 'bearer' }).send({}).expect(400);
		expect(auth.createSocialLinkAuthorizationUrl).not.toHaveBeenCalled();
	});

	it('the link target comes from the authenticated user, never a body-supplied user id', async () => {
		await request(app.getHttpServer()).post('/auth/social/google/link/start-url')
			.auth(accessToken, { type: 'bearer' }).send({ currentPassword: 'Password123!', userId: 'other' }).expect(400);
		expect(auth.createSocialLinkAuthorizationUrl).not.toHaveBeenCalled();
	});

	it('explicit POST linking forwards authenticated identity and the reauthentication proof', async () => {
		await request(app.getHttpServer()).post('/auth/social/google/link/start-url')
			.auth(accessToken, { type: 'bearer' })
			.send({ currentPassword: 'Password123!', redirectUri: 'http://localhost:4200/callback' }).expect(201);
		expect(auth.createSocialLinkAuthorizationUrl).toHaveBeenCalledWith(
			user.id, 'google', 'Password123!', 'http://localhost:4200/callback'
		);
	});

	it('explicit reclamation validates the requested email before starting provider proof', async () => {
		await request(app.getHttpServer()).post('/auth/social/google/reclaim/start-url').send({ email: 'invalid' }).expect(400);
		expect(auth.createSocialReclaimAuthorizationUrl).not.toHaveBeenCalled();
		await request(app.getHttpServer()).post('/auth/social/google/reclaim/start-url').send({ email: user.email }).expect(201);
		expect(auth.createSocialReclaimAuthorizationUrl).toHaveBeenCalledWith('google', user.email, undefined);
	});

	it('ordinary GET start cannot opt into account linking via query parameters', async () => {
		await request(app.getHttpServer()).get('/auth/social/google/start-url?intent=link&userId=other').expect(200);
		expect(auth.createSocialAuthorizationUrl).toHaveBeenCalledWith('google', undefined);
		expect(auth.createSocialLinkAuthorizationUrl).not.toHaveBeenCalled();
	});

	it.each(['get', 'post'] as const)('the %s provider callback redirects with the service conflict/recovery outcome', async (method) => {
		const callback = { code: 'provider-code', state: 'signed-state' };
		const call = request(app.getHttpServer())[method]('/auth/social/google/callback');
		const result = await (method === 'get' ? call.query(callback) : call.send(callback)).expect(302);
		expect(auth.completeSocialLogin).toHaveBeenCalledWith('google', expect.objectContaining(callback));
		expect(result.headers.location).toBe('http://localhost:4200/callback?error=Use%20recovery');
		expect(result.headers.location).not.toContain('accessToken');
	});
});
