import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslatePipe } from '@ngx-translate/core';
import { CookieConsentService } from '../../core/services/cookie-consent.service';
import { SbButtonComponent } from '../atoms/sb-button/sb-button.component';
import { SbIconComponent } from '../atoms/sb-icon/sb-icon.component';

@Component({
	selector: 'app-footer',
	standalone: true,
	imports: [RouterLink, MatToolbarModule, MatIconModule, TranslatePipe, SbButtonComponent, SbIconComponent],
	templateUrl: './footer.component.html',
	styleUrl: './footer.component.scss'
})
export class FooterComponent {
	protected readonly year = new Date().getFullYear();
	private readonly cookieConsent = inject(CookieConsentService);

	constructor() {
		inject(MatIconRegistry).addSvgIcon('github', inject(DomSanitizer).bypassSecurityTrustResourceUrl('assets/icons/github.svg'));
	}

	openCookiePreferences(): void {
		this.cookieConsent.openPreferences();
	}
}
