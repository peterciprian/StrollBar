import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/api/api-client.service';

@Injectable({ providedIn: 'root' })
export class UsersFeatureService {
  private readonly api = inject(ApiClientService);

  getPublicProfile(userId: string) {
    return this.api.getPublicProfile(userId);
  }
}
