import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { AdminAdventureEntry, Stroll, User } from '../../../core/api/models';
import { AdventuresFeatureService } from '../../../features/adventures/adventures-feature.service';
import { StrollsFeatureService } from '../../../features/strolls/strolls-feature.service';
import { UsersFeatureService } from '../../../features/users/users-feature.service';
import { ConfirmDeleteDialogComponent } from '../../../shared/confirm-delete-dialog.component';

@Component({
	selector: 'app-admin-adventure-list-screen',
	standalone: true,
	imports: [
		CommonModule,
		FormsModule,
		MatButtonModule,
		MatFormFieldModule,
		MatIconModule,
		MatSelectModule,
		MatTableModule,
		MatTooltipModule,
		TranslatePipe
	],
	templateUrl: './admin-adventure-list.component.html',
	styleUrls: ['./admin-adventure-list.component.scss']
})
export class AdminAdventureListScreenComponent implements OnInit {
	private readonly adventuresFeature = inject(AdventuresFeatureService);
	private readonly strollsFeature = inject(StrollsFeatureService);
	private readonly usersFeature = inject(UsersFeatureService);
	private readonly dialog = inject(MatDialog);
	private readonly destroyRef = inject(DestroyRef);

	protected readonly displayedColumns = ['owner', 'stroll', 'status', 'purchased', 'actions'];
	protected readonly entries = signal<AdminAdventureEntry[]>([]);
	protected readonly loading = signal(true);
	protected readonly loadError = signal(false);

	protected readonly users = signal<User[]>([]);
	protected readonly assignableStrolls = signal<Stroll[]>([]);
	protected selectedUserId = '';
	protected selectedStrollId = '';
	protected assigning = false;
	protected assignError = '';

	protected readonly activeCount = computed(
		() =>
			this.entries().filter((entry) => entry.adventure.progressStatus === 'purchased' || entry.adventure.progressStatus === 'in_progress')
				.length
	);
	protected readonly completedCount = computed(() => this.entries().filter((entry) => entry.adventure.progressStatus === 'completed').length);
	protected readonly revokedCount = computed(() => this.entries().filter((entry) => entry.adventure.progressStatus === 'revoked').length);

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
		if (!this.selectedUserId || !this.selectedStrollId) return;

		this.assignError = '';
		this.assigning = true;
		this.adventuresFeature.assign(this.selectedUserId, this.selectedStrollId).subscribe({
			next: () => {
				this.assigning = false;
				this.selectedUserId = '';
				this.selectedStrollId = '';
				this.loadEntries();
			},
			error: () => {
				this.assigning = false;
				this.assignError = 'SCREENS.ADMIN_ADVENTURE_LIST.ASSIGN_ERROR';
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
