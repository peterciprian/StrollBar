import { HttpErrorResponse, HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MockedFunction } from 'jest-mock';
import { Observable, lastValueFrom, of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthRefreshService } from './auth-refresh.service';
import { TokenStorageService } from './token-storage.service';

describe('authInterceptor', () => {
	let tokenStorage: { getAccessToken: MockedFunction<() => string | null> };
	let refreshService: {
		refreshAccessToken: MockedFunction<() => Observable<string>>;
		clearRefreshState: MockedFunction<() => void>;
	};
	let store: { dispatch: MockedFunction<(action: object) => void> };
	let router: { navigateByUrl: MockedFunction<(url: string) => void> };

	beforeEach(() => {
		tokenStorage = { getAccessToken: jest.fn() };
		refreshService = {
			refreshAccessToken: jest.fn(),
			clearRefreshState: jest.fn()
		};
		store = { dispatch: jest.fn() };
		router = { navigateByUrl: jest.fn() };

		TestBed.configureTestingModule({
			providers: [
				{ provide: TokenStorageService, useValue: tokenStorage },
				{ provide: AuthRefreshService, useValue: refreshService },
				{ provide: Store, useValue: store },
				{ provide: Router, useValue: router }
			]
		});
	});

	it('adds the bearer token to non-auth requests', async () => {
		tokenStorage.getAccessToken.mockReturnValue('access-token');
		const next = jest.fn((request: HttpRequest<unknown>) =>
			of(new HttpResponse({ body: { authorization: request.headers.get('Authorization') } }))
		);
		const request = new HttpRequest('GET', '/v1/strolls');

		const result = TestBed.runInInjectionContext(() => authInterceptor(request, next));

		await expect(lastValueFrom(result)).resolves.toMatchObject({ body: { authorization: 'Bearer access-token' } });
		expect(next).toHaveBeenCalledTimes(1);
	});

	it('does not add the bearer token to auth endpoints', async () => {
		tokenStorage.getAccessToken.mockReturnValue('access-token');
		const next = jest.fn((request: HttpRequest<unknown>) =>
			of(new HttpResponse({ body: { authorization: request.headers.get('Authorization') } }))
		);
		const request = new HttpRequest('POST', '/v1/auth/login', {});

		const result = TestBed.runInInjectionContext(() => authInterceptor(request, next));

		await expect(lastValueFrom(result)).resolves.toMatchObject({ body: { authorization: null } });
		expect(refreshService.refreshAccessToken).not.toHaveBeenCalled();
	});

	it.each(['/v1/auth/password-reset/request', '/v1/auth/password-reset/confirm'])(
		'treats %s as an anonymous auth endpoint without a bearer token',
		async (url) => {
			tokenStorage.getAccessToken.mockReturnValue('access-token');
			const next = jest.fn((request: HttpRequest<unknown>) =>
				of(new HttpResponse({ body: { authorization: request.headers.get('Authorization') } }))
			);

			const result = TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('POST', url, {}), next));

			await expect(lastValueFrom(result)).resolves.toMatchObject({ body: { authorization: null } });
		}
	);

	it('passes a 401 from an invalid reset token through without refreshing or expiring the session', async () => {
		tokenStorage.getAccessToken.mockReturnValue('access-token');
		const error = new HttpErrorResponse({ status: 401, error: { message: 'Invalid, expired or already used password reset token.' } });
		const next = jest.fn(() => throwError(() => error) as Observable<HttpEvent<unknown>>);
		const request = new HttpRequest('POST', '/v1/auth/password-reset/confirm', { resetToken: 'c'.repeat(64), newPassword: 'StrollWalk!2026' });

		const result = TestBed.runInInjectionContext(() => authInterceptor(request, next));

		await expect(lastValueFrom(result)).rejects.toBe(error);
		expect(next).toHaveBeenCalledTimes(1);
		expect(refreshService.refreshAccessToken).not.toHaveBeenCalled();
		expect(refreshService.clearRefreshState).not.toHaveBeenCalled();
		expect(store.dispatch).not.toHaveBeenCalled();
		expect(router.navigateByUrl).not.toHaveBeenCalled();
	});

	it('refreshes and retries a protected request after a 401', async () => {
		tokenStorage.getAccessToken.mockReturnValue('expired-token');
		refreshService.refreshAccessToken.mockReturnValue(of('new-access-token'));
		const response = new HttpResponse({ body: { ok: true } });
		const next = jest
			.fn<(request: HttpRequest<unknown>) => Observable<HttpEvent<unknown>>>()
			.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 401 })))
			.mockImplementationOnce((request) => of(response.clone({ body: { authorization: request.headers.get('Authorization') } })));
		const request = new HttpRequest('PATCH', '/v1/strolls/stroll-1', { name: 'Updated' });

		const result = TestBed.runInInjectionContext(() => authInterceptor(request, next));

		await expect(lastValueFrom(result)).resolves.toMatchObject({ body: { authorization: 'Bearer new-access-token' } });
		expect(refreshService.refreshAccessToken).toHaveBeenCalledTimes(1);
		expect(next).toHaveBeenCalledTimes(2);
	});

	it('expires the session when token refresh fails', async () => {
		tokenStorage.getAccessToken.mockReturnValue('expired-token');
		const refreshError = new Error('refresh failed');
		refreshService.refreshAccessToken.mockReturnValue(throwError(() => refreshError));
		const next = jest.fn(() => throwError(() => new HttpErrorResponse({ status: 401 })) as Observable<HttpEvent<unknown>>);
		const request = new HttpRequest('GET', '/v1/strolls/mine');

		const result = TestBed.runInInjectionContext(() => authInterceptor(request, next));

		await expect(lastValueFrom(result)).rejects.toBe(refreshError);
		expect(refreshService.clearRefreshState).toHaveBeenCalledTimes(1);
		expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: '[Auth] Session Expired' }));
		expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login');
	});
});
