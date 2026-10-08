import { Component } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { SbButtonComponent } from '../../../components/atoms/sb-button/sb-button.component';
import { SbCheckboxComponent } from '../../../components/atoms/sb-checkbox/sb-checkbox.component';
import { SbPageHeaderComponent } from '../../../components/atoms/sb-page-header/sb-page-header.component';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
	selector: 'app-settings-preferences',
	standalone: true,
	imports: [UpperCasePipe, FormsModule, TranslatePipe, SbButtonComponent, SbCheckboxComponent, SbPageHeaderComponent],
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
