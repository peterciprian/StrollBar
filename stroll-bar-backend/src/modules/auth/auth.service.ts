import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { StringValue } from 'ms';
import { MoreThan, Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SocialAuthProvider, SocialIdentityEntity } from './entities/social-identity.entity';
import { UserEntity } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import { OAuthProviderService } from './services/oauth-provider.service';
import { SocialUserService } from './services/social-user.service';

type SafeUser = Pick<UserEntity, 'id' | 'username' | 'email' | 'profileImageUrl' | 'isActive' | 'role' | 'emailVerified' | 'createdAt' | 'updatedAt'>;
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
	constructor(
		@InjectRepository(UserEntity)
		private readonly usersRepository: Repository<UserEntity>,
		@InjectRepository(SocialIdentityEntity)
		private readonly socialIdentitiesRepository: Repository<SocialIdentityEntity>,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
		private readonly emailService: EmailService,
		private readonly oauthProviderService: OAuthProviderService,
		private readonly socialUserService: SocialUserService
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
			emailVerified: false
		});

		const savedUser = await this.usersRepository.save(user);
		const verificationToken = await this.issueEmailVerificationToken(savedUser);
		await this.emailService.sendVerificationEmail(savedUser.email, savedUser.username, verificationToken);
		const tokens = await this.issueTokens(savedUser);

		const shouldExposeVerificationToken = (this.configService.get<string>('AUTH_EXPOSE_VERIFICATION_TOKEN') ?? 'false').toLowerCase() === 'true';

		return {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			user: this.sanitizeUser(savedUser),
			...(shouldExposeVerificationToken ? { verificationToken } : {})
		};
	}

	async login(dto: LoginDto): Promise<AuthResponse> {
		const user = await this.usersRepository.findOne({ where: { email: dto.email } });

		if (!user || !this.verifyPassword(dto.password, user.passwordHash)) {
			throw new UnauthorizedException('Invalid email or password.');
		}

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
		const payload = await this.jwtService.verifyAsync<{ sub: string; email: string; username: string }>(refreshToken, {
			secret: this.getRefreshSecret()
		});
		const user = await this.usersRepository.findOne({ where: { id: payload.sub, isActive: true } });

		if (!user || !user.refreshTokenHash || !this.verifyPassword(refreshToken, user.refreshTokenHash)) {
			throw new UnauthorizedException('Invalid refresh token.');
		}

		const tokens = await this.issueTokens(user);

		return {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			user: this.sanitizeUser(user)
		};
	}

	async logout(userId: string, refreshToken?: string): Promise<{ message: string }> {
		const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });

		if (!user) {
			throw new NotFoundException('No active user found.');
		}

		if (refreshToken && user.refreshTokenHash && !this.verifyPassword(refreshToken, user.refreshTokenHash)) {
			throw new UnauthorizedException('Invalid refresh token.');
		}

		user.refreshTokenHash = null;
		await this.usersRepository.save(user);

		return { message: 'Logged out successfully.' };
	}

	async requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> {
		const user = await this.usersRepository.findOne({ where: { email } });

		if (!user) {
			return { message: 'If the account exists, a password reset token has been issued.' };
		}

		const resetToken = randomBytes(32).toString('hex');
		const ttlMinutes = Number(this.configService.get<string>('PASSWORD_RESET_TOKEN_TTL_MINUTES') ?? '15');

		user.resetPasswordTokenHash = this.hashToken(resetToken);
		user.resetPasswordExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
		await this.usersRepository.save(user);

		const shouldExposeResetToken = (this.configService.get<string>('AUTH_EXPOSE_RESET_TOKEN') ?? 'false').toLowerCase() === 'true';

		return {
			message: 'If the account exists, a password reset token has been issued.',
			...(shouldExposeResetToken ? { resetToken } : {})
		};
	}

	async resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
		const tokenHash = this.hashToken(resetToken);
		const user = await this.usersRepository.findOne({
			where: {
				isActive: true,
				resetPasswordTokenHash: tokenHash,
				resetPasswordExpiresAt: MoreThan(new Date())
			}
		});

		if (!user) {
			throw new UnauthorizedException('Invalid or expired password reset token.');
		}

		user.passwordHash = this.hashPassword(newPassword);
		user.refreshTokenHash = null;
		user.resetPasswordTokenHash = null;
		user.resetPasswordExpiresAt = null;
		await this.usersRepository.save(user);

		return { message: 'Password updated successfully.' };
	}

	async me(userId: string): Promise<SafeUser> {
		const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });

		if (!user) {
			throw new NotFoundException('No active user found. Register or log in first.');
		}

		return this.sanitizeUser(user);
	}

	async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
		const user = await this.usersRepository.findOne({ where: { id: userId, isActive: true } });

		if (!user) {
			throw new NotFoundException('No active user found.');
		}

		if (!this.verifyPassword(currentPassword, user.passwordHash)) {
			throw new UnauthorizedException('Current password is incorrect.');
		}

		user.passwordHash = this.hashPassword(newPassword);
		user.refreshTokenHash = null;
		await this.usersRepository.save(user);

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
		await this.usersRepository.save(user);

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
		await this.emailService.sendVerificationEmail(user.email, user.username, verificationToken);
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
			role: user.role
		});
	}

	private createRefreshToken(user: UserEntity): string {
		return this.jwtService.sign(
			{
				sub: user.id,
				email: user.email,
				username: user.username,
				role: user.role
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

		user.refreshTokenHash = this.hashPassword(refreshToken);
		await this.usersRepository.save(user);

		return { accessToken, refreshToken };
	}

	private async issueEmailVerificationToken(user: UserEntity): Promise<string> {
		const verificationToken = randomBytes(32).toString('hex');
		const ttlMinutes = Number(this.configService.get<string>('EMAIL_VERIFICATION_TOKEN_TTL_MINUTES') ?? '1440');

		user.emailVerificationTokenHash = this.hashToken(verificationToken);
		user.emailVerificationExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
		await this.usersRepository.save(user);

		return verificationToken;
	}

	private sanitizeUser(user: UserEntity): SafeUser {
		const {
			passwordHash: _passwordHash,
			refreshTokenHash: _refreshTokenHash,
			resetPasswordTokenHash: _resetPasswordTokenHash,
			resetPasswordExpiresAt: _resetPasswordExpiresAt,
			emailVerificationTokenHash: _emailVerificationTokenHash,
			emailVerificationExpiresAt: _emailVerificationExpiresAt,
			...safeUser
		} = user;
		return safeUser;
	}
}
