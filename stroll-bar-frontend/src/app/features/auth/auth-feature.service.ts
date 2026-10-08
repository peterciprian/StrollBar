import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
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
		return this.api.getSocialAuthStartUrl(provider, this.getSocialCallbackUrl()).pipe(tap((response) => (window.location.href = response.url)));
	}

	completeSocialLogin(accessToken: string, refreshToken: string): void {
		this.tokenStorage.setTokens(accessToken, refreshToken);
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
		const returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'];
		const callbackUrl = `${window.location.origin}${window.location.pathname}#/auth/social/callback`;

		if (typeof returnUrl !== 'string' || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
			return callbackUrl;
		}

		return `${callbackUrl}?returnUrl=${encodeURIComponent(returnUrl)}`;
	}
}
