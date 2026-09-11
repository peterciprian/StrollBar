import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/api/api-client.service';

@Injectable({ providedIn: 'root' })
export class AnalyticsFeatureService {
	private readonly api = inject(ApiClientService);

	getSummary() {
		return this.api.getAnalyticsSummary();
	}
}
