import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ApiClientService } from '../../core/api/api-client.service';
import { AuthRefreshService } from '../../core/services/auth-refresh.service';
import { LanguageService } from '../../core/services/language.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { AuthFeatureService } from './auth-feature.service';

describe('AuthFeatureService', () => {
	let api: {
		register: jest.Mock;
		login: jest.Mock;
		logout: jest.Mock;
		me: jest.Mock;
		updateMe: jest.Mock;
		changePassword: jest.Mock;
		verifyEmail: jest.Mock;
		resendVerificationEmail: jest.Mock;
		getSocialAuthStartUrl: jest.Mock;
		requestPasswordReset: jest.Mock;
		resetPassword: jest.Mock;
	};
	let refreshService: { clearRefreshState: jest.Mock };
	let store: { dispatch: jest.Mock };
	let tokenStorage: { setTokens: jest.Mock; getRefreshToken: jest.Mock; clear: jest.Mock };
	let languageService: { currentLang: jest.Mock };

	beforeEach(() => {
		api = {
			register: jest.fn(),
			login: jest.fn(),
			logout: jest.fn(),
			me: jest.fn(),
			updateMe: jest.fn(),
			changePassword: jest.fn(),
			verifyEmail: jest.fn(),
			resendVerificationEmail: jest.fn(),
			getSocialAuthStartUrl: jest.fn(),
			requestPasswordReset: jest.fn(),
			resetPassword: jest.fn()
		};
		refreshService = { clearRefreshState: jest.fn() };
		store = { dispatch: jest.fn() };
		tokenStorage = { setTokens: jest.fn(), getRefreshToken: jest.fn(), clear: jest.fn() };
		languageService = { currentLang: jest.fn(() => 'en') };

		TestBed.configureTestingModule({
			providers: [
				AuthFeatureService,
				{ provide: ApiClientService, useValue: api },
				{ provide: TokenStorageService, useValue: tokenStorage },
				{ provide: LanguageService, useValue: languageService },
				{ provide: AuthRefreshService, useValue: refreshService },
				{ provide: Store, useValue: store },
				{ provide: Router, useValue: { url: '/auth/login', parseUrl: jest.fn(() => ({ queryParams: {} })) } }
			]
		});
	});

	it('registers with the current language and stores returned tokens', async () => {
		const user = { id: 'user-1', email: 'walker@example.com' };
		api.register.mockReturnValue(of({ accessToken: 'access-token', refreshToken: 'refresh-token', user }));
		const service = TestBed.inject(AuthFeatureService);

		await expect(
			firstValueFrom(service.register({ username: 'walker', email: 'walker@example.com', password: 'StrollWalk!2026' }))
		).resolves.toBe(user);
		expect(api.register).toHaveBeenCalledWith({
			username: 'walker',
			email: 'walker@example.com',
			password: 'StrollWalk!2026',
			preferredLanguage: 'en'
		});
		expect(tokenStorage.setTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
	});

	it('logs in and stores returned tokens', async () => {
		const user = { id: 'user-1', email: 'walker@example.com' };
		api.login.mockReturnValue(of({ accessToken: 'access-token', refreshToken: 'refresh-token', user }));
		const service = TestBed.inject(AuthFeatureService);

		await expect(firstValueFrom(service.login({ email: 'walker@example.com', password: 'StrollWalk!2026' }))).resolves.toBe(user);
		expect(tokenStorage.setTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
	});

	it('clears local tokens after logout even when the API call fails', async () => {
		tokenStorage.getRefreshToken.mockReturnValue('refresh-token');
		api.logout.mockReturnValue(throwError(() => new Error('network failed')));
		const service = TestBed.inject(AuthFeatureService);

		await expect(firstValueFrom(service.logout())).resolves.toBeNull();
		expect(api.logout).toHaveBeenCalledWith({ refreshToken: 'refresh-token' });
		expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
	});

	it('stores tokens from a completed social login callback', () => {
		const service = TestBed.inject(AuthFeatureService);

		service.completeSocialLogin('social-access-token', 'social-refresh-token');

		expect(tokenStorage.setTokens).toHaveBeenCalledWith('social-access-token', 'social-refresh-token');
	});

	describe('password reset', () => {
		const resetToken = 'a'.repeat(64);

		it('requests a reset with the trimmed email and current language without exposing the response body', async () => {
			api.requestPasswordReset.mockReturnValue(of({ message: 'If the account exists...', resetToken: 'leaked-debug-token' }));
			const service = TestBed.inject(AuthFeatureService);

			await expect(firstValueFrom(service.requestPasswordReset('  walker@example.com  '))).resolves.toBeUndefined();
			expect(api.requestPasswordReset).toHaveBeenCalledWith({ email: 'walker@example.com', preferredLanguage: 'en' });
			expect(tokenStorage.setTokens).not.toHaveBeenCalled();
			expect(store.dispatch).not.toHaveBeenCalled();
		});

		it('falls back to Hungarian when the active language is not supported', async () => {
			languageService.currentLang.mockReturnValue(null);
			api.requestPasswordReset.mockReturnValue(of({ message: 'ok' }));
			const service = TestBed.inject(AuthFeatureService);

			await firstValueFrom(service.requestPasswordReset('walker@example.com'));

			expect(api.requestPasswordReset).toHaveBeenCalledWith({ email: 'walker@example.com', preferredLanguage: 'hu' });
		});

		it('propagates request failures to the caller', async () => {
			const error = new HttpErrorResponse({ status: 429 });
			api.requestPasswordReset.mockReturnValue(throwError(() => error));
			const service = TestBed.inject(AuthFeatureService);

			await expect(firstValueFrom(service.requestPasswordReset('walker@example.com'))).rejects.toBe(error);
		});

		it('confirms the reset and clears the local session without calling logout or logging in', async () => {
			api.resetPassword.mockReturnValue(of({ message: 'Password updated successfully.' }));
			const service = TestBed.inject(AuthFeatureService);

			await expect(firstValueFrom(service.resetPassword({ resetToken, newPassword: 'StrollWalk!2026' }))).resolves.toBeUndefined();
			expect(api.resetPassword).toHaveBeenCalledWith({ resetToken, newPassword: 'StrollWalk!2026' });
			expect(refreshService.clearRefreshState).toHaveBeenCalledTimes(1);
			expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: '[Auth] Session Expired' }));
			expect(api.logout).not.toHaveBeenCalled();
			expect(api.login).not.toHaveBeenCalled();
			expect(tokenStorage.setTokens).not.toHaveBeenCalled();
		});

		it('keeps the local session when the reset is rejected', async () => {
			const error = new HttpErrorResponse({ status: 401 });
			api.resetPassword.mockReturnValue(throwError(() => error));
			const service = TestBed.inject(AuthFeatureService);

			await expect(firstValueFrom(service.resetPassword({ resetToken, newPassword: 'StrollWalk!2026' }))).rejects.toBe(error);
			expect(refreshService.clearRefreshState).not.toHaveBeenCalled();
			expect(store.dispatch).not.toHaveBeenCalled();
		});
	});
});
