import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { SbTone } from '../../../components/atoms/atom.types';
import { SbAlertComponent } from '../../../components/atoms/sb-alert/sb-alert.component';
import { SbBadgeComponent } from '../../../components/atoms/sb-badge/sb-badge.component';
import { SbButtonComponent } from '../../../components/atoms/sb-button/sb-button.component';
import { SbPageHeaderComponent } from '../../../components/atoms/sb-page-header/sb-page-header.component';
import { SbStatGridComponent } from '../../../components/atoms/sb-stat-grid/sb-stat-grid.component';
import { SbCellDirective } from '../../../components/atoms/sb-table/sb-cell.directive';
import { SbTableComponent } from '../../../components/atoms/sb-table/sb-table.component';
import { SbTableColumn } from '../../../components/atoms/sb-table/sb-table.models';
import { PaidGrant, User } from '../../../core/api/models';
import { UserRole } from '../../../core/models/user-role.enum';
import { UsersFeatureService } from '../../../features/users/users-feature.service';
import { RoleChangeConfirmDialogComponent } from './role-change-confirm-dialog.component';
import { PaidGrantsDialogComponent, PaidGrantsDialogResult } from './paid-grants-dialog.component';

type UserRow = User & Record<string, unknown>;

@Component({
	selector: 'app-admin-user-list-screen',
	standalone: true,
	imports: [
		DatePipe,
		TranslatePipe,
		SbAlertComponent,
		SbBadgeComponent,
		SbButtonComponent,
		SbCellDirective,
		SbPageHeaderComponent,
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

	protected readonly displayedColumns = ['user', 'email', 'status', 'verified', 'created', 'role'];
	protected readonly users = signal<User[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);
	protected readonly saveError = signal(false);
	protected readonly savingUserId = signal<string | null>(null);
	protected readonly adminCount = computed(() => this.users().filter((user) => user.role === UserRole.ADMIN).length);
	protected readonly creatorCount = computed(() => this.users().filter((user) => user.role === UserRole.CREATOR).length);
	protected readonly activeCount = computed(() => this.users().filter((user) => user.isActive).length);
	protected readonly rows = computed(() => this.users() as UserRow[]);

	protected readonly summaryStats = computed(() => {
		this.translate.currentLang();
		return [
			{ label: this.translate.instant('SCREENS.ADMIN_USER_LIST.METRIC_TOTAL'), value: this.users().length },
			{ label: this.translate.instant('SCREENS.ADMIN_USER_LIST.METRIC_ACTIVE'), value: this.activeCount(), tone: 'success' as SbTone },
			{ label: this.translate.instant('SCREENS.ADMIN_USER_LIST.METRIC_CREATORS'), value: this.creatorCount(), tone: 'info' as SbTone },
			{ label: this.translate.instant('SCREENS.ADMIN_USER_LIST.METRIC_ADMINS'), value: this.adminCount(), tone: 'warning' as SbTone }
		];
	});

	protected readonly columns = computed<SbTableColumn<UserRow>[]>(() => {
		this.translate.currentLang();
		return [
			{ key: 'user', header: this.translate.instant('SCREENS.ADMIN_USER_LIST.COL_USERNAME'), width: '240px' },
			{ key: 'email', header: this.translate.instant('SCREENS.ADMIN_USER_LIST.COL_EMAIL'), width: '220px', hideBelow: 'md' },
			{ key: 'status', header: this.translate.instant('SCREENS.ADMIN_USER_LIST.COL_ACTIVE'), width: '130px' },
			{ key: 'verified', header: this.translate.instant('SCREENS.ADMIN_USER_LIST.COL_EMAIL_VERIFIED'), width: '130px', hideBelow: 'md' },
			{ key: 'created', header: this.translate.instant('SCREENS.ADMIN_USER_LIST.COL_CREATED_AT'), width: '130px', hideBelow: 'sm' },
			{ key: 'role', header: this.translate.instant('SCREENS.ADMIN_USER_LIST.COL_ROLE'), width: '320px' }
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

	protected async managePaidGrants(user: User): Promise<void> {
		this.saveError.set(false);
		this.savingUserId.set(user.id);
		try {
			const grants = await firstValueFrom(this.usersFeature.listPaidGrants(user.id));
			const result = (await firstValueFrom(
				this.dialog
					.open(PaidGrantsDialogComponent, {
						data: { username: user.username, grants },
						maxWidth: 'calc(100vw - 32px)',
						width: '520px'
					})
					.afterClosed()
			)) as PaidGrantsDialogResult | undefined;

			if (!result) return;
			await this.applyGrantAction(user.id, result);
			await this.reloadUsers();
		} catch {
			this.saveError.set(true);
		} finally {
			this.savingUserId.set(null);
		}
	}

	protected async changeAdminAssignment(user: User): Promise<void> {
		const role = user.role === UserRole.ADMIN ? UserRole.SIMPLE : UserRole.ADMIN;
		const confirmed = await firstValueFrom(
			this.dialog
				.open(RoleChangeConfirmDialogComponent, {
					data: {
						username: user.username,
						actionLabelKey: this.adminActionLabelKey(user)
					},
					maxWidth: 'calc(100vw - 32px)',
					width: '420px'
				})
				.afterClosed()
		);
		if (!confirmed) return;

		this.saveError.set(false);
		this.savingUserId.set(user.id);
		this.usersFeature.updateRole(user.id, role).subscribe({
			next: (updated) => {
				this.users.update((users) => users.map((item) => (item.id === updated.id ? updated : item)));
				this.savingUserId.set(null);
			},
			error: () => {
				this.saveError.set(true);
				this.savingUserId.set(null);
			}
		});
	}

	protected adminActionLabelKey(user: User): string {
		return user.role === UserRole.ADMIN ? 'SCREENS.ADMIN_USER_LIST.ADMIN_REMOVE' : 'SCREENS.ADMIN_USER_LIST.ADMIN_ASSIGN';
	}

	private async applyGrantAction(userId: string, result: PaidGrantsDialogResult): Promise<Omit<PaidGrant, 'reason'>> {
		if (result.action === 'create') {
			return firstValueFrom(this.usersFeature.createPaidGrant(userId, result.request));
		}
		if (result.action === 'cancel') {
			return firstValueFrom(this.usersFeature.cancelPaidGrant(userId, result.grantId, { reason: result.reason }));
		}
		return firstValueFrom(this.usersFeature.revokePaidGrant(userId, result.grantId, { reason: result.reason }));
	}

	private async reloadUsers(): Promise<void> {
		const users = await firstValueFrom(this.usersFeature.list());
		this.users.set(users);
	}
}
