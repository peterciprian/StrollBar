import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';
import { AuthFeatureService } from '../../features/auth/auth-feature.service';
import { extractErrorMessage } from '../../core/utils/http-error.util';
import { fetchMe } from '../../features/auth/auth.state';

@Component({
	selector: 'app-verify-email-page',
	standalone: true,
	imports: [CommonModule, RouterLink, TranslatePipe],
	template: `
		<section class="verify-email-page">
			@if (status() === 'pending') {
				<h1>{{ 'AUTH.VERIFY_EMAIL.PENDING_TITLE' | translate }}</h1>
				<p>{{ 'AUTH.VERIFY_EMAIL.PENDING_MESSAGE' | translate }}</p>
			} @else if (status() === 'success') {
				<h1>{{ 'AUTH.VERIFY_EMAIL.SUCCESS_TITLE' | translate }}</h1>
				<p>{{ 'AUTH.VERIFY_EMAIL.SUCCESS_MESSAGE' | translate }}</p>
				<a routerLink="/explore">{{ 'AUTH.VERIFY_EMAIL.CONTINUE_LINK' | translate }}</a>
			} @else {
				<h1>{{ 'AUTH.VERIFY_EMAIL.ERROR_TITLE' | translate }}</h1>
				<p>{{ errorMessage() }}</p>
				<a routerLink="/auth/login">{{ 'AUTH.VERIFY_EMAIL.BACK_TO_LOGIN_LINK' | translate }}</a>
			}
		</section>
	`
})
export class VerifyEmailPageComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly store = inject(Store);
	private readonly authFeatureService = inject(AuthFeatureService);
	private readonly translate = inject(TranslateService);

	protected readonly status = signal<'pending' | 'success' | 'error'>('pending');
	protected readonly errorMessage = signal('');

	ngOnInit(): void {
		const token = this.route.snapshot.queryParamMap.get('token');

		if (!token) {
			this.status.set('error');
			this.errorMessage.set(this.translate.instant('AUTH.VERIFY_EMAIL.MISSING_TOKEN'));
			return;
		}

		this.authFeatureService
			.verifyEmail({ token })
			.pipe(catchError((error) => of({ error: extractErrorMessage(error) })))
			.subscribe((result) => {
				if ('error' in result) {
					this.status.set('error');
					this.errorMessage.set(result.error);
					return;
				}

				this.status.set('success');
				this.store.dispatch(fetchMe());
			});
	}
}
