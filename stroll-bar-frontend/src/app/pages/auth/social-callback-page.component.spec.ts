import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, of, throwError } from 'rxjs';
import { AuthFeatureService } from '../../features/auth/auth-feature.service';
import { fetchMe, socialLoginFailure, userReducer } from '../../features/auth/auth.state';
import { SocialCallbackPageComponent } from './social-callback-page.component';

describe('SocialCallbackPageComponent', () => {
	let auth: { completeSocialLogin: jest.Mock };
	let store: { dispatch: jest.Mock };
	let router: { navigate: jest.Mock; navigateByUrl: jest.Mock };

	beforeEach(() => {
		auth = { completeSocialLogin: jest.fn(() => of('/profile')) };
		store = { dispatch: jest.fn() };
		router = { navigate: jest.fn(), navigateByUrl: jest.fn() };
	});

	function open(params: Record<string, string | string[] | undefined>): void {
		TestBed.configureTestingModule({
			providers: [
				{ provide: AuthFeatureService, useValue: auth },
				{ provide: Store, useValue: store },
				{ provide: Router, useValue: router },
				{ provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } }
			]
		});
		TestBed.runInInjectionContext(() => new SocialCallbackPageComponent()).ngOnInit();
	}

	it('exchanges the code and transaction, never navigable credentials or a supplied return URL', () => {
		open({ code: 'code', transactionId: 'transaction', returnUrl: '//attacker.example' });
		expect(auth.completeSocialLogin).toHaveBeenCalledWith('code', 'transaction');
		expect(store.dispatch).toHaveBeenCalledWith(fetchMe());
		expect(router.navigateByUrl).toHaveBeenCalledWith('/profile', { replaceUrl: true });
		expect(router.navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: {}, replaceUrl: true }));
	});

	it.each([
		{}, { accessToken: 'attacker', refreshToken: 'attacker' }, { code: 'code' },
		{ transactionId: 'transaction' }, { error: 'attacker text' },
		{ code: ['one', 'two'], transactionId: 'transaction' },
		{ code: 'code', transactionId: ['one', 'two'] },
		{ code: 'code', transactionId: 'transaction', accessToken: 'attacker' }
	])('rejects malformed or legacy attacker-prepared navigation: %j', (params) => {
		open(params);
		expect(auth.completeSocialLogin).not.toHaveBeenCalled();
		expect(store.dispatch).toHaveBeenCalledWith(socialLoginFailure({ error: 'Social login failed. Please start again.' }));
		expect(store.dispatch).not.toHaveBeenCalledWith(fetchMe());
		expect(router.navigateByUrl).toHaveBeenCalledWith('/auth/login', { replaceUrl: true });
	});

	it('waits for successful exchange before fetching the user or navigating', () => {
		const result = new Subject<string>();
		auth.completeSocialLogin.mockReturnValue(result);
		open({ code: 'code', transactionId: 'transaction' });
		expect(store.dispatch).not.toHaveBeenCalled();
		expect(router.navigateByUrl).not.toHaveBeenCalled();
		result.next('/explore');
		expect(store.dispatch).toHaveBeenCalledWith(fetchMe());
	});

	it('handles failed proof without fetching a user or displaying attacker-supplied error text', () => {
		auth.completeSocialLogin.mockReturnValue(throwError(() => new Error('untrusted error')));
		open({ code: 'code', transactionId: 'transaction' });
		expect(store.dispatch).toHaveBeenCalledTimes(1);
		expect(store.dispatch).toHaveBeenCalledWith(socialLoginFailure({ error: 'Social login failed. Please start again.' }));
	});

	it('preserves SEC-01 recovery guidance from the API, never from navigation parameters', () => {
		const message = 'Sign in and explicitly link, or use account recovery.';
		auth.completeSocialLogin.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { message } })));
		open({ code: 'code', transactionId: 'transaction' });
		expect(store.dispatch).toHaveBeenCalledWith(socialLoginFailure({ error: message }));
	});

	it('leaves callback processing to the browser during SSR', () => {
		TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
		open({ code: 'code', transactionId: 'transaction' });
		expect(auth.completeSocialLogin).not.toHaveBeenCalled();
		expect(store.dispatch).not.toHaveBeenCalled();
		expect(router.navigate).not.toHaveBeenCalled();
	});

	it('keeps the existing authenticated user when the callback failure reaches the real reducer', () => {
		const previous = {
			...userReducer(undefined, { type: 'init' }),
			id: 'existing-user', username: 'existing', email: 'existing@example.test', isActive: true, emailVerified: true
		};
		expect(userReducer(previous, socialLoginFailure({ error: 'Rejected transaction' })))
			.toEqual({ ...previous, loading: false, error: 'Rejected transaction' });
	});
});
