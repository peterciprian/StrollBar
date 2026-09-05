import { Component, Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatOption, MatSelect, MatSelectTrigger } from '@angular/material/select';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuTrigger, MatMenuItem } from '@angular/material/menu';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { filter, map } from 'rxjs';
import { LanguageService } from '../../core/services/language.service';
import { logout, selectIsAdmin, selectIsLoggedIn, selectUsername } from '../../features/auth/auth.state';
import { SCREEN_DEFS, ScreenDef } from './screen-definitions';
import { SETTINGS_SECTIONS } from '../../pages/settings/settings-nav.service';

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
		MatSelectTrigger,
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

	protected readonly settingsSections = SETTINGS_SECTIONS;

	protected readonly isLoggedIn = this.store.selectSignal(selectIsLoggedIn);
	protected readonly isAdmin = this.store.selectSignal(selectIsAdmin);
	protected readonly username = this.store.selectSignal(selectUsername);
	private readonly currentUrl = toSignal(
		this.router.events.pipe(
			filter((event): event is NavigationEnd => event instanceof NavigationEnd),
			map((event) => event.urlAfterRedirects)
		),
		{ initialValue: this.router.url }
	);

	get visibleScreenDefs(): ScreenDef[] {
		return SCREEN_DEFS.filter((screen) => (this.isLoggedIn() || screen.visibleWithoutLogin) && (!screen.adminOnly || this.isAdmin()));
	}

	protected readonly translatedLanguages = this.languageService.languages.map((lang) => ({
		code: lang.code,
		label: this.translateService.translate(lang.name) as Signal<string>
	}));

	onChangeLanguage(code: string): void {
		this.languageService.changeLanguage(code);
	}

	languageFlagIcon(code: string | null): string {
		return code === 'en' ? 'assets/icons/flag-uk.svg' : 'assets/icons/flag-hu.svg';
	}

	onLogout(): void {
		this.store.dispatch(logout());
	}

	isActiveScreen(screen: ScreenDef): boolean {
		const url = this.currentUrl();
		const path = url.split('?')[0];

		switch (screen.id) {
			case 'stroll-browser':
				return path === '/explore';
			case 'admin-stroll-list':
				return path.startsWith('/admin/stroll-list');
			case 'admin-user-list':
				return path.startsWith('/admin/user-list');
			case 'creator-strolls':
				return path.startsWith('/creator/strolls');
			case 'user-dashboard':
				return path.startsWith('/user-dashboard');
			default:
				return false;
		}
	}
}
