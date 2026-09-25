import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { authGuard } from './auth.guard';
import { TokenStorageService } from '../services/token-storage.service';

describe('authGuard', () => {
	const loginTree = { redirectTo: '/auth/login' };
	let tokenStorage: { getAccessToken: jest.Mock };
	let router: { createUrlTree: jest.Mock };

	beforeEach(() => {
		tokenStorage = { getAccessToken: jest.fn() };
		router = { createUrlTree: jest.fn(() => loginTree) };

		TestBed.configureTestingModule({
			providers: [
				{ provide: TokenStorageService, useValue: tokenStorage },
				{ provide: Router, useValue: router }
			]
		});
	});

	it('allows activation when an access token exists', () => {
		tokenStorage.getAccessToken.mockReturnValue('access-token');

		const result = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/strolls/new' } as never));

		expect(result).toBe(true);
		expect(router.createUrlTree).not.toHaveBeenCalled();
	});

	it('redirects anonymous users to login with a returnUrl', () => {
		tokenStorage.getAccessToken.mockReturnValue(null);

		const result = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/strolls/new' } as never));

		expect(result).toBe(loginTree);
		expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
			queryParams: { returnUrl: '/strolls/new' }
		});
	});
});
