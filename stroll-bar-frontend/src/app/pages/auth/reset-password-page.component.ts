import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, Injector, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { SbAlertComponent } from '../../components/atoms/sb-alert/sb-alert.component';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';
import { SbIconComponent } from '../../components/atoms/sb-icon/sb-icon.component';
import { SbInputComponent } from '../../components/atoms/sb-input/sb-input.component';
import { extractErrorMessage } from '../../core/utils/http-error.util';
import { matchesControlValidator } from '../../core/validators/password-match.validator';
import { passwordPolicyValidator } from '../../core/validators/password-policy.validator';
import { AuthFeatureService } from '../../features/auth/auth-feature.service';
import { passwordResetErrorKey } from './password-reset-errors';

export type ResetPasswordView = 'form' | 'missing' | 'invalid' | 'success';

// Mirrors the backend ResetPasswordDto, so truncated or mangled links fail fast without a request.
const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const INVALID_TOKEN_STATUSES = new Set([401, 410]);

@Component({
	selector: 'app-reset-password-page',
	standalone: true,
	imports: [ReactiveFormsModule, RouterLink, TranslatePipe, SbAlertComponent, SbButtonComponent, SbIconComponent, SbInputComponent],
	templateUrl: './reset-password-page.component.html'
})
export class ResetPasswordPageComponent {
	private readonly fb = inject(FormBuilder);
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly authFeatureService = inject(AuthFeatureService);
	private readonly destroyRef = inject(DestroyRef);
	private readonly injector = inject(Injector);
	private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
	/** Lives only in this component instance: never in the store, browser storage, logs or the address bar. */
	private resetToken: string | null = null;

	protected readonly view = signal<ResetPasswordView>('missing');
	protected readonly submitting = signal(false);
	protected readonly errorKey = signal<string | null>(null);

	protected readonly form = this.fb.nonNullable.group({
		newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128), passwordPolicyValidator]],
		confirmPassword: ['', [Validators.required, matchesControlValidator('newPassword')]]
	});

	constructor() {
		this.form.controls.newPassword.valueChanges
			.pipe(takeUntilDestroyed())
			.subscribe(() => this.form.controls.confirmPassword.updateValueAndValidity());

		// A missing token keeps the initial 'missing' view; the emission caused by removing the token from
		// the URL is ignored so the captured token survives it.
		this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
			const token = params.get('token');
			if (token === null) {
				return;
			}

			this.acceptToken(token);
			afterNextRender(() => this.removeTokenFromUrl(), { injector: this.injector });
		});
	}

	onSubmit(): void {
		if (this.submitting()) {
			return;
		}

		const resetToken = this.resetToken;
		if (!resetToken) {
			this.showView('missing');
			return;
		}
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.submitting.set(true);
		this.errorKey.set(null);

		this.authFeatureService
			.resetPassword({ resetToken, newPassword: this.form.controls.newPassword.value })
			.pipe(
				finalize(() => this.submitting.set(false)),
				takeUntilDestroyed(this.destroyRef)
			)
			.subscribe({
				next: () => this.discardToken('success'),
				error: (error: unknown) => this.handleError(error)
			});
	}

	private acceptToken(token: string): void {
		this.form.reset();
		this.errorKey.set(null);

		if (RESET_TOKEN_PATTERN.test(token)) {
			this.resetToken = token;
			this.view.set('form');
			return;
		}

		this.resetToken = null;
		this.view.set('invalid');
	}

	private handleError(error: unknown): void {
		if (this.isInvalidTokenError(error)) {
			this.discardToken('invalid');
			return;
		}

		this.errorKey.set(
			error instanceof HttpErrorResponse && error.status === 400 ? 'AUTH.RESET_PASSWORD.REJECTED_ERROR' : passwordResetErrorKey(error)
		);
	}

	private isInvalidTokenError(error: unknown): boolean {
		if (!(error instanceof HttpErrorResponse)) {
			return false;
		}

		return INVALID_TOKEN_STATUSES.has(error.status) || (error.status === 400 && /reset ?token/i.test(extractErrorMessage(error, '')));
	}

	private discardToken(view: 'success' | 'invalid'): void {
		this.resetToken = null;
		this.form.reset();
		this.showView(view);
	}

	private showView(view: ResetPasswordView): void {
		this.view.set(view);
		afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
	}

	private removeTokenFromUrl(): void {
		void this.router.navigate([], {
			relativeTo: this.route,
			queryParams: { token: null },
			queryParamsHandling: 'merge',
			replaceUrl: true
		});
	}
}
