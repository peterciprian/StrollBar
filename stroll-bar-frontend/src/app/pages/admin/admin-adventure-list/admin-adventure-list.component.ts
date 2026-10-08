import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { SbTone } from '../../../components/atoms/atom.types';
import { SbAlertComponent } from '../../../components/atoms/sb-alert/sb-alert.component';
import { SbBadgeComponent } from '../../../components/atoms/sb-badge/sb-badge.component';
import { SbButtonComponent } from '../../../components/atoms/sb-button/sb-button.component';
import { SbIconButtonComponent } from '../../../components/atoms/sb-icon-button/sb-icon-button.component';
import { SbPageHeaderComponent } from '../../../components/atoms/sb-page-header/sb-page-header.component';
import { SbSelectComponent, SbSelectOption } from '../../../components/atoms/sb-select/sb-select.component';
import { SbStatGridComponent } from '../../../components/atoms/sb-stat-grid/sb-stat-grid.component';
import { SbCellDirective } from '../../../components/atoms/sb-table/sb-cell.directive';
import { SbTableComponent } from '../../../components/atoms/sb-table/sb-table.component';
import { SbTableColumn } from '../../../components/atoms/sb-table/sb-table.models';
import { AdminAdventureEntry, Stroll, User } from '../../../core/api/models';
import { AdventuresFeatureService } from '../../../features/adventures/adventures-feature.service';
import { StrollsFeatureService } from '../../../features/strolls/strolls-feature.service';
import { UsersFeatureService } from '../../../features/users/users-feature.service';
import { ConfirmDeleteDialogComponent } from '../../../shared/confirm-delete-dialog.component';

type AdventureRow = AdminAdventureEntry & Record<string, unknown>;

@Component({
	selector: 'app-admin-adventure-list-screen',
	standalone: true,
	imports: [
		DatePipe,
		FormsModule,
		TranslatePipe,
		SbAlertComponent,
		SbBadgeComponent,
		SbButtonComponent,
		SbCellDirective,
		SbIconButtonComponent,
		SbPageHeaderComponent,
		SbSelectComponent,
		SbStatGridComponent,
		SbTableComponent
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './admin-adventure-list.component.html',
	styleUrl: './admin-adventure-list.component.scss'
})
export class AdminAdventureListScreenComponent implements OnInit {
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly usersFeature = inject(UsersFeatureService);
	private readonly dialog = inject(MatDialog);
	private readonly destroyRef = inject(DestroyRef);
	private readonly translate = inject(TranslateService);

	protected readonly displayedColumns = ['owner', 'stroll', 'status', 'purchased', 'actions'];
	protected readonly entries = signal<AdminAdventureEntry[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);

	protected readonly users = signal<User[]>([]);
	protected readonly assignableStrolls = signal<Stroll[]>([]);
	protected readonly selectedUserId = signal('');
	protected readonly selectedStrollId = signal('');
	protected readonly assigning = signal(false);
	protected readonly assignError = signal('');

	protected readonly activeCount = computed(
		() =>
			this.entries().filter((entry) => entry.adventure.progressStatus === 'purchased' || entry.adventure.progressStatus === 'in_progress')
				.length
	);
	protected readonly completedCount = computed(() => this.entries().filter((entry) => entry.adventure.progressStatus === 'completed').length);
	protected readonly revokedCount = computed(() => this.entries().filter((entry) => entry.adventure.progressStatus === 'revoked').length);

	protected readonly userOptions = computed<SbSelectOption<string>[]>(() =>
		this.users().map((user) => ({ value: user.id, label: `${user.username} (${user.email})` }))
	);
	protected readonly strollOptions = computed<SbSelectOption<string>[]>(() =>
		this.assignableStrolls().map((stroll) => ({ value: stroll.id, label: stroll.name }))
	);

	protected readonly summaryStats = computed(() => {
		this.translate.currentLang();
		return [
			{ label: this.translate.instant('SCREENS.ADMIN_ADVENTURE_LIST.METRIC_TOTAL'), value: this.entries().length },
			{ label: this.translate.instant('SCREENS.ADMIN_ADVENTURE_LIST.METRIC_ACTIVE'), value: this.activeCount(), tone: 'info' as SbTone },
			{
				label: this.translate.instant('SCREENS.ADMIN_ADVENTURE_LIST.METRIC_COMPLETED'),
				value: this.completedCount(),
				tone: 'success' as SbTone
			},
			{ label: this.translate.instant('SCREENS.ADMIN_ADVENTURE_LIST.METRIC_REVOKED'), value: this.revokedCount(), tone: 'danger' as SbTone }
		];
	});

	protected readonly rows = computed(() => this.entries() as AdventureRow[]);

	protected readonly columns = computed<SbTableColumn<AdventureRow>[]>(() => {
		this.translate.currentLang();
		return [
			{ key: 'owner', header: this.translate.instant('SCREENS.ADMIN_ADVENTURE_LIST.COL_OWNER') },
			{ key: 'stroll', header: this.translate.instant('SCREENS.ADMIN_ADVENTURE_LIST.COL_STROLL') },
			{ key: 'status', header: this.translate.instant('SCREENS.ADMIN_ADVENTURE_LIST.COL_STATUS') },
			{ key: 'purchased', header: this.translate.instant('SCREENS.ADMIN_ADVENTURE_LIST.COL_PURCHASED'), hideBelow: 'sm' },
			{ key: 'actions', header: this.translate.instant('SCREENS.ADMIN_ADVENTURE_LIST.COL_ACTIONS'), align: 'end' }
		];
	});

	protected statusTone(status: string): SbTone {
		if (status === 'completed') return 'success';
		return status === 'revoked' ? 'danger' : 'neutral';
	}

	ngOnInit(): void {
		this.loadEntries();

		this.usersFeature
			.list()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({ next: (users) => this.users.set(users) });

		this.loadAssignableStrolls();
	}

	// The strolls list endpoint caps `limit` at 100, so page through it to collect every stroll.
	private loadAssignableStrolls(page = 1, accumulated: Stroll[] = []): void {
		this.strollsFeature
			.listOwned({ page, limit: 100 })
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (response) => {
					const combined = [...accumulated, ...response.items];
					if (combined.length < response.total && response.items.length > 0) {
						this.loadAssignableStrolls(page + 1, combined);
						return;
					}
					this.assignableStrolls.set(
						combined.filter((stroll) => stroll.activeStatus !== 'archived' && stroll.activeStatus !== 'suspended')
					);
				}
			});
	}

	private loadEntries(): void {
		this.loading.set(true);
		this.adventuresFeature
			.listAllAdmin()
			.pipe(takeUntilDestroyed(this.destroyRef))
			.subscribe({
				next: (entries) => {
					this.entries.set(entries);
					this.loading.set(false);
				},
				error: () => {
					this.loadError.set(true);
					this.loading.set(false);
				}
			});
	}

	protected assign(): void {
		const userId = this.selectedUserId();
		const strollId = this.selectedStrollId();
		if (!userId || !strollId) return;

		this.assignError.set('');
		this.assigning.set(true);
		this.adventuresFeature.assign(userId, strollId).subscribe({
			next: () => {
				this.assigning.set(false);
				this.selectedUserId.set('');
				this.selectedStrollId.set('');
				this.loadEntries();
			},
			error: () => {
				this.assigning.set(false);
				this.assignError.set('SCREENS.ADMIN_ADVENTURE_LIST.ASSIGN_ERROR');
			}
		});
	}

	protected async revoke(entry: AdminAdventureEntry): Promise<void> {
		const confirmed = await firstValueFrom(
			this.dialog
				.open(ConfirmDeleteDialogComponent, {
					data: {
						titleKey: 'SCREENS.ADMIN_ADVENTURE_LIST.REVOKE_CONFIRM_TITLE',
						messageKey: 'SCREENS.ADMIN_ADVENTURE_LIST.REVOKE_CONFIRM_MESSAGE',
						itemName: entry.stroll?.name
					},
					maxWidth: 'calc(100vw - 32px)',
					width: '420px'
				})
				.afterClosed()
		);
		if (!confirmed) return;

		this.adventuresFeature.revoke(entry.adventure.id).subscribe({
			next: (updated) => {
				this.entries.update((entries) => entries.map((item) => (item.adventure.id === updated.id ? { ...item, adventure: updated } : item)));
			},
			error: () => this.loadError.set(true)
		});
	}
}
