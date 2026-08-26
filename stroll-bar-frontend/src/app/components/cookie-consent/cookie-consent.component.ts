import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CookieConsentService } from '../../core/services/cookie-consent.service';

@Component({
	selector: 'app-cookie-consent',
	standalone: true,
	imports: [FormsModule, RouterLink, TranslatePipe],
	templateUrl: './cookie-consent.component.html',
	styleUrl: './cookie-consent.component.scss'
})
export class CookieConsentComponent {
	protected readonly cookieConsent = inject(CookieConsentService);
	protected showPreferences = false;
	protected preferences = false;
	protected analytics = false;

	constructor() {
		const consent = this.cookieConsent.consent();
		this.preferences = consent?.preferences ?? false;
		this.analytics = consent?.analytics ?? false;
	}

	get visible(): boolean {
		return !this.cookieConsent.hasDecision || this.showPreferences;
	}

	acceptAll(): void {
		this.cookieConsent.acceptAll();
		this.showPreferences = false;
	}

	rejectOptional(): void {
		this.cookieConsent.rejectOptional();
		this.showPreferences = false;
	}

	openPreferences(): void {
		this.showPreferences = true;
	}

	savePreferences(): void {
		this.cookieConsent.savePreferences(this.preferences, this.analytics);
		this.showPreferences = false;
	}

	@HostListener('window:strollbar:open-cookie-preferences')
	onOpenPreferences(): void {
		const consent = this.cookieConsent.consent();
		this.preferences = consent?.preferences ?? false;
		this.analytics = consent?.analytics ?? false;
		this.showPreferences = true;
	}
}
