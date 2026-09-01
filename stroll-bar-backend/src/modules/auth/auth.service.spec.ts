import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';
import { OAuthProviderService } from './services/oauth-provider.service';
import { SocialUserService } from './services/social-user.service';

describe('AuthService token validation', () => {
	let usersRepository: any;
	let socialIdentitiesRepository: any;
	let jwtService: any;
	let configService: ConfigService;
	let emailService: any;
	let oauthProviderService: any;
	let socialUserService: any;
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
			sign: jest.fn(),
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

		service = new AuthService(
			usersRepository,
			socialIdentitiesRepository,
			jwtService,
			configService,
			emailService,
			oauthProviderService,
			socialUserService
		);
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

});
