import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/api/api-client.service';

@Injectable({ providedIn: 'root' })
export class IssuesFeatureService {
	private readonly api = inject(ApiClientService);

	listAll() {
		return this.api.listStrollReports();
	}
}
