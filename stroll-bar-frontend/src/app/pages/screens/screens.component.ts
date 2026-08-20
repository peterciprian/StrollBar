import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { TourBrowserScreenComponent } from './views/tour-browser/tour-browser.component';
import { ActiveAdventureScreenComponent } from './views/active-adventure/active-adventure.component';
import { AdminTourListScreenComponent } from './views/admin-tour-list/admin-tour-list.component';
import { AdminStationEditorScreenComponent } from './views/admin-station-editor/admin-station-editor.component';
import { UserDashboardScreenComponent } from './views/user-dashboard/user-dashboard.component';
import { ScreensNavService } from './screens-nav.service';

@Component({
	selector: 'app-screens',
	standalone: true,
	imports: [
		MatIconModule,
		TourBrowserScreenComponent,
		ActiveAdventureScreenComponent,
		AdminTourListScreenComponent,
		AdminStationEditorScreenComponent,
		UserDashboardScreenComponent
	],
	templateUrl: './screens.component.html',
	styleUrls: ['./screens.component.scss']
})
export class ScreensComponent {
	protected readonly nav = inject(ScreensNavService);
}
