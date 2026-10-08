import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { CookieConsentComponent } from './components/cookie-consent/cookie-consent.component';
import { ConnectivityService } from './core/services/connectivity.service';
import { ThemeService } from './core/services/theme.service';
import { TranslatePipe } from '@ngx-translate/core';
import { SbIconComponent } from './components/atoms/sb-icon/sb-icon.component';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet, HeaderComponent, FooterComponent, CookieConsentComponent, SbIconComponent, TranslatePipe],
	templateUrl: './app.component.html'
})
export class AppComponent {
	protected readonly connectivity = inject(ConnectivityService);
	private readonly themeService = inject(ThemeService);
}
