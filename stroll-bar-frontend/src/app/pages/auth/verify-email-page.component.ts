import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, of } from 'rxjs';
import { SbAlertComponent } from '../../components/atoms/sb-alert/sb-alert.component';
import { SbButtonComponent } from '../../components/atoms/sb-button/sb-button.component';
import { SbPageHeaderComponent } from '../../components/atoms/sb-page-header/sb-page-header.component';
import { AuthFeatureService } from '../../features/auth/auth-feature.service';
import { extractErrorMessage } from '../../core/utils/http-error.util';
import { fetchMe } from '../../features/auth/auth.state';

@Component({
	selector: 'app-verify-email-page',
	standalone: true,
	imports: [TranslatePipe, SbAlertComponent, SbButtonComponent, SbPageHeaderComponent],
	template: `
		<section class="verify-email-page">
			@if (status() === 'pending') {
				<sb-page-header
					icon="mark_email_read"
					[title]="'AUTH.VERIFY_EMAIL.PENDING_TITLE' | translate"
					[subtitle]="'AUTH.VERIFY_EMAIL.PENDING_MESSAGE' | translate"
				/>
			} @else if (status() === 'success') {
				<sb-page-header
					icon="check_circle"
					[title]="'AUTH.VERIFY_EMAIL.SUCCESS_TITLE' | translate"
					[subtitle]="'AUTH.VERIFY_EMAIL.SUCCESS_MESSAGE' | translate"
				>
					<sb-button routerLink="/explore" [label]="'AUTH.VERIFY_EMAIL.CONTINUE_LINK' | translate" />
				</sb-page-header>
			} @else {
				<sb-page-header icon="error_outline" [title]="'AUTH.VERIFY_EMAIL.ERROR_TITLE' | translate">
					<sb-button variant="secondary" routerLink="/auth/login" [label]="'AUTH.VERIFY_EMAIL.BACK_TO_LOGIN_LINK' | translate" />
				</sb-page-header>
				<sb-alert tone="danger" [message]="errorMessage()" />
			}
		</section>
	`
})
export class VerifyEmailPageComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly store = inject(Store);
	private readonly authFeatureService = inject(AuthFeatureService);
	private readonly translate = inject(TranslateService);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly status = signal<'pending' | 'success' | 'error'>('pending');
	protected readonly errorMessage = signal('');

	ngOnInit(): void {
		const token = this.route.snapshot.queryParamMap.get('token');

		if (!token) {
			this.status.set('error');
			this.translate
				.stream('AUTH.VERIFY_EMAIL.MISSING_TOKEN')
				.pipe(takeUntilDestroyed(this.destroyRef))
				.subscribe((message) => this.errorMessage.set(message));
			return;
		}

		this.authFeatureService
			.verifyEmail({ token })
			.pipe(
				takeUntilDestroyed(this.destroyRef),
				catchError((error) => of({ error: extractErrorMessage(error) }))
			)
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
