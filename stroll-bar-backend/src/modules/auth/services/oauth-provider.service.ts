import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { SocialAuthProvider } from '../entities/social-identity.entity';
import { withTimeoutAndRetry, withTimeout } from '../../../common/utils/retry.util';
import { normalizeExternalApiError, logExternalApiError, externalApiErrorToHttpException } from '../../../common/utils/external-api-error.util';

export type SocialProfile = {
	provider: SocialAuthProvider;
	providerUserId: string;
	email?: string;
	emailVerified?: boolean;
	username?: string;
	displayName?: string;
	profileImageUrl?: string;
};

type SocialState = {
	provider: SocialAuthProvider;
	frontendRedirectUri: string;
	codeVerifier: string;
};

type JwtVerifyOptions = {
	jwksUri: string;
	audience: string;
	issuer: string | string[];
};

/**
 * Handles OAuth provider-specific logic: building authorization URLs,
 * exchanging authorization codes for tokens, and fetching user profiles.
 * Centralizes provider implementations and reduces coupling in the main auth service.
 *
 * Includes resilience patterns: timeouts, retries, and error normalization.
 */
@Injectable()
export class OAuthProviderService {
	private readonly jwksClients: Map<string, any> = new Map();
	private readonly logger = new Logger(OAuthProviderService.name);
	private readonly oauthTimeoutMs: number;
	private readonly oauthRetryAttempts: number;

	constructor(
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService
	) {
		this.oauthTimeoutMs = Number(this.configService.get<string>('OAUTH_REQUEST_TIMEOUT_MS') ?? '10000');
		this.oauthRetryAttempts = Number(this.configService.get<string>('OAUTH_REQUEST_RETRY_ATTEMPTS') ?? '3');
	}

	/**
	 * Create an authorization URL for the given OAuth provider.
	 */
	createAuthorizationUrl(provider: SocialAuthProvider, redirectUri: string, codeVerifier: string, state: string): string {
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
			return url.toString();
		}

		if (provider === 'apple') {
			const url = new URL('https://appleid.apple.com/auth/authorize');
			url.searchParams.set('client_id', this.getRequiredConfig('APPLE_CLIENT_ID'));
			url.searchParams.set('redirect_uri', callbackUrl);
			url.searchParams.set('response_type', 'code');
			url.searchParams.set('response_mode', 'form_post');
			url.searchParams.set('scope', 'name email');
			url.searchParams.set('state', state);
			return url.toString();
		}

		if (provider === 'facebook') {
			const url = new URL('https://www.facebook.com/v20.0/dialog/oauth');
			url.searchParams.set('client_id', this.getRequiredConfig('FACEBOOK_APP_ID'));
			url.searchParams.set('redirect_uri', callbackUrl);
			url.searchParams.set('response_type', 'code');
			url.searchParams.set('scope', 'email,public_profile');
			url.searchParams.set('state', state);
			return url.toString();
		}

		// Twitter
		const url = new URL('https://twitter.com/i/oauth2/authorize');
		url.searchParams.set('client_id', this.getRequiredConfig('TWITTER_CLIENT_ID'));
		url.searchParams.set('redirect_uri', callbackUrl);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('scope', 'tweet.read users.read offline.access');
		url.searchParams.set('state', state);
		url.searchParams.set('code_challenge', this.createCodeChallenge(codeVerifier));
		url.searchParams.set('code_challenge_method', 'S256');
		return url.toString();
	}

	/**
	 * Fetch the user profile from the OAuth provider using the authorization code.
	 */
	async fetchUserProfile(provider: SocialAuthProvider, code: string, codeVerifier: string): Promise<SocialProfile> {
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
			issuer: ['https://appleid.apple.com']
		});

		return {
			provider: 'apple',
			providerUserId: this.getJwtString(payload, 'sub'),
			email: this.getOptionalJwtString(payload, 'email'),
			emailVerified: true // Apple always verifies before redirecting
		};
	}

	private async fetchFacebookProfile(code: string): Promise<SocialProfile> {
		const tokenResponse = await this.postForm<{ access_token?: string }>('https://graph.facebook.com/v20.0/oauth/access_token', {
			client_id: this.getRequiredConfig('FACEBOOK_APP_ID'),
			client_secret: this.getRequiredConfig('FACEBOOK_APP_SECRET'),
			code,
			redirect_uri: this.getProviderCallbackUrl('facebook')
		});

		if (!tokenResponse.access_token) {
			throw new UnauthorizedException('Facebook did not return an access token.');
		}

		const userResponse = await this.getJson<{ id?: string; email?: string; name?: string; picture?: { data?: { url?: string } } }>(
			`https://graph.facebook.com/v20.0/me?access_token=${tokenResponse.access_token}&fields=id,email,name,picture`
		);

		return {
			provider: 'facebook',
			providerUserId: this.getJwtString(userResponse, 'id'),
			email: this.getOptionalJwtString(userResponse, 'email'),
			emailVerified: true, // Facebook provides verified emails
			displayName: this.getOptionalJwtString(userResponse, 'name'),
			profileImageUrl: this.getOptionalJwtString(userResponse, 'picture.data.url')
		};
	}

	private async fetchTwitterProfile(code: string, codeVerifier: string): Promise<SocialProfile> {
		const tokenResponse = await this.postForm<{ access_token?: string }>('https://api.twitter.com/2/oauth2/token', {
			client_id: this.getRequiredConfig('TWITTER_CLIENT_ID'),
			client_secret: this.getRequiredConfig('TWITTER_CLIENT_SECRET'),
			code,
			code_verifier: codeVerifier,
			grant_type: 'authorization_code',
			redirect_uri: this.getProviderCallbackUrl('twitter')
		});

		if (!tokenResponse.access_token) {
			throw new UnauthorizedException('Twitter did not return an access token.');
		}

		const userResponse = await this.getJson<{ data?: { id?: string; username?: string; name?: string } }>(
			'https://api.twitter.com/2/users/me?user.fields=id,username,name,profile_image_url',
			{ Authorization: `Bearer ${tokenResponse.access_token}` }
		);

		const user = userResponse.data;
		if (!user) {
			throw new UnauthorizedException('Twitter did not return user data.');
		}

		return {
			provider: 'twitter',
			providerUserId: this.getJwtString(user, 'id'),
			username: this.getOptionalJwtString(user, 'username'),
			displayName: this.getOptionalJwtString(user, 'name'),
			emailVerified: false // Twitter OAuth does not provide email
		};
	}

	private getProviderCallbackUrl(provider: SocialAuthProvider): string {
		const baseUrl = this.getRequiredConfig('BACKEND_URL');
		return `${baseUrl}/auth/social/${provider}/callback`;
	}

	private createCodeVerifier(): string {
		return Buffer.from(require('node:crypto').randomBytes(32)).toString('base64url');
	}

	private createCodeChallenge(codeVerifier: string): string {
		return Buffer.from(createHash('sha256').update(codeVerifier).digest()).toString('base64url');
	}

	private getAppleClientSecret(clientId: string): string {
		const teamId = this.getRequiredConfig('APPLE_TEAM_ID');
		const keyId = this.getRequiredConfig('APPLE_KEY_ID');
		const privateKey = this.getRequiredConfig('APPLE_PRIVATE_KEY');

		const now = Math.floor(Date.now() / 1000);
		const expiresAt = now + 600; // 10 minutes

		return require('jsonwebtoken').sign(
			{
				iss: teamId,
				sub: clientId,
				aud: 'https://appleid.apple.com',
				iat: now,
				exp: expiresAt
			},
			privateKey,
			{ algorithm: 'ES256', keyid: keyId }
		);
	}

	private async postForm<T>(url: string, data: Record<string, string>): Promise<T> {
		const body = new URLSearchParams(data).toString();
		const providerName = new URL(url).hostname;

		try {
			const result = await withTimeoutAndRetry(
				async () => {
					const response = await fetch(url, {
						method: 'POST',
						headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
						body
					});

					if (!response.ok) {
						const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
						(error as any).status = response.status;
						(error as any).statusText = response.statusText;
						throw error;
					}

					return response.json() as Promise<T>;
				},
				this.oauthTimeoutMs,
				{ maxAttempts: this.oauthRetryAttempts }
			);

			return result;
		} catch (error) {
			const normalized = normalizeExternalApiError(error, `OAuth provider (${providerName}) token exchange`);
			logExternalApiError(normalized, 'OAuthProviderService.postForm', this.logger);
			throw externalApiErrorToHttpException(normalized, 401);
		}
	}

	private async getJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
		const providerName = new URL(url).hostname;

		try {
			const result = await withTimeoutAndRetry(
				async () => {
					const response = await fetch(url, { headers });

					if (!response.ok) {
						const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
						(error as any).status = response.status;
						(error as any).statusText = response.statusText;
						throw error;
					}

					return response.json() as Promise<T>;
				},
				this.oauthTimeoutMs,
				{ maxAttempts: this.oauthRetryAttempts }
			);

			return result;
		} catch (error) {
			const normalized = normalizeExternalApiError(error, `OAuth provider (${providerName}) user fetch`);
			logExternalApiError(normalized, 'OAuthProviderService.getJson', this.logger);
			throw externalApiErrorToHttpException(normalized, 401);
		}
	}

	private async verifyProviderJwt(token: string, options: JwtVerifyOptions): Promise<any> {
		const decoded = jwt.decode(token, { complete: true });

		if (!decoded || typeof decoded === 'string') {
			throw new UnauthorizedException('Invalid JWT token.');
		}

		const { kid } = decoded.header;
		if (!kid) {
			throw new UnauthorizedException('Missing key ID in JWT header.');
		}

		try {
			if (!this.jwksClients.has(options.jwksUri)) {
				this.jwksClients.set(options.jwksUri, jwksClient({ jwksUri: options.jwksUri }));
			}

			const client = this.jwksClients.get(options.jwksUri)!;
			// Add timeout to JWKS key fetching
			const key = (await withTimeout(() => client.getSigningKey(kid), this.oauthTimeoutMs)) as any;
			const signingKey = key.getPublicKey();

			return new Promise((resolve, reject) => {
				const issuer = Array.isArray(options.issuer) ? (options.issuer as any) : (options.issuer as any);
				jwt.verify(
					token,
					signingKey,
					{ audience: options.audience, issuer } as any,
					(err: jwt.VerifyErrors | null, decoded: string | jwt.JwtPayload | undefined) => {
						if (err) reject(new UnauthorizedException(`JWT verification failed: ${err.message}`));
						else resolve(decoded);
					}
				);
			});
		} catch (error) {
			if (error instanceof UnauthorizedException) throw error;
			const normalized = normalizeExternalApiError(error, 'JWKS key verification');
			logExternalApiError(normalized, 'OAuthProviderService.verifyProviderJwt', this.logger);
			throw externalApiErrorToHttpException(normalized, 401);
		}
	}

	private getJwtString(payload: any, path: string): string {
		const value = this.getOptionalJwtString(payload, path);
		if (!value) {
			throw new UnauthorizedException(`Missing required JWT claim: ${path}`);
		}
		return value;
	}

	private getOptionalJwtString(payload: any, path: string): string | undefined {
		const parts = path.split('.');
		let value = payload;

		for (const part of parts) {
			value = value?.[part];
		}

		return typeof value === 'string' ? value : undefined;
	}

	private getOptionalJwtBoolean(payload: any, path: string): boolean | undefined {
		const parts = path.split('.');
		let value = payload;

		for (const part of parts) {
			value = value?.[part];
		}

		return typeof value === 'boolean' ? value : undefined;
	}

	private getRequiredConfig(key: string): string {
		const value = this.configService.get<string>(key);
		if (!value) {
			throw new Error(`Missing required configuration: ${key}`);
		}
		return value;
	}
}
