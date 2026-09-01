import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { StringValue } from 'ms';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SocialAuthProvider, SocialIdentityEntity } from './entities/social-identity.entity';
import { UserEntity } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';

type SafeUser = Pick<UserEntity, 'id' | 'username' | 'email' | 'profileImageUrl' | 'isActive' | 'role' | 'emailVerified' | 'createdAt' | 'updatedAt'>;
type AuthResponse = { accessToken: string; refreshToken: string; user: SafeUser };
type RegisterResponse = AuthResponse & { verificationToken?: string };
type SocialState = {
	provider: SocialAuthProvider;
	frontendRedirectUri: string;
	codeVerifier: string;
};
type SocialCallback = { code?: string; state?: string; error?: string };
type SocialProfile = {
	provider: SocialAuthProvider;
	providerUserId: string;
	email?: string;
	emailVerified?: boolean;
	username?: string;
	displayName?: string;
	profileImageUrl?: string;
};

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
		private readonly emailService: EmailService
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
		const callbackUrl = this.getProviderCallbackUrl(provider);

		if (provider === 'google') {
			const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
			url.searchParams.set('client_id', this.getRequiredConfig('GOOGLE_CLIENT_ID'));
			url.searchParams.set('redirect_uri', callbackUrl);
			url.searchParams.set('response_type', 'code');
			url.searchParams.set('scope', 'openid email profile');
			url.searchParams.set('state', state);
			url.searchParams.set('code_challenge', this.createCodeChallenge(codeVerifier));
			url.searchParams.set('code_challenge_method', 'S256');
			url.searchParams.set('prompt', 'select_account');
			return { url: url.toString() };
		}

		if (provider === 'apple') {
			const url = new URL('https://appleid.apple.com/auth/authorize');
			url.searchParams.set('client_id', this.getRequiredConfig('APPLE_CLIENT_ID'));
			url.searchParams.set('redirect_uri', callbackUrl);
			url.searchParams.set('response_type', 'code');
			url.searchParams.set('response_mode', 'form_post');
			url.searchParams.set('scope', 'name email');
			url.searchParams.set('state', state);
			return { url: url.toString() };
		}

		if (provider === 'facebook') {
			const url = new URL('https://www.facebook.com/v20.0/dialog/oauth');
			url.searchParams.set('client_id', this.getRequiredConfig('FACEBOOK_APP_ID'));
			url.searchParams.set('redirect_uri', callbackUrl);
			url.searchParams.set('response_type', 'code');
			url.searchParams.set('scope', 'email,public_profile');
			url.searchParams.set('state', state);
			return { url: url.toString() };
		}

		const url = new URL('https://twitter.com/i/oauth2/authorize');
		url.searchParams.set('client_id', this.getRequiredConfig('TWITTER_CLIENT_ID'));
		url.searchParams.set('redirect_uri', callbackUrl);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('scope', 'tweet.read users.read offline.access');
		url.searchParams.set('state', state);
		url.searchParams.set('code_challenge', this.createCodeChallenge(codeVerifier));
		url.searchParams.set('code_challenge_method', 'S256');
		return { url: url.toString() };
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

			const profile = await this.fetchSocialProfile(provider, callback.code, state.codeVerifier);
			const authResponse = await this.loginWithSocialProfile(profile);

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

		user.resetPasswordTokenHash = this.hashPassword(resetToken);
		user.resetPasswordExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
		await this.usersRepository.save(user);

		const shouldExposeResetToken = (this.configService.get<string>('AUTH_EXPOSE_RESET_TOKEN') ?? 'false').toLowerCase() === 'true';

		return {
			message: 'If the account exists, a password reset token has been issued.',
			...(shouldExposeResetToken ? { resetToken } : {})
		};
	}

	async resetPassword(resetToken: string, newPassword: string): Promise<{ message: string }> {
		const users = await this.usersRepository.find({ where: { isActive: true } });
		const user = users.find(
			(candidate) =>
				!!candidate.resetPasswordTokenHash &&
				!!candidate.resetPasswordExpiresAt &&
				candidate.resetPasswordExpiresAt.getTime() > Date.now() &&
				this.verifyPassword(resetToken, candidate.resetPasswordTokenHash)
		);

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
		const users = await this.usersRepository.find({ where: { isActive: true, emailVerified: false } });
		const user = users.find(
			(candidate) =>
				!!candidate.emailVerificationTokenHash &&
				!!candidate.emailVerificationExpiresAt &&
				candidate.emailVerificationExpiresAt.getTime() > Date.now() &&
				this.verifyPassword(token, candidate.emailVerificationTokenHash)
		);

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

	private async loginWithSocialProfile(profile: SocialProfile): Promise<AuthResponse> {
		const identity = await this.socialIdentitiesRepository.findOne({
			where: { provider: profile.provider, providerUserId: profile.providerUserId },
			relations: { user: true }
		});

		let user = identity?.user;

		if (user && !user.isActive) {
			throw new UnauthorizedException('This account is inactive.');
		}

		if (!user && profile.email && profile.emailVerified !== false) {
			user = (await this.usersRepository.findOne({ where: { email: profile.email, isActive: true } })) ?? undefined;
		}

		if (!user) {
			user = this.usersRepository.create({
				username: await this.createUniqueSocialUsername(profile),
				email: profile.email ?? this.createSyntheticSocialEmail(profile),
				passwordHash: this.hashPassword(randomBytes(48).toString('hex')),
				profileImageUrl: profile.profileImageUrl ?? null,
				isActive: true,
				// The provider already verified the email address, so no extra step is needed.
				emailVerified: !!profile.email && profile.emailVerified !== false
			});
			user = await this.usersRepository.save(user);
		} else if (!user.profileImageUrl && profile.profileImageUrl) {
			user.profileImageUrl = profile.profileImageUrl;
			user = await this.usersRepository.save(user);
		}

		if (!identity) {
			await this.socialIdentitiesRepository.save(
				this.socialIdentitiesRepository.create({
					provider: profile.provider,
					providerUserId: profile.providerUserId,
					userId: user.id,
					email: profile.email ?? null
				})
			);
		}

		const tokens = await this.issueTokens(user);

		return {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			user: this.sanitizeUser(user)
		};
	}

	private async fetchSocialProfile(provider: SocialAuthProvider, code: string, codeVerifier: string): Promise<SocialProfile> {
		if (provider === 'google') {
			return this.fetchGoogleProfile(code, codeVerifier);
		}

		if (provider === 'apple') {
			return this.fetchAppleProfile(code);
		}

		if (provider === 'facebook') {
			return this.fetchFacebookProfile(code);
		}

		return this.fetchTwitterProfile(code, codeVerifier);
	}

	private async fetchGoogleProfile(code: string, codeVerifier: string): Promise<SocialProfile> {
		const tokenResponse = await this.postForm<{ id_token?: string }>('https://oauth2.googleapis.com/token', {
			client_id: this.getRequiredConfig('GOOGLE_CLIENT_ID'),
			client_secret: this.getRequiredConfig('GOOGLE_CLIENT_SECRET'),
			code,
			code_verifier: codeVerifier,
			grant_type: 'authorization_code',
			redirect_uri: this.getProviderCallbackUrl('google')
		});

		if (!tokenResponse.id_token) {
			throw new UnauthorizedException('Google did not return an identity token.');
		}

		const payload = await this.verifyProviderJwt(tokenResponse.id_token, {
			jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
			audience: this.getRequiredConfig('GOOGLE_CLIENT_ID'),
			issuer: ['https://accounts.google.com', 'accounts.google.com']
		});

		return {
			provider: 'google',
			providerUserId: this.getJwtString(payload, 'sub'),
			email: this.getOptionalJwtString(payload, 'email'),
			emailVerified: this.getOptionalJwtBoolean(payload, 'email_verified'),
			displayName: this.getOptionalJwtString(payload, 'name'),
			profileImageUrl: this.getOptionalJwtString(payload, 'picture')
		};
	}

	private async fetchAppleProfile(code: string): Promise<SocialProfile> {
		const clientId = this.getRequiredConfig('APPLE_CLIENT_ID');
		const tokenResponse = await this.postForm<{ id_token?: string }>('https://appleid.apple.com/auth/token', {
			client_id: clientId,
			client_secret: this.getAppleClientSecret(clientId),
			code,
			grant_type: 'authorization_code',
			redirect_uri: this.getProviderCallbackUrl('apple')
		});

		if (!tokenResponse.id_token) {
			throw new UnauthorizedException('Apple did not return an identity token.');
		}

		const payload = await this.verifyProviderJwt(tokenResponse.id_token, {
			jwksUri: 'https://appleid.apple.com/auth/keys',
			audience: clientId,
			issuer: 'https://appleid.apple.com'
		});

		return {
			provider: 'apple',
			providerUserId: this.getJwtString(payload, 'sub'),
			email: this.getOptionalJwtString(payload, 'email'),
			emailVerified: this.getOptionalJwtBoolean(payload, 'email_verified')
		};
	}

	private async fetchFacebookProfile(code: string): Promise<SocialProfile> {
		const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
		tokenUrl.searchParams.set('client_id', this.getRequiredConfig('FACEBOOK_APP_ID'));
		tokenUrl.searchParams.set('client_secret', this.getRequiredConfig('FACEBOOK_APP_SECRET'));
		tokenUrl.searchParams.set('code', code);
		tokenUrl.searchParams.set('redirect_uri', this.getProviderCallbackUrl('facebook'));

		const tokenResponse = await this.fetchJson<{ access_token?: string }>(tokenUrl.toString());

		if (!tokenResponse.access_token) {
			throw new UnauthorizedException('Facebook did not return an access token.');
		}

		const profileUrl = new URL('https://graph.facebook.com/me');
		profileUrl.searchParams.set('fields', 'id,name,email,picture.type(large)');
		profileUrl.searchParams.set('access_token', tokenResponse.access_token);
		const profile = await this.fetchJson<{
			id?: string;
			name?: string;
			email?: string;
			picture?: { data?: { url?: string } };
		}>(profileUrl.toString());

		if (!profile.id) {
			throw new UnauthorizedException('Facebook profile did not include an id.');
		}

		return {
			provider: 'facebook',
			providerUserId: profile.id,
			email: profile.email,
			emailVerified: !!profile.email,
			displayName: profile.name,
			profileImageUrl: profile.picture?.data?.url
		};
	}

	private async fetchTwitterProfile(code: string, codeVerifier: string): Promise<SocialProfile> {
		const body: Record<string, string> = {
			client_id: this.getRequiredConfig('TWITTER_CLIENT_ID'),
			code,
			code_verifier: codeVerifier,
			grant_type: 'authorization_code',
			redirect_uri: this.getProviderCallbackUrl('twitter')
		};
		const clientSecret = this.configService.get<string>('TWITTER_CLIENT_SECRET');
		const headers = clientSecret ? { Authorization: `Basic ${Buffer.from(`${body.client_id}:${clientSecret}`).toString('base64')}` } : undefined;
		const tokenResponse = await this.postForm<{ access_token?: string }>('https://api.twitter.com/2/oauth2/token', body, headers);

		if (!tokenResponse.access_token) {
			throw new UnauthorizedException('Twitter did not return an access token.');
		}

		const profile = await this.fetchJson<{
			data?: { id?: string; username?: string; name?: string; profile_image_url?: string };
		}>('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
			Authorization: `Bearer ${tokenResponse.access_token}`
		});

		if (!profile.data?.id) {
			throw new UnauthorizedException('Twitter profile did not include an id.');
		}

		return {
			provider: 'twitter',
			providerUserId: profile.data.id,
			username: profile.data.username,
			displayName: profile.data.name,
			profileImageUrl: profile.data.profile_image_url
		};
	}

	private async postForm<T>(url: string, values: Record<string, string>, headers?: Record<string, string>): Promise<T> {
		return this.fetchJson<T>(
			url,
			{
				...headers,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			new URLSearchParams(values).toString()
		);
	}

	private async fetchJson<T>(url: string, headers?: Record<string, string>, body?: string): Promise<T> {
		const response = await fetch(url, {
			method: body ? 'POST' : 'GET',
			headers,
			body
		});
		const payload = (await response.json().catch(() => ({}))) as T & { error?: string; error_description?: string };

		if (!response.ok) {
			throw new UnauthorizedException(payload.error_description ?? payload.error ?? 'Social provider request failed.');
		}

		return payload;
	}

	private async verifyProviderJwt(
		token: string,
		options: { jwksUri: string; audience: string; issuer: string | [string, ...string[]] }
	): Promise<jwt.JwtPayload> {
		const client = jwksClient({ jwksUri: options.jwksUri });
		const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
			if (!header.kid) {
				callback(new Error('Identity token is missing a key id.'));
				return;
			}

			client
				.getSigningKey(header.kid)
				.then((key) => callback(null, key.getPublicKey()))
				.catch((error: Error) => callback(error));
		};

		return new Promise((resolve, reject) => {
			jwt.verify(
				token,
				getKey,
				{ audience: options.audience, issuer: options.issuer },
				(error: jwt.VerifyErrors | null, decoded: string | jwt.JwtPayload | undefined) => {
					if (error || typeof decoded !== 'object' || decoded === null) {
						reject(error ?? new Error('Invalid identity token.'));
						return;
					}

					resolve(decoded);
				}
			);
		});
	}

	private getAppleClientSecret(clientId: string): string {
		const configuredSecret = this.configService.get<string>('APPLE_CLIENT_SECRET');

		if (configuredSecret) {
			return configuredSecret;
		}

		const teamId = this.getRequiredConfig('APPLE_TEAM_ID');
		const keyId = this.getRequiredConfig('APPLE_KEY_ID');
		const privateKey = this.getRequiredConfig('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n');

		return jwt.sign({}, privateKey, {
			algorithm: 'ES256',
			audience: 'https://appleid.apple.com',
			expiresIn: '180d',
			issuer: teamId,
			keyid: keyId,
			subject: clientId
		});
	}

	private async createUniqueSocialUsername(profile: SocialProfile): Promise<string> {
		const rawBase = profile.username ?? profile.displayName ?? profile.email?.split('@')[0] ?? `${profile.provider}_user`;
		const normalizedBase =
			rawBase
				.toLowerCase()
				.replace(/[^a-z0-9_]+/g, '_')
				.replace(/^_+|_+$/g, '')
				.slice(0, 36) || `${profile.provider}_user`;

		for (let attempt = 0; attempt < 20; attempt += 1) {
			const suffix = attempt === 0 ? '' : `_${attempt}`;
			const username = `${normalizedBase}${suffix}`.slice(0, 50);
			const existingUser = await this.usersRepository.findOne({ where: { username } });

			if (!existingUser) {
				return username;
			}
		}

		return `${normalizedBase.slice(0, 25)}_${randomBytes(6).toString('hex')}`;
	}

	private createSyntheticSocialEmail(profile: SocialProfile): string {
		const digest = createHash('sha256').update(`${profile.provider}:${profile.providerUserId}`).digest('hex').slice(0, 32);
		return `${profile.provider}.${digest}@social.strollbar.local`;
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

	private createCodeChallenge(codeVerifier: string): string {
		return createHash('sha256').update(codeVerifier).digest('base64url');
	}

	private getProviderCallbackUrl(provider: SocialAuthProvider): string {
		return `${this.getBackendBaseUrl()}/auth/social/${provider}/callback`;
	}

	private getBackendBaseUrl(): string {
		return (this.configService.get<string>('AUTH_BACKEND_BASE_URL') ?? 'http://localhost:3000/v1').replace(/\/$/, '');
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

	private getJwtString(payload: jwt.JwtPayload, key: string): string {
		const value = payload[key];

		if (typeof value !== 'string' || !value) {
			throw new UnauthorizedException(`Identity token is missing ${key}.`);
		}

		return value;
	}

	private getOptionalJwtString(payload: jwt.JwtPayload, key: string): string | undefined {
		const value = payload[key];
		return typeof value === 'string' && value ? value : undefined;
	}

	private getOptionalJwtBoolean(payload: jwt.JwtPayload, key: string): boolean | undefined {
		const value = payload[key];

		if (typeof value === 'boolean') {
			return value;
		}

		if (value === 'true') {
			return true;
		}

		if (value === 'false') {
			return false;
		}

		return undefined;
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

		user.emailVerificationTokenHash = this.hashPassword(verificationToken);
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
