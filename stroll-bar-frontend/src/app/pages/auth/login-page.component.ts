import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { finalize } from 'rxjs';
import { SbAlertComponent } from '../../components/atoms/sb-alert/sb-alert.component';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';
import { SbIconComponent } from '../../components/atoms/sb-icon/sb-icon.component';
import { SbInputComponent } from '../../components/atoms/sb-input/sb-input.component';
import { SocialAuthProvider } from '../../core/api/models';
import { AuthFeatureService } from '../../features/auth/auth-feature.service';
import { logIn, selectAuthError, selectAuthLoading } from '../../features/auth/auth.state';

@Component({
	selector: 'app-login-page',
	standalone: true,
	imports: [ReactiveFormsModule, RouterLink, TranslatePipe, SbAlertComponent, SbButtonComponent, SbIconComponent, SbInputComponent],
	templateUrl: './login-page.component.html'
})
export class LoginPageComponent {
	private readonly fb = inject(FormBuilder);
	private readonly store = inject(Store);
	private readonly authFeatureService = inject(AuthFeatureService);

	protected readonly loading = this.store.selectSignal(selectAuthLoading);
	protected readonly error = this.store.selectSignal(selectAuthError);
	protected socialProviderLoading: SocialAuthProvider | null = null;
	protected readonly socialProviders: Array<{ provider: SocialAuthProvider; labelKey: string }> = [
		{ provider: 'apple', labelKey: 'AUTH.LOGIN.SOCIAL.APPLE' },
		{ provider: 'google', labelKey: 'AUTH.LOGIN.SOCIAL.GOOGLE' },
		{ provider: 'facebook', labelKey: 'AUTH.LOGIN.SOCIAL.FACEBOOK' },
		{ provider: 'twitter', labelKey: 'AUTH.LOGIN.SOCIAL.TWITTER' }
	];

	protected readonly form = this.fb.nonNullable.group({
		email: ['', [Validators.required, Validators.email]],
		password: ['', [Validators.required]]
	});

	onSubmit(): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.store.dispatch(logIn({ user: this.form.getRawValue() }));
	}

	onSocialLogin(provider: SocialAuthProvider): void {
		this.socialProviderLoading = provider;
		this.authFeatureService
			.startSocialLogin(provider)
			.pipe(finalize(() => (this.socialProviderLoading = null)))
			.subscribe();
	}
}
