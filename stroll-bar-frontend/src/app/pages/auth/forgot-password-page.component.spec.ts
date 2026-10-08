import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';
import { AuthFeatureService } from '../../features/auth/auth-feature.service';
import { ForgotPasswordPageComponent, RESEND_COOLDOWN_SECONDS } from './forgot-password-page.component';

@Component({ standalone: true, template: '' })
class StubPageComponent {}

describe('ForgotPasswordPageComponent', () => {
	let authFeature: { requestPasswordReset: jest.Mock };
	let fixture: ComponentFixture<ForgotPasswordPageComponent>;
	let host: HTMLElement;

	beforeEach(() => {
		authFeature = { requestPasswordReset: jest.fn(() => of(undefined)) };

		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{ path: 'auth/forgot-password', component: ForgotPasswordPageComponent },
					{ path: 'auth/login', component: StubPageComponent }
				]),
				provideTranslateService(),
				{ provide: AuthFeatureService, useValue: authFeature }
			]
		});
	});

	function render(): void {
		fixture = TestBed.createComponent(ForgotPasswordPageComponent);
		fixture.detectChanges();
		host = fixture.nativeElement as HTMLElement;
	}

	const byTestId = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`);
	const emailInput = () => byTestId('forgot-password-email')!.querySelector('input')!;
	const submitButton = () => byTestId('forgot-password-submit')!.querySelector('button')!;
	const resendButton = () => byTestId('forgot-password-resend')!.querySelector('button')!;

	function typeEmail(value: string): void {
		const input = emailInput();
		input.value = value;
		input.dispatchEvent(new Event('input'));
		input.dispatchEvent(new Event('blur'));
		fixture.detectChanges();
	}

	function submit(): void {
		host.querySelector('form')!.dispatchEvent(new Event('submit'));
		fixture.detectChanges();
	}

	it('renders an accessible email form with a way back to login', () => {
		render();

		const input = emailInput();
		expect(byTestId('forgot-password-title')!.textContent).toContain('AUTH.FORGOT_PASSWORD.TITLE');
		expect(byTestId('forgot-password-email')!.querySelector('mat-label')!.textContent).toContain('AUTH.FORGOT_PASSWORD.EMAIL_LABEL');
		expect(input.type).toBe('email');
		expect(input.getAttribute('autocomplete')).toBe('email');
		expect(input.required).toBe(true);
		expect(byTestId('forgot-password-back-to-login')!.getAttribute('href')).toBe('/auth/login');
	});

	it.each(['', 'not-an-email'])('blocks submission of %p with an inline validation message', (value) => {
		render();
		typeEmail(value);

		submit();

		expect(authFeature.requestPasswordReset).not.toHaveBeenCalled();
		expect(byTestId('forgot-password-email')!.textContent).toContain('AUTH.FORGOT_PASSWORD.EMAIL_ERROR');
	});

	it('requests a reset for the trimmed email and shows the generic confirmation', () => {
		render();
		typeEmail('  walker@example.com  ');

		submit();
		fixture.detectChanges();

		expect(authFeature.requestPasswordReset).toHaveBeenCalledWith('walker@example.com');
		expect(byTestId('forgot-password-form')).toBeNull();
		expect(byTestId('forgot-password-success')!.textContent).toContain('AUTH.FORGOT_PASSWORD.SENT_MESSAGE');
		expect(document.activeElement).toBe(byTestId('forgot-password-sent-title'));
	});

	it('ignores repeated submits while a request is in flight', () => {
		const pending = new Subject<void>();
		authFeature.requestPasswordReset.mockReturnValue(pending);
		render();
		typeEmail('walker@example.com');

		submit();
		submit();

		expect(authFeature.requestPasswordReset).toHaveBeenCalledTimes(1);
		expect(submitButton().disabled).toBe(true);
		expect(submitButton().getAttribute('aria-busy')).toBe('true');
		expect(submitButton().textContent).toContain('AUTH.FORGOT_PASSWORD.SUBMIT_LOADING');

		pending.next();
		pending.complete();
		fixture.detectChanges();

		expect(byTestId('forgot-password-success')).not.toBeNull();
	});

	it.each([
		[429, 'AUTH.PASSWORD_RESET_ERRORS.RATE_LIMITED'],
		[0, 'AUTH.PASSWORD_RESET_ERRORS.NETWORK'],
		[400, 'AUTH.PASSWORD_RESET_ERRORS.INVALID_EMAIL'],
		[500, 'AUTH.PASSWORD_RESET_ERRORS.GENERIC']
	])('shows an inline error for status %s and allows a retry', (status, key) => {
		authFeature.requestPasswordReset.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status })));
		render();
		typeEmail('walker@example.com');

		submit();

		expect(byTestId('forgot-password-error')!.textContent).toContain(key);
		expect(byTestId('forgot-password-form')).not.toBeNull();
		expect(submitButton().disabled).toBe(false);

		submit();

		expect(authFeature.requestPasswordReset).toHaveBeenCalledTimes(2);
		expect(byTestId('forgot-password-error')).toBeNull();
		expect(byTestId('forgot-password-success')).not.toBeNull();
	});

	it('throttles resending on the client and resends to the same address after the cooldown', fakeAsync(() => {
		render();
		typeEmail('walker@example.com');
		submit();

		expect(resendButton().disabled).toBe(true);
		expect(resendButton().textContent).toContain('AUTH.FORGOT_PASSWORD.RESEND_COOLDOWN');

		tick(RESEND_COOLDOWN_SECONDS * 1000);
		fixture.detectChanges();

		expect(resendButton().disabled).toBe(false);
		expect(resendButton().textContent).toContain('AUTH.FORGOT_PASSWORD.RESEND');

		resendButton().click();
		fixture.detectChanges();

		expect(authFeature.requestPasswordReset).toHaveBeenCalledTimes(2);
		expect(authFeature.requestPasswordReset).toHaveBeenLastCalledWith('walker@example.com');
		expect(resendButton().disabled).toBe(true);
		discardPeriodicTasks();
	}));

	it('shows resend failures without leaving the confirmation', fakeAsync(() => {
		render();
		typeEmail('walker@example.com');
		submit();
		tick(RESEND_COOLDOWN_SECONDS * 1000);
		fixture.detectChanges();
		authFeature.requestPasswordReset.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 429 })));

		resendButton().click();
		fixture.detectChanges();

		expect(byTestId('forgot-password-success')).not.toBeNull();
		expect(byTestId('forgot-password-error')!.textContent).toContain('AUTH.PASSWORD_RESET_ERRORS.RATE_LIMITED');
	}));

	it('returns to the form with the previous email when the user wants a different address', fakeAsync(() => {
		render();
		typeEmail('walker@example.com');
		submit();

		byTestId('forgot-password-change-email')!.querySelector('button')!.click();
		fixture.detectChanges();
		tick();

		expect(byTestId('forgot-password-form')).not.toBeNull();
		expect(emailInput().value).toBe('walker@example.com');
		discardPeriodicTasks();
	}));

	it('prefills the email from navigation state without putting it in the URL', async () => {
		const harness = await RouterTestingHarness.create();
		const router = TestBed.inject(Router);

		await router.navigateByUrl('/auth/forgot-password', { state: { email: 'walker@example.com' } });
		harness.detectChanges();

		const input = harness.routeNativeElement!.querySelector<HTMLInputElement>('[data-testid="forgot-password-email"] input')!;
		expect(input.value).toBe('walker@example.com');
		expect(router.url).toBe('/auth/forgot-password');
	});
});
