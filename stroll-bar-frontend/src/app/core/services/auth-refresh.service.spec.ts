import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { firstValueFrom, of, Subject } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { AuthRefreshService } from './auth-refresh.service';
import { TokenStorageService } from './token-storage.service';

describe('AuthRefreshService', () => {
	let api: { refresh: jest.Mock };
	let tokenStorage: { getRefreshToken: jest.Mock; setTokens: jest.Mock; clear: jest.Mock };

	beforeEach(() => {
		api = { refresh: jest.fn() };
		tokenStorage = {
			getRefreshToken: jest.fn(),
			setTokens: jest.fn(),
			clear: jest.fn()
		};

		TestBed.configureTestingModule({
			providers: [AuthRefreshService, { provide: ApiClientService, useValue: api }, { provide: TokenStorageService, useValue: tokenStorage }]
		});
	});

	it('fails refresh when no refresh token is stored', async () => {
		tokenStorage.getRefreshToken.mockReturnValue(null);
		const service = TestBed.inject(AuthRefreshService);

		await expect(firstValueFrom(service.refreshAccessToken())).rejects.toThrow('No refresh token available.');
		expect(api.refresh).not.toHaveBeenCalled();
	});

	it('stores the rotated token pair and returns the new access token', async () => {
		tokenStorage.getRefreshToken.mockReturnValue('refresh-token');
		api.refresh.mockReturnValue(of({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token', user: {} }));
		const service = TestBed.inject(AuthRefreshService);

		await expect(firstValueFrom(service.refreshAccessToken())).resolves.toBe('new-access-token');
		expect(api.refresh).toHaveBeenCalledWith({ refreshToken: 'refresh-token' });
		expect(tokenStorage.setTokens).toHaveBeenCalledWith('new-access-token', 'new-refresh-token');
	});

	it('shares one in-flight refresh request across concurrent callers', async () => {
		tokenStorage.getRefreshToken.mockReturnValue('refresh-token');
		const refreshResponse = new Subject<{ accessToken: string; refreshToken: string; user: object }>();
		api.refresh.mockReturnValue(refreshResponse.asObservable());
		const service = TestBed.inject(AuthRefreshService);

		const firstRefresh = firstValueFrom(service.refreshAccessToken());
		const secondRefresh = firstValueFrom(service.refreshAccessToken());

		expect(api.refresh).toHaveBeenCalledTimes(1);

		refreshResponse.next({ accessToken: 'shared-access-token', refreshToken: 'shared-refresh-token', user: {} });
		refreshResponse.complete();

		await expect(Promise.all([firstRefresh, secondRefresh])).resolves.toEqual(['shared-access-token', 'shared-access-token']);
		expect(tokenStorage.setTokens).toHaveBeenCalledTimes(1);
	});

	it('clears stored tokens and refresh state when requested', () => {
		const service = TestBed.inject(AuthRefreshService);

		service.clearRefreshState();

		expect(tokenStorage.clear).toHaveBeenCalledTimes(1);
	});
});
