import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/api/api-client.service';

@Injectable({ providedIn: 'root' })
export class AdventuresFeatureService {
  private readonly api = inject(ApiClientService);

  unlock(strollId: string) {
    return this.api.unlockStroll({ strollId });
  }

  start(adventureId: string) {
    return this.api.startAdventure(adventureId);
  }

  get(adventureId: string) {
    return this.api.getAdventure(adventureId);
  }

  submitAnswer(adventureId: string, stageId: string, answer: string) {
    return this.api.submitStageAnswer(adventureId, stageId, { answer });
  }
}
