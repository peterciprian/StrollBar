import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { SbTone } from '../../../components/atoms/atom.types';
import { SbAlertComponent } from '../../../components/atoms/sb-alert/sb-alert.component';
import { SbBadgeComponent } from '../../../components/atoms/sb-badge/sb-badge.component';
import { SbPageHeaderComponent } from '../../../components/atoms/sb-page-header/sb-page-header.component';
import { SbSelectComponent, SbSelectOption } from '../../../components/atoms/sb-select/sb-select.component';
import { SbStatGridComponent } from '../../../components/atoms/sb-stat-grid/sb-stat-grid.component';
import { SbCellDirective } from '../../../components/atoms/sb-table/sb-cell.directive';
import { SbTableComponent } from '../../../components/atoms/sb-table/sb-table.component';
import { SbTableColumn } from '../../../components/atoms/sb-table/sb-table.models';
import { User } from '../../../core/api/models';
import { USER_ROLE_LABEL_KEYS, USER_ROLE_OPTIONS, UserRole } from '../../../core/models/user-role.enum';
import { UsersFeatureService } from '../../../features/users/users-feature.service';
import { RoleChangeConfirmDialogComponent } from './role-change-confirm-dialog.component';

type UserRow = User & Record<string, unknown>;

@Component({
	selector: 'app-admin-user-list-screen',
	standalone: true,
	imports: [
		DatePipe,
		FormsModule,
		TranslatePipe,
		SbAlertComponent,
		SbBadgeComponent,
		SbCellDirective,
		SbPageHeaderComponent,
		SbSelectComponent,
		SbStatGridComponent,
		SbTableComponent
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './admin-user-list.component.html',
	styleUrl: './admin-user-list.component.scss'
})
export class AdminUserListScreenComponent implements OnInit {
	private readonly usersFeature = inject(UsersFeatureService);
	private readonly dialog = inject(MatDialog);
	private readonly translate = inject(TranslateService);

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

	/** Mirrors what each row's select shows so a cancelled or failed change can be rolled back. */
	private readonly roleSelection = signal<Record<string, UserRole>>({});

	protected readonly roleSelectOptions = computed<SbSelectOption<UserRole>[]>(() => {
		this.translate.currentLang();
		return this.roleOptions.map((option) => ({ value: option.value, label: this.translate.instant(option.labelKey) }));
	});

	protected readonly summaryStats = computed(() => {
		this.translate.currentLang();
		return [
			{ label: this.translate.instant('SCREENS.ADMIN_USER_LIST.METRIC_TOTAL'), value: this.users().length },
			{ label: this.translate.instant('SCREENS.ADMIN_USER_LIST.METRIC_ACTIVE'), value: this.activeCount(), tone: 'success' as SbTone },
			{ label: this.translate.instant('SCREENS.ADMIN_USER_LIST.METRIC_CREATORS'), value: this.creatorCount(), tone: 'info' as SbTone },
			{ label: this.translate.instant('SCREENS.ADMIN_USER_LIST.METRIC_ADMINS'), value: this.adminCount(), tone: 'warning' as SbTone }
		];
	});

	protected readonly rows = computed(() => this.users() as UserRow[]);

	protected readonly columns = computed<SbTableColumn<UserRow>[]>(() => {
		this.translate.currentLang();
		return [
			{ key: 'user', header: this.translate.instant('SCREENS.ADMIN_USER_LIST.COL_USERNAME'), width: '240px' },
			{ key: 'email', header: this.translate.instant('SCREENS.ADMIN_USER_LIST.COL_EMAIL'), width: '220px', hideBelow: 'md' },
			{ key: 'status', header: this.translate.instant('SCREENS.ADMIN_USER_LIST.COL_ACTIVE'), width: '130px' },
			{ key: 'verified', header: this.translate.instant('SCREENS.ADMIN_USER_LIST.COL_EMAIL_VERIFIED'), width: '130px', hideBelow: 'md' },
			{ key: 'created', header: this.translate.instant('SCREENS.ADMIN_USER_LIST.COL_CREATED_AT'), width: '130px', hideBelow: 'sm' },
			{ key: 'role', header: this.translate.instant('SCREENS.ADMIN_USER_LIST.COL_ROLE'), width: '180px' }
		];
	});

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

	protected roleFor(user: User): UserRole {
		return this.roleSelection()[user.id] ?? user.role;
	}

	protected async changeRole(user: User, role: UserRole): Promise<void> {
		if (user.role === role) {
			return;
		}

		this.selectRole(user.id, role);

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
			this.selectRole(user.id, user.role);
			return;
		}

		this.saveError.set(false);
		this.savingUserId.set(user.id);

		this.usersFeature.updateRole(user.id, role).subscribe({
			next: (updated) => {
				this.users.update((users) => users.map((item) => (item.id === updated.id ? updated : item)));
				this.selectRole(updated.id, updated.role);
				this.savingUserId.set(null);
			},
			error: () => {
				this.selectRole(user.id, user.role);
				this.saveError.set(true);
				this.savingUserId.set(null);
			}
		});
	}

	protected roleLabelKey(role: UserRole): string {
		return USER_ROLE_LABEL_KEYS[role];
	}

	private selectRole(userId: string, role: UserRole): void {
		this.roleSelection.update((selection) => ({ ...selection, [userId]: role }));
	}
}
