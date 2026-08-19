import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { TokenStorageService } from './token-storage.service';
import { logout } from '../../features/auth/auth.state';

const AUTH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh'];

// Shared across requests so concurrent 401s trigger a single refresh call.
let refreshInFlight$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (request, next) => {
	const tokenStorage = inject(TokenStorageService);
	const api = inject(ApiClientService);
	const store = inject(Store);
	const router = inject(Router);

	const isAuthEndpoint = AUTH_ENDPOINTS.some((path) => request.url.includes(path));
	const accessToken = tokenStorage.getAccessToken();
	const authorizedRequest = accessToken && !isAuthEndpoint ? request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }) : request;

	const handleSessionExpired = (): void => {
		tokenStorage.clear();
		store.dispatch(logout());
		router.navigateByUrl('/auth/login');
	};

	const refreshAccessToken = (): Observable<string> => {
		const refreshToken = tokenStorage.getRefreshToken();

		if (!refreshToken) {
			return throwError(() => new Error('No refresh token available.'));
		}

		if (!refreshInFlight$) {
			refreshInFlight$ = api.refresh({ refreshToken }).pipe(
				map((response) => {
					tokenStorage.setTokens(response.accessToken, response.refreshToken);
					return response.accessToken;
				}),
				finalize(() => (refreshInFlight$ = null)),
				shareReplay(1)
			);
		}

		return refreshInFlight$;
	};

	return next(authorizedRequest).pipe(
		catchError((error: unknown) => {
			if (isAuthEndpoint || !(error instanceof HttpErrorResponse) || error.status !== 401) {
				return throwError(() => error);
			}

			return refreshAccessToken().pipe(
				switchMap((newAccessToken) => next(authorizedRequest.clone({ setHeaders: { Authorization: `Bearer ${newAccessToken}` } }))),
				catchError((refreshError: unknown) => {
					handleSessionExpired();
					return throwError(() => refreshError);
				})
			);
		})
	);
};
