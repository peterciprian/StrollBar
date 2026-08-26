import { Injectable, signal } from '@angular/core';

export type CookieCategory = 'necessary' | 'preferences' | 'analytics';

export interface CookieConsent {
	necessary: true;
	preferences: boolean;
	analytics: boolean;
	updatedAt: string;
}

const CONSENT_STORAGE_KEY = 'strollbar_cookie_consent';
const CONSENT_COOKIE_NAME = 'strollbar_cookie_consent';

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
	private readonly consentState = signal<CookieConsent | null>(this.readConsent());

	readonly consent = this.consentState.asReadonly();

	get hasDecision(): boolean {
		return this.consentState() !== null;
	}

	acceptAll(): void {
		this.saveConsent({ preferences: true, analytics: true });
	}

	rejectOptional(): void {
		this.saveConsent({ preferences: false, analytics: false });
	}

	savePreferences(preferences: boolean, analytics: boolean): void {
		this.saveConsent({ preferences, analytics });
	}

	openPreferences(): void {
		window.dispatchEvent(new CustomEvent('strollbar:open-cookie-preferences'));
	}

	hasConsent(category: CookieCategory): boolean {
		return category === 'necessary' || this.consentState()?.[category] === true;
	}

	setCookie(name: string, value: string, maxAgeSeconds: number, category: CookieCategory = 'necessary'): void {
		if (!this.hasConsent(category)) {
			return;
		}

		document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${this.secureCookieSuffix}`;
	}

	getCookie(name: string): string | null {
		const encodedName = `${encodeURIComponent(name)}=`;
		const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(encodedName));
		return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : null;
	}

	deleteCookie(name: string): void {
		document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=/; SameSite=Lax${this.secureCookieSuffix}`;
	}

	private get secureCookieSuffix(): string {
		return window.location.protocol === 'https:' ? '; Secure' : '';
	}

	private saveConsent(optional: Pick<CookieConsent, 'preferences' | 'analytics'>): void {
		const consent: CookieConsent = {
			necessary: true,
			...optional,
			updatedAt: new Date().toISOString()
		};

		localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
		this.setCookie(CONSENT_COOKIE_NAME, JSON.stringify(consent), 31_536_000);
		this.consentState.set(consent);

		if (!consent.preferences) {
			this.deleteCookie('strollbar_preferences');
		}

		if (!consent.analytics) {
			this.deleteCookie('strollbar_analytics');
		}
	}

	private readConsent(): CookieConsent | null {
		try {
			const stored = localStorage.getItem(CONSENT_STORAGE_KEY);

			if (stored) {
				const parsed = JSON.parse(stored) as Partial<CookieConsent>;

				if (parsed.necessary === true && typeof parsed.preferences === 'boolean' && typeof parsed.analytics === 'boolean') {
					return {
						necessary: true,
						preferences: parsed.preferences,
						analytics: parsed.analytics,
						updatedAt: parsed.updatedAt ?? ''
					};
				}
			}
		} catch {
			return null;
		}

		return null;
	}
}
