import { signal, computed } from '@angular/core';

/**
 * Reusable async loading state management for components.
 * Encapsulates loading, error, and data state with typed signals.
 *
 * Usage:
 * ```typescript
 * export class MyComponent {
 *   private readonly api = inject(SomeApiService);
 *
 *   protected readonly adventureState = new AsyncLoadingState<Adventure>();
 *
 *   ngOnInit(): void {
 *     this.api.get(id).subscribe(
 *       result => this.adventureState.setSuccess(result),
 *       error => this.adventureState.setError('Failed to load')
 *     );
 *   }
 * }
 *
 * // In template:
 * // @if (adventureState.loading()) { Loading... }
 * // @if (adventureState.error()) { {{ adventureState.error() }} }
 * // @if (adventureState.data()) { {{ adventureState.data() | json }} }
 * ```
 */
export class AsyncLoadingState<T> {
	/** Loading state signal */
	readonly loading = signal(false);

	/** Error state signal */
	readonly error = signal<string | null>(null);

	/** Data state signal */
	readonly data = signal<T | null>(null);

	/** Computed: true if operation completed (success or error) */
	readonly isComplete = computed(() => !this.loading());

	/** Computed: true if operation succeeded */
	readonly isSuccess = computed(() => this.isComplete() && !this.error());

	/** Computed: true if operation failed */
	readonly isFailure = computed(() => this.isComplete() && !!this.error());

	/**
	 * Set loading state and clear error.
	 * Call before starting an async operation.
	 */
	setLoading(): void {
		this.loading.set(true);
		this.error.set(null);
	}

	/**
	 * Set success state with data.
	 * Call in the `next` handler of a subscription.
	 */
	setSuccess(data: T): void {
		this.data.set(data);
		this.error.set(null);
		this.loading.set(false);
	}

	/**
	 * Set error state and clear data.
	 * Call in the `error` handler of a subscription.
	 */
	setError(errorMessage: string): void {
		this.error.set(errorMessage);
		this.data.set(null);
		this.loading.set(false);
	}

	/**
	 * Reset state to initial values.
	 */
	reset(): void {
		this.loading.set(false);
		this.error.set(null);
		this.data.set(null);
	}
}

/**
 * Simplified async loading state for simple loading + error tracking (no data signal).
 * Use when you don't need to track data separately.
 *
 * Usage:
 * ```typescript
 * protected readonly submitting = new SimpleAsyncState();
 *
 * protected submit(): void {
 *   this.submitting.setLoading();
 *   this.api.submit().subscribe({
 *     next: () => this.submitting.setSuccess(),
 *     error: () => this.submitting.setError('Submit failed')
 *   });
 * }
 * ```
 */
export class SimpleAsyncState {
	readonly loading = signal(false);
	readonly error = signal<string | null>(null);
	readonly isComplete = computed(() => !this.loading());
	readonly isSuccess = computed(() => this.isComplete() && !this.error());
	readonly isFailure = computed(() => this.isComplete() && !!this.error());

	setLoading(): void {
		this.loading.set(true);
		this.error.set(null);
	}

	setSuccess(): void {
		this.error.set(null);
		this.loading.set(false);
	}

	setError(errorMessage: string): void {
		this.error.set(errorMessage);
		this.loading.set(false);
	}

	reset(): void {
		this.loading.set(false);
		this.error.set(null);
	}
}
