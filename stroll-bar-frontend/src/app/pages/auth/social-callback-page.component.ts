import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { SbPageHeaderComponent } from '../../components/atoms/sb-page-header/sb-page-header.component';
import { AuthFeatureService } from '../../features/auth/auth-feature.service';
import { fetchMe, socialLoginFailure } from '../../features/auth/auth.state';
import { extractErrorMessage } from '../../core/utils/http-error.util';

@Component({
	selector: 'app-social-callback-page',
	standalone: true,
	imports: [TranslatePipe, SbPageHeaderComponent],
	template: `
		<section>
			<sb-page-header icon="sync" [title]="'AUTH.SOCIAL_CALLBACK.TITLE' | translate" [subtitle]="'AUTH.SOCIAL_CALLBACK.MESSAGE' | translate" />
		</section>
	`
})
export class SocialCallbackPageComponent implements OnInit {
	private readonly route = inject(ActivatedRoute);
	private readonly router = inject(Router);
	private readonly store = inject(Store);
	private readonly authFeatureService = inject(AuthFeatureService);
	private readonly platformId = inject(PLATFORM_ID);

	ngOnInit(): void {
		if (!isPlatformBrowser(this.platformId)) return;
		const params = this.route.snapshot.queryParamMap;
		const code = params.get('code');
		const transactionId = params.get('transactionId');
		const invalid = params.has('accessToken') || params.has('refreshToken') || params.has('error') ||
			params.getAll('code').length !== 1 || params.getAll('transactionId').length !== 1;
		// Remove navigable proof promptly, including legacy bearer-credential URLs.
		void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
		if (invalid) {
			this.fail();
			return;
		}
		this.authFeatureService.completeSocialLogin(code, transactionId).subscribe({
			next: (returnUrl) => {
				this.store.dispatch(fetchMe());
				void this.router.navigateByUrl(returnUrl, { replaceUrl: true });
			},
			error: (error: unknown) => this.fail(error)
		});
	}

	private fail(error?: unknown): void {
		const fallback = 'Social login failed. Please start again.';
		this.store.dispatch(socialLoginFailure({ error: error instanceof HttpErrorResponse ? extractErrorMessage(error, fallback) : fallback }));
		void this.router.navigateByUrl('/auth/login', { replaceUrl: true });
	}
}
