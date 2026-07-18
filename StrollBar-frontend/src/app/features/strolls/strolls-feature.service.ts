import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/api/api-client.service';
import {
  CreateStrollRequest,
  ListStrollsQuery,
  ReorderStagesRequest,
  UpdateStrollRequest,
} from '../../core/api/models';

@Injectable({ providedIn: 'root' })
export class StrollsFeatureService {
  private readonly api = inject(ApiClientService);

  browse(query: ListStrollsQuery = {}) {
    return this.api.listStrolls(query);
  }

  getDetail(strollId: string) {
    return this.api.getStroll(strollId);
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

  reorderStages(strollId: string, payload: ReorderStagesRequest) {
    return this.api.reorderStages(strollId, payload);
  }
}
