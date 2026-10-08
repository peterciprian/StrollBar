import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslatePipe } from '@ngx-translate/core';
import { SbPageHeaderComponent } from '../../components/atoms/sb-page-header/sb-page-header.component';
import { AuthFeatureService } from '../../features/auth/auth-feature.service';
import { fetchMe, socialLoginFailure } from '../../features/auth/auth.state';

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

	ngOnInit(): void {
		const params = this.route.snapshot.queryParamMap;
		const accessToken = params.get('accessToken');
		const refreshToken = params.get('refreshToken');
		const error = params.get('error');

		if (accessToken && refreshToken) {
			this.authFeatureService.completeSocialLogin(accessToken, refreshToken);
			this.store.dispatch(fetchMe());
			this.router.navigateByUrl(this.getReturnUrl() ?? '/explore');
			return;
		}

		this.store.dispatch(socialLoginFailure({ error: error ?? 'Social login failed.' }));
		this.router.navigateByUrl('/auth/login');
	}

	private getReturnUrl(): string | null {
		const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

		if (!returnUrl || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
			return null;
		}

		return returnUrl;
	}
}
