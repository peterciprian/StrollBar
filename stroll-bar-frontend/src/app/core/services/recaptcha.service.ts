import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

interface GrecaptchaV3 {
	ready(callback: () => void): void;
	execute(siteKey: string, options: { action: string }): Promise<string>;
}

declare global {
	interface Window {
		grecaptcha?: GrecaptchaV3;
	}
}

const SCRIPT_ID = 'recaptcha-v3-script';

@Injectable({ providedIn: 'root' })
export class RecaptchaService {
	private readonly siteKey = environment.recaptchaSiteKey;
	private readonly readyState = signal(!this.siteKey);
	private loader: Promise<void> | null = null;

	/** True once the reCAPTCHA script is usable, or when no site key is configured. */
	readonly ready = this.readyState.asReadonly();

	get enabled(): boolean {
		return Boolean(this.siteKey);
	}

	load(): Promise<void> {
		if (!this.enabled) {
			return Promise.resolve();
		}
		if (!this.loader) {
			this.loader = this.injectScript().then(
				() => {
					this.readyState.set(true);
				},
				(error) => {
					this.loader = null;
					throw error;
				}
			);
		}
		return this.loader;
	}

	async execute(action: string): Promise<string | undefined> {
		if (!this.enabled) {
			return undefined;
		}
		await this.load();
		return window.grecaptcha!.execute(this.siteKey, { action });
	}

	private injectScript(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const onLoaded = () => window.grecaptcha!.ready(() => resolve());

			if (window.grecaptcha) {
				onLoaded();
				return;
			}

			const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
			const script = existing ?? document.createElement('script');
			script.addEventListener('load', onLoaded, { once: true });
			script.addEventListener('error', () => reject(new Error('Failed to load reCAPTCHA.')), { once: true });

			if (!existing) {
				script.id = SCRIPT_ID;
				script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(this.siteKey)}`;
				script.async = true;
				script.defer = true;
				document.head.appendChild(script);
			}
		});
	}
}
