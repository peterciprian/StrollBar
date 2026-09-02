import { DestroyRef, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
	private readonly destroyRef = inject(DestroyRef);
	private readonly onlineState = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
	readonly isOnline = this.onlineState.asReadonly();

	constructor() {
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
