import { Injectable, inject } from '@angular/core';
import { Observable, finalize, map, shareReplay, throwError } from 'rxjs';
import { ApiClientService } from '../api/api-client.service';
import { TokenStorageService } from './token-storage.service';

/**
 * Manages the session-scoped token refresh state.
 * Ensures concurrent requests reuse a single in-flight refresh operation instead of duplicating refresh calls.
 */
@Injectable({ providedIn: 'root' })
export class AuthRefreshService {
	private readonly api = inject(ApiClientService);
	private readonly tokenStorage = inject(TokenStorageService);

	// Session-scoped refresh state: ensures concurrent 401s use the same refresh observable.
	private refreshInFlight$: Observable<string> | null = null;

	/**
	 * Orchestrate a token refresh operation.
	 * If a refresh is already in-flight, returns the same observable.
	 * Otherwise, initiates a new refresh and cleans up when complete.
	 */
	refreshAccessToken(): Observable<string> {
		const refreshToken = this.tokenStorage.getRefreshToken();

		if (!refreshToken) {
			return throwError(() => new Error('No refresh token available.'));
		}

		if (!this.refreshInFlight$) {
			this.refreshInFlight$ = this.api.refresh({ refreshToken }).pipe(
				map((response) => {
					this.tokenStorage.setTokens(response.accessToken, response.refreshToken);
					return response.accessToken;
				}),
				finalize(() => (this.refreshInFlight$ = null)),
				shareReplay(1)
			);
		}

		return this.refreshInFlight$;
	}

	/**
	 * Clear any in-flight refresh operation and stored tokens.
	 * Called when the session expires or the user logs out.
	 */
	clearRefreshState(): void {
		this.refreshInFlight$ = null;
		this.tokenStorage.clear();
	}
}
