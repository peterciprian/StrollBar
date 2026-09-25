import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ApiClientService } from '../../core/api/api-client.service';
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
	};
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
			getSocialAuthStartUrl: jest.fn()
		};
		tokenStorage = { setTokens: jest.fn(), getRefreshToken: jest.fn(), clear: jest.fn() };
		languageService = { currentLang: jest.fn(() => 'en') };

		TestBed.configureTestingModule({
			providers: [
				AuthFeatureService,
				{ provide: ApiClientService, useValue: api },
				{ provide: TokenStorageService, useValue: tokenStorage },
				{ provide: LanguageService, useValue: languageService },
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
});
