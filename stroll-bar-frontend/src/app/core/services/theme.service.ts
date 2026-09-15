import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const DARK_MODE_STORAGE_KEY = 'strollbar-dark-mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
	private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
	private readonly darkMode = signal(this.readStoredPreference());

	constructor() {
		// Server-rendered markup has no theme class; hydration re-applies the real preference client-side.
		if (this.isBrowser) this.applyTheme(this.darkMode());
	}

	isDarkMode(): boolean {
		return this.darkMode();
	}

	setDarkMode(enabled: boolean): void {
		this.darkMode.set(enabled);
		if (!this.isBrowser) return;
		localStorage.setItem(DARK_MODE_STORAGE_KEY, String(enabled));
		this.applyTheme(enabled);
	}

	private applyTheme(enabled: boolean): void {
		document.documentElement.classList.toggle('dark-theme', enabled);
	}

	private readStoredPreference(): boolean {
		return this.isBrowser && localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true';
	}
}
