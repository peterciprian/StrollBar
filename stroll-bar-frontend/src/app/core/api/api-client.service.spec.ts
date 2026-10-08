import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiClientService } from './api-client.service';
import { API_ENDPOINT } from './api-endpoint.token';

describe('ApiClientService', () => {
	let api: ApiClientService;
	let http: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_ENDPOINT, useValue: '/v1' }]
		});

		api = TestBed.inject(ApiClientService);
		http = TestBed.inject(HttpTestingController);
	});

	afterEach(() => {
		http.verify();
	});

	it('posts login credentials to the auth endpoint', () => {
		api.login({ email: 'walker@example.com', password: 'StrollWalk!2026' }).subscribe();

		const request = http.expectOne('/v1/auth/login');
		expect(request.request.method).toBe('POST');
		expect(request.request.body).toEqual({ email: 'walker@example.com', password: 'StrollWalk!2026' });
		request.flush({ accessToken: 'access-token', refreshToken: 'refresh-token', user: {} });
	});

	it('posts password reset requests to the request endpoint', () => {
		let response: unknown;
		api.requestPasswordReset({ email: 'walker@example.com', preferredLanguage: 'hu' }).subscribe((body) => (response = body));

		const request = http.expectOne('/v1/auth/password-reset/request');
		expect(request.request.method).toBe('POST');
		expect(request.request.body).toEqual({ email: 'walker@example.com', preferredLanguage: 'hu' });
		request.flush({ message: 'If the account exists, a password reset token has been issued.' }, { status: 201, statusText: 'Created' });
		expect(response).toEqual({ message: 'If the account exists, a password reset token has been issued.' });
	});

	it('posts the reset token and new password to the confirm endpoint', () => {
		const resetToken = 'b'.repeat(64);
		api.resetPassword({ resetToken, newPassword: 'StrollWalk!2026' }).subscribe();

		const request = http.expectOne('/v1/auth/password-reset/confirm');
		expect(request.request.method).toBe('POST');
		expect(request.request.body).toEqual({ resetToken, newPassword: 'StrollWalk!2026' });
		request.flush({ message: 'Password updated successfully.' }, { status: 201, statusText: 'Created' });
	});

	it('serializes defined stroll list query values and skips empty filters', () => {
		api.listStrolls({ search: 'Budapest', page: 2, limit: 12, city: undefined }).subscribe();

		const request = http.expectOne((candidate) => candidate.url === '/v1/strolls');
		expect(request.request.method).toBe('GET');
		expect(request.request.params.get('search')).toBe('Budapest');
		expect(request.request.params.get('page')).toBe('2');
		expect(request.request.params.get('limit')).toBe('12');
		expect(request.request.params.has('city')).toBe(false);
		request.flush({ items: [], total: 0 });
	});

	it('builds nested stage mutation URLs', () => {
		api.updateStage('stroll-1', 'stage-2', { name: 'Updated stage' }).subscribe();

		const request = http.expectOne('/v1/strolls/stroll-1/stages/stage-2');
		expect(request.request.method).toBe('PATCH');
		expect(request.request.body).toEqual({ name: 'Updated stage' });
		request.flush({ id: 'stage-2', name: 'Updated stage' });
	});
});
