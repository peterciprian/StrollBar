import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { firstValueFrom, of, throwError } from 'rxjs';
import { createHash, webcrypto } from 'node:crypto';
import { TextEncoder } from 'node:util';
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
		exchangeSocialHandoff: jest.Mock;
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
			exchangeSocialHandoff: jest.fn(),
			requestPasswordReset: jest.fn(),
			resetPassword: jest.fn()
		};
		refreshService = { clearRefreshState: jest.fn() };
		store = { dispatch: jest.fn() };
		tokenStorage = { setTokens: jest.fn(), getRefreshToken: jest.fn(), clear: jest.fn() };
		languageService = { currentLang: jest.fn(() => 'en') };
		sessionStorage.clear();

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

	it('initiates with a random tab-only verifier, sends only its S256 challenge, and saves the return URL locally', async () => {
		Object.defineProperty(crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
		Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: TextEncoder });
		const router = TestBed.inject(Router);
		jest.spyOn(router, 'parseUrl').mockReturnValue({ queryParams: { returnUrl: '/profile' } } as never);
		api.getSocialAuthStartUrl.mockReturnValue(of({ transactionId: 'b'.repeat(64), url: '#provider' }));
		await firstValueFrom(TestBed.inject(AuthFeatureService).startSocialLogin('google'));
		const transaction = JSON.parse(sessionStorage.getItem('strollbar.socialTransaction')!);
		expect(transaction.verifier).toMatch(/^[a-f0-9]{64}$/);
		expect(transaction.transactionId).toBe('b'.repeat(64));
		expect(transaction.returnUrl).toBe('/profile');
		expect(transaction.expiresAt).toBeGreaterThan(Date.now() + 9 * 60_000);
		expect(api.getSocialAuthStartUrl).toHaveBeenCalledWith(
			'google', new URL('auth/social/callback', document.baseURI).href,
			createHash('sha256').update(transaction.verifier).digest('base64url')
		);
		expect(localStorage.getItem('strollbar.socialTransaction')).toBeNull();
		expect(tokenStorage.setTokens).not.toHaveBeenCalled();
	});

	it('clears only its pending proof after initiation failure, without changing credentials', async () => {
		Object.defineProperty(crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
		Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: TextEncoder });
		api.getSocialAuthStartUrl.mockReturnValue(throwError(() => new Error('Provider unavailable')));
		await expect(firstValueFrom(TestBed.inject(AuthFeatureService).startSocialLogin('google'))).rejects.toThrow('Provider unavailable');
		expect(sessionStorage.getItem('strollbar.socialTransaction')).toBeNull();
		expect(tokenStorage.setTokens).not.toHaveBeenCalled();
		expect(tokenStorage.clear).not.toHaveBeenCalled();
	});

	it('clears local tokens after logout even when the API call fails', async () => {
		tokenStorage.getRefreshToken.mockReturnValue('refresh-token');
		api.logout.mockReturnValue(throwError(() => new Error('network failed')));
		const service = TestBed.inject(AuthFeatureService);

		await expect(firstValueFrom(service.logout())).resolves.toBeNull();
		expect(api.logout).toHaveBeenCalledWith({ refreshToken: 'refresh-token' });
		expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
	});

	it('exchanges browser proof once and installs only the API response, returning the locally saved destination', async () => {
		const service = TestBed.inject(AuthFeatureService);
		sessionStorage.setItem('strollbar.socialTransaction', JSON.stringify({
			verifier: 'c'.repeat(64), transactionId: 'b'.repeat(64), expiresAt: Date.now() + 60_000, returnUrl: '/profile'
		}));
		api.exchangeSocialHandoff.mockReturnValue(of({ accessToken: 'social-access-token', refreshToken: 'social-refresh-token' }));
		await expect(firstValueFrom(service.completeSocialLogin('a'.repeat(64), 'b'.repeat(64)))).resolves.toBe('/profile');
		expect(api.exchangeSocialHandoff).toHaveBeenCalledWith({ code: 'a'.repeat(64), transactionId: 'b'.repeat(64), verifier: 'c'.repeat(64) });
		expect(tokenStorage.setTokens).toHaveBeenCalledWith('social-access-token', 'social-refresh-token');
		expect(sessionStorage.getItem('strollbar.socialTransaction')).toBeNull();
		await expect(firstValueFrom(service.completeSocialLogin('a'.repeat(64), 'b'.repeat(64)))).rejects.toThrow();
		expect(api.exchangeSocialHandoff).toHaveBeenCalledTimes(1);
		expect(tokenStorage.setTokens).toHaveBeenCalledTimes(1);
	});

	it.each(['missing', 'mismatch', 'expired', 'corrupt', 'bad-verifier', 'missing-state', 'missing-code'])(
		'rejects %s browser proof without installing or clearing an existing session', async (reason) => {
			const service = TestBed.inject(AuthFeatureService);
			if (reason !== 'missing') sessionStorage.setItem('strollbar.socialTransaction', reason === 'corrupt' ? '{broken' : JSON.stringify({
				verifier: reason === 'bad-verifier' ? 'attacker' : 'c'.repeat(64),
				transactionId: reason === 'mismatch' ? 'd'.repeat(64) : 'b'.repeat(64),
				expiresAt: Date.now() + (reason === 'expired' ? -1000 : 60_000), returnUrl: '/explore'
			}));
			await expect(firstValueFrom(service.completeSocialLogin(
				reason === 'missing-code' ? null : 'a'.repeat(64), reason === 'missing-state' ? null : 'b'.repeat(64)
			))).rejects.toThrow();
			expect(api.exchangeSocialHandoff).not.toHaveBeenCalled();
			expect(tokenStorage.setTokens).not.toHaveBeenCalled();
			expect(tokenStorage.clear).not.toHaveBeenCalled();
			expect(refreshService.clearRefreshState).not.toHaveBeenCalled();
			expect(store.dispatch).not.toHaveBeenCalled();
		}
	);

	it.each([401, 409, 500])('exchange rejection (%s) preserves the session and consumes local proof', async (status) => {
		const service = TestBed.inject(AuthFeatureService);
		sessionStorage.setItem('strollbar.socialTransaction', JSON.stringify({
			verifier: 'c'.repeat(64), transactionId: 'b'.repeat(64), expiresAt: Date.now() + 60_000, returnUrl: '/explore'
		}));
		api.exchangeSocialHandoff.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
		await expect(firstValueFrom(service.completeSocialLogin('a'.repeat(64), 'b'.repeat(64)))).rejects.toBeInstanceOf(HttpErrorResponse);
		expect(sessionStorage.getItem('strollbar.socialTransaction')).toBeNull();
		expect(tokenStorage.setTokens).not.toHaveBeenCalled();
		expect(tokenStorage.clear).not.toHaveBeenCalled();
		expect(store.dispatch).not.toHaveBeenCalled();
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
