import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs';
import { selectUser } from '../../features/auth/auth.state';
import { UserRole } from '../models/user-role.enum';
import { TokenStorageService } from '../services/token-storage.service';

export const adminGuard: CanActivateFn = (_route, state) => {
	const tokenStorage = inject(TokenStorageService);
	const router = inject(Router);
	const store = inject(Store);

	const loginRedirect = () => router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });

	if (!tokenStorage.getAccessToken()) {
		return loginRedirect();
	}

	// The profile is fetched during app initialization, so wait until it resolves before deciding.
	return store.select(selectUser).pipe(
		filter((user) => !user.loading),
		take(1),
		map((user) => {
			if (!user.id) {
				return loginRedirect();
			}

			return user.role === UserRole.ADMIN ? true : router.createUrlTree(['/explore']);
		})
	);
};
