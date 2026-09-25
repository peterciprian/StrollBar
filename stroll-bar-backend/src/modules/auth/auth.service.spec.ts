import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { OAuthProviderService } from './services/oauth-provider.service';
import { SocialUserService } from './services/social-user.service';
import { PreferredLanguage, UserRole } from '../users/entities/user.entity';

describe('AuthService token validation', () => {
	let usersRepository: any;
	let socialIdentitiesRepository: any;
	let jwtService: any;
	let configService: ConfigService;
	let emailService: any;
	let oauthProviderService: any;
	let socialUserService: any;
	let auditService: any;
	let service: AuthService;

	beforeEach(() => {
		usersRepository = {
			findOne: jest.fn(),
			find: jest.fn(),
			save: jest.fn(),
			create: jest.fn(),
			count: jest.fn()
		};

		socialIdentitiesRepository = {
			findOne: jest.fn(),
			save: jest.fn(),
			create: jest.fn()
		};

		jwtService = {
			sign: jest.fn((payload) => `signed-${payload.sub}-${payload.role}`),
			signAsync: jest.fn(),
			verifyAsync: jest.fn()
		};

		configService = {
			get: jest.fn((key: string) => {
				const values: Record<string, string> = {
					JWT_REFRESH_SECRET: 'refresh-secret',
					AUTH_EXPOSE_RESET_TOKEN: 'false',
					AUTH_EXPOSE_VERIFICATION_TOKEN: 'false',
					EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: '1440',
					PASSWORD_RESET_TOKEN_TTL_MINUTES: '15'
				};

				return values[key] ?? undefined;
			})
		} as unknown as ConfigService;

		emailService = {
			sendVerificationEmail: jest.fn()
		};

		oauthProviderService = {
			createAuthorizationUrl: jest.fn(),
			fetchUserProfile: jest.fn()
		};

		socialUserService = {
			findOrCreateUserFromProfile: jest.fn()
		};

		auditService = {
			record: jest.fn().mockResolvedValue(undefined)
		};

		service = new AuthService(
			usersRepository,
			socialIdentitiesRepository,
			jwtService,
			configService,
			emailService,
			oauthProviderService,
			socialUserService,
			auditService
		);
	});

	it('register creates an inactive-email user, sends verification, stores refresh token, and returns a sanitized user', async () => {
		usersRepository.findOne.mockResolvedValue(null);
		usersRepository.create.mockImplementation((value: Record<string, unknown>) => ({
			id: 'user-1',
			createdAt: new Date(),
			updatedAt: new Date(),
			...value
		}));
		usersRepository.save.mockImplementation(async (value: unknown) => value);

		const result = await service.register({
			username: 'walker',
			email: 'walker@example.com',
			password: 'StrollWalk!2026',
			preferredLanguage: PreferredLanguage.EN
		});

		expect(usersRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({
				username: 'walker',
				email: 'walker@example.com',
				isActive: true,
				role: UserRole.SIMPLE,
				preferredLanguage: PreferredLanguage.EN,
				emailVerified: false
			})
		);
		expect(emailService.sendVerificationEmail).toHaveBeenCalledWith('walker@example.com', 'walker', expect.any(String), PreferredLanguage.EN);
		expect(result.accessToken).toBe('signed-user-1-simple');
		expect(result.refreshToken).toBe('signed-user-1-simple');
		expect(result.user).toEqual(expect.not.objectContaining({ passwordHash: expect.anything(), refreshTokenHash: expect.anything() }));
	});

	it('rejects registration when email or username already exists', async () => {
		usersRepository.findOne.mockResolvedValue({ id: 'existing-user' });

		await expect(service.register({ username: 'walker', email: 'walker@example.com', password: 'StrollWalk!2026' })).rejects.toThrow(
			ConflictException
		);
		expect(usersRepository.save).not.toHaveBeenCalled();
	});

	it('resetPassword validates the token with a direct lookup instead of scanning all users', async () => {
		const rawToken = 'reset-token-123';
		const hash = createHash('sha256').update(rawToken).digest('hex');
		const user = {
			id: 'user-1',
			isActive: true,
			resetPasswordTokenHash: hash,
			resetPasswordExpiresAt: new Date(Date.now() + 60_000),
			passwordHash: 'stored-password-hash',
			refreshTokenHash: null,
			emailVerificationTokenHash: null,
			emailVerificationExpiresAt: null
		};

		usersRepository.findOne.mockResolvedValue(user);
		usersRepository.save.mockResolvedValue({ ...user, passwordHash: 'new-password-hash' });

		await expect(service.resetPassword(rawToken, 'new-password')).resolves.toEqual({ message: 'Password updated successfully.' });

		expect(usersRepository.find).not.toHaveBeenCalled();
		expect(usersRepository.findOne).toHaveBeenCalledWith({
			where: {
				isActive: true,
				resetPasswordTokenHash: hash,
				resetPasswordExpiresAt: expect.any(Object)
			}
		});
	});

	it('verifyEmail validates the token with a direct lookup instead of scanning all users', async () => {
		const rawToken = 'verify-token-123';
		const hash = createHash('sha256').update(rawToken).digest('hex');
		const user = {
			id: 'user-1',
			isActive: true,
			emailVerified: false,
			emailVerificationTokenHash: hash,
			emailVerificationExpiresAt: new Date(Date.now() + 60_000),
			passwordHash: 'stored-password-hash',
			refreshTokenHash: null,
			resetPasswordTokenHash: null,
			resetPasswordExpiresAt: null
		};

		usersRepository.findOne.mockResolvedValue(user);
		usersRepository.save.mockResolvedValue({ ...user, emailVerified: true });

		await expect(service.verifyEmail(rawToken)).resolves.toEqual({ message: 'Email verified successfully.' });

		expect(usersRepository.find).not.toHaveBeenCalled();
		expect(usersRepository.findOne).toHaveBeenCalledWith({
			where: {
				isActive: true,
				emailVerified: false,
				emailVerificationTokenHash: hash,
				emailVerificationExpiresAt: expect.any(Object)
			}
		});
	});

	it('refresh rejects inactive, missing, or refresh-token-mismatched users', async () => {
		jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', email: 'walker@example.com', username: 'walker' });
		usersRepository.findOne.mockResolvedValue({ id: 'user-1', isActive: true, refreshTokenHash: 'not-a-valid-hash' });

		await expect(service.refresh('refresh-token')).rejects.toThrow(UnauthorizedException);
	});

	it('logout validates a provided refresh token before clearing stored session state', async () => {
		const user = buildUser({ refreshTokenHash: 'not-a-valid-hash' });
		usersRepository.findOne.mockResolvedValue(user);

		await expect(service.logout(user.id, 'wrong-refresh-token')).rejects.toThrow(UnauthorizedException);
		expect(usersRepository.save).not.toHaveBeenCalled();
	});

	it('changePassword clears the refresh token and records an audit event', async () => {
		const user = buildUser({ passwordHash: hashPasswordForTest('old-password'), refreshTokenHash: 'stored-refresh-hash' });
		usersRepository.findOne.mockResolvedValue(user);
		usersRepository.save.mockImplementation(async (value: unknown) => value);

		await expect(service.changePassword(user.id, 'old-password', 'new-password', '127.0.0.1')).resolves.toEqual({
			message: 'Password updated successfully.'
		});
		expect(user.refreshTokenHash).toBeNull();
		expect(usersRepository.save).toHaveBeenCalledWith(user);
		expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id, success: true, ipAddress: '127.0.0.1' }));
	});

	it('resendVerificationEmail rejects already verified users', async () => {
		usersRepository.findOne.mockResolvedValue(buildUser({ emailVerified: true }));

		await expect(service.resendVerificationEmail('user-1')).rejects.toThrow(BadRequestException);
		expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
	});

	it('me rejects missing active users', async () => {
		usersRepository.findOne.mockResolvedValue(null);

		await expect(service.me('missing-user')).rejects.toThrow(NotFoundException);
	});
});

function buildUser(overrides: Record<string, unknown> = {}) {
	return {
		id: 'user-1',
		username: 'walker',
		email: 'walker@example.com',
		profileImageUrl: null,
		isActive: true,
		role: UserRole.SIMPLE,
		preferredLanguage: PreferredLanguage.HU,
		emailVerified: false,
		passwordHash: hashPasswordForTest('password'),
		refreshTokenHash: null,
		resetPasswordTokenHash: null,
		resetPasswordExpiresAt: null,
		emailVerificationTokenHash: null,
		emailVerificationExpiresAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

function hashPasswordForTest(password: string): string {
	const salt = '0123456789abcdef0123456789abcdef';
	const hash = require('node:crypto').scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}
