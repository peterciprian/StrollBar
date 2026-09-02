import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '../../core/api/api-client.service';
import { UserRole } from '../../core/models/user-role.enum';

@Injectable({ providedIn: 'root' })
export class UsersFeatureService {
	private readonly api = inject(ApiClientService);

	getPublicProfile(userId: string) {
		return this.api.getPublicProfile(userId);
	}

	list() {
		return this.api.listUsers();
	}

	updateRole(userId: string, role: UserRole) {
		return this.api.updateUserRole(userId, { role });
	}
}
