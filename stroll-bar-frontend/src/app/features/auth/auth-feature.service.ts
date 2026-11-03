import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, defer, of } from 'rxjs';
import { catchError, finalize, map, switchMap, tap } from 'rxjs/operators';
import { ApiClientService } from '../../core/api/api-client.service';
import {
	ChangePasswordRequest,
	LoginRequest,
	RegisterRequest,
	ResetPasswordRequest,
	SocialAuthProvider,
	UpdateUserRequest,
	VerifyEmailRequest
} from '../../core/api/models';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { LanguageService } from '../../core/services/language.service';
import { AuthRefreshService } from '../../core/services/auth-refresh.service';
import { sessionExpired } from './auth.state';

const SOCIAL_TRANSACTION_KEY = 'strollbar.socialTransaction';
type SocialTransaction = { verifier: string; expiresAt: number; returnUrl: string; transactionId?: string };

@Injectable({ providedIn: 'root' })
export class AuthFeatureService {
	private readonly api = inject(ApiClientService);
	private readonly tokenStorage = inject(TokenStorageService);
	private readonly router = inject(Router);
	private readonly languageService = inject(LanguageService);
	private readonly refreshService = inject(AuthRefreshService);
	private readonly store = inject(Store);

	register(input: RegisterRequest) {
		return this.api.register({ ...input, preferredLanguage: (this.languageService.currentLang() as 'hu' | 'en' | null) ?? 'hu' }).pipe(
			tap((response) => this.tokenStorage.setTokens(response.accessToken, response.refreshToken)),
			map((response) => response.user)
		);
	}

	login(input: LoginRequest) {
		return this.api.login(input).pipe(
			tap((response) => this.tokenStorage.setTokens(response.accessToken, response.refreshToken)),
			map((response) => response.user)
		);
	}

	startSocialLogin(provider: SocialAuthProvider) {
		return defer(async () => {
			const verifier = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
			const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
			const browserChallenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
			const returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'];
			const transaction: SocialTransaction = {
				verifier, expiresAt: Date.now() + 10 * 60_000,
				returnUrl: typeof returnUrl === 'string' && returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/explore'
			};
			// Tab-local proof is never accepted from a callback URL or stored in shared localStorage.
			sessionStorage.setItem(SOCIAL_TRANSACTION_KEY, JSON.stringify(transaction));
			return { transaction, browserChallenge };
		}).pipe(
			switchMap(({ transaction, browserChallenge }) => this.api.getSocialAuthStartUrl(provider, this.getSocialCallbackUrl(), browserChallenge).pipe(
				tap((response) => {
					if (!/^[a-f0-9]{64}$/.test(response.transactionId) ||
						this.readSocialTransaction()?.verifier !== transaction.verifier) {
						throw new Error('Social login transaction changed. Please start again.');
					}
					sessionStorage.setItem(SOCIAL_TRANSACTION_KEY, JSON.stringify({ ...transaction, transactionId: response.transactionId }));
					window.location.href = response.url;
				}),
				catchError((error: unknown) => {
					if (this.readSocialTransaction()?.verifier === transaction.verifier) sessionStorage.removeItem(SOCIAL_TRANSACTION_KEY);
					throw error;
				})
			))
		);
	}

	completeSocialLogin(code: string | null, transactionId: string | null): Observable<string> {
		return defer(() => {
			const transaction = this.readSocialTransaction();
			if (!code || !/^[a-f0-9]{64}$/.test(code) || !transactionId || !/^[a-f0-9]{64}$/.test(transactionId) ||
				!transaction || transaction.transactionId !== transactionId || transaction.expiresAt <= Date.now()) {
				throw new Error('Social login transaction is missing, mismatched or expired. Please start again.');
			}
			// Consume locally before sending: duplicate renders and replay cannot install credentials twice.
			sessionStorage.removeItem(SOCIAL_TRANSACTION_KEY);
			return this.api.exchangeSocialHandoff({ code, transactionId, verifier: transaction.verifier }).pipe(
				tap((response) => this.tokenStorage.setTokens(response.accessToken, response.refreshToken)),
				map(() => transaction.returnUrl)
			);
		});
	}

	logout() {
		const refreshToken = this.tokenStorage.getRefreshToken() ?? undefined;

		return this.api.logout({ refreshToken }).pipe(
			catchError(() => of(null)),
			finalize(() => this.tokenStorage.clear())
		);
	}

	loadMe() {
		return this.api.me();
	}

	updateProfile(input: UpdateUserRequest) {
		return this.api.updateMe(input);
	}

	changePassword(input: ChangePasswordRequest) {
		return this.api.changePassword(input);
	}

	verifyEmail(input: VerifyEmailRequest) {
		return this.api.verifyEmail(input);
	}

	resendVerificationEmail() {
		return this.api.resendVerificationEmail();
	}

	/**
	 * Always resolves the same way for existing and unknown accounts. The response body is dropped on
	 * purpose so a debug-only `resetToken` can never reach a component, the store or logs.
	 */
	requestPasswordReset(email: string): Observable<void> {
		return this.api
			.requestPasswordReset({ email: email.trim(), preferredLanguage: this.getPreferredLanguage() })
			.pipe(map(() => undefined));
	}

	/**
	 * A successful reset revokes every session server-side, so the local session is dropped without
	 * calling the logout endpoint (the refresh token is already invalid). No auto-login happens.
	 */
	resetPassword(input: ResetPasswordRequest): Observable<void> {
		return this.api.resetPassword(input).pipe(
			tap(() => this.clearLocalSession()),
			map(() => undefined)
		);
	}

	private clearLocalSession(): void {
		this.refreshService.clearRefreshState();
		this.store.dispatch(sessionExpired());
	}

	private getPreferredLanguage(): 'hu' | 'en' {
		return this.languageService.currentLang() === 'en' ? 'en' : 'hu';
	}

	private getSocialCallbackUrl(): string {
		return new URL('auth/social/callback', document.baseURI).href;
	}

	private readSocialTransaction(): SocialTransaction | null {
		try {
			const value = JSON.parse(sessionStorage.getItem(SOCIAL_TRANSACTION_KEY) ?? 'null') as SocialTransaction | null;
			if (!value || !/^[a-f0-9]{64}$/.test(value.verifier) || !Number.isFinite(value.expiresAt) ||
				typeof value.returnUrl !== 'string' || !value.returnUrl.startsWith('/') || value.returnUrl.startsWith('//')) {
				return null;
			}
			return value;
		} catch {
			return null;
		}
	}
}
