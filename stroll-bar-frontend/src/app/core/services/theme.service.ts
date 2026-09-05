import { Injectable, signal } from '@angular/core';

const DARK_MODE_STORAGE_KEY = 'strollbar-dark-mode';

@Injectable({ providedIn: 'root' })
export class ThemeService {
	private readonly darkMode = signal(this.readStoredPreference());

	constructor() {
		this.applyTheme(this.darkMode());
	}

	isDarkMode(): boolean {
		return this.darkMode();
	}

	setDarkMode(enabled: boolean): void {
		this.darkMode.set(enabled);
		localStorage.setItem(DARK_MODE_STORAGE_KEY, String(enabled));
		this.applyTheme(enabled);
	}

	private applyTheme(enabled: boolean): void {
		document.documentElement.classList.toggle('dark-theme', enabled);
	}

	private readStoredPreference(): boolean {
		return localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true';
	}
}
