import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/api/api-client.service';
import {
	CreateStageRequest,
	CreateStrollRequest,
	ListStrollsQuery,
	ReorderStagesRequest,
	UpdateStageRequest,
	UpdateStrollRequest
} from '../../core/api/models';

@Injectable({ providedIn: 'root' })
export class StrollsFeatureService {
	private readonly api = inject(ApiClientService);

	browse(query: ListStrollsQuery = {}) {
		return this.api.listStrolls(query);
	}

	listOwned(query: ListStrollsQuery = {}) {
		return this.api.listOwnedStrolls(query);
	}

	getDetail(strollId: string) {
		return this.api.getStroll(strollId);
	}

	getOwnedDetail(strollId: string) {
		return this.api.getOwnedStroll(strollId);
	}

	create(payload: CreateStrollRequest) {
		return this.api.createStroll(payload);
	}

	update(strollId: string, payload: UpdateStrollRequest) {
		return this.api.updateStroll(strollId, payload);
	}

	remove(strollId: string) {
		return this.api.deleteStroll(strollId);
	}

	listStages(strollId: string) {
		return this.api.listStages(strollId);
	}

	createStage(strollId: string, payload: CreateStageRequest) {
		return this.api.createStage(strollId, payload);
	}

	updateStage(strollId: string, stageId: string, payload: UpdateStageRequest) {
		return this.api.updateStage(strollId, stageId, payload);
	}

	removeStage(strollId: string, stageId: string) {
		return this.api.deleteStage(strollId, stageId);
	}

	reorderStages(strollId: string, payload: ReorderStagesRequest) {
		return this.api.reorderStages(strollId, payload);
	}
}
