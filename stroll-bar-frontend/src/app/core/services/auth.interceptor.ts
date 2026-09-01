import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthRefreshService } from './auth-refresh.service';
import { TokenStorageService } from './token-storage.service';
import { sessionExpired } from '../../features/auth/auth.state';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (request, next) => {
	const tokenStorage = inject(TokenStorageService);
	const refreshService = inject(AuthRefreshService);
	const store = inject(Store);
	const router = inject(Router);

	const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => request.url.includes(path));
	const accessToken = tokenStorage.getAccessToken();
	const authorizedRequest = accessToken && !isAuthEndpoint ? request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }) : request;

	const handleSessionExpired = (): void => {
		refreshService.clearRefreshState();
		store.dispatch(sessionExpired());
		router.navigateByUrl('/auth/login');
	};

	return next(authorizedRequest).pipe(
		catchError((error: unknown) => {
			if (isAuthEndpoint || !accessToken || !(error instanceof HttpErrorResponse) || error.status !== 401) {
				return throwError(() => error);
			}

			return refreshService.refreshAccessToken().pipe(
				switchMap((newAccessToken) => next(authorizedRequest.clone({ setHeaders: { Authorization: `Bearer ${newAccessToken}` } }))),
				catchError((refreshError: unknown) => {
					handleSessionExpired();
					return throwError(() => refreshError);
				})
			);
		})
	);
};
