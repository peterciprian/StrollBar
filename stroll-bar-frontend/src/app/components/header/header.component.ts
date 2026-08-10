import { Component, Signal, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatToolbar } from '@angular/material/toolbar';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';

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

	protected readonly translatedLanguages = this.languageService.languages.map((lang) => ({
		code: lang.code,
		label: this.translateService.translate(lang.name) as Signal<string>
	}));

	onChangeLanguage(code: string): void {
		this.languageService.changeLanguage(code);
	}
}
