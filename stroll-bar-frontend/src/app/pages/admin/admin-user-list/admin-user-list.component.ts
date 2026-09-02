import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';

import { User, UserRole } from '../../../core/api/models';
import { UsersFeatureService } from '../../../features/users/users-feature.service';

@Component({
	selector: 'app-admin-user-list-screen',
	standalone: true,
	imports: [CommonModule, MatFormFieldModule, MatIconModule, MatSelectModule, MatTableModule, MatTooltipModule, TranslatePipe],
	templateUrl: './admin-user-list.component.html',
	styleUrls: ['./admin-user-list.component.scss']
})
export class AdminUserListScreenComponent implements OnInit {
	private readonly usersFeature = inject(UsersFeatureService);

	protected readonly roles: UserRole[] = ['simple', 'premium', 'creator', 'admin'];
	protected readonly displayedColumns = ['user', 'email', 'status', 'verified', 'created', 'role'];
	protected readonly users = signal<User[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly saveError = signal(false);
	protected readonly savingUserId = signal<string | null>(null);
	protected readonly adminCount = computed(() => this.users().filter((user) => user.role === 'admin').length);
	protected readonly creatorCount = computed(() => this.users().filter((user) => user.role === 'creator').length);
	protected readonly activeCount = computed(() => this.users().filter((user) => user.isActive).length);

	ngOnInit(): void {
		this.usersFeature.list().subscribe({
			next: (users) => {
				this.users.set(users);
				this.loading.set(false);
			},
			error: () => {
				this.loadError.set(true);
				this.loading.set(false);
			}
		});
	}

	protected changeRole(user: User, role: UserRole): void {
		if (user.role === role) {
			return;
		}

		this.saveError.set(false);
		this.savingUserId.set(user.id);

		this.usersFeature.updateRole(user.id, role).subscribe({
			next: (updated) => {
				this.users.update((users) => users.map((item) => (item.id === updated.id ? updated : item)));
				this.savingUserId.set(null);
			},
			error: () => {
				// Restore the previous value so the select stays in sync with the server state.
				this.users.update((users) => [...users]);
				this.saveError.set(true);
				this.savingUserId.set(null);
			}
		});
	}
}
