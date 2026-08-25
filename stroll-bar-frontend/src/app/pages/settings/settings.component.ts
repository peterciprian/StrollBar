import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { TranslatePipe } from '@ngx-translate/core';

import { SETTINGS_SECTIONS } from './settings-nav.service';

@Component({
	selector: 'app-settings-page',
	standalone: true,
	imports: [RouterLink, RouterLinkActive, RouterOutlet, MatIconModule, MatListModule, TranslatePipe],
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss']
})
export class SettingsPageComponent {
	protected readonly sections = SETTINGS_SECTIONS;
}
