import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { lastValueFrom, of } from 'rxjs';
import { emailVerifiedGuard } from './email-verified.guard';
import { UserRole } from '../models/user-role.enum';
import { NotificationService } from '../services/notification.service';
import { TokenStorageService } from '../services/token-storage.service';

describe('emailVerifiedGuard', () => {
	const loginTree = { redirectTo: '/auth/login' };
	const settingsTree = { redirectTo: '/settings/profile' };
	let tokenStorage: { getAccessToken: jest.Mock };
	let router: { createUrlTree: jest.Mock };
	let store: { select: jest.Mock };
	let notification: { showError: jest.Mock };
	let translate: { instant: jest.Mock };

	beforeEach(() => {
		tokenStorage = { getAccessToken: jest.fn() };
		router = {
			createUrlTree: jest.fn((commands: string[]) => (commands[0] === '/auth/login' ? loginTree : settingsTree))
		};
		store = { select: jest.fn() };
		notification = { showError: jest.fn() };
		translate = { instant: jest.fn(() => 'Verify your email before continuing.') };

		TestBed.configureTestingModule({
			providers: [
				{ provide: TokenStorageService, useValue: tokenStorage },
				{ provide: Router, useValue: router },
				{ provide: Store, useValue: store },
				{ provide: NotificationService, useValue: notification },
				{ provide: TranslateService, useValue: translate }
			]
		});
	});

	it('redirects anonymous users to login with a returnUrl', () => {
		tokenStorage.getAccessToken.mockReturnValue(null);

		const result = TestBed.runInInjectionContext(() => emailVerifiedGuard({} as never, { url: '/strolls/new' } as never));

		expect(result).toBe(loginTree);
		expect(router.createUrlTree).toHaveBeenCalledWith(['/auth/login'], {
			queryParams: { returnUrl: '/strolls/new' }
		});
		expect(store.select).not.toHaveBeenCalled();
	});

	it('allows verified authenticated users', async () => {
		tokenStorage.getAccessToken.mockReturnValue('access-token');
		store.select.mockReturnValue(of(buildUser({ emailVerified: true })));

		const result = TestBed.runInInjectionContext(() => emailVerifiedGuard({} as never, { url: '/strolls/new' } as never));

		await expect(lastValueFrom(result as ReturnType<typeof store.select>)).resolves.toBe(true);
		expect(notification.showError).not.toHaveBeenCalled();
	});

	it('sends unverified authenticated users to profile settings with an error', async () => {
		tokenStorage.getAccessToken.mockReturnValue('access-token');
		store.select.mockReturnValue(of(buildUser({ emailVerified: false })));

		const result = TestBed.runInInjectionContext(() => emailVerifiedGuard({} as never, { url: '/strolls/new' } as never));

		await expect(lastValueFrom(result as ReturnType<typeof store.select>)).resolves.toBe(settingsTree);
		expect(translate.instant).toHaveBeenCalledWith('ERRORS.EMAIL_NOT_VERIFIED');
		expect(notification.showError).toHaveBeenCalledWith('Verify your email before continuing.');
		expect(router.createUrlTree).toHaveBeenCalledWith(['/settings/profile']);
	});

	function buildUser(overrides: { emailVerified: boolean }) {
		return {
			id: 'user-1',
			username: 'walker',
			email: 'walker@example.com',
			profileImageUrl: null,
			isActive: true,
			role: UserRole.SIMPLE,
			preferredLanguage: 'hu',
			emailVerified: overrides.emailVerified,
			createdAt: '2026-09-25T00:00:00.000Z',
			updatedAt: '2026-09-25T00:00:00.000Z',
			loading: false,
			sessionChecking: false,
			error: null,
			profileSaving: false,
			profileSaveError: null,
			passwordSaving: false,
			passwordSaveError: null
		};
	}
});
