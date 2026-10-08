import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, Injector, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription, finalize, take, timer } from 'rxjs';
import { SbAlertComponent } from '../../components/atoms/sb-alert/sb-alert.component';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';
import { SbIconComponent } from '../../components/atoms/sb-icon/sb-icon.component';
import { SbInputComponent } from '../../components/atoms/sb-input/sb-input.component';
import { AuthFeatureService } from '../../features/auth/auth-feature.service';
import { passwordResetErrorKey } from './password-reset-errors';

export const RESEND_COOLDOWN_SECONDS = 30;
const EMAIL_MAX_LENGTH = 254;

@Component({
	selector: 'app-forgot-password-page',
	standalone: true,
	imports: [ReactiveFormsModule, RouterLink, TranslatePipe, SbAlertComponent, SbButtonComponent, SbIconComponent, SbInputComponent],
	templateUrl: './forgot-password-page.component.html'
})
export class ForgotPasswordPageComponent {
	private readonly fb = inject(FormBuilder);
	private readonly router = inject(Router);
	private readonly authFeatureService = inject(AuthFeatureService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly injector = inject(Injector);
	private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
	private cooldownSubscription: Subscription | null = null;

	protected readonly form = this.fb.nonNullable.group({
		email: [this.getPrefilledEmail(), [Validators.required, Validators.email, Validators.maxLength(EMAIL_MAX_LENGTH)]]
	});
	protected readonly submitting = signal(false);
	protected readonly errorKey = signal<string | null>(null);
	/** Address the generic confirmation refers to; set only after the API accepted the request. */
	protected readonly sentTo = signal<string | null>(null);
	protected readonly cooldownSeconds = signal(0);

	onSubmit(): void {
		if (this.submitting()) {
			return;
		}
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.send(this.form.controls.email.value.trim(), true);
	}

	onResend(): void {
		const email = this.sentTo();
		if (!email || this.submitting() || this.cooldownSeconds() > 0) {
			return;
		}

		this.send(email, false);
	}

	onChangeEmail(): void {
		this.stopCooldown();
		this.errorKey.set(null);
		this.sentTo.set(null);
		this.focusHeading();
	}

	private send(email: string, fromForm: boolean): void {
		this.submitting.set(true);
		this.errorKey.set(null);

		this.authFeatureService
			.requestPasswordReset(email)
			.pipe(
				finalize(() => this.submitting.set(false)),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe({
				next: () => {
					this.sentTo.set(email);
					this.startCooldown();
					if (fromForm) {
						this.focusHeading();
					}
				},
				error: (error: unknown) => this.errorKey.set(this.toErrorKey(error))
			});
	}

	private toErrorKey(error: unknown): string {
		if (error instanceof HttpErrorResponse && error.status === 400) {
			return 'AUTH.PASSWORD_RESET_ERRORS.INVALID_EMAIL';
		}

		return passwordResetErrorKey(error);
	}

	private startCooldown(): void {
		this.stopCooldown();
		this.cooldownSeconds.set(RESEND_COOLDOWN_SECONDS);
		this.cooldownSubscription = timer(1000, 1000)
			.pipe(take(RESEND_COOLDOWN_SECONDS), takeUntilDestroyed(this.destroyRef))
			.subscribe(() => this.cooldownSeconds.update((seconds) => Math.max(0, seconds - 1)));
	}

	private stopCooldown(): void {
		this.cooldownSubscription?.unsubscribe();
		this.cooldownSubscription = null;
		this.cooldownSeconds.set(0);
	}

	private focusHeading(): void {
		afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
	}

	private getPrefilledEmail(): string {
		const email = this.router.currentNavigation()?.extras.state?.['email'];
		return typeof email === 'string' ? email.slice(0, EMAIL_MAX_LENGTH) : '';
	}
}
