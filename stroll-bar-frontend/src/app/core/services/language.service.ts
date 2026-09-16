import { Injectable, inject, PLATFORM_ID, Signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

export interface Language {
	name: string;
	code: string;
}

@Injectable({
	providedIn: 'root'
})
export class LanguageService {
	private readonly translate = inject(TranslateService);
	private readonly platformId = inject(PLATFORM_ID);

	readonly languages: Language[] = [
		{ name: 'LANGUAGE.HU', code: 'hu' },
		{ name: 'LANGUAGE.EN', code: 'en' }
	];

	constructor() {
		if (isPlatformBrowser(this.platformId)) {
			const storedLanguage = localStorage.getItem('strollbar-language');
			if (this.languages.some((language) => language.code === storedLanguage)) {
				this.translate.use(storedLanguage!);
			}
		}
	}

	get currentLang(): Signal<string | null> {
		return this.translate.currentLang;
	}

	changeLanguage(code: string): void {
		if (!this.languages.some((language) => language.code === code)) {
			return;
		}
		if (isPlatformBrowser(this.platformId)) {
			localStorage.setItem('strollbar-language', code);
		}
		this.translate.use(code);
	}
}
