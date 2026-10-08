import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { SpyLocation } from '@angular/common/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';
import { AuthFeatureService } from '../../features/auth/auth-feature.service';
import { ResetPasswordPageComponent } from './reset-password-page.component';

@Component({ standalone: true, template: '' })
class StubPageComponent {}

const TOKEN = 'e'.repeat(64);
const OTHER_TOKEN = 'f'.repeat(64);
const STRONG_PASSWORD = 'StrollWalk!2026';

describe('ResetPasswordPageComponent', () => {
	let authFeature: { resetPassword: jest.Mock };
	let harness: RouterTestingHarness;
	let host: HTMLElement;

	beforeEach(() => {
		authFeature = { resetPassword: jest.fn(() => of(undefined)) };

		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{ path: 'auth/reset-password', component: ResetPasswordPageComponent },
					{ path: 'auth/forgot-password', component: StubPageComponent },
					{ path: 'auth/login', component: StubPageComponent }
				]),
				provideLocationMocks(),
				provideTranslateService(),
				{ provide: AuthFeatureService, useValue: authFeature }
			]
		});
	});

	async function open(url: string): Promise<void> {
		harness = await RouterTestingHarness.create();
		await harness.navigateByUrl(url, ResetPasswordPageComponent);
		await settle();
	}

	async function settle(): Promise<void> {
		harness.detectChanges();
		await harness.fixture.whenStable();
		harness.detectChanges();
		host = harness.routeNativeElement!;
	}

	const byTestId = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`);
	const input = (id: string) => byTestId(id)!.querySelector('input')!;
	const submitButton = () => byTestId('reset-password-submit')!.querySelector('button')!;

	function type(id: string, value: string): void {
		const element = input(id);
		element.value = value;
		element.dispatchEvent(new Event('input'));
		element.dispatchEvent(new Event('blur'));
		harness.detectChanges();
	}

	function fill(password: string, confirmation = password): void {
		type('reset-password-new', password);
		type('reset-password-confirm', confirmation);
	}

	async function submit(): Promise<void> {
		host.querySelector('form')!.dispatchEvent(new Event('submit'));
		await settle();
	}

	describe('reset link handling', () => {
		it('shows the form and removes the token from the address bar and history entry', async () => {
			await open(`/auth/reset-password?token=${TOKEN}`);

			const location = TestBed.inject(Location) as SpyLocation;
			expect(byTestId('reset-password-form')).not.toBeNull();
			expect(TestBed.inject(Router).url).toBe('/auth/reset-password');
			expect(location.path()).toBe('/auth/reset-password');
			expect(location.urlChanges.at(-1)).toBe('replace: /auth/reset-password');
			expect(JSON.stringify({ ...localStorage })).not.toContain(TOKEN);
			expect(JSON.stringify({ ...sessionStorage })).not.toContain(TOKEN);
		});

		it('keeps using the captured token after it was removed from the URL', async () => {
			await open(`/auth/reset-password?token=${TOKEN}`);
			fill(STRONG_PASSWORD);

			await submit();

			expect(authFeature.resetPassword).toHaveBeenCalledWith({ resetToken: TOKEN, newPassword: STRONG_PASSWORD });
		});

		it('shows a missing-link state with recovery actions when opened (or refreshed) without a token', async () => {
			await open('/auth/reset-password');

			expect(byTestId('reset-password-form')).toBeNull();
			expect(byTestId('reset-password-missing')!.textContent).toContain('AUTH.RESET_PASSWORD.MISSING_MESSAGE');
			expect(byTestId('reset-password-request-new-link')!.querySelector('a')!.getAttribute('href')).toBe('/auth/forgot-password');
			expect(byTestId('reset-password-back-to-login')!.querySelector('a')!.getAttribute('href')).toBe('/auth/login');
			expect(authFeature.resetPassword).not.toHaveBeenCalled();
		});

		it.each(['abc', TOKEN.toUpperCase(), `${TOKEN}0`])('rejects the malformed token %p locally', async (token) => {
			await open(`/auth/reset-password?token=${token}`);

			expect(byTestId('reset-password-invalid')!.textContent).toContain('AUTH.RESET_PASSWORD.INVALID_MESSAGE');
			expect(byTestId('reset-password-request-new-link')).not.toBeNull();
			expect(TestBed.inject(Router).url).toBe('/auth/reset-password');
			expect(authFeature.resetPassword).not.toHaveBeenCalled();
		});

		it('switches to a newer link opened while the page is still displayed', async () => {
			await open(`/auth/reset-password?token=${TOKEN}`);
			await TestBed.inject(Router).navigateByUrl(`/auth/reset-password?token=${OTHER_TOKEN}`);
			await settle();
			fill(STRONG_PASSWORD);

			await submit();

			expect(TestBed.inject(Router).url).toBe('/auth/reset-password');
			expect(authFeature.resetPassword).toHaveBeenCalledWith({ resetToken: OTHER_TOKEN, newPassword: STRONG_PASSWORD });
		});
	});

	describe('form validation', () => {
		beforeEach(async () => open(`/auth/reset-password?token=${TOKEN}`));

		it('uses labelled password fields with new-password autocomplete', () => {
			for (const id of ['reset-password-new', 'reset-password-confirm']) {
				expect(input(id).type).toBe('password');
				expect(input(id).getAttribute('autocomplete')).toBe('new-password');
				expect(input(id).required).toBe(true);
			}
			expect(byTestId('reset-password-new')!.querySelector('mat-label')!.textContent).toContain('AUTH.RESET_PASSWORD.NEW_PASSWORD_LABEL');
			expect(byTestId('reset-password-confirm')!.querySelector('mat-label')!.textContent).toContain(
				'AUTH.RESET_PASSWORD.CONFIRM_PASSWORD_LABEL'
			);
		});

		it('marks empty fields as required on submit', async () => {
			await submit();

			expect(byTestId('reset-password-new')!.textContent).toContain('AUTH.REGISTER.PASSWORD_REQUIRED_ERROR');
			expect(byTestId('reset-password-confirm')!.textContent).toContain('AUTH.RESET_PASSWORD.CONFIRM_REQUIRED_ERROR');
			expect(authFeature.resetPassword).not.toHaveBeenCalled();
		});

		it.each([
			['Sh0rt!', 'AUTH.REGISTER.PASSWORD_MIN_LENGTH_ERROR'],
			[`Aa1!${'x'.repeat(125)}`, 'AUTH.REGISTER.PASSWORD_MAX_LENGTH_ERROR'],
			['alllowercase1!', 'AUTH.REGISTER.PASSWORD_COMPLEXITY_ERROR'],
			['Password123!', 'AUTH.REGISTER.PASSWORD_COMMON_ERROR']
		])('applies the existing password policy to %p', async (password, key) => {
			fill(password);

			await submit();

			expect(byTestId('reset-password-new')!.textContent).toContain(key);
			expect(authFeature.resetPassword).not.toHaveBeenCalled();
		});

		it('accepts the 128 character upper bound', async () => {
			const longest = `Aa1!${'x'.repeat(124)}`;
			fill(longest);

			await submit();

			expect(authFeature.resetPassword).toHaveBeenCalledWith({ resetToken: TOKEN, newPassword: longest });
		});

		it('requires a matching confirmation and revalidates it when the password changes', async () => {
			fill(STRONG_PASSWORD, 'StrollWalk!2027');
			await submit();

			expect(byTestId('reset-password-confirm')!.textContent).toContain('AUTH.RESET_PASSWORD.MISMATCH_ERROR');
			expect(authFeature.resetPassword).not.toHaveBeenCalled();

			type('reset-password-new', 'StrollWalk!2027');

			expect(byTestId('reset-password-confirm')!.textContent).not.toContain('AUTH.RESET_PASSWORD.MISMATCH_ERROR');
		});
	});

	describe('submission', () => {
		beforeEach(async () => open(`/auth/reset-password?token=${TOKEN}`));

		it('shows the success state with a login link and no auto-login', async () => {
			fill(STRONG_PASSWORD);

			await submit();

			expect(authFeature.resetPassword).toHaveBeenCalledTimes(1);
			expect(byTestId('reset-password-form')).toBeNull();
			expect(byTestId('reset-password-success')!.textContent).toContain('AUTH.RESET_PASSWORD.SUCCESS_MESSAGE');
			expect(byTestId('reset-password-go-to-login')!.querySelector('a')!.getAttribute('href')).toBe('/auth/login');
			expect(document.activeElement).toBe(byTestId('reset-password-success-title'));
			expect(TestBed.inject(Router).url).toBe('/auth/reset-password');
		});

		it('ignores repeated submits while the reset is in flight', async () => {
			const pending = new Subject<void>();
			authFeature.resetPassword.mockReturnValue(pending);
			fill(STRONG_PASSWORD);

			host.querySelector('form')!.dispatchEvent(new Event('submit'));
			host.querySelector('form')!.dispatchEvent(new Event('submit'));
			harness.detectChanges();

			expect(authFeature.resetPassword).toHaveBeenCalledTimes(1);
			expect(submitButton().disabled).toBe(true);
			expect(submitButton().textContent).toContain('AUTH.RESET_PASSWORD.SUBMIT_LOADING');

			pending.next();
			pending.complete();
			await settle();

			expect(byTestId('reset-password-success')).not.toBeNull();
		});

		it.each([
			[401, { message: 'Invalid, expired or already used password reset token.' }],
			[410, { message: 'Gone' }],
			[400, { message: ['resetToken must match /^[a-f0-9]{64}$/ regular expression'] }]
		])('treats status %s as an invalid, expired or used link', async (status, body) => {
			authFeature.resetPassword.mockReturnValue(throwError(() => new HttpErrorResponse({ status, error: body })));
			fill(STRONG_PASSWORD);

			await submit();

			expect(byTestId('reset-password-form')).toBeNull();
			expect(byTestId('reset-password-invalid')!.textContent).toContain('AUTH.RESET_PASSWORD.INVALID_MESSAGE');
			expect(byTestId('reset-password-request-new-link')!.querySelector('a')!.getAttribute('href')).toBe('/auth/forgot-password');
			expect(document.activeElement).toBe(byTestId('reset-password-link-problem-title'));
		});

		it.each([
			[429, 'AUTH.PASSWORD_RESET_ERRORS.RATE_LIMITED'],
			[0, 'AUTH.PASSWORD_RESET_ERRORS.NETWORK'],
			[500, 'AUTH.PASSWORD_RESET_ERRORS.GENERIC'],
			[400, 'AUTH.RESET_PASSWORD.REJECTED_ERROR']
		])('keeps the form and token after a status %s failure so the user can retry', async (status, key) => {
			authFeature.resetPassword.mockReturnValueOnce(
				throwError(() => new HttpErrorResponse({ status, error: { message: ['newPassword is too weak'] } }))
			);
			fill(STRONG_PASSWORD);

			await submit();

			expect(byTestId('reset-password-error')!.textContent).toContain(key);
			expect(submitButton().disabled).toBe(false);

			await submit();

			expect(authFeature.resetPassword).toHaveBeenCalledTimes(2);
			expect(authFeature.resetPassword).toHaveBeenLastCalledWith({ resetToken: TOKEN, newPassword: STRONG_PASSWORD });
			expect(byTestId('reset-password-success')).not.toBeNull();
		});
	});
});
