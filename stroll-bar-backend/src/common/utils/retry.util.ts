/**
 * Retry configuration and utilities for external API calls.
 * Provides exponential backoff with jitter for resilient integration patterns.
 */

export type RetryOptions = {
	maxAttempts?: number;
	initialDelayMs?: number;
	maxDelayMs?: number;
	backoffMultiplier?: number;
	jitterFactor?: number;
	isRetryable?: (error: any) => boolean;
};

const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxAttempts: 3,
	initialDelayMs: 100,
	maxDelayMs: 5000,
	backoffMultiplier: 2,
	jitterFactor: 0.1,
	isRetryable: (error: any) => {
		// Retry on network errors and 5xx responses
		if (error instanceof TypeError) return true; // Network error
		if (error?.response?.status >= 500) return true; // Server error
		if (error?.code === 'ETIMEDOUT') return true; // Timeout
		if (error?.code === 'ECONNREFUSED') return true; // Connection refused
		return false;
	}
};

/**
 * Execute a function with exponential backoff retry logic.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	let lastError: any;

	for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry on non-retryable errors
			if (!opts.isRetryable(error)) {
				throw error;
			}

			// Don't retry on the last attempt
			if (attempt === opts.maxAttempts) {
				throw error;
			}

			// Calculate delay with exponential backoff and jitter
			const exponentialDelay = opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1);
			const cappedDelay = Math.min(exponentialDelay, opts.maxDelayMs);
			const jitter = cappedDelay * opts.jitterFactor * Math.random();
			const delayMs = cappedDelay + jitter;

			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	throw lastError;
}

/**
 * Execute a function with a timeout.
 */
export async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
	return Promise.race([
		fn(),
		new Promise<T>((_resolve, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs))
	]);
}

/**
 * Execute a function with both timeout and retry logic.
 */
export async function withTimeoutAndRetry<T>(fn: () => Promise<T>, timeoutMs: number, retryOptions: RetryOptions = {}): Promise<T> {
	return withRetry(() => withTimeout(fn, timeoutMs), {
		...retryOptions,
		// Don't retry on timeout errors by default (they indicate a transient issue but retrying may compound the problem)
		isRetryable:
			retryOptions.isRetryable ||
			((error) => {
				if (error?.message?.includes('timed out')) return true;
				return DEFAULT_OPTIONS.isRetryable(error);
			})
	});
}
