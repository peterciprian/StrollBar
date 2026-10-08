import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from './notification.service';
import { extractErrorMessage } from '../utils/http-error.util';

// /auth/me: background session check on load/refresh; a 401 there just means "not logged in".
// /auth/password-reset/: the forgot/reset pages render every failure inline, so a toast would duplicate it.
const SILENT_ENDPOINTS = ['/auth/me', '/auth/password-reset/'];

export const errorNotificationInterceptor: HttpInterceptorFn = (request, next) => {
	const notification = inject(NotificationService);

	return next(request).pipe(
		catchError((error: unknown) => {
			const isSilent = SILENT_ENDPOINTS.some((path) => request.url.includes(path));

			if (!isSilent && error instanceof HttpErrorResponse) {
				notification.showError(extractErrorMessage(error));
			}

			return throwError(() => error);
		})
	);
};
