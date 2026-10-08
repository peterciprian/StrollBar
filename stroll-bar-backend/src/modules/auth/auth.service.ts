import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { StringValue } from 'ms';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SocialAuthProvider, SocialIdentityEntity } from './entities/social-identity.entity';
import { PreferredLanguage, UserEntity, UserRole } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import { OAuthProviderService } from './services/oauth-provider.service';
import { SocialUserService } from './services/social-user.service';
import { AuditAction } from '../../common/audit.entity';
import { AuditService } from '../../common/audit.service';

type SafeUser = Pick<UserEntity, 'id' | 'username' | 'email' | 'profileImageUrl' | 'isActive' | 'role' | 'preferredLanguage' | 'emailVerified' | 'createdAt' | 'updatedAt'>;
type AuthResponse = { accessToken: string; refreshToken: string; user: SafeUser };
type RegisterResponse = AuthResponse & { verificationToken?: string };
type SocialState = {
	provider: SocialAuthProvider;
	frontendRedirectUri: string;
	codeVerifier: string;
};
type SocialCallback = { code?: string; state?: string; error?: string };

const SOCIAL_PROVIDERS: SocialAuthProvider[] = ['apple', 'google', 'facebook', 'twitter'];

@Injectable()
export class AuthService {
	private readonly logger = new Logger(AuthService.name);
	constructor(
		@InjectRepository(UserEntity)
		private readonly usersRepository: Repository<UserEntity>,
		@InjectRepository(SocialIdentityEntity)
		private readonly socialIdentitiesRepository: Repository<SocialIdentityEntity>,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
		private readonly emailService: EmailService,
		private readonly oauthProviderService: OAuthProviderService,
		private readonly socialUserService: SocialUserService,
		@Optional() private readonly auditService?: AuditService
	) {}

	async register(dto: RegisterDto): Promise<RegisterResponse> {
		const existingUser = await this.usersRepository.findOne({
			where: [{ email: dto.email }, { username: dto.username }]
		});

		if (existingUser) {
			throw new ConflictException('User with the same email or username already exists.');
		}

		const user = this.usersRepository.create({
			username: dto.username,
			email: dto.email,
			passwordHash: this.hashPassword(dto.password),
			isActive: true,
			role: UserRole.SIMPLE,
			preferredLanguage: dto.preferredLanguage ?? PreferredLanguage.HU,
			emailVerified: false
		});

		const savedUser = await this.usersRepository.save(user);
		const verificationToken = await this.issueEmailVerificationToken(savedUser);
		await this.emailService.sendVerificationEmail(savedUser.email, savedUser.username, verificationToken, savedUser.preferredLanguage);
		const tokens = await this.issueTokens(savedUser);

		const shouldExposeVerificationToken = (this.configService.get<string>('AUTH_EXPOSE_VERIFICATION_TOKEN') ?? 'false').toLowerCase() === 'true';

		return {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			user: this.sanitizeUser(savedUser),
			...(shouldExposeVerificationToken ? { verificationToken } : {})
		};
	}

	async login(dto: LoginDto, ipAddress?: string): Promise<AuthResponse> {
		const user = await this.usersRepository.findOne({ where: { email: dto.email } });

		if (!user || !user.isActive || !this.verifyPassword(dto.password, user.passwordHash)) {
			await this.auditService?.record({
				action: AuditAction.LOGIN,
				userId: user?.id,
				success: false,
				ipAddress,
				metadata: { email: dto.email }
			});
			throw new UnauthorizedException('Invalid email or password.');
		}
		await this.auditService?.record({ action: AuditAction.LOGIN, userId: user.id, success: true, ipAddress });

		const tokens = await this.issueTokens(user);

		return {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			user: this.sanitizeUser(user)
		};
	}

	async createSocialAuthorizationUrl(providerValue: string, redirectUri?: string): Promise<{ url: string }> {
		const provider = this.parseSocialProvider(providerValue);
		const frontendRedirectUri = this.resolveFrontendRedirectUri(redirectUri);
		const codeVerifier = this.createCodeVerifier();
		const state = await this.jwtService.signAsync(
			{ provider, frontendRedirectUri, codeVerifier },
			{ secret: this.getSocialStateSecret(), expiresIn: '10m' }
		);

		const url = this.oauthProviderService.createAuthorizationUrl(provider, frontendRedirectUri, codeVerifier, state);
		return { url };
	}

	async completeSocialLogin(providerValue: string, callback: SocialCallback): Promise<string> {
		let frontendRedirectUri = this.resolveFrontendRedirectUri();

		try {
			const provider = this.parseSocialProvider(providerValue);

			if (callback.error) {
				throw new UnauthorizedException(`Social login was cancelled or rejected: ${callback.error}`);
			}

			if (!callback.code || !callback.state) {
				throw new UnauthorizedException('Missing social login callback parameters.');
			}

			const state = await this.jwtService.verifyAsync<SocialState>(callback.state, {
				secret: this.getSocialStateSecret()
			});
			frontendRedirectUri = this.resolveFrontendRedirectUri(state.frontendRedirectUri);

			if (state.provider !== provider) {
				throw new UnauthorizedException('Invalid social login state.');
			}

			const profile = await this.oauthProviderService.fetchUserProfile(provider, callback.code, state.codeVerifier);
			const authResponse = await this.socialUserService.findOrCreateUserFromProfile(profile, async (user) => {
				const tokens = await this.issueTokens(user);
				return {
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
					user: this.sanitizeUser(user)
				};
			});

			return this.buildFrontendRedirect(frontendRedirectUri, {
				accessToken: authResponse.accessToken,
				refreshToken: authResponse.refreshToken
			});
		} catch (error) {
			return this.buildFrontendRedirect(frontendRedirectUri, {
				error: error instanceof Error ? error.message : 'Social login failed.'
			});
		}
	}

	async refresh(refreshToken: string): Promise<AuthResponse> {
		const payload = await this.jwtService.verifyAsync<{ sub: string; authVersion?: number }>(refreshToken, {
			secret: this.getRefreshSecret()
		});
		const user = await this.usersRepository.findOne({ where: { id: payload.sub, isActive: true } });

		if (!user || (payload.authVersion ?? 0) !== (user.authVersion ?? 0) || !user.refreshTokenHash || !this.verifyPassword(refreshToken, user.refreshTokenHash)) {
			throw new UnauthorizedException('Invalid refresh token.');
		}

		const tokens = await this.issueTokens(user);

		return {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			user: this.sanitizeUser(user)
		};
	}

	async logout(userId: string, refreshToken?: string, ipAddress?: string): Promise<{ message: string }> {
		const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });

		if (!user) {
			throw new NotFoundException('No active user found.');
		}

		if (refreshToken && user.refreshTokenHash && !this.verifyPassword(refreshToken, user.refreshTokenHash)) {
			throw new UnauthorizedException('Invalid refresh token.');
		}

		await this.usersRepository.update(
			{ id: user.id, authVersion: user.authVersion ?? 0, refreshTokenHash: user.refreshTokenHash ?? IsNull() },
			{ refreshTokenHash: null }
		);
		await this.auditService?.record({ action: AuditAction.LOGOUT, userId, success: true, ipAddress });

		return { message: 'Logged out successfully.' };
	}

	async requestPasswordReset(email: string, language?: PreferredLanguage): Promise<{ message: string }> {
		const response = { message: 'If the account exists, a password reset token has been issued.' };
		const user = await this.usersRepository.findOne({ where: { email, isActive: true } });
		if (!user) return response;
		const resetToken = randomBytes(32).toString('hex');
		const tokenHash = this.hashToken(resetToken);
		const ttlMinutes = Number(this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL_MINUTES') ?? '15');
		const issued = await this.usersRepository.update(
			{ id: user.id, isActive: true, authVersion: user.authVersion ?? 0 },
			{ resetPasswordTokenHash: tokenHash, resetPasswordExpiresAt: new Date(Date.now() + ttlMinutes * 60_000) }
		);
		if (issued.affected !== 1) return response;
		try {
			await this.emailService.sendPasswordResetEmail(user.email, user.username, resetToken, ttlMinutes, language ?? user.preferredLanguage);
		} catch (error) {
			this.logger.error({
				event: 'password_reset_delivery_failed',
				userId: user.id,
				errorType: error instanceof Error ? error.name : 'UnknownError',
				message: 'Reset email delivery failed; revoking the issued token. Check email delivery health and provider configuration.'
			});
			// Only revoke our token; a newer request may already have replaced it.
			try {
				await this.usersRepository.update(
					{ id: user.id, resetPasswordTokenHash: tokenHash },
					{ resetPasswordTokenHash: null, resetPasswordExpiresAt: null }
				);
			} catch {
				this.logger.error({ event: 'password_reset_revocation_failed', userId: user.id, message: 'Could not revoke an undelivered reset token. Database intervention may be required.' });
			}
		}
		return response;
	}

	async resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
		const tokenHash = this.hashToken(resetToken);
		// PostgreSQL rechecks this predicate after waiting on a concurrent row update.
		const result = await this.usersRepository.createQueryBuilder()
			.update(UserEntity)
			.set({
				passwordHash: this.hashPassword(newPassword),
				refreshTokenHash: null,
				resetPasswordTokenHash: null,
				resetPasswordExpiresAt: null,
				authVersion: () => '"authVersion" + 1'
			})
			.where('"isActive" = true AND "resetPasswordTokenHash" = :tokenHash AND "resetPasswordExpiresAt" > CURRENT_TIMESTAMP', { tokenHash })
			.returning(['id'])
			.execute();
		if (result.affected !== 1) throw new UnauthorizedException('Invalid, expired or already used password reset token.');
		await this.auditService?.record({ action: AuditAction.PASSWORD_RESET, userId: result.raw[0].id, success: true });

		return { message: 'Password updated successfully.' };
	}

	async me(userId: string): Promise<SafeUser> {
		const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });

		if (!user) {
			throw new NotFoundException('No active user found. Register or log in first.');
		}

		return this.sanitizeUser(user);
	}

	async changePassword(userId: string, currentPassword: string, newPassword: string, ipAddress?: string): Promise<{ message: string }> {
		const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });

		if (!user) {
			throw new NotFoundException('No active user found.');
		}

		if (!this.verifyPassword(currentPassword, user.passwordHash)) {
			throw new UnauthorizedException('Current password is incorrect.');
		}

		const result = await this.usersRepository.createQueryBuilder().update(UserEntity).set({
			passwordHash: this.hashPassword(newPassword),
			refreshTokenHash: null,
			resetPasswordTokenHash: null,
			resetPasswordExpiresAt: null
		}).where('"id" = :id AND "isActive" = true AND "authVersion" = :version AND "passwordHash" = :passwordHash', {
			id: user.id, version: user.authVersion ?? 0, passwordHash: user.passwordHash
		}).execute();
		if (result.affected !== 1) throw new UnauthorizedException('Credentials changed. Please log in again.');
		await this.auditService?.record({ action: AuditAction.PASSWORD_CHANGE, userId, success: true, ipAddress });

		return { message: 'Password updated successfully.' };
	}

	async verifyEmail(token: string): Promise<{ message: string }> {
		const tokenHash = this.hashToken(token);
		const user = await this.usersRepository.findOne({
			where: {
				isActive: true,
				emailVerified: false,
				emailVerificationTokenHash: tokenHash,
				emailVerificationExpiresAt: MoreThan(new Date())
			}
		});

		if (!user) {
			throw new UnauthorizedException('Invalid or expired email verification token.');
		}

		user.emailVerified = true;
		user.emailVerificationTokenHash = null;
		user.emailVerificationExpiresAt = null;
		await this.usersRepository.save({ id: user.id, emailVerified: true, emailVerificationTokenHash: null, emailVerificationExpiresAt: null });

		return { message: 'Email verified successfully.' };
	}

	async resendVerificationEmail(userId: string): Promise<{ message: string; verificationToken?: string }> {
		const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });

		if (!user) {
			throw new NotFoundException('No active user found.');
		}

		if (user.emailVerified) {
			throw new BadRequestException('This email address is already verified.');
		}

		const verificationToken = await this.issueEmailVerificationToken(user);
		await this.emailService.sendVerificationEmail(user.email, user.username, verificationToken, user.preferredLanguage);
		const shouldExposeVerificationToken = (this.configService.get<string>('AUTH_EXPOSE_VERIFICATION_TOKEN') ?? 'false').toLowerCase() === 'true';

		return {
			message: 'A new verification email has been issued.',
			...(shouldExposeVerificationToken ? { verificationToken } : {})
		};
	}

	private parseSocialProvider(provider: string): SocialAuthProvider {
		if (SOCIAL_PROVIDERS.includes(provider as SocialAuthProvider)) {
			return provider as SocialAuthProvider;
		}

		throw new BadRequestException('Unsupported social login provider.');
	}

	private createCodeVerifier(): string {
		return randomBytes(48).toString('base64url');
	}

	private resolveFrontendRedirectUri(redirectUri?: string): string {
		const fallback = this.configService.get<string>('AUTH_FRONTEND_REDIRECT_URL') ?? 'http://localhost:4200/#/auth/social/callback';
		const resolved = redirectUri || fallback;
		const allowedOrigins = (
			this.configService.get<string>('AUTH_ALLOWED_REDIRECT_ORIGINS') ??
			this.configService.get<string>('CORS_ORIGINS') ??
			'http://localhost:4200'
		)
			.split(',')
			.map((origin) => origin.trim())
			.filter(Boolean);

		try {
			const origin = new URL(resolved).origin;

			if (!allowedOrigins.includes(origin)) {
				throw new BadRequestException('Social login redirect URI origin is not allowed.');
			}
		} catch (error) {
			if (error instanceof BadRequestException) {
				throw error;
			}

			throw new BadRequestException('Invalid social login redirect URI.');
		}

		return resolved;
	}

	private buildFrontendRedirect(redirectUri: string, params: Record<string, string>): string {
		const query = new URLSearchParams(params).toString();
		return `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}${query}`;
	}

	private getRequiredConfig(key: string): string {
		const value = this.configService.get<string>(key);

		if (!value) {
			throw new BadRequestException(`${key} is not configured.`);
		}

		return value;
	}

	private getSocialStateSecret(): string {
		return this.configService.get<string>('AUTH_SOCIAL_STATE_SECRET') ?? this.getRefreshSecret();
	}

	private hashToken(token: string): string {
		return createHash('sha256').update(token).digest('hex');
	}

	private hashPassword(password: string): string {
		const salt = randomBytes(16).toString('hex');
		const hash = scryptSync(password, salt, 64).toString('hex');
		return `${salt}:${hash}`;
	}

	private verifyPassword(password: string, storedValue: string): boolean {
		const [salt, expectedHash] = storedValue.split(':');

		if (!salt || !expectedHash) {
			return false;
		}

		const actualHash = scryptSync(password, salt, 64).toString('hex');
		return timingSafeEqual(Buffer.from(actualHash, 'hex'), Buffer.from(expectedHash, 'hex'));
	}

	private createAccessToken(user: UserEntity): string {
		return this.jwtService.sign({
			sub: user.id,
			email: user.email,
			username: user.username,
			role: user.role,
			authVersion: user.authVersion ?? 0
		});
	}

	private createRefreshToken(user: UserEntity): string {
		return this.jwtService.sign(
			{
				sub: user.id,
				email: user.email,
				username: user.username,
				role: user.role,
				authVersion: user.authVersion ?? 0,
				jti: randomBytes(16).toString('hex')
			},
			{
				secret: this.getRefreshSecret(),
				expiresIn: (this.configService.get<string>('JWT_REFRESH_TOKEN_TTL') ?? '7d') as StringValue
			}
		);
	}

	private getRefreshSecret(): string {
		return this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'strollbar-dev-refresh-secret';
	}

	private async issueTokens(user: UserEntity): Promise<{ accessToken: string; refreshToken: string }> {
		const accessToken = this.createAccessToken(user);
		const refreshToken = this.createRefreshToken(user);

		const result = await this.usersRepository.update(
			{ id: user.id, isActive: true, authVersion: user.authVersion ?? 0, passwordHash: user.passwordHash },
			{ refreshTokenHash: this.hashPassword(refreshToken) }
		);
		if (result.affected !== 1) throw new UnauthorizedException('Credentials changed. Please log in again.');

		return { accessToken, refreshToken };
	}

	private async issueEmailVerificationToken(user: UserEntity): Promise<string> {
		const verificationToken = randomBytes(32).toString('hex');
		const ttlMinutes = Number(this.configService.get<string>('EMAIL_VERIFICATION_TOKEN_TTL_MINUTES') ?? '1440');

		user.emailVerificationTokenHash = this.hashToken(verificationToken);
		user.emailVerificationExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
		await this.usersRepository.save({ id: user.id, emailVerificationTokenHash: user.emailVerificationTokenHash, emailVerificationExpiresAt: user.emailVerificationExpiresAt });

		return verificationToken;
	}

	private sanitizeUser(user: UserEntity): SafeUser {
		const {
			passwordHash: _passwordHash,
			refreshTokenHash: _refreshTokenHash,
			resetPasswordTokenHash: _resetPasswordTokenHash,
			resetPasswordExpiresAt: _resetPasswordExpiresAt,
			authVersion: _authVersion,
			emailVerificationTokenHash: _emailVerificationTokenHash,
			emailVerificationExpiresAt: _emailVerificationExpiresAt,
			...safeUser
		} = user;
		return safeUser;
	}
}
