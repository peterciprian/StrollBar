import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/api/api-client.service';
import { CreateBadgeDefinitionRequest, UpdateBadgeDefinitionRequest } from '../../core/api/models';

@Injectable({ providedIn: 'root' })
export class BadgesAdminFeatureService {
	private readonly api = inject(ApiClientService);

	list() {
		return this.api.listBadgeDefinitionsAdmin();
	}

	create(payload: CreateBadgeDefinitionRequest) {
		return this.api.createBadgeDefinition(payload);
	}

	update(id: string, payload: UpdateBadgeDefinitionRequest) {
		return this.api.updateBadgeDefinition(id, payload);
	}

	remove(id: string) {
		return this.api.deleteBadgeDefinition(id);
	}
}
