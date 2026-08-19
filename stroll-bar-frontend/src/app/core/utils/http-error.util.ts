import { HttpErrorResponse } from '@angular/common/http';

export function extractErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
	if (typeof error === 'string') {
		return error;
	}

	if (error instanceof HttpErrorResponse) {
		if (error.status === 0) {
			return 'Network error. Please check your connection.';
		}

		const body = error.error as { message?: string | string[] } | undefined;

		if (Array.isArray(body?.message)) {
			return body.message.join(', ');
		}

		if (body?.message) {
			return body.message;
		}
	}

	return fallback;
}
