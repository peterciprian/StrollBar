import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { register, selectAuthError, selectAuthLoading } from '../../features/auth/auth.state';
import { passwordPolicyValidator } from '../../core/validators/password-policy.validator';
import { RecaptchaService } from '../../core/services/recaptcha.service';

@Component({
	selector: 'app-register-page',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, TranslatePipe],
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
