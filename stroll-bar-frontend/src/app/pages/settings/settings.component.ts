import { Component, inject } from '@angular/core';
import { UpperCasePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SETTINGS_SECTIONS, SettingsNavService } from './settings-nav.service';

interface Achievement {
	icon: string;
	title: string;
	description: string;
	earnedOn: string;
}

@Component({
	selector: 'app-settings-page',
	standalone: true,
	imports: [
		UpperCasePipe,
		MatIconModule,
		MatListModule,
		MatButtonModule,
		MatFormFieldModule,
		MatInputModule,
		MatSlideToggleModule,
		FormsModule,
		TranslatePipe
	],
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss']
})
export class SettingsPageComponent {
	protected readonly nav = inject(SettingsNavService);
	protected readonly sections = SETTINGS_SECTIONS;

	protected readonly achievements: Achievement[] = [
		{ icon: 'castle', title: 'Bastion Explorer', description: "Completed the Fisherman's Bastion Mystery tour", earnedOn: '12 May 2026' },
		{ icon: 'psychology', title: 'Riddle Master', description: 'Solved 10 station riddles without a hint', earnedOn: '28 May 2026' },
		{ icon: 'water', title: 'Danube Wanderer', description: 'Completed the Danube Legends & Chain Bridge tour', earnedOn: '3 June 2026' },
		{ icon: 'hiking', title: 'Weekend Wanderer', description: 'Completed 3 tours in a single weekend', earnedOn: '15 June 2026' }
	];

	protected readonly analyticsStats = [
		{ icon: 'group', label: 'Total Users', value: '4,812' },
		{ icon: 'map', label: 'Active Tours', value: '18' },
		{ icon: 'task_alt', label: 'Completion Rate', value: '76%' },
		{ icon: 'schedule', label: 'Avg. Session Time', value: '42 min' }
	];

	protected notificationsEnabled = true;
	protected darkModeEnabled = false;
}
