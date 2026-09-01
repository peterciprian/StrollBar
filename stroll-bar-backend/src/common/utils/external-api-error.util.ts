import { HttpException, UnauthorizedException } from '@nestjs/common';

/**
 * Normalized error response from external API calls.
 * Provides a consistent interface for handling OAuth, S3, and other external failures.
 */
export type ExternalApiError = {
	code: string;
	message: string;
	originalError?: any;
	isRetryable: boolean;
	statusCode?: number;
};

/**
 * Normalize errors from external API calls (OAuth providers, S3, etc.)
 * into a consistent format for logging and user-facing error handling.
 */
export function normalizeExternalApiError(error: any, context: string): ExternalApiError {
	// Network/timeout errors
	if (error instanceof TypeError && error.message.includes('fetch')) {
		return {
			code: 'NETWORK_ERROR',
			message: `Failed to reach ${context}: ${error.message}`,
			originalError: error,
			isRetryable: true
		};
	}

	if (error?.message?.includes('timed out')) {
		return {
			code: 'TIMEOUT_ERROR',
			message: `Request to ${context} timed out`,
			originalError: error,
			isRetryable: true
		};
	}

	if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
		return {
			code: error.code,
			message: `Connection error to ${context}: ${error.message}`,
			originalError: error,
			isRetryable: true
		};
	}

	// HTTP response errors
	if (error?.response?.status) {
		const status = error.response.status;
		const isRetryable = status >= 500 || status === 429;

		return {
			code: `HTTP_${status}`,
			message: `${context} returned ${status}: ${error.response.statusText || error.message}`,
			originalError: error,
			isRetryable,
			statusCode: status
		};
	}

	// Parse fetch response errors
	if (error?.statusText) {
		const statusCode = error.statusCode || error.status || 500;
		const isRetryable = statusCode >= 500;

		return {
			code: `HTTP_${statusCode}`,
			message: `${context} error: ${error.statusText} - ${error.message}`,
			originalError: error,
			isRetryable,
			statusCode
		};
	}

	// OAuth/JWT specific errors
	if (error?.message?.includes('JWT') || error?.message?.includes('token')) {
		return {
			code: 'TOKEN_ERROR',
			message: `Token validation failed for ${context}: ${error.message}`,
			originalError: error,
			isRetryable: false // Token errors are not retryable
		};
	}

	// Generic fallback
	return {
		code: 'EXTERNAL_API_ERROR',
		message: `Error calling ${context}: ${error?.message || String(error)}`,
		originalError: error,
		isRetryable: false
	};
}

/**
 * Log an external API error for debugging and monitoring.
 */
export function logExternalApiError(error: ExternalApiError, context: string, logger: any): void {
	const level = error.isRetryable ? 'warn' : 'error';
	const retryNote = error.isRetryable ? ' (will retry)' : ' (not retryable)';

	logger[level](`[${context}] ${error.code}: ${error.message}${retryNote}`, {
		code: error.code,
		statusCode: error.statusCode,
		isRetryable: error.isRetryable,
		originalError: error.originalError
	});
}

/**
 * Convert a normalized external API error to a user-facing HTTP exception.
 */
export function externalApiErrorToHttpException(error: ExternalApiError, defaultStatusCode: number = 500): HttpException {
	// Token/auth errors -> 401
	if (error.code === 'TOKEN_ERROR' || error.code === 'NETWORK_ERROR') {
		return new UnauthorizedException(
			error.code === 'TOKEN_ERROR'
				? `Authentication with provider failed. Please try again.`
				: `Unable to reach authentication provider. Please try again.`
		);
	}

	// Rate limiting -> 429
	if (error.statusCode === 429) {
		return new HttpException('Too many requests. Please try again later.', 429);
	}

	// Server errors -> 503 (service unavailable)
	if (error.isRetryable) {
		return new HttpException(`Service temporarily unavailable. Please try again in a moment.`, 503);
	}

	// Client errors and fallback -> configured status code
	return new HttpException(`An error occurred. Please try again.`, defaultStatusCode);
}
