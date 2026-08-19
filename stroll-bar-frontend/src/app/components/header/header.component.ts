import { Component, Signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatToolbar } from '@angular/material/toolbar';
import { TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { LanguageService } from '../../core/services/language.service';
import { logout, selectIsLoggedIn, selectUsername } from '../../features/auth/auth.state';

@Component({
	selector: 'app-header',
	standalone: true,
	imports: [RouterLink, RouterLinkActive, MatToolbar, MatButton, MatSelect, MatOption],
	templateUrl: './header.component.html',
	styleUrl: './header.component.scss'
})
export class HeaderComponent {
	protected readonly languageService = inject(LanguageService);
	private readonly translateService = inject(TranslateService);
	private readonly store = inject(Store);

	protected readonly isLoggedIn = this.store.selectSignal(selectIsLoggedIn);
	protected readonly username = this.store.selectSignal(selectUsername);

	protected readonly translatedLanguages = this.languageService.languages.map((lang) => ({
		code: lang.code,
		label: this.translateService.translate(lang.name) as Signal<string>
	}));

	onChangeLanguage(code: string): void {
		this.languageService.changeLanguage(code);
	}

	onLogout(): void {
		this.store.dispatch(logout());
	}
}
