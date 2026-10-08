import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthFeatureService } from '../../features/auth/auth-feature.service';
import { ForgotPasswordPageComponent } from './forgot-password-page.component';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent forgot password link', () => {
	let harness: RouterTestingHarness;

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([
					{ path: 'auth/login', component: LoginPageComponent },
					{ path: 'auth/forgot-password', component: ForgotPasswordPageComponent }
				]),
				provideTranslateService(),
				provideMockStore({ initialState: { user: { loading: false, error: null } } }),
				{ provide: AuthFeatureService, useValue: { requestPasswordReset: jest.fn(), startSocialLogin: jest.fn() } }
			]
		});

		harness = await RouterTestingHarness.create();
		await harness.navigateByUrl('/auth/login', LoginPageComponent);
	});

	const host = () => harness.routeNativeElement!;
	const link = () => host().querySelector<HTMLAnchorElement>('[data-testid="login-forgot-password-link"]')!;

	function typeEmail(value: string): void {
		const input = host().querySelector<HTMLInputElement>('input[type="email"]')!;
		input.value = value;
		input.dispatchEvent(new Event('input'));
		harness.detectChanges();
	}

	async function followLink(): Promise<void> {
		link().click();
		await harness.fixture.whenStable();
		harness.detectChanges();
	}

	it('renders a keyboard-accessible text link to the forgot password page', () => {
		expect(link().tagName).toBe('A');
		expect(link().textContent).toContain('AUTH.LOGIN.FORGOT_PASSWORD');
		expect(link().getAttribute('href')).toBe('/auth/forgot-password');
	});

	it('switches to the forgot password form when clicked', async () => {
		await followLink();

		expect(TestBed.inject(Router).url).toBe('/auth/forgot-password');
		expect(host().querySelector('[data-testid="forgot-password-form"]')).not.toBeNull();
	});

	it('carries a valid typed email over without exposing it in the URL', async () => {
		typeEmail('walker@example.com');

		await followLink();

		expect(TestBed.inject(Router).url).toBe('/auth/forgot-password');
		expect(host().querySelector<HTMLInputElement>('[data-testid="forgot-password-email"] input')!.value).toBe('walker@example.com');
	});

	it('does not carry over an invalid email', async () => {
		typeEmail('walker@');

		await followLink();

		expect(host().querySelector<HTMLInputElement>('[data-testid="forgot-password-email"] input')!.value).toBe('');
	});
});
