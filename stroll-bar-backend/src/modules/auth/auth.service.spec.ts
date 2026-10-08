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
	let query: any;

	beforeEach(() => {
		usersRepository = {
			findOne: jest.fn(),
			find: jest.fn(),
			save: jest.fn(),
			create: jest.fn(),
			count: jest.fn()
		};
		query = {
			update: jest.fn().mockReturnThis(),
			set: jest.fn().mockReturnThis(),
			where: jest.fn().mockReturnThis(),
			returning: jest.fn().mockReturnThis(),
			execute: jest.fn().mockResolvedValue({ affected: 1, raw: [{ id: 'user-1' }] })
		};
		usersRepository.createQueryBuilder = jest.fn(() => query);
		usersRepository.update = jest.fn().mockResolvedValue({ affected: 1 });

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
			sendVerificationEmail: jest.fn(),
			sendPasswordResetEmail: jest.fn()
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
		expect(usersRepository.findOne).not.toHaveBeenCalled();
		expect(query.where).toHaveBeenCalledWith(expect.stringContaining('"resetPasswordTokenHash" = :tokenHash'), { tokenHash: hash });
		expect(query.set).toHaveBeenCalledWith(expect.objectContaining({ refreshTokenHash: null, resetPasswordTokenHash: null, authVersion: expect.any(Function) }));
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
		expect(query.set).toHaveBeenCalledWith(expect.objectContaining({ refreshTokenHash: null }));
		expect(usersRepository.save).not.toHaveBeenCalled();
		expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id, success: true, ipAddress: '127.0.0.1' }));
	});

	it('changePassword revokes a pending reset token in the same guarded update without bumping authVersion', async () => {
		const oldHash = hashPasswordForTest('old-password');
		const user = buildUser({
			passwordHash: oldHash,
			authVersion: 3,
			resetPasswordTokenHash: 'pending-reset-hash',
			resetPasswordExpiresAt: new Date(Date.now() + 60_000)
		});
		usersRepository.findOne.mockResolvedValue(user);

		await service.changePassword(user.id, 'old-password', 'new-password');

		expect(usersRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
		expect(usersRepository.update).not.toHaveBeenCalled();
		const changes = query.set.mock.calls[0][0];
		expect(changes).toEqual({
			passwordHash: expect.any(String),
			refreshTokenHash: null,
			resetPasswordTokenHash: null,
			resetPasswordExpiresAt: null
		});
		expect(changes.passwordHash).not.toBe(oldHash);
		expect(changes).not.toHaveProperty('authVersion');
		const [predicate, params] = query.where.mock.calls[0];
		expect(predicate).toContain('"isActive" = true');
		expect(predicate).toContain('"authVersion" = :version');
		expect(predicate).toContain('"passwordHash" = :passwordHash');
		expect(params).toEqual({ id: user.id, version: 3, passwordHash: oldHash });
	});

	it('changePassword fails without auditing when a concurrent reset or change wins the race', async () => {
		usersRepository.findOne.mockResolvedValue(buildUser({ passwordHash: hashPasswordForTest('old-password'), resetPasswordTokenHash: 'pending-reset-hash' }));
		query.execute.mockResolvedValue({ affected: 0, raw: [] });

		await expect(service.changePassword('user-1', 'old-password', 'new-password')).rejects.toThrow(UnauthorizedException);
		expect(auditService.record).not.toHaveBeenCalled();
	});

	it('auth responses keep preferredLanguage for localization and never leak internal auth fields', async () => {
		usersRepository.findOne.mockResolvedValue(
			buildUser({
				passwordHash: hashPasswordForTest('password'),
				preferredLanguage: PreferredLanguage.EN,
				authVersion: 2,
				refreshTokenHash: 'stored-refresh-hash',
				resetPasswordTokenHash: 'pending-reset-hash',
				resetPasswordExpiresAt: new Date(),
				emailVerificationTokenHash: 'verification-hash',
				emailVerificationExpiresAt: new Date()
			})
		);

		const { user } = await service.login({ email: 'walker@example.com', password: 'password' });

		expect(user.preferredLanguage).toBe(PreferredLanguage.EN);
		expect(Object.keys(user).sort()).toEqual(
			['createdAt', 'email', 'emailVerified', 'id', 'isActive', 'preferredLanguage', 'profileImageUrl', 'role', 'updatedAt', 'username'].sort()
		);
		await expect(service.me('user-1')).resolves.toEqual(user);
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

	it('stores only a SHA256 reset hash with TTL and sends the request locale through email', async () => {
		usersRepository.findOne.mockResolvedValue(buildUser());
		const before = Date.now();
		const result = await service.requestPasswordReset('walker@example.com', PreferredLanguage.EN);
		expect(result).toEqual({ message: 'If the account exists, a password reset token has been issued.' });
		const token = emailService.sendPasswordResetEmail.mock.calls[0][2];
		expect(token).toMatch(/^[a-f0-9]{64}$/);
		const changes = usersRepository.update.mock.calls[0][1];
		expect(changes.resetPasswordTokenHash).toBe(createHash('sha256').update(token).digest('hex'));
		expect(changes.resetPasswordExpiresAt.getTime()).toBeGreaterThanOrEqual(before + 15 * 60_000);
		expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith('walker@example.com', 'walker', token, 15, PreferredLanguage.EN);
		expect(usersRepository.save).not.toHaveBeenCalled();
	});

	it('unknown or inactive accounts have the same generic result and send no email', async () => {
		usersRepository.findOne.mockResolvedValue(null);
		await expect(service.requestPasswordReset('unknown@example.com')).resolves.toEqual({
			message: 'If the account exists, a password reset token has been issued.'
		});
		expect(usersRepository.findOne).toHaveBeenCalledWith({ where: { email: 'unknown@example.com', isActive: true } });
		expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
	});

	it('revokes only its own token on delivery failure without revealing the account in HTTP', async () => {
		usersRepository.findOne.mockResolvedValue(buildUser());
		emailService.sendPasswordResetEmail.mockRejectedValue(new Error('provider unavailable'));
		await expect(service.requestPasswordReset('walker@example.com')).resolves.toHaveProperty('message');
		const hash = usersRepository.update.mock.calls[0][1].resetPasswordTokenHash;
		expect(usersRepository.update).toHaveBeenLastCalledWith(
			{ id: 'user-1', resetPasswordTokenHash: hash },
			{ resetPasswordTokenHash: null, resetPasswordExpiresAt: null }
		);
	});

	it('logs cleanup failure without turning an email outage into an account-enumerating response', async () => {
		usersRepository.findOne.mockResolvedValue(buildUser());
		emailService.sendPasswordResetEmail.mockRejectedValue(new Error('provider unavailable'));
		usersRepository.update.mockResolvedValueOnce({ affected: 1 }).mockRejectedValueOnce(new Error('database unavailable'));
		await expect(service.requestPasswordReset('walker@example.com')).resolves.toEqual({
			message: 'If the account exists, a password reset token has been issued.'
		});
	});

	it('never exposes a raw token even when the legacy flag is set', async () => {
		jest.spyOn(configService, 'get').mockImplementation((key: string) => key === 'AUTH_EXPOSE_RESET_TOKEN' ? 'true' : undefined);
		usersRepository.findOne.mockResolvedValue(buildUser());
		expect(await service.requestPasswordReset('walker@example.com')).not.toHaveProperty('resetToken');
	});

	it.each(['invalid', 'expired', 'reused'])('rejects an %s token when atomic consumption affects no row', async () => {
		query.execute.mockResolvedValue({ affected: 0, raw: [] });
		await expect(service.resetPassword('a'.repeat(64), 'NewPassword123!')).rejects.toThrow(UnauthorizedException);
		expect(auditService.record).not.toHaveBeenCalled();
	});

	it('does not issue sessions from a stale user snapshot after reset', async () => {
		usersRepository.findOne.mockResolvedValue(buildUser({ passwordHash: hashPasswordForTest('OldPassword123!') }));
		usersRepository.update.mockResolvedValue({ affected: 0 });
		await expect(service.login({ email: 'walker@example.com', password: 'OldPassword123!' })).rejects.toThrow(UnauthorizedException);
		expect(usersRepository.update).toHaveBeenCalledWith(
			expect.objectContaining({ authVersion: 0, passwordHash: expect.any(String) }),
			{ refreshTokenHash: expect.any(String) }
		);
	});

	it('rejects a refresh token from an older auth version', async () => {
		jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1', authVersion: 0 });
		usersRepository.findOne.mockResolvedValue(buildUser({ authVersion: 1, refreshTokenHash: hashPasswordForTest('token') }));
		await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
		expect(usersRepository.update).not.toHaveBeenCalled();
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
		authVersion: 0,
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
