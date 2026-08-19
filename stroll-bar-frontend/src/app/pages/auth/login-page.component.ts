import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Store } from '@ngrx/store';
import { logIn, selectAuthError, selectAuthLoading } from '../../features/auth/auth.state';

@Component({
	selector: 'app-login-page',
	standalone: true,
	imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
	templateUrl: './login-page.component.html'
})
export class LoginPageComponent {
	private readonly fb = inject(FormBuilder);
	private readonly store = inject(Store);

	protected readonly loading = this.store.selectSignal(selectAuthLoading);
	protected readonly error = this.store.selectSignal(selectAuthError);

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
}
