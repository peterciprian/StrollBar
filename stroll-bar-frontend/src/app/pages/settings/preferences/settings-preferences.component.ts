import { Component } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
	selector: 'app-settings-preferences',
	standalone: true,
	imports: [UpperCasePipe, FormsModule, MatButtonModule, MatIconModule, MatSlideToggleModule, TranslatePipe],
	templateUrl: './settings-preferences.component.html',
	styleUrls: ['./settings-preferences.component.scss']
})
export class SettingsPreferencesComponent {
	protected notificationsEnabled = false;

	constructor(protected readonly themeService: ThemeService) {}

	protected onDarkModeChange(enabled: boolean): void {
		this.themeService.setDarkMode(enabled);
	}
}
