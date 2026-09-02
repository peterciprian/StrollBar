import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { User } from '../../../core/api/models';
import { USER_ROLE_LABEL_KEYS, USER_ROLE_OPTIONS, UserRole } from '../../../core/models/user-role.enum';
import { UsersFeatureService } from '../../../features/users/users-feature.service';
import { RoleChangeConfirmDialogComponent } from './role-change-confirm-dialog.component';

@Component({
	selector: 'app-admin-user-list-screen',
	standalone: true,
	imports: [CommonModule, MatFormFieldModule, MatIconModule, MatSelectModule, MatTableModule, MatTooltipModule, TranslatePipe],
	templateUrl: './admin-user-list.component.html',
	styleUrls: ['./admin-user-list.component.scss']
})
export class AdminUserListScreenComponent implements OnInit {
	private readonly usersFeature = inject(UsersFeatureService);
	private readonly dialog = inject(MatDialog);

	protected readonly roleOptions = USER_ROLE_OPTIONS;
	protected readonly displayedColumns = ['user', 'email', 'status', 'verified', 'created', 'role'];
	protected readonly users = signal<User[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly saveError = signal(false);
	protected readonly savingUserId = signal<string | null>(null);
	protected readonly adminCount = computed(() => this.users().filter((user) => user.role === UserRole.ADMIN).length);
	protected readonly creatorCount = computed(() => this.users().filter((user) => user.role === UserRole.CREATOR).length);
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

	protected async changeRole(user: User, event: MatSelectChange): Promise<void> {
		const role = event.value as UserRole;

		if (user.role === role) {
			return;
		}

		const confirmed = await firstValueFrom(
			this.dialog
				.open(RoleChangeConfirmDialogComponent, {
					data: {
						username: user.username,
						currentRoleLabelKey: this.roleLabelKey(user.role),
						nextRoleLabelKey: this.roleLabelKey(role)
					},
					maxWidth: 'calc(100vw - 32px)',
					width: '420px'
				})
				.afterClosed()
		);

		if (!confirmed) {
			event.source.value = user.role;
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
				event.source.value = user.role;
				this.saveError.set(true);
				this.savingUserId.set(null);
			}
		});
	}

	protected roleLabelKey(role: UserRole): string {
		return USER_ROLE_LABEL_KEYS[role];
	}
}
