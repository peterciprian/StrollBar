import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { TranslatePipe } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { SbIconComponent } from '../../components/atoms/sb-icon/sb-icon.component';
import { selectIsAdmin } from '../../features/auth/auth.state';

import { SETTINGS_SECTIONS } from './settings-nav.service';

@Component({
	selector: 'app-settings-page',
	standalone: true,
	imports: [RouterLink, RouterLinkActive, RouterOutlet, MatListModule, TranslatePipe, SbIconComponent],
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss']
})
export class SettingsPageComponent {
	private readonly store = inject(Store);
	protected readonly isAdmin = this.store.selectSignal(selectIsAdmin);

	protected get sections() {
		return this.isAdmin() ? SETTINGS_SECTIONS : SETTINGS_SECTIONS.filter((section) => section.kind === 'settings');
	}
}
