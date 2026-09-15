import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
	private readonly destroyRef = inject(DestroyRef);
	private readonly onlineState = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
	readonly isOnline = this.onlineState.asReadonly();

	constructor() {
		// The server has no `window`; connectivity only matters for the already-hydrated browser tab.
		if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

		const handleOnline = () => this.onlineState.set(true);
		const handleOffline = () => this.onlineState.set(false);
		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
		this.destroyRef.onDestroy(() => {
			window.removeEventListener('online', handleOnline);
			window.removeEventListener('offline', handleOffline);
		});
	}
}
