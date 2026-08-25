import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
	selector: 'app-settings-analytics',
	standalone: true,
	imports: [MatIconModule, TranslatePipe],
	templateUrl: './settings-analytics.component.html',
	styleUrls: ['./settings-analytics.component.scss']
})
export class SettingsAnalyticsComponent {
	protected readonly analyticsStats = [
		{ icon: 'group', label: 'Total Users', value: '4,812' },
		{ icon: 'map', label: 'Active Tours', value: '18' },
		{ icon: 'task_alt', label: 'Completion Rate', value: '76%' },
		{ icon: 'schedule', label: 'Avg. Session Time', value: '42 min' }
	];
}
