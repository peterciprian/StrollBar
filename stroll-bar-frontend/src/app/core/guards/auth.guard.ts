import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';

export const authGuard: CanActivateFn = (_route, state) => {
	const tokenStorage = inject(TokenStorageService);
	const router = inject(Router);

	if (tokenStorage.getAccessToken()) {
		return true;
	}

	return router.createUrlTree(['/auth/login'], {
		queryParams: { returnUrl: state.url }
	});
};
