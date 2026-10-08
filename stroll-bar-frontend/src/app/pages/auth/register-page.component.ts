import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { SbAlertComponent } from '../../components/atoms/sb-alert/sb-alert.component';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';
import { SbIconComponent } from '../../components/atoms/sb-icon/sb-icon.component';
import { SbInputComponent } from '../../components/atoms/sb-input/sb-input.component';
import { register, selectAuthError, selectAuthLoading } from '../../features/auth/auth.state';
import { passwordPolicyValidator } from '../../core/validators/password-policy.validator';
import { RecaptchaService } from '../../core/services/recaptcha.service';

@Component({
	selector: 'app-register-page',
	standalone: true,
	imports: [ReactiveFormsModule, RouterLink, TranslatePipe, SbAlertComponent, SbButtonComponent, SbIconComponent, SbInputComponent],
	templateUrl: './register-page.component.html'
})
export class RegisterPageComponent implements OnInit {
	private readonly fb = inject(FormBuilder);
	private readonly store = inject(Store);
	private readonly recaptcha = inject(RecaptchaService);

	protected readonly loading = this.store.selectSignal(selectAuthLoading);
	protected readonly error = this.store.selectSignal(selectAuthError);
	protected readonly captchaReady = this.recaptcha.ready;
	protected readonly captchaFailed = signal(false);
	protected readonly verifying = signal(false);

	protected readonly form = this.fb.nonNullable.group({
		username: ['', [Validators.required, Validators.minLength(3)]],
		email: ['', [Validators.required, Validators.email]],
		password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128), passwordPolicyValidator]]
	});

	ngOnInit(): void {
		this.recaptcha.load().catch(() => this.captchaFailed.set(true));
	}

	async onSubmit(): Promise<void> {
		if (this.form.invalid || this.verifying() || !this.captchaReady()) {
			this.form.markAllAsTouched();
			return;
		}

		this.captchaFailed.set(false);
		this.verifying.set(true);
		try {
			const recaptchaToken = await this.recaptcha.execute('register');
			this.store.dispatch(register({ user: { ...this.form.getRawValue(), ...(recaptchaToken ? { recaptchaToken } : {}) } }));
		} catch {
			this.captchaFailed.set(true);
		} finally {
			this.verifying.set(false);
		}
	}
}
