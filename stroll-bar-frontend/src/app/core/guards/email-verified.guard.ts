import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { filter, map, take } from 'rxjs';
import { selectUser } from '../../features/auth/auth.state';
import { NotificationService } from '../services/notification.service';
import { TokenStorageService } from '../services/token-storage.service';

export const emailVerifiedGuard: CanActivateFn = (_route, state) => {
	const tokenStorage = inject(TokenStorageService);
	const router = inject(Router);
	const store = inject(Store);
	const notification = inject(NotificationService);
	const translate = inject(TranslateService);

	if (!tokenStorage.getAccessToken()) {
		return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
	}

	// The profile is fetched during app initialization, so wait until it resolves before deciding.
	return store.select(selectUser).pipe(
		filter((user) => !user.sessionChecking),
		take(1),
		map((user) => {
			if (!user.id) {
				return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
			}

			if (user.emailVerified) {
				return true;
			}

			notification.showError(translate.instant('ERRORS.EMAIL_NOT_VERIFIED'));
			return router.createUrlTree(['/settings/profile']);
		})
	);
};
