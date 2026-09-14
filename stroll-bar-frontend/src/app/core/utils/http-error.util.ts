import { HttpErrorResponse } from '@angular/common/http';

interface ErrorBody {
	message?: string | string[];
	error?: { code?: string; message?: string };
}

/** Returns the backend's machine-readable `error.code` from a v2 error envelope. */
export function extractErrorCode(error: unknown): string | null {
	if (error instanceof HttpErrorResponse) {
		return (error.error as ErrorBody | undefined)?.error?.code ?? null;
	}

	return null;
}

export function extractErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
	if (typeof error === 'string') {
		return error;
	}

	if (error instanceof HttpErrorResponse) {
		if (error.status === 0) {
			return 'Network error. Please check your connection.';
		}

		const body = error.error as ErrorBody | undefined;

		if (Array.isArray(body?.message)) {
			return body.message.join(', ');
		}

		if (body?.message) {
			return body.message;
		}

		if (body?.error?.message) {
			return body.error.message;
		}
	}

	return fallback;
}
