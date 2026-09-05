import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { CookieConsentComponent } from './components/cookie-consent/cookie-consent.component';
import { ConnectivityService } from './core/services/connectivity.service';
import { ThemeService } from './core/services/theme.service';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet, HeaderComponent, FooterComponent, CookieConsentComponent, MatIconModule, TranslatePipe],
	templateUrl: './app.component.html'
})
export class AppComponent {
	protected readonly connectivity = inject(ConnectivityService);
	private readonly themeService = inject(ThemeService);
}
