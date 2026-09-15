import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const ACCESS_TOKEN_KEY = 'strollbar_access_token';
const REFRESH_TOKEN_KEY = 'strollbar_refresh_token';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
	// No session on the server: SSR requests are always anonymous, there's no localStorage to read.
	private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

	getAccessToken(): string | null {
		return this.isBrowser ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
	}

	getRefreshToken(): string | null {
		return this.isBrowser ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
	}

	setTokens(accessToken: string, refreshToken: string): void {
		if (!this.isBrowser) return;
		localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
		localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
	}

	clear(): void {
		if (!this.isBrowser) return;
		localStorage.removeItem(ACCESS_TOKEN_KEY);
		localStorage.removeItem(REFRESH_TOKEN_KEY);
	}
}
