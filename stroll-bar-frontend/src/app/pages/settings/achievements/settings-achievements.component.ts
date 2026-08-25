import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

interface Achievement {
	icon: string;
	title: string;
	description: string;
	earnedOn: string;
}

@Component({
	selector: 'app-settings-achievements',
	standalone: true,
	imports: [MatIconModule, TranslatePipe],
	templateUrl: './settings-achievements.component.html',
	styleUrls: ['./settings-achievements.component.scss']
})
export class SettingsAchievementsComponent {
	protected readonly achievements: Achievement[] = [
		{ icon: 'castle', title: 'Bastion Explorer', description: "Completed the Fisherman's Bastion Mystery tour", earnedOn: '12 May 2026' },
		{ icon: 'psychology', title: 'Riddle Master', description: 'Solved 10 station riddles without a hint', earnedOn: '28 May 2026' },
		{ icon: 'water', title: 'Danube Wanderer', description: 'Completed the Danube Legends & Chain Bridge tour', earnedOn: '3 June 2026' },
		{ icon: 'hiking', title: 'Weekend Wanderer', description: 'Completed 3 tours in a single weekend', earnedOn: '15 June 2026' }
	];
}
