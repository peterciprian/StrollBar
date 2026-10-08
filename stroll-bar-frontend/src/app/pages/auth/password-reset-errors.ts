import { HttpErrorResponse } from '@angular/common/http';

/** Translation key for failures shared by the forgot-password and reset-password pages. */
export function passwordResetErrorKey(error: unknown): string {
	if (error instanceof HttpErrorResponse) {
		if (error.status === 0) {
			return 'AUTH.PASSWORD_RESET_ERRORS.NETWORK';
		}
		if (error.status === 429) {
			return 'AUTH.PASSWORD_RESET_ERRORS.RATE_LIMITED';
		}
	}

	return 'AUTH.PASSWORD_RESET_ERRORS.GENERIC';
}
