# Frontend State and Data Flow Architecture

This document describes the recommended patterns for managing asynchronous data flows and state in StrollBar frontend components.

## Overview

The StrollBar frontend uses a combination of:

- **NgRx Store**: Global auth state (user info, token management)
- **Feature Services**: Domain-specific data access and operations (strolls, adventures, etc.)
- **Signals**: Local component state (UI state, loading flags, errors)
- **RxJS Observables**: Async operations and data streams

## Data Flow Patterns

### Pattern 1: Initial Data Load with Error Handling

**Scenario**: Component needs to fetch data on initialization (e.g., adventure details on page load)

```typescript
export class AdventureScreenComponent implements OnInit {
	private readonly adventuresFeature = inject(AdventuresFeatureService);

	protected loading = signal(true);
	protected error = signal<string | null>(null);
	protected data = signal<Adventure | null>(null);

	ngOnInit(): void {
		this.adventuresFeature.get(adventureId).subscribe({
			next: (detail) => {
				this.data.set(detail);
				this.error.set(null);
				this.loading.set(false);
			},
			error: (err) => {
				this.error.set('Failed to load adventure');
				this.loading.set(false);
				this.data.set(null); // Optional: clear partial data on error
			}
		});
	}
}
```

**Key points:**

- Use `signal()` for loading, error, and data state
- Set loading to `true` before subscription (or at the start of ngOnInit)
- Clear error state on successful load
- Set both error and clear data on failure
- Always clear loading flag in both success and error paths

### Pattern 2: Async Operations with Loading State

**Scenario**: User action triggers an async operation (e.g., submitting an answer)

```typescript
protected async submitAnswer(): Promise<void> {
  if (!this.currentStage || !this.answer.trim()) {
    return;
  }

  this.submitting.set(true);
  this.submitError.set(null);

  this.adventuresFeature
    .submitAnswer(this.adventureId, this.currentStage.id, this.answer)
    .subscribe({
      next: (result) => {
        this.applyAnswerResult(result);
        this.submitting.set(false);
      },
      error: (err) => {
        this.submitError.set('Failed to submit answer');
        this.submitting.set(false);
      }
    });
}
```

**Key points:**

- Set a dedicated loading signal for that operation (e.g., `submitting`, `saving`)
- Use `.subscribe()` with explicit `next` and `error` handlers
- Clear loading state in both paths
- Set error messages for user feedback
- Disable submit button while `submitting.set(true)`

### Pattern 3: List Loading with Filtering

**Scenario**: Fetch a list on initialization, with client-side filtering (e.g., tour browser)

```typescript
export class TourBrowserComponent implements OnInit {
	private readonly strollsFeature = inject(StrollsFeatureService);

	protected tours = signal<Tour[]>([]);
	protected loading = signal(true);
	protected error = signal<string | null>(null);
	protected searchTerm = '';
	protected activeCategory = 'All';

	// Computed filter results - runs reactively as signals change
	protected filteredTours = computed(() => {
		return this.tours().filter((tour) => this.matchesCategory(tour) && this.matchesSearch(tour));
	});

	ngOnInit(): void {
		this.loadTours();
	}

	private loadTours(): void {
		this.loading.set(true);
		this.error.set(null);

		this.strollsFeature.browse({ sortBy: 'most_used' }).subscribe({
			next: (response) => {
				this.tours.set(response?.items || []);
				this.loading.set(false);
			},
			error: () => {
				this.error.set('Failed to load tours');
				this.tours.set([]);
				this.loading.set(false);
			}
		});
	}
}
```

**Key points:**

- Use `computed()` for derived/filtered state instead of imperative updates
- Keep filtering logic declarative
- Client-side filtering works well for <1000 items
- For larger datasets, implement server-side filtering

### Pattern 4: Refresh / Reload Data

**Scenario**: Need to reload data after user action (e.g., after answer is correct, reload adventure state)

```typescript
private reloadCurrentStage(): void {
  this.adventuresFeature.get(this.adventureId).subscribe({
    next: (detail) => {
      this.applyDetail(detail);
      this.error.set(null);
    },
    error: () => {
      this.error.set('Failed to reload stage');
    }
  });
}
```

**Key points:**

- Don't set `loading = true` for reloads unless you want to show a loading spinner
- Still handle errors explicitly
- No need to clear data on reload if only refreshing

## Common Error Handling Pattern

For consistency, use this pattern for error state:

```typescript
// UI template
@if (error()) {
  <div class="error-message">{{ error() }}</div>
}

// Component
protected error = signal<string | null>(null);

// On success, always clear error:
this.error.set(null);

// On error, set message:
this.error.set('User-facing error message');
```

## Loading State in Templates

Use signals for loading states instead of `*ngIf` with observable subscriptions:

```html
<!-- Good: Loading spinner while fetching -->
@if (loading()) {
<mat-spinner></mat-spinner>
} @else if (error()) {
<p class="error">{{ error() }}</p>
} @else {
<!-- Your content here -->
}
```

## Feature Service Structure

All feature services (e.g., `StrollsFeatureService`, `AdventuresFeatureService`) should:

1. **Delegate to API service**: Call HTTP endpoints via the API service
2. **Return observables**: Return cold observables that can be subscribed to multiple times
3. **No side effects**: Don't update global state; let components handle subscription results
4. **Error transformation**: Use `catchError` to normalize errors if needed (see TODO 09)

Example:

```typescript
@Injectable()
export class AdventuresFeatureService {
	constructor(private readonly api: AdventuresApiService) {}

	get(id: string): Observable<AdventureDetailResponse> {
		return this.api.getAdventure(id);
	}

	navigate(adventureId: string, direction: string): Observable<AdventureDetailResponse> {
		return this.api.navigate(adventureId, direction);
	}
}
```

## Best Practices

1. **Use signals for component-local state**: Don't over-engineer small UI flags
2. **Use computed() for derived state**: Instead of imperative property getters
3. **Explicit subscription cleanup**: In `OnDestroy` if storing subscriptions (optional with signals + .subscribe())
4. **Error messages are user-facing**: Always provide meaningful error messages
5. **Loading states should disable user actions**: Disable submit buttons, show spinners, etc.
6. **Avoid nested subscriptions**: Use `switchMap`, `mergeMap`, or async pipe instead
7. **Prefer async operations in feature methods**: Keep components thin

## Potential Improvements

For a future refactor:

- Use `takeUntilDestroyed()` to automatically unsubscribe in OnDestroy
- Create a reusable `AsyncLoadingState<T>` signal utility to reduce boilerplate
- Migrate to async pipe with observables instead of explicit subscriptions
- Add dedicated loading/error effects for complex multi-step flows

## Migration Path

When refactoring existing components:

1. Identify all feature service calls and group by operation type
2. Create signals for each async state (loading, error, data)
3. Replace direct `.subscribe()` calls with proper error handling
4. Move filtering/derived logic to `computed()`
5. Test with slow networks to verify loading states work correctly
