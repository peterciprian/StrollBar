import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslatePipe } from '@ngx-translate/core';
import { CookieConsentService } from '../../core/services/cookie-consent.service';
import { SbIconComponent } from '../atoms/sb-icon/sb-icon.component';

@Component({
	selector: 'app-footer',
	standalone: true,
	imports: [RouterLink, MatToolbarModule, TranslatePipe, SbIconComponent],
	templateUrl: './footer.component.html',
	styleUrl: './footer.component.scss'
})
export class FooterComponent {
	protected readonly year = new Date().getFullYear();
	private readonly cookieConsent = inject(CookieConsentService);

	openCookiePreferences(): void {
		this.cookieConsent.openPreferences();
	}
}
