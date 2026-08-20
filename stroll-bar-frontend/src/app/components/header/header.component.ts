import { Component, Signal, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuTrigger, MatMenuItem } from '@angular/material/menu';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { LanguageService } from '../../core/services/language.service';
import { logout, selectIsLoggedIn, selectUsername } from '../../features/auth/auth.state';
import { SCREEN_DEFS } from '../../pages/screens/screen-definitions';
import { SETTINGS_SECTIONS, SettingsNavService, SettingsSectionId } from '../../pages/settings/settings-nav.service';

@Component({
	selector: 'app-header',
	standalone: true,
	imports: [
		RouterLink,
		RouterLinkActive,
		MatToolbar,
		MatButton,
		MatIconButton,
		MatSelect,
		MatOption,
		MatIcon,
		MatMenu,
		MatMenuTrigger,
		MatMenuItem,
		TranslatePipe
	],
	templateUrl: './header.component.html',
	styleUrl: './header.component.scss'
})
export class HeaderComponent {
	protected readonly languageService = inject(LanguageService);
	private readonly translateService = inject(TranslateService);
	private readonly store = inject(Store);
	private readonly router = inject(Router);
	protected readonly settingsNav = inject(SettingsNavService);

	protected readonly screenDefs = SCREEN_DEFS;
	protected readonly settingsSections = SETTINGS_SECTIONS;

	protected readonly isLoggedIn = this.store.selectSignal(selectIsLoggedIn);
	protected readonly username = this.store.selectSignal(selectUsername);

	protected readonly translatedLanguages = this.languageService.languages.map((lang) => ({
		code: lang.code,
		label: this.translateService.translate(lang.name) as Signal<string>
	}));

	onSelectSettingsSection(section: SettingsSectionId): void {
		this.settingsNav.setActiveSection(section);
		this.router.navigate(['/settings']);
	}

	onChangeLanguage(code: string): void {
		this.languageService.changeLanguage(code);
	}

	onLogout(): void {
		this.store.dispatch(logout());
	}
}
