import { Injectable, inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiClientService } from '../../core/api/api-client.service';
import { LoginRequest, RegisterRequest } from '../../core/api/models';
import { TokenStorageService } from '../../core/services/token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthFeatureService {
	private readonly api = inject(ApiClientService);
	private readonly tokenStorage = inject(TokenStorageService);

	register(input: RegisterRequest) {
		return this.api.register(input).pipe(
			tap((response) => this.tokenStorage.setTokens(response.accessToken, response.refreshToken)),
			map((response) => response.user)
		);
	}

	login(input: LoginRequest) {
		return this.api.login(input).pipe(
			tap((response) => this.tokenStorage.setTokens(response.accessToken, response.refreshToken)),
			map((response) => response.user)
		);
	}

	logout() {
		const refreshToken = this.tokenStorage.getRefreshToken() ?? undefined;
		this.tokenStorage.clear();

		// Best-effort revoke: the client-side session is already cleared regardless of the outcome.
		return this.api.logout({ refreshToken }).pipe(catchError(() => of(null)));
	}

	loadMe() {
		return this.api.me();
	}
}
