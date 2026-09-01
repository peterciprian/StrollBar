import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { catchError, finalize, of } from 'rxjs';
import { AuthFeatureService } from '../../../features/auth/auth-feature.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/http-error.util';
import {
	changePassword,
	selectPasswordSaveError,
	selectPasswordSaving,
	selectProfileSaveError,
	selectProfileSaving,
	selectUser,
	updateProfile
} from '../../../features/auth/auth.state';

function matchesNewPasswordValidator(control: AbstractControl): ValidationErrors | null {
	const newPassword = control.parent?.get('newPassword')?.value;
	return newPassword && control.value && control.value !== newPassword ? { passwordMismatch: true } : null;
}

@Component({
	selector: 'app-settings-profile',
	standalone: true,
	imports: [UpperCasePipe, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, TranslatePipe],
	templateUrl: './settings-profile.component.html',
	styleUrls: ['./settings-profile.component.scss']
})
export class SettingsProfileComponent {
	private readonly fb = inject(FormBuilder);
	private readonly store = inject(Store);
	private readonly datePipe = new DatePipe('en-US');
	private readonly authFeatureService = inject(AuthFeatureService);
	private readonly notification = inject(NotificationService);

	protected readonly user = this.store.selectSignal(selectUser);
	protected readonly saving = this.store.selectSignal(selectProfileSaving);
	protected readonly saveError = this.store.selectSignal(selectProfileSaveError);
	protected readonly resendingVerification = signal(false);
	protected readonly memberSince = computed(() => {
		const createdAt = this.user().createdAt;
		return createdAt ? (this.datePipe.transform(createdAt, 'MMMM y') ?? '') : '';
	});

	protected readonly form = this.fb.nonNullable.group({
		username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]]
	});

	protected readonly passwordSaving = this.store.selectSignal(selectPasswordSaving);
	protected readonly passwordSaveError = this.store.selectSignal(selectPasswordSaveError);

	protected readonly passwordForm = this.fb.nonNullable.group({
		currentPassword: ['', [Validators.required]],
		newPassword: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
		confirmPassword: ['', [Validators.required, matchesNewPasswordValidator]]
	});

	constructor() {
		// Keep the form in sync with the loaded/updated user while the user hasn't started editing.
		effect(() => {
			const user = this.user();
			if (user.id && this.form.pristine) {
				this.form.setValue({ username: user.username });
			}
		});

		// Re-check the confirm-password match whenever the new password changes.
		this.passwordForm.controls.newPassword.valueChanges.subscribe(() => {
			this.passwordForm.controls.confirmPassword.updateValueAndValidity({ emitEvent: false });
		});
	}

	onSubmit(): void {
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}

		this.store.dispatch(updateProfile({ user: this.form.getRawValue() }));
		this.form.markAsPristine();
	}

	onChangePassword(): void {
		if (this.passwordForm.invalid) {
			this.passwordForm.markAllAsTouched();
			return;
		}

		const { currentPassword, newPassword } = this.passwordForm.getRawValue();
		this.store.dispatch(changePassword({ payload: { currentPassword, newPassword } }));
		this.passwordForm.reset();
	}

	onResendVerification(): void {
		this.resendingVerification.set(true);
		this.authFeatureService
			.resendVerificationEmail()
			.pipe(
				catchError((error) => {
					this.notification.showError(extractErrorMessage(error));
					return of(null);
				}),
				finalize(() => this.resendingVerification.set(false))
			)
			.subscribe((result) => {
				if (result) {
					this.notification.showSuccess(result.message);
				}
			});
	}
}
