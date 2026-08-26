import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';
import { CookieConsentComponent } from './components/cookie-consent/cookie-consent.component';

@Component({
	selector: 'app-root',
	standalone: true,
	imports: [RouterOutlet, HeaderComponent, FooterComponent, CookieConsentComponent],
	templateUrl: './app.component.html'
})
export class AppComponent {}
