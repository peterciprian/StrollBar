import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/api/api-client.service';

@Injectable({ providedIn: 'root' })
export class AchievementsFeatureService {
	private readonly api = inject(ApiClientService);

	listResults() {
		return this.api.listAdventureResults();
	}

	list() {
		return this.api.listAchievements();
	}
}
