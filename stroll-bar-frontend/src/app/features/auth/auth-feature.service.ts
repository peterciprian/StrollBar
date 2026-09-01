import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiClientService } from '../../core/api/api-client.service';
import {
	ChangePasswordRequest,
	LoginRequest,
	RegisterRequest,
	SocialAuthProvider,
	UpdateUserRequest,
	VerifyEmailRequest
} from '../../core/api/models';
import { TokenStorageService } from '../../core/services/token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthFeatureService {
	private readonly api = inject(ApiClientService);
	private readonly tokenStorage = inject(TokenStorageService);
	private readonly router = inject(Router);

	register(input: RegisterRequest) {
		return this.api.register(input).pipe(
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
		this.tokenStorage.clear();

		// Best-effort revoke: the client-side session is already cleared regardless of the outcome.
		return this.api.logout({ refreshToken }).pipe(catchError(() => of(null)));
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

	private getSocialCallbackUrl(): string {
		const returnUrl = this.router.parseUrl(this.router.url).queryParams['returnUrl'];
		const callbackUrl = `${window.location.origin}${window.location.pathname}#/auth/social/callback`;

		if (typeof returnUrl !== 'string' || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
			return callbackUrl;
		}

		return `${callbackUrl}?returnUrl=${encodeURIComponent(returnUrl)}`;
	}
}
